import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import { X } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import PhotoUpload from "./PhotoUpload";

export default function StaffForm({ homes, teamLeaders = [], onSubmit, onClose, saving }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "support_worker",
    phone: "",
    dbs_number: "",
    dbs_expiry: "",
    start_date: "",
    status: "active",
    org_id: ORG_ID,
    team_leader_id: "",
    home_ids: [],
    photo_url: "",
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Add Staff Member</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <PhotoUpload
              currentUrl={form.photo_url}
              onUploaded={url => update("photo_url", url)}
              size="lg"
            />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">Profile Photo</p>
              <p>JPG, PNG, WEBP — max 5MB</p>
            </div>
          </div>
          <div>
            <Label>Full Name *</Label>
            <Input required value={form.full_name} onChange={e => update("full_name", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role *</Label>
              <NativeSelect value={form.role} onValueChange={v => update("role", v)}>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team_leader">Team Leader</SelectItem>
                <SelectItem value="support_worker">Support Worker</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="regional_manager">Regional Manager</SelectItem>
                <SelectItem value="rsm">RSM</SelectItem>
              </NativeSelect>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => update("phone", e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>DBS Number</Label>
              <Input value={form.dbs_number} onChange={e => update("dbs_number", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>DBS Expiry</Label>
              <Input type="date" value={form.dbs_expiry} onChange={e => update("dbs_expiry", e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)} className="mt-1.5" />
          </div>
          {form.role === "support_worker" && (
            <div>
              <Label>Team Leader</Label>
              <NativeSelect value={form.team_leader_id} onValueChange={v => update("team_leader_id", v)} placeholder="Select team leader...">
                {teamLeaders.map(tl => <SelectItem key={tl.id} value={tl.id}>{tl.full_name}</SelectItem>)}
              </NativeSelect>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving || !form.full_name}>
              {saving ? "Saving..." : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}