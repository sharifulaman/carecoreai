import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format, differenceInYears } from "date-fns";
import {
  Home, Stethoscope, Eye, Briefcase, Calendar, AlertTriangle,
  Award, BookOpen, MessageSquare, LogOut, ChevronDown, ChevronUp,
  Search, X, Download, Plus, ChevronRight, Phone, Loader2, Users
} from "lucide-react";
import { toast } from "sonner";
import Portal from "@/components/ui/Portal";

// ── Event config ──────────────────────────────────────────────────────────────
const EVENT_CONFIG = {
  entry_to_home:         { label: "Entry to Home",            icon: Home,          color: "bg-teal-100 text-teal-600",    badge: "Onboarding", badgeCls: "bg-blue-100 text-blue-700" },
  gp_registration:       { label: "GP Registration",          icon: Stethoscope,   color: "bg-green-100 text-green-600",  badge: "Health",     badgeCls: "bg-green-100 text-green-700" },
  dentist_registration:  { label: "Dentist Registration",     icon: Calendar,      color: "bg-orange-100 text-orange-600",badge: "Appointment",badgeCls: "bg-orange-100 text-orange-700" },
  optician_registration: { label: "Optician Registration",    icon: Eye,           color: "bg-cyan-100 text-cyan-600",    badge: "Completed",  badgeCls: "bg-green-100 text-green-700" },
  solicitor_registration:{ label: "Solicitor Registration",   icon: Briefcase,     color: "bg-purple-100 text-purple-600",badge: "Legal",      badgeCls: "bg-purple-100 text-purple-700" },
  special_appointment:   { label: "Special Appointment",      icon: Calendar,      color: "bg-amber-100 text-amber-600",  badge: "Appointment",badgeCls: "bg-orange-100 text-orange-700" },
  incident:              { label: "Incident",                  icon: AlertTriangle, color: "bg-red-100 text-red-600",      badge: "Incident",   badgeCls: "bg-red-100 text-red-700" },
  achievement:           { label: "Achievement",               icon: Award,         color: "bg-yellow-100 text-yellow-600",badge: "Achievement",badgeCls: "bg-green-100 text-green-700" },
  ils_completed:         { label: "ILS Modules Completed",    icon: BookOpen,      color: "bg-teal-100 text-teal-600",    badge: "ILS",        badgeCls: "bg-cyan-100 text-cyan-700" },
  yp_comment:            { label: "YP Comment",               icon: MessageSquare, color: "bg-blue-100 text-blue-600",    badge: "Comment",    badgeCls: "bg-blue-100 text-blue-700" },
  exit_move_on:          { label: "Exit / Move-on",           icon: LogOut,        color: "bg-slate-100 text-slate-600",  badge: "Exit",       badgeCls: "bg-slate-200 text-slate-700" },
  review:                { label: "Review",                   icon: Users,         color: "bg-indigo-100 text-indigo-600",badge: "Review",     badgeCls: "bg-indigo-100 text-indigo-700" },
  education:             { label: "Education",                icon: BookOpen,      color: "bg-teal-100 text-teal-600",    badge: "Education",  badgeCls: "bg-teal-100 text-teal-700" },
  health:                { label: "Health",                   icon: Stethoscope,   color: "bg-green-100 text-green-600",  badge: "Health",     badgeCls: "bg-green-100 text-green-700" },
  legal:                 { label: "Legal",                    icon: Briefcase,     color: "bg-purple-100 text-purple-600",badge: "Legal",      badgeCls: "bg-purple-100 text-purple-700" },
  other:                 { label: "Other",                    icon: Calendar,      color: "bg-slate-100 text-slate-500",  badge: "Other",      badgeCls: "bg-slate-100 text-slate-600" },
};

const FILTER_CATEGORIES = [
  { key: "all",          label: "All Events" },
  { key: "health",       label: "Health",    types: ["gp_registration","dentist_registration","optician_registration","health"] },
  { key: "legal",        label: "Legal",     types: ["solicitor_registration","legal"] },
  { key: "education",    label: "Education", types: ["education"] },
  { key: "incidents",    label: "Incidents", types: ["incident"] },
  { key: "achievements", label: "Achievements", types: ["achievement"] },
  { key: "ils",          label: "ILS",       types: ["ils_completed"] },
  { key: "comments",     label: "Comments",  types: ["yp_comment"] },
];

