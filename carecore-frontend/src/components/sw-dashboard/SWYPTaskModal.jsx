import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Form imports
import BodyMapModal from "@/components/residents/bodymap/BodyMapModal";
import AppointmentForm from "@/components/residents/appointments/AppointmentForm";
import EducationModal from "@/components/residents/education/EducationModal";
import MissingReportForm from "@/components/residents/missing/MissingReportForm";
import ComplaintForm from "@/components/residents/complaints/ComplaintForm";
import ExploitationRiskForm from "@/components/residents/risk/ExploitationRiskForm";
import RiskAssessmentPanel from "@/components/residents/risk/RiskAssessmentPanel";


import KeyPersonTab from "@/components/residents/KeyPersonTab";
import AnnexAReadinessWarning from "@/components/residents/AnnexAReadinessWarning";
import LogIncidentTab from "@/components/residents/incidents/LogIncidentTab";
import HealthInlineEditor from "@/components/sw-dashboard/HealthInlineEditor";
import PathwayPlanDetail from "@/components/residents/care-planning/PathwayPlanDetail";

// Task key → label mapping for the deep link fallback (pa / documents)
const TASK_DEEP_LINKS = {
  pa:       { group: "essentials", tab: "pa", label: "PA Contact" },
  documents:{ group: "safety", tab: "documents", label: "Documents" },
};

