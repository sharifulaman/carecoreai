import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Music, Plus, X, Save, Pencil, Star } from "lucide-react";
import { toast } from "sonner";

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

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className={`w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-green-500" : "bg-muted"}`}
        onClick={onChange}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-5" : "left-0.5"}`} />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

const ACTIVITY_TYPES = [
  "Football", "Basketball", "Cricket", "Rugby", "Tennis", "Badminton",
  "Swimming", "Boxing", "Martial Arts", "Athletics", "Cycling",
  "Art / Drawing", "Music", "Drama / Theatre", "Dance", "Cooking",
  "Gaming", "Volunteering", "Youth Club", "Other"
];

export default function LeisureTab({ residents }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(residents[0]?.id || null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [newClub, setNewClub] = useState({ name: "", type: "", day: "", notes: "" });

  const resident = residents.find(r => r.id === selectedId);

  const startEdit = () => { setEditing(true); setForm({ ...resident }); };
  const cancelEdit = () => { setEditing(false); setForm({}); };

  const save = async () => {
    setSaving(true);
    await secureGateway.update("Resident", resident.id, { ...form, leisure_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Leisure record updated");
    setEditing(false);
    setSaving(false);
  };

  const addClub = async () => {
    if (!newClub.name.trim()) return;
    const clubs = [...(resident.leisure_other_clubs || []), newClub];
    await secureGateway.update("Resident", resident.id, { leisure_other_clubs: clubs, leisure_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    setNewClub({ name: "", type: "", day: "", notes: "" });
    toast.success("Activity added");
  };

  const removeClub = async (idx) => {
    const clubs = (resident.leisure_other_clubs || []).filter((_, i) => i !== idx);
    await secureGateway.update("Resident", resident.id, { leisure_other_clubs: clubs, leisure_updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
  };

  if (!resident) return <p className="text-sm text-muted-foreground text-center py-12">No residents found.</p>;

  return (
    <div className="mt-4 space-y-4">
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

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {resident.leisure_gym_enrolled && (
          <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">🏋️ Gym: {resident.leisure_gym_name || "Enrolled"}</span>
        )}
        {resident.leisure_leisure_centre_enrolled && (
          <span className="text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">🏊 Leisure Centre: {resident.leisure_leisure_centre || "Enrolled"}</span>
        )}
        {resident.leisure_football_enrolled && (
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">⚽ Football: {resident.leisure_football_club || "Enrolled"}</span>
        )}
        {(resident.leisure_other_clubs || []).map((c, i) => (
          <span key={i} className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">🎯 {c.name}</span>
        ))}
        {!resident.leisure_gym_enrolled && !resident.leisure_leisure_centre_enrolled && !resident.leisure_football_enrolled && (resident.leisure_other_clubs || []).length === 0 && (
          <span className="text-xs text-muted-foreground">No activities recorded yet.</span>
        )}
      </div>

      <Section title="Physical Activity & Facilities" icon={Dumbbell}>
        <div className="flex justify-end mb-3">
          {!editing ? (
            <button onClick={startEdit} className="text-xs text-primary hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            {/* Gym */}
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <Toggle label="Enrolled in Gym" checked={!!form.leisure_gym_enrolled} onChange={() => setForm(p => ({ ...p, leisure_gym_enrolled: !p.leisure_gym_enrolled }))} />
              {form.leisure_gym_enrolled && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input placeholder="Gym name" value={form.leisure_gym_name || ""} onChange={e => setForm(p => ({ ...p, leisure_gym_name: e.target.value }))} />
                  <div><label className="text-xs text-muted-foreground">Membership expiry</label><Input type="date" value={form.leisure_gym_membership_expiry || ""} onChange={e => setForm(p => ({ ...p, leisure_gym_membership_expiry: e.target.value }))} /></div>
                </div>
              )}
            </div>

            {/* Leisure Centre */}
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <Toggle label="Enrolled in Leisure Centre" checked={!!form.leisure_leisure_centre_enrolled} onChange={() => setForm(p => ({ ...p, leisure_leisure_centre_enrolled: !p.leisure_leisure_centre_enrolled }))} />
              {form.leisure_leisure_centre_enrolled && (
                <Input className="mt-2" placeholder="Leisure centre name" value={form.leisure_leisure_centre || ""} onChange={e => setForm(p => ({ ...p, leisure_leisure_centre: e.target.value }))} />
              )}
            </div>

            {/* Football */}
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <Toggle label="Enrolled in Football Club" checked={!!form.leisure_football_enrolled} onChange={() => setForm(p => ({ ...p, leisure_football_enrolled: !p.leisure_football_enrolled }))} />
              {form.leisure_football_enrolled && (
                <Input className="mt-2" placeholder="Football club name" value={form.leisure_football_club || ""} onChange={e => setForm(p => ({ ...p, leisure_football_club: e.target.value }))} />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Gym</span>
              <span className={`text-sm font-medium ${resident.leisure_gym_enrolled ? "text-green-700" : "text-muted-foreground"}`}>
                {resident.leisure_gym_enrolled ? (resident.leisure_gym_name || "Enrolled ✓") : "Not enrolled"}
              </span>
            </div>
            {resident.leisure_gym_enrolled && resident.leisure_gym_membership_expiry && (
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Gym membership expiry</span>
                <span className="text-sm font-medium">{resident.leisure_gym_membership_expiry}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Leisure Centre</span>
              <span className={`text-sm font-medium ${resident.leisure_leisure_centre_enrolled ? "text-green-700" : "text-muted-foreground"}`}>
                {resident.leisure_leisure_centre_enrolled ? (resident.leisure_leisure_centre || "Enrolled ✓") : "Not enrolled"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Football Club</span>
              <span className={`text-sm font-medium ${resident.leisure_football_enrolled ? "text-green-700" : "text-muted-foreground"}`}>
                {resident.leisure_football_enrolled ? (resident.leisure_football_club || "Enrolled ✓") : "Not enrolled"}
              </span>
            </div>
          </div>
        )}
      </Section>

      {/* Other clubs / activities */}
      <Section title="Other Clubs & Activities" icon={Star}>
        {(resident.leisure_other_clubs || []).length > 0 ? (
          <div className="space-y-2 mb-4">
            {resident.leisure_other_clubs.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.name}</span>
                    {c.type && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c.type}</span>}
                  </div>
                  {c.day && <p className="text-xs text-muted-foreground">Day: {c.day}</p>}
                  {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                </div>
                <button onClick={() => removeClub(i)} className="text-muted-foreground hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">No other activities recorded.</p>
        )}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium mb-2">Add activity / club</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <Input placeholder="Activity / Club name" value={newClub.name} onChange={e => setNewClub(v => ({ ...v, name: e.target.value }))} />
            <Select value={newClub.type || ""} onValueChange={v => setNewClub(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue placeholder="Type (optional)" /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Day(s) e.g. Monday evenings" value={newClub.day} onChange={e => setNewClub(v => ({ ...v, day: e.target.value }))} />
            <Input placeholder="Notes (optional)" value={newClub.notes} onChange={e => setNewClub(v => ({ ...v, notes: e.target.value }))} />
          </div>
          <Button size="sm" variant="outline" onClick={addClub} className="gap-1"><Plus className="w-3 h-3" /> Add Activity</Button>
        </div>
      </Section>

      {/* Interests & Notes */}
      <Section title="Interests & General Notes" icon={Music}>
        <div className="flex justify-end mb-2">
          {!editing && <button onClick={startEdit} className="text-xs text-primary hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>}
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea rows={3} placeholder="General interests and hobbies..." value={form.leisure_interests || ""} onChange={e => setForm(p => ({ ...p, leisure_interests: e.target.value }))} />
            <Textarea rows={2} placeholder="Additional notes..." value={form.leisure_notes || ""} onChange={e => setForm(p => ({ ...p, leisure_notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div>
            {resident.leisure_interests && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Interests</p>
                <p className="text-sm">{resident.leisure_interests}</p>
              </div>
            )}
            {resident.leisure_notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-muted-foreground">{resident.leisure_notes}</p>
              </div>
            )}
            {!resident.leisure_interests && !resident.leisure_notes && (
              <p className="text-sm text-muted-foreground">No interests or notes recorded.</p>
            )}
            {resident.leisure_updated_at && (
              <p className="text-xs text-muted-foreground mt-2">Last updated: {new Date(resident.leisure_updated_at).toLocaleDateString("en-GB")}</p>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}