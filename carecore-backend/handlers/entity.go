package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)




type homeDocumentInput struct {
	Title        string      `json:"title"`
	DocumentType string      `json:"document_type"`
	Type         string      `json:"type"`
	Reference    string      `json:"reference"`
	Details      string      `json:"details"`
	FileName     string      `json:"file_name"`
	FileURL      string      `json:"file_url"`
	ExpiryDate   interface{} `json:"expiry_date"`
	IssueDate    interface{} `json:"issue_date"`
	Notes        string      `json:"notes"`
}

func filterEmptyStrings(values []string) []string {
	filtered := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			filtered = append(filtered, trimmed)
		}
	}
	return filtered
}

func parseFlexibleTime(value interface{}) *time.Time {
	switch v := value.(type) {
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return nil
		}
		if parsed, err := time.Parse(time.RFC3339, trimmed); err == nil {
			return &parsed
		}
		if parsed, err := time.Parse("2006-01-02", trimmed); err == nil {
			return &parsed
		}
	case time.Time:
		return &v
	}
	return nil
}

var entityTimeFields = map[string][]string{
	"Home":             {"lease_start", "lease_end"},
	"HomeAsset":        {"purchase_date", "issue_date", "return_due_date", "next_service_date", "last_inspection_date", "pat_test_due", "replacement_due_date", "submitted_at"},
	"HomeDocument":     {"issue_date", "expiry_date"},
	"MedicationRecord": {"start_date", "end_date", "review_date"},
	"Resident": {
		"dob", "placement_start", "placement_end", "uk_arrival_date",
		"gp_registered_date", "health_updated_at",
		"education_enrolment_date", "education_expected_end_date", "education_updated_at",
		"leisure_updated_at",
	},
	"Appointment":         {"start_datetime", "end_datetime"},
	"EmploymentRecord":    {"start_date", "review_date"},
	"NEETRecord":          {"date_neet_started", "last_date_education_training_employment", "review_date", "manager_review_date"},
	"CouncilTaxExemption": {"start_date", "end_date", "renewal_date", "applied_date"},
	// Staff & HR
	"StaffProfile":              {"dob", "start_date", "end_date", "probation_end_date", "dbs_issue_date", "dbs_expiry", "rtw_check_date", "rtw_expiry_date", "rtw_follow_up_date", "opt_out_signed_date"},
	"StaffAvailabilityProfile":  {"first_aid_expiry", "medication_training_date", "medication_training_expiry", "manual_handling_expiry", "safeguarding_expiry"},
	"StaffAvailabilityOverride": {"date_from", "date_to", "approved_at"},
	"LeaveRequest":              {"approved_at"},
	"StaffExpense":              {"approved_at", "reviewed_at"},
	"Payslip":                   {"generated_at", "signed_at"},
	"StaffDocument":             {"signed_at"},
	"HRPolicyStaffAssignment":   {"due_date", "acknowledged_at", "signed_at", "viewed_at", "exempted_at", "last_reminder_sent_at"},
	"PolicyQuizResult":          {"completed_at"},
	"SupervisionRecord":         {"staff_acknowledged_at", "supervisor_signed_at", "supervisee_signed_at"},
	"AppraisalRecord":           {"appraiser_signed_at", "appraisee_signed_at", "reviewed_at"},
	"PerformanceGoal":           {},
	"SelfAssessment":            {},
	"LocationTrackingConsent":   {"consented_at", "revoked_at"},
	"EmployeeLocation":          {"timestamp"},
	"YPFeedbackSubmission":      {"submitted_at"},
	"SWPAFeedbackSubmission":    {"submitted_at"},
	"InternalAuditSubmission":   {"submitted_at"},
}

var entityJSONFields = map[string][]string{
	"PlacementPlan":          {"goals"},
	"ExternalSupportService": {"linked_resident_ids", "linked_home_ids", "accommodation_categories"},
	"CICReport":        {"report_data"},
	"Home":             {"documents"},
	"HomeCheck":        {"items"},
	"DailyChecklist":   {"items"},
	"Appointment":      {"attendees", "external_attendees", "cancelled_dates", "document_types", "document_urls"},
	"HomeLog":          {"attachments"},
	"MealPlan":         {"days"},
	"Reg44Report":      {"records_reviewed", "quality_standards", "previous_recommendations_actioned", "new_recommendations"},
	"Reg45Review":      {"overall_ratings_breakdown"},
	"SupportPlan":      {"sections"},
	"PathwayPlan":      {"sections"},
	"VisitReport":      {"kpi_data"},
	"AdvocacyRecord":   {"sessions"},
	"Payslip":          {"expense_lines"},
	"ContractTemplate": {"variables"},
	"Organisation":     {"settings", "hr_policy"},
	"StaffProfile":     {"onboarding_checklist"},
	"RolePermission":   {"enabled_modules"},
	"PolicyQuizResult": {"answers"},
	// Resident JSONB array fields
	"Resident":               {"allergies", "medical_conditions", "family_contacts", "leisure_other_clubs"},
	"BodyMap":                {"marks"},
	"EmploymentRecord":       {"evidence_urls"},
	"MaintenanceLog":         {"evidence_urls"},
	"PropertyMaintenance":    {"evidence_urls"},
	"YPFeedbackTemplate":     {"questions"},
	"YPFeedbackSubmission":   {"responses"},
	"SWPAFeedbackTemplate":   {"questions"},
	"SWPAFeedbackSubmission": {"responses"},
	"InternalAuditSubmission": {"staff_on_duty", "sections", "section_1_environment", "section_2_health_safety", "section_3_yp_records", "section_4_staff_compliance", "section_5_safeguarding"},
	"SupervisionRecord": {"agenda_items", "wellbeing_drivers", "reflective_questions", "training_needs", "actions", "concern_flags"},
	"AppraisalRecord": {"competency_scores", "evidence_snapshot", "feedback_summary", "self_assessment", "improvement_plan", "goals"},
}

// entityNumberFields maps entity names to fields that the frontend may send as strings
// but whose model columns are numeric (float64). Normalisation converts "" → nil
// and "30" → 30.0 so json.Unmarshal into a float64 struct field succeeds.
var entityNumberFields = map[string][]string{
	"EmploymentRecord":         {"hours_worked_per_week"},
	"StaffAvailabilityProfile": {"contracted_hours_per_week", "max_hours_per_day", "max_consecutive_days", "max_shifts_per_week", "min_rest_hours_between_shifts"},
	"HomeAsset":                {"quantity", "purchase_cost", "value"},
}

// entityUUIDFields lists uuid-typed columns per entity whose values may arrive
// with surrounding double-quotes when the source data was double-serialised
// (e.g. a varchar home_id stored as "\"uuid\"" then passed through JSON twice).
// We strip the outer quotes before the INSERT so PostgreSQL's uuid cast succeeds.
var entityUUIDFields = map[string][]string{
	"WelcomePack":         {"home_id", "uploaded_by"},
	"WelcomePackDocument": {"home_id", "uploaded_by"},
}

