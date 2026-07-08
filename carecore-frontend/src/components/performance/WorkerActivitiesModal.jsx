// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { performanceApi } from "@/lib/performanceApi";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Activity type config ──────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "_all",                label: "All Types" },
  { value: "visit_report",        label: "Visit Report" },
  { value: "key_worker_session",  label: "Key Worker Session" },
  { value: "daily_summary",       label: "Daily Summary" },
  { value: "daily_log",           label: "Daily Log" },
  { value: "training_completed",  label: "Training Completed" },
  { value: "supervision_conducted", label: "Supervision Conducted" },
  { value: "incident_reported",   label: "Incident Reported" },
  { value: "care_plan_review",    label: "Care Plan Review" },
  { value: "medication_administered", label: "Medication Administered" },
  { value: "cic_report",          label: "CIC Report" },
  { value: "goal_created",        label: "Goal Created" },
  { value: "goal_updated",        label: "Goal Updated" },
  { value: "shift_handover",      label: "Shift Handover" },
];

const TYPE_COLORS = {
  visit_report:          "bg-blue-100 text-blue-700",
  key_worker_session:    "bg-purple-100 text-purple-700",
  daily_summary:         "bg-teal-100 text-teal-700",
  daily_log:             "bg-teal-100 text-teal-700",
  training_completed:    "bg-green-100 text-green-700",
  supervision_conducted: "bg-amber-100 text-amber-700",
  incident_reported:     "bg-red-100 text-red-700",
  care_plan_review:      "bg-indigo-100 text-indigo-700",
  medication_administered: "bg-pink-100 text-pink-700",
  cic_report:            "bg-cyan-100 text-cyan-700",
  goal_created:          "bg-emerald-100 text-emerald-700",
  goal_updated:          "bg-emerald-100 text-emerald-700",
  shift_handover:        "bg-slate-100 text-slate-700",
};

function TypeBadge({ type }) {
  const cls = TYPE_COLORS[type] ?? "bg-slate-100 text-slate-600";
  const label = type?.replace(/_/g, " ");
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize whitespace-nowrap ${cls}`}>
      {label || "—"}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/**
 * WorkerActivitiesModal
 *
 * Full paginated activity log for a single staff member, opened from the
 * Employee Performance dashboard. Fetches from the backend using
 * performanceApi.staffActivities — no client-side filtering of bulk data.
 *
 * Props:
 *   staffId    string   — the staff member's ID
 *   staffName  string   — display name for the modal header
 *   staffRole  string   — display role
 *   onClose    fn       — closes the modal
 */
export default function WorkerActivitiesModal({ staffId, staffName, staffRole, onClose }) {
  const [page, setPage]       = useState(1);
  const [typeFilter, setType] = useState("_all"); // "_all" = no filter (Radix Select rejects "")
  const [fromDate, setFrom]   = useState("");
  const [toDate, setTo]       = useState("");

  const activeType = typeFilter === "_all" ? "" : typeFilter;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["staff-activities", staffId, page, activeType, fromDate, toDate],
    queryFn:  () => performanceApi.staffActivities(staffId, {
      type:     activeType,
      from:     fromDate,
      to:       toDate,
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime:      2 * 60 * 1000,
    keepPreviousData: true,
    enabled: !!staffId,
  });

  const activities  = data?.activities ?? [];
  const total       = data?.total ?? 0;
  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = () => {
    setType("_all");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const hasFilters = typeFilter !== "_all" || fromDate || toDate;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border border-border w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              {staffName?.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold text-sm">{staffName} — Activity Log</h2>
              <p className="text-[10px] text-muted-foreground capitalize">
                {staffRole?.replace(/_/g, " ")}
                {total > 0 && ` · ${total} records`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="px-6 py-3 border-b border-border shrink-0 flex flex-wrap gap-3 items-end">
          <div className="w-44">
            <label className="text-[10px] text-muted-foreground block mb-1">Activity Type</label>
            <Select value={typeFilter} onValueChange={(v) => { setType(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="h-8 px-2 text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="h-8 px-2 text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline self-end pb-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-6 py-3 flex gap-3 items-center">
                  <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm text-muted-foreground">Failed to load activities.</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Activity className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {hasFilters ? "No activities match the current filters." : "No activities recorded."}
              </p>
              {hasFilters && (
                <button onClick={resetFilters} className="text-xs text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-2.5 text-xs font-medium text-muted-foreground w-44">Type</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Summary</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground w-36">Resident / Home</th>
                  <th className="text-right px-6 py-2.5 text-xs font-medium text-muted-foreground w-28">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activities.map((act, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3">
                      <TypeBadge type={act.type} />
                    </td>
                    <td className="px-3 py-3 text-xs text-foreground max-w-[280px]">
                      <p className="truncate">{act.summary || "—"}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {act.resident_name || act.home_name || "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground text-right whitespace-nowrap">
                      {act.date || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs px-2">{page} / {totalPages}</span>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
