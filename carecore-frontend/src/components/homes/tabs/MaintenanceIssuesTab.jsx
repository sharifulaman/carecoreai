import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ORG_ID } from "@/lib/roleConfig";
import { base44 } from "@/api/base44Client";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import AddMaintenanceModal from "@/components/maintenance/AddMaintenanceModal";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const CATEGORIES = ["heating_boiler","plumbing","garden_external","security","fire_safety","electrical","pest_control","structural","cleaning_hygiene","appliance","internet_utilities","furniture_fixtures","gas","other"];
const STATUSES = ["open","reported","assigned","in_progress","awaiting_contractor","awaiting_parts","planned","completed","cancelled"];

const priorityColor = { high: "bg-red-100 text-red-700", urgent: "bg-red-200 text-red-800", medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600" };
const statusColor = { open: "bg-red-50 text-red-600", reported: "bg-red-50 text-red-600", "in_progress": "bg-blue-50 text-blue-600", "awaiting_contractor": "bg-amber-50 text-amber-700", completed: "bg-green-50 text-green-700", cancelled: "bg-slate-50 text-slate-500" };

export default function MaintenanceIssuesTab({ homes, staffProfile, user }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterHome, setFilterHome] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: issues = [] } = useQuery({ queryKey: ["maintenance-issues"], queryFn: () => base44.entities.PropertyMaintenance.filter({ org_id: ORG_ID }, "-reported_at", 200), staleTime: 2 * 60 * 1000 });
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  const filtered = issues.filter(i => {
    if (filterHome !== "all" && i.home_id !== filterHome) return false;
    if (filterPriority !== "all" && (i.priority || "medium") !== filterPriority) return false;
    if (filterStatus !== "all" && (i.status || "reported") !== filterStatus) return false;
    return true;
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["maintenance-issues"] });

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-800">Maintenance & Issues</h2>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Add Maintenance Issue
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Reported", "text-red-600", issues.filter(i => i.status === "reported" || i.status === "open" || !i.status).length],
          ["In Progress", "text-blue-600", issues.filter(i => i.status === "in_progress").length],
          ["High Priority", "text-amber-600", issues.filter(i => i.priority === "high" || i.priority === "urgent").length],
          ["Completed", "text-green-600", issues.filter(i => i.status === "completed").length],
        ].map(([label, cls, count]) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${cls}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white rounded-xl border border-slate-200 p-3">
        <select value={filterHome} onChange={e => setFilterHome(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="all">All Homes</option>
          {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="all">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
      </div>

      {/* Issues table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Issue", "Home", "Category", "Priority", "Status", "Reported", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No maintenance issues found</td></tr>
            ) : filtered.map(iss => (
              <tr key={iss.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{iss.issue_title || "Issue"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{iss.home_name || "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{(iss.category || "—").replace(/_/g, " ")}</td>
                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${priorityColor[iss.priority] || priorityColor.medium}`}>{iss.priority || "medium"}</span></td>
                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${statusColor[iss.status] || statusColor.reported}`}>{(iss.status || "reported").replace(/_/g, " ")}</span></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{iss.reported_at ? format(new Date(iss.reported_at), "dd MMM yyyy") : "—"}</td>
                <td className="px-4 py-3"><button onClick={() => { setEditing(iss); setShowModal(true); }} className="text-xs text-teal-600 hover:underline">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddMaintenanceModal
          homes={homes}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSuccess={refresh}
          staffProfile={null}
          user={null}
        />
      )}
    </div>
  );
}