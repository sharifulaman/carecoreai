import { useState, useMemo } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

export default function OfstedReadinessScore({ data, residents, staff, orgProfile, homes, locationAssessments }) {
  const score = useMemo(() => {
    let total = 0;
    const issues = [];

    // DYNAMIC RISK WEIGHTING: Reg 27 + Reg 32 + Annex A completeness
    // Reg 27: 25 pts (Ofsted emergency notifications)
    // Reg 32: 25 pts (Quality of support reviews)
    // Annex A: 20 pts (Inspection readiness)
    // Operational: 30 pts (existing governance, safeguarding, staffing, plans)

    // 1. REG 27 — EMERGENCY NOTIFICATIONS — 25 pts
    let reg27Score = 0;
    const reg27Notifications = data?.reg27Notifications || [];
    const pendingReg27 = reg27Notifications.filter(n => n.status === "pending").length;
    const overdueReg27 = reg27Notifications.filter(n => {
      const deadline = new Date(n.event_date);
      deadline.setHours(deadline.getHours() + 24);
      return deadline < new Date() && n.status !== "notified";
    }).length;
    
    if (pendingReg27 === 0 && overdueReg27 === 0) {
      reg27Score += 20;
    } else {
      if (overdueReg27 > 0) issues.push(`Reg27: ${overdueReg27} overdue notification(s)`);
      else if (pendingReg27 > 0) issues.push(`Reg27: ${pendingReg27} pending notification(s)`);
    }
    
    const notifiedThisYear = reg27Notifications.filter(n => n.status === "notified" && new Date(n.notified_datetime) >= new Date(new Date().getFullYear(), 0, 1)).length;
    if (notifiedThisYear > 0) reg27Score += 5;
    
    total += reg27Score;

    // 2. REG 32 — QUALITY OF SUPPORT REVIEWS — 25 pts
    let reg32Score = 0;
    const reg32Reports = data?.reg32Reports || [];
    const completedReg32 = reg32Reports.filter(r => r.status === "complete" || r.status === "submitted").length;
    const activeResidentsArray = (residents || []).filter(r => r.status === "active");
    const activeResidentsCount = activeResidentsArray.length;
    
    if (completedReg32 > 0) reg32Score += 10;
    else if (activeResidentsCount > 0) issues.push("Reg32: No quality reviews completed");
    
    const reviewsWithYPInput = reg32Reports.filter(r => r.yp_views_summary || r.selected_yp_ids?.length > 0).length;
    if (reviewsWithYPInput === completedReg32 && completedReg32 > 0) reg32Score += 8;
    else if (completedReg32 > 0) issues.push("Reg32: Missing young people's views in reviews");
    
    const reviewsWithActions = reg32Reports.filter(r => r.action_plan_narrative || r.selected_event_ids_actions?.length > 0).length;
    if (reviewsWithActions === completedReg32 && completedReg32 > 0) reg32Score += 7;
    else if (completedReg32 > 0) issues.push("Reg32: Action plans incomplete");
    
    total += reg32Score;

    // 3. ANNEX A COMPLETENESS — 20 pts
    let annexAScore = 0;
    const currentResidents = (residents || []).filter(r => r.status === "active").length;
    
    // Accommodation category recorded (5pts)
    const residentsWithCategory = (residents || []).filter(r => r.accommodation_category).length;
    const missingCategory = currentResidents - residentsWithCategory;
    if (residentsWithCategory === currentResidents && currentResidents > 0) annexAScore += 5;
    else if (missingCategory > 0) issues.push(`Annex A: ${missingCategory} residents missing accommodation category`);
    
    // Placing LA recorded (5pts)
    const residentsWithLA = (residents || []).filter(r => r.placing_local_authority).length;
    const missingLA = currentResidents - residentsWithLA;
    if (residentsWithLA === currentResidents && currentResidents > 0) annexAScore += 5;
    else if (missingLA > 0) issues.push(`Annex A: ${missingLA} residents missing placing LA`);
    
    // UASC status recorded (5pts)
    const residentsWithUASC = (residents || []).filter(r => typeof r.uasc === "boolean").length;
    const missingUASC = currentResidents - residentsWithUASC;
    if (residentsWithUASC === currentResidents && currentResidents > 0) annexAScore += 5;
    else if (missingUASC > 0) issues.push(`Annex A: ${missingUASC} residents missing UASC status`);
    
    // Education/health data complete (5pts)
    const eduHealthComplete = (residents || []).filter(r => r.education_provider || r.gp_name).length;
    if (eduHealthComplete > 0) annexAScore += 5;
    else if (currentResidents > 0) issues.push("Annex A: Education/health data incomplete");
    
    total += annexAScore;

    // 3b. CONTINGENCY PLAN — 5 pts (Leadership & Management)
    if (!orgProfile?.active_contingency_plan_id) {
      issues.push("Reg23: No active contingency plan policy (required for Ofsted registration)");
    } else {
      total += 5;
    }

    // 4. REG45 GOVERNANCE — 10 pts
    let govScore = 0;

    // Reg45 review completed within cycle (10pts)
    const reg45Reviews = data?.reg45Reviews || [];
    if (reg45Reviews.length > 0) govScore += 10;
    else issues.push("Reg45: No review completed");

    total += govScore;

    // 5. MISSING, SAFEGUARDING & INCIDENTS — 26 pts (added Reg 21 + Reg 22)
    let safeScore = 0;
    const mfhRecords = data?.mfhRecords || [];
    const accidents = data?.accidentReports || [];
    const bodyMaps = data?.bodyMaps || [];
    const reg21Policies = data?.reg21Policies || [];
    const activeMissingPolicy = reg21Policies.find(p => p.status === "active");
    const reg22Policies = data?.reg22Policies || [];
    const activeBehaviourPolicy = reg22Policies.find(p => p.status === "active");
    const restraintRecords = data?.restraintRecords || [];

    // Reg 21: Active missing child policy exists (2pts)
    if (activeMissingPolicy) safeScore += 2;
    else issues.push("Reg21: No active missing child policy");

    // Reg 21: Consultation completed for current version (2pts)
    if (activeMissingPolicy && (activeMissingPolicy.pre_implementation_consultation_completed || activeMissingPolicy.amendment_consultation_completed)) safeScore += 2;
    else if (activeMissingPolicy) issues.push("Reg21: Consultation not recorded");

    // Reg 21: Policy reviewed within last 12 months (1pt)
    if (activeMissingPolicy && activeMissingPolicy.review_date && new Date(activeMissingPolicy.review_date) >= new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate())) safeScore += 1;
    else if (activeMissingPolicy) issues.push("Reg21: Policy review overdue");

    // Reg 22: Active behaviour management policy exists (2pts)
    if (activeBehaviourPolicy) safeScore += 2;
    else issues.push("Reg22: No active behaviour management policy");

    // Reg 22: Policy reviewed within last 12 months (1pt)
    if (activeBehaviourPolicy && activeBehaviourPolicy.review_date && new Date(activeBehaviourPolicy.review_date) >= new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate())) safeScore += 1;
    else if (activeBehaviourPolicy) issues.push("Reg22: Policy review overdue");

    // Reg 22: All staff acknowledged (2pts)
    const reg22Acks = data?.reg22Acknowledgements || [];
    if (reg22Acks.length > 0 && reg22Acks.every(a => a.acknowledged)) safeScore += 2;
    else if (reg22Acks.length > 0) issues.push(`Reg22: ${reg22Acks.filter(a => !a.acknowledged).length} staff not acknowledged`);

    // Reg 22: No overdue restraint records (2pts)
    const overdueRestraints = restraintRecords.filter(r => 
      ["stage1_pending", "stage2_pending", "stage3_pending", "overdue"].includes(r.overall_status)
    ).length;
    if (overdueRestraints === 0) safeScore += 2;
    else issues.push(`Reg22: ${overdueRestraints} restraint record(s) with overdue workflow`);

    // No active missing episode (3pts)
    const activeMFH = mfhRecords.filter(m => m.missing_status === "active" || m.missing_status === "open").length;
    if (activeMFH === 0) safeScore += 3;
    else issues.push(`Missing: ${activeMFH} active episode(s)`);

    // All missing episodes have return interview/follow-up (4pts)
    const mfhNeedingInterview = mfhRecords.filter(m => m.missing_status === "returned" && !m.return_interview_conducted).length;
    if (mfhNeedingInterview === 0 && mfhRecords.length > 0) safeScore += 4;
    else if (mfhNeedingInterview > 0) issues.push(`Missing: ${mfhNeedingInterview} return interviews outstanding`);

    // All incidents reviewed by manager (5pts)
    const unreviewed = accidents.filter(a => !a.reviewed_by_id).length;
    if (unreviewed === 0 && accidents.length > 0) safeScore += 5;
    else if (unreviewed > 0) issues.push(`Incidents: ${unreviewed} not reviewed by manager`);

    // No overdue safeguarding actions (5pts)
    const overdueBodyMaps = bodyMaps.filter(b => b.safeguarding_concern && !b.reviewed_at && b.recorded_datetime) 
      .filter(b => {
        const days = (new Date() - new Date(b.recorded_datetime)) / (1000 * 60 * 60 * 24);
        return days > 3;
      }).length;
    if (overdueBodyMaps === 0) safeScore += 5;
    else issues.push(`Safeguarding: ${overdueBodyMaps} concerns overdue for review`);

    total += safeScore;

    // 6. TRAINING, DBS & SUPERVISION — 20 pts (was 10, +10 for Schedule 1 checks)
    let staffScore = 0;
    
    // Schedule 1 checks: all active staff have complete records (5pts)
    const schedule1Records = Array.isArray(data?.schedule1Records) ? data.schedule1Records : [];
    const staffWithComplete = schedule1Records.filter(r => r.all_checks_complete).length;
    const allStaffWithRecords = schedule1Records.length;
    if (allStaffWithRecords > 0 && staffWithComplete === allStaffWithRecords) {
      staffScore += 5;
    } else if (allStaffWithRecords > 0) {
      issues.push(`Schedule 1: ${allStaffWithRecords - staffWithComplete} staff with incomplete checks`);
    }

    // No exceptional circumstances beyond review date (3pts)
    const exceptionalExpired = schedule1Records.filter(r => r.exceptional_circumstances_applied && r.exceptional_circumstances_review_date && new Date(r.exceptional_circumstances_review_date) < new Date()).length;
    if (exceptionalExpired === 0) {
      staffScore += 3;
    } else {
      issues.push(`Schedule 1: ${exceptionalExpired} exceptional circumstances exception${exceptionalExpired > 1 ? "s" : ""} have expired`);
    }

    // All staff induction completed (3pts)
    const inductionComplete = schedule1Records.filter(r => r.induction_completed).length;
    if (allStaffWithRecords > 0 && inductionComplete === allStaffWithRecords) {
      staffScore += 3;
    } else if (allStaffWithRecords > 0) {
      issues.push(`Induction: ${allStaffWithRecords - inductionComplete} staff not inducted`);
    }

    // All staff on probation have review date set (2pts)
    const onProbation = schedule1Records.filter(r => r.probation_period_set);
    const probationWithReview = onProbation.filter(r => r.probation_review_date);
    if (onProbation.length > 0 && probationWithReview.length === onProbation.length) {
      staffScore += 2;
    } else if (onProbation.length > 0) {
      issues.push(`Probation: ${onProbation.length - probationWithReview.length} staff without review dates`);
    }
    
    // 95%+ mandatory training current (5pts)
    const trained = staff.filter(s => {
      const records = (data?.trainingRecords || []).filter(t => t.staff_id === s.id && new Date(t.expiry_date) > new Date());
      return records.length > 0;
    }).length;
    const trainingRate = staff.length > 0 ? trained / staff.length : 0;
    if (trainingRate >= 0.95) staffScore += 5;
    else issues.push(`Training: ${Math.round((1-trainingRate)*100)}% non-compliant`);

    // 100% DBS/right-to-work records present (4pts)
    const dbsPresent = staff.filter(s => s.dbs_expiry_date).length;
    if (dbsPresent === staff.length) staffScore += 4;
    else issues.push(`DBS: ${staff.length - dbsPresent} staff missing DBS record`);

    // Staff supervision up to date (4pts)
    const supervised = staff.filter(s => {
      const records = (data?.supervisionRecords || []).filter(r => r.staff_id === s.id && new Date(r.date) >= new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000));
      return records.length > 0;
    }).length;
    const supervisionRate = staff.length > 0 ? supervised / staff.length : 0;
    if (supervisionRate >= 0.9) staffScore += 4;
    else issues.push(`Supervision: ${Math.round((1-supervisionRate)*100)}% overdue`);

    // Induction/probation records complete (2pts)
    const inducted = staff.filter(s => s.induction_date && new Date(s.induction_date) < new Date()).length;
    if (inducted === staff.length && staff.length > 0) staffScore += 2;
    else if (staff.length > 0) issues.push(`Induction: ${staff.length - inducted} staff missing records`);

    total += staffScore;

    // 7. PLANS & OUTCOMES — 10 pts
    let plansScore = 0;
    const placementPlans = data?.placementPlans || [];
    const supportPlans = data?.supportPlans || [];
    const pathwayPlans = data?.pathwayPlans || [];
    const ilsPlans = data?.ilsPlans || [];

    // Placement plan active and reviewed (4pts)
    const activePlacement = placementPlans.filter(p => p.status === "active").length;
    if (activePlacement > 0) plansScore += 4;
    else issues.push("Plans: No active placement plans");

    // Support plan active and reviewed (4pts)
    const activeSupport = supportPlans.filter(p => p.status === "active").length;
    if (activeSupport > 0) plansScore += 4;
    else issues.push("Plans: No active support plans");

    // Pathway plan active for eligible 16+ residents (3pts)
    const over16 = activeResidentsArray.filter(r => {
      const age = r.dob ? Math.floor((new Date() - new Date(r.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
      return age >= 16;
    }).length;
    const pathwayFor16Plus = pathwayPlans.filter(p => p.status === "active" && 
      activeResidentsArray.find(r => r.id === p.resident_id && {
        age: r.dob ? Math.floor((new Date() - new Date(r.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 0
      }.age >= 16)
    ).length;
    if (over16 === 0 || pathwayFor16Plus === over16) plansScore += 3;
    else issues.push(`Plans: ${over16 - pathwayFor16Plus} 16+ residents missing pathway plan`);

    // ILS / move-on plan active where applicable (2pts)
    const ilsActive = ilsPlans.filter(p => p.status === "active").length;
    if (ilsActive > 0 || ilsPlans.length === 0) plansScore += 2;

    // Outcomes/progress evidence recorded (2pts)
    const plansWithProgress = [...placementPlans, ...supportPlans, ...pathwayPlans].filter(p => p.goals?.some(g => g.progress_notes)).length;
    if (plansWithProgress > 0) plansScore += 2;
    else issues.push("Plans: Limited progress evidence recorded");

    total += plansScore;

    // 8. HOME ENVIRONMENT & CHECKS — 12 pts (was 15, reduced to compensate for Reg 26)
    let homeScore = 0;
    const thisYear = new Date().getFullYear();
    const activeHomes = homes || [];

    // All homes have a current location assessment (current calendar year): +2 pts
    const homesWithCurrentLA = activeHomes.filter(h => {
      const approved = (locationAssessments || []).find(a => a.home_id === h.id && a.assessment_year === thisYear && a.status === "approved");
      return !!approved;
    });
    if (activeHomes.length > 0 && homesWithCurrentLA.length === activeHomes.length) {
      homeScore += 2;
    } else if (activeHomes.length > 0) {
      const missing = activeHomes.length - homesWithCurrentLA.length;
      issues.push(`Reg6: ${missing} home${missing > 1 ? "s" : ""} missing a current location assessment (${thisYear})`);
    }

    // No homes with unsuitable finding: +2 pts
    const unsuitableLA = (locationAssessments || []).filter(a => a.status === "approved" && a.overall_suitability === "unsuitable");
    if (unsuitableLA.length === 0) {
      homeScore += 2;
    } else {
      issues.push(`Reg6: ${unsuitableLA.length} home${unsuitableLA.length > 1 ? "s" : ""} with an unsuitable location assessment finding`);
    }

    // All recommended actions from assessments completed: +1 pt
    const pendingActions = (locationAssessments || []).flatMap(a => (a.recommended_actions || []).filter(r => !r.completed));
    if (pendingActions.length === 0 && (locationAssessments || []).length > 0) {
      homeScore += 1;
    } else if (pendingActions.length > 0) {
      issues.push(`Reg6: ${pendingActions.length} recommended action${pendingActions.length > 1 ? "s" : ""} from location assessments not yet completed`);
    }
    const homeChecks = data?.homeChecks || [];
    const sleepChecks = data?.sleepChecks || [];
    const maintenanceLogs = data?.maintenanceLogs || [];
    const lastMonth = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

    // Required home checks completed (2pts)
    const checksThisMonth = homeChecks.filter(c => new Date(c.check_date) >= lastMonth).length;
    if (checksThisMonth >= 2) homeScore += 2;
    else issues.push(`Home checks: Only ${checksThisMonth} this month (target 2+)`);

    // Fire/water/health & safety checks completed (2pts)
    const safetyChecks = homeChecks.filter(c => c.items?.some(item => item.item_name?.toLowerCase().includes("fire") || item.item_name?.toLowerCase().includes("water") || item.item_name?.toLowerCase().includes("safety"))).length;
    if (safetyChecks > 0) homeScore += 2;
    else issues.push("Safety checks: No fire/water/safety checks recorded");

    // Maintenance issues tracked and not overdue (1pt)
    const overdueMaintenance = maintenanceLogs.filter(m => {
      return m.target_completion_date && new Date(m.target_completion_date) < new Date() && m.status !== "completed";
    }).length;
    if (overdueMaintenance === 0) homeScore += 2;
    else issues.push(`Maintenance: ${overdueMaintenance} items overdue`);

    // Sleep checks completed where applicable (0pts - bonus)
    const sleepThisMonth = sleepChecks.filter(s => new Date(s.date) >= lastMonth && s.status === "completed").length;

    total += homeScore;

    // 9. COMPLAINTS, VOICE & CONSULTATION — 5 pts
    let complaintScore = 0;
    const complaints = data?.complaints || [];

    // No complaints overdue beyond policy timescale (3pts)
    const overdueComplaints = complaints.filter(c => {
      const target = new Date(c.received_datetime);
      target.setDate(target.getDate() + 28);
      return target < new Date() && c.status !== "closed";
    }).length;
    if (overdueComplaints === 0) complaintScore += 3;
    else issues.push(`Complaints: ${overdueComplaints} overdue (28-day limit)`);

    // Child's views recorded (1pt)
    const withChildViews = complaints.filter(c => c.complainant_type === "resident" || c.resident_informed).length;
    if (withChildViews > 0 || complaints.length === 0) complaintScore += 1;

    // Complaints outcomes and learning recorded (1pt)
    const withOutcomes = complaints.filter(c => c.investigation_outcome || c.lessons_learned).length;
    if (withOutcomes === complaints.length && complaints.length > 0) complaintScore += 1;
    else if (complaints.length > 0) issues.push("Complaints: Some outcomes/learning not recorded");

    total += complaintScore;

    // 10. HEALTH, EDUCATION & WELLBEING — 5 pts
    let wellScore = 0;
    const appointments = data?.dashboardAppointments || [];
    const healthObservations = data?.healthObservations || [];

    // Health appointments tracked (1pt)
    if (appointments.filter(a => a.type?.includes("health") || a.type?.includes("medical")).length > 0) wellScore += 1;

    // Education attendance/progress recorded (1pt)
    const eduData = (residents || []).filter(r => r.education_provider && r.education_provider.length > 0).length;
    if (eduData > 0) wellScore += 1;

    // Leisure/wellbeing activities recorded (1pt)
    const withLeisure = (residents || []).filter(r => r.leisure_interests || r.leisure_football_enrolled || r.leisure_gym_enrolled).length;
    if (withLeisure > 0) wellScore += 1;

    // Actions followed up (1pt)
    if (appointments.length > 0 && appointments.some(a => a.outcome_notes)) wellScore += 1;

    // Medication records present (1pt)
    const medRecords = data?.medicationRecords || [];
    if (medRecords.length > 0) wellScore += 1;

    total += wellScore;

    // 11. RECORD QUALITY & COMPLETENESS (Reg 24, 25 & 26) — 8 pts
    let recordScore = 0;
    const dailyLogs = data?.dailyLogs || [];
    const completenessChecks = data?.completenessChecks || [];
    const storageAudits = data?.storageAudits || [];
    const today = new Date().toISOString().split("T")[0];
    const latestAudit = storageAudits.sort((a, b) => (b.audit_date || "").localeCompare(a.audit_date || ""))[0];
    
    // 90%+ of active residents have complete or good records (2pts)
    const activeResidents = residents.filter(r => r.status === "active").length;
    const completeOrGood = completenessChecks.filter(c => ["complete", "good"].includes(c.completeness_band)).length;
    if (activeResidents > 0 && (completeOrGood / activeResidents) >= 0.9) recordScore += 2;
    else if (activeResidents > 0) issues.push(`Reg24: Only ${((completeOrGood / activeResidents) * 100).toFixed(0)}% of active residents have good/complete records`);

    // No residents with critical completeness band (1pt)
    const criticalRecords = completenessChecks.filter(c => c.completeness_band === "critical").length;
    if (criticalRecords === 0) recordScore += 1;
    else issues.push(`Reg24: ${criticalRecords} resident${criticalRecords > 1 ? "s" : ""} with critical records`);

    // Retention config reviewed in last 12 months (1pt)
    const retentionConfig = data?.retentionConfig;
    if (retentionConfig?.last_reviewed_date && new Date(retentionConfig.last_reviewed_date) >= new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate())) recordScore += 1;
    else issues.push("Reg24: Retention policy review overdue");

    // Storage audit conducted within last 12 months (1pt) — Reg 26
    if (latestAudit && latestAudit.next_audit_due && new Date(latestAudit.next_audit_due) >= new Date()) recordScore += 1;
    else issues.push("Reg26: No storage audit conducted or audit overdue");

    // All 12 items fully compliant in last audit (1pt) — Reg 26
    if (latestAudit && latestAudit.items_with_issues === 0) recordScore += 1;
    else if (latestAudit) issues.push(`Reg26: ${latestAudit.items_with_issues} items have issues`);

    // Daily logs up to date (1pt)
    const logsRecent = dailyLogs.filter(l => l.date === today || l.date === new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]).length;
    if (logsRecent > 0) recordScore += 1;
    else issues.push("Records: No daily logs from last 2 days");

    total += recordScore;

    // 12. REG 34 — NOTICE OF CHANGES — 3 pts
    let reg34Score = 0;
    const reg34Records = data?.reg34Records || [];
    
    // No overdue Reg 34 notifications (2pts)
    const overdueReg34 = reg34Records.filter(r => r.is_overdue).length;
    if (overdueReg34 === 0) reg34Score += 2;
    else issues.push(`Compliance: ${overdueReg34} overdue Reg 34 notification(s)`);
    
    // No late notifications in last 12 months (1pt)
    const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    const lateThisYear = reg34Records.filter(r => r.notification_late && r.notification_sent_date > oneYearAgo).length;
    if (lateThisYear === 0) reg34Score += 1;
    else issues.push(`Compliance: ${lateThisYear} late Reg 34 notification(s) this year`);
    
    total += reg34Score;

    return { score: total, issues };
  }, [data, residents, staff, orgProfile, homes, locationAssessments, data?.schedule1Records, data?.rsm33Data, data?.reg34Records]);

  const getStatus = (score) => {
    if (score >= 90) return { label: "Strong readiness", color: "bg-green-100 text-green-700", band: "90–100" };
    if (score >= 75) return { label: "Generally prepared", color: "bg-blue-100 text-blue-700", band: "75–89" };
    if (score >= 60) return { label: "Improvement needed", color: "bg-amber-100 text-amber-700", band: "60–74" };
    if (score >= 40) return { label: "High risk", color: "bg-orange-100 text-orange-700", band: "40–59" };
    return { label: "Critical compliance risk", color: "bg-red-100 text-red-700", band: "0–39" };
  };

  const status = getStatus(score.score);
  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 5;
  const visibleIssues = showAll ? score.issues : score.issues.slice(0, PREVIEW);
  const hidden = score.issues.length - PREVIEW;

  // SVG gauge
  const radius = 52;
  const cx = 70;
  const cy = 70;
  const circumference = Math.PI * radius; // half circle = π×r
  const pct = score.score / 100;
  const dashOffset = circumference * (1 - pct);
  const gaugeColor = score.score >= 75 ? "#22c55e" : score.score >= 60 ? "#f59e0b" : score.score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="flex gap-6 h-full">
      {/* Left: gauge */}
      <div className="flex flex-col items-center justify-center shrink-0 gap-2 min-w-[120px]">
        <p className="text-xs font-semibold text-white/70 text-center">Overall Readiness Score</p>
        <div className="relative">
          <svg width="140" height="90" viewBox="0 0 140 90">
            {/* Track */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" strokeLinecap="round"
            />
            {/* Fill */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none" stroke={gaugeColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-4xl font-bold text-white leading-none">{score.score}</span>
            <span className="text-xs text-white/60">/ 100</span>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: gaugeColor + "33", color: gaugeColor }}>
          {status.label}
        </span>
      </div>

      {/* Middle: top risk areas */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <p className="text-xs font-semibold text-white/70 mb-1">Top Risk Areas</p>
        {score.issues.length === 0 ? (
          <p className="text-xs text-white/50">No issues detected — great compliance!</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {visibleIssues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/80 leading-snug">
                  <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: i < 2 ? "#ef4444" : i < 4 ? "#f97316" : "#f59e0b" }} />
                  {issue}
                </li>
              ))}
            </ul>
            {!showAll && hidden > 0 && (
              <button onClick={() => setShowAll(true)} className="text-xs text-blue-300 hover:text-blue-200 mt-1 text-left">
                + {hidden} more issues
              </button>
            )}
            {showAll && score.issues.length > PREVIEW && (
              <button onClick={() => setShowAll(false)} className="text-xs text-blue-300 hover:text-blue-200 mt-1 text-left flex items-center gap-1">
                <ChevronDown className="w-3 h-3 rotate-180" /> Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}