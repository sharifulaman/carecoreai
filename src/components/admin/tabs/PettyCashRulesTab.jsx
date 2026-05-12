import { useState, useEffect } from "react";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2, Plus, Lock } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = [
  { key: 'groceries', label: 'Groceries' },
  { key: 'activities', label: 'Activities' },
  { key: 'transport', label: 'Transport' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'toiletries', label: 'Toiletries' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'resident_personal', label: 'Resident Personal' },
  { key: 'other', label: 'Other' },
];

export default function PettyCashRulesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receiptThreshold, setReceiptThreshold] = useState(10.00);
  const [approvalThreshold, setApprovalThreshold] = useState(50.00);
  const [floatThreshold, setFloatThreshold] = useState(50.00);
  const [lowAlert, setLowAlert] = useState(50.00);
  const [maxTransaction, setMaxTransaction] = useState(200.00);
  const [activeCategories, setActiveCategories] = useState(DEFAULT_CATEGORIES.map(c => c.key));
  const [customCategories, setCustomCategories] = useState([]);
  const [customCategoriesEnabled, setCustomCategoriesEnabled] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [reconciliationRequired, setReconciliationRequired] = useState(true);
  const [reconciliationDay, setReconciliationDay] = useState('friday');
  const [reconciliationReminder, setReconciliationReminder] = useState(24);
  const [reconciliationNotify, setReconciliationNotify] = useState(['team_leader']);
  const [openingBalanceDefault, setOpeningBalanceDefault] = useState(0.00);
  const [openingBalanceApproval, setOpeningBalanceApproval] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setReceiptThreshold(await getSetting('petty_cash_receipt_threshold', 10.00));
      setApprovalThreshold(await getSetting('petty_cash_approval_threshold', 50.00));
      setFloatThreshold(await getSetting('petty_cash_float_threshold_default', 50.00));
      setLowAlert(await getSetting('petty_cash_low_alert', 50.00));
      setMaxTransaction(await getSetting('petty_cash_max_transaction', 200.00));
      setActiveCategories(await getSetting('petty_cash_active_categories', DEFAULT_CATEGORIES.map(c => c.key)));
      setCustomCategories(await getSetting('petty_cash_custom_categories', []));
      setCustomCategoriesEnabled(await getSetting('petty_cash_custom_categories_enabled', false));
      setReconciliationRequired(await getSetting('petty_cash_reconciliation_required', true));
      setReconciliationDay(await getSetting('petty_cash_reconciliation_day', 'friday'));
      setReconciliationReminder(await getSetting('petty_cash_reconciliation_reminder_hours', 24));
      setReconciliationNotify(await getSetting('petty_cash_reconciliation_notify', ['team_leader']));
      setOpeningBalanceDefault(await getSetting('petty_cash_opening_balance_default', 0.00));
      setOpeningBalanceApproval(await getSetting('petty_cash_opening_balance_approval', false));
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (catKey) => {
    if (catKey === 'other') return; // Cannot deactivate Other
    setActiveCategories(prev => 
      prev.includes(catKey) ? prev.filter(c => c !== catKey) : [...prev, catKey]
    );
  };

  const toggleNotification = (notifyType) => {
    setReconciliationNotify(prev =>
      prev.includes(notifyType) ? prev.filter(n => n !== notifyType) : [...prev, notifyType]
    );
  };

  const addCustomCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }
    const allNames = [...DEFAULT_CATEGORIES.map(c => c.label), ...customCategories, newCategoryName];
    if (new Set(allNames).size !== allNames.length) {
      toast.error("Category name already exists");
      return;
    }
    setCustomCategories([...customCategories, newCategoryName]);
    setNewCategoryName('');
  };

  const deleteCustomCategory = (idx) => {
    setCustomCategories(prev => prev.filter((_, i) => i !== idx));
  };

  const validateSettings = () => {
    if (approvalThreshold < receiptThreshold) {
      toast.error("Approval threshold should be equal to or higher than the receipt threshold");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateSettings()) return;

    try {
      setSaving(true);
      await saveSettings({
        petty_cash_receipt_threshold: receiptThreshold,
        petty_cash_approval_threshold: approvalThreshold,
        petty_cash_float_threshold_default: floatThreshold,
        petty_cash_low_alert: lowAlert,
        petty_cash_max_transaction: maxTransaction,
        petty_cash_active_categories: activeCategories,
        petty_cash_custom_categories: customCategories,
        petty_cash_custom_categories_enabled: customCategoriesEnabled,
        petty_cash_reconciliation_required: reconciliationRequired,
        petty_cash_reconciliation_day: reconciliationDay,
        petty_cash_reconciliation_reminder_hours: reconciliationReminder,
        petty_cash_reconciliation_notify: reconciliationNotify,
        petty_cash_opening_balance_default: openingBalanceDefault,
        petty_cash_opening_balance_approval: openingBalanceApproval,
      });
      clearSettingsCache();
      toast.success("Petty cash rules saved successfully");
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
        <h3 className="font-semibold text-lg">Petty Cash Rules</h3>
        <p className="text-sm text-muted-foreground mt-1">Configure petty cash thresholds, approval rules, categories, and reconciliation requirements for all homes in your organisation.</p>
      </div>

      {/* Section 1 — Transaction Thresholds */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Transaction Thresholds</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Require receipt photo for cash out above (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={receiptThreshold} 
              onChange={e => setReceiptThreshold(parseFloat(e.target.value) || 10)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
            <p className="text-xs text-muted-foreground">Currently: receipt required for cash out above £{receiptThreshold.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Require manager approval for cash out above (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={approvalThreshold} 
              onChange={e => setApprovalThreshold(parseFloat(e.target.value) || 50)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
            {approvalThreshold < receiptThreshold && (
              <p className="text-xs text-red-600">Must be equal to or higher than receipt threshold</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default float threshold for new homes (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={floatThreshold} 
              onChange={e => setFloatThreshold(parseFloat(e.target.value) || 50)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Send low balance alert when balance drops below (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={lowAlert} 
              onChange={e => setLowAlert(parseFloat(e.target.value) || 50)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2 col-span-2">
            <label className="text-sm font-medium">Maximum single cash out transaction (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={maxTransaction} 
              onChange={e => setMaxTransaction(parseFloat(e.target.value) || 200)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Section 2 — Categories */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Transaction Categories</h4>
        
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-center px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_CATEGORIES.map(cat => (
                <tr key={cat.key} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">{cat.label}</td>
                  <td className="px-4 py-3 text-center">
                    {cat.key === 'other' ? (
                      <Lock className="w-4 h-4 text-muted-foreground mx-auto" />
                    ) : (
                      <Switch 
                        checked={activeCategories.includes(cat.key)} 
                        onCheckedChange={() => toggleCategory(cat.key)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Allow custom categories</label>
            <Switch checked={customCategoriesEnabled} onCheckedChange={setCustomCategoriesEnabled} />
          </div>

          {customCategoriesEnabled && (
            <div className="space-y-3 bg-muted/30 rounded-lg p-4">
              <h5 className="text-sm font-medium">Custom Categories</h5>
              {customCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{cat}</span>
                  <button onClick={() => deleteCustomCategory(idx)} className="text-muted-foreground hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomCategory()}
                  placeholder="New category name"
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-transparent text-sm"
                />
                <Button size="sm" variant="outline" onClick={addCustomCategory} className="gap-1">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3 — Reconciliation */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Weekly Reconciliation</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Require weekly petty cash reconciliation</label>
            <Switch checked={reconciliationRequired} onCheckedChange={setReconciliationRequired} />
          </div>

          {reconciliationRequired && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reconciliation due on</label>
                <select value={reconciliationDay} onChange={e => setReconciliationDay(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                    <option key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Send reminder (hours before reconciliation day)</label>
                <input 
                  type="number" 
                  value={reconciliationReminder} 
                  onChange={e => setReconciliationReminder(parseInt(e.target.value) || 24)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Send reconciliation reminder to</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={reconciliationNotify.includes('team_leader')}
                      onChange={() => toggleNotification('team_leader')}
                      className="w-4 h-4"
                    />
                    Team Leader
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={reconciliationNotify.includes('admin')}
                      onChange={() => toggleNotification('admin')}
                      className="w-4 h-4"
                    />
                    Admin
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 4 — Opening Balance */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Opening Balance Rules</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default opening balance for new petty cash ledgers (£)</label>
            <input 
              type="number" 
              step="0.01"
              value={openingBalanceDefault} 
              onChange={e => setOpeningBalanceDefault(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2 flex items-center justify-between pt-6">
            <label className="text-sm font-medium">Require admin approval to set opening balance</label>
            <Switch checked={openingBalanceApproval} onCheckedChange={setOpeningBalanceApproval} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save Petty Cash Rules"}
      </Button>
    </div>
  );
}