// entityStringArrayFields maps entity names to fields that are PostgreSQL text[]
// columns (pq.StringArray). When the frontend sends these as JSON arrays
// ([]interface{}) we must convert them before calling GORM Updates, otherwise
// GORM cannot bind []interface{} to a text[] column and silently skips the field.
var entityStringArrayFields = map[string][]string{
	"StaffProfile":             {"home_ids"},
	"Resident":                 {"education_days_attended"},
	"PlacementDetails":         {"domains"},
	"KPIRecord":                {"life_skills"},
	"SWPerformanceKPI":         {"life_skills"},
	"DailyLog":                 {"flags"},
	"StaffAvailabilityProfile": {"preferred_shift_types", "unavailable_shift_types", "fixed_days_off", "preferred_days_off"},
	"ILSPlan":                  {},
	"PAVisit":                  {"topics_discussed"},
	"StaffPerformance":         {"key_strengths", "areas_for_improvement"},
	"LAReview":                 {"attendees"},
}

func normalizeEntityData(entityName string, data map[string]interface{}) error {
	if entityName == "Resident" {
		if val, exists := data["minimum_contact_hours_per_week"]; exists {
			data["min_contact_hours_per_week"] = val
			delete(data, "minimum_contact_hours_per_week")
		}
	}

	if entityName == "Notification" {
		if data["user_id"] == nil || strings.TrimSpace(asString(data["user_id"])) == "" {
			if recipientUserID := strings.TrimSpace(asString(data["recipient_user_id"])); recipientUserID != "" {
				data["user_id"] = recipientUserID
			}
		}
		if data["message"] == nil || strings.TrimSpace(asString(data["message"])) == "" {
			if body := strings.TrimSpace(asString(data["body"])); body != "" {
				data["message"] = body
			}
		}
		if data["related_module"] == nil || strings.TrimSpace(asString(data["related_module"])) == "" {
			if title := strings.TrimSpace(asString(data["title"])); title != "" {
				data["related_module"] = title
			}
		}
		if data["link_url"] == nil || strings.TrimSpace(asString(data["link_url"])) == "" {
			if link := strings.TrimSpace(asString(data["link"])); link != "" {
				data["link_url"] = link
			}
		}
		if data["read"] == nil {
			if isRead, exists := data["is_read"]; exists {
				data["read"] = isRead
			}
		}
	}

	for _, field := range entityTimeFields[entityName] {
		raw, exists := data[field]
		if !exists {
			continue
		}
		if raw == nil {
			continue
		}
		if text, ok := raw.(string); ok && strings.TrimSpace(text) == "" {
			data[field] = nil
			continue
		}
		if parsed := parseFlexibleTime(raw); parsed != nil {
			data[field] = parsed
		}
	}

	for _, field := range entityJSONFields[entityName] {
		raw, exists := data[field]
		if !exists || raw == nil {
			continue
		}
		if _, ok := raw.(string); ok {
			continue
		}
		encoded, err := json.Marshal(raw)
		if err != nil {
			return err
		}
		data[field] = datatypes.JSON(encoded)
	}

	// Convert string numbers → float64 for numeric columns when the frontend sends
	// the value of an <input type="number"> via e.target.value (always a string).
	for _, field := range entityNumberFields[entityName] {
		raw, exists := data[field]
		if !exists || raw == nil {
			continue
		}
		if s, ok := raw.(string); ok {
			if strings.TrimSpace(s) == "" {
				data[field] = nil
			} else if f, err := strconv.ParseFloat(strings.TrimSpace(s), 64); err == nil {
				data[field] = f
			}
		}
	}

	// Convert JSON arrays ([]interface{}) → pq.StringArray for text[] columns.
	// GORM's map-based Updates cannot infer the PostgreSQL column type, so without
	// this conversion the driver silently skips the field and no data is written.
	for _, field := range entityStringArrayFields[entityName] {
		raw, exists := data[field]
		if !exists || raw == nil {
			continue
		}
		switch v := raw.(type) {
		case []interface{}:
			sa := make(pq.StringArray, 0, len(v))
			for _, item := range v {
				if s, ok := item.(string); ok {
					sa = append(sa, strings.TrimSpace(s))
				}
			}
			data[field] = sa
		case []string:
			sa := make(pq.StringArray, len(v))
			copy(sa, v)
			data[field] = sa
		}
	}

	for _, field := range entityUUIDFields[entityName] {
		raw, ok := data[field]
		if !ok || raw == nil {
			continue
		}
		s, ok := raw.(string)
		if !ok {
			continue
		}
		// Strip surrounding double-quotes from double-serialised UUID values.
		if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
			s = s[1 : len(s)-1]
		}
		// Null out non-UUID placeholder values so the uuid column accepts NULL.
		trimmed := strings.TrimSpace(s)
		if trimmed == "" || trimmed == "unknown" {
			data[field] = nil
		} else {
			data[field] = s
		}
	}

	return nil
}

func asString(value interface{}) string {
	if text, ok := value.(string); ok {
		return text
	}
	return ""
}

