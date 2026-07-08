import { CalendarDays, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO, isValid } from "date-fns";

export default function UpcomingDeadlinesPanel({ modules, onOpen }) {
  const today = new Date();

  const withDue = modules
    .filter(m => m.dueDate && isValid(parseISO(m.dueDate)))
    .map(m => ({
      ...m,
      daysLeft: differenceInDays(parseISO(m.dueDate), today),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const dotColor = (days) => {
    if (days < 0) return "bg-red-500";
    if (days <= 7) return "bg-red-400";
    if (days <= 14) return "bg-amber-400";
    return "bg-blue-400";
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-bold text-foreground">Upcoming Deadlines</h3>

      {withDue.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No upcoming deadlines found.</p>
      ) : withDue.map(m => (
        <button
          key={m.key}
          onClick={() => onOpen(m.key)}
          className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 text-left transition-colors"
        >
          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor(m.daysLeft)}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{m.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{m.dueDate}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-xs font-semibold ${m.daysLeft < 0 ? "text-red-600" : m.daysLeft <= 7 ? "text-red-500" : "text-muted-foreground"}`}>
              {m.daysLeft < 0 ? `${Math.abs(m.daysLeft)}d overdue` : `${m.daysLeft} days left`}
            </p>
          </div>
        </button>
      ))}

      <button
        onClick={() => {}}
        className="flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-1"
      >
        View all deadlines <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}