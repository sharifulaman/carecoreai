import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format, subMonths } from "date-fns";
import { Shield, Download } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";

import ReportTypeSelector from "@/components/compliance-hub/ReportTypeSelector";
import FilterBar from "@/components/compliance-hub/FilterBar";
import HomeHealthScanner from "@/components/compliance-hub/HomeHealthScanner";
import FlaggedIssuesPanel from "@/components/compliance-hub/FlaggedIssuesPanel";
import AIReportGenerator from "@/components/compliance-hub/AIReportGenerator";
import ComingSoonPanel from "@/components/compliance-hub/ComingSoonPanel";

export default function ComplianceHub() {
  const { user, staffProfile } = useOutletContext();
  const queryClient = useQueryClient();

  const [activeReport, setActiveReport] = useState("reg32");
  const [periodStart, setPeriodStart] = useState(format(subMonths(new Date(), 6), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedHomeId, setSelectedHomeId] = useState(null);
  const [reportStatus, setReportStatus] = useState("draft");
  const [lastSaved, setLastSaved] = useState(null);

  // Report fields
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerOrg, setReviewerOrg] = useState("");
  const [reviewCompleted, setReviewCompleted] = useState("");
  const [completedDate, setCompletedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedYPs, setSelectedYPs] = useState([]);
  const [managerNotes, setManagerNotes] = useState([]);

  // AI narratives
  const [strengthsNarrative, setStrengthsNarrative] = useState("");
  const [improvementsNarrative, setImprovementsNarrative] = useState("");
  const [actionPlanNarrative, setActionPlanNarrative] = useState("");
  const [selectedStrengthEvents, setSelectedStrengthEvents] = useState([]);
  const [selectedIssueEvents, setSelectedIssueEvents] = useState([]);
  const [selectedActionEvents, setSelectedActionEvents] = useState([]);

  // Saved report ID for auto-save
  const [reportId, setReportId] = useState(null);

  // Data queries
  const { data: homes = [] } = useQuery({
    queryKey: ["ch-homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["ch-residents"],
    queryFn: () => secureGateway.filter("Resident", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: safeguardingRecords = [] } = useQuery({
    queryKey: ["ch-safeguarding"],
    queryFn: () => secureGateway.filter("SafeguardingRecord", {}, "-created_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: mfhRecords = [] } = useQuery({
    queryKey: ["ch-mfh"],
    queryFn: () => base44.entities.MissingFromHome.filter({}, "-reported_missing_datetime", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: visitReports = [] } = useQuery({
    queryKey: ["ch-visit-reports"],
    queryFn: () => secureGateway.filter("VisitReport", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["ch-complaints"],
    queryFn: () => base44.entities.Complaint.filter({}, "-received_datetime", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ["ch-training"],
    queryFn: () => secureGateway.filter("TrainingRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["ch-staff"],
    queryFn: () => secureGateway.filter("StaffProfile", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: supportPlans = [] } = useQuery({
    queryKey: ["ch-support-plans"],
    queryFn: () => secureGateway.filter("SupportPlan", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ypViews = [] } = useQuery({
    queryKey: ["ch-yp-views"],
    queryFn: () => secureGateway.filter("YPViewsRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: laReviews = [] } = useQuery({
    queryKey: ["ch-la-reviews"],
    queryFn: () => secureGateway.filter("LAReview", {}, "-created_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: significantEvents = [] } = useQuery({
    queryKey: ["ch-sig-events"],
    queryFn: () => base44.entities.SignificantEvent.filter({}, "-event_datetime", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ofstedNotifications = [] } = useQuery({
    queryKey: ["ch-ofsted-notifs"],
    queryFn: () => base44.entities.OfstedNotification.filter({}, "-created_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: supervisionRecords = [] } = useQuery({
    queryKey: ["ch-supervisions"],
    queryFn: () => secureGateway.filter("SupervisionRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Consolidate data object
  const data = useMemo(() => ({
    safeguardingRecords,
    mfhRecords,
    visitReports,
    complaints,
    trainingRecords,
    staffProfiles,
    supportPlans,
    ypViews,
    laReviews,
    significantEvents,
    ofstedNotifications,
    supervisionRecords,
  }), [safeguardingRecords, mfhRecords, visitReports, complaints, trainingRecords, staffProfiles, supportPlans, ypViews, laReviews, significantEvents, ofstedNotifications, supervisionRecords]);

  // Set all active residents selected by default
  useEffect(() => {
    const activeIds = residents.filter(r => r.status === "active").map(r => r.id);
    setSelectedYPs(activeIds);
  }, [residents]);

  // Counts for tab badges
  const counts = useMemo(() => ({
    reg33: ofstedNotifications.filter(n => n.status === "pending").length,
    complaints: complaints.filter(c => c.status !== "closed").length,
  }), [ofstedNotifications, complaints]);

  // Auto-save logic
  const autoSave = useCallback(async () => {
    if (activeReport !== "reg32") return;
    const payload = {
      org_id: ORG_ID,
      review_period_start: periodStart,
      review_period_end: periodEnd,
      reviewer_name: reviewerName,
      reviewer_organisation: reviewerOrg,
      completed_date: reviewCompleted || null,
      strengths_narrative: strengthsNarrative,
      areas_for_improvement_narrative: improvementsNarrative,
      action_plan_narrative: actionPlanNarrative,
      selected_yp_ids: selectedYPs,
      selected_event_ids_strengths: selectedStrengthEvents,
      selected_event_ids_improvements: selectedIssueEvents,
      selected_event_ids_actions: selectedActionEvents,
      manager_notes: managerNotes,
      status: reportStatus,
      created_by: staffProfile?.id || "",
    };
    try {
      if (reportId) {
        await secureGateway.update("Reg32Report", reportId, payload);
      } else {
        const rec = await secureGateway.create("Reg32Report", payload);
        if (rec?.id) setReportId(rec.id);
      }
      setLastSaved(`Today ${format(new Date(), "HH:mm")}`);
    } catch (e) {
      // silent fail for auto-save
    }
  }, [reportId, periodStart, periodEnd, reviewerName, reviewerOrg, reviewCompleted, strengthsNarrative, improvementsNarrative, actionPlanNarrative, selectedYPs, selectedStrengthEvents, selectedIssueEvents, selectedActionEvents, managerNotes, reportStatus, staffProfile, activeReport]);

  // Debounced auto-save
  useEffect(() => {
    const t = setTimeout(autoSave, 2000);
    return () => clearTimeout(t);
  }, [autoSave]);

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["ch-"] });

  // Compute flags counts for header
  const allFlags = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    let count = 0;
    safeguardingRecords.forEach(s => { if (!s.resolution_date && new Date(s.created_date) < thirtyDaysAgo) count++; });
    mfhRecords.forEach(m => { if (!m.return_interview_completed) count++; });
    return count;
  }, [safeguardingRecords, mfhRecords]);

  const deadline = reviewCompleted
    ? format(new Date(new Date(reviewCompleted).getTime() + 28 * 86400000), "dd MMM yyyy")
    : null;

  const flagsResolved = managerNotes.filter(n => n.resolved).length;
  const totalFlags = managerNotes.length || allFlags;

  // Build clear/critical/attention flags for AI generator
  const [clearFlags, setClearFlags] = useState([]);
  const [critFlags, setCritFlags] = useState([]);
  const [attFlags, setAttFlags] = useState([]);

  return (
    <div className="space-y-4 pb-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Compliance Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Regulatory reports, notifications and quality reviews
          </p>
        </div>
        <div className="flex items-center gap-3">
          {allFlags > 0 && (
            <span className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-full px-3 py-1">
              {allFlags} flags across org
            </span>
          )}
          {deadline && (
            <span className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              Reg 32 due {deadline}
            </span>
          )}
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90">
            <Download className="w-4 h-4" /> Export pack
          </button>
        </div>
      </div>

      {/* Report type selector */}
      <ReportTypeSelector active={activeReport} onChange={setActiveReport} counts={counts} />

      {/* Non-Reg32 placeholder */}
      {activeReport !== "reg32" && (
        <ComingSoonPanel reportType={
          { reg33: "Reg 33 — Notifications", sop: "Statement of Purpose", workforce: "Workforce Plan", complaints: "Complaints Log", childrens_guide: "Children's Guide", reg27: "Reg 27 Changes" }[activeReport] || activeReport
        } />
      )}

      {/* Reg32 content */}
      {activeReport === "reg32" && (
        <>
          {/* Filter bar */}
          <FilterBar
            periodStart={periodStart}
            setPeriodStart={setPeriodStart}
            periodEnd={periodEnd}
            setPeriodEnd={setPeriodEnd}
            status={reportStatus}
            lastSaved={lastSaved}
            onRefresh={handleRefresh}
          />

          {/* Row 1: two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            {/* Col 1 — Home health scanner */}
            <div className="bg-card border border-border rounded-xl p-4 overflow-auto max-h-[calc(100vh-280px)] lg:max-h-none">
              <HomeHealthScanner
                homes={homes}
                residents={residents}
                data={data}
                selectedHomeId={selectedHomeId}
                onSelectHome={setSelectedHomeId}
                selectedYPs={selectedYPs}
                setSelectedYPs={setSelectedYPs}
                reviewerName={reviewerName}
                setReviewerName={setReviewerName}
                reviewerOrg={reviewerOrg}
                setReviewerOrg={setReviewerOrg}
                reviewCompleted={reviewCompleted}
                setReviewCompleted={setReviewCompleted}
                flagsResolved={flagsResolved}
                totalFlags={totalFlags}
                deadline={deadline}
              />
            </div>

            {/* Col 2 — Flagged issues */}
            <div className="bg-card border border-border rounded-xl p-4 overflow-auto">
              <FlaggedIssuesPanel
                data={data}
                homes={homes}
                residents={residents}
                periodStart={periodStart}
                periodEnd={periodEnd}
                filterHomeId={selectedHomeId}
                managerNotes={managerNotes}
                setManagerNotes={setManagerNotes}
              />
            </div>
          </div>

          {/* Row 2: AI Generator */}
          <AIReportGenerator
            clearFlags={clearFlags}
            criticalFlags={critFlags}
            attentionFlags={attFlags}
            reviewerName={reviewerName}
            reviewerOrg={reviewerOrg}
            completedDate={completedDate}
            setCompletedDate={setCompletedDate}
            periodStart={periodStart}
            periodEnd={periodEnd}
            selectedYPs={selectedYPs}
            residents={residents}
            homes={homes}
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
          />
        </>
      )}
    </div>
  );
}