import { useState, useEffect } from "react";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_FIELDS = [
  { key: 'time_of_contact', label: 'Time of Contact', visible: true, required: false },
  { key: 'visit_type', label: 'Visit Type', visible: true, required: true },
  { key: 'location_summary', label: 'Location Summary', visible: true, required: false },
  { key: 'presentation', label: 'Resident Presentation', visible: true, required: true },
  { key: 'placement_condition', label: 'Placement Condition', visible: true, required: false },
  { key: 'primary_purpose', label: 'Primary Purpose', visible: true, required: true },
  { key: 'college_status', label: 'College/Education Status', visible: true, required: false },
  { key: 'life_skills', label: 'Life Skills', visible: true, required: false },
  { key: 'liaison', label: 'Liaison', visible: true, required: false },
  { key: 'engagement_level', label: 'Engagement Level', visible: true, required: true },
  { key: 'risk_level', label: 'Risk Level', visible: true, required: true },
  { key: 'independence_progress', label: 'Independence Progress', visible: true, required: false },
  { key: 'health_adherence', label: 'Health Adherence', visible: true, required: false },
  { key: 'appointment_type', label: 'Appointment Type', visible: true, required: false },
  { key: 'appointment_notes', label: 'Appointment Notes', visible: true, required: false },
  { key: 'worker_notes', label: 'Worker Notes', visible: true, required: false },
];

