import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";
import { CheckCircle2, Clock, Pencil } from "lucide-react";

function calcStatus(form) {
  const required = ["behaviours_of_concern", "triggers", "warning_signs", "green_strategies", "amber_strategies", "red_strategies"];
  const allFilled = required.every(k => form[k]?.trim());
  if (allFilled) return "completed";
  const anyFilled = Object.values(form).some(v => typeof v === "string" && v.trim());
  return anyFilled ? "in_progress" : "not_started";
}

export function getBehaviourStatus(record) {
  if (!record) return "not_started";
  return calcStatus(record);
}

const STATUS_BADGE = {
  completed: "bg-green-100 text-green-700",
  in_progress: "bg-amber-100 text-amber-700",
  not_started: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL = { completed: "Completed", in_progress: "In Progress", not_started: "Not Started" };

function YesNoToggle({ value, onChange, disabled }) {
  return (
    <div className="flex gap-2">
      {[true, false].map(opt => (
        <button
          key={String(opt)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${value === opt ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground hover:bg-muted"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {opt ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children, className = "" }) {
  return <p className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 ${className}`}>{children}</p>;
}

export default function BehaviourManagementForm({ residentId, homeId, staffProfile, readOnly = false }) {
  const qc = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["behaviour-plan", residentId],
    queryFn: () => secureGateway.filter("BehaviourSupportPlan", { resident_id: residentId }),
    enabled: !!residentId,
  });

  const existing = records[0] || null;

  // When an existing plan is loaded, default to viewing it (not editing)
  const [isEditing, setIsEditing] = useState(false);

  // Reset editing state when the resident changes or existing plan loads
  useEffect(() => {
    setIsEditing(false);
  }, [residentId, existing?.id]);

  const [form, setForm] = useState({
    behaviours_of_concern: "",
    triggers: "",
    warning_signs: "",
    green_strategies: "",
    amber_strategies: "",
    red_strategies: "",
    physical_intervention_permitted: false,
    physical_intervention_detail: "",
    prohibited_sanctions: "",
    post_incident_support: "",
    yp_involved_in_plan: false,
    review_date: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        behaviours_of_concern: existing.behaviours_of_concern || "",
        triggers: existing.triggers || "",
        warning_signs: existing.warning_signs || "",
        green_strategies: existing.green_strategies || "",
        amber_strategies: existing.amber_strategies || "",
        red_strategies: existing.red_strategies || "",
        physical_intervention_permitted: existing.physical_intervention_permitted || false,
        physical_intervention_detail: existing.physical_intervention_detail || "",
        prohibited_sanctions: existing.prohibited_sanctions || "",
        post_incident_support: existing.post_incident_support || "",
        yp_involved_in_plan: existing.yp_involved_in_plan || false,
        review_date: existing.review_date || "",
      });
    }
  }, [existing?.id]);

  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const status = calcStatus(form);

  const validate = () => {
    const errs = {};
    const textFields = [
      "behaviours_of_concern", "triggers", "warning_signs",
      "green_strategies", "amber_strategies", "red_strategies",
      "prohibited_sanctions", "post_incident_support",
    ];
    textFields.forEach(k => {
      if (!form[k]?.trim()) errs[k] = "This field is required";
    });
    if (form.physical_intervention_permitted && !form.physical_intervention_detail?.trim()) {
      errs.physical_intervention_detail = "Please provide details for physical intervention";
    }
    if (!form.review_date) errs.review_date = "Review date is required";
    return errs;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const payload = {
        org_id: ORG_ID,
        resident_id: residentId,
        home_id: homeId,
        ...form,
        completed_by: staffProfile?.id || null,
        completed_by_name: staffProfile?.full_name || null,
        completed_at: now,
        updated_at: now,
      };
      if (existing?.id) {
        return secureGateway.update("BehaviourSupportPlan", existing.id, payload);
      }
      return secureGateway.create("BehaviourSupportPlan", payload);
    },
    onSuccess: async (created) => {
      toast.success("Behaviour management plan saved");
      qc.invalidateQueries({ queryKey: ["behaviour-plan", residentId] });
      setIsEditing(false);
      const entityId = existing?.id || created?.id;
      const isHighRisk = form.physical_intervention_permitted;

      const result = await triggerWorkflow({
        workflowType: "behaviour_plan",
        entityId: entityId,
        entityRef: entityId ? `BMP-${entityId.slice(0, 8)}` : "",
        title: "Behaviour management plan submitted",
        description: form.behaviours_of_concern,
        homeId: homeId,
        homeName: "",
        priority: isHighRisk ? "urgent" : "routine",
      });

      // Restraint-linked plans escalate straight to RSM rather than waiting
      // at the normal TM/Risk Manager checker tier.
      if (isHighRisk && result?.id) {
        await base44.workflow.action(result.id, {
          action: "escalate",
          actor_name: staffProfile?.full_name || staffProfile?.email || "Unknown",
          comment: "Physical intervention permitted — escalated for RSM review.",
        });
      }
    },
    onError: (e) => toast.error("Error saving: " + e.message),
  });

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;

  // Show saved confirmation banner when a plan exists and user is not editing
  if (existing && !isEditing) {
    const savedDate = existing.completed_at
      ? new Date(existing.completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : null;
    const reviewDue = existing.review_date
      ? new Date(existing.review_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : null;
    const planStatus = calcStatus(existing);

    return (
      <div className="space-y-4">
        {/* Saved confirmation banner */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex flex-col sm:flex-row sm:items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-800 text-sm">Behaviour Management Plan saved</p>
            <div className="mt-1.5 space-y-0.5">
              {savedDate && (
                <p className="text-xs text-green-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Last saved {savedDate}{existing.completed_by_name ? ` by ${existing.completed_by_name}` : ""}
                </p>
              )}
              {reviewDue && (
                <p className="text-xs text-green-700">Review due: {reviewDue}</p>
              )}
            </div>
            <span className={`mt-2 inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_BADGE[planStatus]}`}>
              {STATUS_LABEL[planStatus]}
            </span>
          </div>
          {!readOnly && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-green-300 text-green-700 bg-white hover:bg-green-100 transition-colors shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit plan
            </button>
          )}
        </div>

        {/* Summary of saved values (read-only preview) */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 text-sm">
          {[
            { key: "behaviours_of_concern", label: "Behaviours of concern" },
            { key: "triggers", label: "Triggers" },
            { key: "warning_signs", label: "Warning signs" },
          ].map(({ key, label }) => existing[key] ? (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{existing[key]}</p>
            </div>
          ) : null)}

          <div className="rounded-xl overflow-hidden border border-border">
            {[
              { key: "green_strategies", color: "bg-green-50", label: "🟢 Green — Proactive strategies" },
              { key: "amber_strategies", color: "bg-amber-50", label: "🟡 Amber — De-escalation strategies" },
              { key: "red_strategies", color: "bg-red-50", label: "🔴 Red — Crisis strategies" },
            ].map(({ key, color, label }) => existing[key] ? (
              <div key={key} className={`p-4 border-b last:border-b-0 ${color}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{existing[key]}</p>
              </div>
            ) : null)}
          </div>

          {[
            { key: "prohibited_sanctions", label: "Prohibited sanctions" },
            { key: "post_incident_support", label: "Post-incident support" },
          ].map(({ key, label }) => existing[key] ? (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{existing[key]}</p>
            </div>
          ) : null)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>
          {existing?.completed_at && (
            <span className="text-xs text-muted-foreground">
              Last saved {new Date(existing.completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              {existing.completed_by_name ? ` by ${existing.completed_by_name}` : ""}
            </span>
          )}
        </div>
        {existing && !readOnly && (
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Cancel editing
          </button>
        )}
      </div>

      {/* Core fields */}
      {[
        { key: "behaviours_of_concern", label: "Behaviours of concern *", placeholder: "Describe the specific behaviours, their frequency and pattern" },
        { key: "triggers", label: "Triggers *", placeholder: "What situations, events or interactions cause behaviour to escalate?" },
        { key: "warning_signs", label: "Warning signs *", placeholder: "How does this YP present in the build-up before behaviour escalates?" },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <FieldLabel>{label}</FieldLabel>
          <Textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} disabled={readOnly} className={`resize-y ${errors[key] ? "border-red-500" : ""}`} />
          {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
        </div>
      ))}

      {/* Three-band section */}
      <div className="rounded-xl overflow-hidden border border-border">
        {[
          { key: "green_strategies", color: "bg-green-50 border-green-200", label: "🟢 Green — Proactive strategies *", placeholder: "What do staff do day-to-day to prevent escalation? Include positive reinforcements and reward systems." },
          { key: "amber_strategies", color: "bg-amber-50 border-amber-200", label: "🟡 Amber — De-escalation strategies *", placeholder: "What do staff do when warning signs appear?" },
          { key: "red_strategies", color: "bg-red-50 border-red-200", label: "🔴 Red — Crisis strategies *", placeholder: "What do staff do when behaviour is in full crisis to keep the YP and others safe?" },
        ].map(({ key, color, label, placeholder }) => (
          <div key={key} className={`p-4 border-b last:border-b-0 ${color}`}>
            <FieldLabel>{label}</FieldLabel>
            <Textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} disabled={readOnly} className={`resize-y bg-white/70 ${errors[key] ? "border-red-500" : ""}`} />
            {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
          </div>
        ))}
      </div>

      {/* Physical intervention */}
      <div>
        <FieldLabel>Physical intervention permitted?</FieldLabel>
        <YesNoToggle value={form.physical_intervention_permitted} onChange={v => set("physical_intervention_permitted", v)} disabled={readOnly} />
        {form.physical_intervention_permitted && (
          <div className="mt-3">
            <FieldLabel>Details *</FieldLabel>
            <Textarea value={form.physical_intervention_detail} onChange={e => set("physical_intervention_detail", e.target.value)} placeholder="Under what circumstances and who is authorised? Reference the home's restraint policy." rows={3} disabled={readOnly} className={`resize-y ${errors.physical_intervention_detail ? "border-red-500" : ""}`} />
            {errors.physical_intervention_detail && <p className="text-xs text-red-500 mt-1">{errors.physical_intervention_detail}</p>}
          </div>
        )}
      </div>

      {[
        { key: "prohibited_sanctions", label: "Prohibited sanctions *", placeholder: "Confirm which sanctions are never used with this YP" },
        { key: "post_incident_support", label: "Post-incident support *", placeholder: "Debrief process, restorative conversation approach, recording requirements" },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <FieldLabel>{label}</FieldLabel>
          <Textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} disabled={readOnly} className={`resize-y ${errors[key] ? "border-red-500" : ""}`} />
          {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
        </div>
      ))}

      {/* YP involvement + review date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel>Was the YP involved in developing this plan?</FieldLabel>
          <YesNoToggle value={form.yp_involved_in_plan} onChange={v => set("yp_involved_in_plan", v)} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel>Review date *</FieldLabel>
          <Input type="date" value={form.review_date} onChange={e => set("review_date", e.target.value)} disabled={readOnly} className={`h-9 ${errors.review_date ? "border-red-500" : ""}`} />
          {errors.review_date && <p className="text-xs text-red-500 mt-1">{errors.review_date}</p>}
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end pt-2">
          <Button onClick={() => {
            const errs = validate();
            if (Object.keys(errs).length > 0) {
              setErrors(errs);
              toast.error("Please fill in all required fields");
              return;
            }
            saveMutation.mutate();
          }} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save plan"}
          </Button>
        </div>
      )}
    </div>
  );
}