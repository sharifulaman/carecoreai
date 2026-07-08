/**
 * Regulation 32 Quality of Support — Scoring Helper
 *
 * Pure, deterministic functions that derive quality scores from live entity records.
 * No mock data. Scores are computed from actual records, counts, overdue items,
 * missing evidence and completed evidence.
 *
 * Scoring domains (0-100 each):
 *   1. Safety & Safeguarding
 *   2. Relationships & Voice
 *   3. Health & Wellbeing
 *   4. Education & Outcomes
 *   5. Staffing & Supervision
 *   6. Complaints & Learning
 *
 * Overall Quality Score = mean of domain scores.
 *
 * Status thresholds:
 *   Good:            80-100
 *   Requires Action: 60-79
 *   Critical:        below 60
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

export function inPeriod(dateStr, periodStart, periodEnd) {
  if (!dateStr) return false;
  const d = typeof dateStr === "string" ? dateStr.slice(0, 10) : "";
  return d >= periodStart && d <= periodEnd;
}

export function getStatusFromScore(score) {
  if (score >= 80) return "Good";
  if (score >= 60) return "Requires Action";
  return "Critical";
}

export const STATUS_COLORS = {
  Good: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
  "Requires Action": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  Critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
};

export const SERVICE_TYPE_LABELS = {
  care: "Children's",
  "24_hours": "24 Hr Supported",
  outreach: "Outreach",
  "18_plus": "18 Plus",
};

export function getServiceTypeLabel(home) {
  if (!home) return "—";
  return SERVICE_TYPE_LABELS[home.type] || home.type || "—";
}

function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

// ── Domain scorers ───────────────────────────────────────────────────────────

function scoreSafety(data, periodStart, periodEnd, homeIds) {
  const { safeguardingRecords = [], incidents = [], mfhRecords = [] } = data;
  const inHomes = (r) => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id);

  const sg = safeguardingRecords.filter(r => inPeriod(r.date_of_concern, periodStart, periodEnd) && inHomes(r));
  const sgOpen = sg.filter(r => r.status === "open" || r.status === "under_investigation");
  const inc = incidents.filter(r => inPeriod(r.incident_datetime, periodStart, periodEnd) && inHomes(r));
  const incOpen = inc.filter(r => r.status !== "closed");
  const mfh = mfhRecords.filter(r => inPeriod(r.reported_missing_datetime, periodStart, periodEnd) && inHomes(r));
  const mfhNoRhi = mfh.filter(r => !r.return_interview_completed);

  let score = 100;
  score -= sgOpen.length * 5;
  score -= incOpen.length * 3;
  score -= mfhNoRhi.length * 4;

  return {
    score: clamp(score),
    evidenceCount: sg.length + inc.length + mfh.length,
    riskCount: sgOpen.length + incOpen.length + mfhNoRhi.length,
  };
}

function scoreRelationships(data, periodStart, periodEnd, homeIds, residents) {
  const { ypViews = [], laReviews = [], complaints = [] } = data;
  const inHomes = (r) => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id);
  const totalYP = residents ? residents.filter(r => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id)).length : 0;

  const ypInPeriod = ypViews.filter(r => inPeriod(r.created_date, periodStart, periodEnd));
  const ypCount = ypInPeriod.length;
  const ypCoverage = totalYP > 0 ? Math.min(100, (ypCount / totalYP) * 100) : 0;

  const laInPeriod = laReviews.filter(r => inPeriod(r.created_date, periodStart, periodEnd) && inHomes(r));
  const laCount = laInPeriod.length;

  const childComplaints = complaints.filter(c => c.is_child_complainant && inPeriod(c.received_datetime, periodStart, periodEnd));

  let score = 100;
  score -= (100 - ypCoverage) * 0.3;
  if (totalYP > 0 && ypCount === 0) score -= 20;
  if (laCount === 0) score -= 15;
  score -= childComplaints.length * 2;

  return {
    score: clamp(score),
    evidenceCount: ypCount + laCount,
    riskCount: (totalYP > 0 && ypCount === 0 ? 1 : 0) + (laCount === 0 ? 1 : 0),
  };
}

function scoreHealth(data, periodStart, periodEnd, homeIds, residents) {
  const { dailyLogs = [], appointments = [] } = data;
  const inHomes = (r) => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id);
  const totalYP = residents ? residents.filter(r => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id)).length : 0;

  const residentsWithGp = residents ? residents.filter(r => r.gp_name && (!homeIds || homeIds.length === 0 || homeIds.includes(r.home_id))).length : 0;
  const gpCoverage = totalYP > 0 ? (residentsWithGp / totalYP) * 100 : 0;

  const appts = appointments.filter(a => inPeriod(a.appointment_date, periodStart, periodEnd) && inHomes(a));
  const missedAppts = appts.filter(a => a.status === "missed" || a.status === "no_show");

  let score = 100;
  score -= (100 - gpCoverage) * 0.3;
  score -= missedAppts.length * 5;

  return {
    score: clamp(score),
    evidenceCount: appts.length,
    riskCount: missedAppts.length,
  };
}

function scoreEducation(data, periodStart, periodEnd, homeIds, residents) {
  const inHomes = (r) => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id);
  const totalYP = residents ? residents.filter(r => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id)).length : 0;

  const enrolled = residents ? residents.filter(r =>
    ["enrolled_college", "enrolled_school", "employed", "training"].includes(r.education_status) &&
    (!homeIds || homeIds.length === 0 || homeIds.includes(r.home_id))
  ).length : 0;
  const neet = residents ? residents.filter(r =>
    r.education_status === "neet" &&
    (!homeIds || homeIds.length === 0 || homeIds.includes(r.home_id))
  ).length : 0;

  const enrollmentRate = totalYP > 0 ? (enrolled / totalYP) * 100 : 0;

  let score = 100;
  score -= (100 - enrollmentRate) * 0.4;
  score -= neet * 3;

  return {
    score: clamp(score),
    evidenceCount: enrolled,
    riskCount: neet,
  };
}

function scoreStaffing(data, periodStart, periodEnd, homeIds, staffProfiles) {
  const { supervisionRecords = [], trainingRecords = [] } = data;
  const inHomes = (r) => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id);

  const totalStaff = staffProfiles ? staffProfiles.length : 0;
  const supInPeriod = supervisionRecords.filter(r => inPeriod(r.session_date, periodStart, periodEnd));
  const supCompleted = supInPeriod.filter(r => r.status === "completed");
  const supRate = totalStaff > 0 ? Math.min(100, (supCompleted.length / totalStaff) * 100) : 0;

  const trainingInPeriod = trainingRecords.filter(r => inPeriod(r.created_date, periodStart, periodEnd));
  const trainingCompleted = trainingInPeriod.filter(r => r.status === "completed" || r.completion_date);
  const trainingRate = totalStaff > 0 && trainingInPeriod.length > 0
    ? (trainingCompleted.length / trainingInPeriod.length) * 100
    : 100;

  const dbsExpired = staffProfiles ? staffProfiles.filter(s => !s.dbs_expiry || new Date(s.dbs_expiry) <= new Date()).length : 0;

  let score = 100;
  score -= (100 - supRate) * 0.4;
  score -= (100 - trainingRate) * 0.3;
  score -= dbsExpired * 3;

  return {
    score: clamp(score),
    evidenceCount: supCompleted.length + trainingCompleted.length,
    riskCount: (totalStaff - supCompleted.length) + dbsExpired,
  };
}

function scoreComplaints(data, periodStart, periodEnd, homeIds) {
  const { complaints = [] } = data;
  const inHomes = (r) => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id);

  const inPeriodComplaints = complaints.filter(c => inPeriod(c.received_datetime, periodStart, periodEnd) && inHomes(c));
  const resolved = inPeriodComplaints.filter(c => ["resolved", "closed"].includes(c.status));
  const open = inPeriodComplaints.filter(c => ["received", "investigating"].includes(c.status));

  const over28Days = open.filter(c => {
    if (!c.received_datetime) return false;
    const days = (new Date() - new Date(c.received_datetime)) / (1000 * 60 * 60 * 24);
    return days > 28;
  });

  const resolveRate = inPeriodComplaints.length > 0 ? (resolved.length / inPeriodComplaints.length) * 100 : 100;

  let score = 100;
  score -= (100 - resolveRate) * 0.3;
  score -= over28Days.length * 5;

  return {
    score: clamp(score),
    evidenceCount: inPeriodComplaints.length,
    riskCount: over28Days.length,
  };
}

// ── Home-level scoring ───────────────────────────────────────────────────────

export function scoreHome(home, data, periodStart, periodEnd, residents, staffProfiles) {
  const homeId = home.id;
  const homeResidents = (residents || []).filter(r => r.home_id === homeId);
  const homeStaff = (staffProfiles || []).filter(s => s.home_ids?.includes(homeId) || s.primary_home_id === homeId);

  const safety = scoreSafety(data, periodStart, periodEnd, [homeId]);
  const relationships = scoreRelationships(data, periodStart, periodEnd, [homeId], homeResidents);
  const health = scoreHealth(data, periodStart, periodEnd, [homeId], homeResidents);
  const education = scoreEducation(data, periodStart, periodEnd, [homeId], homeResidents);
  const staffing = scoreStaffing(data, periodStart, periodEnd, [homeId], homeStaff);
  const complaints = scoreComplaints(data, periodStart, periodEnd, [homeId]);

  const overall = Math.round((safety.score + relationships.score + health.score + education.score + staffing.score + complaints.score) / 6);

  return {
    homeId,
    homeName: home.name,
    serviceType: getServiceTypeLabel(home),
    score: overall,
    status: getStatusFromScore(overall),
    flags: safety.riskCount + complaints.riskCount,
    evidenceCompleteness: Math.round((safety.evidenceCount + relationships.evidenceCount + health.evidenceCount + education.evidenceCount + staffing.evidenceCount + complaints.evidenceCount) / Math.max(1, 6)),
    domainScores: { safety, relationships, health, education, staffing, complaints },
  };
}

// ── Findings generation ──────────────────────────────────────────────────────

export function generateFindings(data, periodStart, periodEnd, homeIds, residents, homes) {
  const findings = [];
  const inHomes = (r) => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id);
  const homeName = (id) => homes.find(h => h.id === id)?.name || "—";

  const { safeguardingRecords = [], incidents = [], mfhRecords = [], complaints = [], ypViews = [], laReviews = [], supervisionRecords = [], supportPlans = [], dailyLogs = [], appointments = [] } = data;

  // Critical: Open safeguarding
  const sgOpen = safeguardingRecords.filter(r => inPeriod(r.date_of_concern, periodStart, periodEnd) && inHomes(r) && (r.status === "open" || r.status === "under_investigation"));
  if (sgOpen.length > 0) {
    findings.push({
      id: "sg-open",
      title: `${sgOpen.length} open safeguarding concern${sgOpen.length > 1 ? "s" : ""}`,
      category: "Critical",
      sourceModule: "Safeguarding",
      affectedHomes: [...new Set(sgOpen.map(r => homeName(r.home_id)))],
      evidenceType: "Safeguarding Record",
      status: "Critical",
      owner: "Registered Manager",
    });
  }

  // Critical: Unresolved complaints > 28 days
  const over28 = complaints.filter(c => inPeriod(c.received_datetime, periodStart, periodEnd) && inHomes(c) && ["received", "investigating"].includes(c.status) && c.received_datetime && (new Date() - new Date(c.received_datetime)) / (1000 * 60 * 60 * 24) > 28);
  if (over28.length > 0) {
    findings.push({
      id: "complaints-over28",
      title: `${over28.length} unresolved complaint${over28.length > 1 ? "s" : ""} beyond 28 days`,
      category: "Critical",
      sourceModule: "Complaints",
      affectedHomes: [...new Set(over28.map(c => homeName(c.home_id)))],
      evidenceType: "Complaint Record",
      status: "Critical",
      owner: "Registered Manager",
    });
  }

  // Requires Evidence: Missing YP views
  const totalYP = (residents || []).filter(r => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id)).length;
  const ypCount = ypViews.filter(r => inPeriod(r.created_date, periodStart, periodEnd)).length;
  if (totalYP > 0 && ypCount === 0) {
    findings.push({
      id: "yp-views-missing",
      title: "No young people's views captured in this period",
      category: "Requires Evidence",
      sourceModule: "YP Views",
      affectedHomes: homes.filter(h => !homeIds || homeIds.length === 0 || homeIds.includes(h.id)).map(h => h.name),
      evidenceType: "YP Views Record",
      status: "Requires Evidence",
      owner: "Team Leader",
    });
  }

  // Requires Evidence: Missing LA feedback
  const laCount = laReviews.filter(r => inPeriod(r.created_date, periodStart, periodEnd) && inHomes(r)).length;
  const homesWithoutLa = homes.filter(h => !homeIds || homeIds.length === 0 || homeIds.includes(h.id)).filter(h => !laReviews.some(r => r.home_id === h.id));
  if (homesWithoutLa.length > 0) {
    findings.push({
      id: "la-feedback-missing",
      title: `Missing LA feedback for ${homesWithoutLa.length} home${homesWithoutLa.length > 1 ? "s" : ""}`,
      category: "Requires Evidence",
      sourceModule: "LA Reviews",
      affectedHomes: homesWithoutLa.map(h => h.name),
      evidenceType: "LA Review",
      status: "Requires Evidence",
      owner: "Team Leader",
    });
  }

  // Requires Evidence: Missing return-home interviews
  const mfhNoRhi = mfhRecords.filter(r => inPeriod(r.reported_missing_datetime, periodStart, periodEnd) && inHomes(r) && !r.return_interview_completed);
  if (mfhNoRhi.length > 0) {
    findings.push({
      id: "mfh-no-rhi",
      title: `${mfhNoRhi.length} missing episode${mfhNoRhi.length > 1 ? "s" : ""} without return-home interview`,
      category: "Requires Evidence",
      sourceModule: "Missing From Home",
      affectedHomes: [...new Set(mfhNoRhi.map(r => homeName(r.home_id)))],
      evidenceType: "Return Home Interview",
      status: "Requires Evidence",
      owner: "Team Leader",
    });
  }

  // Improvements: Overdue key work sessions
  const keyWorkLogs = dailyLogs.filter(d => inPeriod(d.date, periodStart, periodEnd) && inHomes(d) && d.log_type === "Key Work Session");
  if (keyWorkLogs.length < totalYP) {
    findings.push({
      id: "keywork-overdue",
      title: `${totalYP - keyWorkLogs.length} young people without key work session this period`,
      category: "Improvements",
      sourceModule: "Daily Logs",
      affectedHomes: homes.filter(h => !homeIds || homeIds.length === 0 || homeIds.includes(h.id)).map(h => h.name),
      evidenceType: "Key Work Session",
      status: "Improvement",
      owner: "Key Worker",
    });
  }

  // Improvements: Support plan review overdue
  const overduePlans = supportPlans.filter(s => inHomes(s) && s.review_date && new Date(s.review_date) < new Date() && s.status !== "reviewed");
  if (overduePlans.length > 0) {
    findings.push({
      id: "support-plan-overdue",
      title: `${overduePlans.length} support plan review${overduePlans.length > 1 ? "s" : ""} overdue`,
      category: "Improvements",
      sourceModule: "Support Plans",
      affectedHomes: [...new Set(overduePlans.map(s => homeName(s.home_id)))],
      evidenceType: "Support Plan",
      status: "Improvement",
      owner: "Team Leader",
    });
  }

  // Improvements: Missed health appointments
  const missedAppts = appointments.filter(a => inPeriod(a.appointment_date, periodStart, periodEnd) && inHomes(a) && (a.status === "missed" || a.status === "no_show"));
  if (missedAppts.length > 0) {
    findings.push({
      id: "appts-missed",
      title: `${missedAppts.length} missed health appointment${missedAppts.length > 1 ? "s" : ""}`,
      category: "Improvements",
      sourceModule: "Appointments",
      affectedHomes: [...new Set(missedAppts.map(a => homeName(a.home_id)))],
      evidenceType: "Appointment",
      status: "Improvement",
      owner: "Key Worker",
    });
  }

  // Strengths: Supervision compliance
  const supCompleted = supervisionRecords.filter(r => inPeriod(r.session_date, periodStart, periodEnd) && inHomes(r) && r.status === "completed");
  const totalStaff = (data.staffProfiles || []).length;
  if (totalStaff > 0 && supCompleted.length >= totalStaff * 0.8) {
    findings.push({
      id: "supervision-complete",
      title: `Monthly staff supervision ${Math.round((supCompleted.length / totalStaff) * 100)}% complete`,
      category: "Strengths",
      sourceModule: "Supervision",
      affectedHomes: [...new Set(supCompleted.map(r => homeName(r.home_id)))],
      evidenceType: "Supervision Record",
      status: "Strength",
      owner: "Team Manager",
    });
  }

  // Strengths: Positive complaint closure
  const resolvedComplaints = complaints.filter(c => inPeriod(c.received_datetime, periodStart, periodEnd) && inHomes(c) && ["resolved", "closed"].includes(c.status));
  if (resolvedComplaints.length > 0) {
    findings.push({
      id: "complaints-resolved",
      title: `${resolvedComplaints.length} complaint${resolvedComplaints.length > 1 ? "s" : ""} resolved this period`,
      category: "Strengths",
      sourceModule: "Complaints",
      affectedHomes: [...new Set(resolvedComplaints.map(c => homeName(c.home_id)))],
      evidenceType: "Complaint Resolution",
      status: "Strength",
      owner: "Registered Manager",
    });
  }

  return findings;
}

// ── Evidence readiness ───────────────────────────────────────────────────────

export function computeEvidenceReadiness(data, periodStart, periodEnd, homeIds, residents, staffProfiles) {
  const inHomes = (r) => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id);
  const totalYP = (residents || []).filter(r => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id)).length;
  const totalStaff = (staffProfiles || []).length;
  const { ypViews = [], laReviews = [], complaints = [], supervisionRecords = [], dailyLogs = [], appointments = [], incidents = [], mfhRecords = [] } = data;

  const items = [
    {
      label: "Young People's Views",
      completed: ypViews.filter(r => inPeriod(r.created_date, periodStart, periodEnd)).length,
      total: totalYP,
    },
    {
      label: "LA Feedback",
      completed: laReviews.filter(r => inPeriod(r.created_date, periodStart, periodEnd) && inHomes(r)).length,
      total: Math.max(1, (data.homes || []).filter(h => !homeIds || homeIds.length === 0 || homeIds.includes(h.id)).length),
    },
    {
      label: "Complaints Resolved",
      completed: complaints.filter(c => inPeriod(c.received_datetime, periodStart, periodEnd) && inHomes(c) && ["resolved", "closed"].includes(c.status)).length,
      total: complaints.filter(c => inPeriod(c.received_datetime, periodStart, periodEnd) && inHomes(c)).length || 1,
    },
    {
      label: "Staff Supervision",
      completed: supervisionRecords.filter(r => inPeriod(r.session_date, periodStart, periodEnd) && r.status === "completed").length,
      total: totalStaff,
    },
    {
      label: "Key Work Sessions",
      completed: dailyLogs.filter(d => inPeriod(d.date, periodStart, periodEnd) && inHomes(d) && d.log_type === "Key Work Session").length,
      total: totalYP,
    },
    {
      label: "Health Support",
      completed: appointments.filter(a => inPeriod(a.appointment_date, periodStart, periodEnd) && inHomes(a) && a.status !== "missed" && a.status !== "no_show").length,
      total: appointments.filter(a => inPeriod(a.appointment_date, periodStart, periodEnd) && inHomes(a)).length || 1,
    },
    {
      label: "Education / Employment Outcomes",
      completed: (residents || []).filter(r => ["enrolled_college", "enrolled_school", "employed", "training"].includes(r.education_status) && (!homeIds || homeIds.length === 0 || homeIds.includes(r.home_id))).length,
      total: totalYP,
    },
    {
      label: "Incident Learning",
      completed: incidents.filter(i => inPeriod(i.incident_datetime, periodStart, periodEnd) && inHomes(i) && i.status === "closed").length,
      total: incidents.filter(i => inPeriod(i.incident_datetime, periodStart, periodEnd) && inHomes(i)).length || 1,
    },
  ];

  items.forEach(item => {
    item.percentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
  });

  const overallCompleteness = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.percentage, 0) / items.length)
    : 0;

  return { items, overallCompleteness };
}

// ── Main compute function ────────────────────────────────────────────────────

export function computeReg32Scores(data, periodStart, periodEnd, filters = {}) {
  const { homes = [], residents = [], staffProfiles = [] } = data;
  const homeIds = filters.homeIds || [];

  const safety = scoreSafety(data, periodStart, periodEnd, homeIds);
  const relationships = scoreRelationships(data, periodStart, periodEnd, homeIds, residents);
  const health = scoreHealth(data, periodStart, periodEnd, homeIds, residents);
  const education = scoreEducation(data, periodStart, periodEnd, homeIds, residents);
  const staffing = scoreStaffing(data, periodStart, periodEnd, homeIds, staffProfiles);
  const complaints = scoreComplaints(data, periodStart, periodEnd, homeIds);

  const domainScores = { safety, relationships, health, education, staffing, complaints };
  const overallScore = Math.round(
    Object.values(domainScores).reduce((sum, d) => sum + d.score, 0) / 6
  );
  const overallStatus = getStatusFromScore(overallScore);

  const homeScores = homes
    .filter(h => !homeIds || homeIds.length === 0 || homeIds.includes(h.id))
    .map(h => scoreHome(h, data, periodStart, periodEnd, residents, staffProfiles))
    .sort((a, b) => b.score - a.score);

  const orgAvg = homeScores.length > 0
    ? Math.round(homeScores.reduce((sum, h) => sum + h.score, 0) / homeScores.length)
    : overallScore;

  homeScores.forEach(h => {
    h.trend = h.score > orgAvg + 5 ? "up" : h.score < orgAvg - 5 ? "down" : "stable";
  });

  const findings = generateFindings(data, periodStart, periodEnd, homeIds, residents, homes);
  const evidenceReadiness = computeEvidenceReadiness(data, periodStart, periodEnd, homeIds, residents, staffProfiles);

  const unresolvedRisks = Object.values(domainScores).reduce((sum, d) => sum + d.riskCount, 0);
  const totalEvidence = Object.values(domainScores).reduce((sum, d) => sum + d.evidenceCount, 0);

  const laFeedbackCoverage = evidenceReadiness.items.find(i => i.label === "LA Feedback")?.percentage || 0;
  const staffSupervisionCompliance = evidenceReadiness.items.find(i => i.label === "Staff Supervision")?.percentage || 0;

  const readinessChecks = [
    { label: "All required evidence captured", passed: evidenceReadiness.overallCompleteness >= 80 },
    { label: "No unresolved critical flags", passed: findings.filter(f => f.category === "Critical").length === 0 },
    { label: "Independent reviewer details", passed: !!(filters.reviewerName || data.reviewerName) },
    { label: "Action plan populated", passed: !!(data.actionPlanNarrative || filters.actionPlanNarrative) },
    { label: "Young people's views completed", passed: (evidenceReadiness.items.find(i => i.label === "Young People's Views")?.percentage || 0) >= 50 },
  ];

  const passedChecks = readinessChecks.filter(c => c.passed).length;
  const ofstedReadyStatus = passedChecks === readinessChecks.length ? "Good" : passedChecks >= 3 ? "Requires Action" : "Not Ready";

  return {
    overallScore,
    overallStatus,
    domainScores,
    homeScores,
    orgAvg,
    findings,
    evidenceReadiness,
    readinessChecks,
    ofstedReadyStatus,
    kpis: {
      homesScanned: homeScores.length,
      youngPeopleIncluded: (residents || []).filter(r => !homeIds || homeIds.length === 0 || homeIds.includes(r.home_id)).length,
      supportQualityRating: overallStatus,
      evidenceCompleteness: evidenceReadiness.overallCompleteness,
      unresolvedQualityRisks: unresolvedRisks,
      laFeedbackCoverage,
      staffSupervisionCompliance,
      totalEvidence,
    },
  };
}

// ── Quality score over time (by month) ───────────────────────────────────────

export function computeQualityScoreOverTime(data, periodStart, periodEnd, homes, residents, staffProfiles) {
  const months = [];
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cur <= end) {
    const mStart = format(cur, "yyyy-MM-dd");
    const mEnd = format(new Date(cur.getFullYear(), cur.getMonth() + 1, 0), "yyyy-MM-dd");
    const scores = computeReg32Scores(data, mStart, mEnd, { homes, residents, staffProfiles });
    months.push({ month: format(cur, "MMM yy"), score: scores.overallScore });
    cur.setMonth(cur.getMonth() + 1);
  }

  return months;
}

function format(date, fmt) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (fmt === "yyyy-MM-dd") {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (fmt === "MMM yy") {
    return `${months[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
  }
  return "";
}