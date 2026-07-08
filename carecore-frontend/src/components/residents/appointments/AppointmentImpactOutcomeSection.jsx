import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Upload, X, Star, AlertTriangle, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ATTENDANCE_OPTIONS = [
  { value: "attended", label: "Attended", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "missed", label: "Missed", color: "bg-red-100 text-red-700 border-red-300" },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-100 text-gray-600 border-gray-300" },
  { value: "rearranged", label: "Rearranged", color: "bg-amber-100 text-amber-700 border-amber-300" },
];

const ENGAGEMENT_OPTIONS = [
  { value: "engaged_well", label: "Engaged well" },
  { value: "partially_engaged", label: "Partially engaged" },
  { value: "refused", label: "Refused" },
  { value: "anxious", label: "Anxious" },
  { value: "required_staff_support", label: "Required staff support" },
  { value: "not_applicable", label: "Not applicable" },
];

const DOCUMENT_TYPES = ["letter", "prescription", "referral", "appointment_card", "other"];

const PRIORITY_TYPES = ["health", "medication", "safeguarding", "education", "legal"];

const getFileNameFromUrl = (url) => {
  if (!url) return "";
  try {
    const decoded = decodeURIComponent(url);
    const urlObj = new URL(decoded);
    const pathname = urlObj.pathname;
    const parts = pathname.split("/");
    return parts[parts.length - 1];
  } catch (e) {
    const parts = url.split("/");
    return parts[parts.length - 1].split("?")[0];
  }
};

