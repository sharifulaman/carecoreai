// @ts-nocheck
import { useNavigate } from "react-router-dom";
import { X, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from "recharts";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6",
  "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
];

const ALERT_LABELS = {
  supervision_overdue: "Supervision Overdue",
  training_expired:    "Training Expired",
  no_activity:         "No Activity",
  goal_stalled:        "Goal Stalled",
  appraisal_overdue:   "Appraisal Overdue",
};

function TrendChip({ pct, inverseGood = false }) {
  if (!pct) return <span className="text-xs text-muted-foreground">No trend data</span>;
  const isPositive = pct > 0;
  const isGood     = inverseGood ? !isPositive : isPositive;
  const cls        = isGood ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50";
  const Icon       = isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>
      <Icon className="w-3 h-3" />
      {isPositive ? "+" : ""}{pct}% vs last period
    </span>
  );
}

function StaffScoreRow({ row, navigate }) {
  const scoreCls =
    row.score >= 90 ? "bg-green-500/10 text-green-700" :
    row.score >= 75 ? "bg-blue-500/10 text-blue-700"   :
    row.score >= 60 ? "bg-amber-500/10 text-amber-700"  :
                      "bg-red-500/10 text-red-700";
  return (
    <div
      className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
      onClick={() => navigate(`/staff?employee=${row.staff_id}&ptab=performance`)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
          {row.staff_name?.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{row.staff_name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{row.role?.replace(/_/g, " ")}</p>
        </div>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${scoreCls}`}>
        {row.score >= 0 ? `${row.score}%` : "N/A"}
      </span>
    </div>
  );
}

// ── Per-KPI content builders ──────────────────────────────────────────────────

function TotalEmployeesContent({ kpiData }) {
  const dist = kpiData?.role_distribution ?? [];
  const chartData = [...dist]
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ role: r.role?.replace(/_/g, " ") || "Unknown", count: r.count }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-4xl font-bold">{kpiData?.total_employees ?? "—"}</p>
        <p className="text-sm text-muted-foreground">active staff tracked this period</p>
      </div>

      {chartData.length > 0 && (
        <div className="bg-muted/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-2">Staff by role</p>
          <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 28)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="role" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip formatter={(v) => [v, "Staff"]} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {dist.map((r, idx) => (
          <div key={idx} className="flex items-center gap-2 py-1.5 px-3 bg-muted/20 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ROLE_COLORS[idx % ROLE_COLORS.length] }} />
            <span className="text-xs truncate capitalize">{r.role?.replace(/_/g, " ")}</span>
            <span className="text-xs font-semibold ml-auto">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvgScoreContent({ kpiData, navigate }) {
  const top     = kpiData?.top_performers ?? [];
  const bottom  = kpiData?.needs_review ?? [];
  const trend   = kpiData?.avg_score_trend_pct;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-4xl font-bold">
          {kpiData?.avg_score > 0 ? `${kpiData.avg_score}%` : "—"}
        </p>
        <TrendChip pct={trend} />
      </div>

      {top.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-700 mb-2">Top Performers</p>
          <div className="space-y-1.5">
            {top.slice(0, 5).map((row) => (
              <StaffScoreRow key={row.staff_id} row={row} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {bottom.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-700 mb-2">Needs Attention</p>
          <div className="space-y-1.5">
            {bottom.slice(0, 5).map((row) => (
              <StaffScoreRow key={row.staff_id} row={row} navigate={navigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TasksCompletedContent({ kpiData, navigate }) {
  const trend = kpiData?.tasks_trend_pct;
  const top   = [...(kpiData?.top_performers ?? [])]
    .sort((a, b) => b.activities_count - a.activities_count);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-4xl font-bold">{kpiData?.tasks_completed?.toLocaleString() ?? "—"}</p>
        <TrendChip pct={trend} />
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Total activities logged by all staff this period</p>

      {top.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Most Active Staff</p>
          <div className="space-y-1.5">
            {top.slice(0, 5).map((row) => (
              <div
                key={row.staff_id}
                className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/staff?employee=${row.staff_id}&ptab=performance`)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {row.staff_name?.charAt(0)}
                  </div>
                  <span className="text-xs font-medium truncate">{row.staff_name}</span>
                </div>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded shrink-0">
                  {row.activities_count} activities
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AvgHoursContent({ kpiData, navigate }) {
  const top = [...(kpiData?.top_performers ?? [])]
    .filter((r) => r.avg_hours_per_week > 0)
    .sort((a, b) => b.avg_hours_per_week - a.avg_hours_per_week);

  const chartData = top.slice(0, 8).map((r) => ({
    name: r.staff_name?.split(" ")[0] ?? "?",
    hours: r.avg_hours_per_week,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-4xl font-bold">
          {kpiData?.avg_hours_logged > 0 ? `${kpiData.avg_hours_logged}h` : "—"}
        </p>
        <p className="text-sm text-muted-foreground">average per staff per week</p>
      </div>

      {chartData.length > 0 && (
        <div className="bg-muted/20 rounded-lg p-3">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}h`, "Avg hrs/week"]} />
              <Bar dataKey="hours" fill="#14b8a6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {top.length > 0 && (
        <div className="space-y-1.5">
          {top.slice(0, 5).map((row) => (
            <div
              key={row.staff_id}
              className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => navigate(`/staff?employee=${row.staff_id}&ptab=performance`)}
            >
              <span className="text-xs font-medium truncate">{row.staff_name}</span>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded shrink-0">
                {row.avg_hours_per_week}h/wk
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingComplianceContent({ kpiData, navigate }) {
  const overall   = kpiData?.training_compliance_pct ?? 0;
  const lowTraining = [...(kpiData?.needs_review ?? [])]
    .sort((a, b) => a.training_compliance_pct - b.training_compliance_pct);

  const barColor =
    overall >= 80 ? "#22c55e" : overall >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-4xl font-bold">{overall}%</p>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${
            overall >= 80 ? "bg-green-50 text-green-700" :
            overall >= 60 ? "bg-amber-50 text-amber-700" :
                            "bg-red-50 text-red-700"
          }`}>
            {overall >= 80 ? "Compliant" : overall >= 60 ? "Needs Improvement" : "At Risk"}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${overall}%`, background: barColor }} />
        </div>
        <p className="text-xs text-muted-foreground">Organisation-wide training completion this period</p>
      </div>

      {lowTraining.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-700 mb-2">Staff with Low Compliance</p>
          <div className="space-y-1.5">
            {lowTraining.slice(0, 6).map((row) => (
              <div
                key={row.staff_id}
                className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/staff?employee=${row.staff_id}&ptab=performance`)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{row.staff_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{row.role?.replace(/_/g, " ")}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                  row.training_compliance_pct < 60
                    ? "bg-red-500/10 text-red-700"
                    : "bg-amber-500/10 text-amber-700"
                }`}>
                  {row.training_compliance_pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsContent({ kpiData, navigate }) {
  const alerts = kpiData?.alerts_list ?? [];
  const total  = kpiData?.alerts_count ?? 0;

  const byType = alerts.reduce((acc, a) => {
    acc[a.alert_type] = (acc[a.alert_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-4xl font-bold text-red-600">{total}</p>
        <p className="text-sm text-muted-foreground">active performance alerts</p>
      </div>

      {Object.keys(byType).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(byType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between py-1.5 px-3 bg-red-50 border border-red-100 rounded-lg">
              <span className="text-xs capitalize">{ALERT_LABELS[type] ?? type.replace(/_/g, " ")}</span>
              <span className="text-xs font-bold text-red-700 ml-2 shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Showing {alerts.length} of {total} alerts
          </p>
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-2 px-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/staff?employee=${a.staff_id}&ptab=performance`)}
              >
                <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${
                  a.severity === "high" ? "text-red-500" :
                  a.severity === "medium" ? "text-amber-500" : "text-slate-400"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{a.staff_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {ALERT_LABELS[a.alert_type] ?? a.alert_type}
                    {a.detail ? ` — ${a.detail}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded shrink-0 ${
                  a.severity === "high"   ? "bg-red-100 text-red-700"    :
                  a.severity === "medium" ? "bg-amber-100 text-amber-700" :
                                           "bg-slate-100 text-slate-600"
                }`}>{a.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No active alerts.</p>
      )}
    </div>
  );
}

// ── Modal titles ──────────────────────────────────────────────────────────────

const TITLES = {
  total_employees:         "Employee Headcount Breakdown",
  avg_score:               "Performance Score Analysis",
  tasks_completed:         "Tasks & Activities Completed",
  avg_hours_logged:        "Hours Logged per Staff",
  training_compliance_pct: "Training Compliance Detail",
  alerts_count:            "Active Performance Alerts",
};

// ── Main component ────────────────────────────────────────────────────────────

/**
 * KPIDrilldownModal
 *
 * Opens when a manager clicks any KPI card on the Employee Performance dashboard.
 * Receives kpiData (TeamKPIs from the backend) and kpiKey — renders a focused
 * breakdown of that specific metric using only pre-computed backend data.
 */
export default function KPIDrilldownModal({ kpiKey, kpiData, onClose }) {
  const navigate = useNavigate();

  const period = kpiData?.period;
  const title  = TITLES[kpiKey] ?? "KPI Detail";

  function renderContent() {
    switch (kpiKey) {
      case "total_employees":         return <TotalEmployeesContent kpiData={kpiData} />;
      case "avg_score":               return <AvgScoreContent kpiData={kpiData} navigate={navigate} />;
      case "tasks_completed":         return <TasksCompletedContent kpiData={kpiData} navigate={navigate} />;
      case "avg_hours_logged":        return <AvgHoursContent kpiData={kpiData} navigate={navigate} />;
      case "training_compliance_pct": return <TrainingComplianceContent kpiData={kpiData} navigate={navigate} />;
      case "alerts_count":            return <AlertsContent kpiData={kpiData} navigate={navigate} />;
      default:                        return null;
    }
  }

  const content = renderContent();
  if (!content) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-sm">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Period label */}
        {period?.label && (
          <div className="px-5 pt-3">
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {period.label}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="p-5">
          {content}
        </div>
      </div>
    </div>
  );
}
