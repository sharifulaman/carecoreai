import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Phone, Mail, MapPin, Plus, Pencil, X, Save, Stethoscope, Eye, Smile, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import BodyMapSection from "../bodymap/BodyMapSection";

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="text-sm text-muted-foreground text-center py-4">{message}</p>;
}

const SEVERITY_COLOURS = {
  mild: "bg-yellow-100 text-yellow-700",
  moderate: "bg-orange-100 text-orange-700",
  severe: "bg-red-100 text-red-700",
  anaphylactic: "bg-red-600 text-white",
};

export default function HealthTab({ residents, user, staff }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(residents[0]?.id || null);
  const [editing, setEditing] = useState(null); // "gp" | "dentist" | "optician" | "conditions" | "allergies" | "notes"
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  // Allergy / condition add states
  const [newCondition, setNewCondition] = useState({ condition: "", diagnosed_date: "", notes: "" });
  const [newAllergy, setNewAllergy] = useState({ allergen: "", severity: "moderate", reaction: "", notes: "" });

  const resident = residents.find(r => r.id === selectedId);

  const startEdit = (section) => {
    setEditing(section);
    setForm({ ...resident });
  };

  const cancelEdit = () => { setEditing(null); setForm({}); };

  const saveSection = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const patch = { ...form, health_updated_at: now };
    await secureGateway.update("Resident", resident.id, patch);
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Health record updated");
    setEditing(null);
    setSaving(false);
  };

  const addCondition = async () => {
    if (!newCondition.condition.trim()) return;
    const conditions = [...(resident.medical_conditions || []), newCondition];
    await secureGateway.update("Resident", resident.id, { medical_conditions: conditions, health_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    setNewCondition({ condition: "", diagnosed_date: "", notes: "" });
    toast.success("Condition added");
  };

  const removeCondition = async (idx) => {
    const conditions = (resident.medical_conditions || []).filter((_, i) => i !== idx);
    await secureGateway.update("Resident", resident.id, { medical_conditions: conditions, health_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Condition removed");
  };

  const addAllergy = async () => {
    if (!newAllergy.allergen.trim()) return;
    const allergies = [...(resident.allergies || []), newAllergy];
    await secureGateway.update("Resident", resident.id, { allergies, health_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    setNewAllergy({ allergen: "", severity: "moderate", reaction: "", notes: "" });
    toast.success("Allergy added");
  };

  const removeAllergy = async (idx) => {
    const allergies = (resident.allergies || []).filter((_, i) => i !== idx);
    await secureGateway.update("Resident", resident.id, { allergies, health_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Allergy removed");
  };

  const EditBtn = ({ section }) => (
    <button onClick={() => startEdit(section)} className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
      <Pencil className="w-3 h-3" /> Edit
    </button>
  );

  if (!resident) return <EmptyState message="No residents found." />;

  return (
    <div className="mt-4 space-y-4">
      {/* Resident selector */}
      {residents.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Young Person:</span>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-56 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Allergies — shown prominently at top */}
      <Section title="Allergies" icon={AlertTriangle}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">{(resident.allergies || []).length} recorded</span>
        </div>
        {(resident.allergies || []).length > 0 ? (
          <div className="space-y-2 mb-4">
            {resident.allergies.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{a.allergen}</span>
                    {a.severity && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SEVERITY_COLOURS[a.severity]}`}>{a.severity}</span>
                    )}
                  </div>
                  {a.reaction && <p className="text-xs text-muted-foreground mt-0.5">Reaction: {a.reaction}</p>}
                  {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                </div>
                <button onClick={() => removeAllergy(i)} className="text-muted-foreground hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-700 font-medium mb-3">✓ No known allergies</p>
        )}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium mb-2">Add allergy</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <Input placeholder="Allergen (e.g. Penicillin, Peanuts)" value={newAllergy.allergen} onChange={e => setNewAllergy(v => ({ ...v, allergen: e.target.value }))} />
            <Select value={newAllergy.severity} onValueChange={v => setNewAllergy(p => ({ ...p, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
                <SelectItem value="anaphylactic">Anaphylactic</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Reaction description" value={newAllergy.reaction} onChange={e => setNewAllergy(v => ({ ...v, reaction: e.target.value }))} />
            <Input placeholder="Notes (optional)" value={newAllergy.notes} onChange={e => setNewAllergy(v => ({ ...v, notes: e.target.value }))} />
          </div>
          <Button size="sm" variant="outline" onClick={addAllergy} className="gap-1"><Plus className="w-3 h-3" /> Add Allergy</Button>
        </div>
      </Section>

      {/* Medical Conditions */}
      <Section title="Medical Conditions / Diagnoses" icon={Heart}>
        {(resident.medical_conditions || []).length > 0 ? (
          <div className="space-y-2 mb-4">
            {resident.medical_conditions.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{c.condition}</p>
                  {c.diagnosed_date && <p className="text-xs text-muted-foreground">Diagnosed: {c.diagnosed_date}</p>}
                  {c.notes && <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>}
                </div>
                <button onClick={() => removeCondition(i)} className="text-muted-foreground hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">No conditions recorded.</p>
        )}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium mb-2">Add condition</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <Input placeholder="Condition / Diagnosis" value={newCondition.condition} onChange={e => setNewCondition(v => ({ ...v, condition: e.target.value }))} />
            <Input type="date" placeholder="Diagnosed date" value={newCondition.diagnosed_date} onChange={e => setNewCondition(v => ({ ...v, diagnosed_date: e.target.value }))} />
            <Input placeholder="Notes (optional)" value={newCondition.notes} onChange={e => setNewCondition(v => ({ ...v, notes: e.target.value }))} className="sm:col-span-2" />
          </div>
          <Button size="sm" variant="outline" onClick={addCondition} className="gap-1"><Plus className="w-3 h-3" /> Add Condition</Button>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GP Details */}
        <Section title="GP / Doctor Details" icon={Stethoscope}>
          <div className="flex items-center mb-2">
            <span className="text-xs text-muted-foreground">NHS No: <span className="font-mono font-semibold text-foreground">{resident.nhs_number || "—"}</span></span>
            <EditBtn section="gp" />
          </div>
          {editing === "gp" ? (
            <div className="space-y-2">
              <Input placeholder="NHS Number" value={form.nhs_number || ""} onChange={e => setForm(p => ({ ...p, nhs_number: e.target.value }))} />
              <Input placeholder="GP / Doctor Name" value={form.gp_name || ""} onChange={e => setForm(p => ({ ...p, gp_name: e.target.value }))} />
              <Input placeholder="Practice / Surgery Name" value={form.gp_practice || ""} onChange={e => setForm(p => ({ ...p, gp_practice: e.target.value }))} />
              <Input placeholder="Phone" value={form.gp_phone || ""} onChange={e => setForm(p => ({ ...p, gp_phone: e.target.value }))} />
              <Input placeholder="Email" value={form.gp_email || ""} onChange={e => setForm(p => ({ ...p, gp_email: e.target.value }))} />
              <Input placeholder="Address" value={form.gp_address || ""} onChange={e => setForm(p => ({ ...p, gp_address: e.target.value }))} />
              <Input type="date" placeholder="Registered since" value={form.gp_registered_date || ""} onChange={e => setForm(p => ({ ...p, gp_registered_date: e.target.value }))} label="Registered Since" />
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveSection} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <InfoRow label="GP Name" value={resident.gp_name} />
              <InfoRow label="Practice" value={resident.gp_practice} />
              <InfoRow label="Phone" value={resident.gp_phone} />
              <InfoRow label="Email" value={resident.gp_email} />
              <InfoRow label="Address" value={resident.gp_address} />
              <InfoRow label="Registered Since" value={resident.gp_registered_date} />
              {!resident.gp_name && <EmptyState message="No GP details recorded." />}
            </div>
          )}
        </Section>

        {/* Dentist Details */}
        <Section title="Dentist Details" icon={Smile}>
          <div className="flex items-center justify-end mb-2">
            <EditBtn section="dentist" />
          </div>
          {editing === "dentist" ? (
            <div className="space-y-2">
              <Input placeholder="Dentist Name" value={form.dentist_name || ""} onChange={e => setForm(p => ({ ...p, dentist_name: e.target.value }))} />
              <Input placeholder="Practice Name" value={form.dentist_practice || ""} onChange={e => setForm(p => ({ ...p, dentist_practice: e.target.value }))} />
              <Input placeholder="Phone" value={form.dentist_phone || ""} onChange={e => setForm(p => ({ ...p, dentist_phone: e.target.value }))} />
              <Input placeholder="Address" value={form.dentist_address || ""} onChange={e => setForm(p => ({ ...p, dentist_address: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Last appointment</label><Input type="date" value={form.dentist_last_appointment || ""} onChange={e => setForm(p => ({ ...p, dentist_last_appointment: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground">Next appointment</label><Input type="date" value={form.dentist_next_appointment || ""} onChange={e => setForm(p => ({ ...p, dentist_next_appointment: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveSection} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <InfoRow label="Dentist Name" value={resident.dentist_name} />
              <InfoRow label="Practice" value={resident.dentist_practice} />
              <InfoRow label="Phone" value={resident.dentist_phone} />
              <InfoRow label="Address" value={resident.dentist_address} />
              <InfoRow label="Last Appointment" value={resident.dentist_last_appointment} />
              <InfoRow label="Next Appointment" value={resident.dentist_next_appointment} />
              {!resident.dentist_name && <EmptyState message="No dentist details recorded." />}
            </div>
          )}
        </Section>

        {/* Optician Details */}
        <Section title="Optician Details" icon={Eye}>
          <div className="flex items-center justify-end mb-2">
            <EditBtn section="optician" />
          </div>
          {editing === "optician" ? (
            <div className="space-y-2">
              <Input placeholder="Optician Name" value={form.optician_name || ""} onChange={e => setForm(p => ({ ...p, optician_name: e.target.value }))} />
              <Input placeholder="Practice Name" value={form.optician_practice || ""} onChange={e => setForm(p => ({ ...p, optician_practice: e.target.value }))} />
              <Input placeholder="Phone" value={form.optician_phone || ""} onChange={e => setForm(p => ({ ...p, optician_phone: e.target.value }))} />
              <Input placeholder="Address" value={form.optician_address || ""} onChange={e => setForm(p => ({ ...p, optician_address: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Last appointment</label><Input type="date" value={form.optician_last_appointment || ""} onChange={e => setForm(p => ({ ...p, optician_last_appointment: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground">Next appointment</label><Input type="date" value={form.optician_next_appointment || ""} onChange={e => setForm(p => ({ ...p, optician_next_appointment: e.target.value }))} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.optician_needs_glasses} onChange={e => setForm(p => ({ ...p, optician_needs_glasses: e.target.checked }))} />
                Needs glasses / contact lenses
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveSection} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <InfoRow label="Optician Name" value={resident.optician_name} />
              <InfoRow label="Practice" value={resident.optician_practice} />
              <InfoRow label="Phone" value={resident.optician_phone} />
              <InfoRow label="Address" value={resident.optician_address} />
              <InfoRow label="Last Appointment" value={resident.optician_last_appointment} />
              <InfoRow label="Next Appointment" value={resident.optician_next_appointment} />
              {resident.optician_needs_glasses && <p className="text-sm text-blue-700 mt-1">👓 Needs glasses / contact lenses</p>}
              {!resident.optician_name && <EmptyState message="No optician details recorded." />}
            </div>
          )}
        </Section>

        {/* Health Notes */}
        <Section title="General Health Notes" icon={Heart}>
          <div className="flex items-center justify-end mb-2">
            <EditBtn section="health_notes" />
          </div>
          {editing === "health_notes" ? (
            <div className="space-y-2">
              <Textarea rows={5} placeholder="General health notes, conditions, ongoing concerns..." value={form.health_notes || ""} onChange={e => setForm(p => ({ ...p, health_notes: e.target.value }))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSection} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              {resident.health_notes
                ? <p className="text-sm text-foreground whitespace-pre-wrap">{resident.health_notes}</p>
                : <EmptyState message="No health notes recorded." />}
              {resident.health_updated_at && (
                <p className="text-xs text-muted-foreground mt-2">Last updated: {new Date(resident.health_updated_at).toLocaleDateString("en-GB")}</p>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Body Maps Section */}
      <Section title="Body Maps" icon={Heart}>
        <BodyMapSection resident={resident} user={user} staff={[]} />
      </Section>
    </div>
  );
}