import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PlacementPlanForm({ resident, residents, staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    resident_id: resident?.id || "",
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
  });

  const [newGoal, setNewGoal] = useState({
    goal_area: "safety",
    description: "",
    target_date: "",
    responsible_person: "",
  });

  const selectedResident = useMemo(() => residents.find(r => r.id === form.resident_id), [form.resident_id, residents]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await secureGateway.create("PlacementPlan", {
        org_id: ORG_ID,
        resident_id: data.resident_id,
        resident_name: selectedResident?.display_name,
        home_id: selectedResident?.home_id,
        home_name: selectedResident ? residents.find(r => r.id === data.resident_id)?.display_name : "",
        created_by_id: user?.id,
        created_by_name: user?.full_name,
        status: "active",
        version: 1,
        ...data,
      });
    },
    onSuccess: () => {
      toast.success("Placement plan created");
      qc.invalidateQueries({ queryKey: ["placement-plans"] });
      onSave();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const handleAddGoal = () => {
    if (!newGoal.description) {
      toast.error("Goal description required");
      return;
    }
    setForm(p => ({
      ...p,
      goals: [...p.goals, { ...newGoal, id: Math.random().toString(36).slice(2), progress: "not_started" }],
    }));
    setNewGoal({ goal_area: "safety", description: "", target_date: "", responsible_person: "" });
  };

  const handleRemoveGoal = (idx) => {
    setForm(p => ({ ...p, goals: p.goals.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = () => {
    if (!form.resident_id || !form.reason_for_placement || !form.effective_date || !form.review_date) {
      toast.error("Missing required fields");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Create Placement Plan</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold mb-3">Placement Details</h3>
            <div className="space-y-3">
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
              <div><label className="text-sm font-medium">Reason for Placement *</label>
                <Textarea value={form.reason_for_placement} onChange={e => setForm(p => ({ ...p, reason_for_placement: e.target.value }))} rows={3} placeholder="Why was this placement arranged?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Placement Type</label>
                  <Input value={form.placement_type} onChange={e => setForm(p => ({ ...p, placement_type: e.target.value }))} placeholder="e.g., Full-time residential" />
                </div>
                <div><label className="text-sm font-medium">Planned Duration</label>
                  <Input value={form.planned_duration} onChange={e => setForm(p => ({ ...p, planned_duration: e.target.value }))} placeholder="e.g., 2 years" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Effective Date *</label>
                  <Input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} />
                </div>
                <div><label className="text-sm font-medium">Review Date *</label>
                  <Input type="date" value={form.review_date} onChange={e => setForm(p => ({ ...p, review_date: e.target.value }))} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.emergency_placement} onChange={e => setForm(p => ({ ...p, emergency_placement: e.target.checked }))} />
                Emergency placement
              </label>
            </div>
          </div>

          {/* Goals */}
          <div>
            <h3 className="font-semibold mb-3">Goals ({form.goals.length})</h3>
            <div className="space-y-2 mb-3">
              {form.goals.map((g, i) => (
                <div key={g.id} className="flex items-start justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1 text-sm">
                    <p className="font-medium capitalize">{g.goal_area}</p>
                    <p className="text-muted-foreground">{g.description}</p>
                    {g.target_date && <p className="text-xs text-muted-foreground mt-1">Target: {g.target_date}</p>}
                  </div>
                  <button onClick={() => handleRemoveGoal(i)} className="text-red-500 hover:text-red-700 shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/10">
              <div><label className="text-xs font-medium">Goal Area</label>
                <select
                  value={newGoal.goal_area}
                  onChange={e => setNewGoal(p => ({ ...p, goal_area: e.target.value }))}
                  className="w-full px-2 py-1 border border-border rounded text-xs bg-card"
                >
                  {["safety", "education", "health", "relationships", "independence", "emotional_wellbeing", "behaviour", "other"].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div><label className="text-xs font-medium">Description</label>
                <Input value={newGoal.description} onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))} placeholder="What is the goal?" className="text-xs h-8" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-medium">Responsible Person</label>
                  <Input value={newGoal.responsible_person} onChange={e => setNewGoal(p => ({ ...p, responsible_person: e.target.value }))} className="text-xs h-8" />
                </div>
                <div><label className="text-xs font-medium">Target Date</label>
                  <Input type="date" value={newGoal.target_date} onChange={e => setNewGoal(p => ({ ...p, target_date: e.target.value }))} className="text-xs h-8" />
                </div>
              </div>
              <Button size="sm" onClick={handleAddGoal} className="w-full gap-1"><Plus className="w-3 h-3" /> Add Goal</Button>
            </div>
          </div>

          {/* Stability */}
          <div>
            <h3 className="font-semibold mb-3">Placement Stability</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.risk_of_breakdown} onChange={e => setForm(p => ({ ...p, risk_of_breakdown: e.target.checked }))} />
                Risk of breakdown
              </label>
              {form.risk_of_breakdown && (
                <Textarea value={form.breakdown_risk_notes} onChange={e => setForm(p => ({ ...p, breakdown_risk_notes: e.target.value }))} rows={2} placeholder="Details of the risk..." />
              )}
              <div><label className="text-sm font-medium">Contingency Plan</label>
                <Textarea value={form.contingency_plan} onChange={e => setForm(p => ({ ...p, contingency_plan: e.target.value }))} rows={2} placeholder="What if placement breaks down?" />
              </div>
            </div>
          </div>

          {/* Key People */}
          <div>
            <h3 className="font-semibold mb-3">Key People</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Social Worker Name</label>
                <Input value={form.social_worker_name} onChange={e => setForm(p => ({ ...p, social_worker_name: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">Contact</label>
                <Input value={form.social_worker_contact} onChange={e => setForm(p => ({ ...p, social_worker_contact: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">IRO Name</label>
                <Input value={form.iro_name} onChange={e => setForm(p => ({ ...p, iro_name: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">IRO Contact</label>
                <Input value={form.iro_contact} onChange={e => setForm(p => ({ ...p, iro_contact: e.target.value }))} />
              </div>
              <div className="col-span-2"><label className="text-sm font-medium">Local Authority Area</label>
                <Input value={form.la_area} onChange={e => setForm(p => ({ ...p, la_area: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Consultation */}
          <div>
            <h3 className="font-semibold mb-3">Consultation</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.child_consulted} onChange={e => setForm(p => ({ ...p, child_consulted: e.target.checked }))} />
                Child has been consulted
              </label>
              {form.child_consulted && (
                <>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.child_agrees} onChange={e => setForm(p => ({ ...p, child_agrees: e.target.checked }))} />
                    Child agrees with plan
                  </label>
                  <Textarea value={form.child_comments} onChange={e => setForm(p => ({ ...p, child_comments: e.target.value }))} rows={2} placeholder="Child's comments..." />
                </>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.parent_consulted} onChange={e => setForm(p => ({ ...p, parent_consulted: e.target.checked }))} />
                Parents/carers have been consulted
              </label>
              {form.parent_consulted && (
                <Textarea value={form.parent_comments} onChange={e => setForm(p => ({ ...p, parent_comments: e.target.value }))} rows={2} placeholder="Parents' comments..." />
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.la_agreed} onChange={e => setForm(p => ({ ...p, la_agreed: e.target.checked }))} />
                Local Authority has agreed
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/30">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}