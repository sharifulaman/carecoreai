import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { fmtGBP } from "@/lib/ukLocalAuthorities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const BILL_TYPES = ["rent","mortgage","gas","electricity","water","council_tax","internet","phone","insurance","cleaning_contract","maintenance_contract","other"];
const EXPENSE_CATS = ["staff_mileage","equipment","repairs","cleaning_supplies","food","activities","training","medical","transport","other"];

function dueStatus(dueDate) {
  if (!dueDate) return null;
  const today = new Date().toISOString().split("T")[0];
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  if (dueDate < today) return { label: "Overdue", cls: "bg-red-100 text-red-700" };
  if (dueDate <= in7) return { label: "Due Soon", cls: "bg-amber-100 text-amber-700" };
  return { label: "Current", cls: "bg-green-100 text-green-700" };
}

export default function BillsExpensesTab({ homes, bills: propBills, expenses: propExpenses, visibleHomes, visibleHomeIds, isAdmin, isSW }) {
  const qc = useQueryClient();
  const [section, setSection] = useState("bills");
  const [filterHome, setFilterHome] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [billForm, setBillForm] = useState({ home_id: "", bill_type: "utilities", supplier: "", amount: "", due_date: "", status: "pending", is_direct_debit: false, notes: "" });
  const [expForm, setExpForm] = useState({ home_id: "", date: new Date().toISOString().split("T")[0], category: "equipment", description: "", amount: "", miles: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const { data: bills = propBills } = useQuery({ queryKey: ["bills"], queryFn: () => secureGateway.filter("Bill"), initialData: propBills });
  const { data: expenses = propExpenses } = useQuery({ queryKey: ["home-expenses"], queryFn: () => secureGateway.filter("HomeExpense"), initialData: propExpenses });

  const visibleBills = useMemo(() => bills.filter(b => {
    if (!visibleHomeIds.has(b.home_id)) return false;
    if (filterHome !== "all" && b.home_id !== filterHome) return false;
    if (filterStatus !== "all") {
      const s = dueStatus(b.due_date);
      if (filterStatus === "overdue" && s?.label !== "Overdue") return false;
      if (filterStatus === "current" && s?.label !== "Current") return false;
    }
    return true;
  }), [bills, filterHome, filterStatus, visibleHomeIds]);

  const visibleExpenses = useMemo(() => expenses.filter(e => {
    if (!visibleHomeIds.has(e.home_id)) return false;
    if (filterHome !== "all" && e.home_id !== filterHome) return false;
    return true;
  }), [expenses, filterHome, visibleHomeIds]);

  const totalBillsMonth = visibleBills.filter(b => b.due_date?.startsWith(thisMonth)).reduce((s, b) => s + (b.amount || 0), 0);
  const totalExpMonth = visibleExpenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);

  const handleAddBill = async () => {
    if (!billForm.home_id || !billForm.amount) { toast.error("Fill required fields"); return; }
    setSaving(true);
    await secureGateway.create("Bill", { ...billForm, amount: parseFloat(billForm.amount) });
    qc.invalidateQueries({ queryKey: ["bills"] });
    toast.success("Bill added");
    setSaving(false);
    setShowAddBill(false);
    setBillForm({ home_id: "", bill_type: "utilities", supplier: "", amount: "", due_date: "", status: "pending", is_direct_debit: false, notes: "" });
  };

  const handleAddExpense = async () => {
    if (!expForm.home_id || !expForm.amount) { toast.error("Fill required fields"); return; }
    setSaving(true);
    const amt = expForm.category === "staff_mileage" && expForm.miles
      ? parseFloat(expForm.miles) * 0.45
      : parseFloat(expForm.amount) || 0;
    await secureGateway.create("HomeExpense", { ...expForm, amount: amt });
    qc.invalidateQueries({ queryKey: ["home-expenses"] });
    toast.success("Expense logged");
    setSaving(false);
    setShowAddExpense(false);
    setExpForm({ home_id: "", date: new Date().toISOString().split("T")[0], category: "equipment", description: "", amount: "", miles: "", notes: "" });
  };

  const markBillPaid = async (bill) => {
    await secureGateway.update("Bill", bill.id, { status: "paid", paid_date: new Date().toISOString().split("T")[0] });
    qc.invalidateQueries({ queryKey: ["bills"] });
    // Update HomeBudgetLine actual_amount if budget_id is set
    if (bill.budget_id) {
      base44.functions.invoke("updateBudgetActuals", {
        entity: "Bill",
        record_id: bill.id,
        delta: bill.amount || 0,
      }).catch(() => {});
    }
    toast.success("Bill marked as paid");
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-border">
        {[["bills","Bills (Recurring)"],["expenses","Expenses (One-off)"]].map(([k,l]) => (
          <button key={k} onClick={() => setSection(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${section === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterHome} onValueChange={setFilterHome}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Homes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {visibleHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {section === "bills" && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto">
          {section === "bills" && !isSW && <Button size="sm" onClick={() => setShowAddBill(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Bill</Button>}
          {section === "expenses" && <Button size="sm" onClick={() => setShowAddExpense(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Expense</Button>}
        </div>
      </div>

      {section === "bills" && (
        <>
          {showAddBill && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">Add Bill</h3><button onClick={() => setShowAddBill(false)}><X className="w-4 h-4 text-muted-foreground" /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Home *</label>
                  <Select value={billForm.home_id} onValueChange={v => setBillForm(f => ({ ...f, home_id: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select home" /></SelectTrigger>
                    <SelectContent>{visibleHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Bill Type</label>
                  <Select value={billForm.bill_type} onValueChange={v => setBillForm(f => ({ ...f, bill_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{BILL_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium">Supplier</label><Input value={billForm.supplier} onChange={e => setBillForm(f => ({ ...f, supplier: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium">Amount (£) *</label><Input type="number" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium">Due Date</label><Input type="date" value={billForm.due_date} onChange={e => setBillForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1" /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddBill} disabled={saving} size="sm">{saving ? "Saving…" : "Add Bill"}</Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddBill(false)}>Cancel</Button>
              </div>
            </div>
          )}
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr className="border-b border-border bg-muted/20 text-xs">
                <th className="text-left px-4 py-3">Home</th>
                <th className="text-left px-4 py-3">Bill Type</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Due Date</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>
                {visibleBills.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No bills found</td></tr>
                  : visibleBills.map(b => {
                    const st = dueStatus(b.due_date);
                    return (
                      <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 text-xs">{homeMap[b.home_id]?.name || "—"}</td>
                        <td className="px-4 py-3 text-xs capitalize">{b.bill_type?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-xs">{b.supplier || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmtGBP(b.amount || 0)}</td>
                        <td className="px-4 py-3 text-xs">{b.due_date || "—"}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${st?.cls || "bg-slate-100 text-slate-600"}`}>{b.status === "paid" ? "Paid" : st?.label || b.status}</span></td>
                        <td className="px-4 py-3">
                          {b.status !== "paid" && (
                            <button onClick={() => markBillPaid(b)} className="flex items-center gap-1 text-xs text-green-600 hover:underline"><CheckCircle className="w-3.5 h-3.5" /> Mark Paid</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === "expenses" && (
        <>
          {showAddExpense && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">Log Expense</h3><button onClick={() => setShowAddExpense(false)}><X className="w-4 h-4 text-muted-foreground" /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Home *</label>
                  <Select value={expForm.home_id} onValueChange={v => setExpForm(f => ({ ...f, home_id: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select home" /></SelectTrigger>
                    <SelectContent>{visibleHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium">Date</label><Input type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} className="mt-1" /></div>
                <div>
                  <label className="text-xs font-medium">Category</label>
                  <Select value={expForm.category} onValueChange={v => setExpForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium">Description</label><Input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
                {expForm.category === "staff_mileage" ? (
                  <div>
                    <label className="text-xs font-medium">Miles</label>
                    <Input type="number" value={expForm.miles} onChange={e => setExpForm(f => ({ ...f, miles: e.target.value, amount: String((parseFloat(e.target.value) || 0) * 0.45) }))} className="mt-1" />
                    {expForm.miles && <p className="text-xs text-muted-foreground mt-1">{expForm.miles} miles × £0.45 = {fmtGBP(parseFloat(expForm.miles) * 0.45)}</p>}
                  </div>
                ) : (
                  <div><label className="text-xs font-medium">Amount (£) *</label><Input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" /></div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddExpense} disabled={saving} size="sm">{saving ? "Saving…" : "Log Expense"}</Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddExpense(false)}>Cancel</Button>
              </div>
            </div>
          )}
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr className="border-b border-border bg-muted/20 text-xs">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Home</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-right px-4 py-3">Amount</th>
              </tr></thead>
              <tbody>
                {visibleExpenses.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No expenses found</td></tr>
                  : visibleExpenses.map(e => (
                    <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs">{e.date || "—"}</td>
                      <td className="px-4 py-3 text-xs">{homeMap[e.home_id]?.name || "—"}</td>
                      <td className="px-4 py-3 text-xs capitalize">{e.category?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-xs">{e.description || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtGBP(e.amount || 0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Combined totals */}
      <div className="bg-muted/30 rounded-xl p-4 flex flex-wrap gap-6 text-sm">
        <span>Bills This Month: <strong>{fmtGBP(totalBillsMonth)}</strong></span>
        <span>Expenses This Month: <strong>{fmtGBP(totalExpMonth)}</strong></span>
        <span className="font-semibold">Combined Spend: <strong>{fmtGBP(totalBillsMonth + totalExpMonth)}</strong></span>
      </div>
    </div>
  );
}