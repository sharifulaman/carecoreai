import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { Search, CheckCircle2, Clock } from "lucide-react";

const STATUS_COLORS = {
  Acknowledged: "bg-green-100 text-green-700",
  Viewed: "bg-blue-100 text-blue-700",
  Assigned: "bg-slate-100 text-slate-600",
  Overdue: "bg-red-100 text-red-700",
  Exempted: "bg-purple-100 text-purple-700",
  Cancelled: "bg-slate-100 text-slate-400",
};

export default function PolicyAcknowledgementsTab({ refreshKey, staffProfile, staff, canManage, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const today = new Date().toISOString().split("T")[0];

  const { data: assignments = [] } = useQuery({
    queryKey: ["hr-staff-assignments", refreshKey],
    queryFn: () => base44.entities.HRPolicyStaffAssignment.filter({ org_id: ORG_ID }, "-assigned_at", 500),
    staleTime: 60000,
  });

  const isSW = staffProfile?.role === "support_worker";

  const filtered = useMemo(() => {
    let rows = assignments;
    if (isSW) rows = rows.filter(a => a.staff_id === staffProfile?.id);
    if (filterStatus !== "all") {
      if (filterStatus === "overdue") rows = rows.filter(a => a.due_date && a.due_date < today && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status));
      else rows = rows.filter(a => a.status === filterStatus);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(a => a.staff_name?.toLowerCase().includes(q) || a.policy_title?.toLowerCase().includes(q));
    }
    return rows;
  }, [assignments, filterStatus, search, isSW, staffProfile, today]);

  const getRealStatus = (a) => {
    if (a.acknowledged_at) return "Acknowledged";
    if (a.due_date && a.due_date < today && !["Exempted", "Cancelled"].includes(a.status)) return "Overdue";
    return a.status || "Assigned";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          ["Total Required", assignments.filter(a => a.acknowledgement_required).length, "text-slate-700"],
          ["Acknowledged", assignments.filter(a => a.acknowledged_at).length, "text-green-600"],
          ["Outstanding", assignments.filter(a => !a.acknowledged_at && a.acknowledgement_required && !["Exempted", "Cancelled"].includes(a.status)).length, "text-amber-600"],
          ["Overdue", assignments.filter(a => a.due_date && a.due_date < today && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status)).length, "text-red-600"],
        ].map(([label, count, cls]) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${cls}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-400" />Acknowledgement Records</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none w-40" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
              <option value="all">All Statuses</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Viewed">Viewed</option>
              <option value="Assigned">Assigned</option>
              <option value="overdue">Overdue</option>
              <option value="Exempted">Exempted</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{["Staff Member", "Policy", "Version", "Assigned", "Due Date", "Viewed", "Acknowledged", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">All required acknowledgements are complete.</p>
                </td></tr>
              ) : filtered.map(a => {
                const realStatus = getRealStatus(a);
                return (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {a.staff_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{a.staff_name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{a.staff_department || a.staff_role?.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.policy_title}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">v{a.policy_version_number || "1.0"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{a.assigned_at ? format(new Date(a.assigned_at), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={a.due_date && a.due_date < today && !a.acknowledged_at ? "text-red-600 font-semibold" : "text-slate-500"}>{a.due_date || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{a.viewed_at ? format(new Date(a.viewed_at), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{a.acknowledged_at ? format(new Date(a.acknowledged_at), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[realStatus] || STATUS_COLORS.Assigned}`}>{realStatus}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">Showing {filtered.length} records</div>}
      </div>
    </div>
  );
}