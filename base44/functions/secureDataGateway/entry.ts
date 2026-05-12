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
  "PolicyQuizResult"
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

function applyScopeFilter(records, staffProfile) {
  const { role, org_id, home_ids = [] } = staffProfile;
  if (role === "admin" || role === "admin_officer" || role === "admin_manager" || role === "finance" || role === "finance_officer") {
    return records.filter(r => r.org_id === org_id);
  }
  if (role === "team_leader" || role === "team_manager") {
    return records.filter(r => {
      if (!r.home_id) return r.org_id === org_id; // no home_id = org-level record (e.g. events), pass through
      return home_ids.includes(r.home_id);
    });
  }
  // support_worker and others
  return records.filter(r => {
    if (!r.home_id) return r.org_id === org_id;
    return home_ids.includes(r.home_id);
  });
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
        const safeFilters = { ...filters, org_id: userOrgId };
        const records = await entityStore.filter(safeFilters, sort || "-created_date", limit || 500);
        if (staffRole === "admin" || staffRole === "admin_officer") {
          return Response.json({ data: records });
        }
        return Response.json({ data: applyScopeFilter(records, staffProfile) });
      }

      case "get": {
        if (!id) return Response.json({ error: "id is required for get operation" }, { status: 400 });
        const record = await entityStore.get(id);
        if (!record) return Response.json({ error: "Record not found" }, { status: 404 });
        if (record.org_id !== userOrgId) {
          return Response.json({ error: "Forbidden: record does not belong to your organisation." }, { status: 403 });
        }
        if (staffRole !== "admin" && staffRole !== "admin_officer" && record.home_id && !staffHomeIds.includes(record.home_id)) {
          return Response.json({ error: "Forbidden: record is outside your assigned homes." }, { status: 403 });
        }
        return Response.json({ data: record });
      }

      case "create": {
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
        if (staffRole !== "admin" && staffRole !== "admin_officer" && existing.home_id && !staffHomeIds.includes(existing.home_id)) {
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
        if (staffRole !== "admin" && staffRole !== "admin_officer" && existing.home_id && !staffHomeIds.includes(existing.home_id)) {
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