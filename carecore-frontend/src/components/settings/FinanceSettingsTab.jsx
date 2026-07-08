import { useState, useEffect } from "react";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FinanceSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Budget thresholds
  const [budgetWarningThreshold, setBudgetWarningThreshold] = useState(20);
  const [budgetCriticalThreshold, setBudgetCriticalThreshold] = useState(40);
  const [budgetPeriodDefault, setBudgetPeriodDefault] = useState("annual");

  // Invoice settings
  const [defaultInvoiceDay, setDefaultInvoiceDay] = useState(1);
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState(30);
  const [invoiceOverdueDays, setInvoiceOverdueDays] = useState(30);
  const [invoiceOverdueEscalationDays, setInvoiceOverdueEscalationDays] = useState(60);

  // Petty cash limits
  const [pettyCashLimit, setPettyCashLimit] = useState(200);
  const [pettyCashSingleLimit, setPettyCashSingleLimit] = useState(50);
  const [pettyCashReceiptThreshold, setPettyCashReceiptThreshold] = useState(10);

  useEffect(() => {
    (async () => {
      try {
        setBudgetWarningThreshold(await getSetting("budget_warning_threshold", 20));
        setBudgetCriticalThreshold(await getSetting("budget_critical_threshold", 40));
        setBudgetPeriodDefault(await getSetting("budget_period_default", "annual"));
        setDefaultInvoiceDay(await getSetting("default_invoice_day", 1));
        setInvoicePaymentTerms(await getSetting("invoice_payment_terms", 30));
        setInvoiceOverdueDays(await getSetting("invoice_overdue_days", 30));
        setInvoiceOverdueEscalationDays(await getSetting("invoice_overdue_escalation_days", 60));
        setPettyCashLimit(await getSetting("petty_cash_limit", 200));
        setPettyCashSingleLimit(await getSetting("petty_cash_single_limit", 50));
        setPettyCashReceiptThreshold(await getSetting("petty_cash_receipt_threshold", 10));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (budgetCriticalThreshold <= budgetWarningThreshold) {
      toast.error("Critical threshold must be higher than warning threshold");
      return;
    }
    if (invoiceOverdueEscalationDays <= invoiceOverdueDays) {
      toast.error("Escalation days must be greater than overdue days");
      return;
    }
    try {
      setSaving(true);
      await saveSettings({
        budget_warning_threshold: budgetWarningThreshold,
        budget_critical_threshold: budgetCriticalThreshold,
        budget_period_default: budgetPeriodDefault,
        default_invoice_day: defaultInvoiceDay,
        invoice_payment_terms: invoicePaymentTerms,
        invoice_overdue_days: invoiceOverdueDays,
        invoice_overdue_escalation_days: invoiceOverdueEscalationDays,
        petty_cash_limit: pettyCashLimit,
        petty_cash_single_limit: pettyCashSingleLimit,
        petty_cash_receipt_threshold: pettyCashReceiptThreshold,
      });
      clearSettingsCache();
      toast.success("Finance settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Finance Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure budget thresholds, invoice rules, and petty cash limits.</p>
      </div>

      {/* Budget Thresholds */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Budget Thresholds</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default budget period</label>
            <select value={budgetPeriodDefault} onChange={e => setBudgetPeriodDefault(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm">
              <option value="annual">Annual</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Warning level (% over budget)</label>
            <input type="number" value={budgetWarningThreshold} onChange={e => setBudgetWarningThreshold(parseInt(e.target.value) || 20)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Critical level (% over budget)</label>
            <input type="number" value={budgetCriticalThreshold} onChange={e => setBudgetCriticalThreshold(parseInt(e.target.value) || 40)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
            {budgetCriticalThreshold <= budgetWarningThreshold && <p className="text-xs text-red-600">Must be higher than warning threshold</p>}
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Invoice Settings</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default invoice day of month (1–28)</label>
            <input type="number" min="1" max="28" value={defaultInvoiceDay} onChange={e => setDefaultInvoiceDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payment terms (days)</label>
            <input type="number" value={invoicePaymentTerms} onChange={e => setInvoicePaymentTerms(parseInt(e.target.value) || 30)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mark overdue after (days)</label>
            <input type="number" value={invoiceOverdueDays} onChange={e => setInvoiceOverdueDays(parseInt(e.target.value) || 30)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Escalation alert after (days)</label>
            <input type="number" value={invoiceOverdueEscalationDays} onChange={e => setInvoiceOverdueEscalationDays(parseInt(e.target.value) || 60)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
            {invoiceOverdueEscalationDays <= invoiceOverdueDays && <p className="text-xs text-red-600">Must be greater than overdue days</p>}
          </div>
        </div>
      </div>

      {/* Petty Cash Limits */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Petty Cash Limits</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Maximum petty cash float (£)</label>
            <input type="number" step="0.01" value={pettyCashLimit} onChange={e => setPettyCashLimit(parseFloat(e.target.value) || 200)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Maximum single transaction (£)</label>
            <input type="number" step="0.01" value={pettyCashSingleLimit} onChange={e => setPettyCashSingleLimit(parseFloat(e.target.value) || 50)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Require receipt above (£)</label>
            <input type="number" step="0.01" value={pettyCashReceiptThreshold} onChange={e => setPettyCashReceiptThreshold(parseFloat(e.target.value) || 10)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving…" : "Save Finance Settings"}
      </Button>
    </div>
  );
}