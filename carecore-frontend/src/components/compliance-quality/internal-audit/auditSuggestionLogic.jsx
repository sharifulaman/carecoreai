import { isAfter, isBefore, addDays, subMonths, parseISO } from "date-fns";

// ── Helper: check chore lookup ──────────────────────────────────────────────
function checkChore(ctx, titles) {
  const { checkResponseByTitle } = ctx;
  if (!checkResponseByTitle) return null;

  let hasPass = false;
  let hasFail = false;
  let latestDate = null;
  let detailParts = [];

  for (const title of titles) {
    const resp = checkResponseByTitle[title.toLowerCase()];
    if (!resp) continue;
    if (resp.response_status === "pass") hasPass = true;
    if (resp.response_status === "fail") hasFail = true;
    if (resp.completed_at) {
      const d = new Date(resp.completed_at);
      if (!latestDate || d > latestDate) latestDate = d;
    }
    detailParts.push(`${title}: ${resp.response_status}`);
  }

  if (!hasPass && !hasFail) return null;

  const detail = latestDate
    ? `Last checked ${latestDate.toLocaleDateString()}`
    : "Response found";

  return hasFail
    ? { status: "fail", detail: `${detail} — ${detailParts.filter(p => p.includes("fail")).join("; ")}` }
    : { status: "pass", detail };
}

// ── Helper: safe array access ────────────────────────────────────────────────
const arr = (v) => Array.isArray(v) ? v : [];

