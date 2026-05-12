import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell } from "recharts";

const BILL_TYPE_LABELS = {
  utilities: "Utilities", council_tax: "Council Tax", insurance: "Insurance",
  cleaning: "Cleaning", maintenance: "Maintenance", rent: "Rent", other: "Other",
};
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

export default function HouseCharts({ bills, properties, overdueAmount }) {
  // Monthly spend by bill type
  const monthStr = new Date().toISOString().slice(0, 7);
  const byType = {};
  bills.filter(b => b.due_date?.startsWith(monthStr)).forEach(b => {
    byType[b.bill_type] = (byType[b.bill_type] || 0) + (b.amount || 0);
  });
  const barData = Object.entries(byType).map(([type, amount]) => ({
    name: BILL_TYPE_LABELS[type] || type,
    amount,
  }));

  // Overdue by property
  const byProp = {};
  bills.filter(b => b.status === "overdue" || (b.status === "pending" && b.due_date < new Date().toISOString().split("T")[0])).forEach(b => {
    const name = (b.home_name && b.home_name.trim()) ? b.home_name : b.home_id ? `Home ${b.home_id.substring(0, 8)}` : "Unassigned";
    byProp[name] = (byProp[name] || 0) + (b.amount || 0);
  });
  const pieData = Object.entries(byProp).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const total = pieData.reduce((s, d) => s + d.value, 0);

  if (barData.length === 0 && pieData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
      {barData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 md:p-5">
          <h3 className="font-semibold text-sm md:text-base mb-4">Monthly Spend by Bill Type</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
              <Tooltip formatter={v => [`£${v.toLocaleString()}`, "Amount"]} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {pieData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 md:p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="font-semibold text-sm md:text-base">Overdue by Property</h3>
            <span className="text-xs md:text-sm font-bold text-red-500 shrink-0">£{total.toLocaleString()}</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pieData} margin={{ top: 5, right: 30, left: 5, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `£${v.toLocaleString()}`} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}