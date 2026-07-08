import { Card } from "@/components/ui/card";
import WorkflowList from "./WorkflowList";

export default function ROView({ workflows, events, homes, myStaffProfile, handlers }) {
  const pending = workflows.filter(w => 
    ["incident_report", "missing_episode"].includes(w.entity_type) && w.status === "pending_ro"
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card className="p-4 rounded-xl">
        <div className="text-xs text-muted-foreground">Pending Risk Review</div>
        <div className="text-2xl font-bold mt-1">{pending.length}</div>
      </Card>

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Incidents & Missing Episodes Awaiting Your Review</h2>
        {pending.length === 0 ? (
          <Card className="p-6 rounded-xl text-center text-muted-foreground text-sm">
            No risk items awaiting your review.
          </Card>
        ) : (
          <WorkflowList workflows={pending} events={events} homes={homes} handlers={handlers} />
        )}
      </div>
    </div>
  );
}