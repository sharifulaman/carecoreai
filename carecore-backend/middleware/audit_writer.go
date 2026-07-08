package middleware

import (
	"encoding/json"
	"fmt"
	"log"
	"reflect"
	"strings"

	"carecore-backend/models"
)

// auditExcludedEntities lists entity names that must never produce audit trail
// entries — either because they are self-referential, system-generated noise, or
// already handled by a dedicated audit writer (e.g. RolePermission).
var auditExcludedEntities = map[string]bool{
	"AuditTrail":       true, // self-referential
	"Notification":     true, // system-generated noise
	"EmployeeLocation": true, // high-frequency GPS pings
	"RolePermission":   true, // handled by WritePermissionChangeAudit
}

// High-severity entities are always logged at "high" regardless of action type.
// These represent records with direct safeguarding, clinical, or regulatory impact.
var auditHighSeverityEntities = map[string]bool{
	"SafeguardingRecord":   true,
	"MissingFromHome":      true,
	"MedicationRecord":     true,
	"MAREntry":             true,
	"DeprivationOfLiberty": true,
	"BehaviourSupportPlan": true,
	"ExploitationRisk":     true,
	"RiskAssessment":       true,
	"AccidentReport":       true,
	"Complaint":            true,
	"DisciplinaryRecord":   true,
	"Reg44Report":          true,
	"Reg45Review":          true,
	"OfstedNotification":   true,
	"SignificantEvent":      true,
}

// Medium-severity entities represent sensitive but non-clinical records such as
// placement data, financials, and key HR documents.
var auditMediumSeverityEntities = map[string]bool{
	"Resident":              true,
	"StaffProfile":          true,
	"Home":                  true,
	"SupportPlan":           true,
	"PathwayPlan":           true,
	"PlacementPlan":         true,
	"PlacementDetails":      true,
	"PlacementFee":          true,
	"PlacementInvoice":      true,
	"Bill":                  true,
	"PayPeriod":             true,
	"Payslip":               true,
	"SupervisionRecord":     true,
	"AppraisalRecord":       true,
	"StaffDocument":         true,
	"LeaveRequest":          true,
	"ReturnToWorkRecord":    true,
	"RoleDefinition":        true,
	"ILSPlan":               true,
	"CICReport":             true,
}

// computeSeverity derives the severity level for an audit entry.
// Deletes are always high. Entity type takes priority over action type.
func computeSeverity(entityName, action string) string {
	if action == "deleted" {
		return "high"
	}
	if auditHighSeverityEntities[entityName] {
		return "high"
	}
	if auditMediumSeverityEntities[entityName] {
		return "medium"
	}
	return "low"
}

// extractStringField traverses fieldNames in order and returns the first non-empty
// string value found on the record struct. Handles pointer receivers.
func extractStringField(record interface{}, fieldNames ...string) string {
	rv := reflect.ValueOf(record)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}
	if !rv.IsValid() {
		return ""
	}
	for _, name := range fieldNames {
		f := rv.FieldByName(name)
		if f.IsValid() && f.Kind() == reflect.String {
			if s := strings.TrimSpace(f.String()); s != "" {
				return s
			}
		}
	}
	return ""
}

// extractRecordTitle attempts to build a human-readable label for the record
// using common name fields. Combines FirstName + LastName when both are present.
func extractRecordTitle(record interface{}) string {
	firstName := extractStringField(record, "FirstName")
	if firstName != "" {
		lastName := extractStringField(record, "LastName")
		if lastName != "" {
			return firstName + " " + lastName
		}
		return firstName
	}
	return extractStringField(record, "Name", "Title", "Subject", "Label", "RoleName", "Type", "TemplateTitle", "ResidentName", "DisplayName", "VacancyRole")
}

// extractHomeID reads the HomeID field from a record struct via reflection.
func extractHomeID(record interface{}) string {
	return extractStringField(record, "HomeID")
}

// extractEntityID reads the ID field from a record struct. uuid.UUID implements
// the Stringer interface, so we use a type assertion to get the string form.
func extractEntityID(record interface{}) string {
	rv := reflect.ValueOf(record)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}
	if !rv.IsValid() {
		return ""
	}
	idField := rv.FieldByName("ID")
	if !idField.IsValid() {
		return ""
	}
	return fmt.Sprintf("%v", idField.Interface())
}

