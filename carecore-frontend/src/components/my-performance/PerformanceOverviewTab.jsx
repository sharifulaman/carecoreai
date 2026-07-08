// @ts-nocheck
import {
  BarChart2, Clock, GraduationCap, CalendarCheck, Target,
  ClipboardList, Users, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PerformanceOverviewTab({ summary = null, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const m = summary.metrics ?? {};

  return (
    <div className="space-y-6">
      {/* KPI metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Activities"
          value={m.activities_completed ?? 0}
          sub={`${(m.hours_with_yp ?? 0).toFixed(1)} hrs with YP`}
          trend={m.activities_trend_pct}
          icon={BarChart2}
          color="blue"
        />
        <MetricCard
          label="Hours with YP"
          value={`${(m.hours_with_yp ?? 0).toFixed(1)}h`}
          sub={`vs ${(m.hours_with_yp_prev ?? 0).toFixed(1)}h last period`}
          trend={m.hours_trend_pct}
          icon={Clock}
          color="indigo"
        />
        <MetricCard
          label="Attendance"
          value={`${(m.attendance_pct ?? 0).toFixed(0)}%`}
          sub={`${m.shifts_worked ?? 0} shift${m.shifts_worked !== 1 ? "s" : ""} worked`}
          icon={Users}
          color="green"
        />
        <MetricCard
          label="Training"
          value={`${m.training_compliance_pct ?? 0}%`}
          sub={
            m.training_expiring_soon > 0
              ? `${m.training_expiring_soon} expiring soon`
              : "All up to date"
          }
          icon={GraduationCap}
          color={
            (m.training_compliance_pct ?? 0) >= 80 ? "green"
            : (m.training_compliance_pct ?? 0) >= 60 ? "amber"
            : "red"
          }
          alert={m.training_expiring_soon > 0}
        />
        <MetricCard
          label="Supervision"
          value={m.supervision_status ?? "no_record"}
          sub={
            m.next_supervision_date
              ? `Next: ${m.next_supervision_date}`
              : m.last_supervision_date
              ? `Last: ${m.last_supervision_date}`
              : "No record"
          }
          icon={CalendarCheck}
          isStatus
        />
        <MetricCard
          label="Active Goals"
          value={m.active_goals_count ?? 0}
          sub={`${m.goals_achieved_this_period ?? 0} achieved this period`}
          icon={Target}
          color="purple"
        />
        <MetricCard
          label="Appraisal Rating"
          value={m.appraisal_overall_rating > 0 ? `${m.appraisal_overall_rating}/5` : "—"}
          sub={m.appraisal_date ? `Last: ${m.appraisal_date}` : "None recorded"}
          icon={ClipboardList}
          color="rose"
        />
      </div>

      {/* Three-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentActivitiesPanel activities={summary.recent_activities ?? []} />
        <UpcomingSupervisionPanel items={summary.upcoming_supervisions ?? []} />
        <ActiveGoalsPanel items={summary.active_goals ?? []} />
      </div>
    </div>
  );
}

// ── MetricCard ─────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue:   { bg: "bg-blue-500/10",   icon: "text-blue-600",   val: "text-blue-700" },
  indigo: { bg: "bg-indigo-500/10", icon: "text-indigo-600", val: "text-indigo-700" },
  green:  { bg: "bg-green-500/10",  icon: "text-green-600",  val: "text-green-700" },
  amber:  { bg: "bg-amber-500/10",  icon: "text-amber-600",  val: "text-amber-700" },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-600", val: "text-purple-700" },
  rose:   { bg: "bg-rose-500/10",   icon: "text-rose-600",   val: "text-rose-700" },
  red:    { bg: "bg-red-500/10",    icon: "text-red-600",    val: "text-red-700" },
};

const STATUS_STYLE = {
  on_track:  { label: "On Track",  cls: "text-green-700 bg-green-100 border-green-200" },
  due_soon:  { label: "Due Soon",  cls: "text-amber-700 bg-amber-100 border-amber-200" },
  overdue:   { label: "Overdue",   cls: "text-red-700 bg-red-100 border-red-200" },
  no_record: { label: "No Record", cls: "text-slate-600 bg-slate-100 border-slate-200" },
};

function MetricCard({
  label = "",
  value = "",
  sub = "",
  trend = null,
  icon: Icon = BarChart2,
  color = "blue",
  isStatus = false,
  alert = false,
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  const statusStyle = isStatus
    ? (STATUS_STYLE[value] ?? STATUS_STYLE.no_record)
    : null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={cn("p-1.5 rounded-lg", isStatus ? "bg-muted" : c.bg)}>
          <Icon className={cn("w-3.5 h-3.5", isStatus ? "text-muted-foreground" : c.icon)} />
        </div>
      </div>

      {isStatus ? (
        <span className={cn(
          "self-start px-2.5 py-1 rounded-lg border text-xs font-semibold",
          statusStyle.cls,
        )}>
          {statusStyle.label}
        </span>
      ) : (
        <p className={cn("text-2xl font-bold", c.val)}>{value}</p>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        {sub && <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>}
        {trend !== null && trend !== undefined && <TrendBadge trend={trend} />}
        {alert && trend === null && (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        )}
      </div>
    </div>
  );
}

function TrendBadge({ trend = 0 }) {
  if (trend > 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600 shrink-0">
      <TrendingUp className="w-3 h-3" /> +{trend}%
    </span>
  );
  if (trend < 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500 shrink-0">
      <TrendingDown className="w-3 h-3" /> {trend}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
      <Minus className="w-3 h-3" /> 0%
    </span>
  );
}

// ── Recent activities ──────────────────────────────────────────────────────────

const ACTIVITY_BADGE = {
  kw_session:   { label: "KW Session",   cls: "bg-purple-100 text-purple-700" },
  visit_report: { label: "Visit Report", cls: "bg-blue-100 text-blue-700" },
  daily_log:    { label: "Daily Log",    cls: "bg-slate-100 text-slate-600" },
  activity:     { label: "Activity",     cls: "bg-muted text-muted-foreground" },
};

function RecentActivitiesPanel({ activities = [] }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Recent Activities</h3>
      </div>
      {activities.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No activities recorded yet.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {activities.map(a => {
            const badge = ACTIVITY_BADGE[a.type] ?? ACTIVITY_BADGE.activity;
            return (
              <div
                key={a.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", badge.cls)}>
                    {badge.label}
                  </span>
                  <p className="text-xs text-muted-foreground">{a.date}</p>
                </div>
                {a.hours_with_yp > 0 && (
                  <span className="text-xs font-semibold">{a.hours_with_yp}h</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Upcoming supervisions ──────────────────────────────────────────────────────

function UpcomingSupervisionPanel({ items = [] }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Upcoming Supervisions</h3>
        {items.length > 0 && (
          <span className="ml-auto text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No scheduled supervisions.
        </p>
      ) : (
        <div className="divide-y divide-border px-4">
          {items.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium capitalize">
                  {s.type?.replace(/_/g, " ") ?? "Supervision"}
                </p>
                <p className="text-xs text-muted-foreground">{s.date}</p>
                {s.supervisor_name && (
                  <p className="text-xs text-muted-foreground">with {s.supervisor_name}</p>
                )}
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Active goals ───────────────────────────────────────────────────────────────

const GOAL_STATUS_CLS = {
  in_progress: "bg-blue-100 text-blue-700",
  not_started: "bg-slate-100 text-slate-600",
  completed:   "bg-green-100 text-green-700",
  on_hold:     "bg-amber-100 text-amber-700",
};

function ActiveGoalsPanel({ items = [] }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Active Goals</h3>
        {items.length > 0 && (
          <span className="ml-auto text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No active goals. Set one with your manager.
        </p>
      ) : (
        <div className="divide-y divide-border px-4">
          {items.map(g => (
            <div key={g.id} className="py-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{g.title}</p>
                <span className={cn(
                  "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize",
                  GOAL_STATUS_CLS[g.status] ?? "bg-muted text-muted-foreground",
                )}>
                  {g.status?.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${g.progress ?? 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold w-8 text-right">{g.progress ?? 0}%</span>
              </div>
              {g.target_date && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> {g.target_date}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
