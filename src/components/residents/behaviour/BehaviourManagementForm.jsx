import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
          className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            value === opt ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground hover:bg-muted"
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

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["behaviour-plan", residentId],
    queryFn: () => secureGateway.filter("BehaviourSupportPlan", { resident_id: residentId }),
    enabled: !!residentId,
  });

  const existing = records[0] || null;

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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const status = calcStatus(form);

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
    onSuccess: () => {
      toast.success("Behaviour management plan saved");
      qc.invalidateQueries({ queryKey: ["behaviour-plan", residentId] });
    },
    onError: (e) => toast.error("Error saving: " + e.message),
  });

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;

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
      </div>

      {/* Core fields */}
      {[
        { key: "behaviours_of_concern", label: "Behaviours of concern", placeholder: "Describe the specific behaviours, their frequency and pattern" },
        { key: "triggers", label: "Triggers", placeholder: "What situations, events or interactions cause behaviour to escalate?" },
        { key: "warning_signs", label: "Warning signs", placeholder: "How does this YP present in the build-up before behaviour escalates?" },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <FieldLabel>{label}</FieldLabel>
          <Textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} disabled={readOnly} className="resize-y" />
        </div>
      ))}

      {/* Three-band section */}
      <div className="rounded-xl overflow-hidden border border-border">
        {[
          { key: "green_strategies", color: "bg-green-50 border-green-200", label: "🟢 Green — Proactive strategies", placeholder: "What do staff do day-to-day to prevent escalation? Include positive reinforcements and reward systems." },
          { key: "amber_strategies", color: "bg-amber-50 border-amber-200", label: "🟡 Amber — De-escalation strategies", placeholder: "What do staff do when warning signs appear?" },
          { key: "red_strategies", color: "bg-red-50 border-red-200", label: "🔴 Red — Crisis strategies", placeholder: "What do staff do when behaviour is in full crisis to keep the YP and others safe?" },
        ].map(({ key, color, label, placeholder }) => (
          <div key={key} className={`p-4 border-b last:border-b-0 ${color}`}>
            <FieldLabel>{label}</FieldLabel>
            <Textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} disabled={readOnly} className="resize-y bg-white/70" />
          </div>
        ))}
      </div>

      {/* Physical intervention */}
      <div>
        <FieldLabel>Physical intervention permitted?</FieldLabel>
        <YesNoToggle value={form.physical_intervention_permitted} onChange={v => set("physical_intervention_permitted", v)} disabled={readOnly} />
        {form.physical_intervention_permitted && (
          <div className="mt-3">
            <FieldLabel>Details</FieldLabel>
            <Textarea value={form.physical_intervention_detail} onChange={e => set("physical_intervention_detail", e.target.value)} placeholder="Under what circumstances and who is authorised? Reference the home's restraint policy." rows={3} disabled={readOnly} className="resize-y" />
          </div>
        )}
      </div>

      {[
        { key: "prohibited_sanctions", label: "Prohibited sanctions", placeholder: "Confirm which sanctions are never used with this YP" },
        { key: "post_incident_support", label: "Post-incident support", placeholder: "Debrief process, restorative conversation approach, recording requirements" },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <FieldLabel>{label}</FieldLabel>
          <Textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} disabled={readOnly} className="resize-y" />
        </div>
      ))}

      {/* YP involvement + review date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel>Was the YP involved in developing this plan?</FieldLabel>
          <YesNoToggle value={form.yp_involved_in_plan} onChange={v => set("yp_involved_in_plan", v)} disabled={readOnly} />
        </div>
        <div>
          <FieldLabel>Review date</FieldLabel>
          <Input type="date" value={form.review_date} onChange={e => set("review_date", e.target.value)} disabled={readOnly} className="h-9" />
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end pt-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save plan"}
          </Button>
        </div>
      )}
    </div>
  );
}