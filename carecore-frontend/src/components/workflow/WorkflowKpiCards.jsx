import { AlertTriangle, CheckCircle2, Clock, AlertCircle, TrendingUp, XCircle } from "lucide-react";

export default function WorkflowKpiCards({ data, onCardClick }) {
  const cards = [
    { key: "myPending", icon: AlertTriangle, label: "Pending My Action", value: data.myPending, color: "amber" },
    { key: "overdue", icon: AlertTriangle, label: "At Risk / SLA Breach", value: data.overdue, color: "red" },
    { key: "waitingOnOthers", icon: Clock, label: "Awaiting Approval", value: data.waitingOnOthers, color: "purple" },
    { key: "escalated", icon: AlertCircle, label: "Escalations", value: data.escalated, color: "orange" },
    { key: "approvedThisMonth", icon: CheckCircle2, label: "Approved This Month", value: data.approvedThisMonth, color: "green" },
    { key: "rejectedReturned", icon: XCircle, label: "Rejected / Returned", value: data.rejectedReturned, color: "red" },
  ];

  const colorStyles = {
    amber: "bg-amber-50 border-amber-200 hover:border-amber-300 text-amber-700",
    red: "bg-red-50 border-red-200 hover:border-red-300 text-red-700",
    purple: "bg-purple-50 border-purple-200 hover:border-purple-300 text-purple-700",
    orange: "bg-orange-50 border-orange-200 hover:border-orange-300 text-orange-700",
    green: "bg-green-50 border-green-200 hover:border-green-300 text-green-700",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <button
            key={card.key}
            onClick={() => onCardClick(card.key)}
            className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-md cursor-pointer ${colorStyles[card.color]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs mt-1.5 font-medium opacity-80">{card.label}</p>
              </div>
              <Icon className="w-5 h-5 shrink-0 opacity-50" />
            </div>
          </button>
        );
      })}
    </div>
  );
}