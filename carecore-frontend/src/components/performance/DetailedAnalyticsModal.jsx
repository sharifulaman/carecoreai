// @ts-nocheck
import { useState } from "react";
import { X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

const ROLE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6",
  "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
];

const VIEWS = [
  { id: "role",  label: "Role Breakdown" },
  { id: "score", label: "Score Distribution" },
  { id: "home",  label: "Home Comparison" },
];

// ── Role breakdown ────────────────────────────────────────────────────────────

function RoleBreakdownView({ kpiData }) {
  const dist = kpiData?.role_distribution ?? [];
  const chartData = [...dist]
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ role: r.role?.replace(/_/g, " ") || "Unknown", count: r.count }));

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No role data available.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {kpiData?.total_employees ?? 0} staff across {chartData.length} role{chartData.length !== 1 ? "s" : ""}
      </p>
      <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 32)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 110, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
          <YAxis dataKey="role" type="category" tick={{ fontSize: 10 }} width={110} />
          <Tooltip formatter={(v) => [v, "Staff"]} />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2">
        {chartData.map((r, idx) => (
          <div key={idx} className="flex items-center justify-between px-3 py-2 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: ROLE_COLORS[idx % ROLE_COLORS.length] }}
              />
              <span className="text-xs truncate capitalize">{r.role}</span>
            </div>
            <span className="text-xs font-semibold ml-2 shrink-0">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score distribution ────────────────────────────────────────────────────────

function ScoreDistributionView({ kpiData }) {
  const top    = kpiData?.top_performers  ?? [];
  const bottom = kpiData?.needs_review    ?? [];
  const all    = [...top, ...bottom];

  const buckets = [
    { range: "90–100%", min: 90, max: 100, color: "#22c55e" },
    { range: "75–89%",  min: 75, max: 89,  color: "#3b82f6" },
    { range: "60–74%",  min: 60, max: 74,  color: "#f59e0b" },
    { range: "Below 60%", min: 0, max: 59, color: "#ef4444" },
  ].map((b) => ({
    ...b,
    count: all.filter((r) => r.score >= b.min && r.score <= b.max).length,
  }));

  const chartData = buckets.filter((b) => b.count > 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Based on {all.length} scored staff · Org avg:{" "}
        <strong>{kpiData?.avg_score > 0 ? `${kpiData.avg_score}%` : "—"}</strong>
      </p>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [v, "Staff"]} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {chartData.map((b, i) => (
                <Cell key={i} fill={b.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">Not enough score data to display distribution.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-green-700">Top Performers</p>
          {top.slice(0, 5).map((r) => (
            <div key={r.staff_id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-green-50 rounded">
              <span className="truncate">{r.staff_name}</span>
              <span className="font-semibold text-green-700 ml-2 shrink-0">{r.score}%</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-700">Needs Attention</p>
          {bottom.slice(0, 5).map((r) => (
            <div key={r.staff_id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-red-50 rounded">
              <span className="truncate">{r.staff_name}</span>
              <span className="font-semibold text-red-700 ml-2 shrink-0">
                {r.score >= 0 ? `${r.score}%` : "N/A"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Home comparison ───────────────────────────────────────────────────────────

function HomeComparisonView({ teamData }) {
  const rows = teamData?.data ?? [];

  // Group rows by home_name and compute per-home stats
  const homeMap = {};
  rows.forEach((r) => {
    const name = r.home_name || "Unassigned";
    if (!homeMap[name]) homeMap[name] = { name, scores: [], training: [], activities: 0 };
    if (r.score >= 0)   homeMap[name].scores.push(r.score);
    homeMap[name].training.push(r.training_compliance_pct);
    homeMap[name].activities += r.activities_count;
  });

  const chartData = Object.values(homeMap)
    .map((h) => ({
      home:       h.name,
      avgScore:   h.scores.length   ? Math.round(h.scores.reduce((s, v) => s + v, 0)    / h.scores.length)   : 0,
      training:   h.training.length ? Math.round(h.training.reduce((s, v) => s + v, 0) / h.training.length) : 0,
      activities: h.activities,
      staff:      Math.max(h.scores.length, h.training.length),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No home data available for this period.</p>;
  }
  if (chartData.length === 1 && chartData[0].home === "Unassigned") {
    return <p className="text-sm text-muted-foreground text-center py-8">All staff are unassigned to a home.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Comparison across {chartData.length} home{chartData.length !== 1 ? "s" : ""} · based on current page of staff
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="home" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
          <Tooltip formatter={(v, name) => [`${v}${name === "activities" ? "" : "%"}`, name]} />
          <Legend />
          <Bar dataKey="avgScore"  fill="#6366f1" name="Avg Score (%)"    radius={[3, 3, 0, 0]} />
          <Bar dataKey="training"  fill="#10b981" name="Training Compliance (%)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="space-y-1.5">
        {chartData.map((h, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/20 rounded-lg">
            <div>
              <p className="text-xs font-medium">{h.home}</p>
              <p className="text-[10px] text-muted-foreground">{h.staff} staff</p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-xs font-semibold">{h.avgScore > 0 ? `${h.avgScore}%` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Score</p>
              </div>
              <div>
                <p className="text-xs font-semibold">{h.training}%</p>
                <p className="text-[10px] text-muted-foreground">Training</p>
              </div>
              <div>
                <p className="text-xs font-semibold">{h.activities}</p>
                <p className="text-[10px] text-muted-foreground">Activities</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * DetailedAnalyticsModal
 *
 * "View Detailed Analytics" modal on the Employee Performance dashboard.
 * Shows three views: Role Breakdown, Score Distribution, Home Comparison.
 * All data comes from kpiData (TeamKPIs) and teamData (TeamPerformancePage)
 * passed from the parent — no client-side random generation.
 *
 * Props: kpiData, teamData, homes, onClose
 */
export default function DetailedAnalyticsModal({ kpiData, teamData, onClose }) {
  const [view, setView] = useState("role");

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-semibold text-sm">Detailed Analytics</h2>
            {kpiData?.period?.label && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpiData.period.label}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── View tabs ── */}
        <div className="flex gap-1 px-5 pt-4 pb-0">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === v.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="p-5">
          {view === "role"  && <RoleBreakdownView  kpiData={kpiData} />}
          {view === "score" && <ScoreDistributionView kpiData={kpiData} />}
          {view === "home"  && <HomeComparisonView teamData={teamData} />}
        </div>
      </div>
    </div>
  );
}
