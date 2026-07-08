import { Card } from "@/components/ui/card";
import WorkflowList from "./WorkflowList";

export default function FOView({ workflows, events, homes, myStaffProfile, handlers }) {
  const pending = workflows.filter(w => 
    ["bill", "expense_claim"].includes(w.entity_type) && w.status === "pending_fo"
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card className="p-4 rounded-xl">
        <div className="text-xs text-muted-foreground">Pending Finance Review</div>
        <div className="text-2xl font-bold mt-1">{pending.length}</div>
      </Card>

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Bills & Expenses Awaiting Your Review</h2>
        {pending.length === 0 ? (
          <Card className="p-6 rounded-xl text-center text-muted-foreground text-sm">
            No bills or expenses awaiting your review.
          </Card>
        ) : (
          <WorkflowList workflows={pending} events={events} homes={homes} handlers={handlers} />
        )}
      </div>
    </div>
  );
}