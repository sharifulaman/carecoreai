import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Pencil, PoundSterling } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const METHODS = { cash: "Cash", bank_transfer: "Bank Transfer", voucher: "Voucher" };
const INDEPENDENCE = { fully_managed: "Fully Managed", partially_managed: "Partially Managed", self_managed: "Self Managed" };

export default function ResidentAllowanceTab({ homeId, currentUser }) {
  const queryClient = useQueryClient();
  const [editModal, setEditModal] = useState(null); // resident
  const [payModal, setPayModal] = useState(null); // { resident, allowance }
  const [editForm, setEditForm] = useState({});
  const [payForm, setPayForm] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-home", homeId],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, home_id: homeId, status: "active" }),
  });

  const { data: allowances = [] } = useQuery({
    queryKey: ["allowances-home", homeId],
    queryFn: () => base44.entities.ResidentAllowance.filter({ org_id: ORG_ID, home_id: homeId, active: true }),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["allowance-payments-home", homeId],
    queryFn: () => base44.entities.ResidentAllowancePayment.filter({ org_id: ORG_ID, home_id: homeId }, "-payment_date", 100),
  });

  const getAllowance = (residentId) => allowances.find(a => a.resident_id === residentId);
  const getLastPayment = (residentId) => payments.filter(p => p.resident_id === residentId).sort((a,b) => b.payment_date?.localeCompare(a.payment_date))[0];

  const openEdit = (resident) => {
    const existing = getAllowance(resident.id);
    setEditForm(existing ? {
      weekly_amount: existing.weekly_amount,
      payment_day: existing.payment_day,
      payment_method: existing.payment_method,
      independence_level: existing.independence_level,
      notes: existing.notes || "",
      _id: existing.id,
    } : {
      weekly_amount: "",
      payment_day: "monday",
      payment_method: "cash",
      independence_level: "fully_managed",
      notes: "",
    });
    setEditModal(resident);
  };

  const openPay = (resident) => {
    const allowance = getAllowance(resident.id);
    setPayForm({
      amount: allowance?.weekly_amount || "",
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: allowance?.payment_method || "cash",
      resident_acknowledged: false,
      notes: "",
      reason_for_variance: "",
    });
    setPayModal({ resident, allowance });
  };

  const saveAllowance = async () => {
    if (!editForm.weekly_amount || parseFloat(editForm.weekly_amount) <= 0) { toast.error("Enter a valid weekly amount"); return; }
    setSaving(true);
    const data = {
      org_id: ORG_ID,
      resident_id: editModal.id,
      home_id: homeId,
      weekly_amount: parseFloat(editForm.weekly_amount),
      payment_day: editForm.payment_day,
      payment_method: editForm.payment_method,
      independence_level: editForm.independence_level,
      notes: editForm.notes,
      active: true,
      created_by: "system",
    };
    if (editForm._id) {
      await base44.entities.ResidentAllowance.update(editForm._id, data);
    } else {
      await base44.entities.ResidentAllowance.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["allowances-home", homeId] });
    toast.success("Allowance saved");
    setEditModal(null);
    setSaving(false);
  };

  const savePayment = async () => {
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    const scheduled = payModal.allowance?.weekly_amount;
    if (scheduled && Math.abs(amount - scheduled) > 0.01 && !payForm.reason_for_variance) {
      toast.error("Reason for variance required"); return;
    }
    setSaving(true);
    await base44.entities.ResidentAllowancePayment.create({
      org_id: ORG_ID,
      allowance_id: payModal.allowance?.id || null,
      resident_id: payModal.resident.id,
      home_id: homeId,
      amount,
      payment_date: payForm.payment_date,
      payment_method: payForm.payment_method,
      reason_for_variance: payForm.reason_for_variance || null,
      paid_by: "system",
      resident_acknowledged: payForm.resident_acknowledged,
      notes: payForm.notes,
    });
    queryClient.invalidateQueries({ queryKey: ["allowance-payments-home", homeId] });
    toast.success("Payment recorded");
    setPayModal(null);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-xs font-semibold">Resident</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Weekly Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Last Payment</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Method</th>
              <th className="text-right px-4 py-3 text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {residents.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No active residents</td></tr>
            ) : residents.map(r => {
              const allowance = getAllowance(r.id);
              const lastPay = getLastPayment(r.id);
              return (
                <tr key={r.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{r.display_name}</td>
                  <td className="px-4 py-3">{allowance ? `£${allowance.weekly_amount?.toFixed(2)}/wk` : <span className="text-muted-foreground">Not set</span>}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{lastPay?.payment_date || "—"}</td>
                  <td className="px-4 py-3 text-xs">{allowance ? METHODS[allowance.payment_method] : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openEdit(r)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      {allowance && (
                        <Button size="sm" className="text-xs h-7" onClick={() => openPay(r)}>
                          <PoundSterling className="w-3 h-3 mr-1" /> Pay
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold">Edit Allowance — {editModal.display_name}</h3>
              <button onClick={() => setEditModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Weekly Amount (£) *</label>
                <Input className="mt-1" type="number" step="0.01" inputMode="decimal" value={editForm.weekly_amount} onChange={e => setEditForm(f => ({ ...f, weekly_amount: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Payment Day</label>
                  <Select value={editForm.payment_day} onValueChange={v => setEditForm(f => ({ ...f, payment_day: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase()+d.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Payment Method</label>
                  <Select value={editForm.payment_method} onValueChange={v => setEditForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(METHODS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Independence Level</label>
                <Select value={editForm.independence_level} onValueChange={v => setEditForm(f => ({ ...f, independence_level: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(INDEPENDENCE).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Input className="mt-1" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button onClick={saveAllowance} disabled={saving}>{saving ? "Saving…" : "Save Allowance"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold">Record Payment — {payModal.resident.display_name}</h3>
              <button onClick={() => setPayModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              {payModal.allowance && (
                <p className="text-sm text-muted-foreground">Scheduled: <span className="font-medium text-foreground">£{payModal.allowance.weekly_amount?.toFixed(2)}/wk</span></p>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Amount Paid (£) *</label>
                <Input className="mt-1" type="number" step="0.01" inputMode="decimal" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              {payModal.allowance && Math.abs(parseFloat(payForm.amount) - payModal.allowance.weekly_amount) > 0.01 && (
                <div>
                  <label className="text-xs text-muted-foreground text-amber-600">Reason for Variance *</label>
                  <Input className="mt-1" value={payForm.reason_for_variance} onChange={e => setPayForm(f => ({ ...f, reason_for_variance: e.target.value }))} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Payment Date *</label>
                  <Input className="mt-1" type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Method</label>
                  <Select value={payForm.payment_method} onValueChange={v => setPayForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(METHODS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={payForm.resident_acknowledged} onChange={e => setPayForm(f => ({ ...f, resident_acknowledged: e.target.checked }))} />
                Resident acknowledged receipt
              </label>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Input className="mt-1" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <Button variant="outline" onClick={() => setPayModal(null)}>Cancel</Button>
              <Button onClick={savePayment} disabled={saving}>{saving ? "Saving…" : "Record Payment"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}