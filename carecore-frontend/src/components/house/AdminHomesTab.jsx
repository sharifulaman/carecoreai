import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Search, LayoutGrid, List, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS = {
  outreach: "Outreach", "24_hours": "24 Hours Housing",
  "18_plus": "18+ Accommodation",
};

const PAGE_SIZE = 9;

export default function AdminHomesTab({ properties, onAddHome, canEdit }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("adminHomesViewMode") || "grid");

  useEffect(() => {
    localStorage.setItem("adminHomesViewMode", viewMode);
  }, [viewMode]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = properties.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchType = typeFilter === "all" || p.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Search & Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="reject">Reject</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="outreach">Outreach</option>
            <option value="24_hours">24 Hours Housing</option>
            <option value="18_plus">18+ Accommodation</option>
          </select>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-full sm:w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search homes..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs font-medium text-slate-400 hidden lg:inline-block">{filtered.length} homes</span>
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
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No homes found</p>
          <p className="text-slate-400 text-sm mt-1">Try changing your filters or add a new home.</p>
          {canEdit && (
            <button onClick={onAddHome} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              Add Home
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/homes/${p.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="font-semibold text-sm text-slate-900 truncate">{p.name}</p>
                </div>
                <Badge className={`text-xs shrink-0 ${p.status === "active" ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-100 text-slate-500"}`}>
                  {p.status || "active"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mb-3 line-clamp-1">{p.address}{p.postcode ? `, ${p.postcode}` : ""}</p>
              <div className="text-xs space-y-1 text-slate-500">
                {p.type && <p><span className="text-slate-700 font-medium">Home Type:</span> {TYPE_LABELS[p.type] || p.type}</p>}
                {p.compliance_framework && <p><span className="text-slate-700 font-medium">Compliance:</span> {p.compliance_framework.toUpperCase()}</p>}
                {p.phone && <p className="truncate"><span className="text-slate-700 font-medium">Phone:</span> {p.phone}</p>}
                {p.email && <p className="truncate"><span className="text-slate-700 font-medium">Email:</span> {p.email}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {paginated.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/homes/${p.id}`)}
              className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500 truncate">{p.address}</p>
              </div>
              <div className="text-xs text-slate-500 hidden md:block w-32 shrink-0">{TYPE_LABELS[p.type] || p.type}</div>
              <div className="text-xs text-slate-500 hidden lg:block w-20 shrink-0">{p.compliance_framework?.toUpperCase()}</div>
              <Badge className={`text-xs shrink-0 ${p.status === "active" ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-100 text-slate-500"}`}>
                {p.status || "active"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} homes
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
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