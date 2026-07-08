import { useState } from "react";
import { X, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";

const LOG_TYPES = [
  "Morning Log", "Evening Log", "Night Check/Sleep Check", "Wellbeing", "Education",
  "Nutrition", "Activity", "Key Work Session", "Family Contact", "Behaviour",
  "Health", "Medication", "Incident", "Visit Report", "Professional Contact",
  "Reflection", "General Note",
];

const MOODS = [
  "Positive", "Calm", "Settled", "Anxious", "Low mood", "Agitated",
  "Angry", "Withdrawn", "Distressed", "Unknown",
];

const RISK_LEVELS = ["None", "Low", "Medium", "High", "Critical"];

const VISIBILITY = [
  "Home Staff", "Team Leader", "Manager", "Admin Only",
  "External Professional", "Restricted",
];

function Field({ label, children, error }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white";

export default function DailyLogModal({ resident, staffProfile, initialLog, defaultDate, onClose, onSaved }) {
  const today = defaultDate || new Date().toISOString().split("T")[0];
  const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const [form, setForm] = useState({
    date: initialLog?.date || today,
    log_time: initialLog?.log_time || now,
    log_type: initialLog?.log_type || "General Note",
    title: initialLog?.title || "",
    summary: initialLog?.summary || "",
    details: initialLog?.details || "",
    mood: initialLog?.mood || "",
    risk_level: initialLog?.risk_level || "",
    visibility: initialLog?.visibility || "",
    status: initialLog?.status || "Submitted",
    follow_up_required: initialLog?.follow_up_required || false,
    follow_up_due_date: initialLog?.follow_up_due_date || "",
    tags_text: (initialLog?.tags || []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = "Date is required.";
    if (!form.log_time) errs.log_time = "Time is required.";
    if (!form.log_type) errs.log_type = "Log type is required.";
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.summary.trim()) errs.summary = "A brief summary is required.";
    if (!form.mood) errs.mood = "Mood is required.";
    if (!form.risk_level) errs.risk_level = "Risk level is required.";
    if (!form.visibility) errs.visibility = "Visibility is required.";
    if (form.follow_up_required && !form.follow_up_due_date) errs.follow_up_due_date = "Follow-up date is required when follow-up is enabled.";
    return errs;
  };

  const needsReview = ["High", "Critical"].includes(form.risk_level)
    || ["Incident", "Behaviour", "Medication"].includes(form.log_type)
    || form.visibility === "Restricted"
    || form.follow_up_required;

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the errors before saving.");
      return;
    }
    setSaving(true);
    try {
      const tags = form.tags_text.split(",").map(t => t.trim()).filter(Boolean);
      const payload = {
        org_id: ORG_ID,
        resident_id: resident?.id,
        resident_name: resident?.display_name,
        home_id: resident?.home_id,
        staff_id: staffProfile?.id || null,
        worker_id: staffProfile?.id || null,
        worker_name: staffProfile?.full_name || "Unknown",
        recorded_by_role: staffProfile?.role?.replace(/_/g, " ") || "Staff",
        date: form.date,
        log_time: form.log_time,
        log_datetime: `${form.date}T${form.log_time}:00`,
        title: form.title,
        summary: form.summary,
        details: form.details,
        log_type: form.log_type,
        mood: form.mood || null,
        risk_level: form.risk_level,
        visibility: form.visibility,
        status: form.status,
        tags,
        follow_up_required: form.follow_up_required,
        follow_up_due_date: form.follow_up_due_date || null,
        source_module: "daily_logs",
        source_entity_type: "manual_daily_log",
        is_auto_generated: false,
        requires_manager_review: needsReview,
        review_status: needsReview ? "Pending" : "Not Required",
      };

      if (initialLog?.id && !initialLog._synthetic) {
        await base44.entities.DailyLog.update(initialLog.id, payload);
        toast.success("Entry Successful — Log entry updated.");
      } else {
        await base44.entities.DailyLog.create(payload);
        toast.success("Entry Successful — Log entry saved.");
      }
      onSaved?.();
    } catch (err) {
      console.error("Save daily log failed:", err);
      toast.error("Data Save Failed — " + (err?.message || "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">{initialLog && !initialLog._synthetic ? "Edit Log Entry" : "Add Log Entry"}</h2>
            {resident && <p className="text-xs text-slate-400 mt-0.5">For: {resident.display_name}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {needsReview && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
              ⚠ This entry will require manager review based on the selected options.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date *" error={errors.date}>
              <input type="date" className={`${inputCls} ${errors.date ? "border-red-400" : ""}`} value={form.date} onChange={e => set("date", e.target.value)} />
            </Field>
            <Field label="Time *" error={errors.log_time}>
              <input type="time" className={`${inputCls} ${errors.log_time ? "border-red-400" : ""}`} value={form.log_time} onChange={e => set("log_time", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Log Type *" error={errors.log_type}>
              <select className={`${inputCls} ${errors.log_type ? "border-red-400" : ""}`} value={form.log_type} onChange={e => set("log_type", e.target.value)}>
                {LOG_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Mood *" error={errors.mood}>
              <select className={`${inputCls} ${errors.mood ? "border-red-400" : ""}`} value={form.mood} onChange={e => set("mood", e.target.value)}>
                <option value="">Select mood...</option>
                {MOODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Title *" error={errors.title}>
            <input type="text" className={`${inputCls} ${errors.title ? "border-red-400" : ""}`} placeholder="e.g. Morning Check & Wellbeing" value={form.title} onChange={e => set("title", e.target.value)} />
          </Field>

          <Field label="Summary *" error={errors.summary}>
            <textarea className={`${inputCls} resize-none h-16 ${errors.summary ? "border-red-400" : ""}`} placeholder="Brief summary..." value={form.summary} onChange={e => set("summary", e.target.value)} />
          </Field>

          <Field label="Full Details">
            <textarea className={`${inputCls} resize-none h-24`} placeholder="Full narrative..." value={form.details} onChange={e => set("details", e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Risk Level *" error={errors.risk_level}>
              <select className={`${inputCls} ${errors.risk_level ? "border-red-400" : ""}`} value={form.risk_level} onChange={e => set("risk_level", e.target.value)}>
                <option value="">Select risk level...</option>
                {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Visibility *" error={errors.visibility}>
              <select className={`${inputCls} ${errors.visibility ? "border-red-400" : ""}`} value={form.visibility} onChange={e => set("visibility", e.target.value)}>
                <option value="">Select visibility...</option>
                {VISIBILITY.map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Tags (comma-separated)">
            <input type="text" className={inputCls} placeholder="e.g. Key Work, Goals, Wellbeing" value={form.tags_text} onChange={e => set("tags_text", e.target.value)} />
          </Field>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.follow_up_required} onChange={e => set("follow_up_required", e.target.checked)} className="rounded" />
                <span className="text-xs text-slate-600 font-medium">Follow-up required</span>
              </label>
              {form.follow_up_required && (
                <input type="date" className={`${inputCls} w-auto ${errors.follow_up_due_date ? "border-red-400" : ""}`} value={form.follow_up_due_date} onChange={e => set("follow_up_due_date", e.target.value)} />
              )}
            </div>
            {errors.follow_up_due_date && <p className="text-xs text-red-500 font-medium">{errors.follow_up_due_date}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}