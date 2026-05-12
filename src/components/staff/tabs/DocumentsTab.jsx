import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, Plus, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { differenceInDays, parseISO } from "date-fns";
import { logAudit } from "@/lib/logAudit";

const DOC_TYPES = [
  { value: "dbs_certificate", label: "DBS Certificate" },
  { value: "right_to_work", label: "Right to Work" },
  { value: "contract", label: "Employment Contract" },
  { value: "qualification", label: "Qualification / Certificate" },
  { value: "id", label: "ID Document (Passport / Driving Licence)" },
  { value: "training_certificate", label: "Training Certificate" },
  { value: "supervision_record", label: "Supervision Record (Signed)" },
  { value: "appraisal_form", label: "Appraisal Form" },
  { value: "disciplinary_letter", label: "Disciplinary Letter" },
  { value: "other", label: "Other" },
];

function getDocStatus(expiryDate) {
  if (!expiryDate) return { label: "Permanent", className: "bg-muted text-muted-foreground" };
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return { label: "Expired", className: "bg-red-100 text-red-700" };
  if (days <= 90) return { label: "Expiring Soon", className: "bg-amber-100 text-amber-700" };
  return { label: "Valid", className: "bg-green-100 text-green-700" };
}

function UploadForm({ staffId, staffName, user, onClose, onSaved }) {
  const [form, setForm] = useState({ document_type: "", title: "", issue_date: "", expiry_date: "", notes: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleSave = async () => {
    if (!file && !form.title) { toast.error("Please select a file"); return; }
    if (!form.document_type) { toast.error("Select document type"); return; }
    setUploading(true);
    try {
      let file_url = "";
      if (file) {
        const res = await base44.integrations.Core.UploadFile({ file });
        file_url = res.file_url;
      }
      const status = getDocStatus(form.expiry_date).label.toLowerCase().replace(" ", "_");
      const created = await secureGateway.create("StaffDocument", {
        org_id: ORG_ID,
        staff_id: staffId,
        ...form,
        file_url,
        upload_date: new Date().toISOString().split("T")[0],
        status: form.expiry_date ? (differenceInDays(parseISO(form.expiry_date), new Date()) < 0 ? "expired" : "valid") : "valid",
      });
      await logAudit({
        entity_name: "StaffDocument", entity_id: created?.id, action: "create",
        changed_by: user?.id, changed_by_name: user?.full_name || user?.email || "",
        old_values: null,
        new_values: { document_type: form.document_type, title: form.title, expiry_date: form.expiry_date, staff_name: staffName },
        org_id: ORG_ID,
        description: `Document uploaded: ${form.title} (${form.document_type}) for ${staffName}`,
      });
      toast.success("Document uploaded");
      onSaved();
      onClose();
    } catch {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Upload Document</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Document Type *</label>
          <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select type…" /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Document Title *</label>
          <Input className="mt-1" placeholder="e.g. Enhanced DBS Certificate" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Issue Date</label>
            <Input type="date" className="mt-1" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Expiry Date</label>
            <Input type="date" className="mt-1" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">File</label>
          <div
            className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {file ? (
              <p className="text-sm font-medium text-primary">{file.name}</p>
            ) : (
              <div className="space-y-1">
                <Upload className="w-6 h-6 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">Click to upload (JPG, PNG, PDF — max 5MB)</p>
              </div>
            )}
            <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Notes</label>
          <Input className="mt-1" placeholder="Optional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={uploading || !form.document_type || !form.title}>
            {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : "Save Document"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsTab({ staffId, staffName, user }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "admin_officer";
  const [showForm, setShowForm] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["staff-docs", staffId],
    queryFn: () => secureGateway.filter("StaffDocument", { staff_id: staffId }),
    enabled: !!staffId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc) => {
      await secureGateway.delete("StaffDocument", doc.id);
      await logAudit({
        entity_name: "StaffDocument", entity_id: doc.id, action: "delete",
        changed_by: user?.id, changed_by_name: user?.full_name || user?.email || "",
        old_values: null,
        new_values: { note: `Document deleted by ${user?.full_name || "admin"}`, document_type: doc.document_type, title: doc.title, staff_name: staffName },
        org_id: ORG_ID,
        description: `Document deleted: ${doc.title} (${doc.document_type}) for ${staffName}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-docs", staffId] });
      toast.success("Document deleted");
    },
  });

  const grouped = DOC_TYPES.reduce((acc, t) => {
    acc[t.value] = docs.filter(d => d.document_type === t.value);
    return acc;
  }, {});

  const withDocs = DOC_TYPES.filter(t => grouped[t.value]?.length > 0);
  const noDocs = docs.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{docs.length} document{docs.length !== 1 ? "s" : ""} stored</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Upload Document
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : noDocs ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No documents uploaded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {withDocs.map(type => (
            <div key={type.value}>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{type.label}</p>
              {grouped[type.value].map(doc => {
                const status = getDocStatus(doc.expiry_date);
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 mb-1.5">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.issue_date && <span className="text-[10px] text-muted-foreground">Issued: {doc.issue_date}</span>}
                        {doc.expiry_date && <span className="text-[10px] text-muted-foreground">Expires: {doc.expiry_date}</span>}
                      </div>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${status.className}`}>{status.label}</Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer">
                          <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="w-3 h-3" /></Button>
                        </a>
                      )}
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(doc)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <UploadForm
          staffId={staffId}
          staffName={staffName}
          user={user}
          onClose={() => setShowForm(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["staff-docs", staffId] })}
        />
      )}
    </div>
  );
}