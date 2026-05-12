import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { ChevronDown, ChevronUp, Flag, ExternalLink } from "lucide-react";
import YPCardExpanded from "./YPCardExpanded";

const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_BORDER = { critical: "#E24B4A", high: "#EF9F27", medium: "#378ADD", low: "#1D9E75" };
const RISK_AVATAR_BG = { critical: "#FAECE7", high: "#FAEEDA", medium: "#E6F1FB", low: "#E1F5EE" };
const RISK_AVATAR_TEXT = { critical: "#993C1D", high: "#854F0B", medium: "#185FA5", low: "#0F6E56" };
const RISK_BADGE_BG = { critical: "#FCEBEB", high: "#FAEEDA", medium: "#E6F1FB", low: "#E1F5EE" };
const RISK_BADGE_TEXT = { critical: "#A32D2D", high: "#854F0B", medium: "#185FA5", low: "#0F6E56" };

const todayStr = new Date().toISOString().split("T")[0];

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function StatusBadge({ color, children }) {
  const styles = {
    red: { bg: "#FCEBEB", text: "#A32D2D" },
    amber: { bg: "#FAEEDA", text: "#854F0B" },
    green: { bg: "#EAF3DE", text: "#3B6D11" },
    purple: { bg: "#F0EFFE", text: "#534AB7" },
  };
  const s = styles[color] || styles.amber;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>
      {children}
    </span>
  );
}

function generateBadges(resident, todayLogs, todayVisitReports, supportPlans, ilsPlans, transitions) {
  const badges = [];
  const todayLog = todayLogs.find(l => l.resident_id === resident.id);
  const todayVisit = todayVisitReports.find(v => v.resident_id === resident.id);
  const activeSP = supportPlans.find(p => p.resident_id === resident.id && p.status === "active");
  const activeILS = ilsPlans.find(p => p.resident_id === resident.id && p.status === "active");
  const activeTransition = transitions.find(t => t.resident_id === resident.id && t.status === "active");

  if (!todayLog) badges.push({ color: "amber", label: "No log today" });
  if (todayLog?.flagged && !todayLog?.acknowledged_by) badges.push({ color: "red", label: "Flagged log" });
  if (todayVisit) badges.push({ color: "green", label: "Face-to-face done" });
  if ((resident.allergies || []).some(a => a.severity === "anaphylactic" || a.severity === "severe")) {
    badges.push({ color: "red", label: "⚠ Severe allergy" });
  }
  if (activeSP) {
    const due = activeSP.review_due_date;
    if (due && due < todayStr) badges.push({ color: "amber", label: "Support plan due" });
  }
  if (activeILS) {
    const due = activeILS.review_due_date;
    if (due && due < todayStr) badges.push({ color: "amber", label: "ILS plan due" });
  }
  if (activeTransition) badges.push({ color: "purple", label: "Transition active" });
  if (badges.length === 0) badges.push({ color: "green", label: "All clear today" });
  return badges.slice(0, 5);
}

function YPCard({ resident, home, keyWorker, dailyLogs, visitReports, supportPlans, ilsPlans, transitions, onNavigateSP, onNavigateILS, myStaffProfile, isAdminOrTL, onAddDailyLog, onViewSupportPlan, onViewILSPlan, staff, appointments }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const risk = resident.risk_level || "low";
  const age = calcAge(resident.dob);
  const todayLogs = dailyLogs.filter(l => l.date === todayStr);
  const todayVisits = visitReports.filter(v => v.date === todayStr);
  const badges = generateBadges(resident, todayLogs, todayVisits, supportPlans, ilsPlans, transitions);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-2 shadow-sm"
      style={{ borderLeft: `3px solid ${RISK_BORDER[risk]}` }}>
      {/* Collapsed header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: RISK_AVATAR_BG[risk], color: RISK_AVATAR_TEXT[risk] }}>
          {resident.initials || resident.display_name?.charAt(0)}
        </div>

        {/* Name + home */}
        <div className="min-w-0 shrink-0 w-44">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium leading-tight">{resident.display_name}</span>
            {age && <span className="text-xs text-muted-foreground font-normal">({age}y)</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{home?.name || "—"}</p>
        </div>

        {/* Risk badge */}
        <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0"
          style={{ background: RISK_BADGE_BG[risk], color: RISK_BADGE_TEXT[risk] }}>
          {risk}
        </span>

        {/* Status badges */}
        <div className="flex-1 flex flex-wrap gap-1 min-w-0">
          {badges.map((b, i) => <StatusBadge key={i} color={b.color}>{b.label}</StatusBadge>)}
        </div>

        {/* Key worker + expand + View Details */}
        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Key worker</p>
            <p className="text-xs font-medium">{keyWorker?.full_name || "—"}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); navigate(`/young-people/${resident.id}/workspace`); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition-colors shrink-0"
          >
            <ExternalLink className="w-3 h-3" /> View Details
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <YPCardExpanded
          resident={resident}
          home={home}
          keyWorker={keyWorker}
          dailyLogs={dailyLogs}
          visitReports={visitReports}
          supportPlans={supportPlans}
          ilsPlans={ilsPlans}
          transitions={transitions}
          onNavigateSP={onNavigateSP}
          onNavigateILS={onNavigateILS}
          isAdminOrTL={isAdminOrTL}
          staff={staff}
          onAddDailyLog={onAddDailyLog}
          onViewSupportPlan={onViewSupportPlan}
          onViewILSPlan={onViewILSPlan}
          appointments={appointments}
        />
      )}
    </div>
  );
}

export default function YPCardView({
  residents, homes, staff, dailyLogs, visitReports, accidents, homeTasks, transitions,
  supportPlans, ilsPlans, filterHomeId, filterFlagged, onNavigateSP, onNavigateILS,
  isAdminOrTL, myStaffProfile, onAddDailyLog, onViewSupportPlan, onViewILSPlan, appointments = [],
}) {
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const todayLogs = useMemo(() => dailyLogs.filter(l => l.date === todayStr), [dailyLogs]);

  const sorted = useMemo(() => {
    const filtered = residents.filter(r => {
      if (filterHomeId && filterHomeId !== "all" && r.home_id !== filterHomeId) return false;
      if (filterFlagged) {
        const hasFlag = todayLogs.some(l => l.resident_id === r.id && l.flagged && !l.acknowledged_by);
        if (!hasFlag) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const rd = (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4);
      if (rd !== 0) return rd;
      return (a.display_name || "").localeCompare(b.display_name || "");
    });
  }, [residents, filterHomeId, filterFlagged, todayLogs]);

  if (sorted.length === 0) {
    return (
      <div className="mt-4 bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">No young people found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1">
      {sorted.map(r => (
        <YPCard
          key={r.id}
          resident={r}
          home={homeMap[r.home_id]}
          keyWorker={r.key_worker_id ? staffMap[r.key_worker_id] : null}
          dailyLogs={dailyLogs.filter(l => l.resident_id === r.id)}
          visitReports={visitReports.filter(v => v.resident_id === r.id)}
          supportPlans={supportPlans.filter(p => p.resident_id === r.id)}
          ilsPlans={ilsPlans.filter(p => p.resident_id === r.id)}
          transitions={transitions.filter(t => t.resident_id === r.id)}
          onNavigateSP={onNavigateSP}
          onNavigateILS={onNavigateILS}
          isAdminOrTL={isAdminOrTL}
          myStaffProfile={myStaffProfile}
          staff={staff}
          onAddDailyLog={onAddDailyLog}
          onViewSupportPlan={onViewSupportPlan}
          onViewILSPlan={onViewILSPlan}
          appointments={appointments}
        />
      ))}
    </div>
  );
}