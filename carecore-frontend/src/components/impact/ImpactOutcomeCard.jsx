import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Target, AlertTriangle, TrendingUp, BookOpen,
  CheckCircle2, Clock, Upload, User, Calendar,
  ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const RISK_CHANGE_OPTIONS = [
  { value: "increased", label: "Increased", color: "bg-red-100 text-red-700" },
  { value: "reduced", label: "Reduced", color: "bg-green-100 text-green-700" },
  { value: "unchanged", label: "Unchanged", color: "bg-amber-100 text-amber-700" },
  { value: "not_applicable", label: "Not Applicable", color: "bg-slate-100 text-slate-700" },
];

const MANAGER_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-700" },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-700" },
  { value: "changes_requested", label: "Changes Requested", color: "bg-orange-100 text-orange-700" },
  { value: "escalated", label: "Escalated", color: "bg-purple-100 text-purple-700" },
  { value: "closed", label: "Closed", color: "bg-slate-100 text-slate-700" },
];

function StatusBadge({ value, options }) {
  const opt = options.find(o => o.value === value);
  if (!opt) return null;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>;
}

/**
 * ImpactOutcomeCard — reusable Impact / Outcome panel.
 *
 * Props:
 *   record      — existing RecordImpactOutcome record (or null for new)
 *   recordType  — string: "incident" | "missing_episode" | etc.
 *   recordId    — string: parent record's id
 *   residentId  — string (optional)
 *   residentName — string (optional)
 *   homeId      — string (optional)
 *   homeName    — string (optional)
 *   orgId       — string
 *   staffProfiles — array of staff for responsible person picker
 *   currentUser — staffProfile of current user
 *   readOnly    — boolean (optional)
 *   onSaved     — callback(record) after save
 */