// buildRecordReference produces a short stable reference string for the record,
// e.g. "SafeguardingRecord #a1b2c3d4".
func buildRecordReference(entityName, entityID string) string {
	short := entityID
	if len(short) > 8 {
		short = short[:8]
	}
	return entityName + " #" + short
}

// WriteEntityAudit synchronously writes a single audit trail entry for a
// generic entity create, update, or delete event.
//
// It is a deliberate no-op for entities in auditExcludedEntities (AuditTrail,
// Notification, EmployeeLocation, RolePermission) so callers do not need to guard
// against those cases themselves.
//
// record must be the Go struct pointer of the current state of the record
// (post-create, post-update, or pre-delete) so that HomeID and title fields
// can be extracted via reflection.
//
// beforeData / afterData are raw JSON snapshots; pass nil where not applicable.
//
// This write is synchronous (not fire-and-forget) so that, by the time the
// HTTP handler returns, the audit entry is guaranteed committed rather than
// riding on a background goroutine that a process restart/crash between the
// response and the goroutine's completion could silently drop. A failure here
// is logged but never propagated to the caller — an audit-write problem must
// never fail the underlying create/update/delete the user actually asked for.
func WriteEntityAudit(
	orgID, email, userID, actorRole, ipAddress,
	entityName, action string,
	beforeData, afterData []byte,
	record interface{},
) {
	if auditExcludedEntities[entityName] {
		return
	}

	entityID := extractEntityID(record)
	severity := computeSeverity(entityName, action)
	homeID := extractHomeID(record)
	title := extractRecordTitle(record)
	ref := buildRecordReference(entityName, entityID)
	module := entityModuleMap[entityName] // shared map from module_permission.go

	if err := writeAuditEntrySync(models.AuditTrail{
		Base:            models.Base{OrgID: orgID, CreatedBy: email},
		UserID:          userID,
		ActorName:       email,
		ActorRole:       actorRole,
		EntityName:      entityName,
		EntityID:        entityID,
		ModuleName:      module,
		HomeID:          homeID,
		RecordReference: ref,
		RecordTitle:     title,
		Action:          action,
		Severity:        severity,
		BeforeData:      beforeData,
		AfterData:       afterData,
		IPAddress:       ipAddress,
	}); err != nil {
		log.Printf("WriteEntityAudit: failed to write audit entry for %s %s (id=%s): %v", action, entityName, entityID, err)
	}
}

// WriteAuditExportEvent records a bulk export of audit trail data (CSV, Excel,
// or PDF) as its own audit entry.
//
// AuditTrail is normally excluded from WriteEntityAudit as self-referential
// (see auditExcludedEntities), but exporting a batch of audit data is a
// distinct, sensitive action in its own right — e.g. it can be used to
// exfiltrate the full activity log — so it is deliberately logged here via a
// direct call to writeAuditEntrySync, the same exclusion-bypass pattern
// WritePermissionChangeAudit and LogPermissionDenied use.
//
// Unlike the fire-and-forget writeAuditEntry used elsewhere, this write is
// synchronous: the caller (LogAuditExport) only returns once the row is
// committed, so the frontend's immediate query invalidation/refetch is
// guaranteed to see it rather than racing a background goroutine.
func WriteAuditExportEvent(orgID, email, userID, actorRole, ipAddress, format string, recordCount int) error {
	detail, _ := json.Marshal(map[string]interface{}{
		"format":       format,
		"record_count": recordCount,
	})
	return writeAuditEntrySync(models.AuditTrail{
		Base:            models.Base{OrgID: orgID, CreatedBy: email},
		UserID:          userID,
		ActorName:       email,
		ActorRole:       actorRole,
		EntityName:      "AuditTrail",
		ModuleName:      "compliance",
		RecordReference: "AuditTrail export (" + strings.ToUpper(format) + ")",
		RecordTitle:     fmt.Sprintf("%d record(s) exported", recordCount),
		Action:          "exported",
		Severity:        "medium",
		AfterData:       detail,
		IPAddress:       ipAddress,
	})
}
