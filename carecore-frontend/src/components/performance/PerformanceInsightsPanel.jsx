// @ts-nocheck
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Trophy, AlertCircle, ChevronRight, Users2, TrendingUp, TrendingDown,
} from "lucide-react";

// ── Palettes ──────────────────────────────────────────────────────────────────

const ROLE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6",
  "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
];

// One distinct color per department bar
const DEPT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6"];

// ── Alert type labels ─────────────────────────────────────────────────────────

const ALERT_LABELS = {
  supervision_overdue: "Supervision Overdue",
  training_expired:    "Training Expired",
  no_activity:         "No Activity",
  goal_stalled:        "Goal Stalled",
  appraisal_overdue:   "Appraisal Overdue",
};

function AlertSeverityDot({ severity }) {
  const cls =
    severity === "high"   ? "bg-red-500"    :
    severity === "medium" ? "bg-amber-400"  :
                            "bg-slate-400";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

// ── Staff mini-row ────────────────────────────────────────────────────────────

function StaffMiniRow({ row, onClick, showBadge, badgeCls, badgeLabel }) {
  return (
    <div
      className="flex items-center justify-between gap-2 py-1.5 cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
          {row.staff_name?.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{row.staff_name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">
            {row.role?.replace(/_/g, " ")}
          </p>
        </div>
      </div>
      {showBadge && (
        <span className={`text-xs font-semibold shrink-0 px-1.5 py-0.5 rounded ${badgeCls}`}>
          {badgeLabel}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * PerformanceInsightsPanel
 *
 * Sidebar panel on the Employee Performance dashboard.
 * All data comes from the `kpiData` (TeamKPIs) object returned by /business/performance/team-kpis.
 * No client-side calculations — backend pre-computes everything.
 */
export default function PerformanceInsightsPanel({ kpiData, isLoading, onViewAllAlerts }) {
  const navigate = useNavigate();

  const topPerformers  = kpiData?.top_performers   ?? [];
  const needsReview    = kpiData?.needs_review     ?? [];
  const roleDistrib    = kpiData?.role_distribution ?? [];
  const alertsPreview  = kpiData?.alerts_list      ?? [];
  const alertsCount    = kpiData?.alerts_count     ?? 0;
  const deptPerf       = kpiData?.dept_performance  ?? [];

  const pieData = roleDistrib.map((r) => ({
    name:  r.role?.replace(/_/g, " "),
    value: r.count,
  }));

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        {[80, 60, 100, 70].map((w, i) => (
          <div key={i} className={`h-4 w-${w === 100 ? "full" : `[${w}%]`} bg-muted rounded animate-pulse`} />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-5">
      <h2 className="font-semibold text-sm">Performance Insights</h2>

      {/* ── Performance by Department ── */}
      {deptPerf.length > 0 && (
        <section>
          <p className="text-xs font-semibold mb-3">Performance by Department</p>
          <div className="space-y-2.5">
            {deptPerf.map((d, idx) => {
              const pct   = d.score >= 0 ? d.score : 0;
              const color = DEPT_COLORS[idx % DEPT_COLORS.length];
              const label = d.score >= 0 ? `${d.score}%` : "N/A";
              return (
                <div key={d.dept}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-foreground">{d.dept}</span>
                    <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Top Performers ── */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-semibold text-amber-700">Top Performers</p>
        </div>
        {topPerformers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No data for this period.</p>
        ) : (
          <div className="divide-y divide-border -mx-1">
            {topPerformers.slice(0, 5).map((row) => (
              <StaffMiniRow
                key={row.staff_id}
                row={row}
                onClick={() => navigate(`/staff?employee=${row.staff_id}&ptab=performance`)}
                showBadge
                badgeCls="bg-green-500/10 text-green-700"
                badgeLabel={row.score >= 0 ? `${row.score}%` : "N/A"}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Needs Review ── */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          <p className="text-xs font-semibold text-red-700">Needs Attention</p>
        </div>
        {needsReview.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No staff in this category.</p>
        ) : (
          <div className="divide-y divide-border -mx-1">
            {needsReview.slice(0, 5).map((row) => (
              <StaffMiniRow
                key={row.staff_id}
                row={row}
                onClick={() => navigate(`/staff?employee=${row.staff_id}&ptab=performance`)}
                showBadge
                badgeCls="bg-red-500/10 text-red-700"
                badgeLabel={row.score >= 0 ? `${row.score}%` : "N/A"}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Active Alerts ── */}
      {alertsCount > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <p className="text-xs font-semibold">Alerts ({alertsCount})</p>
            </div>
            <button
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              onClick={() => onViewAllAlerts?.()}
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {alertsPreview.slice(0, 5).map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/20 rounded px-1 -mx-1 transition-colors"
                onClick={() => navigate(`/staff?employee=${a.staff_id}&ptab=performance`)}
              >
                <AlertSeverityDot severity={a.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{a.staff_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ALERT_LABELS[a.alert_type] ?? a.alert_type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Role Distribution Pie ── */}
      {pieData.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <Users2 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold">Role Distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: "11px" }}
                formatter={(value, name) => [`${value} staff`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
            {roleDistrib.slice(0, 8).map((r, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: ROLE_COLORS[idx % ROLE_COLORS.length] }}
                />
                <span className="text-[10px] text-muted-foreground truncate capitalize">
                  {r.role?.replace(/_/g, " ")} ({r.count})
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
