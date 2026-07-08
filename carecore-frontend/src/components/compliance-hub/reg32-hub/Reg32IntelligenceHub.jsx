import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Shield, RefreshCw, Download, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { computeReg32Scores, computeQualityScoreOverTime, getStatusFromScore, STATUS_COLORS } from "@/lib/reg32Scoring";
import Reg32KPIs from "./Reg32KPIs";
import Reg32Filters from "./Reg32Filters";
import HomeQualityScan from "./HomeQualityScan";
import QualityFindings from "./QualityFindings";
import EvidenceReadiness from "./EvidenceReadiness";
import Reg32Analytics from "./Reg32Analytics";
import AIReportComposerDrawer from "./AIReportComposerDrawer";
import Reg32DetailModal from "./Reg32DetailModal";

const DOMAIN_LABELS = {
  safety: "Safety & Safeguarding",
  relationships: "Relationships & Voice",
  health: "Health & Wellbeing",
  education: "Education & Outcomes",
  staffing: "Staffing & Supervision",
  complaints: "Complaints & Learning",
};

export default function Reg32IntelligenceHub({
  // Data from ComplianceHub
  homes = [], residents = [], safeguardingRecords = [], mfhRecords = [],
  visitReports = [], complaints = [], trainingRecords = [], staffProfiles = [],
  supportPlans = [], ypViews = [], laReviews = [], significantEvents = [],
  ofstedNotifications = [], supervisionRecords = [],
  // State from ComplianceHub (for AI report generator)
  periodStart, setPeriodStart, periodEnd, setPeriodEnd,
  reviewerName, setReviewerName, reviewerOrg, setReviewerOrg,
  completedDate, setCompletedDate,
  selectedYPs, setSelectedYPs,
  strengthsNarrative, setStrengthsNarrative,
  improvementsNarrative, setImprovementsNarrative,
  actionPlanNarrative, setActionPlanNarrative,
  selectedStrengthEvents, setSelectedStrengthEvents,
  selectedIssueEvents, setSelectedIssueEvents,
  selectedActionEvents, setSelectedActionEvents,
  ypViewsMethod, setYpViewsMethod,
  ypViewsCount, setYpViewsCount,
  ypViewsSummary, setYpViewsSummary,
  ypViewsActions, setYpViewsActions,
  // Actions
  onRefresh, onExportPack,
}) {
  const queryClient = useQueryClient();
  const composerRef = useRef(null);

  // Local filter state
  const [filters, setFilters] = useState({
    dateFrom: periodStart || format(new Date(Date.now() - 180 * 86400000), "yyyy-MM-dd"),
    dateTo: periodEnd || format(new Date(), "yyyy-MM-dd"),
    homeIds: [],
    serviceType: "all",
    qualityDomain: "all",
    riskThreshold: "all",
  });
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [lastScan, setLastScan] = useState(format(new Date(), "dd MMM yyyy HH:mm"));
  const [scanId] = useState(() => `REG32-${Date.now().toString(36).toUpperCase()}`);
  const [modal, setModal] = useState(null);

  // Fetch additional data not in ComplianceHub
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ["reg32-incidents"],
    queryFn: () => base44.entities.Incident.filter({}, "-incident_datetime", 500),
    staleTime: 60 * 1000,
  });

  const { data: dailyLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["reg32-daily-logs"],
    queryFn: () => secureGateway.filter("DailyLog", {}, "-created_date", 500),
    staleTime: 60 * 1000,
  });

  const { data: appointments = [], isLoading: apptsLoading } = useQuery({
    queryKey: ["reg32-appointments"],
    queryFn: () => secureGateway.filter("Appointment", {}, "-created_date", 500),
    staleTime: 60 * 1000,
  });

  const loading = incidentsLoading || logsLoading || apptsLoading;

  // Apply service type filter to homes
  const filteredHomes = useMemo(() => {
    let list = homes;
    if (filters.serviceType !== "all") {
      list = list.filter(h => h.type === filters.serviceType);
    }
    return list;
  }, [homes, filters.serviceType]);

  // Consolidate all data
  const allData = useMemo(() => ({
    homes: filteredHomes,
    residents,
    staffProfiles,
    safeguardingRecords,
    mfhRecords,
    visitReports,
    complaints,
    trainingRecords,
    supportPlans,
    ypViews,
    laReviews,
    significantEvents,
    ofstedNotifications,
    supervisionRecords,
    incidents,
    dailyLogs,
    appointments,
    reviewerName,
    actionPlanNarrative,
  }), [filteredHomes, residents, staffProfiles, safeguardingRecords, mfhRecords, visitReports,
      complaints, trainingRecords, supportPlans, ypViews, laReviews, significantEvents,
      ofstedNotifications, supervisionRecords, incidents, dailyLogs, appointments,
      reviewerName, actionPlanNarrative]);

  // Compute scores
  const scores = useMemo(() => {
    if (loading) return null;
    return computeReg32Scores(allData, filters.dateFrom, filters.dateTo, {
      homeIds: filters.homeIds,
      reviewerName,
      actionPlanNarrative,
    });
  }, [allData, filters.dateFrom, filters.dateTo, filters.homeIds, loading, reviewerName, actionPlanNarrative]);

  // Quality score over time (last 6 months)
  const qualityOverTime = useMemo(() => {
    if (loading || !scores) return [];
    try {
      return computeQualityScoreOverTime(allData, filters.dateFrom, filters.dateTo, filteredHomes, residents, staffProfiles);
    } catch {
      return [];
    }
  }, [allData, filters.dateFrom, filters.dateTo, loading, scores]);

  // Evidence gaps by home
  const evidenceGaps = useMemo(() => {
    if (!scores) return [];
    return scores.homeScores.map(h => ({
      home: h.homeName?.length > 12 ? h.homeName.slice(0, 12) + "…" : h.homeName,
      critical: h.domainScores.safety.riskCount + h.domainScores.complaints.riskCount,
      requiresEvidence: h.domainScores.relationships.riskCount + h.domainScores.health.riskCount + h.domainScores.education.riskCount + h.domainScores.staffing.riskCount,
    })).filter(g => g.critical > 0 || g.requiresEvidence > 0).slice(0, 10);
  }, [scores]);

  // Sync period dates with ComplianceHub
  const handleDateChange = (newFrom, newTo) => {
    setFilters(p => ({ ...p, dateFrom: newFrom, dateTo: newTo }));
    if (setPeriodStart) setPeriodStart(newFrom);
    if (setPeriodEnd) setPeriodEnd(newTo);
  };

  // Handle home click from heatmap/table
  const handleHomeClick = (homeId) => {
    setFilters(p => ({
      ...p,
      homeIds: p.homeIds.includes(homeId) ? p.homeIds.filter(x => x !== homeId) : [homeId],
    }));
  };

  // Open KPI modal with relevant data
  const inPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    return d >= filters.dateFrom && d <= filters.dateTo;
  };

  const handleOpenKpiModal = (kpiKey) => {
    switch (kpiKey) {
      case "quality-score":
        setModal({ title: "Overall Quality Score Breakdown", type: "quality-score", data: scores.domainScores });
        break;
      case "homes":
        setModal({ title: "Homes Scanned", type: "homes", data: scores.homeScores });
        break;
      case "young-people": {
        const ypList = allData.residents.filter(r => !filters.homeIds.length || filters.homeIds.includes(r.home_id));
        setModal({ title: "Young People Included", type: "young-people", data: ypList, homes: filteredHomes });
        break;
      }
      case "evidence-readiness":
        setModal({ title: "Evidence Completeness", type: "evidence-readiness", data: scores.evidenceReadiness.items });
        break;
      case "risks":
        setModal({ title: "Unresolved Quality Risks", type: "risks", data: scores.findings.filter(f => f.category === "Critical" || f.category === "Requires Evidence") });
        break;
      case "la-reviews": {
        const laList = allData.laReviews.filter(r => inPeriod(r.created_date) && (!filters.homeIds.length || filters.homeIds.includes(r.home_id)));
        setModal({ title: "LA Feedback Coverage", type: "la-reviews", data: laList });
        break;
      }
      case "supervision": {
        const supList = allData.supervisionRecords.filter(r => inPeriod(r.session_date));
        setModal({ title: "Staff Supervision", type: "supervision", data: supList });
        break;
      }
    }
  };

  const handleOpenDomainModal = (domainKey) => {
    const domainScore = scores.domainScores[domainKey];
    setModal({ title: DOMAIN_LABELS[domainKey] || domainKey, type: "domain-detail", data: { domainKey, domainScore } });
  };

  const handleOpenHomeModal = (homeScore) => {
    setModal({ title: homeScore.homeName, type: "home-detail", data: homeScore });
  };

  const handleOpenEvidenceModal = (item) => {
    setModal({ title: item.label, type: "evidence-category", data: item, rawData: allData });
  };

  // Handle refresh scan
  const handleRefreshScan = () => {
    queryClient.invalidateQueries({ queryKey: ["reg32-"] });
    queryClient.invalidateQueries({ queryKey: ["ch-"] });
    setLastScan(format(new Date(), "dd MMM yyyy HH:mm"));
    onRefresh?.();
    toast.success("Scan refreshed");
  };

  // Handle export pack
  const handleExportPack = () => {
    if (!scores) return;
    const html = generateExportHtml(scores, filters);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  // Handle generate report — expand the composer
  const handleGenerateReport = () => {
    setComposerExpanded(true);
    setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  // Handle finding actions — open relevant modals
  const handleFindingAction = (type, finding) => {
    switch (type) {
      case "note":
        setModal({ title: "Add Note", type: "finding-note", data: finding });
        break;
      case "action":
        setModal({ title: "Create Action", type: "finding-action", data: finding });
        break;
      case "resolve":
        setModal({ title: "Mark Resolved", type: "finding-resolve", data: finding });
        break;
      case "evidence":
        setModal({ title: "View Evidence", type: "finding-evidence", data: finding, rawData: allData });
        break;
    }
  };

  // Loading state
  if (loading && !scores) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4">
          <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Empty state
  if (scores && scores.kpis.homesScanned === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700 mb-1">No Reg 32 evidence found for this review period.</p>
        <p className="text-xs text-slate-400 mb-4">Try adjusting your filters or refresh the scan.</p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setFilters({ dateFrom: format(new Date(Date.now() - 180 * 86400000), "yyyy-MM-dd"), dateTo: format(new Date(), "yyyy-MM-dd"), homeIds: [], serviceType: "all", qualityDomain: "all", riskThreshold: "all" })} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
            Reset filters
          </button>
          <button onClick={handleRefreshScan} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Refresh scan
          </button>
        </div>
      </div>
    );
  }

  if (!scores) return null;

  const scanMetadata = {
    scanId,
    completedAt: lastScan,
    frequency: "Monthly",
    nextScan: format(new Date(Date.now() + 30 * 86400000), "dd MMM yyyy"),
  };

  // Build flags for AI generator from findings
  const clearFlags = scores.findings.filter(f => f.category === "Strengths").map(f => ({ id: f.id, text: f.title }));
  const critFlags = scores.findings.filter(f => f.category === "Critical").map(f => ({ id: f.id, text: f.title }));
  const attFlags = scores.findings.filter(f => f.category === "Requires Evidence" || f.category === "Improvements").map(f => ({ id: f.id, text: f.title }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Compliance &amp; Quality</span><span>/</span>
            <span>Ofsted Reporting</span><span>/</span>
            <span className="text-slate-800 font-medium">Reg 32 Quality of Support</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> Regulation 32 Quality of Support Intelligence Hub
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Tenant-wide scan of support quality, lived experience, outcomes, risks and evidence readiness.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleRefreshScan} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Scan
          </button>
          <button onClick={handleExportPack} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Download className="w-3.5 h-3.5" /> Export Pack
          </button>
          <button onClick={handleGenerateReport} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700">
            <Sparkles className="w-3.5 h-3.5" /> Generate Reg 32 Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <Reg32Filters
        filters={filters}
        setFilters={setFilters}
        homes={homes}
        lastScan={lastScan}
      />

      {/* KPIs */}
      <Reg32KPIs scores={scores} loading={false} onOpenModal={handleOpenKpiModal} />

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_280px] gap-4">
        {/* Left Column */}
        <HomeQualityScan
          scores={scores}
          homes={filteredHomes}
          onHomeClick={handleHomeClick}
          selectedHomeIds={filters.homeIds}
          onOpenModal={handleOpenHomeModal}
        />

        {/* Center Column */}
        <QualityFindings
          scores={scores}
          onAction={handleFindingAction}
        />

        {/* Right Column */}
        <EvidenceReadiness
          scores={scores}
          scanMetadata={scanMetadata}
          onOpenModal={handleOpenEvidenceModal}
        />
      </div>

      {/* Analytics Row */}
      <Reg32Analytics
        scores={scores}
        qualityOverTime={qualityOverTime}
        evidenceGaps={evidenceGaps}
        onOpenModal={handleOpenDomainModal}
      />

      {/* Detail Modal */}
      {modal && (
        <Reg32DetailModal
          modal={modal}
          onClose={() => setModal(null)}
          onFilterHome={handleHomeClick}
        />
      )}

      {/* AI Report Composer Drawer — reuses existing AIReportGenerator */}
      <div ref={composerRef}>
        <AIReportComposerDrawer
          expanded={composerExpanded}
          onToggle={() => setComposerExpanded(!composerExpanded)}
          clearFlags={clearFlags}
          criticalFlags={critFlags}
          attentionFlags={attFlags}
          reviewerName={reviewerName}
          setReviewerName={setReviewerName}
          reviewerOrg={reviewerOrg}
          setReviewerOrg={setReviewerOrg}
          completedDate={completedDate}
          setCompletedDate={setCompletedDate}
          periodStart={filters.dateFrom}
          periodEnd={filters.dateTo}
          selectedYPs={selectedYPs}
          residents={residents}
          homes={filteredHomes}
          orgName="Evolvix Digital Ltd"
          strengthsNarrative={strengthsNarrative}
          setStrengthsNarrative={setStrengthsNarrative}
          improvementsNarrative={improvementsNarrative}
          setImprovementsNarrative={setImprovementsNarrative}
          actionPlanNarrative={actionPlanNarrative}
          setActionPlanNarrative={setActionPlanNarrative}
          selectedStrengthEvents={selectedStrengthEvents}
          setSelectedStrengthEvents={setSelectedStrengthEvents}
          selectedIssueEvents={selectedIssueEvents}
          setSelectedIssueEvents={setSelectedIssueEvents}
          selectedActionEvents={selectedActionEvents}
          setSelectedActionEvents={setSelectedActionEvents}
          ypViewsMethod={ypViewsMethod}
          setYpViewsMethod={setYpViewsMethod}
          ypViewsCount={ypViewsCount}
          setYpViewsCount={setYpViewsCount}
          ypViewsSummary={ypViewsSummary}
          setYpViewsSummary={setYpViewsSummary}
          ypViewsActions={ypViewsActions}
          setYpViewsActions={setYpViewsActions}
        />
      </div>
    </div>
  );
}

