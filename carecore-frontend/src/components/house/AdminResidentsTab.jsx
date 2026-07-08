import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminResidentsTab({ residents, homes, staff }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("adminResidentsViewMode") || "grid");

  useEffect(() => {
    localStorage.setItem("adminResidentsViewMode", viewMode);
  }, [viewMode]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [homeFilter, setHomeFilter] = useState("all");

  const PAGE_SIZE = 9;

  const staffMap = staff?.reduce((acc, s) => { acc[s.id] = s; return acc; }, {}) || {};
  const homeMap = homes?.reduce((acc, h) => { acc[h.id] = h; return acc; }, {}) || {};

  const filtered = residents.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.display_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchHome = homeFilter === "all" || r.home_id === homeFilter;
    return matchSearch && matchStatus && matchHome;
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
            <option value="archived">Archived</option>
            <option value="on_leave">On Leave</option>
            <option value="moved_on">Moved On</option>
          </select>
          <select
            value={homeFilter}
            onChange={e => { setHomeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none max-w-[200px]"
          >
            <option value="all">All Homes</option>
            {homes.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-full sm:w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search residents..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs font-medium text-slate-400 hidden lg:inline-block">{filtered.length} residents</span>
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
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No residents found</p>
          <p className="text-slate-400 text-sm mt-1">Try changing your filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(r => {
            const home = homeMap[r.home_id];
            const keyWorker = staffMap[r.key_worker_id];
            return (
              <div
                key={r.id}
                onClick={() => navigate(`/young-people/${r.id}/workspace`)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <span className="font-bold text-sm text-blue-600">
                        {r.initials || r.display_name?.charAt(0) || "?"}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-slate-900 truncate">{r.display_name}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${r.status === "active" ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-100 text-slate-500"}`}>
                    {r.status?.replace(/_/g, " ") || "active"}
                  </Badge>
                </div>
                <div className="text-xs space-y-1 text-slate-500 mt-3">
                  <p className="truncate"><span className="text-slate-700 font-medium">Home:</span> {home?.name || "Unassigned"}</p>
                  <p className="truncate"><span className="text-slate-700 font-medium">Key Worker:</span> {keyWorker?.full_name || "Unassigned"}</p>
                  <p><span className="text-slate-700 font-medium">DOB:</span> {r.dob ? new Date(r.dob).toLocaleDateString() : "Unknown"}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {paginated.map(r => {
            const home = homeMap[r.home_id];
            const keyWorker = staffMap[r.key_worker_id];
            return (
              <div
                key={r.id}
                onClick={() => navigate(`/young-people/${r.id}/workspace`)}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="font-bold text-sm text-blue-600">
                    {r.initials || r.display_name?.charAt(0) || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900">{r.display_name}</p>
                  <p className="text-xs text-slate-500 truncate">{home?.name || "Unassigned Home"}</p>
                </div>
                <div className="text-xs text-slate-500 hidden md:block w-32 shrink-0 truncate">{keyWorker?.full_name || "No Key Worker"}</div>
                <div className="text-xs text-slate-500 hidden lg:block w-24 shrink-0">{r.dob ? new Date(r.dob).toLocaleDateString() : "Unknown"}</div>
                <Badge className={`text-xs shrink-0 ${r.status === "active" ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-100 text-slate-500"}`}>
                  {r.status?.replace(/_/g, " ") || "active"}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} residents
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
