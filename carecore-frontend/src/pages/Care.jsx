import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useModuleActions } from "@/lib/PermissionContext";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Search, Plus, ChevronDown, Loader2, DatabaseZap } from "lucide-react";
import { toast } from "sonner";

import MaintenanceKPICards from "@/components/maintenance/MaintenanceKPICards";
import MaintenanceTable from "@/components/maintenance/MaintenanceTable";
import MaintenanceRightPanel from "@/components/maintenance/MaintenanceRightPanel";
import AddMaintenanceModal from "@/components/maintenance/AddMaintenanceModal";
import ScheduleMaintenanceModal from "@/components/maintenance/ScheduleMaintenanceModal";
import AddContractModal from "@/components/maintenance/AddContractModal";
import MaintenanceDetailDrawer from "@/components/maintenance/MaintenanceDetailDrawer";
import { CATEGORY_LABELS } from "@/components/maintenance/MaintenanceBadges";
import Portal from "@/components/ui/Portal";

const TABS = ["All Issues","Open","In Progress","Overdue","Completed","Cancelled","Planned","Schedules","Contracts"];
const CATEGORIES = Object.entries(CATEGORY_LABELS);
const PRIORITIES = ["low","medium","high","urgent"];
const STATUSES = ["open","reported","assigned","in_progress","awaiting_contractor","awaiting_parts","planned","completed","cancelled"];

const serviceTypeToCategory = (serviceType) => {
  if (!serviceType) return "other";
  const type = serviceType.toLowerCase();
  if (type.includes("gas")) return "gas";
  if (type.includes("electrical") || type.includes("eicr")) return "electrical";
  if (type.includes("fire")) return "fire_safety";
  if (type.includes("boiler") || type.includes("heating")) return "heating_boiler";
  if (type.includes("plumb")) return "plumbing";
  if (type.includes("pest")) return "pest_control";
  if (type.includes("clean")) return "cleaning_hygiene";
  if (type.includes("security")) return "security";
  if (type.includes("garden") || type.includes("ground")) return "garden_external";
  if (type.includes("broadband") || type.includes("utilities")) return "internet_utilities";
  if (type.includes("waste")) return "cleaning_hygiene";
  return "other";
};

