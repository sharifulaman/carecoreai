import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { Search, Users } from "lucide-react";

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-700",
  Completed: "bg-blue-100 text-blue-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

export default function PolicyAssignmentsTab({ refreshKey, staffProfile, staff, homes, canManage, onRefresh }) {
  const [search, setSearch] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const { data: batches = [] } = useQuery({
    queryKey: ["hr-assignment-batches", refreshKey],
    queryFn: () => base44.entities.HRPolicyAssignmentBatch.filter({ org_id: ORG_ID }, "-assigned_at", 100),
    staleTime: 60000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["hr-staff-assignments", refreshKey],
    queryFn: () => base44.entities.HRPolicyStaffAssignment.filter({ org_id: ORG_ID }, "-assigned_at", 500),
    staleTime: 60000,
  });

  const batchStats = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      if (!map[a.assignment_batch_id]) map[a.assignment_batch_id] = { total: 0, acked: 0, overdue: 0 };
      map[a.assignment_batch_id].total++;
      if (a.acknowledged_at) map[a.assignment_batch_id].acked++;
      if (a.due_date && a.due_date < today && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status)) map[a.assignment_batch_id].overdue++;
    });
    return map;
  }, [assignments, today]);

  const filtered = useMemo(() => batches.filter(b => {
    const q = search.toLowerCase();
    return !q || b.policy_title?.toLowerCase().includes(q) || b.assignment_name?.toLowerCase().includes(q);
  }), [batches, search]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" />Assignment Batches</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none w-44" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{["Assignment", "Policy", "Scope", "Staff", "Acknowledged", "Overdue", "Due Date", "Assigned By", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">No policy assignments yet</td></tr>
              ) : filtered.map(batch => {
                const stats = batchStats[batch.id] || { total: 0, acked: 0, overdue: 0 };
                const ackPct = stats.total > 0 ? Math.round((stats.acked / stats.total) * 100) : 0;
                return (
                  <tr key={batch.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700 max-w-[160px] truncate">{batch.assignment_name || "Assignment"}</td>
                    <td className="px-4 py-3 text-slate-600">{batch.policy_title}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{batch.assignment_scope}</td>
                    <td className="px-4 py-3 text-slate-600 font-semibold">{stats.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${ackPct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{ackPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold ${stats.overdue > 0 ? "text-red-600" : "text-slate-400"}`}>{stats.overdue}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{batch.due_date || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{batch.assigned_by_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[batch.status] || STATUS_COLORS.Active}`}>{batch.status || "Active"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}