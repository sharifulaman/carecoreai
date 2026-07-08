import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Wrench, Search, AlertTriangle, Clock, CheckCircle2, Loader2, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-600 border-blue-200",
  high: "bg-amber-50 text-amber-600 border-amber-200",
  urgent: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_COLORS = {
  open: "bg-blue-50 text-blue-600 border-blue-200",
  in_progress: "bg-amber-50 text-amber-600 border-amber-200",
  completed: "bg-green-50 text-green-600 border-green-200",
  cancelled: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL = {
  open: "Reported",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PAGE_SIZE = 9;

export default function AdminMaintenanceTab({ properties, canEdit, onAddMaintenance }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [homeFilter, setHomeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("adminMaintenanceViewMode") || "list");

  useEffect(() => {
    localStorage.setItem("adminMaintenanceViewMode", viewMode);
  }, [viewMode]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["maintenance-logs-admin"],
    queryFn: () => base44.entities.MaintenanceLog.filter({ org_id: ORG_ID }),
  });

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

  const open = logs.filter(l => l.status === "open");
  const urgent = logs.filter(l => l.priority === "urgent" && l.status !== "completed" && l.status !== "cancelled");
  const inProgress = logs.filter(l => l.status === "in_progress");
  const completedThisMonth = logs.filter(l => l.status === "completed" && l.date_resolved >= monthStart);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.title?.toLowerCase().includes(q) || l.home_name?.toLowerCase().includes(q) || l.contractor?.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchPriority = priorityFilter === "all" || l.priority === priorityFilter;
    const matchHome = homeFilter === "all" || l.home_id === homeFilter;
    return matchSearch && matchStatus && matchPriority && matchHome;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const markCompleted = async (log) => {
    setUpdatingId(log.id);
    try {
      await base44.entities.MaintenanceLog.update(log.id, {
        status: "completed",
        date_resolved: new Date().toISOString().split("T")[0],
      });
      qc.invalidateQueries({ queryKey: ["maintenance-logs-admin"] });
      qc.invalidateQueries({ queryKey: ["maintenance-logs-count"] });
      toast.success("Marked as completed");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI mini cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Open", value: open.length, cls: "border-l-blue-400", icon: Wrench, iconCls: "text-blue-500" },
          { label: "Urgent", value: urgent.length, cls: "border-l-red-400", icon: AlertTriangle, iconCls: "text-red-500" },
          { label: "In Progress", value: inProgress.length, cls: "border-l-amber-400", icon: Clock, iconCls: "text-amber-500" },
          { label: "Completed This Month", value: completedThisMonth.length, cls: "border-l-green-400", icon: CheckCircle2, iconCls: "text-green-500" },
        ].map(({ label, value, cls, icon: Icon, iconCls }) => (
          <div key={label} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${cls} p-4 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
              </div>
              <Icon className={`w-5 h-5 ${iconCls}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none">
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select value={homeFilter} onChange={e => { setHomeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none">
            <option value="all">All Properties</option>
            {properties.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-full sm:w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search maintenance..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <span className="text-xs font-medium text-slate-400 hidden lg:inline-block">{filtered.length} issues</span>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No maintenance issues found</p>
          <p className="text-slate-400 text-sm mt-1">There are currently no maintenance records matching your filters.</p>
          {canEdit && (
            <button onClick={onAddMaintenance} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              Add Maintenance
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginated.map(log => (
            <div key={log.id} className={`bg-white border-t-4 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow relative ${
              log.priority === "urgent" ? "border-t-red-500 border-l border-r border-b border-red-100" :
              log.priority === "high" ? "border-t-amber-400 border-l border-r border-b border-slate-200" : "border-slate-200"
            }`}>
              <div className="flex items-start justify-between mb-2">
                <Badge className={`text-[10px] uppercase font-bold tracking-wider ${PRIORITY_COLORS[log.priority] || "bg-slate-100 text-slate-500"}`}>
                  {log.priority || "Low"} Priority
                </Badge>
                <Badge className={`text-[10px] ${STATUS_COLORS[log.status] || "bg-slate-100 text-slate-500"}`}>
                  {STATUS_LABEL[log.status] || log.status}
                </Badge>
              </div>
              <p className="font-semibold text-sm text-slate-900 mt-2 line-clamp-1" title={log.title}>{log.title}</p>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">{log.description || "No description provided."}</p>
              
              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p className="flex justify-between"><span className="text-slate-400">Property:</span> <span className="font-medium text-slate-800">{log.home_name || "—"}</span></p>
                <p className="flex justify-between"><span className="text-slate-400">Category:</span> <span className="capitalize">{(log.category || "—").replace(/_/g, " ")}</span></p>
                <p className="flex justify-between"><span className="text-slate-400">Reported:</span> <span>{log.date_reported || "—"}</span></p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-800">{log.cost ? `£${log.cost.toLocaleString()}` : "Cost TBC"}</p>
                {canEdit && log.status !== "completed" && log.status !== "cancelled" && (
                  <button
                    onClick={() => markCompleted(log)}
                    disabled={updatingId === log.id}
                    className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 font-medium rounded border border-green-200 flex items-center gap-1"
                  >
                    {updatingId === log.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Complete
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Issue</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Reported</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Contractor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Est. Cost</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{log.home_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-[160px]">
                    <p className="truncate">{log.title}</p>
                    {log.description && <p className="text-slate-400 truncate">{log.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell capitalize">{(log.category || "—").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs capitalize ${PRIORITY_COLORS[log.priority] || "bg-slate-100 text-slate-500"}`}>
                      {log.priority || "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{log.date_reported || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{log.contractor || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 text-right hidden lg:table-cell">
                    {log.cost ? `£${log.cost.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${STATUS_COLORS[log.status] || "bg-slate-100 text-slate-500"}`}>
                      {STATUS_LABEL[log.status] || log.status}
                    </Badge>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      {log.status !== "completed" && log.status !== "cancelled" && (
                        <button
                          onClick={() => markCompleted(log)}
                          disabled={updatingId === log.id}
                          className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1 whitespace-nowrap"
                        >
                          {updatingId === log.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Complete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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