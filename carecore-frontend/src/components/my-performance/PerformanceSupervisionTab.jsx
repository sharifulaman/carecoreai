// @ts-nocheck
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import {
  CalendarCheck, CheckCircle2, Clock, AlertTriangle,
  User, Timer, Star, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Config ─────────────────────────────────────────────────────────────────────

const SUPERVISION_STATUS = {
  on_track:  { label: "On Track",  icon: CheckCircle2,  cls: "text-green-700 bg-green-50 border-green-200",  dot: "bg-green-500" },
  due_soon:  { label: "Due Soon",  icon: Clock,         cls: "text-amber-700 bg-amber-50 border-amber-200",  dot: "bg-amber-500" },
  overdue:   { label: "Overdue",   icon: AlertTriangle, cls: "text-red-700 bg-red-50 border-red-200",        dot: "bg-red-500" },
  no_record: { label: "No Record", icon: CalendarCheck, cls: "text-slate-600 bg-slate-50 border-slate-200", dot: "bg-slate-400" },
};

const RECORD_STATUS = {
  completed:        { label: "Completed",        cls: "bg-green-100 text-green-700" },
  scheduled:        { label: "Scheduled",        cls: "bg-blue-100 text-blue-700" },
  cancelled:        { label: "Cancelled",        cls: "bg-red-100 text-red-700" },
  did_not_attend:   { label: "Did Not Attend",   cls: "bg-amber-100 text-amber-700" },
};

const TYPE_FILTERS = [
  { value: "all",       label: "All" },
  { value: "formal",    label: "Formal" },
  { value: "informal",  label: "Informal" },
  { value: "telephone", label: "Telephone" },
  { value: "group",     label: "Group" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function weeksSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
}

function addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PerformanceSupervisionTab({ summary, staffProfile }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const staffId = staffProfile?.id;
  const metrics  = summary?.metrics ?? {};
  const supStatus = metrics.supervision_status ?? "no_record";
  const lastDate  = metrics.last_supervision_date ?? null;
  const nextScheduled = metrics.next_supervision_date ?? null;
  const upcoming  = summary?.upcoming_supervisions ?? [];

  const nextDueDate     = addDays(lastDate, 42);   // CQC 6-week guideline
  const weeksSinceLast  = weeksSince(lastDate);

  const statusCfg = SUPERVISION_STATUS[supStatus] ?? SUPERVISION_STATUS.no_record;
  const StatusIcon = statusCfg.icon;

  // ── Fetch full history ──────────────────────────────────────────────────────
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["supervision-history", staffId],
    queryFn: () => secureGateway.filter(
      "SupervisionRecord",
      { supervisee_id: staffId },
      "-session_date",
      200,
    ),
    enabled: !!staffId,
    staleTime: 2 * 60 * 1000,
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  const completed = records.filter(r => r.status === "completed");
  const thisYear  = completed.filter(r => r.session_date?.startsWith(String(new Date().getFullYear())));

  // ── Filtered history ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (typeFilter === "all") return records;
    return records.filter(r => r.supervision_type === typeFilter);
  }, [records, typeFilter]);

  return (
    <div className="space-y-5">

      {/* CQC status banner */}
      <div className={cn("rounded-xl border p-4 flex flex-col sm:flex-row sm:items-start gap-4", statusCfg.cls)}>
        <div className="flex items-start gap-3 flex-1">
          <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-sm">Supervision Status: {statusCfg.label}</p>
            {lastDate && (
              <p className="text-xs">
                Last supervision: <span className="font-medium">{formatDate(lastDate)}</span>
                {weeksSinceLast !== null && ` (${weeksSinceLast} week${weeksSinceLast !== 1 ? "s" : ""} ago)`}
              </p>
            )}
            {!lastDate && (
              <p className="text-xs">No completed supervision on record.</p>
            )}
            {nextScheduled && (
              <p className="text-xs">
                Next scheduled: <span className="font-medium">{formatDate(nextScheduled)}</span>
              </p>
            )}
            {nextDueDate && !nextScheduled && (
              <p className="text-xs">
                CQC guideline next due: <span className="font-medium">{formatDate(nextDueDate)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-6 shrink-0 sm:border-l sm:pl-4 border-current/20">
          <div className="text-center">
            <p className="text-lg font-bold">{completed.length}</p>
            <p className="text-[10px] font-medium opacity-70 uppercase tracking-wide">Total</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{thisYear.length}</p>
            <p className="text-[10px] font-medium opacity-70 uppercase tracking-wide">This Year</p>
          </div>
        </div>
      </div>

      {/* Upcoming scheduled */}
      {upcoming.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" />
            Upcoming Supervisions ({upcoming.length})
          </p>
          <div className="space-y-2">
            {upcoming.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100 text-sm">
                <div>
                  <span className="font-medium capitalize">{s.type?.replace(/_/g, " ") ?? "Supervision"}</span>
                  {s.supervisor_name && (
                    <span className="text-muted-foreground text-xs ml-2">with {s.supervisor_name}</span>
                  )}
                </div>
                <span className="text-xs text-blue-700 font-semibold">{formatDate(s.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                typeFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* History list */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border">
          <h3 className="font-semibold text-sm">Supervision History</h3>
        </div>

        {isLoading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex gap-4">
                <div className="h-3 bg-muted rounded w-20" />
                <div className="h-3 bg-muted rounded w-16" />
                <div className="h-3 bg-muted rounded w-24 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <CalendarCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No supervision records found.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="divide-y divide-border">
            {filtered.map(r => {
              const isExpanded = expandedId === r.id;
              const recStatus  = RECORD_STATUS[r.status] ?? { label: r.status, cls: "bg-muted text-muted-foreground" };
              const topics     = (() => {
                try { return JSON.parse(r.topics_discussed || "[]"); } catch { return []; }
              })();

              return (
                <div key={r.id}>
                  {/* Summary row */}
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    {/* Date */}
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-medium">{formatDate(r.session_date)}</p>
                    </div>

                    {/* Type */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm capitalize">
                        {r.supervision_type?.replace(/_/g, " ") ?? "Supervision"}
                      </p>
                      {r.supervisor_name && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 shrink-0" /> {r.supervisor_name}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    {r.duration_minutes > 0 && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Timer className="w-3 h-3" /> {r.duration_minutes}m
                      </div>
                    )}

                    {/* Rating */}
                    {r.overall_rating && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span className="capitalize">{r.overall_rating}</span>
                      </div>
                    )}

                    {/* Status */}
                    <span className={cn(
                      "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      recStatus.cls,
                    )}>
                      {recStatus.label}
                    </span>

                    {/* Expand toggle */}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border space-y-3 text-sm">
                      {topics.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Topics Discussed</p>
                          <div className="flex flex-wrap gap-1.5">
                            {topics.map((t, i) => (
                              <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {r.supervisor_comments && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Supervisor Notes</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{r.supervisor_comments}</p>
                        </div>
                      )}

                      {r.staff_comments && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Your Comments</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{r.staff_comments}</p>
                        </div>
                      )}

                      <div className="flex gap-6 pt-1 text-xs text-muted-foreground">
                        {r.duration_minutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {r.duration_minutes} minutes
                          </span>
                        )}
                        {r.overall_rating && (
                          <span className="flex items-center gap-1 capitalize">
                            <Star className="w-3 h-3 text-amber-400" /> {r.overall_rating}
                          </span>
                        )}
                        {r.staff_acknowledged_at && (
                          <span className="text-green-600 font-medium">✓ Acknowledged</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
