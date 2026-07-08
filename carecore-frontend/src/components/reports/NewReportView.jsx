import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import VisitReportKPIForm from "@/components/reports/VisitReportKPIForm";
import VisitReportPreview from "@/components/reports/VisitReportPreview";
import KeyWorkOutcomeSection from "@/components/residents/keywork/KeyWorkOutcomeSection";
import PAVisitLogModal from "@/components/eighteen-plus/PATab/PAVisitLogModal";
import LAReviewLogModal from "@/components/eighteen-plus/PATab/LAReviewLogModal";
import { createNotification } from "@/lib/createNotification";
import { toast } from "sonner";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";

function getMonday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(dateStr).setDate(diff)).toISOString().split("T")[0];
}
function getMonth(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function NewReportView({ user, staffProfile, onBack }) {
  const queryClient = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger(staffProfile);
  const [step, setStep] = useState(1);
  const [kwOutcome, setKwOutcome] = useState({});
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showAddPAVisit, setShowAddPAVisit] = useState(false);
  const [showAddLAReview, setShowAddLAReview] = useState(false);

  const { data: residents = [] } = useQuery({
    queryKey: ["sw-residents-for-report"],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }),
  });
  const { data: homes = [] } = useQuery({
    queryKey: ["homes-for-report"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
  });
  const { data: paDetails = [] } = useQuery({
    queryKey: ["pa-details"],
    queryFn: () => secureGateway.filter("PADetails", {}),
    enabled: showAddPAVisit,
  });
  const { data: pathwayPlans = [] } = useQuery({
    queryKey: ["pathway-plans"],
    queryFn: () => secureGateway.filter("PathwayPlan", {}, "-created_date", 500),
    enabled: showAddPAVisit,
  });

  const createPAVisitMutation = useMutation({
    mutationFn: (data) => secureGateway.create("PAVisit", data),
    onSuccess: () => {
      toast.success("PA Visit logged successfully");
      queryClient.invalidateQueries({ queryKey: ["pa-visits"] });
      setShowAddPAVisit(false);
    },
    onError: (error) => toast.error(`Failed to save PA Visit: ${error.message || "Unknown error"}`),
  });

  const createLAReviewMutation = useMutation({
    mutationFn: (data) => secureGateway.create("LAReview", data),
    onSuccess: () => {
      toast.success("LA Review logged successfully");
      queryClient.invalidateQueries({ queryKey: ["la-reviews"] });
      setShowAddLAReview(false);
    },
    onError: (error) => toast.error(`Failed to save LA Review: ${error.message || "Unknown error"}`),
  });

  const { data: allStaffForKW = [] } = useQuery({
    queryKey: ["staff-for-kw"],
    queryFn: () => secureGateway.filter("StaffProfile"),
    staleTime: 30 * 60 * 1000,
  });

  const [kpiData, setKpiData] = useState({
    resident_id: "", home_id: "", date: new Date().toISOString().split("T")[0],
    time_start: "", time_end: "", time_of_contact: "", visit_type: "", location_summary: "",
    presentation: "", placement_condition: "", cleaning_action: "", fire_check: "",
    supplies_needed: [], household_notes: "", primary_purpose: "", college_status: "",
    college_discussion: [], appointment_type: "", appointment_details_notes: "",
    life_skills: [], liaison: [], liaison_notes: "", custom_action: "", resident_voice: "",
    voice_concern_detail: "", engagement_level: "", risk_level_assessment: "",
    independence_progress: "", health_adherence: "", is_key_worker_session: false, is_daily_summary: false,
  });

  const selectedResident = residents.find(r => r.id === kpiData.resident_id);
  const selectedHome = homes.find(h => h.id === kpiData.home_id);

  const calculateDuration = () => {
    if (!kpiData.time_start || !kpiData.time_end) return null;
    const [sh, sm] = kpiData.time_start.split(":").map(Number);
    const [eh, em] = kpiData.time_end.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const createMutation = useMutation({
    mutationFn: (data) => secureGateway.create("VisitReport", data),
    onSuccess: (createdReport) => {
      secureGateway.create("KPIRecord", {
        visit_report_id: createdReport.id, resident_id: kpiData.resident_id,
        worker_id: staffProfile?.id || createdReport.worker_id, home_id: kpiData.home_id || selectedResident?.home_id || "",
        date: kpiData.date, is_key_worker_session: kpiData.is_key_worker_session === true,
        is_daily_summary: kpiData.is_daily_summary === true, visit_type: kpiData.visit_type || null,
        presentation: kpiData.presentation || null, placement_condition: kpiData.placement_condition || null,
        primary_purpose: kpiData.primary_purpose || null, college_status: kpiData.college_status || null,
        life_skills: kpiData.life_skills || [], liaison: Array.isArray(kpiData.liaison) ? kpiData.liaison.join(", ") : (kpiData.liaison || null),
        engagement_level: kpiData.engagement_level || null, risk_level: kpiData.risk_level_assessment || null,
        independence_progress: kpiData.independence_progress || null, health_adherence: kpiData.health_adherence || null,
        appointment_type: kpiData.appointment_details_type || kpiData.appointment_type || null,
        appointment_details_notes: kpiData.appointment_details_notes || null,
      }).catch(() => { });

      secureGateway.create("SWPerformanceKPI", {
        worker_id: staffProfile?.id || createdReport.worker_id, worker_name: createdReport.worker_name,
        employee_id: "", home_id: createdReport.home_id, resident_id: createdReport.resident_id,
        date: createdReport.date, week_start: getMonday(createdReport.date), month: getMonth(createdReport.date),
        activity_type: createdReport.is_key_worker_session ? "key_worker_session" : createdReport.is_daily_summary ? "daily_summary" : "visit_report",
        source_entity: "VisitReport", source_id: createdReport.id,
        hours_with_yp: (createdReport.duration_minutes || 0) / 60, visit_type: kpiData?.visit_type || null,
        presentation: kpiData?.presentation || null, placement_condition: kpiData?.placement_condition || null,
        engagement_level: kpiData?.engagement_level || null, risk_level: kpiData?.risk_level_assessment || null,
        independence_progress: kpiData?.independence_progress || null, health_adherence: kpiData?.health_adherence || null,
        life_skills: kpiData?.life_skills || [], appointment_type: kpiData?.appointment_details_type || kpiData?.appointment_type || null,
        location_summary: kpiData?.location_summary || null, time_of_contact: kpiData?.time_of_contact || null,
        kw_session_count: createdReport.is_key_worker_session ? 1 : 0, cic_report_count: 0,
        support_plan_count: 0, gp_appointment_count: kpiData?.appointment_type && kpiData.appointment_type !== "None" ? 1 : 0,
      }).catch(() => { });

      if (createdReport.status === "submitted") {
        const home = homes.find(h => h.id === (createdReport.home_id || selectedResident?.home_id));
        secureGateway.filter("StaffProfile").then(allStaff => {
          const tl = home?.team_leader_id ? allStaff.find(s => s.id === home.team_leader_id) : null;
          const recipient = (tl?.user_id ? tl : null) || allStaff.find(s => s.role === "admin" && s.user_id);
          if (recipient?.user_id) {
            createNotification({
              recipient_user_id: recipient.user_id, recipient_staff_id: recipient.id,
              org_id: recipient.org_id || "default_org", title: "Visit Report Pending Review",
              body: `${createdReport.worker_name} has submitted a visit report for ${createdReport.resident_name} on ${createdReport.date}. Please review and approve.`,
              type: "visit_report", link: "/residents", priority: "normal",
            });
          }
        }).catch(() => { });
      }

      if (createdReport.status === "submitted") {
        triggerWorkflow({
          workflowType: "records_visit_reports",
          entityId: createdReport.id,
          entityRef: `VR-${createdReport.id.slice(0, 8)}`,
          title: createdReport.is_key_worker_session
            ? `Key Worker Session — ${createdReport.resident_name}`
            : `Visit Report — ${createdReport.resident_name}`,
          description: `${createdReport.date} — ${staffProfile?.full_name || ""}`,
          homeId: createdReport.home_id || "",
          homeName: createdReport.home_name || "",
          priority: "routine",
        });
      }

      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visit-reports-list"] }),
        queryClient.invalidateQueries({ queryKey: ["reports-recent"] }),
      ]).then(() => {
        toast.success("Report saved successfully");
        onBack();
      });
    },
  });

  const generateReport = async () => {
    if (!kpiData.resident_id) { toast.error("Please select a resident before generating a report."); return; }
    setGenerating(true);
    try {
      const duration = calculateDuration();
      const prompt = `You are a professional care worker writing a formal visit report for a young person in supported care.
Generate a professional report with three sections: Action, Outcome, and Recommendations.
Write in third person. Be specific and professional. Reference the specific observations below.
RESIDENT: ${selectedResident?.display_name || "the resident"}, Home: ${selectedHome?.name || "the placement"}, Date: ${kpiData.date}, Duration: ${duration ? duration + " minutes" : "not recorded"}
KPI: Visit type: ${kpiData.visit_type || "not recorded"}, Presentation: ${kpiData.presentation || "not recorded"}, Placement condition: ${kpiData.placement_condition || "not recorded"}, Primary purpose: ${kpiData.primary_purpose || "not recorded"}, Education: ${kpiData.college_status || "not recorded"}, Life skills: ${kpiData.life_skills?.join(", ") || "none"}, Engagement: ${kpiData.engagement_level || "not recorded"}, Risk: ${kpiData.risk_level_assessment || "not recorded"}, Independence: ${kpiData.independence_progress || "not recorded"}, Health: ${kpiData.health_adherence || "not recorded"}
NOTES: ${kpiData.custom_action || "No additional notes"}
Generate: ACTION (3+ sentences), OUTCOME (3+ sentences), RECOMMENDATIONS (3+ sentences).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: { type: "object", properties: { action: { type: "string" }, outcome: { type: "string" }, recommendations: { type: "string" } }, required: ["action", "outcome", "recommendations"] },
      });
      setGeneratedReport({ action: result.action, outcome: result.outcome, recommendations: result.recommendations });
      setStep(2);
    } catch {
      toast.error("Failed to generate report. Please try again.");
    }
    setGenerating(false);
  };

  const handleSave = (status) => {
    if (!staffProfile?.id) {
      toast.error("Your staff profile hasn't finished loading yet. Please try again in a moment.");
      return;
    }
    createMutation.mutate({
      resident_id: kpiData.resident_id, resident_name: selectedResident?.display_name || "",
      worker_id: staffProfile.id, worker_name: staffProfile.full_name || user?.full_name || "Unknown Worker",
      home_id: kpiData.home_id || selectedResident?.home_id || "", home_name: selectedHome?.name || "",
      date: kpiData.date, time_start: kpiData.time_start, time_end: kpiData.time_end,
      duration_minutes: calculateDuration(), is_key_worker_session: kpiData.is_key_worker_session === true,
      is_daily_summary: kpiData.is_daily_summary === true, kpi_data: kpiData,
      action_text: generatedReport?.action || "", outcome_text: generatedReport?.outcome || "",
      recommendations_text: generatedReport?.recommendations || "",
      ai_generated_action: generatedReport?.action || "", ai_generated_outcome: generatedReport?.outcome || "",
      ai_generated_recommendations: generatedReport?.recommendations || "",
      worker_edited: false, status, ...(kpiData.is_key_worker_session ? kwOutcome : {}), kw_locked: status === "submitted",
    });
  };

  if (step === 2 && generatedReport) {
    return (
      <VisitReportPreview
        report={generatedReport} onChange={setGeneratedReport} onBack={() => setStep(1)}
        onSaveDraft={() => handleSave("draft")} onSubmit={() => handleSave("submitted")}
        saving={createMutation.isPending} residentName={selectedResident?.display_name}
        workerName={user?.full_name} date={kpiData.date}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Visit Report</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddPAVisit(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add PA Visit
            </button>
            <button
              onClick={() => setShowAddLAReview(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add LA Review
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-muted-foreground text-sm">Complete the KPI form and generate your AI-powered report.</p>
          <p className="text-muted-foreground text-xs">
            {new Date().toLocaleDateString("en-GB", { month: "short", day: "numeric" })} · {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
      <VisitReportKPIForm kpiData={kpiData} onChange={setKpiData} residents={residents} homes={homes} onGenerate={generateReport} generating={generating} isAdmin={user?.role === "admin"} />
      {kpiData.is_key_worker_session && (
        <div className="mt-4">
          <KeyWorkOutcomeSection data={kwOutcome} onChange={setKwOutcome} locked={false} staff={allStaffForKW} />
        </div>
      )}

      {showAddPAVisit && (
        <PAVisitLogModal
          resident={null}
          residents={residents}
          paDetails={paDetails}
          pathwayPlans={pathwayPlans}
          existingVisit={null}
          onClose={() => setShowAddPAVisit(false)}
          onSave={(data) => createPAVisitMutation.mutate(data)}
        />
      )}

      {showAddLAReview && (
        <LAReviewLogModal
          resident={null}
          residents={residents}
          onClose={() => setShowAddLAReview(false)}
          onSave={(data) => createLAReviewMutation.mutate(data)}
        />
      )}
    </div>
  );
}
