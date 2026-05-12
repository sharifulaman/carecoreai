import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Loader2, Plus, X, Download, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPE_LABELS = {
  gas_safety: "Gas Safety Certificate",
  electric_cert: "Electrical Certificate",
  eicr: "EICR",
  fire_risk: "Fire Risk Assessment",
  insurance: "Insurance",
  lease: "Lease Agreement",
  planning: "Planning Permission",
  dbs_bulk: "DBS Bulk Check",
  ofsted_report: "Ofsted Report",
  cqc_report: "CQC Report",
  reg32: "Reg 32",
  policy: "Policy",
  procedure: "Procedure",
  other: "Other",
};

function getDocStatus(doc) {
  if (!doc.expiry_date) return "no_expiry";
  const today = new Date().toISOString().split("T")[0];
  const reminder = doc.reminder_days || 30;
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + reminder);
  const reminderStr = reminderDate.toISOString().split("T")[0];
  if (doc.expiry_date < today) return "expired";
  if (doc.expiry_date <= reminderStr) return "expiring_soon";
  return "current";
}

function StatusBadge({ status }) {
  if (status === "expired") return <Badge className="bg-red-500/10 text-red-600 border border-red-200 text-[10px]">Expired</Badge>;
  if (status === "expiring_soon") return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200 text-[10px]">Expiring Soon</Badge>;
  if (status === "no_expiry") return <Badge className="bg-muted text-muted-foreground border border-border text-[10px]">No Expiry</Badge>;
  return <Badge className="bg-green-500/10 text-green-600 border border-green-200 text-[10px]">Current</Badge>;
}

function LeaseStatusBadge({ leaseEnd }) {
  if (!leaseEnd) return null;
  const today = new Date().toISOString().split("T")[0];
  const in90 = new Date(); in90.setDate(in90.getDate() + 90);
  const in90Str = in90.toISOString().split("T")[0];
  if (leaseEnd < today) return <Badge className="bg-red-500/10 text-red-600 border border-red-200 text-xs">Expired</Badge>;
  if (leaseEnd <= in90Str) return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200 text-xs">Expiring Soon</Badge>;
  return <Badge className="bg-green-500/10 text-green-600 border border-green-200 text-xs">Current</Badge>;
}

