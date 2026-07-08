import { useState, useEffect } from "react";
import { PoundSterling, Search, CheckCircle2, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BillApprovalBadge from "./BillApprovalBadge";

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  paid: "bg-green-50 text-green-600 border-green-200",
  overdue: "bg-red-50 text-red-600 border-red-200",
  disputed: "bg-purple-50 text-purple-600 border-purple-200",
};

const TYPE_LABELS = {
  utilities: "Utilities", council_tax: "Council Tax", insurance: "Insurance",
  cleaning: "Cleaning", maintenance: "Maintenance", rent: "Rent",
  staff_training: "Staff Training", admin: "Admin", food: "Food Supplies", other: "Other",
};

const PAGE_SIZE = 9;

export default function AdminBillsTab({ bills, homes = [], canEdit, onMarkPaid, filterOverdue = false, emptyMessage = "No bills found." }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [homeFilter, setHomeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("adminBillsViewMode") || "list");

  useEffect(() => {
    localStorage.setItem("adminBillsViewMode", viewMode);
  }, [viewMode]);

  const today = new Date().toISOString().split("T")[0];

  const source = filterOverdue
    ? bills.filter(b => b.status === "overdue" || (b.status === "pending" && b.due_date < today))
    : bills;

  const filtered = source.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.home_name?.toLowerCase().includes(q) || b.supplier?.toLowerCase().includes(q) || b.bill_type?.toLowerCase().includes(q) || b.title?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchType = typeFilter === "all" || b.bill_type === typeFilter;
    const matchHome = homeFilter === "all" || b.home_id === homeFilter;
    return matchSearch && matchStatus && matchType && matchHome;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {!filterOverdue && (
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="disputed">Disputed</option>
            </select>
          )}
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none">
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={homeFilter} onChange={e => { setHomeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none max-w-[200px]">
            <option value="all">All Properties</option>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-full sm:w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={filterOverdue ? "Search overdue bills..." : "Search bills..."}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs font-medium text-slate-400 hidden lg:inline-block">{filtered.length} bills</span>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <PoundSterling className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{emptyMessage}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(b => {
            const daysOverdue = b.due_date ? Math.max(0, Math.ceil((new Date() - new Date(b.due_date)) / 86400000)) : 0;
            return (
              <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between relative">
                <div>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <PoundSterling className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 truncate">{b.home_name || "—"}</p>
                        <p className="text-xs text-slate-500 truncate">{TYPE_LABELS[b.bill_type] || b.bill_type || "—"} • {b.supplier || "—"}</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-900 shrink-0">£{(b.amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={`text-xs ${STATUS_COLORS[b.status] || "bg-slate-100 text-slate-500"}`}>{b.status || "—"}</Badge>
                    {b.approval_status && b.approval_status !== 'draft' && <BillApprovalBadge status={b.approval_status} />}
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex justify-between items-end border-t border-slate-100 pt-3">
                  <div>
                    <p>{b.due_date ? `Due: ${b.due_date}` : "No due date"}</p>
                    {filterOverdue && daysOverdue > 0 && <p className="text-red-500 font-medium">{daysOverdue} days overdue</p>}
                  </div>
                  {canEdit && b.status !== "paid" && onMarkPaid && (() => {
                    const isPayable = !b.approval_status || b.approval_status === 'approved' || b.approval_status === 'draft';
                    return isPayable ? (
                      <button onClick={() => onMarkPaid(b)} className="text-green-600 hover:text-green-700 bg-green-50 p-1.5 rounded-lg border border-green-100" title="Mark as paid">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Billing ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Supplier</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Due Date</th>
                  {filterOverdue && <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Days Overdue</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  {canEdit && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map(b => {
                  const daysOverdue = b.due_date ? Math.max(0, Math.ceil((new Date() - new Date(b.due_date)) / 86400000)) : 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs font-medium text-slate-800">{b.home_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-blue-600">{b.title || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{TYPE_LABELS[b.bill_type] || b.bill_type || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{b.supplier || "—"}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900 text-right">£{(b.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{b.due_date || "—"}</td>
                      {filterOverdue && <td className="px-4 py-3 text-xs text-red-500 font-medium text-right hidden lg:table-cell">{daysOverdue}d</td>}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge className={`text-xs ${STATUS_COLORS[b.status] || "bg-slate-100 text-slate-500"}`}>{b.status || "—"}</Badge>
                          {b.approval_status && b.approval_status !== 'draft' && (
                            <BillApprovalBadge status={b.approval_status} />
                          )}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          {b.status !== "paid" && onMarkPaid && (() => {
                            const isPayable = !b.approval_status || b.approval_status === 'approved' || b.approval_status === 'draft';
                            return (
                              <button
                                onClick={() => isPayable && onMarkPaid(b)}
                                className={isPayable ? "text-green-600 hover:text-green-700" : "text-slate-300 cursor-not-allowed"}
                                title={isPayable ? "Mark as paid" : "Awaiting approval"}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            );
                          })()}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${n === page ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >{n}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">›</button>
          </div>
        </div>
      )}
    </div>
  );
}