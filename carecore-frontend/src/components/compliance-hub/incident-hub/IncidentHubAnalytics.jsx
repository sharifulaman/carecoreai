import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend, Cell } from "recharts";
import { format } from "date-fns";
import { getIncidentSeverity, getResolutionHours, formatResolution, getOfstedStatus, INCIDENT_TYPE_LABELS } from "@/lib/incidentAnalytics";

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

export default function IncidentHubAnalytics({ incidents, ofstedNotifications, homes }) {
  // 1. Incidents by Home (stacked by severity)
  const byHome = useMemo(() => {
    const homeMap = {};
    incidents.forEach(i => {
      const home = homes.find(h => h.id === i.home_id);
      const name = home?.name?.split(" - ")[0] || "Unknown";
      if (!homeMap[name]) homeMap[name] = { name, Critical: 0, High: 0, Medium: 0, Low: 0 };
      homeMap[name][getIncidentSeverity(i)]++;
    });
    return Object.values(homeMap).sort((a, b) => (b.Critical + b.High + b.Medium + b.Low) - (a.Critical + a.High + a.Medium + a.Low)).slice(0, 10);
  }, [incidents, homes]);

  // 2. Incident Volume Over Time (line chart)
  const overTime = useMemo(() => {
    const dayMap = {};
    incidents.forEach(i => {
      if (!i.incident_datetime) return;
      const day = format(new Date(i.incident_datetime), "MMM d");
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    return Object.entries(dayMap).map(([date, count]) => ({ date, count })).slice(-30);
  }, [incidents]);

  // 3. Average Resolution Time by Incident Type
  const byType = useMemo(() => {
    const typeMap = {};
    incidents.filter(i => i.status === "closed").forEach(i => {
      const label = INCIDENT_TYPE_LABELS[i.incident_type] || i.incident_type?.replace(/_/g, " ") || "Other";
      if (!typeMap[label]) typeMap[label] = { total: 0, count: 0 };
      typeMap[label].total += getResolutionHours(i);
      typeMap[label].count++;
    });
    return Object.entries(typeMap).map(([name, v]) => ({ name, avgHours: v.count > 0 ? Math.round(v.total / v.count) : 0 }))
      .sort((a, b) => b.avgHours - a.avgHours).slice(0, 8);
  }, [incidents]);

  // 4. Recently Closed Incidents
  const recentlyClosed = useMemo(() => {
    return incidents
      .filter(i => i.status === "closed")
      .sort((a, b) => (b.manager_review_date || "").localeCompare(a.manager_review_date || ""))
      .slice(0, 5);
  }, [incidents]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-slate-600">{p.name}:</span>
            <span className="font-semibold text-slate-800">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Incidents by Home */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Incidents by Home (by Severity)</h3>
        {byHome.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No data</p> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byHome} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} interval={0} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Critical" stackId="a" fill="#ef4444" name="Critical" />
              <Bar dataKey="High" stackId="a" fill="#f97316" name="High" />
              <Bar dataKey="Medium" stackId="a" fill="#f59e0b" name="Medium" />
              <Bar dataKey="Low" stackId="a" fill="#10b981" name="Low" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Incident Volume Over Time */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Incident Volume Over Time</h3>
        {overTime.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No data</p> : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={overTime} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(overTime.length / 6))} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 2, fill: "#6366f1" }} name="Incidents" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Average Resolution Time by Type */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Average Resolution Time by Incident Type</h3>
        {byType.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No closed incidents</p> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byType} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => formatResolution(v)} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} width={100} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgHours" name="Avg Resolution" radius={[0, 4, 4, 0]}>
                {byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recently Closed Incidents */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Recently Closed Incidents</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Type</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Solved</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Time</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Ofsted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {recentlyClosed.map(inc => {
              const home = homes.find(h => h.id === inc.home_id);
              return (
                <tr key={inc.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700 truncate max-w-[100px]">{home?.name || inc.home_name || "—"}</td>
                  <td className="px-2 py-2 text-slate-600 truncate max-w-[100px]">{INCIDENT_TYPE_LABELS[inc.incident_type] || inc.incident_type?.replace(/_/g, " ")}</td>
                  <td className="px-2 py-2 text-slate-500">{inc.manager_review_date ? format(new Date(inc.manager_review_date), "d MMM") : "—"}</td>
                  <td className="px-2 py-2 text-slate-500">{formatResolution(getResolutionHours(inc))}</td>
                  <td className="px-2 py-2">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                      getOfstedStatus(inc, ofstedNotifications) === "Yes" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}>{getOfstedStatus(inc, ofstedNotifications)}</span>
                  </td>
                </tr>
              );
            })}
            {recentlyClosed.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-400">No closed incidents</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}