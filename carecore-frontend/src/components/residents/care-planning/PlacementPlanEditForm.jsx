import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function PlacementPlanEditForm({ plan, resident, onClose }) {
  const qc = useQueryClient();
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ ...plan });

  const update = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await secureGateway.update("PlacementPlan", plan.id, data);
    },
    onSuccess: () => {
      toast.success("Placement plan updated");
      qc.invalidateQueries({ queryKey: ["placement-plans"] });
      onClose();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const handleSubmit = () => {
    const errs = {};
    if (!form.reason_for_placement?.trim()) errs.reason_for_placement = "Reason for placement is required";
    if (!form.effective_date) errs.effective_date = "Effective date is required";
    if (!form.review_date) errs.review_date = "Review date is required";
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error("Please fill in all required fields"); return; }
    updateMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-bold">Edit Placement Plan (Version {plan.version})</h2>
            <p className="text-xs text-muted-foreground">{resident?.display_name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold mb-3">Placement Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Reason for Placement *</label>
                <Textarea
                  value={form.reason_for_placement}
                  onChange={e => update("reason_for_placement", e.target.value)}
                  rows={3}
                  placeholder="Why was this placement arranged?"
                  className={`mt-1 ${errors.reason_for_placement ? "border-destructive" : ""}`}
                />
                {errors.reason_for_placement && <p className="text-xs text-destructive mt-1">{errors.reason_for_placement}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Placement Type</label>
                  <Input value={form.placement_type || ""} onChange={e => update("placement_type", e.target.value)} className="mt-1" placeholder="e.g., Full-time residential" />
                </div>
                <div>
                  <label className="text-sm font-medium">Planned Duration</label>
                  <Input value={form.planned_duration || ""} onChange={e => update("planned_duration", e.target.value)} className="mt-1" placeholder="e.g., 2 years" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Effective Date *</label>
                  <Input type="date" value={form.effective_date} onChange={e => update("effective_date", e.target.value)} className={`mt-1 ${errors.effective_date ? "border-destructive" : ""}`} />
                  {errors.effective_date && <p className="text-xs text-destructive mt-1">{errors.effective_date}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Review Date *</label>
                  <Input type="date" value={form.review_date} onChange={e => update("review_date", e.target.value)} className={`mt-1 ${errors.review_date ? "border-destructive" : ""}`} />
                  {errors.review_date && <p className="text-xs text-destructive mt-1">{errors.review_date}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={form.status || "active"}
                    onChange={e => update("status", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" id="emergency" checked={form.emergency_placement || false} onChange={e => update("emergency_placement", e.target.checked)} />
                  <label htmlFor="emergency" className="text-sm cursor-pointer">Emergency placement</label>
                </div>
              </div>
            </div>
          </div>

          {/* Stability */}
          <div>
            <h3 className="font-semibold mb-3">Placement Stability</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="breakdown" checked={form.risk_of_breakdown || false} onChange={e => update("risk_of_breakdown", e.target.checked)} />
                <label htmlFor="breakdown" className="text-sm cursor-pointer">Risk of breakdown</label>
              </div>
              {form.risk_of_breakdown && (
                <Textarea value={form.breakdown_risk_notes || ""} onChange={e => update("breakdown_risk_notes", e.target.value)} rows={2} placeholder="Details of the risk..." />
              )}
              <div>
                <label className="text-sm font-medium">Contingency Plan</label>
                <Textarea value={form.contingency_plan || ""} onChange={e => update("contingency_plan", e.target.value)} rows={2} placeholder="What if placement breaks down?" className="mt-1" />
              </div>
            </div>
          </div>

          {/* Key People */}
          <div>
            <h3 className="font-semibold mb-3">Key People</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Social Worker Name</label>
                <Input value={form.social_worker_name || ""} onChange={e => update("social_worker_name", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Contact</label>
                <Input value={form.social_worker_contact || ""} onChange={e => update("social_worker_contact", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">IRO Name</label>
                <Input value={form.iro_name || ""} onChange={e => update("iro_name", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">IRO Contact</label>
                <Input value={form.iro_contact || ""} onChange={e => update("iro_contact", e.target.value)} className="mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Local Authority Area</label>
                <Input value={form.la_area || ""} onChange={e => update("la_area", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Consultation */}
          <div>
            <h3 className="font-semibold mb-3">Consultation</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="child_consulted" checked={form.child_consulted || false} onChange={e => update("child_consulted", e.target.checked)} />
                <label htmlFor="child_consulted" className="text-sm cursor-pointer">Child has been consulted</label>
              </div>
              {form.child_consulted && (
                <>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="child_agrees" checked={form.child_agrees || false} onChange={e => update("child_agrees", e.target.checked)} />
                    <label htmlFor="child_agrees" className="text-sm cursor-pointer">Child agrees with plan</label>
                  </div>
                  <Textarea value={form.child_comments || ""} onChange={e => update("child_comments", e.target.value)} rows={2} placeholder="Child's comments..." />
                </>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="parent_consulted" checked={form.parent_consulted || false} onChange={e => update("parent_consulted", e.target.checked)} />
                <label htmlFor="parent_consulted" className="text-sm cursor-pointer">Parents/carers have been consulted</label>
              </div>
              {form.parent_consulted && (
                <Textarea value={form.parent_comments || ""} onChange={e => update("parent_comments", e.target.value)} rows={2} placeholder="Parents' comments..." />
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="la_agreed" checked={form.la_agreed || false} onChange={e => update("la_agreed", e.target.checked)} />
                <label htmlFor="la_agreed" className="text-sm cursor-pointer">Local Authority has agreed</label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/30">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}