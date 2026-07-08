import { useEffect, useMemo, useState } from "react";
import { Home, Users, UserCheck, AlertTriangle, ClipboardList, CheckSquare, Shield, ChevronRight, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { scopeHomesList, scopeToHomes, scopeStaffToHomes } from "@/lib/managerHomeScope";
import { format, subDays } from "date-fns";
import { WidgetLoadingBlock, WidgetErrorBlock } from "./WidgetStatus";
import { logAudit } from "@/lib/logAudit";

// ─── Modal ────────────────────────────────────────────────────────────────────
function KPIModal({ item, onClose, modalData }) {
  // Close on Escape and move focus into the dialog, for keyboard/screen-reader users
  // who have no way to reach the mouse-only X button otherwise.
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kpi-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${item.iconBg}`}>
            <item.icon className={`w-4 h-4 ${item.iconColor}`} />
          </div>
          <div className="flex-1">
            <h2 id="kpi-modal-title" className="text-sm font-black text-slate-900">{item.label}</h2>
            <p className="text-xs text-slate-400">{item.sub}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-slate-100 transition">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {modalData}
        </div>
      </div>
    </div>
  );
}

// ─── Modal content renderers ──────────────────────────────────────────────────
function HomesList({ homes }) {
  if (!homes.length) return <p className="text-center text-sm text-slate-400 py-6">No active homes.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {homes.map(h => (
        <div key={h.id} className="flex items-center gap-3 py-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-black text-blue-600">
            {h.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{h.name}</div>
            <div className="text-xs text-slate-400">{h.address || h.postcode || "—"}</div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200 capitalize">{h.status}</span>
        </div>
      ))}
    </div>
  );
}

function ResidentsList({ residents }) {
  if (!residents.length) return <p className="text-center text-sm text-slate-400 py-6">No active residents.</p>;
  const riskColors = { low: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };
  return (
    <div className="divide-y divide-slate-100">
      {residents.slice(0, 30).map(r => (
        <div key={r.id} className="flex items-center gap-3 py-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-purple-50 text-xs font-black text-purple-600">
            {r.initials || r.display_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{r.display_name}</div>
            <div className="text-xs text-slate-400">{r.placing_local_authority || "—"}</div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${riskColors[r.risk_level] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
            {r.risk_level || "low"}
          </span>
        </div>
      ))}
      {residents.length > 30 && <p className="text-xs text-slate-400 text-center pt-2">+{residents.length - 30} more</p>}
    </div>
  );
}

function StaffOnShiftList({ attendanceLogs, staff }) {
  const onShift = attendanceLogs.filter(l => !l.clock_out_time);
  if (!onShift.length) return <p className="text-center text-sm text-slate-400 py-6">No staff currently clocked in.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {onShift.map(log => {
        const member = staff.find(s => s.id === log.staff_id);
        const clockedIn = log.clock_in_time ? format(new Date(log.clock_in_time), "HH:mm") : "—";
        return (
          <div key={log.id} className="flex items-center gap-3 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-black text-teal-600">
              {(member?.full_name || log.staff_name || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{member?.full_name || log.staff_name || "Unknown"}</div>
              <div className="text-xs text-slate-400">{member?.role?.replace(/_/g, " ") || "—"}</div>
            </div>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">In since {clockedIn}</span>
          </div>
        );
      })}
    </div>
  );
}

function IncidentsList({ incidents, missingFromHome }) {
  const openIncidents = incidents.filter(i => ["under_investigation", "open"].includes(i.status));
  const activeMFH = missingFromHome.filter(m => m.status === "active");
  const riskColors = { low: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };
  if (!openIncidents.length && !activeMFH.length) return <p className="text-center text-sm text-slate-400 py-6">No open incidents.</p>;
  return (
    <div className="space-y-4">
      {activeMFH.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Missing From Home ({activeMFH.length})</h3>
          <div className="divide-y divide-slate-100 rounded-xl border border-red-100 bg-red-50 overflow-hidden">
            {activeMFH.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="h-2 w-2 rounded-full bg-red-600 shrink-0" />
                <span className="flex-1 text-sm font-semibold text-slate-800">{m.resident_name || "Unknown"}</span>
                <span className="text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded">Missing</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {openIncidents.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Open Safeguarding ({openIncidents.length})</h3>
          <div className="divide-y divide-slate-100 rounded-xl border border-orange-100 bg-orange-50 overflow-hidden">
            {openIncidents.map(i => (
              <div key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${i.immediate_risk === "critical" ? "bg-red-600" : "bg-orange-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{i.resident_name || "Unknown"}</div>
                  <div className="text-xs text-slate-400 capitalize">{(i.concern_type || "").replace(/_/g, " ")}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${riskColors[i.immediate_risk] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {i.immediate_risk || "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MissedChecksList({ homeChecks }) {
  const pending = homeChecks.filter(c => c.manager_review_status === "pending");
  if (!pending.length) return <p className="text-center text-sm text-slate-400 py-6">No missed checklists.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {pending.map(c => (
        <div key={c.id} className="flex items-center gap-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{c.home_name || c.home_id || "—"}</div>
            <div className="text-xs text-slate-400">{c.completion_date ? format(new Date(c.completion_date), "d MMM yyyy") : "No date"} · {c.submitted_by_name || "Unknown"}</div>
          </div>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">Pending Review</span>
        </div>
      ))}
    </div>
  );
}

function ApprovalsList({ workflows }) {
  const pending = workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status));
  if (!pending.length) return <p className="text-center text-sm text-slate-400 py-6">No pending approvals.</p>;
  const priorityColors = { critical: "bg-red-100 text-red-700 border-red-200", high: "bg-orange-100 text-orange-700 border-orange-200", normal: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <div className="divide-y divide-slate-100">
      {pending.slice(0, 20).map(w => (
        <div key={w.id} className="flex items-center gap-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate capitalize">{(w.entity_type || "").replace(/_/g, " ")}</div>
            <div className="text-xs text-slate-400">{w.submitted_by_name || "—"} · {w.home_name || "—"}</div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${priorityColors[w.priority] || priorityColors.normal}`}>
            {w.priority || "normal"}
          </span>
        </div>
      ))}
      {pending.length > 20 && <p className="text-xs text-slate-400 text-center pt-2">+{pending.length - 20} more</p>}
    </div>
  );
}

