// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { performanceApi } from "@/lib/performanceApi";
import WorkerActivitiesModal from "./WorkerActivitiesModal";
import GoalsListModal from "./GoalsListModal";
import SetGoalModal from "./SetGoalModal";
import PIPModal from "./PIPModal";
import {
  Target, Activity, ShieldCheck, Clock, BarChart2, ChevronRight, TrendingUp, Plus, FileWarning,
} from "lucide-react";

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max = 100, colorClass = "bg-primary" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, sub, iconCls = "text-primary" }) {
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2.5 flex gap-2.5 items-start">
      <div className={`mt-0.5 ${iconCls}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Goal list (from backend row) ──────────────────────────────────────────────

function GoalList({ goals }) {
  if (!goals?.length) {
    return <p className="text-xs text-muted-foreground italic">No goals recorded this period.</p>;
  }
  return (
    <div className="space-y-2">
      {goals.slice(0, 4).map((g, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-xs truncate flex-1">{g.title || "Untitled goal"}</span>
          <div className="flex items-center gap-2 shrink-0 w-32">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${g.progress ?? 0}%` }}
              />
            </div>
            <span className="text-[10px] w-6 text-right text-muted-foreground">{g.progress ?? 0}%</span>
          </div>
          <span className={`text-[10px] font-medium capitalize ${
            g.status === "completed"   ? "text-green-600" :
            g.status === "in_progress" ? "text-blue-600"  :
            g.status === "not_started" ? "text-slate-500" :
                                         "text-amber-600"
          }`}>
            {(g.status || "").replace(/_/g, " ")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Alert badges ──────────────────────────────────────────────────────────────

function AlertBadge({ type, severity }) {
  const sevCls =
    severity === "high"   ? "bg-red-100 text-red-700 border-red-200"     :
    severity === "medium" ? "bg-amber-100 text-amber-700 border-amber-200" :
                            "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${sevCls} capitalize`}>
      {type?.replace(/_/g, " ")}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * EmployeeRowDetail
 *
 * Expanded row detail for a single employee in the team performance table.
 * Receives a `row` (TeamStaffRow) — all metric values are pre-computed by the backend.
 * Lazily fetches the last 5 activities only when the row is expanded.
 */
export default function EmployeeRowDetail({ row, user }) {
  const [showActivities, setShowActivities] = useState(false);
  const [showGoals, setShowGoals]           = useState(false);
  const [showSetGoal, setShowSetGoal]       = useState(false);
  const [showPIP, setShowPIP]               = useState(false);

  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ["staff-activities-preview", row.staff_id],
    queryFn:  () => performanceApi.staffActivities(row.staff_id, { pageSize: 5 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!row.staff_id,
  });

  const activities = activitiesData?.activities ?? [];

  const trainingColor =
    row.training_compliance_pct >= 80 ? "bg-green-500" :
    row.training_compliance_pct >= 60 ? "bg-amber-500" :
                                        "bg-red-500";
  const scoreColor =
    row.score >= 90 ? "bg-green-500" :
    row.score >= 75 ? "bg-blue-500"  :
    row.score >= 60 ? "bg-amber-500" :
    row.score >= 0  ? "bg-red-500"   :
                      "bg-muted";

  return (
    <div className="space-y-4">
      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile
          icon={BarChart2}
          label="Performance Score"
          value={row.score >= 0 ? `${row.score}%` : "N/A"}
          iconCls="text-primary"
        />
        <StatTile
          icon={Activity}
          label="Activities This Period"
          value={row.activities_count}
          iconCls="text-purple-600"
        />
        <StatTile
          icon={Clock}
          label="Avg Hours / Week"
          value={row.avg_hours_per_week > 0 ? `${row.avg_hours_per_week}h` : "—"}
          iconCls="text-teal-600"
        />
        <StatTile
          icon={ShieldCheck}
          label="Attendance"
          value={row.attendance_pct > 0 ? `${row.attendance_pct}%` : "—"}
          sub={row.days_worked > 0 ? `${row.days_worked} days worked` : null}
          iconCls="text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ── Score + Training ── */}
        <div className="bg-background border border-border rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold">Performance Metrics</p>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Overall Score</span>
              <span>{row.score >= 0 ? `${row.score}%` : "N/A"}</span>
            </div>
            <ProgressBar value={row.score >= 0 ? row.score : 0} colorClass={scoreColor} />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Training Compliance</span>
              <span>{row.training_compliance_pct}%</span>
            </div>
            <ProgressBar value={row.training_compliance_pct} colorClass={trainingColor} />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Goal Progress (avg)</span>
              <span>{row.avg_goal_progress > 0 ? `${Math.round(row.avg_goal_progress)}%` : "—"}</span>
            </div>
            <ProgressBar value={row.avg_goal_progress ?? 0} colorClass="bg-blue-500" />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">Last Supervision</span>
            <span className="text-xs">
              {row.last_supervision_date || "No record"}
            </span>
          </div>
        </div>

        {/* ── Goals ── */}
        <div className="bg-background border border-border rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              Goals ({row.goals_count ?? 0})
            </p>
            <div className="flex items-center gap-2">
              {row.goals_count > 0 && (
                <button
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  onClick={() => setShowGoals(true)}
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              )}
              <button
                className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5 font-medium"
                onClick={() => setShowSetGoal(true)}
              >
                <Plus className="w-3 h-3" /> Set Goal
              </button>
            </div>
          </div>
          <GoalList goals={row.goals_preview} />
        </div>
      </div>

      {/* ── Alerts ── */}
      {row.alerts?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-700 mb-2">Active Alerts</p>
          <div className="flex flex-wrap gap-1.5">
            {row.alerts.map((a, i) => (
              <AlertBadge key={i} type={a.alert_type} severity={a.severity} />
            ))}
          </div>
        </div>
      )}

      {/* ── PIP quick-access ── */}
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-left"
        onClick={() => setShowPIP(true)}
      >
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Performance Improvement Plans (PIP)</p>
            <p className="text-[10px] text-amber-700">View or create a formal improvement plan for this employee</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
      </button>

      {/* ── Recent activities ── */}
      <div className="bg-background border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            Recent Activities
          </p>
          <button
            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
            onClick={() => setShowActivities(true)}
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {activitiesLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No activities recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {activities.map((act, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-2">
                <span className="truncate flex-1 text-foreground">{act.summary || act.type}</span>
                <span className="text-muted-foreground shrink-0">{act.date}</span>
                {act.resident_name && (
                  <span className="text-muted-foreground shrink-0 italic">
                    — {act.resident_name}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showGoals && (
        <GoalsListModal
          staffId={row.staff_id}
          staffName={row.staff_name}
          staffRole={row.role}
          onClose={() => setShowGoals(false)}
        />
      )}

      {showActivities && (
        <WorkerActivitiesModal
          staffId={row.staff_id}
          staffName={row.staff_name}
          staffRole={row.role}
          onClose={() => setShowActivities(false)}
        />
      )}

      {showSetGoal && (
        <SetGoalModal
          staffId={row.staff_id}
          staffName={row.staff_name}
          staffRole={row.role}
          onClose={() => setShowSetGoal(false)}
        />
      )}

      {showPIP && (
        <PIPModal
          staffId={row.staff_id}
          staffName={row.staff_name}
          staffRole={row.role}
          onClose={() => setShowPIP(false)}
        />
      )}
    </div>
  );
}
