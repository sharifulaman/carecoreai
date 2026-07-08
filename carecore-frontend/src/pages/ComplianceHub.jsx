import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext, Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format, subMonths } from "date-fns";
import { Shield, Download, AlertTriangle, LifeBuoy, FolderOpen, Archive, ShieldCheck, BadgeCheck, AlertOctagon, PoundSterling } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import OfstedReportingTab, { ALL_MODULES } from "@/components/compliance-quality/OfstedReportingTab";
import QualityAssurancePlaceholder from "@/components/compliance-quality/QualityAssurancePlaceholder";
import HealthCheckDashboard from "@/components/compliance-quality/HealthCheckDashboard";

import ReportTypeSelector from "@/components/compliance-hub/ReportTypeSelector";
import ComingSoonPanel from "@/components/compliance-hub/ComingSoonPanel";
import Reg32IntelligenceHub from "@/components/compliance-hub/reg32-hub/Reg32IntelligenceHub";
import IncidentIntelligenceHub from "@/components/compliance-hub/incident-hub/IncidentIntelligenceHub";
import Reg22RestraintRecords from "@/components/compliance-hub/Reg22RestraintRecords";
import Reg28AdmissionDischargeNotices from "@/components/compliance-hub/Reg28AdmissionDischargeNotices";
import Reg23ContingencyPlan from "@/components/compliance-hub/Reg23ContingencyPlan";
import Reg6LocationAssessments from "@/components/compliance-hub/Reg6LocationAssessments";
import Reg17_18Schedule1Checks from "@/components/compliance-hub/Reg17_18Schedule1Checks";
import Reg34ChangeNotifications from "@/components/compliance-hub/Reg34ChangeNotifications";
import Reg20SafeguardingPolicy from "@/components/compliance-hub/Reg20SafeguardingPolicy";
import Reg21MissingChildPolicy from "@/components/compliance-hub/Reg21MissingChildPolicy";
import Reg22BehaviourManagementPolicy from "@/components/compliance-hub/Reg22BehaviourManagementPolicy";
import Reg24_25CaseRecords from "@/components/compliance-hub/Reg24_25CaseRecords";
import Reg26StorageRecords from "@/components/compliance-hub/Reg26StorageRecords";
import AnnexAReportBuilder from "@/components/compliance-hub/AnnexAReportBuilder";
import OutcomeEvidenceReport from "@/components/compliance-hub/OutcomeEvidenceReport";

