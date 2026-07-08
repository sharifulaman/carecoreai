import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

import { useState, useEffect } from "react";
import { Search, LayoutGrid, List } from "lucide-react";

export default function AdminLeasesTab({ properties }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy").toLowerCase(); // 22 jan 2003 as requested
    } catch (e) {
      return dateStr;
    }
  };

  const navigate = useNavigate();
  const [homeFilter, setHomeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("adminLeasesViewMode") || "list");

  useEffect(() => {
    localStorage.setItem("adminLeasesViewMode", viewMode);
  }, [viewMode]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;
  const today = new Date().toISOString().split("T")[0];
  const in90 = new Date(); in90.setDate(in90.getDate() + 90);
  const in90Str = in90.toISOString().split("T")[0];

  const withLeasesAll = properties.filter(p => p.lease_end || p.lease_start || p.monthly_rent);
  const withLeases = withLeasesAll.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.landlord_name?.toLowerCase().includes(q);
    const matchHome = homeFilter === "all" || p.id === homeFilter;
    return matchSearch && matchHome;
  });

  const totalPages = Math.max(1, Math.ceil(withLeases.length / PAGE_SIZE));
  const paginated = withLeases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function getLeaseStatus(p) {
    if (!p.lease_end) return { label: "No Expiry", cls: "bg-slate-100 text-slate-500" };
    if (p.lease_end < today) return { label: "Expired", cls: "bg-red-50 text-red-600 border-red-200" };
    if (p.lease_end <= in90Str) return { label: "Expiring Soon", cls: "bg-amber-50 text-amber-600 border-amber-200" };
    return { label: "Current", cls: "bg-green-50 text-green-600 border-green-200" };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={homeFilter} onChange={e => { setHomeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none max-w-[200px]">
            <option value="all">All Properties</option>
            {properties.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-full sm:w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search leases..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs font-medium text-slate-400 hidden lg:inline-block">{withLeases.length} leases</span>
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
      {withLeases.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No lease records found</p>
          <p className="text-slate-400 text-sm mt-1">Add lease details via the Property & Tenancy tab on each home.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(p => {
            const status = getLeaseStatus(p);
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 pr-10">
                    <p className="font-semibold text-sm text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">{p.landlord_name || "No landlord specified"}</p>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${status.cls}`}>{status.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Start Date</p>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">{formatDate(p.lease_start)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">End Date</p>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">{formatDate(p.lease_end)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{p.monthly_rent ? `£${p.monthly_rent.toLocaleString()} / mo` : "Rent not specified"}</p>
                  <button onClick={() => navigate(`/homes/${p.id}?tab=property`)} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                    View Details
                  </button>
                </div>
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Landlord</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Lease Start</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Lease End</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Monthly Rent</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map(p => {
              const status = getLeaseStatus(p);
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{p.landlord_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.lease_start)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.lease_end)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-right hidden lg:table-cell">
                    {p.monthly_rent ? `£${p.monthly_rent.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${status.cls}`}>{status.label}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/homes/${p.id}?tab=property`)} className="text-xs text-blue-600 hover:underline">View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {/* Pagination */}
      {withLeases.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, withLeases.length)} of {withLeases.length} leases
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