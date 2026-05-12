import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { fmtGBP } from "@/lib/ukLocalAuthorities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ChevronDown, ChevronUp, Wallet, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function AllowancesTab({ residents, homes, visibleHomes, visibleHomeIds, isSW }) {
  const qc = useQueryClient();
  const [section, setSection] = useState("allowances");
  const [filterHome, setFilterHome] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddAllowance, setShowAddAllowance] = useState(false);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [savingsModal, setSavingsModal] = useState(null);

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));

  const { data: allowances = [] } = useQuery({
    queryKey: ["allowances"],
    queryFn: () => secureGateway.filter("ResidentAllowance"),
  });
  const { data: allowancePayments = [] } = useQuery({
    queryKey: ["allowance-payments"],
    queryFn: () => secureGateway.filter("ResidentAllowancePayment", {}, "-date", 500),
  });
  const { data: savings = [] } = useQuery({
    queryKey: ["savings"],
    queryFn: () => secureGateway.filter("ResidentSavings"),
  });
  const { data: savingsTx = [] } = useQuery({
    queryKey: ["savings-tx"],
    queryFn: () => secureGateway.filter("ResidentSavingsTransaction", {}, "-date", 500),
  });

  const filteredAllowances = useMemo(() => allowances.filter(a => {
    if (!visibleHomeIds.has(a.home_id)) return false;
    if (filterHome !== "all" && a.home_id !== filterHome) return false;
    if (search) {
      const res = residentMap[a.resident_id];
      if (!res?.display_name?.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  }), [allowances, filterHome, search, visibleHomeIds]);

  const filteredSavings = useMemo(() => savings.filter(s => {
    if (!visibleHomeIds.has(s.home_id)) return false;
    if (filterHome !== "all" && s.home_id !== filterHome) return false;
    return true;
  }), [savings, filterHome, visibleHomeIds]);

  return (
    <div className="space-y-5">
      {/* Section toggle */}
      <div className="flex gap-1 border-b border-border">
        {[["allowances","Resident Allowances"],["savings","Resident Savings"]].map(([k,l]) => (
          <button key={k} onClick={() => setSection(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${section === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search resident…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-44" />
        <Select value={filterHome} onValueChange={setFilterHome}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Homes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {visibleHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          {section === "allowances" && !isSW && <Button size="sm" onClick={() => setShowAddAllowance(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Allowance</Button>}
          {section === "savings" && !isSW && <Button size="sm" onClick={() => setShowAddSavings(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Savings Account</Button>}
        </div>
      </div>

      {section === "allowances" && (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="border-b border-border bg-muted/20 text-xs">
              <th className="text-left px-4 py-3">Resident</th>
              <th className="text-left px-4 py-3">Home</th>
              <th className="text-right px-4 py-3">Weekly Amount</th>
              <th className="text-left px-4 py-3">Payment Day</th>
              <th className="text-right px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {filteredAllowances.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No allowances found</td></tr>
              ) : filteredAllowances.map(a => {
                const res = residentMap[a.resident_id];
                const home = homeMap[a.home_id];
                const payments = allowancePayments.filter(p => p.resident_id === a.resident_id);
                const isExpanded = expandedRow === a.id;
                return (
                  <>
                    <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{res?.display_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{home?.name || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtGBP(a.weekly_amount || 0)}</td>
                      <td className="px-4 py-3 text-xs">{a.payment_day || "Friday"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{a.status || "active"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setPaymentModal(a)} className="text-xs text-primary hover:underline">Record Payment</button>
                          <button onClick={() => setExpandedRow(isExpanded ? null : a.id)}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${a.id}-exp`} className="bg-muted/10">
                        <td colSpan={6} className="px-4 py-3">
                          <p className="text-xs font-medium mb-2">Recent Payments</p>
                          {payments.length === 0 ? <p className="text-xs text-muted-foreground">No payments recorded</p> : (
                            <div className="space-y-1">
                              {payments.slice(0, 8).map(p => (
                                <div key={p.id} className="flex justify-between text-xs">
                                  <span>{p.date}</span><span>{p.payment_method || "Cash"}</span><span className="font-medium">{fmtGBP(p.amount || 0)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {section === "savings" && (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="border-b border-border bg-muted/20 text-xs">
              <th className="text-left px-4 py-3">Resident</th>
              <th className="text-left px-4 py-3">Home</th>
              <th className="text-right px-4 py-3">Current Balance</th>
              <th className="text-right px-4 py-3">Total Deposited</th>
              <th className="text-right px-4 py-3">Total Withdrawn</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {filteredSavings.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No savings accounts found</td></tr>
              ) : filteredSavings.map(s => {
                const res = residentMap[s.resident_id];
                const home = homeMap[s.home_id];
                const txs = savingsTx.filter(t => t.resident_savings_id === s.id || t.resident_id === s.resident_id);
                const deposited = txs.filter(t => t.transaction_type === "deposit").reduce((sum, t) => sum + (t.amount || 0), 0);
                const withdrawn = txs.filter(t => t.transaction_type === "withdrawal").reduce((sum, t) => sum + (t.amount || 0), 0);
                const isExpanded = expandedRow === s.id;
                return (
                  <>
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{res?.display_name || "—"}</td>
                      <td className="px-4 py-3 text-xs">{home?.name || "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{fmtGBP(s.current_balance || 0)}</td>
                      <td className="px-4 py-3 text-right text-xs">{fmtGBP(deposited)}</td>
                      <td className="px-4 py-3 text-right text-xs">{fmtGBP(withdrawn)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setSavingsModal({ savings: s, type: "deposit" })} className="text-xs text-green-600 hover:underline">Deposit</button>
                          <button onClick={() => setSavingsModal({ savings: s, type: "withdrawal" })} className="text-xs text-red-600 hover:underline">Withdraw</button>
                          <button onClick={() => setExpandedRow(isExpanded ? null : s.id)}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${s.id}-exp`} className="bg-muted/10">
                        <td colSpan={6} className="px-4 py-3">
                          <p className="text-xs font-medium mb-2">Transaction History</p>
                          {txs.length === 0 ? <p className="text-xs text-muted-foreground">No transactions</p> : (
                            <div className="space-y-1">
                              {txs.slice(0, 10).map(t => (
                                <div key={t.id} className="flex justify-between text-xs">
                                  <span>{t.date}</span><span className="capitalize">{t.transaction_type}</span>
                                  <span className={`font-medium ${t.transaction_type === "deposit" ? "text-green-600" : "text-red-600"}`}>{fmtGBP(t.amount || 0)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <AllowancePaymentModal allowance={paymentModal} residentMap={residentMap} onClose={() => { setPaymentModal(null); qc.invalidateQueries({ queryKey: ["allowance-payments"] }); }} />
      )}

      {/* Savings Transaction Modal */}
      {savingsModal && (
        <SavingsTransactionModal data={savingsModal} onClose={() => { setSavingsModal(null); qc.invalidateQueries({ queryKey: ["savings"] }); qc.invalidateQueries({ queryKey: ["savings-tx"] }); }} />
      )}
    </div>
  );
}

function AllowancePaymentModal({ allowance, residentMap, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], amount: String(allowance.weekly_amount || ""), payment_method: "cash", notes: "" });
  const [saving, setSaving] = useState(false);
  const res = residentMap[allowance.resident_id];
  const handleSave = async () => {
    setSaving(true);
    await secureGateway.create("ResidentAllowancePayment", {
      resident_id: allowance.resident_id, home_id: allowance.home_id,
      allowance_id: allowance.id, date: form.date, amount: parseFloat(form.amount) || 0,
      payment_method: form.payment_method, notes: form.notes,
    });
    qc.invalidateQueries({ queryKey: ["allowance-payments"] });
    toast.success("Payment recorded");
    setSaving(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Record Allowance Payment</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground">{res?.display_name} — {fmtGBP(allowance.weekly_amount)}/week</p>
        <div><label className="text-xs font-medium">Date</label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" /></div>
        <div><label className="text-xs font-medium">Amount (£)</label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" /></div>
        <div>
          <label className="text-xs font-medium">Method</label>
          <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
          </Select>
        </div>
        <div><label className="text-xs font-medium">Notes</label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" /></div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Record Payment"}</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function SavingsTransactionModal({ data: { savings, type }, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], amount: "", description: "", authorised_by: "" });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    const amt = parseFloat(form.amount) || 0;
    setSaving(true);
    await secureGateway.create("ResidentSavingsTransaction", {
      resident_savings_id: savings.id, resident_id: savings.resident_id,
      home_id: savings.home_id, transaction_type: type, date: form.date,
      amount: amt, description: form.description, authorised_by: form.authorised_by,
    });
    const newBal = type === "deposit" ? (savings.current_balance || 0) + amt : (savings.current_balance || 0) - amt;
    await secureGateway.update("ResidentSavings", savings.id, { current_balance: Math.max(0, newBal) });
    qc.invalidateQueries({ queryKey: ["savings"] }); qc.invalidateQueries({ queryKey: ["savings-tx"] });
    toast.success(`${type === "deposit" ? "Deposit" : "Withdrawal"} recorded`);
    setSaving(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold capitalize">{type} — Savings</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Current balance: {fmtGBP(savings.current_balance || 0)}</p>
        <div><label className="text-xs font-medium">Date</label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" /></div>
        <div><label className="text-xs font-medium">Amount (£)</label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" /></div>
        <div><label className="text-xs font-medium">Description</label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
        <div><label className="text-xs font-medium">Authorised By</label><Input value={form.authorised_by} onChange={e => setForm(f => ({ ...f, authorised_by: e.target.value }))} className="mt-1" /></div>
        <div className="flex gap-2">
          <Button className={`flex-1 ${type === "deposit" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : `Record ${type}`}</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}