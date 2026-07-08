import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { Search, RefreshCw, Eye, Upload, RotateCcw, UserPlus, FileEdit, Plus, Download, Calendar, Loader2, DatabaseZap } from "lucide-react";
import { toast } from "sonner";

import LocationAssessmentSection from "@/components/homes/tabs/LocationAssessmentSection";
import ComplianceKPICards from "@/components/compliance-hub/ComplianceKPICards";
import ComplianceRiskPanel from "@/components/compliance-hub/ComplianceRiskPanel";
import ComplianceActivityTimeline from "@/components/compliance-hub/ComplianceActivityTimeline";
import ComplianceItemDrawer from "@/components/compliance-hub/ComplianceItemDrawer";
import { AddComplianceModal, AuditReviewModal, UploadEvidenceModal, RenewalModal, AddNoteModal } from "@/components/compliance-hub/ComplianceModals";

const CATEGORIES = [
  ["gas_safety","Gas Safety"],["electrical_safety","Electrical Safety"],["fire_safety","Fire Safety"],
  ["water_safety","Water Safety"],["emergency_lighting","Emergency Lighting"],["insurance","Insurance"],
  ["property_licence","Property Licence"],["local_authority","Local Authority"],["health_safety","Health & Safety"],
  ["risk_assessment","Risk Assessment"],["staff_compliance","Staff Compliance"],["yp_resident_records","YP / Resident Records"],
  ["audit_visit","Audit Visit"],["policy_review","Policy Review"],["maintenance_compliance","Maintenance Compliance"],["other","Other"]
];

const STATUS_CFG = {
  current:{ label:"Current", cls:"bg-green-100 text-green-700" },
  expired:{ label:"Expired", cls:"bg-red-100 text-red-700" },
  due_in_30:{ label:"Due in 30 Days", cls:"bg-amber-100 text-amber-700" },
  due_in_90:{ label:"Due in 90 Days", cls:"bg-yellow-100 text-yellow-700" },
  review_required:{ label:"Review Required", cls:"bg-blue-100 text-blue-700" },
  missing_evidence:{ label:"Missing Evidence", cls:"bg-orange-100 text-orange-700" },
  renewal_requested:{ label:"Renewal Requested", cls:"bg-purple-100 text-purple-700" },
  assigned:{ label:"Assigned", cls:"bg-teal-100 text-teal-700" },
  closed:{ label:"Closed", cls:"bg-slate-100 text-slate-500" },
};

const PRIORITY_CFG = {
  critical:{ label:"Critical", cls:"bg-red-100 text-red-700" },
  high:{ label:"High", cls:"bg-orange-100 text-orange-700" },
  medium:{ label:"Medium", cls:"bg-yellow-100 text-yellow-700" },
  review:{ label:"Review", cls:"bg-blue-100 text-blue-700" },
  current:{ label:"Current", cls:"bg-green-100 text-green-700" },
};

const PRIORITY_ORDER = { critical:0, high:1, medium:2, review:3, current:4 };

function calcPriority(item) {
  if (!item.expiry_date) return item.priority || "current";
  const days = Math.round((new Date(item.expiry_date) - new Date()) / 86400000);
  if (days < -30) return "critical";
  if (days < 0) return "high";
  if (days <= 14) return "high";
  if (days <= 30) return "medium";
  if (days <= 90) return "review";
  return "current";
}

