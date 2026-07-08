import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from "lucide-react";

const SKILL_AREAS = [
  { value: "cooking", label: "Cooking" },
  { value: "budgeting", label: "Budgeting" },
  { value: "cleaning", label: "Cleaning" },
  { value: "personal_hygiene", label: "Personal Hygiene" },
  { value: "laundry", label: "Laundry" },
  { value: "travel", label: "Travel" },
  { value: "appointments", label: "Appointments" },
  { value: "education", label: "Education" },
  { value: "employment", label: "Employment" },
  { value: "communication", label: "Communication" },
  { value: "digital_skills", label: "Digital Skills" },
  { value: "healthy_relationships", label: "Healthy Relationships" },
  { value: "safety_awareness", label: "Safety Awareness" },
  { value: "other", label: "Other" },
];

const SKILL_LEVELS = [
  { value: "not_started", label: "Not started", rank: 0 },
  { value: "basic", label: "Basic", rank: 1 },
  { value: "developing", label: "Developing", rank: 2 },
  { value: "confident", label: "Confident", rank: 3 },
  { value: "independent", label: "Independent", rank: 4 },
];

const EVIDENCE_OPTIONS = [
  { value: "staff_observation", label: "Staff observation" },
  { value: "yp_feedback", label: "Young person feedback" },
  { value: "completed_task", label: "Completed task" },
  { value: "photo_evidence", label: "Photo evidence" },
  { value: "certificate", label: "Certificate" },
  { value: "external_professional_feedback", label: "External professional feedback" },
  { value: "other", label: "Other" },
];

const SUPPORT_OPTIONS = [
  { value: "full_support", label: "Full support" },
  { value: "prompting", label: "Prompting" },
  { value: "occasional_check", label: "Occasional check" },
  { value: "independent", label: "Independent" },
];

const MANAGER_REVIEW_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "more_evidence_needed", label: "More evidence needed" },
  { value: "closed", label: "Closed" },
];

function getRank(level) {
  return SKILL_LEVELS.find(l => l.value === level)?.rank ?? -1;
}

export default function ILSProgressOutcomeSection({ form, setForm, staff = [] }) {
  const [open, setOpen] = useState(true);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleEvidence = (val) => {
    const current = form.evidence_of_progress || [];
    set("evidence_of_progress", current.includes(val) ? current.filter(v => v !== val) : [...current, val]);
  };

  const beforeRank = getRank(form.skill_level_before);
  const afterRank = getRank(form.skill_level_after);
  const isRegression = form.skill_level_before && form.skill_level_after && afterRank < beforeRank;
  const isImproved = form.skill_level_before && form.skill_level_after && afterRank > beforeRank;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm">ILS Progress / Impact Outcome</span>
          {isImproved && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">↑ Progress recorded</span>
          )}
          {isRegression && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">↓ Regression noted</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">

          {/* Skill Area */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Skill Area</label>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_AREAS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("skill_area", form.skill_area === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.skill_area === opt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-background text-foreground border-border hover:border-blue-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Skill Level Before / After */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Skill Level Before</label>
              <div className="space-y-1">
                {SKILL_LEVELS.map(lvl => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => set("skill_level_before", form.skill_level_before === lvl.value ? "" : lvl.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      form.skill_level_before === lvl.value
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-background border-border hover:border-slate-400"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Skill Level After</label>
              <div className="space-y-1">
                {SKILL_LEVELS.map(lvl => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => set("skill_level_after", form.skill_level_after === lvl.value ? "" : lvl.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      form.skill_level_after === lvl.value
                        ? lvl.value === "independent" ? "bg-green-600 text-white border-green-600"
                          : "bg-blue-600 text-white border-blue-600"
                        : "bg-background border-border hover:border-blue-400"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Regression warning */}
          {isRegression && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-700 mb-1">Skill level is lower than before — please record a reason</p>
                <textarea
                  value={form.skill_level_regression_reason || ""}
                  onChange={e => set("skill_level_regression_reason", e.target.value)}
                  placeholder="Explain why the skill level has reduced..."
                  rows={2}
                  className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Evidence of Progress */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence of Progress</label>
            <div className="flex flex-wrap gap-1.5">
              {EVIDENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleEvidence(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    (form.evidence_of_progress || []).includes(opt.value)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-background text-foreground border-border hover:border-green-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Impact / Progress */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Impact on Young Person</label>
              <textarea
                value={form.impact_on_young_person || ""}
                onChange={e => set("impact_on_young_person", e.target.value)}
                placeholder="How has this skill development impacted the young person?"
                rows={2}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Progress Made</label>
              <textarea
                value={form.progress_made || ""}
                onChange={e => set("progress_made", e.target.value)}
                placeholder="Describe the progress made in this session..."
                rows={2}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none"
              />
            </div>
          </div>

          {/* Support still needed */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Support Still Needed</label>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("support_still_needed", form.support_still_needed === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.support_still_needed === opt.value
                      ? opt.value === "independent" ? "bg-green-600 text-white border-green-600" : "bg-amber-500 text-white border-amber-500"
                      : "bg-background text-foreground border-border hover:border-amber-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Next target / Review date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Next Target</label>
              <textarea
                value={form.next_target || ""}
                onChange={e => set("next_target", e.target.value)}
                placeholder="What's the next skill target?"
                rows={2}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Review Date</label>
              <input
                type="date"
                value={form.review_date || ""}
                onChange={e => set("review_date", e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              />
            </div>
          </div>

          {/* Follow-up */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-muted-foreground">Follow-up Required</label>
            <div className="flex gap-2">
              {["Yes", "No"].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("follow_up_required", v === "Yes")}
                  className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    (v === "Yes" && form.follow_up_required) || (v === "No" && form.follow_up_required === false)
                      ? v === "Yes" ? "bg-amber-500 text-white border-amber-500" : "bg-muted text-foreground border-border"
                      : "bg-background text-foreground border-border hover:border-amber-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {form.follow_up_required && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
              <textarea
                value={form.follow_up_action || ""}
                onChange={e => set("follow_up_action", e.target.value)}
                placeholder="Describe the follow-up action required..."
                rows={2}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none resize-none"
              />
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Responsible Person</label>
                <select
                  value={form.responsible_person_id || ""}
                  onChange={e => {
                    const s = staff.find(x => x.id === e.target.value);
                    set("responsible_person_id", e.target.value);
                    set("responsible_person_name", s?.full_name || "");
                  }}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none"
                >
                  <option value="">Select staff...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Manager Review */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Manager Review Status</label>
            <div className="flex flex-wrap gap-1.5">
              {MANAGER_REVIEW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("manager_review_status", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.manager_review_status === opt.value
                      ? opt.value === "approved" ? "bg-green-600 text-white border-green-600"
                        : opt.value === "closed" ? "bg-slate-600 text-white border-slate-600"
                        : opt.value === "more_evidence_needed" ? "bg-purple-600 text-white border-purple-600"
                        : "bg-amber-500 text-white border-amber-500"
                      : "bg-background text-foreground border-border hover:border-blue-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* More evidence needed — auto follow-up note */}
            {form.manager_review_status === "more_evidence_needed" && (
              <div className="mt-2 flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg p-2">
                <AlertTriangle className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                <p className="text-xs text-purple-700">A follow-up action will be created to collect additional evidence.</p>
              </div>
            )}

            <textarea
              value={form.manager_review_note || ""}
              onChange={e => set("manager_review_note", e.target.value)}
              placeholder="Manager review note (optional)..."
              rows={2}
              className="w-full mt-2 border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}