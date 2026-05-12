import { useMemo } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function OfstedReadinessScore({ data, residents, staff }) {
  const score = useMemo(() => {
    let total = 0;
    const issues = [];

    // 1. REG44 / REG45 GOVERNANCE — 15 pts
    let govScore = 0;
    const reg44Reports = data?.reg44Reports || [];
    const currentMonth = new Date();
    const lastMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    
    // Reg44 completed last calendar month (5pts)
    const reg44ThisMonth = reg44Reports.filter(r => new Date(r.visit_date) >= lastMonthStart).length;
    if (reg44ThisMonth > 0) govScore += 5;
    else issues.push("Reg44: No report completed last calendar month");

    // Reg44 actions reviewed and assigned (4pts)
    const reg44WithActions = reg44Reports.filter(r => r.new_recommendations?.length > 0 && r.new_recommendations.some(a => a.responsible_person)).length;
    if (reg44WithActions === reg44Reports.length && reg44Reports.length > 0) govScore += 4;
    else if (reg44Reports.length > 0) issues.push("Reg44: Some actions not reviewed or assigned");

    // No overdue Reg44 actions (4pts)
    const overdueActions = reg44Reports.flatMap(r => r.new_recommendations || []).filter(a => {
      return a.target_date && new Date(a.target_date) < new Date();
    }).length;
    if (overdueActions === 0) govScore += 4;
    else issues.push(`Reg44: ${overdueActions} overdue actions`);

    // Reg45 review completed within cycle (2pts)
    const reg45Reviews = data?.reg45Reviews || [];
    if (reg45Reviews.length > 0) govScore += 2;
    else issues.push("Reg45: No review completed");

    total += govScore;

    // 2. MISSING, SAFEGUARDING & INCIDENTS — 20 pts
    let safeScore = 0;
    const mfhRecords = data?.mfhRecords || [];
    const accidents = data?.accidentReports || [];
    const bodyMaps = data?.bodyMaps || [];

    // No active missing episode (5pts)
    const activeMFH = mfhRecords.filter(m => m.status === "active").length;
    if (activeMFH === 0) safeScore += 5;
    else issues.push(`Missing: ${activeMFH} active episode(s)`);

    // All missing episodes have return interview/follow-up (5pts)
    const mfhNeedingInterview = mfhRecords.filter(m => m.status === "returned" && !m.return_interview_completed).length;
    if (mfhNeedingInterview === 0 && mfhRecords.length > 0) safeScore += 5;
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

    // 3. TRAINING, DBS & SUPERVISION — 15 pts
    let staffScore = 0;
    
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

    // 4. PLANS & OUTCOMES — 15 pts
    let plansScore = 0;
    const activeResidents = (residents || []).filter(r => r.status === "active");
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
    const over16 = activeResidents.filter(r => {
      const age = r.dob ? Math.floor((new Date() - new Date(r.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
      return age >= 16;
    }).length;
    const pathwayFor16Plus = pathwayPlans.filter(p => p.status === "active" && 
      activeResidents.find(r => r.id === p.resident_id && {
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

    // 5. HOME ENVIRONMENT & CHECKS — 10 pts
    let homeScore = 0;
    const homeChecks = data?.homeChecks || [];
    const sleepChecks = data?.sleepChecks || [];
    const maintenanceLogs = data?.maintenanceLogs || [];
    const lastMonth = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

    // Required home checks completed (4pts)
    const checksThisMonth = homeChecks.filter(c => new Date(c.check_date) >= lastMonth).length;
    if (checksThisMonth >= 2) homeScore += 4;
    else issues.push(`Home checks: Only ${checksThisMonth} this month (target 2+)`);

    // Fire/water/health & safety checks completed (3pts)
    const safetyChecks = homeChecks.filter(c => c.items?.some(item => item.item_name?.toLowerCase().includes("fire") || item.item_name?.toLowerCase().includes("water") || item.item_name?.toLowerCase().includes("safety"))).length;
    if (safetyChecks > 0) homeScore += 3;
    else issues.push("Safety checks: No fire/water/safety checks recorded");

    // Maintenance issues tracked and not overdue (2pts)
    const overdueMaintenance = maintenanceLogs.filter(m => {
      return m.target_completion_date && new Date(m.target_completion_date) < new Date() && m.status !== "completed";
    }).length;
    if (overdueMaintenance === 0) homeScore += 2;
    else issues.push(`Maintenance: ${overdueMaintenance} items overdue`);

    // Sleep checks completed where applicable (1pt)
    const sleepThisMonth = sleepChecks.filter(s => new Date(s.date) >= lastMonth && s.status === "completed").length;
    if (sleepThisMonth > 0) homeScore += 1;

    total += homeScore;

    // 6. COMPLAINTS, VOICE & CONSULTATION — 10 pts
    let complaintScore = 0;
    const complaints = data?.complaints || [];

    // No complaints overdue beyond policy timescale (4pts)
    const overdueComplaints = complaints.filter(c => {
      const target = new Date(c.received_datetime);
      target.setDate(target.getDate() + 28);
      return target < new Date() && c.status !== "closed";
    }).length;
    if (overdueComplaints === 0) complaintScore += 4;
    else issues.push(`Complaints: ${overdueComplaints} overdue (28-day limit)`);

    // Child's views recorded (2pts)
    const withChildViews = complaints.filter(c => c.complainant_type === "resident" || c.resident_informed).length;
    if (withChildViews > 0 || complaints.length === 0) complaintScore += 2;

    // Family/professional feedback recorded (2pts)
    const withFamilyViews = complaints.filter(c => c.complainant_type === "parent" || c.complainant_type === "family_member" || c.complainant_type === "social_worker").length;
    if (withFamilyViews > 0 || complaints.length === 0) complaintScore += 2;

    // Complaints outcomes and learning recorded (2pts)
    const withOutcomes = complaints.filter(c => c.investigation_outcome || c.lessons_learned).length;
    if (withOutcomes === complaints.length && complaints.length > 0) complaintScore += 2;
    else if (complaints.length > 0) issues.push("Complaints: Some outcomes/learning not recorded");

    total += complaintScore;

    // 7. HEALTH, EDUCATION & WELLBEING — 10 pts
    let wellScore = 0;
    const appointments = data?.dashboardAppointments || [];
    const healthObservations = data?.healthObservations || [];

    // Health appointments tracked (2pts)
    if (appointments.filter(a => a.type?.includes("health") || a.type?.includes("medical")).length > 0) wellScore += 2;

    // Medication records complete (2pts)
    const medRecords = data?.medicationRecords || [];
    if (medRecords.length > 0 || activeResidents.filter(r => data?.medicationRecords?.find(m => m.resident_id === r.id)).length > 0) wellScore += 2;

    // Education attendance/progress recorded (2pts)
    const eduData = activeResidents.filter(r => r.education_provider && r.education_provider.length > 0).length;
    if (eduData > 0) wellScore += 2;

    // Leisure/wellbeing activities recorded (2pts)
    const withLeisure = activeResidents.filter(r => r.leisure_interests || r.leisure_football_enrolled || r.leisure_gym_enrolled).length;
    if (withLeisure > 0) wellScore += 2;

    // Actions followed up (2pts)
    if (appointments.length > 0 && appointments.some(a => a.outcome_notes)) wellScore += 2;

    total += wellScore;

    // 8. RECORD QUALITY & AUDIT TRAIL — 5 pts
    let recordScore = 0;
    const dailyLogs = data?.dailyLogs || [];
    const today = new Date().toISOString().split("T")[0];
    
    // Daily logs up to date (2pts)
    const logsRecent = dailyLogs.filter(l => l.date === today || l.date === new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]).length;
    if (logsRecent > 0) recordScore += 2;
    else issues.push("Records: No daily logs from last 2 days");

    // Reports signed/reviewed where required (1pt)
    const signed = dailyLogs.filter(l => l.acknowledged_by || l.reviewed_by).length;
    if (signed > dailyLogs.length * 0.8) recordScore += 1;

    // No missing mandatory fields (1pt)
    const complete = dailyLogs.filter(l => l.resident_id && l.home_id && l.date).length;
    if (complete === dailyLogs.length) recordScore += 1;

    // Audit trail complete (1pt)
    if (dailyLogs.some(l => l.created_date && l.updated_date)) recordScore += 1;

    total += recordScore;

    return { score: total, issues };
  }, [data, residents, staff]);

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