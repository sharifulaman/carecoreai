import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import EducationModal from "../education/EducationModal";
import { STATUS_OPTIONS, STATUS_COLOURS } from "../education/EducationModal";

const todayStr = new Date().toISOString().split("T")[0];
const todayLabel = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function daysAgoLabel(dateStr) {
  if (!dateStr) return null;
  const days = daysBetween(dateStr, todayStr);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function daysAgoColor(dateStr) {
  if (!dateStr) return "text-red-600";
  const days = daysBetween(dateStr, todayStr);
  if (days <= 1) return "text-green-600";
  if (days <= 7) return "text-amber-600";
  return "text-red-600";
}

function SectionHeader({ label }) {
  return (
    <div className="bg-muted/40 px-4 py-1.5 border-y border-border">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Cell({ label, children }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide" style={{ fontSize: "10px" }}>{label}</p>
      <div className="text-xs font-medium" style={{ fontSize: "12px" }}>{children}</div>
    </div>
  );
}

function GreenVal({ children }) { return <span className="text-green-700">{children}</span>; }
function AmberVal({ children }) { return <span className="text-amber-700">{children}</span>; }
function RedVal({ children }) { return <span className="text-red-600">{children}</span>; }
function MutedVal({ children }) { return <span className="text-muted-foreground">{children}</span>; }

function ProgressBar({ label, value, color }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-muted-foreground" style={{ fontSize: "10px" }}>{label}</p>
        <p className="text-muted-foreground" style={{ fontSize: "10px" }}>{value === null ? "—" : `${pct}%`}</p>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function TimelineItem({ bar, title, sub, badge, badgeColor }) {
  const badgeStyles = {
    green: { bg: "#EAF3DE", text: "#3B6D11" },
    red: { bg: "#FCEBEB", text: "#A32D2D" },
    amber: { bg: "#FAEEDA", text: "#854F0B" },
    blue: { bg: "#E6F1FB", text: "#185FA5" },
  };
  const bs = badgeStyles[badgeColor] || badgeStyles.blue;
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-0.5 rounded-full mt-1 self-stretch min-h-[32px] shrink-0" style={{ background: bar }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight">{title}</p>
        {sub && <p className="text-muted-foreground mt-0.5" style={{ fontSize: "11px" }}>{sub}</p>}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: bs.bg, color: bs.text }}>{badge}</span>
      )}
    </div>
  );
}

