import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const AGENCY_TYPES = [
  { value: "staffing", label: "Staffing Agency" },
  { value: "specialist_support", label: "Specialist Support" },
  { value: "therapeutic", label: "Therapeutic Services" },
  { value: "educational", label: "Educational Support" },
  { value: "health", label: "Health Services" },
  { value: "other", label: "Other" },
];

export default function AgencyForm({ agency, onSubmit, onClose, saving }) {
  const [form, setForm] = useState({
    name: agency?.name || "",
    type: agency?.type || "staffing",
    contact_name: agency?.contact_name || "",
    contact_email: agency?.contact_email || "",
    contact_phone: agency?.contact_phone || "",
    address: agency?.address || "",
    registration_number: agency?.registration_number || "",
    specialisms: agency?.specialisms || "",
    lead_worker: agency?.lead_worker || "",
    contract_start: agency?.contract_start || "",
    contract_end: agency?.contract_end || "",
    hourly_rate: agency?.hourly_rate || "",
    status: agency?.status || "active",
    notes: agency?.notes || "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-lg">{agency ? "Edit Agency" : "Add Agency"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Agency Name *</label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Agency name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AGENCY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Contact Name</label>
              <Input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} placeholder="Primary contact" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Contact Email</label>
              <Input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="email@agency.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Contact Phone</label>
              <Input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="+44..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Registration Number</label>
              <Input value={form.registration_number} onChange={e => set("registration_number", e.target.value)} placeholder="CQC / Ofsted reg" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Lead Worker at Agency</label>
              <Input value={form.lead_worker} onChange={e => set("lead_worker", e.target.value)} placeholder="Name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Hourly Rate (£)</label>
              <Input type="number" value={form.hourly_rate} onChange={e => set("hourly_rate", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Contract Start</label>
              <Input type="date" value={form.contract_start} onChange={e => set("contract_start", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Contract End</label>
              <Input type="date" value={form.contract_end} onChange={e => set("contract_end", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Address</label>
            <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Specialisms</label>
            <Input value={form.specialisms} onChange={e => set("specialisms", e.target.value)} placeholder="e.g. CSE, challenging behaviour, mental health" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring h-20 resize-none"
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={saving || !form.name}>
            {saving ? "Saving..." : agency ? "Update Agency" : "Add Agency"}
          </Button>
        </div>
      </div>
    </div>
  );
}