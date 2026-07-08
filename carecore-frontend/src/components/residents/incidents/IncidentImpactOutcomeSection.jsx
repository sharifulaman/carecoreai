import { Target, AlertTriangle, TrendingUp, BookOpen, CheckCircle2, User, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const RISK_CHANGE_OPTIONS = [
  { value: "increased", label: "Increased", color: "bg-red-50 text-red-700 border-red-300" },
  { value: "reduced", label: "Reduced", color: "bg-green-50 text-green-700 border-green-300" },
  { value: "unchanged", label: "Unchanged", color: "bg-amber-50 text-amber-700 border-amber-300" },
  { value: "not_applicable", label: "Not Applicable", color: "bg-slate-100 text-slate-600 border-slate-200" },
];

const DEBRIEF_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "yp_declined", label: "Young person declined" },
  { value: "not_appropriate", label: "Not appropriate" },
];

const THREE_WAY_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_required", label: "Not required" },
];

const REG27_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "pending", label: "Decision pending" },
];

function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1.5">{children}</label>;
}

function ToggleChips({ value, onChange, options, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all disabled:opacity-60 ${
            value === opt.value
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function RiskChips({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RISK_CHANGE_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all disabled:opacity-60 ${
            value === opt.value
              ? `${opt.color} border-current`
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * IncidentImpactOutcomeSection
 *
 * Props:
 *   form     — incidentImpact state object
 *   setForm  — setter
 *   staff    — array of StaffProfile for responsible person picker
 *   disabled — bool (lock after submission)
 */
export default function IncidentImpactOutcomeSection({ form, setForm, staff = [], disabled = false }) {
  const [expanded, setExpanded] = useState(true);
  const [followUpExpanded, setFollowUpExpanded] = useState(form.follow_up_required || false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleStaffChange = (staffId) => {
    const s = staff.find(x => x.id === staffId);
    set("responsible_person_id", staffId);
    set("responsible_person_name", s?.full_name || "");
  };

  const handleFollowUpToggle = (val) => {
    const isYes = val === "yes";
    set("follow_up_required", isYes);
    setFollowUpExpanded(isYes);
  };

  return (
    <div className="bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-teal-100 bg-teal-50/50 hover:bg-teal-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
            <Target className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800 text-sm">Impact &amp; Outcome</p>
            <p className="text-xs text-slate-500">Record outcomes, learning and follow-up actions from this incident</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 py-5 space-y-5">

          {/* Immediate Outcome */}
          <div>
            <FieldLabel>Immediate outcome</FieldLabel>
            <textarea
              disabled={disabled}
              value={form.immediate_outcome || ""}
              onChange={e => set("immediate_outcome", e.target.value)}
              placeholder="What was the immediate result of this incident?"
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          {/* Impact on Young Person */}
          <div>
            <FieldLabel>Impact on young person</FieldLabel>
            <textarea
              disabled={disabled}
              value={form.impact_on_young_person || ""}
              onChange={e => set("impact_on_young_person", e.target.value)}
              placeholder="What was the emotional, physical or behavioural impact on the young person?"
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          {/* Risk Change */}
          <div>
            <FieldLabel>Risk change as a result of this incident</FieldLabel>
            <RiskChips value={form.risk_change || ""} onChange={v => set("risk_change", v)} disabled={disabled} />
          </div>

          {/* Progress Made */}
          <div>
            <FieldLabel>Progress made</FieldLabel>
            <textarea
              disabled={disabled}
              value={form.progress_made || ""}
              onChange={e => set("progress_made", e.target.value)}
              placeholder="What progress was made during or after this incident?"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          {/* Learning Identified */}
          <div>
            <FieldLabel>Learning identified</FieldLabel>
            <textarea
              disabled={disabled}
              value={form.learning_identified || ""}
              onChange={e => set("learning_identified", e.target.value)}
              placeholder="What organisational or practice learning has been identified?"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Incident-specific fields */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Incident-Specific Checks</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Debrief completed with young person</FieldLabel>
              <ToggleChips value={form.debrief_completed || ""} onChange={v => set("debrief_completed", v)} options={DEBRIEF_OPTIONS} disabled={disabled} />
            </div>
            <div>
              <FieldLabel>Risk assessment updated</FieldLabel>
              <ToggleChips value={form.risk_assessment_updated || ""} onChange={v => set("risk_assessment_updated", v)} options={THREE_WAY_OPTIONS} disabled={disabled} />
            </div>
            <div>
              <FieldLabel>Support plan updated</FieldLabel>
              <ToggleChips value={form.support_plan_updated || ""} onChange={v => set("support_plan_updated", v)} options={THREE_WAY_OPTIONS} disabled={disabled} />
            </div>
            <div>
              <FieldLabel>Safeguarding referral required</FieldLabel>
              <ToggleChips
                value={form.safeguarding_referral_required != null ? (form.safeguarding_referral_required ? "yes" : "no") : ""}
                onChange={v => set("safeguarding_referral_required", v === "yes")}
                options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                disabled={disabled}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Reg 27 notification required</FieldLabel>
              <ToggleChips value={form.reg27_notification_required || ""} onChange={v => set("reg27_notification_required", v)} options={REG27_OPTIONS} disabled={disabled} />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Follow-Up */}
          <div>
            <FieldLabel>Follow-up action required</FieldLabel>
            <ToggleChips
              value={form.follow_up_required ? "yes" : (form.follow_up_required === false ? "no" : "")}
              onChange={handleFollowUpToggle}
              options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
              disabled={disabled}
            />
          </div>

          {followUpExpanded && (
            <div className="pl-4 border-l-2 border-teal-200 space-y-4">
              <div>
                <FieldLabel>Follow-up action</FieldLabel>
                <textarea
                  disabled={disabled}
                  value={form.follow_up_action || ""}
                  onChange={e => set("follow_up_action", e.target.value)}
                  placeholder="Describe the follow-up action required"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none disabled:opacity-60 disabled:bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Responsible person</FieldLabel>
                  {staff.length > 0 ? (
                    <select
                      disabled={disabled}
                      value={form.responsible_person_id || ""}
                      onChange={e => handleStaffChange(e.target.value)}
                      className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 disabled:opacity-60"
                    >
                      <option value="">Select staff...</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  ) : (
                    <input
                      disabled={disabled}
                      value={form.responsible_person_name || ""}
                      onChange={e => set("responsible_person_name", e.target.value)}
                      placeholder="Responsible person"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 disabled:opacity-60"
                    />
                  )}
                </div>
                <div>
                  <FieldLabel>Target date</FieldLabel>
                  <input
                    type="date"
                    disabled={disabled}
                    value={form.target_date || ""}
                    onChange={e => set("target_date", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 disabled:opacity-60"
                  />
                </div>
                <div>
                  <FieldLabel>Completion date</FieldLabel>
                  <input
                    type="date"
                    disabled={disabled}
                    value={form.completion_date || ""}
                    onChange={e => set("completion_date", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}