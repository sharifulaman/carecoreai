// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { generatePerformancePDF } from "@/lib/generatePerformancePDF";
import {
  BarChart2, Clock, Target, CalendarCheck, GraduationCap,
  CheckCircle2, AlertTriangle, Download, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Config ──────────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: "this_month",   label: "This Month" },
  { value: "last_month",   label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year",    label: "This Year" },
];

const SUPERVISION_STATUS = {
  on_track:  { cls: "bg-green-50 border-green-200 text-green-700",  dot: "bg-green-500",  label: "On Track" },
  due_soon:  { cls: "bg-amber-50 border-amber-200 text-amber-700",  dot: "bg-amber-400",  label: "Due Soon" },
  overdue:   { cls: "bg-red-50 border-red-200 text-red-700",        dot: "bg-red-500",    label: "Overdue" },
  no_record: { cls: "bg-slate-50 border-slate-200 text-slate-600",  dot: "bg-slate-400",  label: "No Record" },
};

// ── API helper ──────────────────────────────────────────────────────────────────

async function fetchStaffSummary(staffId, period) {
  const token = sessionStorage.getItem("access_token") || sessionStorage.getItem("token");
  const base  = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const r = await fetch(
    `${base}/business/staff-performance/${staffId}/summary?period=${period}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (r.status === 403) {
    const body = await r.json().catch(() => ({}));
    throw Object.assign(new Error("forbidden"), { status: 403, message: body.error ?? "Access denied" });
  }
  if (!r.ok) throw new Error("Failed to load performance data");
  const json = await r.json();
  return json.data;
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function StaffPerformanceTab({ member, user }) {
  const [period, setPeriod]       = useState("this_month");
  const [isExporting, setIsExporting] = useState(false);

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ["staff-performance-summary", member.id, period],
    queryFn: () => fetchStaffSummary(member.id, period),
    staleTime: 2 * 60 * 1000,
    retry: (count, err) => err?.status !== 403 && count < 2,
  });

  const m = summary?.metrics ?? {};

  // ── Access denied ───────────────────────────────────────────────────────────
  if (isError && error?.status === 403) {
    return (
      <div className="py-10 text-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-sm font-semibold">Access Restricted</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          You can only view performance data for staff with a lower role rank than your own.
        </p>
      </div>
    );
  }

  // ── Generic error ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Could not load performance data. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4 -mt-2">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          disabled={isExporting || !summary}
          onClick={() => {
            if (!summary) return;
            setIsExporting(true);
            try {
              generatePerformancePDF(summary, {
                full_name:    member.full_name,
                job_title:    member.job_title,
                role:         member.role,
                employee_id:  member.employee_id,
                home_names:   member.home_names ?? [],
              });
            } finally {
              setIsExporting(false);
            }
          }}
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? "Exporting…" : "Export PDF"}
        </Button>
      </div>

      {/* Period label */}
      {summary?.period?.label && (
        <p className="text-xs text-muted-foreground">
          Period: <span className="font-medium text-foreground">{summary.period.label}</span>
        </p>
      )}

      {/* Metric cards — 2×3 grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={BarChart2}
          color="blue"
          label="Activities"
          value={m.activities_completed ?? 0}
          trend={m.activities_trend_pct}
          sub={m.activities_completed_prev != null ? `Prev: ${m.activities_completed_prev}` : null}
          isLoading={isLoading}
        />
        <MetricCard
          icon={Clock}
          color="purple"
          label="Hours with YP"
          value={m.hours_with_yp != null ? `${m.hours_with_yp}h` : "—"}
          trend={m.hours_trend_pct}
          sub={m.hours_with_yp_prev != null ? `Prev: ${m.hours_with_yp_prev}h` : null}
          isLoading={isLoading}
        />
        <MetricCard
          icon={GraduationCap}
          color={(() => {
            const p = m.training_compliance_pct ?? 0;
            return p >= 80 ? "green" : p >= 60 ? "amber" : "red";
          })()}
          label="Training"
          value={m.training_compliance_pct != null ? `${m.training_compliance_pct}%` : "—"}
          sub={(m.training_expiring_soon ?? 0) > 0 ? `${m.training_expiring_soon} expiring soon` : "All up to date"}
          alert={(m.training_expiring_soon ?? 0) > 0}
          isLoading={isLoading}
        />
        <MetricCard
          icon={Target}
          color="teal"
          label="Active Goals"
          value={m.active_goals_count ?? 0}
          sub={(m.goals_achieved_this_period ?? 0) > 0 ? `${m.goals_achieved_this_period} achieved` : null}
          isLoading={isLoading}
        />
        <MetricCard
          icon={CalendarCheck}
          color={m.supervision_status === "on_track" ? "green" : m.supervision_status === "overdue" ? "red" : "amber"}
          label="Supervision"
          value={(m.supervision_status ?? "—").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          sub={m.last_supervision_date ? `Last: ${m.last_supervision_date}` : null}
          isLoading={isLoading}
        />
        <MetricCard
          icon={CheckCircle2}
          color="orange"
          label="Attendance"
          value={m.attendance_pct != null ? `${m.attendance_pct}%` : "—"}
          sub={m.shifts_worked > 0 ? `${m.shifts_worked} shifts` : null}
          isLoading={isLoading}
        />
      </div>

      {/* Supervision status banner */}
      {!isLoading && m.supervision_status && (
        <SupervisionBanner metrics={m} />
      )}

      {/* Active goals */}
      {!isLoading && (summary?.active_goals ?? []).length > 0 && (
        <GoalsList goals={summary.active_goals} />
      )}

      {/* Recent activities */}
      {!isLoading && (summary?.recent_activities ?? []).length > 0 && (
        <RecentActivities activities={summary.recent_activities} />
      )}
    </div>
  );
}

// ── Metric card ─────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-500",   border: "border-blue-100" },
  purple: { bg: "bg-purple-50", icon: "text-purple-500", border: "border-purple-100" },
  green:  { bg: "bg-green-50",  icon: "text-green-600",  border: "border-green-100" },
  teal:   { bg: "bg-teal-50",   icon: "text-teal-600",   border: "border-teal-100" },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  border: "border-amber-100" },
  red:    { bg: "bg-red-50",    icon: "text-red-600",    border: "border-red-100" },
  orange: { bg: "bg-orange-50", icon: "text-orange-500", border: "border-orange-100" },
};

function MetricCard({ icon: Icon, color, label, value, trend, sub, alert, isLoading }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;

  if (isLoading) {
    return <div className="h-20 bg-muted rounded-xl animate-pulse" />;
  }

  return (
    <div className={cn("rounded-xl border p-3 flex flex-col gap-1 shadow-sm", c.bg, c.border)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5 shrink-0", c.icon)} />
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
        {alert && <AlertTriangle className="w-3 h-3 text-amber-500" />}
      </div>
      <p className="text-xl font-bold leading-none capitalize">{value}</p>
      <div className="flex items-center gap-1.5">
        {trend != null && (
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[10px] font-semibold",
            trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground",
          )}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
        {sub && <span className="text-[10px] text-muted-foreground truncate">{sub}</span>}
      </div>
    </div>
  );
}

// ── Supervision banner ──────────────────────────────────────────────────────────

function SupervisionBanner({ metrics: m }) {
  const cfg = SUPERVISION_STATUS[m.supervision_status] ?? SUPERVISION_STATUS.no_record;

  return (
    <div className={cn("rounded-xl border px-4 py-3 flex items-start gap-3", cfg.cls)}>
      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-1", cfg.dot)} />
      <div className="text-xs space-y-0.5">
        <p className="font-semibold">Supervision: {cfg.label}</p>
        {m.last_supervision_date && (
          <p>Last: <span className="font-medium">{m.last_supervision_date}</span></p>
        )}
        {m.next_supervision_date && (
          <p>Next scheduled: <span className="font-medium">{m.next_supervision_date}</span></p>
        )}
      </div>
    </div>
  );
}

// ── Active goals ────────────────────────────────────────────────────────────────

function GoalsList({ goals }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Active Goals ({goals.length})
      </p>
      <div className="space-y-1.5">
        {goals.slice(0, 5).map((g, i) => {
          const title    = typeof g === "string" ? g : (g.title ?? "Goal");
          const progress = typeof g === "object" ? (g.progress ?? 0) : null;
          const status   = typeof g === "object" ? (g.status ?? "") : "";

          return (
            <div key={g.id ?? i} className="bg-muted/40 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-medium leading-snug truncate flex-1">{title}</p>
                {progress !== null && (
                  <span className="text-xs font-semibold shrink-0">{progress}%</span>
                )}
              </div>
              {progress !== null && (
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      status === "achieved"  ? "bg-green-500" :
                      status === "deferred"  ? "bg-amber-400" :
                      "bg-blue-500",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {goals.length > 5 && (
          <p className="text-xs text-muted-foreground pl-1">+ {goals.length - 5} more</p>
        )}
      </div>
    </div>
  );
}

// ── Recent activities ───────────────────────────────────────────────────────────

const ACT_LABELS = {
  kw_session:   "KW Session",
  visit_report: "Visit Report",
  daily_log:    "Daily Log",
};

function RecentActivities({ activities }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Recent Activities
      </p>
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {activities.slice(0, 6).map((a, i) => (
          <div key={a.id ?? i} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30 transition-colors">
            <div className="min-w-0">
              <p className="font-medium">{ACT_LABELS[a.type] ?? a.type?.replace(/_/g, " ") ?? "Activity"}</p>
              {a.resident_name && (
                <p className="text-muted-foreground truncate">{a.resident_name}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-3 space-y-0.5">
              <p className="text-muted-foreground">{a.date}</p>
              {(a.hours_with_yp ?? 0) > 0 && (
                <p className="font-medium">{a.hours_with_yp}h</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
