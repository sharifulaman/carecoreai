import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Info, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { addMonths, isBefore, parseISO } from "date-fns";

const CATEGORIES = [
  { value: "mileage", label: "Mileage" },
  { value: "food", label: "Food & Subsistence" },
  { value: "accommodation", label: "Accommodation" },
  { value: "equipment", label: "Equipment" },
  { value: "training", label: "Training Materials" },
  { value: "uniform", label: "Uniform / Clothing" },
  { value: "other", label: "Other" },
];

const HMRC_RATES = {
  car: { first10k: 0.45, above10k: 0.25 },
  motorcycle: { first10k: 0.24, above10k: 0.24 },
  bicycle: { first10k: 0.20, above10k: 0.20 },
};

function getTaxYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 4 ? { start: `${year}-04-06`, end: `${year + 1}-04-05` } : { start: `${year - 1}-04-06`, end: `${year}-04-05` };
}

export default function ExpenseForm({ myProfile, homes = [], allExpenses = [], onClose, onSubmit }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    expense_date: today,
    category: "other",
    description: "",
    amount: "",
    mileage_miles: "",
    mileage_rate: 0.45,
    vehicle_type: "car",
    home_id: myProfile?.home_ids?.[0] || "",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const taxYear = getTaxYear();

  // Cumulative mileage this tax year
  const taxYearMileage = allExpenses
    .filter(e =>
      e.staff_id === myProfile?.id &&
      e.category === "mileage" &&
      e.status !== "rejected" &&
      e.expense_date >= taxYear.start &&
      e.expense_date <= taxYear.end
    )
    .reduce((sum, e) => sum + (e.mileage_miles || 0), 0);

  // Auto-calculate mileage amount
  useEffect(() => {
    if (form.category !== "mileage" || !form.mileage_miles) return;
    const miles = parseFloat(form.mileage_miles) || 0;
    const rates = HMRC_RATES[form.vehicle_type] || HMRC_RATES.car;
    const existingMiles = taxYearMileage;
    let amount = 0;
    if (existingMiles >= 10000) {
      amount = miles * rates.above10k;
    } else if (existingMiles + miles > 10000) {
      const firstPart = 10000 - existingMiles;
      const secondPart = miles - firstPart;
      amount = firstPart * rates.first10k + secondPart * rates.above10k;
    } else {
      amount = miles * rates.first10k;
    }
    const rate = existingMiles >= 10000 ? rates.above10k : rates.first10k;
    setForm(f => ({ ...f, amount: parseFloat(amount.toFixed(2)), mileage_rate: rate }));
  }, [form.mileage_miles, form.vehicle_type, form.category, taxYearMileage]);

  const validate = () => {
    const e = {};
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.expense_date) e.expense_date = "Date is required";
    else {
      const threeMonthsAgo = addMonths(new Date(), -3).toISOString().split("T")[0];
      if (form.expense_date < threeMonthsAgo) e.expense_date = "Date cannot be more than 3 months ago";
    }
    const amount = parseFloat(form.amount) || 0;
    if (amount <= 0) e.amount = "Amount must be greater than £0";
    if (amount > 25 && !receiptFile) e.receipt = "Receipt required for amounts over £25";
    if (form.category === "mileage" && (!form.mileage_miles || parseFloat(form.mileage_miles) <= 0)) {
      e.mileage_miles = "Miles must be greater than 0";
    }
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setUploading(true);
    try {
      let receipt_url = "";
      if (receiptFile) {
        const res = await base44.integrations.Core.UploadFile({ file: receiptFile });
        receipt_url = res.file_url;
      }
      const home = homes.find(h => h.id === form.home_id);
      await onSubmit({
        org_id: ORG_ID,
        staff_id: myProfile.id,
        staff_name: myProfile.full_name,
        home_id: form.home_id,
        home_name: home?.name || "",
        expense_date: form.expense_date,
        category: form.category,
        description: form.description.trim(),
        amount: parseFloat(form.amount) || 0,
        mileage_miles: form.category === "mileage" ? parseFloat(form.mileage_miles) || 0 : undefined,
        mileage_rate: form.category === "mileage" ? form.mileage_rate : undefined,
        vehicle_type: form.category === "mileage" ? form.vehicle_type : undefined,
        receipt_url,
        notes: form.notes.trim(),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });
    } catch {
      toast.error("Failed to submit expense");
    }
    setUploading(false);
  };

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: undefined })); };
  const isMileage = form.category === "mileage";
  const miles = parseFloat(form.mileage_miles) || 0;
  const approaching = taxYearMileage + miles >= 9000 && taxYearMileage < 10000;
  const rateCurrent = taxYearMileage >= 10000 ? HMRC_RATES[form.vehicle_type]?.above10k : HMRC_RATES[form.vehicle_type]?.first10k;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold">Submit Expense Claim</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Date *</label>
            <Input type="date" className="mt-1" value={form.expense_date} onChange={e => set("expense_date", e.target.value)} max={today} />
            {errors.expense_date && <p className="text-xs text-red-500 mt-1">{errors.expense_date}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category *</label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Mileage fields */}
          {isMileage && (
            <div className="space-y-3 bg-blue-50/50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-800">HMRC Mileage Calculator</p>

              {/* Cumulative mileage display */}
              <div className="text-xs text-muted-foreground bg-white rounded p-2 border border-blue-100">
                Total mileage claimed this tax year: <strong>{taxYearMileage.toFixed(1)} miles</strong>
                {" "}(rate: <strong>{rateCurrent !== undefined ? `${(rateCurrent * 100).toFixed(0)}p` : "—"}/mile</strong>)
              </div>

              {approaching && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>You are approaching the 10,000 mile threshold. Rate will change to 25p/mile after this point.</span>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Vehicle Type</label>
                <Select value={form.vehicle_type} onValueChange={v => set("vehicle_type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car / Van (45p → 25p/mile)</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle (24p/mile)</SelectItem>
                    <SelectItem value="bicycle">Bicycle (20p/mile)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Miles *</label>
                <Input type="number" min="0" step="0.1" className="mt-1" placeholder="e.g. 23.5"
                  value={form.mileage_miles} onChange={e => set("mileage_miles", e.target.value)} />
                {errors.mileage_miles && <p className="text-xs text-red-500 mt-1">{errors.mileage_miles}</p>}
              </div>

              {form.amount > 0 && (
                <div className="text-sm font-semibold text-blue-800">
                  Calculated amount: £{parseFloat(form.amount).toFixed(2)}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({form.mileage_miles} miles × {(form.mileage_rate * 100).toFixed(0)}p)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Amount — hidden for mileage (auto-calculated) */}
          {!isMileage && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount (£) *</label>
              <Input type="number" min="0" step="0.01" className="mt-1" placeholder="0.00"
                value={form.amount} onChange={e => set("amount", e.target.value)} />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description *</label>
            <Input className="mt-1" placeholder="Brief description of the expense…"
              value={form.description} onChange={e => set("description", e.target.value)} />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Home */}
          {homes.length > 1 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Home / Location</label>
              <Select value={form.home_id} onValueChange={v => set("home_id", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select home…" /></SelectTrigger>
                <SelectContent>
                  {homes.filter(h => (myProfile?.home_ids || []).includes(h.id)).map(h =>
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Receipt upload */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Receipt {parseFloat(form.amount) > 25 ? <span className="text-red-500">*</span> : "(optional)"}
            </label>
            <div
              className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                errors.receipt ? "border-red-400 bg-red-50" : "border-border hover:border-primary"
              }`}
              onClick={() => document.getElementById("expense-receipt-input").click()}
            >
              {receiptFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                  <Upload className="w-4 h-4" /> {receiptFile.name}
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-5 h-5 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">Click to upload receipt (PDF, image)</p>
                </div>
              )}
              <input id="expense-receipt-input" type="file" accept=".pdf,image/*" className="hidden"
                onChange={e => { setReceiptFile(e.target.files?.[0] || null); setErrors(er => ({ ...er, receipt: undefined })); }} />
            </div>
            {errors.receipt && <p className="text-xs text-red-500 mt-1">{errors.receipt}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm min-h-[64px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Any additional context…"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Expense claims are reimbursements and are non-taxable. Approved expenses will be included in your next payslip.</span>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={uploading}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : "Submit Expense"}
          </Button>
        </div>
      </div>
    </div>
  );
}