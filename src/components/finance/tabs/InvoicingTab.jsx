import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { fmtGBP } from "@/lib/ukLocalAuthorities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, CheckCircle, Download, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

const STATUS_COLOURS = {
  draft: "bg-slate-100 text-slate-600", sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700",
  disputed: "bg-amber-100 text-amber-700", cancelled: "bg-slate-100 text-slate-400",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function InvoicingTab({ invoices, placements, homes, residents, visibleHomes, visibleHomeIds, visibleInvoices, isAdmin, isSW }) {
  const qc = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHome, setFilterHome] = useState("all");
  const [search, setSearch] = useState("");
  const [markingPaid, setMarkingPaid] = useState(null);
  const [paidForm, setPaidForm] = useState({ paid_date: new Date().toISOString().split("T")[0], paid_amount: "", notes: "" });

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));
  const placementMap = Object.fromEntries(placements.map(p => [p.id, p]));

  // Auto-mark overdue
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    visibleInvoices.forEach(async inv => {
      if (inv.status === "sent" && inv.invoice_date && inv.payment_terms) {
        const dueDate = new Date(inv.invoice_date);
        dueDate.setDate(dueDate.getDate() + (inv.payment_terms || 30));
        if (dueDate.toISOString().split("T")[0] < today) {
          await secureGateway.update("PlacementInvoice", inv.id, { status: "overdue" });
        }
      }
    });
  }, [visibleInvoices.length]);

  const filtered = useMemo(() => visibleInvoices.filter(inv => {
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterHome !== "all" && inv.home_id !== filterHome) return false;
    if (search) {
      const res = residentMap[inv.resident_id];
      const num = (inv.invoice_number || "").toLowerCase();
      if (!num.includes(search.toLowerCase()) && !res?.display_name?.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  }), [visibleInvoices, filterStatus, filterHome, search]);

  // Status summary bar
  const statuses = ["draft","sent","paid","overdue","disputed"];
  const summary = Object.fromEntries(statuses.map(s => [s, { count: 0, total: 0 }]));
  visibleInvoices.forEach(inv => {
    if (summary[inv.status]) { summary[inv.status].count++; summary[inv.status].total += inv.total_amount || 0; }
  });

  const handleMarkPaid = async (inv) => {
    await secureGateway.update("PlacementInvoice", inv.id, {
      status: "paid", paid_date: paidForm.paid_date, paid_amount: parseFloat(paidForm.paid_amount) || inv.total_amount,
      notes: paidForm.notes,
    });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    toast.success("Invoice marked as paid");
    setMarkingPaid(null);
  };

  const exportCSV = () => {
    const rows = [["ContactName","InvoiceNumber","InvoiceDate","DueDate","Description","Quantity","UnitAmount","AccountCode"]];
    filtered.forEach(inv => {
      const dueDate = inv.invoice_date ? format(new Date(new Date(inv.invoice_date).setDate(new Date(inv.invoice_date).getDate() + (inv.payment_terms || 30))), "dd/MM/yyyy") : "";
      const res = residentMap[inv.resident_id];
      rows.push([inv.local_authority || "", inv.invoice_number || "", inv.invoice_date || "", dueDate,
        `Residential Placement - ${res?.initials || "YP"}`, inv.days_in_period || 1, inv.daily_rate || inv.total_amount || 0, "4000"]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "invoices_xero.csv"; a.click();
  };

  return (
    <div className="space-y-5">
      {/* Status Summary Bar */}
      <div className="grid grid-cols-5 gap-3">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(s === filterStatus ? "all" : s)}
            className={`rounded-xl border p-3 text-left transition-all ${filterStatus === s ? "ring-2 ring-primary" : "hover:border-primary/30"}`}>
            <p className="text-xs text-muted-foreground capitalize">{s}</p>
            <p className="text-lg font-bold mt-0.5">{summary[s].count}</p>
            <p className="text-xs text-muted-foreground">{fmtGBP(summary[s].total)}</p>
          </button>
        ))}
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search invoice or resident…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
        <Select value={filterHome} onValueChange={setFilterHome}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Homes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {visibleHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1"><Download className="w-3.5 h-3.5" /> Export CSV</Button>
          {!isSW && <Button size="sm" onClick={() => setShowGenerate(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Generate Invoice</Button>}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs">
              <th className="text-left px-4 py-3 font-semibold">Invoice No.</th>
              <th className="text-left px-4 py-3 font-semibold">Resident</th>
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">Local Authority</th>
              <th className="text-left px-4 py-3 font-semibold">Period</th>
              <th className="text-right px-4 py-3 font-semibold">Days</th>
              <th className="text-right px-4 py-3 font-semibold">Daily Rate</th>
              <th className="text-right px-4 py-3 font-semibold">Total</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="py-10 text-center text-muted-foreground">No invoices found</td></tr>
            ) : filtered.map(inv => {
              const res = residentMap[inv.resident_id];
              const home = homeMap[inv.home_id];
              return (
                <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {res?.initials || "?"}
                      </div>
                      {res?.display_name || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{home?.name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{inv.local_authority || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {inv.period_from && inv.period_to ? `${format(new Date(inv.period_from), "d MMM")} – ${format(new Date(inv.period_to), "d MMM yyyy")}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">{inv.days_in_period || "—"}</td>
                  <td className="px-4 py-3 text-right text-xs">{fmtGBP(inv.daily_rate || 0)}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtGBP(inv.total_amount || 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[inv.status] || ""}`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <button onClick={() => { setMarkingPaid(inv); setPaidForm({ paid_date: new Date().toISOString().split("T")[0], paid_amount: String(inv.total_amount), notes: "" }); }}
                          className="text-xs text-green-600 hover:underline flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Paid</button>
                      )}
                      {inv.status === "draft" && (
                        <button onClick={async () => { await secureGateway.update("PlacementInvoice", inv.id, { status: "sent", sent_date: new Date().toISOString().split("T")[0] }); qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Marked as sent"); }}
                          className="text-xs text-blue-600 hover:underline">Send</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mark Paid Modal */}
      {markingPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Mark as Paid</h3>
              <button onClick={() => setMarkingPaid(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs font-medium">Paid Date</label>
              <Input type="date" value={paidForm.paid_date} onChange={e => setPaidForm(f => ({ ...f, paid_date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Amount Paid (£)</label>
              <Input type="number" value={paidForm.paid_amount} onChange={e => setPaidForm(f => ({ ...f, paid_amount: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <Input value={paidForm.notes} onChange={e => setPaidForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleMarkPaid(markingPaid)}>Confirm Payment</Button>
              <Button variant="outline" onClick={() => setMarkingPaid(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Panel */}
      {showGenerate && (
        <GenerateInvoicePanel placements={placements} homes={homes} residents={residents}
          onClose={() => { setShowGenerate(false); qc.invalidateQueries({ queryKey: ["invoices"] }); }} />
      )}
    </div>
  );
}

function GenerateInvoicePanel({ placements, homes, residents, onClose }) {
  const qc = useQueryClient();
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [periodFrom, setPeriodFrom] = useState(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
  const [periodTo, setPeriodTo] = useState(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));
  const activeFees = placements.filter(p => p.status === "active");

  const selectedFee = activeFees.find(p => p.id === selectedFeeId);
  const from = new Date(periodFrom);
  const to = new Date(periodTo);
  const days = selectedFeeId ? Math.max(1, differenceInDays(to, from) + 1) : 0;
  const daily = selectedFee ? (selectedFee.weekly_rate || 0) / 7 : 0;
  const subtotal = daily * days;
  const invNum = `INV-${format(now, "yyyy")}-${format(now, "MM")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const handleSave = async (status = "draft") => {
    if (!selectedFee) { toast.error("Select a placement fee"); return; }
    setSaving(true);
    const res = residentMap[selectedFee.resident_id];
    await secureGateway.create("PlacementInvoice", {
      placement_fee_id: selectedFee.id,
      resident_id: selectedFee.resident_id,
      home_id: selectedFee.home_id,
      local_authority: selectedFee.local_authority,
      social_worker_name: selectedFee.social_worker_name || selectedFee.la_contact_name || "",
      invoice_number: invNum,
      invoice_date: format(now, "yyyy-MM-dd"),
      period_from: periodFrom, period_to: periodTo,
      days_in_period: days,
      daily_rate: daily,
      subtotal: subtotal,
      vat_amount: 0,
      total_amount: subtotal,
      status,
      payment_terms: selectedFee.payment_terms || 30,
      la_reference: selectedFee.la_reference || "",
    });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    toast.success(`Invoice ${status === "draft" ? "saved as draft" : "generated and sent"}`);
    setSaving(false);
    onClose();
  };

  const res = selectedFee ? residentMap[selectedFee.resident_id] : null;
  const home = selectedFee ? homeMap[selectedFee.home_id] : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">Generate Invoice</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Step 1 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Select Placement</p>
            <Select value={selectedFeeId} onValueChange={setSelectedFeeId}>
              <SelectTrigger><SelectValue placeholder="Select active placement fee…" /></SelectTrigger>
              <SelectContent>
                {activeFees.map(p => {
                  const r = residentMap[p.resident_id]; const h = homeMap[p.home_id];
                  return <SelectItem key={p.id} value={p.id}>{r?.display_name} — {h?.name} — {p.local_authority} — {fmtGBP(p.weekly_rate || 0)}/wk</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Invoice Period</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">Period From</label><Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="mt-1" /></div>
              <div><label className="text-xs font-medium">Period To</label><Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="mt-1" /></div>
            </div>
            {selectedFee && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Days in period:</span> <strong>{days} days</strong></p>
                <p><span className="text-muted-foreground">Daily rate:</span> <strong>{fmtGBP(daily)}/day</strong> <span className="text-muted-foreground text-xs">(£{selectedFee.weekly_rate?.toFixed(2)}/wk ÷ 7)</span></p>
                <p><span className="text-muted-foreground">Subtotal:</span> <strong>{fmtGBP(subtotal)}</strong></p>
                <p className="text-xs text-muted-foreground">VAT: £0.00 (Care placements are VAT exempt)</p>
                <div className="border-t border-border mt-2 pt-2">
                  <p className="text-lg font-bold text-primary">Total: {fmtGBP(subtotal)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedFee && preview && (
            <div className="border border-border rounded-xl p-5 font-mono text-xs space-y-3 bg-white">
              <div className="flex justify-between items-start">
                <div><p className="text-base font-bold not-italic">INVOICE</p><p className="text-muted-foreground">{invNum}</p></div>
                <div className="text-right not-italic">
                  <p className="font-semibold text-sm">Invoice No: {invNum}</p>
                  <p>Date: {format(now, "d MMM yyyy")}</p>
                  <p>Period: {format(new Date(periodFrom), "d MMM")} – {format(new Date(periodTo), "d MMM yyyy")}</p>
                  <p>Terms: {selectedFee.payment_terms || 30} days</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 not-italic">
                <div><p className="font-semibold">Bill To:</p><p>{selectedFee.local_authority}</p><p>{selectedFee.la_email}</p></div>
                <div>
                  <p><span className="text-muted-foreground">Young Person:</span> {res?.initials || "YP"}</p>
                  <p><span className="text-muted-foreground">Home:</span> {home?.name}</p>
                  {selectedFee.social_worker_name && <p><span className="text-muted-foreground">Social Worker:</span> {selectedFee.social_worker_name}</p>}
                  {selectedFee.la_reference && <p><span className="text-muted-foreground">LA Ref:</span> {selectedFee.la_reference}</p>}
                </div>
              </div>
              <table className="w-full border-t border-border pt-2">
                <thead><tr className="text-left border-b border-border"><th>Description</th><th className="text-center">Days</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  <tr><td>Residential Placement</td><td className="text-center">{days}</td><td className="text-right">{fmtGBP(daily)}</td><td className="text-right">{fmtGBP(subtotal)}</td></tr>
                </tbody>
              </table>
              <div className="text-right border-t border-border pt-2 not-italic space-y-0.5">
                <p>Subtotal: {fmtGBP(subtotal)}</p>
                <p>VAT (0% — Exempt): £0.00</p>
                <p className="text-base font-bold">TOTAL: {fmtGBP(subtotal)}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-between gap-2 p-5 border-t border-border">
          <Button variant="outline" onClick={() => setPreview(p => !p)}><FileText className="w-4 h-4 mr-1" /> {preview ? "Hide" : "Preview"}</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>Save as Draft</Button>
            <Button onClick={() => handleSave("sent")} disabled={saving}>{saving ? "Saving…" : "Save & Send"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}