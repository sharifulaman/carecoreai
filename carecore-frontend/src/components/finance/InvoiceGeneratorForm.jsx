import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { PROPERTY_TYPE_LABELS, getMonthBounds } from "@/lib/ukLocalAuthorities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function InvoiceGeneratorForm({ lockedHomeId, onClose }) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedHomeId, setSelectedHomeId] = useState(lockedHomeId || "");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [step, setStep] = useState(lockedHomeId ? 2 : 1);
  const [checked, setChecked] = useState({});
  const [additionalItems, setAdditionalItems] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);

  const { from, to, days } = getMonthBounds(selectedYear, selectedMonth);

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-active"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: "active" }),
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["placement-fees-home", selectedHomeId],
    queryFn: () => base44.entities.PlacementFee.filter({ org_id: ORG_ID, home_id: selectedHomeId, status: "active" }),
    enabled: !!selectedHomeId,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-home", selectedHomeId],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, home_id: selectedHomeId, status: "active" }),
    enabled: !!selectedHomeId,
  });

  const { data: existingInvoices = [] } = useQuery({
    queryKey: ["invoices-home", selectedHomeId],
    queryFn: () => base44.entities.PlacementInvoice.filter({ org_id: ORG_ID, home_id: selectedHomeId }),
    enabled: !!selectedHomeId,
  });

  // Init checked state when fees load
  useMemo(() => {
    const init = {};
    fees.forEach(f => { init[f.id] = true; });
    setChecked(init);
  }, [fees.length]);

  const alreadyInvoiced = (fee) => existingInvoices.some(inv =>
    inv.resident_id === fee.resident_id &&
    inv.period_from === from &&
    inv.period_to === to &&
    inv.status !== "void"
  );

  const dailyRate = (fee) => (fee.weekly_rate * 52) / 365;
  const amountDue = (fee) => dailyRate(fee) * days;
  const extraItems = (feeId) => additionalItems[feeId] || [];
  const totalAmount = (fee) => amountDue(fee) + extraItems(fee.id).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const tickedFees = fees.filter(f => checked[f.id] && !alreadyInvoiced(f));
  const grandTotal = tickedFees.reduce((s, f) => s + totalAmount(f), 0);

  const addItem = (feeId) => {
    setAdditionalItems(prev => ({ ...prev, [feeId]: [...(prev[feeId] || []), { description: "", amount: "" }] }));
  };
  const removeItem = (feeId, idx) => {
    setAdditionalItems(prev => ({ ...prev, [feeId]: prev[feeId].filter((_, i) => i !== idx) }));
  };
  const updateItem = (feeId, idx, field, value) => {
    setAdditionalItems(prev => {
      const items = [...(prev[feeId] || [])];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, [feeId]: items };
    });
  };

  const generate = async () => {
    setGenerating(true);
    const results = [];
    let seq = 1;
    const monthStr = String(selectedMonth + 1).padStart(2, "0");

    for (const fee of tickedFees) {
      const invNum = `INV-${selectedYear}-${monthStr}-${String(seq++).padStart(4, "0")}`;
      const additionals = extraItems(fee.id).filter(i => i.description && i.amount);
      const inv = await base44.entities.PlacementInvoice.create({
        org_id: ORG_ID,
        placement_fee_id: fee.id,
        resident_id: fee.resident_id,
        home_id: fee.home_id,
        local_authority: fee.local_authority,
        invoice_number: invNum,
        invoice_date: new Date().toISOString().split("T")[0],
        period_from: from,
        period_to: to,
        days_in_period: days,
        daily_rate: dailyRate(fee),
        amount_due: amountDue(fee),
        additional_items: additionals,
        total_amount: totalAmount(fee),
        status: "draft",
        generated_by: "system",
      });
      results.push({ ...inv, invNum, total: totalAmount(fee) });
    }
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    setGenerated(results);
    setGenerating(false);
    toast.success(`${results.length} invoice${results.length !== 1 ? "s" : ""} generated`);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-base">Generate Invoices</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {generated ? (
          <div className="p-5 space-y-3">
            <p className="text-green-600 font-medium">{generated.length} invoice{generated.length !== 1 ? "s" : ""} created</p>
            {generated.map((inv, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-border/50 pb-2">
                <span className="font-mono">{inv.invoice_number || `INV-${i}`}</span>
                <span className="font-medium">£{(inv.total_amount || inv.total || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <Button className="w-full mt-2" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Step 1 */}
            {!lockedHomeId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Property</label>
                <Select value={selectedHomeId} onValueChange={v => { setSelectedHomeId(v); setStep(2); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select property…" /></SelectTrigger>
                  <SelectContent>{homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Month</label>
                <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Year</label>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 2 — fee table */}
            {step === 2 && fees.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Period: {from} to {to} ({days} days)</p>
                {fees.map(fee => {
                  const res = residents.find(r => r.id === fee.resident_id);
                  const already = alreadyInvoiced(fee);
                  return (
                    <div key={fee.id} className={`border rounded-xl p-3 ${already ? "opacity-50 bg-muted/20" : "border-border bg-card"}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={!!checked[fee.id] && !already}
                          disabled={already}
                          onChange={e => setChecked(prev => ({ ...prev, [fee.id]: e.target.checked }))}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">{res?.display_name || "Unknown"}</p>
                            <p className="text-sm font-medium">£{totalAmount(fee).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{fee.local_authority} · Monthly equiv £{(fee.monthly_equivalent||0).toLocaleString()}</p>
                          {already && <p className="text-xs text-amber-600 mt-1">Already invoiced</p>}
                          {!already && checked[fee.id] && (
                            <div className="mt-2 space-y-1">
                              {extraItems(fee.id).map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <Input className="h-7 text-xs flex-1" placeholder="Description" value={item.description} onChange={e => updateItem(fee.id, idx, "description", e.target.value)} />
                                  <Input className="h-7 text-xs w-24" placeholder="£ Amount" type="number" value={item.amount} onChange={e => updateItem(fee.id, idx, "amount", e.target.value)} />
                                  <button onClick={() => removeItem(fee.id, idx)}><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                                </div>
                              ))}
                              <button onClick={() => addItem(fee.id)} className="text-xs text-primary flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add item
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-border pt-3 flex justify-between text-sm font-semibold">
                  <span>{tickedFees.length} invoices</span>
                  <span>Total: £{grandTotal.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {step === 2 && fees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active placement fees for this home</p>
            )}
          </div>
        )}

        {!generated && (
          <div className="flex justify-end gap-2 p-5 border-t border-border sticky bottom-0 bg-card">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {step === 2 && tickedFees.length > 0 && (
              <Button onClick={generate} disabled={generating}>
                {generating ? "Generating…" : `Generate ${tickedFees.length} Draft Invoice${tickedFees.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}