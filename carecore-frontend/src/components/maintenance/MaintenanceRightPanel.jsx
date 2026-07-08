import { format, formatDistanceToNow } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Calendar, Upload, FileText } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "./MaintenanceBadges";

const CHART_COLORS = ["#3b82f6","#ef4444","#f59e0b","#10b981","#8b5cf6","#06b6d4","#f97316"];

export default function MaintenanceRightPanel({ issues, schedules, onAddIssue, onSchedule, onUploadEvidence, onViewContracts, onViewSchedules, onViewAllIssues, isSupportWorker }) {
  // Category breakdown
  const catCounts = {};
  issues.forEach(i => {
    if (!catCounts[i.category]) catCounts[i.category] = 0;
    catCounts[i.category]++;
  });
  const catData = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, count], idx) => ({
      name: CATEGORY_LABELS[cat] || cat,
      value: count,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));

  // Recent activity
  const recentActivity = [...issues]
    .filter(i => i.reported_at || i.completed_at)
    .sort((a, b) => {
      const dateA = a.completed_at || a.reported_at;
      const dateB = b.completed_at || b.reported_at;
      return new Date(dateB) - new Date(dateA);
    })
    .slice(0, 4)
    .map(i => ({
      id: i.id,
      title: i.status === "completed"
        ? `${i.issue_title} resolved`
        : `New issue reported - ${i.home_name}`,
      home: i.home_name,
      by: i.status === "completed" ? i.completed_by_name : i.reported_by_name,
      time: i.status === "completed"
        ? (i.completed_at ? formatDistanceToNow(new Date(i.completed_at), { addSuffix: true }) : "Recently")
        : (i.reported_at ? formatDistanceToNow(new Date(i.reported_at), { addSuffix: true }) : "Recently"),
      type: i.status === "completed" ? "completed" : "reported",
    }));

  // Upcoming schedules
  const upcoming = [...schedules]
    .filter(s => s.status === "active" && s.next_due_at)
    .sort((a, b) => new Date(a.next_due_at) - new Date(b.next_due_at))
    .slice(0, 3);

  const typeColor = { completed: "bg-green-500", reported: "bg-blue-500" };

  return (
    <div className="space-y-4">
      {/* Issues by Category */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Issues by Category</h3>
        {catData.length > 0 ? (
          <>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55}>
                    {catData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {catData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-600 truncate max-w-[130px]">{d.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">No data yet</p>
        )}
      </div>

      {/* Upcoming Scheduled */}
      {!isSupportWorker && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Upcoming Scheduled</h3>
            <button onClick={onViewSchedules} className="text-xs text-blue-600 font-medium hover:underline">View all</button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No scheduled maintenance</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => {
                const due = new Date(s.next_due_at);
                const typeMap = { service: "Service", inspection: "Inspection", test: "Test", contractor_visit: "Contractor", compliance_check: "Compliance", planned_repair: "Repair" };
                const typeBadge = typeMap[s.maintenance_type] || "Scheduled";
                return (
                  <div key={s.id} className="flex items-start gap-3">
                    <div className="text-center min-w-[36px]">
                      <p className="text-xs font-bold text-slate-800">{format(due, "d")}</p>
                      <p className="text-xs text-slate-400">{format(due, "MMM")}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{s.schedule_title}</p>
                      <p className="text-xs text-slate-400">{s.applies_to_all_homes ? "All Homes" : s.home_name} · {format(due, "HH:mm")}</p>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-medium whitespace-nowrap">{typeBadge}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
          <button onClick={onViewAllIssues} className="text-xs text-blue-600 font-medium hover:underline">View all</button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <span className={`w-6 h-6 rounded-full ${typeColor[a.type] || "bg-blue-500"} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>
                  {(a.by || "?").charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 leading-tight">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.by} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}