import { useState } from "react";
import { Plus, MoreVertical, ArrowRight, Globe, Clock, Users, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const TRAVEL_METHODS = ["Walking", "Car", "Taxi", "Bus", "Lorry", "Train", "Boat", "Small boat", "Plane", "Hidden in vehicle", "On foot across border", "Unknown", "Other"];

const RISK_STYLE = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

function autoRisk(methods, travelled_with, harm_experienced) {
  const highRiskMethods = ["small boat", "hidden in vehicle"];
  const hasHighMethod = (methods || []).some(m => highRiskMethods.includes(m.toLowerCase()));
  const hasSmuggler = (travelled_with || "").toLowerCase().includes("smuggler");
  const hasHarm = harm_experienced;
  const hasUnknown = (travelled_with || "").toLowerCase().includes("unknown adult");
  if (hasHighMethod || hasSmuggler || hasHarm) return "high";
  if (hasUnknown) return "medium";
  return "low";
}

function StageModal({ stage, residentId, lifeStoryId, onClose, onSaved }) {
  const [form, setForm] = useState(stage || {
    stage_number: 1, from_country: "", from_city: "", to_country: "", to_city: "",
    departure_date: "", departure_date_approximate: true, approximate_duration: "",
    travel_methods: [], travelled_alone: false, travelled_with: "", arranged_by: "",
    harm_experienced: false, safeguarding_concerns: "", risk_level: "low", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const toggleMethod = (m) => setForm(f => ({
    ...f,
    travel_methods: f.travel_methods.includes(m) ? f.travel_methods.filter(x => x !== m) : [...f.travel_methods, m]
  }));

  const handleSave = async () => {
    setSaving(true);
    const risk = autoRisk(form.travel_methods, form.travelled_with, form.harm_experienced);
    const data = { ...form, risk_level: risk, org_id: ORG_ID, resident_id: residentId, life_story_id: lifeStoryId };
    if (stage?.id) {
      await base44.entities.JourneyStage.update(stage.id, data);
    } else {
      await base44.entities.JourneyStage.create(data);
    }
    toast.success("Journey stage saved");
    onSaved();
    onClose();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4">{stage ? "Edit Journey Stage" : "Add Journey Stage"}</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Stage Number</label>
            <input type="number" value={form.stage_number} onChange={e => setForm(f => ({ ...f, stage_number: parseInt(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Approx Duration</label>
            <input value={form.approximate_duration} onChange={e => setForm(f => ({ ...f, approximate_duration: e.target.value }))} placeholder="e.g. 12 days"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">From Country</label>
            <input value={form.from_country} onChange={e => setForm(f => ({ ...f, from_country: e.target.value }))} placeholder="e.g. Afghanistan"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">From City</label>
            <input value={form.from_city} onChange={e => setForm(f => ({ ...f, from_city: e.target.value }))} placeholder="e.g. Kabul"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">To Country</label>
            <input value={form.to_country} onChange={e => setForm(f => ({ ...f, to_country: e.target.value }))} placeholder="e.g. Iran"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">To City</label>
            <input value={form.to_city} onChange={e => setForm(f => ({ ...f, to_city: e.target.value }))} placeholder="e.g. Tehran"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Departure Date (approx)</label>
            <input value={form.departure_date} onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))} placeholder="e.g. Jan 2025"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Travelled With</label>
            <input value={form.travelled_with} onChange={e => setForm(f => ({ ...f, travelled_with: e.target.value }))} placeholder="e.g. Smuggler, group of 4"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs font-semibold text-slate-500 mb-2 block">Travel Methods (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {TRAVEL_METHODS.map(m => (
              <button key={m} onClick={() => toggleMethod(m)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.travel_methods.includes(m) ? "bg-purple-500 text-white border-purple-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.harm_experienced} onChange={e => setForm(f => ({ ...f, harm_experienced: e.target.checked }))} className="rounded" />
            Harm experienced during this stage
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.travelled_alone} onChange={e => setForm(f => ({ ...f, travelled_alone: e.target.checked }))} className="rounded" />
            Travelled alone
          </label>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes (as stated by the young person)</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none" />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Stage"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JourneyRouteSection({ stages, residentId, lifeStoryId, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editStage, setEditStage] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const handleDelete = async (id) => {
    await base44.entities.JourneyStage.delete(id);
    toast.success("Stage deleted");
    onRefresh();
  };

  const sorted = [...stages].sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));

  // KPI summary
  const uniqueCountries = new Set([...stages.map(s => s.from_country), ...stages.map(s => s.to_country)].filter(Boolean)).size;
  const highRiskCount = stages.filter(s => s.risk_level === "high").length;
  const methods = [...new Set(stages.flatMap(s => s.travel_methods || []))].slice(0, 3).join(", ");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-base font-bold text-slate-800">4. Journey Route Timeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">Add each stage of the young person's journey from leaving their home country.</p>
          </div>
          <button onClick={() => { setEditStage(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add Journey Stage
          </button>
        </div>

        {/* Table */}
        {sorted.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl mt-4">
            No journey stages added yet. Click "Add Journey Stage" to begin.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Stage</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">From → To</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Dates</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Duration</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Method</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Travelled With</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Risk</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center">{s.stage_number}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div>
                          <p className="font-semibold text-slate-700">{s.from_country}</p>
                          <p className="text-slate-400">{s.from_city}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-700">{s.to_country}</p>
                          <p className="text-slate-400">{s.to_city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {s.departure_date || "—"}
                      {s.departure_date_approximate && <span className="text-slate-400 ml-1">Approx.</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{s.approximate_duration || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.travel_methods || []).map(m => (
                          <span key={m} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">{m}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 max-w-[120px] truncate">{s.travelled_with || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${RISK_STYLE[s.risk_level] || RISK_STYLE.low}`}>
                        {s.risk_level || "Low"}
                      </span>
                    </td>
                    <td className="px-3 py-3 relative">
                      <button onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)} className="text-slate-400 hover:text-slate-600 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === s.id && (
                        <div className="absolute right-2 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 min-w-[120px] py-1">
                          <button onClick={() => { setEditStage(s); setShowModal(true); setOpenMenu(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-700">Edit</button>
                          <button onClick={() => { handleDelete(s.id); setOpenMenu(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Note */}
        <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">Some information is approximate as provided by the young person.</p>
        </div>
      </div>

      {/* KPI summary */}
      {stages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: Globe, label: "Total Countries", value: uniqueCountries, sub: "Visited" },
            { icon: Clock, label: "Total Duration", value: `~${stages.length * 2} Months`, sub: "Approximate" },
            { icon: AlertTriangle, label: "High Risk Stages", value: highRiskCount, sub: "Identified" },
            { icon: Users, label: "Travelled Alone", value: stages.filter(s => s.travelled_alone).length > 0 ? "Sometimes alone" : "In groups", sub: "Sometimes in groups" },
            { icon: Globe, label: "Main Methods", value: methods || "Multiple", sub: "Travel types" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center text-center">
              <Icon className="w-5 h-5 text-purple-400 mb-2" />
              <p className="text-sm font-bold text-slate-800">{value}</p>
              <p className="text-[10px] font-semibold text-slate-500">{label}</p>
              <p className="text-[10px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {(showModal) && (
        <StageModal
          stage={editStage}
          residentId={residentId}
          lifeStoryId={lifeStoryId}
          onClose={() => { setShowModal(false); setEditStage(null); }}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}