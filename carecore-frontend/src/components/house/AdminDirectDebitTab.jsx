import { FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useState, useEffect } from "react";
import { Search, LayoutGrid, List } from "lucide-react";

export default function AdminDirectDebitTab({ bills, homes = [], canEdit, onMarkPaid }) {
  const [homeFilter, setHomeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("adminDirectDebitViewMode") || "list");

  useEffect(() => {
    localStorage.setItem("adminDirectDebitViewMode", viewMode);
  }, [viewMode]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const ddIssuesAll = bills.filter(b => b.is_direct_debit);
  const ddIssues = ddIssuesAll.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.home_name?.toLowerCase().includes(q) || b.supplier?.toLowerCase().includes(q) || b.bill_type?.toLowerCase().includes(q) || b.title?.toLowerCase().includes(q);
    const matchHome = homeFilter === "all" || b.home_id === homeFilter;
    return matchSearch && matchHome;
  });

  const totalPages = Math.max(1, Math.ceil(ddIssues.length / PAGE_SIZE));
  const paginated = ddIssues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
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
              placeholder="Search issues..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs font-medium text-slate-400 hidden lg:inline-block">{ddIssues.length} issues</span>
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
      {ddIssues.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FileWarning className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No direct debit bills</p>
          <p className="text-slate-400 text-sm mt-1">No direct debit bills found.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(b => (
            <div key={b.id} className="bg-white border border-red-200 rounded-xl p-4 shadow-sm relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm text-slate-900">{b.home_name || "—"}</p>
                  <p className="text-xs text-slate-600">{b.supplier || "—"} • {b.bill_type || "—"}</p>
                </div>
                <Badge className="bg-red-50 text-red-600 border-red-200 text-xs shrink-0">{b.status}</Badge>
              </div>
              <p className="text-lg font-bold text-slate-900 mb-2">£{(b.amount || 0).toLocaleString()}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">Due: {b.due_date || "—"}</p>
                {canEdit && (
                  <button onClick={() => onMarkPaid(b.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors">
                    Resolve Issue
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Property</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Billing ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Supplier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Type</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Due Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map(b => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs font-medium text-slate-800">{b.home_name || "—"}</td>
                <td className="px-4 py-3 text-xs font-medium text-blue-600">{b.title || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{b.supplier || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{b.bill_type || "—"}</td>
                <td className="px-4 py-3 text-xs font-semibold text-right">£{(b.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{b.due_date || "—"}</td>
                <td className="px-4 py-3"><Badge className="bg-red-50 text-red-600 border-red-200 text-xs">{b.status}</Badge></td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <button onClick={() => onMarkPaid(b.id)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Resolve</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {/* Pagination */}
      {ddIssues.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, ddIssues.length)} of {ddIssues.length} items
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  n === page ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >{n}</button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >›</button>
          </div>
        </div>
      )}
    </div>
  );
}