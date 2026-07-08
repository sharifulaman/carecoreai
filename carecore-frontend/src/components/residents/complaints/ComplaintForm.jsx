import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronRight, ChevronLeft, AlertTriangle, Star } from "lucide-react";
import { toast } from "sonner";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";

// Steps: 1=Type of Response, 2=Your Details, 3=Your Feedback, 4=Declaration
const STEP_LABELS = ["Type of Response", "Your Details", "Your Feedback", "Declaration"];
const TOTAL_STEPS = 4;

export default function ComplaintForm({ resident, residents, staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile: { id: user?.id, full_name: user?.full_name, email: user?.email } });
  const [step, setStep] = useState(1);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const [form, setForm] = useState({
    // Step 1 — Type of Response
    feedback_type: "",               // "complaint" | "compliment"
    yp_name_free: "",                // Optional YP name (free text, not mandatory)

    // Step 2 — Your Details (complaint only)
    resident_id: resident?.id || "",
    complainant_name: "",
    alleged_individual: "",
    nature_of_allegation: "",
    received_datetime: new Date().toISOString().slice(0, 16),
    witnessed: "",
    immediate_action_taken: "",
    dsl_notified: "",
    lado_contacted: "",
    classification: "",
    happy_to_be_contacted: "",

    // Step 3 — Feedback (complaint)
    complaint_details: "",
    when_happened: "",
    who_involved: "",
    how_felt: "",
    desired_outcome: "",

    // Step 3 — Feedback (compliment)
    compliment_staff_id: "",
    compliment_company: true,       // always true — complimenting the company
    compliment_feedback: "",        // what they want to say

    // Step 4 — Declaration / Staff Use
    received_by_name: user?.full_name || "",
    received_by_id: user?.id || "",
    action_taken: "",
    investigation_outcome: "",
    acknowledged: false,
    annex_a_reportable: true,
    severity: "moderate",
    complaint_type: "care_quality",
    accommodation_category: resident?.accommodation_category || "",
    complainant_source: "child",
    is_child_complainant: true,
    is_representation: false,
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const selectedResident = useMemo(() => residents.find(r => r.id === form.resident_id), [form.resident_id, residents]);
  const selectedComplimentStaff = useMemo(() => staff.find(s => s.id === form.compliment_staff_id), [form.compliment_staff_id, staff]);

  useEffect(() => {
    if (selectedResident) set("accommodation_category", selectedResident.accommodation_category || "");
  }, [selectedResident?.id]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const targetDate = new Date(data.received_datetime);
      targetDate.setDate(targetDate.getDate() + 10);

      const isCompliment = data.feedback_type === "compliment";

      const complaint = {
        org_id: ORG_ID,
        resident_id: isCompliment ? "" : data.resident_id,
        resident_name: isCompliment ? (data.yp_name_free || "") : selectedResident?.display_name,
        home_id: isCompliment ? "" : (selectedResident?.home_id || ""),
        home_name: isCompliment ? "" : (selectedResident?.home_id || ""),
        accommodation_category: isCompliment ? "" : (selectedResident?.accommodation_category || ""),
        received_by_id: user?.id,
        received_by_name: user?.full_name,
        received_datetime: data.received_datetime,
        received_method: "in_person",
        target_resolution_date: targetDate.toISOString().split("T")[0],
        status: isCompliment ? "resolved" : "received",
        manager_review_status: "pending_review",
        complainant_name: isCompliment ? (data.yp_name_free || "") : data.complainant_name,
        complainant_source: data.complainant_source,
        is_child_complainant: true,
        complaint_details: isCompliment ? data.compliment_feedback : data.complaint_details,
        complaint_type: isCompliment ? "compliment" : data.complaint_type,
        is_representation: isCompliment,
        severity: isCompliment ? "minor" : data.severity,
        annex_a_reportable: !isCompliment,
        acknowledged: data.acknowledged,
        investigation_outcome: isCompliment
          ? [
            selectedComplimentStaff ? `Staff Complimented: ${selectedComplimentStaff.full_name}` : "",
            "Company Complimented: Yes",
            data.compliment_feedback ? `Feedback: ${data.compliment_feedback}` : "",
          ].filter(Boolean).join("\n")
          : [
            data.nature_of_allegation ? `Nature of Allegation: ${data.nature_of_allegation}` : "",
            data.alleged_individual ? `Alleged Individual: ${data.alleged_individual}` : "",
            `Witnessed: ${data.witnessed}`,
            `Immediate Action Taken: ${data.immediate_action_taken}`,
            `DSL/TL Notified: ${data.dsl_notified}`,
            `LADO Contacted: ${data.lado_contacted}`,
            data.classification ? `Classification: ${data.classification}` : "",
            data.who_involved ? `Who Involved: ${data.who_involved}` : "",
            data.how_felt ? `How YP Felt: ${data.how_felt}` : "",
            data.desired_outcome ? `Desired Outcome: ${data.desired_outcome}` : "",
            data.when_happened ? `When Happened: ${data.when_happened}` : "",
          ].filter(Boolean).join("\n"),
        actions_taken: data.action_taken,
        summary: (isCompliment ? data.compliment_feedback : data.complaint_details)?.slice(0, 120) || "",
        full_detail: isCompliment ? data.compliment_feedback : data.complaint_details,
      };

      await secureGateway.create("Complaint", complaint);

      await secureGateway.create("Notification", {
        org_id: ORG_ID,
        type: isCompliment ? "compliment" : "complaint",
        priority: isCompliment ? "normal" : "high",
        title: isCompliment
          ? `New Compliment${data.yp_name_free ? ` from ${data.yp_name_free}` : ""}`
          : `New Complaint: ${selectedResident?.display_name}`,
        message: isCompliment
          ? `A compliment has been logged${selectedComplimentStaff ? ` for ${selectedComplimentStaff.full_name}` : ""} and requires your review.`
          : `A complaint has been logged for ${selectedResident?.display_name} and requires your review.`,
        recipient_role: "team_leader",
        is_read: false,
      });
    },
    onSuccess: () => {
      toast.success("Logged successfully — sent to Team Leader for review");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      triggerWorkflow({
        workflowType: "records_complaints_compliments",
        entityId: "",  // created record id not returned here — acceptable
        entityRef: "",
        title: form.feedback_type === "compliment"
          ? `Compliment — ${form.yp_name_free || "YP"}`
          : `Complaint — ${selectedResident?.display_name || "YP"}`,
        description: form.feedback_type === "compliment"
          ? form.compliment_feedback?.slice(0, 120)
          : form.complaint_details?.slice(0, 120),
        homeId: selectedResident?.home_id || "",
        homeName: "",
        priority: form.feedback_type === "compliment" ? "routine" : (form.severity === "very_serious" || form.severity === "serious" ? "urgent" : "routine"),
      });
      onSave();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const canNext = useMemo(() => {
    if (step === 1) return !!form.feedback_type;
    if (step === 2) {
      if (form.feedback_type === "complaint") return !!(form.resident_id && form.received_datetime);
      return true; // compliment step 2 has no mandatory fields
    }
    if (step === 3) {
      if (form.feedback_type === "complaint") return !!(form.complaint_details && form.complaint_details.trim().length >= 10);
      return !!(form.compliment_feedback && form.compliment_feedback.trim().length >= 5);
    }
    return true;
  }, [step, form]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-lg font-bold">Young Person Complaint & Compliment Form</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-6 py-3 bg-muted/30 border-b border-border gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</div>
              <div className="ml-2 hidden sm:block">
                <p className={`text-xs font-medium ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>{STEP_LABELS[s - 1]}</p>
              </div>
              {s < 4 && <div className={`flex-1 h-0.5 mx-3 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5">

          {/* ── STEP 1: Type of Response ── */}
          {step === 1 && (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">Please tell us what type of response you would like to make.</p>
              </div>

              <div>
                <label className="text-sm font-medium">Young Person Name <span className="text-xs text-muted-foreground">(optional)</span></label>
                <Select value={form.yp_name_free} onValueChange={v => set("yp_name_free", v)}>
                  <SelectTrigger><SelectValue placeholder="Select young person (optional)..." /></SelectTrigger>
                  <SelectContent>
                    {residents.map(r => <SelectItem key={r.id} value={r.display_name}>{r.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-3">Type of Response <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Complaint Card */}
                  <button
                    type="button"
                    onClick={() => set("feedback_type", "complaint")}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${form.feedback_type === "complaint"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-border hover:border-red-300 hover:bg-red-50/50"
                      }`}
                  >
                    <AlertTriangle className={`w-8 h-8 ${form.feedback_type === "complaint" ? "text-red-500" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className="font-semibold text-sm">Complaint</p>
                      <p className="text-xs text-muted-foreground mt-1">Report a concern or issue</p>
                    </div>
                  </button>

                  {/* Compliment Card */}
                  <button
                    type="button"
                    onClick={() => set("feedback_type", "compliment")}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${form.feedback_type === "compliment"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-border hover:border-green-300 hover:bg-green-50/50"
                      }`}
                  >
                    <Star className={`w-8 h-8 ${form.feedback_type === "compliment" ? "text-green-500" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className="font-semibold text-sm">Compliment</p>
                      <p className="text-xs text-muted-foreground mt-1">Share positive feedback</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Your Details ── */}
          {step === 2 && form.feedback_type === "complaint" && (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">Your Details (Optional) — you may remain anonymous</p>
              </div>

              <div>
                <label className="text-sm font-medium">Young Person <span className="text-red-500">*</span></label>
                <Select value={form.resident_id} onValueChange={v => set("resident_id", v)}>
                  <SelectTrigger className={!form.resident_id ? "border-red-300" : ""}><SelectValue placeholder="Select young person..." /></SelectTrigger>
                  <SelectContent>
                    {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Young Person Making Allegation <span className="text-xs text-muted-foreground">(optional)</span></label>
                <Input value={form.complainant_name} onChange={e => set("complainant_name", e.target.value)} placeholder="Name or leave blank to stay anonymous" />
              </div>

              <div>
                <label className="text-sm font-medium">Alleged Individual</label>
                <Select value={form.alleged_individual} onValueChange={v => set("alleged_individual", v)}>
                  <SelectTrigger><SelectValue placeholder="Select staff member..." /></SelectTrigger>
                  <SelectContent>
                    {staff.map(s => <SelectItem key={s.id} value={s.full_name}>{s.full_name} {s.role ? `— ${s.role.replace(/_/g, " ")}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Nature of Allegation</label>
                <Textarea value={form.nature_of_allegation} onChange={e => set("nature_of_allegation", e.target.value)} rows={2} placeholder="Briefly describe the nature of the allegation" />
              </div>

              <div>
                <label className="text-sm font-medium">Date & Time Allegation Raised <span className="text-red-500">*</span></label>
                <Input type="datetime-local" value={form.received_datetime} onChange={e => set("received_datetime", e.target.value)} />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Witnessed?</label>
                <div className="flex gap-4">
                  {["yes", "no"].map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="witnessed" checked={form.witnessed === v} onChange={() => set("witnessed", v)} />
                      {v === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Immediate Action Taken</label>
                <Textarea value={form.immediate_action_taken} onChange={e => set("immediate_action_taken", e.target.value)} rows={2} placeholder="What immediate steps were taken?" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">DSL / Team Leader / Team Manager Notified?</label>
                <div className="flex gap-4">
                  {["yes", "no"].map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="dsl_notified" checked={form.dsl_notified === v} onChange={() => set("dsl_notified", v)} />
                      {v === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">LADO Contacted?</label>
                <div className="flex gap-4">
                  {["yes", "no"].map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="lado_contacted" checked={form.lado_contacted === v} onChange={() => set("lado_contacted", v)} />
                      {v === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Classification</label>
                <div className="flex flex-wrap gap-3">
                  {["Substantiated", "Unsubstantiated", "False", "Malicious"].map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.classification === c} onChange={() => set("classification", form.classification === c ? "" : c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Are you happy to be contacted about this?</label>
                <div className="flex flex-wrap gap-4">
                  {[{ v: "yes", l: "Yes" }, { v: "no", l: "No" }, { v: "anonymous", l: "I want to stay anonymous" }].map(({ v, l }) => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="happy_to_be_contacted" checked={form.happy_to_be_contacted === v} onChange={() => set("happy_to_be_contacted", v)} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Your Details (Compliment) ── */}
          {step === 2 && form.feedback_type === "compliment" && (
            <>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700 font-medium">We love hearing positive feedback! Please share who you'd like to compliment.</p>
              </div>

              <div>
                <label className="text-sm font-medium">Compliment a Staff Member <span className="text-xs text-muted-foreground">(optional)</span></label>
                <Select value={form.compliment_staff_id} onValueChange={v => set("compliment_staff_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select a staff member..." /></SelectTrigger>
                  <SelectContent>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} {s.role ? `— ${s.role.replace(/_/g, " ")}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Star className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Complimenting the Company</p>
                  <p className="text-xs text-green-700 mt-0.5">Your feedback will also be shared with the organisation.</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Date of Experience <span className="text-xs text-muted-foreground">(optional)</span></label>
                <Input type="datetime-local" value={form.received_datetime} onChange={e => set("received_datetime", e.target.value)} />
              </div>
            </>
          )}

          {/* ── STEP 3: Feedback (Complaint) ── */}
          {step === 3 && form.feedback_type === "complaint" && (
            <>
              <div>
                <label className="text-sm font-medium">Please describe your complaint <span className="text-red-500">*</span></label>
                <p className="text-xs text-muted-foreground mb-1">Please give as much detail as possible</p>
                <Textarea
                  value={form.complaint_details}
                  onChange={e => set("complaint_details", e.target.value)}
                  rows={5}
                  placeholder="Full details of your complaint..."
                  className={form.complaint_details.trim().length > 0 && form.complaint_details.trim().length < 10 ? "border-red-300" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">{form.complaint_details.trim().length} characters</p>
              </div>

              <div>
                <label className="text-sm font-medium">When did this happen?</label>
                <Input value={form.when_happened} onChange={e => set("when_happened", e.target.value)} placeholder="Date or approximate time period" />
              </div>

              <div>
                <label className="text-sm font-medium">Who was involved?</label>
                <p className="text-xs text-muted-foreground mb-1">Staff names, other young people, or anyone else</p>
                <Textarea value={form.who_involved} onChange={e => set("who_involved", e.target.value)} rows={2} placeholder="Names or roles of people involved" />
              </div>

              <div>
                <label className="text-sm font-medium">How did it make you feel?</label>
                <Textarea value={form.how_felt} onChange={e => set("how_felt", e.target.value)} rows={2} placeholder="Describe how this made you feel" />
              </div>

              <div>
                <label className="text-sm font-medium">What would you like to happen next?</label>
                <p className="text-xs text-muted-foreground mb-1">How would you like us to help?</p>
                <Textarea value={form.desired_outcome} onChange={e => set("desired_outcome", e.target.value)} rows={2} placeholder="Your desired outcome or next steps" />
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-amber-800">Confidentiality and What Happens Next:</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc ml-4">
                  <li>Your voice matters, and we take all feedback seriously.</li>
                  <li>Advocate/Manager will review this form.</li>
                  <li>We will keep your information private, unless someone is at risk of harm.</li>
                  <li>We aim to respond within <strong>10 working days</strong>.</li>
                </ul>
              </div>
            </>
          )}

          {/* ── STEP 3: Feedback (Compliment) ── */}
          {step === 3 && form.feedback_type === "compliment" && (
            <>
              {form.compliment_staff_id && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Star className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800">Complimenting: <strong>{selectedComplimentStaff?.full_name}</strong></p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Your Feedback <span className="text-red-500">*</span></label>
                <p className="text-xs text-muted-foreground mb-1">Tell us what made your experience great</p>
                <Textarea
                  value={form.compliment_feedback}
                  onChange={e => set("compliment_feedback", e.target.value)}
                  rows={6}
                  placeholder={`Tell us what ${form.compliment_staff_id ? selectedComplimentStaff?.full_name || "this staff member" : "made your experience"} great...`}
                  className={form.compliment_feedback.trim().length > 0 && form.compliment_feedback.trim().length < 5 ? "border-red-300" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">{form.compliment_feedback.trim().length} characters</p>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-green-800">Thank you for sharing your positive experience!</p>
                <ul className="text-xs text-green-700 space-y-1 list-disc ml-4">
                  <li>Your feedback will be passed on to the team.</li>
                  <li>Positive feedback helps us celebrate great work.</li>
                  <li>Your feedback will be shared with the organisation.</li>
                </ul>
              </div>
            </>
          )}

          {/* ── STEP 4: Staff Use Only / Declaration ── */}
          {step === 4 && (
            <>
              <div className="p-3 bg-muted/40 border border-border rounded-lg">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Staff Use Only</p>
                <p className="text-xs text-muted-foreground">To be completed by YP advocate, Support worker, managers, QAM</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Received by</label>
                  <Input value={form.received_by_name} onChange={e => set("received_by_name", e.target.value)} placeholder="Staff name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Date Received</label>
                  <Input type="date" value={form.received_datetime?.split("T")[0]} onChange={e => set("received_datetime", e.target.value + "T00:00")} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Action Taken</label>
                <Textarea value={form.action_taken} onChange={e => set("action_taken", e.target.value)} rows={2} placeholder="Actions taken so far" />
              </div>

              <div>
                <label className="text-sm font-medium">Outcome (if known)</label>
                <Textarea value={form.investigation_outcome} onChange={e => set("investigation_outcome", e.target.value)} rows={2} placeholder="Outcome or initial findings" />
              </div>

              {form.feedback_type === "complaint" && (
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["minor", "moderate", "serious", "very_serious"].map(s => (
                      <button key={s} type="button" onClick={() => set("severity", s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.severity === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                        {s.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Acknowledgment:</strong> I acknowledge that the information provided is true and accurate to the best of my knowledge.
                </p>
                <p className="text-xs text-blue-600 mt-1">YP Signature: (verbal / digital consent confirmed)</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.acknowledged} onChange={e => set("acknowledged", e.target.checked)} />
                  {form.feedback_type === "compliment" ? "Feedback acknowledged and recorded" : "Complainant has been acknowledged within 3 working days"}
                </label>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                ✓ On submission this will be sent to the <strong>Team Leader</strong> for review and approval.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30 sticky bottom-0">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              className={form.feedback_type === "compliment" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {createMutation.isPending ? "Submitting..." : `Submit ${form.feedback_type === "compliment" ? "Compliment" : "Complaint"}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}