import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";

const HOUSE_PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444",
  "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#6366F1",
];

function getHouseColor(index) { return HOUSE_PALETTE[index % HOUSE_PALETTE.length]; }
function getHouseColorLight(index) {
  const hex = HOUSE_PALETTE[index % HOUSE_PALETTE.length].replace("#", "");
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  return `rgba(${r},${g},${b},0.2)`;
}

const PT_LABELS = {
  "18_plus": "18+", "18plus_accommodation": "18+",
  "24_hours": "24 hrs", "24hours_housing": "24 hrs",
  "care": "Care", "care_services": "Care",
  "outreach": "Outreach",
};

const PT_COLORS = {
  "18_plus": "#3B82F6", "18plus_accommodation": "#3B82F6",
  "24_hours": "#8B5CF6", "24hours_housing": "#8B5CF6",
  "care": "#10B981", "care_services": "#10B981",
  "outreach": "#F59E0B",
};

function fmtGBP(v) {
  return `£${(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthStr(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

function getMonthLabel(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export default function FinancialSection({ homes, placements, invoices, bills, pettyCashTx }) {
  const navigate = useNavigate();
  const lastMonth = getMonthStr(-1);

  // Chart 1A — Top 5 Revenue (last month)
  const revenueData = useMemo(() => {
    return homes
      .map(home => {
        const received = invoices
          .filter(inv => inv.home_id === home.id && inv.status === "paid" && (inv.period_from || "").startsWith(lastMonth))
          .reduce((s, inv) => s + (inv.total_amount || 0), 0);
        const expected = placements
          .filter(p => p.home_id === home.id && p.status === "active")
          .reduce((s, p) => s + (p.monthly_equivalent || 0), 0);
        return { id: home.id, name: home.name, type: home.type, received, expected };
      })
      .filter(h => h.received > 0 || h.expected > 0)
      .sort((a, b) => b.received - a.received)
      .slice(0, 5)
      .map(h => ({
        ...h,
        label: `${h.name.split(" ")[0]} — ${PT_LABELS[h.type] || h.type || ""}`,
      }));
  }, [homes, invoices, placements, lastMonth]);

  // Chart 1B — Top 5 Underperforming (homes where received income < expenses = negative net)
  const netData = useMemo(() => {
    const mapped = homes
      .map(home => {
        const received = invoices
          .filter(inv => inv.home_id === home.id && inv.status === "paid" && (inv.period_from || "").startsWith(lastMonth))
          .reduce((s, inv) => s + (inv.total_amount || 0), 0);
        const billExpenses = bills
          .filter(b => b.home_id === home.id && (b.due_date || "").startsWith(lastMonth))
          .reduce((s, b) => s + (b.amount || 0), 0);
        const pettyOut = pettyCashTx
          .filter(tx => tx.home_id === home.id && tx.transaction_type === "cash_out" && (tx.date || "").startsWith(lastMonth))
          .reduce((s, tx) => s + (tx.amount || 0), 0);
        const totalExpenses = billExpenses + pettyOut;
        const net = received - totalExpenses;
        return { id: home.id, name: home.name, type: home.type, net, received, totalExpenses };
      })
      .filter(h => h.net < 0) // only homes genuinely losing money
      .sort((a, b) => a.net - b.net)
      .slice(0, 5)
      .map(h => ({
        ...h,
        label: `${h.name.split(" ")[0]} — ${PT_LABELS[h.type] || ""}`,
        deficit: Math.abs(h.net), // display as positive bar showing size of loss
      }));
    return mapped;
  }, [homes, invoices, placements, bills, pettyCashTx, lastMonth]);

  // Chart 1C — 6 months line chart
  const sixMonthData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const offset = -(5 - i);
      const monthStr = getMonthStr(offset);
      const label = getMonthLabel(offset);
      const income = invoices
        .filter(inv => inv.status === "paid" && (inv.period_from || "").startsWith(monthStr))
        .reduce((s, inv) => s + (inv.total_amount || 0), 0);
      const expenses = bills
        .filter(b => (b.due_date || "").startsWith(monthStr))
        .reduce((s, b) => s + (b.amount || 0), 0) +
        pettyCashTx
          .filter(tx => tx.transaction_type === "cash_out" && (tx.date || "").startsWith(monthStr))
          .reduce((s, tx) => s + (tx.amount || 0), 0);
      return { label, income, expenses, net: income - expenses };
    });
  }, [invoices, bills, pettyCashTx]);

  const bestMonth = [...sixMonthData].sort((a, b) => b.net - a.net)[0];
  const lastTwo = sixMonthData.slice(-2);
  const trend = lastTwo.length === 2 ? (lastTwo[1].net >= lastTwo[0].net ? "↑" : "↓") : "—";

  const CustomHorizTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-popover border border-border rounded-lg shadow p-2 text-xs">
        <p className="font-semibold mb-1">{d?.label || d?.name}</p>
        {payload.map(p => (
          <div key={p.name}>{p.name}: <span className="font-medium">{fmtGBP(p.value)}</span></div>
        ))}
      </div>
    );
  };

  const LineTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow p-2 text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-medium">{fmtGBP(p.value)}</span></div>
        ))}
      </div>
    );
  };

  return (
    <section className="bg-card border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Financial Performance</p>

      {/* Line chart — income vs expenses */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Monthly Income vs Expenses</p>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={sixMonthData} margin={{ top: 2, right: 8, bottom: 2, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 8 }} />
            <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 8 }} />
            <Tooltip content={<LineTooltip />} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} name="Income" />
            <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} dot={{ r: 2 }} name="Expenses" />
            <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} name="Net" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
        {/* Revenue bars */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Top Revenue Homes</p>
          {revenueData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No invoices.</p>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={revenueData.slice(0,5)} layout="vertical" margin={{ left: 0, right: 6, top: 2, bottom: 2 }}>
                <XAxis type="number" tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 7 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 7 }} width={60} tickFormatter={v => v.split(" ")[0]} />
                <Tooltip content={<CustomHorizTooltip />} />
                <Bar dataKey="received" radius={[0, 3, 3, 0]} name="Received" onClick={d => navigate(`/finance/home/${d.id}`)}>
                  {revenueData.map((_, i) => <Cell key={i} fill={getHouseColor(i)} style={{ cursor: "pointer" }} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deficit bars */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Underperforming Homes</p>
          {netData.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs text-green-600 font-medium">✓ All profitable</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={netData.slice(0,5)} layout="vertical" margin={{ left: 0, right: 6, top: 2, bottom: 2 }}>
                <XAxis type="number" tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 7 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 7 }} width={60} tickFormatter={v => v.split(" ")[0]} />
                <Tooltip content={<CustomHorizTooltip />} />
                <Bar dataKey="deficit" radius={[0, 3, 3, 0]} name="Deficit" onClick={d => navigate(`/finance/home/${d.id}`)}>
                  {netData.map((_, i) => <Cell key={i} fill="#EF4444" style={{ cursor: "pointer" }} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {bestMonth && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
          <span>Best month: <span className="font-medium text-foreground">{bestMonth.label}</span> ({fmtGBP(bestMonth.net)})</span>
          <span>Trend: <span className={`font-bold ${trend === "↑" ? "text-green-600" : "text-red-500"}`}>{trend}</span></span>
        </div>
      )}
    </section>
  );
}