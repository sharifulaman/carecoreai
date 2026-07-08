import { useMemo } from "react";
import { AlertTriangle, Clock, TrendingUp, TrendingDown, CheckCircle2, Bell } from "lucide-react";

/**
 * IncidentOutcomeKPIs
 * Props: incidents — array of AccidentReport records with impact/outcome fields merged
 */
export default function IncidentOutcomeKPIs({ incidents = [] }) {
  const today = new Date();

  const kpis = useMemo(() => {
    const awaitingOutcomeReview = incidents.filter(i =>
      i.manager_review_status === "pending_review" || i.manager_review_status === "pending_tl"
    ).length;

    const followUpOpen = incidents.filter(i =>
      i.follow_up_required === true && !i.completion_date
    ).length;

    const followUpOverdue = incidents.filter(i =>
      i.follow_up_required === true &&
      !i.completion_date &&
      i.target_date &&
      new Date(i.target_date) < today
    ).length;

    const riskIncreased = incidents.filter(i => i.risk_change === "increased").length;
    const riskReduced = incidents.filter(i => i.risk_change === "reduced").length;
    const reg27Pending = incidents.filter(i => i.reg27_notification_required === "pending").length;

    return { awaitingOutcomeReview, followUpOpen, followUpOverdue, riskIncreased, riskReduced, reg27Pending };
  }, [incidents]);

  const cards = [
    {
      label: "Awaiting outcome review",
      value: kpis.awaitingOutcomeReview,
      icon: Clock,
      color: "bg-amber-50 border-amber-200 text-amber-700",
      highlight: kpis.awaitingOutcomeReview > 0,
    },
    {
      label: "Follow-up actions open",
      value: kpis.followUpOpen,
      icon: CheckCircle2,
      color: "bg-blue-50 border-blue-200 text-blue-700",
      highlight: false,
    },
    {
      label: "Overdue follow-up actions",
      value: kpis.followUpOverdue,
      icon: AlertTriangle,
      color: "bg-red-50 border-red-200 text-red-700",
      highlight: kpis.followUpOverdue > 0,
    },
    {
      label: "Risk increased",
      value: kpis.riskIncreased,
      icon: TrendingUp,
      color: "bg-red-50 border-red-200 text-red-700",
      highlight: kpis.riskIncreased > 0,
    },
    {
      label: "Risk reduced",
      value: kpis.riskReduced,
      icon: TrendingDown,
      color: "bg-green-50 border-green-200 text-green-700",
      highlight: false,
    },
    {
      label: "Reg 27 decision pending",
      value: kpis.reg27Pending,
      icon: Bell,
      color: "bg-purple-50 border-purple-200 text-purple-700",
      highlight: kpis.reg27Pending > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl border-2 p-3 ${card.color} ${card.highlight ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            <div className="flex items-start justify-between gap-1">
              <p className="text-2xl font-bold">{card.value}</p>
              <Icon className="w-4 h-4 opacity-60 mt-0.5 shrink-0" />
            </div>
            <p className="text-xs font-medium mt-1 leading-tight">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}