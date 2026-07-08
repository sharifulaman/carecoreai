import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Search, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";

const EVENT_COLORS = {
  "Policy Uploaded": "bg-blue-100 text-blue-700",
  "AI Course Generated": "bg-violet-100 text-violet-700",
  "Course Published": "bg-green-100 text-green-700",
  "Quiz Passed": "bg-teal-100 text-teal-700",
  "Quiz Failed": "bg-red-100 text-red-700",
  "Policy Acknowledged": "bg-green-100 text-green-700",
  "Course Assigned": "bg-indigo-100 text-indigo-700",
  "AI Generation Failed": "bg-red-100 text-red-700",
  "Course Edited": "bg-amber-100 text-amber-700",
  "Submitted for Review": "bg-blue-100 text-blue-700",
  "Course Approved": "bg-teal-100 text-teal-700",
};

export default function PolicyAuditTrailTab({ refreshKey }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: auditEvents = [], isLoading } = useQuery({
    queryKey: ["hr-audit-events", refreshKey],
    queryFn: () => base44.entities.HRPolicyAuditEvent.filter({ org_id: ORG_ID }, "-created_date", 500),
    staleTime: 60000,
  });

  const eventTypes = useMemo(() => [...new Set(auditEvents.map(e => e.event_type))].sort(), [auditEvents]);

  const filtered = useMemo(() => auditEvents.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.event_description?.toLowerCase().includes(q) || e.policy_title?.toLowerCase().includes(q) || e.staff_name?.toLowerCase().includes(q) || e.performed_by?.toLowerCase().includes(q);
    const matchType = filterType === "all" || e.event_type === filterType;
    return matchQ && matchType;
  }), [auditEvents, search, filterType]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit events…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="all">All Event Types</option>
          {eventTypes.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Date / Time", "Event Type", "Description", "Policy", "Course", "Staff", "Performed By"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center">
                  <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No audit events recorded yet.</p>
                </td></tr>
              )}
              {filtered.map(event => (
                <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {event.created_date ? format(new Date(event.created_date), "dd MMM yyyy HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${EVENT_COLORS[event.event_type] || "bg-slate-100 text-slate-600"}`}>
                      {event.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">{event.event_description || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{event.policy_title || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{event.course_title || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{event.staff_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{event.performed_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">Showing {filtered.length} of {auditEvents.length} events</div>}
      </div>
    </div>
  );
}