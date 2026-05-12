import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { fmtGBP } from "@/lib/ukLocalAuthorities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const BUDGET_CATEGORIES = [
  { key: "staff_costs", label: "Staff Costs" },
  { key: "food_household", label: "Food & Household" },
  { key: "activities", label: "Activities & Outings" },
  { key: "transport", label: "Transport" },
  { key: "maintenance", label: "Maintenance & Repairs" },
  { key: "equipment", label: "Equipment" },
  { key: "training", label: "Training" },
  { key: "utilities", label: "Utilities" },
  { key: "insurance", label: "Insurance" },
  { key: "rent", label: "Rent" },
  { key: "other", label: "Other" },
];

function progressColor(pct) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-green-500";
}
function statusBadge(pct) {
  if (pct >= 100) return "bg-red-100 text-red-700";
  if (pct >= 80) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

export default function BudgetsTab({ homes, bills, expenses, visibleHomes, visibleHomeIds, isAdmin, isSW }) {
  const qc = useQueryClient();
  const now = new Date();
  const [selectedHomeId, setSelectedHomeId] = useState(visibleHomes[0]?.id || "");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showEdit, setShowEdit] = useState(false);
  const [editBudgets, setEditBudgets] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: budgets = [] } = useQuery({
    queryKey: ["home-budgets"],
    queryFn: () => secureGateway.filter("HomeBudget"),
  });
  const { data: budgetLines = [] } = useQuery({
    queryKey: ["budget-lines"],
    queryFn: () => secureGateway.filter("HomeBudgetLine"),
  });

  const homeBudget = budgets.find(b => b.home_id === selectedHomeId && b.year === selectedYear);
  const homeLines = budgetLines.filter(l => l.home_budget_id === homeBudget?.id);

  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisYear = String(selectedYear);

  // Calculate actual spend from bills + expenses per category
  const categoryActuals = useMemo(() => {
    const actuals = {};
    BUDGET_CATEGORIES.forEach(c => { actuals[c.key] = { month: 0, ytd: 0 }; });
    bills.filter(b => b.home_id === selectedHomeId).forEach(b => {
      const cat = b.bill_type === "rent" ? "rent" : b.bill_type === "insurance" ? "insurance" : "utilities";
      if (actuals[cat]) {
        if (b.due_date?.startsWith(thisMonth)) actuals[cat].month += b.amount || 0;
        if (b.due_date?.startsWith(thisYear)) actuals[cat].ytd += b.amount || 0;
      }
    });
    expenses.filter(e => e.home_id === selectedHomeId).forEach(e => {
      const cat = e.category === "repairs" ? "maintenance" : e.category === "food" ? "food_household" : e.category === "activities" ? "activities" : e.category === "transport" ? "transport" : e.category === "equipment" ? "equipment" : e.category === "training" ? "training" : "other";
      if (actuals[cat]) {
        if (e.date?.startsWith(thisMonth)) actuals[cat].month += e.amount || 0;
        if (e.date?.startsWith(thisYear)) actuals[cat].ytd += e.amount || 0;
      }
    });
    return actuals;
  }, [selectedHomeId, bills, expenses, thisMonth, thisYear]);

  const totalBudget = homeLines.reduce((s, l) => s + (l.annual_budget || 0), 0);
  const totalSpent = Object.values(categoryActuals).reduce((s, a) => s + a.ytd, 0);
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const chartData = BUDGET_CATEGORIES.map(c => {
    const line = homeLines.find(l => l.category === c.key);
    return {
      name: c.label.split(" ")[0],
      Budget: Math.round(line?.monthly_budget || 0),
      Actual: Math.round(categoryActuals[c.key]?.month || 0),
    };
  }).filter(d => d.Budget > 0 || d.Actual > 0);

  const handleSaveBudget = async () => {
    setSaving(true);
    let budget = homeBudget;
    if (!budget) {
      budget = await secureGateway.create("HomeBudget", { home_id: selectedHomeId, year: selectedYear, period_type: "annual", status: "active" });
    }
    for (const [cat, val] of Object.entries(editBudgets)) {
      const annual = parseFloat(val) || 0;
      const existing = homeLines.find(l => l.category === cat);
      if (existing) {
        await secureGateway.update("HomeBudgetLine", existing.id, { annual_budget: annual, monthly_budget: annual / 12 });
      } else {
        await secureGateway.create("HomeBudgetLine", { home_budget_id: budget.id, home_id: selectedHomeId, category: cat, annual_budget: annual, monthly_budget: annual / 12 });
      }
    }
    qc.invalidateQueries({ queryKey: ["home-budgets"] });
    qc.invalidateQueries({ queryKey: ["budget-lines"] });
    toast.success("Budget saved");
    setSaving(false);
    setShowEdit(false);
  };

  const initEdit = () => {
    const init = {};
    BUDGET_CATEGORIES.forEach(c => {
      const line = homeLines.find(l => l.category === c.key);
      init[c.key] = String(line?.annual_budget || "");
    });
    setEditBudgets(init);
    setShowEdit(true);
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-5">
      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Select home…" /></SelectTrigger>
          <SelectContent>{visibleHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {!isSW && (
          <div className="ml-auto">
            <Button size="sm" onClick={initEdit} className="gap-1"><Plus className="w-3.5 h-3.5" /> {homeBudget ? "Edit Budget" : "Set Budget"}</Button>
          </div>
        )}
      </div>

      {/* Edit Form */}
      {showEdit && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Set Annual Budget for {selectedYear}</h3>
            <button onClick={() => setShowEdit(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {BUDGET_CATEGORIES.map(c => (
              <div key={c.key}>
                <label className="text-xs font-medium">{c.label} (£ annual)</label>
                <Input type="number" value={editBudgets[c.key] || ""} onChange={e => setEditBudgets(b => ({ ...b, [c.key]: e.target.value }))} className="mt-1" />
                {editBudgets[c.key] && <p className="text-xs text-muted-foreground mt-0.5">{fmtGBP(parseFloat(editBudgets[c.key]) / 12)}/month</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveBudget} disabled={saving} className="gap-1"><Save className="w-3.5 h-3.5" />{saving ? "Saving…" : "Save Budget"}</Button>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {selectedHomeId && (
        <>
          {/* Overview */}
          <div className={`rounded-xl border p-5 ${overallPct >= 90 ? "border-red-300 bg-red-50" : overallPct >= 70 ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">Annual Budget Overview — {selectedYear}</p>
                <p className="text-xs text-muted-foreground">{visibleHomes.find(h => h.id === selectedHomeId)?.name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(overallPct)}`}>
                {overallPct >= 100 ? "Over Budget" : overallPct >= 80 ? "Near Limit" : "Under Budget"}
              </span>
            </div>
            <div className="w-full bg-white rounded-full h-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${progressColor(overallPct)}`} style={{ width: `${Math.min(overallPct, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-2 text-muted-foreground">
              <span>Spent YTD: {fmtGBP(totalSpent)}</span>
              <span>{overallPct}%</span>
              <span>Budget: {fmtGBP(totalBudget)}</span>
            </div>
          </div>

          {/* Budget Lines Table */}
          {homeLines.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead><tr className="border-b border-border bg-muted/20 text-xs">
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-right px-4 py-3">Annual Budget</th>
                  <th className="text-right px-4 py-3">Monthly Budget</th>
                  <th className="text-right px-4 py-3">Spent This Month</th>
                  <th className="text-right px-4 py-3">Spent YTD</th>
                  <th className="text-right px-4 py-3">Remaining</th>
                  <th className="text-left px-4 py-3 w-32">% Used</th>
                </tr></thead>
                <tbody>
                  {homeLines.map(line => {
                    const cat = BUDGET_CATEGORIES.find(c => c.key === line.category);
                    const actuals = categoryActuals[line.category] || { month: 0, ytd: 0 };
                    const pct = line.annual_budget > 0 ? Math.round((actuals.ytd / line.annual_budget) * 100) : 0;
                    const remaining = (line.annual_budget || 0) - actuals.ytd;
                    return (
                      <tr key={line.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{cat?.label || line.category}</td>
                        <td className="px-4 py-3 text-right">{fmtGBP(line.annual_budget || 0)}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{fmtGBP(line.monthly_budget || 0)}</td>
                        <td className="px-4 py-3 text-right text-xs">{fmtGBP(actuals.month)}</td>
                        <td className="px-4 py-3 text-right text-xs">{fmtGBP(actuals.ytd)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-medium ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>{fmtGBP(remaining)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                              <div className={`h-full rounded-full ${progressColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className={`text-xs shrink-0 ${pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-green-600"}`}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold mb-4">Budget vs Actual (This Month)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => fmtGBP(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {homeLines.length === 0 && !showEdit && (
            <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground">
              No budget set for this home and year.
              {!isSW && <div className="mt-3"><Button size="sm" onClick={initEdit}>Set Budget Now</Button></div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}