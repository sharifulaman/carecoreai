import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

const RELATIONSHIPS = {
  social_worker: "Social Worker",
  iro: "IRO",
  parent: "Parent",
  family: "Family Member",
  solicitor: "Solicitor",
  health_professional: "Health Professional",
  ofsted_inspector: "Ofsted Inspector",
  contractor: "Contractor",
  police: "Police",
  other: "Other",
};

export default function VisitorSignInForm({ home, residents, user, onClose, onSave }) {
  const [form, setForm] = useState({
    visitor_name: "",
    visitor_organisation: "",
    visitor_relationship: "other",
    purpose_of_visit: "",
    resident_visited_id: "",
    dbs_checked: false,
    dbs_check_date: "",
    staff_who_authorised: "",
    visit_date: new Date().toISOString().split("T")[0],
    arrival_time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    any_concerns: false,
    concern_notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const resident = form.resident_visited_id ? residents.find(r => r.id === form.resident_visited_id) : null;
      await secureGateway.create("VisitorLog", {
        org_id: ORG_ID,
        home_id: home.id,
        home_name: home.name,
        recorded_by_id: user?.id,
        recorded_by_name: user?.full_name,
        visit_date: form.visit_date,
        arrival_time: form.arrival_time,
        visitor_name: form.visitor_name,
        visitor_organisation: form.visitor_organisation,
        visitor_relationship: form.visitor_relationship,
        purpose_of_visit: form.purpose_of_visit,
        resident_visited_id: form.resident_visited_id,
        resident_visited_name: resident?.display_name,
        dbs_checked: form.dbs_checked,
        dbs_check_date: form.dbs_check_date,
        staff_who_authorised: form.staff_who_authorised,
        any_concerns: form.any_concerns,
        concern_notes: form.concern_notes,
        signed_in: true,
      });
    },
    onSuccess: () => {
      toast.success("Visitor signed in");
      onSave();
      onClose();
    },
    onError: () => toast.error("Error signing in visitor"),
  });

  const handleSubmit = () => {
    if (!form.visitor_name || !form.purpose_of_visit) {
      toast.error("Visitor name and purpose required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Sign In Visitor</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-sm font-medium">Visitor Name *</label>
            <Input value={form.visitor_name} onChange={e => setForm(p => ({ ...p, visitor_name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <label className="text-sm font-medium">Organisation</label>
            <Input value={form.visitor_organisation} onChange={e => setForm(p => ({ ...p, visitor_organisation: e.target.value }))} placeholder="e.g. Social Services" />
          </div>
          <div>
            <label className="text-sm font-medium">Role / Relationship *</label>
            <Select value={form.visitor_relationship} onValueChange={v => setForm(p => ({ ...p, visitor_relationship: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RELATIONSHIPS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Purpose of Visit *</label>
            <Input value={form.purpose_of_visit} onChange={e => setForm(p => ({ ...p, purpose_of_visit: e.target.value }))} placeholder="e.g. LAC review meeting" />
          </div>
          <div>
            <label className="text-sm font-medium">Which resident (if applicable)?</label>
            <Select value={form.resident_visited_id} onValueChange={v => setForm(p => ({ ...p, resident_visited_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Arrival Time</label>
            <Input type="time" value={form.arrival_time} onChange={e => setForm(p => ({ ...p, arrival_time: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.dbs_checked} onChange={e => setForm(p => ({ ...p, dbs_checked: e.target.checked }))} id="dbs" />
            <label htmlFor="dbs" className="text-sm font-medium">DBS checked</label>
          </div>
          {form.dbs_checked && (
            <Input type="date" value={form.dbs_check_date} onChange={e => setForm(p => ({ ...p, dbs_check_date: e.target.value }))} />
          )}
          <div>
            <label className="text-sm font-medium">Who authorised entry?</label>
            <Input value={form.staff_who_authorised} onChange={e => setForm(p => ({ ...p, staff_who_authorised: e.target.value }))} placeholder="Staff name" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.any_concerns} onChange={e => setForm(p => ({ ...p, any_concerns: e.target.checked }))} id="concerns" />
            <label htmlFor="concerns" className="text-sm font-medium">Any concerns?</label>
          </div>
          {form.any_concerns && (
            <Input value={form.concern_notes} onChange={e => setForm(p => ({ ...p, concern_notes: e.target.value }))} placeholder="Concern notes..." />
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </div>
      </div>
    </div>
  );
}