// entityRegistry maps frontend entity names to GORM models and table names
var entityRegistry = map[string]func() interface{}{
	"Organisation":               func() interface{} { return &models.Organisation{} },
	"StaffProfile":               func() interface{} { return &models.StaffProfile{} },
	"StaffPerformance":           func() interface{} { return &models.StaffPerformance{} },
	"Home":                       func() interface{} { return &models.Home{} },
	"Resident":                   func() interface{} { return &models.Resident{} },
	"DailyChecklist":             func() interface{} { return &models.DailyChecklist{} },
	"DailyLog":                   func() interface{} { return &models.DailyLog{} },
	"VisitReport":                func() interface{} { return &models.VisitReport{} },
	"KPIRecord":                  func() interface{} { return &models.KPIRecord{} },
	"SWPerformanceKPI":           func() interface{} { return &models.SWPerformanceKPI{} },
	"SupportPlan":                func() interface{} { return &models.SupportPlan{} },
	"ILSPlan":                    func() interface{} { return &models.ILSPlan{} },
	"ILSPlanSection":             func() interface{} { return &models.ILSPlanSection{} },
	"CICReport":                  func() interface{} { return &models.CICReport{} },
	"AccidentReport":             func() interface{} { return &models.AccidentReport{} },
	"SafeguardingRecord":         func() interface{} { return &models.SafeguardingRecord{} },
	"MedicationRecord":           func() interface{} { return &models.MedicationRecord{} },
	"MAREntry":                   func() interface{} { return &models.MAREntry{} },
	"GPAppointment":              func() interface{} { return &models.GPAppointment{} },
	"Appointment":                func() interface{} { return &models.Appointment{} },
	"FamilyContact":              func() interface{} { return &models.FamilyContact{} },
	"PathwayPlan":                func() interface{} { return &models.PathwayPlan{} },
	"PlacementPlan":              func() interface{} { return &models.PlacementPlan{} },
	"PAVisit":                    func() interface{} { return &models.PAVisit{} },
	"PADetails":                  func() interface{} { return &models.PADetails{} },
	"LAReview":                   func() interface{} { return &models.LAReview{} },
	"Bill":                       func() interface{} { return &models.Bill{} },
	"HomeDocument":               func() interface{} { return &models.HomeDocument{} },
	"HomeTask":                   func() interface{} { return &models.HomeTask{} },
	"HomeLog":                    func() interface{} { return &models.HomeLog{} },
	"MaintenanceLog":             func() interface{} { return &models.MaintenanceLog{} },
	"PropertyMaintenance":        func() interface{} { return &models.PropertyMaintenance{} },
	"MaintenanceSchedule":        func() interface{} { return &models.MaintenanceSchedule{} },
	"MaintenanceContract":        func() interface{} { return &models.MaintenanceContract{} },
	"HomeAsset":                  func() interface{} { return &models.HomeAsset{} },
	"HomeCheck":                  func() interface{} { return &models.HomeCheck{} },
	"HomeCheckTemplate":          func() interface{} { return &models.HomeCheckTemplate{} },
	"HomeCheckTemplateItem":      func() interface{} { return &models.HomeCheckTemplateItem{} },
	"HomeCheckInstance":          func() interface{} { return &models.HomeCheckInstance{} },
	"HomeCheckCompletion":        func() interface{} { return &models.HomeCheckCompletion{} },
	"HomeCheckItemResponse":      func() interface{} { return &models.HomeCheckItemResponse{} },
	"HomeCheckIssue":             func() interface{} { return &models.HomeCheckIssue{} },
	"HomeBudget":                 func() interface{} { return &models.HomeBudget{} },
	"HomeBudgetLine":             func() interface{} { return &models.HomeBudgetLine{} },
	"HomeExpense":                func() interface{} { return &models.HomeExpense{} },
	"MealPlan":                   func() interface{} { return &models.MealPlan{} },
	"VisitorLog":                 func() interface{} { return &models.VisitorLog{} },
	"OfstedNotification":         func() interface{} { return &models.OfstedNotification{} },
	"Reg44Report":                func() interface{} { return &models.Reg44Report{} },
	"Reg45Review":                func() interface{} { return &models.Reg45Review{} },
	"AdmissionDischargeNotice":   func() interface{} { return &models.AdmissionDischargeNotice{} },
	"SignificantEvent":           func() interface{} { return &models.SignificantEvent{} },
	"ContingencyPlan":            func() interface{} { return &models.ContingencyPlan{} },
	"PolicyQuizResult":           func() interface{} { return &models.PolicyQuizResult{} },
	"ChildProtectionPolicy":      func() interface{} { return &models.ChildProtectionPolicy{} },
	"PolicyAcknowledgement":      func() interface{} { return &models.PolicyAcknowledgement{} },
	"Complaint":                  func() interface{} { return &models.Complaint{} },
	"MissingFromHome":            func() interface{} { return &models.MissingFromHome{} },
	"DeprivationOfLiberty":       func() interface{} { return &models.DeprivationOfLiberty{} },
	"BodyMap":                    func() interface{} { return &models.BodyMap{} },
	"PlacementFee":               func() interface{} { return &models.PlacementFee{} },
	"PlacementInvoice":           func() interface{} { return &models.PlacementInvoice{} },
	"PettyCash":                  func() interface{} { return &models.PettyCash{} },
	"PettyCashTransaction":       func() interface{} { return &models.PettyCashTransaction{} },
	"Shift":                      func() interface{} { return &models.Shift{} },
	"ShiftTemplate":              func() interface{} { return &models.ShiftTemplate{} },
	"ShiftHandover":              func() interface{} { return &models.ShiftHandover{} },
	"ShiftConflict":              func() interface{} { return &models.ShiftConflict{} },
	"HandoverRecord":             func() interface{} { return &models.HandoverRecord{} },
	"HandoverUpdate":             func() interface{} { return &models.HandoverUpdate{} },
	"HandoverYPSummary":          func() interface{} { return &models.HandoverYPSummary{} },
	"HandoverTask":               func() interface{} { return &models.HandoverTask{} },
	"HandoverDocument":           func() interface{} { return &models.HandoverDocument{} },
	"Rota":                       func() interface{} { return &models.Rota{} },
	"ResidentAllowance":          func() interface{} { return &models.ResidentAllowance{} },
	"ResidentSavings":            func() interface{} { return &models.ResidentSavings{} },
	"ResidentSavingsTransaction": func() interface{} { return &models.ResidentSavingsTransaction{} },
	"Notification":               func() interface{} { return &models.Notification{} },
	"KPIOption":                  func() interface{} { return &models.KPIOption{} },
	"StaffAvailabilityProfile":   func() interface{} { return &models.StaffAvailabilityProfile{} },
	"StaffAvailabilityOverride":  func() interface{} { return &models.StaffAvailabilityOverride{} },
	"StaffWeeklyAvailability":    func() interface{} { return &models.StaffWeeklyAvailability{} },
	"StaffServiceAssignment":     func() interface{} { return &models.StaffServiceAssignment{} },
	"StaffMovement":              func() interface{} { return &models.StaffMovement{} },
	// AuditTrail is intentionally absent from the generic entity registry.
	// All access is routed through GET /audit-trail which enforces rank-based
	// visibility. Using the generic endpoint would bypass that filter entirely.
	"WelcomePackDocument":  func() interface{} { return &models.WelcomePackDocument{} },
	"WelcomePack":          func() interface{} { return &models.WelcomePackDocument{} },
	"PlacementDetails":     func() interface{} { return &models.PlacementDetails{} },
	"FamilySocialPlan":     func() interface{} { return &models.FamilySocialPlan{} },
	"BehaviourSupportPlan": func() interface{} { return &models.BehaviourSupportPlan{} },
	"TherapeuticPlan":      func() interface{} { return &models.TherapeuticPlan{} },
	"RiskAssessment":       func() interface{} { return &models.RiskAssessment{} },
	"YPViewsRecord":        func() interface{} { return &models.YPViewsRecord{} },
	"ResidentDocument":     func() interface{} { return &models.ResidentDocument{} },
	"SupportPlanSignoff":   func() interface{} { return &models.SupportPlanSignoff{} },
	"ExploitationRisk":     func() interface{} { return &models.ExploitationRisk{} },
	"AdvocacyRecord":       func() interface{} { return &models.AdvocacyRecord{} },
	"Achievement":          func() interface{} { return &models.Achievement{} },
	"EmploymentRecord":     func() interface{} { return &models.EmploymentRecord{} },
	"NEETRecord":           func() interface{} { return &models.NEETRecord{} },
	"CouncilTaxExemption":  func() interface{} { return &models.CouncilTaxExemption{} },
	"Vacancy":              func() interface{} { return &models.Vacancy{} },
	"AgencyBankStaffUsage": func() interface{} { return &models.AgencyBankStaffUsage{} },
	// HR operational entities
	"PayPeriod":               func() interface{} { return &models.PayPeriod{} },
	"Timesheet":               func() interface{} { return &models.Timesheet{} },
	"Payslip":                 func() interface{} { return &models.Payslip{} },
	"AttendanceLog":           func() interface{} { return &models.AttendanceLog{} },
	"LeaveRequest":            func() interface{} { return &models.LeaveRequest{} },
	"LeaveBalance":            func() interface{} { return &models.LeaveBalance{} },
	"TOILBalance":             func() interface{} { return &models.TOILBalance{} },
	"SupervisionRecord":       func() interface{} { return &models.SupervisionRecord{} },
	"AppraisalRecord":         func() interface{} { return &models.AppraisalRecord{} },
	"DisciplinaryRecord":      func() interface{} { return &models.DisciplinaryRecord{} },
	"TrainingRequirement":     func() interface{} { return &models.TrainingRequirement{} },
	"TrainingRecord":          func() interface{} { return &models.TrainingRecord{} },
	"PerformanceGoal":         func() interface{} { return &models.PerformanceGoal{} },
	"SelfAssessment":          func() interface{} { return &models.SelfAssessment{} },
	"StaffExpense":            func() interface{} { return &models.StaffExpense{} },
	"WellbeingCheckIn":        func() interface{} { return &models.WellbeingCheckIn{} },
	"ReturnToWorkRecord":      func() interface{} { return &models.ReturnToWorkRecord{} },
	"StaffDocument":           func() interface{} { return &models.StaffDocument{} },
	"ContractTemplate":        func() interface{} { return &models.ContractTemplate{} },
	"HRPolicy":                func() interface{} { return &models.HRPolicy{} },
	"HRPolicyVersion":         func() interface{} { return &models.HRPolicyVersion{} },
	"HRPolicyActivityEvent":   func() interface{} { return &models.HRPolicyActivityEvent{} },
	"HRPolicyStaffAssignment": func() interface{} { return &models.HRPolicyStaffAssignment{} },
	"ApprovalWorkflow":        func() interface{} { return &models.ApprovalWorkflow{} },
	"LocationTrackingConsent": func() interface{} { return &models.LocationTrackingConsent{} },
	"EmployeeLocation":        func() interface{} { return &models.EmployeeLocation{} },
	"RolePermission":          func() interface{} { return &models.RolePermission{} },
	"ExternalSupportService": func() interface{} { return &models.ExternalSupportService{} },
	// 18+ care leaver & key person entities
	"KeyPerson":              func() interface{} { return &models.KeyPerson{} },
	"CareLeaverBenefit":      func() interface{} { return &models.CareLeaverBenefit{} },
	"PostMoveOnContact":      func() interface{} { return &models.PostMoveOnContact{} },
	"ILSSessionLog":          func() interface{} { return &models.ILSSessionLog{} },
	// Compliance & Audit
	"InternalAuditSubmission": func() interface{} { return &models.InternalAuditSubmission{} },
	"YPFeedbackTemplate":     func() interface{} { return &models.YPFeedbackTemplate{} },
	"YPFeedbackSubmission":   func() interface{} { return &models.YPFeedbackSubmission{} },
	"SWPAFeedbackTemplate":   func() interface{} { return &models.SWPAFeedbackTemplate{} },
	"SWPAFeedbackSubmission": func() interface{} { return &models.SWPAFeedbackSubmission{} },
}

