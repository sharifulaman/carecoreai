import { useMemo } from "react";
import { ClipboardList, AlertTriangle, Clock, FileCheck, Shield } from "lucide-react";

export default function KeyWorkKPIs({ sessions = [] }) {
  const kwSessions = useMemo(() => sessions.filter(s => s.is_key_worker_session === true), [sessions]);

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const kpis = useMemo(() => {
    const completedThisMonth = kwSessions.filter(s =>
      s.date?.startsWith(thisMonth) && (s.status === "submitted" || s.status === "reviewed" || s.status === "approved")
    ).length;

    const openFollowUps = kwSessions.filter(s =>
      s.kw_follow_up_required === true && s.kw_target_date && s.kw_target_date >= today
    ).length;

    const overdueFollowUps = kwSessions.filter(s =>
      s.kw_follow_up_required === true && s.kw_target_date && s.kw_target_date < today
    ).length;

    const concernsIdentified = kwSessions.filter(s => s.kw_concern_identified === true).length;

    const supportPlanUpdatesRequired = kwSessions.filter(s => s.kw_support_plan_update === "yes").length;

    const riskAssessmentUpdatesRequired = kwSessions.filter(s => s.kw_risk_assessment_update === "yes").length;

    return [
      {
        label: "Sessions Completed",
        sub: "This month",
        value: completedThisMonth,
        icon: ClipboardList,
        color: "text-blue-600",
        bg: "bg-blue-500/10",
      },
      {
        label: "Follow-Ups Open",
        sub: overdueFollowUps > 0 ? `${overdueFollowUps} overdue` : "All on track",
        value: openFollowUps + overdueFollowUps,
        icon: Clock,
        color: overdueFollowUps > 0 ? "text-red-600" : "text-amber-600",
        bg: overdueFollowUps > 0 ? "bg-red-500/10" : "bg-amber-500/10",
      },
      {
        label: "Concerns Identified",
        sub: "Across all sessions",
        value: concernsIdentified,
        icon: AlertTriangle,
        color: concernsIdentified > 0 ? "text-red-600" : "text-muted-foreground",
        bg: concernsIdentified > 0 ? "bg-red-500/10" : "bg-muted",
      },
      {
        label: "Support Plan Updates",
        sub: "Required",
        value: supportPlanUpdatesRequired,
        icon: FileCheck,
        color: supportPlanUpdatesRequired > 0 ? "text-orange-600" : "text-muted-foreground",
        bg: supportPlanUpdatesRequired > 0 ? "bg-orange-500/10" : "bg-muted",
      },
      {
        label: "Risk Assessment Updates",
        sub: "Required",
        value: riskAssessmentUpdatesRequired,
        icon: Shield,
        color: riskAssessmentUpdatesRequired > 0 ? "text-purple-600" : "text-muted-foreground",
        bg: riskAssessmentUpdatesRequired > 0 ? "bg-purple-500/10" : "bg-muted",
      },
    ];
  }, [kwSessions, today, thisMonth]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
              <Icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none mb-1">{kpi.value}</p>
              <p className="text-xs font-medium text-foreground leading-snug">{kpi.label}</p>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}