export default function AppointmentImpactOutcomeSection({ form, setForm, staff = [], disabled = false }) {
  const [open, setOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const isMissed = form.attendance_status === "missed";

  const toggleDocType = (type) => {
    const current = form.document_types || [];
    set("document_types", current.includes(type) ? current.filter(t => t !== type) : [...current, type]);
  };

  const handleFileUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const urls = [...(form.document_urls || [])];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10MB`); continue; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) urls.push(file_url);
    }
    set("document_urls", urls);
    setUploading(false);
    toast.success("Document(s) uploaded");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800 text-sm">Appointment Impact / Outcome</h3>
            <p className="text-xs text-slate-400">Attendance, engagement, follow-up and evidence</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 py-4 space-y-5">
          {/* Attendance Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Attendance Status</label>
            <div className="flex flex-wrap gap-2">
              {ATTENDANCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => set("attendance_status", form.attendance_status === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.attendance_status === opt.value ? opt.color : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Missed reason — required when missed */}
            {isMissed && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Reason for missing <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <textarea
                    value={form.missed_reason || ""}
                    onChange={e => set("missed_reason", e.target.value)}
                    disabled={disabled}
                    placeholder="Why was this appointment missed? What action was taken?"
                    rows={2}
                    className="flex-1 bg-transparent text-sm resize-none outline-none text-red-800 placeholder:text-red-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Appointment Outcome */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Appointment Outcome</label>
            <textarea
              value={form.appointment_outcome || ""}
              onChange={e => set("appointment_outcome", e.target.value)}
              disabled={disabled}
              placeholder="What was achieved at this appointment?"
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none disabled:opacity-50"
            />
          </div>

          {/* Impact on Young Person */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Impact on Young Person</label>
            <textarea
              value={form.impact_on_young_person || ""}
              onChange={e => set("impact_on_young_person", e.target.value)}
              disabled={disabled}
              placeholder="How did this appointment impact the young person's wellbeing, health, or situation?"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none disabled:opacity-50"
            />
          </div>

          {/* YP Engagement */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">YP Engagement</label>
            <div className="flex flex-wrap gap-2">
              {ENGAGEMENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => set("yp_engagement", form.yp_engagement === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.yp_engagement === opt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Follow-up Required</label>
              <div className="flex gap-2">
                {["Yes", "No"].map(v => (
                  <button
                    key={v}
                    type="button"
                    disabled={disabled}
                    onClick={() => set("follow_up_required", v === "Yes")}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                      (v === "Yes" && form.follow_up_required) || (v === "No" && form.follow_up_required === false && form.follow_up_required !== undefined)
                        ? v === "Yes" ? "bg-amber-500 text-white border-amber-500" : "bg-slate-200 text-slate-700 border-slate-300"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    } disabled:opacity-50`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Next Appointment Date</label>
              <input
                type="date"
                value={form.next_appointment_date || ""}
                onChange={e => set("next_appointment_date", e.target.value)}
                disabled={disabled}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Follow-up details (shown when required) */}
          {form.follow_up_required && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-800">Follow-up details</p>
              <textarea
                value={form.follow_up_notes || ""}
                onChange={e => set("follow_up_notes", e.target.value)}
                disabled={disabled}
                placeholder="Describe the follow-up action required..."
                rows={2}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none resize-none disabled:opacity-50"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Responsible Person</label>
                  <select
                    value={form.responsible_person_id || ""}
                    onChange={e => {
                      const s = staff.find(x => x.id === e.target.value);
                      set("responsible_person_id", e.target.value);
                      set("responsible_person_name", s?.full_name || "");
                    }}
                    disabled={disabled}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Select staff...</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={form.follow_up_target_date || ""}
                    onChange={e => set("follow_up_target_date", e.target.value)}
                    disabled={disabled}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Priority flag */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <label className="text-xs font-semibold text-slate-600">Mark as Priority Appointment</label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => set("is_priority", !form.is_priority)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  form.is_priority ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                } disabled:opacity-50`}
              >
                <Star className="w-3.5 h-3.5" /> {form.is_priority ? "Priority" : "Set as priority"}
              </button>
            </div>
            {form.is_priority && (
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_TYPES.map(p => (
                  <button
                    key={p}
                    type="button"
                    disabled={disabled}
                    onClick={() => set("priority_reason", form.priority_reason === p ? "" : p)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize transition-all ${
                      form.priority_reason === p ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                    } disabled:opacity-50`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Documents Uploaded</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {DOCUMENT_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleDocType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all ${
                    (form.document_types || []).includes(type)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  } disabled:opacity-50`}
                >
                  {type.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {/* File upload area */}
            <div
              onClick={() => !disabled && fileInputRef.current?.click()}
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled && e.dataTransfer.files) {
                  handleFileUpload(e.dataTransfer.files);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-5 text-center ${disabled ? "opacity-50" : "cursor-pointer hover:border-blue-500 hover:bg-blue-50/20"} transition-colors border-slate-200`}
            >
              <Upload className="w-5 h-5 text-slate-300 mx-auto mb-1" />
              <p className="text-xs text-slate-500">{uploading ? "Uploading..." : "Click or drag files to upload"}</p>
              <p className="text-xs text-slate-400">Max 10MB per file</p>
              <input ref={fileInputRef} type="file" multiple className="hidden" disabled={disabled}
                onChange={e => handleFileUpload(e.target.files)} />
            </div>

            {(form.document_urls || []).length > 0 && (
              <div className="space-y-1.5 mt-2.5">
                {(form.document_urls || []).map((url, i) => {
                  const filename = getFileNameFromUrl(url);
                  return (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-xs text-blue-600 hover:text-blue-800 underline truncate" title={filename}>
                        {filename || `Document ${i + 1}`}
                      </a>
                      {!disabled && (
                        <button type="button"
                          onClick={() => set("document_urls", (form.document_urls || []).filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Staff comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Staff Comment</label>
            <textarea
              value={form.staff_comment || ""}
              onChange={e => set("staff_comment", e.target.value)}
              disabled={disabled}
              placeholder="Any additional comments from the attending staff member..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none disabled:opacity-50"
            />
          </div>

          {/* Manager review */}
          <div className={`rounded-xl border-2 p-4 transition-colors ${form.manager_review_required ? "bg-purple-50 border-purple-300" : "bg-slate-50 border-slate-200"}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.manager_review_required || false}
                onChange={e => {
                  set("manager_review_required", e.target.checked);
                  if (e.target.checked) set("manager_review_status", "pending");
                  else set("manager_review_status", "not_required");
                }}
                disabled={disabled}
                className="w-4 h-4 accent-purple-600"
              />
              <div>
                <p className={`text-sm font-semibold ${form.manager_review_required ? "text-purple-800" : "text-slate-700"}`}>
                  Manager review required
                </p>
                <p className="text-xs text-slate-500">Flag this appointment outcome for manager review</p>
              </div>
            </label>
            {form.manager_review_required && (
              <textarea
                value={form.manager_review_note || ""}
                onChange={e => set("manager_review_note", e.target.value)}
                disabled={disabled}
                placeholder="Note for the manager..."
                rows={2}
                className="w-full mt-3 border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none resize-none disabled:opacity-50"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}