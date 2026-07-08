import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Plus, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "doing_well",        label: "Doing well",       color: "bg-emerald-100 text-emerald-700" },
  { value: "needs_monitoring",  label: "Needs monitoring", color: "bg-amber-100 text-amber-700" },
  { value: "concern",           label: "Concern",           color: "bg-orange-100 text-orange-700" },
  { value: "incident_recorded", label: "Incident",          color: "bg-red-100 text-red-700" },
  { value: "medical_attention", label: "Medical",           color: "bg-blue-100 text-blue-700" },
  { value: "away",              label: "Away",              color: "bg-slate-100 text-slate-600" },
  { value: "missing",           label: "Missing",           color: "bg-red-200 text-red-800" },
  { value: "returned_safely",   label: "Returned safely",   color: "bg-green-100 text-green-700" },
];

const MOOD_OPTIONS = ["good","neutral","low","anxious","angry","upset","unknown"];

function initials(name) {
  if (!name) return "??";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getFirstInitialSurname(name) {
  if (!name) return "Unknown";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0] + ".";
  return parts[0][0] + ". " + parts[parts.length - 1];
}

export default function HandoverYPTab({ handover, homeId, locked }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ resident_id: "", status: "doing_well", mood: "good", key_update: "", follow_up_required: false, follow_up_note: "" });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-home", homeId],
    queryFn: () => base44.entities.Resident.filter({ home_id: homeId, status: "active" }),
    enabled: !!homeId,
  });

  const { data: ypSummaries = [], isLoading } = useQuery({
    queryKey: ["handover-yp", handover?.id],
    queryFn: () => base44.entities.HandoverYPSummary.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.HandoverYPSummary.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover-yp", handover?.id] });
      setShowForm(false);
      setForm({ resident_id: "", status: "doing_well", mood: "good", key_update: "", follow_up_required: false, follow_up_note: "" });
      toast.success("Young person summary added");
    },
  });

  const handleSave = () => {
    if (!form.resident_id) { toast.error("Select a young person"); return; }
    const res = residents.find(r => r.id === form.resident_id);
    const displayName = res?.display_name || "Unknown";
    create.mutate({
      org_id: ORG_ID,
      handover_id: handover?.id,
      home_id: homeId,
      resident_id: form.resident_id,
      resident_initials: initials(displayName),
      resident_display: getFirstInitialSurname(displayName),
      status: form.status,
      mood: form.mood,
      key_update: form.key_update,
      follow_up_required: form.follow_up_required,
      follow_up_note: form.follow_up_note,
    });
  };

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-teal-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Young People Summaries</h3>
        {!locked && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add Summary
          </button>
        )}
      </div>

      {ypSummaries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-sm text-slate-500 font-medium">No young people summaries yet</p>
          <p className="text-xs text-slate-400 mt-1">Add a summary for each young person in the home</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {ypSummaries.map(yp => {
            const st = STATUS_OPTIONS.find(s => s.value === yp.status) || STATUS_OPTIONS[0];
            return (
              <div key={yp.id} onClick={() => setSelected(yp)} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer group">
                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0">
                  {yp.resident_initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-700">{yp.resident_display}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{yp.key_update || "No update recorded"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-500 capitalize">{yp.mood}</span>
                  {yp.follow_up_required && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Follow up</span>}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-4">Add Young Person Summary</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Young Person *</label>
                <select
                  value={form.resident_id}
                  onChange={e => setForm(f => ({ ...f, resident_id: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                >
                  <option value="">Select young person...</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Mood</label>
                  <select value={form.mood} onChange={e => setForm(f => ({ ...f, mood: e.target.value }))} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none capitalize">
                    {MOOD_OPTIONS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Key Update</label>
                <textarea rows={2} value={form.key_update} onChange={e => setForm(f => ({ ...f, key_update: e.target.value }))} placeholder="Brief shift update..." className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.follow_up_required} onChange={e => setForm(f => ({ ...f, follow_up_required: e.target.checked }))} className="rounded" />
                <span className="text-xs text-slate-600">Follow-up required for next shift</span>
              </label>
              {form.follow_up_required && (
                <textarea rows={2} value={form.follow_up_note} onChange={e => setForm(f => ({ ...f, follow_up_note: e.target.value }))} placeholder="Follow-up instructions..." className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none resize-none" />
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={create.isPending} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}