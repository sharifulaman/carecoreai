/**
 * logAudit — GDPR Article 5(2) / Ofsted/CQC compliant audit trail helper.
 * Wraps in try/catch so a failed audit log NEVER crashes the main operation.
 *
 * Sensitive fields that must NEVER appear in old/new values:
 * bank_account_number, bank_sort_code, ni_number, dbs_number, password
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
    StaffProfile: "employment",
    TrainingRecord: "employment",
    SupervisionRecord: "employment",
    AppraisalRecord: "employment",
    DisciplinaryRecord: "employment",
    LeaveRequest: "employment",
    LeaveBalance: "employment",
    StaffDocument: "employment",
    Timesheet: "payroll",
    Payslip: "payroll",
    HMRC_RTI: "payroll",
  };
  return map[entityName] || "system";
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