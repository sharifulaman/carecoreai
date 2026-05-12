import { Clock, CheckCircle, PoundSterling } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function ExpenseSummaryCards({ expenses = [] }) {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString().split("T")[0];
  const monthEnd = endOfMonth(now).toISOString().split("T")[0];

  const pending = expenses.filter(e => e.status === "submitted");
  const approvedThisMonth = expenses.filter(e =>
    e.status === "approved" &&
    e.reviewed_at &&
    e.reviewed_at.startsWith(format(now, "yyyy-MM"))
  );
  const paidThisMonth = expenses.filter(e =>
    e.status === "paid" &&
    e.reviewed_at &&
    e.reviewed_at.startsWith(format(now, "yyyy-MM"))
  );

  const sum = arr => arr.reduce((s, e) => s + (e.amount || 0), 0);

  const cards = [
    {
      label: "Pending Review",
      count: pending.length,
      total: sum(pending),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Approved This Month",
      count: approvedThisMonth.length,
      total: sum(approvedThisMonth),
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
    },
    {
      label: "Paid This Month",
      count: paidThisMonth.length,
      total: sum(paidThisMonth),
      icon: PoundSterling,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${c.color}`} />
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>£{c.total.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.count} expense{c.count !== 1 ? "s" : ""}</p>
          </div>
        );
      })}
    </div>
  );
}