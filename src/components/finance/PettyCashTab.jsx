import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["groceries","activities","transport","clothing","toiletries","cleaning","maintenance","resident_personal","other"];
const CAT_LABELS = { groceries:"Groceries", activities:"Activities", transport:"Transport", clothing:"Clothing", toiletries:"Toiletries", cleaning:"Cleaning", maintenance:"Maintenance", resident_personal:"Resident Personal", other:"Other" };

export default function PettyCashTab({ homeId, staff = [] }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(null); // 'in' | 'out' | 'setup'
  const [form, setForm] = useState({ amount: "", category: "groceries", description: "", date: new Date().toISOString().split("T")[0], resident_id: "", receipt_reference: "", approved_by: "", notes: "" });
  const [setupForm, setSetupForm] = useState({ opening_balance: "", float_threshold: "50" });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const { data: ledgers = [] } = useQuery({
    queryKey: ["petty-cash", homeId],
    queryFn: () => base44.entities.PettyCash.filter({ org_id: ORG_ID, home_id: homeId, status: "active" }),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["petty-cash-tx", homeId],
    queryFn: () => base44.entities.PettyCashTransaction.filter({ org_id: ORG_ID, home_id: homeId }, "-date", 200),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-home", homeId],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, home_id: homeId, status: "active" }),
  });

  const ledger = ledgers[0];
  const balance = ledger?.current_balance || 0;
  const threshold = ledger?.float_threshold || 50;
  const belowFloat = balance < threshold;

  const seniorStaff = staff.filter(s => s.role === "admin" || s.role === "team_leader");
  const amount = parseFloat(form.amount) || 0;
  const newBalance = mode === "in" ? balance + amount : balance - amount;

  const handleSetup = async () => {
    setSaving(true);
    const ob = parseFloat(setupForm.opening_balance) || 0;
    await base44.entities.PettyCash.create({
      org_id: ORG_ID,
      home_id: homeId,
      opening_balance: ob,
      current_balance: ob,
      float_threshold: parseFloat(setupForm.float_threshold) || 50,
      status: "active",
      created_by: "system",
    });
    queryClient.invalidateQueries({ queryKey: ["petty-cash", homeId] });
    setMode(null);
    toast.success("Petty cash set up");
    setSaving(false);
  };

  const handleTransaction = async () => {
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (mode === "out" && amount > balance) { toast.error("Cash out cannot exceed current balance"); return; }
    if (!form.description) { toast.error("Description is required"); return; }
    if (mode === "out" && amount > 10 && !form.receipt_reference) {
      toast.error("Receipt reference required for amounts over £10"); return;
    }
    if (mode === "out" && amount > 50 && !form.approved_by) {
      toast.error("Approval required for amounts over £50"); return;
    }
    setSaving(true);
    const nb = mode === "in" ? balance + amount : balance - amount;
    await base44.entities.PettyCashTransaction.create({
      org_id: ORG_ID,
      petty_cash_id: ledger.id,
      home_id: homeId,
      transaction_type: mode === "in" ? "cash_in" : "cash_out",
      amount,
      category: form.category,
      description: form.description,
      resident_id: form.resident_id || null,
      receipt_reference: form.receipt_reference,
      date: form.date,
      recorded_by: "system",
      approved_by: form.approved_by || null,
      approval_required: amount > 50,
      balance_after: nb,
      notes: form.notes,
    });
    await base44.entities.PettyCash.update(ledger.id, { current_balance: nb });
    queryClient.invalidateQueries({ queryKey: ["petty-cash", homeId] });
    queryClient.invalidateQueries({ queryKey: ["petty-cash-tx", homeId] });
    setMode(null);
    setForm({ amount: "", category: "groceries", description: "", date: new Date().toISOString().split("T")[0], resident_id: "", receipt_reference: "", approved_by: "", notes: "" });
    toast.success(`Cash ${mode === "in" ? "in" : "out"} recorded. New balance: £${nb.toFixed(2)}`);
    if (nb < threshold) toast.warning("Balance is below float threshold!");
    setSaving(false);
  };

  const filteredTx = filterType === "all" ? transactions : transactions.filter(t => t.transaction_type === filterType);

  if (!ledger) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-3">No petty cash ledger set up for this home</p>
          <Button onClick={() => setMode("setup")}>Set Up Petty Cash</Button>
        </div>
        {mode === "setup" && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h3 className="font-semibold text-sm">Set Up Petty Cash</h3>
            <div>
              <label className="text-xs text-muted-foreground">Opening Balance (£)</label>
              <Input className="mt-1" type="number" step="0.01" inputMode="decimal" value={setupForm.opening_balance} onChange={e => setSetupForm(f => ({ ...f, opening_balance: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Float Threshold (£)</label>
              <Input className="mt-1" type="number" step="0.01" inputMode="decimal" value={setupForm.float_threshold} onChange={e => setSetupForm(f => ({ ...f, float_threshold: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSetup} disabled={saving}>{saving ? "Saving…" : "Create Ledger"}</Button>
              <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Balance display */}
      <div className={`rounded-xl border p-5 ${belowFloat ? "border-red-500/50 bg-red-500/5" : "border-border bg-card"}`}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className={`text-4xl font-bold mt-1 ${belowFloat ? "text-red-600" : "text-foreground"}`}>
              £{balance.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Float threshold: £{threshold.toFixed(2)}</p>
          </div>
          {belowFloat && (
            <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" /> Below float threshold
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => setMode("in")}>
            <TrendingUp className="w-4 h-4" /> Cash In
          </Button>
          <Button variant="outline" className="gap-2 text-red-600 border-red-500/30 hover:bg-red-500/5" onClick={() => setMode("out")}>
            <TrendingDown className="w-4 h-4" /> Cash Out
          </Button>
        </div>
      </div>

      {/* Transaction form */}
      {mode && mode !== "setup" && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-sm">{mode === "in" ? "Cash In" : "Cash Out"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Amount (£) *</label>
              <Input className="mt-1" type="number" step="0.01" inputMode="decimal" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date *</label>
              <Input className="mt-1" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          {mode === "out" && (
            <div>
              <label className="text-xs text-muted-foreground">Category *</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CAT_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Description *</label>
            <Input className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          {mode === "out" && (
            <div>
              <label className="text-xs text-muted-foreground">Related Resident</label>
              <Select value={form.resident_id} onValueChange={v => setForm(f => ({ ...f, resident_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Not resident-specific" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Not resident-specific</SelectItem>
                  {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">
              Receipt Reference {mode === "out" && amount > 10 ? "(required for £10+)" : "(optional)"}
            </label>
            <Input className="mt-1" value={form.receipt_reference} onChange={e => setForm(f => ({ ...f, receipt_reference: e.target.value }))} />
          </div>
          {mode === "out" && amount > 50 && (
            <div>
              <label className="text-xs text-muted-foreground">Approved By * (required for £50+)</label>
              <Select value={form.approved_by} onValueChange={v => setForm(f => ({ ...f, approved_by: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select approver…" /></SelectTrigger>
                <SelectContent>{seniorStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.role})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {amount > 0 && (
            <p className="text-xs text-muted-foreground">
              New balance: <span className={`font-medium ${newBalance < threshold ? "text-red-600" : "text-green-600"}`}>£{newBalance.toFixed(2)}</span>
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleTransaction} disabled={saving}>{saving ? "Saving…" : `Record Cash ${mode === "in" ? "In" : "Out"}`}</Button>
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Transaction History</h3>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="cash_in">Cash In</SelectItem>
              <SelectItem value="cash_out">Cash Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Category</th>
                <th className="text-left py-2 px-2">Description</th>
                <th className="text-right py-2 px-2">Amount</th>
                <th className="text-right py-2 px-2">Balance After</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No transactions</td></tr>
              ) : filteredTx.map(tx => (
                <tr key={tx.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 px-2">{tx.date}</td>
                  <td className="py-2 px-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${tx.transaction_type === "cash_in" ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"}`}>
                      {tx.transaction_type === "cash_in" ? "In" : "Out"}
                    </span>
                  </td>
                  <td className="py-2 px-2">{CAT_LABELS[tx.category] || tx.category}</td>
                  <td className="py-2 px-2 max-w-xs truncate">{tx.description}</td>
                  <td className={`py-2 px-2 text-right font-medium ${tx.transaction_type === "cash_in" ? "text-green-600" : "text-red-600"}`}>
                    {tx.transaction_type === "cash_in" ? "+" : "-"}£{(tx.amount||0).toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right">£{(tx.balance_after||0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}