// sliceRegistry returns a pointer to a slice for list queries
var sliceRegistry = map[string]func() interface{}{
	"Organisation":               func() interface{} { return &[]models.Organisation{} },
	"StaffProfile":               func() interface{} { return &[]models.StaffProfile{} },
	"StaffPerformance":           func() interface{} { return &[]models.StaffPerformance{} },
	"Home":                       func() interface{} { return &[]models.Home{} },
	"Resident":                   func() interface{} { return &[]models.Resident{} },
	"DailyChecklist":             func() interface{} { return &[]models.DailyChecklist{} },
	"DailyLog":                   func() interface{} { return &[]models.DailyLog{} },
	"VisitReport":                func() interface{} { return &[]models.VisitReport{} },
	"KPIRecord":                  func() interface{} { return &[]models.KPIRecord{} },
	"SWPerformanceKPI":           func() interface{} { return &[]models.SWPerformanceKPI{} },
	"SupportPlan":                func() interface{} { return &[]models.SupportPlan{} },
	"ILSPlan":                    func() interface{} { return &[]models.ILSPlan{} },
	"ILSPlanSection":             func() interface{} { return &[]models.ILSPlanSection{} },
	"CICReport":                  func() interface{} { return &[]models.CICReport{} },
	"AccidentReport":             func() interface{} { return &[]models.AccidentReport{} },
	"SafeguardingRecord":         func() interface{} { return &[]models.SafeguardingRecord{} },
	"MedicationRecord":           func() interface{} { return &[]models.MedicationRecord{} },
	"MAREntry":                   func() interface{} { return &[]models.MAREntry{} },
	"GPAppointment":              func() interface{} { return &[]models.GPAppointment{} },
	"Appointment":                func() interface{} { return &[]models.Appointment{} },
	"FamilyContact":              func() interface{} { return &[]models.FamilyContact{} },
	"PathwayPlan":                func() interface{} { return &[]models.PathwayPlan{} },
	"PlacementPlan":              func() interface{} { return &[]models.PlacementPlan{} },
	"PAVisit":                    func() interface{} { return &[]models.PAVisit{} },
	"PADetails":                  func() interface{} { return &[]models.PADetails{} },
	"LAReview":                   func() interface{} { return &[]models.LAReview{} },
	"Bill":                       func() interface{} { return &[]models.Bill{} },
	"HomeDocument":               func() interface{} { return &[]models.HomeDocument{} },
	"HomeTask":                   func() interface{} { return &[]models.HomeTask{} },
	"HomeLog":                    func() interface{} { return &[]models.HomeLog{} },
	"MaintenanceLog":             func() interface{} { return &[]models.MaintenanceLog{} },
	"PropertyMaintenance":        func() interface{} { return &[]models.PropertyMaintenance{} },
	"MaintenanceSchedule":        func() interface{} { return &[]models.MaintenanceSchedule{} },
	"MaintenanceContract":        func() interface{} { return &[]models.MaintenanceContract{} },
	"HomeAsset":                  func() interface{} { return &[]models.HomeAsset{} },
	"HomeCheck":                  func() interface{} { return &[]models.HomeCheck{} },
	"HomeCheckTemplate":          func() interface{} { return &[]models.HomeCheckTemplate{} },
	"HomeCheckTemplateItem":      func() interface{} { return &[]models.HomeCheckTemplateItem{} },
	"HomeCheckInstance":          func() interface{} { return &[]models.HomeCheckInstance{} },
	"HomeCheckCompletion":        func() interface{} { return &[]models.HomeCheckCompletion{} },
	"HomeCheckItemResponse":      func() interface{} { return &[]models.HomeCheckItemResponse{} },
	"HomeCheckIssue":             func() interface{} { return &[]models.HomeCheckIssue{} },
	"HomeBudget":                 func() interface{} { return &[]models.HomeBudget{} },
	"HomeBudgetLine":             func() interface{} { return &[]models.HomeBudgetLine{} },
	"HomeExpense":                func() interface{} { return &[]models.HomeExpense{} },
	"MealPlan":                   func() interface{} { return &[]models.MealPlan{} },
	"VisitorLog":                 func() interface{} { return &[]models.VisitorLog{} },
	"OfstedNotification":         func() interface{} { return &[]models.OfstedNotification{} },
	"Reg44Report":                func() interface{} { return &[]models.Reg44Report{} },
	"Reg45Review":                func() interface{} { return &[]models.Reg45Review{} },
	"AdmissionDischargeNotice":   func() interface{} { return &[]models.AdmissionDischargeNotice{} },
	"SignificantEvent":           func() interface{} { return &[]models.SignificantEvent{} },
	"ContingencyPlan":            func() interface{} { return &[]models.ContingencyPlan{} },
	"PolicyQuizResult":           func() interface{} { return &[]models.PolicyQuizResult{} },
	"ChildProtectionPolicy":      func() interface{} { return &[]models.ChildProtectionPolicy{} },
	"PolicyAcknowledgement":      func() interface{} { return &[]models.PolicyAcknowledgement{} },
	"Complaint":                  func() interface{} { return &[]models.Complaint{} },
	"MissingFromHome":            func() interface{} { return &[]models.MissingFromHome{} },
	"DeprivationOfLiberty":       func() interface{} { return &[]models.DeprivationOfLiberty{} },
	"BodyMap":                    func() interface{} { return &[]models.BodyMap{} },
	"PlacementFee":               func() interface{} { return &[]models.PlacementFee{} },
	"PlacementInvoice":           func() interface{} { return &[]models.PlacementInvoice{} },
	"PettyCash":                  func() interface{} { return &[]models.PettyCash{} },
	"PettyCashTransaction":       func() interface{} { return &[]models.PettyCashTransaction{} },
	"Shift":                      func() interface{} { return &[]models.Shift{} },
	"ShiftTemplate":              func() interface{} { return &[]models.ShiftTemplate{} },
	"ShiftHandover":              func() interface{} { return &[]models.ShiftHandover{} },
	"ShiftConflict":              func() interface{} { return &[]models.ShiftConflict{} },
	"HandoverRecord":             func() interface{} { return &[]models.HandoverRecord{} },
	"HandoverUpdate":             func() interface{} { return &[]models.HandoverUpdate{} },
	"HandoverYPSummary":          func() interface{} { return &[]models.HandoverYPSummary{} },
	"HandoverTask":               func() interface{} { return &[]models.HandoverTask{} },
	"HandoverDocument":           func() interface{} { return &[]models.HandoverDocument{} },
	"Rota":                       func() interface{} { return &[]models.Rota{} },
	"ResidentAllowance":          func() interface{} { return &[]models.ResidentAllowance{} },
	"ResidentSavings":            func() interface{} { return &[]models.ResidentSavings{} },
	"ResidentSavingsTransaction": func() interface{} { return &[]models.ResidentSavingsTransaction{} },
	"Notification":               func() interface{} { return &[]models.Notification{} },
	"KPIOption":                  func() interface{} { return &[]models.KPIOption{} },
	"StaffAvailabilityProfile":   func() interface{} { return &[]models.StaffAvailabilityProfile{} },
	"StaffAvailabilityOverride":  func() interface{} { return &[]models.StaffAvailabilityOverride{} },
	"StaffWeeklyAvailability":    func() interface{} { return &[]models.StaffWeeklyAvailability{} },
	"StaffServiceAssignment":     func() interface{} { return &[]models.StaffServiceAssignment{} },
	"StaffMovement":              func() interface{} { return &[]models.StaffMovement{} },
	// AuditTrail excluded — see entityRegistry comment above.
	"WelcomePackDocument":  func() interface{} { return &[]models.WelcomePackDocument{} },
	"WelcomePack":          func() interface{} { return &[]models.WelcomePackDocument{} },
	"PlacementDetails":     func() interface{} { return &[]models.PlacementDetails{} },
	"FamilySocialPlan":     func() interface{} { return &[]models.FamilySocialPlan{} },
	"BehaviourSupportPlan": func() interface{} { return &[]models.BehaviourSupportPlan{} },
	"TherapeuticPlan":      func() interface{} { return &[]models.TherapeuticPlan{} },
	"RiskAssessment":       func() interface{} { return &[]models.RiskAssessment{} },
	"YPViewsRecord":        func() interface{} { return &[]models.YPViewsRecord{} },
	"ResidentDocument":     func() interface{} { return &[]models.ResidentDocument{} },
	"SupportPlanSignoff":   func() interface{} { return &[]models.SupportPlanSignoff{} },
	"ExploitationRisk":     func() interface{} { return &[]models.ExploitationRisk{} },
	"AdvocacyRecord":       func() interface{} { return &[]models.AdvocacyRecord{} },
	"Achievement":          func() interface{} { return &[]models.Achievement{} },
	"EmploymentRecord":     func() interface{} { return &[]models.EmploymentRecord{} },
	"NEETRecord":           func() interface{} { return &[]models.NEETRecord{} },
	"CouncilTaxExemption":  func() interface{} { return &[]models.CouncilTaxExemption{} },
	"Vacancy":              func() interface{} { return &[]models.Vacancy{} },
	"AgencyBankStaffUsage": func() interface{} { return &[]models.AgencyBankStaffUsage{} },
	// HR operational entities
	"PayPeriod":               func() interface{} { return &[]models.PayPeriod{} },
	"Timesheet":               func() interface{} { return &[]models.Timesheet{} },
	"Payslip":                 func() interface{} { return &[]models.Payslip{} },
	"AttendanceLog":           func() interface{} { return &[]models.AttendanceLog{} },
	"LeaveRequest":            func() interface{} { return &[]models.LeaveRequest{} },
	"LeaveBalance":            func() interface{} { return &[]models.LeaveBalance{} },
	"TOILBalance":             func() interface{} { return &[]models.TOILBalance{} },
	"SupervisionRecord":       func() interface{} { return &[]models.SupervisionRecord{} },
	"AppraisalRecord":         func() interface{} { return &[]models.AppraisalRecord{} },
	"DisciplinaryRecord":      func() interface{} { return &[]models.DisciplinaryRecord{} },
	"TrainingRequirement":     func() interface{} { return &[]models.TrainingRequirement{} },
	"TrainingRecord":          func() interface{} { return &[]models.TrainingRecord{} },
	"PerformanceGoal":         func() interface{} { return &[]models.PerformanceGoal{} },
	"SelfAssessment":          func() interface{} { return &[]models.SelfAssessment{} },
	"StaffExpense":            func() interface{} { return &[]models.StaffExpense{} },
	"WellbeingCheckIn":        func() interface{} { return &[]models.WellbeingCheckIn{} },
	"ReturnToWorkRecord":      func() interface{} { return &[]models.ReturnToWorkRecord{} },
	"StaffDocument":           func() interface{} { return &[]models.StaffDocument{} },
	"ContractTemplate":        func() interface{} { return &[]models.ContractTemplate{} },
	"HRPolicy":                func() interface{} { return &[]models.HRPolicy{} },
	"HRPolicyVersion":         func() interface{} { return &[]models.HRPolicyVersion{} },
	"HRPolicyActivityEvent":   func() interface{} { return &[]models.HRPolicyActivityEvent{} },
	"HRPolicyStaffAssignment": func() interface{} { return &[]models.HRPolicyStaffAssignment{} },
	"ApprovalWorkflow":        func() interface{} { return &[]models.ApprovalWorkflow{} },
	"LocationTrackingConsent": func() interface{} { return &[]models.LocationTrackingConsent{} },
	"EmployeeLocation":        func() interface{} { return &[]models.EmployeeLocation{} },
	"RolePermission":          func() interface{} { return &[]models.RolePermission{} },
	"ExternalSupportService": func() interface{} { return &[]models.ExternalSupportService{} },
	// 18+ care leaver & key person entities
	"KeyPerson":              func() interface{} { return &[]models.KeyPerson{} },
	"CareLeaverBenefit":      func() interface{} { return &[]models.CareLeaverBenefit{} },
	"PostMoveOnContact":      func() interface{} { return &[]models.PostMoveOnContact{} },
	"ILSSessionLog":          func() interface{} { return &[]models.ILSSessionLog{} },
	// Compliance & Audit
	"InternalAuditSubmission": func() interface{} { return &[]models.InternalAuditSubmission{} },
	"YPFeedbackTemplate":     func() interface{} { return &[]models.YPFeedbackTemplate{} },
	"YPFeedbackSubmission":   func() interface{} { return &[]models.YPFeedbackSubmission{} },
	"SWPAFeedbackTemplate":   func() interface{} { return &[]models.SWPAFeedbackTemplate{} },
	"SWPAFeedbackSubmission": func() interface{} { return &[]models.SWPAFeedbackSubmission{} },
}

