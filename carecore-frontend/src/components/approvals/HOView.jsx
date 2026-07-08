import { Card } from "@/components/ui/card";
import WorkflowList from "./WorkflowList";

export default function HOView({ workflows, events, homes, myStaffProfile, handlers }) {
  const pending = workflows.filter(w => 
    ["leave_request", "new_staff_entry"].includes(w.entity_type) && w.status === "pending_ho"
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card className="p-4 rounded-xl">
        <div className="text-xs text-muted-foreground">Pending HR Review</div>
        <div className="text-2xl font-bold mt-1">{pending.length}</div>
      </Card>

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Leave Requests & New Staff Awaiting Your Review</h2>
        {pending.length === 0 ? (
          <Card className="p-6 rounded-xl text-center text-muted-foreground text-sm">
            No items awaiting your HR review.
          </Card>
        ) : (
          <WorkflowList workflows={pending} events={events} homes={homes} handlers={handlers} />
        )}
      </div>
    </div>
  );
}