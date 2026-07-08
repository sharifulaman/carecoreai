import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Plus } from "lucide-react";
import { toast } from "sonner";

const SECTION_CONFIG = {
  gp: {
    title: "GP Details",
    fields: [
      { key: "nhs_number", label: "NHS Number", type: "text" },
      { key: "gp_name", label: "GP / Doctor Name", type: "text" },
      { key: "gp_practice", label: "Practice / Surgery", type: "text" },
      { key: "gp_phone", label: "Phone", type: "text" },
      { key: "gp_email", label: "Email", type: "text" },
      { key: "gp_address", label: "Address", type: "text" },
      { key: "gp_registered_date", label: "Registered Since", type: "date" },
    ],
  },
  dentist: {
    title: "Dentist Details",
    fields: [
      { key: "dentist_name", label: "Dentist Name", type: "text" },
      { key: "dentist_practice", label: "Practice", type: "text" },
      { key: "dentist_phone", label: "Phone", type: "text" },
      { key: "dentist_address", label: "Address", type: "text" },
      { key: "dentist_last_appointment", label: "Last Appointment", type: "date" },
      { key: "dentist_next_appointment", label: "Next Appointment", type: "date" },
    ],
  },
  optician: {
    title: "Optician Details",
    fields: [
      { key: "optician_name", label: "Optician Name", type: "text" },
      { key: "optician_practice", label: "Practice", type: "text" },
      { key: "optician_phone", label: "Phone", type: "text" },
      { key: "optician_address", label: "Address", type: "text" },
      { key: "optician_last_appointment", label: "Last Appointment", type: "date" },
      { key: "optician_next_appointment", label: "Next Appointment", type: "date" },
      { key: "optician_needs_glasses", label: "Needs glasses / contact lenses", type: "checkbox" },
    ],
  },
  healthnotes: {
    title: "Health Notes",
    fields: [
      { key: "health_notes", label: "General Health Notes", type: "textarea" },
    ],
  },
};

export default function HealthInlineEditor({ taskKey, resident, onClose }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  // allergies / conditions are special — additive list editors
  const isAllergies = taskKey === "allergies";
  const isConditions = taskKey === "conditions";

  const config = SECTION_CONFIG[taskKey];
  const [form, setForm] = useState(() => {
    const initial = {};
    (config?.fields || []).forEach(f => {
      initial[f.key] = resident[f.key] ?? (f.type === "checkbox" ? false : "");
    });
    return initial;
  });

  // Allergy / condition state
  const [newAllergy, setNewAllergy] = useState({ allergen: "", severity: "moderate", reaction: "", notes: "" });
  const [newCondition, setNewCondition] = useState({ condition: "", diagnosed_date: "", notes: "" });

  const saveFields = async () => {
    setSaving(true);
    await secureGateway.update("Resident", resident.id, { ...form, health_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Saved");
    onClose();
    setSaving(false);
  };

  const addAllergy = async () => {
    if (!newAllergy.allergen.trim()) return;
    const allergies = [...(resident.allergies || []), newAllergy];
    await secureGateway.update("Resident", resident.id, { allergies, health_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Allergy added");
    onClose();
  };

  const addCondition = async () => {
    if (!newCondition.condition.trim()) return;
    const medical_conditions = [...(resident.medical_conditions || []), newCondition];
    await secureGateway.update("Resident", resident.id, { medical_conditions, health_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Condition added");
    onClose();
  };

  const title = isAllergies ? "Allergies" : isConditions ? "Medical Conditions" : config?.title || taskKey;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-base">{title}</h2>
            <p className="text-xs text-slate-500">{resident.display_name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {isAllergies && (
            <>
              {/* Existing allergies */}
              {(resident.allergies || []).length > 0 && (
                <div className="space-y-2">
                  {resident.allergies.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200 text-sm">
                      <span className="font-medium text-red-800">{a.allergen}</span>
                      <span className="text-xs text-red-600 capitalize">{a.severity}</span>
                      {a.reaction && <span className="text-xs text-slate-500">— {a.reaction}</span>}
                    </div>
                  ))}
                </div>
              )}
              {/* Add new */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-semibold text-slate-700">Add new allergy</p>
                <Input placeholder="Allergen (e.g. Penicillin, Peanuts)" value={newAllergy.allergen} onChange={e => setNewAllergy(v => ({ ...v, allergen: e.target.value }))} />
                <Select value={newAllergy.severity} onValueChange={v => setNewAllergy(p => ({ ...p, severity: v }))}>
                  <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="anaphylactic">Anaphylactic</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Reaction description" value={newAllergy.reaction} onChange={e => setNewAllergy(v => ({ ...v, reaction: e.target.value }))} />
                <Button onClick={addAllergy} disabled={!newAllergy.allergen.trim()} className="w-full gap-1">
                  <Plus className="w-4 h-4" /> Add Allergy
                </Button>
              </div>
            </>
          )}

          {isConditions && (
            <>
              {(resident.medical_conditions || []).length > 0 && (
                <div className="space-y-2">
                  {resident.medical_conditions.map((c, i) => (
                    <div key={i} className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                      <p className="font-medium text-blue-800">{c.condition}</p>
                      {c.diagnosed_date && <p className="text-xs text-blue-600">Diagnosed: {c.diagnosed_date}</p>}
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-semibold text-slate-700">Add new condition</p>
                <Input placeholder="Condition / Diagnosis" value={newCondition.condition} onChange={e => setNewCondition(v => ({ ...v, condition: e.target.value }))} />
                <Input type="date" placeholder="Diagnosed date" value={newCondition.diagnosed_date} onChange={e => setNewCondition(v => ({ ...v, diagnosed_date: e.target.value }))} />
                <Input placeholder="Notes (optional)" value={newCondition.notes} onChange={e => setNewCondition(v => ({ ...v, notes: e.target.value }))} />
                <Button onClick={addCondition} disabled={!newCondition.condition.trim()} className="w-full gap-1">
                  <Plus className="w-4 h-4" /> Add Condition
                </Button>
              </div>
            </>
          )}

          {!isAllergies && !isConditions && config && (
            <>
              {config.fields.map(field => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">{field.label}</label>
                  {field.type === "textarea" ? (
                    <Textarea
                      rows={5}
                      value={form[field.key] || ""}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.label}
                    />
                  ) : field.type === "checkbox" ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form[field.key]}
                        onChange={e => setForm(p => ({ ...p, [field.key]: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-600">{field.label}</span>
                    </label>
                  ) : (
                    <Input
                      type={field.type}
                      value={form[field.key] || ""}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.label}
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={saveFields} disabled={saving} className="flex-1 gap-1">
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}