// applyScope injects org_id and role-based home filtering
func applyScope(q *gorm.DB, claims *services.Claims, entityName string) *gorm.DB {
	q = q.Where("org_id = ? AND is_deleted = false", claims.OrgID)

	// Home-scoped entities for non-admins
	homeScoped := map[string]bool{
		"Resident": true, "DailyLog": true, "VisitReport": true,
		"Shift": true, "ShiftHandover": true, "ShiftConflict": true, "Rota": true,
		"HandoverRecord": true, "HandoverUpdate": true, "HandoverYPSummary": true, "HandoverTask": true, "HandoverDocument": true,
		"Bill": true, "PettyCash": true, "PettyCashTransaction": true,
		"AccidentReport": true, "HomeDocument": true, "HomeTask": true,
		"HomeLog": true, "MaintenanceLog": true, "PropertyMaintenance": true, "MaintenanceSchedule": true, "MaintenanceContract": true, "HomeAsset": true, "HomeCheck": true,
		"HomeCheckInstance": true, "HomeCheckCompletion": true, "HomeCheckIssue": true,
		"HomeBudget": true, "HomeBudgetLine": true, "HomeExpense": true, "MealPlan": true,
		"VisitorLog": true, "OfstedNotification": true, "Reg44Report": true, "Reg45Review": true, "ContingencyPlan": true,
		"SignificantEvent": true, "Complaint": true, "MissingFromHome": true, "DeprivationOfLiberty": true, "Referral": true,
		"PlacementFee": true, "PlacementInvoice": true,
		"SafeguardingRecord": true, "BodyMap": true, "MedicationRecord": true,
		"GPAppointment": true, "SupportPlan": true,
		"WelcomePackDocument": true, "WelcomePack": true, "PlacementDetails": true, "FamilySocialPlan": true,
		"BehaviourSupportPlan": true, "TherapeuticPlan": true, "RiskAssessment": true,
		"YPViewsRecord": true, "ResidentDocument": true, "SupportPlanSignoff": true,
		"ExploitationRisk": true, "AdvocacyRecord": true, "Achievement": true,
		"EmploymentRecord":    true,
		"NEETRecord":          true,
		"CouncilTaxExemption": true,
		"Appointment":         true, "FamilyContact": true, "PathwayPlan": true, "PlacementPlan": true,
		"PAVisit": true, "PADetails": true, "LAReview": true,
		"ILSPlan": true, "ILSPlanSection": true,
		"KeyPerson": true, "CareLeaverBenefit": true, "PostMoveOnContact": true, "ILSSessionLog": true,
		"YPFeedbackSubmission": true, "SWPAFeedbackSubmission": true,
	}

	if claims.Role != "admin" && homeScoped[entityName] && len(claims.HomeIDs) > 0 {
		q = q.Where("home_id IN ?", claims.HomeIDs)
	}
	return q
}