export default function ImpactOutcomeCard({
  record = null,
  recordType,
  recordId,
  residentId,
  residentName,
  homeId,
  homeName,
  orgId,
  staffProfiles = [],
  currentUser = null,
  readOnly = false,
  onSaved,
}) {
  const isNew = !record;
  const [expanded, setExpanded] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [managerSection, setManagerSection] = useState(false);

  const [form, setForm] = useState({
    immediate_outcome: record?.immediate_outcome || "",
    impact_on_young_person: record?.impact_on_young_person || "",
    risk_change: record?.risk_change || "unchanged",
    progress_made: record?.progress_made || "",
    learning_identified: record?.learning_identified || "",
    follow_up_required: record?.follow_up_required ?? false,
    follow_up_action: record?.follow_up_action || "",
    responsible_person_id: record?.responsible_person_id || "",
    responsible_person_name: record?.responsible_person_name || "",
    target_date: record?.target_date || "",
    completion_date: record?.completion_date || "",
    evidence_urls: record?.evidence_urls || [],
    manager_review_status: record?.manager_review_status || "pending",
    manager_review_note: record?.manager_review_note || "",
    reviewed_by_id: record?.reviewed_by_id || "",
    reviewed_by_name: record?.reviewed_by_name || "",
    reviewed_at: record?.reviewed_at || "",
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleStaffChange = (staffId) => {
    const staff = staffProfiles.find(s => s.id === staffId);
    set("responsible_person_id", staffId);
    set("responsible_person_name", staff?.full_name || "");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("evidence_urls", [...form.evidence_urls, file_url]);
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        org_id: orgId,
        record_type: recordType,
        record_id: recordId,
        resident_id: residentId,
        resident_name: residentName,
        home_id: homeId,
        home_name: homeName,
      };

      let saved;
      if (isNew) {
        saved = await base44.entities.RecordImpactOutcome.create(payload);
      } else {
        saved = await base44.entities.RecordImpactOutcome.update(record.id, payload);
      }
      toast.success("Impact & outcome saved");
      onSaved?.(saved);
    } catch (err) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Impact &amp; Outcome</p>
            <p className="text-xs text-muted-foreground">
              {isNew ? "Not yet recorded" : `Risk: `}
              {!isNew && <StatusBadge value={form.risk_change} options={RISK_CHANGE_OPTIONS} />}
              {!isNew && form.manager_review_status && (
                <span className="ml-2">
                  <StatusBadge value={form.manager_review_status} options={MANAGER_STATUS_OPTIONS} />
                </span>
              )}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">

          {/* Immediate Outcome */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Immediate Outcome
            </Label>
            <Textarea
              disabled={readOnly}
              value={form.immediate_outcome}
              onChange={e => set("immediate_outcome", e.target.value)}
              placeholder="What happened immediately as a result of this event?"
              className="text-sm min-h-[80px] resize-none"
            />
          </div>

          {/* Impact on YP */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <User className="w-3.5 h-3.5 text-blue-600" /> Impact on Young Person
            </Label>
            <Textarea
              disabled={readOnly}
              value={form.impact_on_young_person}
              onChange={e => set("impact_on_young_person", e.target.value)}
              placeholder="What was the impact on the young person?"
              className="text-sm min-h-[80px] resize-none"
            />
          </div>

          {/* Risk Change */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Risk Change
            </Label>
            <div className="flex flex-wrap gap-2">
              {RISK_CHANGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  disabled={readOnly}
                  onClick={() => set("risk_change", opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    form.risk_change === opt.value
                      ? `${opt.color} border-current`
                      : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Made */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Progress Made
            </Label>
            <Textarea
              disabled={readOnly}
              value={form.progress_made}
              onChange={e => set("progress_made", e.target.value)}
              placeholder="What progress has been made?"
              className="text-sm min-h-[70px] resize-none"
            />
          </div>

          {/* Learning Identified */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-purple-600" /> Learning Identified
            </Label>
            <Textarea
              disabled={readOnly}
              value={form.learning_identified}
              onChange={e => set("learning_identified", e.target.value)}
              placeholder="What learning has been identified?"
              className="text-sm min-h-[70px] resize-none"
            />
          </div>

          {/* Follow-Up */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                disabled={readOnly}
                onClick={() => set("follow_up_required", !form.follow_up_required)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  form.follow_up_required ? "bg-primary" : "bg-muted"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                  form.follow_up_required ? "left-5" : "left-1"
                }`} />
              </button>
              <Label className="text-xs font-semibold cursor-pointer" onClick={() => !readOnly && set("follow_up_required", !form.follow_up_required)}>
                Follow-Up Required
              </Label>
            </div>

            {form.follow_up_required && (
              <div className="pl-4 border-l-2 border-primary/30 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Follow-Up Action</Label>
                  <Textarea
                    disabled={readOnly}
                    value={form.follow_up_action}
                    onChange={e => set("follow_up_action", e.target.value)}
                    placeholder="Describe the follow-up action required"
                    className="text-sm min-h-[70px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Responsible Person
                    </Label>
                    {staffProfiles.length > 0 ? (
                      <select
                        disabled={readOnly}
                        value={form.responsible_person_id}
                        onChange={e => handleStaffChange(e.target.value)}
                        className="w-full h-9 text-sm border border-border rounded-lg px-2 bg-background focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="">Select staff member</option>
                        {staffProfiles.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        disabled={readOnly}
                        value={form.responsible_person_name}
                        onChange={e => set("responsible_person_name", e.target.value)}
                        placeholder="Responsible person name"
                        className="text-sm"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Target Date
                    </Label>
                    <Input
                      type="date"
                      disabled={readOnly}
                      value={form.target_date}
                      onChange={e => set("target_date", e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Completion Date
                    </Label>
                    <Input
                      type="date"
                      disabled={readOnly}
                      value={form.completion_date}
                      onChange={e => set("completion_date", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Evidence
            </Label>
            {form.evidence_urls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.evidence_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline truncate max-w-[200px]"
                  >
                    Evidence {i + 1}
                  </a>
                ))}
              </div>
            )}
            {!readOnly && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="file" className="hidden" onChange={handleFileUpload} />
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-dashed border-border rounded-lg hover:bg-muted transition-colors">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Uploading..." : "Upload file"}
                </span>
              </label>
            )}
          </div>

          {/* Manager Review Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setManagerSection(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold">Manager Review</span>
                <StatusBadge value={form.manager_review_status} options={MANAGER_STATUS_OPTIONS} />
              </div>
              {managerSection ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {managerSection && (
              <div className="px-4 py-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Review Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {MANAGER_STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        disabled={readOnly}
                        onClick={() => set("manager_review_status", opt.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border-2 transition-all ${
                          form.manager_review_status === opt.value
                            ? `${opt.color} border-current`
                            : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Manager Review Note</Label>
                  <Textarea
                    disabled={readOnly}
                    value={form.manager_review_note}
                    onChange={e => set("manager_review_note", e.target.value)}
                    placeholder="Add manager review notes here..."
                    className="text-sm min-h-[70px] resize-none"
                  />
                </div>

                {form.reviewed_by_name && (
                  <p className="text-xs text-muted-foreground">
                    Reviewed by <strong>{form.reviewed_by_name}</strong>
                    {form.reviewed_at && ` on ${format(new Date(form.reviewed_at), "dd MMM yyyy HH:mm")}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Save */}
          {!readOnly && (
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {isNew ? "Save Impact & Outcome" : "Update Impact & Outcome"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}