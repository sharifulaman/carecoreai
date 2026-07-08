import { useState, useMemo } from "react";
import {
  X, ChevronRight, ChevronDown,
  ClipboardList, Heart, BookOpen, Star, Activity,
  Users, Shield, Building2, FileCheck,
  CheckCircle2, AlertTriangle, XCircle, ArrowRight
} from "lucide-react";

// ─── Standard definitions ─────────────────────────────────────────────────────

const STANDARDS = [
  {
    num: 1, name: "Quality & purpose of care", icon: ClipboardList,
    items: [
      { key: "care_plan_review",      label: "Care plan reviewed within timescale",  redIfCount: true },
      { key: "placement_plan_exists", label: "Placement plan in place for all residents", redIfCount: true },
      { key: "statement_of_purpose",  label: "Statement of Purpose on file",         amberIfCount: true },
      { key: "home_type_configured",  label: "Home type configured",                 greenOnly: true },
    ],
  },
  {
    num: 2, name: "Children's wishes & feelings", icon: Users,
    items: [
      { key: "complaints",            label: "Open complaints",                      redIfCount: true },
      { key: "advocacy",              label: "Advocacy not offered",                 redIfCount: true },
      { key: "yp_views_incomplete",   label: "YP views records incomplete",          amberIfCount: true },
      { key: "welcome_pack",          label: "Welcome pack issued",                  greenOnly: true },
      { key: "complaints_28days",     label: "Complaints responded within 28 days",  amberIfCount: true },
    ],
  },
  {
    num: 3, name: "Education", icon: BookOpen,
    items: [
      { key: "eet_not_recorded",      label: "EET status not recorded",              redIfCount: true },
      { key: "neet_no_action",        label: "NEET — no action plan",                redIfCount: true },
      { key: "edu_placement",         label: "Education placement confirmed",        greenOnly: true },
      { key: "school_attendance",     label: "School attendance tracked",            greenOnly: true },
    ],
  },
  {
    num: 4, name: "Enjoyment & achievement", icon: Star,
    items: [
      { key: "achievements",          label: "No achievements logged this month",    amberIfZero: true },
      { key: "cic_notes_overdue",     label: "CIC progress notes overdue",           redIfCount: true },
      { key: "ils_sessions",          label: "ILS sessions completed",               greenOnly: true },
      { key: "leisure_recorded",      label: "Leisure activities recorded",          greenOnly: true },
    ],
  },
  {
    num: 5, name: "Health & wellbeing", icon: Heart,
    items: [
      { key: "health_assessments",    label: "Health assessments outstanding",       redIfCount: true },
      { key: "dental_overdue",        label: "Dental appointment overdue",           amberIfCount: true },
      { key: "medication_reviews",    label: "Medication reviews overdue",           redIfCount: true },
      { key: "mar_uptodate",          label: "MAR sheet up to date",                 greenOnly: true },
      { key: "gp_registered",         label: "GP registration confirmed",            greenOnly: true },
      { key: "wellbeing_checkins",    label: "Emotional wellbeing check-ins",        greenOnly: true },
    ],
  },
  {
    num: 6, name: "Positive relationships", icon: Users,
    items: [
      { key: "family_contact_30days", label: "No family contact > 30 days",         redIfCount: true },
      { key: "therapeutic_plan",      label: "Therapeutic plan outstanding",         amberIfCount: true },
      { key: "family_contact_plan",   label: "Family contact plan in place",         greenOnly: true },
      { key: "key_worker_sessions",   label: "Key worker sessions this month",       greenOnly: true },
    ],
  },
  {
    num: 7, name: "Protection of children", icon: Shield,
    items: [
      { key: "mfh",                   label: "Active MFH episodes",                  redIfCount: true },
      { key: "return_interviews",     label: "Return interviews overdue",            redIfCount: true },
      { key: "risk_assessment_review",label: "Risk assessment overdue review",       redIfCount: true },
      { key: "body_map",              label: "Body map outstanding",                 amberIfCount: true },
      { key: "exploitation_risk",     label: "High exploitation risk",               redIfCount: true },
      { key: "safeguarding_uptodate", label: "Safeguarding records up to date",      greenOnly: true },
    ],
  },
  {
    num: 8, name: "Leadership & management", icon: Building2,
    items: [
      { key: "reg44_overdue",         label: "Reg 44 overdue",                       redIfCount: true },
      { key: "dbs_expiring",          label: "DBS expiring within 30 days",          amberIfCount: true },
      { key: "training_overdue",      label: "Staff training overdue",               redIfCount: true },
      { key: "supervisions",          label: "Supervisions overdue",                 redIfCount: true },
      { key: "reg45_overdue",         label: "Reg 45 within 6 months",               amberIfCount: true },
      { key: "ofsted_notifications",  label: "Ofsted notifications submitted",       greenOnly: true },
    ],
  },
  {
    num: 9, name: "Care planning", icon: FileCheck,
    items: [
      { key: "pathway_plans",         label: "Pathway plan missing (16+ residents)", redIfCount: true },
      { key: "placement_plans",       label: "Placement plan review overdue",        redIfCount: true },
      { key: "support_plan_unsigned", label: "Support plan unsigned",                amberIfCount: true },
      { key: "lac_review",            label: "LAC review completed",                 greenOnly: true },
      { key: "transition_active",     label: "Transition plan active",               greenOnly: true },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

// Given item config + count: returns status  "green" | "amber" | "red"
function itemStatus(itemCfg, count) {
  if (itemCfg.greenOnly) return "green";
  if (itemCfg.amberIfZero) return count > 0 ? "green" : "amber";
  if (itemCfg.amberIfCount) return count === 0 ? "green" : "amber";
  if (itemCfg.redIfCount) return count === 0 ? "green" : "red";
  return "green";
}

function statusBg(status) {
  if (status === "red") return "bg-red-500/15 text-red-600 border-red-500/30";
  if (status === "amber") return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  return "bg-green-500/15 text-green-600 border-green-500/30";
}

function StatusIcon({ status, size = 4 }) {
  const cls = `w-${size} h-${size}`;
  if (status === "red") return <XCircle className={`${cls} text-red-500`} />;
  if (status === "amber") return <AlertTriangle className={`${cls} text-amber-500`} />;
  return <CheckCircle2 className={`${cls} text-green-500`} />;
}

function progressColor(pct) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function progressTextColor(pct) {
  if (pct >= 80) return "text-green-500";
  if (pct >= 50) return "text-amber-500";
  return "text-red-500";
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ItemModal({ title, items, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{items.length} record{items.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All clear — no issues found.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={item.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {item.initials || (item.name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name || "—"}</p>
                    {item.detail && <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>}
                  </div>
                  {item.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${item.badgeClass || "bg-slate-100 text-slate-600"}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Standard accordion card ──────────────────────────────────────────────────

function StandardCard({ standard, counts, lists }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);

  const Icon = standard.icon;

  // Compute per-item statuses
  const itemStatuses = standard.items.map(item => ({
    item,
    count: counts[item.key] ?? 0,
    status: itemStatus(item, counts[item.key] ?? 0),
    list: lists[item.key] || [],
  }));

  const compliantCount = itemStatuses.filter(i => i.status === "green").length;
  const total = itemStatuses.length;
  const pct = Math.round((compliantCount / total) * 100);
  const pctColor = progressColor(pct);
  const pctText = progressTextColor(pct);

  const handleItemClick = (entry) => {
    if (entry.status === "green") return; // green = no modal
    setModal({ title: entry.item.label, items: entry.list });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Standard {standard.num}</p>
          <p className="text-sm font-semibold leading-tight">{standard.name}</p>
        </div>
        {/* Progress bar + percentage */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
            <div className={`h-full rounded-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-sm font-bold w-10 text-right ${pctText}`}>{pct}%</span>
        </div>
      </button>

      {/* Sub-items */}
      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {itemStatuses.map(({ item, count, status, list }) => {
            const clickable = status !== "green";
            return (
              <button
                key={item.key}
                onClick={() => handleItemClick({ item, count, status, list })}
                disabled={!clickable}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${clickable ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"}`}
              >
                {/* Status icon box */}
                <div className={`w-6 h-6 rounded flex items-center justify-center border shrink-0 ${statusBg(status)}`}>
                  <StatusIcon status={status} size={3} />
                </div>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {/* Count badge + arrow — only for non-green */}
                {clickable && count > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded border ${statusBg(status)}`}>
                      {count}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-item modal */}
      {modal && (
        <ItemModal title={modal.title} items={modal.items} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ComplianceIndicators({ residents, homes, staff, data }) {

  const { counts, lists } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const thirtyFiveDaysAgo = new Date(); thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
    const sixWeeksAgo = new Date(); sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysFromNow = new Date(); thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const sixMonthsFromNow = new Date(); sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const activeResidents = (residents || []).filter(r => r.status === "active");
    const activeHomes = (homes || []).filter(h => h.status === "active");
    const homeIds = [...new Set(activeResidents.map(r => r.home_id).filter(Boolean))];
    const getHome = (hid) => (homes || []).find(h => h.id === hid);
    const getResident = (rid) => activeResidents.find(r => r.id === rid);

    // ── Standard 1 ──────────────────────────────────────────────────────────
    // care_plan_review: residents with no CarePlan or CarePlan.review_date overdue
    const carePlanOverdue = activeResidents.filter(r => {
      const plan = (data?.carePlans || []).find(p => p.resident_id === r.id);
      if (!plan) return true;
      return plan.review_date && plan.review_date < todayStr;
    });
    // placement_plan_exists: residents with no PlacementDetails
    const noPlacementPlan = activeResidents.filter(r =>
      !(data?.placementPlans || []).find(p => p.resident_id === r.id)
    );

    // ── Standard 2 ──────────────────────────────────────────────────────────
    const openComplaints = (data?.complaints || []).filter(c => c.status === "open");
    const advocacyMissing = activeResidents.filter(r =>
      !(data?.advocacyRecords || []).find(a => a.resident_id === r.id && a.advocate_requested)
    );
    // yp_views_incomplete: residents with no YPViewsRecord
    const ypViewsMissing = activeResidents.filter(r =>
      !(data?.ypViews || []).find(v => v.resident_id === r.id)
    );
    // complaints_28days: open complaints older than 28 days
    const complaints28 = openComplaints.filter(c => {
      const received = new Date(c.received_datetime || c.created_date);
      return (Date.now() - received.getTime()) > 28 * 24 * 60 * 60 * 1000;
    });

    // ── Standard 3 ──────────────────────────────────────────────────────────
    const eetNotRecorded = activeResidents.filter(r =>
      !(data?.eetRecords || []).find(e => e.resident_id === r.id && e.is_current)
    );
    const neetNoAction = activeResidents.filter(r => {
      const eet = (data?.eetRecords || []).find(e => e.resident_id === r.id && e.is_current);
      return eet && eet.status === "neet" && !eet.action_plan;
    });

    // ── Standard 4 ──────────────────────────────────────────────────────────
    const thisMonthAchievements = (data?.achievements || []).filter(a => {
      const d = new Date(a.created_date || a.achievement_date);
      return d >= monthStart;
    });
    // cic_notes_overdue: CICReport where next_review_date < today
    const cicOverdue = (data?.cicReports || []).filter(c =>
      c.next_review_date && c.next_review_date < todayStr
    );

    // ── Standard 5 ──────────────────────────────────────────────────────────
    const healthOutstanding = activeResidents.filter(r => {
      return !(data?.gpAppointments || []).find(a =>
        a.resident_id === r.id && new Date(a.appointment_date || a.created_date) >= sixMonthsAgo
      );
    });
    // dental_overdue: resident.dentist_last_appointment > 6 months ago or null
    const dentalOverdue = activeResidents.filter(r =>
      !r.dentist_last_appointment || new Date(r.dentist_last_appointment) < sixMonthsAgo
    );
    const medOverdueRecs = (data?.medicationRecords || []).filter(m =>
      m.status === "active" && m.review_date && m.review_date < todayStr
    );
    const medOverdueResidentIds = [...new Set(medOverdueRecs.map(m => m.resident_id))];

    // ── Standard 6 ──────────────────────────────────────────────────────────
    const noFamilyContact = activeResidents.filter(r => {
      const contacts = (data?.familyContacts || []).filter(f => f.resident_id === r.id);
      if (contacts.length === 0) return true;
      const latest = contacts.sort((a, b) => new Date(b.contact_date || b.created_date) - new Date(a.contact_date || a.created_date))[0];
      return new Date(latest.contact_date || latest.created_date) < thirtyDaysAgo;
    });
    const therapeuticMissing = activeResidents.filter(r =>
      !(data?.therapeuticPlans || []).find(t => t.resident_id === r.id)
    );

    // ── Standard 7 ──────────────────────────────────────────────────────────
    const activeMFH = (data?.mfhRecords || []).filter(m => m.status === "active");
    const overdueInterviews = (data?.mfhRecords || []).filter(m =>
      m.status !== "active" && m.return_interview_completed === false
    );
    // risk_assessment_review: residents with a RiskAssessment where review_date < today
    const riskReviewOverdue = activeResidents.filter(r => {
      const assessments = (data?.riskAssessments || []).filter(a => a.resident_id === r.id);
      if (assessments.length === 0) return true;
      return assessments.some(a => a.review_date && a.review_date < todayStr);
    });
    const highExploitation = (data?.exploitationRisks || []).filter(e =>
      ["high", "critical"].includes(e.overall_risk_level || e.risk_level)
    );

    // ── Standard 8 ──────────────────────────────────────────────────────────
    const overdueReg44Homes = activeHomes.filter(h => {
      return !(data?.reg44Reports || []).find(r =>
        r.home_id === h.id && new Date(r.visit_date || r.created_date) >= thirtyFiveDaysAgo
      );
    });
    // dbs_expiring: staff with dbs_expiry_date within 30 days
    const dbsExpiring = (staff || []).filter(s =>
      s.dbs_expiry_date && new Date(s.dbs_expiry_date) <= thirtyDaysFromNow && new Date(s.dbs_expiry_date) >= today
    );
    // training_overdue: staff with any TrainingRecord where expiry_date < today
    const trainingOverdueStaff = (staff || []).filter(s => {
      const recs = (data?.trainingRecords || []).filter(r => r.staff_id === s.id);
      return recs.some(r => r.expiry_date && r.expiry_date < todayStr);
    });
    const staffInHomes = (staff || []).filter(s => homeIds.includes(s.home_id) || s.role === "support_worker" || s.role === "team_leader");
    const overdueSupervisionStaff = staffInHomes.filter(s => {
      const recs = (data?.supervisionRecords || []).filter(r => r.staff_id === s.id);
      if (recs.length === 0) return true;
      const latest = recs.sort((a, b) => new Date(b.supervision_date || b.created_date) - new Date(a.supervision_date || a.created_date))[0];
      return latest.next_supervision_date && latest.next_supervision_date < todayStr;
    });
    // reg45: homes with no Reg45Review in last 6 months
    const reg45Overdue = activeHomes.filter(h =>
      !(data?.reg45Reviews || []).find(r => r.home_id === h.id && new Date(r.review_date || r.created_date) >= sixMonthsAgo)
    );

    // ── Standard 9 ──────────────────────────────────────────────────────────
    const missingPathway = activeResidents.filter(r => {
      const age = calcAge(r.dob);
      if (!age || age < 16) return false;
      return !(data?.pathwayPlans || []).find(p => p.resident_id === r.id && p.status === "active");
    });
    const overduePlacement = activeResidents.filter(r => {
      const plan = (data?.placementPlans || []).find(p => p.resident_id === r.id);
      if (!plan) return true;
      return plan.review_date && plan.review_date < todayStr;
    });
    // support_plan_unsigned: support plans without a SupportPlanSignoff
    const unsignedSupportPlans = activeResidents.filter(r =>
      !(data?.supportPlanSignoffs || []).find(s => s.resident_id === r.id)
    );
    // lac_review: residents with no LAReview in last 6 months
    const lacMissing = activeResidents.filter(r =>
      !(data?.laReviews || []).find(l => l.resident_id === r.id && new Date(l.review_date || l.created_date) >= sixMonthsAgo)
    );

    // Helper to build a resident row
    const resRow = (r, detail, badge = "Issue", badgeClass = "bg-red-100 text-red-700") => ({
      id: r.id, name: r.display_name, initials: r.initials || r.display_name?.charAt(0),
      detail, badge, badgeClass,
    });
    const homeRow = (h, detail) => ({
      id: h.id, name: h.name, initials: h.name?.charAt(0) || "H",
      detail, badge: "Overdue", badgeClass: "bg-red-100 text-red-700",
    });
    const staffRow = (s, detail, badge = "Overdue") => ({
      id: s.id, name: s.full_name || "Staff", initials: (s.full_name || "S").charAt(0),
      detail, badge, badgeClass: "bg-red-100 text-red-700",
    });

    return {
      counts: {
        // Std 1
        care_plan_review:       carePlanOverdue.length,
        placement_plan_exists:  noPlacementPlan.length,
        statement_of_purpose:   0,
        home_type_configured:   0,
        // Std 2
        complaints:             openComplaints.length,
        advocacy:               advocacyMissing.length,
        yp_views_incomplete:    ypViewsMissing.length,
        welcome_pack:           0,
        complaints_28days:      complaints28.length,
        // Std 3
        eet_not_recorded:       eetNotRecorded.length,
        neet_no_action:         neetNoAction.length,
        edu_placement:          0,
        school_attendance:      0,
        // Std 4
        achievements:           thisMonthAchievements.length,
        cic_notes_overdue:      cicOverdue.length,
        ils_sessions:           0,
        leisure_recorded:       0,
        // Std 5
        health_assessments:     healthOutstanding.length,
        dental_overdue:         dentalOverdue.length,
        medication_reviews:     medOverdueResidentIds.length,
        mar_uptodate:           0,
        gp_registered:          0,
        wellbeing_checkins:     0,
        // Std 6
        family_contact_30days:  noFamilyContact.length,
        therapeutic_plan:       therapeuticMissing.length,
        family_contact_plan:    0,
        key_worker_sessions:    0,
        // Std 7
        mfh:                    activeMFH.length,
        return_interviews:      overdueInterviews.length,
        risk_assessment_review: riskReviewOverdue.length,
        body_map:               0,
        exploitation_risk:      highExploitation.length,
        safeguarding_uptodate:  0,
        // Std 8
        reg44_overdue:          overdueReg44Homes.length,
        dbs_expiring:           dbsExpiring.length,
        training_overdue:       trainingOverdueStaff.length,
        supervisions:           overdueSupervisionStaff.length,
        reg45_overdue:          reg45Overdue.length,
        ofsted_notifications:   0,
        // Std 9
        pathway_plans:          missingPathway.length,
        placement_plans:        overduePlacement.length,
        support_plan_unsigned:  unsignedSupportPlans.length,
        lac_review:             lacMissing.length,
        transition_active:      0,
      },
      lists: {
        care_plan_review:       carePlanOverdue.map(r => resRow(r, "Care plan overdue or missing")),
        placement_plan_exists:  noPlacementPlan.map(r => resRow(r, "No placement plan on record")),
        complaints:             openComplaints.map(c => ({ id: c.id, name: c.resident_name || c.complainant_name || "Unknown", initials: (c.resident_name || "?").charAt(0), detail: c.description || c.summary, badge: "Open", badgeClass: "bg-red-100 text-red-700" })),
        advocacy:               advocacyMissing.map(r => resRow(r, "No advocacy offer recorded", "Missing", "bg-amber-100 text-amber-700")),
        yp_views_incomplete:    ypViewsMissing.map(r => resRow(r, "No YP views record found", "Missing", "bg-amber-100 text-amber-700")),
        complaints_28days:      complaints28.map(c => ({ id: c.id, name: c.resident_name || c.complainant_name || "Unknown", initials: (c.resident_name || "?").charAt(0), detail: "Complaint not responded within 28 days", badge: "Overdue", badgeClass: "bg-amber-100 text-amber-700" })),
        eet_not_recorded:       eetNotRecorded.map(r => resRow(r, "No current EET status recorded")),
        neet_no_action:         neetNoAction.map(r => resRow(r, "NEET with no action plan")),
        achievements:           thisMonthAchievements.map(a => ({ id: a.id, name: a.resident_name || "Unknown", initials: (a.resident_name || "?").charAt(0), detail: a.title || a.description, badge: "This month", badgeClass: "bg-green-100 text-green-700" })),
        cic_notes_overdue:      cicOverdue.map(c => ({ id: c.id, name: c.resident_name || "Unknown", initials: (c.resident_name || "?").charAt(0), detail: `Review due: ${c.next_review_date}`, badge: "Overdue", badgeClass: "bg-red-100 text-red-700" })),
        health_assessments:     healthOutstanding.map(r => resRow(r, "No GP appointment in last 6 months", "Outstanding", "bg-amber-100 text-amber-700")),
        dental_overdue:         dentalOverdue.map(r => resRow(r, `Last dental: ${r.dentist_last_appointment || "never"}`, "Overdue", "bg-amber-100 text-amber-700")),
        medication_reviews:     medOverdueResidentIds.map(rid => { const r = getResident(rid); const rec = medOverdueRecs.find(m => m.resident_id === rid); return { id: rid, name: r?.display_name || rec?.resident_name || "Unknown", initials: (r?.display_name || "?").charAt(0), detail: `Review due: ${rec?.review_date}`, badge: "Overdue", badgeClass: "bg-red-100 text-red-700" }; }),
        family_contact_30days:  noFamilyContact.map(r => resRow(r, "No family contact in last 30 days")),
        therapeutic_plan:       therapeuticMissing.map(r => resRow(r, "No therapeutic plan on record", "Missing", "bg-amber-100 text-amber-700")),
        mfh:                    activeMFH.map(m => ({ id: m.id, name: m.resident_name || "Unknown", initials: (m.resident_name || "?").charAt(0), detail: `Reported: ${m.reported_missing_datetime ? new Date(m.reported_missing_datetime).toLocaleDateString("en-GB") : "—"}`, badge: "Active", badgeClass: "bg-red-100 text-red-700" })),
        return_interviews:      overdueInterviews.map(m => ({ id: m.id, name: m.resident_name || "Unknown", initials: (m.resident_name || "?").charAt(0), detail: "Return interview not completed", badge: "Overdue", badgeClass: "bg-red-100 text-red-700" })),
        risk_assessment_review: riskReviewOverdue.map(r => resRow(r, "Risk assessment review overdue")),
        exploitation_risk:      highExploitation.map(e => ({ id: e.id, name: e.resident_name || "Unknown", initials: (e.resident_name || "?").charAt(0), detail: `Risk: ${e.overall_risk_level || e.risk_level}`, badge: e.overall_risk_level || e.risk_level, badgeClass: "bg-red-100 text-red-700" })),
        reg44_overdue:          overdueReg44Homes.map(h => homeRow(h, "No Reg 44 visit in last 35 days")),
        dbs_expiring:           dbsExpiring.map(s => staffRow(s, `DBS expires: ${s.dbs_expiry_date}`, "Expiring")),
        training_overdue:       trainingOverdueStaff.map(s => staffRow(s, "Has overdue training records")),
        supervisions:           overdueSupervisionStaff.map(s => staffRow(s, "Supervision overdue or never recorded")),
        reg45_overdue:          reg45Overdue.map(h => homeRow(h, "No Reg 45 review in last 6 months")),
        pathway_plans:          missingPathway.map(r => resRow(r, `Age ${calcAge(r.dob)} — no active pathway plan`)),
        placement_plans:        overduePlacement.map(r => resRow(r, "Placement plan missing or overdue")),
        support_plan_unsigned:  unsignedSupportPlans.map(r => resRow(r, "No support plan sign-off recorded", "Unsigned", "bg-amber-100 text-amber-700")),
        lac_review:             lacMissing.map(r => resRow(r, "No LAC review in last 6 months")),
      },
    };
  }, [residents, homes, staff, data]);

  // Split into 2 columns (left: standards 1-5, right: 6-9 gives unequal — use zigzag instead)
  const leftStandards = STANDARDS.filter((_, i) => i % 2 === 0);
  const rightStandards = STANDARDS.filter((_, i) => i % 2 === 1);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Compliance Health Check as per Regulations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-3">
          {leftStandards.map(std => (
            <StandardCard key={std.num} standard={std} counts={counts} lists={lists} />
          ))}
        </div>
        <div className="space-y-3">
          {rightStandards.map(std => (
            <StandardCard key={std.num} standard={std} counts={counts} lists={lists} />
          ))}
        </div>
      </div>
    </div>
  );
}