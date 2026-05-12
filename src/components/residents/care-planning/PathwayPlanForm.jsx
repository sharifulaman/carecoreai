import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const STATUTORY_AREAS = [
  { key: "health_and_development", label: "Health & Development" },
  { key: "education_training_employment", label: "Education, Training & Employment" },
  { key: "financial_capability", label: "Financial Capability" },
  { key: "accommodation", label: "Accommodation" },
  { key: "family_and_social_relationships", label: "Family & Relationships" },
  { key: "identity_and_self_care", label: "Identity & Self-Care" },
  { key: "emotional_and_behavioural_development", label: "Emotional & Behavioural Development" },
];

export default function PathwayPlanForm({ resident, residents, staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    resident_id: resident?.id || "",
    personal_adviser_name: "",
    personal_adviser_contact: "",
    effective_date: new Date().toISOString().split("T")[0],
    review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    health_and_development: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    education_training_employment: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    financial_capability: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    accommodation: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "", planned_accommodation_at_18: "", accommodation_identified: false, address: "", tenancy_support_needed: false },
    family_and_social_relationships: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    identity_and_self_care: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    emotional_and_behavioural_development: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    contingency_plan: "",
    young_person_consulted: false,
    young_person_agrees: false,
    young_person_goals: "",
    young_person_concerns: "",
  });

  const selectedResident = useMemo(() => residents.find(r => r.id === form.resident_id), [form.resident_id, residents]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await secureGateway.create("PathwayPlan", {
        org_id: ORG_ID,
        resident_id: data.resident_id,
        resident_name: selectedResident?.display_name,
        home_id: selectedResident?.home_id,
        created_by_id: user?.id,
        created_by_name: user?.full_name,
        status: "active",
        version: 1,
        ...data,
      });
    },
    onSuccess: () => {
      toast.success("Pathway plan created");
      qc.invalidateQueries({ queryKey: ["pathway-plans"] });
      onSave();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const handleSubmit = () => {
    if (!form.resident_id || !form.effective_date || !form.review_date) {
      toast.error("Missing required fields");
      return;
    }
    createMutation.mutate(form);
  };

  const currentArea = STATUTORY_AREAS[step - 1];
  const areaData = form[currentArea.key];
  const isLastStep = step === STATUTORY_AREAS.length + 1;

  const updateArea = (field, value) => {
    setForm(p => ({
      ...p,
      [currentArea.key]: { ...areaData, [field]: value },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Create Pathway Plan</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 px-6 py-3 bg-muted/30 border-b border-border overflow-x-auto scrollbar-none">
          {[...STATUTORY_AREAS, { key: "summary", label: "Summary" }].map((area, idx) => (
            <div key={area.key} className="flex items-center shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step > idx + 1 ? "bg-green-600 text-white" : step === idx + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > idx + 1 ? "✓" : idx + 1}
              </div>
              {idx < STATUTORY_AREAS.length + 1 && <div className={`w-6 h-0.5 mx-1 ${step > idx + 1 ? "bg-green-600" : step === idx + 1 ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {step === 1 && !isLastStep ? (
            // Basic info
            <>
              <div><label className="text-sm font-medium">Young Person *</label>
                <select
                  value={form.resident_id}
                  onChange={e => setForm(p => ({ ...p, resident_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                >
                  <option value="">Select...</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium">Personal Adviser Name</label>
                <Input value={form.personal_adviser_name} onChange={e => setForm(p => ({ ...p, personal_adviser_name: e.target.value }))} placeholder="Name of Personal Adviser" />
              </div>
              <div><label className="text-sm font-medium">Personal Adviser Contact</label>
                <Input value={form.personal_adviser_contact} onChange={e => setForm(p => ({ ...p, personal_adviser_contact: e.target.value }))} placeholder="Phone or email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Effective Date *</label>
                  <Input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} />
                </div>
                <div><label className="text-sm font-medium">Review Date *</label>
                  <Input type="date" value={form.review_date} onChange={e => setForm(p => ({ ...p, review_date: e.target.value }))} />
                </div>
              </div>
            </>
          ) : !isLastStep ? (
            // Statutory area
            <>
              <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
                <p className="text-sm font-medium text-blue-900">{currentArea.label}</p>
              </div>
              <div><label className="text-sm font-medium">Current Situation</label>
                <Textarea value={areaData.current_situation} onChange={e => updateArea("current_situation", e.target.value)} rows={2} placeholder="What is the current situation?" />
              </div>
              <div><label className="text-sm font-medium">Identified Needs</label>
                <Textarea value={areaData.needs} onChange={e => updateArea("needs", e.target.value)} rows={2} placeholder="What are the needs?" />
              </div>
              <div><label className="text-sm font-medium">Support Planned</label>
                <Textarea value={areaData.support_planned} onChange={e => updateArea("support_planned", e.target.value)} rows={2} placeholder="What support is planned?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Who is Responsible?</label>
                  <Input value={areaData.who_responsible} onChange={e => updateArea("who_responsible", e.target.value)} />
                </div>
                <div><label className="text-sm font-medium">Target Date</label>
                  <Input type="date" value={areaData.target_date} onChange={e => updateArea("target_date", e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            // Summary
            <>
              <div><label className="text-sm font-medium">Contingency Plan</label>
                <Textarea value={form.contingency_plan} onChange={e => setForm(p => ({ ...p, contingency_plan: e.target.value }))} rows={3} placeholder="What happens if the plan breaks down?" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.young_person_consulted} onChange={e => setForm(p => ({ ...p, young_person_consulted: e.target.checked }))} />
                Young person has been consulted
              </label>
              {form.young_person_consulted && (
                <>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.young_person_agrees} onChange={e => setForm(p => ({ ...p, young_person_agrees: e.target.checked }))} />
                    Young person agrees with plan
                  </label>
                  <div><label className="text-sm font-medium">Young Person's Goals (in own words)</label>
                    <Textarea value={form.young_person_goals} onChange={e => setForm(p => ({ ...p, young_person_goals: e.target.value }))} rows={2} placeholder="What does the young person want?" />
                  </div>
                  <div><label className="text-sm font-medium">Young Person's Concerns</label>
                    <Textarea value={form.young_person_concerns} onChange={e => setForm(p => ({ ...p, young_person_concerns: e.target.value }))} rows={2} placeholder="Any concerns or worries?" />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < STATUTORY_AREAS.length + 2 ? (
            <Button onClick={() => setStep(s => s + 1)} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Plan"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}