import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowList from "./WorkflowList";

export default function FMView({ workflows, events, homes, myStaffProfile, handlers }) {
  const myPending = workflows.filter(w => 
    ["bill", "expense_claim"].includes(w.entity_type) && w.status === "pending_fm"
  );
  const foPending = workflows.filter(w => 
    ["bill", "expense_claim"].includes(w.entity_type) && w.status === "pending_fo"
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Awaiting Your Approval</div>
          <div className="text-2xl font-bold mt-1">{myPending.length}</div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Awaiting FO Review</div>
          <div className="text-2xl font-bold mt-1">{foPending.length}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-approvals" className="w-full">
        <TabsList className="rounded-lg">
          <TabsTrigger value="my-approvals">Your Approvals ({myPending.length})</TabsTrigger>
          <TabsTrigger value="fo-pending">Finance Officer Pending ({foPending.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-approvals" className="mt-4">
          {myPending.length === 0 ? (
            <Card className="p-6 rounded-xl text-center text-muted-foreground text-sm">
              No bills or expenses awaiting your approval.
            </Card>
          ) : (
            <WorkflowList workflows={myPending} events={events} homes={homes} handlers={handlers} />
          )}
        </TabsContent>

        <TabsContent value="fo-pending" className="mt-4">
          {foPending.length === 0 ? (
            <Card className="p-6 rounded-xl text-center text-muted-foreground text-sm">
              All Finance Officer items have been reviewed.
            </Card>
          ) : (
            <WorkflowList workflows={foPending} events={events} homes={homes} handlers={handlers} readOnly />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}