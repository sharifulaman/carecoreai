import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { base44 } from "@/api/base44Client";
import { Wrench, Plus, X, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const CATEGORIES = ["Plumbing","Electrical","Heating","Fire Safety","Structural","Furniture","Appliance","Security","Cleaning","Internet / Broadband","Pest Control","Other"];
const STATUSES = ["Open","In Progress","Awaiting Contractor","Resolved","Closed"];

const priorityColor = { High: "bg-red-100 text-red-700", Urgent: "bg-red-200 text-red-800", Medium: "bg-amber-100 text-amber-700", Low: "bg-slate-100 text-slate-600" };
const statusColor = { Open: "bg-red-50 text-red-600", "In Progress": "bg-blue-50 text-blue-600", "Awaiting Contractor": "bg-amber-50 text-amber-700", Resolved: "bg-green-50 text-green-700", Closed: "bg-slate-50 text-slate-500" };

function IssueModal({ homes, staffProfiles, onClose, onSaved, existing }) {
  const [form, setForm] = useState(existing || { home_id: "", issue_title: "", issue_description: "", issue_category: "Other", priority: "Medium", status: "Open", reported_date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.home_id || !form.issue_title) return;
    setSaving(true);
    if (existing?.id) {
      await base44.entities.MaintenanceLog.update(existing.id, form);
    } else {
      await base44.entities.MaintenanceLog.create({ org_id: ORG_ID, ...form });
    }
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">{existing ? "Edit Issue" : "Log New Issue"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-3">
          {[["Home", "home_id", "select", homes.map(h => ({ v: h.id, l: h.name }))], ["Issue Title", "issue_title", "text"], ["Category", "issue_category", "select", CATEGORIES.map(v => ({ v, l: v }))], ["Priority", "priority", "select", PRIORITIES.map(v => ({ v, l: v }))], ["Status", "status", "select", STATUSES.map(v => ({ v, l: v }))], ["Description", "issue_description", "textarea"], ["Reported Date", "reported_date", "date"]].map(([label, key, type, opts]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
              {type === "select" ? (
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[key]} onChange={e => set(key, e.target.value)}>
                  <option value="">Select…</option>
                  {(opts || []).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ) : type === "textarea" ? (
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-20" value={form[key]} onChange={e => set(key, e.target.value)} />
              ) : (
                <input type={type} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[key]} onChange={e => set(key, e.target.value)} />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Save Issue"}</button>
            <button onClick={onClose} className="px-4 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaintenanceIssuesTab({ homes, staffProfile, user }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterHome, setFilterHome] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: issues = [] } = useQuery({ queryKey: ["maintenance-logs"], queryFn: () => secureGateway.filter("MaintenanceLog", {}, "-reported_date", 200), staleTime: 2 * 60 * 1000 });
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  const filtered = issues.filter(i => {
    if (filterHome !== "all" && i.home_id !== filterHome) return false;
    if (filterPriority !== "all" && (i.priority || "Medium") !== filterPriority) return false;
    if (filterStatus !== "all" && (i.status || "Open") !== filterStatus) return false;
    return true;
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["maintenance-logs"] });

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-800">Maintenance & Issues</h2>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Log Issue
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Open", "text-red-600", issues.filter(i => i.status === "Open" || !i.status).length],
          ["In Progress", "text-blue-600", issues.filter(i => i.status === "In Progress").length],
          ["High Priority", "text-amber-600", issues.filter(i => i.priority === "High" || i.priority === "Urgent").length],
          ["Resolved", "text-green-600", issues.filter(i => i.status === "Resolved" || i.status === "Closed").length],
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
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                <td className="px-4 py-3 font-medium text-slate-700">{iss.issue_title || iss.description || "Issue"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{homeMap[iss.home_id]?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{iss.issue_category || iss.maintenance_type || "—"}</td>
                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${priorityColor[iss.priority] || priorityColor.Medium}`}>{iss.priority || "Medium"}</span></td>
                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColor[iss.status] || statusColor.Open}`}>{iss.status || "Open"}</span></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{iss.reported_date ? format(new Date(iss.reported_date), "dd MMM yyyy") : "—"}</td>
                <td className="px-4 py-3"><button onClick={() => { setEditing(iss); setShowModal(true); }} className="text-xs text-teal-600 hover:underline">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <IssueModal homes={homes} staffProfiles={[]} existing={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={refresh} />}
    </div>
  );
}