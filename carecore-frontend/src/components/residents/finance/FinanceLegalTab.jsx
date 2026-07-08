import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Scale, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useModuleActions } from "@/lib/PermissionContext";
import BenefitsTabMain from "../../eighteen-plus/BenefitsTab/BenefitsTabMain";

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

function LegalBankContent({ residents }) {
  const qc = useQueryClient();
  const { isReadOnly } = useModuleActions("residents");
  const [selectedId, setSelectedId] = useState(residents[0]?.id || null);
  const [editingBank, setEditingBank] = useState(false);
  const [editingSolicitor, setEditingSolicitor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankForm, setBankForm] = useState({});
  const [solicitorForm, setSolicitorForm] = useState({});
  const [bankErrors, setBankErrors] = useState({});
  const [solicitorErrors, setSolicitorErrors] = useState({});

  const resident = residents.find(r => r.id === selectedId);

  const startEditBank = () => { setEditingBank(true); setBankForm({ ...resident }); setBankErrors({}); };
  const startEditSolicitor = () => { setEditingSolicitor(true); setSolicitorForm({ ...resident }); setSolicitorErrors({}); };

  const saveBank = async () => {
    const errs = {};
    if (!bankForm.bank_account_name?.trim()) errs.bank_account_name = "Account holder name is required";
    if (!bankForm.bank_name?.trim()) errs.bank_name = "Bank name is required";
    if (!bankForm.bank_sort_code?.trim()) errs.bank_sort_code = "Sort code is required";
    if (!bankForm.bank_account_number?.trim()) errs.bank_account_number = "Account number is required";
    if (Object.keys(errs).length > 0) { setBankErrors(errs); toast.error("Please fill in all required fields"); return; }
    setBankErrors({});
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
    const errs = {};
    if (!solicitorForm.solicitor_name?.trim()) errs.solicitor_name = "Solicitor name is required";
    if (!solicitorForm.solicitor_firm?.trim()) errs.solicitor_firm = "Law firm name is required";
    if (!solicitorForm.solicitor_phone?.trim()) errs.solicitor_phone = "Phone is required";
    if (!solicitorForm.solicitor_email?.trim()) errs.solicitor_email = "Email is required";
    if (!solicitorForm.solicitor_address?.trim()) errs.solicitor_address = "Address is required";
    if (Object.keys(errs).length > 0) { setSolicitorErrors(errs); toast.error("Please fill in all required fields"); return; }
    setSolicitorErrors({});
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
              !isReadOnly && <button onClick={startEditBank} className="text-xs text-primary hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveBank} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingBank(false)}>Cancel</Button>
              </div>
            )}
          </div>
          {editingBank ? (
            <div className="space-y-2">
              <div>
                <Input placeholder="Account holder name *" value={bankForm.bank_account_name || ""} onChange={e => setBankForm(p => ({ ...p, bank_account_name: e.target.value }))} className={bankErrors.bank_account_name ? "border-red-500" : ""} />
                {bankErrors.bank_account_name && <p className="text-xs text-red-500 mt-1">{bankErrors.bank_account_name}</p>}
              </div>
              <div>
                <Input placeholder="Bank name (e.g. Barclays, HSBC) *" value={bankForm.bank_name || ""} onChange={e => setBankForm(p => ({ ...p, bank_name: e.target.value }))} className={bankErrors.bank_name ? "border-red-500" : ""} />
                {bankErrors.bank_name && <p className="text-xs text-red-500 mt-1">{bankErrors.bank_name}</p>}
              </div>
              <div>
                <Input placeholder="Sort code (XX-XX-XX) *" value={bankForm.bank_sort_code || ""} onChange={e => setBankForm(p => ({ ...p, bank_sort_code: e.target.value }))} className={bankErrors.bank_sort_code ? "border-red-500" : ""} />
                {bankErrors.bank_sort_code && <p className="text-xs text-red-500 mt-1">{bankErrors.bank_sort_code}</p>}
              </div>
              <div>
                <Input placeholder="Account number *" value={bankForm.bank_account_number || ""} onChange={e => setBankForm(p => ({ ...p, bank_account_number: e.target.value }))} className={bankErrors.bank_account_number ? "border-red-500" : ""} />
                {bankErrors.bank_account_number && <p className="text-xs text-red-500 mt-1">{bankErrors.bank_account_number}</p>}
              </div>
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
              !isReadOnly && <button onClick={startEditSolicitor} className="text-xs text-primary hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSolicitor} disabled={saving} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingSolicitor(false)}>Cancel</Button>
              </div>
            )}
          </div>
          {editingSolicitor ? (
            <div className="space-y-2">
              <div>
                <Input placeholder="Solicitor name *" value={solicitorForm.solicitor_name || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_name: e.target.value }))} className={solicitorErrors.solicitor_name ? "border-red-500" : ""} />
                {solicitorErrors.solicitor_name && <p className="text-xs text-red-500 mt-1">{solicitorErrors.solicitor_name}</p>}
              </div>
              <div>
                <Input placeholder="Law firm name *" value={solicitorForm.solicitor_firm || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_firm: e.target.value }))} className={solicitorErrors.solicitor_firm ? "border-red-500" : ""} />
                {solicitorErrors.solicitor_firm && <p className="text-xs text-red-500 mt-1">{solicitorErrors.solicitor_firm}</p>}
              </div>
              <div>
                <Input placeholder="Phone *" value={solicitorForm.solicitor_phone || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_phone: e.target.value }))} className={solicitorErrors.solicitor_phone ? "border-red-500" : ""} />
                {solicitorErrors.solicitor_phone && <p className="text-xs text-red-500 mt-1">{solicitorErrors.solicitor_phone}</p>}
              </div>
              <div>
                <Input placeholder="Email *" value={solicitorForm.solicitor_email || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_email: e.target.value }))} className={solicitorErrors.solicitor_email ? "border-red-500" : ""} />
                {solicitorErrors.solicitor_email && <p className="text-xs text-red-500 mt-1">{solicitorErrors.solicitor_email}</p>}
              </div>
              <div>
                <Input placeholder="Address *" value={solicitorForm.solicitor_address || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_address: e.target.value }))} className={solicitorErrors.solicitor_address ? "border-red-500" : ""} />
                {solicitorErrors.solicitor_address && <p className="text-xs text-red-500 mt-1">{solicitorErrors.solicitor_address}</p>}
              </div>
              <Input placeholder="Case reference number (optional)" value={solicitorForm.solicitor_case_ref || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_case_ref: e.target.value }))} />
              <Textarea rows={2} placeholder="Notes (optional)" value={solicitorForm.solicitor_notes || ""} onChange={e => setSolicitorForm(p => ({ ...p, solicitor_notes: e.target.value }))} />
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

export default function FinanceLegalTab(props) {
  const [activeSubTab, setActiveSubTab] = useState("benefits");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setActiveSubTab("benefits")}
          className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeSubTab === "benefits" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          Benefits
        </button>
        <button
          onClick={() => setActiveSubTab("legal")}
          className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeSubTab === "legal" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          Legal & Bank
        </button>
      </div>

      <div className="mt-4">
        {activeSubTab === "benefits" && <BenefitsTabMain {...props} />}
        {activeSubTab === "legal" && <LegalBankContent {...props} />}
      </div>
    </div>
  );
}