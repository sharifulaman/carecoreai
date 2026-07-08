import { format } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Returns an array of page numbers and "..." gaps for the paginator.
// Always shows first, last, and current ± 1. Gaps are represented by "...".
function buildPageRange(current, total) {
  if (total <= 0) return [];
  const candidates = new Set(
    [1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total)
  );
  const sorted = [...candidates].sort((a, b) => a - b);
  const result = [];
  let prev = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) result.push("...");
    result.push(p);
    prev = p;
  }
  return result;
}

const ACTION_BADGE_CONFIG = {
  created: "bg-blue-100 text-blue-700",
  updated: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  escalated: "bg-purple-100 text-purple-700",
  deleted: "bg-red-100 text-red-700",
  restored: "bg-orange-100 text-orange-700",
  exported: "bg-cyan-100 text-cyan-700",
  downloaded: "bg-cyan-100 text-cyan-700",
};

const SEVERITY_BADGE_CONFIG = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-800",
};

const MODULE_ICONS = {
  incidents: "📋",
  safeguarding: "🛡️",
  finance: "💰",
  bills: "📄",
  hr: "👥",
  training: "📚",
  homes: "🏠",
};

export default function AuditEventsTable({
  events,
  totalEvents,
  isLoading,
  isFetching,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  selectedEvent,
  onSelectEvent,
  onRefresh,
}) {
  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase() || "?";
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm">Audit Events ({totalEvents.toLocaleString()})</h3>
        <Button size="sm" variant="ghost" className="gap-2" onClick={onRefresh}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <div className={`overflow-x-auto transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Timestamp</th>
              <th className="px-4 py-2 text-left font-semibold">User</th>
              <th className="px-4 py-2 text-left font-semibold">Role</th>
              <th className="px-4 py-2 text-left font-semibold">Module</th>
              <th className="px-4 py-2 text-left font-semibold">Record / Reference</th>
              <th className="px-4 py-2 text-left font-semibold">Action</th>
              <th className="px-4 py-2 text-left font-semibold">Severity</th>
              <th className="px-4 py-2 text-center font-semibold w-12"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="px-4 py-12 text-center text-muted-foreground">
                  Loading events...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-12 text-center text-muted-foreground">
                  No audit events found.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={`border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${
                    selectedEvent?.id === event.id ? "bg-primary/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {event.created_date
                      ? format(new Date(event.created_date), "dd MMM yyyy HH:mm a")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                        {getInitials(event.actor_name)}
                      </div>
                      <span className="text-foreground font-medium">{event.actor_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {event.actor_role?.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>{MODULE_ICONS[event.module_name] || "📌"}</span>
                      <span className="text-foreground font-medium">{event.module_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div>
                      <p className="font-medium text-foreground">{event.record_reference}</p>
                      <p className="text-muted-foreground truncate">{event.record_title}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        ACTION_BADGE_CONFIG[event.action_type?.toLowerCase()] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {event.action_type?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        SEVERITY_BADGE_CONFIG[event.severity?.toLowerCase()] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {event.severity?.charAt(0).toUpperCase() + event.severity?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
        <div className="text-xs text-muted-foreground">
          {totalEvents === 0
            ? "No results"
            : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalEvents)} of ${totalEvents.toLocaleString()} results`}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-8 w-8 flex items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {buildPageRange(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`gap-${i}`} className="h-8 w-6 flex items-center justify-center text-xs text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                    page === p
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-8 w-8 flex items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}