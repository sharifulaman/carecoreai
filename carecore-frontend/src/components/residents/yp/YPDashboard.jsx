import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle, FileText, BookOpen, Calendar, TrendingUp, Home } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const todayStr = new Date().toISOString().split("T")[0];
const now = new Date();
const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);

const RISK_COLOURS = { critical: "#E24B4A", high: "#EF9F27", medium: "#378ADD", low: "#1D9E75" };
const RISK_ORDER = ["critical", "high", "medium", "low"];

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 text-left hover:shadow-md hover:border-primary/30 transition-all cursor-pointer w-full"
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </button>
  );
}

function RiskBar({ level, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 text-xs capitalize text-muted-foreground">{level}</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: RISK_COLOURS[level] }} />
      </div>
      <span className="w-5 text-xs font-semibold text-right">{count}</span>
    </div>
  );
}

function ActivityDot({ color }) {
  return <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: color }} />;
}

export default function YPDashboard({
  residents = [],
  homes = [],
  staff = [],
  dailyLogs = [],
  visitReports = [],
  accidents = [],
  appointments = [],
  supportPlans = [],
  ilsPlans = [],
  transitions = [],
  onNavigate,
}) {
  const activeResidents = useMemo(() => residents.filter(r => r.status === "active"), [residents]);

  // ── Stat counts ────────────────────────────────────────────────────────────
  const highRisk = activeResidents.filter(r => r.risk_level === "high" || r.risk_level === "critical").length;
  const reportsToday = visitReports.filter(r => r.date === todayStr).length;
  const todayLogs = dailyLogs.filter(l => l.date === todayStr);
  const flaggedToday = todayLogs.filter(l => l.flagged && !l.acknowledged_by).length;
  const aptsToday = appointments.filter(a => a.start_datetime?.startsWith(todayStr) && !a.is_deleted);
  const aptsSoonCount = appointments.filter(a =>
    new Date(a.start_datetime) >= now &&
    new Date(a.start_datetime) <= weekEnd &&
    a.status === "scheduled" && !a.is_deleted
  ).length;

  // ── YP requiring attention ─────────────────────────────────────────────────
  const ypAttention = useMemo(() => {
    return activeResidents
      .filter(r => {
        const hasFlag = todayLogs.some(l => l.resident_id === r.id && l.flagged && !l.acknowledged_by);
        return hasFlag || r.risk_level === "critical";
      })
      .slice(0, 4);
  }, [activeResidents, todayLogs]);

  // ── Risk distribution ──────────────────────────────────────────────────────
  const riskDist = useMemo(() =>
    RISK_ORDER.map(level => ({
      level,
      count: activeResidents.filter(r => r.risk_level === level).length,
    })),
    [activeResidents]
  );

  // ── Home occupancy ─────────────────────────────────────────────────────────
  const homeOccupancy = useMemo(() =>
    homes
      .filter(h => h.status === "active")
      .map(h => ({
        name: h.name.length > 6 ? h.name.slice(0, 6) + "…" : h.name,
        count: activeResidents.filter(r => r.home_id === h.id).length,
        color: "#4B8BF5",
      }))
      .filter(h => h.count > 0),
    [homes, activeResidents]
  );

  // ── Recent activity ────────────────────────────────────────────────────────
  const recentActivity = useMemo(() => {
    const items = [];
    dailyLogs.slice(0, 5).forEach(l => {
      items.push({
        label: `Daily log submitted — ${l.resident_name || "YP"} · ${l.worker_name || ""}`,
        time: l.date,
        color: "#1D9E75",
        ts: new Date(l.created_date || l.date).getTime(),
      });
    });
    accidents.slice(0, 3).forEach(a => {
      items.push({
        label: `Incident logged — ${a.resident_name || "YP"} · ${homes.find(h => h.id === a.home_id)?.name || ""}`,
        time: a.date,
        color: "#E24B4A",
        ts: new Date(a.created_date || a.date).getTime(),
      });
    });
    visitReports.slice(0, 3).forEach(v => {
      items.push({
        label: `Visit report — ${v.resident_name || "YP"} · ${v.worker_name || ""}`,
        time: v.date,
        color: "#4B8BF5",
        ts: new Date(v.created_date || v.date).getTime(),
      });
    });
    appointments.filter(a => a.status === "completed").slice(0, 3).forEach(a => {
      items.push({
        label: `Appointment done — ${a.resident_name || "YP"} · ${a.title}`,
        time: a.start_datetime?.split("T")[0],
        color: "#7C3AED",
        ts: new Date(a.start_datetime || 0).getTime(),
      });
    });
    supportPlans.filter(p => p.status === "active").slice(0, 2).forEach(p => {
      items.push({
        label: `Support plan updated — ${p.resident_name || "YP"}`,
        time: p.updated_date?.split("T")[0],
        color: "#EF9F27",
        ts: new Date(p.updated_date || 0).getTime(),
      });
    });
    return items.sort((a, b) => b.ts - a.ts).slice(0, 6);
  }, [dailyLogs, accidents, visitReports, appointments, supportPlans, homes]);

  function timeAgoLabel(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs} hr`;
    return `${mins} min`;
  }

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  return (
    <div className="space-y-4 mt-4">
      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Active Residents"
          value={activeResidents.length}
          sub={`across ${homes.filter(h => activeResidents.some(r => r.home_id === h.id)).length} homes`}
          color="text-primary"
          onClick={() => onNavigate("yp")}
        />
        <StatCard
          label="High Risk"
          value={highRisk}
          sub={activeResidents.length > 0 ? `${Math.round((highRisk / activeResidents.length) * 100)}% of total` : ""}
          color="text-red-500"
          onClick={() => onNavigate("yp")}
        />
        <StatCard
          label="Reports Today"
          value={reportsToday}
          sub={reportsToday > 0 ? `${Math.max(0, reportsToday - 1)} pending review` : "none submitted"}
          color="text-amber-500"
          onClick={() => onNavigate("visit-reports")}
        />
        <StatCard
          label="Daily Logs Today"
          value={todayLogs.length}
          sub={flaggedToday > 0 ? `${flaggedToday} flagged` : "no flags"}
          color="text-green-600"
          onClick={() => onNavigate("visit-reports")}
        />
        <StatCard
          label="Appointments Today"
          value={aptsToday.length}
          sub={aptsSoonCount > 0 ? `${aptsSoonCount} starting soon` : "none upcoming"}
          color="text-purple-600"
          onClick={() => onNavigate("appointments")}
        />
      </div>

      {/* ── Middle row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* YP requiring attention */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">YP requiring attention</h3>
            <button onClick={() => onNavigate("yp")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          {ypAttention.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">All clear — no flags today</p>
          ) : ypAttention.map(r => {
            const home = homeMap[r.home_id];
            const flagLog = todayLogs.find(l => l.resident_id === r.id && l.flagged && !l.acknowledged_by);
            return (
              <button
                key={r.id}
                onClick={() => onNavigate("yp")}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: r.risk_level === "critical" ? "#FAECE7" : "#FEF3C7", color: r.risk_level === "critical" ? "#993C1D" : "#92400E" }}>
                  {r.initials || r.display_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{r.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{home?.name || "—"} · {flagLog ? "Flagged log" : "Critical risk"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${r.risk_level === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {r.risk_level === "critical" ? "Critical" : "High"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Today's appointments */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Today's appointments</h3>
            <button onClick={() => onNavigate("appointments")} className="text-xs text-primary hover:underline">Open calendar</button>
          </div>
          {aptsToday.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No appointments today</p>
          ) : aptsToday.slice(0, 4).map(apt => (
            <button
              key={apt.id}
              onClick={() => onNavigate("appointments")}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors text-left"
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: apt.colour || "#4B8BF5" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{apt.title}</p>
                <p className="text-xs text-muted-foreground truncate">{apt.resident_name || "—"} · {apt.organiser_name || ""}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium">{apt.all_day ? "All day" : new Date(apt.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${apt.status === "completed" ? "bg-green-100 text-green-700" : apt.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {apt.status === "completed" ? "Done" : apt.status === "cancelled" ? "Cancelled" : "Scheduled"}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Risk distribution */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Risk distribution</h3>
            <button onClick={() => onNavigate("yp")} className="text-xs text-primary hover:underline">View YP</button>
          </div>
          <div className="space-y-2.5">
            {riskDist.map(({ level, count }) => (
              <RiskBar key={level} level={level} count={count} total={activeResidents.length} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent activity */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <button onClick={() => onNavigate("visit-reports")} className="text-xs text-primary hover:underline">View all logs</button>
          </div>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No recent activity</p>
            ) : recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <ActivityDot color={item.color} />
                <p className="text-xs text-muted-foreground flex-1 leading-snug">{item.label}</p>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgoLabel(item.ts)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Home occupancy */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Home occupancy</h3>
            <button onClick={() => onNavigate("yp")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          {homeOccupancy.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={homeOccupancy} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v} residents`]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {homeOccupancy.map((entry, index) => (
                    <Cell key={index} fill={["#4B8BF5","#16A34A","#D97706","#DC2626","#7C3AED","#0D9488"][index % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}