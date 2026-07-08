import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { AlertTriangle, Plus, ChevronRight, CheckCircle2, X, Loader2, Trash2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SEV_STYLES = {
  low:      "bg-slate-100 text-slate-600",
  medium:   "bg-amber-100 text-amber-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

function AddConcernModal({ handoverId, homeId, onClose, onSaved }) {
  const [form, setForm] = useState({ title: "", description: "", severity: "medium" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      await base44.entities.HandoverUpdate.create({
        org_id: ORG_ID,
        handover_id: handoverId,
        home_id: homeId,
        update_type: "concern",
        title: form.title,
        summary: form.description,
        severity: form.severity,
        recorded_at: new Date().toTimeString().slice(0, 5),
      });
      toast.success("Concern added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to add concern: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Add Concern</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Brief title of the concern..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the concern in detail..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Severity</label>
            <select
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
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
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Concern
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EditConcernModal({ update, onClose, onSaved }) {
  const [form, setForm] = useState({ title: update?.title || "", summary: update?.summary || "", severity: update?.severity || "medium" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!form.summary.trim()) { toast.error("Description required"); return; }
    setSaving(true);
    try {
      await base44.entities.HandoverUpdate.update(update.id, {
        title: form.title,
        summary: form.summary,
        severity: form.severity,
      });
      toast.success("Concern updated");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this concern note?")) return;
    setDeleting(true);
    try {
      await base44.entities.HandoverUpdate.delete(update.id);
      toast.success("Concern deleted");
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
          <h3 className="font-bold text-slate-800">Edit Concern</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Description *</label>
            <textarea
              rows={3}
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Describe in detail..."
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

export default function HandoverIncidentsTab({ handover, homeId, handoverDate, locked, onConfirmNoIncidents }) {
  const qc = useQueryClient();
  const [showAddConcern, setShowAddConcern] = useState(false);
  const [selectedConcern, setSelectedConcern] = useState(null);

  const { data: incidents = [] } = useQuery({
    queryKey: ["significant-events", homeId, handoverDate],
    queryFn: () => base44.entities.SignificantEvent.filter({ home_id: homeId }),
    enabled: !!homeId,
    select: d => d.filter(e => e.date === handoverDate || e.created_date?.startsWith(handoverDate)),
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["handover-updates-concern", handover?.id],
    queryFn: () => base44.entities.HandoverUpdate.filter({ handover_id: handover?.id, update_type: "concern" }),
    enabled: !!handover?.id,
  });

  const hasNoIncidents = handover?.no_incidents_confirmed;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["handover-updates-concern", handover?.id] });
    qc.invalidateQueries({ queryKey: ["handover-updates", handover?.id] });
    qc.invalidateQueries({ queryKey: ["handover-records", homeId] });
  };

  const handleRowClick = (concern) => {
    if (locked) return;
    setSelectedConcern(concern);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Incidents &amp; Concerns</h3>
        <div className="flex items-center gap-2">
          {!locked && !hasNoIncidents && (
            <button onClick={onConfirmNoIncidents} className="text-xs font-semibold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50">
              No incidents
            </button>
          )}
          {!locked && (
            <button
              onClick={() => {
                if (!handover?.id) {
                  toast.error("Please start or save the handover first");
                  return;
                }
                setShowAddConcern(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Concern
            </button>
          )}
        </div>
      </div>

      {hasNoIncidents && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700">No incidents recorded for this shift</p>
        </div>
      )}

      {incidents.length === 0 && updates.length === 0 && !hasNoIncidents ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <AlertTriangle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No incidents recorded for this shift</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            {!locked && (
              <>
                <button
                  onClick={() => {
                    if (!handover?.id) {
                      toast.error("Please start or save the handover first");
                      return;
                    }
                    setShowAddConcern(true);
                  }}
                  className="text-xs font-semibold text-teal-600 hover:underline"
                >
                  Add Incident
                </button>
                <span className="text-slate-300">·</span>
                <button onClick={onConfirmNoIncidents} className="text-xs font-semibold text-slate-500 hover:underline">Confirm no incidents</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Custom Concerns */}
          {updates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift Notes &amp; Concerns</h4>
              {updates.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleRowClick(u)}
                  className={`bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3 ${locked ? "" : "hover:bg-slate-50 cursor-pointer"}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-slate-700">{u.title || "Concern"}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEV_STYLES[u.severity] || SEV_STYLES.medium}`}>
                        {u.severity || "medium"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{u.summary || "—"}</p>
                  </div>
                  {!locked && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
                </div>
              ))}
            </div>
          )}

          {/* System Significant Events */}
          {incidents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Logged Events</h4>
              {incidents.map(inc => (
                <div key={inc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-slate-700">{inc.event_type || inc.title || "Significant Event"}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEV_STYLES[inc.risk_level || inc.severity] || SEV_STYLES.medium}`}>
                        {inc.risk_level || inc.severity || "medium"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{inc.description || inc.summary || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddConcern && handover?.id && (
        <AddConcernModal
          handoverId={handover.id}
          homeId={homeId}
          onClose={() => setShowAddConcern(false)}
          onSaved={refresh}
        />
      )}

      {selectedConcern && (
        <EditConcernModal
          update={selectedConcern}
          onClose={() => setSelectedConcern(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}