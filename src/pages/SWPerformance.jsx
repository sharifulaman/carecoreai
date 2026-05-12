import { useState, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Cell } from "recharts";
import { TrendingUp, Clock, FileText, Users, Star, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIVITY_LABELS = {
  visit_report: "Visit Report",
  key_worker_session: "Key Worker Session",
  daily_summary: "Daily Summary",
  cic_report: "CIC Report",
  support_plan_created: "Support Plan Created",
  support_plan_reviewed: "Support Plan Reviewed",
  gp_appointment: "GP Appointment",
  hospital_appointment: "Hospital Appointment",
  ils_plan_updated: "ILS Plan Updated",
  medication_administered: "Medication",
  incident_reported: "Incident Report",
  home_check_completed: "Home Check",
  shift_handover_submitted: "Shift Handover",
};

// Returns a display label for a KPI record, using appointment_type if available
function getActivityLabel(k) {
  if (k.appointment_type && k.appointment_type !== "None") {
    return k.appointment_type;
  }
  return ACTIVITY_LABELS[k.activity_type] || k.activity_type;
}

const MONTHS_BACK = [
  { label: "Last 1 month", value: "1" },
  { label: "Last 3 months", value: "3" },
  { label: "Last 6 months", value: "6" },
  { label: "Last 12 months", value: "12" },
];

function StatCard({ icon: Icon, label, value, sub, color = "blue", onClick }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-green-500/10 text-green-600",
    purple: "bg-purple-500/10 text-purple-600",
    amber: "bg-amber-500/10 text-amber-600",
  };
  return (
    <div
      className={cn("bg-card rounded-xl border border-border p-5 transition-shadow", onClick && "cursor-pointer hover:shadow-md hover:border-primary/30")}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("p-2 rounded-lg", colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function StatDetailModal({ title, records, onClose }) {
  const navigate = useNavigate();

  const handleRowClick = (k) => {
    // Navigate based on source entity
    if (k.source_entity === 'VisitReport' && k.source_id) {
      onClose();
      navigate(`/visit-reports`);
    } else if (k.source_entity === 'CICReport' && k.source_id) {
      onClose();
      navigate(`/visit-reports`);
    } else if (k.activity_type === 'visit_report' || k.activity_type === 'key_worker_session' || k.activity_type === 'daily_summary') {
      onClose();
      navigate(`/visit-reports`);
    } else {
      onClose();
      navigate(`/visit-reports`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {records.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">No records for this period.</p>
          ) : (
            records.sort((a, b) => b.date.localeCompare(a.date)).map((k, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors group"
                onClick={() => handleRowClick(k)}
                title="Click to view in Visit Reports"
              >
                <span className="text-muted-foreground w-24 shrink-0">{k.date}</span>
                <span className="flex-1 font-medium group-hover:text-primary transition-colors">{k.worker_name || k.worker_id}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getActivityLabel(k)}</Badge>
                {k.hours_with_yp > 0 && <span className="text-muted-foreground text-xs">{k.hours_with_yp.toFixed(1)}h</span>}
                <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Click a row to view the record</p>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

function WorkerRow({ worker, kpiRecords, rank, residents }) {
  const [expanded, setExpanded] = useState(false);
  const [ypPeriod, setYpPeriod] = useState("monthly");

  // Match by StaffProfile UUID (new) or legacy email (old records not yet migrated) or name fallback
  const workerRecords = kpiRecords.filter(k =>
    k.worker_id === worker.id ||
    k.worker_id === worker.email ||
    k.worker_email_legacy === worker.email ||
    (!k.worker_id && k.worker_name === worker.full_name)
  );
  const totalHours = workerRecords.reduce((s, k) => s + (k.hours_with_yp || 0), 0);
  const visitCount = workerRecords.filter(k => k.activity_type === 'visit_report').length;
  const kwCount = workerRecords.filter(k => k.activity_type === 'key_worker_session').length;
  const cicCount = workerRecords.filter(k => k.cic_report_count > 0).length;
  const totalActivities = workerRecords.length;

  const byMonth = {};
  workerRecords.forEach(k => {
    if (!byMonth[k.month]) byMonth[k.month] = 0;
    byMonth[k.month]++;
  });

  // Build YP hours chart data based on selected period
  const ypHoursData = useMemo(() => {
    const now = new Date();
    const filtered = workerRecords.filter(k => {
      if (k.hours_with_yp <= 0) return false;
      const d = new Date(k.date);
      if (ypPeriod === "weekly") {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      } else if (ypPeriod === "monthly") {
        const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
        return d >= monthAgo;
      } else {
        const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return d >= yearAgo;
      }
    });

    // Group by resident_id, sum hours
    const byResident = {};
    filtered.forEach(k => {
      if (!k.resident_id) return;
      byResident[k.resident_id] = (byResident[k.resident_id] || 0) + (k.hours_with_yp || 0);
    });

    return Object.entries(byResident).map(([resId, hours]) => {
      const res = residents?.find(r => r.id === resId);
      return {
        name: res?.display_name || res?.initials || resId.slice(-4),
        hours: parseFloat(hours.toFixed(1)),
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [workerRecords, ypPeriod, residents]);

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-bold text-muted-foreground w-6 text-center">#{rank}</span>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {worker.full_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{worker.full_name}</p>
          <p className="text-xs text-muted-foreground">{worker.employee_id || "—"} · {worker.role?.replace(/_/g, " ")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="font-semibold">{totalActivities}</p>
            <p className="text-xs text-muted-foreground">Activities</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">With YP</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{visitCount}</p>
            <p className="text-xs text-muted-foreground">Visits</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{kwCount}</p>
            <p className="text-xs text-muted-foreground">KW Sessions</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{cicCount}</p>
            <p className="text-xs text-muted-foreground">CIC Reports</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-muted/20">
          <div className="grid sm:grid-cols-2 gap-4 pt-3">
            {/* Activity breakdown */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Activity Breakdown</p>
              <div className="space-y-1.5">
                {Object.entries(
                  workerRecords.reduce((acc, k) => {
                    const label = getActivityLabel(k);
                    acc[label] = (acc[label] || 0) + 1;
                    return acc;
                  }, {})
                ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly trend */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Monthly Activity</p>
              {Object.keys(byMonth).length > 0 ? (
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={Object.entries(byMonth).sort().map(([m, c]) => ({ month: m.slice(5), count: c }))}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">No data</p>}
            </div>
          </div>

          {/* YP Hours Chart */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Hours per Young Person</p>
              <div className="flex rounded-lg border border-border overflow-hidden text-[10px] font-medium">
                {["weekly", "monthly", "yearly"].map(p => (
                  <button
                    key={p}
                    onClick={e => { e.stopPropagation(); setYpPeriod(p); }}
                    className={cn(
                      "px-2.5 py-1 transition-colors capitalize",
                      ypPeriod === p ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {ypHoursData.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={ypHoursData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
                  <Bar dataKey="hours" radius={[3, 3, 0, 0]} fill="#22c55e">
                    {ypHoursData.map((_, index) => {
                      const colours = ["#4B8BF5","#22c55e","#a855f7","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316","#6366f1"];
                      return <Cell key={index} fill={colours[index % colours.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No hours recorded for this period.</p>
            )}
          </div>

          {/* Recent activities */}
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Recent Activities</p>
            <div className="space-y-1">
              {workerRecords.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((k, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-20 shrink-0">{k.date}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getActivityLabel(k)}</Badge>
                  {k.hours_with_yp > 0 && <span className="text-muted-foreground">{k.hours_with_yp.toFixed(1)}h</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SWPerformance() {
  const { user } = useOutletContext();
  const isAdmin = user?.role === "admin";
  const isTL = user?.role === "team_leader";
  const [monthsBack, setMonthsBack] = useState("3");
  const [selectedWorker, setSelectedWorker] = useState("all");
  const [modal, setModal] = useState(null); // { title, records }

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-perf"],
    queryFn: () => secureGateway.filter("StaffProfile"),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-perf"],
    queryFn: () => secureGateway.filter("Resident"),
  });

  const { data: allKPI = [], isLoading } = useQuery({
    queryKey: ["sw-kpi-all"],
    queryFn: () => secureGateway.filter("SWPerformanceKPI", {}, "-date", 2000),
  });

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - parseInt(monthsBack));
    return d.toISOString().split("T")[0];
  }, [monthsBack]);

  const filteredKPI = useMemo(() => {
    // Find current user's StaffProfile from staff list
    const myStaff = staff.find(s => s.email === user?.email);

    let records = allKPI.filter(k => k.date >= cutoff);
    if (selectedWorker !== "all") {
      // selectedWorker is StaffProfile.id — match by UUID, legacy email, or name
      const sw = staff.find(s => s.id === selectedWorker);
      records = records.filter(k =>
        k.worker_id === selectedWorker ||
        (sw && k.worker_id === sw.email) ||
        (sw && k.worker_email_legacy === sw.email)
      );
    }
    // For non-admin/TL, only show own data
    if (!isAdmin && !isTL) {
      records = records.filter(k =>
        k.worker_id === myStaff?.id ||
        k.worker_id === user?.email ||
        k.worker_email_legacy === user?.email
      );
    }
    return records;
  }, [allKPI, cutoff, selectedWorker, isAdmin, isTL, user, staff]);

  const workers = useMemo(() => {
    const relevantWorkers = isAdmin || isTL
      ? staff.filter(s => s.role === "support_worker" || s.role === "team_leader")
      : staff.filter(s => s.email === user?.email);
    return relevantWorkers.sort((a, b) => {
      const aCount = filteredKPI.filter(k => k.worker_id === a.id || k.worker_id === a.email || k.worker_email_legacy === a.email).length;
      const bCount = filteredKPI.filter(k => k.worker_id === b.id || k.worker_id === b.email || k.worker_email_legacy === b.email).length;
      return bCount - aCount;
    });
  }, [staff, isAdmin, isTL, filteredKPI, user]);

  // Overall stats
  const totalActivities = filteredKPI.length;
  const totalHours = filteredKPI.reduce((s, k) => s + (k.hours_with_yp || 0), 0);
  const totalVisits = filteredKPI.filter(k => k.activity_type === "visit_report").length;
  const totalKWSessions = filteredKPI.filter(k => k.activity_type === "key_worker_session").length;

  // Monthly trend chart data
  const monthlyTrend = useMemo(() => {
    const byMonth = {};
    filteredKPI.forEach(k => {
      if (!byMonth[k.month]) byMonth[k.month] = { month: k.month, visits: 0, kw: 0, other: 0, hours: 0 };
      if (k.activity_type === "visit_report") byMonth[k.month].visits++;
      else if (k.activity_type === "key_worker_session") byMonth[k.month].kw++;
      else byMonth[k.month].other++;
      byMonth[k.month].hours += k.hours_with_yp || 0;
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m,
      month: m.month.slice(5),
      hours: parseFloat(m.hours.toFixed(1)),
    }));
  }, [filteredKPI]);

  return (
    <div className="space-y-6">
      {modal && <StatDetailModal title={modal.title} records={modal.records} onClose={() => setModal(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SW Performance</h1>
          <p className="text-muted-foreground text-sm mt-1">Support Worker & Team Leader KPI Dashboard</p>
        </div>
        <div className="flex gap-3">
          {(isAdmin || isTL) && (
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="All Workers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name} {w.employee_id ? `(${w.employee_id})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={monthsBack} onValueChange={setMonthsBack}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS_BACK.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Total Activities" value={totalActivities} sub={`Last ${monthsBack} month${monthsBack === "1" ? "" : "s"}`} color="blue"
          onClick={() => setModal({ title: "All Activities", records: filteredKPI })} />
        <StatCard icon={Clock} label="Hours with YP" value={totalHours.toFixed(1) + "h"} sub="Direct contact time" color="green"
          onClick={() => setModal({ title: "Hours with YP", records: filteredKPI.filter(k => k.hours_with_yp > 0) })} />
        <StatCard icon={FileText} label="Visit Reports" value={totalVisits} sub="Completed visits" color="purple"
          onClick={() => setModal({ title: "Visit Reports", records: filteredKPI.filter(k => k.activity_type === "visit_report") })} />
        <StatCard icon={Star} label="KW Sessions" value={totalKWSessions} sub="Key worker sessions" color="amber"
          onClick={() => setModal({ title: "Key Worker Sessions", records: filteredKPI.filter(k => k.activity_type === "key_worker_session") })} />
      </div>

      {/* Monthly Trend Chart */}
      {monthlyTrend.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-semibold mb-4">Monthly Activity Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visits" stroke="#4B8BF5" strokeWidth={2} dot={false} name="Visits" />
              <Line type="monotone" dataKey="kw" stroke="#a855f7" strokeWidth={2} dot={false} name="KW Sessions" />
              <Line type="monotone" dataKey="hours" stroke="#22c55e" strokeWidth={2} dot={false} name="Hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Workers Leaderboard */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Worker Performance</h2>
          <span className="text-xs text-muted-foreground ml-auto">Click a row to expand</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : workers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No worker data found for this period.</div>
        ) : (
          <div>
            {/* Header row */}
            <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
              <span className="w-6">#</span>
              <span className="w-9"></span>
              <span className="flex-1">Worker</span>
              <div className="flex items-center gap-6">
                <span className="w-16 text-center">Activities</span>
                <span className="w-14 text-center">Hours</span>
                <span className="w-12 text-center">Visits</span>
                <span className="w-14 text-center">KW</span>
                <span className="w-12 text-center">CIC</span>
              </div>
              <span className="w-5"></span>
            </div>
            {workers.map((w, i) => (
              <WorkerRow key={w.id} worker={w} kpiRecords={filteredKPI} rank={i + 1} residents={residents} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}