// applyFilters parses query params and builds WHERE clauses
func applyFilters(q *gorm.DB, c *gin.Context, skip map[string]bool) *gorm.DB {
	for key, vals := range c.Request.URL.Query() {
		if skip[key] {
			continue
		}
		val := vals[0]

		// Handle operator syntax: field[$op]=value
		if strings.Contains(key, "[$") {
			parts := strings.SplitN(key, "[$", 2)
			field := parts[0]
			op := strings.TrimSuffix(parts[1], "]")
			switch op {
			case "gte":
				q = q.Where(field+" >= ?", val)
			case "gt":
				q = q.Where(field+" > ?", val)
			case "lte":
				q = q.Where(field+" <= ?", val)
			case "lt":
				q = q.Where(field+" < ?", val)
			case "ne":
				q = q.Where(field+" != ?", val)
			case "in":
				q = q.Where(field+" IN ?", strings.Split(val, ","))
			case "nin":
				q = q.Where(field+" NOT IN ?", strings.Split(val, ","))
			case "contains":
				q = q.Where(field+" ILIKE ?", "%"+val+"%")
			case "startsWith":
				q = q.Where(field+" ILIKE ?", val+"%")
			case "exists":
				if val == "true" {
					q = q.Where(field + " IS NOT NULL")
				} else {
					q = q.Where(field + " IS NULL")
				}
			}
		} else {
			// Simple equality
			q = q.Where(key+" = ?", val)
		}
	}
	return q
}

// saveJSONBFields explicitly re-saves JSONB columns using a ::jsonb cast after a
// CREATE or UPDATE. GORM's map-based Updates passes datatypes.JSON as []byte;
// some lib/pq + PostgreSQL version combinations infer it as bytea instead of
// jsonb, silently leaving the column at its default. UpdateColumn + gorm.Expr
// bypasses hooks/validations and writes the raw SQL expression directly.
func saveJSONBFields(scopedDB *gorm.DB, entityName string, record interface{}, id string, data map[string]interface{}) {
	fields := entityJSONFields[entityName]
	if len(fields) == 0 || id == "" {
		return
	}
	for _, field := range fields {
		raw, ok := data[field]
		if !ok {
			continue
		}
		jsonData, ok := raw.(datatypes.JSON)
		if !ok || len(jsonData) == 0 {
			continue
		}
		scopedDB.Model(record).Where("id = ?", id).UpdateColumn(field, gorm.Expr("?::jsonb", string(jsonData)))
	}
}

