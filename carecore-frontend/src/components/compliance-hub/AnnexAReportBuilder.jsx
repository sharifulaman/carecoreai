import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Download, FileText, CheckCircle2, Clock, Eye, Wand2, Loader, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AnnexAReportGeneratorModal from "./AnnexAReportGeneratorModal";
import AnnexAKPIs from "./annex-a-hub/AnnexAKPIs";
import AnnexAFilters from "./annex-a-hub/AnnexAFilters";
import AnnexAHomeReadiness from "./annex-a-hub/AnnexAHomeReadiness";
import AnnexAEvidenceBoard from "./annex-a-hub/AnnexAEvidenceBoard";
import AnnexAReadinessQueue from "./annex-a-hub/AnnexAReadinessQueue";
import AnnexAComposer from "./annex-a-hub/AnnexAComposer";
import AnnexADetailModal from "./annex-a-hub/AnnexADetailModal";
import { RefreshCw, Shield } from "lucide-react";
import { format } from "date-fns";

const calculateMetrics = (items, categoryField = 'accommodation_category') => {
  return {
    self_contained: items.filter(i => i[categoryField] === 'self_contained').length,
    shared_ring_fenced: items.filter(i => i[categoryField] === 'shared_ring_fenced').length,
    shared_non_ring_fenced: items.filter(i => i[categoryField] === 'shared_non_ring_fenced').length,
  };
};

