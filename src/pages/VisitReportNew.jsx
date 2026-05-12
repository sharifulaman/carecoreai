import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import VisitReportKPIForm from "../components/reports/VisitReportKPIForm";
import VisitReportPreview from "../components/reports/VisitReportPreview";
import { createNotification } from "@/lib/createNotification";

function calculateAge(dob) {
  if (!dob) return "unknown";
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

export default function VisitReportNew() {
  const { user, staffProfile: myStaffProfile } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedResident = urlParams.get("resident");

  const [step, setStep] = useState(1);
  const [kpiData, setKpiData] = useState({
    resident_id: preselectedResident || "",
    home_id: "",
    date: new Date().toISOString().split("T")[0],
    time_start: "",
    time_end: "",
    time_of_contact: "",
    visit_type: "",
    location_summary: "",
    presentation: "",
    placement_condition: "",
    cleaning_action: "",
    fire_check: "",
    supplies_needed: [],
    household_notes: "",
    primary_purpose: "",
    college_status: "",
    college_discussion: [],
    appointment_type: "",
    appointment_details_notes: "",
    life_skills: [],
    liaison: [],
    liaison_notes: "",
    custom_action: "",
    resident_voice: "",
    voice_concern_detail: "",
    engagement_level: "",
    risk_level_assessment: "",
    independence_progress: "",
    health_adherence: "",
    is_key_worker_session: false,
    is_daily_summary: false,
  });
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { data: residents = [] } = useQuery({
    queryKey: ["sw-residents-for-report"],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }),
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-for-report"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
  });

  const selectedResident = residents.find(r => r.id === kpiData.resident_id);
  const selectedHome = homes.find(h => h.id === kpiData.home_id);

  const calculateDuration = () => {
    if (!kpiData.time_start || !kpiData.time_end) return null;
    const [sh, sm] = kpiData.time_start.split(":").map(Number);
    const [eh, em] = kpiData.time_end.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const getMonday = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(new Date(dateStr).setDate(diff)).toISOString().split("T")[0];
  };
  const getMonth = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const createMutation = useMutation({
    mutationFn: (data) => secureGateway.create("VisitReport", data),
    onSuccess: (createdReport) => {
      // Create KPIRecord immediately after VisitReport is created (non-blocking)
      secureGateway.create("KPIRecord", {
        visit_report_id: createdReport.id,
        resident_id: kpiData.resident_id,
        worker_id: myStaffProfile?.id || user?.email || "",
        home_id: kpiData.home_id || selectedResident?.home_id || "",
        date: kpiData.date,
        is_key_worker_session: kpiData.is_key_worker_session === true,
        is_daily_summary: kpiData.is_daily_summary === true,
        visit_type: kpiData.visit_type || null,
        presentation: kpiData.presentation || null,
        placement_condition: kpiData.placement_condition || null,
        primary_purpose: kpiData.primary_purpose || null,
        college_status: kpiData.college_status || null,
        life_skills: kpiData.life_skills || [],
        liaison: Array.isArray(kpiData.liaison) ? kpiData.liaison.join(", ") : (kpiData.liaison || null),
        engagement_level: kpiData.engagement_level || null,
        risk_level: kpiData.risk_level_assessment || null,
        independence_progress: kpiData.independence_progress || null,
        health_adherence: kpiData.health_adherence || null,
        appointment_type: kpiData.appointment_details_type || kpiData.appointment_type || null,
        appointment_details_notes: kpiData.appointment_details_notes || null,
      }).catch(() => {}); // non-blocking

      // Create SWPerformanceKPI record (non-blocking)
      secureGateway.create("SWPerformanceKPI", {
            worker_id: myStaffProfile?.id || createdReport.worker_id,
            worker_name: createdReport.worker_name,
            employee_id: "",
            home_id: createdReport.home_id,
            resident_id: createdReport.resident_id,
            date: createdReport.date,
            week_start: getMonday(createdReport.date),
            month: getMonth(createdReport.date),
            activity_type: createdReport.is_key_worker_session ? "key_worker_session" : createdReport.is_daily_summary ? "daily_summary" : "visit_report",
            source_entity: "VisitReport",
            source_id: createdReport.id,
            hours_with_yp: (createdReport.duration_minutes || 0) / 60,
            visit_type: kpiData?.visit_type || null,
            presentation: kpiData?.presentation || null,
            placement_condition: kpiData?.placement_condition || null,
            engagement_level: kpiData?.engagement_level || null,
            risk_level: kpiData?.risk_level_assessment || null,
            independence_progress: kpiData?.independence_progress || null,
            health_adherence: kpiData?.health_adherence || null,
            life_skills: kpiData?.life_skills || [],
            appointment_type: kpiData?.appointment_details_type || kpiData?.appointment_type || null,
            location_summary: kpiData?.location_summary || null,
            time_of_contact: kpiData?.time_of_contact || null,
            kw_session_count: createdReport.is_key_worker_session ? 1 : 0,
            cic_report_count: 0,
            support_plan_count: 0,
            gp_appointment_count: kpiData?.appointment_type && kpiData.appointment_type !== "None" ? 1 : 0,
          }).catch(() => {}); // non-blocking

      // Trigger 5 — notify TL if submitted
      if (createdReport.status === "submitted") {
        const home = homes.find(h => h.id === (createdReport.home_id || selectedResident?.home_id));
        const tlStaffId = home?.team_leader_id;
        // Always fetch staff to find TL or fallback to admin
        secureGateway.filter("StaffProfile").then(allStaff => {
            const notifBody = `${createdReport.worker_name} has submitted a visit report for ${createdReport.resident_name} on ${createdReport.date}. Please review and approve.`;
            const tl = tlStaffId ? allStaff.find(s => s.id === tlStaffId) : null;
            const recipient = (tl?.user_id ? tl : null) || allStaff.find(s => s.role === "admin" && s.user_id);
            if (recipient?.user_id) {
              createNotification({
                recipient_user_id: recipient.user_id,
                recipient_staff_id: recipient.id,
                org_id: recipient.org_id || "default_org",
                title: "Visit Report Pending Review",
                body: notifBody,
                type: "visit_report",
                link: "/visit-reports",
                priority: "normal",
              });
            }
          }).catch(() => {});
      }
      // Invalidate cache and wait before navigating to ensure refetch completes
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visit-reports-list"] }),
        queryClient.invalidateQueries({ queryKey: ["reports-recent"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-bell"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-messages"] }),
      ]).then(() => {
        toast.success("Report saved successfully");
        navigate("/visit-reports");
      });
    },
  });

  const generateReport = async () => {
    if (!kpiData.resident_id) {
      toast.error("Please select a resident before generating a report.");
      return;
    }

    setGenerating(true);
    try {
      const duration = calculateDuration();
      const residentName = selectedResident?.display_name || "the resident";
      const homeName = selectedHome?.name || "the placement";

      const prompt = `You are a professional care worker writing a formal visit report for a young person in supported care.

Generate a professional report with three sections: Action, Outcome, and Recommendations.
Write in third person. Be specific and professional. Reference the specific observations below.
Do not use generic filler text — every sentence must reference the actual data provided.

RESIDENT INFORMATION:
- Name identifier: ${residentName}
- Home: ${homeName}
- Visit date: ${kpiData.date}
- Visit duration: ${duration ? duration + " minutes" : "not recorded"}

KPI OBSERVATIONS:
- Visit type: ${kpiData.visit_type || "not recorded"}
- Resident presentation: ${kpiData.presentation || "not recorded"}
- Placement condition: ${kpiData.placement_condition || "not recorded"}
- Primary purpose of visit: ${kpiData.primary_purpose || "not recorded"}
- Education/college status: ${kpiData.college_status || "not recorded"}
- Life skills observed: ${kpiData.life_skills?.length > 0 ? kpiData.life_skills.join(", ") : "none recorded"}
- Professional liaison: ${Array.isArray(kpiData.liaison) ? kpiData.liaison.join(", ") : (kpiData.liaison || "not recorded")}
- Engagement level: ${kpiData.engagement_level || "not recorded"}
- Risk level: ${kpiData.risk_level_assessment || "not recorded"}
- Independence progress: ${kpiData.independence_progress || "not recorded"}
- Health adherence: ${kpiData.health_adherence || "not recorded"}
${(kpiData.appointment_details_type || kpiData.appointment_type) && kpiData.appointment_type !== "None" ? `- Appointment attended: ${kpiData.appointment_details_type || kpiData.appointment_type}` : ""}
${kpiData.appointment_details_notes ? `- Appointment notes: ${kpiData.appointment_details_notes}` : ""}
${kpiData.liaison_notes ? `- Liaison notes: ${kpiData.liaison_notes}` : ""}
${kpiData.household_notes ? `- Household observations: ${kpiData.household_notes}` : ""}
${kpiData.resident_voice ? `- Resident voice: ${kpiData.resident_voice}` : ""}
${kpiData.voice_concern_detail ? `- Voice concern detail: ${kpiData.voice_concern_detail}` : ""}

WORKER NOTES:
${kpiData.custom_action || "No additional notes provided"}

Generate three sections:
ACTION: What actions were taken or agreed during this visit. Minimum 3 sentences.
OUTCOME: What was the outcome of this visit and how the resident responded. Minimum 3 sentences.
RECOMMENDATIONS: What is recommended for next steps and ongoing support. Minimum 3 sentences. Only include genuine concerns or follow-up items — if all is well, state what ongoing monitoring is recommended.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            action: { type: "string" },
            outcome: { type: "string" },
            recommendations: { type: "string" },
          },
          required: ["action", "outcome", "recommendations"],
        },
      });

      setGeneratedReport({
        action: result.action,
        outcome: result.outcome,
        recommendations: result.recommendations,
      });
      setStep(2);
    } catch (err) {
      toast.error("Failed to generate report. Please try again.");
    }
    setGenerating(false);
  };

  const handleSave = (status) => {
    const duration = calculateDuration();
    createMutation.mutate({
      resident_id: kpiData.resident_id,
      resident_name: selectedResident?.display_name || "",
      worker_id: myStaffProfile?.id || user?.email || "",
      worker_name: myStaffProfile?.full_name || user?.full_name || "Unknown Worker",
      home_id: kpiData.home_id || selectedResident?.home_id || "",
      home_name: selectedHome?.name || "",
      date: kpiData.date,
      time_start: kpiData.time_start,
      time_end: kpiData.time_end,
      duration_minutes: duration,
      is_key_worker_session: kpiData.is_key_worker_session === true,
      is_daily_summary: kpiData.is_daily_summary === true,
      kpi_data: kpiData,
      action_text: generatedReport?.action || "",
      outcome_text: generatedReport?.outcome || "",
      recommendations_text: generatedReport?.recommendations || "",
      ai_generated_action: generatedReport?.action || "",
      ai_generated_outcome: generatedReport?.outcome || "",
      ai_generated_recommendations: generatedReport?.recommendations || "",
      worker_edited: false,
      status,
    });
  };

  if (step === 2 && generatedReport) {
    return (
      <VisitReportPreview
        report={generatedReport}
        onChange={setGeneratedReport}
        onBack={() => setStep(1)}
        onSaveDraft={() => handleSave("draft")}
        onSubmit={() => handleSave("submitted")}
        saving={createMutation.isPending}
        residentName={selectedResident?.display_name}
        workerName={user?.full_name}
        date={kpiData.date}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <button
          onClick={() => navigate("/visit-reports")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Visit Report</h1>
          <p className="text-muted-foreground text-xs">
            {new Date().toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
            {" · "}
            {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <p className="text-muted-foreground text-sm mt-1">Complete the KPI form and generate your AI-powered report.</p>
      </div>

      <VisitReportKPIForm
        kpiData={kpiData}
        onChange={setKpiData}
        residents={residents}
        homes={homes}
        onGenerate={generateReport}
        generating={generating}
        isAdmin={user?.role === "admin"}
      />
    </div>
  );
}