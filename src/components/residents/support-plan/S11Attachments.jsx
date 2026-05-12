import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "support_plan", label: "Support Plan" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "placement_plan", label: "Placement Plan" },
  { value: "pathway_plan", label: "Pathway Plan" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "legal", label: "Legal" },
  { value: "correspondence", label: "Correspondence" },
  { value: "other", label: "Other" },
];

export function getAttachmentsStatus(docs) {
  return docs && docs.length > 0 ? "completed" : "not_started";
}

export default function S11Attachments({ residentId, homeId, staffProfile, readOnly = false }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("other");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["resident-docs", residentId],
    queryFn: () => secureGateway.filter("ResidentDocument", { resident_id: residentId }, "-uploaded_at", 100),
    enabled: !!residentId,
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await secureGateway.create("ResidentDocument", {
        org_id: ORG_ID,
        resident_id: residentId,
        home_id: homeId,
        file_url,
        file_name: file.name,
        document_type: docType,
        uploaded_by: staffProfile?.id || null,
        uploaded_by_name: staffProfile?.full_name || null,
        uploaded_at: new Date().toISOString(),
      });
      toast.success("Document uploaded");
      qc.invalidateQueries({ queryKey: ["resident-docs", residentId] });
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (doc) => {
    await secureGateway.delete("ResidentDocument", doc.id);
    qc.invalidateQueries({ queryKey: ["resident-docs", residentId] });
    toast.success("Document removed");
  };

  if (isLoading) return <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No documents attached yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-primary truncate block">
                  {doc.file_name}
                </a>
                <p className="text-xs text-muted-foreground">
                  {DOC_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type}
                  {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ""}
                  {doc.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleDateString("en-GB")}` : ""}
                </p>
              </div>
              {!readOnly && (
                <button onClick={() => handleDelete(doc)} className="text-muted-foreground hover:text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-8 text-sm w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors text-sm font-medium ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload document"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}