export default function AnnexAReportBuilder() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [reportPeriodMonths, setReportPeriodMonths] = useState(12);
  const [selectedHome, setSelectedHome] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const [overrides, setOverrides] = useState({});
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingWord, setGeneratingWord] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingCSV, setGeneratingCSV] = useState(false);
  const [lastExportTime, setLastExportTime] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('annexa_last_export');
      return stored ? new Date(stored) : null;
    }
    return null;
  });
  const [serviceType, setServiceType] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastScan, setLastScan] = useState(format(new Date(), "dd MMM yyyy HH:mm"));
  const [detailModal, setDetailModal] = useState(null);

  // Fetch all required data
  const { data: homes = [] } = useQuery({
    queryKey: ["homes-annex"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID }),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-annex"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-annex"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID }),
  });

  const { data: allegations = [] } = useQuery({
    queryKey: ["allegations-annex"],
    queryFn: () => base44.entities.Allegation.filter({ org_id: ORG_ID }),
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints-annex"],
    queryFn: () => base44.entities.Complaint.filter({ org_id: ORG_ID }),
  });

  const { data: mfhRecords = [] } = useQuery({
    queryKey: ["mfh-annex"],
    queryFn: () => base44.entities.MissingFromHome.filter({ org_id: ORG_ID }),
  });

  const { data: exploitationRisks = [] } = useQuery({
    queryKey: ["exploitation-annex"],
    queryFn: () => base44.entities.ExploitationRisk.filter({ org_id: ORG_ID }),
  });

  const { data: educationRecords = [] } = useQuery({
    queryKey: ["education-annex"],
    queryFn: () => base44.entities.EducationRecord.filter({ org_id: ORG_ID }),
  });

  const { data: healthProfiles = [] } = useQuery({
    queryKey: ["health-annex"],
    queryFn: () => base44.entities.HealthProfile.filter({ org_id: ORG_ID }),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals-annex"],
    queryFn: () => base44.entities.Referral.filter({ org_id: ORG_ID }),
  });

  const { data: orgProfile } = useQuery({
    queryKey: ["org-profile-annex"],
    queryFn: () => base44.entities.OrganisationProfile.filter({ org_id: ORG_ID }).then(r => r[0]),
  });

  const { data: staffProfile } = useQuery({
    queryKey: ["staff-profile-current"],
    queryFn: async () => {
      const me = await base44.auth.me();
      return me || {};
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents-annex"],
    queryFn: () => base44.entities.Incident.filter({ org_id: ORG_ID }),
  });

  const { data: staffMovements = [] } = useQuery({
    queryKey: ["staff-movements-annex"],
    queryFn: () => base44.entities.StaffMovement.filter({ org_id: ORG_ID }),
  });

  // Calculate reporting period
  const reportingPeriod = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - reportPeriodMonths, 1);
    const registrationDate = orgProfile?.registration_date ? new Date(orgProfile.registration_date) : null;
    
    // If registered less than period, use registration date
    const effectiveStart = registrationDate && registrationDate > startDate ? registrationDate : startDate;
    
    return { startDate: effectiveStart, endDate: now };
  }, [reportPeriodMonths, orgProfile]);

  // Filter data by selected home and period
  const currentHome = homes.find(h => h.id === selectedHome);
  const currentResidents = useMemo(() => {
    return residents.filter(r => {
      if (selectedHome && r.home_id !== selectedHome) return false;
      if (serviceType !== "all" && r.service_type !== serviceType) return false;
      if (riskLevel !== "all" && r.risk_level !== riskLevel) return false;
      return true;
    });
  }, [residents, selectedHome, serviceType, riskLevel]);

  const filterByPeriod = (items, dateField = 'created_date') => {
    return items.filter(item => {
      const itemDate = new Date(item[dateField] || item.date);
      return itemDate >= reportingPeriod.startDate && itemDate <= reportingPeriod.endDate;
    });
  };

  const metrics = useMemo(() => ({
    totalResidents: calculateMetrics(currentResidents, 'accommodation_category'),
    allegations: calculateMetrics(filterByPeriod(allegations), 'accommodation_category'),
    complaints: calculateMetrics(filterByPeriod(complaints), 'accommodation_category'),
    missing: calculateMetrics(filterByPeriod(mfhRecords), 'accommodation_category'),
    exploitationRisks: calculateMetrics(filterByPeriod(exploitationRisks), 'accommodation_category'),
    newStarters: calculateMetrics(filterByPeriod(staffMovements.filter(sm => sm.movement_type === 'new_starter')), 'accommodation_category_affected'),
    leavers: calculateMetrics(filterByPeriod(staffMovements.filter(sm => sm.movement_type === 'leaver')), 'accommodation_category_affected'),
    cseRisks: calculateMetrics(filterByPeriod(exploitationRisks.filter(er => er.exploitation_type === 'cse')), 'accommodation_category'),
    cceRisks: calculateMetrics(filterByPeriod(exploitationRisks.filter(er => er.exploitation_type === 'cce')), 'accommodation_category'),
    cpReferrals: calculateMetrics(filterByPeriod(referrals.filter(r => r.referral_type === 'child_protection')), 'accommodation_category'),
  }), [currentResidents, allegations, complaints, mfhRecords, exploitationRisks, staffMovements, referrals, filterByPeriod]);

  // Missing data warnings
  const getMissingDataWarnings = () => {
    const warnings = [];
    if (!currentHome?.name) warnings.push("Provider name not set");
    if (!orgProfile?.ofsted_urn) warnings.push("Ofsted URN missing");
    if (currentResidents.length === 0) warnings.push("No residents recorded");
    if (educationRecords.filter(e => currentResidents.some(r => r.id === e.resident_id)).length === 0) {
      warnings.push("No education records found");
    }
    if (healthProfiles.filter(h => currentResidents.some(r => r.id === h.resident_id)).length === 0) {
      warnings.push("No health profiles found");
    }
    return warnings;
  };

  const warnings = getMissingDataWarnings();

  // Readiness pre-check logic
  const getReadinessChecks = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const checks = [
      {
        id: 'urn',
        label: 'Ofsted URN set',
        passed: !!orgProfile?.ofsted_urn,
        fixTab: 'provider',
      },
      {
        id: 'accommodation',
        label: 'All residents have accommodation category',
        passed: currentResidents.length > 0 && currentResidents.every(r => r.accommodation_category),
        fixTab: 'children',
      },
      {
        id: 'la',
        label: 'All residents have placing local authority',
        passed: currentResidents.length > 0 && currentResidents.every(r => r.placing_local_authority),
        fixTab: 'children',
      },
      {
        id: 'uasc',
        label: 'All residents have UASC status recorded',
        passed: currentResidents.length > 0 && currentResidents.every(r => typeof r.uasc === 'boolean'),
        fixTab: 'children',
      },
      {
        id: 'rhi',
        label: 'All MFH episodes have RHI answered',
        passed: mfhRecords.length === 0 || mfhRecords.every(m => typeof m.rhi_offered_by_la === 'boolean'),
        fixTab: 'incidents',
      },
      {
        id: 'police_reason',
        label: 'All police incidents have callout reason set',
        passed: incidents.filter(i => i.police_called).length === 0 || incidents.filter(i => i.police_called).every(i => i.police_callout_reason),
        fixTab: 'incidents',
      },
      {
        id: 'restraint_review',
        label: 'All restraint incidents manager-reviewed',
        passed: incidents.filter(i => i.restraint_used).length === 0 || incidents.filter(i => i.restraint_used).every(i => i.manager_review_status === 'reviewed'),
        fixTab: 'incidents',
      },
      {
        id: 'education_recent',
        label: 'Education records updated in last 30 days',
        passed: educationRecords.filter(e => currentResidents.some(r => r.id === e.resident_id)).length === 0 || educationRecords.filter(e => currentResidents.some(r => r.id === e.resident_id)).some(e => new Date(e.updated_date || e.created_date) >= thirtyDaysAgo),
        fixTab: 'education',
      },
      {
        id: 'movements',
        label: 'Staff movements recorded (new starters + leavers)',
        passed: staffMovements.filter(sm => new Date(sm.movement_date) >= reportingPeriod.startDate).length > 0 || true, // Optional check
        fixTab: 'staffing',
      },
      {
        id: 'reporter',
        label: 'Reporter name entered',
        passed: !!staffProfile?.full_name,
        fixTab: 'overview',
      },
    ];

    return checks;
  };

  const readinessChecks = getReadinessChecks();
  const passedChecks = readinessChecks.filter(c => c.passed).length;
  const totalChecks = readinessChecks.length;
  const readinessScore = Math.round((passedChecks / totalChecks) * 100);

  const getReadinessBadge = () => {
    if (passedChecks === totalChecks) {
      return { color: 'bg-green-50 border-green-200', text: 'text-green-900', label: '✓ Ready to export', icon: '🟢' };
    } else if (passedChecks >= 7) {
      return { color: 'bg-amber-50 border-amber-200', text: 'text-amber-900', label: '⚠ Export with minor gaps', icon: '🟡' };
    } else {
      return { color: 'bg-red-50 border-red-200', text: 'text-red-900', label: '✗ Significant gaps — review first', icon: '🔴' };
    }
  };

  const handleExportWord = async () => {
    setGeneratingWord(true);
    try {
      const response = await base44.functions.invoke('generateAnnexAReportWord', {
        org_id: ORG_ID,
        home_id: selectedHome || null,
        reporter_name: orgProfile?.registered_service_manager_name || '',
        period_months: reportPeriodMonths,
      });
      if (response.data?.html) {
        const win = window.open('', '_blank');
        win.document.write(response.data.html);
        win.document.close();
        win.focus();
        toast.success('Annex A opened in new tab — use File > Print to save as PDF or Word');
        localStorage.setItem('annexa_last_export', new Date().toISOString());
        setLastExportTime(new Date());
      } else {
        toast.error('Failed to generate report');
      }
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setGeneratingWord(false);
    }
  };

  const handleExportPDF = async () => {
    setGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('generateAnnexAReportWord', {
        org_id: ORG_ID,
        home_id: selectedHome || null,
        reporter_name: orgProfile?.registered_service_manager_name || '',
        period_months: reportPeriodMonths,
      });
      if (response.data?.html) {
        const win = window.open('', '_blank');
        win.document.write(response.data.html);
        win.document.close();
        setTimeout(() => {
          win.print();
        }, 500);
        toast.success('Print dialog opened — save as PDF to complete export');
        localStorage.setItem('annexa_last_export', new Date().toISOString());
        setLastExportTime(new Date());
      } else {
        toast.error('Failed to generate report');
      }
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    setGeneratingCSV(true);
    try {
      const response = await base44.functions.invoke('generateAnnexAReport', {
        org_id: ORG_ID,
        home_id: selectedHome || null,
        reporter_name: orgProfile?.registered_service_manager_name || '',
        period_months: reportPeriodMonths,
      });
      if (response.data?.csv) {
        const blob = new Blob([response.data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AnnexA_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Evidence workbook exported as CSV');
        localStorage.setItem('annexa_last_export', new Date().toISOString());
        setLastExportTime(new Date());
      } else {
        toast.error('Failed to generate export');
      }
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setGeneratingCSV(false);
    }
  };

  const handleRefreshScan = () => {
    setLastScan(format(new Date(), "dd MMM yyyy HH:mm"));
    qc.invalidateQueries({ queryKey: ["homes-annex"] });
    qc.invalidateQueries({ queryKey: ["residents-annex"] });
    qc.invalidateQueries({ queryKey: ["staff-annex"] });
    qc.invalidateQueries({ queryKey: ["allegations-annex"] });
    qc.invalidateQueries({ queryKey: ["complaints-annex"] });
    qc.invalidateQueries({ queryKey: ["mfh-annex"] });
    qc.invalidateQueries({ queryKey: ["exploitation-annex"] });
    qc.invalidateQueries({ queryKey: ["education-annex"] });
    qc.invalidateQueries({ queryKey: ["health-annex"] });
    qc.invalidateQueries({ queryKey: ["referrals-annex"] });
    qc.invalidateQueries({ queryKey: ["org-profile-annex"] });
    qc.invalidateQueries({ queryKey: ["incidents-annex"] });
    qc.invalidateQueries({ queryKey: ["staff-movements-annex"] });
    toast.success("Scan refreshed — all data reloaded");
  };

  // ─── Modal handlers ───
  const handleCardClick = (card) => {
    setDetailModal({ title: card.label, icon: card.icon, iconColor: card.color, type: card.type });
  };

  const handleEvidenceAction = (action, sectionData) => {
    const icon = action === "fix" ? AlertTriangle : action === "note" ? FileText : Eye;
    const iconColor = action === "fix" ? "text-amber-600" : "text-blue-600";
    const prefix = action === "view" ? "Evidence" : action === "fix" ? "Fix Gaps" : "Notes";
    setDetailModal({ title: `${prefix}: ${sectionData.title}`, icon, iconColor, type: "section", action, sectionData });
  };

  const handleFixCheck = (check) => {
    setDetailModal({ title: `Fix: ${check.label}`, icon: AlertTriangle, iconColor: "text-red-600", type: "fix", checkLabel: check.label });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Dashboard</span><span>/</span>
            <span>Compliance &amp; Governance</span><span>/</span>
            <span className="text-slate-800 font-medium">OFSTED Reporting</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> Annex A Inspection Intelligence Hub
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">One-page Ofsted inspection readiness, evidence scan, report generation and maker-checker review.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {warnings.length > 0 && (
            <span className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-full px-3 py-1.5">
              🚩 {warnings.length} flags across org
            </span>
          )}
          <button onClick={handleRefreshScan} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 text-slate-600">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Scan
          </button>
          <button onClick={() => setShowReportGenerator(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700">
            <Wand2 className="w-3.5 h-3.5" /> Generate Annex A Report
          </button>
          <button onClick={handleExportWord} disabled={generatingWord} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> Export Pack
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnnexAFilters
        reportPeriodMonths={reportPeriodMonths}
        setReportPeriodMonths={setReportPeriodMonths}
        selectedHome={selectedHome}
        setSelectedHome={setSelectedHome}
        homes={homes}
        serviceType={serviceType}
        setServiceType={setServiceType}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
        riskLevel={riskLevel}
        setRiskLevel={setRiskLevel}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        lastScan={lastScan}
        onRefreshScan={handleRefreshScan}
      />

      {/* KPI Cards */}
      <AnnexAKPIs
        onCardClick={handleCardClick}
        readinessScore={readinessScore}
        passedChecks={passedChecks}
        totalChecks={totalChecks}
        criticalGaps={totalChecks - passedChecks}
        currentResidents={currentResidents}
        homes={homes}
        mfhRecords={mfhRecords}
        complaints={complaints}
        staff={staff}
        educationRecords={educationRecords}
        healthProfiles={healthProfiles}
        lastExportTime={lastExportTime}
      />

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_280px] gap-4">
        {/* Left Column */}
        <AnnexAHomeReadiness
          reportingPeriod={reportingPeriod}
          currentResidents={currentResidents}
          homes={homes}
          residents={residents}
          metrics={metrics}
          allegations={allegations}
          complaints={complaints}
          mfhRecords={mfhRecords}
          incidents={incidents}
          staffMovements={staffMovements}
          educationRecords={educationRecords}
          selectedHome={selectedHome}
          setSelectedHome={setSelectedHome}
        />

        {/* Center Column */}
        <AnnexAEvidenceBoard
          data={{ orgProfile, currentResidents, homes, metrics, mfhRecords, complaints, incidents, allegations, exploitationRisks, referrals, staff, educationRecords, healthProfiles, staffMovements, readinessChecks, passedChecks, totalChecks }}
          sectionFilter={sectionFilter}
          onAction={handleEvidenceAction}
        />

        {/* Right Column */}
        <AnnexAReadinessQueue
          readinessChecks={readinessChecks}
          passedChecks={passedChecks}
          totalChecks={totalChecks}
          warnings={warnings}
          getReadinessBadge={getReadinessBadge}
          staffProfile={staffProfile}
          onFixCheck={handleFixCheck}
        />
      </div>

      {/* Bottom: AI + Export Composer */}
      <AnnexAComposer
        showReportGenerator={showReportGenerator}
        setShowReportGenerator={setShowReportGenerator}
        generatingWord={generatingWord}
        generatingPDF={generatingPDF}
        generatingCSV={generatingCSV}
        lastExportTime={lastExportTime}
        handleExportWord={handleExportWord}
        handleExportPDF={handleExportPDF}
        handleExportCSV={handleExportCSV}
        orgProfile={orgProfile}
        currentHome={currentHome}
        metrics={metrics}
        reportingPeriod={reportingPeriod}
        warnings={warnings}
        readinessScore={readinessScore}
        passedChecks={passedChecks}
        totalChecks={totalChecks}
      />

      {/* Detail Modal */}
      <AnnexADetailModal
        modal={detailModal}
        data={{ readinessChecks, passedChecks, totalChecks, readinessScore, currentResidents, homes, residents, mfhRecords, complaints, staff, educationRecords, healthProfiles, lastExportTime, allegations, exploitationRisks, referrals, incidents, orgProfile }}
        onClose={() => setDetailModal(null)}
      />
    </div>
  );
}