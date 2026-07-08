import { useState, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInHours, differenceInMinutes, format, parseISO, isPast, differenceInHours as diffHours, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { useMobile } from "@/lib/MobileContext";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { Link } from "react-router-dom";
import {
  Shield, AlertTriangle, Users, Home, FileText, ClipboardList,
  UserCheck, CheckSquare, RefreshCw, Download, Zap, ChevronRight,
  ExternalLink, Clock, Calendar, Activity, TrendingUp, BarChart2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, CartesianGrid, Area, AreaChart } from "recharts";
import { WORKFLOW_META } from "@/components/workflow/workflowConfig";
import Reg27ActionModal from "@/components/compliance-hub/Reg27ActionModal";
import AIInsightsPanel from "../components/dashboard/AIInsightsPanel";
import AppointmentComplianceReport from "../components/residents/appointments/AppointmentComplianceReport";
import YPSummaryModal from "../components/dashboard/YPSummaryModal";
// Only used by the commented-out ComplianceReadinessWidget below (superseded by
// ComplianceReadinessCard); left imported-but-commented rather than deleted.
// import RiskSummaryModal from "../components/dashboard/RiskSummaryModal";
// Carried over from the pre-merge Admin Dashboard so the existing Compliance & Readiness
// card design (Ofsted Readiness Score gauge + Quick Actions) keeps working unchanged.
import OfstedReadinessScore from "../components/compliance/OfstedReadinessScore";
import QuickActionButtons from "../components/compliance/QuickActionButtons";
import ScoringRulesModal from "../components/compliance/ScoringRulesModal";

const ORG_ID = "default_org";

// ── Helpers ──────────────────────────────────────────────────────────────────
function serviceTypeLabel(type) {
  const m = { "18_plus": "18+ Accommodation", "24_hours": "24 Hours Housing", care: "Care Services", outreach: "Outreach" };
  return m[type] || type || "—";
}

function RagBadge({ value }) {
  if (value >= 85) return <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Healthy</span>;
  if (value >= 70) return <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Watch</span>;
  return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">At Risk</span>;
}

function MiniBar({ pct, color = "bg-blue-500" }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 w-7 text-right">{pct}%</span>
    </div>
  );
}

function PriorityBadge({ p }) {
  const map = { Critical: "bg-red-600 text-white", High: "bg-red-100 text-red-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-slate-100 text-slate-500" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${map[p] || map.Low}`}>{p}</span>;
}

function StatusBadge({ s }) {
  const map = { Overdue: "bg-red-100 text-red-700", Waiting: "bg-amber-100 text-amber-700", "In Review": "bg-blue-100 text-blue-700", Open: "bg-orange-100 text-orange-700", Closed: "bg-green-100 text-green-700" };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[s] || "bg-slate-100 text-slate-500"}`}>{s}</span>;
}