function calcAge(dob) {
  if (!dob) return null;
  return differenceInYears(new Date(), new Date(dob));
}

// ── Timeline Row ──────────────────────────────────────────────────────────────
function TimelineRow({ event, onExpand, expanded }) {
  const cfg = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.other;
  const Icon = cfg.icon;
  const badgeCls = event.severity === "Low" || event.severity === "low" ? "bg-amber-100 text-amber-700"
    : event.severity === "High" || event.severity === "high" ? "bg-red-100 text-red-700"
    : cfg.badgeCls;
  const badgeLabel = event.severity || cfg.badge;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div
        className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={onExpand}
      >
        {/* Icon */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{event.event_title}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{event.event_description}</p>
        </div>
        {/* Date */}
        <div className="text-right shrink-0 w-28 hidden sm:block">
          <p className="text-xs font-medium text-slate-700">{event.event_date ? format(new Date(event.event_date), "dd MMM yyyy") : "—"}</p>
          <p className="text-xs text-slate-400">{event.event_time || ""}</p>
        </div>
        {/* Badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badgeCls}`}>{badgeLabel}</span>
        {/* Arrow */}
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-16 pb-5 pt-1 bg-slate-50 border-t border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div><span className="text-slate-400">Event Type:</span> <span className="font-medium ml-1 capitalize">{(event.event_type || "").replace(/_/g, " ")}</span></div>
            <div><span className="text-slate-400">Date:</span> <span className="font-medium ml-1">{event.event_date ? format(new Date(event.event_date), "dd MMM yyyy") : "—"}{event.event_time ? ` · ${event.event_time}` : ""}</span></div>
            {event.created_by_name && <div><span className="text-slate-400">Recorded by:</span> <span className="font-medium ml-1">{event.created_by_name}</span></div>}
            {event.linked_professional_name && <div><span className="text-slate-400">Professional:</span> <span className="font-medium ml-1">{event.linked_professional_name}</span></div>}
            {event.linked_provider_name && <div><span className="text-slate-400">Provider:</span> <span className="font-medium ml-1">{event.linked_provider_name}</span></div>}
            {event.contact_phone && <div><span className="text-slate-400">Phone:</span> <span className="font-medium ml-1">{event.contact_phone}</span></div>}
            {event.status && <div><span className="text-slate-400">Status:</span> <span className="font-medium ml-1 capitalize">{event.status}</span></div>}
          </div>
          {event.event_description && (
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-1">Description</p>
              <p className="text-sm text-slate-700">{event.event_description}</p>
            </div>
          )}
          {event.notes && (
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{event.notes}</p>
            </div>
          )}
          {event.yp_comment && (
            <div className="mt-3 bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-500 font-semibold mb-1">YP Comment {event.is_direct_yp_quote ? "(Direct Quote)" : "(Recorded by staff)"}</p>
              <p className="text-sm text-blue-800 italic">"{event.yp_comment}"</p>
            </div>
          )}
          {event.evidence_file_url && (
            <div className="mt-3">
              <a href={event.evidence_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline font-medium">View evidence / document →</a>
            </div>
          )}
          {(event.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {event.tags.map(t => <span key={t} className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add Event Modal ───────────────────────────────────────────────────────────
function AddEventModal({ residentId, homeId, staffProfile, onClose, onSaved }) {
  const [form, setForm] = useState({
    event_type: "other", event_title: "", event_date: new Date().toISOString().split("T")[0],
    event_time: "", event_description: "", status: "recorded", severity: "", notes: "",
    linked_provider_name: "", linked_professional_name: "", contact_phone: "",
    yp_comment: "", is_direct_yp_quote: false, evidence_file_url: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.event_title || !form.event_date || !form.event_type) return;
    setSaving(true);
    try {
      const cfg = EVENT_CONFIG[form.event_type] || EVENT_CONFIG.other;
      await base44.entities.YPJourneyEvent.create({
        org_id: ORG_ID, resident_id: residentId, home_id: homeId,
        event_type: form.event_type,
        event_title: form.event_title || cfg.label,
        event_category: cfg.badge,
        event_date: form.event_date,
        event_time: form.event_time,
        event_description: form.event_description,
        status: form.status,
        severity: form.severity,
        notes: form.notes,
        linked_provider_name: form.linked_provider_name,
        linked_professional_name: form.linked_professional_name,
        contact_phone: form.contact_phone,
        yp_comment: form.yp_comment,
        is_direct_yp_quote: form.is_direct_yp_quote,
        evidence_file_url: form.evidence_file_url,
        created_by_name: staffProfile?.full_name || "",
      });
      toast.success("Journey event added");
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="Add Journey Event" onClose={onClose} onSave={handleSave} saving={saving} disabled={!form.event_title || !form.event_date}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Event Type *</label>
          <select value={form.event_type} onChange={e => { set("event_type", e.target.value); set("event_title", EVENT_CONFIG[e.target.value]?.label || ""); }}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            {Object.entries(EVENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Event Title *</label>
          <input value={form.event_title} onChange={e => set("event_title", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Date *</label>
          <input type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Time</label>
          <input type="time" value={form.event_time} onChange={e => set("event_time", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
          <textarea value={form.event_description} onChange={e => set("event_description", e.target.value)} rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Provider / Service</label>
          <input value={form.linked_provider_name} onChange={e => set("linked_provider_name", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Professional Name</label>
          <input value={form.linked_professional_name} onChange={e => set("linked_professional_name", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Severity</label>
          <select value={form.severity} onChange={e => set("severity", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            <option value="">—</option>
            <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
          <input value={form.status} onChange={e => set("status", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">YP Comment</label>
          <textarea value={form.yp_comment} onChange={e => set("yp_comment", e.target.value)} rows={2}
            placeholder="Optional quote from the young person..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input type="checkbox" id="direct_quote" checked={form.is_direct_yp_quote} onChange={e => set("is_direct_yp_quote", e.target.checked)} className="rounded" />
          <label htmlFor="direct_quote" className="text-xs text-slate-600">This is a direct quote from the young person</label>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Add Appointment Modal ─────────────────────────────────────────────────────
function AddAppointmentModal({ residentId, homeId, staffProfile, onClose, onSaved }) {
  const [form, setForm] = useState({
    event_type: "special_appointment", event_title: "Appointment",
    event_date: new Date().toISOString().split("T")[0], event_time: "",
    linked_provider_name: "", linked_professional_name: "", event_description: "",
    status: "scheduled", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const TYPES = ["GP","Dentist","Optician","Solicitor","Social Worker","IRO","Keywork Session","ILP Review","Education","Therapy","Other"];

  const handleSave = async () => {
    if (!form.event_title || !form.event_date) return;
    setSaving(true);
    try {
      await base44.entities.YPJourneyEvent.create({
        org_id: ORG_ID, resident_id: residentId, home_id: homeId,
        event_type: "special_appointment", event_category: "Appointment",
        event_title: form.event_title, event_date: form.event_date, event_time: form.event_time,
        linked_provider_name: form.linked_provider_name,
        linked_professional_name: form.linked_professional_name,
        event_description: form.event_description, status: form.status, notes: form.notes,
        created_by_name: staffProfile?.full_name || "",
      });
      toast.success("Appointment added to journey");
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="Add Appointment / Milestone" onClose={onClose} onSave={handleSave} saving={saving} disabled={!form.event_title || !form.event_date}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Appointment Type *</label>
          <select value={form.event_title} onChange={e => set("event_title", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Date *</label>
          <input type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Time</label>
          <input type="time" value={form.event_time} onChange={e => set("event_time", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Provider / Location</label>
          <input value={form.linked_provider_name} onChange={e => set("linked_provider_name", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Professional / Staff</label>
          <input value={form.linked_professional_name} onChange={e => set("linked_professional_name", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Description / Notes</label>
          <textarea value={form.event_description} onChange={e => set("event_description", e.target.value)} rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
      </div>
    </ModalShell>
  );
}

// ── Add Achievement Modal ─────────────────────────────────────────────────────
function AddAchievementModal({ residentId, homeId, staffProfile, onClose, onSaved }) {
  const [form, setForm] = useState({
    event_title: "", event_date: new Date().toISOString().split("T")[0],
    event_time: "", event_description: "", yp_comment: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const CATEGORIES = ["Education","Attendance","Behaviour","Independent Living","Health","Social","Employment","Personal Development","Other"];

  const handleSave = async () => {
    if (!form.event_title || !form.event_date) return;
    setSaving(true);
    try {
      await base44.entities.YPJourneyEvent.create({
        org_id: ORG_ID, resident_id: residentId, home_id: homeId,
        event_type: "achievement", event_category: "Achievement",
        event_title: form.event_title, event_date: form.event_date,
        event_time: form.event_time, event_description: form.event_description,
        yp_comment: form.yp_comment, notes: form.notes,
        created_by_name: staffProfile?.full_name || "",
      });
      toast.success("Achievement added to journey");
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="Add Achievement" onClose={onClose} onSave={handleSave} saving={saving} disabled={!form.event_title || !form.event_date}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Achievement Title *</label>
          <input value={form.event_title} onChange={e => set("event_title", e.target.value)}
            placeholder="e.g. Completed college term with full attendance"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Date *</label>
          <input type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Time</label>
          <input type="time" value={form.event_time} onChange={e => set("event_time", e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
          <textarea value={form.event_description} onChange={e => set("event_description", e.target.value)} rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">YP Comment (optional)</label>
          <textarea value={form.yp_comment} onChange={e => set("yp_comment", e.target.value)} rows={2}
            placeholder="What did the young person say about this achievement?"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
      </div>
    </ModalShell>
  );
}

// ── Add Comment Modal ─────────────────────────────────────────────────────────
function AddCommentModal({ residentId, homeId, staffProfile, onClose, onSaved }) {
  const [form, setForm] = useState({
    yp_comment: "", is_direct_yp_quote: true, event_description: "",
    event_date: new Date().toISOString().split("T")[0], event_time: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.yp_comment) return;
    setSaving(true);
    try {
      await base44.entities.YPJourneyEvent.create({
        org_id: ORG_ID, resident_id: residentId, home_id: homeId,
        event_type: "yp_comment", event_category: "Comment",
        event_title: "YP Comment",
        event_date: form.event_date, event_time: form.event_time,
        yp_comment: form.yp_comment,
        is_direct_yp_quote: form.is_direct_yp_quote,
        event_description: form.event_description,
        created_by_name: staffProfile?.full_name || "",
      });
      toast.success("Comment added to journey");
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="Add YP Comment" onClose={onClose} onSave={handleSave} saving={saving} disabled={!form.yp_comment}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Young Person's Comment *</label>
          <textarea value={form.yp_comment} onChange={e => set("yp_comment", e.target.value)} rows={4}
            placeholder='e.g. "I feel more confident travelling independently now."'
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="direct_yp" checked={form.is_direct_yp_quote} onChange={e => set("is_direct_yp_quote", e.target.checked)} className="rounded" />
          <label htmlFor="direct_yp" className="text-xs text-slate-600">This is a direct quote from the young person</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Date</label>
            <input type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Time</label>
            <input type="time" value={form.event_time} onChange={e => set("event_time", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Context / Staff Note</label>
          <textarea value={form.event_description} onChange={e => set("event_description", e.target.value)} rows={2}
            placeholder="Recorded by staff during session / keywork..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
      </div>
    </ModalShell>
  );
}

// ── Generic modal shell ───────────────────────────────────────────────────────
function ModalShell({ title, children, onClose, onSave, saving, disabled }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} disabled={saving || disabled}
            className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      </div>
    </Portal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function YPJourneyTab({ resident, home, homes, staff, appointments, accidents, achievements, staffProfile, user }) {
  const qc = useQueryClient();
  const residentId = resident?.id;

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null); // "event" | "appointment" | "achievement" | "comment"
  const [dateFrom, setDateFrom] = useState(resident?.placement_start || "");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const { data: journeyEvents = [], isLoading } = useQuery({
    queryKey: ["yp-journey-events", residentId],
    queryFn: () => base44.entities.YPJourneyEvent.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: ilsPlans = [] } = useQuery({
    queryKey: ["ils-plans-journey", residentId],
    queryFn: () => base44.entities.ILSPlan.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: ilsSections = [] } = useQuery({
    queryKey: ["ils-sections-journey", residentId],
    queryFn: () => base44.entities.ILSPlanSection.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["yp-journey-events", residentId] });

  // Build synthetic events from existing modules
  const syntheticEvents = useMemo(() => {
    const evts = [];

    // Entry to home from placement_start
    if (resident?.placement_start) {
      evts.push({
        id: "synth-entry",
        event_type: "entry_to_home",
        event_title: "Entry to Home",
        event_description: `Admitted to ${home?.name || "placement"}`,
        event_date: resident.placement_start,
        event_time: "10:00",
        status: "Onboarding",
        _synthetic: true,
      });
    }

    // GP from resident data
    if (resident?.gp_name) {
      evts.push({
        id: "synth-gp",
        event_type: "gp_registration",
        event_title: "GP Registration",
        event_description: `Registered with ${resident.gp_name}${resident.gp_practice ? ` — ${resident.gp_practice}` : ""}`,
        event_date: resident.gp_registered_date || resident.placement_start || "",
        event_time: "14:00",
        linked_provider_name: resident.gp_practice || resident.gp_name,
        contact_phone: resident.gp_phone,
        status: "Completed",
        _synthetic: true,
      });
    }

    // Dentist
    if (resident?.dentist_name) {
      evts.push({
        id: "synth-dentist",
        event_type: "dentist_registration",
        event_title: "Dentist Registration",
        event_description: `Registered with ${resident.dentist_practice || resident.dentist_name}`,
        event_date: resident.dentist_last_appointment || resident.placement_start || "",
        event_time: "09:45",
        linked_provider_name: resident.dentist_practice || resident.dentist_name,
        contact_phone: resident.dentist_phone,
        status: "Completed",
        _synthetic: true,
      });
    }

    // Optician
    if (resident?.optician_name) {
      evts.push({
        id: "synth-optician",
        event_type: "optician_registration",
        event_title: "Optician Registration",
        event_description: `Eye test completed at ${resident.optician_practice || resident.optician_name}`,
        event_date: resident.optician_last_appointment || resident.placement_start || "",
        event_time: "11:20",
        linked_provider_name: resident.optician_practice || resident.optician_name,
        contact_phone: resident.optician_phone,
        status: "Completed",
        _synthetic: true,
      });
    }

    // Solicitor
    if (resident?.solicitor_name) {
      evts.push({
        id: "synth-solicitor",
        event_type: "solicitor_registration",
        event_title: "Solicitor Registration Date",
        event_description: `Support appointment with ${resident.solicitor_firm || resident.solicitor_name}`,
        event_date: resident.placement_start || "",
        event_time: "13:00",
        linked_provider_name: resident.solicitor_firm || resident.solicitor_name,
        linked_professional_name: resident.solicitor_name,
        contact_phone: resident.solicitor_phone,
        status: "Legal",
        _synthetic: true,
      });
    }

    // Incidents from accidents
    accidents.slice(0, 5).forEach(a => {
      evts.push({
        id: `synth-inc-${a.id}`,
        event_type: "incident",
        event_title: "Incident",
        event_description: a.description || `${(a.incident_type || "Incident").replace(/_/g, " ")} — ${a.notes || "see incident record"}`,
        event_date: a.date || a.created_date?.split("T")[0] || "",
        event_time: "",
        severity: a.risk_level || a.severity || "Low",
        status: a.status || "recorded",
        source_entity_type: "AccidentReport",
        source_entity_id: a.id,
        _synthetic: true,
      });
    });

    // Achievements
    achievements.slice(0, 5).forEach(a => {
      evts.push({
        id: `synth-ach-${a.id}`,
        event_type: "achievement",
        event_title: a.title || "Achievement",
        event_description: a.description || "",
        event_date: a.created_date?.split("T")[0] || "",
        event_time: "12:00",
        status: "Achievement",
        source_entity_type: "Achievement",
        source_entity_id: a.id,
        _synthetic: true,
      });
    });

    // Exit/move-on from resident status
    if (resident?.status === "moved_on" && resident?.placement_start) {
      evts.push({
        id: "synth-exit",
        event_type: "exit_move_on",
        event_title: "Exit / Move-on",
        event_description: "Placement ended — moved on from care",
        event_date: new Date().toISOString().split("T")[0],
        event_time: "10:00",
        status: "Exit",
        _synthetic: true,
      });
    }

    return evts;
  }, [resident, home, accidents, achievements]);

  // Merge stored + synthetic
  const allEvents = useMemo(() => {
    const stored = journeyEvents.map(e => ({ ...e, _synthetic: false }));
    // Deduplicate: if stored event has same source_entity_id, skip synthetic
    const storedSourceIds = new Set(stored.map(e => e.source_entity_id).filter(Boolean));
    const filteredSynthetic = syntheticEvents.filter(e => !storedSourceIds.has(e.source_entity_id));
    return [...stored, ...filteredSynthetic].sort((a, b) => (b.event_date || "").localeCompare(a.event_date || ""));
  }, [journeyEvents, syntheticEvents]);

  // ILS progress
  const activeILS = ilsPlans[0];
  const activeILSSections = ilsSections.filter(s => s.ils_plan_id === activeILS?.id);
  const ilsCompleted = activeILSSections.filter(s => s.progress_percentage >= 100 || s.status === "completed").length;
  const ilsTotal = activeILSSections.length || 5;

  // KPIs
  const totalEvents = allEvents.length;
  const achievementsCount = allEvents.filter(e => e.event_type === "achievement").length;
  const incidentsCount = allEvents.filter(e => e.event_type === "incident").length;

  // Filtered events
  const filtered = useMemo(() => {
    let evts = allEvents;
    if (activeFilter !== "all") {
      const cat = FILTER_CATEGORIES.find(c => c.key === activeFilter);
      if (cat?.types) evts = evts.filter(e => cat.types.includes(e.event_type));
    }
    if (dateFrom) evts = evts.filter(e => !e.event_date || e.event_date >= dateFrom);
    if (dateTo) evts = evts.filter(e => !e.event_date || e.event_date <= dateTo);
    if (search.trim()) {
      const q = search.toLowerCase();
      evts = evts.filter(e =>
        e.event_title?.toLowerCase().includes(q) ||
        e.event_description?.toLowerCase().includes(q) ||
        e.event_type?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.yp_comment?.toLowerCase().includes(q)
      );
    }
    return evts;
  }, [allEvents, activeFilter, dateFrom, dateTo, search]);

  // Upcoming milestones
  const today = new Date().toISOString().split("T")[0];
  const upcomingAppts = useMemo(() => appointments.filter(a => {
    const d = a.start_datetime?.split("T")[0] || a.date;
    return d && d >= today;
  }).slice(0, 3), [appointments, today]);

  // Important contacts from resident
  const contacts = [
    resident?.gp_name && { type: "GP Surgery", name: resident.gp_practice || resident.gp_name, phone: resident.gp_phone },
    resident?.dentist_name && { type: "Dentist", name: resident.dentist_practice || resident.dentist_name, phone: resident.dentist_phone },
    resident?.optician_name && { type: "Optician", name: resident.optician_practice || resident.optician_name, phone: resident.optician_phone },
    resident?.solicitor_name && { type: "Solicitor", name: resident.solicitor_firm || resident.solicitor_name, phone: resident.solicitor_phone },
  ].filter(Boolean);

  const keyWorker = staff.find(s => s.id === resident?.key_worker_id);
  const age = calcAge(resident?.dob);
  const initials = resident?.initials || (resident?.display_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()) || "YP";
  const ypRef = resident?.id ? `YP-${resident.id.slice(-8).toUpperCase()}` : "YP-000000";

  const handleExport = () => {
    toast.info("Export — use browser print (Ctrl+P / Cmd+P) to save as PDF.");
    window.print();
  };

  const openActions = useMemo(() => upcomingAppts.length + allEvents.filter(e => e.status === "scheduled" || e.status === "pending").length, [upcomingAppts, allEvents]);
  const completedRegs = allEvents.filter(e => ["gp_registration","dentist_registration","optician_registration","solicitor_registration"].includes(e.event_type)).length;

  return (
    <div className="space-y-5 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-400">
        <span>Young People</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-600 font-medium">{resident?.display_name}</span>
        <ChevronRight className="w-3 h-3" />
        <span>Records & Compliance</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-teal-600 font-semibold">YP Journey</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">YP Journey</h1>
          <p className="text-sm text-slate-500 mt-0.5">Timeline of significant events and progress during placement.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 shadow-sm">
          <Download className="w-4 h-4" /> Export Timeline
        </button>
      </div>

      {/* Main 2-col layout */}
      <div className="flex gap-5 items-start">

        {/* LEFT: Main timeline area */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* YP Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Avatar + basic info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">YP Reference: {ypRef}</p>
                  {resident?.dob && <p className="text-xs text-slate-500 mt-0.5">Date of Birth: {format(new Date(resident.dob), "dd/MM/yyyy")}{age !== null ? ` (${age})` : ""}</p>}
                  {resident?.gender && <p className="text-xs text-teal-600 font-semibold mt-1">{resident.gender}</p>}
                </div>
              </div>

              {/* Placement details */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Current Home</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{home?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Arrival Date</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{resident?.placement_start ? format(new Date(resident.placement_start), "dd/MM/yyyy") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Current Status</p>
                  <p className="text-xs font-semibold text-teal-600 mt-0.5 capitalize">{resident?.status === "active" ? "Placed" : resident?.status || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Keyworker</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{keyWorker?.full_name || "—"}</p>
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
              {[
                { label: "Total Events", value: totalEvents, icon: "📋", color: "bg-blue-50" },
                { label: "Achievements", value: achievementsCount, icon: "🏆", color: "bg-yellow-50" },
                { label: "Incidents", value: incidentsCount, icon: "⚠️", color: "bg-red-50" },
                { label: "ILS Modules", value: `${ilsCompleted} / ${ilsTotal}`, icon: "📚", color: "bg-teal-50" },
              ].map(k => (
                <div key={k.label} className={`${k.color} rounded-xl p-3 text-center`}>
                  <div className="text-xl">{k.icon}</div>
                  <p className="text-xl font-bold text-slate-900 mt-1">{k.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {FILTER_CATEGORIES.map(f => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${activeFilter === f.key ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Date range + search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="focus:outline-none bg-transparent text-xs" />
              <span className="text-slate-400">—</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="focus:outline-none bg-transparent text-xs" />
            </div>
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search events, notes, tags..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/20" />
            </div>
            {(search || activeFilter !== "all") && (
              <button onClick={() => { setSearch(""); setActiveFilter("all"); }} className="text-xs text-teal-600 font-medium hover:underline">
                Clear Filters
              </button>
            )}
          </div>

          {/* Timeline list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-slate-500 font-medium">No journey events recorded yet</p>
                <p className="text-slate-400 text-sm mt-1">Start building the young person's placement journey by adding their first event.</p>
                <button onClick={() => setModal("event")} className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700">
                  Add Event
                </button>
              </div>
            ) : (
              filtered.map(event => (
                <TimelineRow
                  key={event.id}
                  event={event}
                  expanded={expandedId === event.id}
                  onExpand={() => setExpandedId(expandedId === event.id ? null : event.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Summary panel */}
        <div className="w-64 shrink-0 space-y-4 hidden lg:block">

          {/* Journey Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-lg">📋</span> Journey Summary
            </h3>
            {[
              ["Total Events", totalEvents],
              ["Open Actions / Appointments", openActions],
              ["Completed Registrations", completedRegs],
              ["Incidents", incidentsCount],
              ["Achievements", achievementsCount],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
                <span className="text-slate-600">{label}</span>
                <span className={`font-bold ${label === "Incidents" && val > 0 ? "text-red-500" : label === "Achievements" && val > 0 ? "text-green-600" : "text-slate-800"}`}>{val}</span>
              </div>
            ))}
          </div>

          {/* Upcoming Milestones */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-lg">📅</span> Upcoming Milestones
            </h3>
            {upcomingAppts.length === 0 ? (
              <p className="text-xs text-slate-400">No upcoming milestones</p>
            ) : upcomingAppts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{a.title || a.appointment_type || "Appointment"}</p>
                  <p className="text-xs text-slate-400">{a.responsible_staff_name ? `With ${a.responsible_staff_name}` : ""}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{a.start_datetime ? format(new Date(a.start_datetime), "dd MMM yyyy, HH:mm") : a.date || "—"}</p>
                </div>
              </div>
            ))}
            <button className="mt-2 text-xs text-teal-600 font-semibold hover:underline">View all milestones →</button>
          </div>

          {/* ILS Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-lg">📚</span> ILS Progress
            </h3>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-600">{ilsCompleted} / {ilsTotal} Modules Completed</span>
              <span className="font-bold text-teal-600">{ilsTotal > 0 ? Math.round((ilsCompleted / ilsTotal) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${ilsTotal > 0 ? Math.round((ilsCompleted / ilsTotal) * 100) : 0}%` }} />
            </div>
            {activeILSSections.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {activeILSSections.map(s => (
                  <span key={s.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.progress_percentage >= 100 || s.status === "completed" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                    {s.domain_name || s.section_title || "Module"}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No ILS progress recorded yet</p>
            )}
          </div>

          {/* Important Contacts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-lg">👥</span> Important Contacts / Registrations
            </h3>
            {contacts.length === 0 ? (
              <p className="text-xs text-slate-400">No professional registrations recorded yet</p>
            ) : contacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
                <div>
                  <p className="text-slate-400">{c.type}</p>
                  <p className="font-medium text-slate-700">{c.name}</p>
                </div>
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-teal-600 hover:text-teal-700">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{c.phone}</span>
                  </a>
                )}
              </div>
            ))}
            <button className="mt-2 text-xs text-teal-600 font-semibold hover:underline">View all contacts →</button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-lg">⚡</span> Quick Actions
            </h3>
            <div className="space-y-2">
              <button onClick={() => setModal("event")} className="w-full flex items-center justify-center gap-2 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-700">
                <Plus className="w-3.5 h-3.5" /> Add Event
              </button>
              <button onClick={() => setModal("appointment")} className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-amber-300 text-amber-700 text-xs font-semibold rounded-xl hover:bg-amber-50">
                <Plus className="w-3.5 h-3.5" /> Add Appointment
              </button>
              <button onClick={() => setModal("achievement")} className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-green-300 text-green-700 text-xs font-semibold rounded-xl hover:bg-green-50">
                <Plus className="w-3.5 h-3.5" /> Add Achievement
              </button>
              <button onClick={() => setModal("comment")} className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-blue-300 text-blue-700 text-xs font-semibold rounded-xl hover:bg-blue-50">
                <Plus className="w-3.5 h-3.5" /> Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile quick actions */}
      <div className="lg:hidden flex flex-wrap gap-2">
        <button onClick={() => setModal("event")} className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-700"><Plus className="w-3.5 h-3.5" /> Add Event</button>
        <button onClick={() => setModal("appointment")} className="flex items-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-700 text-xs font-semibold rounded-xl hover:bg-amber-50"><Plus className="w-3.5 h-3.5" /> Add Appointment</button>
        <button onClick={() => setModal("achievement")} className="flex items-center gap-1.5 px-3 py-2 border border-green-300 text-green-700 text-xs font-semibold rounded-xl hover:bg-green-50"><Plus className="w-3.5 h-3.5" /> Add Achievement</button>
        <button onClick={() => setModal("comment")} className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 text-blue-700 text-xs font-semibold rounded-xl hover:bg-blue-50"><Plus className="w-3.5 h-3.5" /> Add Comment</button>
      </div>

      {/* Modals */}
      {modal === "event" && <AddEventModal residentId={residentId} homeId={resident?.home_id} staffProfile={staffProfile} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === "appointment" && <AddAppointmentModal residentId={residentId} homeId={resident?.home_id} staffProfile={staffProfile} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === "achievement" && <AddAchievementModal residentId={residentId} homeId={resident?.home_id} staffProfile={staffProfile} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === "comment" && <AddCommentModal residentId={residentId} homeId={resident?.home_id} staffProfile={staffProfile} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
    </div>
  );
}