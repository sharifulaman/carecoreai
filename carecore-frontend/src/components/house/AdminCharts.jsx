import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { ChevronDown } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#14b8a6"];

const BILL_TYPE_LABELS = {
  utilities: "Utilities", council_tax: "Council Tax", insurance: "Insurance",
  cleaning: "Cleaning", maintenance: "Maintenance", rent: "Rent",
  staff_training: "Staff Training", admin: "Admin", food: "Food Supplies", other: "Other",
};

const PERIOD_OPTIONS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 3 Months", value: "last_3_months" },
  { label: "This Year", value: "this_year" },
];

function getPeriodFilter(period) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  if (period === "this_month") return (b) => b.due_date?.startsWith(`${yyyy}-${mm}`);
  if (period === "last_month") {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return (b) => b.due_date?.startsWith(s);
  }
  if (period === "last_3_months") {
    const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3);
    return (b) => b.due_date >= cutoff.toISOString().slice(0, 10);
  }
  if (period === "this_year") return (b) => b.due_date?.startsWith(`${yyyy}`);
  return () => true;
}

export default function AdminCharts({ bills }) {
  const [period, setPeriod] = useState("this_month");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const filterFn = getPeriodFilter(period);

  const byType = {};
  bills.filter(filterFn).forEach(b => {
    const key = b.bill_type || "other";
    byType[key] = (byType[key] || 0) + Number(b.amount || 0);
  });
  const barData = Object.entries(byType).map(([type, amount]) => ({
    name: BILL_TYPE_LABELS[type] || type,
    amount,
  })).sort((a, b) => b.amount - a.amount);

  const byProp = {};
  bills.filter(b => b.status === "overdue" || (b.status === "pending" && b.due_date < today)).forEach(b => {
    const name = (b.home_name?.trim()) || "Unassigned";
    byProp[name] = (byProp[name] || 0) + Number(b.amount || 0);
  });
  const overdueData = Object.entries(byProp).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  const totalOverdue = overdueData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Monthly Spend by Bill Type */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-slate-800">Monthly Spend by Bill Type</h3>
          <div className="relative">
            <button
              onClick={() => setShowPeriodMenu(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
            >
              {PERIOD_OPTIONS.find(p => p.value === period)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showPeriodMenu && (
              <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setPeriod(opt.value); setShowPeriodMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${period === opt.value ? "text-blue-600 font-semibold" : "text-slate-700"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {barData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
              <Tooltip formatter={v => [`£${v.toLocaleString()}`, "Amount"]} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Overdue by Property */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-slate-800">Overdue by Property</h3>
          {totalOverdue > 0 && (
            <span className="text-sm font-bold text-red-500">£{totalOverdue.toLocaleString()}</span>
          )}
        </div>
        {overdueData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No overdue bills</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={overdueData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
              <Tooltip formatter={v => [`£${v.toLocaleString()}`, "Overdue"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {overdueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}