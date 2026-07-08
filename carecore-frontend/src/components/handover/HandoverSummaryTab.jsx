import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { ChevronRight, Plus, Pencil, FileText, Star, Info, AlertTriangle, MessageSquare, CheckCircle2, Loader2, X, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const UPDATE_TYPE_CONFIG = {
  daily_overview: { label: "Daily Overview", icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
  highlight:      { label: "Highlights",     icon: Star,      color: "text-amber-500", bg: "bg-amber-50" },
  point_to_note:  { label: "Points to Note", icon: Info,       color: "text-orange-500", bg: "bg-orange-50" },
  concern:        { label: "Concerns",       icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  request:        { label: "Requests",       icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-50" },
};

const MOOD_STYLES = {
  good:    { label: "Good",    color: "text-emerald-500" },
  neutral: { label: "Neutral", color: "text-slate-500" },
  low:     { label: "Low",     color: "text-blue-500" },
  anxious: { label: "Anxious", color: "text-amber-500" },
  angry:   { label: "Angry",   color: "text-red-500" },
  upset:   { label: "Upset",   color: "text-orange-500" },
  unknown: { label: "Unknown", color: "text-slate-400" },
};

const STATUS_STYLES = {
  doing_well:       { label: "Doing well",       color: "bg-emerald-100 text-emerald-700" },
  needs_monitoring: { label: "Needs monitoring", color: "bg-amber-100 text-amber-700" },
  concern:          { label: "Concern",           color: "bg-orange-100 text-orange-700" },
  incident_recorded:{ label: "Incident",          color: "bg-red-100 text-red-700" },
  medical_attention:{ label: "Medical",           color: "bg-blue-100 text-blue-700" },
  away:             { label: "Away",              color: "bg-slate-100 text-slate-600" },
  missing:          { label: "Missing",           color: "bg-red-200 text-red-800" },
  returned_safely:  { label: "Returned safely",   color: "bg-green-100 text-green-700" },
};

function initials(name) {
  if (!name) return "??";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function AddUpdateModal({ handoverId, homeId, preselectedType, onClose, onSaved }) {
  const [form, setForm] = useState({ update_type: preselectedType || "daily_overview", title: "", summary: "", severity: "low" });
  const [saving, setSaving] = useState(false);

  const typeConfig = UPDATE_TYPE_CONFIG[form.update_type] || UPDATE_TYPE_CONFIG.daily_overview;

  const handleSave = async () => {
    if (!form.summary.trim()) { toast.error("Summary required"); return; }
    setSaving(true);
    await base44.entities.HandoverUpdate.create({
      org_id: ORG_ID,
      handover_id: handoverId,
      home_id: homeId,
      update_type: form.update_type,
      title: form.title || typeConfig.label,
      summary: form.summary,
      severity: form.severity,
      recorded_at: format(new Date(), "HH:mm"),
    });
    setSaving(false);
    toast.success("Update added");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4">Add Handover Update</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Type</label>
            <select
              value={form.update_type}
              onChange={e => setForm(f => ({ ...f, update_type: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              {Object.entries(UPDATE_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Summary *</label>
            <textarea
              rows={3}
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Describe the update..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Severity</label>
            <select
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Update
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EditUpdateModal({ update, onClose, onSaved }) {
  const [form, setForm] = useState({ title: update?.title || "", summary: update?.summary || "", severity: update?.severity || "low" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!form.summary.trim()) { toast.error("Summary required"); return; }
    setSaving(true);
    try {
      await base44.entities.HandoverUpdate.update(update.id, form);
      toast.success("Update saved");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this update?")) return;
    setDeleting(true);
    try {
      await base44.entities.HandoverUpdate.delete(update.id);
      toast.success("Update deleted");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Failed to delete: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Edit Update</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Summary *</label>
            <textarea
              rows={3}
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Describe the update..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Severity</label>
            <select
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EditHandoverModal({ handover, updates = [], onClose, onSaved }) {
  const getUpdateSummary = (type) => {
    const u = updates.find(x => x.update_type === type);
    return u ? u.summary : "";
  };

  const [form, setForm] = useState({
    daily_overview: getUpdateSummary("daily_overview") || handover?.daily_overview || "",
    highlights: getUpdateSummary("highlight") || handover?.highlights || "",
    points_to_note: getUpdateSummary("point_to_note") || handover?.points_to_note || "",
    concerns_summary: getUpdateSummary("concern") || handover?.concerns_summary || "",
    requests_summary: getUpdateSummary("request") || handover?.requests_summary || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update HandoverRecord
      await base44.entities.HandoverRecord.update(handover.id, {
        daily_overview: form.daily_overview,
        highlights: form.highlights,
        points_to_note: form.points_to_note,
        concerns_summary: form.concerns_summary,
        requests_summary: form.requests_summary,
      });

      // 2. Update or Create corresponding HandoverUpdates so list gets updated
      const fields = [
        { key: "daily_overview", type: "daily_overview", title: "Daily Overview" },
        { key: "highlights", type: "highlight", title: "Highlights" },
        { key: "points_to_note", type: "point_to_note", title: "Points to Note" },
        { key: "concerns_summary", type: "concern", title: "Concerns" },
        { key: "requests_summary", type: "request", title: "Requests" },
      ];

      for (const field of fields) {
        const existing = updates.find(u => u.update_type === field.type);
        const val = form[field.key].trim();
        if (existing) {
          if (val === "") {
            await base44.entities.HandoverUpdate.delete(existing.id);
          } else if (existing.summary !== val) {
            await base44.entities.HandoverUpdate.update(existing.id, { summary: val });
          }
        } else if (val !== "") {
          await base44.entities.HandoverUpdate.create({
            org_id: ORG_ID,
            handover_id: handover.id,
            home_id: handover.home_id,
            update_type: field.type,
            title: field.title,
            summary: val,
            severity: "low",
            recorded_at: format(new Date(), "HH:mm"),
          });
        }
      }

      toast.success("Handover updated successfully");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Failed to save handover changes: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Edit Handover</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          {[
            { key: "daily_overview", label: "Daily Overview" },
            { key: "highlights", label: "Highlights" },
            { key: "points_to_note", label: "Points to Note" },
            { key: "concerns_summary", label: "Concerns Summary" },
            { key: "requests_summary", label: "Requests Summary" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>
              <textarea
                rows={2}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={`Enter ${label.toLowerCase()}...`}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function HandoverSummaryTab({ handover, homeId, locked }) {
  const qc = useQueryClient();
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [showEditHandover, setShowEditHandover] = useState(false);
  const [preselectedType, setPreselectedType] = useState("");
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  const { data: updates = [] } = useQuery({
    queryKey: ["handover-updates", handover?.id],
    queryFn: () => base44.entities.HandoverUpdate.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });

  const { data: ypSummaries = [] } = useQuery({
    queryKey: ["handover-yp", handover?.id],
    queryFn: () => base44.entities.HandoverYPSummary.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["handover-updates", handover?.id] });
  };

  // Build update rows: one per type from updates, fallback to defaults
  const defaultTypes = ["daily_overview", "highlight", "point_to_note", "concern", "request"];
  const updateRows = defaultTypes.map(type => {
    const existing = updates.filter(u => u.update_type === type);
    return { type, config: UPDATE_TYPE_CONFIG[type], items: existing };
  });

  const totalUpdates = updates.length;

  const handleRowClick = (type, latest) => {
    if (locked) return;
    if (latest) {
      setSelectedUpdate(latest);
    } else {
      setPreselectedType(type);
      setShowAddUpdate(true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Key Updates Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Key Updates</h3>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{totalUpdates} items</span>
          </div>
          {!locked && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditHandover(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="w-3 h-3" /> Edit Handover
              </button>
              <button
                onClick={() => { setPreselectedType(""); setShowAddUpdate(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="w-3 h-3" /> Add Update
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-50">
          {updateRows.map(({ type, config, items }) => {
            const Icon = config.icon;
            const latest = items[0];
            return (
              <div
                key={type}
                onClick={() => handleRowClick(type, latest)}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 cursor-pointer group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700">{config.label}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {latest ? latest.summary : <span className="italic text-slate-300">No entry yet — click to add</span>}
                  </p>
                </div>
                {latest?.recorded_at && (
                  <span className="text-[10px] text-slate-400 shrink-0">{latest.recorded_at}</span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </div>
            );
          })}
          {updates.filter(u => !defaultTypes.includes(u.update_type)).map(u => {
            const cfg = UPDATE_TYPE_CONFIG[u.update_type] || UPDATE_TYPE_CONFIG.daily_overview;
            const Icon = cfg.icon;
            return (
              <div
                key={u.id}
                onClick={() => handleRowClick(u.update_type, u)}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 cursor-pointer group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700">{u.title}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{u.summary}</p>
                </div>
                {u.recorded_at && <span className="text-[10px] text-slate-400 shrink-0">{u.recorded_at}</span>}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Young People Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Young People Summary</h3>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{ypSummaries.length} young people</span>
          </div>
          <button className="text-xs font-semibold text-teal-600 hover:text-teal-700 px-3 py-1.5 border border-teal-200 rounded-xl">View all</button>
        </div>

        {ypSummaries.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">No young people summaries added yet</p>
            <p className="text-xs text-slate-300 mt-1">Switch to the Young People tab to add summaries</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-slate-50 border-b border-slate-100">
              <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Young Person</div>
              <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</div>
              <div className="col-span-5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Key Update</div>
              <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mood</div>
              <div className="col-span-1" />
            </div>
            <div className="divide-y divide-slate-50">
              {ypSummaries.map(yp => {
                const st = STATUS_STYLES[yp.status] || STATUS_STYLES.doing_well;
                const mood = MOOD_STYLES[yp.mood] || MOOD_STYLES.unknown;
                return (
                  <div key={yp.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-slate-50/50 cursor-pointer group">
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0">
                        {yp.resident_initials || initials(yp.resident_display)}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 truncate">{yp.resident_display || yp.resident_initials}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="col-span-5">
                      <p className="text-xs text-slate-500 truncate">{yp.key_update || "—"}</p>
                    </div>
                    <div className="col-span-1 flex items-center gap-1">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${mood.color}`} />
                      <span className={`text-[10px] font-semibold ${mood.color}`}>{mood.label}</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showAddUpdate && (
        <AddUpdateModal
          handoverId={handover?.id}
          homeId={homeId}
          preselectedType={preselectedType}
          onClose={() => { setShowAddUpdate(false); setPreselectedType(""); }}
          onSaved={refresh}
        />
      )}
      {showEditHandover && handover && (
        <EditHandoverModal
          handover={handover}
          updates={updates}
          onClose={() => setShowEditHandover(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["handover-records"] });
            qc.invalidateQueries({ queryKey: ["handover-updates", handover?.id] });
          }}
        />
      )}
      {selectedUpdate && (
        <EditUpdateModal
          update={selectedUpdate}
          onClose={() => setSelectedUpdate(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}