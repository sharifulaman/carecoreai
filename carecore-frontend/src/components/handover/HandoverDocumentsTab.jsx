import { Paperclip, Plus, FileText, Upload, Loader2, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { format } from "date-fns";

export default function HandoverDocumentsTab({ handover, locked }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["handover-documents", handover?.id],
    queryFn: () => base44.entities.HandoverDocument.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });

  const createDoc = useMutation({
    mutationFn: (data) => base44.entities.HandoverDocument.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover-documents", handover?.id] });
      toast.success("Document attached to handover");
    },
  });

  const deleteDoc = useMutation({
    mutationFn: (id) => base44.entities.HandoverDocument.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover-documents", handover?.id] });
      toast.success("Document deleted");
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!handover?.id) {
      toast.error("Please start or save the handover first");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      createDoc.mutate({
        org_id: ORG_ID,
        handover_id: handover.id,
        home_id: handover.home_id,
        title: file.name,
        file_name: file.name,
        file_url: file_url,
        uploaded_by: handover.outgoing_staff_name || "Staff",
      });
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDoc.mutate(docId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Documents &amp; Evidence</h3>
        {!locked && (
          <label className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold cursor-pointer">
            {uploading || createDoc.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Upload Document
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading || createDoc.isPending} />
          </label>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Paperclip className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No documents attached to this handover</p>
          {!locked && (
            <label className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:underline cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Upload a document
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading || createDoc.isPending} />
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-slate-700 hover:text-teal-600 flex items-center gap-1.5 hover:underline"
                  >
                    {doc.title || doc.file_name}
                    <ExternalLink className="w-3.5 h-3.5 inline text-slate-400" />
                  </a>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Uploaded by {doc.uploaded_by || "Staff"} · {doc.created_date ? format(new Date(doc.created_date), "dd MMM yyyy, HH:mm") : ""}
                  </p>
                </div>
              </div>
              {!locked && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteDoc.isPending}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}