export default function YPCardExpanded({
  resident, home, keyWorker, dailyLogs, visitReports, supportPlans, ilsPlans, transitions,
  onNavigateSP, onNavigateILS, isAdminOrTL, staff, onAddDailyLog, onViewSupportPlan, onViewILSPlan
}) {
  const navigate = useNavigate();
  const [showMoreSummary, setShowMoreSummary] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);

  // Lazy-load expanded data
  const { data: medRecords = [] } = useQuery({
    queryKey: ["med-records", resident.id],
    queryFn: () => base44.entities.MedicationRecord.filter({ org_id: ORG_ID, resident_id: resident.id, status: "active" }),
  });

  const { data: marEntries = [] } = useQuery({
    queryKey: ["mar-entries-today", resident.id],
    queryFn: () => base44.entities.MAREntry.filter({ org_id: ORG_ID, resident_id: resident.id }),
  });

  const { data: ilsSections = [] } = useQuery({
    queryKey: ["ils-sections", resident.id],
    queryFn: () => base44.entities.ILSPlanSection.filter({ org_id: ORG_ID, resident_id: resident.id }),
  });

  const { data: residentAccidents = [] } = useQuery({
    queryKey: ["accidents-today", resident.id],
    queryFn: () => base44.entities.AccidentReport.filter({ org_id: ORG_ID, resident_id: resident.id }),
  });

  const { data: residentTasks = [] } = useQuery({
    queryKey: ["tasks-resident", resident.id],
    queryFn: () => base44.entities.HomeTask.filter({ org_id: ORG_ID, resident_id: resident.id }),
  });

  // Derived data
  // Find today's general log (for daily summary / timeline)
  const todayLog = dailyLogs.find(l => l.date === todayStr && (!l.flags || l.flags.length === 0 || l.flags.includes("general")));
  const todayVisit = visitReports.find(v => v.date === todayStr);
  const lastVisit = [...visitReports].sort((a, b) => b.date?.localeCompare(a.date))[0];
  const activeSP = supportPlans.find(p => p.status === "active");
  const activeILS = ilsPlans.find(p => p.status === "active");
  const activeTransition = transitions.find(t => t.status === "active");

  // Flag helpers — each flag type is stored as its own DailyLog record with flags: ["flag_name"]
  const getFlagLog = (flagName) =>
    dailyLogs.find(l => l.date === todayStr && Array.isArray(l.flags) && l.flags.includes(flagName)) || null;

  const currentStatusLog = getFlagLog("current_status");
  const nightStayLog = getFlagLog("night_stay");
  const mealIntakeLog = getFlagLog("meal_intake");
  const eduLog = getFlagLog("edu_attendance");

  // Convenience booleans / values read from content
  const currentStatusFlag = currentStatusLog ? { value: currentStatusLog.content?.status } : null;
  const nightStayFlag = nightStayLog ? { value: nightStayLog.content?.night_stay_status } : null;
  const mealIntakeFlag = mealIntakeLog ? { value: mealIntakeLog.content?.consumed } : null;
  const eduFlag = eduLog ? { value: eduLog.content?.edu_attendance_status } : null;

  // MAR status
  const todayMarEntries = marEntries.filter(m => {
    const d = m.scheduled_datetime?.split("T")[0];
    return d === todayStr;
  });
  const goodOutcomes = ["administered", "self_administered", "prompted_and_taken"];
  let marStatus = "no_medication";
  if (medRecords.length > 0) {
    if (todayMarEntries.length === 0) {
      marStatus = "no_doses_today";
    } else if (todayMarEntries.every(m => goodOutcomes.includes(m.outcome))) {
      marStatus = "administered";
    } else if (todayMarEntries.some(m => !m.outcome || m.outcome === "")) {
      marStatus = "overdue";
    } else {
      marStatus = "partial";
    }
  }

  // Support plan progress
  const spFields = ["goals", "needs", "strengths", "risks", "interventions", "actions"];
  const spProgress = activeSP
    ? Math.round((spFields.filter(f => activeSP[f]?.trim()).length / spFields.length) * 100)
    : 0;

  // ILS progress
  const activeILSSections = ilsSections.filter(s => s.ils_plan_id === activeILS?.id);
  const ilsProgress = activeILSSections.length > 0
    ? Math.round(activeILSSections.reduce((sum, s) => sum + (s.progress_percentage || 0), 0) / activeILSSections.length)
    : 0;

  // Pathway progress
  let pathwayProgress = 0;
  if (resident.placement_start && activeTransition?.planned_date) {
    const elapsed = daysBetween(resident.placement_start, todayStr);
    const total = daysBetween(resident.placement_start, activeTransition.planned_date);
    if (total > 0) pathwayProgress = Math.round(Math.min(100, (elapsed / total) * 100));
  }

  // Risk management proxy
  const riskMap = { critical: 25, high: 50, medium: 75, low: 100 };
  const riskProgress = riskMap[resident.risk_level] || 0;

  // Timeline items
  const timelineItems = [];

  if (todayLog) {
    timelineItems.push({
      bar: "#185FA5", title: `Daily log submitted — ${todayLog.shift || ""} shift`,
      sub: `by ${staff?.find(s => s.id === todayLog.worker_id)?.full_name || "staff"}`,
      badge: "Submitted", badgeColor: "blue",
      time: todayLog.created_date || todayLog.date + "T00:00",
    });
    if (todayLog.flagged && !todayLog.acknowledged_by) {
      timelineItems.push({
        bar: "#E24B4A", title: `Flagged log — ${todayLog.flag_severity || "unknown severity"}`,
        sub: "Unacknowledged",
        badge: "Flagged", badgeColor: "red",
        time: todayLog.created_date || todayLog.date + "T00:01",
      });
    }
  }
  if (todayVisit) {
    timelineItems.push({
      bar: "#639922", title: "Face-to-face visit completed",
      sub: `by ${staff?.find(s => s.id === todayVisit.worker_id)?.full_name || "staff"}`,
      badge: "Complete", badgeColor: "green",
      time: todayVisit.created_date || todayVisit.date + "T00:00",
    });
  }
  todayMarEntries.forEach(m => {
    const medName = medRecords.find(r => r.id === m.medication_record_id)?.medication_name || "medication";
    if (goodOutcomes.includes(m.outcome)) {
      timelineItems.push({ bar: "#639922", title: `MAR — ${medName} administered`, badge: "Complete", badgeColor: "green", time: m.administered_datetime || m.scheduled_datetime });
    } else if (m.outcome === "refused") {
      timelineItems.push({ bar: "#E24B4A", title: `MAR — ${medName} refused`, badge: "Refused", badgeColor: "red", time: m.scheduled_datetime });
    } else if (m.outcome === "omitted") {
      timelineItems.push({ bar: "#EF9F27", title: `MAR — ${medName} omitted`, badge: "Omitted", badgeColor: "amber", time: m.scheduled_datetime });
    }
  });
  residentAccidents.filter(a => a.date === todayStr).forEach(a => {
    timelineItems.push({ bar: "#E24B4A", title: `Incident — ${a.type?.replace(/_/g, " ") || "incident"}`, badge: "Open", badgeColor: "red", time: a.date });
  });
  residentTasks.filter(t => t.due_date === todayStr && t.status === "completed").forEach(t => {
    timelineItems.push({ bar: "#639922", title: t.title, badge: "Complete", badgeColor: "green", time: t.due_date });
  });
  if (nightStayFlag) timelineItems.push({ bar: "#639922", title: `Night stay — ${nightStayFlag.value || "Confirmed"}`, badge: "Recorded", badgeColor: "green", time: todayStr });
  if (eduFlag) {
    if (eduFlag.value === "Attended") timelineItems.push({ bar: "#639922", title: "Education — present", badge: "Present", badgeColor: "green", time: todayStr });
    else if (eduFlag.value === "Not Attended") timelineItems.push({ bar: "#E24B4A", title: "Education — absent", badge: "Absent", badgeColor: "red", time: todayStr });
    else if (eduFlag.value) timelineItems.push({ bar: "#EF9F27", title: `Education — ${eduFlag.value}`, badge: eduFlag.value, badgeColor: "amber", time: todayStr });
  }

  timelineItems.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const visibleTimeline = showAllTimeline ? timelineItems : timelineItems.slice(0, 6);

  // Transition days
  const transitionDays = activeTransition?.planned_date ? daysBetween(todayStr, activeTransition.planned_date) : null;
  const transitionColor = transitionDays === null ? "text-muted-foreground"
    : transitionDays > 14 ? "text-green-600" : transitionDays >= 7 ? "text-amber-600" : "text-red-600";

  // Last activity
  const lastTask = [...residentTasks].filter(t => t.status === "completed")
    .sort((a, b) => (b.due_date || "").localeCompare(a.due_date || ""))[0];

  // Summary — content is an object, extract ai_summary or notes
  const summaryContent = todayLog?.ai_summary || (typeof todayLog?.content === "string" ? todayLog.content : (todayLog?.content?.notes || ""));
  const summaryLines = summaryContent ? summaryContent.split("\n") : [];
  const showSummaryToggle = summaryLines.length > 4;
  const displayedSummary = showMoreSummary ? summaryContent : summaryLines.slice(0, 4).join("\n");

  return (
    <div className="border-t border-border">
      {/* SECTION 1 — TODAY'S STATUS */}
      <SectionHeader label={`Today's status — ${todayLabel}`} />
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Cell label="Current Status">
          {currentStatusFlag
            ? currentStatusFlag.value === "Out"
              ? <RedVal>Out</RedVal>
              : currentStatusFlag.value === "N/A"
              ? <AmberVal>N/A</AmberVal>
              : <GreenVal>{currentStatusFlag.value || "In"}</GreenVal>
            : <AmberVal>Not marked</AmberVal>}
        </Cell>
        <Cell label="Face-to-face">
          {todayVisit
            ? <GreenVal>Completed {todayVisit.time_start ? `· ${todayVisit.time_start}` : ""}</GreenVal>
            : <MutedVal>Not recorded</MutedVal>}
        </Cell>
        <Cell label="Night Stay">
          {nightStayFlag
            ? nightStayFlag.value === "Stayed Out" ? <RedVal>Stayed Out</RedVal>
              : nightStayFlag.value === "N/A" ? <AmberVal>N/A</AmberVal>
              : <GreenVal>{nightStayFlag.value || "Confirmed ✓"}</GreenVal>
            : <AmberVal>Not marked</AmberVal>}
        </Cell>
        <Cell label="Meal Intake">
          {!mealIntakeFlag ? <AmberVal>Not marked</AmberVal>
            : <GreenVal>{mealIntakeFlag.value || "Recorded ✓"}</GreenVal>}
        </Cell>
        <Cell label="Education">
          {(() => {
            const status = resident.education_status || "unknown";
            const label = STATUS_OPTIONS.find(o => o.value === status)?.label || "Unknown";
            const colour = STATUS_COLOURS[status] || "bg-gray-100 text-gray-600";
            return (
              <button
                onClick={() => setShowEducationModal(true)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${colour} hover:opacity-80`}
              >
                {label} ✎
              </button>
            );
          })()}
        </Cell>
        <Cell label="Education Attendance">
          {!eduFlag ? <AmberVal>Not marked</AmberVal>
            : eduFlag.value === "Attended" ? <GreenVal>Present ✓</GreenVal>
            : eduFlag.value === "Not Attended" ? <RedVal>Absent</RedVal>
            : <AmberVal>{eduFlag.value}</AmberVal>}
        </Cell>
        <Cell label="MAR Today">
          {marStatus === "no_medication" || marStatus === "no_doses_today" ? <MutedVal>No medication</MutedVal>
            : marStatus === "administered" ? <GreenVal>Administered ✓</GreenVal>
            : marStatus === "overdue" ? <RedVal>Overdue</RedVal>
            : <AmberVal>Partial</AmberVal>}
        </Cell>
        <Cell label="Daily Log">
          {todayLog
            ? <GreenVal>Logged ✓ {todayLog.shift ? `· ${todayLog.shift}` : ""}</GreenVal>
            : <span className="text-amber-700 flex items-center gap-1 cursor-pointer hover:underline" onClick={() => onAddDailyLog?.(resident)}>
                <Plus className="w-3 h-3" /> Add Daily Log
              </span>}
        </Cell>
      </div>

      {/* SECTION 2 — DAILY SUMMARY */}
      <SectionHeader label="Daily summary and key worker" />
      <div className="px-4 py-3 flex gap-4">
        <div className="flex-1" style={{ flexBasis: "60%" }}>
          <p className="text-xs text-muted-foreground mb-1" style={{ fontSize: "10px" }}>DAILY SUMMARY — {todayLabel}</p>
          {summaryContent ? (
            <div>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap" style={{ fontSize: "12px" }}>
                {displayedSummary}
              </p>
              {showSummaryToggle && (
                <button className="text-xs text-primary mt-1 flex items-center gap-0.5" onClick={() => setShowMoreSummary(v => !v)}>
                  {showMoreSummary ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-amber-700 mb-1">No daily log submitted yet today.</p>
              <button onClick={() => onAddDailyLog?.(resident)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Add Daily Log
              </button>
            </div>
          )}
        </div>
        <div className="shrink-0" style={{ flexBasis: "40%" }}>
          <p className="text-xs text-muted-foreground mb-1" style={{ fontSize: "10px" }}>LAST KEY WORKER SESSION</p>
          {lastVisit ? (
            <div className="space-y-0.5">
              <p className={`text-xs font-medium ${daysAgoColor(lastVisit.date)}`}>{daysAgoLabel(lastVisit.date)}</p>
              <p className="text-xs text-muted-foreground">{new Date(lastVisit.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {lastVisit.time_start ? `· ${lastVisit.time_start}` : ""}</p>
              <p className="text-xs text-muted-foreground">by {staff?.find(s => s.id === lastVisit.worker_id)?.full_name || "—"}</p>
            </div>
          ) : (
            <p className="text-xs text-red-600">No sessions recorded</p>
          )}
        </div>
      </div>

      {/* SECTION 3 — PLANS AND DEVELOPMENT */}
      <SectionHeader label="Plans and development" />
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Support plan */}
        <Cell label="Support plan">
          {activeSP ? (
            <div>
              <span className={activeSP.review_due_date && activeSP.review_due_date < todayStr ? "text-red-600" : "text-green-700"}>
                {daysAgoLabel(activeSP.effective_date || activeSP.created_date)}
              </span>
              {activeSP.review_due_date && activeSP.review_due_date < todayStr && (
                <p className="text-red-600" style={{ fontSize: "10px" }}>Review overdue</p>
              )}
              <button className="text-primary text-xs hover:underline mt-0.5 block" onClick={() => onViewSupportPlan?.(resident)}>View →</button>
            </div>
          ) : (
            <div>
              <MutedVal>No plan</MutedVal>
              <button className="text-primary text-xs hover:underline mt-0.5 flex items-center gap-0.5" onClick={() => onViewSupportPlan?.(resident)}>
                <Plus className="w-3 h-3" /> Create
              </button>
            </div>
          )}
        </Cell>

        {/* Risk management plan */}
        <Cell label="Risk management plan">
          {lastVisit ? (
            <div>
              <span className={daysAgoColor(lastVisit.date)}>{daysAgoLabel(lastVisit.date)}</span>
              <p className="text-muted-foreground" style={{ fontSize: "10px" }}>via visit report</p>
            </div>
          ) : <MutedVal>—</MutedVal>}
        </Cell>

        {/* ILS plan */}
        <Cell label="ILS plan">
          {activeILS ? (
            <div>
              <span className={activeILS.review_due_date && activeILS.review_due_date < todayStr ? "text-red-600" : "text-green-700"}>
                {daysAgoLabel(activeILS.effective_date || activeILS.created_date)}
              </span>
              {activeILSSections.length > 0 && (
                <p className="text-muted-foreground" style={{ fontSize: "10px" }}>{ilsProgress}% complete</p>
              )}
              <button className="text-primary text-xs hover:underline mt-0.5 block" onClick={() => onViewILSPlan?.(resident)}>View →</button>
            </div>
          ) : (
            <div>
              <MutedVal>No plan</MutedVal>
              <button className="text-primary text-xs hover:underline mt-0.5 flex items-center gap-0.5" onClick={() => onViewILSPlan?.(resident)}>
                <Plus className="w-3 h-3" /> Create
              </button>
            </div>
          )}
        </Cell>

        {/* Last activity */}
        <Cell label="Last activity engaged">
          {lastTask ? (
            <div>
              <GreenVal>{lastTask.title?.slice(0, 30)}</GreenVal>
              <p className="text-muted-foreground" style={{ fontSize: "10px" }}>{daysAgoLabel(lastTask.due_date)}</p>
            </div>
          ) : <RedVal>No activity</RedVal>}
        </Cell>

        {/* Employment */}
        <Cell label="Employment">
          <MutedVal>No employment</MutedVal>
        </Cell>

        {/* Training */}
        <Cell label="Training">
          <MutedVal>No training</MutedVal>
        </Cell>

        {/* Transition — spans 2 cells */}
        <div className="col-span-2">
          <Cell label="Transition">
            {activeTransition ? (
              <span className={transitionColor}>
                {activeTransition.transition_type?.replace(/_/g, " ")} ·{" "}
                {activeTransition.planned_date
                  ? new Date(activeTransition.planned_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
                {transitionDays !== null && ` · ${transitionDays} days`}
              </span>
            ) : <MutedVal>Not started</MutedVal>}
          </Cell>
        </div>
      </div>

      {/* SECTION 4 — ACTIVITY TIMELINE */}
      <SectionHeader label={`Activity timeline — today`} />
      <div className="px-4 py-3">
        {timelineItems.length === 0 ? (
          <p className="text-center text-muted-foreground text-xs py-4">No activity recorded today yet.</p>
        ) : (
          <div className="divide-y divide-border/30">
            {visibleTimeline.map((item, i) => (
              <TimelineItem key={i} bar={item.bar} title={item.title} sub={item.sub} badge={item.badge} badgeColor={item.badgeColor} />
            ))}
          </div>
        )}
        {timelineItems.length > 6 && (
          <button className="text-xs text-primary mt-2 flex items-center gap-0.5" onClick={() => setShowAllTimeline(v => !v)}>
            {showAllTimeline ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {timelineItems.length} items</>}
          </button>
        )}
      </div>

      {/* SECTION 5 — HEALTH SNAPSHOT */}
      <SectionHeader label="Health & Leisure snapshot" />
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Cell label="NHS Number">
          {resident.nhs_number ? <span className="font-mono">{resident.nhs_number}</span> : <MutedVal>—</MutedVal>}
        </Cell>
        <Cell label="GP">
          {resident.gp_name
            ? <GreenVal>{resident.gp_name}{resident.gp_phone ? ` · ${resident.gp_phone}` : ""}</GreenVal>
            : <AmberVal>Not recorded</AmberVal>}
        </Cell>
        <Cell label="Allergies">
          {(resident.allergies || []).length > 0
            ? <span className="text-red-600 font-medium">{(resident.allergies || []).length} known · {resident.allergies.map(a => a.allergen).join(", ")}</span>
            : <GreenVal>None known</GreenVal>}
        </Cell>
        <Cell label="Medical Conditions">
          {(resident.medical_conditions || []).length > 0
            ? <AmberVal>{resident.medical_conditions.map(c => c.condition).join(", ")}</AmberVal>
            : <GreenVal>None recorded</GreenVal>}
        </Cell>
        <Cell label="Dentist">
          {resident.dentist_name
            ? <GreenVal>{resident.dentist_name}</GreenVal>
            : <AmberVal>Not recorded</AmberVal>}
        </Cell>
        <Cell label="Optician">
          {resident.optician_name
            ? <GreenVal>{resident.optician_name}{resident.optician_needs_glasses ? " · 👓 glasses" : ""}</GreenVal>
            : <AmberVal>Not recorded</AmberVal>}
        </Cell>
        <div className="col-span-2">
          <Cell label="Leisure / Activities">
            {(() => {
              const activities = [];
              if (resident.leisure_gym_enrolled) activities.push(`Gym${resident.leisure_gym_name ? `: ${resident.leisure_gym_name}` : ""}`);
              if (resident.leisure_leisure_centre_enrolled) activities.push(`Leisure Centre${resident.leisure_leisure_centre ? `: ${resident.leisure_leisure_centre}` : ""}`);
              if (resident.leisure_football_enrolled) activities.push(`Football${resident.leisure_football_club ? `: ${resident.leisure_football_club}` : ""}`);
              (resident.leisure_other_clubs || []).forEach(c => activities.push(c.name));
              return activities.length > 0
                ? <GreenVal>{activities.join(" · ")}</GreenVal>
                : <MutedVal>No activities recorded</MutedVal>;
            })()}
          </Cell>
        </div>
      </div>

      {/* PROGRESS BARS */}
      <div className="px-4 py-3 bg-muted/20 border-t border-border flex gap-4 flex-wrap">
        <ProgressBar label="Support plan" value={activeSP ? spProgress : null} color="#639922" />
        <ProgressBar label="ILS plan" value={activeILS ? ilsProgress : null} color="#185FA5" />
        <ProgressBar label="Pathway progress" value={activeTransition ? pathwayProgress : null} color="#534AB7" />
        <ProgressBar label="Risk management" value={resident.risk_level ? riskProgress : null} color="#EF9F27" />
      </div>

      {showEducationModal && (
        <EducationModal resident={resident} onClose={() => setShowEducationModal(false)} />
      )}
    </div>
  );
}