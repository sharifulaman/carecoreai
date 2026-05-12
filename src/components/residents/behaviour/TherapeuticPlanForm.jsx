import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function calcStatus(form) {
  const required = ["emotional_needs_summary", "staff_therapeutic_approach", "emotional_regulation_strategies", "therapeutic_goals"];
  const allFilled = required.every(k => form[k]?.trim());
  if (allFilled) return "completed";
  const anyFilled = Object.values(form).some(v => typeof v === "string" && v.trim());
  return anyFilled ? "in_progress" : "not_started";
}

export function getTherapeuticStatus(record) {
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

export default function TherapeuticPlanForm({ residentId, homeId, staffProfile, readOnly = false }) {
  const qc = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["therapeutic-plan", residentId],
    queryFn: () => secureGateway.filter("TherapeuticPlan", { resident_id: residentId }),
    enabled: !!residentId,
  });

  const existing = records[0] || null;

  const [form, setForm] = useState({
    emotional_needs_summary: "",
    trauma_history_summary: "",
    camhs_involved: false,
    camhs_tier: "",
    camhs_therapist_name: "",
    camhs_frequency: "",
    therapy_type: "",
    other_therapeutic_services: "",
    staff_therapeutic_approach: "",
    attachment_relationship_notes: "",
    emotional_regulation_strategies: "",
    life_story_work: false,
    life_story_worker: "",
    therapeutic_goals: "",
    progress_notes: "",
    yp_understands_plan: false,
    review_date: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        emotional_needs_summary: existing.emotional_needs_summary || "",
        trauma_history_summary: existing.trauma_history_summary || "",
        camhs_involved: existing.camhs_involved || false,
        camhs_tier: existing.camhs_tier || "",
        camhs_therapist_name: existing.camhs_therapist_name || "",
        camhs_frequency: existing.camhs_frequency || "",
        therapy_type: existing.therapy_type || "",
        other_therapeutic_services: existing.other_therapeutic_services || "",
        staff_therapeutic_approach: existing.staff_therapeutic_approach || "",
        attachment_relationship_notes: existing.attachment_relationship_notes || "",
        emotional_regulation_strategies: existing.emotional_regulation_strategies || "",
        life_story_work: existing.life_story_work || false,
        life_story_worker: existing.life_story_worker || "",
        therapeutic_goals: existing.therapeutic_goals || "",
        progress_notes: existing.progress_notes || "",
        yp_understands_plan: existing.yp_understands_plan || false,
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
        return secureGateway.update("TherapeuticPlan", existing.id, payload);
      }
      return secureGateway.create("TherapeuticPlan", payload);
    },
    onSuccess: () => {
      toast.success("Therapeutic plan saved");
      qc.invalidateQueries({ queryKey: ["therapeutic-plan", residentId] });
    },
    onError: (e) => toast.error("Error saving: " + e.message),
  });

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>
        {existing?.completed_at && (
          <span className="text-xs text-muted-foreground">
            Last saved {new Date(existing.completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            {existing.completed_by_name ? ` by ${existing.completed_by_name}` : ""}
          </span>
        )}
      </div>

      {/* Emotional needs */}
      <div>
        <FieldLabel>Emotional and psychological needs</FieldLabel>
        <Textarea value={form.emotional_needs_summary} onChange={e => set("emotional_needs_summary", e.target.value)} placeholder="Describe this YP's emotional presentation, attachment style and mental health needs" rows={3} disabled={readOnly} className="resize-y" />
      </div>

      {/* Trauma — confidential */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <FieldLabel className="mb-0">Trauma background</FieldLabel>
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Confidential</span>
        </div>
        <Textarea value={form.trauma_history_summary} onChange={e => set("trauma_history_summary", e.target.value)} placeholder="Brief summary of relevant trauma history informing the therapeutic approach" rows={3} disabled={readOnly} className="resize-y" />
      </div>

      {/* CAMHS */}
      <div>
        <FieldLabel>CAMHS involved?</FieldLabel>
        <YesNoToggle value={form.camhs_involved} onChange={v => set("camhs_involved", v)} disabled={readOnly} />
        {form.camhs_involved && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>CAMHS tier</FieldLabel>
              <Select value={form.camhs_tier} onValueChange={v => set("camhs_tier", v)} disabled={readOnly}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select tier..." /></SelectTrigger>
                <SelectContent>
                  {["Tier 1", "Tier 2", "Tier 3", "Tier 4"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Therapist name</FieldLabel>
              <Input value={form.camhs_therapist_name} onChange={e => set("camhs_therapist_name", e.target.value)} disabled={readOnly} className="h-9 text-sm" />
            </div>
            <div>
              <FieldLabel>Frequency of sessions</FieldLabel>
              <Input value={form.camhs_frequency} onChange={e => set("camhs_frequency", e.target.value)} disabled={readOnly} placeholder="e.g. Fortnightly" className="h-9 text-sm" />
            </div>
            <div>
              <FieldLabel>Type of therapy</FieldLabel>
              <Input value={form.therapy_type} onChange={e => set("therapy_type", e.target.value)} disabled={readOnly} placeholder="e.g. CBT, DDP, Trauma-informed" className="h-9 text-sm" />
            </div>
          </div>
        )}
      </div>

      {[
        { key: "other_therapeutic_services", label: "Other therapeutic services", placeholder: "Educational psychologist, SALT, YOT, etc." },
        { key: "staff_therapeutic_approach", label: "Staff therapeutic approach", placeholder: "What model or framework do staff use in day-to-day interactions with this YP?" },
        { key: "attachment_relationship_notes", label: "Attachment and relationship notes", placeholder: "Who does this YP have trusted relationships with? Any attachment difficulties to be aware of?" },
        { key: "emotional_regulation_strategies", label: "Emotional regulation strategies", placeholder: "What helps this YP calm and self-regulate? Calming activities, safe spaces, sensory needs." },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <FieldLabel>{label}</FieldLabel>
          <Textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} disabled={readOnly} className="resize-y" />
        </div>
      ))}

      {/* Life story work */}
      <div>
        <FieldLabel>Life story work?</FieldLabel>
        <YesNoToggle value={form.life_story_work} onChange={v => set("life_story_work", v)} disabled={readOnly} />
        {form.life_story_work && (
          <div className="mt-3">
            <FieldLabel>Life story worker name and role</FieldLabel>
            <Input value={form.life_story_worker} onChange={e => set("life_story_worker", e.target.value)} disabled={readOnly} className="h-9 text-sm" />
          </div>
        )}
      </div>

      {[
        { key: "therapeutic_goals", label: "Therapeutic goals", placeholder: "What outcomes are being worked towards?" },
        { key: "progress_notes", label: "Progress notes", placeholder: "Evidence of progress over time" },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <FieldLabel>{label}</FieldLabel>
          <Textarea value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} disabled={readOnly} className="resize-y" />
        </div>
      ))}

      {/* YP understands + review date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel>Does the YP understand this plan?</FieldLabel>
          <YesNoToggle value={form.yp_understands_plan} onChange={v => set("yp_understands_plan", v)} disabled={readOnly} />
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