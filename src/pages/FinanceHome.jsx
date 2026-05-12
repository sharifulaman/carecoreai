import { useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { PROPERTY_TYPE_LABELS, fmtGBP } from "@/lib/ukLocalAuthorities";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlacementFeeForm from "../components/finance/PlacementFeeForm";
import InvoiceGeneratorForm from "../components/finance/InvoiceGeneratorForm";
import PettyCashTab from "../components/finance/PettyCashTab";
import ResidentAllowanceTab from "../components/finance/ResidentAllowanceTab";
import BudgetTab from "../components/finance/BudgetTab";
import IncomeGraph from "../components/finance/IncomeGraph";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "fees", label: "Placement Fees & Invoices" },
  { key: "petty-cash", label: "Petty Cash" },
  { key: "allowances", label: "Resident Finances" },
  { key: "expenses", label: "Expenses" },
  { key: "budget", label: "Budget" },
];

export default function FinanceHome() {
  const { home_id } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState("all");

  const isAdmin = user?.role === "admin";
  const isTeamLeader = user?.role === "team_leader";

  const { data: home } = useQuery({
    queryKey: ["home", home_id],
    queryFn: () => secureGateway.get("Home", home_id),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-home", home_id],
    queryFn: () => secureGateway.filter("Resident", { home_id, status: "active" }),
  });

  const { data: placements = [] } = useQuery({
    queryKey: ["placement-fees-home", home_id],
    queryFn: () => secureGateway.filter("PlacementFee", { home_id }),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-home", home_id],
    queryFn: () => secureGateway.filter("PlacementInvoice", { home_id }, "-invoice_date", 100),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["bills-home", home_id],
    queryFn: () => secureGateway.filter("Bill"),
  });

  const { data: pettyCashTx = [] } = useQuery({
    queryKey: ["petty-cash-tx", home_id],
    queryFn: () => secureGateway.filter("PettyCashTransaction", { home_id }, "-date", 500),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
  });

  const activePlacements = placements.filter(p => p.status === "active");
  const filteredInvoices = invoiceFilter === "all" ? invoices : invoices.filter(inv => inv.status === invoiceFilter);

  const homeBills = bills.filter(b => b.home_id === home_id);

  const getResidentName = (id) => residents.find(r => r.id === id)?.display_name || "—";

  const STATUS_COLORS = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-blue-500/10 text-blue-600",
    paid: "bg-green-500/10 text-green-600",
    disputed: "bg-amber-500/10 text-amber-600",
    overdue: "bg-red-500/10 text-red-600",
    void: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      {showFeeForm && <PlacementFeeForm lockedHomeId={home_id} onClose={() => setShowFeeForm(false)} />}
      {showInvoiceForm && <InvoiceGeneratorForm lockedHomeId={home_id} onClose={() => setShowInvoiceForm(false)} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/finance")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{home?.name || "Loading…"}</h1>
          <p className="text-xs text-muted-foreground">
            {PROPERTY_TYPE_LABELS[home?.property_type] || home?.property_type || "—"}
            {" · "}{residents.length} active resident{residents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-1">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <IncomeGraph
              homes={home ? [home] : []}
              residents={residents}
              placements={activePlacements}
              invoices={invoices}
              bills={homeBills}
              pettyCashTx={pettyCashTx}
              staffProfile={null}
              isAdmin={true}
            />

            {/* Resident fees list */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Active Residents & Fees</h3>
                <Button size="sm" className="text-xs h-7 gap-1" onClick={() => setShowFeeForm(true)}>
                  <Plus className="w-3 h-3" /> Set Fee
                </Button>
              </div>
              <div className="space-y-2">
                {residents.map(r => {
                  const fee = activePlacements.find(p => p.resident_id === r.id);
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 text-sm">
                      <span className="font-medium">{r.display_name}</span>
                      {fee ? (
                        <div className="text-right">
                          <span className="font-semibold">{fmtGBP(fee.monthly_equivalent)}/mo</span>
                          <p className="text-xs text-muted-foreground">Weekly: {fmtGBP(fee.weekly_rate)}</p>
                        </div>
                      ) : (
                        <button className="text-xs text-primary hover:underline" onClick={() => setShowFeeForm(true)}>Set fee</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Running costs */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold mb-3">Running Costs (Bills)</h3>
              {homeBills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bills linked to this home</p>
              ) : (
                <div className="space-y-2">
                  {homeBills.map(b => (
                    <div key={b.id} className="flex justify-between text-sm border-b border-border/40 last:border-0 py-1">
                      <span className="capitalize">{b.bill_type?.replace(/_/g, " ")} — {b.supplier || ""}</span>
                      <span className={b.status === "overdue" ? "text-red-600 font-medium" : ""}>{fmtGBP(b.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLACEMENT FEES & INVOICES */}
        {activeTab === "fees" && (
          <div className="space-y-5">
            {/* Active fees */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Active Placement Fees</h3>
                <Button size="sm" className="text-xs h-8 gap-1" onClick={() => setShowFeeForm(true)}>
                  <Plus className="w-3 h-3" /> Add Fee
                </Button>
              </div>
              {activePlacements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active placement fees</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2 px-2">Resident</th>
                        <th className="text-left py-2 px-2">Local Authority</th>
                        <th className="text-right py-2 px-2">Monthly Fee</th>
                        <th className="text-right py-2 px-2">Weekly Rate</th>
                        <th className="text-left py-2 px-2">Start Date</th>
                        <th className="text-left py-2 px-2">Review Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePlacements.map(fee => (
                        <tr key={fee.id} className="border-b border-border/40 last:border-0">
                          <td className="py-2 px-2 font-medium">{getResidentName(fee.resident_id)}</td>
                          <td className="py-2 px-2 text-xs">{fee.local_authority}</td>
                          <td className="py-2 px-2 text-right font-semibold">{fmtGBP(fee.monthly_equivalent)}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{fmtGBP(fee.weekly_rate)}</td>
                          <td className="py-2 px-2 text-xs">{fee.fee_start_date}</td>
                          <td className={`py-2 px-2 text-xs ${fee.review_date && fee.review_date <= new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0] ? "text-amber-600 font-medium" : ""}`}>
                            {fee.review_date || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Invoices */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold">Invoices</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={invoiceFilter}
                    onChange={e => setInvoiceFilter(e.target.value)}
                    className="h-8 text-xs border border-input rounded-md bg-transparent px-2"
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="disputed">Disputed</option>
                  </select>
                  <Button size="sm" className="text-xs h-8 gap-1" onClick={() => setShowInvoiceForm(true)}>
                    <FileText className="w-3 h-3" /> Generate
                  </Button>
                </div>
              </div>
              {filteredInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2 px-2">Invoice #</th>
                        <th className="text-left py-2 px-2">Resident</th>
                        <th className="text-left py-2 px-2">Period</th>
                        <th className="text-left py-2 px-2">LA</th>
                        <th className="text-right py-2 px-2">Amount</th>
                        <th className="text-left py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.slice(0, 50).map(inv => (
                        <tr key={inv.id} className="border-b border-border/40 last:border-0">
                          <td className="py-2 px-2 font-mono text-xs">{inv.invoice_number}</td>
                          <td className="py-2 px-2">{getResidentName(inv.resident_id)}</td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">{inv.period_from} → {inv.period_to}</td>
                          <td className="py-2 px-2 text-xs">{inv.local_authority}</td>
                          <td className="py-2 px-2 text-right font-semibold">{fmtGBP(inv.total_amount)}</td>
                          <td className="py-2 px-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[inv.status] || ""}`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PETTY CASH */}
        {activeTab === "petty-cash" && (
          <PettyCashTab homeId={home_id} staff={staff} />
        )}

        {/* RESIDENT ALLOWANCES */}
        {activeTab === "allowances" && (
          <ResidentAllowanceTab homeId={home_id} currentUser={user} />
        )}

        {/* EXPENSES */}
        {activeTab === "expenses" && (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 text-xs font-semibold">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Supplier</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {homeBills.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No expenses recorded</td></tr>
                ) : homeBills.map(b => (
                  <tr key={b.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 capitalize">{b.bill_type?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-xs">{b.supplier || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtGBP(b.amount)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{b.due_date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[b.status] || "bg-muted text-muted-foreground"}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* BUDGET */}
        {activeTab === "budget" && (
          <BudgetTab homeId={home_id} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}