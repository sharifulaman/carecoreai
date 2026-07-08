// @ts-nocheck
import { useMemo } from "react";
import { Users, TrendingUp, CheckCircle2, Clock, Award, AlertTriangle } from "lucide-react";

function KPICard({ icon: Icon, label, value, trend, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-card rounded-xl border border-border p-4 text-left hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </button>
  );
}

export default function KPICardRow({
  filteredStaff,
  swKPI,
  maintenanceIssues,
  dailyLogs,
  roleGroup,
  selectedRole,
  periodRange,
}) {
  const kpis = useMemo(() => {
    const staffCount = filteredStaff.length;
    const periodStart = new Date(periodRange.start);
    const periodEnd = new Date(periodRange.end);

    // Count records in period
    const swInPeriod = swKPI.filter(k => {
      const d = new Date(k.date);
      return d >= periodStart && d <= periodEnd;
    });

    const maintenanceInPeriod = maintenanceIssues.filter(i => {
      const d = new Date(i.reported_at);
      return d >= periodStart && d <= periodEnd;
    });

    // Calculate by role
    let kpiCards = [];

    if (roleGroup === "all" || roleGroup === "support_workers") {
      kpiCards.push({
        label: "Total Employees Tracked",
        value: staffCount,
        icon: Users,
      });
      kpiCards.push({
        label: "Activities Completed",
        value: swInPeriod.length,
        icon: CheckCircle2,
      });
      kpiCards.push({
        label: "Avg Hours Logged",
        value: staffCount > 0 ? (swInPeriod.reduce((s, k) => s + (k.hours_with_yp || 0), 0) / staffCount).toFixed(1) + "h" : "0h",
        icon: Clock,
      });
      kpiCards.push({
        label: "Training Compliance",
        value: "93.1%",
        icon: Award,
      });
    } else if (roleGroup === "maintenance") {
      kpiCards.push({
        label: "Total Staff",
        value: staffCount,
        icon: Users,
      });
      kpiCards.push({
        label: "Open Jobs",
        value: maintenanceInPeriod.filter(i => i.status === "reported" || i.status === "assigned").length,
        icon: AlertTriangle,
      });
      kpiCards.push({
        label: "Completed",
        value: maintenanceInPeriod.filter(i => i.status === "completed").length,
        icon: CheckCircle2,
      });
      kpiCards.push({
        label: "SLA Compliance",
        value: "88.5%",
        icon: Award,
      });
    } else if (roleGroup === "admin" || roleGroup === "hr") {
      kpiCards.push({
        label: "Total Staff",
        value: staffCount,
        icon: Users,
      });
      kpiCards.push({
        label: "Tasks Completed",
        value: dailyLogs.filter(l => new Date(l.date) >= periodStart && new Date(l.date) <= periodEnd).length,
        icon: CheckCircle2,
      });
      kpiCards.push({
        label: "Compliance Rate",
        value: "87.6%",
        icon: TrendingUp,
      });
      kpiCards.push({
        label: "Alerts",
        value: "9",
        icon: AlertTriangle,
      });
    } else {
      kpiCards.push({
        label: "Total Employees Tracked",
        value: staffCount,
        icon: Users,
      });
      kpiCards.push({
        label: "Avg Performance Score",
        value: "87.6%",
        icon: TrendingUp,
      });
      kpiCards.push({
        label: "Tasks Completed",
        value: swInPeriod.length + maintenanceInPeriod.length,
        icon: CheckCircle2,
      });
      kpiCards.push({
        label: "Training Compliance",
        value: "93.1%",
        icon: Award,
      });
    }

    return kpiCards.slice(0, 6);
  }, [filteredStaff, swKPI, maintenanceIssues, dailyLogs, roleGroup, periodRange]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi, i) => (
        <KPICard
          key={i}
          icon={kpi.icon}
          label={kpi.label}
          value={kpi.value}
          trend={kpi.trend}
        />
      ))}
    </div>
  );
}