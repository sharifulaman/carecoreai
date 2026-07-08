import { Wrench, Clock, AlertTriangle, CheckCircle2, PoundSterling } from "lucide-react";

const ACTIVE_STATUSES = ["open","reported","assigned","in_progress","awaiting_contractor","awaiting_parts","planned"];

export default function MaintenanceKPICards({ issues, onCardClick }) {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const activeIssues = issues.filter(i => ACTIVE_STATUSES.includes(i.status));
  const urgentCount = activeIssues.filter(i => i.priority === "urgent").length;

  const inProgress = issues.filter(i => ["in_progress", "awaiting_contractor", "awaiting_parts"].includes(i.status));
  const dueTodayCount = inProgress.filter(i => i.due_at && i.due_at.startsWith(today)).length;

  const overdue = issues.filter(i =>
    i.due_at && i.due_at.slice(0, 10) < today &&
    !["completed","cancelled"].includes(i.status)
  );
  const criticalOverdue = overdue.filter(i => i.priority === "urgent" || i.priority === "high").length;

  const completedThisMonth = issues.filter(i =>
    i.status === "completed" && i.completed_at && i.completed_at.startsWith(thisMonth)
  );

  const estimatedSpend = issues
    .filter(i => i.reported_at && i.reported_at.startsWith(thisMonth))
    .reduce((sum, i) => sum + (i.estimated_cost || 0), 0);

  const cards = [
    {
      title: "Open Issues",
      value: activeIssues.length,
      subtext: `${urgentCount} urgent`,
      subtextColor: urgentCount > 0 ? "text-red-500" : "text-slate-400",
      icon: Wrench,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      arrow: "↑",
      arrowColor: "text-red-500",
    },
    {
      title: "In Progress",
      value: inProgress.length,
      subtext: `${dueTodayCount} due today`,
      subtextColor: dueTodayCount > 0 ? "text-amber-500" : "text-slate-400",
      icon: Clock,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Overdue",
      value: overdue.length,
      subtext: `${criticalOverdue} critical`,
      subtextColor: criticalOverdue > 0 ? "text-red-500" : "text-slate-400",
      icon: AlertTriangle,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      title: "Completed This Month",
      value: completedThisMonth.length,
      subtext: "This month",
      subtextColor: "text-green-500",
      icon: CheckCircle2,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Estimated Spend",
      value: `£${estimatedSpend.toLocaleString()}`,
      subtext: "This month",
      subtextColor: "text-slate-400",
      icon: PoundSterling,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all" onClick={() => onCardClick?.(card.title)}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 ${card.iconColor}`} size={18} />
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">{card.title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{card.value}</p>
            <p className={`text-xs mt-1 font-medium ${card.subtextColor}`}>{card.arrow && <span>{card.arrow} </span>}{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}