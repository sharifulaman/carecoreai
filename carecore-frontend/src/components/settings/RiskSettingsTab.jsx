import { useState, useEffect } from "react";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RiskSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reg 27 trigger thresholds
  const [reg27AutoTriggerTypes, setReg27AutoTriggerTypes] = useState({
    restraint: true,
    police_behaviour_management: true,
    police_missing: true,
    serious_injury: true,
    safeguarding_concern: false,
    medical_emergency: false,
  });
  const [reg27NotificationWindowHours, setReg27NotificationWindowHours] = useState(24);
  const [reg27WarningHours, setReg27WarningHours] = useState(20);

  // Escalation timelines
  const [tlReviewDeadlineHours, setTlReviewDeadlineHours] = useState(4);
  const [tmReviewDeadlineHours, setTmReviewDeadlineHours] = useState(8);
  const [rsmNotifyDeadlineHours, setRsmNotifyDeadlineHours] = useState(20);
  const [incidentReviewDeadlineDays, setIncidentReviewDeadlineDays] = useState(3);

  // Risk thresholds
  const [highRiskEscalationDays, setHighRiskEscalationDays] = useState(1);
  const [mediumRiskEscalationDays, setMediumRiskEscalationDays] = useState(3);
  const [missingEpisodeEscalationMinutes, setMissingEpisodeEscalationMinutes] = useState(60);

  const INCIDENT_TYPE_LABELS = {
    restraint: "Restraint",
    police_behaviour_management: "Police (Behaviour Management)",
    police_missing: "Police (Missing Person)",
    serious_injury: "Serious Injury",
    safeguarding_concern: "Safeguarding Concern",
    medical_emergency: "Medical Emergency",
  };

  useEffect(() => {
    (async () => {
      try {
        const savedTriggers = await getSetting("reg27_auto_trigger_types", null);
        if (savedTriggers) setReg27AutoTriggerTypes(savedTriggers);
        setReg27NotificationWindowHours(await getSetting("reg27_notification_window_hours", 24));
        setReg27WarningHours(await getSetting("reg27_warning_hours", 20));
        setTlReviewDeadlineHours(await getSetting("tl_review_deadline_hours", 4));
        setTmReviewDeadlineHours(await getSetting("tm_review_deadline_hours", 8));
        setRsmNotifyDeadlineHours(await getSetting("rsm_notify_deadline_hours", 20));
        setIncidentReviewDeadlineDays(await getSetting("incident_review_deadline_days", 3));
        setHighRiskEscalationDays(await getSetting("high_risk_escalation_days", 1));
        setMediumRiskEscalationDays(await getSetting("medium_risk_escalation_days", 3));
        setMissingEpisodeEscalationMinutes(await getSetting("missing_episode_escalation_minutes", 60));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (reg27WarningHours >= reg27NotificationWindowHours) {
      toast.error("Warning must be sent before the notification deadline");
      return;
    }
    if (tlReviewDeadlineHours >= tmReviewDeadlineHours) {
      toast.error("TL review deadline must be before TM review deadline");
      return;
    }
    try {
      setSaving(true);
      await saveSettings({
        reg27_auto_trigger_types: reg27AutoTriggerTypes,
        reg27_notification_window_hours: reg27NotificationWindowHours,
        reg27_warning_hours: reg27WarningHours,
        tl_review_deadline_hours: tlReviewDeadlineHours,
        tm_review_deadline_hours: tmReviewDeadlineHours,
        rsm_notify_deadline_hours: rsmNotifyDeadlineHours,
        incident_review_deadline_days: incidentReviewDeadlineDays,
        high_risk_escalation_days: highRiskEscalationDays,
        medium_risk_escalation_days: mediumRiskEscalationDays,
        missing_episode_escalation_minutes: missingEpisodeEscalationMinutes,
      });
      clearSettingsCache();
      toast.success("Risk settings saved");
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
        <h2 className="text-lg font-semibold">Risk Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure Reg 27 trigger rules, escalation timelines, and risk thresholds.</p>
      </div>

      {/* Reg 27 Triggers */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="font-medium">Reg 27 — Auto-Trigger Incident Types</h3>
          <p className="text-xs text-muted-foreground mt-1">These incident types will automatically flag the Reg 27 checkbox when a new incident is submitted.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(INCIDENT_TYPE_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={!!reg27AutoTriggerTypes[key]}
                onChange={e => setReg27AutoTriggerTypes(prev => ({ ...prev, [key]: e.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reg 27 Notification Window */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Reg 27 — Notification Deadlines</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ofsted notification window (hours)</label>
            <input type="number" value={reg27NotificationWindowHours} onChange={e => setReg27NotificationWindowHours(parseInt(e.target.value) || 24)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
            <p className="text-xs text-muted-foreground">Regulatory default is 24 hours</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Send warning notification at (hours after incident)</label>
            <input type="number" value={reg27WarningHours} onChange={e => setReg27WarningHours(parseInt(e.target.value) || 20)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
            {reg27WarningHours >= reg27NotificationWindowHours && <p className="text-xs text-red-600">Must be before the notification deadline</p>}
          </div>
        </div>
      </div>

      {/* Escalation Timelines */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Escalation Timelines</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">TL must review within (hours)</label>
            <input type="number" value={tlReviewDeadlineHours} onChange={e => setTlReviewDeadlineHours(parseInt(e.target.value) || 4)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">TM must review within (hours)</label>
            <input type="number" value={tmReviewDeadlineHours} onChange={e => setTmReviewDeadlineHours(parseInt(e.target.value) || 8)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
            {tlReviewDeadlineHours >= tmReviewDeadlineHours && <p className="text-xs text-red-600">Must be after TL deadline</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">RSM must notify Ofsted within (hours)</label>
            <input type="number" value={rsmNotifyDeadlineHours} onChange={e => setRsmNotifyDeadlineHours(parseInt(e.target.value) || 20)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Standard incident review deadline (days)</label>
            <input type="number" value={incidentReviewDeadlineDays} onChange={e => setIncidentReviewDeadlineDays(parseInt(e.target.value) || 3)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
        </div>
      </div>

      {/* Risk Thresholds */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium">Risk &amp; Missing Episode Thresholds</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">High-risk incident — escalate after (days)</label>
            <input type="number" value={highRiskEscalationDays} onChange={e => setHighRiskEscalationDays(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Medium-risk incident — escalate after (days)</label>
            <input type="number" value={mediumRiskEscalationDays} onChange={e => setMediumRiskEscalationDays(parseInt(e.target.value) || 3)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Missing episode — escalate after (minutes)</label>
            <input type="number" value={missingEpisodeEscalationMinutes} onChange={e => setMissingEpisodeEscalationMinutes(parseInt(e.target.value) || 60)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving…" : "Save Risk Settings"}
      </Button>
    </div>
  );
}