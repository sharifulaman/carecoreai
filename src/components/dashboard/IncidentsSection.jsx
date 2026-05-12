import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const INCIDENT_TYPE_STYLES = {
  accident: "bg-orange-500/10 text-orange-700",
  injury: "bg-red-500/10 text-red-700",
  illness: "bg-blue-500/10 text-blue-700",
  near_miss: "bg-amber-500/10 text-amber-700",
};
const INCIDENT_TYPE_LABELS = {
  accident: "Accident", injury: "Injury", illness: "Illness", near_miss: "Near Miss",
};
const INCIDENT_STATUS_STYLES = {
  open: "bg-red-500/10 text-red-700",
  reviewed: "bg-amber-500/10 text-amber-700",
};
const PT_LABELS = {
  "18_plus": "18+ Accommodation",
  "18plus_accommodation": "18+",
  "24_hours": "24 Hours Housing",
  "24hours_housing": "24 hrs",
  care: "Care Services",
  care_services: "Care",
  outreach: "Outreach",
};
const PT_BADGE = {
  "18_plus": "bg-blue-500/10 text-blue-700",
  "18plus_accommodation": "bg-blue-500/10 text-blue-700",
  "24_hours": "bg-purple-500/10 text-purple-700",
  "24hours_housing": "bg-purple-500/10 text-purple-700",
  care: "bg-emerald-500/10 text-emerald-700",
  care_services: "bg-emerald-500/10 text-emerald-700",
  outreach: "bg-amber-500/10 text-amber-700",
};

function formatDateUK(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("en-GB");
}

// Donut chart helper
function MiniDonut({ title, centerText, data, colors, total, onClick }) {
  return (
    <div
      className={`flex items-center gap-3 py-3 border-b border-border last:border-0 ${onClick ? "cursor-pointer hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="w-16 h-16 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={20} outerRadius={30} dataKey="value" stroke="none">
              {data.map((entry, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-lg font-bold mt-0.5">{centerText}</p>
        <div className="flex flex-wrap gap-x-3 mt-1">
          {data.map((d, i) => (
            <span key={i} className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: colors[i] }} />
              {d.name}: {d.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IncidentsSection({ accidentReports, homeChecks, dailyLogs, maintenanceLogs, residents, homes }) {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];

  const getHome = id => homes.find(h => h.id === id);
  const getResident = id => residents.find(r => r.id === id);

  // Table: recent incidents from ALL homes (care, outreach, 18+, 24hrs)
  const recentIncidents = useMemo(() => {
    return [...accidentReports]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 10);
  }, [accidentReports]);

  // Donut 1 — Home Checks last 30 days
  const recentChecks = homeChecks.filter(c => (c.date || "") >= thirtyStr);
  const checksPass = recentChecks.filter(c => c.overall_status === "pass").length;
  const checksFail = recentChecks.filter(c => c.overall_status === "fail").length;
  const checksPartial = recentChecks.filter(c => c.overall_status === "partial").length;

  // Donut 2 — Daily log completion today
  const activeResidents = residents.filter(r => r.status === "active");
  const todayLogResidents = new Set(dailyLogs.filter(l => l.date === todayStr).map(l => l.resident_id));
  const logsComplete = activeResidents.filter(r => todayLogResidents.has(r.id)).length;
  const logsMissing = activeResidents.length - logsComplete;

  // Donut 3 — Maintenance
  const openMaint = maintenanceLogs.filter(m => m.status === "open" || m.status === "in_progress");
  const maintUrgent = openMaint.filter(m => m.priority === "urgent").length;
  const maintHigh = openMaint.filter(m => m.priority === "high").length;
  const maintOther = openMaint.filter(m => m.priority !== "urgent" && m.priority !== "high").length;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Incidents & Compliance</h2>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* 3A — Incidents Table (60%) */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-medium">Recent Incidents — All Services</p>
            <button className="text-xs text-primary hover:underline" onClick={() => navigate("/residents")}>View all →</button>
          </div>
          {recentIncidents.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No incidents recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Service</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Home</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentIncidents.map(a => {
                    const home = getHome(a.home_id);
                    const pt = home?.type;
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate("/residents")}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateUK(a.date)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${INCIDENT_TYPE_STYLES[a.type] || "bg-muted text-muted-foreground"}`}>
                            {INCIDENT_TYPE_LABELS[a.type] || a.type}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {pt ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PT_BADGE[pt] || "bg-muted text-muted-foreground"}`}>
                              {PT_LABELS[pt] || pt}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 truncate max-w-[110px]">{home?.name || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded capitalize ${INCIDENT_STATUS_STYLES[a.status] || "bg-muted text-muted-foreground"}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-primary font-medium">View →</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3B — Compliance Donuts (40%) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium mb-2">Compliance Status</p>
          <MiniDonut
            title="Home Checks — Last 30 Days"
            centerText={`${checksPass} Passed`}
            data={[
              { name: "Pass", value: checksPass || 0 },
              { name: "Fail", value: checksFail || 0 },
              { name: "Partial", value: checksPartial || 0 },
            ].filter(d => d.value > 0).length > 0 ? [
              { name: "Pass", value: checksPass || 0 },
              { name: "Fail", value: checksFail || 0 },
              { name: "Partial", value: checksPartial || 0 },
            ] : [{ name: "None", value: 1 }]}
            colors={["#10B981", "#EF4444", "#F59E0B", "#94a3b8"]}
            onClick={() => navigate("/house")}
          />
          <MiniDonut
            title="Daily Logs — Today"
            centerText={`${logsComplete}/${activeResidents.length} Complete`}
            data={[
              { name: "Complete", value: logsComplete },
              { name: "Missing", value: logsMissing },
            ].filter(d => d.value > 0).length > 0 ? [
              { name: "Complete", value: logsComplete },
              { name: "Missing", value: logsMissing },
            ] : [{ name: "None", value: 1 }]}
            colors={["#10B981", "#EF4444", "#94a3b8"]}
            onClick={() => navigate("/daily-logs")}
          />
          <MiniDonut
            title="Open Maintenance"
            centerText={`${maintUrgent} Urgent`}
            data={[
              { name: "Urgent", value: maintUrgent },
              { name: "High", value: maintHigh },
              { name: "Other", value: maintOther },
            ].filter(d => d.value > 0).length > 0 ? [
              { name: "Urgent", value: maintUrgent },
              { name: "High", value: maintHigh },
              { name: "Other", value: maintOther },
            ] : [{ name: "None", value: 1 }]}
            colors={["#EF4444", "#F59E0B", "#94a3b8"]}
            onClick={() => navigate("/house")}
          />
        </div>
      </div>
    </section>
  );
}