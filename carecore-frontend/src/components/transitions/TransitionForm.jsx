import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";

export default function TransitionForm({ residents, homes, onSubmit, onClose, saving }) {
  const [data, setData] = useState({
    resident_id: "", resident_name: "", home_id: "", home_name: "",
    transition_type: "move_on", planned_date: "", destination_address: "",
    destination_type: "independent", pathway_stage: "planning",
    support_needs: "", tenancy_ref: "", notes: "",
  });
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const handleResident = (id) => {
    const r = residents.find(x => x.id === id);
    set("resident_id", id);
    set("resident_name", r?.display_name || "");
    if (r?.home_id && !data.home_id) {
      const h = homes.find(x => x.id === r.home_id);
      set("home_id", r.home_id);
      set("home_name", h?.name || "");
    }
  };

  const handleHome = (id) => {
    const h = homes.find(x => x.id === id);
    set("home_id", id);
    set("home_name", h?.name || "");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-semibold text-lg">New Transition Plan</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Resident *</Label>
              <Select value={data.resident_id} onValueChange={handleResident}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select resident" /></SelectTrigger>
                <SelectContent>
                  {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Home</Label>
              <Select value={data.home_id} onValueChange={handleHome}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select home" /></SelectTrigger>
                <SelectContent>
                  {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Transition Type *</Label>
              <Select value={data.transition_type} onValueChange={v => set("transition_type", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["move_on","Move On"],["pathway_planning","Pathway Planning"],["tenancy_setup","Tenancy Setup"],["emergency_move","Emergency Move"],["step_down","Step Down"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pathway Stage</Label>
              <Select value={data.pathway_stage} onValueChange={v => set("pathway_stage", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["initial_assessment","Initial Assessment"],["planning","Planning"],["preparation","Preparation"],["active_move","Active Move"],["post_move_support","Post-Move Support"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Planned Date</Label><Input className="mt-1.5" type="date" value={data.planned_date} onChange={e => set("planned_date", e.target.value)} /></div>
            <div>
              <Label>Destination Type</Label>
              <Select value={data.destination_type} onValueChange={v => set("destination_type", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["independent","Independent"],["supported_housing","Supported Housing"],["family","Family"],["foster_care","Foster Care"],["other","Other"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Destination Address</Label><Input className="mt-1.5" value={data.destination_address} onChange={e => set("destination_address", e.target.value)} /></div>
          <div><Label>Tenancy Reference</Label><Input className="mt-1.5" value={data.tenancy_ref} onChange={e => set("tenancy_ref", e.target.value)} /></div>
          <div><Label>Support Needs</Label><Textarea className="mt-1.5" value={data.support_needs} onChange={e => set("support_needs", e.target.value)} rows={2} /></div>
          <div><Label>Notes</Label><Textarea className="mt-1.5" value={data.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(data)} disabled={!data.resident_id || saving}>
            {saving ? "Saving…" : "Create Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}