import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Scale, Save, Pencil } from "lucide-react";
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

function InfoRow({ label, value, masked }) {
  if (!value) return null;
  const display = masked ? value.replace(/.(?=.{4})/g, "•") : value;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium font-mono">{display}</span>
    </div>
  );
}

export default function FinanceLegalTab({ residents }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(residents[0]?.id || null);
  const [editingBank, setEditingBank] = useState(false);
  const [editingSolicitor, setEditingSolicitor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankForm, setBankForm] = useState({});
  const [solicitorForm, setSolicitorForm] = useState({});

  const resident = residents.find(r => r.id === selectedId);

  const startEditBank = () => { setEditingBank(true); setBankForm({ ...resident }); };
  const startEditSolicitor = () => { setEditingSolicitor(true); setSolicitorForm({ ...resident }); };

  const saveBank = async () => {
    setSaving(true);
    await secureGateway.update("Resident", resident.id, {
      bank_account_name: bankForm.bank_account_name,
      bank_name: bankForm.bank_name,
      bank_sort_code: bankForm.bank_sort_code,
      bank_account_number: bankForm.bank_account_number,
      bank_notes: bankForm.bank_notes,
    });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Bank details updated");
    setEditingBank(false);
    setSaving(false);
  };

  const saveSolicitor = async () => {
    setSaving(true);
    await secureGateway.update("Resident", resident.id, {
      solicitor_name: solicitorForm.solicitor_name,
      solicitor_firm: solicitorForm.solicitor_firm,
      solicitor_phone: solicitorForm.solicitor_phone,
      solicitor_email: solicitorForm.solicitor_email,
      solicitor_address: solicitorForm.solicitor_address,
      solicitor_case_ref: solicitorForm.solicitor_case_ref,
      solicitor_notes: solicitorForm.solicitor_notes,
    });
    qc.invalidateQueries({ queryKey: ["all-residents"] });
    toast.success("Solicitor details updated");
    setEditingSolicitor(false);
    setSaving(false);
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

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        ⚠️ This section contains sensitive financial and legal information. Access is logged and restricted to authorised staff only.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bank Account */}
        <Section title="Bank Account Details" icon={Banknote}>
          <div className="flex justify-end mb-3">
            {!editingBank ? (
              <button onClick={startEditBank} className="text-xs text-primary hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveBank} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingBank(false)}>Cancel</Button>
              </div>
            )}
          </div>
          {editingBank ? (
            <div className="space-y-2">
              <Input placeholder="Account holder name" value={bankForm.bank_account_name || ""} onChange={e => setBankForm(p => ({ ...p, bank_account_name: e.target.value }))} />
              <Input placeholder="Bank name (e.g. Barclays, HSBC)" value={bankForm.bank_name || ""} onChange={e => setBankForm(p => ({ ...p, bank_name: e.target.value }))} />
              <Input placeholder="Sort code (XX-XX-XX)" value={bankForm.bank_sort_code || ""} onChange={e => setBankForm(p => ({ ...p, bank_sort_code: e.target.value }))} />
              <Input placeholder="Account number" value={bankForm.bank_account_number || ""} onChange={e => setBankForm(p => ({ ...p, bank_account_number: e.target.value }))} />
              <Textarea rows={2} placeholder="Notes (optional)" value={bankForm.bank_notes || ""} onChange={e => setBankForm(p => ({ ...p, bank_notes: e.target.value }))} />
            </div>
          ) : (
            <div>
              <InfoRow label="Account Holder" value={resident.bank_account_name} />
              <InfoRow label="Bank" value={resident.bank_name} />
              <InfoRow label="Sort Code" value={resident.bank_sort_code} />
              <InfoRow label="Account Number" value={resident.bank_account_number} masked />
              {resident.bank_notes && <p className="text-xs text-muted-foreground mt-2">{resident.bank_notes}</p>}
              {!resident.bank_account_name && !resident.bank_account_number && (
                <p className="text-sm text-muted-foreground text-center py-4">No bank details recorded.</p>
              )}
            </div>
          )}
        </Section>

        {/* Solicitor */}
        <Section title="Solicitor / Legal Representative" icon={Scale}>
          <div className="flex justify-end mb-3">
            {!editingSolicitor ? (
              <button onClick={startEditSolicitor} className="text-xs text-primary hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSolicitor} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingSolicitor(false)}>Cancel</Button>
              </div>
            )}
          </div>
          {editingSolicitor ? (
            <div className="space-y-2">
              <Input placeholder="Solicitor name" value={solicitorForm.solicitor_name || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_name: e.target.value }))} />
              <Input placeholder="Law firm name" value={solicitorForm.solicitor_firm || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_firm: e.target.value }))} />
              <Input placeholder="Phone" value={solicitorForm.solicitor_phone || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_phone: e.target.value }))} />
              <Input placeholder="Email" value={solicitorForm.solicitor_email || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_email: e.target.value }))} />
              <Input placeholder="Address" value={solicitorForm.solicitor_address || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_address: e.target.value }))} />
              <Input placeholder="Case reference number" value={solicitorForm.solicitor_case_ref || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_case_ref: e.target.value }))} />
              <Textarea rows={2} placeholder="Notes" value={solicitorForm.solicitor_notes || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_notes: e.target.value }))} />
            </div>
          ) : (
            <div>
              {[
                ["Solicitor", resident.solicitor_name],
                ["Firm", resident.solicitor_firm],
                ["Phone", resident.solicitor_phone],
                ["Email", resident.solicitor_email],
                ["Address", resident.solicitor_address],
                ["Case Ref", resident.solicitor_case_ref],
              ].map(([label, value]) => value ? (
                <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ) : null)}
              {resident.solicitor_notes && <p className="text-xs text-muted-foreground mt-2">{resident.solicitor_notes}</p>}
              {!resident.solicitor_name && !resident.solicitor_firm && (
                <p className="text-sm text-muted-foreground text-center py-4">No solicitor details recorded.</p>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}