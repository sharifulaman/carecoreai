import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";

/**
 * @deprecated Use useResidentTaskStatuses instead (from useResidentTaskStatuses.js)
 * This hook is kept only for backward compatibility with DailyTasksMap.
 * All new usage should import useResidentTaskStatuses from @/components/sw-dashboard/useResidentTaskStatuses
 */
export function useStatusDots(selectedResident) {
  // Fetch all required entities
  const { data: healthProfile = null } = useQuery({
    queryKey: ["health-profile", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id
        ? secureGateway.filter("HealthProfile", { resident_id: selectedResident.id }).then((r) => r[0] || null)
        : null,
    enabled: !!selectedResident?.id,
  });

  const { data: resident = null } = useQuery({
    queryKey: ["resident", selectedResident?.id],
    queryFn: () => (selectedResident?.id ? secureGateway.get("Resident", selectedResident.id) : null),
    enabled: !!selectedResident?.id,
  });

  const { data: bodyMaps = [] } = useQuery({
    queryKey: ["body-maps", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("BodyMap", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("Appointment", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: educationRecords = [] } = useQuery({
    queryKey: ["education", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("EducationRecord", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: neetRecords = [] } = useQuery({
    queryKey: ["neet", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("NEETRecord", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: pathwayPlans = [] } = useQuery({
    queryKey: ["pathway", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("PathwayPlan", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: paVisits = [] } = useQuery({
    queryKey: ["pa-visits", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("PAVisit", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: keyPeople = [] } = useQuery({
    queryKey: ["key-people", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("KeyPerson", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: missingEpisodes = [] } = useQuery({
    queryKey: ["missing", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("MissingFromHome", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["risk", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("RiskAssessment", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: exploitationRisks = [] } = useQuery({
    queryKey: ["cse", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("ExploitationRisk", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("Complaint", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("Incident", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", selectedResident?.id],
    queryFn: () =>
      selectedResident?.id ? secureGateway.filter("ResidentDocument", { resident_id: selectedResident.id }) : [],
    enabled: !!selectedResident?.id,
  });

  // Calculate statuses
  const statuses = {
    gp: healthProfile
      ? healthProfile.gp_registered
        ? "completed"
        : healthProfile.gp_registration_date
        ? "progress"
        : "due"
      : "overdue",

    dentist: healthProfile
      ? healthProfile.dentist_registered
        ? "completed"
        : healthProfile.no_dentist_reason
        ? "progress"
        : "due"
      : "overdue",

    optician: healthProfile ? (healthProfile.optician_registered ? "completed" : "due") : "overdue",

    allergies: resident
      ? resident.allergies && resident.allergies.length > 0
        ? "completed"
        : resident.allergies !== undefined && resident.allergies !== null
        ? "progress"
        : "due"
      : "overdue",

    conditions: resident ? (resident.medical_conditions !== null ? "completed" : "overdue") : "overdue",

    bodymap: bodyMaps.length > 0
      ? isWithinDays(bodyMaps[0].created_date, 30)
        ? "completed"
        : "progress"
      : "overdue",

    healthnotes: resident ? (resident.health_notes && resident.health_notes.trim() ? "completed" : "progress") : "due",

    appointments: calculateAppointmentStatus(appointments),

    education: calculateEducationStatus(educationRecords),

    neet: calculateNEETStatus(resident, educationRecords, neetRecords),

    pathway: pathwayPlans.length > 0
      ? isDateInFuture(pathwayPlans[0].review_date)
        ? "completed"
        : "progress"
      : "overdue",

    pa: calculatePAStatus(paVisits),

    keypeople: keyPeople.length > 0 ? "completed" : "overdue",

    missing: calculateMissingStatus(missingEpisodes),

    risk: riskAssessments.length > 0
      ? isDateInFuture(riskAssessments[0].review_date)
        ? "completed"
        : "progress"
      : "overdue",

    cse: calculateCSEStatus(exploitationRisks),

    complaint: calculateComplaintStatus(complaints),

    incident: calculateIncidentStatus(incidents),

    documents: calculateDocumentStatus(documents),

    annexa: calculateAnnexAStatus(resident),
  };

  return statuses;
}

// Helper functions
function isWithinDays(date, days) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return (now - d) / (1000 * 60 * 60 * 24) <= days;
}

function isDateInFuture(date) {
  if (!date) return false;
  return new Date(date) > new Date();
}

function calculateAppointmentStatus(appointments) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let hasOverdue = false;
  let hasDueToday = false;

  for (const apt of appointments) {
    if (!apt.start_datetime) continue;
    const aptDate = new Date(apt.start_datetime);
    const aptDay = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());

    if (aptDay < today) {
      hasOverdue = true;
    } else if (aptDay.getTime() === today.getTime()) {
      hasDueToday = true;
    }
  }

  return hasOverdue ? "overdue" : hasDueToday ? "progress" : "completed";
}

function calculateEducationStatus(educationRecords) {
  if (educationRecords.length === 0) return "overdue";

  const latest = educationRecords[0];
  const updated = isWithinDays(latest.updated_date, 30);
  const hoursField = latest.hours_per_week_provided && latest.hours_per_week_attended;

  if (updated && hoursField) return "completed";
  if (updated || hoursField) return "progress";
  if (isWithinDays(latest.updated_date, 60)) return "progress";

  return "overdue";
}

function calculateNEETStatus(resident, educationRecords, neetRecords) {
  if (educationRecords.length === 0) return "overdue";

  const latest = educationRecords[0];
  if (latest.education_status !== "not_in_education" && latest.education_status !== "neet") return "completed";

  // NEET status
  if (neetRecords.length > 0 && neetRecords[0].action_plan) return "progress";

  return "overdue";
}

function calculatePAStatus(paVisits) {
  if (paVisits.length === 0) return "overdue";

  const latest = paVisits[0];
  const days = daysSince(latest.visit_date);

  if (days <= 28) return "completed";
  if (days <= 56) return "progress";

  return "overdue";
}

function calculateMissingStatus(missingEpisodes) {
  const active = missingEpisodes.find((m) => m.status === "active");
  if (active) return "overdue";

  const returned = missingEpisodes.find((m) => m.status === "returned" && !m.rhi_offered_by_la);
  if (returned) return "progress";

  return "completed";
}

function calculateCSEStatus(exploitationRisks) {
  if (exploitationRisks.length === 0) return "progress";

  const latest = exploitationRisks[0];
  const riskLevel = latest.overall_risk_level?.toLowerCase();

  if (riskLevel === "high" || riskLevel === "critical") return "overdue";
  if (riskLevel === "medium" || !isWithinDays(latest.updated_date, 90)) return "progress";

  return "completed";
}

function calculateComplaintStatus(complaints) {
  const openWithoutResolution = complaints.filter(
    (c) => c.status === "open" && new Date(c.target_resolution_date) < new Date()
  );

  if (openWithoutResolution.length > 0) return "progress";

  const hasOpen = complaints.some((c) => c.status === "open");
  return hasOpen ? "progress" : "completed";
}

function calculateIncidentStatus(incidents) {
  const unreviewed = incidents.filter((i) => i.manager_review_status?.includes("pending"));

  for (const incident of unreviewed) {
    const hours = (new Date() - new Date(incident.incident_datetime)) / (1000 * 60 * 60);
    if (hours > 48) return "overdue";
  }

  return unreviewed.length > 0 ? "progress" : "completed";
}

function calculateDocumentStatus(documents) {
  const now = new Date();
  const thisMonth = documents.filter((d) => {
    if (!d.created_date) return false;
    const date = new Date(d.created_date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });

  return thisMonth.length > 0 ? "completed" : "progress";
}

function calculateAnnexAStatus(resident) {
  if (!resident) return "due";

  const gaps = [
    !resident.accommodation_category,
    !resident.placing_local_authority,
    resident.uasc === undefined || resident.uasc === null,
  ].filter(Boolean).length;

  if (gaps === 0) return "completed";
  if (gaps <= 3) return "progress";

  return "overdue";
}

function daysSince(date) {
  if (!date) return Infinity;
  return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
}