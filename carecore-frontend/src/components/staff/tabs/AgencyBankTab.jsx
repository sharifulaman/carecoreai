import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { useModuleActions } from "@/lib/PermissionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, LayoutGrid, List, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import AgencyBankUsageForm from "../AgencyBankUsageForm";

export default function AgencyBankTab({ staff, homes, isAdminOrTL }) {
  const qc = useQueryClient();
  const { canAdd, canEdit, canDelete } = useModuleActions("staff", {
    canAdd: isAdminOrTL,
    canEdit: isAdminOrTL,
    canDelete: isAdminOrTL
  });
  const [showForm, setShowForm] = useState(false);
  const [editingUsage, setEditingUsage] = useState(null);
  const [search, setSearch] = useState("");
  const [filterHome, setFilterHome] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("agencyBankViewMode") || "list");

  useEffect(() => {
    localStorage.setItem("agencyBankViewMode", viewMode);
  }, [viewMode]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const { data: usages = [] } = useQuery({
    queryKey: ["agency-bank-usage"],
    queryFn: () => secureGateway.filter("AgencyBankStaffUsage", {}),
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => secureGateway.delete("AgencyBankStaffUsage", id),
    onSuccess: () => {
      toast.success("Record deleted");
      qc.invalidateQueries({ queryKey: ["agency-bank-usage"] });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const TYPES = [...new Set(usages.map(u => u.agency_bank_type).filter(Boolean))];
  const STATUSES = [...new Set(usages.map(u => u.status).filter(Boolean))];
  const ROLES = [...new Set(usages.map(u => u.role).filter(Boolean))];

  const filtered = usages.filter(u => {
    const q = search.toLowerCase();
    if (q && !u.worker_name_or_reference?.toLowerCase().includes(q) && !u.agency_organisation_name?.toLowerCase().includes(q)) return false;
    if (filterHome !== "all" && u.shift_home_name !== filterHome) return false;
    if (filterType !== "all" && u.agency_bank_type !== filterType) return false;
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    if (filterRole !== "all" && u.role !== filterRole) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedUsages = filtered.sort((a, b) => (b.usage_date || b.created_date)?.localeCompare(a.usage_date || a.created_date)).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Agency & Bank Staff Usage</h3>
          <p className="text-xs text-muted-foreground mt-1">Track temporary staffing usage (counts usage events, not individuals)</p>
        </div>
        {canAdd && (
          <Button onClick={() => { setEditingUsage(null); setShowForm(true); }} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create Agency/Bank
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <select value={filterHome} onChange={e => { setFilterHome(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[120px]">
            <option value="all">All Homes</option>
            {homes?.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
          </select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[120px]">
            <option value="all">All Types</option>
            {TYPES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[120px]">
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }} className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 bg-white min-w-[120px]">
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 shrink-0 w-full xl:w-auto justify-between xl:justify-end">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
              placeholder="Search staff, agencies..." 
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500" 
            />
          </div>
          <span className="text-xs font-medium text-slate-400 hidden lg:inline-block whitespace-nowrap">{filtered.length} records</span>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          No records match your filters.
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {paginatedUsages.map(usage => (
            <div key={usage.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold">{usage.worker_name_or_reference}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-transparent ${usage.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {usage.status === 'active' ? 'Active' : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{usage.agency_bank_type} • {usage.agency_organisation_name}</p>
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex items-center gap-1">
                    {canEdit && <Button variant="ghost" size="sm" onClick={() => { setEditingUsage(usage); setShowForm(true); }} className="text-xs h-7">Edit</Button>}
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(usage.id)} className="text-red-600 hover:text-red-700 h-7">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Date Used:</span>
                  <p className="font-medium">{usage.usage_date ? new Date(usage.usage_date).toLocaleDateString("en-GB") : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Home:</span>
                  <p className="font-medium">{usage.shift_home_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hours Worked:</span>
                  <p className="font-medium">{usage.hours_worked || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>
                  <p className="font-medium capitalize">{usage.role || "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Reason:</span>
                  <p className="font-medium capitalize">{usage.reason_used?.replace(/_/g, " ") || "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="px-5 py-3 border border-slate-200 flex items-center justify-between bg-slate-50/50 mt-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-medium">
            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </span>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm bg-white"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(n => (
              <button 
                key={n} 
                onClick={() => setPage(n)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                  n === page 
                    ? "bg-blue-600 text-white border border-blue-600" 
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {n}
              </button>
            ))}
            
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <AgencyBankUsageForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingUsage(null);
          }}
          usage={editingUsage}
          onSave={() => qc.invalidateQueries({ queryKey: ["agency-bank-usage"] })}
        />
      )}
    </div>
  );
}