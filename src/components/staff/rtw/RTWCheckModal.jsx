import { useState } from "react";
import { X, Eye, EyeOff, ExternalLink, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const DOC_TYPES = [
  { value: "uk_passport", label: "UK Passport" },
  { value: "irish_passport", label: "Irish Passport" },
  { value: "biometric_card", label: "Biometric Residence Permit" },
  { value: "settled_status_share_code", label: "Settled Status Share Code" },
  { value: "pre_settled_share_code", label: "Pre-Settled Status Share Code" },
  { value: "birth_certificate_plus_ni", label: "Birth Certificate + NI Letter" },
  { value: "certificate_of_naturalisation", label: "Certificate of Naturalisation" },
  { value: "other", label: "Other" },
];

const SHARE_CODE_TYPES = ["settled_status_share_code", "pre_settled_share_code"];

export default function RTWCheckModal({ member, checkedByName, onSave, onClose }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    rtw_check_date: today,
    rtw_document_type: member.rtw_document_type || "",
    rtw_share_code: "",
    rtw_expiry_date: member.rtw_expiry_date || "",
    rtw_follow_up_date: member.rtw_follow_up_date || "",
    rtw_document_url: member.rtw_document_url || "",
    rtw_notes: member.rtw_notes || "",
    indefinite: !member.rtw_expiry_date,
  });
  const [showCode, setShowCode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isShareCode = SHARE_CODE_TYPES.includes(form.rtw_document_type);
  const isPreSettled = form.rtw_document_type === "pre_settled_share_code";

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setField("rtw_document_url", file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.rtw_check_date || !form.rtw_document_type) return;
    setSaving(true);
    await onSave({
      rtw_checked: true,
      rtw_check_date: form.rtw_check_date,
      rtw_document_type: form.rtw_document_type,
      rtw_share_code: isShareCode ? form.rtw_share_code : "",
      rtw_expiry_date: form.indefinite ? "" : form.rtw_expiry_date,
      rtw_follow_up_date: isPreSettled ? form.rtw_follow_up_date : "",
      rtw_document_url: form.rtw_document_url,
      rtw_notes: form.rtw_notes,
      rtw_checked_by: checkedByName,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold">Record Right to Work Check</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{member.full_name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Legal notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>UK employers must check the right to work of every employee before employment begins. Failure is a criminal offence. See <a href="https://www.gov.uk/check-job-applicant-right-to-work" target="_blank" rel="noopener noreferrer" className="underline font-medium">gov.uk guidance</a>.</span>
          </div>

          {/* Check date */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Check Date <span className="text-red-500">*</span></label>
            <Input type="date" value={form.rtw_check_date} onChange={e => setField("rtw_check_date", e.target.value)} className="h-8 text-sm" />
          </div>

          {/* Document type */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Document Type <span className="text-red-500">*</span></label>
            <Select value={form.rtw_document_type} onValueChange={v => setField("rtw_document_type", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select document…" /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Share code section */}
          {isShareCode && (
            <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2 text-xs text-amber-800">
                <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Go to <a href="https://www.gov.uk/view-right-to-work" target="_blank" rel="noopener noreferrer" className="underline font-medium">gov.uk/view-right-to-work</a> and enter the share code provided by the employee. Record the result here.</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Share Code</label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showCode ? "text" : "password"}
                    value={form.rtw_share_code}
                    onChange={e => setField("rtw_share_code", e.target.value)}
                    placeholder="e.g. ABC-DEF-GHI"
                    className="h-8 text-sm font-mono flex-1"
                  />
                  <button onClick={() => setShowCode(s => !s)} className="text-muted-foreground hover:text-foreground p-1">
                    {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {isPreSettled && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Next Recheck Date (pre-settled: every 6 months)</label>
                  <Input type="date" value={form.rtw_follow_up_date} onChange={e => setField("rtw_follow_up_date", e.target.value)} className="h-8 text-sm" />
                </div>
              )}
            </div>
          )}

          {/* Indefinite toggle */}
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground">Indefinite Right to Work</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.indefinite}
                onChange={e => { setField("indefinite", e.target.checked); if (e.target.checked) setField("rtw_expiry_date", ""); }}
                className="rounded w-3.5 h-3.5 accent-primary"
              />
              <span className="text-xs">{form.indefinite ? "Yes" : "No"}</span>
            </label>
          </div>

          {/* Expiry date */}
          {!form.indefinite && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">RTW Expiry Date</label>
              <Input type="date" value={form.rtw_expiry_date} onChange={e => setField("rtw_expiry_date", e.target.value)} className="h-8 text-sm" />
            </div>
          )}

          {/* Document upload */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Document Upload (photo / scan)</label>
            <div className="flex items-center gap-3">
              {form.rtw_document_url && (
                <a href={form.rtw_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View Current
                </a>
              )}
              <label className="flex items-center gap-1.5 text-xs cursor-pointer bg-muted hover:bg-muted/70 rounded-md px-3 py-1.5 border border-border transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading…" : "Upload Document"}
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Checked by */}
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground">Checked By</span>
            <span className="text-xs font-medium">{checkedByName}</span>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes</label>
            <textarea
              value={form.rtw_notes}
              onChange={e => setField("rtw_notes", e.target.value)}
              placeholder="Any additional notes…"
              className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={!form.rtw_check_date || !form.rtw_document_type || saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save RTW Check"}
          </Button>
        </div>
      </div>
    </div>
  );
}