import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";

const GOAL_AREAS = ["safety", "education", "health", "relationships", "independence", "emotional_wellbeing", "behaviour", "other"];
const PROGRESS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "achieved",    label: "Achieved" },
  { value: "not_achieved", label: "Not Achieved" },
];

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function SectionHeader({ children }) {
  return <h3 className="font-semibold text-sm border-b border-border pb-2 mb-3">{children}</h3>;
}

function YesNo({ value, onChange, disabled }) {
  return (
    <div className="flex gap-2">
      {[true, false].map(opt => (
        <button
          key={String(opt)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            value === opt ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:bg-muted"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {opt ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

const BLANK_FORM = {
  resident_id: "",
  reason_for_placement: "",
  placement_type: "",
  planned_duration: "",
  planned_end_date: "",
  emergency_placement: false,
  number_of_placements_12_months: 0,
  goals: [],
  risk_of_breakdown: false,
  breakdown_risk_notes: "",
  contingency_plan: "",
  social_worker_name: "",
  social_worker_contact: "",
  iro_name: "",
  iro_contact: "",
  la_area: "",
  effective_date: new Date().toISOString().split("T")[0],
  review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  child_consulted: false,
  child_agrees: false,
  child_comments: "",
  parent_consulted: false,
  parent_comments: "",
  la_agreed: false,
};

export default function PlacementPlanForm({ plan, resident, residents, homes, staff, myStaffProfile, onClose, onSave }) {
  const isEdit = !!plan?.id;
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile: myStaffProfile });

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          resident_id: plan.resident_id || "",
          reason_for_placement: plan.reason_for_placement || "",
          placement_type: plan.placement_type || "",
          planned_duration: plan.planned_duration || "",
          planned_end_date: plan.planned_end_date || "",
          emergency_placement: plan.emergency_placement || false,
          number_of_placements_12_months: plan.number_of_placements_12_months || 0,
          goals: Array.isArray(plan.goals) ? plan.goals : [],
          risk_of_breakdown: plan.risk_of_breakdown || false,
          breakdown_risk_notes: plan.breakdown_risk_notes || "",
          contingency_plan: plan.contingency_plan || "",
          social_worker_name: plan.social_worker_name || "",
          social_worker_contact: plan.social_worker_contact || "",
          iro_name: plan.iro_name || "",
          iro_contact: plan.iro_contact || "",
          la_area: plan.la_area || "",
          effective_date: plan.effective_date || "",
          review_date: plan.review_date || "",
          child_consulted: plan.child_consulted || false,
          child_agrees: plan.child_agrees || false,
          child_comments: plan.child_comments || "",
          parent_consulted: plan.parent_consulted || false,
          parent_comments: plan.parent_comments || "",
          la_agreed: plan.la_agreed || false,
        }
      : { ...BLANK_FORM, resident_id: resident?.id || "" }
  );

  const [newGoal, setNewGoal] = useState({ goal_area: "safety", description: "", target_date: "", responsible_person: "", progress: "not_started" });
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedResident = useMemo(
    () => residents.find(r => r.id === form.resident_id),
    [form.resident_id, residents]
  );
  const selectedHome = useMemo(
    () => homes.find(h => h.id === selectedResident?.home_id),
    [homes, selectedResident]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const base = {
        org_id: ORG_ID,
        resident_id: form.resident_id,
        resident_name: selectedResident?.display_name || "",
        home_id: selectedResident?.home_id || "",
        home_name: selectedHome?.name || "",
        ...form,
        created_by_id: myStaffProfile?.id || null,
        created_by_name: myStaffProfile?.full_name || null,
        updated_at: now,
      };
      if (isEdit) {
        return secureGateway.update("PlacementPlan", plan.id, base);
      }
      return secureGateway.create("PlacementPlan", { ...base, status: "active", version: 1 });
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success(isEdit ? "Plan updated" : "Placement plan created");
      if (!isEdit) {
        triggerWorkflow({
          workflowType: "placement_plan",
          entityId:     created?.id,
          entityRef:    created?.id ? `PP-${created.id.slice(0, 8)}` : "",
          title:        `Placement plan — ${selectedResident?.display_name}`,
          description:  form.reason_for_placement,
          homeId:       selectedResident?.home_id,
          homeName:     selectedHome?.name || "",
          priority:     form.risk_of_breakdown ? "important" : "routine",
        });
      }
      onSave();
    },
    onError: err => toast.error("Error: " + err.message),
  });

  const handleAddGoal = () => {
    if (!newGoal.description.trim()) { toast.error("Goal description is required"); return; }
    set("goals", [...form.goals, { ...newGoal, id: Math.random().toString(36).slice(2) }]);
    setNewGoal({ goal_area: "safety", description: "", target_date: "", responsible_person: "", progress: "not_started" });
  };

  const updateGoalProgress = (idx, progress) => {
    set("goals", form.goals.map((g, i) => i === idx ? { ...g, progress } : g));
  };

  const removeGoal = (idx) => set("goals", form.goals.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!form.resident_id || !form.reason_for_placement || !form.effective_date || !form.review_date) {
      toast.error("Young Person, reason for placement, effective date, and review date are required");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Placement Plan" : "Create Placement Plan"}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1 — Placement details */}
          <div>
            <SectionHeader>Placement Details</SectionHeader>
            <div className="space-y-3">
              {!isEdit && (
                <Field label="Young Person" required>
                  <select
                    value={form.resident_id}
                    onChange={e => set("resident_id", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                  >
                    <option value="">Select...</option>
                    {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Reason for Placement" required>
                <Textarea value={form.reason_for_placement} onChange={e => set("reason_for_placement", e.target.value)} rows={3} placeholder="Why was this placement arranged?" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Placement Type">
                  <Input value={form.placement_type} onChange={e => set("placement_type", e.target.value)} placeholder="e.g. Full-time residential" className="h-9 text-sm" />
                </Field>
                <Field label="Planned Duration">
                  <Input value={form.planned_duration} onChange={e => set("planned_duration", e.target.value)} placeholder="e.g. 2 years" className="h-9 text-sm" />
                </Field>
                <Field label="Effective Date" required>
                  <Input type="date" value={form.effective_date} onChange={e => set("effective_date", e.target.value)} className="h-9 text-sm" />
                </Field>
                <Field label="Review Date" required>
                  <Input type="date" value={form.review_date} onChange={e => set("review_date", e.target.value)} className="h-9 text-sm" />
                </Field>
                <Field label="Number of placements (12 months)">
                  <Input type="number" min={0} value={form.number_of_placements_12_months} onChange={e => set("number_of_placements_12_months", parseInt(e.target.value) || 0)} className="h-9 text-sm" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.emergency_placement} onChange={e => set("emergency_placement", e.target.checked)} className="rounded" />
                Emergency placement
              </label>
            </div>
          </div>

          {/* Section 2 — Goals */}
          <div>
            <SectionHeader>Placement Goals ({form.goals.length})</SectionHeader>
            <div className="space-y-2 mb-3">
              {form.goals.map((g, i) => (
                <div key={g.id || i} className="p-3 border border-border rounded-lg bg-muted/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{g.goal_area}</p>
                      <p className="text-sm mt-0.5">{g.description}</p>
                      {(g.target_date || g.responsible_person) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {g.target_date ? `Target: ${g.target_date}` : ""}
                          {g.target_date && g.responsible_person ? " · " : ""}
                          {g.responsible_person ? `Owner: ${g.responsible_person}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={g.progress || "not_started"}
                        onChange={e => updateGoalProgress(i, e.target.value)}
                        className="text-xs border border-border rounded px-2 py-1 bg-card"
                      >
                        {PROGRESS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button onClick={() => removeGoal(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add goal panel */}
            <div className="border border-dashed border-border rounded-lg p-3 space-y-2 bg-muted/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Goal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Area</label>
                  <select value={newGoal.goal_area} onChange={e => setNewGoal(p => ({ ...p, goal_area: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border border-border rounded text-xs bg-card">
                    {GOAL_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Initial Progress</label>
                  <select value={newGoal.progress} onChange={e => setNewGoal(p => ({ ...p, progress: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border border-border rounded text-xs bg-card">
                    {PROGRESS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Description</label>
                <Input value={newGoal.description} onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))} placeholder="What is the goal?" className="mt-0.5 text-xs h-8" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Responsible Person</label>
                  <Input value={newGoal.responsible_person} onChange={e => setNewGoal(p => ({ ...p, responsible_person: e.target.value }))} className="mt-0.5 text-xs h-8" />
                </div>
                <div>
                  <label className="text-xs font-medium">Target Date</label>
                  <Input type="date" value={newGoal.target_date} onChange={e => setNewGoal(p => ({ ...p, target_date: e.target.value }))} className="mt-0.5 text-xs h-8" />
                </div>
              </div>
              <Button size="sm" onClick={handleAddGoal} variant="outline" className="w-full gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Goal
              </Button>
            </div>
          </div>

          {/* Section 3 — Key People */}
          <div>
            <SectionHeader>Key People</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Social Worker Name"><Input value={form.social_worker_name} onChange={e => set("social_worker_name", e.target.value)} className="h-9 text-sm" /></Field>
              <Field label="SW Contact / Email"><Input value={form.social_worker_contact} onChange={e => set("social_worker_contact", e.target.value)} className="h-9 text-sm" /></Field>
              <Field label="IRO Name"><Input value={form.iro_name} onChange={e => set("iro_name", e.target.value)} className="h-9 text-sm" /></Field>
              <Field label="IRO Contact / Email"><Input value={form.iro_contact} onChange={e => set("iro_contact", e.target.value)} className="h-9 text-sm" /></Field>
              <Field label="Local Authority Area" className="sm:col-span-2">
                <Input value={form.la_area} onChange={e => set("la_area", e.target.value)} className="h-9 text-sm" />
              </Field>
            </div>
          </div>

          {/* Section 4 — Stability */}
          <div>
            <SectionHeader>Placement Stability</SectionHeader>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1.5">Risk of breakdown?</p>
                <YesNo value={form.risk_of_breakdown} onChange={v => set("risk_of_breakdown", v)} />
              </div>
              {form.risk_of_breakdown && (
                <Field label="Risk details">
                  <Textarea value={form.breakdown_risk_notes} onChange={e => set("breakdown_risk_notes", e.target.value)} rows={2} placeholder="Describe the risk factors..." />
                </Field>
              )}
              <Field label="Contingency Plan">
                <Textarea value={form.contingency_plan} onChange={e => set("contingency_plan", e.target.value)} rows={2} placeholder="What happens if placement breaks down?" />
              </Field>
            </div>
          </div>

          {/* Section 5 — Consultation */}
          <div>
            <SectionHeader>Consultation</SectionHeader>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1.5">Child has been consulted?</p>
                <YesNo value={form.child_consulted} onChange={v => set("child_consulted", v)} />
              </div>
              {form.child_consulted && (
                <div className="pl-4 space-y-3 border-l-2 border-muted">
                  <div>
                    <p className="text-sm font-medium mb-1.5">Child agrees with plan?</p>
                    <YesNo value={form.child_agrees} onChange={v => set("child_agrees", v)} />
                  </div>
                  <Field label="Child's comments">
                    <Textarea value={form.child_comments} onChange={e => set("child_comments", e.target.value)} rows={2} placeholder="Young person's own words..." />
                  </Field>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1.5">Parents/carers consulted?</p>
                <YesNo value={form.parent_consulted} onChange={v => set("parent_consulted", v)} />
              </div>
              {form.parent_consulted && (
                <div className="pl-4 border-l-2 border-muted">
                  <Field label="Parents' comments">
                    <Textarea value={form.parent_comments} onChange={e => set("parent_comments", e.target.value)} rows={2} />
                  </Field>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1.5">Local Authority has agreed?</p>
                <YesNo value={form.la_agreed} onChange={v => set("la_agreed", v)} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/20 shrink-0">
          <div>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isEdit ? "Plan updated" : "Plan created"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className={saved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            >
              {mutation.isPending ? "Saving..." : saved ? "✓ Saved" : isEdit ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
