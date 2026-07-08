// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X, AlertCircle, ChevronRight } from "lucide-react";
import { performanceApi } from "@/lib/performanceApi";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Config ────────────────────────────────────────────────────────────────────

const ALERT_LABELS = {
  supervision_overdue: "Supervision Overdue",
  training_expired:    "Training Expired",
  no_activity:         "No Activity",
  goal_stalled:        "Goal Stalled",
  appraisal_overdue:   "Appraisal Overdue",
};

const ALERT_COLORS = {
  supervision_overdue: "bg-amber-100 text-amber-700",
  training_expired:    "bg-red-100 text-red-700",
  no_activity:         "bg-slate-100 text-slate-600",
  goal_stalled:        "bg-blue-100 text-blue-700",
  appraisal_overdue:   "bg-orange-100 text-orange-700",
};

const SEV_CFG = {
  high:   { cls: "bg-red-100 text-red-700",    dot: "bg-red-500" },
  medium: { cls: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
  low:    { cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

function AlertTypeBadge({ type }) {
  const cls = ALERT_COLORS[type] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize whitespace-nowrap ${cls}`}>
      {ALERT_LABELS[type] ?? type?.replace(/_/g, " ")}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const cfg = SEV_CFG[severity] ?? SEV_CFG.low;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${cfg.cls}`}>
      {severity}
    </span>
  );
}

// ── Summary chips ─────────────────────────────────────────────────────────────

function SummaryChips({ alerts, activeType, onTypeClick }) {
  const byType = alerts.reduce((acc, a) => {
    acc[a.alert_type] = (acc[a.alert_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => (
          <button
            key={type}
            onClick={() => onTypeClick(activeType === type ? "" : type)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              activeType === type
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <span>{ALERT_LABELS[type] ?? type}</span>
            <span className="bg-foreground/10 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>
          </button>
        ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * PerformanceAlertsModal
 *
 * Full-page alerts panel for the Employee Performance dashboard.
 * Fetches all performance alerts from the backend with optional
 * type and severity filtering. Clicking any alert row navigates
 * to that staff member's performance tab.
 *
 * Props:
 *   filters  { periodFilter, homeId, role, department, search } — active dashboard filters
 *   onClose  fn
 */
export default function PerformanceAlertsModal({ filters, onClose }) {
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState("");
  const [sevFilter,  setSevFilter]  = useState("all"); // "all" = no filter (Radix Select rejects "")

  const activeSev = sevFilter === "all" ? "" : sevFilter;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["perf-alerts-full", filters, typeFilter, activeSev],
    queryFn:  () => performanceApi.alerts(filters, {
      alertType: typeFilter,
      severity:  activeSev,
    }),
    staleTime: 2 * 60 * 1000,
  });

  const alerts = data?.alerts ?? [];
  const total  = data?.total  ?? 0;

  // For summary chips we use unfiltered alerts (only type-filter active, not sev)
  const { data: allData } = useQuery({
    queryKey: ["perf-alerts-all", filters],
    queryFn:  () => performanceApi.alerts(filters, {}),
    staleTime: 2 * 60 * 1000,
  });
  const allAlerts = allData?.alerts ?? [];

  const highCount   = allAlerts.filter((a) => a.severity === "high").length;
  const mediumCount = allAlerts.filter((a) => a.severity === "medium").length;

  function handleTypeChip(type) {
    setTypeFilter(type);
  }

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
            <div className="p-1.5 bg-red-500/10 rounded-full">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Performance Alerts</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {total} alert{total !== 1 ? "s" : ""}
                {highCount > 0 && ` · ${highCount} high severity`}
                {mediumCount > 0 && ` · ${mediumCount} medium`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="px-6 py-3 border-b border-border shrink-0 space-y-3">
          {/* Summary chips */}
          {allAlerts.length > 0 && (
            <SummaryChips
              alerts={allAlerts}
              activeType={typeFilter}
              onTypeClick={handleTypeChip}
            />
          )}

          {/* Severity filter */}
          <div className="flex items-center gap-3">
            <div className="w-40">
              <Select value={sevFilter} onValueChange={(v) => setSevFilter(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"    className="text-xs">All Severities</SelectItem>
                  <SelectItem value="high"   className="text-xs">High</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="low"    className="text-xs">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(typeFilter || sevFilter !== "all") && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => { setTypeFilter(""); setSevFilter("all"); }}
              >
                Clear filters
              </button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {isLoading ? "Loading…" : `${alerts.length} result${alerts.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-6 py-3 flex gap-3 items-center">
                  <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Failed to load alerts.</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                {typeFilter || sevFilter
                  ? "No alerts match the current filters."
                  : "No active performance alerts."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-2.5 text-xs font-medium text-muted-foreground">Staff Member</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Alert</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Severity</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Detail</th>
                  <th className="text-right px-6 py-2.5 text-xs font-medium text-muted-foreground w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alerts.map((a, i) => (
                  <tr
                    key={i}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => {
                      navigate(`/staff?employee=${a.staff_id}&ptab=performance`);
                      onClose();
                    }}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          a.severity === "high"   ? "bg-red-500"   :
                          a.severity === "medium" ? "bg-amber-400" :
                                                    "bg-slate-400"
                        }`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{a.staff_name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {a.staff_role?.replace(/_/g, " ") ?? a.role?.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <AlertTypeBadge type={a.alert_type} />
                    </td>
                    <td className="px-3 py-3">
                      <SeverityBadge severity={a.severity} />
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground max-w-[200px]">
                      <p className="truncate">{a.detail || "—"}</p>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </td>
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
