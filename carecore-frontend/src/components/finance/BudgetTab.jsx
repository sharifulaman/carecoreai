import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = [
  "rent","utilities","council_tax","insurance","maintenance","food",
  "activities","staffing","transport","training","contingency","other"
];
const CAT_LABELS = {
  rent:"Rent", utilities:"Utilities", council_tax:"Council Tax", insurance:"Insurance",
  maintenance:"Maintenance", food:"Food", activities:"Activities", staffing:"Staffing",
  transport:"Transport", training:"Training", contingency:"Contingency", other:"Other"
};

export default function BudgetTab({ homeId, isAdmin }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    period_type: "monthly",
    period_start: new Date().toISOString().split("T")[0],
    period_end: "",
    lines: Object.fromEntries(CATEGORIES.map(c => [c, { amount: "", notes: "" }])),
  });
  const [saving, setSaving] = useState(false);

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets-home", homeId],
    queryFn: () => base44.entities.HomeBudget.filter({ org_id: ORG_ID, home_id: homeId }, "-period_start", 10),
  });

  const { data: budgetLines = [] } = useQuery({
    queryKey: ["budget-lines-home", homeId],
    queryFn: () => base44.entities.HomeBudgetLine.filter({ org_id: ORG_ID, home_id: homeId }),
  });

  const activeBudget = budgets.find(b => b.status === "active");

  const autoEndDate = (startDate, periodType) => {
    if (!startDate) return "";
    const d = new Date(startDate);
    if (periodType === "monthly") { d.setMonth(d.getMonth() + 1); d.setDate(d.getDate() - 1); }
    else if (periodType === "quarterly") { d.setMonth(d.getMonth() + 3); d.setDate(d.getDate() - 1); }
    else if (periodType === "annual") { d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1); }
    return d.toISOString().split("T")[0];
  };

  const total = CATEGORIES.reduce((s, c) => s + (parseFloat(form.lines[c]?.amount) || 0), 0);

  const saveBudget = async () => {
    const nonZero = CATEGORIES.filter(c => parseFloat(form.lines[c]?.amount) > 0);
    if (nonZero.length === 0) { toast.error("Enter at least one budget line"); return; }
    setSaving(true);

    // Archive existing active budget if overlap
    if (activeBudget) {
      const confirm = window.confirm("An active budget exists for this home. Replace it?");
      if (!confirm) { setSaving(false); return; }
      await base44.entities.HomeBudget.update(activeBudget.id, { status: "closed" });
    }

    const budget = await base44.entities.HomeBudget.create({
      org_id: ORG_ID,
      home_id: homeId,
      period_type: form.period_type,
      period_start: form.period_start,
      period_end: form.period_end || autoEndDate(form.period_start, form.period_type),
      status: "active",
      created_by: "system",
    });

    for (const cat of nonZero) {
      await base44.entities.HomeBudgetLine.create({
        org_id: ORG_ID,
        budget_id: budget.id,
        home_id: homeId,
        category: cat,
        budgeted_amount: parseFloat(form.lines[cat].amount),
        notes: form.lines[cat].notes || "",
      });
    }

    queryClient.invalidateQueries({ queryKey: ["budgets-home", homeId] });
    queryClient.invalidateQueries({ queryKey: ["budget-lines-home", homeId] });
    toast.success("Budget saved");
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {isAdmin && !showForm && (
        <Button onClick={() => setShowForm(true)}>Set Budget</Button>
      )}

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm">Set Budget</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Period Type</label>
              <Select value={form.period_type} onValueChange={v => setForm(f => ({ ...f, period_type: v, period_end: autoEndDate(f.period_start, v) }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Period Start</label>
              <Input className="mt-1" type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value, period_end: autoEndDate(e.target.value, f.period_type) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Period End</label>
              <Input className="mt-1" type="date" value={form.period_end || autoEndDate(form.period_start, form.period_type)} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-medium">Category</th>
                  <th className="text-left px-4 py-2 text-xs font-medium">Amount (£)</th>
                  <th className="text-left px-4 py-2 text-xs font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(cat => (
                  <tr key={cat} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 text-sm">{CAT_LABELS[cat]}</td>
                    <td className="px-4 py-2">
                      <Input
                        className="h-7 text-xs w-28"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.lines[cat]?.amount}
                        onChange={e => setForm(f => ({ ...f, lines: { ...f.lines, [cat]: { ...f.lines[cat], amount: e.target.value } } }))}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        className="h-7 text-xs"
                        placeholder="Optional note"
                        value={form.lines[cat]?.notes}
                        onChange={e => setForm(f => ({ ...f, lines: { ...f.lines, [cat]: { ...f.lines[cat], notes: e.target.value } } }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20 border-t border-border">
                  <td className="px-4 py-2 font-semibold text-sm">Total</td>
                  <td className="px-4 py-2 font-semibold text-sm">£{total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveBudget} disabled={saving}>{saving ? "Saving…" : "Save Budget"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Active budget display */}
      {activeBudget && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Active Budget</h3>
            <span className="text-xs text-muted-foreground">{activeBudget.period_start} → {activeBudget.period_end}</span>
          </div>
          <div className="space-y-2">
            {budgetLines.filter(l => l.budget_id === activeBudget.id).map(line => (
              <div key={line.id} className="flex justify-between text-sm">
                <span>{CAT_LABELS[line.category]}</span>
                <span className="font-medium">£{(line.budgeted_amount||0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>£{budgetLines.filter(l => l.budget_id === activeBudget.id).reduce((s, l) => s + (l.budgeted_amount||0), 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {!activeBudget && !showForm && (
        <div className="bg-muted/20 rounded-xl p-8 text-center text-muted-foreground text-sm">No active budget set</div>
      )}
    </div>
  );
}