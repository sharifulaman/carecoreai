import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { subDays, format } from "date-fns";
import { Shield, Download, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import IncidentHubFilters from "./IncidentHubFilters";
import IncidentHubKPIs from "./IncidentHubKPIs";
import IncidentTimelineBoard from "./IncidentTimelineBoard";
import IncidentHubSidebar from "./IncidentHubSidebar";
import IncidentHubAnalytics from "./IncidentHubAnalytics";
import HomeRiskOverview from "./HomeRiskOverview";
import HomeRiskHeatmap from "./HomeRiskHeatmap";
import OfstedReportConfirmModal from "./OfstedReportConfirmModal";
import IncidentKPIDetailModal from "./IncidentKPIDetailModal";
import { getIncidentSeverity, getOfstedStatus } from "@/lib/incidentAnalytics";

export default function IncidentIntelligenceHub({ ofstedNotifications: propNotifs }) {
  const [filters, setFilters] = useState({
    dateFrom: subDays(new Date(), 30),
    dateTo: new Date(),
    homeIds: [],
    incidentType: "all",
    severity: "all",
    status: "all",
    reg27Only: false,
    search: "",
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showNotifQueue, setShowNotifQueue] = useState(false);
  const [kpiModal, setKpiModal] = useState(null);

  // Fetch all homes (tenant-wide)
  const { data: homes = [], isLoading: homesLoading } = useQuery({
    queryKey: ["iih-homes"],
    queryFn: () => base44.entities.Home.filter({ status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all incidents (tenant-wide, sorted by date desc, high limit)
  const { data: allIncidents = [], isLoading: incidentsLoading, isError: incidentsError, refetch } = useQuery({
    queryKey: ["iih-incidents"],
    queryFn: () => base44.entities.Incident.filter({}, "-incident_datetime", 500),
    staleTime: 60 * 1000,
  });

  // Fetch all Ofsted notifications (if not passed as prop)
  const { data: ofstedNotifications = propNotifs || [] } = useQuery({
    queryKey: ["iih-ofsted-notifs"],
    queryFn: () => base44.entities.OfstedNotification.filter({}, "-created_date", 200),
    staleTime: 60 * 1000,
    enabled: !propNotifs,
  });

  // Apply all filters
  const filteredIncidents = useMemo(() => {
    let list = allIncidents;

    // Date range
    const fromStr = format(filters.dateFrom, "yyyy-MM-dd");
    const toStr = format(filters.dateTo, "yyyy-MM-dd");
    list = list.filter(i => {
      if (!i.incident_datetime) return false;
      const d = i.incident_datetime.slice(0, 10);
      return d >= fromStr && d <= toStr;
    });

    // Home filter
    if (filters.homeIds.length > 0) {
      list = list.filter(i => filters.homeIds.includes(i.home_id));
    }

    // Incident type
    if (filters.incidentType !== "all") {
      list = list.filter(i => i.incident_type === filters.incidentType);
    }

    // Severity
    if (filters.severity !== "all") {
      list = list.filter(i => getIncidentSeverity(i) === filters.severity);
    }

    // Status
    if (filters.status !== "all") {
      list = list.filter(i => i.status === filters.status);
    }

    // Reg 27 toggle
    if (filters.reg27Only) {
      list = list.filter(i => i.reg27_trigger);
    }

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(i =>
        i.id?.toLowerCase().includes(q) ||
        i.home_name?.toLowerCase().includes(q) ||
        i.resident_name?.toLowerCase().includes(q) ||
        i.incident_type?.toLowerCase().includes(q) ||
        i.recorded_by_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allIncidents, filters]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Incident ID", "Date", "Home", "Resident", "Type", "Severity", "Status", "Ofsted", "Resolution Hours"];
    const rows = filteredIncidents.map(i => [
      i.id, i.incident_datetime, i.home_name, i.resident_name,
      i.incident_type, getIncidentSeverity(i), i.status,
      getOfstedStatus(i, ofstedNotifications),
      i.status === "closed" && i.manager_review_date && i.incident_datetime
        ? Math.round((new Date(i.manager_review_date) - new Date(i.incident_datetime)) / (1000 * 60 * 60))
        : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incidents-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleHomeClick = (homeId) => {
    setFilters(p => ({ ...p, homeIds: homeId ? [homeId] : [] }));
  };

  const pendingNotifs = ofstedNotifications.filter(n => ["pending", "pending_tl", "pending_tm", "pending_rsm", "overdue"].includes(n.status));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Compliance &amp; Quality</span><span>/</span>
            <span className="text-slate-800 font-medium">Ofsted</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> Incident Intelligence Hub
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Tenant-wide incident monitoring, resolution tracking and Ofsted notification readiness.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setShowReportModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Generate Ofsted Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNotifQueue(v => !v)} className="gap-1.5 relative">
            <Bell className="w-3.5 h-3.5" /> Notification Queue
            {pendingNotifs.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingNotifs.length}</span>}
          </Button>
        </div>
      </div>

      {/* Notification Queue dropdown */}
      {showNotifQueue && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Pending Ofsted Notifications ({pendingNotifs.length})</h3>
          {pendingNotifs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No pending notifications.</p>
          ) : (
            <div className="space-y-2">
              {pendingNotifs.slice(0, 10).map(n => (
                <div key={n.id} className="flex items-center gap-3 text-xs py-2 border-b border-slate-50 last:border-0">
                  <span className="font-mono text-[10px] text-slate-400">{n.id?.slice(0, 8)}</span>
                  <span className="text-slate-700 font-medium">{n.home_name || "—"}</span>
                  <span className="text-slate-500">{n.notification_type?.replace(/_/g, " ")}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${n.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{n.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <IncidentHubFilters filters={filters} setFilters={setFilters} homes={homes} />

      {/* KPIs */}
      {incidentsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <IncidentHubKPIs incidents={filteredIncidents} ofstedNotifications={ofstedNotifications} onOpenModal={(m) => setKpiModal(m)} />
      )}

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_280px] gap-4">
        {/* Left Column */}
        <div className="space-y-3">
          <HomeRiskOverview incidents={filteredIncidents} homes={homes} onHomeClick={handleHomeClick} selectedHomeIds={filters.homeIds} />
          <HomeRiskHeatmap incidents={filteredIncidents} homes={homes} onHomeClick={handleHomeClick} />
        </div>

        {/* Center Column */}
        <div>
          {incidentsError ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
              <p className="text-sm text-red-600 mb-2">Failed to load incidents.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : (
            <IncidentTimelineBoard
              incidents={filteredIncidents}
              ofstedNotifications={ofstedNotifications}
              homes={homes}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              filters={filters}
            />
          )}
        </div>

        {/* Right Column */}
        <IncidentHubSidebar
          incidents={filteredIncidents}
          ofstedNotifications={ofstedNotifications}
          homes={homes}
          onGeneratePack={() => setShowReportModal(true)}
          selectedIds={selectedIds}
          filters={filters}
        />
      </div>

      {/* Bottom Analytics */}
      <IncidentHubAnalytics incidents={filteredIncidents} ofstedNotifications={ofstedNotifications} homes={homes} />

      {/* KPI Detail Modal */}
      {kpiModal && (
        <IncidentKPIDetailModal
          title={kpiModal.title}
          icon={kpiModal.icon}
          color={kpiModal.color}
          incidents={kpiModal.list}
          ofstedNotifications={ofstedNotifications}
          homes={homes}
          onClose={() => setKpiModal(null)}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <OfstedReportConfirmModal
          incidents={filteredIncidents}
          ofstedNotifications={ofstedNotifications}
          homes={homes}
          selectedIds={selectedIds}
          filters={filters}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}