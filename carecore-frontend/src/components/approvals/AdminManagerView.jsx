import { useState, useMemo } from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

function StatCard({ label, value, icon: Icon, accentColor }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 flex items-center gap-4 border-l-[3px] ${accentColor}`}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[32px] font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

function Tabs({ tabs, active, setActive }) {
  return (
    <div className="flex gap-0 border-b border-border">
      {tabs.map(t => (
        <button key={t.key} onClick={() => setActive(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {t.label}
          {t.count != null && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold ${active === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function WorkflowList({ items, isPending }) {
  if (items.length === 0) {
    return (
      <div className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
        <p className="text-sm">{isPending ? "No submissions found." : "No submissions found."}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map(wf => (
        <Card key={wf.id} className="p-4">
          <p className="text-sm font-medium">{wf.entity_type}</p>
          <p className="text-xs text-muted-foreground">#{wf.entity_reference}</p>
        </Card>
      ))}
    </div>
  );
}

export default function AdminManagerView({ workflows }) {
  const [tab, setTab] = useState("pending");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const pendingApproval = useMemo(() =>
    workflows.filter(w => w.status === "pending_admin"),
    [workflows]
  );
  const all = useMemo(() => workflows, [workflows]);
  const pendingCount = workflows.filter(w => w.status === "pending_admin").length;
  const approvedThisMonth = workflows.filter(w => w.status === "approved" && w.admin_approved_at && new Date(w.admin_approved_at) >= monthStart).length;
  const rejectedThisMonth = workflows.filter(w => w.status === "rejected" && w.rejected_at && new Date(w.rejected_at) >= monthStart).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Pending My Approval" value={pendingCount} icon={Clock} accentColor="border-l-amber-500" />
        <StatCard label="Approved This Month" value={approvedThisMonth} icon={CheckCircle2} accentColor="border-l-green-500" />
        <StatCard label="Rejected This Month" value={rejectedThisMonth} icon={XCircle} accentColor="border-l-red-500" />
      </div>
      <Tabs tabs={[
        { key: "pending", label: "Pending My Approval", count: pendingCount },
        { key: "all", label: "Full Overview", count: workflows.length },
      ]} active={tab} setActive={setTab} />
      {tab === "pending" && <WorkflowList items={pendingApproval} isPending />}
      {tab === "all" && <WorkflowList items={all} />}
    </div>
  );
}