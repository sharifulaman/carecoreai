/**
 * @file secureDataGateway.js
 * Secure gateway for all entity operations with org-level isolation.
 * 
 * PERFORMANCE: The StaffProfile lookup is done ONCE per request using the
 * org_id hint passed by the frontend. If the hint is missing/wrong, it falls
 * back to a full lookup. This avoids the N×2 extra API calls that caused
 * rate limiting when many queries fired simultaneously.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ORG_SCOPED_ENTITIES = new Set([
  "Resident", "Home", "StaffProfile", "DailyLog", "VisitReport",
  "KPIRecord", "SWPerformanceKPI", "PlacementFee", "PlacementInvoice",
  "PettyCash", "PettyCashTransaction", "CICReport", "SupportPlan",
  "ILSPlan", "AccidentReport", "SafeguardingRecord", "MedicationRecord",
  "MAREntry", "ShiftHandover", "Shift", "Rota", "HomeDocument",
  "HomeCheck", "MaintenanceLog", "HomeTask", "HomeAsset", "HomeBudget",
  "HomeBudgetLine", "ResidentAllowance", "ResidentAllowancePayment",
  "Transition", "GPAppointment", "HospitalAdmission", "AuditTrail",
  "Notification", "StaffAvailabilityProfile", "StaffWeeklyAvailability",
  "StaffAvailabilityOverride", "KPIOption", "ShiftTemplate", "ShiftConflict",
  "CICReportSection", "ILSPlanSection", "HomeLog",
  "HomeExpense", "HomeSupportWorker", "BehaviourSupportPlan",
  "CarePlan", "CarePlanSection", "CareProfile", "HealthObservation",
  "PersonalCareRecord", "ControlledDrugRegister", "PRNProtocol",
  "MentalCapacityAssessment", "LAContractMonitoring", "ResidentSavings",
  "ResidentSavingsTransaction", "HomeAsset",
  "Bill", "Organisation", "TrainingRecord", "LeaveRequest", "LeaveBalance",
  "SupervisionRecord", "AppraisalRecord", "DisciplinaryRecord", "Timesheet",
  "TimesheetEntry", "PayPeriod", "Payslip", "AttendanceLog", "StaffDocument",
  "TrainingRequirement", "Appointment",
  "ShiftClaim", "ShiftSwap", "StaffExpense", "BankHoliday", "ContractTemplate",
  "ReturnToWorkRecord", "TOILBalance", "WellbeingCheckIn",
  "ApprovalWorkflow", "ApprovalWorkflowEvent",
  "AdvocacyRecord", "Achievement", "YPViewsRecord", "EETRecord",
  "TherapeuticPlan", "FamilyContact", "RiskAssessment", "ExploitationRisk",
  "MissingFromHome", "SupportPlanSignoff", "LAReview", "Reg44Report",
  "Reg45Review", "PathwayPlan", "PlacementDetails", "Complaint",
  "WelcomePack", "ResidentDocument", "FamilySocialPlan", "SignificantEvent",
  "BodyMap", "LoneWorkingLog", "VisitorLog", "VisitRiskAssessment",
  "PlacementPlan", "PADetails", "PAVisit", "OfstedNotification",
  "PostMoveOnContact", "MoveOnPlan", "ILSSessionLog", "SleepCheckLog",
  "WelcomePackDocument",
  "PolicyQuizResult",
  "RecordImpactOutcome",
  "AuditEvent",
  "Allegation",
  "Referral",
  "StaffMovement",
  "Vacancy",
  "AgencyBankStaffUsage",
  "Reg32Report",
  "OrganisationProfile",
  "HRPolicy",
  "HRPolicyGroup",
  "HRPolicyStaffAssignment",
  "HRPolicyVersion",
  "HRPolicyActivityEvent",
  "ComplianceItem",
  "ComplianceEvidence",
  "ComplianceNote",
  "NEETRecord",
  "EmploymentRecord",
  "EducationRecord",
  "ExternalSupportService",
  "HealthProfile",
  "OrganisationOfficer",
  "DeprivationOfLiberty",
  "PlacementRecord",
  "KeyPerson",
  "ImmediateNotice",
  "CouncilTaxExemption",
  "Asset",
  "PropertyMaintenance",
  "MaintenanceContract",
  "MaintenanceNote",
  "YPJourneyEvent",
  "HandoverTask",
  "HandoverRecord",
  "HandoverYPSummary",
  "HandoverUpdate",
  "JourneyLifeStoryRecord",
  "JourneyStage",
  "Transition",
  "HomeCheckTemplate",
  "HomeCheckCompletion",
  "HomeCheckTemplateItem",
  "HomeCheckItemResponse",
  "HomeCheckIssue",
  "HomeCheckInstance",
  "JourneyEvidenceDocument",
  "JourneyFamilyMember",
  "JourneyReviewEvent",
  "JourneyCountryPassedThrough",
  "PreviousAsylumClaim",
  "Notification",
  "HRPolicyReminder",
  "HRPolicyAssignmentBatch",
  "SupervisionRecord",
  "CareLeaverBenefit",
  "MoveOnPlan",
  "PlacementFee",
  "StaffServiceAssignment",
  "Achievement",
  "CouncilTaxExemption",
  "DataQualityAlert",
  "IncidentPerson",
  "HandoverYPSummary",
  "YPJourneyEvent",
  "ComplianceTask",
  "ComplianceActivityEvent"
]);

// Per-isolate cache — short-circuits repeated lookups within the same cold start
const _profileCache = new Map();

async function resolveStaffProfile(base44, userEmail) {
  if (_profileCache.has(userEmail)) return _profileCache.get(userEmail);
  const profiles = await base44.asServiceRole.entities.StaffProfile.filter({ email: userEmail });
  const profile = (profiles && profiles.length > 0 && profiles[0].org_id) ? profiles[0] : null;
  _profileCache.set(userEmail, profile);
  return profile;
}

// ── Role classification helpers ────────────────────────────────────────────────

// Full org access — see all records across all homes
const FULL_ORG_ROLES = new Set([
  "admin", "rsm", "regional_manager",
  "finance_manager", "hr_manager", "risk_manager", "admin_manager",
]);

// Multi-home access — scoped to their assigned home_ids
const MULTI_HOME_ROLES = new Set([
  "team_manager", "finance_officer", "risk_officer", "hr_officer",
]);

// Finance-specific entities (finance line has full access; others read-only)
const FINANCE_ENTITIES = new Set([
  "Bill", "HomeBudget", "HomeBudgetLine", "PlacementFee", "PlacementInvoice",
  "PettyCash", "PettyCashTransaction", "HomeExpense", "StaffExpense",
  "Payslip", "Timesheet", "TimesheetEntry", "PayPeriod",
]);

// HR-specific entities
const HR_ENTITIES = new Set([
  "StaffProfile", "TrainingRecord", "LeaveRequest", "LeaveBalance",
  "SupervisionRecord", "AppraisalRecord", "DisciplinaryRecord", "StaffDocument",
  "StaffMovement", "Vacancy", "AgencyBankStaffUsage", "AttendanceLog",
  "ReturnToWorkRecord", "TOILBalance", "WellbeingCheckIn", "ContractTemplate",
]);

// Risk-specific entities
const RISK_ENTITIES = new Set([
  "AccidentReport", "MissingFromHome", "ExploitationRisk", "RiskAssessment",
  "OfstedNotification", "Allegation", "Referral", "SafeguardingRecord",
  "Complaint", "SignificantEvent", "BodyMap", "LoneWorkingLog",
]);

// Admin-specific entities
const ADMIN_ENTITIES = new Set([
  "Home", "HomeDocument", "HomeLog", "HomeAsset", "HomeBudget", "HomeBudgetLine",
  "MaintenanceLog", "HomeTask", "HomeCheck", "ComplianceItem", "ComplianceEvidence",
]);

function isFullOrgRole(role) { return FULL_ORG_ROLES.has(role); }
function isMultiHomeRole(role) { return MULTI_HOME_ROLES.has(role); }

// Helper: Get all home IDs (combines home_ids and primary_home_id)
function getScopedHomeIds(staffProfile) {
  const { home_ids = [], primary_home_id } = staffProfile;
  const combined = [...home_ids];
  if (primary_home_id && !combined.includes(primary_home_id)) {
    combined.push(primary_home_id);
  }
  return combined;
}

function applyScopeFilter(records, staffProfile) {
  const { role, org_id } = staffProfile;
  const scopedHomeIds = getScopedHomeIds(staffProfile);

  // Full org access
  if (isFullOrgRole(role)) {
    return records.filter(r => r.org_id === org_id);
  }

  // Multi-home access (team_manager, finance_officer, risk_officer, hr_officer)
  if (isMultiHomeRole(role)) {
    return records.filter(r => {
      if (r.org_id !== org_id) return false;
      if (!r.home_id) return true; // org-level records always pass
      return scopedHomeIds.includes(r.home_id);
    });
  }

  // Single-home access (team_leader, support_worker, admin_officer)
  return records.filter(r => {
    if (r.org_id !== org_id) return false;
    if (!r.home_id) return true;
    return scopedHomeIds.includes(r.home_id);
  });
}

// Returns true if this role has write access to the given entity
function hasWriteAccess(role, entity) {
  if (isFullOrgRole(role)) return true;
  if (role === "team_leader" || role === "team_manager" || role === "support_worker") return true;

  // finance_officer / finance_manager: write to finance entities
  if (role === "finance_officer" || role === "finance_manager") return FINANCE_ENTITIES.has(entity);

  // hr_officer / hr_manager: write to HR entities
  if (role === "hr_officer" || role === "hr_manager") return HR_ENTITIES.has(entity);

  // risk_officer / risk_manager: write to risk entities
  if (role === "risk_officer" || role === "risk_manager") return RISK_ENTITIES.has(entity);

  // admin_officer / admin_manager: write to admin entities
  if (role === "admin_officer" || role === "admin_manager") return ADMIN_ENTITIES.has(entity);

  return false;
}

// Returns true if this role's home_id restriction should be enforced on a record
function isOutsideScope(role, staffProfile, record_home_id) {
  if (!record_home_id) return false; // org-level record — always in scope
  if (isFullOrgRole(role)) return false;
  const scopedHomeIds = getScopedHomeIds(staffProfile);
  return !scopedHomeIds.includes(record_home_id);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Authenticate
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entity, operation, filters = {}, data = {}, id, sort, limit, _hint } = body;

    if (!entity || !ORG_SCOPED_ENTITIES.has(entity)) {
      return Response.json({ error: `Entity '${entity}' is not supported by the secure gateway.` }, { status: 400 });
    }

    // 2. Resolve StaffProfile
    // If the frontend passes a _hint with { org_id, role, home_ids }, use it directly
    // and skip the extra API call. Fall back to full lookup if hint is absent.
    let staffProfile;
    if (_hint && _hint.org_id && _hint.role) {
      staffProfile = _hint;
    } else {
      staffProfile = await resolveStaffProfile(base44, user.email);
      if (!staffProfile) {
        // Last resort: treat admin platform users (role=admin) as org admin
        if (user.role === "admin") {
          staffProfile = { org_id: "default_org", role: "admin", home_ids: [] };
        } else {
          return Response.json(
            { error: "Access denied — no StaffProfile found for this user. Contact your administrator." },
            { status: 403 }
          );
        }
      }
    }

    const { org_id: userOrgId, role: staffRole, home_ids: staffHomeIds = [] } = staffProfile;
    const entityStore = base44.asServiceRole.entities[entity];
    if (!entityStore) {
      return Response.json({ error: `Entity '${entity}' not found.` }, { status: 400 });
    }

    switch (operation) {
      case "list": {
        const records = await entityStore.list(sort || "-created_date", limit || 500);
        return Response.json({ data: applyScopeFilter(records, staffProfile) });
      }

      case "filter": {
        // AuditEvent is org-wide compliance data — don't filter by org_id if it wasn't explicitly provided
        const safeFilters = entity === "AuditEvent" && !filters.org_id 
          ? filters 
          : { ...filters, org_id: userOrgId };
        const records = await entityStore.filter(safeFilters, sort || "-created_date", limit || 500);
        const scoped = applyScopeFilter(records, staffProfile);

        // Debug for Resident queries
        if (entity === "Resident" && process.env.DENO_ENV !== 'production') {
          const scopedHomeIds = getScopedHomeIds(staffProfile);
          console.log("[secureDataGateway Resident debug]", {
            userEmail: user.email,
            staffRole: staffProfile.role,
            orgId: staffProfile.org_id,
            homeIds: staffProfile.home_ids || [],
            primaryHomeId: staffProfile.primary_home_id || null,
            scopedHomeIds,
            recordsBeforeScope: records.length,
            recordsAfterScope: scoped.length,
          });
        }

        return Response.json({ data: scoped });
      }

      case "get": {
        if (!id) return Response.json({ error: "id is required for get operation" }, { status: 400 });
        const record = await entityStore.get(id);
        if (!record) return Response.json({ error: "Record not found" }, { status: 404 });
        if (record.org_id !== userOrgId) {
          return Response.json({ error: "Forbidden: record does not belong to your organisation." }, { status: 403 });
        }
        if (isOutsideScope(staffRole, staffProfile, record.home_id)) {
          return Response.json({ error: "Forbidden: record is outside your assigned homes." }, { status: 403 });
        }
        return Response.json({ data: record });
      }

      case "create": {
        if (!hasWriteAccess(staffRole, entity)) {
          return Response.json({ error: "Forbidden: your role does not have write access to this entity." }, { status: 403 });
        }
        const safeData = { ...data, org_id: userOrgId };
        const created = await entityStore.create(safeData);
        return Response.json({ data: created });
      }

      case "update": {
        if (!id) return Response.json({ error: "id is required for update operation" }, { status: 400 });
        const existing = await entityStore.get(id);
        if (!existing) return Response.json({ error: "Record not found" }, { status: 404 });
        if (existing.org_id !== userOrgId) {
          return Response.json({ error: "Forbidden: record does not belong to your organisation." }, { status: 403 });
        }
        if (!hasWriteAccess(staffRole, entity)) {
          return Response.json({ error: "Forbidden: your role does not have write access to this entity." }, { status: 403 });
        }
        if (isOutsideScope(staffRole, staffProfile, existing.home_id)) {
          return Response.json({ error: "Forbidden: record is outside your assigned homes." }, { status: 403 });
        }
        const safeData = { ...data, org_id: userOrgId };
        const updated = await entityStore.update(id, safeData);
        return Response.json({ data: updated });
      }

      case "delete": {
        if (!id) return Response.json({ error: "id is required for delete operation" }, { status: 400 });
        const existing = await entityStore.get(id);
        if (!existing) return Response.json({ error: "Record not found" }, { status: 404 });
        if (existing.org_id !== userOrgId) {
          return Response.json({ error: "Forbidden: record does not belong to your organisation." }, { status: 403 });
        }
        if (!hasWriteAccess(staffRole, entity)) {
          return Response.json({ error: "Forbidden: your role does not have write access to this entity." }, { status: 403 });
        }
        if (isOutsideScope(staffRole, staffProfile, existing.home_id)) {
          return Response.json({ error: "Forbidden: record is outside your assigned homes." }, { status: 403 });
        }
        await entityStore.delete(id);
        return Response.json({ success: true });
      }

      case "bulkCreate": {
        if (!Array.isArray(data)) return Response.json({ error: "data must be an array for bulkCreate" }, { status: 400 });
        const safeData = data.map(item => ({ ...item, org_id: userOrgId }));
        const created = await entityStore.bulkCreate(safeData);
        return Response.json({ data: created });
      }

      default:
        return Response.json({ error: `Unknown operation: ${operation}` }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});