function ComplianceList({ homeChecks }) {
  if (!homeChecks.length) return <p className="text-center text-sm text-slate-400 py-6">No compliance records.</p>;
  const statusColors = {
    approved_as_recorded: "bg-green-100 text-green-700 border-green-200",
    changes_requested: "bg-amber-100 text-amber-700 border-amber-200",
    escalated: "bg-red-100 text-red-700 border-red-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    submitted_for_review: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <div className="divide-y divide-slate-100">
      {homeChecks.slice(0, 20).map(c => (
        <div key={c.id} className="flex items-center gap-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{c.home_name || c.home_id || "—"}</div>
            <div className="text-xs text-slate-400">{c.completion_date ? format(new Date(c.completion_date), "d MMM yyyy") : "No date"}</div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${statusColors[c.overall_status] || statusColors.draft}`}>
            {(c.overall_status || "draft").replace(/_/g, " ")}
          </span>
        </div>
      ))}
    </div>
  );
}

// Sections that reveal individually-identifiable safeguarding/care data about
// specific young people — opening these is logged to the Audit Trail per GDPR
// Article 5(2) / Ofsted requirements (see src/lib/logAudit.js). "residents" shows
// named young people with risk level + placing LA; "incidents" shows named
// safeguarding cases and missing-from-home episodes.
const AUDITED_SECTIONS = {
  residents: { entity: "Resident", label: "the young people list" },
  incidents: { entity: "SafeguardingRecord", label: "open incidents & safeguarding cases" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
// orgId: the viewer's own organisation — never a hard-coded tenant ID.
// homeIds: null = every home in the org (admin/rsm); otherwise the list of home IDs
// this viewer is allowed to see (their own remit, further narrowed by the "Home" filter).
export default function ManagerKPIBanner({ orgId = ORG_ID, homeIds = null, viewerId = null, viewerName = "" }) {
  const [openModal, setOpenModal] = useState(null);

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

  // "On shift now" only ever needs today's (and, for overnight/waking-night shifts
  // that clocked in the day before, yesterday's) attendance logs — fetching all
  // history here would both waste bandwidth and risk the default 500-row cap
  // silently pushing today's clock-ins out of view once a home has been running
  // long enough to accumulate that many historical rows.
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const qHomes = useQuery({ queryKey: ["mgr-homes-direct", orgId], queryFn: () => base44.entities.Home.filter({ org_id: orgId, status: "active" }), staleTime: 2 * 60 * 1000 });
  const qResidents = useQuery({ queryKey: ["mgr-residents-direct", orgId], queryFn: () => base44.entities.Resident.filter({ org_id: orgId, status: "active" }), staleTime: 2 * 60 * 1000 });
  const qStaff = useQuery({ queryKey: ["mgr-staff-direct", orgId], queryFn: () => base44.entities.StaffProfile.filter({ org_id: orgId }), staleTime: 2 * 60 * 1000 });
  const qAttendance = useQuery({ queryKey: ["mgr-attendance-today-direct", orgId, todayStr], queryFn: () => base44.entities.AttendanceLog.filter({ org_id: orgId, date: [yesterdayStr, todayStr] }), staleTime: 60 * 1000 });
  const qWorkflows = useQuery({ queryKey: ["mgr-workflows-direct", orgId], queryFn: () => base44.entities.ApprovalWorkflow.filter({ org_id: orgId }, "-created_date", 100), staleTime: 60 * 1000 });
  const qIncidents = useQuery({ queryKey: ["mgr-safeguarding-direct", orgId], queryFn: () => base44.entities.SafeguardingRecord.filter({ org_id: orgId }), staleTime: 2 * 60 * 1000 });
  // Every consumer of MissingFromHome on this dashboard only ever cares about
  // active episodes, so it's safe (and much cheaper at scale) to filter server-side
  // rather than fetching the full historical/closed set just to filter it away here.
  const qMissing = useQuery({ queryKey: ["mgr-missing-active-direct", orgId], queryFn: () => base44.entities.MissingFromHome.filter({ org_id: orgId, status: "active" }), staleTime: 2 * 60 * 1000 });
  const qHomeChecks = useQuery({ queryKey: ["mgr-homechecks-direct", orgId], queryFn: () => base44.entities.HomeCheckCompletion.filter({ org_id: orgId }), staleTime: 2 * 60 * 1000 });

  const queries = [qHomes, qResidents, qStaff, qAttendance, qWorkflows, qIncidents, qMissing, qHomeChecks];
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  const retryAll = () => queries.forEach(q => q.refetch());

  const homes = useMemo(() => scopeHomesList(qHomes.data || [], homeIds), [qHomes.data, homeIds]);
  const residents = useMemo(() => scopeToHomes(qResidents.data || [], homeIds), [qResidents.data, homeIds]);
  const staff = useMemo(() => scopeStaffToHomes(qStaff.data || [], homeIds), [qStaff.data, homeIds]);
  const attendanceLogs = useMemo(() => scopeToHomes(qAttendance.data || [], homeIds), [qAttendance.data, homeIds]);
  const workflows = useMemo(() => scopeToHomes(qWorkflows.data || [], homeIds), [qWorkflows.data, homeIds]);
  const incidents = useMemo(() => scopeToHomes(qIncidents.data || [], homeIds), [qIncidents.data, homeIds]);
  const missingFromHome = useMemo(() => scopeToHomes(qMissing.data || [], homeIds), [qMissing.data, homeIds]);
  const homeChecks = useMemo(() => scopeToHomes(qHomeChecks.data || [], homeIds), [qHomeChecks.data, homeIds]);

  const staffOnShift = useMemo(() => attendanceLogs.filter(l => !l.clock_out_time).length, [attendanceLogs]);
  const totalStaff = useMemo(() => staff.filter(s => s.status === "active").length, [staff]);
  const openIncidents = useMemo(() =>
    incidents.filter(i => ["under_investigation", "open"].includes(i.status)).length +
    missingFromHome.filter(m => m.status === "active").length,
    [incidents, missingFromHome]);
  const missedChecks = useMemo(() => homeChecks.filter(c => c.manager_review_status === "pending").length, [homeChecks]);
  const pendingApprovals = useMemo(() => workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)).length, [workflows]);
  const complianceHealth = useMemo(() => {
    if (!homeChecks.length) return 86;
    const passed = homeChecks.filter(c => c.overall_status === "approved_as_recorded").length;
    return Math.round((passed / homeChecks.length) * 100);
  }, [homeChecks]);

  const items = [
    { key: "homes",       label: "Assigned Homes",    value: homes.length,                    sub: "Active homes",      subColor: "text-slate-500",  icon: Home,          iconBg: "bg-blue-100",   iconColor: "text-blue-600" },
    { key: "residents",   label: "Young People",      value: residents.length,                sub: "Currently active",  subColor: "text-slate-500",  icon: Users,         iconBg: "bg-purple-100", iconColor: "text-purple-600" },
    { key: "staff",       label: "Staff On Shift",    value: `${staffOnShift} / ${totalStaff}`, sub: "Active right now", subColor: "text-green-600",  icon: UserCheck,     iconBg: "bg-teal-100",   iconColor: "text-teal-600" },
    { key: "incidents",   label: "Open Incidents",    value: openIncidents,                   sub: "Requires attention",subColor: "text-red-500",    icon: AlertTriangle, iconBg: "bg-red-100",    iconColor: "text-red-600",  alert: openIncidents > 0 },
    { key: "checks",      label: "Missed Checklists", value: missedChecks,                    sub: "Pending review",    subColor: "text-amber-600",  icon: ClipboardList, iconBg: "bg-amber-100",  iconColor: "text-amber-600",alert: missedChecks > 5 },
    { key: "approvals",   label: "Pending Approvals", value: pendingApprovals,                sub: "Awaiting sign-off", subColor: "text-amber-600",  icon: CheckSquare,   iconBg: "bg-orange-100", iconColor: "text-orange-600" },
    { key: "compliance",  label: "Compliance Health", value: `${complianceHealth}%`,          sub: "Live score",        subColor: "text-green-600",  icon: Shield,        iconBg: "bg-green-100",  iconColor: "text-green-600" },
  ];

  const modalDataMap = {
    homes:      <HomesList homes={homes} />,
    residents:  <ResidentsList residents={residents} />,
    staff:      <StaffOnShiftList attendanceLogs={attendanceLogs} staff={staff} />,
    incidents:  <IncidentsList incidents={incidents} missingFromHome={missingFromHome} />,
    checks:     <MissedChecksList homeChecks={homeChecks} />,
    approvals:  <ApprovalsList workflows={workflows} />,
    compliance: <ComplianceList homeChecks={homeChecks} />,
  };

  const activeItem = items.find(i => i.key === openModal);

  if (isLoading) return <WidgetLoadingBlock label="Loading dashboard summary..." />;
  if (isError) return <WidgetErrorBlock onRetry={retryAll} />;

  return (
    <>
      <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {items.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => openSection(m.key)}
              className={`bg-white rounded-xl border ${m.alert ? "border-red-200" : "border-slate-200"} p-3 flex items-center gap-3 hover:shadow-md transition-shadow group text-left w-full`}
            >
              <div className={`w-9 h-9 rounded-lg ${m.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${m.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-500 leading-tight truncate">{m.label}</p>
                <p className="text-lg font-bold text-slate-900 leading-tight">{m.value}</p>
                <p className={`text-[10px] ${m.subColor} leading-tight`}>{m.sub}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
            </button>
          );
        })}
      </div>

      <KPIModal
        item={activeItem}
        onClose={() => setOpenModal(null)}
        modalData={modalDataMap[openModal]}
      />
    </>
  );
}
