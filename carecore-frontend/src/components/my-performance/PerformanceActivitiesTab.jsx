// @ts-nocheck
import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  BarChart2, Clock, Heart, BookOpen, FileText, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// ── Config ─────────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { value: "all",          label: "All Activities" },
  { value: "kw_session",   label: "KW Sessions" },
  { value: "visit_report", label: "Visit Reports" },
  { value: "daily_log",    label: "Daily Logs" },
];

const TYPE_STYLE = {
  kw_session:   { label: "KW Session",   cls: "bg-purple-100 text-purple-700", icon: Heart },
  visit_report: { label: "Visit Report", cls: "bg-blue-100 text-blue-700",     icon: FileText },
  daily_log:    { label: "Daily Log",    cls: "bg-slate-100 text-slate-600",   icon: BookOpen },
};

const ENGAGEMENT_STYLE = {
  high:   "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-red-100 text-red-700",
};

const PAGE_SIZE = 20;

// ── API helper ─────────────────────────────────────────────────────────────────

async function fetchActivities({ type, period, dateFrom, dateTo, page }) {
  const token = sessionStorage.getItem("access_token") || sessionStorage.getItem("token");
  const base = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

  const params = new URLSearchParams({ type, page, page_size: PAGE_SIZE });
  if (dateFrom && dateTo) {
    params.set("from", dateFrom);
    params.set("to", dateTo);
  } else {
    params.set("period", period);
  }

  const r = await fetch(`${base}/business/my-performance/activities?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("Failed to load activities");
  const json = await r.json();
  return json.data;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PerformanceActivitiesTab({ period }) {
  const [type, setType]         = useState("all");
  const [page, setPage]         = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  const hasDateFilter = dateFrom && dateTo;

  const queryKey = ["my-performance-activities", period, type, page, dateFrom, dateTo];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchActivities({ type, period, dateFrom, dateTo, page }),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const activities  = data?.activities ?? [];
  const total       = data?.total      ?? 0;
  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Totals computed from current page for the stats bar
  const pageTotalHours = useMemo(
    () => activities.reduce((acc, a) => acc + (a.hours_with_yp ?? 0), 0),
    [activities],
  );

  function resetFilters() {
    setType("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const hasActiveFilters = type !== "all" || hasDateFilter;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        {/* Type pills */}
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setType(f.value); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                type === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Date range + clear */}
        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="h-8 text-xs w-36"
            placeholder="From"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="h-8 text-xs w-36"
            placeholder="To"
          />
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded border border-border hover:bg-muted"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && total > 0 && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BarChart2 className="w-4 h-4" />
            <span>
              <span className="font-semibold text-foreground">{total}</span> activities
              {hasDateFilter && (
                <span className="text-xs ml-1">({dateFrom} – {dateTo})</span>
              )}
            </span>
          </div>
          {pageTotalHours > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                <span className="font-semibold text-foreground">{pageTotalHours.toFixed(1)}h</span>{" "}
                on this page
              </span>
            </div>
          )}
          {isFetching && !isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>
          )}
        </div>
      )}

      {/* Table */}
      <div className={cn(
        "bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-opacity",
        isFetching && "opacity-70",
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-28">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Young Person</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Home</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-16">Hours</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Engagement</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className={cn(
                          "h-3 bg-muted rounded animate-pulse",
                          j === 0 ? "w-20" : j === 6 ? "w-32" : "w-16",
                        )} />
                      </td>
                    ))}
                  </tr>
                ))
              }

              {!isLoading && activities.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <BarChart2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No activities found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasActiveFilters
                        ? "Try clearing your filters."
                        : "No activities recorded for this period."}
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading && activities.map(a => {
                const ts = TYPE_STYLE[a.type] ?? { label: a.type, cls: "bg-muted text-muted-foreground", icon: BarChart2 };
                const TypeIcon = ts.icon;
                const engCls = ENGAGEMENT_STYLE[a.engagement_level?.toLowerCase()] ?? "";

                return (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {a.date}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                        ts.cls,
                      )}>
                        <TypeIcon className="w-3 h-3" />
                        {ts.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{a.resident_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.home_name || "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {a.hours_with_yp > 0 ? `${a.hours_with_yp}h` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.engagement_level ? (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                          engCls || "bg-muted text-muted-foreground",
                        )}>
                          {a.engagement_level}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {a.summary || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-xs text-muted-foreground">
          {total > 0
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
            : "No records"}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "min-w-[32px] h-8 rounded border text-xs font-medium transition-colors",
                    p === page
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
