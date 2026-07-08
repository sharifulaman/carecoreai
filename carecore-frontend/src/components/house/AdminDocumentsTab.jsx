import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function getDaysLeft(expiry) {
  return Math.ceil((new Date(expiry) - new Date()) / 86400000);
}

function getDocStatus(doc, today, in60Str) {
  if (!doc.expiry_date) return { label: "Valid", cls: "bg-green-50 text-green-600 border-green-200" };
  const d = new Date(doc.expiry_date).toISOString().split("T")[0];
  if (d < today) return { label: "Expired", cls: "bg-red-50 text-red-600 border-red-200" };
  if (d <= in60Str) return { label: "Expiring Soon", cls: "bg-amber-50 text-amber-600 border-amber-200" };
  return { label: "Valid", cls: "bg-green-50 text-green-600 border-green-200" };
}

function formatDate(dateStr) {
  if (!dateStr) return "No expiry";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getDocType(d) {
  return d.document_type || d.doc_type || d.category || d.type || "—";
}

import { useState, useEffect } from "react";
import { Search, LayoutGrid, List } from "lucide-react";

export default function AdminDocumentsTab({ documents, properties }) {
  const [homeFilter, setHomeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("adminDocumentsViewMode") || "list");

  useEffect(() => {
    localStorage.setItem("adminDocumentsViewMode", viewMode);
  }, [viewMode]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;
  const today = new Date().toISOString().split("T")[0];
  const in60 = new Date(); in60.setDate(in60.getDate() + 60);
  const in60Str = in60.toISOString().split("T")[0];

  const activeAll = documents.filter(d => !d.superseded_by && !d.deleted_at);
  
  const allTypes = [...new Set(activeAll.map(d => getDocType(d)).filter(t => t !== "—"))];

  const active = activeAll.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.title?.toLowerCase().includes(q) || d.document_name?.toLowerCase().includes(q);
    const matchHome = homeFilter === "all" || d.home_id === homeFilter;
    const matchType = typeFilter === "all" || getDocType(d) === typeFilter;
    return matchSearch && matchHome && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(active.length / PAGE_SIZE));
  const paginated = active.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={homeFilter} onChange={e => { setHomeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none max-w-[200px]">
            <option value="all">All Properties</option>
            {properties.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none max-w-[200px] capitalize">
            <option value="all">All Types</option>
            {allTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-full sm:w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search documents..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs font-medium text-slate-400 hidden lg:inline-block">{active.length} documents</span>
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
      {active.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No documents found</p>
          <p className="text-slate-400 text-sm mt-1">Upload documents via the Home Details page or check your filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(d => {
            const home = properties.find(h => h.id === d.home_id);
            const status = getDocStatus(d, today, in60Str);
            const daysLeft = d.expiry_date ? getDaysLeft(d.expiry_date) : null;
            return (
              <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow relative">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900 truncate">{d.title || d.document_name || "Untitled"}</p>
                    <p className="text-xs text-slate-500 truncate">{home?.name || "—"} • <span className="capitalize">{getDocType(d).replace(/_/g, " ")}</span></p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">Expiry</p>
                    <p className="text-xs text-slate-700 font-medium">{formatDate(d.expiry_date)}</p>
                  </div>
                  <Badge className={`text-xs ${status.cls}`}>{status.label}</Badge>
                </div>
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                    View
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Property</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Document</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Expiry Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Days Left</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map(d => {
              const home = properties.find(h => h.id === d.home_id);
              const status = getDocStatus(d, today, in60Str);
              const daysLeft = d.expiry_date ? getDaysLeft(d.expiry_date) : null;
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{home?.name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{d.title || d.document_name || "Untitled"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell capitalize">{getDocType(d).replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(d.expiry_date)}</td>
                  <td className="px-4 py-3 text-xs hidden lg:table-cell">
                    {daysLeft !== null ? (
                      <span className={daysLeft < 0 ? "text-red-500 font-medium" : daysLeft <= 60 ? "text-amber-600 font-medium" : "text-slate-500"}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d`}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${status.cls}`}>{status.label}</Badge></td>
                  <td className="px-4 py-3">
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {/* Pagination */}
      {active.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, active.length)} of {active.length} documents
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