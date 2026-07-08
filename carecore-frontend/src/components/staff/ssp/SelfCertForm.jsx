import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

const ILLNESS_TYPES = [
  { value: "cold_flu", label: "Cold / Flu" },
  { value: "injury", label: "Injury" },
  { value: "mental_health", label: "Mental Health" },
  { value: "other", label: "Other" },
];

export default function SelfCertForm({ leaveRequest, onSave, isAdmin = false }) {
  const [illnessType, setIllnessType] = useState(leaveRequest.self_cert_illness_type || "");
  const [returnDate, setReturnDate] = useState(leaveRequest.self_cert_return_date || "");
  const [fitNoteUrl, setFitNoteUrl] = useState(leaveRequest.fit_note_url || "");
  const [fitNoteReceived, setFitNoteReceived] = useState(leaveRequest.fit_note_received_date || "");
  const [fitNoteExpiry, setFitNoteExpiry] = useState(leaveRequest.fit_note_expiry_date || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(!leaveRequest.self_cert_submitted);

  // Determine if fit note is required (>7 calendar days)
  const calDays = leaveRequest.date_from && leaveRequest.date_to
    ? Math.round((new Date(leaveRequest.date_to) - new Date(leaveRequest.date_from)) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const fitNoteRequired = calDays > 7;

  const handleUploadFitNote = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFitNoteUrl(file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      self_cert_illness_type: illnessType,
      self_cert_return_date: returnDate,
      self_cert_submitted: true,
      fit_note_url: fitNoteUrl,
      fit_note_received_date: fitNoteReceived,
      fit_note_expiry_date: fitNoteExpiry,
      fit_note_required: fitNoteRequired,
    });
    setSaving(false);
    setIsEditing(false);
  };

  if (!isEditing) {
    const illnessLabel = ILLNESS_TYPES.find(t => t.value === illnessType)?.label || illnessType;
    return (
      <div className="mt-3 border border-border rounded-lg p-4 space-y-4 bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-semibold text-xs text-foreground">Submitted Certification & Fit Note</span>
          </div>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setIsEditing(true)}>
            Edit Details
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Nature of Illness</span>
            <span className="text-foreground capitalize">{illnessLabel ? illnessLabel.replace(/_/g, " ") : "—"}</span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Date Returned to Work</span>
            <span className="text-foreground">{returnDate || "—"}</span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Fit Note Received Date</span>
            <span className="text-foreground">{fitNoteReceived || "—"}</span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Fit Note Expiry Date</span>
            <span className="text-foreground">{fitNoteExpiry || "—"}</span>
          </div>
          <div className="col-span-2 space-y-1">
            <span className="text-muted-foreground block font-medium">Uploaded GP Certificate</span>
            {fitNoteUrl ? (
              <a href={fitNoteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium flex items-center gap-1.5 mt-1">
                <FileText className="w-3.5 h-3.5" />
                View GP Certificate / Fit Note
              </a>
            ) : (
              <span className="text-muted-foreground">No file uploaded</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-border rounded-lg p-4 space-y-3 bg-muted/20">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-xs">
          {calDays <= 7 ? "Self-Certification (Days 1–7)" : "Fit Note Details (7+ Days)"}
        </span>
        {fitNoteRequired && (
          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Fit Note Required</span>
        )}
      </div>

      {/* Self-cert fields — always shown */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Nature of Illness</label>
          <Select value={illnessType} onValueChange={setIllnessType}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {ILLNESS_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Date Returned to Work</label>
          <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="h-8 text-xs mt-1" />
        </div>
      </div>

      {/* Fit note fields — always shown */}
      {true && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium">Fit Note (GP Certificate)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Fit Note Received Date</label>
              <Input type="date" value={fitNoteReceived} onChange={e => setFitNoteReceived(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fit Note Expiry Date</label>
              <Input type="date" value={fitNoteExpiry} onChange={e => setFitNoteExpiry(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Upload Fit Note (PDF / Image)</label>
            <div className="flex items-center gap-2 mt-1">
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs border border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading…" : fitNoteUrl ? "Replace File" : "Choose File"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadFitNote} />
              </label>
              {fitNoteUrl && (
                <a href={fitNoteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View uploaded</a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}