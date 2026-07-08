import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { secureGateway } from "@/lib/secureGateway";
import { createNotification } from "@/lib/createNotification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import MissingImpactOutcomeSection from "./MissingImpactOutcomeSection.jsx";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger"; // For triggering workflows

export default function MissingReportForm({ resident, residents, homes = [], staff, user, staffProfile, onClose, onSave }) {
  const qc = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    resident_id: resident?.id || "",
    child_initials: resident?.initials || "",
    accommodation_category: resident?.accommodation_category || "",
    home_id: resident?.home_id || "",
    expected_location: "",
    last_seen_datetime: "",
    last_seen_location: "",
    last_seen_by: "",
    returned_datetime: "",
    returned_location: "",
    condition_on_return: "",
    reported_to_police: null,       // null = not yet answered
    police_report_datetime: "",
    police_reference_number: "",
    police_station: "",
    risk_level_at_time: "",          // required — no default
    known_associates_checked: false,
    cse_risk_considered: false,
    areas_searched: [],
    people_contacted: [],
    la_notified: null,               // null = not yet answered
    rhi_offered_by_la: null,         // required on return
    return_home_interview_offered_date: "",
    return_home_interview_completed: false,
    return_home_interview_completed_date: "",
    outcome_learning: "",
    risk_assessment_updated: false,
    manager_review_signoff: false,
  });
  const [isReturned, setIsReturned] = useState(false);
  const [areaInput, setAreaInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [errors, setErrors] = useState({});

  const setField = (key, value) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: undefined }));
  };
  const [impactForm, setImpactForm] = useState({
    immediate_outcome: "", impact_on_young_person: "", risk_change: "",
    progress_made: "", learning_identified: "", follow_up_required: false,
    follow_up_action: "", responsible_person_id: "", responsible_person_name: "",
    target_date: "", completion_date: "", return_interview_offered: "",
    return_interview_completed_status: "", trigger_identified: "", trigger_category: "",
    harm_identified: "", impact_police_reference: "", placing_authority_informed: "",
    host_la_informed: "", safety_plan_updated: "", risk_assessment_updated_status: "",
    manager_outcome_review_status: "pending", manager_review_note: "",
  });

  const selectedResident = useMemo(() => residents.find(r => r.id === form.resident_id), [form.resident_id, residents]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const homeId = data.home_id || selectedResident?.home_id;
      const homeName = homes.find(h => h.id === homeId)?.name || homeId;
      const mfh = {
        org_id: ORG_ID,
        resident_id: data.resident_id,
        resident_name: selectedResident?.display_name,
        home_id: homeId,
        home_name: homeName,
        child_initials: data.child_initials,
        accommodation_category: data.accommodation_category,
        expected_location: data.expected_location,
        reported_by_id: user?.id,
        reported_by_name: user?.full_name,
        missing_start_datetime: data.last_seen_datetime,
        last_seen_location: data.last_seen_location,
        last_seen_by: data.last_seen_by,
        missing_end_datetime: data.returned_datetime || null,
        returned_location: data.returned_location,
        condition_on_return: data.condition_on_return,
        reported_missing_datetime: new Date().toISOString(),
        reported_to_police: data.reported_to_police,
        police_report_datetime: data.police_report_datetime,
        police_reference_number: data.police_reference_number,
        police_station: data.police_station,
        risk_level_at_time: data.risk_level_at_time,
        known_associates_checked: data.known_associates_checked,
        cse_risk_considered: data.cse_risk_considered,
        areas_searched: data.areas_searched,
        people_contacted: data.people_contacted,
        la_notified: data.la_notified,
        return_home_interview_offered_by_local_authority: data.rhi_offered_by_la,
        return_home_interview_offered_date: data.return_home_interview_offered_date,
        return_home_interview_completed: data.return_home_interview_completed,
        return_home_interview_completed_date: data.return_home_interview_completed_date,
        outcome_learning: data.outcome_learning,
        risk_assessment_updated: data.risk_assessment_updated,
        manager_review_status: "pending_review",
        status: isReturned ? "closed" : "active",
      };
      const record = await base44.entities.MissingFromHome.create(mfh);

      // Push into the maker-checker workflow engine — replaces the old
      // direct ApprovalWorkflow create so this shows in the unified
      // Workflow Command Centre instead of a separate legacy queue.
      if (record?.id) {
        const priority = data.risk_level_at_time === "critical" ? "critical" : "high";
        triggerWorkflow({
          workflowType: "missing_episode",
          entityId:     record.id,
          entityRef:    `MISS-${record.id.slice(0, 8)}`,
          title:        `Missing — ${selectedResident?.display_name}`,
          description:  `Risk level at time: ${data.risk_level_at_time}${isReturned ? " — Returned" : " — Still Missing"}`,
          homeId:       record.home_id,
          homeName:     record.home_name,
          priority,
        });
      }

      // // Create ApprovalWorkflow for the missing episode
      // if (record?.id) {
      //   const priority = data.risk_level_at_time === "critical" ? "critical" : "high";
      //   await secureGateway.create("ApprovalWorkflow", {
      //     org_id: ORG_ID,
      //     entity_type: "missing_episode",
      //     entity_id: record.id,
      //     entity_reference: `Missing — ${selectedResident?.display_name} — ${new Date().toLocaleDateString()}`,
      //     home_id: record.home_id,
      //     status: "pending_tl",
      //     current_step: 1,
      //     submitted_by: staffProfile?.id,
      //     submitted_by_name: staffProfile?.full_name || user?.full_name || "",
      //     submitted_at: new Date().toISOString(),
      //     priority,
      //     notes: `Risk level at time: ${data.risk_level_at_time}${isReturned ? " — Returned" : " — Still Missing"}`,
      //   });
      // }

      // Notify TL
      const tlHomeId = selectedResident?.home_id;
      const teamLeaders = staff.filter(s =>
        s.role === "team_leader" &&
        (tlHomeId ? (s.home_ids?.includes(tlHomeId) || s.primary_home_id === tlHomeId) : true)
      );
      for (const tl of teamLeaders.slice(0, 3)) {
        if (tl.user_id) {
          await createNotification({
            recipient_user_id: tl.user_id,
            recipient_staff_id: tl.id,
            title: "🚨 MISSING PERSON REPORT",
            body: `MISSING PERSON REPORT submitted — ${selectedResident?.display_name} — Risk level: ${data.risk_level_at_time}. Review immediately in Approvals.`,
            type: "missing_episode",
            link: "/approvals",
            priority: data.risk_level_at_time === "critical" ? "critical" : "high",
          });
        }
      }

      // Save Impact & Outcome linked record
      if (record?.id) {
        const hasImpact = impactForm.immediate_outcome || impactForm.impact_on_young_person ||
          impactForm.risk_change || impactForm.return_interview_offered || impactForm.harm_identified;
        if (hasImpact) {
          await secureGateway.create("RecordImpactOutcome", {
            org_id: ORG_ID,
            record_type: "missing_episode",
            record_id: record.id,
            resident_id: mfh.resident_id,
            resident_name: mfh.resident_name,
            home_id: mfh.home_id,
            home_name: mfh.home_name,
            manager_review_status: impactForm.manager_outcome_review_status || "pending",
            ...impactForm,
          });
        }
      }

      return record;
    },
    onSuccess: () => {
      toast.success("Missing person report logged — pending manager review");
      qc.invalidateQueries({ queryKey: ["mfh-records"] });
      onSave();
    },
    onError: (err) => toast.error("Error saving report: " + err.message),
  });

  const handleAddArea = () => {
    if (areaInput.trim()) {
      setForm(p => ({ ...p, areas_searched: [...p.areas_searched, areaInput] }));
      setAreaInput("");
    }
  };

  const handleAddPerson = () => {
    if (personInput.trim()) {
      setForm(p => ({ ...p, people_contacted: [...p.people_contacted, personInput] }));
      setPersonInput("");
    }
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.resident_id) errs.resident_id = "Required";
      if (!form.last_seen_datetime) errs.last_seen_datetime = "Required";
      if (!form.risk_level_at_time) errs.risk_level_at_time = "Required";
      if (!form.last_seen_location) errs.last_seen_location = "Required";
      if (!form.last_seen_by) errs.last_seen_by = "Required";
    }
    if (s === 2) {
      if (form.reported_to_police === null) errs.reported_to_police = "Required — please select Yes or No";
      if (form.reported_to_police === true) {
        if (!form.police_report_datetime) errs.police_report_datetime = "Required";
        if (!form.police_reference_number) errs.police_reference_number = "Required";
      }
    }
    if (s === 4) {
      if (form.la_notified === null) errs.la_notified = "Required — please select Yes or No";
      if (isReturned) {
        if (!form.returned_datetime) errs.returned_datetime = "Required";
        if (!form.condition_on_return) errs.condition_on_return = "Required";
        if (form.rhi_offered_by_la === null) errs.rhi_offered_by_la = "Required — please select Yes or No";
      }
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(s => s + 1);
  };

  const canNext = true; // validation now handled in handleNext

  const handleSubmit = async () => {
    const allErrs = { ...validateStep(1), ...validateStep(2), ...validateStep(4) };
    if (Object.keys(allErrs).length > 0) {
      setErrors(allErrs);
      toast.error("Please complete all required fields before submitting.");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Report Missing From Home</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b border-border overflow-x-auto">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex items-center flex-1 min-w-max">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s}
              </div>
              {s < 5 && <div className={`flex-1 h-1 mx-2 rounded w-8 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="text-sm font-medium">Young Person <span className="text-red-500">*</span></label>
                {resident ? (
                  <Input value={selectedResident?.display_name || ""} disabled className="bg-muted" />
                ) : (
                  <Select value={form.resident_id} onValueChange={v => {
                    const r = residents.find(x => x.id === v);
                    setForm(p => ({ ...p, resident_id: v, accommodation_category: r?.accommodation_category || "", home_id: r?.home_id || "" }));
                    setErrors(p => ({ ...p, resident_id: undefined }));
                  }}>
                    <SelectTrigger className={errors.resident_id ? "border-red-500" : ""}><SelectValue placeholder="Select young person..." /></SelectTrigger>
                    <SelectContent>
                      {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {errors.resident_id && <p className="text-xs text-red-500 mt-1">{errors.resident_id}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Accommodation Category</label>
                  <Select value={form.accommodation_category} onValueChange={v => setField("accommodation_category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self_contained">Self Contained</SelectItem>
                      <SelectItem value="shared_ring_fenced">Shared Ring Fenced</SelectItem>
                      <SelectItem value="shared_non_ring_fenced">Shared Non Ring Fenced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Home</label>
                  <Select value={form.home_id} onValueChange={v => setField("home_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select home..." /></SelectTrigger>
                    <SelectContent>
                      {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Last Seen Date & Time <span className="text-red-500">*</span></label>
                <Input type="datetime-local" value={form.last_seen_datetime} onChange={e => setField("last_seen_datetime", e.target.value)} className={errors.last_seen_datetime ? "border-red-500" : ""} />
                {errors.last_seen_datetime && <p className="text-xs text-red-500 mt-1">{errors.last_seen_datetime}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Risk Level at Time of Going Missing <span className="text-red-500">*</span></label>
                <Select value={form.risk_level_at_time} onValueChange={v => setField("risk_level_at_time", v)}>
                  <SelectTrigger className={errors.risk_level_at_time ? "border-red-500" : ""}><SelectValue placeholder="Select risk level..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                {errors.risk_level_at_time && <p className="text-xs text-red-500 mt-1">{errors.risk_level_at_time}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Where Expected to Be</label>
                <Input value={form.expected_location} onChange={e => setField("expected_location", e.target.value)} placeholder="e.g. Home, School, Placement" />
              </div>
              <div>
                <label className="text-sm font-medium">Last Known Location <span className="text-red-500">*</span></label>
                <Input value={form.last_seen_location} onChange={e => setField("last_seen_location", e.target.value)} placeholder="Where were they last seen?" className={errors.last_seen_location ? "border-red-500" : ""} />
                {errors.last_seen_location && <p className="text-xs text-red-500 mt-1">{errors.last_seen_location}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Last Seen By <span className="text-red-500">*</span></label>
                <Input value={form.last_seen_by} onChange={e => setField("last_seen_by", e.target.value)} placeholder="Who last saw them?" className={errors.last_seen_by ? "border-red-500" : ""} />
                {errors.last_seen_by && <p className="text-xs text-red-500 mt-1">{errors.last_seen_by}</p>}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                <p className="text-sm text-amber-700">UK guidance requires police notification within 1 hour for a looked-after child aged 16-17.</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Has this been reported to police? <span className="text-red-500">*</span></label>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setField("reported_to_police", true)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.reported_to_police === true ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-700 hover:border-primary"}`}>Yes</button>
                  <button onClick={() => setField("reported_to_police", false)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.reported_to_police === false ? "bg-red-600 text-white border-red-600" : "border-slate-200 text-slate-700 hover:border-red-300"}`}>No</button>
                </div>
                {errors.reported_to_police && <p className="text-xs text-red-500 mt-1">{errors.reported_to_police}</p>}
              </div>
              {form.reported_to_police === true && (
                <>
                  <div>
                    <label className="text-sm font-medium">Police Report Date & Time <span className="text-red-500">*</span></label>
                    <Input type="datetime-local" value={form.police_report_datetime} onChange={e => setField("police_report_datetime", e.target.value)} className={errors.police_report_datetime ? "border-red-500" : ""} />
                    {errors.police_report_datetime && <p className="text-xs text-red-500 mt-1">{errors.police_report_datetime}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Police Reference Number <span className="text-red-500">*</span></label>
                    <Input value={form.police_reference_number} onChange={e => setField("police_reference_number", e.target.value)} placeholder="e.g., OP/2026/123456" className={errors.police_reference_number ? "border-red-500" : ""} />
                    {errors.police_reference_number && <p className="text-xs text-red-500 mt-1">{errors.police_reference_number}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Police Station</label>
                    <Input value={form.police_station} onChange={e => setField("police_station", e.target.value)} />
                  </div>
                </>
              )}
              {form.reported_to_police === false && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">⚠️ Police must be notified. Document reason for delay if applicable.</p>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.cse_risk_considered} onChange={e => setForm(p => ({ ...p, cse_risk_considered: e.target.checked }))} />
                Is there a known CSE risk?
              </label></div>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.known_associates_checked} onChange={e => setForm(p => ({ ...p, known_associates_checked: e.target.checked }))} />
                Known associates checked?
              </label></div>
              <div>
                <label className="text-sm font-medium">Areas Already Searched</label>
                <div className="flex gap-2 mb-2">
                  <Input value={areaInput} onChange={e => setAreaInput(e.target.value)} placeholder="Add location..." />
                  <Button size="sm" onClick={handleAddArea}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.areas_searched.map((area, i) => (
                    <span key={i} className="bg-muted px-3 py-1 rounded-full text-xs flex items-center gap-2">
                      {area} <button onClick={() => setForm(p => ({ ...p, areas_searched: p.areas_searched.filter((_, x) => x !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">People Already Contacted</label>
                <div className="flex gap-2 mb-2">
                  <Input value={personInput} onChange={e => setPersonInput(e.target.value)} placeholder="Add contact..." />
                  <Button size="sm" onClick={handleAddPerson}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.people_contacted.map((person, i) => (
                    <span key={i} className="bg-muted px-3 py-1 rounded-full text-xs flex items-center gap-2">
                      {person} <button onClick={() => setForm(p => ({ ...p, people_contacted: p.people_contacted.filter((_, x) => x !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <label className="text-sm font-semibold">Local Authority notified of missing episode? <span className="text-red-500">*</span></label>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setField("la_notified", true)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.la_notified === true ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-700 hover:border-primary"}`}>Yes</button>
                  <button onClick={() => setField("la_notified", false)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.la_notified === false ? "bg-red-600 text-white border-red-600" : "border-slate-200 text-slate-700 hover:border-red-300"}`}>No</button>
                </div>
                {errors.la_notified && <p className="text-xs text-red-500 mt-1">{errors.la_notified}</p>}
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-semibold">Has the young person returned? </label>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setIsReturned(true)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${isReturned ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-700 hover:border-emerald-400"}`}>Yes — returned</button>
                  <button onClick={() => setIsReturned(false)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${!isReturned ? "bg-slate-700 text-white border-slate-700" : "border-slate-200 text-slate-700 hover:border-slate-400"}`}>No — still missing</button>
                </div>
              </div>

              {isReturned && (
                <>
                  <div>
                    <label className="text-sm font-medium">Date & Time Returned <span className="text-red-500">*</span></label>
                    <Input type="datetime-local" value={form.returned_datetime} onChange={e => setField("returned_datetime", e.target.value)} className={errors.returned_datetime ? "border-red-500" : ""} />
                    {errors.returned_datetime && <p className="text-xs text-red-500 mt-1">{errors.returned_datetime}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Location Returned/Found</label>
                    <Input value={form.returned_location} onChange={e => setField("returned_location", e.target.value)} placeholder="Where were they found?" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Condition on Return <span className="text-red-500">*</span></label>
                    <Select value={form.condition_on_return} onValueChange={v => setField("condition_on_return", v)}>
                      <SelectTrigger className={errors.condition_on_return ? "border-red-500" : ""}><SelectValue placeholder="Select condition..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="well">Well</SelectItem>
                        <SelectItem value="distressed">Distressed</SelectItem>
                        <SelectItem value="under_influence">Under influence of substances</SelectItem>
                        <SelectItem value="injured">Injured</SelectItem>
                        <SelectItem value="refused_to_engage">Refused to engage</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.condition_on_return && <p className="text-xs text-red-500 mt-1">{errors.condition_on_return}</p>}
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-semibold text-blue-700 mb-2">Required for Annex A</p>
                    <label className="text-sm font-semibold text-blue-900">Did the local authority offer a return-home interview? <span className="text-red-500">*</span></label>
                    <p className="text-xs text-blue-600 mt-0.5 mb-2">(Required for Annex A missing episodes reporting)</p>
                    <div className="flex gap-3">
                      <button onClick={() => setField("rhi_offered_by_la", true)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.rhi_offered_by_la === true ? "bg-primary text-white border-primary" : "border-blue-200 text-slate-700 hover:border-primary"}`}>Yes</button>
                      <button onClick={() => setField("rhi_offered_by_la", false)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.rhi_offered_by_la === false ? "bg-red-600 text-white border-red-600" : "border-blue-200 text-slate-700 hover:border-red-300"}`}>No</button>
                    </div>
                    {errors.rhi_offered_by_la && <p className="text-xs text-red-500 mt-1">{errors.rhi_offered_by_la}</p>}
                  </div>
                  {form.rhi_offered_by_la && (
                    <div><label className="text-sm font-medium">Interview Offered Date</label>
                      <Input type="date" value={form.return_home_interview_offered_date} onChange={e => setForm(p => ({ ...p, return_home_interview_offered_date: e.target.value }))} />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {step === 5 && (
            <>
              {/* Impact & Outcome section */}
              <MissingImpactOutcomeSection
                form={impactForm}
                setForm={setImpactForm}
                staff={staff}
                disabled={false}
              />

              <div className="border-t border-border pt-4">
                <div><label className="text-sm font-medium">Outcome / Learning</label>
                  <textarea value={form.outcome_learning} onChange={e => setForm(p => ({ ...p, outcome_learning: e.target.value }))} placeholder="What was learned from this episode?" rows={4} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.risk_assessment_updated} onChange={e => setForm(p => ({ ...p, risk_assessment_updated: e.target.checked }))} />
                  Risk assessment updated?
                </label></div>
                <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.manager_review_signoff} onChange={e => setForm(p => ({ ...p, manager_review_signoff: e.target.checked }))} />
                  Manager review & sign-off completed?
                </label></div>
              </div>
              <p className="text-xs text-muted-foreground">Review all details before submitting.</p>
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <p className="text-sm text-green-700"><strong>Summary:</strong></p>
                <p className="text-sm text-green-700 mt-1">Missing: <strong>{selectedResident?.display_name}</strong></p>
                <p className="text-sm text-green-700">Since: <strong>{form.last_seen_datetime}</strong></p>
                {form.returned_datetime && <p className="text-sm text-green-700">Returned: <strong>{form.returned_datetime}</strong></p>}
                {form.reported_to_police && <p className="text-sm text-green-700">Police Ref: <strong>{form.police_reference_number}</strong></p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < 5 ? (
            <Button onClick={handleNext} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {createMutation.isPending ? "Saving..." : "Submit Report"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}