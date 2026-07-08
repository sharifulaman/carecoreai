import { useState, useEffect } from "react";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const TOKENS = ['{YEAR}', '{MONTH}', '{SEQUENCE}', '{HOME}', '{DAY}'];

export default function InvoiceSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceFormat, setInvoiceFormat] = useState('INV-{YEAR}-{MONTH}-{SEQUENCE}');
  const [sequenceReset, setSequenceReset] = useState('monthly');
  const [sequenceStart, setSequenceStart] = useState(1);
  const [invoiceOrgName, setInvoiceOrgName] = useState('');
  const [invoiceHeaderText, setInvoiceHeaderText] = useState('');
  const [invoiceFooterText, setInvoiceFooterText] = useState('');
  const [invoiceTerms, setInvoiceTerms] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [vatRate, setVatRate] = useState(0);
  const [paymentRefPrefix, setPaymentRefPrefix] = useState('');
  const [autoMarkOverdue, setAutoMarkOverdue] = useState(true);
  const [overdueAfterDays, setOverdueAfterDays] = useState(30);
  const [escalationAfterDays, setEscalationAfterDays] = useState(60);
  const [overdueReminderDays, setOverdueReminderDays] = useState(7);
  const [exportFormat, setExportFormat] = useState('xero');
  const [xeroAccountCode, setXeroAccountCode] = useState('');
  const [xeroTaxType, setXeroTaxType] = useState('NONE');
  const [quickbooksAccount, setQuickbooksAccount] = useState('');
  const [exportIncludeResident, setExportIncludeResident] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setInvoiceFormat(await getSetting('invoice_number_format', 'INV-{YEAR}-{MONTH}-{SEQUENCE}'));
      setSequenceReset(await getSetting('invoice_sequence_reset', 'monthly'));
      setSequenceStart(await getSetting('invoice_sequence_start', 1));
      setInvoiceOrgName(await getSetting('invoice_org_name', ''));
      setInvoiceHeaderText(await getSetting('invoice_header_text', ''));
      setInvoiceFooterText(await getSetting('invoice_footer_text', ''));
      setInvoiceTerms(await getSetting('invoice_terms', ''));
      setVatNumber(await getSetting('vat_number', ''));
      setVatRate(await getSetting('vat_rate', 0));
      setPaymentRefPrefix(await getSetting('payment_ref_prefix', ''));
      setAutoMarkOverdue(await getSetting('invoice_auto_overdue', true));
      setOverdueAfterDays(await getSetting('invoice_overdue_days', 30));
      setEscalationAfterDays(await getSetting('invoice_overdue_escalation_days', 60));
      setOverdueReminderDays(await getSetting('invoice_overdue_reminder_days', 7));
      setExportFormat(await getSetting('invoice_export_format', 'xero'));
      setXeroAccountCode(await getSetting('xero_account_code', ''));
      setXeroTaxType(await getSetting('xero_tax_type', 'NONE'));
      setQuickbooksAccount(await getSetting('quickbooks_account', ''));
      setExportIncludeResident(await getSetting('export_include_resident', true));
      setRequireApproval(await getSetting('invoice_require_approval', false));
      setAutoGenerate(await getSetting('invoice_auto_generate', false));
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const insertToken = (token) => {
    const textarea = document.getElementById('invoice-format');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = invoiceFormat.substring(0, start) + token + invoiceFormat.substring(end);
    setInvoiceFormat(newText);
  };

  const generatePreview = () => {
    let preview = invoiceFormat
      .replace('{YEAR}', '2026')
      .replace('{MONTH}', '04')
      .replace('{SEQUENCE}', '0001')
      .replace('{DAY}', '25')
      .replace('{HOME}', 'Home');
    return preview;
  };

  const validateSettings = () => {
    if (escalationAfterDays <= overdueAfterDays) {
      toast.error("Escalation alert days must be greater than overdue days");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateSettings()) return;

    try {
      setSaving(true);
      await saveSettings({
        invoice_number_format: invoiceFormat,
        invoice_sequence_reset: sequenceReset,
        invoice_sequence_start: sequenceStart,
        invoice_org_name: invoiceOrgName,
        invoice_header_text: invoiceHeaderText,
        invoice_footer_text: invoiceFooterText,
        invoice_terms: invoiceTerms,
        vat_number: vatNumber,
        vat_rate: vatRate,
        payment_ref_prefix: paymentRefPrefix,
        invoice_auto_overdue: autoMarkOverdue,
        invoice_overdue_days: overdueAfterDays,
        invoice_overdue_escalation_days: escalationAfterDays,
        invoice_overdue_reminder_days: overdueReminderDays,
        invoice_export_format: exportFormat,
        xero_account_code: xeroAccountCode,
        xero_tax_type: xeroTaxType,
        quickbooks_account: quickbooksAccount,
        export_include_resident: exportIncludeResident,
        invoice_require_approval: requireApproval,
        invoice_auto_generate: autoGenerate,
      });
      clearSettingsCache();
      toast.success("Invoice settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-lg">Invoice Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Configure invoice numbering, format, payment terms, overdue rules, and export settings for all placement invoices.</p>
      </div>

      {/* Section 1 — Invoice Numbering */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Invoice Numbering</h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice number format</label>
            <input 
              id="invoice-format"
              type="text" 
              value={invoiceFormat} 
              onChange={e => setInvoiceFormat(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent font-mono text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {TOKENS.map(token => (
                <button
                  key={token}
                  onClick={() => insertToken(token)}
                  className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
                >
                  {token}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Preview: <span className="font-mono">{generatePreview()}</span></p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reset invoice sequence</label>
            <select value={sequenceReset} onChange={e => setSequenceReset(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="never">Never</option>
              <option value="monthly">Monthly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Starting sequence number</label>
            <input 
              type="number" 
              value={sequenceStart} 
              onChange={e => setSequenceStart(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Section 2 — Invoice Content */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Invoice Content</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Organisation name shown on invoices</label>
            <input 
              type="text" 
              value={invoiceOrgName} 
              onChange={e => setInvoiceOrgName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
              placeholder="Leave blank to use organisation name from settings"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">VAT registration number</label>
            <input 
              type="text" 
              value={vatNumber} 
              onChange={e => setVatNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">VAT rate (%)</label>
            <input 
              type="number" 
              step="0.01"
              value={vatRate} 
              onChange={e => setVatRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment reference prefix</label>
            <input 
              type="text" 
              maxLength="10"
              value={paymentRefPrefix} 
              onChange={e => setPaymentRefPrefix(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
              placeholder="e.g. PAY-"
            />
          </div>

          <div className="space-y-2 col-span-2">
            <label className="text-sm font-medium">Invoice header text</label>
            <textarea 
              maxLength="200"
              value={invoiceHeaderText} 
              onChange={e => setInvoiceHeaderText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm h-16"
              placeholder="e.g. Supported Housing Placement Services"
            />
            <p className="text-xs text-muted-foreground">{invoiceHeaderText.length}/200</p>
          </div>

          <div className="space-y-2 col-span-2">
            <label className="text-sm font-medium">Invoice footer text</label>
            <textarea 
              maxLength="500"
              value={invoiceFooterText} 
              onChange={e => setInvoiceFooterText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm h-20"
              placeholder="e.g. Please make payment to: [Bank Name] Sort Code: XX-XX-XX"
            />
            <p className="text-xs text-muted-foreground">{invoiceFooterText.length}/500</p>
          </div>

          <div className="space-y-2 col-span-2">
            <label className="text-sm font-medium">Payment terms and conditions</label>
            <textarea 
              maxLength="1000"
              value={invoiceTerms} 
              onChange={e => setInvoiceTerms(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm h-24"
              placeholder="Include any late payment terms or dispute resolution process"
            />
            <p className="text-xs text-muted-foreground">{invoiceTerms.length}/1000</p>
          </div>
        </div>
      </div>

      {/* Section 3 — Overdue Rules */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Overdue Rules</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Automatically change invoice status to overdue</label>
            <Switch checked={autoMarkOverdue} onCheckedChange={setAutoMarkOverdue} />
          </div>

          {autoMarkOverdue && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mark invoice as overdue after (days from invoice date)</label>
                <input 
                  type="number" 
                  value={overdueAfterDays} 
                  onChange={e => setOverdueAfterDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Send escalation alert after (days unpaid)</label>
                <input 
                  type="number" 
                  value={escalationAfterDays} 
                  onChange={e => setEscalationAfterDays(parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
                />
                {escalationAfterDays <= overdueAfterDays && (
                  <p className="text-xs text-red-600">Must be greater than overdue days</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Send overdue reminders every (days)</label>
                <input 
                  type="number" 
                  value={overdueReminderDays} 
                  onChange={e => setOverdueReminderDays(parseInt(e.target.value) || 7)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 4 — Export Format */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Accounting Software Export</h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default export format</label>
            <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="xero">Xero</option>
              <option value="quickbooks">QuickBooks</option>
              <option value="sage">Sage</option>
              <option value="csv">CSV Generic</option>
            </select>
          </div>

          {exportFormat === 'xero' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Xero account code</label>
                <input 
                  type="text" 
                  value={xeroAccountCode} 
                  onChange={e => setXeroAccountCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
                  placeholder="e.g. 200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Xero tax type</label>
                <select value={xeroTaxType} onChange={e => setXeroTaxType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
                  <option value="NONE">NONE (VAT exempt)</option>
                  <option value="OUTPUT">OUTPUT (Standard rated VAT)</option>
                </select>
              </div>
            </>
          )}

          {exportFormat === 'quickbooks' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">QuickBooks income account</label>
              <input 
                type="text" 
                value={quickbooksAccount} 
                onChange={e => setQuickbooksAccount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
              />
            </div>
          )}

          <div className="space-y-2 flex items-center justify-between">
            <label className="text-sm font-medium">Include resident initials in invoice description</label>
            <Switch checked={exportIncludeResident} onCheckedChange={setExportIncludeResident} />
          </div>
        </div>
      </div>

      {/* Section 5 — Approval Workflow */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Invoice Approval Workflow</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Require admin approval before invoice can be sent</label>
            <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Automatically generate draft invoices at month start</label>
            <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save Invoice Settings"}
      </Button>
    </div>
  );
}