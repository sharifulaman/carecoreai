import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import { X } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";

export default function ResidentForm({ homes, staff, onSubmit, onClose, saving }) {
  const [form, setForm] = useState({
    display_name: "",
    initials: "",
    dob: "",
    gender: "",
    home_id: "",
    key_worker_id: "",
    team_leader_id: "",
    placement_type: "",
    placement_start: "",
    risk_level: "low",
    status: "active",
    org_id: ORG_ID,
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const teamLeaders = staff.filter(s => s.role === "team_leader" && s.status === "active");
  const supportWorkers = staff.filter(s => s.role === "support_worker" && s.status === "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Add New Resident</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Display Name *</Label>
              <Input required value={form.display_name} onChange={e => update("display_name", e.target.value)} className="mt-1.5" placeholder="e.g. Alex T." />
            </div>
            <div>
              <Label>Initials</Label>
              <Input value={form.initials} onChange={e => update("initials", e.target.value)} className="mt-1.5" placeholder="AT" maxLength={3} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={e => update("dob", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Gender</Label>
              <NativeSelect value={form.gender} onValueChange={v => update("gender", v)} placeholder="Select">
                {["Male","Female","Non-binary","Prefer not to say"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </NativeSelect>
            </div>
          </div>

          <div>
            <Label>Residence / Home *</Label>
            <NativeSelect value={form.home_id} onValueChange={v => update("home_id", v)} placeholder="Select home">
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </NativeSelect>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Team Leader</Label>
              <NativeSelect value={form.team_leader_id} onValueChange={v => update("team_leader_id", v)} placeholder="Select">
                {teamLeaders.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </NativeSelect>
            </div>
            <div>
              <Label>Key Worker</Label>
              <NativeSelect value={form.key_worker_id} onValueChange={v => update("key_worker_id", v)} placeholder="Select">
                {supportWorkers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </NativeSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Placement Type</Label>
              <NativeSelect value={form.placement_type} onValueChange={v => update("placement_type", v)} placeholder="Select">
                <SelectItem value="childrens_home">Children's Home</SelectItem>
                <SelectItem value="supported_accommodation">Supported Accommodation</SelectItem>
                <SelectItem value="adult_care">Adult Care</SelectItem>
              </NativeSelect>
            </div>
            <div>
              <Label>Placement Start</Label>
              <Input type="date" value={form.placement_start} onChange={e => update("placement_start", e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Risk Level</Label>
            <NativeSelect value={form.risk_level} onValueChange={v => update("risk_level", v)}>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </NativeSelect>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving || !form.display_name}>
              {saving ? "Saving..." : "Add Resident"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}