// populateHomeStaffAssignments fetches support workers and team leaders for homes
func populateHomeStaffAssignments(scopedDB *gorm.DB,homes interface{}) {
	// Handle both single Home and []Home slice
	var homeList []*models.Home

	switch v := homes.(type) {
	case *models.Home:
		homeList = []*models.Home{v}
	case []*models.Home:
		homeList = v
	case *[]models.Home:
		for i := range *v {
			homeList = append(homeList, &(*v)[i])
		}
	default:
		return
	}

	if len(homeList) == 0 {
		return
	}

	// Collect all home IDs
	homeIDs := make([]string, len(homeList))
	for i, h := range homeList {
		homeIDs[i] = h.ID.String()
	}

	// Fetch all staff assignments for these homes
	var assignments []models.StaffServiceAssignment
	if err := scopedDB.Where("home_id IN ? AND active = true", homeIDs).Find(&assignments).Error; err != nil {
		return
	}

	// Group assignments by home ID
	assignmentsByHome := make(map[string][]models.StaffServiceAssignment)
	for _, a := range assignments {
		assignmentsByHome[a.HomeID] = append(assignmentsByHome[a.HomeID], a)
	}

	// Fetch all staff profiles to get their roles
	var staffProfiles []models.StaffProfile
	if err := scopedDB.Find(&staffProfiles).Error; err != nil {
		return
	}

	staffByID := make(map[string]*models.StaffProfile)
	for i, s := range staffProfiles {
		staffByID[s.ID.String()] = &staffProfiles[i]
	}

	// Populate support_worker_ids and team_leader_ids for each home
	for _, home := range homeList {
		supportWorkerIDs := make([]string, 0)
		teamLeaderIDs := make([]string, 0)
		assignedStaffIDs := make([]string, 0)

		for _, assignment := range assignmentsByHome[home.ID.String()] {
			staff, ok := staffByID[assignment.StaffID]
			if !ok {
				continue
			}

			if staff.Role == "team_leader" {
				teamLeaderIDs = append(teamLeaderIDs, assignment.StaffID)
			} else if staff.Role == "support_worker" {
				supportWorkerIDs = append(supportWorkerIDs, assignment.StaffID)
			}
			// AssignedStaffIDs covers every role (team_leader, team_manager,
			// regional_manager, support_worker, ...) so dashboards for roles beyond
			// team_leader/support_worker don't need their own bespoke lookup.
			assignedStaffIDs = append(assignedStaffIDs, assignment.StaffID)
		}

		home.SupportWorkerIDs = supportWorkerIDs
		home.TeamLeaderIDs = teamLeaderIDs
		home.AssignedStaffIDs = assignedStaffIDs
	}
}

// ListEntities handles GET /entities/:entity
func ListEntities(c *gin.Context) {
	entityName := c.Param("entity")
	newSlice, ok := sliceRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity: " + entityName}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return // error response already written
	}

	claims := middleware.GetClaims(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	sort := c.DefaultQuery("sort", "-created_date")
	if page < 1 {
		page = 1
	}
	if limit > 500 {
		limit = 500
	}
	offset := (page - 1) * limit

	// Build sort
	orderStr := "created_date DESC"
	if sort != "" {
		if strings.HasPrefix(sort, "-") {
			orderStr = strings.TrimPrefix(sort, "-") + " DESC"
		} else {
			orderStr = sort + " ASC"
		}
	}

	// Support _sort alias (some frontend query builders use _sort instead of sort)
	if s := c.Query("_sort"); s != "" && sort == "-created_date" {
		sort = s
		if dir := c.Query("_order"); strings.EqualFold(dir, "asc") {
			sort = strings.TrimPrefix(sort, "-")
		} else if !strings.HasPrefix(sort, "-") {
			sort = "-" + sort
		}
	}

	skipParams := map[string]bool{"page": true, "limit": true, "sort": true, "_sort": true, "_order": true}
	q := scopedDB.Model(entityRegistry[entityName]())
	q = applyScope(q, claims, entityName)
	q = applyFilters(q, c, skipParams)

	var total int64
	q.Count(&total)

	results := newSlice()
	q.Order(orderStr).Limit(limit).Offset(offset).Find(results)

	// Populate staff assignments for homes
	if entityName == "Home" {
		populateHomeStaffAssignments(scopedDB, results)
	}

	pages := int(total) / limit
	if int(total)%limit != 0 {
		pages++
	}

	c.Header("X-Total-Count", strconv.FormatInt(total, 10))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   results,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": pages,
		},
		"timestamp": time.Now(),
	})
}

// GetEntity handles GET /entities/:entity/:id
func GetEntity(c *gin.Context) {
	entityName := c.Param("entity")
	id := c.Param("id")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	claims := middleware.GetClaims(c)
	result := newModel()
	q := scopedDB.Where("id = ? AND org_id = ? AND is_deleted = false", id, claims.OrgID)
	if err := q.First(result).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": entityName + " not found"}})
		return
	}

	// Populate staff assignments for homes
	if entityName == "Home" {
		populateHomeStaffAssignments(scopedDB, result)
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": result, "timestamp": time.Now()})
}

// CreateEntity handles POST /entities/:entity
// func CreateEntity(c *gin.Context) {
// 	entityName := c.Param("entity")
// 	newModel, ok := entityRegistry[entityName]
// 	if !ok {
// 		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
// 		return
// 	}

// 	claims := middleware.GetClaims(c)

// 	var body map[string]interface{}
// 	if err := c.ShouldBindJSON(&body); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
// 		return
// 	}

// 	// Support both {data: {...}} and flat body
// 	data, hasData := body["data"].(map[string]interface{})
// 	if !hasData {
// 		data = body
// 	}

// 	// Inject auth context
// 	data["org_id"] = claims.OrgID
// 	data["created_by"] = claims.Email

// 	// Generate UUID and timestamps manually since we use map (not struct)
// 	data["id"] = uuid.New().String()
// 	data["created_date"] = time.Now().UTC()
// 	data["updated_date"] = time.Now().UTC()
// 	data["is_deleted"] = false

// 	// Use the struct model so GORM knows the table
// 	record := newModel()
// 	if err := scopedDB.Model(record).Create(data).Error; err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()}})
// 		return
// 	}

// 	// Fetch and return the created record
// 	created := newModel()
// 	scopedDB.Where("id = ?", data["id"]).First(created)

