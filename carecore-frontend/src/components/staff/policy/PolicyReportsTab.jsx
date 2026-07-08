import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { BarChart2, Download } from "lucide-react";

export default function PolicyReportsTab({ refreshKey, staffProfile, staff, homes }) {
  const today = new Date().toISOString().split("T")[0];

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

  const policyCompletion = useMemo(() => {
    return policies.map(p => {
      const pas = assignments.filter(a => a.policy_id === p.id && !["Exempted", "Cancelled"].includes(a.status));
      const acked = pas.filter(a => a.acknowledged_at).length;
      const pct = pas.length > 0 ? Math.round((acked / pas.length) * 100) : 0;
      const overdue = pas.filter(a => a.due_date && a.due_date < today && !a.acknowledged_at).length;
      return { ...p, total: pas.length, acked, pct, overdue };
    });
  }, [policies, assignments, today]);

  const deptCompletion = useMemo(() => {
    const map = {};
    assignments.filter(a => a.acknowledgement_required && !["Exempted", "Cancelled"].includes(a.status)).forEach(a => {
      const dept = a.staff_department || "Unknown";
      if (!map[dept]) map[dept] = { dept, total: 0, acked: 0 };
      map[dept].total++;
      if (a.acknowledged_at) map[dept].acked++;
    });
    return Object.values(map).map(d => ({ ...d, pct: d.total > 0 ? Math.round((d.acked / d.total) * 100) : 0 })).sort((a, b) => b.pct - a.pct);
  }, [assignments]);

  const exportCSV = (data, filename, headers, rowFn) => {
    const rows = data.map(rowFn);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-slate-400" />
        <h2 className="text-base font-bold text-slate-800">Policy Reports</h2>
      </div>

      {/* Policy Completion */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Policy Completion Report</h3>
          <button onClick={() => exportCSV(policyCompletion, "policy-completion.csv",
            ["Policy", "Category", "Version", "Staff Assigned", "Acknowledged", "Completion %", "Overdue"],
            p => [p.policy_title, p.category, p.current_version_number, p.total, p.acked, `${p.pct}%`, p.overdue]
          )} className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:underline">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Policy", "Category", "Version", "Assigned", "Acknowledged", "Completion", "Overdue"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {policyCompletion.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No data yet</td></tr>
            ) : policyCompletion.map(p => (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{p.policy_title}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.category}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">v{p.current_version_number || "1.0"}</td>
                <td className="px-4 py-3 text-slate-600">{p.total}</td>
                <td className="px-4 py-3 text-green-600 font-semibold">{p.acked}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${p.pct >= 80 ? "bg-green-500" : p.pct >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{p.pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3"><span className={`text-xs font-bold ${p.overdue > 0 ? "text-red-600" : "text-slate-400"}`}>{p.overdue}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Department Coverage */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Department Coverage Report</h3>
          <button onClick={() => exportCSV(deptCompletion, "dept-coverage.csv",
            ["Department", "Total Required", "Acknowledged", "Completion %"],
            d => [d.dept, d.total, d.acked, `${d.pct}%`]
          )} className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:underline">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        {deptCompletion.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No department data yet</p>
        ) : (
          <div className="p-5 space-y-3">
            {deptCompletion.map(d => (
              <div key={d.dept}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{d.dept}</span>
                  <span className="text-slate-500">{d.acked}/{d.total} — <span className="font-bold">{d.pct}%</span></span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${d.pct >= 80 ? "bg-green-500" : d.pct >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}