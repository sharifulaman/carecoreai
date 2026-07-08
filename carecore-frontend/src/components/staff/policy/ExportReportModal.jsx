import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { X, Download, FileText } from "lucide-react";
import { format } from "date-fns";

const REPORT_TYPES = [
  "Policy completion report",
  "Outstanding acknowledgements report",
  "Overdue acknowledgements report",
  "Department coverage report",
  "Role coverage report",
  "Individual staff policy status report",
  "Audit evidence report",
];

export default function ExportReportModal({ onClose }) {
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [filterPolicy, setFilterPolicy] = useState("");

  const { data: policies = [] } = useQuery({
    queryKey: ["hr-policies-export"],
    queryFn: () => base44.entities.HRPolicy.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 60000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["hr-assignments-export"],
    queryFn: () => base44.entities.HRPolicyStaffAssignment.filter({ org_id: ORG_ID }, "-assigned_at", 500),
    staleTime: 60000,
  });

  const today = new Date().toISOString().split("T")[0];

  const reportData = useMemo(() => {
    let rows = assignments;
    if (filterPolicy) rows = rows.filter(a => a.policy_id === filterPolicy);
    if (reportType.includes("Outstanding")) rows = rows.filter(a => !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status));
    if (reportType.includes("Overdue")) rows = rows.filter(a => a.due_date && a.due_date < today && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status));
    return rows;
  }, [assignments, filterPolicy, reportType, today]);

  const exportCSV = () => {
    const headers = ["Staff Name", "Department", "Role", "Policy", "Version", "Assigned Date", "Due Date", "Viewed Date", "Acknowledged Date", "Status", "Reminders"];
    const rows = reportData.map(a => [
      a.staff_name, a.staff_department, a.staff_role, a.policy_title, a.policy_version_number,
      a.assigned_at ? format(new Date(a.assigned_at), "dd/MM/yyyy") : "",
      a.due_date || "",
      a.viewed_at ? format(new Date(a.viewed_at), "dd/MM/yyyy") : "",
      a.acknowledged_at ? format(new Date(a.acknowledged_at), "dd/MM/yyyy") : "",
      a.status, a.reminder_count || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `policy-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors = { Acknowledged: "bg-green-100 text-green-700", Viewed: "bg-blue-100 text-blue-700", Assigned: "bg-slate-100 text-slate-600", Overdue: "bg-red-100 text-red-700", Exempted: "bg-purple-100 text-purple-700" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Export Report</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={reportType} onChange={e => setReportType(e.target.value)}>
            {REPORT_TYPES.map(r => <option key={r}>{r}</option>)}
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={filterPolicy} onChange={e => setFilterPolicy(e.target.value)}>
            <option value="">All Policies</option>
            {policies.map(p => <option key={p.id} value={p.id}>{p.policy_title}</option>)}
          </select>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 ml-auto">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {reportData.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3" />
              <p>No data for selected report</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{["Staff", "Department", "Role", "Policy", "Due Date", "Viewed", "Acknowledged", "Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {reportData.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{a.staff_name}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{a.staff_department || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs capitalize">{a.staff_role?.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2.5 text-slate-600">{a.policy_title}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{a.due_date || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{a.viewed_at ? format(new Date(a.viewed_at), "dd MMM") : "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{a.acknowledged_at ? format(new Date(a.acknowledged_at), "dd MMM") : "—"}</td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[a.status] || "bg-slate-100 text-slate-500"}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}