function calcStatus(item) {
  if (item.manual_status_override) return item.status;
  if (!item.expiry_date) return item.status || "current";
  const days = Math.round((new Date(item.expiry_date) - new Date()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "due_in_30";
  if (days <= 90) return "due_in_90";
  return "current";
}

const PAGE_SIZE = 10;

export default function ComplianceAuditsTab({ homes, staffProfile, selectedHome }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterHome, setFilterHome] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [kpiFilter, setKpiFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(null); // add | audit | upload | renew | note
  const [actionItem, setActionItem] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["compliance-items", ORG_ID],
    queryFn: () => base44.entities.ComplianceItem.filter({ org_id: ORG_ID }, "-created_date", 300),
    staleTime: 30 * 1000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["compliance-tasks-all", ORG_ID],
    queryFn: () => base44.entities.ComplianceTask.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 60 * 1000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["compliance-events", ORG_ID],
    queryFn: () => base44.entities.ComplianceActivityEvent.filter({ org_id: ORG_ID }, "-event_datetime", 50),
    staleTime: 30 * 1000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["compliance-items", ORG_ID] });
    qc.invalidateQueries({ queryKey: ["compliance-tasks-all", ORG_ID] });
    qc.invalidateQueries({ queryKey: ["compliance-events", ORG_ID] });
  };

  const today = new Date();

  // Enrich items with computed priority/status
  const enriched = useMemo(() => items.map(i => ({
    ...i,
    _priority: calcPriority(i),
    _status: calcStatus(i),
    _days: i.expiry_date ? Math.round((new Date(i.expiry_date) - today) / 86400000) : null,
  })), [items]);

  // KPI counts
  const counts = useMemo(() => ({
    critical: enriched.filter(i => i._priority === "critical").length,
    expired: enriched.filter(i => i._status === "expired").length,
    due30: enriched.filter(i => i._status === "due_in_30").length,
    due90: enriched.filter(i => i._status === "due_in_90").length,
    current: enriched.filter(i => i._status === "current").length,
    audit: tasks.filter(t => t.status !== "completed" && t.status !== "closed").length,
  }), [enriched, tasks]);

  // My tasks
  const myTasks = useMemo(() => tasks.filter(t =>
    t.assigned_to_name === staffProfile?.full_name && t.status !== "completed" && t.status !== "closed"
  ), [tasks, staffProfile]);

  // Filtering
  const filtered = useMemo(() => {
    let r = enriched;
    if (kpiFilter === "critical") r = r.filter(i => i._priority === "critical");
    else if (kpiFilter === "expired") r = r.filter(i => i._status === "expired");
    else if (kpiFilter === "due30") r = r.filter(i => i._status === "due_in_30");
    else if (kpiFilter === "due90") r = r.filter(i => i._status === "due_in_90");
    else if (kpiFilter === "current") r = r.filter(i => i._status === "current");
    else if (kpiFilter === "audit") r = r;

    if (filterHome) r = r.filter(i => i.home_id === filterHome);
    if (filterCategory) r = r.filter(i => i.category === filterCategory);
    if (filterStatus) r = r.filter(i => i._status === filterStatus);
    if (filterPriority) r = r.filter(i => i._priority === filterPriority);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        (i.item_name||"").toLowerCase().includes(q) ||
        (i.home_name||"").toLowerCase().includes(q) ||
        (i.category||"").toLowerCase().includes(q) ||
        (i.owner_name||"").toLowerCase().includes(q) ||
        (i.notes||"").toLowerCase().includes(q)
      );
    }
    // Sort by urgency
    return [...r].sort((a, b) => (PRIORITY_ORDER[a._priority]??5) - (PRIORITY_ORDER[b._priority]??5));
  }, [enriched, kpiFilter, filterHome, filterCategory, filterStatus, filterPriority, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch(""); setFilterHome(""); setFilterCategory(""); setFilterStatus(""); setFilterPriority(""); setKpiFilter(null); setPage(1);
  };

  const handleKpiFilter = (key) => { setKpiFilter(key); setPage(1); };
  const handleFilterHome = (homeId) => { setFilterHome(homeId||""); setPage(1); };

  const handleAuditRun = async () => {
    const now = new Date();
    for (const item of items) {
      const status = calcStatus(item);
      const priority = calcPriority(item);
      await base44.entities.ComplianceItem.update(item.id, { status, priority });
    }
    await base44.entities.ComplianceActivityEvent.create({ org_id: ORG_ID, event_type:"audit_review_run", event_title:"Compliance audit review completed", performed_by_name: staffProfile?.full_name||"Admin", event_datetime: now.toISOString() });
    toast.success("Compliance audit review completed successfully.");
    refresh();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke("seedComplianceAuditData", {});
      toast.success("Demo compliance data seeded.");
      refresh();
    } catch (e) {
      toast.error("Seed failed: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const openAction = (type, item) => { setActionItem(item); setModalType(type); };
  const closeModal = () => { setModalType(null); setActionItem(null); };
  const onModalSuccess = () => { closeModal(); refresh(); };

  const getDaysDisplay = (days) => {
    if (days === null) return <span className="text-slate-400">—</span>;
    if (days < 0) return <span className="text-red-600 font-bold">{Math.abs(days)}d overdue</span>;
    if (days <= 30) return <span className="text-amber-600 font-semibold">{days} days</span>;
    if (days <= 90) return <span className="text-yellow-600 font-semibold">{days} days</span>;
    return <span className="text-green-600">{days} days</span>;
  };

  const isAdmin = staffProfile?.role === "admin" || staffProfile?.role === "admin_officer" || staffProfile?.role === "team_leader";

  return (
    <div className="p-5 space-y-5 bg-slate-50 min-h-screen">
      {/* ── Location Assessment (top of tab) ── */}
      {selectedHome && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <LocationAssessmentSection home={selectedHome} staffProfile={staffProfile} homes={homes} />
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Compliance & Audit Control Centre</h1>
          <p className="text-xs text-slate-500 mt-0.5">Monitor statutory certificates, home checks, audit actions, policy reviews and compliance risks across all homes.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
         
          <button onClick={() => toast.info("Export feature: use browser print or CSV export.")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
          <button onClick={() => toast.info("Calendar view — coming soon.")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
            <Calendar className="w-3.5 h-3.5" /> View Calendar
          </button>
          <button onClick={() => setModalType("audit")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Run Audit Review
          </button>
          <button onClick={() => setModalType("add")} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Compliance Item
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <ComplianceKPICards counts={counts} activeFilter={kpiFilter} onFilter={handleKpiFilter} />

      {/* ── Main content + right panel ── */}
      <div className="flex gap-5 items-start">
        {/* Left: Compliance Register */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 mb-3">Compliance Register</h2>
              {/* Filter bar */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search item or home..." className="text-xs text-slate-600 focus:outline-none bg-transparent flex-1 min-w-0" />
                </div>
                <select value={filterHome} onChange={e=>{setFilterHome(e.target.value);setPage(1);}} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white">
                  <option value="">All Homes</option>
                  {homes.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <select value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);setPage(1);}} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white">
                  <option value="">All Categories</option>
                  {CATEGORIES.map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
                <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white">
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterPriority} onChange={e=>{setFilterPriority(e.target.value);setPage(1);}} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white">
                  <option value="">All Priorities</option>
                  {Object.entries(PRIORITY_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50">
                  <RefreshCw className="w-3 h-3" /> Reset Filters
                </button>
              </div>
            </div>

            {/* Table */}
            {isLoading || seeding ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>{["Priority","Document / Item","Home","Category","Expiry Date","Days Remaining","Owner","Status","Actions"].map(h=>(
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">No compliance items found.</td></tr>
                    ) : pageItems.map(item => {
                      const prCfg = PRIORITY_CFG[item._priority] || PRIORITY_CFG.current;
                      const stCfg = STATUS_CFG[item._status] || STATUS_CFG.current;
                      return (
                        <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={()=>setSelectedItem(item)}>
                          <td className="px-3 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${prCfg.cls}`}>{prCfg.label}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-xs font-medium text-slate-800">{item.item_name}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">{item.home_name||"—"}</td>
                          <td className="px-3 py-3 text-xs text-slate-500 capitalize">{item.category?.replace(/_/g," ")||"—"}</td>
                          <td className="px-3 py-3 text-xs text-slate-600">{item.expiry_date ? format(new Date(item.expiry_date),"dd MMM yyyy") : "—"}</td>
                          <td className="px-3 py-3 text-xs">{getDaysDisplay(item._days)}</td>
                          <td className="px-3 py-3 text-xs text-slate-500">{item.owner_name||"—"}</td>
                          <td className="px-3 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${stCfg.cls}`}>{stCfg.label}</span>
                          </td>
                          <td className="px-3 py-3" onClick={e=>e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button title="View" onClick={()=>setSelectedItem(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                              <button title="Upload Evidence" onClick={()=>openAction("upload",item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><Upload className="w-3.5 h-3.5" /></button>
                              <button title="Request Renewal" onClick={()=>openAction("renew",item)} className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"><RotateCcw className="w-3.5 h-3.5" /></button>
                              <button title="Add Note / Edit" onClick={()=>openAction("note",item)} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"><FileEdit className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-400">Showing {Math.min((page-1)*PAGE_SIZE+1,filtered.length)}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length} items</span>
              <div className="flex items-center gap-1">
                <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 text-xs">‹</button>
                {Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(p=>(
                  <button key={p} onClick={()=>setPage(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-medium ${page===p?"bg-teal-600 text-white border-teal-600":"border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{p}</button>
                ))}
                <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 text-xs">›</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 hidden lg:block">
          <ComplianceRiskPanel items={enriched} homes={homes} myTasks={myTasks} onFilterHome={handleFilterHome} onFilterDue={handleKpiFilter} />
        </div>
      </div>

      {/* ── Activity Timeline ── */}
      <ComplianceActivityTimeline events={events} />

      {/* ── Modals ── */}
      {modalType === "add" && <AddComplianceModal homes={homes} user={staffProfile} staffList={[]} onClose={closeModal} onSuccess={onModalSuccess} />}
      {modalType === "audit" && <AuditReviewModal onClose={closeModal} onRun={handleAuditRun} />}
      {modalType === "upload" && actionItem && <UploadEvidenceModal item={actionItem} user={staffProfile} onClose={closeModal} onSuccess={onModalSuccess} />}
      {modalType === "renew" && actionItem && <RenewalModal item={actionItem} user={staffProfile} onClose={closeModal} onSuccess={onModalSuccess} />}
      {modalType === "note" && actionItem && <AddNoteModal item={actionItem} user={staffProfile} onClose={closeModal} onSuccess={onModalSuccess} />}

      {/* ── Item Drawer ── */}
      {selectedItem && <ComplianceItemDrawer item={selectedItem} onClose={()=>setSelectedItem(null)} />}
    </div>
  );
}