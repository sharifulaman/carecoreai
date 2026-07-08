import { useNavigate } from "react-router-dom";
import IncomeGraph from "../IncomeGraph";
import { fmtGBP } from "@/lib/ukLocalAuthorities";
import { AlertCircle, Clock, Receipt, FileText, Banknote, ShoppingCart } from "lucide-react";

export default function FinanceOverviewTab({
  homes, residents, placements, invoices, bills, expenses,
  visibleHomes, visibleHomeIds, visiblePlacements, visibleInvoices,
  staffProfile, isAdmin, thisMonth,
}) {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const overdueInvoices = visibleInvoices.filter(inv => inv.status === "overdue");
  const billsDueSoon = bills.filter(b => visibleHomeIds.has(b.home_id) && b.due_date >= todayStr && b.due_date <= in7Days && b.status !== "paid");
  const feesForReview = visiblePlacements.filter(p => p.review_date && p.review_date >= todayStr && p.review_date <= in30Days);

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));

  // Recent activity — mix of invoices, bills, expenses
  const activities = [
    ...visibleInvoices.slice(0, 20).map(inv => ({
      type: "invoice", label: `Invoice ${inv.invoice_number || ""}`, sub: homeMap[inv.home_id]?.name || "",
      amount: inv.total_amount, date: inv.invoice_date || inv.created_date, status: inv.status,
    })),
    ...bills.filter(b => visibleHomeIds.has(b.home_id)).slice(0, 10).map(b => ({
      type: "bill", label: `${b.bill_type?.replace(/_/g, " ")} Bill`, sub: homeMap[b.home_id]?.name || "",
      amount: b.amount, date: b.due_date || b.created_date, status: b.status,
    })),
    ...expenses.filter(e => visibleHomeIds.has(e.home_id)).slice(0, 10).map(e => ({
      type: "expense", label: e.category?.replace(/_/g, " ") || "Expense", sub: homeMap[e.home_id]?.name || "",
      amount: e.amount, date: e.date || e.created_date, status: "logged",
    })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 15);

  const typeIcon = {
    invoice: <FileText className="w-4 h-4 text-blue-500" />,
    bill: <Receipt className="w-4 h-4 text-amber-500" />,
    expense: <ShoppingCart className="w-4 h-4 text-purple-500" />,
  };

  const statusBadge = (status) => {
    const m = { draft: "bg-slate-100 text-slate-600", sent: "bg-blue-100 text-blue-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", pending: "bg-amber-100 text-amber-700", logged: "bg-slate-100 text-slate-600" };
    return <span className={`text-xs px-2 py-0.5 rounded-full ${m[status] || "bg-slate-100 text-slate-600"}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Income Chart */}
      <IncomeGraph
        homes={visibleHomes}
        residents={residents}
        placements={visiblePlacements}
        invoices={visibleInvoices}
        bills={bills}
        pettyCashTx={[]}
        staffProfile={staffProfile}
        isAdmin={isAdmin}
      />

      {/* Home Summary Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold">Home Financial Summary</h2>
        </div>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs">
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-center px-4 py-3 font-semibold">Residents</th>
              <th className="text-right px-4 py-3 font-semibold">Expected</th>
              <th className="text-right px-4 py-3 font-semibold">Invoiced</th>
              <th className="text-right px-4 py-3 font-semibold">Received</th>
              <th className="text-right px-4 py-3 font-semibold">Expenses</th>
              <th className="text-right px-4 py-3 font-semibold">Net</th>
            </tr>
          </thead>
          <tbody>
            {visibleHomes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No homes</td></tr>
            ) : visibleHomes.map(home => {
              const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
              const hp = visiblePlacements.filter(p => p.home_id === home.id);
              const expected = hp.reduce((s, p) => {
                const weekly = p.weekly_rate || (p.monthly_equivalent ? p.monthly_equivalent * 12 / 52 : 0);
                return s + (weekly / 7) * daysInMonth;
              }, 0);
              const invoiced = visibleInvoices.filter(inv => inv.home_id === home.id && inv.invoice_date?.startsWith(thisMonth)).reduce((s, inv) => s + (inv.total_amount || 0), 0);
              const received = visibleInvoices.filter(inv => inv.home_id === home.id && inv.status === "paid" && inv.invoice_date?.startsWith(thisMonth)).reduce((s, inv) => s + (inv.total_amount || 0), 0);
              const expAmt = [
                ...bills.filter(b => b.home_id === home.id && b.due_date?.startsWith(thisMonth)),
                ...expenses.filter(e => e.home_id === home.id && e.date?.startsWith(thisMonth)),
              ].reduce((s, i) => s + (i.amount || 0), 0);
              const net = invoiced - expAmt;
              const resCount = residents.filter(r => r.home_id === home.id && r.status === "active").length;
              return (
                <tr key={home.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/finance/home/${home.id}`)}>
                  <td className="px-4 py-3 font-medium">{home.name}</td>
                  <td className="px-4 py-3 text-center">{resCount}</td>
                  <td className="px-4 py-3 text-right">{fmtGBP(expected)}</td>
                  <td className="px-4 py-3 text-right">{fmtGBP(invoiced)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmtGBP(received)}</td>
                  <td className="px-4 py-3 text-right">{fmtGBP(expAmt)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${net >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtGBP(net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold">Recent Finance Activity</h2>
          </div>
          <div className="divide-y divide-border/50">
            {activities.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No activity yet</p>}
            {activities.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="shrink-0">{typeIcon[a.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize truncate">{a.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.sub} · {a.date}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium">{fmtGBP(a.amount)}</span>
                  {statusBadge(a.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold">Finance Alerts</h2>
          </div>
          <div className="divide-y divide-border/50">
            {overdueInvoices.length === 0 && billsDueSoon.length === 0 && feesForReview.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground text-center">No alerts</p>
            )}
            {overdueInvoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-600">Overdue Invoice {inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{inv.local_authority} · {homeMap[inv.home_id]?.name}</p>
                </div>
                <span className="text-sm font-bold text-red-600">{fmtGBP(inv.total_amount)}</span>
              </div>
            ))}
            {billsDueSoon.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <Receipt className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{b.bill_type?.replace(/_/g, " ")} due soon</p>
                  <p className="text-xs text-muted-foreground">{homeMap[b.home_id]?.name} · Due {b.due_date}</p>
                </div>
                <span className="text-sm font-medium">{fmtGBP(b.amount)}</span>
              </div>
            ))}
            {feesForReview.map(fee => {
              const res = residentMap[fee.resident_id];
              return (
                <div key={fee.id} className="flex items-center gap-3 px-4 py-3">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Placement fee review due</p>
                    <p className="text-xs text-muted-foreground">{res?.display_name || res?.initials} · {fee.review_date}</p>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">{fmtGBP(fee.weekly_rate)}/wk</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}