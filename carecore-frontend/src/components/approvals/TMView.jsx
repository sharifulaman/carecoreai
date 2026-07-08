import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WorkflowList from "./WorkflowList";

export default function TMView({ workflows, events, homes, myStaffProfile, handlers, ofstedNotifications }) {
  const pending = workflows.filter(w => w.status === "pending_tm");
  const approved = workflows.filter(w => w.status === "approved" && w.tm_approved_at);
  const rejected = workflows.filter(w => w.status === "rejected" && w.rejected_by === myStaffProfile?.id);

  const approvedThisMonth = approved.filter(w => {
    const wfDate = new Date(w.tm_approved_at);
    const now = new Date();
    return wfDate.getMonth() === now.getMonth() && wfDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold mt-1">{pending.length}</div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Approved This Month</div>
          <div className="text-2xl font-bold mt-1">{approvedThisMonth}</div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Rejected</div>
          <div className="text-2xl font-bold mt-1">{rejected.length}</div>
        </Card>
      </div>

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Awaiting Your Approval</h2>
        {pending.length === 0 ? (
          <Card className="p-6 rounded-xl text-center text-muted-foreground text-sm">
            No workflows awaiting your approval.
          </Card>
        ) : (
          <WorkflowList workflows={pending} events={events} homes={homes} handlers={handlers} />
        )}
      </div>
    </div>
  );
}