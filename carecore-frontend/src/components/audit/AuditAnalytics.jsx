import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { TrendingUp, AlertTriangle, BarChart3 as BarIcon } from "lucide-react";

const MODULE_COLORS = {
  incidents: "#ef4444",
  safeguarding: "#f59e0b",
  finance: "#3b82f6",
  bills: "#8b5cf6",
  hr: "#10b981",
  training: "#06b6d4",
  homes: "#ec4899",
  other: "#6b7280",
};

export default function AuditAnalytics({ events }) {
  // Events over time
  const eventsByDay = events.reduce((acc, event) => {
    const day = event.created_date ? event.created_date.slice(0, 10) : "unknown";
    const existing = acc.find(e => e.day === day);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ day, count: 1 });
    }
    return acc;
  }, []).slice(-7);

  // Events by module
  const eventsByModule = events.reduce((acc, event) => {
    const module = event.module_name || "other";
    const existing = acc.find(e => e.module === module);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ module, count: 1 });
    }
    return acc;
  }, []);

  // High-risk events
  const highRiskEvents = events
    .filter(e => ["high", "critical"].includes(e.severity))
    .slice(0, 5);

  // Top users by activity
  const topUsers = events.reduce((acc, event) => {
    const user = event.actor_name || "Unknown";
    const existing = acc.find(e => e.user === user);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ user, count: 1 });
    }
    return acc;
  }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Events Over Time */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <BarIcon className="w-4 h-4" />
          Events Over Time
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={eventsByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Events by Module */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-4">Events by Module</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={eventsByModule}
              dataKey="count"
              nameKey="module"
              cx="50%"
              cy="50%"
              outerRadius={60}
              label={false}
            >
              {eventsByModule.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={MODULE_COLORS[entry.module] || MODULE_COLORS.other} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {eventsByModule.slice(0, 4).map(module => (
            <div key={module.module} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: MODULE_COLORS[module.module] || MODULE_COLORS.other }}
              ></div>
              <span className="text-muted-foreground">{module.module} ({module.count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* High-Risk Events */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          High-Risk Events
        </h3>
        <div className="space-y-2">
          {highRiskEvents.length > 0 ? (
            highRiskEvents.map(event => (
              <div key={event.id} className="p-2 bg-red-50 rounded border border-red-200 text-xs">
                <p className="font-semibold text-red-900">{event.record_reference}</p>
                <p className="text-red-700 text-xs">{event.action_type?.replace(/_/g, " ")}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No high-risk events.</p>
          )}
        </div>
      </div>

      {/* Top Users by Activity */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Top Users by Activity
        </h3>
        <div className="space-y-2">
          {topUsers.map((user, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium truncate">{user.user}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-4 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(user.count / topUsers[0].count) * 100}%` }}
                  ></div>
                </div>
                <span className="text-muted-foreground w-6 text-right">{user.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}