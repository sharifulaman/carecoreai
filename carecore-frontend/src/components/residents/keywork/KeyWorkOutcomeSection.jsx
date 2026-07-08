import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const TOPICS = [
  { value: "placement_progress", label: "Placement Progress" },
  { value: "emotional_wellbeing", label: "Emotional Wellbeing" },
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "family_contact", label: "Family Contact" },
  { value: "behaviour", label: "Behaviour" },
  { value: "safety", label: "Safety" },
  { value: "independence", label: "Independence" },
  { value: "finance", label: "Finance" },
  { value: "immigration_asylum", label: "Immigration / Asylum" },
  { value: "move_on_planning", label: "Move-On Planning" },
  { value: "other", label: "Other" },
];

const YN_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_required", label: "Not Required" },
];

function Field({ label, children, required }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function YNSelect({ value, onChange, options = YN_OPTIONS }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function KeyWorkOutcomeSection({ data = {}, onChange, locked = false, staff = [] }) {
  const [open, setOpen] = useState(true);

  const set = (field, value) => {
    if (locked) return;
    onChange({ ...data, [field]: value });
  };

  const showEscalation = data.kw_concern_identified === true;
  const showFollowUp = data.kw_follow_up_required === true;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Key Work Session Outcome</span>
          {data.kw_concern_identified && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Concern Identified
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {locked && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              This session has been submitted and is locked from editing.
            </div>
          )}

          {/* Session Topic */}
          <Field label="Session Topic">
            <Select value={data.kw_session_topic || ""} onValueChange={v => set("kw_session_topic", v)} disabled={locked}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select topic..." /></SelectTrigger>
              <SelectContent>
                {TOPICS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* YP Voice */}
          <Field label="Young Person's View / Voice">
            <Textarea
              rows={3}
              value={data.kw_yp_voice || ""}
              onChange={e => set("kw_yp_voice", e.target.value)}
              placeholder="Record what the young person said, felt, or expressed..."
              className="resize-none text-sm"
              disabled={locked}
            />
          </Field>

          {/* Staff Observation */}
          <Field label="Staff Observation">
            <Textarea
              rows={3}
              value={data.kw_staff_observation || ""}
              onChange={e => set("kw_staff_observation", e.target.value)}
              placeholder="Worker's observations during the session..."
              className="resize-none text-sm"
              disabled={locked}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Immediate Outcome */}
            <Field label="Immediate Outcome">
              <Textarea
                rows={3}
                value={data.kw_immediate_outcome || ""}
                onChange={e => set("kw_immediate_outcome", e.target.value)}
                placeholder="What was achieved in this session?"
                className="resize-none text-sm"
                disabled={locked}
              />
            </Field>

            {/* Impact */}
            <Field label="Impact on Young Person">
              <Textarea
                rows={3}
                value={data.kw_impact_on_yp || ""}
                onChange={e => set("kw_impact_on_yp", e.target.value)}
                placeholder="How did this session impact the young person?"
                className="resize-none text-sm"
                disabled={locked}
              />
            </Field>
          </div>

          {/* Progress Made */}
          <Field label="Progress Made">
            <Textarea
              rows={2}
              value={data.kw_progress_made || ""}
              onChange={e => set("kw_progress_made", e.target.value)}
              placeholder="Describe any progress made..."
              className="resize-none text-sm"
              disabled={locked}
            />
          </Field>

          {/* Flags row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Concern Identified?">
              <YNSelect
                value={data.kw_concern_identified === true ? "yes" : data.kw_concern_identified === false ? "no" : ""}
                onChange={v => set("kw_concern_identified", v === "yes")}
                options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
              />
            </Field>
            <Field label="Follow-Up Required?">
              <YNSelect
                value={data.kw_follow_up_required === true ? "yes" : data.kw_follow_up_required === false ? "no" : ""}
                onChange={v => set("kw_follow_up_required", v === "yes")}
                options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
              />
            </Field>
            <Field label="Support Plan Update?">
              <YNSelect value={data.kw_support_plan_update} onChange={v => set("kw_support_plan_update", v)} />
            </Field>
            <Field label="Risk Assessment Update?">
              <YNSelect value={data.kw_risk_assessment_update} onChange={v => set("kw_risk_assessment_update", v)} />
            </Field>
          </div>

          {/* Concern escalation */}
          {showEscalation && (
            <div className="border border-red-200 bg-red-50/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-700">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Concern / Escalation</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground w-32 shrink-0">Escalated?</label>
                <YNSelect
                  value={data.kw_concern_escalated === true ? "yes" : "no"}
                  onChange={v => set("kw_concern_escalated", v === "yes")}
                  options={[{ value: "yes", label: "Yes — escalated" }, { value: "no", label: "No — not yet" }]}
                />
              </div>
              <Field label="Escalation Note">
                <Textarea
                  rows={2}
                  value={data.kw_escalation_note || ""}
                  onChange={e => set("kw_escalation_note", e.target.value)}
                  placeholder="Detail the concern and escalation action taken..."
                  className="resize-none text-sm border-red-200 focus:ring-red-400"
                  disabled={locked}
                />
              </Field>
            </div>
          )}

          {/* Follow-up details */}
          {showFollowUp && (
            <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">Follow-Up Details</span>
              <Field label="Follow-Up Action">
                <Textarea
                  rows={2}
                  value={data.kw_follow_up_action || ""}
                  onChange={e => set("kw_follow_up_action", e.target.value)}
                  placeholder="What action needs to be taken?"
                  className="resize-none text-sm border-amber-200"
                  disabled={locked}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Responsible Person">
                  <Select value={data.kw_responsible_person_id || ""} onValueChange={v => {
                    const s = staff.find(x => x.id === v);
                    set("kw_responsible_person_id", v);
                    set("kw_responsible_person_name", s?.full_name || "");
                  }} disabled={locked}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select person..." /></SelectTrigger>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Target Date">
                  <Input
                    type="date"
                    value={data.kw_target_date || ""}
                    onChange={e => set("kw_target_date", e.target.value)}
                    className="h-9 text-sm"
                    disabled={locked}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Manager review */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Manager Review Required?">
              <YNSelect
                value={data.kw_manager_review_required === true ? "yes" : "no"}
                onChange={v => set("kw_manager_review_required", v === "yes")}
                options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
              />
            </Field>
          </div>

          {data.kw_manager_review_required && (
            <Field label="Manager Review Note">
              <Textarea
                rows={2}
                value={data.kw_manager_review_note || ""}
                onChange={e => set("kw_manager_review_note", e.target.value)}
                placeholder="Notes for the manager reviewing this session..."
                className="resize-none text-sm"
                disabled={locked}
              />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}