// @ts-nocheck
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Target, CheckCircle2, Clock, Circle, PauseCircle, XCircle } from "lucide-react";
import { performanceApi } from "@/lib/performanceApi";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  not_started: { label: "Not Started", cls: "bg-slate-100 text-slate-600", icon: Circle },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700",   icon: Clock },
  achieved:    { label: "Achieved",    cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  deferred:    { label: "Deferred",    cls: "bg-amber-100 text-amber-700",  icon: PauseCircle },
  cancelled:   { label: "Cancelled",   cls: "bg-slate-100 text-slate-500",  icon: XCircle },
};

const STATUS_OPTIONS = [
  { value: "_all",        label: "All Statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "achieved",    label: "Achieved" },
  { value: "deferred",    label: "Deferred" },
  { value: "cancelled",   label: "Cancelled" },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: "bg-slate-100 text-slate-600", icon: Circle };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * GoalsListModal
 *
 * Full goal history for a single staff member, opened from the expanded row in
 * the Employee Performance dashboard. Fetches from the backend using
 * performanceApi.getStaffGoals — shows all goals, not just active ones.
 *
 * Props:
 *   staffId    string
 *   staffName  string
 *   staffRole  string
 *   onClose    fn
 */
export default function GoalsListModal({ staffId, staffName, staffRole, onClose }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatus] = useState("_all"); // "_all" = no filter (Radix Select rejects "")

  const activeStatus = statusFilter === "_all" ? "" : statusFilter;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["staff-goals", staffId, activeStatus],
    queryFn:  () => performanceApi.getStaffGoals(staffId, { status: activeStatus }),
    staleTime: 2 * 60 * 1000,
    enabled: !!staffId,
  });

  const goals = Array.isArray(data) ? data : (data?.data ?? []);
  const total = data?.total ?? goals.length;

  const resetFilters = () => setStatus("_all");
  const hasFilters   = statusFilter !== "_all";

  function handleGoalUpdated() {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["perf-team"] });
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              {staffName?.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold text-sm">{staffName} — Performance Goals</h2>
              <p className="text-[10px] text-muted-foreground capitalize">
                {staffRole?.replace(/_/g, " ")}
                {total > 0 && ` · ${total} goal${total !== 1 ? "s" : ""}`}
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
            <label className="text-[10px] text-muted-foreground block mb-1">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 space-y-2">
                  <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm text-muted-foreground">Failed to load goals.</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Target className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {hasFilters ? "No goals match the current filter." : "No goals on record."}
              </p>
              {hasFilters && (
                <button onClick={resetFilters} className="text-xs text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {goals.map((g) => (
                <div key={g.id} className="px-6 py-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{g.title || "Untitled goal"}</p>
                      {g.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{g.description}</p>
                      )}
                    </div>
                    <StatusBadge status={g.status} />
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${g.progress ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right shrink-0">
                      {g.progress ?? 0}%
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                    {g.category && (
                      <span className="capitalize">{g.category.replace(/_/g, " ")}</span>
                    )}
                    {g.target_date && (
                      <span>Target: {g.target_date}</span>
                    )}
                    {g.set_by && (
                      <span className="capitalize">Set by: {g.set_by === "manager" ? (g.set_by_name || "manager") : "self"}</span>
                    )}
                    {g.achieved_date && (
                      <span className="text-green-600">Achieved: {g.achieved_date}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
