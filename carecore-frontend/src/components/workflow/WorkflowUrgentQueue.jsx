import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { differenceInDays } from "date-fns";

export default function WorkflowUrgentQueue({ workflows, onSelect }) {
  const urgentWorkflows = workflows
    .filter(w => !["approved", "rejected", "closed"].includes(w.status))
    .sort((a, b) => {
      // Sort by: overdue > escalated > high priority > due soon > oldest
      const aDaysOld = a.created_date ? differenceInDays(new Date(), new Date(a.created_date)) : 0;
      const bDaysOld = b.created_date ? differenceInDays(new Date(), new Date(b.created_date)) : 0;
      const aOverdue = a.due_date && new Date(a.due_date) < new Date() ? -1 : 0;
      const bOverdue = b.due_date && new Date(b.due_date) < new Date() ? -1 : 0;
      const aEscalated = a.escalated ? -1 : 0;
      const bEscalated = b.escalated ? -1 : 0;
      const aPriority = a.priority === "high" ? -1 : 0;
      const bPriority = b.priority === "high" ? -1 : 0;

      return (aOverdue + aEscalated + aPriority - bOverdue - bEscalated - bPriority) || (aDaysOld - bDaysOld);
    })
    .slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">Urgent Today</h3>
      <div className="space-y-2">
        {urgentWorkflows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">All clear!</p>
        ) : (
          urgentWorkflows.map(w => {
            const daysOld = w.created_date ? differenceInDays(new Date(), new Date(w.created_date)) : 0;
            const isOverdue = w.due_date && new Date(w.due_date) < new Date();
            
            return (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                className="w-full p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-left text-xs border border-border/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{w.reference || "Workflow"}</p>
                    <p className="text-muted-foreground text-xs mt-1">{daysOld} days waiting</p>
                  </div>
                  {isOverdue && (
                    <span className="shrink-0 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">Overdue</span>
                  )}
                  {w.escalated && !isOverdue && (
                    <span className="shrink-0 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-semibold">Escalated</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}