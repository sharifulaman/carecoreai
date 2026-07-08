import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ChecksKPICards({ instances, completions, issues, selectedDate }) {
  const dateStr = selectedDate;
  const now = new Date();

  const dueNow = instances.filter(i =>
    i.scheduled_date === dateStr &&
    ["due", "in_progress"].includes(i.status)
  ).length;

  const overdue = instances.filter(i => {
    if (["completed", "cancelled", "archived", "submitted_for_review"].includes(i.status)) return false;
    const due = new Date(`${i.scheduled_date}T${i.due_at || "23:59"}:00`);
    return due < now;
  }).length;

  const issuesFound = issues.filter(i =>
    ["open", "in_progress", "awaiting_manager_review", "escalated"].includes(i.status)
  ).length;

  const completedToday = completions.filter(c => c.completion_date === dateStr).length;

  const cards = [
    {
      label: "Due Now",
      value: dueNow,
      sub: "tasks need attention",
      icon: Clock,
      iconBg: "bg-red-100",
      iconColor: "text-red-500",
      valueCls: "text-red-600",
      border: "border-red-100",
    },
    {
      label: "Overdue",
      value: overdue,
      sub: "tasks overdue",
      icon: AlertTriangle,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-500",
      valueCls: "text-orange-600",
      border: "border-orange-100",
    },
    {
      label: "Issues Found",
      value: issuesFound,
      sub: "Requires follow up",
      icon: AlertCircle,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-500",
      valueCls: "text-amber-600",
      border: "border-amber-100",
    },
    {
      label: "Completed Today",
      value: completedToday,
      sub: "Great work!",
      icon: CheckCircle2,
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
      valueCls: "text-green-600",
      border: "border-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`bg-white rounded-2xl border ${card.border} shadow-sm p-5`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className="text-sm font-semibold text-slate-600">{card.label}</span>
            </div>
            <div className={`text-4xl font-bold ${card.valueCls} leading-none`}>{card.value}</div>
            <div className="text-xs text-slate-400 mt-1.5">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
}