// ── Export HTML generator ────────────────────────────────────────────────────
function generateExportHtml(scores, filters) {
  const sc = STATUS_COLORS[scores.overallStatus];
  const domainRows = Object.entries(scores.domainScores).map(([key, d]) => {
    const status = d.score >= 80 ? "Good" : d.score >= 60 ? "Requires Action" : "Critical";
    const dsc = STATUS_COLORS[status];
    return `<tr><td>${key}</td><td>${d.score}/100</td><td style="color: ${dsc.text.includes('green') ? '#15803d' : dsc.text.includes('amber') ? '#b45309' : '#dc2626'}">${status}</td><td>${d.evidenceCount}</td><td>${d.riskCount}</td></tr>`;
  }).join("");

  const homeRows = scores.homeScores.map((h, i) => `<tr><td>${i + 1}</td><td>${h.homeName}</td><td>${h.serviceType}</td><td>${h.score}/100</td><td>${h.status}</td><td>${h.flags}</td></tr>`).join("");

  const findingRows = scores.findings.map(f => `<tr><td>${f.category}</td><td>${f.title}</td><td>${f.sourceModule}</td><td>${f.owner}</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reg 32 Quality of Support Scan</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
    h1 { font-size: 20px; } h2 { font-size: 16px; margin-top: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 12px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .score { font-size: 36px; font-weight: bold; }
    .kpi { display: inline-block; margin-right: 20px; }
    .kpi-val { font-size: 20px; font-weight: bold; color: #3b82f6; }
  </style></head><body>
  <h1>Regulation 32 Quality of Support Intelligence Hub — Scan Export</h1>
  <p>Generated: ${format(new Date(), "dd MMMM yyyy HH:mm")} | Period: ${filters.dateFrom} to ${filters.dateTo}</p>
  <h2>Overall Quality Score</h2>
  <p class="score">${scores.overallScore}/100 — ${scores.overallStatus}</p>
  <h2>Key Metrics</h2>
  <div class="kpi"><span class="kpi-val">${scores.kpis.homesScanned}</span> Homes Scanned</div>
  <div class="kpi"><span class="kpi-val">${scores.kpis.youngPeopleIncluded}</span> Young People</div>
  <div class="kpi"><span class="kpi-val">${scores.kpis.evidenceCompleteness}%</span> Evidence Complete</div>
  <div class="kpi"><span class="kpi-val">${scores.kpis.unresolvedQualityRisks}</span> Unresolved Risks</div>
  <div class="kpi"><span class="kpi-val">${scores.kpis.laFeedbackCoverage}%</span> LA Feedback</div>
  <div class="kpi"><span class="kpi-val">${scores.kpis.staffSupervisionCompliance}%</span> Supervision</div>
  <h2>Domain Scores</h2>
  <table><thead><tr><th>Domain</th><th>Score</th><th>Status</th><th>Evidence</th><th>Risks</th></tr></thead><tbody>${domainRows}</tbody></table>
  <h2>Home Quality Scan</h2>
  <table><thead><tr><th>#</th><th>Home</th><th>Service</th><th>Score</th><th>Status</th><th>Flags</th></tr></thead><tbody>${homeRows}</tbody></table>
  <h2>Findings</h2>
  <table><thead><tr><th>Category</th><th>Finding</th><th>Source</th><th>Owner</th></tr></thead><tbody>${findingRows}</tbody></table>
  <h2>Evidence Readiness</h2>
  <p>Overall completeness: ${scores.evidenceReadiness.overallCompleteness}% | Ofsted-ready: ${scores.ofstedReadyStatus}</p>
  </body></html>`;
}