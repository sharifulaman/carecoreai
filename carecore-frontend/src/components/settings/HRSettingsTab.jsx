import { useState, useEffect } from "react";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function HRSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Leave allowances
  const [annualLeaveEntitlement, setAnnualLeaveEntitlement] = useState(28);
  const [sickLeaveMaxDays, setSickLeaveMaxDays] = useState(10);
  const [maternityLeaveWeeks, setMaternityLeaveWeeks] = useState(52);
  const [paternityLeaveDays, setPaternityLeaveDays] = useState(10);
  const [leaveCarryOverMax, setLeaveCarryOverMax] = useState(5);

  // Probation periods
  const [probationPeriodMonths, setProbationPeriodMonths] = useState(6);
  const [probationReviewWarningDays, setProbationReviewWarningDays] = useState(30);
  const [probationExtensionMonths, setProbationExtensionMonths] = useState(3);

  // Supervision frequency
  const [supervisionFrequencyWeeks, setSupervisionFrequencyWeeks] = useState(4);
  const [supervisionOverdueWarningDays, setSupervisionOverdueWarningDays] = useState(7);
  const [appraisalFrequencyMonths, setAppraisalFrequencyMonths] = useState(12);

  useEffect(() => {
    (async () => {
      try {
        setAnnualLeaveEntitlement(await getSetting("annual_leave_entitlement", 28));
        setSickLeaveMaxDays(await getSetting("sick_leave_max_days", 10));
        setMaternityLeaveWeeks(await getSetting("maternity_leave_weeks", 52));
        setPaternityLeaveDays(await getSetting("paternity_leave_days", 10));
        setLeaveCarryOverMax(await getSetting("leave_carry_over_max", 5));
        setProbationPeriodMonths(await getSetting("probation_period_months", 6));
        setProbationReviewWarningDays(await getSetting("probation_review_warning_days", 30));
        setProbationExtensionMonths(await getSetting("probation_extension_months", 3));
        setSupervisionFrequencyWeeks(await getSetting("supervision_frequency_weeks", 4));
        setSupervisionOverdueWarningDays(await getSetting("supervision_overdue_warning_days", 7));
        setAppraisalFrequencyMonths(await getSetting("appraisal_frequency_months", 12));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings({
        annual_leave_entitlement: annualLeaveEntitlement,
        sick_leave_max_days: sickLeaveMaxDays,
        maternity_leave_weeks: maternityLeaveWeeks,
        paternity_leave_days: paternityLeaveDays,
        leave_carry_over_max: leaveCarryOverMax,
        probation_period_months: probationPeriodMonths,
        probation_review_warning_days: probationReviewWarningDays,
        probation_extension_months: probationExtensionMonths,
        supervision_frequency_weeks: supervisionFrequencyWeeks,
        supervision_overdue_warning_days: supervisionOverdueWarningDays,
        appraisal_frequency_months: appraisalFrequencyMonths,
      });
      clearSettingsCache();
      toast.success("HR settings saved");
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
        <h2 className="text-lg font-semibold">HR Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure leave allowances, probation periods, and supervision frequency.</p>
      </div>

      {/* Leave Allowances */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Leave Allowances</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Annual leave entitlement (days)</label>
            <input type="number" value={annualLeaveEntitlement} onChange={e => setAnnualLeaveEntitlement(parseInt(e.target.value) || 28)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
            <p className="text-xs text-muted-foreground">Statutory minimum is 28 days</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Maximum carry-over days</label>
            <input type="number" value={leaveCarryOverMax} onChange={e => setLeaveCarryOverMax(parseInt(e.target.value) || 5)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Sick leave (days before SSP review)</label>
            <input type="number" value={sickLeaveMaxDays} onChange={e => setSickLeaveMaxDays(parseInt(e.target.value) || 10)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Paternity leave (days)</label>
            <input type="number" value={paternityLeaveDays} onChange={e => setPaternityLeaveDays(parseInt(e.target.value) || 10)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Maternity leave (weeks)</label>
            <input type="number" value={maternityLeaveWeeks} onChange={e => setMaternityLeaveWeeks(parseInt(e.target.value) || 52)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
        </div>
      </div>

      {/* Probation Periods */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Probation Periods</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default probation length (months)</label>
            <input type="number" value={probationPeriodMonths} onChange={e => setProbationPeriodMonths(parseInt(e.target.value) || 6)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Review warning (days before end)</label>
            <input type="number" value={probationReviewWarningDays} onChange={e => setProbationReviewWarningDays(parseInt(e.target.value) || 30)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Extension length if failed (months)</label>
            <input type="number" value={probationExtensionMonths} onChange={e => setProbationExtensionMonths(parseInt(e.target.value) || 3)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
        </div>
      </div>

      {/* Supervision Frequency */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Supervision &amp; Appraisals</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Supervision frequency (every N weeks)</label>
            <input type="number" value={supervisionFrequencyWeeks} onChange={e => setSupervisionFrequencyWeeks(parseInt(e.target.value) || 4)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Flag as overdue after (days past due)</label>
            <input type="number" value={supervisionOverdueWarningDays} onChange={e => setSupervisionOverdueWarningDays(parseInt(e.target.value) || 7)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Appraisal frequency (months)</label>
            <input type="number" value={appraisalFrequencyMonths} onChange={e => setAppraisalFrequencyMonths(parseInt(e.target.value) || 12)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving…" : "Save HR Settings"}
      </Button>
    </div>
  );
}