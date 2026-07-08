import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { useTrainingData } from "@/components/staff/training/useTrainingData";
import { calcTrainingStatus } from "@/components/staff/training/TrainingStatusBadge";
import { Link } from "react-router-dom";
import { format, subMonths, isAfter, isBefore, addDays } from "date-fns";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp,
  Users, Home, BookOpen, FileText, ChevronRight, Activity,
  ShieldCheck, AlertOctagon, ClipboardList, GraduationCap, Info
} from "lucide-react";
import HRDashboardTrainingMatrix from "@/components/staff/hr-dashboard/HRDashboardTrainingMatrix";
import TrainingStatDetailModal from "@/components/staff/policy/TrainingStatDetailModal";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────
function RagBadge({ score }) {
  if (score >= 85) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Healthy</span>;
  if (score >= 65) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Watch</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">At Risk</span>;
}

function ScoreRing({ score, size = 80 }) {
  const isSmall = size < 50;
  const strokeWidth = isSmall ? 4 : 8;
  const r = (size / 2) - (strokeWidth / 2) - 1;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circ;
  const color = score >= 85 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
  const label = score >= 85 ? "Good" : score >= 65 ? "Amber" : "Risk";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={isSmall ? size / 2 + 3 : size / 2 - 4} textAnchor="middle" fontSize={isSmall ? "10" : "16"} fontWeight="bold" fill="#1e293b">{score}%</text>
      {!isSmall && <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="10" fill="#64748b">{label}</text>}
    </svg>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color = "blue", alert = false, onClick, onInfoClick }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    teal: "bg-teal-50 text-teal-600",
  };
  return (
    <button onClick={onClick} className={`bg-white rounded-xl border ${alert ? "border-red-300" : "border-slate-200"} p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow text-left`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium leading-tight">{label}</p>
        <div className="flex items-center gap-1.5">
          {onInfoClick && (
            <button onClick={(e) => { e.stopPropagation(); onInfoClick(); }} className="text-slate-400 hover:text-blue-600 transition-colors">
              <Info className="w-4 h-4" />
            </button>
          )}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </div>
      <p className={`text-2xl font-black ${alert && value > 0 ? "text-red-600" : "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </button>
  );
}

// ── KPI Detail Modal ──────────────────────────────────────────────────────────
function KpiDetailModal({ title, icon: Icon, items = [], onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-hidden" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50 shrink-0">
          {Icon && <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Icon className="w-4 h-4" /></div>}
          <h2 className="flex-1 text-sm font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {items.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">No items to display</p>
          ) : (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.name || item.label || item.title}</p>
                    {item.detail && <p className="text-[10px] text-slate-500">{item.detail}</p>}
                  </div>
                  {item.badge && <span className={`text-[9px] font-bold px-2 py-1 rounded shrink-0 ${item.badgeColor || "bg-slate-200 text-slate-700"}`}>{item.badge}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Domain Score Calculation ──────────────────────────────────────────────────
function useDomainScores({ homes, staff, auditSubmissions, homeChecks, safeguarding, mfhRecords, trainingRecords, policyAcks, policyAssignments, workflows, incidents, filteredStaff = [], activeCourses = [], recordMap = {} }) {
  return useMemo(() => {
    const now = new Date();

    // 1. Safeguarding score
    const openSG = safeguarding.filter(s => s.status === "open" || s.status === "under_investigation").length;
    const totalSG = safeguarding.length;
    const sgScore = totalSG === 0 ? 100 : Math.max(0, Math.round(100 - (openSG / Math.max(totalSG, 1)) * 60));

    // 2. Staffing / DBS & RTW
    const activeStaff = staff.filter(s => s.status === "active");
    const dbsExpiring = activeStaff.filter(s => {
      const dbsExp = !s.dbs_expiry || isBefore(new Date(s.dbs_expiry), addDays(now, 90));
      const rtwExp = !s.rtw_checked || (s.rtw_expiry_date ? isBefore(new Date(s.rtw_expiry_date), addDays(now, 90)) : false);
      return dbsExp || rtwExp;
    }).length;
    const dbsScore = activeStaff.length === 0 ? 100 : Math.round(((activeStaff.length - dbsExpiring) / Math.max(activeStaff.length, 1)) * 100);

    // 3. Training compliance (only check for overdue/expired)
    const nonCompliant = activeStaff.filter(s => {
      if (activeCourses.length > 0 && Object.keys(recordMap).length > 0) {
        return activeCourses.some(c => {
          const rec = recordMap[`${s.id}:${c.id}`];
          return rec && calcTrainingStatus(rec) === "expired";
        });
      }
      const recs = trainingRecords.filter(r => r.staff_id === s.id);
      return recs.some(r => calcTrainingStatus(r) === "expired");
    }).length;
    const trainingScore = activeStaff.length === 0 ? 100 : Math.round(((activeStaff.length - nonCompliant) / Math.max(activeStaff.length, 1)) * 100);

    // 4. Policy acknowledgement
    const ackRequired = policyAssignments.filter(a => ["assigned", "pending", "overdue"].includes(a.status?.toLowerCase())).length;
    const totalAcks = policyAssignments.length;
    const policyScore = totalAcks === 0 ? 100 : Math.max(0, Math.round(100 - (ackRequired / Math.max(totalAcks, 1)) * 100));

    // 5. Internal audit score
    const recentAudits = auditSubmissions.filter(a => a.status === "approved" || a.status === "reviewed");
    const avgAuditScore = recentAudits.length > 0
      ? Math.round(recentAudits.reduce((s, a) => s + (a.overall_score || 100), 0) / recentAudits.length)
      : 100;

    // 6. Home checks compliance
    const recentChecks = homeChecks.filter(c => c.overall_status !== "draft");
    const checkScore = homeChecks.length === 0 ? 100 : Math.round((recentChecks.length / Math.max(homeChecks.length, 1)) * 100);

    // 7. Regulatory actions (approvals)
    const openReg = workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)).length;
    const regScore = openReg === 0 ? 100 : Math.max(30, 100 - openReg * 6);

    // Overall
    const overall = Math.round((sgScore + dbsScore + trainingScore + policyScore + avgAuditScore + checkScore + regScore) / 7);

    return {
      overall,
      domains: [
        { name: "Safeguarding", score: sgScore, fullMark: 100 },
        { name: "DBS & RTW", score: dbsScore, fullMark: 100 },
        { name: "Training", score: trainingScore, fullMark: 100 },
        { name: "Policy Acks", score: policyScore, fullMark: 100 },
        { name: "Audits", score: avgAuditScore, fullMark: 100 },
        { name: "Home Checks", score: checkScore, fullMark: 100 },
        { name: "Reg Actions", score: regScore, fullMark: 100 },
      ],
      raw: { openSG, dbsExpiring, nonCompliant, ackRequired, recentAudits, checkScore, openReg },
    };
  }, [homes, staff, auditSubmissions, homeChecks, safeguarding, mfhRecords, trainingRecords, policyAcks, policyAssignments, workflows, incidents, activeCourses, recordMap]);
}

// ── Home Health Grid ──────────────────────────────────────────────────────────
function HomeHealthGrid({ homes, auditSubmissions, homeChecks, incidents, safeguarding }) {
  const [expanded, setExpanded] = useState(false);

  const homeScores = useMemo(() => {
    return homes.map(home => {
      const latestAudit = auditSubmissions.filter(a => String(a.home_id) === String(home.id)).sort((a, b) => (b.audit_date || "").localeCompare(a.audit_date || ""))[0];
      const pendingChecks = homeChecks.filter(c => String(c.home_id) === String(home.id) && c.manager_review_status === "pending").length;
      const openSG = safeguarding.filter(s => String(s.home_id) === String(home.id) && s.status !== "closed").length;
      const openInc = incidents.filter(i => String(i.home_id) === String(home.id) && i.manager_review_status !== "reviewed").length;

      let score = 100;
      if (latestAudit) score = Math.min(score, latestAudit.overall_score || 100);
      score -= pendingChecks * 5;
      score -= openSG * 8;
      score -= openInc * 5;
      score = Math.max(0, Math.round(score));

      return { home, score, latestAudit, pendingChecks, openSG, openInc };
    });
  }, [homes, auditSubmissions, homeChecks, incidents, safeguarding]);

  const displayedScores = homeScores;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Home className="w-4 h-4 text-blue-500" /> Home-by-Home Health
        </h3>
        <Link to="/homes-hub" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Home</th>
              <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Score</th>
              <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Last Audit</th>
              <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Checks Pending</th>
              <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Open SG</th>
              <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Open Incidents</th>
              <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Status</th>
              <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayedScores.map(({ home, score, latestAudit, pendingChecks, openSG, openInc }) => (
              <tr key={home.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800 max-w-[130px] truncate">{home.name.split(" - ")[0]}</td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center">
                    <ScoreRing score={score} size={44} />
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-slate-500">
                  {latestAudit?.audit_date ? format(new Date(latestAudit.audit_date), "dd MMM yy") : <span className="text-red-500 font-medium">None</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  {pendingChecks > 0 ? <span className="text-amber-600 font-bold">{pendingChecks}</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  {openSG > 0 ? <span className="text-red-600 font-bold">{openSG}</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  {openInc > 0 ? <span className="text-orange-600 font-bold">{openInc}</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3 text-center"><RagBadge score={score} /></td>
                <td className="px-3 py-3">
                  <Link to={`/compliance-hub?mainTab=qa&qaTab=qa&view=history&homeId=${home.id}`} className="text-[10px] font-semibold text-blue-600 hover:underline">Audit →</Link>
                </td>
              </tr>
            ))}
            {homeScores.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">No homes found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Urgent Actions Panel ──────────────────────────────────────────────────────
function UrgentActionsPanel({ safeguarding, mfhRecords, workflows, auditActions, staff, residents = [] }) {
  const items = useMemo(() => {
    const list = [];

    // Open safeguarding cases
    safeguarding.filter(s => s.status !== "closed" && s.immediate_risk === "critical").slice(0, 3).forEach(s => {
      list.push({ id: s.id, priority: "Critical", area: "Safeguarding", item: `Critical SG — ${s.resident_name || residents.find(r => r.id === s.resident_id)?.display_name || "Unknown"}`, home: s.home_name || "—", due: "Immediate", link: "/residents" });
    });

    // Missing from home still active
    mfhRecords.filter(m => m.status === "active").slice(0, 3).forEach(m => {
      list.push({ id: m.id, priority: "High", area: "Missing", item: `Missing — ${m.resident_name || residents.find(r => r.id === m.resident_id)?.display_name || "Unknown"}`, home: m.home_name || "—", due: "Active", link: "/residents" });
    });

    // Pending regulatory workflows
    workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status) && w.priority === "critical").slice(0, 3).forEach(w => {
      list.push({ id: w.id, priority: "High", area: "Regulatory", item: w.entity_type?.replace(/_/g, " ") || "Workflow", home: w.home_name || "—", due: "SLA breach", link: "/workflow-command-centre" });
    });

    // Overdue audit actions
    auditActions.filter(a => a.status === "overdue" || (a.deadline && new Date(a.deadline) < new Date() && a.status !== "completed")).slice(0, 3).forEach(a => {
      list.push({ id: a.id, priority: "Medium", area: "Audit", item: a.action_required?.slice(0, 50) || "Audit action overdue", home: "—", due: a.deadline ? format(new Date(a.deadline), "dd MMM") : "Overdue", link: "/compliance-hub" });
    });

    // Staff with no DBS
    staff.filter(s => s.status === "active" && (!s.dbs_expiry || new Date(s.dbs_expiry) < new Date())).slice(0, 2).forEach(s => {
      list.push({ id: s.id, priority: "High", area: "DBS", item: `DBS Expired — ${s.full_name}`, home: "—", due: "Immediate", link: "/staff" });
    });

    return list.sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2 };
      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
    }).slice(0, 10);
  }, [safeguarding, mfhRecords, workflows, auditActions, staff]);

  const priorityStyle = { Critical: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700", Medium: "bg-amber-100 text-amber-700" };
  const areaColor = { Safeguarding: "text-red-600", Missing: "text-purple-600", Regulatory: "text-blue-600", Audit: "text-slate-600", DBS: "text-orange-600" };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" /> Urgent Compliance Actions
          {items.length > 0 && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">{items.length}</span>}
        </h3>
      </div>
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No urgent actions</p>
          <p className="text-xs text-slate-400">All compliance items are in order</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${priorityStyle[item.priority] || "bg-slate-100 text-slate-600"}`}>{item.priority}</span>
              <span className={`text-[10px] font-semibold shrink-0 ${areaColor[item.area] || "text-slate-600"}`}>{item.area}</span>
              <span className="text-xs text-slate-700 flex-1 truncate">{item.item}</span>
              <span className="text-[10px] text-slate-400 shrink-0">{item.home}</span>
              <span className="text-[10px] font-medium text-red-500 shrink-0">{item.due}</span>
              <Link to={item.link} className="text-[10px] font-semibold text-blue-600 hover:underline shrink-0">Act →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Training & Policy Compliance Panel ───────────────────────────────────────
function WorkforceCompliancePanel({ staff, trainingRecords, policyAcks, policyAssignments, activeCourses, recordMap }) {
  const [activeModal, setActiveModal] = useState(null);
  const now = new Date();
  const activeStaff = staff.filter(s => s.status === "active");
  const in90Days = addDays(now, 90);

  const dbsExpiringSoon = activeStaff.filter(s => {
    const dbsExp = !s.dbs_expiry || isBefore(new Date(s.dbs_expiry), in90Days);
    const rtwExp = !s.rtw_checked || (s.rtw_expiry_date ? isBefore(new Date(s.rtw_expiry_date), in90Days) : false);
    return dbsExp || rtwExp;
  });

  const trainingByStaff = {};
  trainingRecords.forEach(r => {
    if (!trainingByStaff[r.staff_id]) trainingByStaff[r.staff_id] = [];
    trainingByStaff[r.staff_id].push(r);
  });
  const trainingOverdue = activeStaff.filter(s => {
    if (activeCourses && recordMap && activeCourses.length > 0) {
      return activeCourses.some(c => {
        const rec = recordMap[`${s.id}:${c.id}`];
        return rec && calcTrainingStatus(rec) === "expired";
      });
    }
    const recs = trainingByStaff[s.id] || [];
    return recs.some(r => r.expiry_date && isBefore(new Date(r.expiry_date), now));
  });

  const pendingAcks = policyAssignments.filter(a => ["assigned", "pending", "overdue"].includes(a.status?.toLowerCase()));

  const modalData = useMemo(() => ({
    dbs: dbsExpiringSoon.map(s => {
      const dbsExp = !s.dbs_expiry || isBefore(new Date(s.dbs_expiry), in90Days);
      const rtwExp = !s.rtw_checked || (s.rtw_expiry_date ? isBefore(new Date(s.rtw_expiry_date), in90Days) : false);
      let detail = "Expiring soon";
      if (dbsExp && rtwExp) detail = "DBS & RTW Issue";
      else if (dbsExp) detail = !s.dbs_expiry ? "No DBS" : `DBS: ${format(new Date(s.dbs_expiry), "dd MMM yyyy")}`;
      else detail = !s.rtw_checked ? "No RTW" : `RTW: ${format(new Date(s.rtw_expiry_date), "dd MMM yyyy")}`;
      return { name: s.full_name, detail, badge: "Expiring" };
    }),
    training: trainingOverdue.map(s => ({ name: s.full_name, detail: "Training expired", badge: "Overdue" })),
    policy: pendingAcks.map(a => ({ name: a.staff_name || a.staff_id, detail: a.policy_title || a.policy_name, badge: a.status }))
  }), [dbsExpiringSoon, trainingOverdue, pendingAcks, in90Days]);

  const sections = [
    {
      label: "DBS / RTW Expiring (90 days)",
      count: dbsExpiringSoon.length,
      total: activeStaff.length,
      color: dbsExpiringSoon.length > 0 ? "text-amber-600" : "text-green-600",
      bg: dbsExpiringSoon.length > 0 ? "bg-amber-50" : "bg-green-50",
      items: dbsExpiringSoon.slice(0, 4).map(s => s.full_name),
      link: "/staff",
    },
    {
      label: "Training Overdue",
      count: trainingOverdue.length,
      total: activeStaff.length,
      color: trainingOverdue.length > 0 ? "text-red-600" : "text-green-600",
      bg: trainingOverdue.length > 0 ? "bg-red-50" : "bg-green-50",
      items: trainingOverdue.slice(0, 4).map(s => s.full_name),
      link: "/staff",
    },
    {
      label: "Policy Acknowledgements Pending",
      count: pendingAcks.length,
      total: policyAssignments.length,
      color: pendingAcks.length > 0 ? "text-orange-600" : "text-green-600",
      bg: pendingAcks.length > 0 ? "bg-orange-50" : "bg-green-50",
      items: [],
      link: "/compliance-hub",
    },
  ];

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-500" /> Workforce Compliance
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {sections.map((s, i) => (
            <div key={i} className={`px-4 py-3 ${s.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-slate-700">{s.label}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-base font-black ${s.color}`}>{s.count}</span>
                  <span className="text-xs text-slate-400">/ {s.total}</span>
                  <button onClick={() => setActiveModal(i === 0 ? 'dbs' : i === 1 ? 'training' : 'policy')} className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer">View →</button>
                </div>
              </div>
              {s.items.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.items.map((name, j) => (
                    <span key={j} className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600">{name}</span>
                  ))}
                  {s.count > 4 && <span className="text-[10px] text-slate-400">+{s.count - 4} more</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {activeModal && (
        <KpiDetailModal
          title={activeModal === 'dbs' ? 'DBS / RTW Expiring' : activeModal === 'training' ? 'Training Overdue' : 'Policy Acknowledgements Pending'}
          items={modalData[activeModal] || []}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

// ── Audit Score Trend ─────────────────────────────────────────────────────────
function AuditTrendChart({ auditSubmissions }) {
  const data = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(new Date(), 5 - i);
      const monthStr = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMM");
      const monthAudits = auditSubmissions.filter(a => (a.audit_date || "").startsWith(monthStr));
      const avg = monthAudits.length > 0
        ? Math.round(monthAudits.reduce((s, a) => s + (a.overall_score || 100), 0) / monthAudits.length)
        : null;
      return { month: monthLabel, score: avg, count: monthAudits.length };
    });
  }, [auditSubmissions]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" /> Audit Score Trend (6 months)
        </h3>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
            <Tooltip formatter={(v) => v !== null ? [`${v}%`, "Avg Score"] : ["No data", ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Score">
              {data.map((d, i) => (
                <Cell key={i} fill={d.score === null ? "#e2e8f0" : d.score >= 85 ? "#22c55e" : d.score >= 65 ? "#f59e0b" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Compliance Radar ──────────────────────────────────────────────────────────
function ComplianceRadar({ domains }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" /> Compliance Domain Radar
        </h3>
      </div>
      <div className="p-2">
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={domains} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HealthCheckDashboard({ staffProfile, user }) {
  const queryClient = useQueryClient();
  const [activeKpi, setActiveKpi] = useState(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const { data: homes = [] } = useQuery({ queryKey: ["hc-homes"], queryFn: () => base44.entities.Home.filter({ status: "active" }), staleTime: 5 * 60 * 1000 });
  const { data: staff = [] } = useQuery({ queryKey: ["hc-staff"], queryFn: () => base44.entities.StaffProfile.filter({ status: "active" }), staleTime: 5 * 60 * 1000 });
  const { data: residents = [] } = useQuery({ queryKey: ["hc-residents"], queryFn: () => base44.entities.ResidentProfile.filter({ status: "active" }), staleTime: 5 * 60 * 1000 });
  const { data: auditSubmissions = [] } = useQuery({ queryKey: ["hc-audits"], queryFn: () => base44.entities.InternalAuditSubmission.filter({}, "-audit_date", 200), staleTime: 5 * 60 * 1000 });
  const { data: homeChecks = [] } = useQuery({ queryKey: ["hc-checks"], queryFn: () => base44.entities.HomeCheckCompletion.filter({}, "-submitted_at", 200), staleTime: 5 * 60 * 1000 });
  const { data: rawSafeguarding = [] } = useQuery({ queryKey: ["hc-sg"], queryFn: () => base44.entities.SafeguardingRecord.filter({}, "-created_date", 200), staleTime: 5 * 60 * 1000 });
  const safeguarding = useMemo(() => rawSafeguarding.filter(s => s.concern_type !== "missing_from_home"), [rawSafeguarding]);
  const { data: mfhRecords = [] } = useQuery({ queryKey: ["hc-mfh"], queryFn: () => base44.entities.MissingFromHome.filter({}, "-reported_missing_datetime", 100), staleTime: 5 * 60 * 1000 });
  const { data: trainingRecords = [] } = useQuery({ queryKey: ["hc-training"], queryFn: () => base44.entities.TrainingRecord.filter({}, "-created_date", 500), staleTime: 5 * 60 * 1000 });
  const { data: policyAcks = [] } = useQuery({ queryKey: ["hc-policy-acks"], queryFn: () => base44.entities.PolicyAcknowledgement.filter({}, "-created_date", 500), staleTime: 5 * 60 * 1000 });
  const { data: policyAssignments = [] } = useQuery({ queryKey: ["hc-policy-assign"], queryFn: () => base44.entities.HRPolicyStaffAssignment.filter({}, "-created_date", 500), staleTime: 5 * 60 * 1000 });
  const { data: workflows = [] } = useQuery({ queryKey: ["hc-workflows"], queryFn: () => base44.workflow.list(), staleTime: 5 * 60 * 1000 });
  const { data: incidents = [] } = useQuery({ queryKey: ["hc-incidents"], queryFn: () => secureGateway.filter("AccidentReport", {}, "-date", 500), staleTime: 5 * 60 * 1000 });
  const { data: auditActions = [] } = useQuery({ queryKey: ["hc-audit-actions"], queryFn: () => base44.entities.AuditAction.filter({}, "-created_at", 200), staleTime: 5 * 60 * 1000 });
  const { data: requirements = [] } = useQuery({ queryKey: ["hc-requirements"], queryFn: () => secureGateway.filter("TrainingRequirement", { is_active: true }), staleTime: 5 * 60 * 1000 });
  const { data: riskAssessments = [] } = useQuery({ queryKey: ["hc-risks"], queryFn: () => secureGateway.filter("RiskAssessment", {}, "-last_reviewed_at", 1000), staleTime: 5 * 60 * 1000 });

  // Training data for matrix
  const { filteredStaff, activeCourses, recordMap } = useTrainingData({ filterHome: "all", filterRole: "all", filterStatus: "all", staffProfile, panelFilters: {} });

  const { overall, domains, raw } = useDomainScores({ homes, staff, auditSubmissions, homeChecks, safeguarding, mfhRecords, trainingRecords, policyAcks, policyAssignments, workflows, incidents, filteredStaff, activeCourses, recordMap });

  const highRiskYPs = useMemo(() => {
    const highRiskIds = new Set();
    riskAssessments.forEach(ra => {
      if (ra.overall_rating === "high") {
        highRiskIds.add(ra.resident_id);
      }
    });
    return Array.from(highRiskIds).map(id => residents.find(r => r.id === id)).filter(Boolean);
  }, [riskAssessments, residents]);

  // Build KPI modal data
  const kpiModalData = useMemo(() => {
    const now = new Date();
    return {
    "Overall Compliance Score": { items: domains.map(d => ({ label: d.name, detail: `${d.score}%`, badge: d.score >= 85 ? "Healthy" : d.score >= 65 ? "Watch" : "Risk", badgeColor: d.score >= 85 ? "bg-green-100 text-green-700" : d.score >= 65 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700" })) },
    "Open Safeguarding Cases": { 
      items: [
        ...safeguarding.filter(s => s.status !== "closed").map(s => ({ name: s.resident_name || residents.find(r => r.id === s.resident_id)?.display_name || "Unknown", detail: s.concern_type, badge: s.immediate_risk, badgeColor: "bg-red-100 text-red-700" })),
        ...highRiskYPs.map(r => ({ name: r.display_name, detail: "High Overall Risk", badge: "High Risk", badgeColor: "bg-red-100 text-red-700" }))
      ]
    },
    "Active Missing Episodes": { items: mfhRecords.filter(m => m.status === "active").map(m => ({ name: m.resident_name || residents.find(r => r.id === m.resident_id)?.display_name || "Unknown", detail: m.home_name, badge: "Active" })) },
    "DBS / RTW Expiring": { 
      items: staff.filter(s => {
        if (s.status !== "active") return false;
        const dbsExp = !s.dbs_expiry || isBefore(new Date(s.dbs_expiry), addDays(now, 90));
        const rtwExp = !s.rtw_checked || (s.rtw_expiry_date ? isBefore(new Date(s.rtw_expiry_date), addDays(now, 90)) : false);
        return dbsExp || rtwExp;
      }).map(s => {
        const dbsExp = !s.dbs_expiry || isBefore(new Date(s.dbs_expiry), addDays(now, 90));
        const rtwExp = !s.rtw_checked || (s.rtw_expiry_date ? isBefore(new Date(s.rtw_expiry_date), addDays(now, 90)) : false);
        let detail = "";
        if (dbsExp && rtwExp) detail = "DBS & RTW Issue";
        else if (dbsExp) detail = !s.dbs_expiry ? "No DBS" : `DBS: ${format(new Date(s.dbs_expiry), "dd MMM yyyy")}`;
        else detail = !s.rtw_checked ? "No RTW" : `RTW: ${format(new Date(s.rtw_expiry_date), "dd MMM yyyy")}`;
        return { name: s.full_name, detail, badge: "Expiring" };
      }) 
    },
    "Training Overdue": (() => { 
      const rows = [];
      filteredStaff.filter(s => s.status === "active").forEach(s => {
        activeCourses.forEach(c => {
          const rec = recordMap[`${s.id}:${c.id}`];
          if (rec && calcTrainingStatus(rec) === "expired") {
            rows.push({ staff: s, course: c, record: rec });
          }
        });
      });
      return {
        columns: [
          { key: "staff", label: "Staff", render: r => r.staff.full_name },
          { key: "course", label: "Training", render: r => r.course.title || r.course.course_name || r.course.name || "Unknown Course" },
          { key: "expiry", label: "Expired Since", render: r => r.record?.expiry_date ? format(new Date(r.record.expiry_date), "d MMM yyyy") : "—" },
        ],
        rows
      };
    })(),
    "Policy Acks": { items: policyAssignments.filter(a => ["assigned", "pending", "overdue"].includes(a.status?.toLowerCase())).map(a => ({ name: a.staff_name || a.staff_id, detail: a.policy_title || a.policy_name, badge: a.status })) },
    "Open Regulatory Actions": { items: workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)).map(w => ({ name: (w.workflow_type || w.entity_type || "Workflow").replace(/_/g, " "), detail: w.home_name, badge: w.priority })) },
    "Pending Audit Actions": { items: [
      ...auditSubmissions.filter(a => a.workflow_status === "maker_submitted" || a.status === "pending").map(a => ({ name: `Pending Audit: ${a.home_name || a.id}`, detail: a.audit_date ? new Date(a.audit_date).toLocaleDateString() : "Pending", badge: "Pending" })),
      ...auditActions.filter(a => a.status !== "completed").map(a => ({ name: a.action_required?.slice(0, 50) || "Audit action", detail: a.home_id, badge: a.priority }))
    ] },
  };
  }, [domains, safeguarding, mfhRecords, staff, trainingRecords, policyAcks, policyAssignments, workflows, auditActions, residents, highRiskYPs, auditSubmissions, filteredStaff, activeCourses, recordMap]);

  const kpis = [
    { label: "Overall Compliance Score", value: `${overall}%`, sub: overall >= 85 ? "All areas healthy" : "Action required", icon: ShieldCheck, color: overall >= 85 ? "green" : overall >= 65 ? "amber" : "red", alert: overall < 65, onClick: () => setActiveKpi("Overall Compliance Score"), onInfoClick: () => setShowCalculationModal(true) },
    { label: "Open Safeguarding Cases", value: raw.openSG + highRiskYPs.length, sub: "Active cases & high risk YPs", icon: Shield, color: "red", alert: (raw.openSG + highRiskYPs.length) > 0, onClick: () => setActiveKpi("Open Safeguarding Cases") },
    { label: "Active Missing Episodes", value: mfhRecords.filter(m => m.status === "active").length, sub: "Currently missing", icon: AlertOctagon, color: "purple", alert: mfhRecords.filter(m => m.status === "active").length > 0, onClick: () => setActiveKpi("Active Missing Episodes") },
    { label: "DBS / RTW Expiring", value: raw.dbsExpiring, sub: "Within next 90 days", icon: Users, color: raw.dbsExpiring > 0 ? "amber" : "green", alert: raw.dbsExpiring > 2, onClick: () => setActiveKpi("DBS / RTW Expiring") },
    { label: "Training Overdue", value: raw.nonCompliant, sub: "Staff with expired training", icon: GraduationCap, color: raw.nonCompliant > 0 ? "red" : "green", alert: raw.nonCompliant > 0, onClick: () => setActiveKpi("Training Overdue") },
    { label: "Policy Acks", value: raw.ackRequired, sub: "Awaiting staff sign-off", icon: BookOpen, color: raw.ackRequired > 0 ? "orange" : "green", alert: raw.ackRequired > 5, onClick: () => setActiveKpi("Policy Acks") },
    { label: "Open Regulatory Actions", value: raw.openReg, sub: "Approvals / sign-offs", icon: ClipboardList, color: raw.openReg > 0 ? "blue" : "green", alert: raw.openReg > 10, onClick: () => setActiveKpi("Open Regulatory Actions") },
    { label: "Pending Audit Actions", value: auditActions.filter(a => a.status !== "completed").length + auditSubmissions.filter(a => a.workflow_status === "maker_submitted" || a.status === "pending").length, sub: "From internal audits", icon: FileText, color: "teal", alert: false, onClick: () => setActiveKpi("Pending Audit Actions") },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* KPI Modal */}
      {activeKpi && activeKpi !== "Training Overdue" && (
        <KpiDetailModal
          title={activeKpi}
          icon={kpis.find(k => k.label === activeKpi)?.icon}
          items={kpiModalData[activeKpi]?.items || []}
          onClose={() => setActiveKpi(null)}
        />
      )}

      {/* Advanced Table Modal for Training Overdue */}
      {activeKpi === "Training Overdue" && (
        <TrainingStatDetailModal
          open={true}
          onOpenChange={(open) => { if (!open) setActiveKpi(null); }}
          title="Training Overdue"
          icon={GraduationCap}
          columns={kpiModalData["Training Overdue"]?.columns || []}
          rows={kpiModalData["Training Overdue"]?.rows || []}
          emptyMessage="No overdue trainings."
        />
      )}

      {/* Calculation Logic Modal */}
      {showCalculationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-hidden" onClick={() => setShowCalculationModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Info className="w-4 h-4" /></div>
              <h2 className="flex-1 text-sm font-bold text-slate-900">Score Calculation Logic</h2>
              <button onClick={() => setShowCalculationModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">Each of 7 domains is scored 0-100, then averaged:</p>
              </div>
              {domains.map((d, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">{d.name}</span>
                    <span className={`font-black text-lg ${d.score >= 85 ? "text-green-600" : d.score >= 65 ? "text-amber-600" : "text-red-600"}`}>{d.score}%</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {d.name === "Safeguarding" && "Based on: 100 - (open cases / total cases) × 60"}
                    {d.name === "DBS & RTW" && "Based on: (compliant staff / total staff) × 100"}
                    {d.name === "Training" && "Based on: (staff with valid training / total staff) × 100"}
                    {d.name === "Policy Acks" && "Based on: 100 - (pending acks / total acks) × 100"}
                    {d.name === "Audits" && "Based on: average score of recent internal audits"}
                    {d.name === "Home Checks" && "Based on: (completed checks / total checks) × 100"}
                    {d.name === "Reg Actions" && "Based on: 100 - (open workflows × 6), min 30"}
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-3 mt-3">
                <p className="font-semibold text-slate-900 flex items-center justify-between">
                  <span>Overall Score</span>
                  <span className={`text-lg ${overall >= 85 ? "text-green-600" : overall >= 65 ? "text-amber-600" : "text-red-600"}`}>{overall}%</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Average of all 7 domain scores</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Compliance Health Check
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Live organisational health across safeguarding, audits, workforce, and regulatory compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
            <ScoreRing score={overall} size={36} />
            <div>
              <p className="text-xs font-bold text-slate-800">Overall Score</p>
              <RagBadge score={overall} />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k, i) => <KpiCard key={i} {...k} onInfoClick={k.onInfoClick} />)}
      </div>

      {/* ── Row 2: Radar + Audit Trend ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1">
          <ComplianceRadar domains={domains} />
        </div>
        <div className="xl:col-span-2">
          <AuditTrendChart auditSubmissions={auditSubmissions} />
        </div>
      </div>

      {/* ── Row 3: Workforce Compliance + Urgent Actions ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1">
          <WorkforceCompliancePanel staff={staff} trainingRecords={trainingRecords} policyAcks={policyAcks} policyAssignments={policyAssignments} activeCourses={activeCourses} recordMap={recordMap} />
        </div>
        <div className="xl:col-span-2">
          <UrgentActionsPanel safeguarding={safeguarding} mfhRecords={mfhRecords} workflows={workflows} auditActions={auditActions} staff={staff} residents={residents} />
        </div>
      </div>

      {/* ── Home Health Grid ── */}
      <div>
        <HomeHealthGrid homes={homes} auditSubmissions={auditSubmissions} homeChecks={homeChecks} incidents={incidents} safeguarding={safeguarding} />
      </div>

      {/* ── Staff Training Matrix ── */}

    </div>
  );
}