export const CHECK_SUGGESTIONS = {
  // ── Section 1: Environment & Property Standards ──────────────────────────
  "Home is clean, tidy, and free from hazards": (ctx) => checkChore(ctx, [
    "Home is clean, tidy, and free from hazards",
    "Office area clean and tidy", "Worktops clean", "Sink clean",
    "Hallways clear of hazards", "Flooring intact – lounge",
  ]),
  "Bedrooms are personalised and maintained": (ctx) => checkChore(ctx, [
    "Bedrooms are personalised and maintained",
    "Bedrooms checked for damage",
  ]),
  "Kitchen area is clean and hygienic": (ctx) => checkChore(ctx, [
    "Kitchen area is clean and hygienic",
    "Worktops clean", "Sink clean", "Fridge clean and temperature acceptable",
    "Food stored correctly", "Bins emptied", "Appliances visually safe",
  ]),
  "Bathrooms are clean and in good condition": (ctx) => checkChore(ctx, [
    "Bathrooms are clean and in good condition",
    "Bathrooms deep cleaned", "Flooring intact – bathroom",
  ]),
  "Communal areas are safe and welcoming": (ctx) => checkChore(ctx, [
    "Communal areas are safe and welcoming",
    "Living room furniture safe", "Hallways clear of hazards",
  ]),
  "Internet/Wi-Fi operational and accessible": (ctx) => checkChore(ctx, [
    "Internet/Wi-Fi operational and accessible",
    "Equipment working",
  ]),
  "Furniture in good condition with fire label": (ctx) => checkChore(ctx, [
    "Furniture in good condition with fire label",
    "Living room furniture safe",
  ]),
  "Windows, doors, and locks functioning properly": (ctx) => checkChore(ctx, [
    "Windows, doors, and locks functioning properly",
    "All doors and windows secure",
  ]),
  "Lighting and heating systems working": (ctx) => checkChore(ctx, [
    "Lighting and heating systems working",
    "Interior lighting working", "Exterior lighting working", "Heating working",
  ]),
  "Laundry facilities available and working": (ctx) => checkChore(ctx, [
    "Laundry facilities available and working",
    "Laundry appliances working", "Laundry area clean",
  ]),
  "Garden/external areas safe and maintained": (ctx) => checkChore(ctx, [
    "Garden/external areas safe and maintained",
    "Garden area free from hazards", "Rubbish removed",
    "Fencing/gate secure", "Pathways clear", "External lighting working",
  ]),

  // ── Section 2: Health & Safety Checks ────────────────────────────────────
  "Fire risk assessment is current": (ctx) => {
    const { home } = ctx;
    if (home?.fire_risk_assessment_expiry) {
      return isAfter(new Date(home.fire_risk_assessment_expiry), new Date())
        ? { status: "pass", detail: `Valid until ${home.fire_risk_assessment_expiry}` }
        : { status: "fail", detail: `Expired ${home.fire_risk_assessment_expiry}` };
    }
    return checkChore(ctx, ["Fire risk assessment is current", "Fire risk assessment reviewed"]);
  },
  "Fire extinguishers available and in date": (ctx) => checkChore(ctx, [
    "Fire extinguishers available and in date",
    "Fire extinguishers in place",
  ]),
  "Fire alarm checks completed and recorded": (ctx) => checkChore(ctx, [
    "Fire alarm checks completed and recorded",
    "Fire alarm panel checked", "Fire alarm full test completed",
    "Smoke detectors unobstructed",
  ]),
  "Emergency lighting tested": (ctx) => checkChore(ctx, [
    "Emergency lighting tested",
    "Emergency lighting working",
  ]),
  "Fire exits clear and accessible": (ctx) => checkChore(ctx, [
    "Fire exits clear and accessible",
    "Fire exits clear and unlocked", "Evacuation routes unobstructed",
  ]),
  "First aid kit available and stocked": (ctx) => checkChore(ctx, [
    "First aid kit available and stocked",
    "First aid kit present", "First aid kit stocked", "First aid kit fully restocked",
  ]),
  "Medication storage secure and compliant": (ctx) => checkChore(ctx, [
    "Medication storage secure and compliant",
    "Medication stored securely", "Medication cabinet locked",
  ]),
  "COSHH materials stored safely": (ctx) => checkChore(ctx, [
    "COSHH materials stored safely",
    "Cleaning supplies stocked",
  ]),
  "Electrical equipment appears safe": (ctx) => checkChore(ctx, [
    "Electrical equipment appears safe",
    "Appliances visually safe", "Sockets/outlets visually safe",
  ]),
  "PAT test certificate available and valid": ({ home }) => {
    if (!home?.pat_testing_expiry) return { status: "fail", detail: "No expiry recorded" };
    return isAfter(new Date(home.pat_testing_expiry), new Date())
      ? { status: "pass", detail: `Valid until ${home.pat_testing_expiry}` }
      : { status: "fail", detail: `Expired ${home.pat_testing_expiry}` };
  },
  "Food hygiene standards maintained": (ctx) => checkChore(ctx, [
    "Food hygiene standards maintained",
    "Fridge clean and temperature acceptable", "Food stored correctly",
    "Bins emptied", "Bins disinfected",
  ]),
  "Gas safety certificate available and valid": ({ home }) => {
    if (!home?.gas_safety_expiry) return { status: "fail", detail: "No expiry recorded" };
    return isAfter(new Date(home.gas_safety_expiry), new Date())
      ? { status: "pass", detail: `Valid until ${home.gas_safety_expiry}` }
      : { status: "fail", detail: `Expired ${home.gas_safety_expiry}` };
  },
  "Electrical safety certificate available and valid": ({ home }) => {
    if (!home?.electrical_cert_expiry) return { status: "fail", detail: "No expiry recorded" };
    return isAfter(new Date(home.electrical_cert_expiry), new Date())
      ? { status: "pass", detail: `Valid until ${home.electrical_cert_expiry}` }
      : { status: "fail", detail: `Expired ${home.electrical_cert_expiry}` };
  },

  // ── Section 3: YP Records ───────────────────────────────────────────────
  "Support plans updated regularly and personalised": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const sixMonthsAgo = subMonths(new Date(), 6);
    const updated = homeResidents.filter(r =>
      arr(ctx.supportPlans).some(sp => sp.resident_id === r.id && sp.updated_date && isAfter(new Date(sp.updated_date), sixMonthsAgo))
    ).length;
    return updated === homeResidents.length
      ? { status: "pass", detail: `${updated}/${homeResidents.length} plans updated` }
      : { status: "fail", detail: `${updated}/${homeResidents.length} plans updated` };
  },
  "Risk assessments updated regularly": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const sixMonthsAgo = subMonths(new Date(), 6);
    const updated = homeResidents.filter(r =>
      arr(ctx.riskAssessments).some(ra => ra.resident_id === r.id && ra.updated_date && isAfter(new Date(ra.updated_date), sixMonthsAgo))
    ).length;
    return updated === homeResidents.length
      ? { status: "pass", detail: `${updated}/${homeResidents.length} assessments current` }
      : { status: "fail", detail: `${updated}/${homeResidents.length} assessments current` };
  },
  "Pathway plans available and up to date": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const withPlans = homeResidents.filter(r =>
      arr(ctx.supportPlans).some(sp => sp.resident_id === r.id && sp.plan_type === "pathway")
    ).length;
    return withPlans === homeResidents.length
      ? { status: "pass", detail: `${withPlans}/${homeResidents.length} have pathway plans` }
      : { status: "fail", detail: `${withPlans}/${homeResidents.length} have pathway plans` };
  },
  "Key work sessions completed and recorded": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const withKeyWork = homeResidents.filter(r =>
      arr(ctx.dailyLogs).some(l => l.resident_id === r.id && l.log_type === "Key Work Session" && l.log_datetime && isAfter(new Date(l.log_datetime), sevenDaysAgo))
    ).length;
    return withKeyWork >= homeResidents.length * 0.7
      ? { status: "pass", detail: `${withKeyWork}/${homeResidents.length} key work sessions logged (7d)` }
      : { status: "fail", detail: `${withKeyWork}/${homeResidents.length} key work sessions logged (7d)` };
  },
  "Progress reports sent to IRO/social worker": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const withReports = homeResidents.filter(r =>
      arr(ctx.visitReports).some(vr => vr.resident_id === r.id && vr.visit_datetime && isAfter(new Date(vr.visit_datetime), thirtyDaysAgo))
    ).length;
    return withReports >= homeResidents.length * 0.7
      ? { status: "pass", detail: `${withReports}/${homeResidents.length} reports sent (30d)` }
      : { status: "fail", detail: `${withReports}/${homeResidents.length} reports sent (30d)` };
  },
  "Weekly reports sent to social workers": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const withWeekly = homeResidents.filter(r =>
      arr(ctx.visitReports).some(vr => vr.resident_id === r.id && (vr.report_type === "weekly" || vr.category === "Weekly") && vr.visit_datetime && isAfter(new Date(vr.visit_datetime), sevenDaysAgo))
    ).length;
    return withWeekly >= homeResidents.length * 0.7
      ? { status: "pass", detail: `${withWeekly}/${homeResidents.length} weekly reports (7d)` }
      : { status: "fail", detail: `${withWeekly}/${homeResidents.length} weekly reports (7d)` };
  },
  "Daily logs accurate and professional": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const logged = homeResidents.filter(r =>
      arr(ctx.dailyLogs).some(l => l.resident_id === r.id && (l.date === today || l.date === yesterday))
    ).length;
    return logged >= homeResidents.length * 0.8
      ? { status: "pass", detail: `${logged}/${homeResidents.length} logged recently` }
      : { status: "fail", detail: `${logged}/${homeResidents.length} logged recently` };
  },
  "Incidents recorded appropriately": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    const homeIncidents = arr(ctx.incidents).filter(i =>
      homeResidents.some(r => r.id === i.resident_id) || (i.home_id && ctx.home && i.home_id === ctx.home.id)
    );
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentIncidents = homeIncidents.filter(i => i.incident_datetime && isAfter(new Date(i.incident_datetime), thirtyDaysAgo));
    const openIncidents = recentIncidents.filter(i => i.status !== "closed");
    return openIncidents.length === 0
      ? { status: "pass", detail: `${recentIncidents.length} incidents, all recorded` }
      : { status: "fail", detail: `${openIncidents.length} incidents not closed` };
  },
  "Safeguarding concerns recorded and followed up": (ctx) => {
    const homeSG = arr(ctx.safeguarding).filter(s =>
      arr(ctx.residents).some(r => r.id === s.resident_id) && s.status === "open"
    );
    return homeSG.length === 0
      ? { status: "pass", detail: "No open safeguarding cases" }
      : { status: "fail", detail: `${homeSG.length} open safeguarding cases` };
  },
  "Missing from home reports completed": (ctx) => {
    const homeMissing = arr(ctx.missingFromHome).filter(m =>
      arr(ctx.residents).some(r => r.id === m.resident_id) && m.status === "returned" && !m.return_interview_completed
    );
    return homeMissing.length === 0
      ? { status: "pass", detail: "All return interviews completed" }
      : { status: "fail", detail: `${homeMissing.length} return interviews pending` };
  },
  "Return home interviews completed": (ctx) => {
    const returned = arr(ctx.missingFromHome).filter(m =>
      arr(ctx.residents).some(r => r.id === m.resident_id) && m.status === "returned"
    );
    if (returned.length === 0) return { status: "pass", detail: "No returned episodes" };
    const completed = returned.filter(m => m.return_interview_completed).length;
    return completed === returned.length
      ? { status: "pass", detail: `${completed}/${returned.length} interviews done` }
      : { status: "fail", detail: `${completed}/${returned.length} interviews done` };
  },
  "Young people consent forms completed": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const withConsent = homeResidents.filter(r => r.social_worker_name || r.placing_local_authority).length;
    return withConsent >= homeResidents.length * 0.8
      ? { status: "pass", detail: `${withConsent}/${homeResidents.length} consent info on file` }
      : { status: "fail", detail: `${withConsent}/${homeResidents.length} consent info on file` };
  },
  "Education/employment records updated": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const withEducation = homeResidents.filter(r => r.education_status && r.education_status !== "unknown").length;
    return withEducation >= homeResidents.length * 0.7
      ? { status: "pass", detail: `${withEducation}/${homeResidents.length} education records` }
      : { status: "fail", detail: `${withEducation}/${homeResidents.length} education records` };
  },

  // ── Section 4: Staff Compliance ─────────────────────────────────────────
  "Staff files complete and compliant": (ctx) => {
    const staff = arr(ctx.homeStaff);
    if (staff.length === 0) return { status: "fail", detail: "No staff assigned" };
    const complete = staff.filter(s => s.dbs_number && s.rtw_checked && s.start_date).length;
    return complete === staff.length
      ? { status: "pass", detail: `${complete}/${staff.length} files complete` }
      : { status: "fail", detail: `${complete}/${staff.length} files complete` };
  },
  "DBS checks valid": (ctx) => {
    const staff = arr(ctx.homeStaff);
    if (staff.length === 0) return { status: "fail", detail: "No staff assigned" };
    const valid = staff.filter(s => s.dbs_expiry && isAfter(new Date(s.dbs_expiry), new Date())).length;
    return valid === staff.length
      ? { status: "pass", detail: `${valid}/${staff.length} DBS valid` }
      : { status: "fail", detail: `${valid}/${staff.length} DBS valid` };
  },
  "Mandatory training up to date": (ctx) => {
    const staff = arr(ctx.homeStaff);
    if (staff.length === 0) return { status: "fail", detail: "No staff assigned" };
    const now = new Date();
    const allValid = staff.every(s => {
      const recs = arr(ctx.trainingRecords).filter(r => r.staff_id === s.id);
      return recs.length > 0 && recs.every(r => !r.expiry_date || isAfter(new Date(r.expiry_date), now));
    });
    return allValid
      ? { status: "pass", detail: "All staff training current" }
      : { status: "fail", detail: "Some training overdue" };
  },
  "Supervisions completed regularly": (ctx) => {
    const staff = arr(ctx.homeStaff);
    if (staff.length === 0) return { status: "fail", detail: "No staff assigned" };
    const threeMonthsAgo = subMonths(new Date(), 3);
    const withSupervision = staff.filter(s =>
      arr(ctx.supervisionRecords).some(sr => sr.supervisee_id === s.id && sr.session_date && isAfter(new Date(sr.session_date), threeMonthsAgo))
    ).length;
    return withSupervision >= staff.length * 0.8
      ? { status: "pass", detail: `${withSupervision}/${staff.length} supervised (3mo)` }
      : { status: "fail", detail: `${withSupervision}/${staff.length} supervised (3mo)` };
  },
  "Team meetings take place regularly": (ctx) => {
    const threeMonthsAgo = subMonths(new Date(), 3);
    const meetings = arr(ctx.dailyLogs).filter(l =>
      (l.log_type === "General Note" || (l.title && l.title.toLowerCase().includes("meeting")) || (l.summary && l.summary.toLowerCase().includes("meeting")))
      && l.log_datetime && isAfter(new Date(l.log_datetime), threeMonthsAgo)
    );
    return meetings.length > 0
      ? { status: "pass", detail: `${meetings.length} meetings logged (3mo)` }
      : { status: "fail", detail: "No team meetings recorded (3mo)" };
  },
  "Staff understand required policies": (ctx) => {
    const staff = arr(ctx.homeStaff);
    if (staff.length === 0) return { status: "fail", detail: "No staff assigned" };
    const staffIds = new Set(staff.map(s => s.id));
    const acked = arr(ctx.policyAcknowledgements).filter(a =>
      staffIds.has(a.staff_id) && (a.status === "acknowledged" || a.status === "completed")
    );
    const ackedStaff = new Set(acked.map(a => a.staff_id));
    const ratio = ackedStaff.size / staff.length;
    return ratio >= 0.8
      ? { status: "pass", detail: `${ackedStaff.size}/${staff.length} staff acknowledged policies` }
      : { status: "fail", detail: `${ackedStaff.size}/${staff.length} staff acknowledged policies` };
  },
  "Staffing rota appropriately covered": (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const todayShifts = arr(ctx.shifts).filter(s => s.date === today);
    return todayShifts.length > 0
      ? { status: "pass", detail: `${todayShifts.length} shifts today` }
      : { status: "fail", detail: "No shifts scheduled today" };
  },
  "Staff interaction with young people positive": (ctx) => {
    const staff = arr(ctx.homeStaff);
    if (staff.length === 0) return { status: "fail", detail: "No staff assigned" };
    const threeMonthsAgo = subMonths(new Date(), 3);
    const recentFeedback = arr(ctx.swpaFeedback).filter(f =>
      f.submitted_at && isAfter(new Date(f.submitted_at), threeMonthsAgo)
    );
    return recentFeedback.length > 0
      ? { status: "pass", detail: `${recentFeedback.length} feedback submissions (3mo)` }
      : { status: "fail", detail: "No SWPA feedback in 3 months" };
  },
  "Handover records completed properly": (ctx) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const recent = arr(ctx.handoverRecords).filter(h =>
      h.created_date && isAfter(new Date(h.created_date), sevenDaysAgo)
    );
    return recent.length > 0
      ? { status: "pass", detail: `${recent.length} handovers (7d)` }
      : { status: "fail", detail: "No handover records (7d)" };
  },

  // ── Section 5: Safeguarding & Behaviour Management ──────────────────────
  "Safeguarding concerns managed appropriately": (ctx) => {
    const homeSG = arr(ctx.safeguarding).filter(s =>
      arr(ctx.residents).some(r => r.id === s.resident_id)
    );
    if (homeSG.length === 0) return { status: "pass", detail: "No safeguarding cases" };
    const managed = homeSG.filter(s => s.manager_informed && s.investigation_status !== "open").length;
    return managed === homeSG.length
      ? { status: "pass", detail: `${managed}/${homeSG.length} cases managed` }
      : { status: "fail", detail: `${managed}/${homeSG.length} cases managed` };
  },
  "Young people know how to raise concerns": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const homeComplaints = arr(ctx.complaints).filter(c =>
      homeResidents.some(r => r.id === c.resident_id)
    );
    return { status: "pass", detail: `${homeComplaints.length} complaints on file — YP voice active` };
  },
  "Missing from home procedures followed": (ctx) => {
    const homeMissing = arr(ctx.missingFromHome).filter(m =>
      arr(ctx.residents).some(r => r.id === m.resident_id)
    );
    if (homeMissing.length === 0) return { status: "pass", detail: "No missing episodes" };
    const withProcedure = homeMissing.filter(m => m.reported_to_police && m.la_notified).length;
    return withProcedure === homeMissing.length
      ? { status: "pass", detail: `${withProcedure}/${homeMissing.length} followed procedure` }
      : { status: "fail", detail: `${withProcedure}/${homeMissing.length} followed procedure` };
  },
  "Incident debriefs completed": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    const homeIncidents = arr(ctx.incidents).filter(i =>
      homeResidents.some(r => r.id === i.resident_id)
    );
    if (homeIncidents.length === 0) return { status: "pass", detail: "No incidents" };
    const debriefed = homeIncidents.filter(i => i.manager_review_status === "reviewed").length;
    return debriefed >= homeIncidents.length * 0.8
      ? { status: "pass", detail: `${debriefed}/${homeIncidents.length} debriefed` }
      : { status: "fail", detail: `${debriefed}/${homeIncidents.length} debriefed` };
  },
  "Behaviour support strategies effective": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    if (homeResidents.length === 0) return { status: "fail", detail: "No active residents" };
    const withPlans = homeResidents.filter(r =>
      arr(ctx.behaviourPlans).some(bp => bp.resident_id === r.id)
    ).length;
    return withPlans >= homeResidents.length * 0.5
      ? { status: "pass", detail: `${withPlans}/${homeResidents.length} have BSP` }
      : { status: "fail", detail: `${withPlans}/${homeResidents.length} have BSP` };
  },
  "Sanctions/restorative approaches recorded": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    const homeWarnings = arr(ctx.warningLetters).filter(w =>
      homeResidents.some(r => r.id === w.resident_id)
    );
    return { status: "pass", detail: `${homeWarnings.length} sanctions/warnings on file` };
  },
  "Multi-agency cooperation evident": (ctx) => {
    const homeSG = arr(ctx.safeguarding).filter(s =>
      arr(ctx.residents).some(r => r.id === s.resident_id)
    );
    if (homeSG.length === 0) return { status: "pass", detail: "No safeguarding cases" };
    const withMA = homeSG.filter(s => s.la_safeguarding_referred || s.lado_referral).length;
    return withMA > 0
      ? { status: "pass", detail: `${withMA} multi-agency referrals` }
      : { status: "pass", detail: "No MA referrals needed" };
  },
  "Police/social worker communication recorded": (ctx) => {
    const homeResidents = arr(ctx.residents).filter(r => r.status === "active");
    const homeIncidents = arr(ctx.incidents).filter(i =>
      homeResidents.some(r => r.id === i.resident_id)
    );
    const withPoliceSW = homeIncidents.filter(i => i.police_called || i.local_authority_notified).length;
    return { status: "pass", detail: `${withPoliceSW} police/LA communications recorded` };
  },
};

/**
 * Get suggestion for a checklist item
 * @param {string} item - The checklist item text
 * @param {object} ctx - Context with home, residents, staff, checkResponses, etc.
 * @returns {{ status: "pass"|"fail", detail: string } | null}
 */
export function getSuggestion(item, ctx) {
  const fn = CHECK_SUGGESTIONS[item];
  if (!fn) return null;
  try {
    return fn(ctx);
  } catch {
    return null;
  }
}