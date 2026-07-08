import { useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { format } from "date-fns";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Daily Log Modal ────────────────────────────────────────────────────────────
export function DailyLogModal({ residents, staffProfile, homeId, onClose }) {
  const [form, setForm] = useState({
    resident_id: "", date: format(new Date(), "yyyy-MM-dd"), time_start: "", time_end: "",
    mood: "", activity: "", action_text: "", outcome_text: "", notes: "", status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.resident_id) { toast.error("Select a young person"); return; }
    setSaving(true);
    const resident = residents.find(r => r.id === form.resident_id);
    await secureGateway.create("VisitReport", {
      org_id: ORG_ID, home_id: homeId, resident_id: form.resident_id,
      resident_name: resident?.display_name || "",
      worker_id: staffProfile.id, worker_name: staffProfile.full_name,
      date: form.date, time_start: form.time_start, time_end: form.time_end,
      action_text: `Mood: ${form.mood}\n\nActivity: ${form.activity}\n\nAction: ${form.action_text}`,
      outcome_text: form.outcome_text, notes: form.notes, status: form.status,
    });
    setSaving(false);
    toast.success("Daily log saved");
    onClose();
  };

  return (
    <Modal title="Start Daily Log" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Young Person *</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.resident_id} onChange={e => set("resident_id", e.target.value)}>
            <option value="">Select…</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
        </div>
        {[["Date", "date", "date"], ["Time Start", "time_start", "time"], ["Time End", "time_end", "time"]].map(([label, key, type]) => (
          <div key={key}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
            <input type={type} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Mood</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.mood} onChange={e => set("mood", e.target.value)}>
            <option value="">Select…</option>
            {["Happy", "Calm", "Anxious", "Upset", "Tired", "Withdrawn", "Agitated"].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        {[["Activity", "activity", "text"], ["Action Taken", "action_text", "textarea"], ["Outcome", "outcome_text", "textarea"], ["Notes", "notes", "textarea"]].map(([label, key, type]) => (
          <div key={key}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
            {type === "textarea"
              ? <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-16" value={form[key]} onChange={e => set(key, e.target.value)} />
              : <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form[key]} onChange={e => set(key, e.target.value)} />
            }
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Status</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Save Log"}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Incident Modal ─────────────────────────────────────────────────────────
export function AddIncidentModal({ residents, staffProfile, homeId, onClose }) {
  const [form, setForm] = useState({
    resident_id: "", event_type: "safeguarding_concern",
    event_datetime: new Date().toISOString().slice(0, 16),
    summary: "", immediate_action_taken: "", police_involved: false,
    la_notified: false, ofsted_notification_required: false, status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.summary) { toast.error("Please add a summary"); return; }
    setSaving(true);
    const resident = residents.find(r => r.id === form.resident_id);
    const home = await secureGateway.filter("Home", { id: homeId });
    await secureGateway.create("SignificantEvent", {
      org_id: ORG_ID, home_id: homeId,
      home_name: home?.[0]?.name || "",
      recorded_by_id: staffProfile.id,
      recorded_by_name: staffProfile.full_name,
      resident_id: form.resident_id || null,
      resident_name: resident?.display_name || "",
      event_datetime: form.event_datetime,
      event_type: form.event_type,
      summary: form.summary,
      immediate_action_taken: form.immediate_action_taken,
      police_involved: form.police_involved,
      la_notified: form.la_notified,
      ofsted_notification_required: form.ofsted_notification_required,
    });
    setSaving(false);
    toast.success("Incident submitted");
    onClose();
  };

  return (
    <Modal title="Add Incident" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Young Person</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.resident_id} onChange={e => set("resident_id", e.target.value)}>
            <option value="">Select (optional)…</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Incident Type</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.event_type} onChange={e => set("event_type", e.target.value)}>
            {["safeguarding_concern","missing_from_home","police_attendance","serious_injury","medical_emergency","physical_intervention","other_significant_event"].map(t => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Date / Time</label>
          <input type="datetime-local" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.event_datetime} onChange={e => set("event_datetime", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Summary *</label>
          <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-20" value={form.summary} onChange={e => set("summary", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Immediate Action Taken</label>
          <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-16" value={form.immediate_action_taken} onChange={e => set("immediate_action_taken", e.target.value)} />
        </div>
        <div className="flex gap-4">
          {[["police_involved", "Police Involved"], ["la_notified", "LA Notified"]].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-red-600 disabled:opacity-50">{saving ? "Submitting…" : "Submit Incident"}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Record Check Modal ─────────────────────────────────────────────────────────
export function RecordCheckModal({ staffProfile, homeId, residents, onClose }) {
  const [checkType, setCheckType] = useState("home_check");
  const [form, setForm] = useState({ notes: "", status: "passed", resident_id: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await secureGateway.create("HomeCheck", {
      org_id: ORG_ID, home_id: homeId,
      check_type: checkType,
      checked_by_id: staffProfile.id,
      checked_by_name: staffProfile.full_name,
      check_date: new Date().toISOString().split("T")[0],
      status: form.status, notes: form.notes,
      resident_id: form.resident_id || null,
    });
    setSaving(false);
    toast.success("Check recorded");
    onClose();
  };

  return (
    <Modal title="Record Check" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Check Type</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={checkType} onChange={e => setCheckType(e.target.value)}>
            {[["home_check","Room Check"], ["fire_check","Fire & Safety Check"], ["health_check","Health Check"], ["medication_check","Medication Check"], ["welfare_check","Welfare Check"]].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Young Person (if applicable)</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.resident_id} onChange={e => set("resident_id", e.target.value)}>
            <option value="">General / All</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Status</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="passed">Passed</option>
            <option value="failed">Failed / Issue Found</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Notes</label>
          <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-20" value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving…" : "Save Check"}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Handover Modal ─────────────────────────────────────────────────────────────
export function HandoverModal({ staffProfile, homeId, residents, onClose }) {
  const [form, setForm] = useState({
    current_shift_summary: "", young_person_notes: "", pending_tasks: "", risks_alerts: "", next_shift_instructions: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.current_shift_summary) { toast.error("Add a shift summary"); return; }
    setSaving(true);
    await secureGateway.create("ShiftHandover", {
      org_id: ORG_ID, home_id: homeId,
      submitted_by_id: staffProfile.id,
      submitted_by_name: staffProfile.full_name,
      handover_date: new Date().toISOString().split("T")[0],
      handover_time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      current_shift_summary: form.current_shift_summary,
      young_person_notes: form.young_person_notes,
      pending_tasks: form.pending_tasks,
      risks_alerts: form.risks_alerts,
      next_shift_instructions: form.next_shift_instructions,
      status: "submitted",
    });
    setSaving(false);
    toast.success("Handover submitted");
    onClose();
  };

  return (
    <Modal title="Open Handover" onClose={onClose}>
      <div className="space-y-3">
        {[
          ["Current Shift Summary *", "current_shift_summary"],
          ["Young Person Notes", "young_person_notes"],
          ["Pending Tasks", "pending_tasks"],
          ["Risks / Alerts", "risks_alerts"],
          ["Next Shift Instructions", "next_shift_instructions"],
        ].map(([label, key]) => (
          <div key={key}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-16" value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">{saving ? "Submitting…" : "Submit Handover"}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── List Modal (generic) ───────────────────────────────────────────────────────
export function ListModal({ title, items, renderItem, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      {items.length === 0
        ? <p className="text-sm text-slate-400 text-center py-8">Nothing to show.</p>
        : <div className="space-y-2">{items.map((item, i) => <div key={item.id || i}>{renderItem(item)}</div>)}</div>
      }
    </Modal>
  );
}