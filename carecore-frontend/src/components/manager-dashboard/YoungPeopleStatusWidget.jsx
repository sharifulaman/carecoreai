import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Shield, AlertTriangle, ClipboardList, FileText, Calendar, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { scopeToHomes } from "@/lib/managerHomeScope";
import { format } from "date-fns";
import { WidgetErrorBlock, WidgetLoadingBlock } from "./WidgetStatus";
import { logAudit } from "@/lib/logAudit";

const riskColors = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-amber-100 text-amber-700 border-amber-200",
  low:      "bg-green-100 text-green-700 border-green-200",
};

function RiskBadge({ risk }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${riskColors[risk] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {risk || "—"}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function YPModal({ config, onClose }) {
  // Close on Escape for keyboard/screen-reader users who have no way to reach the
  // mouse-only X button otherwise.
  useEffect(() => {
    if (!config) return;
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [config, onClose]);

  if (!config) return null;
  const { title, icon: Icon, iconBg, iconColor, content } = config;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="yp-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <h2 id="yp-modal-title" className="flex-1 text-sm font-black text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-slate-100 transition">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {content}
        </div>
      </div>
    </div>
  );
}

// ─── Modal content components ─────────────────────────────────────────────────
function SafeguardingContent({ records, residents }) {
  const active = records.filter(s => ["under_investigation", "open"].includes(s.status));
  if (!active.length) return <p className="text-center text-sm text-slate-400 py-6">No active safeguarding cases.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {active.map(s => (
        <div key={s.id} className="flex items-start gap-3 py-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-xs font-black text-red-600">
            {(s.resident_name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">{s.resident_name || "Unknown"}</div>
            <div className="text-xs text-slate-500 capitalize">{(s.concern_type || "").replace(/_/g, " ")}</div>
            <div className="text-xs text-slate-400">{s.home_name || "—"} · {s.date_of_concern ? format(new Date(s.date_of_concern), "d MMM yyyy") : "—"}</div>
          </div>
          <RiskBadge risk={s.immediate_risk} />
        </div>
      ))}
    </div>
  );
}

function MissingContent({ records }) {
  const active = records.filter(m => m.status === "active");
  if (!active.length) return <p className="text-center text-sm text-slate-400 py-6">No active missing episodes.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {active.map(m => (
        <div key={m.id} className="flex items-center gap-3 py-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-50 text-xs font-black text-amber-700">
            {(m.resident_name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">{m.resident_name || "Unknown"}</div>
            <div className="text-xs text-slate-400">{m.home_name || "—"}</div>
            <div className="text-xs text-slate-400">
              Last seen: {m.last_seen_datetime ? format(new Date(m.last_seen_datetime), "d MMM, HH:mm") : "—"}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <RiskBadge risk={m.risk_level_at_time} />
            {m.reported_to_police && (
              <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Police notified</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SupportPlansContent({ plans, residents }) {
  const active = plans.filter(s => s.status === "active");
  if (!active.length) return <p className="text-center text-sm text-slate-400 py-6">No active support plans.</p>;
  const statusColors = {
    active: "bg-green-100 text-green-700 border-green-200",
    draft:  "bg-slate-100 text-slate-600 border-slate-200",
    review: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return (
    <div className="divide-y divide-slate-100">
      {active.slice(0, 25).map(p => {
        const resident = residents.find(r => r.id === p.resident_id);
        return (
          <div key={p.id} className="flex items-center gap-3 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-600">
              {(resident?.display_name || p.resident_name || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{resident?.display_name || p.resident_name || "Unknown"}</div>
              <div className="text-xs text-slate-400">{p.plan_type || "Support Plan"} · {p.review_date ? format(new Date(p.review_date), "d MMM yyyy") : "No review date"}</div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${statusColors[p.status] || statusColors.draft}`}>
              {p.status}
            </span>
          </div>
        );
      })}
      {active.length > 25 && <p className="text-xs text-slate-400 text-center pt-2">+{active.length - 25} more</p>}
    </div>
  );
}

function RiskPlansContent({ assessments, residents }) {
  const active = assessments.filter(r => r.status === "active");
  if (!active.length) return <p className="text-center text-sm text-slate-400 py-6">No active risk plans.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {active.slice(0, 25).map(a => {
        const resident = residents.find(r => r.id === a.resident_id);
        return (
          <div key={a.id} className="flex items-center gap-3 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-purple-50 text-xs font-black text-purple-600">
              {(resident?.display_name || a.resident_name || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{resident?.display_name || a.resident_name || "Unknown"}</div>
              <div className="text-xs text-slate-400">{(a.risk_type || "Risk Assessment").replace(/_/g, " ")} · {a.review_date ? format(new Date(a.review_date), "d MMM yyyy") : "No review date"}</div>
            </div>
            <RiskBadge risk={a.risk_level} />
          </div>
        );
      })}
      {active.length > 25 && <p className="text-xs text-slate-400 text-center pt-2">+{active.length - 25} more</p>}
    </div>
  );
}

function AppointmentsContent({ appointments, today }) {
  const todayAppts = appointments.filter(a => {
    const d = (a.start_datetime || a.appointment_date || a.date || a.scheduled_date || "").slice(0, 10);
    return d === today;
  });
  if (!todayAppts.length) return <p className="text-center text-sm text-slate-400 py-6">No appointments today.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {todayAppts.map(a => (
        <div key={a.id} className="flex items-center gap-3 py-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-black text-teal-600">
            {(a.resident_name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">{a.resident_name || "Unknown"}</div>
            <div className="text-xs text-slate-400 capitalize">{(a.appointment_type || a.type || "Appointment").replace(/_/g, " ")}</div>
            <div className="text-xs text-slate-400">{a.location || "—"}</div>
          </div>
          <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded">
            {(a.start_datetime || a.appointment_date || "").slice(11, 16) || "Today"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Clickable Stat Card ──────────────────────────────────────────────────────
function StatCard({ icon: Icon, color, bg, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-lg ${bg} min-w-[70px] hover:opacity-80 transition cursor-pointer`}
    >
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-[9px] text-slate-500 text-center leading-tight">{label}</span>
    </button>
  );
}

// Sections that reveal individually-identifiable safeguarding/care data about
// specific young people — opening these is logged to the Audit Trail per GDPR
// Article 5(2) / Ofsted requirements (see src/lib/logAudit.js). Summary counts on
// the stat cards themselves aren't logged; only drilling into the named case list.
const AUDITED_SECTIONS = {
  safeguarding: { entity: "SafeguardingRecord", label: "active safeguarding cases" },
  missing: { entity: "MissingFromHome", label: "missing from home episodes" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function YoungPeopleStatusWidget({ orgId = ORG_ID, homeIds = null, viewerId = null, viewerName = "" }) {
  const [openModal, setOpenModal] = useState(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const openSection = (key) => {
    const audited = AUDITED_SECTIONS[key];
    if (audited) {
      logAudit({
        entity_name: audited.entity,
        entity_id: null,
        action: "view",
        changed_by: viewerId,
        changed_by_name: viewerName,
        new_values: { event: "manager_dashboard_view", section: key },
        org_id: orgId,
        description: `${viewerName || "A manager"} viewed ${audited.label} on the Manager Dashboard`,
        retention_category: "care_record",
      });
    }
    setOpenModal(key);
  };

  const qResidents = useQuery({
    queryKey: ["mgr-residents-direct", orgId],
    queryFn: () => base44.entities.Resident.filter({ org_id: orgId, status: "active" }),
    staleTime: 2 * 60 * 1000,
  });
  const qSafeguarding = useQuery({
    queryKey: ["mgr-safeguarding-direct", orgId],
    queryFn: () => base44.entities.SafeguardingRecord.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });
  // Only active episodes are ever shown here, so filter server-side rather than
  // fetching the full historical/closed set (which grows unbounded over time).
  const qMissing = useQuery({
    queryKey: ["mgr-missing-active-direct", orgId],
    queryFn: () => base44.entities.MissingFromHome.filter({ org_id: orgId, status: "active" }),
    staleTime: 2 * 60 * 1000,
  });
  const qRiskAssessments = useQuery({
    queryKey: ["mgr-risks-direct", orgId],
    queryFn: () => base44.entities.RiskAssessment.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });
  const qSupportPlans = useQuery({
    queryKey: ["mgr-supportplans-direct", orgId],
    queryFn: () => base44.entities.SupportPlan.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });
  const qAppointments = useQuery({
    queryKey: ["mgr-appointments-direct", orgId],
    queryFn: () => base44.entities.Appointment.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });

  const queries = [qResidents, qSafeguarding, qMissing, qRiskAssessments, qSupportPlans, qAppointments];
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  const retryAll = () => queries.forEach(q => q.refetch());

  const residents = scopeToHomes(qResidents.data || [], homeIds);
  const safeguarding = scopeToHomes(qSafeguarding.data || [], homeIds);
  const missingFromHome = scopeToHomes(qMissing.data || [], homeIds);
  const riskAssessments = scopeToHomes(qRiskAssessments.data || [], homeIds);
  const supportPlans = scopeToHomes(qSupportPlans.data || [], homeIds);
  const appointments = scopeToHomes(qAppointments.data || [], homeIds);

  const activeSafeguarding = useMemo(() => safeguarding.filter(s => ["under_investigation", "open"].includes(s.status)).length, [safeguarding]);
  const activeMissing = useMemo(() => missingFromHome.filter(m => m.status === "active").length, [missingFromHome]);
  const activeRiskPlans = useMemo(() => riskAssessments.filter(r => r.status === "active").length, [riskAssessments]);
  const activeSupportPlans = useMemo(() => supportPlans.filter(s => s.status === "active").length, [supportPlans]);
  const todayAppointmentsCount = useMemo(() =>
    appointments.filter(a => {
      const d = (a.start_datetime || a.appointment_date || a.date || a.scheduled_date || "").slice(0, 10);
      return d === today;
    }).length,
    [appointments, today]
  );

  const priorityYP = useMemo(() =>
    residents
      .filter(r => r.risk_level === "high" || r.risk_level === "critical")
      .slice(0, 6)
      .map(r => ({
        ...r,
        nextAction: safeguarding.some(s => s.resident_id === r.id && ["under_investigation", "open"].includes(s.status))
          ? "Safeguarding review"
          : missingFromHome.some(m => m.resident_id === r.id && m.status === "active")
          ? "Missing - follow up"
          : supportPlans.some(s => s.resident_id === r.id && s.status === "active")
          ? "Support plan sign-off"
          : "Key work session overdue",
      })),
    [residents, safeguarding, missingFromHome, supportPlans]
  );

  const modalConfigs = {
    safeguarding: {
      title: "Active Safeguarding Cases",
      icon: Shield, iconBg: "bg-red-100", iconColor: "text-red-600",
      content: <SafeguardingContent records={safeguarding} residents={residents} />,
    },
    missing: {
      title: "Missing From Home",
      icon: AlertTriangle, iconBg: "bg-amber-100", iconColor: "text-amber-600",
      content: <MissingContent records={missingFromHome} />,
    },
    support_plans: {
      title: "Active Support Plans",
      icon: ClipboardList, iconBg: "bg-blue-100", iconColor: "text-blue-600",
      content: <SupportPlansContent plans={supportPlans} residents={residents} />,
    },
    risk_plans: {
      title: "Active Risk Plans",
      icon: FileText, iconBg: "bg-purple-100", iconColor: "text-purple-600",
      content: <RiskPlansContent assessments={riskAssessments} residents={residents} />,
    },
    appointments: {
      title: "Appointments Today",
      icon: Calendar, iconBg: "bg-teal-100", iconColor: "text-teal-600",
      content: <AppointmentsContent appointments={appointments} today={today} />,
    },
  };

  if (isError) return <WidgetErrorBlock onRetry={retryAll} />;

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Young People Status</h3>
            {/* Residents.jsx's "yp" tab is the actual Young People view — plain
                /residents lands on the generic Overview tab instead. */}
            <Link to="/residents?tab=yp" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <WidgetLoadingBlock />
          ) : (
            <div className="flex gap-2 flex-wrap">
              <StatCard icon={Shield}        color="text-red-600"    bg="bg-red-50"    label="Safeguarding"      value={activeSafeguarding}      onClick={() => openSection("safeguarding")} />
              <StatCard icon={AlertTriangle} color="text-amber-600"  bg="bg-amber-50"  label="Missing"           value={activeMissing}            onClick={() => openSection("missing")} />
              <StatCard icon={ClipboardList} color="text-blue-600"   bg="bg-blue-50"   label="Support plans"     value={activeSupportPlans}       onClick={() => openSection("support_plans")} />
              <StatCard icon={FileText}      color="text-purple-600" bg="bg-purple-50" label="Risk plans"        value={activeRiskPlans}          onClick={() => openSection("risk_plans")} />
              <StatCard icon={Calendar}      color="text-teal-600"   bg="bg-teal-50"   label="Appointments today" value={todayAppointmentsCount}  onClick={() => openSection("appointments")} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Priority Young People</h3>
            <Link to="/residents?tab=yp" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">YP</th>
                  <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
                  <th className="text-left px-2 py-2 text-slate-500 font-medium">Risk</th>
                  <th className="text-left px-2 py-2 text-slate-500 font-medium">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading && (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-400">Loading...</td></tr>
                )}
                {!isLoading && priorityYP.map(yp => (
                  <tr key={yp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 inline-flex">
                        {(yp.display_name || yp.full_name || "?").charAt(0)}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-slate-600 truncate max-w-[80px]">{yp.display_name || yp.full_name}</td>
                    <td className="px-2 py-2"><RiskBadge risk={yp.risk_level} /></td>
                    <td className="px-2 py-2 text-slate-600 max-w-[120px] truncate">{yp.nextAction}</td>
                  </tr>
                ))}
                {!isLoading && priorityYP.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-400">No priority cases</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <YPModal config={modalConfigs[openModal]} onClose={() => setOpenModal(null)} />
    </>
  );
}
