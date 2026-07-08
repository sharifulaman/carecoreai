import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";

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

function FilterBar({ homes, filters, setFilters }) {
  const ENTITY_LABELS = {
    bill: "Bill",
    visit_report: "Visit Report",
    support_plan: "Support Plan",
    expense_claim: "Expense Claim",
    leave_request: "Leave Request",
    new_staff_entry: "New Staff Entry",
    staff_movement: "Staff Movement",
    incident_report: "Incident Report",
    missing_episode: "Missing Episode",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        value={filters.home}
        onChange={e => setFilters(f => ({ ...f, home: e.target.value }))}
      >
        <option value="all">All Homes</option>
        {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
      <select
        className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        value={filters.type}
        onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
      >
        <option value="all">All Types</option>
        {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

function WorkflowList({ items }) {
  if (items.length === 0) {
    return (
      <div className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
        <p className="text-sm">You haven't submitted anything yet.</p>
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

export default function SWView({ workflows, homes, myStaffProfile }) {
  const [filters, setFilters] = useState({ home: "all", type: "all" });
  const [showAddBill, setShowAddBill] = useState(false);
  const [billForm, setBillForm] = useState({ home_id: "", amount: "", description: "" });
  const [billSaving, setBillSaving] = useState(false);

  const applyFilters = (list, f) => {
    return list.filter(wf => {
      if (f.home !== "all" && wf.home_id !== f.home) return false;
      if (f.type !== "all" && wf.entity_type !== f.type) return false;
      return true;
    });
  };

  const mine = useMemo(() => applyFilters(
    workflows.filter(w => w.submitted_by === myStaffProfile?.id), filters
  ), [workflows, myStaffProfile, filters]);

  const total = workflows.filter(w => w.submitted_by === myStaffProfile?.id);

  const handleAddBill = async () => {
    if (!billForm.home_id || !billForm.amount) { return; }
    setBillSaving(true);
    try {
      const home = homes.find(h => h.id === billForm.home_id);
      await secureGateway.create("ApprovalWorkflow", {
        org_id: ORG_ID,
        entity_type: "bill",
        entity_reference: `BILL-${Date.now()}`,
        home_id: billForm.home_id,
        home_name: home?.name || "",
        submitted_by: myStaffProfile?.id,
        submitted_by_name: myStaffProfile?.full_name || "",
        submitted_at: new Date().toISOString(),
        amount: parseFloat(billForm.amount),
        description: billForm.description,
        status: "submitted",
        current_step: 1,
      });
      setShowAddBill(false);
      setBillForm({ home_id: "", amount: "", description: "" });
      toast.success("Bill submitted for approval");
    } catch (e) {
      toast.error("Failed to submit bill");
    } finally {
      setBillSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
          <StatCard label="My Submissions" value={total.length} icon={ClipboardCheck} accentColor="border-l-primary" />
          <StatCard label="Approved" value={total.filter(w => w.status === "approved").length} icon={CheckCircle2} accentColor="border-l-green-500" />
          <StatCard label="Rejected" value={total.filter(w => w.status === "rejected").length} icon={XCircle} accentColor="border-l-red-500" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <FilterBar homes={homes} filters={filters} setFilters={setFilters} />
        <Button size="sm" className="gap-1.5 rounded-lg" onClick={() => setShowAddBill(v => !v)}>
          <Plus className="w-3.5 h-3.5" /> Add Bill
        </Button>
      </div>

      {showAddBill && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Submit a Bill</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Home *</label>
              <select className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                value={billForm.home_id} onChange={e => setBillForm(f => ({ ...f, home_id: e.target.value }))}>
                <option value="">Select home…</option>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount (£) *</label>
              <input type="number" className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                placeholder="0.00" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <input type="text" className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                placeholder="e.g. Gas bill April" value={billForm.description} onChange={e => setBillForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddBill} disabled={billSaving || !billForm.home_id || !billForm.amount}>
              {billSaving ? "Submitting…" : "Submit Bill"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddBill(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <WorkflowList items={mine} />
    </div>
  );
}