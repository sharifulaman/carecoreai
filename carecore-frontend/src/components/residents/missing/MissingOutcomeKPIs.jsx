import { useMemo } from "react";
import { ClipboardList, MessageSquare, Shield, TrendingUp, Clock } from "lucide-react";

export default function MissingOutcomeKPIs({ outcomes = [], mfhRecords = [] }) {
  const kpis = useMemo(() => {
    const today = new Date();
    const awaitingReview = outcomes.filter(o => o.manager_review_status === "pending").length;
    const interviewsPending = outcomes.filter(o => o.return_interview_completed_status === "pending").length;
    const safetyPlanPending = outcomes.filter(o => o.safety_plan_updated === "no").length;
    const riskIncreased = outcomes.filter(o => o.risk_change === "increased").length;
    const overdueFollowUps = outcomes.filter(o => {
      if (!o.follow_up_required || !o.target_date || o.completion_date) return false;
      return new Date(o.target_date) < today;
    }).length;

    return [
      {
        label: "Awaiting Outcome Review",
        value: awaitingReview,
        icon: ClipboardList,
        urgent: awaitingReview > 0,
        color: awaitingReview > 0 ? "text-amber-600" : "text-muted-foreground",
        bg: awaitingReview > 0 ? "border-amber-400 bg-amber-50" : "border-border bg-card",
      },
      {
        label: "Return Interviews Pending",
        value: interviewsPending,
        icon: MessageSquare,
        urgent: interviewsPending > 0,
        color: interviewsPending > 0 ? "text-blue-600" : "text-muted-foreground",
        bg: interviewsPending > 0 ? "border-blue-400 bg-blue-50" : "border-border bg-card",
      },
      {
        label: "Safety Plans Pending Update",
        value: safetyPlanPending,
        icon: Shield,
        urgent: safetyPlanPending > 0,
        color: safetyPlanPending > 0 ? "text-orange-600" : "text-muted-foreground",
        bg: safetyPlanPending > 0 ? "border-orange-400 bg-orange-50" : "border-border bg-card",
      },
      {
        label: "Risk Increased After Episode",
        value: riskIncreased,
        icon: TrendingUp,
        urgent: riskIncreased > 0,
        color: riskIncreased > 0 ? "text-red-600" : "text-muted-foreground",
        bg: riskIncreased > 0 ? "border-red-400 bg-red-50" : "border-border bg-card",
      },
      {
        label: "Overdue Follow-Ups",
        value: overdueFollowUps,
        icon: Clock,
        urgent: overdueFollowUps > 0,
        color: overdueFollowUps > 0 ? "text-red-700" : "text-muted-foreground",
        bg: overdueFollowUps > 0 ? "border-red-500 bg-red-50" : "border-border bg-card",
      },
    ];
  }, [outcomes, mfhRecords]);

  if (outcomes.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map(k => (
        <div key={k.label} className={`border rounded-lg p-3 ${k.bg}`}>
          <div className="flex items-center gap-2 mb-1">
            <k.icon className={`w-4 h-4 ${k.color}`} />
            <p className="text-xs text-muted-foreground font-medium leading-tight">{k.label}</p>
          </div>
          <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
        </div>
      ))}
    </div>
  );
}