export default function KPIFormTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [reportLength, setReportLength] = useState('standard');
  const [reportTone, setReportTone] = useState('professional');
  const [aiIncludeAge, setAiIncludeAge] = useState(true);
  const [aiIncludeHomeType, setAiIncludeHomeType] = useState(true);
  const [aiGenderNeutral, setAiGenderNeutral] = useState(false);
  const [aiPromptPrefix, setAiPromptPrefix] = useState('');
  const [aiPromptSuffix, setAiPromptSuffix] = useState('');
  const [allowDrafts, setAllowDrafts] = useState(true);
  const [requireReview, setRequireReview] = useState(true);
  const [allowEditAfterSubmit, setAllowEditAfterSubmit] = useState(false);
  const [cicAutoSave, setCicAutoSave] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedFields = await getSetting('kpi_form_fields', DEFAULT_FIELDS);
      setFields(savedFields);
      setReportLength(await getSetting('ai_report_length', 'standard'));
      setReportTone(await getSetting('ai_report_tone', 'professional'));
      setAiIncludeAge(await getSetting('ai_include_age', true));
      setAiIncludeHomeType(await getSetting('ai_include_home_type', true));
      setAiGenderNeutral(await getSetting('ai_gender_neutral', false));
      setAiPromptPrefix(await getSetting('ai_prompt_prefix', ''));
      setAiPromptSuffix(await getSetting('ai_prompt_suffix', ''));
      setAllowDrafts(await getSetting('allow_report_drafts', true));
      setRequireReview(await getSetting('require_report_review', true));
      setAllowEditAfterSubmit(await getSetting('allow_edit_after_submit', false));
      setCicAutoSave(await getSetting('cic_auto_save', false));
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleFieldVisibility = (key) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, visible: !f.visible } : f));
  };

  const toggleFieldRequired = (key) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, required: !f.required } : f));
  };

  const validateFields = () => {
    const visibleRequired = fields.filter(f => f.visible && f.required);
    if (visibleRequired.length === 0) {
      toast.error("At least one visible field must be marked as required");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateFields()) return;

    try {
      setSaving(true);
      const fieldsWithOrder = fields.map((f, idx) => ({ ...f, order: idx + 1 }));
      await saveSettings({
        kpi_form_fields: fieldsWithOrder,
        ai_report_length: reportLength,
        ai_report_tone: reportTone,
        ai_include_age: aiIncludeAge,
        ai_include_home_type: aiIncludeHomeType,
        ai_gender_neutral: aiGenderNeutral,
        ai_prompt_prefix: aiPromptPrefix,
        ai_prompt_suffix: aiPromptSuffix,
        allow_report_drafts: allowDrafts,
        require_report_review: requireReview,
        allow_edit_after_submit: allowEditAfterSubmit,
        cic_auto_save: cicAutoSave,
      });
      clearSettingsCache();
      toast.success("KPI form settings saved successfully");
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
        <h3 className="font-semibold text-lg">KPI Form Configuration</h3>
        <p className="text-sm text-muted-foreground mt-1">Control which fields appear on the visit report KPI form, whether they are required, and in what order. Changes take effect immediately for all new reports.</p>
      </div>

      {/* Section 1 — Form Field Visibility */}
      <div className="space-y-4">
        <h4 className="font-medium text-base">Form Field Visibility and Order</h4>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-4 py-3 font-medium w-8"></th>
                <th className="text-left px-4 py-3 font-medium">Field Name</th>
                <th className="text-center px-4 py-3 font-medium">Visible</th>
                <th className="text-center px-4 py-3 font-medium">Required</th>
                <th className="text-center px-4 py-3 font-medium">Order</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => (
                <tr key={field.key} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3"><GripVertical className="w-4 h-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3">{field.label}</td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={field.visible} onCheckedChange={() => toggleFieldVisibility(field.key)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch disabled={!field.visible} checked={field.required && field.visible} onCheckedChange={() => toggleFieldRequired(field.key)} />
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{idx + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2 — AI Generation Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-base">AI Report Generation</h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Generated report length per section</label>
            <select value={reportLength} onChange={e => setReportLength(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="short">Short (1 paragraph)</option>
              <option value="standard">Standard (3 paragraphs)</option>
              <option value="detailed">Detailed (5 paragraphs)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Report writing tone</label>
            <select value={reportTone} onChange={e => setReportTone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-transparent">
              <option value="professional">Professional</option>
              <option value="formal">Formal</option>
              <option value="plain">Plain English</option>
              <option value="empathetic">Empathetic</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Include resident age in AI generation context</label>
            <Switch checked={aiIncludeAge} onCheckedChange={setAiIncludeAge} />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Include home type in AI generation context</label>
            <Switch checked={aiIncludeHomeType} onCheckedChange={setAiIncludeHomeType} />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Use gender-neutral language in all reports</label>
            <Switch checked={aiGenderNeutral} onCheckedChange={setAiGenderNeutral} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Custom instruction for AI report generation</label>
            <textarea 
              value={aiPromptPrefix} 
              onChange={e => setAiPromptPrefix(e.target.value)} 
              maxLength={500}
              placeholder="e.g. Always write in first person. Focus on strengths-based language."
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm h-20"
            />
            <p className="text-xs text-muted-foreground">{aiPromptPrefix.length}/500</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Custom closing instruction</label>
            <textarea 
              value={aiPromptSuffix} 
              onChange={e => setAiPromptSuffix(e.target.value)} 
              maxLength={300}
              placeholder="e.g. Always end recommendations with a clear next review date."
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm h-16"
            />
            <p className="text-xs text-muted-foreground">{aiPromptSuffix.length}/300</p>
          </div>
        </div>
      </div>

      {/* Section 3 — Report Workflow */}
      <div className="space-y-4">
        <h4 className="font-medium text-base">Report Workflow Settings</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Allow saving reports as draft before submitting</label>
            <Switch checked={allowDrafts} onCheckedChange={setAllowDrafts} />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Require team leader review before report is marked approved</label>
            <Switch checked={requireReview} onCheckedChange={setRequireReview} />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Allow workers to edit reports after submission</label>
            <Switch checked={allowEditAfterSubmit} onCheckedChange={setAllowEditAfterSubmit} />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Automatically save CIC reports after generation</label>
            <Switch checked={cicAutoSave} onCheckedChange={setCicAutoSave} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save KPI Form Settings"}
      </Button>
    </div>
  );
}