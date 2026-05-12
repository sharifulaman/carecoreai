import { useState, useEffect } from "react";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FinancialRulesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Section 1 — Placement Fees
  const [defaultWeeklyRate, setDefaultWeeklyRate] = useState('');
  const [rateBasis, setRateBasis] = useState('7_day');
  const [defaultInvoiceDay, setDefaultInvoiceDay] = useState(1);
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState(30);
  const [feeReviewReminderDays, setFeeReviewReminderDays] = useState(30);
  const [invoiceOverdueDays, setInvoiceOverdueDays] = useState(30);
  const [invoiceOverdueEscalationDays, setInvoiceOverdueEscalationDays] = useState(60);

  // Section 2 — Budget Controls
  const [budgetPeriodDefault, setBudgetPeriodDefault] = useState('annual');
  const [budgetWarningThreshold, setBudgetWarningThreshold] = useState(20);
  const [budgetCriticalThreshold, setBudgetCriticalThreshold] = useState(40);
  const [autoCreateBudget, setAutoCreateBudget] = useState(false);

  // Section 3 — Expenses and Mileage
  const [mileageRate, setMileageRate] = useState(0.450);
  const [expenseApprovalThreshold, setExpenseApprovalThreshold] = useState(50.00);
  const [expenseReceiptThreshold, setExpenseReceiptThreshold] = useState(10.00);

  // Section 4 — Resident Finances
  const [defaultWeeklyAllowance, setDefaultWeeklyAllowance] = useState('');
  const [defaultAllowanceDay, setDefaultAllowanceDay] = useState('friday');
  const [savingsTrackingEnabled, setSavingsTrackingEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setDefaultWeeklyRate(await getSetting('default_weekly_rate', ''));
      setRateBasis(await getSetting('invoice_rate_basis', '7_day'));
      setDefaultInvoiceDay(await getSetting('default_invoice_day', 1));
      setInvoicePaymentTerms(await getSetting('invoice_payment_terms', 30));
      setFeeReviewReminderDays(await getSetting('fee_review_reminder_days', 30));
      setInvoiceOverdueDays(await getSetting('invoice_overdue_days', 30));
      setInvoiceOverdueEscalationDays(await getSetting('invoice_overdue_escalation_days', 60));
      setBudgetPeriodDefault(await getSetting('budget_period_default', 'annual'));
      setBudgetWarningThreshold(await getSetting('budget_warning_threshold', 20));
      setBudgetCriticalThreshold(await getSetting('budget_critical_threshold', 40));
      setAutoCreateBudget(await getSetting('auto_create_budget', false));
      setMileageRate(await getSetting('mileage_rate', 0.450));
      setExpenseApprovalThreshold(await getSetting('expense_approval_threshold', 50.00));
      setExpenseReceiptThreshold(await getSetting('expense_receipt_threshold', 10.00));
      setDefaultWeeklyAllowance(await getSetting('default_weekly_allowance', ''));
      setDefaultAllowanceDay(await getSetting('default_allowance_day', 'friday'));
      setSavingsTrackingEnabled(await getSetting('savings_tracking_enabled', true));
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = () => {
    if (invoiceOverdueEscalationDays <= invoiceOverdueDays) {
      toast.error("Escalation alert days must be greater than overdue days");
      return false;
    }
    if (budgetCriticalThreshold <= budgetWarningThreshold) {
      toast.error("Critical threshold must be higher than warning threshold");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateSettings()) return;

    try {
      setSaving(true);
      await saveSettings({
        default_weekly_rate: defaultWeeklyRate || null,
        invoice_rate_basis: rateBasis,
        default_invoice_day: defaultInvoiceDay,
        invoice_payment_terms: invoicePaymentTerms,
        fee_review_reminder_days: feeReviewReminderDays,
        invoice_overdue_days: invoiceOverdueDays,
        invoice_overdue_escalation_days: invoiceOverdueEscalationDays,
        budget_period_default: budgetPeriodDefault,
        budget_warning_threshold: budgetWarningThreshold,
        budget_critical_threshold: budgetCriticalThreshold,
        auto_create_budget: autoCreateBudget,
        mileage_rate: mileageRate,
        expense_approval_threshold: expenseApprovalThreshold,
        expense_receipt_threshold: expenseReceiptThreshold,
        default_weekly_allowance: defaultWeeklyAllowance || null,
        default_allowance_day: defaultAllowanceDay,
        savings_tracking_enabled: savingsTrackingEnabled,
      });
      clearSettingsCache();
      toast.success("Financial rules saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const calculateDailyRate = () => {
    if (!defaultWeeklyRate) return '—';
    const rate = parseFloat(defaultWeeklyRate);
    const daily = rateBasis === '5_day' ? rate / 5 : rate / 7;
    const monthly = (rate / 7) * 30;
    return `£${daily.toFixed(2)}/day = £${monthly.toFixed(2)} per 30-day month`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-lg">Financial Rules</h3>
        <p className="text-sm text-muted-foreground mt-1">Configure financial thresholds, defaults, and calculation rules that apply across the entire platform for this organisation.</p>
      </div>

      {/* Section 1 — Placement Fees */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Placement Fees</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default weekly placement fee (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={defaultWeeklyRate} 
              onChange={e => setDefaultWeeklyRate(e.target.value)}
              placeholder="e.g. 1153.85"
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Daily rate calculation method</label>
            <select value={rateBasis} onChange={e => setRateBasis(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="7_day">7-day week (weekly ÷ 7)</option>
              <option value="5_day">5-day week (weekly ÷ 5)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-2">Example: {calculateDailyRate()}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default invoice day of month (1–28)</label>
            <input 
              type="number" 
              min="1" 
              max="28"
              value={defaultInvoiceDay} 
              onChange={e => setDefaultInvoiceDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice payment terms (days)</label>
            <input 
              type="number" 
              value={invoicePaymentTerms} 
              onChange={e => setInvoicePaymentTerms(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Alert X days before fee review date</label>
            <input 
              type="number" 
              value={feeReviewReminderDays} 
              onChange={e => setFeeReviewReminderDays(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mark invoice as overdue after (days)</label>
            <input 
              type="number" 
              value={invoiceOverdueDays} 
              onChange={e => setInvoiceOverdueDays(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Escalation alert after (days)</label>
            <input 
              type="number" 
              value={invoiceOverdueEscalationDays} 
              onChange={e => setInvoiceOverdueEscalationDays(parseInt(e.target.value) || 60)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
            {invoiceOverdueEscalationDays <= invoiceOverdueDays && (
              <p className="text-xs text-red-600">Must be greater than overdue days</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2 — Budget Controls */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Budget Controls</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default budget period</label>
            <select value={budgetPeriodDefault} onChange={e => setBudgetPeriodDefault(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="annual">Annual</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Budget warning level (% over budget)</label>
            <input 
              type="number" 
              value={budgetWarningThreshold} 
              onChange={e => setBudgetWarningThreshold(parseInt(e.target.value) || 20)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Budget critical level (% over budget)</label>
            <input 
              type="number" 
              value={budgetCriticalThreshold} 
              onChange={e => setBudgetCriticalThreshold(parseInt(e.target.value) || 40)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
            {budgetCriticalThreshold <= budgetWarningThreshold && (
              <p className="text-xs text-red-600">Must be higher than warning threshold</p>
            )}
          </div>

          <div className="space-y-2 flex items-center justify-between pt-6">
            <label className="text-sm font-medium">Automatically create budget on home creation</label>
            <input 
              type="checkbox" 
              checked={autoCreateBudget} 
              onChange={e => setAutoCreateBudget(e.target.checked)}
              className="w-4 h-4"
            />
          </div>
        </div>
      </div>

      {/* Section 3 — Expenses and Mileage */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Expenses and Mileage</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mileage reimbursement rate (£ per mile)</label>
            <input 
              type="number" 
              step="0.001"
              value={mileageRate} 
              onChange={e => setMileageRate(parseFloat(e.target.value) || 0.45)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
            <p className="text-xs text-muted-foreground">HMRC standard rate is £0.45 per mile</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Require manager approval for expenses above (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={expenseApprovalThreshold} 
              onChange={e => setExpenseApprovalThreshold(parseFloat(e.target.value) || 50)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Require receipt for expenses above (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={expenseReceiptThreshold} 
              onChange={e => setExpenseReceiptThreshold(parseFloat(e.target.value) || 10)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Section 4 — Resident Finances */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Resident Finances</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default weekly allowance for new residents (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={defaultWeeklyAllowance} 
              onChange={e => setDefaultWeeklyAllowance(e.target.value)}
              placeholder="Leave blank for no default"
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default allowance payment day</label>
            <select value={defaultAllowanceDay} onChange={e => setDefaultAllowanceDay(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>

          <div className="space-y-2 flex items-center justify-between pt-6">
            <label className="text-sm font-medium">Enable savings goal tracking for residents</label>
            <input 
              type="checkbox" 
              checked={savingsTrackingEnabled} 
              onChange={e => setSavingsTrackingEnabled(e.target.checked)}
              className="w-4 h-4"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save Financial Rules"}
      </Button>
    </div>
  );
}