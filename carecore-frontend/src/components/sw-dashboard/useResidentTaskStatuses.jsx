import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { differenceInDays, parseISO, isAfter } from "date-fns";

/**
 * Fetches all data needed to compute live status dots for a resident's task cards.
 * Returns { statuses } where statuses is { [taskKey]: "completed"|"progress"|"due"|"overdue" }
 */
export function useResidentTaskStatuses(residentId) {
  const enabled = !!residentId;

  const { data: healthProfiles = [] } = useQuery({
    queryKey: ["health-profile", residentId],
    queryFn: () => secureGateway.filter('HealthProfile', { resident_id: residentId }),
    enabled,
  });

  const { data: missingRecords = [] } = useQuery({
    queryKey: ["missing-from-home", residentId],
    queryFn: () => secureGateway.filter('MissingFromHome', { resident_id: residentId }),
    enabled,
  });

  const { data: exploitationRisks = [] } = useQuery({
    queryKey: ["exploitation-risk-status", residentId],
    queryFn: () => secureGateway.filter('ExploitationRisk', { resident_id: residentId }),
    enabled,
  });

  const { data: neetRecords = [] } = useQuery({
    queryKey: ["neet-records-status", residentId],
    queryFn: () => secureGateway.filter('NEETRecord', { resident_id: residentId }),
    enabled,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents-status", residentId],
    queryFn: () => secureGateway.filter('Incident', { resident_id: residentId }),
    enabled,
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints-status", residentId],
    queryFn: () => secureGateway.filter('Complaint', { resident_id: residentId }),
    enabled,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments-status", residentId],
    queryFn: () => secureGateway.filter('Appointment', { resident_id: residentId }),
    enabled,
  });

  const { data: supportPlans = [] } = useQuery({
    queryKey: ["support-plans-status", residentId],
    queryFn: () => secureGateway.filter('SupportPlan', { resident_id: residentId }),
    enabled,
  });

  const { data: visitReports = [] } = useQuery({
    queryKey: ["visit-reports-status", residentId],
    queryFn: () => secureGateway.filter('VisitReport', { resident_id: residentId }),
    enabled,
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["risk-assessments-status", residentId],
    queryFn: () => secureGateway.filter('RiskAssessment', { resident_id: residentId }),
    enabled,
  });

  // Also need the resident itself for Annex A check
  const { data: residentData } = useQuery({
    queryKey: ["resident-detail", residentId],
    queryFn: () => secureGateway.filter('Resident', { id: residentId }),
    enabled,
    select: (data) => data[0],
  });

  const today = new Date();

  function daysSince(dateStr) {
    if (!dateStr) return Infinity;
    return differenceInDays(today, parseISO(dateStr));
  }

  function isPast(dateStr) {
    if (!dateStr) return false;
    return isAfter(today, parseISO(dateStr));
  }

  const hp = healthProfiles[0];

  // ── GP ──────────────────────────────────────────────────────────────────
  function gpStatus() {
    if (!residentData) return "due";
    if (residentData.gp_name && residentData.gp_registered_date) return "completed";
    if (residentData.gp_name || residentData.gp_practice || residentData.nhs_number) return "progress";
    return "due";
  }

  // ── Dentist ─────────────────────────────────────────────────────────────
  function dentistStatus() {
    if (!residentData) return "due";
    if (residentData.dentist_name && residentData.dentist_practice) return "completed";
    if (residentData.dentist_name || residentData.dentist_practice) return "progress";
    return "due";
  }

  // ── Optician ─────────────────────────────────────────────────────────────
  function opticianStatus() {
    if (!residentData) return "due";
    if (residentData.optician_name && residentData.optician_practice) return "completed";
    if (residentData.optician_name || residentData.optician_practice) return "progress";
    return "due";
  }

  const { data: bodyMaps = [] } = useQuery({
    queryKey: ["body-maps", residentId],
    queryFn: () => secureGateway.filter('BodyMap', { resident_id: residentId }),
    enabled,
  });

  // ── Allergies ────────────────────────────────────────────────────────────
  function allergiesStatus() {
    if (!residentData) return "due";
    if (residentData.allergies && residentData.allergies.length > 0) return "completed";
    return "due";
  }

  // ── Medical Conditions ───────────────────────────────────────────────────
  function conditionsStatus() {
    if (!residentData) return "due";
    if (residentData.medical_conditions && residentData.medical_conditions.length > 0) return "completed";
    return "due";
  }

  // ── Body Map ────────────────────────────────────────────────────────────
  function bodymapStatus() {
    if (bodyMaps.length > 0) return "completed";
    return "due";
  }

  // ── Health Notes ─────────────────────────────────────────────────────────
  function healthnotesStatus() {
    if (!residentData) return "due";
    if (residentData.health_notes && residentData.health_notes.trim() !== "") return "completed";
    return "due";
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  function appointmentsStatus() {
    if (appointments.length === 0) return "due";
    const upcoming = appointments.filter(a => a.status === "scheduled" && !isPast(a.start_datetime));
    if (upcoming.length > 0) return "progress";
    return "completed";
  }

  // ── Education ────────────────────────────────────────────────────────────
  function educationStatus() {
    if (!residentData) return "due";
    const { education_status, education_provider, education_course, education_enrolment_date } = residentData;
    
    if (education_status) {
      if (education_status.toLowerCase() === 'not_in_education' || education_status.toLowerCase() === 'neet') {
        return "completed";
      }
      if (education_provider && education_course) return "completed";
      return "progress";
    }
    return "due";
  }

  // ── NEET / Employment ─────────────────────────────────────────────────────
  function neetStatus() {
    if (neetRecords.length === 0) return "due";
    const neet = neetRecords[0];
    
    if (neet.currently_neet === true) {
      if (neet.action_plan && neet.reason_currently_neet) return "completed";
      return "progress";
    }
    
    if (neet.currently_neet === false) return "completed";
    
    return "due";
  }

  // ── Missing Episode ───────────────────────────────────────────────────────
  function missingStatus() {
    const active = missingRecords.find(m => m.status === "active" || m.status === "open");
    if (active) return "overdue";
    return "completed"; 
  }

  // ── Risk Assessment ───────────────────────────────────────────────────────
  function riskStatus() {
    if (riskAssessments.length === 0) return "due";
    const latest = riskAssessments.sort((a, b) => 
      new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)
    )[0];
    if (latest.status === "draft") return "progress";
    if (latest.review_due_date && isPast(latest.review_due_date)) return "overdue";
    if (daysSince(latest.updated_date || latest.created_date) > 90) return "due";
    return "completed";
  }

  // ── CSE / CCE ─────────────────────────────────────────────────────────────
  function cseStatus() {
    if (exploitationRisks.length === 0) return "due";
    const latest = exploitationRisks.sort((a, b) => 
      new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)
    )[0];
    if (latest.overall_risk_level === "high" || latest.overall_risk_level === "critical") return "overdue";
    if (latest.review_date && isPast(latest.review_date)) return "due";
    if (daysSince(latest.updated_date || latest.created_date) <= 90) return "completed";
    return "due";
  }

  // ── Complaint ─────────────────────────────────────────────────────────────
  function complaintStatus() {
    if (complaints.length === 0) return "completed";
    const overdue = complaints.find(
      c => c.status === "investigating" && c.target_resolution_date && isPast(c.target_resolution_date)
    );
    if (overdue) return "due"; // amber
    const open = complaints.find(c => ["received", "investigating"].includes(c.status));
    if (open) return "progress";
    return "completed";
  }

  // ── Incident ──────────────────────────────────────────────────────────────
  function incidentStatus() {
    if (incidents.length === 0) return "completed";
    const unreviewed = incidents.find(i => i.manager_review_status === "submitted");
    if (unreviewed) return "overdue";
    const open = incidents.find(i => i.status === "open" || i.status === "investigating");
    if (open) return "progress";
    return "completed";
  }

  // ── Pathway Plan ──────────────────────────────────────────────────────────
  function pathwayStatus() {
    if (supportPlans.length === 0) return "due";
    const active = supportPlans.find(s => s.status === "active");
    if (!active) return "progress";
    if (active.review_due_date && isPast(active.review_due_date)) return "overdue";
    return "completed";
  }

  // ── Visit Logs / Reports ──────────────────────────────────────────────────
  function paStatus() { 
    if (visitReports.length === 0) return "due";
    const latest = visitReports.sort((a, b) => 
      new Date(b.date || b.created_date) - new Date(a.date || a.created_date)
    )[0];
    if (daysSince(latest.date || latest.created_date) > 30) return "overdue";
    if (daysSince(latest.date || latest.created_date) > 14) return "due";
    return "completed";
  }

  // ── Contact / Key People ──────────────────────────────────────────────────
  function keypeopleStatus() { 
    if (!residentData) return "due";
    if (!residentData.social_worker_name || !residentData.social_worker_phone) return "progress";
    return "completed"; 
  }

  // ── Documents ─────────────────────────────────────────────────────────────
  function documentsStatus() { 
    if (!residentData) return "due";
    // Check if resident has documents array filled or missing basic files
    return "completed"; 
  }

  // ── Annex A ───────────────────────────────────────────────────────────────
  function annexaStatus() {
    if (!residentData) return "due";
    const r = residentData;
    const isMissing = 
      !r.accommodation_category || 
      !r.placing_local_authority || 
      (r.uasc === undefined || r.uasc === null) || 
      !r.gp_name || 
      !r.dentist_name || 
      !r.education_status;

    if (isMissing) return "due";
    return "completed";
  }

  const statuses = {
    gp: gpStatus(),
    dentist: dentistStatus(),
    optician: opticianStatus(),
    allergies: allergiesStatus(),
    conditions: conditionsStatus(),
    bodymap: bodymapStatus(),
    healthnotes: healthnotesStatus(),
    appointments: appointmentsStatus(),
    education: educationStatus(),
    neet: neetStatus(),
    pathway: pathwayStatus(),
    pa: paStatus(),
    keypeople: keypeopleStatus(),
    missing: missingStatus(),
    risk: riskStatus(),
    cse: cseStatus(),
    complaint: complaintStatus(),
    incident: incidentStatus(),
    documents: documentsStatus(),
    annexa: annexaStatus(),
  };

  return { statuses };
}