export default function Care() {
  const { user, staffProfile } = useOutletContext();
  const qc = useQueryClient();
  const { canAdd } = useModuleActions("maintenance");

  const [activeTab, setActiveTab] = useState("All Issues");
  const [filterHome, setFilterHome] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [kpiFilterTab, setKpiFilterTab] = useState("");

  const { data: roleDefinitions = [] } = useQuery({ 
    queryKey: ["role-definitions"], 
    queryFn: () => base44.roles.fetchDefinitions(),
    staleTime: 5 * 60 * 1000
  });

  const roleRank = roleDefinitions.find(r => r.role_name === staffProfile?.role)?.rank 
    ?? (staffProfile?.role === "admin" ? 100 : (staffProfile?.role === "team_leader" ? 20 : 10));
    
  const isSupportWorker = roleRank <= 10;

  const { data: assignments = [] } = useQuery({
    queryKey: ['sw-assignments', staffProfile?.id],
    queryFn: () => secureGateway.filter('StaffServiceAssignment', { staff_id: staffProfile?.id, active: true }),
    enabled: !!staffProfile?.id && isSupportWorker,
  });

  const assignedHomeIds = useMemo(() => [...new Set(assignments.map(a => a.home_id))], [assignments]);

  const { data: allHomes = [] } = useQuery({
    queryKey: ["homes-maint"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  const homes = useMemo(() => {
    if (!isSupportWorker) return allHomes;
    return allHomes.filter(h => assignedHomeIds.includes(h.id));
  }, [allHomes, isSupportWorker, assignedHomeIds]);

  const { data: allIssues = [], isLoading } = useQuery({
    queryKey: ["property-maintenance", ORG_ID],
    queryFn: () => base44.entities.PropertyMaintenance.filter({ org_id: ORG_ID }, "-reported_at", 200),
    staleTime: 30 * 1000,
  });

  const issues = useMemo(() => {
    if (!isSupportWorker) return allIssues;
    return allIssues.filter(i => assignedHomeIds.includes(i.home_id));
  }, [allIssues, isSupportWorker, assignedHomeIds]);

  const { data: schedules = [] } = useQuery({
    queryKey: ["maintenance-schedules", ORG_ID],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ org_id: ORG_ID }),
    staleTime: 60 * 1000,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["maintenance-contracts", ORG_ID],
    queryFn: () => base44.entities.MaintenanceContract.filter({ org_id: ORG_ID }),
    staleTime: 60 * 1000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["property-maintenance", ORG_ID] });
    qc.invalidateQueries({ queryKey: ["maintenance-schedules", ORG_ID] });
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke("seedMaintenanceData", {});
      toast.success("Demo maintenance data seeded.");
      refresh();
    } catch (e) {
      toast.error("Seed failed: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case "Open": return issues.filter(i => ["reported","assigned","open"].includes(i.status));
      case "In Progress": return issues.filter(i => ["in_progress", "awaiting_contractor", "awaiting_parts"].includes(i.status));
      case "Overdue": return issues.filter(i => i.due_at && i.due_at.slice(0,10) < today && !["completed","cancelled"].includes(i.status));
      case "Completed": return issues.filter(i => i.status === "completed");
      case "Cancelled": return issues.filter(i => i.status === "cancelled");
      case "Planned": return issues.filter(i => i.is_planned || i.status === "planned");
      default: return issues.filter(i => i.status !== "cancelled");
    }
  }, [issues, activeTab, today]);

  const filtered = useMemo(() => {
    let r = tabFiltered;
    if (filterHome) r = r.filter(i => i.home_id === filterHome);
    if (filterCategory) r = r.filter(i => i.category === filterCategory);
    if (filterPriority) r = r.filter(i => i.priority === filterPriority);
    if (filterStatus) r = r.filter(i => i.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        (i.issue_title || "").toLowerCase().includes(q) ||
        (i.issue_reference || "").toLowerCase().includes(q) ||
        (i.home_name || "").toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q) ||
        (i.assigned_to_name || "").toLowerCase().includes(q) ||
        (i.contractor_name || "").toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [tabFiltered, filterHome, filterCategory, filterPriority, filterStatus, search]);

  const filteredSchedules = useMemo(() => {
    /** @type {any[]} */
    let r = schedules;
    if (filterHome) r = r.filter(s => s.home_id === filterHome);
    if (filterCategory) r = r.filter(s => s.category === filterCategory);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(s =>
        (s.title || s.schedule_title || "").toLowerCase().includes(q) ||
        (s.assigned_to_name || s.contractor_name || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [schedules, filterHome, filterCategory, search]);

  const filteredContracts = useMemo(() => {
    let r = contracts;
    if (filterHome) {
      r = r.filter(c => c.applies_to_all_homes || c.home_id === filterHome);
    }
    if (filterCategory) {
      r = r.filter(c => c.service_type === filterCategory || serviceTypeToCategory(c.service_type) === filterCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        (c.contractor_name || "").toLowerCase().includes(q) ||
        (c.service_type || "").toLowerCase().includes(q) ||
        (c.contact_name || "").toLowerCase().includes(q) ||
        (c.notes || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [contracts, filterHome, filterCategory, search]);

  const resetPage = () => setPage(1);
  const isAdmin = user?.role === "admin" || user?.role === "admin_officer";

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track, manage and resolve maintenance issues across all homes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!isSupportWorker && (
            <div className="relative">
              <button
                onClick={() => setQuickActionsOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                ⚡ Quick Actions <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {quickActionsOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-20 py-1" onMouseLeave={() => setQuickActionsOpen(false)}>
                  {[
                    ...(canAdd ? [
                      { label: "Report Issue", action: () => { setShowAddModal(true); setQuickActionsOpen(false); } },
                      { label: "Schedule Maintenance", action: () => { setShowScheduleModal(true); setQuickActionsOpen(false); } },
                    ] : []),
                    { label: "View Contracts", action: () => { setActiveTab("Contracts"); setQuickActionsOpen(false); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {canAdd && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Add Maintenance
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <MaintenanceKPICards 
        issues={issues} 
        onCardClick={(cardTitle) => {
          if (cardTitle === "Open Issues") setActiveTab("Open");
          else if (cardTitle === "In Progress") setActiveTab("In Progress");
          else if (cardTitle === "Overdue") setActiveTab("Overdue");
          else if (cardTitle === "Completed This Month") setActiveTab("Completed");
        }}
      />

      {/* Main content */}
      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            {/* Tabs */}
            <div className="overflow-x-auto border-b border-slate-100 scrollbar-none">
              <div className="flex min-w-max">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); resetPage(); }}
                    className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedules Tab */}
            {activeTab === "Schedules" ? (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
                  <select value={filterHome} onChange={e => { setFilterHome(e.target.value); resetPage(); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="">All Homes</option>
                    {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); resetPage(); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="">All Categories</option>
                    {CATEGORIES.map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5 ml-auto w-full md:w-64 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); resetPage(); }}
                      placeholder="Search schedules..."
                      className="text-xs text-slate-600 focus:outline-none bg-transparent flex-1 min-w-0"
                    />
                  </div>
                </div>
               
               <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700">Maintenance Schedules</h3>
                    {canAdd && !isSupportWorker && (
                      <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus className="w-3.5 h-3.5" /> Add Schedule
                      </button>
                    )}
                  </div> 
                  {filteredSchedules.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="font-medium">No schedules found</p>
                      <p className="text-sm mt-1">Add recurring or planned maintenance schedules here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            {["Title","Category","Frequency","Next Due","Assigned To","Cost","Status"].map(h => (
                              <th key={h} className="text-left text-xs font-semibold text-slate-500 py-3 px-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSchedules.map(s => (
                            <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedSchedule(s)}>
                              <td className="py-3 px-3 font-medium text-slate-800 text-xs">{s.title || s.schedule_title}</td>
                              <td className="py-3 px-3 text-xs text-slate-600">{s.category || "—"}</td>
                              <td className="py-3 px-3 text-xs text-slate-600 capitalize">{s.frequency?.replace(/_/g," ") || "—"}</td>
                              <td className="py-3 px-3 text-xs text-slate-600">{s.next_due_date || s.next_due_at?.slice(0,10) || "—"}</td>
                              <td className="py-3 px-3 text-xs text-slate-600">{s.assigned_to_name || s.contractor_name || "—"}</td>
                              <td className="py-3 px-3 text-xs text-slate-600 font-medium">{s.estimated_cost ? `£${Number(s.estimated_cost).toLocaleString()}` : "—"}</td>
                              <td className="py-3 px-3">
                                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                                  s.status === "active" ? "bg-green-100 text-green-700" :
                                  s.status === "paused" ? "bg-amber-100 text-amber-700" :
                                  "bg-slate-100 text-slate-500"
                                }`}>
                                  {s.status || "active"}
                                </span>
                              </td>
                            </tr>
                          ))}                            
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === "Contracts" ? (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
                  <select value={filterHome} onChange={e => { setFilterHome(e.target.value); resetPage(); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="">All Homes</option>
                    {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); resetPage(); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="">All Categories</option>
                    {CATEGORIES.map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5 ml-auto w-full md:w-64 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); resetPage(); }}
                      placeholder="Search contracts..."
                      className="text-xs text-slate-600 focus:outline-none bg-transparent flex-1 min-w-0"
                    />
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700">Maintenance Contracts</h3>
                    {canAdd && !isSupportWorker && (
                      <button onClick={() => setShowContractModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus className="w-3.5 h-3.5" /> Add Contract
                      </button>
                    )}
                  </div>
                  {filteredContracts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="font-medium">No contracts found</p>
                      <p className="text-sm mt-1">Add supplier/contractor contracts here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            {["Contractor","Service Type","Start","End","Cost","Status","Contact"].map(h => (
                              <th key={h} className="text-left text-xs font-semibold text-slate-500 py-3 px-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContracts.map(c => (
                            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-3 px-3 font-medium text-slate-800 text-xs">{c.contractor_name}</td>
                              <td className="py-3 px-3 text-xs text-slate-600">{c.service_type}</td>
                              <td className="py-3 px-3 text-xs text-slate-600">{c.contract_start_date || "—"}</td>
                              <td className="py-3 px-3 text-xs text-slate-600">{c.contract_end_date || "—"}</td>
                              <td className="py-3 px-3 text-xs text-slate-700 font-medium">{c.cost_amount ? `£${c.cost_amount.toLocaleString()}/${c.cost_frequency}` : "—"}</td>
                              <td className="py-3 px-3">
                                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-600">{c.contact_name || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Filters */}
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
                  <select value={filterHome} onChange={e => { setFilterHome(e.target.value); resetPage(); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="">All Homes</option>
                    {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); resetPage(); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="">All Categories</option>
                    {CATEGORIES.map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); resetPage(); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="">All Priorities</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); resetPage(); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5 ml-auto w-full md:w-64 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); resetPage(); }}
                      placeholder="Search issues..."
                      className="text-xs text-slate-600 focus:outline-none bg-transparent flex-1 min-w-0"
                    />
                  </div>
                </div>

                {isLoading || seeding ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    {seeding && <span className="ml-2 text-sm text-slate-500">Seeding data...</span>}
                  </div>
                ) : (
                  <MaintenanceTable
                    issues={filtered}
                    onRowClick={setSelectedIssue}
                    page={page}
                    setPage={setPage}
                    pageSize={8}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 hidden xl:block">
          <MaintenanceRightPanel
            issues={issues}
            schedules={schedules}
            onAddIssue={() => setShowAddModal(true)}
            onSchedule={() => setShowScheduleModal(true)}
            onUploadEvidence={() => toast.info("Open an issue and use the evidence upload in the detail drawer.")}
            onViewContracts={() => setActiveTab("Contracts")}
            onViewSchedules={() => setActiveTab("Schedules")}
            onViewAllIssues={() => setActiveTab("All Issues")}
            isSupportWorker={isSupportWorker}
          />
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddMaintenanceModal homes={homes} user={user} staffProfile={staffProfile} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); refresh(); }} />
      )}
      {showScheduleModal && (
        <ScheduleMaintenanceModal homes={homes} user={user} staffProfile={staffProfile} onClose={() => setShowScheduleModal(false)} onSuccess={() => { setShowScheduleModal(false); refresh(); }} />
      )}
      {showContractModal && (
        <AddContractModal homes={homes} onClose={() => setShowContractModal(false)} onSuccess={() => { setShowContractModal(false); qc.invalidateQueries({ queryKey: ["maintenance-contracts", ORG_ID] }); }} />
      )}

      {/* Detail Drawer */}
      {selectedIssue && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedIssue(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 bg-white shadow-2xl border-l border-slate-200 overflow-hidden">
            <MaintenanceDetailDrawer
              issue={selectedIssue}
              user={user}
              staffProfile={staffProfile}
              onClose={() => setSelectedIssue(null)}
              onRefresh={() => {
                refresh();
                setSelectedIssue(null);
              }}
              canEdit={canAdd && !isSupportWorker}
            />
          </div>
        </Portal>
      )}
    </div>
  );
}