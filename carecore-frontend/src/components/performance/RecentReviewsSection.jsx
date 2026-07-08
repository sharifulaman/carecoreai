// @ts-nocheck
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

const SCORE_CLS = (score) =>
  score >= 80 ? "bg-green-500/10 text-green-700" :
  score >= 60 ? "bg-amber-500/10 text-amber-700" :
                "bg-red-500/10 text-red-700";

const SUP_CLS = (status) =>
  status === "overdue"  ? "text-red-600"   :
  status === "upcoming" ? "text-amber-600" :
                          "text-green-700";

const ROLE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6",
  "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
];

// ── Per-role aggregation from teamData rows ───────────────────────────────────

function buildRoleChart(rows) {
  const map = {};
  rows.forEach((r) => {
    const role = r.role?.replace(/_/g, " ") || "Unknown";
    if (!map[role]) map[role] = { role, scores: [], activities: 0, training: [] };
    if (r.score >= 0) map[role].scores.push(r.score);
    map[role].activities += r.activities_count ?? 0;
    map[role].training.push(r.training_compliance_pct ?? 0);
  });

  return Object.values(map)
    .map((g) => ({
      role:       g.role,
      avgScore:   g.scores.length   ? Math.round(g.scores.reduce((s, v) => s + v, 0)    / g.scores.length)   : 0,
      training:   g.training.length ? Math.round(g.training.reduce((s, v) => s + v, 0) / g.training.length) : 0,
      activities: g.activities,
    }))
    .sort((a, b) => b.activities - a.activities);
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * RecentReviewsSection
 *
 * Bottom section on the Employee Performance dashboard showing:
 *   1. A summary table of the top 5 staff from the current page (real backend data)
 *   2. A per-role activity and score comparison bar chart (aggregated from teamData rows)
 *
 * All values come from the backend — no client-side hash scores or hardcoded dates.
 *
 * Props: teamData (TeamPerformancePage), kpiData (TeamKPIs)
 */
export default function RecentReviewsSection({ teamData, kpiData }) {
  const rows     = teamData?.data ?? [];
  const top5     = rows.slice(0, 5);
  const roleData = buildRoleChart(rows);
  const period   = kpiData?.period?.label ?? teamData?.period?.label ?? null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm">Staff Performance Summary &amp; Role Breakdown</h2>
        {period && (
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{period}</span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Staff table ── */}
        <div className="overflow-x-auto">
          {top5.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4">No staff data for this period.</p>
          ) : (
            <table className="w-full text-sm min-w-[480px]">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Employee</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Role</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Score</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Training</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Supervision</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Last Supervision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {top5.map((row) => (
                  <tr key={row.staff_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 text-xs font-medium">{row.staff_name}</td>
                    <td className="px-3 py-2 text-xs capitalize text-muted-foreground">
                      {row.role?.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.score >= 0 ? (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${SCORE_CLS(row.score)}`}>
                          {row.score}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${SCORE_CLS(row.training_compliance_pct)}`}>
                        {row.training_compliance_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium capitalize ${SUP_CLS(row.supervision_status)}`}>
                        {row.supervision_status?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.last_supervision_date || "No record"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Role comparison chart ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3">
            Activity &amp; Score by Role
            {rows.length > 0 && (
              <span className="font-normal ml-1">({rows.length} staff)</span>
            )}
          </p>
          {roleData.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4">No data to display.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roleData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="role"
                  tick={{ fontSize: 9 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={40}
                />
                <YAxis yAxisId="score" tick={{ fontSize: 10 }} domain={[0, 100]} width={28} />
                <YAxis yAxisId="acts"  orientation="right" tick={{ fontSize: 10 }} width={32} />
                <Tooltip
                  contentStyle={{ fontSize: "11px" }}
                  formatter={(v, name) => [
                    name === "Avg Score (%)" || name === "Training (%)" ? `${v}%` : v,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar yAxisId="score" dataKey="avgScore"  name="Avg Score (%)"  fill="#6366f1" radius={[3, 3, 0, 0]}>
                  {roleData.map((_, i) => (
                    <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                  ))}
                </Bar>
                <Bar yAxisId="score" dataKey="training"  name="Training (%)"   fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="acts"  dataKey="activities" name="Activities"     fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
