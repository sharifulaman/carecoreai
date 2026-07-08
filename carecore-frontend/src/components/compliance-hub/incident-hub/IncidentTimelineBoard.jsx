import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";
import {
  getTimelineStage, getTimelineTimestamps, getResolutionHours, formatResolution,
  getOfstedStatus, getIncidentSeverity, isReviewOverdue,
  SEVERITY_COLORS, OFSTED_STATUS_COLORS, STATUS_COLORS, INCIDENT_TYPE_LABELS,
} from "@/lib/incidentAnalytics";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "severity", label: "Highest severity" },
  { value: "longest", label: "Longest unresolved" },
  { value: "ofsted", label: "Ofsted pending first" },
  { value: "closed", label: "Recently closed" },
];

const SEVERITY_ORDER = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function TimelineTracker({ incident }) {
  const stage = getTimelineStage(incident);
  const timestamps = getTimelineTimestamps(incident);
  const stages = ["Logged", "Submitted", "Reviewed", "Actioned", "Closed"];

  return (
    <div className="flex items-center gap-0.5">
      {stages.map((s, i) => {
        const isComplete = i <= stage;
        const isCurrent = i === stage && stage < 4;
        const ts = timestamps[s];
        return (
          <div key={s} className="flex items-center" title={ts ? `${s}: ${format(new Date(ts), "d MMM HH:mm")}` : s}>
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isComplete ? "bg-blue-500" : "bg-slate-200"
            } ${isCurrent ? "ring-2 ring-blue-300 ring-offset-1" : ""}`} />
            {i < 4 && <div className={`w-3 h-0.5 ${isComplete && i < stage ? "bg-blue-400" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function IncidentRow({ incident, ofstedNotifications, isSelected, onToggleSelect, homes }) {
  const severity = getIncidentSeverity(incident);
  const ofstedStatus = getOfstedStatus(incident, ofstedNotifications);
  const resHours = getResolutionHours(incident);
  const overdue = isReviewOverdue(incident);
  const home = homes.find(h => h.id === incident.home_id);
  const initials = incident.resident_name ? incident.resident_name.split(" ").map(w => w[0]).join("") : "—";

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${overdue ? "bg-red-50/30" : ""}`}>
      <td className="px-3 py-2.5">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect}
          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
      </td>
      <td className="px-2 py-2.5 text-[10px] font-mono text-slate-400 truncate max-w-[80px]">{incident.id?.slice(0, 8)}</td>
      <td className="px-2 py-2.5 text-xs text-slate-600 whitespace-nowrap">
        {incident.incident_datetime ? format(new Date(incident.incident_datetime), "d MMM HH:mm") : "—"}
      </td>
      <td className="px-2 py-2.5 text-xs font-medium text-slate-700 truncate max-w-[100px]">{home?.name || incident.home_name || "—"}</td>
      <td className="px-2 py-2.5 text-xs text-slate-500">{initials}</td>
      <td className="px-2 py-2.5 text-xs text-slate-600 truncate max-w-[120px]">{INCIDENT_TYPE_LABELS[incident.incident_type] || incident.incident_type?.replace(/_/g, " ") || "—"}</td>
      <td className="px-2 py-2.5">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[severity]}`}>{severity}</span>
      </td>
      <td className="px-2 py-2.5">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[incident.status] || "bg-slate-100 text-slate-500"}`}>
          {incident.status?.replace(/_/g, " ") || "—"}
        </span>
      </td>
      <td className="px-2 py-2.5 text-[10px] text-slate-500 truncate max-w-[80px]">{incident.recorded_by_name || "—"}</td>
      <td className="px-2 py-2.5 text-[10px] text-slate-500 whitespace-nowrap">
        {incident.status === "closed" && incident.manager_review_date
          ? format(new Date(incident.manager_review_date), "d MMM")
          : <span className="text-amber-600">Open</span>}
      </td>
      <td className={`px-2 py-2.5 text-[10px] font-medium ${overdue ? "text-red-600" : "text-slate-500"} whitespace-nowrap`}>
        {formatResolution(resHours)}
      </td>
      <td className="px-2 py-2.5">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${OFSTED_STATUS_COLORS[ofstedStatus]}`}>{ofstedStatus}</span>
      </td>
      <td className="px-2 py-2.5"><TimelineTracker incident={incident} /></td>
    </tr>
  );
}

export default function IncidentTimelineBoard({ incidents, ofstedNotifications, homes, selectedIds, setSelectedIds, filters }) {
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const sorted = useMemo(() => {
    let list = [...incidents];
    switch (sort) {
      case "oldest": list.sort((a, b) => (a.incident_datetime || "").localeCompare(b.incident_datetime || "")); break;
      case "severity": list.sort((a, b) => (SEVERITY_ORDER[getIncidentSeverity(b)] || 0) - (SEVERITY_ORDER[getIncidentSeverity(a)] || 0)); break;
      case "longest": list.sort((a, b) => getResolutionHours(b) - getResolutionHours(a)); break;
      case "ofsted": list.sort((a, b) => {
        const aPending = getOfstedStatus(a, ofstedNotifications) === "Pending" ? 0 : 1;
        const bPending = getOfstedStatus(b, ofstedNotifications) === "Pending" ? 0 : 1;
        return aPending - bPending;
      }); break;
      case "closed": list.sort((a, b) => (b.manager_review_date || "").localeCompare(a.manager_review_date || "")); break;
      default: list.sort((a, b) => (b.incident_datetime || "").localeCompare(a.incident_datetime || ""));
    }
    return list;
  }, [incidents, sort, ofstedNotifications]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleAll = () => {
    if (selectedIds.length === pageRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pageRows.map(i => i.id));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Incident Timeline &amp; Resolution Board</h3>
          <p className="text-[10px] text-slate-400">{sorted.length} incidents {selectedIds.length > 0 && `· ${selectedIds.length} selected`}</p>
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={pageRows.length > 0 && selectedIds.length === pageRows.length} onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              </th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">ID</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Date</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">YP</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Type</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Severity</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Status</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Assigned</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Solved</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Time</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Ofsted</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Timeline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pageRows.map(inc => (
              <IncidentRow key={inc.id} incident={inc} ofstedNotifications={ofstedNotifications}
                homes={homes} isSelected={selectedIds.includes(inc.id)} onToggleSelect={() => toggleOne(inc.id)} />
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={13} className="text-center py-12 text-slate-400 text-sm">No incidents found for this date range.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Page {page + 1} of {totalPages} · Showing {pageRows.length} of {sorted.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 flex items-center"><ChevronUp className="w-3 h-3" /></button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 flex items-center"><ChevronDown className="w-3 h-3" /></button>
          </div>
        </div>
      )}
    </div>
  );
}