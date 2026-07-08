import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const LANGUAGES = [
  { id: "english", label: "English" },
  { id: "arabic", label: "Arabic" },
  { id: "somali", label: "Somali" },
  { id: "kurdish_kurmanji", label: "Kurdish (Kurmanji)" },
  { id: "kurdish_sorani", label: "Kurdish Sorani" },
];

const TRANSLATION_WARNING_LANGUAGES = ["arabic", "somali", "kurdish_kurmanji", "kurdish_sorani"];

export default function WelcomePackUploadModal({ resident, homeDetails, staffProfile, onClose, onSuccess }) {
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [selectedFile, setSelectedFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only PDF and Word documents (.pdf, .docx) are supported");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      // Upload file to base44
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      const fileType = selectedFile.type === "application/pdf" ? "pdf" : "docx";

      // Deactivate any previous active documents for this home + language
      const existingDocs = await base44.entities.WelcomePack.filter({
        org_id: ORG_ID,
        home_id: resident.home_id,
        language: selectedLanguage,
        is_active: true,
      });

      for (const doc of existingDocs) {
        await base44.entities.WelcomePack.update(doc.id, { is_active: false });
      }

      // Create new welcome pack document
      await base44.entities.WelcomePack.create({
        org_id: ORG_ID,
        home_id: resident.home_id,
        language: selectedLanguage,
        file_url,
        file_name: selectedFile.name,
        file_type: fileType,
        uploaded_by: staffProfile?.id || "unknown",
        uploaded_at: new Date().toISOString(),
        is_active: true,
        notes: notes || null,
      });

      toast.success("Document uploaded successfully");
      onSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Welcome Pack Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language Selection */}
          <div>
            <label className="text-sm font-medium block mb-2">Language</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.id} value={lang.id}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Translation Warning */}
          {TRANSLATION_WARNING_LANGUAGES.includes(selectedLanguage) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">Please ensure this document has been reviewed by a qualified translator before publishing.</p>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium block mb-2">Upload File (PDF or Word)</label>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              disabled={uploading}
              className="w-full text-sm"
            />
            {selectedFile && <p className="text-xs text-muted-foreground mt-1">{selectedFile.name}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium block mb-2">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Version 2 — updated house rules March 2026"
              className="h-20"
              disabled={uploading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}