import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { UK_LOCAL_AUTHORITIES, PROPERTY_TYPE_LABELS } from "@/lib/ukLocalAuthorities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function PlacementFeeForm({ lockedHomeId, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedHomeId, setSelectedHomeId] = useState(lockedHomeId || "");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [laSearch, setLaSearch] = useState("");
  const [form, setForm] = useState({
    local_authority: "",
    la_contact_name: "",
    la_contact_email: "",
    la_reference: "",
    monthly_fee: "",
    fee_start_date: new Date().toISOString().split("T")[0],
    fee_end_date: "",
    review_date: "",
    invoice_day: "",
    notes: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-active"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: "active" }),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-home", selectedHomeId],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, home_id: selectedHomeId, status: "active" }),
    enabled: !!selectedHomeId,
  });

  const { data: existingFees = [] } = useQuery({
    queryKey: ["placement-fees-home", selectedHomeId],
    queryFn: () => base44.entities.PlacementFee.filter({ org_id: ORG_ID, home_id: selectedHomeId, status: "active" }),
    enabled: !!selectedHomeId,
  });

  const monthly = parseFloat(form.monthly_fee) || 0;
  const weeklyEquiv = monthly > 0 ? (monthly * 12 / 52) : 0;
  const annualEquiv = monthly * 12;

  const filteredLAs = useMemo(() => {
    if (!laSearch) return UK_LOCAL_AUTHORITIES.slice(0, 20);
    const q = laSearch.toLowerCase();
    return UK_LOCAL_AUTHORITIES.filter(la => la.label.toLowerCase().includes(q)).slice(0, 30);
  }, [laSearch]);

  const selectedHome = homes.find(h => h.id === selectedHomeId);
  const selectedResident = residents.find(r => r.id === selectedResidentId);
  const residentHasFee = existingFees.some(f => f.resident_id === selectedResidentId);

  const validate = () => {
    const e = {};
    if (!selectedHomeId) e.home = "Select a property";
    if (!selectedResidentId) e.resident = "Select a resident";
    if (!form.local_authority) e.la = "Select a local authority";
    if (!monthly || monthly <= 0) e.fee = "Enter a valid fee amount";
    if (!form.fee_start_date) e.start = "Fee start date required";
    if (form.fee_end_date && form.fee_end_date < form.fee_start_date) e.end = "End date cannot be before start date";
    if (form.status === "ended" && !form.fee_end_date) e.endRequired = "End date required when status is Ended";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    // End existing active fee for this resident
    const existing = existingFees.find(f => f.resident_id === selectedResidentId);
    if (existing) {
      await base44.entities.PlacementFee.update(existing.id, {
        status: "ended",
        fee_end_date: new Date().toISOString().split("T")[0],
      });
    }
    await base44.entities.PlacementFee.create({
      org_id: ORG_ID,
      resident_id: selectedResidentId,
      home_id: selectedHomeId,
      local_authority: form.local_authority,
      la_contact_name: form.la_contact_name,
      la_contact_email: form.la_contact_email,
      la_reference: form.la_reference,
      weekly_rate: weeklyEquiv,
      monthly_equivalent: monthly,
      fee_start_date: form.fee_start_date,
      fee_end_date: form.fee_end_date || null,
      review_date: form.review_date || null,
      invoice_day: form.invoice_day ? parseInt(form.invoice_day) : null,
      notes: form.notes,
      status: form.status,
      created_by: "system",
    });
    queryClient.invalidateQueries({ queryKey: ["placement-fees"] });
    queryClient.invalidateQueries({ queryKey: ["placement-fees-home"] });
    toast.success(`Fee of £${monthly.toLocaleString()}/month saved for ${selectedResident?.display_name}`);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-base">Add Placement Fee</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: Property + Resident */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Property *</label>
            {lockedHomeId ? (
              <p className="text-sm font-medium mt-1">{selectedHome?.name} — {PROPERTY_TYPE_LABELS[selectedHome?.property_type] || selectedHome?.property_type}</p>
            ) : (
              <Select value={selectedHomeId} onValueChange={v => { setSelectedHomeId(v); setSelectedResidentId(""); setStep(1); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select property…" /></SelectTrigger>
                <SelectContent>
                  {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name} — {PROPERTY_TYPE_LABELS[h.property_type] || h.property_type}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {errors.home && <p className="text-xs text-red-500 mt-1">{errors.home}</p>}
          </div>

          {selectedHomeId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Resident *</label>
              <Select value={selectedResidentId} onValueChange={v => { setSelectedResidentId(v); setStep(2); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select resident…" /></SelectTrigger>
                <SelectContent>
                  {residents.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.display_name}
                      {existingFees.some(f => f.resident_id === r.id) ? " ⚠" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.resident && <p className="text-xs text-red-500 mt-1">{errors.resident}</p>}
              {residentHasFee && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-500/10 rounded-lg text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Has existing fee — saving will end it
                </div>
              )}
            </div>
          )}

          {/* Step 2: Fee details */}
          {step === 2 && selectedResidentId && (
            <>
              <div className="py-2 px-3 bg-muted/40 rounded-lg text-sm font-medium">
                {selectedResident?.display_name} at {selectedHome?.name}
              </div>

              {/* Local Authority searchable */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Local Authority *</label>
                <Input
                  className="mt-1 mb-1"
                  placeholder="Type to search…"
                  value={laSearch || form.local_authority}
                  onChange={e => { setLaSearch(e.target.value); setForm(f => ({ ...f, local_authority: "" })); }}
                />
                {laSearch && !form.local_authority && (
                  <div className="border border-border rounded-lg max-h-40 overflow-y-auto bg-popover text-sm">
                    {filteredLAs.length === 0 ? (
                      <p className="px-3 py-2 text-muted-foreground">No results</p>
                    ) : filteredLAs.map(la => (
                      <button
                        key={la.value}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => { setForm(f => ({ ...f, local_authority: la.value })); setLaSearch(la.label); }}
                      >
                        {la.label}
                        <span className="text-xs text-muted-foreground ml-2">{la.group}</span>
                      </button>
                    ))}
                  </div>
                )}
                {errors.la && <p className="text-xs text-red-500">{errors.la}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">LA Contact Name</label>
                  <Input className="mt-1" value={form.la_contact_name} onChange={e => setForm(f => ({ ...f, la_contact_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">LA Contact Email</label>
                  <Input className="mt-1" type="email" value={form.la_contact_email} onChange={e => setForm(f => ({ ...f, la_contact_email: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">LA Reference Number</label>
                <Input className="mt-1" value={form.la_reference} onChange={e => setForm(f => ({ ...f, la_reference: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Monthly Fee Amount (£) *</label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 4000"
                  inputMode="decimal"
                  value={form.monthly_fee}
                  onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))}
                />
                {monthly > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    <p>Weekly equivalent: <span className="font-medium text-foreground">£{weeklyEquiv.toFixed(2)}</span></p>
                    <p>Annual equivalent: <span className="font-medium text-foreground">£{annualEquiv.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span></p>
                  </div>
                )}
                {errors.fee && <p className="text-xs text-red-500">{errors.fee}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Fee Start Date *</label>
                  <Input className="mt-1" type="date" value={form.fee_start_date} onChange={e => setForm(f => ({ ...f, fee_start_date: e.target.value }))} />
                  {errors.start && <p className="text-xs text-red-500">{errors.start}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Fee End Date</label>
                  <Input className="mt-1" type="date" value={form.fee_end_date} onChange={e => setForm(f => ({ ...f, fee_end_date: e.target.value }))} />
                  {errors.end && <p className="text-xs text-red-500">{errors.end}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Review Date</label>
                  <Input className="mt-1" type="date" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Invoice Day (1–28)</label>
                  <Input className="mt-1" type="number" min="1" max="28" inputMode="numeric" value={form.invoice_day} onChange={e => setForm(f => ({ ...f, invoice_day: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
                {errors.endRequired && <p className="text-xs text-red-500">{errors.endRequired}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[72px] focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {step === 2 && <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Placement Fee"}</Button>}
        </div>
      </div>
    </div>
  );
}