export default function SWYPTaskModal({ taskKey, resident, residents, homes, staff, user, staffProfile, onClose }) {
  const [riskCategory, setRiskCategory] = useState(null);

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["risk-assessments", resident?.id],
    queryFn: () => base44.entities.RiskAssessment.filter({ resident_id: resident.id }),
    enabled: !!resident?.id && (taskKey === "risk" || taskKey === "cse"),
  });

  const { data: exploitationRisks = [] } = useQuery({
    queryKey: ["exploitation-risk", resident?.id],
    queryFn: () => base44.entities.ExploitationRisk.filter({ resident_id: resident.id }),
    enabled: !!resident?.id && taskKey === "cse",
  });

  const { data: pathwayPlans = [] } = useQuery({
    queryKey: ["pathway-plans", resident?.id],
    queryFn: () => base44.entities.PathwayPlan.filter({ resident_id: resident.id }),
    enabled: !!resident?.id && taskKey === "pathway",
  });

  const { data: accidents = [] } = useQuery({
    queryKey: ["accidents", "all"],
    queryFn: () => base44.entities.AccidentReport.list(),
    enabled: taskKey === "incident",
  });

  if (!resident) return null;

  const residentUrl = `/residents?service=all&yp=${resident.id}`;

  const renderContent = () => {
    // ── Health inline editors ──────────────────────────────────────────────
    if (["gp", "dentist", "optician", "allergies", "conditions", "healthnotes"].includes(taskKey)) {
      return (
        <HealthInlineEditor
          taskKey={taskKey}
          resident={resident}
          onClose={onClose}
        />
      );
    }

    // ── Body Map ─────────────────────────────────────────────────────────
    if (taskKey === "bodymap") {
      return (
        <BodyMapModal
          resident={resident}
          staff={staff || []}
          user={user}
          onClose={onClose}
        />
      );
    }

    // ── Appointments ──────────────────────────────────────────────────────
    if (taskKey === "appointments") {
      return (
        <AppointmentForm
          staffProfile={staffProfile}
          user={user}
          residents={residents || [resident]}
          homes={homes || []}
          staff={staff || []}
          initialResidentId={resident.id}
          onSave={onClose}
          onClose={onClose}
        />
      );
    }

    // ── Education ─────────────────────────────────────────────────────────
    if (taskKey === "education") {
      return (
        <EducationModal
          resident={resident}
          onClose={onClose}
        />
      );
    }

    // ── Employment / NEET → redirect based on status ──────────────────────
    if (taskKey === "neet") {
      const isNEET = resident.education_status === "neet";
      const tabTarget = isNEET ? "neet" : "employment";
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Employment / NEET</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {resident.display_name}'s current status: <strong>{resident.education_status?.replace(/_/g, " ") || "Unknown"}</strong>
            </p>
            <p className="text-sm text-slate-600 mb-6">
              To update Employment or NEET records, go to the young person's full profile.
            </p>
            <div className="flex gap-3">
              <Link
                to={`${residentUrl}&group=life-community&tab=${tabTarget}`}
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                {isNEET ? "Update NEET Record" : "Update Employment"} <ExternalLink className="w-4 h-4" />
              </Link>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </div>
      );
    }

    // ── Missing Episode ───────────────────────────────────────────────────
    if (taskKey === "missing") {
      return (
        <MissingReportForm
          resident={resident}
          residents={residents || [resident]}
          homes={homes || []}
          staff={staff || []}
          user={user}
          onClose={onClose}
          onSave={onClose}
        />
      );
    }

    // ── Risk Assessment ───────────────────────────────────────────────────
    if (taskKey === "risk") {
      const RISK_CATEGORIES = [
        { value: "suicide_self_harm", label: "Suicide / Self-harm" },
        { value: "vulnerability", label: "Vulnerability" },
        { value: "criminal_exploitation", label: "Criminal Exploitation" },
        { value: "sexual_exploitation", label: "Sexual Exploitation" },
        { value: "missing_from_care", label: "Missing from Care" },
        { value: "substance_misuse", label: "Substance Misuse" },
        { value: "harm_to_others", label: "Harm to Others" },
        { value: "online_safety", label: "Online Safety" },
      ];
      const existing = riskAssessments.find(r => r.category === riskCategory);

      return (
        <>
          {/* Category picker overlay */}
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="font-bold">Risk Assessment — {resident.display_name}</h2>
                <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Select risk category to assess</p>
                <div className="flex flex-wrap gap-2">
                  {RISK_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setRiskCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${riskCategory === cat.value ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-700 hover:border-primary"}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-3 border-t pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              </div>
            </div>
          </div>
          {/* Risk panel opens on top (z-50) once category is selected */}
          {riskCategory && (
            <RiskAssessmentPanel
              resident={resident}
              category={riskCategory}
              existing={existing}
              staffProfile={staffProfile}
              onClose={onClose}
              onSaved={onClose}
            />
          )}
        </>
      );
    }

    // ── CSE / CCE Risk ────────────────────────────────────────────────────
    if (taskKey === "cse") {
      const CSE_CATEGORIES = [
        { value: "criminal_exploitation", label: "Criminal Exploitation" },
        { value: "sexual_exploitation", label: "Sexual Activity" },
      ];
      const existing = riskAssessments.find(r => r.category === riskCategory);

      return (
        <>
          {/* Category picker overlay */}
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="font-bold">CSE / CCE Risk — {resident.display_name}</h2>
                <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Select exploitation type to assess</p>
                <div className="flex flex-wrap gap-2">
                  {CSE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setRiskCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${riskCategory === cat.value ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-700 hover:border-primary"}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-3 border-t pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              </div>
            </div>
          </div>
          {/* Risk panel opens on top (z-50) once category is selected */}
          {riskCategory && (
            <RiskAssessmentPanel
              resident={resident}
              category={riskCategory}
              existing={existing}
              staffProfile={staffProfile}
              onClose={onClose}
              onSaved={onClose}
            />
          )}
        </>
      );
    }

    // ── Complaint ─────────────────────────────────────────────────────────
    if (taskKey === "complaint") {
      return (
        <ComplaintForm
          resident={resident}
          residents={residents || [resident]}
          staff={staff || []}
          user={user}
          onClose={onClose}
          onSave={onClose}
        />
      );
    }

    // ── Incident Form ─────────────────────────────────────────────────────
    if (taskKey === "incident") {
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="font-bold">Log Incident — {resident.display_name}</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-5">
              <LogIncidentTab
                residents={residents || [resident]}
                homes={homes || []}
                staff={staff || []}
                user={user}
                staffProfile={staffProfile}
                isAdminOrTL={false}
                accidents={accidents}
              />
            </div>
          </div>
        </div>
      );
    }

    // ── Key People ────────────────────────────────────────────────────────
    if (taskKey === "keypeople") {
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="font-bold">Key Contacts — {resident.display_name}</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-5">
              <KeyPersonTab resident={resident} />
            </div>
          </div>
        </div>
      );
    }

    // ── Annex A Readiness (read-only panel) ───────────────────────────────
    if (taskKey === "annexa") {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
              <h2 className="font-bold">Annex A Readiness — {resident.display_name}</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-5">
              <AnnexAReadinessWarning resident={resident} />
              <div className="mt-4">
                <Link
                  to={`${residentUrl}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                >
                  Open Full Profile <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Pathway Plan ──────────────────────────────────────────────────────
    if (taskKey === "pathway") {
      const residentPlans = pathwayPlans.sort((a, b) => (b.version || 0) - (a.version || 0));
      const activePlan = residentPlans.find(p => p.status === "active") || residentPlans[0];

      if (activePlan) {
        return (
          <PathwayPlanDetail 
            plan={activePlan} 
            resident={resident} 
            onClose={onClose} 
          />
        );
      } else {
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Pathway Plan</h2>
                <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                No active Pathway Plan found for {resident.display_name}. Pathway Plans are required from age 16.
              </p>
              <div className="flex gap-3">
                <Link
                  to={`${residentUrl}&group=essentials&tab=pathway-plan`}
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                >
                  Create Plan <ExternalLink className="w-4 h-4" />
                </Link>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
              </div>
            </div>
          </div>
        );
      }
    }

    // ── PA / Documents — deep link fallback ────────────────
    const deepLink = TASK_DEEP_LINKS[taskKey];
    if (deepLink) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{deepLink.label}</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Open {resident.display_name}'s full profile to manage {deepLink.label.toLowerCase()}.
            </p>
            <div className="flex gap-3">
              <Link
                to={`${residentUrl}&group=${deepLink.group || "overview"}&tab=${deepLink.tab}`}
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                Open in Profile <ExternalLink className="w-4 h-4" />
              </Link>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return renderContent();
}