import { useState, useEffect } from "react";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_RISK_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const DEFAULT_RISK_COLOURS = { low: '#1D9E75', medium: '#378ADD', high: '#EF9F27', critical: '#E24B4A' };

const VISIBILITY_FIELDS = [
  { key: 'social_worker', label: 'Social worker name and contact' },
  { key: 'iro', label: 'IRO name and contact' },
  { key: 'family_contacts', label: 'Family contacts' },
  { key: 'dob', label: 'Date of birth' },
  { key: 'nhs_number', label: 'NHS number' },
  { key: 'placement_fee', label: 'Placement fee information' },
  { key: 'risk_management', label: 'Risk management plan details' },
  { key: 'safeguarding', label: 'Safeguarding records' },
  { key: 'mca', label: 'Mental capacity assessments' },
  { key: 'placement_history', label: 'Full placement history' },
];

export default function ResidentAndYPTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ypCardSort, setYpCardSort] = useState('risk_level');
  const [ypCardsExpanded, setYpCardsExpanded] = useState(false);
  const [ypShowProgressBars, setYpShowProgressBars] = useState(true);
  const [ypShowTimeline, setYpShowTimeline] = useState(true);
  const [ypTimelineCollapse, setYpTimelineCollapse] = useState(6);
  const [ypSummaryCollapse, setYpSummaryCollapse] = useState(4);
  const [ypShowHomeName, setYpShowHomeName] = useState(true);
  const [ypShowKeyWorker, setYpShowKeyWorker] = useState(true);
  const [ypCardsPerPage, setYpCardsPerPage] = useState(20);
  const [kwOverdueDays, setKwOverdueDays] = useState(7);
  const [logMissingHours, setLogMissingHours] = useState(24);
  const [ftfOverdueDays, setFtfOverdueDays] = useState(7);
  const [supportPlanOverdue, setSupportPlanOverdue] = useState(0);
  const [nightStayAlertTime, setNightStayAlertTime] = useState('21:00');
  const [riskLabels, setRiskLabels] = useState(DEFAULT_RISK_LABELS);
  const [riskColours, setRiskColours] = useState(DEFAULT_RISK_COLOURS);
  const [visibility, setVisibility] = useState({});
  const [requireKeyWorker, setRequireKeyWorker] = useState(true);
  const [requireHome, setRequireHome] = useState(true);
  const [privacyModeDefault, setPrivacyModeDefault] = useState(false);
  const [requireRiskLevel, setRequireRiskLevel] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState('active');
  const [autoArchiveDays, setAutoArchiveDays] = useState(30);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setYpCardSort(await getSetting('yp_card_sort', 'risk_level'));
      setYpCardsExpanded(await getSetting('yp_cards_expanded_default', false));
      setYpShowProgressBars(await getSetting('yp_show_progress_bars', true));
      setYpShowTimeline(await getSetting('yp_show_timeline', true));
      setYpTimelineCollapse(await getSetting('yp_timeline_collapse_after', 6));
      setYpSummaryCollapse(await getSetting('yp_summary_collapse_lines', 4));
      setYpShowHomeName(await getSetting('yp_show_home_name', true));
      setYpShowKeyWorker(await getSetting('yp_show_key_worker', true));
      setYpCardsPerPage(await getSetting('yp_cards_per_page', 20));
      setKwOverdueDays(await getSetting('kw_session_overdue_days', 7));
      setLogMissingHours(await getSetting('daily_log_missing_hours', 24));
      setFtfOverdueDays(await getSetting('face_to_face_overdue_days', 7));
      setSupportPlanOverdue(await getSetting('support_plan_overdue_warning_days', 0));
      setNightStayAlertTime(await getSetting('night_stay_alert_time', '21:00'));
      setRiskLabels(await getSetting('risk_level_labels', DEFAULT_RISK_LABELS));
      setRiskColours(await getSetting('risk_level_colours', DEFAULT_RISK_COLOURS));
      const vis = await getSetting('resident_visibility', {});
      setVisibility(vis);
      setRequireKeyWorker(await getSetting('require_key_worker', true));
      setRequireHome(await getSetting('require_home_assignment', true));
      setPrivacyModeDefault(await getSetting('privacy_mode_default', false));
      setRequireRiskLevel(await getSetting('require_risk_level', true));
      setDefaultStatus(await getSetting('default_resident_status', 'active'));
      setAutoArchiveDays(await getSetting('resident_auto_archive_days', 30));
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateRiskLabel = (level, value) => {
    setRiskLabels(prev => ({ ...prev, [level]: value }));
  };

  const updateRiskColour = (level, value) => {
    setRiskColours(prev => ({ ...prev, [level]: value }));
  };

  const toggleVisibility = (key) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings({
        yp_card_sort: ypCardSort,
        yp_cards_expanded_default: ypCardsExpanded,
        yp_show_progress_bars: ypShowProgressBars,
        yp_show_timeline: ypShowTimeline,
        yp_timeline_collapse_after: ypTimelineCollapse,
        yp_summary_collapse_lines: ypSummaryCollapse,
        yp_show_home_name: ypShowHomeName,
        yp_show_key_worker: ypShowKeyWorker,
        yp_cards_per_page: ypCardsPerPage,
        kw_session_overdue_days: kwOverdueDays,
        daily_log_missing_hours: logMissingHours,
        face_to_face_overdue_days: ftfOverdueDays,
        support_plan_overdue_warning_days: supportPlanOverdue,
        night_stay_alert_time: nightStayAlertTime,
        risk_level_labels: riskLabels,
        risk_level_colours: riskColours,
        resident_visibility: visibility,
        require_key_worker: requireKeyWorker,
        require_home_assignment: requireHome,
        privacy_mode_default: privacyModeDefault,
        require_risk_level: requireRiskLevel,
        default_resident_status: defaultStatus,
        resident_auto_archive_days: autoArchiveDays,
      });
      clearSettingsCache();
      toast.success("Resident and YP settings saved successfully");
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
        <h3 className="font-semibold text-lg">Resident and Young People Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Configure how resident profiles are displayed, what information is visible to different roles, alert thresholds, and risk level configuration.</p>
      </div>

      {/* Section 1 — YP Card View */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">YP Card View Display</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default sort order for YP cards</label>
            <select value={ypCardSort} onChange={e => setYpCardSort(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="risk_level">Risk Level (critical first)</option>
              <option value="name">Name (A–Z)</option>
              <option value="home">Home (A–Z)</option>
              <option value="last_log">Last Log Date (most recent first)</option>
              <option value="placement_start">Placement Start (newest first)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Maximum cards to show before pagination</label>
            <input 
              type="number" 
              min="5"
              max="100"
              value={ypCardsPerPage} 
              onChange={e => setYpCardsPerPage(parseInt(e.target.value) || 20)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-3 col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Expand all YP cards on page load</label>
              <Switch checked={ypCardsExpanded} onCheckedChange={setYpCardsExpanded} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Show plan progress bars on expanded cards</label>
              <Switch checked={ypShowProgressBars} onCheckedChange={setYpShowProgressBars} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Show activity timeline on expanded cards</label>
              <Switch checked={ypShowTimeline} onCheckedChange={setYpShowTimeline} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Show home name on collapsed card</label>
              <Switch checked={ypShowHomeName} onCheckedChange={setYpShowHomeName} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Show key worker name on collapsed card</label>
              <Switch checked={ypShowKeyWorker} onCheckedChange={setYpShowKeyWorker} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Show this many timeline items before 'Show more'</label>
            <input 
              type="number" 
              min="3"
              max="20"
              value={ypTimelineCollapse} 
              onChange={e => setYpTimelineCollapse(parseInt(e.target.value) || 6)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Daily summary lines before 'Show more'</label>
            <input 
              type="number" 
              min="2"
              max="10"
              value={ypSummaryCollapse} 
              onChange={e => setYpSummaryCollapse(parseInt(e.target.value) || 4)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Section 2 — Alert Thresholds */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Status Alert Thresholds</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Key worker session overdue after (days)</label>
            <input 
              type="number" 
              value={kwOverdueDays} 
              onChange={e => setKwOverdueDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Daily log missing alert after (hours)</label>
            <input 
              type="number" 
              value={logMissingHours} 
              onChange={e => setLogMissingHours(parseInt(e.target.value) || 24)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Face-to-face visit overdue after (days)</label>
            <input 
              type="number" 
              value={ftfOverdueDays} 
              onChange={e => setFtfOverdueDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Support plan overdue warning (days past due)</label>
            <input 
              type="number" 
              value={supportPlanOverdue} 
              onChange={e => setSupportPlanOverdue(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-2 col-span-2">
            <label className="text-sm font-medium">Night stay 'not marked' alert after (time of day)</label>
            <input 
              type="time" 
              value={nightStayAlertTime} 
              onChange={e => setNightStayAlertTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Section 3 — Risk Level Configuration */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Risk Level Labels and Colours</h4>
        <p className="text-xs text-muted-foreground mb-4">Changes apply immediately everywhere risk levels are displayed.</p>
        
        <div className="space-y-4">
          {['low', 'medium', 'high', 'critical'].map(level => (
            <div key={level} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">{level}</label>
                <input 
                  type="text" 
                  value={riskLabels[level]} 
                  onChange={e => updateRiskLabel(level, e.target.value)}
                  className="w-full px-2 py-1 mt-1 text-sm border border-input rounded bg-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Colour</label>
                <div className="flex gap-2 mt-1">
                  <input 
                    type="color" 
                    value={riskColours[level]} 
                    onChange={e => updateRiskColour(level, e.target.value)}
                    className="w-12 h-8 rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={riskColours[level]} 
                    onChange={e => updateRiskColour(level, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-input rounded bg-transparent font-mono"
                  />
                </div>
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs font-medium text-muted-foreground mb-1 block">Preview</span>
                <span 
                  style={{ backgroundColor: riskColours[level] }}
                  className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
                >
                  {riskLabels[level]}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Risk level order cannot be changed — low is always least severe, critical is always most severe.</p>
      </div>

      {/* Section 4 — Visibility */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Information Visibility by Role</h4>
        
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-4 py-3 font-medium">Information</th>
                <th className="text-center px-4 py-3 font-medium">Team Leader</th>
                <th className="text-center px-4 py-3 font-medium">Support Worker</th>
              </tr>
            </thead>
            <tbody>
              {VISIBILITY_FIELDS.map(field => (
                <tr key={field.key} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-xs">{field.label}</td>
                  <td className="px-4 py-3 text-center text-green-600">✓</td>
                  <td className="px-4 py-3 text-center">
                    <Switch 
                      checked={visibility[field.key] !== false} 
                      onCheckedChange={() => toggleVisibility(field.key)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5 — Creation Rules */}
      <div className="space-y-6">
        <h4 className="font-medium text-base">Resident Creation Rules</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default status for new residents</label>
            <select value={defaultStatus} onChange={e => setDefaultStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Auto-archive residents after (days)</label>
            <input 
              type="number" 
              value={autoArchiveDays} 
              onChange={e => setAutoArchiveDays(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent"
            />
          </div>

          <div className="space-y-3 col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Require key worker assignment when adding a new resident</label>
              <Switch checked={requireKeyWorker} onCheckedChange={setRequireKeyWorker} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Require home assignment when adding a new resident</label>
              <Switch checked={requireHome} onCheckedChange={setRequireHome} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Require risk level to be set when adding a new resident</label>
              <Switch checked={requireRiskLevel} onCheckedChange={setRequireRiskLevel} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">New residents created with privacy mode enabled by default</label>
              <Switch checked={privacyModeDefault} onCheckedChange={setPrivacyModeDefault} />
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save Resident and YP Settings"}
      </Button>
    </div>
  );
}