export default function ComplianceHub() {
  const { user, staffProfile } = useOutletContext();
  const queryClient = useQueryClient();
  
  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isRiskLine = ['risk_officer', 'risk_manager'].includes(staffRole);
  const isHRLine = ['hr_officer', 'hr_manager'].includes(staffRole);
  const isFinanceLine = ['finance_officer', 'finance_manager'].includes(staffRole);
  const isCareLine = ['support_worker', 'team_leader', 'team_manager', 'regional_manager', 'rsm'].includes(staffRole);
  const isSeniorManagement = ['admin', 'rsm', 'regional_manager'].includes(staffRole);

  const [activeReport, setActiveReport] = useState("dashboard");
  const [periodStart, setPeriodStart] = useState(format(subMonths(new Date(), 6), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedHomeId, setSelectedHomeId] = useState(null);
  const [reportStatus, setReportStatus] = useState("draft");
  const [lastSaved, setLastSaved] = useState(null);
  const [complaintsFilterPeriod, setComplaintsFilterPeriod] = useState("12");

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

  // Young people's views
  const [ypViewsMethod, setYpViewsMethod] = useState("");
  const [ypViewsCount, setYpViewsCount] = useState("");
  const [ypViewsSummary, setYpViewsSummary] = useState("");
  const [ypViewsActions, setYpViewsActions] = useState("");

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

  const { data: orgProfile } = useQuery({
    queryKey: ["ch-org-profile"],
    queryFn: () => secureGateway.filter("Organisation", {}).then(r => r[0]),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ["ch-all-staff"],
    queryFn: () => secureGateway.filter("StaffProfile", { status: "active" }),
    staleTime: 10 * 60 * 1000,
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
      yp_views_method: ypViewsMethod,
      yp_views_count: ypViewsCount ? parseInt(ypViewsCount) : 0,
      yp_views_summary: ypViewsSummary,
      yp_views_actions: ypViewsActions,
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
  }, [reportId, periodStart, periodEnd, reviewerName, reviewerOrg, reviewCompleted, strengthsNarrative, improvementsNarrative, actionPlanNarrative, selectedYPs, selectedStrengthEvents, selectedIssueEvents, selectedActionEvents, ypViewsMethod, ypViewsCount, ypViewsSummary, ypViewsActions, managerNotes, reportStatus, staffProfile, activeReport]);

  // Debounced auto-save
  useEffect(() => {
    const t = setTimeout(autoSave, 2000);
    return () => clearTimeout(t);
  }, [autoSave]);

  const filteredComplaints = useMemo(() => {
    if (complaintsFilterPeriod === "all") return complaints;
    const cutoff = new Date(Date.now() - parseInt(complaintsFilterPeriod) * 30 * 24 * 60 * 60 * 1000);
    return complaints.filter(c => c.received_datetime && new Date(c.received_datetime) >= cutoff);
  }, [complaints, complaintsFilterPeriod]);

  const exportComplaintsLog = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Complaints Log</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    h1 { font-size: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #999; font-weight: bold; font-size: 12px; }
    td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .status-resolved { background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .status-investigating { background-color: #cfe2ff; color: #084298; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .status-received { background-color: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .severity-high { color: #dc2626; font-weight: bold; }
    .severity-medium { color: #ea580c; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #999; font-size: 11px; text-align: center; color: #666; }
  </style>
</head>
<body>

<h1>Complaints Log</h1>
<p>Generated on ${format(new Date(), "dd MMMM yyyy HH:mm")}. Period: Last ${complaintsFilterPeriod} months.</p>

<table>
  <thead>
    <tr>
      <th>Ref</th>
      <th>Date Received</th>
      <th>Complainant</th>
      <th>Type</th>
      <th>Severity</th>
      <th>Home</th>
      <th>Days to Resolve</th>
      <th>Outcome</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${filteredComplaints
      .sort((a, b) => (b.received_datetime || "").localeCompare(a.received_datetime || ""))
      .map(c => `
    <tr>
      <td>${c.complaint_id || "—"}</td>
      <td>${c.received_datetime ? format(new Date(c.received_datetime), "dd MMM yyyy") : "—"}</td>
      <td>${c.is_child_complainant ? "Child" : "Other"}</td>
      <td>${c.complaint_type?.replace(/_/g, " ") || "—"}</td>
      <td class="severity-${c.severity || "low"}">${c.severity || "—"}</td>
      <td>${c.home_name || "—"}</td>
      <td>${
        c.resolution_date && c.received_datetime
          ? Math.floor((new Date(c.resolution_date) - new Date(c.received_datetime)) / (1000 * 60 * 60 * 24)) + " days"
          : c.status === "closed" ? "—" : "Open"
      }</td>
      <td>${c.outcome_category?.replace(/_/g, " ") || "—"}</td>
      <td class="status-${c.status || "received"}">${c.status || "received"}</td>
    </tr>
      `).join("")}
  </tbody>
</table>

<footer>
Total complaints: ${filteredComplaints.length} | Resolved: ${filteredComplaints.filter(c => c.status === "resolved" || c.status === "closed").length} | Upheld: ${filteredComplaints.filter(c => c.outcome_category === "upheld").length}
</footer>

</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["ch-"] });

  const exportWorkforcePlan = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Workforce Plan</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 10px; font-weight: bold; }
    h2 { font-size: 16px; margin-top: 30px; margin-bottom: 12px; font-weight: bold; border-bottom: 2px solid #0066cc; padding-bottom: 8px; }
    p { margin: 0 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background-color: #f0f0f0; padding: 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #999; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    .stat { display: inline-block; margin-right: 20px; }
    .stat-value { font-size: 20px; font-weight: bold; color: #0066cc; }
    footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #999; font-size: 11px; text-align: center; color: #666; }
  </style>
</head>
<body>

<h1>Workforce Plan</h1>
<p><strong>Generated:</strong> ${format(new Date(), "dd MMMM yyyy")}</p>

<h2>Current staffing structure</h2>
<div class="stat"><span class="stat-value">${allStaff.filter(s => s.role === "support_worker").length}</span> Support Workers</div>
<div class="stat"><span class="stat-value">${allStaff.filter(s => s.role === "team_leader").length}</span> Team Leaders</div>
<div class="stat"><span class="stat-value">${allStaff.filter(s => s.role === "team_manager").length}</span> Team Managers</div>
<div class="stat"><span class="stat-value">${allStaff.filter(s => ["regional_manager", "rsm", "admin"].includes(s.role)).length}</span> Senior Management</div>
<p style="margin-top: 20px;"><strong>Total active staff:</strong> ${allStaff.length}</p>

<h2>DBS compliance</h2>
<table>
  <tr>
    <th>Status</th>
    <th>Count</th>
  </tr>
  <tr>
    <td>DBS valid</td>
    <td>${allStaff.filter(s => s.dbs_expiry && new Date(s.dbs_expiry) > new Date()).length}</td>
  </tr>
  <tr>
    <td>Expiring in 90 days</td>
    <td>${allStaff.filter(s => {
      const d = s.dbs_expiry && new Date(s.dbs_expiry);
      return d && d > new Date() && d < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }).length}</td>
  </tr>
  <tr>
    <td>Expired or missing</td>
    <td>${allStaff.filter(s => !s.dbs_expiry || new Date(s.dbs_expiry) <= new Date()).length}</td>
  </tr>
</table>

<h2>Workforce plan narrative</h2>
<pre>${orgProfile?.workforce_plan_narrative || "(Not yet provided)"}</pre>

<footer>
This Workforce Plan is an official document for Ofsted inspection purposes. For updates, visit the Compliance & Quality Hub workforce planning section.
</footer>

</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const exportSoP = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Statement of Purpose</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 10px; font-weight: bold; }
    h2 { font-size: 16px; margin-top: 30px; margin-bottom: 12px; font-weight: bold; border-bottom: 2px solid #0066cc; padding-bottom: 8px; }
    p { margin: 0 0 10px 0; }
    pre { font-family: Arial, sans-serif; white-space: pre-wrap; word-wrap: break-word; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #999; font-size: 11px; text-align: center; color: #666; }
  </style>
</head>
<body>

<h1>Statement of Purpose</h1>
<p><strong>Generated:</strong> ${format(new Date(), "dd MMMM yyyy")}</p>

<h2>1. Provider details</h2>
<p><strong>Provider:</strong> ${orgProfile?.name || "—"}</p>
<p><strong>Trading name:</strong> ${orgProfile?.trading_name || "—"}</p>
<p><strong>Ofsted URN:</strong> ${orgProfile?.ofsted_urn || "—"}</p>
<p><strong>Registration date:</strong> ${orgProfile?.registration_date || "—"}</p>
<p><strong>Company number:</strong> ${orgProfile?.company_registration_number || "—"}</p>

<h2>2. Registered Service Manager</h2>
<p><strong>Name:</strong> ${allStaff.find(s => s.role === "super_admin" || s.role === "admin")?.full_name || orgProfile?.registered_service_manager_name || "—"}</p>
<p><strong>Qualification held:</strong> ${orgProfile?.registered_manager_qualification_held ? "Yes" : "No"}</p>
<p><strong>Qualification:</strong> ${orgProfile?.qualification_name || "—"}</p>

<h2>3. Aims and objectives</h2>
<pre>${orgProfile?.aims_and_objectives || "(Not yet provided)"}</pre>

<h2>4. Services provided and accommodation types</h2>
<p><strong>Accommodation types:</strong> Self-contained, Shared (ring-fenced), Shared (non-ring-fenced)</p>
<p><strong>Homes:</strong> ${homes.map(h => h.name).join(", ")}</p>
<p><strong>Capacity:</strong> ${homes.reduce((sum, h) => sum + (h.capacity || 0), 0)} places</p>

<h2>5. Age range and criteria for admission</h2>
<pre>${orgProfile?.admission_criteria || "(Not yet provided)"}</pre>

<h2>6. Staffing structure</h2>
<p><strong>Total active staff:</strong> ${allStaff.length}</p>
<p><strong>Support workers:</strong> ${allStaff.filter(s => s.role === "support_worker").length}</p>
<p><strong>Team leaders:</strong> ${allStaff.filter(s => s.role === "team_leader").length}</p>
<p><strong>Managers:</strong> ${allStaff.filter(s => ["team_manager", "regional_manager", "rsm", "admin"].includes(s.role)).length}</p>

<h2>7. Complaints procedure</h2>
<pre>${orgProfile?.complaints_procedure || "(Not yet provided)"}</pre>

<footer>
This Statement of Purpose is an official document for Ofsted inspection purposes. For updates, visit the organisation settings panel.
</footer>

</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const exportReg33 = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Regulation 33 — Serious Incident Notifications</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    h1 { font-size: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #999; font-weight: bold; font-size: 12px; }
    td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .status-notified { background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .status-pending { background-color: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .status-overdue { background-color: #000; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .hours-green { background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .hours-amber { background-color: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .hours-red { background-color: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #999; font-size: 11px; text-align: center; color: #666; }
  </style>
</head>
<body>

<h1>Regulation 33 — Serious Incident Notifications</h1>
<p>Generated on ${format(new Date(), "dd MMMM yyyy HH:mm")}. Confidential — for inspection use only.</p>

<table>
  <thead>
    <tr>
      <th>Event Date</th>
      <th>Type</th>
      <th>Young Person</th>
      <th>Home</th>
      <th>Hours to Notify</th>
      <th>Notified By</th>
      <th>Ofsted Ref</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${ofstedNotifications
      .sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))
      .map(n => `
    <tr>
      <td>${n.event_date ? format(new Date(n.event_date), 'dd MMM yyyy HH:mm') : '—'}</td>
      <td>${n.notification_type?.replace(/_/g, ' ') || '—'}</td>
      <td>${n.resident_name || '—'}</td>
      <td>${n.home_name || '—'}</td>
      <td><span class="${n.hours_to_notify != null ? (n.hours_to_notify <= 24 ? 'hours-green' : n.hours_to_notify <= 48 ? 'hours-amber' : 'hours-red') : ''}">${n.hours_to_notify != null ? n.hours_to_notify.toFixed(1) + 'h' : '—'}</span></td>
      <td>${n.rsm_notified_by_name || '—'}</td>
      <td>${n.ofsted_reference_number || '—'}</td>
      <td><span class="status-${n.status || 'pending'}">${(n.status || 'pending').charAt(0).toUpperCase() + (n.status || 'pending').slice(1)}</span></td>
    </tr>
      `).join('')}
  </tbody>
</table>

<footer>
Total notifications: ${ofstedNotifications.length} | On time: ${ofstedNotifications.filter(n => n.status === 'notified' && (n.hours_to_notify || 0) <= 24).length} | Late: ${ofstedNotifications.filter(n => n.status === 'notified' && (n.hours_to_notify || 0) > 24).length} | Pending: ${ofstedNotifications.filter(n => n.status === 'pending').length}
</footer>

</body>
</html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

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

  const [searchParams, setSearchParams] = useSearchParams();
  const [mainTab, setMainTab] = useState(() => searchParams.get("mainTab") || localStorage.getItem("ch-main-tab") || "health");

  useEffect(() => {
    const tab = searchParams.get("mainTab");
    if (tab) {
      setMainTab(tab);
      searchParams.delete("mainTab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    localStorage.setItem("ch-main-tab", mainTab);
  }, [mainTab]);

  const handleOpenReport = (key) => {
    setMainTab("ofsted");
    setActiveReport(key);
  };

  const handleExportPack = () => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Compliance Export Pack</title></head><body>
      <h1>Compliance Export Pack</h1>
      <p>Generated: ${format(new Date(), "dd MMMM yyyy HH:mm")}</p>
      <p>Total flags: ${allFlags}</p>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="space-y-4 pb-10">
      {/* ── New Hub Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Dashboard</span><span>/</span>
            <span>Compliance &amp; Governance</span><span>/</span>
            <span className="text-foreground font-medium">OFSTED Reporting</span>
          </div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Compliance &amp; Quality Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">OFSTED reporting, quality assurance, and social worker feedback in one place.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {allFlags > 0 && (
            <span className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-full px-3 py-1.5">
              🚩 {allFlags} flags across org
            </span>
          )}
          <button
            onClick={handleExportPack}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90"
          >
            <Download className="w-4 h-4" /> Export Pack
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center border-b border-border gap-0">
        {[
          { key: "health", label: "Health Check",      icon: "📊" },
          { key: "ofsted", label: "Ofsted Reporting",  icon: "📋" },
          { key: "qa",     label: "Quality Assurance", icon: "🛡️" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              mainTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Health Check Tab ── */}
      {mainTab === "health" && <HealthCheckDashboard staffProfile={staffProfile} user={user} />}

      {/* ── Quality Assurance Placeholder ── */}
      {mainTab === "qa" && <QualityAssurancePlaceholder staffProfile={staffProfile} user={user} staff={staffProfiles} homes={homes} residents={residents} />}

      {/* ── OFSTED Reporting Tab: New grid layout wrapping existing report ── */}
      {mainTab === "ofsted" && activeReport === "dashboard" && (
        <OfstedReportingTab
          modules={ALL_MODULES}
          onOpenReport={handleOpenReport}
          onExportPack={handleExportPack}
          complaints={complaints}
          ofstedNotifications={ofstedNotifications}
          safeguardingRecords={safeguardingRecords}
          mfhRecords={mfhRecords}
        />
      )}

      {/* When a specific report is active, show report + back button */}
      {mainTab === "ofsted" && activeReport !== "dashboard" && (
        <div className="space-y-4">
          <button
            onClick={() => setActiveReport("dashboard")}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            ← Back to OFSTED Reporting
          </button>

          {/* Re-render existing ReportTypeSelector invisibly to keep state, then show content */}
          <div className="hidden">
            <ReportTypeSelector active={activeReport} onChange={setActiveReport} counts={counts} />
          </div>

      {/* Annex A Report */}
      {activeReport === "annex_a" && (
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <AnnexAReportBuilder />
          </div>
        </div>
      )}

      {/* Reg 33 Notifications */}
      {activeReport === "reg33" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Regulation 33 — Serious Incident Notifications</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                All notifications submitted to Ofsted. Ofsted requires notification within 24 hours of a serious event.
              </p>
            </div>
            <button
              onClick={() => exportReg33()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Download className="w-4 h-4" /> Export for Inspection
            </button>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Total Notifications</p>
              <p className="text-2xl font-bold mt-1">{ofstedNotifications.length}</p>
            </div>
            <div className="bg-card border border-red-300 rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Pending (action needed)</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{ofstedNotifications.filter(n => n.status === "pending").length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Notified on time</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{ofstedNotifications.filter(n => n.status === "notified" && (n.hours_to_notify || 0) <= 24).length}</p>
            </div>
            <div className="bg-card border border-amber-300 rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Notified late (&gt;24hrs)</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{ofstedNotifications.filter(n => n.status === "notified" && (n.hours_to_notify || 0) > 24).length}</p>
            </div>
          </div>

          {/* Notifications table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 text-xs font-semibold">Event Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Young Person</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Home</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Hours to Notify</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Notified By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Ofsted Ref</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Screenshot</th>
                </tr>
              </thead>
              <tbody>
                {ofstedNotifications
                  .sort((a, b) => (b.event_date || "").localeCompare(a.event_date || ""))
                  .map(n => (
                    <tr key={n.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs">{n.event_date ? format(new Date(n.event_date), "dd MMM yyyy HH:mm") : "—"}</td>
                      <td className="px-4 py-3 text-xs capitalize">{n.notification_type?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-xs font-medium">{n.resident_name || "—"}</td>
                      <td className="px-4 py-3 text-xs">{n.home_name || "—"}</td>
                      <td className="px-4 py-3">
                        {n.hours_to_notify != null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            n.hours_to_notify <= 24 ? "bg-green-100 text-green-700" :
                            n.hours_to_notify <= 48 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {n.hours_to_notify.toFixed(1)}h
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">{n.rsm_notified_by_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono">{n.ofsted_reference_number || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          n.status === "notified" ? "bg-green-100 text-green-700" :
                          n.status === "pending" ? "bg-red-100 text-red-700" :
                          n.status === "overdue" ? "bg-black text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>{n.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {n.ofsted_screenshot_url ? (
                          <a href={n.ofsted_screenshot_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View</a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {ofstedNotifications.length === 0 && (
              <div className="p-12 text-center text-muted-foreground text-sm">No notifications recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Statement of Purpose */}
      {activeReport === "sop" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Statement of Purpose</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Auto-populated from your organisation settings and staff records.</p>
            </div>
            <button onClick={() => exportSoP()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Download className="w-4 h-4" /> Export as Word
            </button>
          </div>

          {/* SoP sections as editable cards */}
          {[
            {
              title: "1. Provider details",
              content: `Provider: ${orgProfile?.name || "—"}\nTrading name: ${orgProfile?.trading_name || "—"}\nOfsted URN: ${orgProfile?.ofsted_urn || "—"}\nRegistration date: ${orgProfile?.registration_date || "—"}\nCompany number: ${orgProfile?.company_registration_number || "—"}`,
              editable: false,
              link: "/settings",
              linkLabel: "Edit in Settings →"
            },
            {
              title: "2. Registered Service Manager",
              content: `Name: ${allStaff.find(s => s.role === "super_admin" || s.role === "admin")?.full_name || orgProfile?.registered_service_manager_name || "—"}\nQualification held: ${orgProfile?.registered_manager_qualification_held ? "Yes" : "No"}\nQualification: ${orgProfile?.qualification_name || "—"}`,
              editable: false,
              link: "/settings",
              linkLabel: "Edit in Settings →"
            },
            {
              title: "3. Aims and objectives",
              content: orgProfile?.aims_and_objectives || "",
              editable: true,
              field: "aims_and_objectives",
              placeholder: "Describe the aims and objectives of the service..."
            },
            {
              title: "4. Services provided and accommodation types",
              content: `Accommodation types: Self-contained, Shared (ring-fenced), Shared (non-ring-fenced)\nHomes: ${homes.map(h => h.name).join(", ")}\nCapacity: ${homes.reduce((sum, h) => sum + (h.capacity || 0), 0)} places`,
              editable: false
            },
            {
              title: "5. Age range and criteria for admission",
              content: orgProfile?.admission_criteria || "",
              editable: true,
              field: "admission_criteria",
              placeholder: "Describe the age range and admission criteria..."
            },
            {
              title: "6. Staffing structure",
              content: `Total active staff: ${allStaff.length}\nSupport workers: ${allStaff.filter(s => s.role === "support_worker").length}\nTeam leaders: ${allStaff.filter(s => s.role === "team_leader").length}\nManagers: ${allStaff.filter(s => ["team_manager", "regional_manager", "rsm", "admin"].includes(s.role)).length}`,
              editable: false,
              link: "/staff",
              linkLabel: "View in Staff & HR →"
            },
            {
              title: "7. Complaints procedure",
              content: orgProfile?.complaints_procedure || "",
              editable: true,
              field: "complaints_procedure",
              placeholder: "Describe the complaints procedure..."
            },
          ].map((section, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{section.title}</h3>
                {section.link && <Link to={section.link} className="text-xs text-primary hover:underline">{section.linkLabel}</Link>}
              </div>
              {section.editable ? (
                <textarea
                  value={section.content}
                  placeholder={section.placeholder}
                  rows={4}
                  onChange={(e) => {
                    if (orgProfile?.id) {
                      queryClient.setQueryData(["ch-org-profile"], (old) => {
                        if (!old) return old;
                        return { ...old, [section.field]: e.target.value };
                      });
                    }
                  }}
                  onBlur={async (e) => {
                    if (orgProfile?.id) {
                      await secureGateway.update("Organisation", orgProfile.id, { [section.field]: e.target.value });
                      queryClient.invalidateQueries({ queryKey: ["ch-org-profile"] });
                    }
                  }}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              ) : (
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">{section.content}</pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Workforce Plan */}
      {activeReport === "workforce" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Workforce Plan</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Auto-generated from HR data. Review and export for Ofsted.</p>
            </div>
            <button onClick={() => exportWorkforcePlan()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Download className="w-4 h-4" /> Export as Word
            </button>
          </div>

          {/* Staffing structure */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4">Current staffing structure</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Support Workers", count: allStaff.filter(s => s.role === "support_worker").length },
                { label: "Team Leaders", count: allStaff.filter(s => s.role === "team_leader").length },
                { label: "Team Managers", count: allStaff.filter(s => s.role === "team_manager").length },
                { label: "Senior Management", count: allStaff.filter(s => ["regional_manager", "rsm", "admin"].includes(s.role)).length },
                { label: "HR Staff", count: allStaff.filter(s => ["hr_officer", "hr_manager"].includes(s.role)).length },
                { label: "Finance Staff", count: allStaff.filter(s => ["finance_officer", "finance_manager"].includes(s.role)).length },
                { label: "Risk Staff", count: allStaff.filter(s => ["risk_officer", "risk_manager"].includes(s.role)).length },
                { label: "Admin Staff", count: allStaff.filter(s => ["admin_officer", "admin_manager"].includes(s.role)).length },
              ].map((row, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-2xl font-bold mt-1">{row.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Training compliance */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4">Training compliance</h3>
            <p className="text-sm text-muted-foreground">
              Data pulled from Staff & HR → Training Courses.
              <a href="/staff" className="text-primary hover:underline ml-2">View full training matrix →</a>
            </p>
          </div>

          {/* DBS status */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4">DBS status</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700">DBS valid</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{allStaff.filter(s => s.dbs_expiry && new Date(s.dbs_expiry) > new Date()).length}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">Expiring in 90 days</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{allStaff.filter(s => {
                  const d = s.dbs_expiry && new Date(s.dbs_expiry);
                  return d && d > new Date() && d < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                }).length}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-700">Expired or missing</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{allStaff.filter(s => !s.dbs_expiry || new Date(s.dbs_expiry) <= new Date()).length}</p>
              </div>
            </div>
          </div>

          {/* Vacancies */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3">Open vacancies</h3>
            <p className="text-sm text-muted-foreground">
              Managed in Staff & HR → People → Vacancies.
              <a href="/staff" className="text-primary hover:underline ml-2">View vacancies →</a>
            </p>
          </div>

          {/* Narrative section */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3">Workforce plan narrative</h3>
            <p className="text-xs text-muted-foreground mb-3">Describe your recruitment strategy, succession planning, and workforce development plans.</p>
            <textarea
              defaultValue={orgProfile?.workforce_plan_narrative || ""}
              placeholder="Describe your workforce development strategy, recruitment plans, and succession planning..."
              rows={6}
              onBlur={async (e) => {
                if (orgProfile?.id && e.target.value !== (orgProfile?.workforce_plan_narrative || "")) {
                  await secureGateway.update("OrganisationProfile", orgProfile.id, { workforce_plan_narrative: e.target.value });
                }
              }}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Complaints Log */}
      {activeReport === "complaints" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Complaints Log</h2>
              <p className="text-sm text-muted-foreground mt-0.5">All complaints in the reporting period. Ofsted inspectors request this on day one.</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={complaintsFilterPeriod} onChange={e => setComplaintsFilterPeriod(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
                <option value="12">Last 12 months</option>
                <option value="6">Last 6 months</option>
                <option value="all">All time</option>
              </select>
              <button onClick={() => exportComplaintsLog()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Download className="w-4 h-4" /> Export for Inspection
              </button>
            </div>
          </div>

          {/* Summary KPIs */}. Registered Service Manager
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: filteredComplaints.length, color: "" },
              { label: "Open", value: filteredComplaints.filter(c => ["received", "investigating"].includes(c.status)).length, color: "text-amber-600" },
              { label: "Resolved", value: filteredComplaints.filter(c => ["resolved", "closed"].includes(c.status)).length, color: "text-green-600" },
              { label: "From children", value: filteredComplaints.filter(c => c.is_child_complainant).length, color: "text-blue-600" },
              { label: "Upheld", value: filteredComplaints.filter(c => c.outcome_category === "upheld").length, color: "text-red-600" },
            ].map((kpi, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Complaints table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 text-xs font-semibold">Ref</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Date Received</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Complainant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Severity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Home</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Days to Resolve</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Outcome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints
                  .sort((a, b) => (b.received_datetime || "").localeCompare(a.received_datetime || ""))
                  .map(c => (
                    <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs font-mono">{c.complaint_id || "—"}</td>
                      <td className="px-4 py-3 text-xs">{c.received_datetime ? format(new Date(c.received_datetime), "dd MMM yyyy") : "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.is_child_complainant ? <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">Child</span> : "Other"}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{c.complaint_type?.replace(/_/g, " ") || "—"}</td>
                      <td className="px-4 py-3 text-xs capitalize">{c.severity || "—"}</td>
                      <td className="px-4 py-3 text-xs">{c.home_name || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.resolution_date && c.received_datetime
                          ? Math.floor((new Date(c.resolution_date) - new Date(c.received_datetime)) / (1000 * 60 * 60 * 24)) + " days"
                          : c.status === "closed" ? "—" : "Open"}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{c.outcome_category?.replace(/_/g, " ") || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          c.status === "resolved" || c.status === "closed" ? "bg-green-100 text-green-700" :
                          c.status === "investigating" ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {filteredComplaints.length === 0 && (
              <div className="p-12 text-center text-muted-foreground text-sm">No complaints in this period.</div>
            )}
          </div>
        </div>
      )}

      {/* Outcome & Impact Evidence Summary */}
      {activeReport === "outcome_evidence" && (
        <OutcomeEvidenceReport user={user} staffProfile={staffProfile} />
      )}

      {/* New placeholder tabs */}
      {activeReport === "restraint_records" && (
        <div className="p-8 text-center text-muted-foreground space-y-3">
          <p className="text-xs font-mono text-primary/60">Reg 22(2)</p>
          <p className="text-sm">Reg 22(2) — Mandatory record within 24 hours of any restraint used on a child. Includes 48-hour RSM sign-off and 5-day child agreement workflow.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">🚧 Coming Soon</span>
        </div>
      )}
      {(activeReport === "location_assessments" || activeReport === "reg6") && (
        <Reg6LocationAssessments staffProfile={staffProfile} />
      )}
      {activeReport === "reg28" && (
        <Reg28AdmissionDischargeNotices
          homes={homes}
          residents={residents}
          staffProfile={staffProfile}
        />
      )}
      {activeReport === "contingency_plan" && (
        <Reg23ContingencyPlan staffProfile={staffProfile} />
      )}
      {activeReport === "rsm_absence" && (
        <div className="p-8 text-center text-muted-foreground space-y-3">
          <p className="text-xs font-mono text-primary/60">Reg 33</p>
          <p className="text-sm">Reg 33 — Record of Registered Service Manager absences of 28 days or more, including advance notice to Ofsted, cover arrangements, and return to duty notification.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">🚧 Coming Soon</span>
        </div>
      )}
      {activeReport === "schedule1_checks" && (
        <div className="p-8 text-center text-muted-foreground space-y-3">
          <p className="text-xs font-mono text-primary/60">Regs 11, 12 &amp; 17</p>
          <p className="text-sm">Regs 11, 12 &amp; 17 — Record that all required pre-employment checks are complete for every person working at the undertaking: identity, DBS, references, employment history, qualifications.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">🚧 Coming Soon</span>
        </div>
      )}

      {activeReport === "missing_child_policy" && (
        <Reg21MissingChildPolicy staffProfile={staffProfile} />
      )}

      {/* Reg 22 — Behaviour Management Policy + Restraint Records */}
      {activeReport === "reg22" && (
        <Reg22BehaviourManagementPolicy staffProfile={staffProfile} />
      )}

      {/* Reg 17 & 18 — Schedule 1 Checks */}
      {activeReport === "reg17_18" && (
        <Reg17_18Schedule1Checks staffProfile={staffProfile} />
      )}

      {/* Reg 34 — Notice of Changes */}
      {activeReport === "reg34" && (
        <Reg34ChangeNotifications staffProfile={staffProfile} />
      )}

      {/* Reg 20 — Safeguarding Policy */}
      {activeReport === "safeguarding_policy" && (
        <Reg20SafeguardingPolicy staffProfile={staffProfile} />
      )}

      {[
        { key: "reg4", icon: "Users", ref: "Regulation 4", text: "Reg 4 — The registered person must enable, inspire and lead a culture that puts children first. Covers staffing levels, recruitment practices, supervision arrangements, training, workforce plan and business continuity." },
        { key: "reg5", icon: "ShieldCheck", ref: "Regulation 5", text: "Reg 5 — Children must be enabled to feel safe and have their needs met. Covers child protection policies, safeguarding procedures, exploitation risk, and staff responsibilities for keeping children safe." },
        { key: "reg6", icon: "Home", ref: "Regulation 6", text: "Reg 6 — Children must experience a comfortable and secure living environment. Covers location assessments (annual, per premises), health and safety compliance, fire safety, private bedrooms, and written agreements with children." },
        { key: "reg17_18", icon: "ClipboardCheck", ref: "Regulations 17 & 18", text: "Regs 17 & 18 — All staff must satisfy Schedule 1 checks before starting work (identity, DBS, references, employment history, qualifications). Permanent appointments subject to probation. Annual appraisal required. Disciplinary procedure must be in place." },
        { key: "reg20", icon: "Shield", ref: "Regulation 20", text: "Reg 20 — The registered person must prepare and implement a safeguarding policy covering protection from abuse or neglect, referral procedures to the accommodating authority, record-keeping of allegations, and staff reporting responsibilities." },
        { key: "reg21", icon: "AlertTriangle", ref: "Regulation 21", text: "Reg 21 — The registered person must prepare and implement a missing child policy covering prevention steps, procedures when a child is missing, roles and responsibilities of staff, and regard to local authority and police protocols." },
        { key: "reg22_placeholder_disabled", icon: "BookOpen", ref: "Regulation 22", text: "" },
        { key: "reg23", icon: "LifeBuoy", ref: "Regulation 23", text: "Reg 23 — Written contingency plan policy covering what happens to children and their records if the undertaking ceases operation permanently or temporarily. Must be provided to any local authority considering placing a child." },
        { key: "reg24_25", icon: "FolderOpen", ref: "Regulations 24 & 25", text: "Regs 24 & 25 — Case records must be maintained for every child including personal details, statutory provision, contact details, missing episodes, restraint use, contact arrangements, health records, medication, plans and reports. Records retained for 75 years from date of birth." },
        { key: "reg26", icon: "Archive", ref: "Regulation 26", text: "Reg 26 — All records including the statement of purpose, children's case records, complaints records, restraint records, quality of support review reports, and location assessment records must be stored accessibly and may be kept in electronic form." },
        { key: "reg28_new", icon: "ArrowLeftRight", ref: "Regulation 28", text: "Reg 28 — Written notification must be sent to the local authority for the area in which the premises are located of every admission and discharge of a child. Notification must include child name, DOB, legal basis, care order status, IRO or PA contact details, and EHC plan status." },
        { key: "reg33_new", icon: "UserX", ref: "Regulation 33", text: "Reg 33 — If the RSM proposes to be absent for 28 or more continuous days, written notice must be given to Ofsted at least one month in advance. Emergency absences must be notified within one week. Return to duty must be notified within 7 days." },
        { key: "reg34_new", icon: "Bell", ref: "Regulation 34", text: "Reg 34 — The registered person must notify Ofsted in writing of specified changes as soon as reasonably practicable. New premises must be notified within 72 hours of first accommodating a child. Premises no longer in use must be notified within 10 working days." },
      ].map(({ key, ref, text }) =>
        activeReport === key ? (
          <div key={key} className="p-10 text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <span className="text-muted-foreground text-lg">📋</span>
            </div>
            <p className="text-xs font-mono text-primary/60 uppercase tracking-wide">{ref}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">🚧 Coming Soon</span>
          </div>
        ) : null
      )}

      {/* Non-Reg32/Annex-A/Reg33/SoP/Workforce/Complaints/OutcomeEvidence placeholder */}
      {activeReport === "reg24_25" && (
        <Reg24_25CaseRecords staffProfile={staffProfile} />
      )}

      {activeReport === "reg26" && (
        <Reg26StorageRecords staffProfile={staffProfile} />
      )}


      {activeReport === "case_records_retention" && (
        <div className="p-10 text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-xs font-mono text-primary/60 uppercase tracking-wide">Regulations 24 & 25 — Supported Accommodation (England) Regulations 2023</p>
          <p className="text-sm text-muted-foreground leading-relaxed">Case records must be maintained for every child and kept for 75 years from their date of birth. Records must contain all items listed in Schedule 2. Other records must be retained for at least 15 years from the date of the last entry.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">🚧 Coming Soon</span>
        </div>
      )}

      {activeReport === "storage_records" && (
        <div className="p-10 text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-xs font-mono text-primary/60 uppercase tracking-wide">Regulation 26 — Supported Accommodation (England) Regulations 2023</p>
          <p className="text-sm text-muted-foreground leading-relaxed">All specified records must be stored in an accessible manner and may be kept in electronic form. An annual audit confirms that all 12 categories required by Regulation 26 can be produced on demand.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">🚧 Coming Soon</span>
        </div>
      )}

      {activeReport === "reg4" && (
        <div className="p-10 text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-xs font-mono text-primary/60 uppercase tracking-wide">Regulation 4 — Supported Accommodation (England) Regulations 2023</p>
          <p className="text-sm text-muted-foreground leading-relaxed">The registered person must enable, inspire and lead a culture that puts children first. Covers staffing levels, recruitment practices, supervision arrangements, training, workforce plan and business continuity. Ofsted grades provider performance directly against this standard.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">🚧 Coming Soon</span>
        </div>
      )}

      {activeReport === "reg5" && (
        <div className="p-10 text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-xs font-mono text-primary/60 uppercase tracking-wide">Regulation 5 — Supported Accommodation (England) Regulations 2023</p>
          <p className="text-sm text-muted-foreground leading-relaxed">Children must be enabled to feel safe and have their individual needs met. Covers child protection policies, safeguarding procedures, exploitation risk identification, and staff responsibilities for keeping children safe. Ofsted grades provider performance directly against this standard.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">🚧 Coming Soon</span>
        </div>
      )}

      {activeReport === "reg11_12" && (
        <div className="p-10 text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-xs font-mono text-primary/60 uppercase tracking-wide">Regulations 11 & 12 — Supported Accommodation (England) Regulations 2023</p>
          <p className="text-sm text-muted-foreground leading-relaxed">The registered provider and registered service manager must satisfy fitness requirements including integrity and good character, appropriate experience and skills, mental and physical fitness, and financial fitness. Full Schedule 1 checks are required for all registered persons.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">🚧 Coming Soon</span>
        </div>
      )}

      {activeReport === "reg29" && (
        <div className="p-10 text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-xs font-mono text-primary/60 uppercase tracking-wide">Regulation 29 — Supported Accommodation (England) Regulations 2023</p>
          <p className="text-sm text-muted-foreground leading-relaxed">The registered provider, registered service manager, nominated individual, directors and partners must notify Ofsted in writing without delay if convicted of a criminal offence anywhere in England and Wales or elsewhere. Notification must include the date and place of conviction, the offence, and the penalty imposed.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">🚧 Coming Soon</span>
        </div>
      )}

      {activeReport === "reg35" && (
        <div className="p-10 text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-xs font-mono text-primary/60 uppercase tracking-wide">Regulation 35 — Supported Accommodation (England) Regulations 2023</p>
          <p className="text-sm text-muted-foreground leading-relaxed">The registered provider must carry on the undertaking in a manner likely to ensure financial viability. Adequate financial records must be maintained. Annual accounts certified by an accountant, insurance certificates, and financial viability information must be available to Ofsted on request.</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">🚧 Coming Soon</span>
        </div>
      )}

      {activeReport !== "reg32" && activeReport !== "annex_a" && activeReport !== "reg33" && activeReport !== "sop" && activeReport !== "workforce" && activeReport !== "complaints" && activeReport !== "outcome_evidence" && activeReport !== "restraint_records" && activeReport !== "location_assessments" && activeReport !== "reg28" && activeReport !== "reg17_18" && activeReport !== "safeguarding_policy" && activeReport !== "reg34" && activeReport !== "reg24_25" && activeReport !== "reg26" && activeReport !== "missing_child_policy" && activeReport !== "contingency_plan_policy" && activeReport !== "case_records_retention" && activeReport !== "storage_records" && activeReport !== "reg4" && activeReport !== "reg5" && activeReport !== "reg11_12" && activeReport !== "reg29" && activeReport !== "reg35" && activeReport !== "reg27" && activeReport !== "contingency_plan" && activeReport !== "reg22" && (
        <ComingSoonPanel reportType={
          { childrens_guide: "Children's Guide", reg27: "Reg 27 — Notification of a Serious Event" }[activeReport] || activeReport
        } />
      )}

      {/* Reg27 content */}
      {activeReport === "reg27" && (
        <IncidentIntelligenceHub ofstedNotifications={ofstedNotifications} />
      )}

      {/* Reg32 content */}
      {activeReport === "reg32" && (
        <Reg32IntelligenceHub
          homes={homes}
          residents={residents}
          safeguardingRecords={safeguardingRecords}
          mfhRecords={mfhRecords}
          visitReports={visitReports}
          complaints={complaints}
          trainingRecords={trainingRecords}
          staffProfiles={staffProfiles}
          supportPlans={supportPlans}
          ypViews={ypViews}
          laReviews={laReviews}
          significantEvents={significantEvents}
          ofstedNotifications={ofstedNotifications}
          supervisionRecords={supervisionRecords}
          
          periodStart={periodStart}
          setPeriodStart={setPeriodStart}
          periodEnd={periodEnd}
          setPeriodEnd={setPeriodEnd}
          
          reviewerName={reviewerName}
          setReviewerName={setReviewerName}
          reviewerOrg={reviewerOrg}
          setReviewerOrg={setReviewerOrg}
          completedDate={completedDate}
          setCompletedDate={setCompletedDate}
          
          selectedYPs={selectedYPs}
          setSelectedYPs={setSelectedYPs}
          
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
          
          onRefresh={handleRefresh}
        />
      )}
        </div>
      )}
    </div>
  );
}