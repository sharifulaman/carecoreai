import { useState } from "react";
import { ChevronDown, ChevronUp, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REASON_OPTIONS = [
  { value: "conflict_in_placement", label: "Conflict in placement" },
  { value: "peer_influence", label: "Peer influence" },
  { value: "family_contact", label: "Family contact" },
  { value: "emotional_distress", label: "Emotional distress" },
  { value: "exploitation_concern", label: "Exploitation concern" },
  { value: "substance_misuse", label: "Substance misuse concern" },
  { value: "mental_health", label: "Mental health concern" },
  { value: "unknown", label: "Unknown" },
  { value: "other", label: "Other" },
];

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium mb-1">
      {children}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function ChipGroup({ options, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-foreground border-border hover:border-primary"
          } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function MissingImpactOutcomeSection({ form, setForm, staff = [], disabled = false }) {
  const [open, setOpen] = useState(true);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-blue-900">Missing Episode Impact / Outcome</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-5 bg-card">

          {/* Core outcome fields */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Immediate Outcome</Label>
              <Textarea
                disabled={disabled}
                rows={2}
                value={form.immediate_outcome || ""}
                onChange={e => set("immediate_outcome", e.target.value)}
                placeholder="What was the immediate outcome when the young person returned / was found?"
              />
            </div>
            <div>
              <Label>Impact on Young Person</Label>
              <Textarea
                disabled={disabled}
                rows={2}
                value={form.impact_on_young_person || ""}
                onChange={e => set("impact_on_young_person", e.target.value)}
                placeholder="Describe any observed impact on the young person..."
              />
            </div>
          </div>

          {/* Risk change */}
          <div>
            <Label>Risk Change</Label>
            <ChipGroup
              value={form.risk_change || ""}
              onChange={v => set("risk_change", v)}
              disabled={disabled}
              options={[
                { value: "increased", label: "Increased" },
                { value: "reduced", label: "Reduced" },
                { value: "unchanged", label: "Unchanged" },
                { value: "not_applicable", label: "Not applicable" },
              ]}
            />
            {form.risk_change === "increased" && (
              <p className="mt-2 text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded px-3 py-1.5">
                ⚠️ Risk increased — this record will be flagged as high priority for manager review.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Progress Made</Label>
              <Textarea
                disabled={disabled}
                rows={2}
                value={form.progress_made || ""}
                onChange={e => set("progress_made", e.target.value)}
                placeholder="Any progress noted..."
              />
            </div>
            <div>
              <Label>Learning Identified</Label>
              <Textarea
                disabled={disabled}
                rows={2}
                value={form.learning_identified || ""}
                onChange={e => set("learning_identified", e.target.value)}
                placeholder="What was learned from this episode?"
              />
            </div>
          </div>

          {/* Missing episode–specific fields */}
          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Episode-Specific Details</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Return Interview Offered</Label>
                <ChipGroup
                  value={form.return_interview_offered || ""}
                  onChange={v => set("return_interview_offered", v)}
                  disabled={disabled}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "requested_from_la", label: "Requested from LA" },
                    { value: "not_applicable", label: "Not applicable" },
                  ]}
                />
              </div>
              <div>
                <Label>Return Interview Completed</Label>
                <ChipGroup
                  value={form.return_interview_completed_status || ""}
                  onChange={v => set("return_interview_completed_status", v)}
                  disabled={disabled}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "pending", label: "Pending" },
                    { value: "yp_declined", label: "YP Declined" },
                  ]}
                />
                {form.return_interview_completed_status === "pending" && (
                  <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    A follow-up task will be created for this pending interview.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Reason / Trigger Identified</Label>
                <ChipGroup
                  value={form.trigger_identified || ""}
                  onChange={v => set("trigger_identified", v)}
                  disabled={disabled}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "partially", label: "Partially" },
                  ]}
                />
              </div>
              {(form.trigger_identified === "yes" || form.trigger_identified === "partially") && (
                <div>
                  <Label>Reason / Trigger</Label>
                  <Select value={form.trigger_category || ""} onValueChange={v => set("trigger_category", v)} disabled={disabled}>
                    <SelectTrigger><SelectValue placeholder="Select trigger..." /></SelectTrigger>
                    <SelectContent>
                      {REASON_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Harm Identified</Label>
                <ChipGroup
                  value={form.harm_identified || ""}
                  onChange={v => set("harm_identified", v)}
                  disabled={disabled}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "suspected", label: "Suspected" },
                    { value: "unknown", label: "Unknown" },
                  ]}
                />
              </div>
              <div>
                <Label>Police Reference</Label>
                <Input
                  disabled={disabled}
                  value={form.impact_police_reference || ""}
                  onChange={e => set("impact_police_reference", e.target.value)}
                  placeholder="e.g. OP/2026/123456"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Placing Authority Informed</Label>
                <ChipGroup
                  value={form.placing_authority_informed || ""}
                  onChange={v => set("placing_authority_informed", v)}
                  disabled={disabled}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />
                {form.placing_authority_informed === "no" && (
                  <p className="mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    ⚠️ Compliance risk — placing authority must be informed.
                  </p>
                )}
              </div>
              <div>
                <Label>Host / Local Authority Informed</Label>
                <ChipGroup
                  value={form.host_la_informed || ""}
                  onChange={v => set("host_la_informed", v)}
                  disabled={disabled}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "not_applicable", label: "N/A" },
                  ]}
                />
              </div>
              <div>
                <Label>Safety Plan Updated</Label>
                <ChipGroup
                  value={form.safety_plan_updated || ""}
                  onChange={v => set("safety_plan_updated", v)}
                  disabled={disabled}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "not_required", label: "Not required" },
                  ]}
                />
              </div>
            </div>

            <div>
              <Label>Risk Assessment Updated</Label>
              <ChipGroup
                value={form.risk_assessment_updated_status || ""}
                onChange={v => set("risk_assessment_updated_status", v)}
                disabled={disabled}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "not_required", label: "Not required" },
                ]}
              />
            </div>
          </div>

          {/* Follow-up */}
          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow-Up</h4>
            <div>
              <Label>Follow-Up Required</Label>
              <ChipGroup
                value={form.follow_up_required === true ? "yes" : form.follow_up_required === false ? "no" : ""}
                onChange={v => set("follow_up_required", v === "yes")}
                disabled={disabled}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>
            {form.follow_up_required === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Follow-Up Action</Label>
                  <Textarea
                    disabled={disabled}
                    rows={2}
                    value={form.follow_up_action || ""}
                    onChange={e => set("follow_up_action", e.target.value)}
                    placeholder="What follow-up action is required?"
                  />
                </div>
                <div>
                  <Label>Responsible Person</Label>
                  <Select value={form.responsible_person_id || ""} onValueChange={v => {
                    const s = staff.find(x => x.id === v);
                    setForm(p => ({ ...p, responsible_person_id: v, responsible_person_name: s?.full_name || "" }));
                  }} disabled={disabled}>
                    <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Date</Label>
                  <Input type="date" disabled={disabled} value={form.target_date || ""} onChange={e => set("target_date", e.target.value)} />
                </div>
                <div>
                  <Label>Completion Date</Label>
                  <Input type="date" disabled={disabled} value={form.completion_date || ""} onChange={e => set("completion_date", e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <Label>Evidence Uploaded</Label>
              <p className="text-xs text-muted-foreground">Upload evidence via the Attachments section above or the detail panel after saving.</p>
            </div>
          </div>

          {/* Manager review */}
          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manager Review</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Manager Review Status</Label>
                <ChipGroup
                  value={form.manager_outcome_review_status || "pending"}
                  onChange={v => set("manager_outcome_review_status", v)}
                  disabled={disabled}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "changes_requested", label: "Changes Requested" },
                    { value: "escalated", label: "Escalated" },
                    { value: "closed", label: "Closed" },
                  ]}
                />
              </div>
              <div>
                <Label>Manager Review Note</Label>
                <Textarea
                  disabled={disabled}
                  rows={2}
                  value={form.manager_review_note || ""}
                  onChange={e => set("manager_review_note", e.target.value)}
                  placeholder="Add manager review comments..."
                />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}