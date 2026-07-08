import { Card } from "@/components/ui/card";
import WorkflowList from "./WorkflowList";

export default function RMView({ workflows, events, homes, myStaffProfile, handlers }) {
  const pending = workflows.filter(w => w.status === "pending_rm");
  const approved = workflows.filter(w => w.status === "approved" && w.rm_approved_at);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Pending (Org-wide)</div>
          <div className="text-2xl font-bold mt-1">{pending.length}</div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Approved This Month</div>
          <div className="text-2xl font-bold mt-1">{approved.filter(w => {
            const wfDate = new Date(w.rm_approved_at);
            const now = new Date();
            return wfDate.getMonth() === now.getMonth() && wfDate.getFullYear() === now.getFullYear();
          }).length}</div>
        </Card>
      </div>

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Awaiting Your Regional Review</h2>
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