import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { base44 } from "@/api/base44Client";
import { format, addYears } from "date-fns";
import { X, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const TOTAL_STEPS = 6;
const STEP_LABELS = ["Premises", "Location", "Safety", "Physical", "Consultation", "Sign-off"];

function RatingSelect({ value, onChange, options }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      className="border border-border rounded-lg px-3 py-2 text-sm bg-background w-full">
      <option value="">Select…</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function BoolRow({ label, value, onChange, notes, onNotes, notesPlaceholder }) {
  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex gap-2">
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => onChange(v)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${value === v ? (v ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300") : "border-border text-muted-foreground hover:bg-muted"}`}>
              {v ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>
      {onNotes && (
        <textarea value={notes || ""} onChange={e => onNotes(e.target.value)} rows={2}
          placeholder={notesPlaceholder || "Notes…"}
          className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
      )}
    </div>
  );
}

export default function AssessmentFormModal({ homes, staff, staffProfile, preHomeId, existingAssessments, onClose, onSaved }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const today = format(new Date(), "yyyy-MM-dd");

  // Step 1
  const [homeId, setHomeId] = useState(preHomeId || "");
  const [assessmentDate, setAssessmentDate] = useState(today);
  const [assessmentYear, setAssessmentYear] = useState(new Date().getFullYear());
  const [accCategory, setAccCategory] = useState("");
  const [isOfstedReg, setIsOfstedReg] = useState(false);
  const [prevAssessmentId, setPrevAssessmentId] = useState("");
  const [versionNumber, setVersionNumber] = useState("v1.0");

  // Step 2 — Location suitability
  const [localServicesAccessible, setLocalServicesAccessible] = useState(null);
  const [localServicesNotes, setLocalServicesNotes] = useState("");
  const [educationAccess, setEducationAccess] = useState("");
  const [educationNotes, setEducationNotes] = useState("");
  const [healthcareAccess, setHealthcareAccess] = useState("");
  const [healthcareNotes, setHealthcareNotes] = useState("");
  const [transportAccess, setTransportAccess] = useState("");
  const [transportNotes, setTransportNotes] = useState("");
  const [communityParticipation, setCommunityParticipation] = useState("");
  const [communityNotes, setCommunityNotes] = useState("");
  const [stigmatisationRisk, setStigmatisationRisk] = useState("");
  const [stigmatisationNotes, setStigmatisationNotes] = useState("");
  const [selfEsteemPromotion, setSelfEsteemPromotion] = useState(null);
  const [selfEsteemNotes, setSelfEsteemNotes] = useState("");

  // Step 3 — Safety
  const [areaSafetyRating, setAreaSafetyRating] = useState("");
  const [areaSafetyNotes, setAreaSafetyNotes] = useState("");
  const [knownRisks, setKnownRisks] = useState("");
  const [proximityRisks, setProximityRisks] = useState(false);
  const [proximityDetails, setProximityDetails] = useState("");
  const [riskMitigation, setRiskMitigation] = useState("");

  // Step 4 — Physical
  const [premisesSuitable, setPremisesSuitable] = useState(null);
  const [premisesNotes, setPremisesNotes] = useState("");
  const [stabilityConsistency, setStabilityConsistency] = useState(null);
  const [accessibility, setAccessibility] = useState(null);
  const [accessibilityNotes, setAccessibilityNotes] = useState("");
  const [privateBedrooms, setPrivateBedrooms] = useState(null);
  const [internetConnectivity, setInternetConnectivity] = useState(null);
  const [physicallySec, setPhysicallySec] = useState(null);
  const [homelyEnv, setHomelyEnv] = useState(null);
  const [hazardsRemoved, setHazardsRemoved] = useState(null);
  const [hseCompliant, setHseCompliant] = useState(null);

  // Step 5 — Consultations
  const [consultations, setConsultations] = useState([]);
  const [childrenConsulted, setChildrenConsulted] = useState(false);
  const [childrenSummary, setChildrenSummary] = useState("");
  const [childrenConcerns, setChildrenConcerns] = useState("");

  // Step 6 — Sign-off
  const [overallSuitability, setOverallSuitability] = useState("");
  const [overallNotes, setOverallNotes] = useState("");
  const [conditionsAttached, setConditionsAttached] = useState("");
  const [unsuitableActionPlan, setUnsuitableActionPlan] = useState("");
  const [recommendedActions, setRecommendedActions] = useState([]);
  const [assessedById, setAssessedById] = useState(staffProfile?.id || "");
  const [reviewedById, setReviewedById] = useState("");
  const [approvedById, setApprovedById] = useState("");
  const [assessmentNotes, setAssessmentNotes] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const selectedHome = homes.find(h => h.id === homeId);
  const homeAssessments = existingAssessments?.filter(a => a.home_id === homeId) || [];

  const addConsultation = () => {
    setConsultations(prev => [...prev, { id: crypto.randomUUID(), person_name: "", person_role: "", consultation_date: today, consultation_method: "face_to_face", views_summary: "", concerns_raised: false, concerns_detail: "", how_views_taken_into_account: "" }]);
  };

  const updateConsultation = (idx, field, value) => {
    setConsultations(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addAction = () => {
    setRecommendedActions(prev => [...prev, { id: crypto.randomUUID(), action: "", priority: "within_1_month", responsible_person_id: "", responsible_person_name: "", target_date: "", completed: false }]);
  };

  const updateAction = (idx, field, value) => {
    setRecommendedActions(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const canNext = () => {
    if (step === 1) return homeId && assessmentDate && accCategory;
    if (step === 6) return overallSuitability && overallNotes && assessedById;
    return true;
  };

  const handleDateChange = (val) => {
    setAssessmentDate(val);
    if (val) setAssessmentYear(new Date(val).getFullYear());
  };

  const mut = useMutation({
    mutationFn: async (submitAsApproved) => {
      let documentUrl = "";
      let documentFileName = "";
      if (docFile) {
        setUploading(true);
        const res = await base44.integrations.Core.UploadFile({ file: docFile });
        documentUrl = res.file_url;
        documentFileName = docFile.name;
        setUploading(false);
      }

      const nextDue = assessmentDate ? format(addYears(new Date(assessmentDate), 1), "yyyy-MM-dd") : "";
      const assessedByName = staff.find(s => s.id === assessedById)?.full_name || "";
      const approvedByName = staff.find(s => s.id === approvedById)?.full_name || "";
      const reviewedByName = staff.find(s => s.id === reviewedById)?.full_name || "";
      const status = submitAsApproved ? "approved" : "draft";

      const payload = {
        org_id: ORG_ID,
        home_id: homeId,
        home_name: selectedHome?.name || "",
        home_address: selectedHome?.address || "",
        home_type: selectedHome?.type || "",
        assessment_year: assessmentYear,
        assessment_date: assessmentDate,
        next_assessment_due: nextDue,
        version_number: versionNumber,
        status,
        accommodation_category: accCategory,
        category_appropriate_for_location: true,
        ofsted_registration_assessment: isOfstedReg,
        previous_assessment_id: prevAssessmentId || null,
        local_services_accessible: localServicesAccessible,
        local_services_notes: localServicesNotes,
        education_access: educationAccess,
        education_access_notes: educationNotes,
        healthcare_access: healthcareAccess,
        healthcare_access_notes: healthcareNotes,
        public_transport_access: transportAccess,
        public_transport_access_notes: transportNotes,
        community_participation: communityParticipation,
        community_participation_notes: communityNotes,
        stigmatisation_risk: stigmatisationRisk,
        stigmatisation_notes: stigmatisationNotes,
        self_esteem_promotion: selfEsteemPromotion,
        self_esteem_notes: selfEsteemNotes,
        area_safety_rating: areaSafetyRating,
        area_safety_notes: areaSafetyNotes,
        known_risks_in_area: knownRisks,
        risk_mitigation_measures: riskMitigation,
        proximity_to_known_risks: proximityRisks,
        proximity_risk_details: proximityDetails,
        premises_suitable_for_category: premisesSuitable ?? false,
        premises_suitability_notes: premisesNotes,
        stability_and_consistency: stabilityConsistency ?? false,
        accessibility: accessibility ?? false,
        accessibility_notes: accessibilityNotes,
        private_bedrooms: privateBedrooms ?? false,
        internet_connectivity: internetConnectivity ?? false,
        physically_secure: physicallySec ?? false,
        homely_environment: homelyEnv ?? false,
        hazards_removed: hazardsRemoved ?? false,
        health_safety_compliant: hseCompliant ?? false,
        consultations,
        children_consulted: childrenConsulted,
        children_consultation_summary: childrenSummary,
        children_concerns: childrenConcerns,
        overall_suitability: overallSuitability,
        overall_suitability_notes: overallNotes,
        conditions_attached: conditionsAttached,
        recommended_actions: recommendedActions,
        unsuitable_action_plan: unsuitableActionPlan,
        assessed_by_id: assessedById,
        assessed_by_name: assessedByName,
        assessed_by_role: staffProfile?.role || "",
        assessment_notes: assessmentNotes,
        reviewed_by_id: reviewedById || null,
        reviewed_by_name: reviewedByName,
        reviewed_at: reviewedById ? new Date().toISOString() : null,
        approved_by_id: submitAsApproved ? (approvedById || null) : null,
        approved_by_name: submitAsApproved ? approvedByName : "",
        approved_at: submitAsApproved ? new Date().toISOString() : null,
        document_url: documentUrl,
        document_file_name: documentFileName,
        document_uploaded_at: docFile ? new Date().toISOString() : null,
        is_deleted: false,
      };

      const created = await secureGateway.create("LocationAssessment", payload);

      // If approved, update denormalised fields on Home
      if (submitAsApproved && homeId) {
        await secureGateway.update("Home", homeId, {
          latest_location_assessment_id: created.id,
          latest_location_assessment_date: assessmentDate,
          latest_location_assessment_status: overallSuitability,
          next_location_assessment_due: nextDue,
          location_assessment_overdue: false,
        });
      }
    },
    onSuccess: (_, submitAsApproved) => {
      qc.invalidateQueries({ queryKey: ["la-assessments"] });
      qc.invalidateQueries({ queryKey: ["la-homes"] });
      toast.success(submitAsApproved ? "Assessment submitted and approved" : "Assessment saved as draft");
      onSaved();
    },
    onError: () => toast.error("Failed to save assessment"),
  });

  const QUALITY_OPTIONS = [
    { value: "good", label: "Good" },
    { value: "adequate", label: "Adequate" },
    { value: "limited", label: "Limited" },
    { value: "poor", label: "Poor" },
  ];

  const approverStaff = staff.filter(s => ["admin", "rsm", "regional_manager"].includes(s.role));
  const canApprove = ["admin", "rsm", "regional_manager", "admin_manager"].includes(staffProfile?.role);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold">New Location Assessment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Progress tabs */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-none">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`flex-1 text-center py-2 text-xs font-medium whitespace-nowrap px-2 ${step === i + 1 ? "text-primary border-b-2 border-primary" : i + 1 < step ? "text-green-600" : "text-muted-foreground"}`}>
              {i + 1 < step ? "✓ " : ""}{label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1 space-y-4">

          {/* ── STEP 1 — Premises ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Premises *</label>
                <select value={homeId} onChange={e => setHomeId(e.target.value)} disabled={!!preHomeId}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">Select premises…</option>
                  {homes.map(h => <option key={h.id} value={h.id}>{h.name} — {h.address}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assessment date *</label>
                  <input type="date" value={assessmentDate} onChange={e => handleDateChange(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assessment year</label>
                  <input type="number" value={assessmentYear} readOnly
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Version number</label>
                  <input type="text" value={versionNumber} onChange={e => setVersionNumber(e.target.value)}
                    placeholder="v1.0"
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category of supported accommodation *</label>
                <select value={accCategory} onChange={e => setAccCategory(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">Select category…</option>
                  <option value="self_contained">Self-contained</option>
                  <option value="shared_ring_fenced">Shared (ring-fenced)</option>
                  <option value="shared_non_ring_fenced">Shared (non-ring-fenced)</option>
                  <option value="private_residence">Private residence</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <input type="checkbox" id="ofstedReg" checked={isOfstedReg} onChange={e => setIsOfstedReg(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="ofstedReg" className="text-sm cursor-pointer">This is the assessment submitted for Ofsted registration purposes</label>
              </div>
              {homeAssessments.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Previous assessment (if re-assessment)</label>
                  <select value={prevAssessmentId} onChange={e => setPrevAssessmentId(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                    <option value="">None — first assessment</option>
                    {homeAssessments.map(a => (
                      <option key={a.id} value={a.id}>{a.assessment_year} — {a.assessment_date} ({a.status})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 — Location Suitability ── */}
          {step === 2 && (
            <div className="space-y-3">
              <BoolRow label="Children have consistent access to local services"
                value={localServicesAccessible} onChange={setLocalServicesAccessible}
                notes={localServicesNotes} onNotes={setLocalServicesNotes}
                notesPlaceholder="List key services: GP, hospital, education, public transport, leisure..." />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Education access</label>
                  <RatingSelect value={educationAccess} onChange={setEducationAccess} options={QUALITY_OPTIONS} />
                  <textarea value={educationNotes} onChange={e => setEducationNotes(e.target.value)} rows={2} placeholder="Notes…" className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Healthcare access</label>
                  <RatingSelect value={healthcareAccess} onChange={setHealthcareAccess} options={QUALITY_OPTIONS} />
                  <textarea value={healthcareNotes} onChange={e => setHealthcareNotes(e.target.value)} rows={2} placeholder="Notes…" className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Public transport access</label>
                  <RatingSelect value={transportAccess} onChange={setTransportAccess} options={QUALITY_OPTIONS} />
                  <textarea value={transportNotes} onChange={e => setTransportNotes(e.target.value)} rows={2} placeholder="Notes…" className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Community participation opportunities</label>
                  <RatingSelect value={communityParticipation} onChange={setCommunityParticipation} options={QUALITY_OPTIONS} />
                  <textarea value={communityNotes} onChange={e => setCommunityNotes(e.target.value)} rows={2} placeholder="Notes…" className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Risk of stigmatisation</label>
                  <RatingSelect value={stigmatisationRisk} onChange={setStigmatisationRisk} options={[
                    { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }
                  ]} />
                  <textarea value={stigmatisationNotes} onChange={e => setStigmatisationNotes(e.target.value)} rows={2} placeholder="Notes…" className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                </div>
                <div>
                  <BoolRow label="Location promotes positive self-esteem and sense of belonging"
                    value={selfEsteemPromotion} onChange={setSelfEsteemPromotion}
                    notes={selfEsteemNotes} onNotes={setSelfEsteemNotes} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 — Safety ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Area safety rating</label>
                <RatingSelect value={areaSafetyRating} onChange={setAreaSafetyRating} options={[
                  { value: "good", label: "Good" }, { value: "adequate", label: "Adequate" },
                  { value: "concerns", label: "Concerns" }, { value: "serious_concerns", label: "Serious Concerns" }
                ]} />
                <textarea value={areaSafetyNotes} onChange={e => setAreaSafetyNotes(e.target.value)} rows={3}
                  placeholder="Describe area safety context…"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Known risks in the area</label>
                <textarea value={knownRisks} onChange={e => setKnownRisks(e.target.value)} rows={3}
                  placeholder="e.g. known exploitation networks, county lines, drug activity near premises…"
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div className="border border-border rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={proximityRisks} onChange={e => setProximityRisks(e.target.checked)} className="w-4 h-4" />
                  Premises are in proximity to known risk factors
                </label>
                {proximityRisks && (
                  <textarea value={proximityDetails} onChange={e => setProximityDetails(e.target.value)} rows={2}
                    placeholder="Describe proximity risk details…"
                    className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Risk mitigation measures in place</label>
                <textarea value={riskMitigation} onChange={e => setRiskMitigation(e.target.value)} rows={3}
                  placeholder="Describe how identified risks are mitigated…"
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
            </div>
          )}

          {/* ── STEP 4 — Physical Suitability ── */}
          {step === 4 && (
            <div className="space-y-3">
              <BoolRow label="Premises suitable for this category of supported accommodation"
                value={premisesSuitable} onChange={setPremisesSuitable}
                notes={premisesNotes} onNotes={setPremisesNotes} />
              <BoolRow label="Provides stability and consistency for children"
                value={stabilityConsistency} onChange={setStabilityConsistency} />
              <BoolRow label="Accessible for children with disabilities or additional needs"
                value={accessibility} onChange={setAccessibility}
                notes={accessibilityNotes} onNotes={setAccessibilityNotes} />
              <BoolRow label="Each child has a private bedroom (Reg 6(2)(d))"
                value={privateBedrooms} onChange={setPrivateBedrooms} />
              <BoolRow label="Sufficient internet connectivity (Reg 6(2)(d)(iii))"
                value={internetConnectivity} onChange={setInternetConnectivity} />
              <BoolRow label="Premises are physically secure (Reg 6(2)(d)(iv))"
                value={physicallySec} onChange={setPhysicallySec} />
              <BoolRow label="Welcoming and homely environment (Reg 6(2)(b)(viii))"
                value={homelyEnv} onChange={setHomelyEnv} />
              <BoolRow label="Avoidable hazards removed (Reg 6(2)(b)(ix))"
                value={hazardsRemoved} onChange={setHazardsRemoved} />
              <BoolRow label="Complies with statutory health and safety provisions (Reg 6(2)(b)(x))"
                value={hseCompliant} onChange={setHseCompliant} />
            </div>
          )}

          {/* ── STEP 5 — Consultation ── */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Relevant persons consulted (Reg 6(2)(a)(i))</p>
                <Button variant="outline" size="sm" onClick={addConsultation} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Person
                </Button>
              </div>
              {consultations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                  No consultations added yet. Click "Add Person" to log consultations with social workers, IROs, children, parents, LA officers etc.
                </p>
              )}
              {consultations.map((c, idx) => (
                <div key={c.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Consultation {idx + 1}</span>
                    <button onClick={() => setConsultations(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Name</label>
                      <input type="text" value={c.person_name} onChange={e => updateConsultation(idx, "person_name", e.target.value)}
                        className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Role</label>
                      <input type="text" value={c.person_role} onChange={e => updateConsultation(idx, "person_role", e.target.value)}
                        placeholder="Social Worker, IRO, Child, Parent…"
                        className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Date</label>
                      <input type="date" value={c.consultation_date} onChange={e => updateConsultation(idx, "consultation_date", e.target.value)}
                        className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Method</label>
                      <select value={c.consultation_method} onChange={e => updateConsultation(idx, "consultation_method", e.target.value)}
                        className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background">
                        {["face_to_face", "phone", "email", "written", "group_meeting"].map(m => (
                          <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Summary of views</label>
                    <textarea value={c.views_summary} onChange={e => updateConsultation(idx, "views_summary", e.target.value)} rows={2}
                      className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={c.concerns_raised} onChange={e => updateConsultation(idx, "concerns_raised", e.target.checked)} className="w-3.5 h-3.5" />
                    Concerns raised
                  </label>
                  {c.concerns_raised && (
                    <textarea value={c.concerns_detail} onChange={e => updateConsultation(idx, "concerns_detail", e.target.value)} rows={2}
                      placeholder="Describe concerns…"
                      className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">How were their views taken into account?</label>
                    <textarea value={c.how_views_taken_into_account} onChange={e => updateConsultation(idx, "how_views_taken_into_account", e.target.value)} rows={2}
                      className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                  </div>
                </div>
              ))}

              <div className="border border-border rounded-lg p-4 space-y-3 bg-blue-50/30">
                <p className="text-sm font-medium">Children at the premises</p>
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={childrenConsulted} onChange={e => setChildrenConsulted(e.target.checked)} className="w-4 h-4" />
                  Children accommodated at the premises were consulted
                </label>
                {childrenConsulted && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Summary of children's views</label>
                      <textarea value={childrenSummary} onChange={e => setChildrenSummary(e.target.value)} rows={3}
                        className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Any concerns raised by children</label>
                      <textarea value={childrenConcerns} onChange={e => setChildrenConcerns(e.target.value)} rows={2}
                        className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background resize-none" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 6 — Sign-off ── */}
          {step === 6 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Overall suitability *</label>
                <div className="flex gap-2 mt-1">
                  {[["suitable", "Suitable", "green"], ["suitable_with_conditions", "Suitable with Conditions", "amber"], ["unsuitable", "Unsuitable", "red"]].map(([val, label, color]) => (
                    <button key={val} onClick={() => setOverallSuitability(val)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${overallSuitability === val
                        ? color === "green" ? "bg-green-100 text-green-700 border-green-300"
                          : color === "amber" ? "bg-amber-100 text-amber-700 border-amber-300"
                          : "bg-red-100 text-red-700 border-red-300"
                        : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Overall suitability notes *</label>
                <textarea value={overallNotes} onChange={e => setOverallNotes(e.target.value)} rows={4} required
                  placeholder="Provide a full narrative of the overall assessment findings and conclusions…"
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
              {overallSuitability === "suitable_with_conditions" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Conditions attached</label>
                  <textarea value={conditionsAttached} onChange={e => setConditionsAttached(e.target.value)} rows={3}
                    placeholder="Describe the conditions of suitability…"
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
                </div>
              )}
              {overallSuitability === "unsuitable" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Action plan for unsuitable finding</label>
                  <textarea value={unsuitableActionPlan} onChange={e => setUnsuitableActionPlan(e.target.value)} rows={3}
                    placeholder="What action will be taken and by when?"
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Recommended actions</label>
                  <Button variant="outline" size="sm" onClick={addAction} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add</Button>
                </div>
                {recommendedActions.map((a, idx) => (
                  <div key={a.id} className="border border-border rounded-lg p-3 space-y-2 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Action {idx + 1}</span>
                      <button onClick={() => setRecommendedActions(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                    <input type="text" value={a.action} onChange={e => updateAction(idx, "action", e.target.value)}
                      placeholder="Describe action required…"
                      className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Priority</label>
                        <select value={a.priority} onChange={e => updateAction(idx, "priority", e.target.value)}
                          className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background">
                          <option value="immediate">Immediate</option>
                          <option value="within_1_month">Within 1 month</option>
                          <option value="within_3_months">Within 3 months</option>
                          <option value="ongoing">Ongoing</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Responsible person</label>
                        <select value={a.responsible_person_id} onChange={e => updateAction(idx, "responsible_person_id", e.target.value)}
                          className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background">
                          <option value="">Select…</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Target date</label>
                        <input type="date" value={a.target_date} onChange={e => updateAction(idx, "target_date", e.target.value)}
                          className="mt-0.5 w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assessed by *</label>
                  <select value={assessedById} onChange={e => setAssessedById(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                    <option value="">Select…</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Reviewed by</label>
                  <select value={reviewedById} onChange={e => setReviewedById(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                    <option value="">Select…</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Approved by (RSM/RP)</label>
                  <select value={approvedById} onChange={e => setApprovedById(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                    <option value="">Select…</option>
                    {approverStaff.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.role}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Assessment notes</label>
                <textarea value={assessmentNotes} onChange={e => setAssessmentNotes(e.target.value)} rows={3}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Upload completed assessment PDF (optional)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setDocFile(e.target.files[0])}
                  className="mt-1 w-full text-sm text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border gap-3">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Cancel" : "Back"}
          </Button>
          <div className="flex gap-2">
            {step === TOTAL_STEPS ? (
              <>
                <Button variant="outline" onClick={() => mut.mutate(false)} disabled={!canNext() || mut.isPending}>
                  Save as Draft
                </Button>
                {canApprove && (
                  <Button onClick={() => mut.mutate(true)} disabled={!canNext() || mut.isPending || uploading}>
                    {mut.isPending || uploading ? "Saving…" : "Submit & Approve"}
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-1.5">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}