import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { FileText, Users, CheckCircle2, AlertTriangle, Clock, Building2, X, ChevronRight } from "lucide-react";

function KPIModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color, onClick, linkLabel }) {
  const palette = {
    blue:   { bg: "bg-blue-50",   icon: "text-blue-500",   val: "text-blue-800",   border: "border-blue-100" },
    green:  { bg: "bg-green-50",  icon: "text-green-500",  val: "text-green-800",  border: "border-green-100" },
    teal:   { bg: "bg-teal-50",   icon: "text-teal-500",   val: "text-teal-800",   border: "border-teal-100" },
    amber:  { bg: "bg-amber-50",  icon: "text-amber-500",  val: "text-amber-800",  border: "border-amber-100" },
    red:    { bg: "bg-red-50",    icon: "text-red-500",    val: "text-red-800",    border: "border-red-100" },
    purple: { bg: "bg-purple-50", icon: "text-purple-500", val: "text-purple-800", border: "border-purple-100" },
  };
  const p = palette[color] || palette.blue;
  return (
    <div className={`${p.bg} ${p.border} border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all`} onClick={onClick}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${p.icon}`} />
        </div>
      </div>
      <div className={`text-3xl font-bold ${p.val} leading-none`}>{value}</div>
      <div className="text-sm font-semibold text-slate-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      <div className={`text-xs font-semibold mt-3 flex items-center gap-1 ${p.icon}`}>
        {linkLabel || "View all"} <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}

export default function PolicyHubKPIs({ refreshKey }) {
  const [modal, setModal] = useState(null);

  const { data: policies = [] } = useQuery({
    queryKey: ["hr-policies", refreshKey],
    queryFn: () => base44.entities.HRPolicy.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 60000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["hr-staff-assignments", refreshKey],
    queryFn: () => base44.entities.HRPolicyStaffAssignment.filter({ org_id: ORG_ID }, "-assigned_at", 500),
    staleTime: 60000,
  });

  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    const activePolicies = policies.filter(p => p.status === "Active");
    const activeAssignments = assignments.filter(a => ["Assigned", "Viewed", "Overdue"].includes(a.status));
    const requiredAcks = assignments.filter(a => a.acknowledgement_required && !["Exempted", "Cancelled"].includes(a.status));
    const acknowledged = requiredAcks.filter(a => a.acknowledged_at);
    const ackPct = requiredAcks.length > 0 ? Math.round((acknowledged.length / requiredAcks.length) * 100) : 0;

    const outstandingStaff = new Set(
      assignments
        .filter(a => a.acknowledgement_required && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status))
        .map(a => a.staff_id)
    ).size;

    const overdue = assignments.filter(a =>
      a.due_date && a.due_date < today && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status)
    );

    // Dept coverage
    const deptGroups = {};
    assignments.filter(a => a.acknowledgement_required).forEach(a => {
      const dept = a.staff_department || "Unknown";
      if (!deptGroups[dept]) deptGroups[dept] = { total: 0, acked: 0 };
      deptGroups[dept].total++;
      if (a.acknowledged_at) deptGroups[dept].acked++;
    });
    const deptPcts = Object.values(deptGroups).map(d => d.total > 0 ? (d.acked / d.total) * 100 : 0);
    const avgCoverage = deptPcts.length > 0 ? Math.round(deptPcts.reduce((s, v) => s + v, 0) / deptPcts.length) : 0;

    return { activePolicies, activeAssignments, ackPct, outstandingStaff, overdue, avgCoverage, acknowledged, requiredAcks, deptGroups };
  }, [policies, assignments, today]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard icon={FileText} label="Total Policies" value={stats.activePolicies.length} sub={`${policies.length} total`} color="blue" linkLabel="View all" onClick={() => setModal("policies")} />
        <KPICard icon={Users} label="Active Assignments" value={stats.activeAssignments.length} sub="Active records" color="teal" linkLabel="View assignments" onClick={() => setModal("assignments")} />
        <KPICard icon={CheckCircle2} label="Read & Acknowledged %" value={`${stats.ackPct}%`} sub={`${stats.acknowledged.length} of ${stats.requiredAcks.length} required`} color="green" linkLabel="View progress" onClick={() => setModal("ack")} />
        <KPICard icon={AlertTriangle} label="Outstanding Staff" value={stats.outstandingStaff} sub={`${stats.outstandingStaff > 0 ? Math.round((stats.outstandingStaff / Math.max(1, new Set(assignments.map(a => a.staff_id)).size)) * 100) : 0}% of total staff`} color="amber" linkLabel="View staff" onClick={() => setModal("outstanding")} />
        <KPICard icon={Clock} label="Overdue Acknowledgements" value={stats.overdue.length} sub="Requires attention" color="red" linkLabel="View overdue" onClick={() => setModal("overdue")} />
        <KPICard icon={Building2} label="Department Coverage" value={`${stats.avgCoverage}%`} sub="Avg completion" color="purple" linkLabel="View coverage" onClick={() => setModal("dept")} />
      </div>

      {modal === "policies" && (
        <KPIModal title={`Active Policies (${stats.activePolicies.length})`} onClose={() => setModal(null)}>
          <div className="space-y-2">
            {stats.activePolicies.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No active policies</p>}
            {stats.activePolicies.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-700">{p.policy_title}</p>
                  <p className="text-xs text-slate-400">{p.category} · v{p.current_version_number || "1.0"}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">Active</span>
              </div>
            ))}
          </div>
        </KPIModal>
      )}

      {modal === "outstanding" && (
        <KPIModal title={`Outstanding Staff (${stats.outstandingStaff})`} onClose={() => setModal(null)}>
          <div className="space-y-2">
            {(() => {
              const staffMap = {};
              assignments.filter(a => a.acknowledgement_required && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status))
                .forEach(a => {
                  if (!staffMap[a.staff_id]) staffMap[a.staff_id] = { name: a.staff_name, dept: a.staff_department, count: 0 };
                  staffMap[a.staff_id].count++;
                });
              return Object.entries(staffMap).map(([id, s]) => (
                <div key={id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">{s.name?.charAt(0) || "?"}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.dept || "—"}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-700">{s.count} outstanding</span>
                </div>
              ));
            })()}
          </div>
        </KPIModal>
      )}

      {modal === "overdue" && (
        <KPIModal title={`Overdue Acknowledgements (${stats.overdue.length})`} onClose={() => setModal(null)}>
          <div className="space-y-2">
            {stats.overdue.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No overdue acknowledgements</p>}
            {stats.overdue.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 border border-red-100 rounded-xl bg-red-50">
                <Clock className="w-4 h-4 text-red-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-700">{a.staff_name}</p>
                  <p className="text-xs text-slate-500">{a.policy_title}</p>
                </div>
                <span className="text-xs font-bold text-red-700">Due {a.due_date}</span>
              </div>
            ))}
          </div>
        </KPIModal>
      )}

      {modal === "dept" && (
        <KPIModal title="Department Coverage" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {Object.entries(stats.deptGroups).map(([dept, d]) => {
              const pct = d.total > 0 ? Math.round((d.acked / d.total) * 100) : 0;
              return (
                <div key={dept}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{dept}</span>
                    <span className="font-bold">{pct}% ({d.acked}/{d.total})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full">
                    <div className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.deptGroups).length === 0 && <p className="text-sm text-slate-400 text-center py-8">No department data yet</p>}
          </div>
        </KPIModal>
      )}
    </>
  );
}