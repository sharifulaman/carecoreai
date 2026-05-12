import { useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { fmtGBP } from "@/lib/ukLocalAuthorities";
import {
  DollarSign, AlertCircle, TrendingUp, Clock, Receipt, Wallet, MinusCircle
} from "lucide-react";

// Tab components
import FinanceOverviewTab from "../components/finance/tabs/FinanceOverviewTab";
import PlacementsTab from "../components/finance/tabs/PlacementsTab";
import InvoicingTab from "../components/finance/tabs/InvoicingTab";
import PettyCashTabMain from "../components/finance/tabs/PettyCashTabMain";
import AllowancesTab from "../components/finance/tabs/AllowancesTab";
import BillsExpensesTab from "../components/finance/tabs/BillsExpensesTab";
import BudgetsTab from "../components/finance/tabs/BudgetsTab";

const TABS = [
  { key: "overview",    label: "Overview" },
  { key: "placements",  label: "Placements & Fees" },
  { key: "invoicing",   label: "Invoicing" },
  { key: "petty-cash",  label: "Petty Cash" },
  { key: "allowances",  label: "Allowances & Savings" },
  { key: "bills",       label: "Bills & Expenses" },
  { key: "budgets",     label: "Budgets" },
];

const KPICard = ({ icon: IconComp, label, value, sub, color = "text-primary" }) => (
  <div className="bg-card rounded-xl border border-border p-4">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{sub}</p>}
      </div>
      <IconComp className={`w-7 h-7 ${color} opacity-20 shrink-0 ml-2`} />
    </div>
  </div>
);

export default function Finance() {
  const { user, staffProfile } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isAdmin = staffRole === "admin";
  const isTeamLeader = staffRole === "team_leader";
  const isSW = staffRole === "support_worker";

  const activeTab = searchParams.get("tab") || "overview";
  const setTab = (key) => setSearchParams({ tab: key }, { replace: true });

  useEffect(() => {
    secureGateway.filter("PlacementFee", {}, null, 1).then(existing => {
      if (existing.length === 0) {
        base44.functions.invoke("seedFinanceData", {}).then(() => {
          queryClient.invalidateQueries();
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  // Core data
  const { data: homes = [] } = useQuery({
    queryKey: ["homes-active"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
  });
  const { data: residents = [] } = useQuery({
    queryKey: ["residents-active"],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }),
  });
  const { data: placements = [] } = useQuery({
    queryKey: ["placement-fees"],
    queryFn: () => secureGateway.filter("PlacementFee"),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => secureGateway.filter("PlacementInvoice"),
  });
  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: () => secureGateway.filter("Bill"),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["home-expenses"],
    queryFn: () => secureGateway.filter("HomeExpense"),
  });

  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  // Role-based scoping
  const visibleHomes = isAdmin ? homes : homes.filter(h => (staffProfile?.home_ids || []).includes(h.id));
  const visibleHomeIds = new Set(visibleHomes.map(h => h.id));
  const visiblePlacements = placements.filter(p => visibleHomeIds.has(p.home_id) && p.status === "active");
  const visibleInvoices = invoices.filter(inv => visibleHomeIds.has(inv.home_id));

  // KPI calculations
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const expectedIncome = visiblePlacements.reduce((s, p) => {
    const weekly = p.weekly_rate || (p.monthly_equivalent ? p.monthly_equivalent * 12 / 52 : 0);
    return s + (weekly / 7) * daysInMonth;
  }, 0);
  const activeResidentCount = residents.filter(r => visibleHomeIds.has(r.home_id) && r.status === "active").length;

  const invoicedThisMonth = visibleInvoices
    .filter(inv => inv.invoice_date?.startsWith(thisMonth))
    .reduce((s, inv) => s + (inv.total_amount || 0), 0);

  const outstanding = visibleInvoices
    .filter(inv => ["sent", "overdue"].includes(inv.status))
    .reduce((s, inv) => s + (inv.total_amount || 0), 0);

  const overdue = visibleInvoices
    .filter(inv => inv.status === "overdue")
    .reduce((s, inv) => s + (inv.total_amount || 0), 0);

  const totalExpenses = [
    ...bills.filter(b => b.due_date?.startsWith(thisMonth) && visibleHomeIds.has(b.home_id)),
    ...expenses.filter(e => e.date?.startsWith(thisMonth) && visibleHomeIds.has(e.home_id)),
  ].reduce((s, i) => s + (i.amount || 0), 0);

  const netPosition = invoicedThisMonth - totalExpenses;

  // Shared data bundle passed to all tabs
  const sharedData = {
    user, isAdmin, isTeamLeader, isSW,
    homes, residents, placements, invoices, bills, expenses,
    visibleHomes, visibleHomeIds, visiblePlacements, visibleInvoices,
    staffProfile, thisMonth,
  };

  return (
    <div className="space-y-0 -mx-3 -mt-4 md:-mx-6 md:-mt-6">
      {/* Persistent Header */}
      <div className="px-3 md:px-6 pt-4 md:pt-6 pb-4 bg-background border-b border-border space-y-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Organisation-wide financial overview</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <KPICard
            icon={DollarSign}
            label="Expected Income"
            value={fmtGBP(expectedIncome)}
            sub={`${activeResidentCount} residents, ${visibleHomes.length} homes`}
          />
          <KPICard
            icon={TrendingUp}
            label="Invoiced This Month"
            value={fmtGBP(invoicedThisMonth)}
            color="text-blue-600"
          />
          <KPICard
            icon={Clock}
            label="Outstanding"
            value={fmtGBP(outstanding)}
            color="text-amber-600"
          />
          <KPICard
            icon={AlertCircle}
            label="Overdue"
            value={fmtGBP(overdue)}
            color={overdue > 0 ? "text-red-600" : "text-muted-foreground"}
          />
          <KPICard
            icon={Receipt}
            label="Expenses This Month"
            value={fmtGBP(totalExpenses)}
            color="text-orange-600"
          />
          <KPICard
            icon={netPosition >= 0 ? Wallet : MinusCircle}
            label="Net Position"
            value={fmtGBP(netPosition)}
            color={netPosition >= 0 ? "text-green-600" : "text-red-600"}
          />
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 overflow-x-auto scrollbar-none -mb-4 border-b border-transparent">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`px-3 md:px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-3 md:px-6 py-4 md:py-6">
        {activeTab === "overview"   && <FinanceOverviewTab {...sharedData} />}
        {activeTab === "placements" && <PlacementsTab {...sharedData} />}
        {activeTab === "invoicing"  && <InvoicingTab {...sharedData} />}
        {activeTab === "petty-cash" && <PettyCashTabMain {...sharedData} />}
        {activeTab === "allowances" && <AllowancesTab {...sharedData} />}
        {activeTab === "bills"      && <BillsExpensesTab {...sharedData} />}
        {activeTab === "budgets"    && <BudgetsTab {...sharedData} />}
      </div>
    </div>
  );
}