//		c.JSON(http.StatusCreated, gin.H{"status": "success", "data": created, "timestamp": time.Now()})
//	}
func CreateEntity(c *gin.Context) {
	entityName := c.Param("entity")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	claims := middleware.GetClaims(c)

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	data, hasData := body["data"].(map[string]interface{})
	if !hasData {
		data = body
	}

	var documentInputs []homeDocumentInput
	var documentsJSON datatypes.JSON
	if rawDocs, ok := data["documents"]; ok {
		if docsBytes, err := json.Marshal(rawDocs); err == nil {
			documentsJSON = datatypes.JSON(docsBytes)
			_ = json.Unmarshal(docsBytes, &documentInputs)
		}
		delete(data, "documents")
	}

	// Inject auth context into map
	data["org_id"] = claims.OrgID
	data["created_by"] = claims.Email

	// ✅ Remove these — BeforeCreate on the struct handles them
	delete(data, "id")
	delete(data, "created_date")
	delete(data, "updated_date")
	delete(data, "is_deleted")

	if err := normalizeEntityData(entityName, data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	// ✅ Marshal map → JSON → unmarshal into struct so hooks fire
	record := newModel()
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()}})
		return
	}
	if err := json.Unmarshal(jsonBytes, record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()}})
		return
	}

	if entityName == "Home" {
		homeRecord := record.(*models.Home)
		if err := scopedDB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(record).Error; err != nil {
				return err
			}

			if len(documentInputs) == 0 {
				return nil
			}

			documentIDs := make([]string, 0, len(documentInputs))
			for _, input := range documentInputs {
				title := strings.TrimSpace(input.Title)
				if title == "" {
					title = strings.TrimSpace(input.Reference)
				}
				if title == "" {
					fallbackType := input.DocumentType
					if fallbackType == "" {
						fallbackType = input.Type
					}
					title = strings.TrimSpace(fallbackType)
				}
				if title == "" {
					title = "Home document"
				}

				docType := input.DocumentType
				if docType == "" {
					docType = input.Type
				}
				if docType == "" {
					docType = "other"
				}

				notes := strings.TrimSpace(strings.Join(filterEmptyStrings([]string{input.Reference, input.Details, input.FileName, input.Notes}), " | "))

				doc := models.HomeDocument{
					Base: models.Base{
						OrgID:     claims.OrgID,
						CreatedBy: claims.Email,
					},
					HomeID:       record.(*models.Home).ID.String(),
					Title:        title,
					DocumentType: docType,
					FileURL:      input.FileURL,
					Notes:        notes,
				}

				if parsed := parseFlexibleTime(input.ExpiryDate); parsed != nil {
					doc.ExpiryDate = parsed
				}
				if parsed := parseFlexibleTime(input.IssueDate); parsed != nil {
					doc.IssueDate = parsed
				}

				if err := tx.Create(&doc).Error; err != nil {
					return err
				}
				documentIDs = append(documentIDs, doc.ID.String())
			}

			homeRecord.DocumentIDs = models.DocumentIDList(documentIDs)
			if len(documentsJSON) > 0 {
				homeRecord.Documents = documentsJSON
			}
			if err := tx.Save(homeRecord).Error; err != nil {
				return err
			}
			return nil
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()}})
			return
		}
	} else {
		// ✅ Now BeforeCreate fires, ID gets generated by the hook
		if err := scopedDB.Create(record).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()}})
			return
		}
		// Explicit JSONB field save — bypasses lib/pq type-inference issues
		rv := reflect.ValueOf(record)
		if rv.Kind() == reflect.Ptr {
			rv = rv.Elem()
		}
		if idField := rv.FieldByName("ID"); idField.IsValid() {
			idStr := fmt.Sprintf("%v", idField.Interface())
			saveJSONBFields(scopedDB, entityName, record, idStr, data)
		}
	}

	// Flush backend permission cache and write an audit entry when a RolePermission
	// record is created so the change takes effect immediately.
	if entityName == "RolePermission" {
		if roleName, ok := data["role_name"].(string); ok && roleName != "" {
			middleware.InvalidatePermCache(claims.OrgID, roleName)
		}
		rv := reflect.ValueOf(record)
		if rv.Kind() == reflect.Ptr {
			rv = rv.Elem()
		}
		recordID := ""
		if idField := rv.FieldByName("ID"); idField.IsValid() {
			recordID = fmt.Sprintf("%v", idField.Interface())
		}
		afterBytes, _ := json.Marshal(data)
		middleware.WritePermissionChangeAudit(claims.OrgID, claims.Email, claims.UserID, claims.Role, recordID, "create", nil, afterBytes)
	}

	// Write a generic audit entry for every entity. RolePermission and other
	// excluded entities are silently skipped inside WriteEntityAudit.
	afterSnap, _ := json.Marshal(record)
	middleware.WriteEntityAudit(
		claims.OrgID, claims.Email, claims.UserID, claims.Role, c.ClientIP(),
		entityName, "created",
		nil, afterSnap,
		record,
	)

	c.JSON(http.StatusCreated, gin.H{"status": "success", "data": record, "timestamp": time.Now()})
}

// UpdateEntity handles PUT /entities/:entity/:id
func UpdateEntity(c *gin.Context) {
	entityName := c.Param("entity")
	id := c.Param("id")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	claims := middleware.GetClaims(c)
	record := newModel()
	if err := scopedDB.Where("id = ? AND org_id = ? AND is_deleted = false", id, claims.OrgID).First(record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": entityName + " not found"}})
		return
	}

	var body map[string]interface{}
	c.ShouldBindJSON(&body)
	data, hasData := body["data"].(map[string]interface{})
	if !hasData {
		data = body
	}

	// Remove protected fields
	delete(data, "id")
	delete(data, "org_id")
	delete(data, "created_by")
	delete(data, "created_date")
	delete(data, "is_deleted")

	// Always set updated_date
	data["updated_date"] = time.Now().UTC()

	if err := normalizeEntityData(entityName, data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	if err := scopedDB.Model(record).Where("id = ?", id).Updates(data).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()}})
		return
	}
	// Explicit JSONB field save — bypasses lib/pq type-inference issues
	saveJSONBFields(scopedDB,entityName, record, id, data)

	// Return updated record
	updated := newModel()
	scopedDB.Where("id = ?", id).First(updated)

	// Flush backend permission cache and write an audit entry when a RolePermission
	// record is updated so the change takes effect immediately.
	if entityName == "RolePermission" {
		if rp, ok := updated.(*models.RolePermission); ok {
			middleware.InvalidatePermCache(claims.OrgID, rp.RoleName)
		}
		beforeBytes, _ := json.Marshal(record)
		afterBytes, _ := json.Marshal(updated)
		middleware.WritePermissionChangeAudit(claims.OrgID, claims.Email, claims.UserID, claims.Role, id, "update", beforeBytes, afterBytes)
	}

	// Write a generic audit entry for every entity.
	beforeSnap, _ := json.Marshal(record)
	afterSnap, _ := json.Marshal(updated)
	middleware.WriteEntityAudit(
		claims.OrgID, claims.Email, claims.UserID, claims.Role, c.ClientIP(),
		entityName, "updated",
		beforeSnap, afterSnap,
		updated,
	)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": updated, "timestamp": time.Now()})
}

// DeleteEntity handles DELETE /entities/:entity/:id (soft delete)
func DeleteEntity(c *gin.Context) {
	entityName := c.Param("entity")
	id := c.Param("id")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	claims := middleware.GetClaims(c)
	record := newModel()
	if err := scopedDB.Where("id = ? AND org_id = ? AND is_deleted = false", id, claims.OrgID).First(record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": entityName + " not found"}})
		return
	}

	// Capture a snapshot before soft-deleting.
	beforeSnap, _ := json.Marshal(record)

	scopedDB.Model(record).Update("is_deleted", true)

	// Write audit entry — deletes are always high severity (handled inside WriteEntityAudit).
	middleware.WriteEntityAudit(
		claims.OrgID, claims.Email, claims.UserID, claims.Role, c.ClientIP(),
		entityName, "deleted",
		beforeSnap, nil,
		record,
	)

	c.JSON(http.StatusNoContent, nil)
}
