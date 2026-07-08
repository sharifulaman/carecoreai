/**
 * logAudit — GDPR Article 5(2) / Ofsted/CQC compliant audit trail helper.
 * Wraps in try/catch so a failed audit log NEVER crashes the main operation.
 *
 * Sensitive fields that must NEVER appear in old/new values:
 * bank_account_number, bank_sort_code, ni_number, dbs_number, password
 *
 * Phase 9: extended with outcome/impact-specific action types and helpers.
 */

import { secureGateway } from "@/lib/secureGateway";

const SENSITIVE_FIELDS = new Set([
  "bank_account_number",
  "bank_sort_code",
  "ni_number",
  "dbs_number",
  "password",
]);

/**
 * Retention categories per HMRC / Ofsted / GDPR requirements.
 */
export const RETENTION = {
  payroll: "payroll",          // 7 years
  employment: "employment",    // 6 years after employment ends
  care_record: "care_record",  // 75 years (children's care)
  system: "system",            // 2 years
};

export const RETENTION_LABELS = {
  payroll: "7 yrs (HMRC)",
  employment: "6 yrs",
  care_record: "75 yrs",
  system: "2 yrs",
};

/**
 * Map entity name → retention category.
 */
function getRetentionCategory(entityName) {
  const map = {
    // Care records — 75-year retention (children's care)
    VisitReport: "care_record",
    Complaint: "care_record",
    ILSSessionLog: "care_record",
    Incident: "care_record",
    MissingFromHome: "care_record",
    SafeguardingRecord: "care_record",
    RiskAssessment: "care_record",
    RecordImpactOutcome: "care_record",
    SupportPlan: "care_record",
    PlacementPlan: "care_record",
    PathwayPlan: "care_record",
    Appointment: "care_record",
    // Employment
    StaffProfile: "employment",
    TrainingRecord: "employment",
    SupervisionRecord: "employment",
    AppraisalRecord: "employment",
    DisciplinaryRecord: "employment",
    LeaveRequest: "employment",
    LeaveBalance: "employment",
    StaffDocument: "employment",
    // Payroll
    Timesheet: "payroll",
    Payslip: "payroll",
    HMRC_RTI: "payroll",
  };
  return map[entityName] || "system";
}

// ─── Phase 9: Outcome / Impact audit action constants ────────────────────────
export const OUTCOME_ACTIONS = {
  CREATED:           "created",
  OUTCOME_ADDED:     "outcome_added",
  SUBMITTED:         "submitted",
  VIEWED:            "viewed",
  APPROVED:          "approved",
  CHANGES_REQUESTED: "changes_requested",
  AMENDED:           "updated",
  ESCALATED:         "escalated",
  EVIDENCE_UPLOADED: "uploaded",
  FOLLOW_UP_CREATED: "created",   // reuse created on follow-up HomeTasks
  FOLLOW_UP_DONE:    "updated",
  CLOSED:            "closed",
};

/**
 * Convenience wrapper for Phase-9 outcome audit events.
 * Uses AuditEvent (not AuditTrail) to feed the existing Audit Trail page.
 */
export async function logOutcomeAudit({
  action,            // one of OUTCOME_ACTIONS values
  actionLabel,       // human-readable e.g. "Manager approved"
  entityType,        // "VisitReport" | "Complaint" | etc.
  entityId,
  recordReference,   // e.g. complaint_id or report ID
  recordTitle,       // e.g. "Key Work Session – Jordan T."
  actorId,
  actorName,
  actorRole,
  homeId,
  residentId,
  orgId,
  oldValues = null,
  newValues = {},
  reasonComment = "",
  severity = "medium",
}) {
  try {
    await secureGateway.create("AuditEvent", {
      org_id: orgId,
      actor_user_id: actorId || "",
      actor_staff_id: actorId || "",
      actor_name: actorName || "Unknown",
      actor_role: actorRole || "unknown",
      action_type: action,
      module_name: "Outcome & Impact",
      entity_type: entityType,
      entity_id: entityId,
      record_reference: recordReference || entityId,
      record_title: recordTitle || `${entityType} outcome`,
      related_home_id: homeId || "",
      related_resident_id: residentId || "",
      severity,
      reason_comment: reasonComment,
      old_values: oldValues || undefined,
      new_values: newValues,
      workflow_stage_from: oldValues?.status || "",
      workflow_stage_to: newValues?.status || "",
    });
  } catch (err) {
    console.warn("[logOutcomeAudit] failed silently:", err?.message);
  }
}

/**
 * Sanitise an object so sensitive fields are replaced with a placeholder.
 */
function sanitise(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  let hasSensitive = false;
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(k)) {
      hasSensitive = true;
    } else {
      out[k] = v;
    }
  }
  if (hasSensitive) out._sensitive_fields_updated = true;
  return out;
}

/**
 * Main audit log function.
 *
 * @param {object} params
 * @param {string} params.entity_name      - e.g. "StaffProfile"
 * @param {string} params.entity_id        - record ID
 * @param {string} params.action           - "create" | "update" | "delete" | "view" | "status_change" | "export"
 * @param {string} params.changed_by       - StaffProfile.id of actor
 * @param {string} params.changed_by_name  - StaffProfile.full_name of actor
 * @param {object|null} params.old_values  - previous field values (sanitised automatically)
 * @param {object} params.new_values       - new field values (sanitised automatically)
 * @param {string|null} params.home_id
 * @param {string|null} params.resident_id
 * @param {string} params.org_id
 * @param {string} [params.description]    - human-readable summary
 * @param {string} [params.retention_category] - override auto-detected category
 */
export async function logAudit({
  entity_name,
  entity_id,
  action,
  changed_by,
  changed_by_name,
  old_values = null,
  new_values = {},
  home_id = null,
  resident_id = null,
  org_id,
  description,
  retention_category,
}) {
  try {
    const category = retention_category || getRetentionCategory(entity_name);
    await secureGateway.create("AuditTrail", {
      org_id,
      user_id: changed_by,
      username: changed_by_name,
      action,
      module: "HR",
      record_type: entity_name,
      record_id: entity_id,
      home_id: home_id || undefined,
      resident_id: resident_id || undefined,
      old_value: old_values ? sanitise(old_values) : undefined,
      new_value: sanitise(new_values),
      description: description || `${action} ${entity_name}${entity_id ? ` (${entity_id})` : ""}`,
      retention_category: category,
    });
  } catch (_err) {
    // Intentionally swallowed — audit failure must never crash the main operation.
    console.warn("[logAudit] failed silently:", _err?.message);
  }
}