// ── Section 1: KPI Banner ─────────────────────────────────────────────────────
function KPIModal({ title, icon: Icon, iconBg, iconColor, onClose, children, onInfo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <h2 className="flex-1 text-sm font-black text-slate-900">{title}</h2>
          {onInfo && (
            <button onClick={onInfo} title="View score calculation" className="rounded-lg p-1.5 hover:bg-blue-50 transition text-slate-400 hover:text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition">
            <span className="text-slate-500 text-lg leading-none">✕</span>
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function KPIBanner({ homes, residents, staff, attendanceLogs, incidents, dailyLogs, workflows, homeChecks, dateRange }) {
  const [openModal, setOpenModal] = useState(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const rangeFromStr = format(dateRange?.from || new Date(), "yyyy-MM-dd");
  const rangeToStr = format(dateRange?.to || new Date(), "yyyy-MM-dd");

  const staffOnShift = useMemo(() => attendanceLogs.filter(l => !l.clock_out_time).length, [attendanceLogs]);
  const totalActiveStaff = useMemo(() => staff.filter(s => s.status === "active").length, [staff]);
  const staffCoverPct = totalActiveStaff > 0 ? Math.round((staffOnShift / totalActiveStaff) * 100) : 0;

  const highRiskYP = useMemo(() => residents.filter(r => r.risk_level === "high" || r.risk_level === "critical"), [residents]);
  const missedLogResidents = useMemo(() => {
    const loggedIds = new Set(dailyLogs.filter(l => l.date >= rangeFromStr && l.date <= rangeToStr).map(l => l.resident_id));
    return residents.filter(r => r.status === "active" && !loggedIds.has(r.id));
  }, [residents, dailyLogs, rangeFromStr, rangeToStr]);

  const openIncidentsList = useMemo(() => incidents.filter(i => i.status === "open" || i.status === "under_investigation"), [incidents]);
  const pendingWorkflows = useMemo(() => workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)), [workflows]);
  const criticalWorkflows = useMemo(() => pendingWorkflows.filter(w => w.priority === "critical"), [pendingWorkflows]);
  const staffOnShiftList = useMemo(() => attendanceLogs.filter(l => !l.clock_out_time), [attendanceLogs]);

  const openIncidents = openIncidentsList.length;
  const pendingApprovals = pendingWorkflows.length;
  const criticalActions = criticalWorkflows.length;
  const missedLogsToday = missedLogResidents.length;

  // Structured score breakdown — each factor contributes points out of a total of 100
  const scoreBreakdown = useMemo(() => {
    const factors = [];

    // 1. Open incidents (max 25pts)
    const incidentDeduction = Math.min(openIncidents * 5, 25);
    const incidentScore = 25 - incidentDeduction;
    factors.push({ label: "Open Incidents", score: incidentScore, max: 25, detail: openIncidents === 0 ? "No open incidents" : `${openIncidents} open — -${incidentDeduction}pts`, ok: openIncidents === 0 });

    // 2. Daily log coverage (max 20pts)
    const totalActive = residents.filter(r => r.status === "active").length;
    const loggedIds = new Set(dailyLogs.filter(l => l.date >= rangeFromStr && l.date <= rangeToStr).map(l => l.resident_id));
    const logCoverage = totalActive > 0 ? loggedIds.size / totalActive : 1;
    const logScore = Math.round(logCoverage * 20);
    factors.push({ label: "Daily Log Coverage", score: logScore, max: 20, detail: totalActive > 0 ? `${loggedIds.size}/${totalActive} residents logged in range` : "No active residents", ok: logScore >= 16 });

    // 3. Pending approvals (max 15pts)
    const approvalDeduction = pendingApprovals > 20 ? 15 : pendingApprovals > 10 ? 10 : pendingApprovals > 5 ? 5 : 0;
    const approvalScore = 15 - approvalDeduction;
    factors.push({ label: "Approval Queue", score: approvalScore, max: 15, detail: pendingApprovals === 0 ? "No pending approvals" : `${pendingApprovals} pending — -${approvalDeduction}pts`, ok: approvalDeduction === 0 });

    // 4. Staff cover (max 20pts)
    const staffScore = staffCoverPct >= 90 ? 20 : staffCoverPct >= 80 ? 15 : staffCoverPct >= 60 ? 10 : staffCoverPct >= 40 ? 5 : 0;
    factors.push({ label: "Staff Cover", score: staffScore, max: 20, detail: `${staffCoverPct}% staff on shift`, ok: staffScore >= 15 });

    // 5. High-risk YP (max 10pts)
    const hrDeduction = Math.min(highRiskYP.length * 2, 10);
    const hrScore = 10 - hrDeduction;
    factors.push({ label: "High-Risk Residents", score: hrScore, max: 10, detail: highRiskYP.length === 0 ? "No high-risk residents" : `${highRiskYP.length} high/critical risk — -${hrDeduction}pts`, ok: highRiskYP.length === 0 });

    // 6. Home checks (max 10pts)
    const checksCompleted = homeChecks.filter(c => c.overall_status !== "draft").length;
    const checkScore = homeChecks.length > 0 ? Math.round((checksCompleted / homeChecks.length) * 10) : 8;
    factors.push({ label: "Home Checks", score: checkScore, max: 10, detail: homeChecks.length > 0 ? `${checksCompleted}/${homeChecks.length} checks completed` : "No check data", ok: checkScore >= 8 });

    const total = factors.reduce((sum, f) => sum + f.score, 0);
    return { total, factors };
  }, [openIncidents, missedLogResidents, residents, dailyLogs, rangeFromStr, rangeToStr, pendingApprovals, staffCoverPct, highRiskYP, homeChecks]);

  const serviceHealth = scoreBreakdown.total;

  const healthColor = serviceHealth >= 80 ? "text-green-600" : serviceHealth >= 60 ? "text-amber-500" : "text-red-600";
  const healthLabel = serviceHealth >= 80 ? "Good" : serviceHealth >= 60 ? "Amber" : "Critical";
  const healthBg = serviceHealth >= 80 ? "bg-green-50 border-green-200" : serviceHealth >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  const riskColors = { low: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };

  const kpis = [
    { key: "critical", label: "Critical Actions", value: criticalActions, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", trend: criticalActions > 0 ? `↑ ${criticalActions} vs yesterday` : "No change", trendColor: criticalActions > 0 ? "text-red-500" : "text-slate-400" },
    { key: "highrisk", label: "High-Risk Young People", value: highRiskYP.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50", trend: `↑ 3% vs yesterday`, trendColor: "text-red-500" },
    { key: "missedlogs", label: "Missed Logs Today", value: missedLogsToday, icon: ClipboardList, color: "text-orange-600", bg: "bg-orange-50", trend: `↑ 12 vs yesterday`, trendColor: "text-amber-500" },
    { key: "incidents", label: "Open Incidents", value: openIncidents, icon: Shield, color: "text-red-600", bg: "bg-red-50", trend: "→ No change", trendColor: "text-slate-400" },
    { key: "staffcover", label: "Staff Cover", value: `${staffCoverPct}%`, icon: UserCheck, color: "text-teal-600", bg: "bg-teal-50", trend: `↑ 2% vs yesterday`, trendColor: "text-green-500" },
    { key: "approvals", label: "Pending Approvals", value: pendingApprovals, icon: CheckSquare, color: "text-blue-600", bg: "bg-blue-50", trend: `↑ 2 vs yesterday`, trendColor: "text-amber-500" },
  ];

  // Modal content per key
  const modalConfigs = {
    health: {
      title: "Ofsted Readiness Score", icon: Activity, iconBg: healthBg.split(" ")[0], iconColor: healthColor,
      showInfo: true,
      content: (
        <div className="space-y-3">
          {[
            { label: "Open Incidents", value: openIncidents, color: openIncidents > 0 ? "text-red-600" : "text-green-600", key: "incidents" },
            { label: "Missed Logs Today", value: missedLogsToday, color: missedLogsToday > 5 ? "text-red-600" : "text-green-600", key: "missedlogs" },
            { label: "Pending Approvals", value: pendingApprovals, color: pendingApprovals > 10 ? "text-amber-600" : "text-slate-800", key: "approvals" },
            { label: "Staff Cover", value: `${staffCoverPct}%`, color: staffCoverPct < 80 ? "text-red-600" : "text-green-600", key: "staffcover" },
            { label: "High-Risk Residents", value: highRiskYP.length, color: highRiskYP.length > 0 ? "text-orange-600" : "text-green-600", key: "highrisk" },
          ].map(row => (
            <button key={row.key} onClick={() => setOpenModal(row.key)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition cursor-pointer text-left">
              <span className="text-sm text-slate-600">{row.label}</span>
              <span className={`font-bold text-sm ${row.color}`}>{row.value}</span>
            </button>
          ))}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${healthBg}`}>
            <span className="text-sm font-bold text-slate-700">Overall Score</span>
            <span className={`font-black text-lg ${healthColor}`}>{serviceHealth}/100 — {healthLabel}</span>
          </div>
        </div>
      ),
    },
    critical: {
      title: "Critical Pending Actions", icon: AlertTriangle, iconBg: "bg-red-100", iconColor: "text-red-600",
      content: criticalWorkflows.length === 0 ? <p className="text-center text-sm text-slate-400 py-6">No critical actions.</p> : (
        <div className="divide-y divide-slate-100">
          {criticalWorkflows.map(w => (
            <div key={w.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800 capitalize">{(w.entity_type || "").replace(/_/g, " ")}</div>
                <div className="text-xs text-slate-400">{w.submitted_by_name || "—"} · {w.home_name || "—"}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Critical</span>
            </div>
          ))}
        </div>
      ),
    },
    highrisk: {
      title: "High-Risk Young People", icon: Users, iconBg: "bg-purple-100", iconColor: "text-purple-600",
      content: highRiskYP.length === 0 ? <p className="text-center text-sm text-slate-400 py-6">No high-risk YP.</p> : (
        <div className="divide-y divide-slate-100">
          {highRiskYP.map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-purple-50 text-xs font-black text-purple-600">
                {(r.display_name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">{r.display_name || r.full_name}</div>
                <div className="text-xs text-slate-400">{r.placing_local_authority || "—"}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${riskColors[r.risk_level] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{r.risk_level}</span>
            </div>
          ))}
        </div>
      ),
    },
    missedlogs: {
      title: "Residents With No Log Today", icon: ClipboardList, iconBg: "bg-orange-100", iconColor: "text-orange-600",
      content: missedLogResidents.length === 0 ? <p className="text-center text-sm text-slate-400 py-6">All residents have been logged today.</p> : (
        <div className="divide-y divide-slate-100">
          {missedLogResidents.slice(0, 30).map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-50 text-xs font-black text-orange-600">
                {(r.display_name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">{r.display_name || r.full_name}</div>
                <div className="text-xs text-slate-400">{r.home_id || "—"}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${riskColors[r.risk_level] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{r.risk_level || "low"}</span>
            </div>
          ))}
          {missedLogResidents.length > 30 && <p className="text-xs text-slate-400 text-center pt-2">+{missedLogResidents.length - 30} more</p>}
        </div>
      ),
    },
    incidents: {
      title: "Open Incidents & Safeguarding", icon: Shield, iconBg: "bg-red-100", iconColor: "text-red-600",
      content: openIncidentsList.length === 0 ? <p className="text-center text-sm text-slate-400 py-6">No open incidents.</p> : (
        <div className="divide-y divide-slate-100">
          {openIncidentsList.map(i => (
            <div key={i.id} className="flex items-start gap-3 py-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-xs font-black text-red-600">
                {(i.resident_name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">{i.resident_name || "Unknown"}</div>
                <div className="text-xs text-slate-400 capitalize">{(i.concern_type || "").replace(/_/g, " ")} · {i.home_name || "—"}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${riskColors[i.immediate_risk] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{i.immediate_risk || "—"}</span>
            </div>
          ))}
        </div>
      ),
    },
    staffcover: {
      title: "Staff Currently On Shift", icon: UserCheck, iconBg: "bg-teal-100", iconColor: "text-teal-600",
      content: staffOnShiftList.length === 0 ? <p className="text-center text-sm text-slate-400 py-6">No staff clocked in.</p> : (
        <div className="divide-y divide-slate-100">
          {staffOnShiftList.map(log => {
            const member = staff.find(s => s.id === log.staff_id);
            const clockedIn = log.clock_in_time ? format(new Date(log.clock_in_time), "HH:mm") : "—";
            return (
              <div key={log.id} className="flex items-center gap-3 py-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-black text-teal-600">
                  {(member?.full_name || log.staff_name || "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{member?.full_name || log.staff_name || "Unknown"}</div>
                  <div className="text-xs text-slate-400 capitalize">{(member?.role || "").replace(/_/g, " ") || "—"}</div>
                </div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">Since {clockedIn}</span>
              </div>
            );
          })}
        </div>
      ),
    },
    approvals: {
      title: "Pending Approvals", icon: CheckSquare, iconBg: "bg-blue-100", iconColor: "text-blue-600",
      content: pendingWorkflows.length === 0 ? <p className="text-center text-sm text-slate-400 py-6">No pending approvals.</p> : (
        <div className="divide-y divide-slate-100">
          {pendingWorkflows.slice(0, 20).map(w => {
            const priorityColors = { critical: "bg-red-100 text-red-700 border-red-200", high: "bg-orange-100 text-orange-700 border-orange-200", normal: "bg-slate-100 text-slate-600 border-slate-200" };
            return (
              <div key={w.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 capitalize">{(w.entity_type || "").replace(/_/g, " ")}</div>
                  <div className="text-xs text-slate-400">{w.submitted_by_name || "—"} · {w.home_name || "—"}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${priorityColors[w.priority] || priorityColors.normal}`}>{w.priority || "normal"}</span>
              </div>
            );
          })}
          {pendingWorkflows.length > 20 && <p className="text-xs text-slate-400 text-center pt-2">+{pendingWorkflows.length - 20} more</p>}
        </div>
      ),
    },
  };

  const activeCfg = modalConfigs[openModal];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 px-6 py-4">
        {/* Service Health — wider card */}
        <button onClick={() => setOpenModal("health")} className={`col-span-2 sm:col-span-1 bg-white rounded-xl border ${healthBg} p-4 flex flex-col justify-between hover:shadow-md transition-shadow text-left`}>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Ofsted Readiness Score</p>
          <div className="flex items-end gap-1 mt-1">
            <span className={`text-3xl font-black ${healthColor}`}>{serviceHealth}</span>
            <span className="text-sm text-slate-400 mb-1">/100</span>
          </div>
          <span className={`text-xs font-bold ${healthColor}`}>{healthLabel}</span>
          <p className="text-[10px] text-slate-400 mt-1">↓ 4 pts vs last month</p>
        </button>

        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <button key={k.key} onClick={() => setOpenModal(k.key)} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col hover:shadow-md transition-shadow group text-left">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-500 font-medium leading-tight">{k.label}</p>
                <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${k.color}`} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{k.value}</p>
              <p className={`text-[10px] mt-1 ${k.trendColor}`}>{k.trend}</p>
            </button>
          );
        })}
      </div>

      {activeCfg && (
        <KPIModal
          title={activeCfg.title} icon={activeCfg.icon} iconBg={activeCfg.iconBg} iconColor={activeCfg.iconColor}
          onClose={() => setOpenModal(null)}
          onInfo={activeCfg.showInfo ? () => setShowScoreBreakdown(true) : undefined}
        >
          {activeCfg.content}
        </KPIModal>
      )}

      {/* Score Calculation Breakdown sub-modal */}
      {showScoreBreakdown && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowScoreBreakdown(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <h2 className="flex-1 text-sm font-black text-slate-900">Score Calculation Breakdown</h2>
              <button onClick={() => setShowScoreBreakdown(false)} className="rounded-lg p-1.5 hover:bg-slate-200 transition">
                <span className="text-slate-500 text-lg leading-none">✕</span>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 mb-1">Each factor contributes points to the overall score out of 100.</p>
              {scoreBreakdown.factors.map((f, i) => {
                const pct = f.max > 0 ? (f.score / f.max) * 100 : 0;
                const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
                return (
                  <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700">{f.label}</span>
                      <span className={`text-xs font-black ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{f.score}/{f.max}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400">{f.detail}</p>
                  </div>
                );
              })}
              <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${healthBg} mt-2`}>
                <span className="text-sm font-black text-slate-800">Total Score</span>
                <span className={`text-lg font-black ${healthColor}`}>{scoreBreakdown.total}/100</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Section 2: Homes Needing Attention ───────────────────────────────────────
function HomesTable({ homes, residents, incidents, missingFromHome, homeChecks, homeFilter, propertyTypeFilter }) {
  const rows = useMemo(() => {
    let list = homes;
    if (homeFilter !== "all") list = list.filter(h => h.id === homeFilter);
    if (propertyTypeFilter !== "all") list = list.filter(h => h.type === propertyTypeFilter);
    return list.slice(0, 6).map(home => {
      const homeResidents = residents.filter(r => r.home_id === home.id && r.status === "active");
      const cap = home.number_of_beds_capacity || homeResidents.length || 4;
      const occupancyPct = cap > 0 ? Math.round((homeResidents.length / cap) * 100) : 0;
      const activeIncidents = incidents.filter(i => i.home_id === home.id && (i.status === "open" || i.status === "under_investigation")).length;
      const activeMissing = missingFromHome.filter(m => m.home_id === home.id && m.status === "active").length;
      const pendingChecks = homeChecks.filter(c => c.home_id === home.id && c.manager_review_status === "pending").length;
      const compliancePct = pendingChecks > 2 ? 71 : pendingChecks > 0 ? 84 : 92;
      const staffPct = 85; // from attendance
      return { home, homeResidents, cap, occupancyPct, staffPct, activeIncidents, activeMissing, pendingChecks, compliancePct };
    });
  }, [homes, residents, incidents, missingFromHome, homeChecks, homeFilter, propertyTypeFilter]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="text-sm font-semibold text-slate-900">Homes Needing Attention</h3>
        </div>
        <Link to="/homes-hub" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View all homes <ChevronRight className="w-3 h-3" /></Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 text-slate-500 font-medium">#</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Service Type</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Occ.</th>
              <th className="text-center px-2 py-2 text-slate-500 font-medium">Staff</th>
              <th className="text-center px-2 py-2 text-slate-500 font-medium">Missed</th>
              <th className="text-center px-2 py-2 text-slate-500 font-medium">High Risk</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Compliance</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Status</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(({ home, homeResidents, cap, occupancyPct, staffPct, activeIncidents, activeMissing, compliancePct }, idx) => {
              const highRisk = residents.filter(r => r.home_id === home.id && (r.risk_level === "high" || r.risk_level === "critical")).length;
              const ragVal = compliancePct >= 85 ? "Healthy" : compliancePct >= 70 ? "Watch" : "At Risk";
              return (
                <tr key={home.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                  <td className="px-2 py-2.5">
                    <p className="font-semibold text-slate-800 truncate max-w-[100px]">{home.name.split(" - ")[0]}</p>
                    <p className="text-slate-400">{homeResidents.length}/{cap}</p>
                  </td>
                  <td className="px-2 py-2.5 text-slate-500">{serviceTypeLabel(home.type)}</td>
                  <td className="px-2 py-2.5 min-w-[70px]"><MiniBar pct={occupancyPct} color="bg-blue-500" /></td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`font-semibold ${staffPct < 80 ? "text-red-600" : "text-green-600"}`}>{staffPct}%</span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {activeMissing > 0 ? <span className="text-red-600 font-bold">{activeMissing}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {highRisk > 0 ? <span className="text-amber-600 font-bold">{highRisk}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-2 py-2.5 min-w-[70px]">
                    <MiniBar pct={compliancePct} color={compliancePct >= 85 ? "bg-green-500" : compliancePct >= 70 ? "bg-amber-400" : "bg-red-400"} />
                  </td>
                  <td className="px-2 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ragVal === "Healthy" ? "bg-green-100 text-green-700" : ragVal === "Watch" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{ragVal}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <Link to="/homes-hub" className="text-[10px] font-semibold text-blue-600 hover:underline">View Home</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-8 text-center text-slate-400 text-xs">No homes found</div>}
      </div>
    </div>
  );
}

// ── Section 2b: YP & Safeguarding ────────────────────────────────────────────
function YPSafeguardingWidget({ residents, safeguarding, missingFromHome, riskAssessments, supportPlans, appointments }) {
  const [activeModal, setActiveModal] = useState(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const activeSG = safeguarding.filter(s => s.status === "under_investigation").length;
  const activeMissing = missingFromHome.filter(m => m.status === "active").length;
  const riskDue = riskAssessments.filter(r => r.status === "active").length;
  const plansDue = supportPlans.filter(s => s.status === "active").length;
  const apptToday = appointments.filter(a => a.date === today || a.scheduled_date === today).length;
  const educationOverdue = residents.filter(r => r.education_status === "neet" && r.status === "active").length;

  const modalData = { safeguarding, missingFromHome, riskAssessments, supportPlans, appointments, residents };

  const priorityYP = residents
    .filter(r => r.risk_level === "high" || r.risk_level === "critical")
    .slice(0, 6)
    .map(r => ({
      ...r,
      issue: safeguarding.some(s => s.resident_id === r.id && s.status === "under_investigation") ? "Police involvement" :
        missingFromHome.some(m => m.resident_id === r.id && m.status === "active") ? "Serious injury review" :
        supportPlans.some(s => s.resident_id === r.id && s.status === "active") ? "School meeting" : "Key work overdue",
      owner: "LM",
      deadline: "Due now",
      deadlineColor: "text-red-600",
    }));

  const summaryItems = [
    { label: "Safeguarding Watch", value: activeSG, color: "text-red-600", bg: "bg-red-50", modalType: "safeguarding" },
    { label: "Missing Risk Due", value: activeMissing, color: "text-amber-600", bg: "bg-amber-50", modalType: "missing" },
    { label: "Risk Assessments Due", value: riskDue, color: "text-orange-600", bg: "bg-orange-50", modalType: "risk" },
    { label: "Support Plans Due", value: plansDue, color: "text-blue-600", bg: "bg-blue-50", modalType: "plans" },
    { label: "Appointments Today", value: apptToday, color: "text-teal-600", bg: "bg-teal-50", modalType: "appointments" },
    { label: "Education Overdue", value: educationOverdue, color: "text-purple-600", bg: "bg-purple-50", modalType: "education" },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {activeModal && (
        <YPSummaryModal type={activeModal} data={modalData} onClose={() => setActiveModal(null)} />
      )}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h3 className="text-sm font-semibold text-slate-900">Young People & Safeguarding Priorities</h3>
        </div>
        <Link to="/residents" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View all priorities <ChevronRight className="w-3 h-3" /></Link>
      </div>
      {/* Summary row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 bg-slate-50 border-b border-slate-100">
        {summaryItems.map((s, i) => (
          <button key={i} onClick={() => setActiveModal(s.modalType)}
            className={`flex flex-col items-center p-2 rounded-lg ${s.bg} hover:ring-2 hover:ring-offset-1 hover:ring-current cursor-pointer transition-all`}>
            <span className={`text-lg font-black ${s.color}`}>{s.value}</span>
            <span className="text-[9px] text-slate-500 text-center leading-tight">{s.label}</span>
          </button>
        ))}
      </div>
      {/* Priority YP table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 text-slate-500 font-medium">YP</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Risk Level</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Issue / Reason</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Owner</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Deadline</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {priorityYP.map(yp => {
              const riskColor = yp.risk_level === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
              return (
                <tr key={yp.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">
                        {(yp.display_name || yp.full_name || "?").charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800 truncate max-w-[80px]">{yp.display_name || yp.full_name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-slate-500 truncate max-w-[70px]">{yp.home_id?.slice(0, 8)}</td>
                  <td className="px-2 py-2"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${riskColor}`}>{yp.risk_level}</span></td>
                  <td className="px-2 py-2 text-slate-600 truncate max-w-[120px]">{yp.issue}</td>
                  <td className="px-2 py-2 text-slate-600 font-mono">{yp.owner}</td>
                  <td className={`px-2 py-2 font-medium ${yp.deadlineColor}`}>{yp.deadline}</td>
                  <td className="px-2 py-2"><Link to="/residents" className="text-[10px] font-semibold text-blue-600 hover:underline">Open</Link></td>
                </tr>
              );
            })}
            {priorityYP.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-slate-400">No priority cases</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 3: Staff & Shift ─────────────────────────────────────────────────
function StaffShiftWidget({ staff, attendanceLogs, homes }) {
  const staffOnShift = useMemo(() => {
    return attendanceLogs.filter(l => !l.clock_out_time).map(log => {
      const member = staff.find(s => s.id === log.staff_id);
      const home = homes.find(h => h.id === log.home_id);
      let hoursIn = 0;
      try { hoursIn = diffHours(new Date(), parseISO(log.clock_in_time)); } catch {}
      const status = hoursIn > 10 ? "Handover due" : hoursIn > 8 ? "Break" : "On shift";
      return {
        id: log.id,
        name: log.staff_name || member?.full_name || "Unknown",
        role: member?.role?.replace(/_/g, " ") || "Support Worker",
        home: home?.name?.split(" - ")[0] || "—",
        status,
        clockIn: (() => { try { return format(parseISO(log.clock_in_time), "HH:mm"); } catch { return "—"; } })(),
      };
    }).slice(0, 6);
  }, [staff, attendanceLogs, homes]);

  const totalActive = staff.filter(s => s.status === "active").length;
  const handoverPending = staffOnShift.filter(s => s.status === "Handover due").length;

  const rotaData = useMemo(() => homes.slice(0, 5).map(h => ({
    name: h.name.split(" ")[0],
    pct: Math.floor(Math.random() * 40) + 60,
  })), [homes]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">9</span>
          <h3 className="text-sm font-semibold text-slate-900">Staff, Shift & Team Status</h3>
        </div>
        <Link to="/staff" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View full rota <ChevronRight className="w-3 h-3" /></Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-slate-100">
        {/* Left: staff list */}
        <div>
          <div className="grid grid-cols-5 gap-1 p-3 bg-slate-50 border-b border-slate-100 text-center">
            {[
              { label: "On Shift", value: `${staffOnShift.length}/${totalActive}`, color: "text-slate-800" },
              { label: "Late Clock-in", value: 2, color: "text-amber-600" },
              { label: "Handover Pending", value: handoverPending, color: "text-orange-600" },
              { label: "Supervision Due", value: 5, color: "text-blue-600" },
              { label: "Training Overdue", value: 3, color: "text-red-600" },
            ].map((s, i) => (
              <div key={i}>
                <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-400 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Staff</th>
                  <th className="text-left px-2 py-1.5 text-slate-500 font-medium">Role</th>
                  <th className="text-left px-2 py-1.5 text-slate-500 font-medium">Home</th>
                  <th className="text-left px-2 py-1.5 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staffOnShift.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-800">{s.name}</td>
                    <td className="px-2 py-1.5 text-slate-500 capitalize text-[10px]">{s.role}</td>
                    <td className="px-2 py-1.5 text-slate-500 truncate max-w-[70px]">{s.home}</td>
                    <td className="px-2 py-1.5">
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${s.status === "Handover due" ? "text-orange-600" : s.status === "Break" ? "text-amber-600" : "text-green-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === "Handover due" ? "bg-orange-500" : s.status === "Break" ? "bg-amber-400" : "bg-green-500"}`} />
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {staffOnShift.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-slate-400">No staff clocked in</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {/* Right: Rota by home */}
        <div className="p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">Rota Coverage by Home</p>
          <div className="space-y-2">
            {rotaData.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-20 truncate">{r.name}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r.pct >= 90 ? "bg-green-500" : r.pct >= 75 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${r.pct}%` }} />
                </div>
                <span className="text-[10px] text-slate-600 w-8 text-right">{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 4: Missed Checklists & Logs ──────────────────────────────────────
function MissedChecklistsWidget({ homeChecks, homes, dailyLogs, residents }) {
  const [chasing, setChasing] = useState({});
  const [chased, setChased] = useState({});
  const todayStr = format(new Date(), "yyyy-MM-dd");

  async function handleChase(item) {
    if (chased[item.id]) return;
    setChasing(p => ({ ...p, [item.id]: true }));
    try {
      await base44.functions.invoke("createNotification", {
        title: `Chase: ${item.item}`,
        message: `Reminder: "${item.item}" at ${item.home} has been missed (${item.missed}). Please action immediately.`,
        recipient_name: item.owner !== "—" ? item.owner : undefined,
        type: "chase",
        severity: item.severity,
        home: item.home,
      });
      setChased(p => ({ ...p, [item.id]: true }));
    } finally {
      setChasing(p => ({ ...p, [item.id]: false }));
    }
  }

  const items = useMemo(() => {
    const fromChecks = homeChecks.filter(c => c.manager_review_status === "pending").map(c => {
      const home = homes.find(h => h.id === c.home_id);
      const daysOld = Math.floor((new Date() - new Date(c.submitted_at || Date.now())) / 86400000);
      return { id: c.id, item: "Home Check", owner: c.submitted_by_name || "—", home: home?.name?.split(" - ")[0] || "—", missed: daysOld === 0 ? "Today" : `${daysOld}d ago`, severity: daysOld >= 3 ? "High" : daysOld >= 1 ? "Medium" : "Low", link: "/homes-hub" };
    });
    const fromLogs = [
      { id: "fl1", item: "Daily Logs", owner: "Summit House", home: "Summit House", missed: "Last 1h", severity: "High", link: "/daily-logs" },
      { id: "fl2", item: "Night Checks", owner: "David M", home: "North Lodge", missed: "68:15", severity: "High", link: "/daily-logs" },
      { id: "fl3", item: "Fire Alarm Test", owner: "Emily C", home: "North Lodge", missed: "1 day", severity: "Medium", link: "/homes-hub" },
      { id: "fl4", item: "Medication Audit", owner: "Emily C", home: "Meadow View", missed: "1 day", severity: "Medium", link: "/residents" },
      { id: "fl5", item: "Bedroom Check", owner: "David H", home: "Meadow View", missed: "1 day", severity: "Low", link: "/homes-hub" },
    ];
    return [...fromChecks, ...fromLogs].slice(0, 8);
  }, [homeChecks, homes, dailyLogs, todayStr]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">4</span>
          <h3 className="text-sm font-semibold text-slate-900">Missed Checklists & Logs <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">(Today)</span></h3>
        </div>
        <Link to="/homes-hub" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View all missed items <ChevronRight className="w-3 h-3" /></Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 text-slate-500 font-medium">Item</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Owner</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Missed Since</th>
              <th className="text-center px-2 py-2 text-slate-500 font-medium">Severity</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Chase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800">{c.item}</td>
                <td className="px-2 py-2 text-slate-600">{c.owner}</td>
                <td className="px-2 py-2 text-slate-500 truncate max-w-[80px]">{c.home}</td>
                <td className="px-2 py-2 text-slate-600">{c.missed}</td>
                <td className="px-2 py-2 text-center">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.severity === "High" ? "bg-red-100 text-red-700" : c.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{c.severity}</span>
                </td>
                <td className="px-2 py-2">
                  {chased[c.id] ? (
                    <span className="text-[10px] font-semibold text-green-600">✓ Sent</span>
                  ) : (
                    <button
                      onClick={() => handleChase(c)}
                      disabled={chasing[c.id]}
                      className="text-[10px] font-semibold text-orange-600 hover:underline disabled:opacity-50"
                    >
                      {chasing[c.id] ? "Sending…" : "Chase"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-slate-400">No missed checks</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 5: Approval Queue ─────────────────────────────────────────────────
function ApprovalQueueSection({ workflows }) {
  const [expanded, setExpanded] = useState(false);
  const allPending = useMemo(() => workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)), [workflows]);
  const shown = expanded ? allPending : allPending.slice(0, 6);

  function getStage(w) {
    const m = { pending_tl: "TL Review", pending_tm: "TM Review", pending_rm: "RM Review", pending_rsm: "RSM Review", pending_admin: "Admin Review", pending_finance: "Finance Review", pending_fo: "Finance Officer", pending_fm: "Finance Manager", pending_ho: "HR Officer", pending_hm: "HR Manager" };
    return m[w.status] || "Waiting";
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">5</span>
          <h3 className="text-sm font-semibold text-slate-900">Approval & Sign-off Queue <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">{allPending.length}</span></h3>
        </div>
        <Link to="/workflow-command-centre" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View all approvals <ChevronRight className="w-3 h-3" /></Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 text-slate-500 font-medium">Priority</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Item</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Requester</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">SLA</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Status</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {shown.map(w => {
              const meta = WORKFLOW_META[w.entity_type] || WORKFLOW_META._default;
              const isOverdue = w.deadline_datetime && isPast(parseISO(w.deadline_datetime));
              const priorityLabel = w.priority === "critical" ? "Critical" : w.priority === "high" ? "High" : "Medium";
              return (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5"><PriorityBadge p={priorityLabel} /></td>
                  <td className="px-2 py-2.5 font-medium text-slate-800 max-w-[130px] truncate">{meta.label}</td>
                  <td className="px-2 py-2.5 text-slate-600">{w.submitted_by_name || "—"}</td>
                  <td className="px-2 py-2.5 text-slate-500 truncate max-w-[80px]">{w.home_name || "—"}</td>
                  <td className="px-2 py-2.5">
                    <span className={`text-[10px] font-medium ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                      {isOverdue ? "Overdue" : w.deadline_datetime ? "Due today" : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2.5"><StatusBadge s={isOverdue ? "Overdue" : "Waiting"} /></td>
                  <td className="px-2 py-2.5"><Link to="/workflow-command-centre" className="text-[10px] font-semibold text-blue-600 hover:underline">Review</Link></td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-slate-400">No pending approvals</td></tr>}
          </tbody>
        </table>
      </div>
      {allPending.length > 6 && (
        <button onClick={() => setExpanded(e => !e)} className="w-full py-2 text-xs text-blue-600 hover:bg-slate-50 border-t border-slate-100 font-medium">
          {expanded ? "▲ Show less" : `▼ Show ${allPending.length - 6} more`}
        </button>
      )}
    </div>
  );
}

// ── Section 6: Compliance & Readiness ────────────────────────────────────────
// NOTE: client's original ComplianceReadinessWidget (base44 export) is preserved below,
// commented out rather than deleted. It has been replaced by ComplianceReadinessCard,
// which ports over the pre-merge project's own Compliance & Readiness card (Ofsted
// Readiness Score gauge + Top Risk Areas + Quick Actions) so it keeps working unchanged
// per the request to carry that card forward onto the updated Admin Dashboard.
/*
function ComplianceReadinessWidget({ homeChecks, workflows, incidents, homes, residents, missingFromHome, safeguarding, auditSubmissions, policyAcks, ofstedNotifications }) {
  const [riskModal, setRiskModal] = useState(null);

  // 1. Ofsted Readiness — composite from Ofsted notifications + safeguarding + reg32 workflows
  const ofstedReadiness = useMemo(() => {
    let score = 100;
    const pendingNotifs = ofstedNotifications.filter(n => n.status === "pending").length;
    const overdueNotifs = ofstedNotifications.filter(n => n.status === "overdue").length;
    const openSG = safeguarding.filter(s => s.status !== "closed").length;
    const openReg32Wf = workflows.filter(w => w.entity_type === "reg_32" && !["approved", "closed", "rejected"].includes(w.status)).length;
    score -= pendingNotifs * 5;
    score -= overdueNotifs * 10;
    score -= Math.min(openSG * 2, 20);
    score -= Math.min(openReg32Wf * 3, 15);
    return Math.max(0, Math.min(100, score));
  }, [ofstedNotifications, safeguarding, workflows]);

  // 2. Reg 27 Actions — incidents with reg27_trigger not yet reviewed + pending Ofsted notifications
  const reg27Open = useMemo(() => {
    const pendingIncidents = incidents.filter(i => i.reg27_trigger && i.manager_review_status !== "reviewed").length;
    const pendingNotifs = ofstedNotifications.filter(n => n.status === "pending").length;
    return pendingIncidents + pendingNotifs;
  }, [incidents, ofstedNotifications]);

  // 3. Reg 32 Actions — open Reg32 workflows (not approved/closed/rejected)
  const reg32Open = useMemo(() => {
    return workflows.filter(w => w.entity_type === "reg_32" && !["approved", "closed", "rejected"].includes(w.status)).length;
  }, [workflows]);

  // 4. Audit Completeness — average overall_score of submitted/reviewed/approved audits
  const auditPct = useMemo(() => {
    const submitted = auditSubmissions.filter(a => ["submitted", "reviewed", "approved"].includes(a.status));
    if (submitted.length === 0) return 0;
    return Math.round(submitted.reduce((s, a) => s + (a.overall_score || 0), 0) / submitted.length);
  }, [auditSubmissions]);

  // 5. Policy Reading Compliance — acknowledged vs total assigned
  const policyPct = useMemo(() => {
    if (policyAcks.length === 0) return 100;
    const acknowledged = policyAcks.filter(a => a.status === "acknowledged" || a.status === "completed").length;
    return Math.round((acknowledged / policyAcks.length) * 100);
  }, [policyAcks]);

  // 6. Home Checks Completed — non-draft completions vs total
  const homeChecksPct = useMemo(() => {
    if (homeChecks.length === 0) return 0;
    const completed = homeChecks.filter(c => c.overall_status !== "draft").length;
    return Math.round((completed / homeChecks.length) * 100);
  }, [homeChecks]);

  // Overall Service Readiness Score — average of all percentage-based metrics
  const compliancePct = useMemo(() => {
    return Math.round((ofstedReadiness + auditPct + policyPct + homeChecksPct) / 4);
  }, [ofstedReadiness, auditPct, policyPct, homeChecksPct]);

  const readinessLabel = compliancePct >= 80 ? "Good" : compliancePct >= 60 ? "Amber" : "Risk";

  const areaScores = [
    { label: "Ofsted Readiness", pct: ofstedReadiness, color: "bg-blue-500" },
    { label: "Reg 27 Actions", value: `${reg27Open} Open`, alert: reg27Open > 0 },
    { label: "Reg 32 Actions", value: `${reg32Open} Open`, alert: reg32Open > 0 },
    { label: "Audit Completeness", pct: auditPct, color: "bg-green-500" },
    { label: "Policy Reading Compliance", pct: policyPct, color: "bg-purple-500" },
    { label: "Home Checks Completed", pct: homeChecksPct, color: "bg-amber-500" },
  ];

  // Compute live risk counts per home
  const modalData = { incidents, residents, missingFromHome, safeguarding, homeChecks };

  const riskSummary = useMemo(() => {
    const categorise = (home) => {
      const openInc = incidents.filter(i => i.home_id === home.id && (i.status === "open" || i.status === "under_investigation")).length;
      const activeMissing = missingFromHome.filter(m => m.home_id === home.id && m.status === "active").length;
      const criticalSG = safeguarding.filter(s => s.home_id === home.id && s.immediate_risk === "critical" && s.status !== "closed").length;
      const pendingChecks = homeChecks.filter(c => c.home_id === home.id && c.manager_review_status === "pending").length;
      const highRiskYP = residents.filter(r => r.home_id === home.id && (r.risk_level === "high" || r.risk_level === "critical")).length;
      if (openInc + activeMissing + criticalSG >= 2) return "Critical";
      if (openInc === 1 || (highRiskYP >= 2)) return "At Risk";
      if (pendingChecks > 0 || highRiskYP === 1) return "Watch";
      return "Healthy";
    };
    const counts = { Critical: 0, "At Risk": 0, Watch: 0, Healthy: 0 };
    homes.forEach(h => { counts[categorise(h)]++; });
    return [
      { label: "Critical", count: counts.Critical, color: "text-red-600 bg-red-50 border-red-200" },
      { label: "At Risk", count: counts["At Risk"], color: "text-orange-600 bg-orange-50 border-orange-200" },
      { label: "Watch", count: counts.Watch, color: "text-amber-600 bg-amber-50 border-amber-200" },
      { label: "Healthy", count: counts.Healthy, color: "text-green-600 bg-green-50 border-green-200" },
    ];
  }, [homes, incidents, missingFromHome, safeguarding, homeChecks, residents]);

  const radius = 60, circ = 2 * Math.PI * radius;
  const dash = (compliancePct / 100) * circ;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {riskModal && (
        <RiskSummaryModal type={riskModal} homes={homes} data={modalData} onClose={() => setRiskModal(null)} />
      )}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">6</span>
          <h3 className="text-sm font-semibold text-slate-900">Compliance & Readiness</h3>
        </div>
        <Link to="/compliance-hub" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View compliance hub <ChevronRight className="w-3 h-3" /></Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-slate-100">
        <div className="p-4">
          <p className="text-xs text-slate-500 mb-3 font-medium">Service Readiness Score</p>
          <div className="flex items-center gap-4 mb-4">
            <svg width={100} height={100} viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
              <circle cx="70" cy="70" r={radius} fill="none" stroke={compliancePct >= 80 ? "#22c55e" : compliancePct >= 60 ? "#f59e0b" : "#ef4444"} strokeWidth="12"
                strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform="rotate(-90 70 70)" />
              <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1e293b">{compliancePct}%</text>
              <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#64748b">{readinessLabel}</text>
            </svg>
            <div className="space-y-2 flex-1">
              {areaScores.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-32 truncate">{a.label}</span>
                  {a.pct !== undefined ? (
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${a.color} rounded-full`} style={{ width: `${a.pct}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-slate-600">{a.pct}%</span>
                    </div>
                  ) : (
                    <span className={`text-[10px] font-semibold ${a.alert ? "text-red-600" : "text-slate-600"}`}>{a.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500 mb-3 font-medium">Risk Summary</p>
          <div className="grid grid-cols-2 gap-2">
            {riskSummary.map((r, i) => (
              <button key={i} onClick={() => setRiskModal(r.label)}
                className={`border rounded-lg p-3 flex flex-col items-center cursor-pointer hover:shadow-md transition-all ${r.color}`}>
                <span className="text-lg font-black">{r.count}</span>
                <span className="text-[10px] font-medium">{r.label}</span>
                <span className="text-[9px] opacity-70">homes</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
*/

function ComplianceReadinessCard({ data, residents, staff }) {
  return (
    <section className="rounded-xl p-5 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f1d3a 0%, #162347 60%, #1a2d5a 100%)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">Compliance &amp; Readiness</h2>
        <ScoringRulesModal />
      </div>
      <div className="flex flex-col gap-4">
        <OfstedReadinessScore data={data} residents={residents} staff={staff} />
        <div className="border-t border-white/10 pt-4">
          <QuickActionButtons onExport={() => {}} />
        </div>
      </div>
    </section>
  );
}

// ── Section 7: Today's Operating Plan ────────────────────────────────────────
function TodaysOperatingPlan({ appointments, dailyLogs }) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const now = new Date();

  const events = useMemo(() => {
    const apptEvents = appointments
      .filter(a => {
        const d = a.date || a.scheduled_date || (a.start_datetime ? a.start_datetime.slice(0, 10) : "");
        return d === todayStr;
      })
      .map(a => ({
        id: a.id,
        time: a.time || a.start_time || "10:00",
        label: a.appointment_type || "Appointment",
        sub: a.resident_name || "—",
        type: "appointment",
      }));

    const logEvents = dailyLogs
      .filter(l => l.date === todayStr && l.log_time)
      .map(l => ({
        id: `log-${l.id}`,
        time: l.log_time,
        label: l.log_type || "Daily Log",
        sub: l.home_name || l.resident_name || "—",
        type: "log",
      }));

    const defaults = [
      { id: "d1", time: "09:00", label: "Daily Logs Review", sub: "Summit House", type: "overdue" },
      { id: "d2", time: "10:00", label: "Key Work Sessions", sub: "North Lodge", type: "appointment" },
      { id: "d3", time: "11:00", label: "Fire Alarm Test", sub: "North Lodge", type: "appointment" },
      { id: "d4", time: "12:00", label: "Medication Audit", sub: "Meadow View", type: "appointment" },
      { id: "d5", time: "13:00", label: "Staff Handover", sub: "Multiple Homes", type: "log" },
      { id: "d6", time: "15:00", label: "GP Appointment", sub: "Young Person E", type: "appointment" },
      { id: "d7", time: "16:00", label: "Support Plan Review", sub: "Young Person A", type: "appointment" },
      { id: "d8", time: "17:00", label: "Manager Check-in", sub: "All Homes", type: "appointment" },
    ];

    const combined = apptEvents.length + logEvents.length > 0
      ? [...apptEvents, ...logEvents]
      : defaults;

    return combined
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(e => {
        const [h, m] = e.time.split(":").map(Number);
        const eventDate = new Date(); eventDate.setHours(h, m, 0, 0);
        const isPast = eventDate < now;
        const isNow = Math.abs(eventDate - now) < 60 * 60 * 1000;
        let status = "Upcoming";
        if (e.type === "overdue" || (isPast && !isNow)) status = "Overdue";
        else if (isNow) status = "In Progress";
        else if (!isPast) status = "Upcoming";
        return { ...e, status };
      });
  }, [appointments, dailyLogs, todayStr]);

  const statusConfig = {
    "Overdue":    { badge: "bg-red-100 text-red-700",    dot: "bg-red-400",    line: "bg-red-200" },
    "In Progress":{ badge: "bg-blue-100 text-blue-700",  dot: "bg-blue-500",   line: "bg-blue-300" },
    "Upcoming":   { badge: "bg-slate-100 text-slate-500",dot: "bg-slate-400",  line: "bg-slate-200" },
    "Due Now":    { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-400", line: "bg-amber-200" },
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">7</span>
          <h3 className="text-sm font-semibold text-slate-900">Today's Operating Plan</h3>
          <span className="text-xs text-slate-400 font-normal">{events.length} events</span>
        </div>
        <Link to="/residents?tab=appointments" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View full calendar <ChevronRight className="w-3 h-3" /></Link>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
          {events.map((e, i) => {
            const cfg = statusConfig[e.status] || statusConfig.Upcoming;
            const isLast = i === events.length - 1;
            return (
              <div key={e.id} className="flex gap-3 pb-4">
                {/* Timeline column */}
                <div className="flex flex-col items-center w-5 shrink-0">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${cfg.dot} border-2 border-white shadow-sm z-10`} />
                  {!isLast && <div className={`w-0.5 flex-1 mt-1 ${cfg.line} min-h-[32px]`} />}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-slate-400">{e.time}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cfg.badge}`}>{e.status}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{e.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{e.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Section 8: Action Centre (Master Table) ───────────────────────────────────
const ACTION_TABS = ["Overview", "Homes", "Young People", "Staff", "Checks", "Approvals", "Incidents", "Compliance"];

function ActionCentre({ homes, residents, staff, workflows, incidents, missingFromHome, dailyLogs, maintenanceLogs }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const rows = useMemo(() => {
    const result = [];

    if (activeTab === "Overview" || activeTab === "Approvals") {
      workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)).slice(0, 4).forEach(w => {
        const meta = WORKFLOW_META[w.entity_type] || WORKFLOW_META._default;
        const overdue = w.deadline_datetime && isPast(parseISO(w.deadline_datetime));
        result.push({
          id: w.id, priority: w.priority === "critical" ? "Critical" : w.priority === "high" ? "High" : "Medium",
          area: "Approvals", item: meta.label, home: w.home_name || "—", personYP: "—",
          owner: w.submitted_by_name || "—",
          due: w.deadline_datetime ? format(parseISO(w.deadline_datetime), "d MMM") : "—",
          sla: overdue ? "Overdue by 2h" : "Due in 4h",
          status: overdue ? "Overdue" : "Waiting",
          link: "/workflow-command-centre",
        });
      });
    }
    if (activeTab === "Overview" || activeTab === "Incidents") {
      incidents.filter(i => i.status === "under_investigation").slice(0, 2).forEach(i => {
        const home = homes.find(h => h.id === i.home_id);
        const res = residents.find(r => r.id === i.resident_id);
        result.push({
          id: i.id, priority: i.immediate_risk === "critical" ? "Critical" : "High",
          area: "Safeguarding", item: "Safeguarding case", home: home?.name?.split(" - ")[0] || "—",
          personYP: res?.display_name || "—", owner: i.reported_by_name || "—",
          due: "Today", sla: "Overdue by 1h", status: "Overdue", link: "/residents",
        });
      });
    }
    if (activeTab === "Overview" || activeTab === "Young People") {
      missingFromHome.filter(m => m.status === "active").slice(0, 2).forEach(m => {
        result.push({
          id: m.id, priority: "High", area: "Logs", item: "Daily log missing",
          home: m.home_name || "—", personYP: m.resident_name || "—",
          owner: m.reported_by_name || "—", due: "Today", sla: "Overdue by 1h",
          status: "Overdue", link: "/residents",
        });
      });
    }
    if (activeTab === "Overview" || activeTab === "Checks") {
      dailyLogs.filter(l => l.flagged && !l.acknowledged_by).slice(0, 2).forEach(l => {
        result.push({
          id: l.id, priority: "Medium", area: "Logs", item: "Daily log sign-off",
          home: l.home_name || "—", personYP: l.resident_name || "—",
          owner: l.worker_name || "—", due: "Today", sla: "Due in 1d",
          status: "Waiting", link: "/daily-logs",
        });
      });
    }
    if (activeTab === "Overview" || activeTab === "Staff") {
      staff.filter(s => s.status === "active").slice(0, 2).forEach(s => {
        result.push({
          id: s.id, priority: "Low", area: "Plans", item: "Support plan review due",
          home: "—", personYP: "—", owner: s.full_name || "—",
          due: "Tomorrow", sla: "Due in 2d", status: "Waiting", link: "/staff",
        });
      });
    }
    if (activeTab === "Overview" || activeTab === "Compliance") {
      maintenanceLogs.filter(m => m.status === "overdue" || m.status === "pending").slice(0, 2).forEach(m => {
        result.push({
          id: m.id, priority: "Low", area: "Maintenance", item: m.issue_title || "Light repair required",
          home: m.home_name || "—", personYP: "—",
          owner: m.assigned_to_name || "—", due: m.due_date ? format(parseISO(m.due_date), "d MMM") : "—",
          sla: "Due in 2d", status: "Waiting", link: "/care",
        });
      });
    }
    return result.slice(0, 8);
  }, [activeTab, homes, residents, staff, workflows, incidents, missingFromHome, dailyLogs, maintenanceLogs]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">8</span>
        <h3 className="text-sm font-semibold text-slate-900">Service Manager Action Centre</h3>
      </div>
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
        {ACTION_TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${activeTab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Priority</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Area</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Item</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Person / YP</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Owner</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Due</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">SLA</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Status</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5"><PriorityBadge p={row.priority} /></td>
                <td className="px-2 py-2.5 text-slate-500">{row.area}</td>
                <td className="px-2 py-2.5 font-medium text-slate-800 max-w-[150px] truncate">{row.item}</td>
                <td className="px-2 py-2.5 text-slate-500 max-w-[80px] truncate">{row.home}</td>
                <td className="px-2 py-2.5 text-slate-500 max-w-[90px] truncate">{row.personYP}</td>
                <td className="px-2 py-2.5 text-slate-500 max-w-[80px] truncate">{row.owner}</td>
                <td className="px-2 py-2.5 text-slate-500">{row.due}</td>
                <td className="px-2 py-2.5 text-[10px] font-medium text-amber-600">{row.sla}</td>
                <td className="px-2 py-2.5"><StatusBadge s={row.status} /></td>
                <td className="px-2 py-2.5">
                  <Link to={row.link} className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
                    Open <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-slate-400">No items for this view</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
        Showing 1 to {rows.length} of {rows.length} results
      </div>
    </div>
  );
}

// ── Section 9: Finance ───────────────────────────────────────────────────────
const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6"];

function fmtK(v) { return `£${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`; }
function fmtGBP(v) { return `£${(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function getMonthStr(offset = 0) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d.toISOString().slice(0, 7); }
function getMonthLabel(offset = 0) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }); }

function FinanceSection({ homes, invoices, bills, homeExpenses, pettyCashTx }) {
  const homeRevenue = useMemo(() => {
    return homes.map((home, i) => {
      const revenue = (invoices || []).filter(inv => inv.home_id === home.id && inv.status === "paid").reduce((s, inv) => s + (inv.total_amount || 0), 0);
      const expenses = (bills || []).filter(b => b.home_id === home.id).reduce((s, b) => s + (b.amount || 0), 0)
        + (homeExpenses || []).filter(e => e.home_id === home.id).reduce((s, e) => s + (e.amount || 0), 0)
        + (pettyCashTx || []).filter(tx => tx.home_id === home.id && tx.transaction_type === "cash_out").reduce((s, tx) => s + (tx.amount || 0), 0);
      const profit = revenue - expenses;
      return { id: home.id, name: home.name.split(" - ")[0].split(" ").slice(0, 2).join(" "), revenue, expenses, profit, color: CHART_COLORS[i % CHART_COLORS.length] };
    }).filter(h => h.revenue > 0 || h.expenses > 0);
  }, [homes, invoices, bills, homeExpenses, pettyCashTx]);

  const top5 = useMemo(() => [...homeRevenue].sort((a, b) => b.revenue - a.revenue).slice(0, 5), [homeRevenue]);
  const bottom5 = useMemo(() => [...homeRevenue].sort((a, b) => a.profit - b.profit).slice(0, 5), [homeRevenue]);

  const sixMonthTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthStr = getMonthStr(i - 5);
      const label = getMonthLabel(i - 5);
      const revenue = (invoices || []).filter(inv => inv.status === "paid" && (inv.period_from || inv.invoice_date || "").startsWith(monthStr)).reduce((s, inv) => s + (inv.total_amount || 0), 0);
      const expenses = (bills || []).filter(b => (b.due_date || "").startsWith(monthStr)).reduce((s, b) => s + (b.amount || 0), 0)
        + (homeExpenses || []).filter(e => (e.date || "").startsWith(monthStr)).reduce((s, e) => s + (e.amount || 0), 0)
        + (pettyCashTx || []).filter(tx => tx.transaction_type === "cash_out" && (tx.date || "").startsWith(monthStr)).reduce((s, tx) => s + (tx.amount || 0), 0);
      return { label, revenue, expenses, profit: revenue - expenses };
    });
  }, [invoices, bills, homeExpenses, pettyCashTx]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}:</span>
            <span className="font-semibold" style={{ color: p.color }}>{fmtGBP(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
          <h3 className="text-sm font-semibold text-slate-900">Financial Performance</h3>
        </div>
        <Link to="/finance" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View Finance <ChevronRight className="w-3 h-3" /></Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-x divide-slate-100">

        {/* Top 5 Homes by Revenue */}
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-700 mb-1">🏆 Top 5 Performing Homes</p>
          <p className="text-[10px] text-slate-400 mb-3">By total revenue collected</p>
          {top5.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No revenue data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top5} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={68} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue">
                  {top5.map((entry, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom 5 by Profit */}
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-700 mb-1">⚠️ Bottom 5 Homes by Profit</p>
          <p className="text-[10px] text-slate-400 mb-3">Homes with lowest net profit</p>
          {bottom5.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bottom5} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={68} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue" fill="#6366f1" />
                <Bar dataKey="expenses" radius={[0, 6, 6, 0]} name="Expenses" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 6-Month Line Trend */}
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-700 mb-1">📈 6-Month Trend</p>
          <p className="text-[10px] text-slate-400 mb-3">Revenue, Expenses & Profit</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sixMonthTrend} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRevenue)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradExpenses)" dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradProfit)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, staffProfile } = useOutletContext();
  const { isMobile } = useMobile();
  const queryClient = useQueryClient();

  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [homeFilter, setHomeFilter] = useState("all");
  const [reg27Modal, setReg27Modal] = useState(null);
  const [showComplianceReport, setShowComplianceReport] = useState(false);
  const [dateRange, setDateRange] = useState({ from: startOfYear(new Date()), to: new Date() });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const DATE_PRESETS = [
    { label: "Year to Date", from: startOfYear(new Date()), to: new Date() },
    { label: "Today", from: new Date(), to: new Date() },
    { label: "Last 7 days", from: subDays(new Date(), 7), to: new Date() },
    { label: "Last 30 days", from: subDays(new Date(), 30), to: new Date() },
    { label: "This month", from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    { label: "Last 3 months", from: subDays(new Date(), 90), to: new Date() },
  ];

  const handleRefresh = useCallback(() => { queryClient.invalidateQueries(); }, [queryClient]);

  // Direct entity queries
  const { data: allHomes = [] } = useQuery({ queryKey: ["homes-dashboard"], queryFn: () => base44.entities.Home.filter({ status: "active" }) });
  const { data: residents = [] } = useQuery({ queryKey: ["residents-dashboard"], queryFn: () => base44.entities.Resident.filter({}, "-created_date", 500), staleTime: 0 });
  const { data: staffProfiles = [] } = useQuery({ queryKey: ["staff-dashboard"], queryFn: () => base44.entities.StaffProfile.filter({}) });
  const { data: attendanceLogs = [] } = useQuery({ queryKey: ["attendance-dashboard"], queryFn: () => base44.entities.AttendanceLog.filter({}), staleTime: 60000 });
  const { data: workflows = [] } = useQuery({ queryKey: ["workflows-dashboard"], queryFn: () => base44.entities.ApprovalWorkflow.filter({}, "-created_date", 100), staleTime: 60000 });
  const { data: incidents = [] } = useQuery({ queryKey: ["accidents-dashboard"], queryFn: () => base44.entities.Incident.filter({}, "-incident_datetime", 100) });
  const { data: safeguarding = [] } = useQuery({ queryKey: ["safeguarding-dashboard"], queryFn: () => base44.entities.SafeguardingRecord.filter({}) });
  const { data: missingFromHome = [] } = useQuery({ queryKey: ["mfh-records"], queryFn: () => base44.entities.MissingFromHome.filter({}, "-reported_missing_datetime", 200) });
  const { data: homeChecks = [] } = useQuery({ queryKey: ["home-checks-dashboard"], queryFn: () => base44.entities.HomeCheckCompletion.filter({}) });
  const { data: dailyLogs = [] } = useQuery({ queryKey: ["daily-logs-dashboard"], queryFn: () => base44.entities.DailyLog.filter({}, "-date", 200) });
  const { data: maintenanceLogs = [] } = useQuery({ queryKey: ["maintenance-dashboard"], queryFn: () => base44.entities.PropertyMaintenance.filter({}) });
  const { data: riskAssessments = [] } = useQuery({ queryKey: ["risks-dashboard"], queryFn: () => base44.entities.RiskAssessment.filter({}) });
  const { data: supportPlans = [] } = useQuery({ queryKey: ["support-plans-dashboard"], queryFn: () => base44.entities.SupportPlan.filter({}) });
  const { data: appointments = [] } = useQuery({ queryKey: ["dashboard-appointments"], queryFn: () => base44.entities.Appointment.filter({}, "-start_datetime", 200), staleTime: 5 * 60 * 1000 });
  const { data: pendingReg27 = [] } = useQuery({ queryKey: ["reg27-pending"], queryFn: () => base44.entities.OfstedNotification.filter({ status: "pending" }, "-event_date", 20), refetchInterval: 60000, staleTime: 0 });
  const { data: auditSubmissions = [] } = useQuery({ queryKey: ["audit-submissions-dashboard"], queryFn: () => base44.entities.InternalAuditSubmission.filter({}, "-audit_date", 100), staleTime: 5 * 60 * 1000 });
  const { data: policyAcks = [] } = useQuery({ queryKey: ["policy-acks-dashboard"], queryFn: () => base44.entities.PolicyAcknowledgement.filter({}, "-created_date", 500), staleTime: 5 * 60 * 1000 });
  const { data: ofstedNotifications = [] } = useQuery({ queryKey: ["ofsted-notifs-dashboard"], queryFn: () => base44.entities.OfstedNotification.filter({}, "-created_date", 100), staleTime: 5 * 60 * 1000 });
  // Ported alongside the Compliance & Readiness card — not fetched by the client's original dashboard.
  const { data: complaints = [] } = useQuery({ queryKey: ["complaints"], queryFn: () => base44.entities.Complaint.filter({}, "-received_datetime", 200) });
  const { data: bodyMaps = [] } = useQuery({ queryKey: ["body-maps"], queryFn: () => base44.entities.BodyMap.filter({}, "-recorded_datetime", 200) });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices-dashboard"], queryFn: () => base44.entities.PlacementInvoice.filter({}) });
  const { data: bills = [] } = useQuery({ queryKey: ["bills-dashboard"], queryFn: () => base44.entities.Bill.filter({}) });
  const { data: homeExpenses = [] } = useQuery({ queryKey: ["home-expenses-dashboard"], queryFn: () => base44.entities.HomeExpense.filter({}, "-date", 500) });
  const { data: pettyCashTx = [] } = useQuery({ queryKey: ["petty-cash-tx-dashboard"], queryFn: () => base44.entities.PettyCashTransaction.filter({}, "-date", 500) });

  // Apply filters
  const filteredHomes = useMemo(() => allHomes.filter(h => {
    if (homeFilter !== "all") return h.id === homeFilter;
    if (propertyTypeFilter !== "all") return h.type === propertyTypeFilter;
    return true;
  }), [allHomes, homeFilter, propertyTypeFilter]);

  // Date range filtering helper
  const filterByDateRange = useCallback((records, dateField) => {
    if (!dateRange?.from || !dateRange?.to) return records;
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    return records.filter(r => {
      const val = r[dateField];
      if (!val) return false;
      const recStr = typeof val === "string" ? val.slice(0, 10) : format(new Date(val), "yyyy-MM-dd");
      return recStr >= fromStr && recStr <= toStr;
    });
  }, [dateRange]);

  // Apply date range filter to all date-based data
  const dateFilteredIncidents = useMemo(() => filterByDateRange(incidents, "incident_datetime"), [incidents, filterByDateRange]);
  const dateFilteredDailyLogs = useMemo(() => filterByDateRange(dailyLogs, "date"), [dailyLogs, filterByDateRange]);
  const dateFilteredWorkflows = useMemo(() => filterByDateRange(workflows, "submitted_at"), [workflows, filterByDateRange]);
  const dateFilteredSafeguarding = useMemo(() => filterByDateRange(safeguarding, "date_of_concern"), [safeguarding, filterByDateRange]);
  const dateFilteredMissingFromHome = useMemo(() => filterByDateRange(missingFromHome, "reported_missing_datetime"), [missingFromHome, filterByDateRange]);
  const dateFilteredHomeChecks = useMemo(() => filterByDateRange(homeChecks, "submitted_at"), [homeChecks, filterByDateRange]);
  const dateFilteredAppointments = useMemo(() => filterByDateRange(appointments, "start_datetime"), [appointments, filterByDateRange]);
  const dateFilteredAttendanceLogs = useMemo(() => filterByDateRange(attendanceLogs, "clock_in_time"), [attendanceLogs, filterByDateRange]);
  const dateFilteredInvoices = useMemo(() => filterByDateRange(invoices, "invoice_date"), [invoices, filterByDateRange]);
  const dateFilteredBills = useMemo(() => filterByDateRange(bills, "due_date"), [bills, filterByDateRange]);
  const dateFilteredHomeExpenses = useMemo(() => filterByDateRange(homeExpenses, "date"), [homeExpenses, filterByDateRange]);
  const dateFilteredPettyCashTx = useMemo(() => filterByDateRange(pettyCashTx, "date"), [pettyCashTx, filterByDateRange]);
  const dateFilteredMaintenanceLogs = useMemo(() => filterByDateRange(maintenanceLogs, "date"), [maintenanceLogs, filterByDateRange]);
  // Ported alongside the Compliance & Readiness card.
  const dateFilteredComplaints = useMemo(() => filterByDateRange(complaints, "received_datetime"), [complaints, filterByDateRange]);
  const dateFilteredBodyMaps = useMemo(() => filterByDateRange(bodyMaps, "recorded_datetime"), [bodyMaps, filterByDateRange]);

  const isAdmin = ["admin", "rsm", "regional_manager"].includes(staffProfile?.role || user?.role);

  const content = (
    <div className="min-h-screen bg-slate-50">
      {/* Reg 27 Modal */}
      {reg27Modal && (
        <Reg27ActionModal notification={reg27Modal} staffProfile={staffProfile}
          onClose={() => setReg27Modal(null)}
          onSaved={() => { setReg27Modal(null); queryClient.invalidateQueries({ queryKey: ["reg27-pending"] }); }}
        />
      )}
      {showComplianceReport && (
        <AppointmentComplianceReport residents={residents} homes={filteredHomes} onClose={() => setShowComplianceReport(false)} />
      )}

      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-xs text-slate-500">Live operational view across homes, young people, staff, approvals and compliance.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Service type tabs */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium bg-white">
            {[{ v: "all", l: "All" }, { v: "18_plus", l: "18+ Accommodation" }, { v: "24_hours", l: "24 Hours Housing" }, { v: "outreach", l: "Outreach" }].map(t => (
              <button key={t.v} onClick={() => setPropertyTypeFilter(t.v)}
                className={`px-3 py-1.5 transition-colors ${propertyTypeFilter === t.v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {t.l}
              </button>
            ))}
          </div>
          {/* Home filter */}
          <select value={homeFilter} onChange={e => setHomeFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="all">All homes</option>
            {allHomes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          {/* Date Range Picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-700">
                  {format(dateRange.from, "d MMM yyyy")} — {format(dateRange.to, "d MMM yyyy")}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex">
                {/* Presets */}
                <div className="border-r border-slate-100 p-3 flex flex-col gap-1 min-w-[130px]">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Quick Select</p>
                  {DATE_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => { setDateRange({ from: preset.from, to: preset.to }); setDatePickerOpen(false); }}
                      className="text-xs text-left px-2 py-1.5 rounded hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {/* Calendar */}
                <div className="p-2">
                  <CalendarUI
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from) setDateRange({ from: range.from, to: range.to || range.from });
                      if (range?.from && range?.to) setDatePickerOpen(false);
                    }}
                    numberOfMonths={2}
                    initialFocus
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Zap className="w-3.5 h-3.5" /> Ask AI Assistant
          </Button>
        </div>
      </div>

      {/* Reg 27 Alert Banner */}
      {isAdmin && pendingReg27.length > 0 && (
        <div className="mx-6 mt-3 rounded-xl bg-red-900/90 border border-red-700 p-3 flex items-center gap-3 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
          <span className="text-xs font-semibold text-red-200">{pendingReg27.length} Reg 27 Action{pendingReg27.length > 1 ? "s" : ""} Required</span>
          {pendingReg27.slice(0, 2).map(n => (
            <Button key={n.id} size="sm" onClick={() => setReg27Modal(n)} className="h-6 text-xs bg-white text-red-700 hover:bg-red-50 font-bold px-3">
              Act Now — {n.resident_name || n.notification_type}
            </Button>
          ))}
        </div>
      )}

      {/* 1. KPI Banner */}
      <KPIBanner homes={filteredHomes} residents={residents} staff={staffProfiles} attendanceLogs={dateFilteredAttendanceLogs}
        incidents={dateFilteredIncidents} dailyLogs={dateFilteredDailyLogs} workflows={dateFilteredWorkflows} homeChecks={dateFilteredHomeChecks} dateRange={dateRange} />

      {/* 2. Homes + YP side by side */}
      <div className="px-6 pb-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HomesTable homes={filteredHomes} residents={residents} incidents={dateFilteredSafeguarding}
          missingFromHome={dateFilteredMissingFromHome} homeChecks={dateFilteredHomeChecks}
          homeFilter={homeFilter} propertyTypeFilter={propertyTypeFilter} />
        <YPSafeguardingWidget residents={residents} safeguarding={dateFilteredSafeguarding}
          missingFromHome={dateFilteredMissingFromHome} riskAssessments={riskAssessments}
          supportPlans={supportPlans} appointments={dateFilteredAppointments} />
      </div>

      {/* 3. Finance */}
      <div className="px-6 pb-4">
        <FinanceSection homes={filteredHomes} invoices={dateFilteredInvoices} bills={dateFilteredBills} homeExpenses={dateFilteredHomeExpenses} pettyCashTx={dateFilteredPettyCashTx} />
      </div>

      {/* 4 + 5 two columns, 6 below */}
      <div className="px-6 pb-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <MissedChecklistsWidget homeChecks={dateFilteredHomeChecks} homes={filteredHomes} dailyLogs={dateFilteredDailyLogs} residents={residents} />
        <ApprovalQueueSection workflows={dateFilteredWorkflows} />
      </div>
      <div className="px-6 pb-4">
        {/* Pre-merge Compliance & Readiness card, ported in place of the client's
            ComplianceReadinessWidget (kept commented out above) at the user's request. */}
        <ComplianceReadinessCard
          data={{
            reg27Notifications: pendingReg27,
            reg32Reports: [],
            mfhRecords: dateFilteredMissingFromHome,
            accidentReports: dateFilteredIncidents,
            bodyMaps: dateFilteredBodyMaps,
            homeChecks: dateFilteredHomeChecks,
            dailyLogs: dateFilteredDailyLogs,
            maintenanceLogs: dateFilteredMaintenanceLogs,
            medicationRecords: [],
            supervisionRecords: [],
            trainingRecords: [],
            placementPlans: [],
            supportPlans: [],
            pathwayPlans: [],
            ilsPlans: [],
            dashboardAppointments: dateFilteredAppointments,
            complaints: dateFilteredComplaints,
          }}
          residents={residents}
          staff={staffProfiles}
        />
      </div>

      {/* 7. Today's Plan */}
      <div className="px-6 pb-4">
        <TodaysOperatingPlan appointments={appointments} dailyLogs={dailyLogs} />
      </div>

      {/* 8. Action Centre */}
      <div className="px-6 pb-4">
        <ActionCentre homes={filteredHomes} residents={residents} staff={staffProfiles}
          workflows={dateFilteredWorkflows} incidents={dateFilteredSafeguarding} missingFromHome={dateFilteredMissingFromHome}
          dailyLogs={dateFilteredDailyLogs} maintenanceLogs={dateFilteredMaintenanceLogs} />
      </div>

      {/* 9. Staff & Shift */}
      <div className="px-6 pb-4">
        <StaffShiftWidget staff={staffProfiles} attendanceLogs={dateFilteredAttendanceLogs} homes={filteredHomes} />
      </div>

      {/* AI Insights */}
      <div className="px-6 pb-6">
        <AIInsightsPanel residents={residents} reports={dateFilteredIncidents} logs={dateFilteredDailyLogs} />
      </div>
    </div>
  );

  if (isMobile) {
    return <PullToRefresh onRefresh={() => queryClient.refetchQueries()}>{content}</PullToRefresh>;
  }
  return content;
}