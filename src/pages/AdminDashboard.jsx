import { useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";

// Dashboard sub-components
import DashboardFilterBar from "../components/dashboard/DashboardFilterBar";
import FinancialSection from "../components/dashboard/FinancialSection";
import RiskSection from "../components/dashboard/RiskSection";
import IncidentsSection from "../components/dashboard/IncidentsSection";
import OperationsSection from "../components/dashboard/OperationsSection";
import StaffCapacitySection from "../components/dashboard/StaffCapacitySection";
import AIInsightsPanel from "../components/dashboard/AIInsightsPanel";
import StatCard from "../components/dashboard/StatCard";
import StatDetailModal from "../components/dashboard/StatDetailModal";
import OfstedReadinessScore from "../components/compliance/OfstedReadinessScore";
import QuickActionButtons from "../components/compliance/QuickActionButtons";
import InspectionMode from "../components/compliance/InspectionMode";
import ScoringRulesModal from "../components/compliance/ScoringRulesModal";

import { Users, Home, FileText, AlertTriangle, Shield, ClipboardList, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppointmentStatsWidget from "../components/dashboard/AppointmentStatsWidget";
import AppointmentComplianceReport from "../components/residents/appointments/AppointmentComplianceReport";

export default function AdminDashboard() {
  const { user, staffProfile } = useOutletContext();
  const queryClient = useQueryClient();
  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isAdmin = staffRole === "admin";

  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [homeFilter, setHomeFilter] = useState("all");
  const [dateRangeStart, setDateRangeStart] = useState(0); // January
  const [dateRangeEnd, setDateRangeEnd] = useState(new Date().getMonth());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [modal, setModal] = useState(null);
  const [showComplianceReport, setShowComplianceReport] = useState(false);
  const [inspectionMode, setInspectionMode] = useState(false);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries();
    setLastUpdated(new Date().toLocaleTimeString("en-GB"));
  }, [queryClient]);

  // Data fetching
  const { data: allHomes = [] } = useQuery({
    queryKey: ["homes-dashboard"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-dashboard"],
    queryFn: () => secureGateway.filter("Resident", {}, "-created_date", 500),
    staleTime: 0,
  });

  const { data: placements = [] } = useQuery({
    queryKey: ["placements-dashboard"],
    queryFn: () => secureGateway.filter("PlacementFee", { status: "active" }),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-dashboard"],
    queryFn: () => secureGateway.filter("PlacementInvoice"),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["bills-dashboard"],
    queryFn: () => secureGateway.filter("Bill"),
  });

  const { data: pettyCashTx = [] } = useQuery({
    queryKey: ["petty-cash-tx-dashboard"],
    queryFn: () => secureGateway.filter("PettyCashTransaction", {}, "-date", 500),
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ["daily-logs-dashboard"],
    queryFn: () => secureGateway.filter("DailyLog", {}, "-date", 200),
  });

  const { data: flaggedLogs = [] } = useQuery({
    queryKey: ["flagged-logs"],
    queryFn: () => secureGateway.filter("DailyLog", { flagged: true }, "-date", 50),
  });

  const { data: accidentReports = [] } = useQuery({
    queryKey: ["accidents-dashboard"],
    queryFn: () => secureGateway.filter("AccidentReport", {}, "-date", 100),
  });

  const { data: homeChecks = [] } = useQuery({
    queryKey: ["home-checks-dashboard"],
    queryFn: () => secureGateway.filter("HomeCheck", {}, "-date", 100),
  });

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ["maintenance-dashboard"],
    queryFn: () => secureGateway.filter("MaintenanceLog", {}, "-reported_date", 100),
  });

  const { data: transitions = [] } = useQuery({
    queryKey: ["transitions-dashboard"],
    queryFn: () => secureGateway.filter("Transition"),
  });

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: () => secureGateway.filter("StaffProfile"),
  });

  const { data: dashboardAppointments = [] } = useQuery({
    queryKey: ["dashboard-appointments"],
    queryFn: () => secureGateway.filter("Appointment", {}, "-start_datetime", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: mfhRecords = [] } = useQuery({
    queryKey: ["mfh-records"],
    queryFn: () => base44.entities.MissingFromHome.filter({}, "-reported_missing_datetime", 200),
  });

  const { data: bodyMaps = [] } = useQuery({
    queryKey: ["body-maps"],
    queryFn: () => base44.entities.BodyMap.filter({}, "-recorded_datetime", 200),
  });

  const { data: handovers = [] } = useQuery({
    queryKey: ["handovers"],
    queryFn: () => secureGateway.filter("ShiftHandover", {}, "-date", 200),
  });

  const { data: reg44Reports = [] } = useQuery({
    queryKey: ["reg44-reports"],
    queryFn: () => base44.entities.Reg44Report.filter({}, "-visit_date", 100),
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => base44.entities.Complaint.filter({}, "-received_datetime", 200),
  });

  const { data: significantEvents = [] } = useQuery({
    queryKey: ["significant-events"],
    queryFn: () => base44.entities.SignificantEvent.filter({}, "-event_datetime", 200),
  });

  // Filter by date range (month)
  const isInDateRange = (dateStr) => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    const month = date.getMonth();
    const startM = dateRangeStart;
    const endM = dateRangeEnd;
    if (startM <= endM) {
      return month >= startM && month <= endM;
    } else {
      return month >= startM || month <= endM;
    }
  };

  // Filter homes based on selected property type and specific home
  const filteredHomes = allHomes.filter(h => {
    if (homeFilter !== "all") return h.id === homeFilter;
    if (propertyTypeFilter !== "all") return h.type === propertyTypeFilter;
    return true;
  });

  const filteredHomeIds = new Set(filteredHomes.map(h => h.id));

  const filteredResidents = residents.filter(r => filteredHomeIds.has(r.home_id));
  const filteredPlacements = placements.filter(p => filteredHomeIds.has(p.home_id) && isInDateRange(p.date));
  const filteredInvoices = invoices.filter(inv => filteredHomeIds.has(inv.home_id) && isInDateRange(inv.invoice_date));
  const filteredBills = bills.filter(b => filteredHomeIds.has(b.home_id) && isInDateRange(b.due_date));
  const filteredPettyCashTx = pettyCashTx.filter(tx => filteredHomeIds.has(tx.home_id) && isInDateRange(tx.date));
  const filteredDailyLogs = dailyLogs.filter(l => filteredHomeIds.has(l.home_id) && isInDateRange(l.date));
  const filteredFlaggedLogs = flaggedLogs.filter(l => filteredHomeIds.has(l.home_id) && isInDateRange(l.date));
  const filteredAccidents = accidentReports.filter(a => filteredHomeIds.has(a.home_id) && isInDateRange(a.date));
  const filteredHomeChecks = homeChecks.filter(c => filteredHomeIds.has(c.home_id) && isInDateRange(c.check_date));
  const filteredMaintenance = maintenanceLogs.filter(m => filteredHomeIds.has(m.home_id) && isInDateRange(m.reported_date));
  const filteredTransitions = transitions.filter(t => filteredHomeIds.has(t.home_id) && isInDateRange(t.move_date));

  // KPI stats
  const activeResidents = filteredResidents.filter(r => r.status === "active").length;
  const highRiskCount = filteredResidents.filter(r => r.risk_level === "high" || r.risk_level === "critical").length;
  const openIncidents = filteredAccidents.filter(a => a.status === "open").length;
  const unackLogs = filteredFlaggedLogs.filter(l => l.flagged && !l.acknowledged_by).length;
  const todayStr = new Date().toISOString().split("T")[0];
  const logsToday = filteredDailyLogs.filter(l => l.date === todayStr).length;

  // Residents for modal display
  const highRiskResidents = filteredResidents.filter(r => r.risk_level === "high" || r.risk_level === "critical");

  const filteredMFH = mfhRecords.filter(m => filteredHomeIds.has(m.home_id) && isInDateRange(m.reported_missing_datetime));
  const filteredBodyMaps = bodyMaps.filter(b => filteredHomeIds.has(b.home_id) && isInDateRange(b.recorded_datetime));
  const filteredHandovers = handovers.filter(h => filteredHomeIds.has(h.home_id) && isInDateRange(h.date));
  const filteredReg44 = reg44Reports.filter(r => filteredHomeIds.has(r.home_id) && isInDateRange(r.visit_date));
  const filteredComplaints = complaints.filter(c => filteredHomeIds.has(c.home_id) && isInDateRange(c.received_datetime));
  const filteredSignificantEvents = significantEvents.filter(s => filteredHomeIds.has(s.home_id) && isInDateRange(s.event_datetime));

  if (inspectionMode) {
    return (
      <InspectionMode
        onExit={() => setInspectionMode(false)}
        data={{
          residents: filteredResidents,
          homes: filteredHomes,
          staffProfiles,
          accidentReports: filteredAccidents,
          homeChecks: filteredHomeChecks,
          maintenanceLogs: filteredMaintenance,
          transitions: filteredTransitions,
          bills: filteredBills,
          dailyLogs: filteredDailyLogs,
          mfhRecords: filteredMFH,
          bodyMaps: filteredBodyMaps,
          handovers: filteredHandovers,
          reg44Reports: filteredReg44,
          complaints: filteredComplaints,
          significantEvents: filteredSignificantEvents,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row with title + inspection/refresh */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organisation-wide command centre</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => setInspectionMode(true)} variant="outline" size="sm" className="gap-1.5 text-xs">
            <Monitor className="w-3.5 h-3.5" /> Inspection Mode
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRefresh}>
            <FileText className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar — compact single row */}
      <DashboardFilterBar
        homes={allHomes}
        propertyTypeFilter={propertyTypeFilter}
        setPropertyTypeFilter={setPropertyTypeFilter}
        homeFilter={homeFilter}
        setHomeFilter={setHomeFilter}
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
        dateRangeStart={dateRangeStart}
        setDateRangeStart={setDateRangeStart}
        dateRangeEnd={dateRangeEnd}
        setDateRangeEnd={setDateRangeEnd}
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Active Residents" value={activeResidents} icon={Users} color="primary" onClick={() => setModal("residents")} />
        <StatCard title="Active Homes" value={filteredHomes.length} icon={Home} color="blue" onClick={() => setModal("homes")} />
        <StatCard title="High Risk" value={highRiskCount} icon={Shield} color="red" onClick={() => setModal("risk")} />
        <StatCard title="Open Incidents" value={openIncidents} icon={AlertTriangle} color="amber" onClick={() => setModal("incidents")} />
        <StatCard title="Logs Today" value={logsToday} icon={ClipboardList} color="green" onClick={() => setModal("logs")} />
      </div>

      {/* Row 1: Compliance (left) + Financial (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compliance Panel */}
        <section className="rounded-xl p-5 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f1d3a 0%, #162347 60%, #1a2d5a 100%)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Compliance &amp; Readiness</h2>
            <ScoringRulesModal />
          </div>
          <div className="flex flex-col gap-4">
            <OfstedReadinessScore data={{}} residents={filteredResidents} staff={staffProfiles} />
            <div className="border-t border-white/10 pt-4">
              <QuickActionButtons onExport={() => {}} />
            </div>
          </div>
        </section>

        {/* Financial Section */}
        <FinancialSection
          homes={filteredHomes}
          placements={filteredPlacements}
          invoices={filteredInvoices}
          bills={filteredBills}
          pettyCashTx={filteredPettyCashTx}
        />
      </div>

      {/* Row 2: Risk & Safeguarding — full width */}
      <RiskSection
        homes={filteredHomes}
        residents={filteredResidents}
        dailyLogs={filteredDailyLogs}
      />

      {/* Row 3: Incidents full width */}
      <IncidentsSection
        accidentReports={filteredAccidents}
        homeChecks={filteredHomeChecks}
        dailyLogs={filteredDailyLogs}
        maintenanceLogs={filteredMaintenance}
        residents={filteredResidents}
        homes={filteredHomes}
      />

      {/* Row 4: Appointments — full width */}
      <AppointmentStatsWidget appointments={dashboardAppointments} />

      {/* Row 5: Operations (left) + Staff & Capacity (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OperationsSection
          flaggedLogs={filteredFlaggedLogs}
          transitions={filteredTransitions}
          residents={filteredResidents}
          homes={filteredHomes}
          user={user}
        />
        <StaffCapacitySection
          homes={filteredHomes}
          residents={filteredResidents}
          staffProfiles={staffProfiles}
        />
      </div>

      {/* Appointment Compliance Report link */}
      <div className="flex justify-end">
        <button onClick={() => setShowComplianceReport(true)} className="text-xs text-primary underline hover:opacity-70">
          View Appointment Compliance Report →
        </button>
      </div>

      {/* AI Insights — full width bottom bar */}
      <AIInsightsPanel
        residents={filteredResidents}
        reports={filteredAccidents}
        logs={filteredDailyLogs}
      />

      {/* KPI Modals */}
      {modal === "residents" && (
        <StatDetailModal title="Active Residents" onClose={() => setModal(null)} linkLabel="Go to Residents" linkPath="/residents">
          {filteredResidents.filter(r => r.status === "active").map(r => {
            const home = filteredHomes.find(h => h.id === r.home_id);
            return (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.display_name || r.initials || "Resident"}</p>
                  <p className="text-xs text-muted-foreground">{home?.name || "—"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  r.risk_level === "critical" ? "bg-red-700/10 text-red-700" :
                  r.risk_level === "high" ? "bg-red-500/10 text-red-600" :
                  r.risk_level === "medium" ? "bg-amber-500/10 text-amber-600" :
                  "bg-green-500/10 text-green-600"
                }`}>{r.risk_level || "low"}</span>
              </div>
            );
          })}
        </StatDetailModal>
      )}

      {modal === "homes" && (
        <StatDetailModal title="Active Homes" onClose={() => setModal(null)} linkLabel="Go to Homes" linkPath="/homes-hub">
          {filteredHomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active homes.</p>
          ) : filteredHomes.map(h => (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{h.type?.replace(/_/g, ' ')}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{h.status}</span>
            </div>
          ))}
        </StatDetailModal>
      )}

      {modal === "incidents" && (
        <StatDetailModal title="Open Incidents" onClose={() => setModal(null)} linkLabel="Go to Residents" linkPath="/residents">
          {filteredAccidents.filter(a => a.status === "open").length === 0 ? (
            <p className="text-sm text-muted-foreground">No open incidents.</p>
          ) : filteredAccidents.filter(a => a.status === "open").map(a => {
            const home = filteredHomes.find(h => h.id === a.home_id);
            return (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.description}</p>
                  <p className="text-xs text-muted-foreground">{home?.name}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">Open</span>
              </div>
            );
          })}
        </StatDetailModal>
      )}

      {modal === "logs" && (
        <StatDetailModal title="Logs Today" onClose={() => setModal(null)} linkLabel="Go to Daily Logs" linkPath="/daily-logs">
          {filteredDailyLogs.filter(l => l.date === new Date().toISOString().split("T")[0]).length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs recorded today.</p>
          ) : filteredDailyLogs.filter(l => l.date === new Date().toISOString().split("T")[0]).map(l => (
            <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{l.resident_name}</p>
                <p className="text-xs text-muted-foreground">{l.shift} • {l.home_name}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 capitalize">{l.log_type}</span>
            </div>
          ))}
        </StatDetailModal>
      )}

      {showComplianceReport && (
        <AppointmentComplianceReport
          residents={filteredResidents}
          homes={filteredHomes}
          onClose={() => setShowComplianceReport(false)}
        />
      )}

      {modal === "risk" && (
        <StatDetailModal title="High & Critical Risk Residents" onClose={() => setModal(null)} linkLabel="Go to Residents" linkPath="/residents">
          {highRiskResidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No high or critical risk residents.</p>
          ) : highRiskResidents.map(r => {
            const home = filteredHomes.find(h => h.id === r.home_id);
            return (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.display_name || r.initials || "Resident"}</p>
                  <p className="text-xs text-muted-foreground">{home?.name || "—"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  r.risk_level === "critical" ? "bg-red-700/10 text-red-700" : "bg-red-500/10 text-red-600"
                }`}>{r.risk_level}</span>
              </div>
            );
          })}
        </StatDetailModal>
      )}
    </div>
  );
}