export default function PropertyTenancyTab({ home, user }) {
  const qc = useQueryClient();
  const canEdit = user?.role === "admin" || user?.role === "team_leader";
  const [editingTenancy, setEditingTenancy] = useState(false);
  const [tenancyForm, setTenancyForm] = useState({
    lease_start: home.lease_start || "",
    lease_end: home.lease_end || "",
    monthly_rent: home.monthly_rent || "",
    landlord_name: home.landlord_name || "",
    landlord_contact: home.landlord_contact || "",
    landlord_email: home.landlord_email || "",
    property_notes: home.property_notes || "",
  });

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    document_type: "other",
    issue_date: "",
    expiry_date: "",
    reminder_days: 30,
    notes: "",
  });
  const fileInputRef = useState(null);

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["home-documents", home.id],
    queryFn: () => base44.entities.HomeDocument.filter({ org_id: ORG_ID, home_id: home.id }),
  });

  // Only show current versions (not superseded)
  const currentDocs = documents.filter(d => !d.superseded_by && !d.deleted_at);

  const updateHome = useMutation({
    mutationFn: (data) => base44.entities.Home.update(home.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-detail", home.id] });
      qc.invalidateQueries({ queryKey: ["homes"] });
      setEditingTenancy(false);
      toast.success("Tenancy details updated");
    },
  });

  const createDoc = useMutation({
    mutationFn: (data) => base44.entities.HomeDocument.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-documents", home.id] });
      qc.invalidateQueries({ queryKey: ["home-documents-expiry"] });
      setShowUploadForm(false);
      setUploadForm({ title: "", document_type: "other", issue_date: "", expiry_date: "", reminder_days: 30, notes: "" });
      toast.success("Document uploaded");
    },
  });

  const supersedeMutation = useMutation({
    mutationFn: async ({ oldDocId, file, oldDoc }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newDoc = await base44.entities.HomeDocument.create({
        org_id: ORG_ID,
        home_id: home.id,
        title: oldDoc.title,
        document_type: oldDoc.document_type,
        file_url,
        file_name: file.name,
        file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        upload_date: new Date().toISOString().split("T")[0],
        issue_date: oldDoc.issue_date,
        expiry_date: oldDoc.expiry_date,
        reminder_days: oldDoc.reminder_days || 30,
        notes: oldDoc.notes,
        version: (oldDoc.version || 1) + 1,
      });
      await base44.entities.HomeDocument.update(oldDocId, { superseded_by: newDoc.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-documents", home.id] });
      qc.invalidateQueries({ queryKey: ["home-documents-expiry"] });
      toast.success("New version uploaded");
    },
  });

  const deleteDoc = useMutation({
    mutationFn: (id) => base44.entities.HomeDocument.update(id, { deleted_at: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-documents", home.id] });
      qc.invalidateQueries({ queryKey: ["home-documents-expiry"] });
      toast.success("Document removed");
    },
  });

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!uploadForm.title.trim()) { toast.error("Please enter a document title first"); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    createDoc.mutate({
      org_id: ORG_ID,
      home_id: home.id,
      title: uploadForm.title,
      document_type: uploadForm.document_type,
      file_url,
      file_name: file.name,
      file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      upload_date: new Date().toISOString().split("T")[0],
      issue_date: uploadForm.issue_date,
      expiry_date: uploadForm.expiry_date,
      reminder_days: Number(uploadForm.reminder_days) || 30,
      notes: uploadForm.notes,
      version: 1,
    });
    setUploading(false);
    e.target.value = "";
  };

  const handleNewVersion = async (doc, e) => {
    const file = e.target.files[0];
    if (!file) return;
    supersedeMutation.mutate({ oldDocId: doc.id, file, oldDoc: doc });
    e.target.value = "";
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-6">
      {/* Section 1: Tenancy Details */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Property & Tenancy</h2>
          {canEdit && !editingTenancy && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setEditingTenancy(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>

        {editingTenancy ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Lease Start</Label><Input type="date" value={tenancyForm.lease_start} onChange={e => setTenancyForm(f => ({ ...f, lease_start: e.target.value }))} className="mt-1.5" /></div>
              <div><Label className="text-xs">Lease End</Label><Input type="date" value={tenancyForm.lease_end} onChange={e => setTenancyForm(f => ({ ...f, lease_end: e.target.value }))} className="mt-1.5" /></div>
              <div><Label className="text-xs">Monthly Rent (£)</Label><Input type="number" value={tenancyForm.monthly_rent} onChange={e => setTenancyForm(f => ({ ...f, monthly_rent: e.target.value }))} className="mt-1.5" /></div>
              <div><Label className="text-xs">Landlord Name</Label><Input value={tenancyForm.landlord_name} onChange={e => setTenancyForm(f => ({ ...f, landlord_name: e.target.value }))} className="mt-1.5" /></div>
              <div><Label className="text-xs">Landlord Phone</Label><Input value={tenancyForm.landlord_contact} onChange={e => setTenancyForm(f => ({ ...f, landlord_contact: e.target.value }))} className="mt-1.5" /></div>
              <div><Label className="text-xs">Landlord Email</Label><Input type="email" value={tenancyForm.landlord_email} onChange={e => setTenancyForm(f => ({ ...f, landlord_email: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div><Label className="text-xs">Property Notes</Label><Input value={tenancyForm.property_notes} onChange={e => setTenancyForm(f => ({ ...f, property_notes: e.target.value }))} className="mt-1.5" placeholder="Notes about the building or tenancy..." /></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingTenancy(false)}>Cancel</Button>
              <Button size="sm" onClick={() => updateHome.mutate({ ...tenancyForm, monthly_rent: tenancyForm.monthly_rent ? Number(tenancyForm.monthly_rent) : undefined })} disabled={updateHome.isPending}>
                {updateHome.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Lease Start</p>
              <p className="text-sm font-medium mt-0.5">{fmt(home.lease_start)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lease End</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-medium">{fmt(home.lease_end)}</p>
                <LeaseStatusBadge leaseEnd={home.lease_end} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Rent</p>
              <p className="text-sm font-medium mt-0.5">{home.monthly_rent ? `£${Number(home.monthly_rent).toLocaleString()}/month` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Landlord</p>
              <p className="text-sm font-medium mt-0.5">{home.landlord_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Landlord Phone</p>
              <p className="text-sm font-medium mt-0.5">{home.landlord_contact || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Landlord Email</p>
              <p className="text-sm font-medium mt-0.5">{home.landlord_email || "—"}</p>
            </div>
            {home.property_notes && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Property Notes</p>
                <p className="text-sm mt-0.5">{home.property_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Documents */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Compliance Documents</h2>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowUploadForm(v => !v)}>
            <Plus className="w-3.5 h-3.5" /> Upload Document
          </Button>
        </div>

        {showUploadForm && (
          <div className="mb-5 p-4 bg-muted/30 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">New Document</p>
              <button onClick={() => setShowUploadForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Title *</Label>
                <Input value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gas Safety Certificate 2026" className="mt-1.5 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Document Type</Label>
                <Select value={uploadForm.document_type} onValueChange={v => setUploadForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger className="mt-1.5 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Issue Date</Label>
                <Input type="date" value={uploadForm.issue_date} onChange={e => setUploadForm(f => ({ ...f, issue_date: e.target.value }))} className="mt-1.5 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" value={uploadForm.expiry_date} onChange={e => setUploadForm(f => ({ ...f, expiry_date: e.target.value }))} className="mt-1.5 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Reminder Days Before Expiry</Label>
                <Input type="number" value={uploadForm.reminder_days} onChange={e => setUploadForm(f => ({ ...f, reminder_days: e.target.value }))} className="mt-1.5 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input value={uploadForm.notes} onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional..." className="mt-1.5 text-sm" />
              </div>
            </div>
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${uploading ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Choose & Upload File"}
              <input type="file" className="hidden" onChange={handleUploadFile} disabled={uploading} />
            </label>
          </div>
        )}

        {docsLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : currentDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {currentDocs.sort((a, b) => (a.document_type || "").localeCompare(b.document_type || "")).map(doc => {
              const status = getDocStatus(doc);
              return (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">{doc.title}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                      {doc.version > 1 && <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">v{doc.version}</span>}
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {doc.issue_date && <span className="text-xs text-muted-foreground">Issued: {fmt(doc.issue_date)}</span>}
                      {doc.expiry_date && <span className="text-xs text-muted-foreground">Expires: {fmt(doc.expiry_date)}</span>}
                      {doc.file_name && <span className="text-xs text-muted-foreground">{doc.file_name} {doc.file_size ? `· ${doc.file_size}` : ""}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    )}
                    <label className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" /> New version
                      <input type="file" className="hidden" onChange={(e) => handleNewVersion(doc, e)} />
                    </label>
                    {user?.role === "admin" && (
                      <button onClick={() => deleteDoc.mutate(doc.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}