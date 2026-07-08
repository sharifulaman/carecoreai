import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, Plus, X, Download, RefreshCw, Pencil, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { useModuleActions } from "@/lib/PermissionContext";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger"; // For triggering workflows

const CATEGORIES = ["All", "Plans", "Compliance", "Assessments", "Policies", "Reports", "Important Documents", "Other"];
const DOC_TYPES_LOCKER = ["Certificate", "License", "Insurance", "Inspection", "Other"];

function LeaseStatusBadge({ leaseEnd }) {
  if (!leaseEnd) return null;
  const today = new Date().toISOString().split("T")[0];
  const in90 = new Date(); in90.setDate(in90.getDate() + 90);
  const in90Str = in90.toISOString().split("T")[0];
  if (leaseEnd < today) return <Badge className="bg-red-500/10 text-red-600 border border-red-200 text-xs">Expired</Badge>;
  if (leaseEnd <= in90Str) return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200 text-xs">Expiring Soon</Badge>;
  return <Badge className="bg-green-500/10 text-green-600 border border-green-200 text-xs">Current</Badge>;
}

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileIcon = (name) => {
  if (!name) return "📄";
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "DOC";
  if (["xls", "xlsx"].includes(ext)) return "XLS";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "IMG";
  return "FILE";
};

export default function PropertyDocumentsTab({ home, user, staffProfile }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });

  const { data: roleDefinitions = [] } = useQuery({
    queryKey: ["role-definitions"],
    queryFn: () => base44.roles.fetchDefinitions(),
  });

  const BUILTIN_RANKS = {
    system_admin: 100, admin: 100,
    rsm: 50, regional_manager: 50,
    team_leader: 20,
    support_worker: 10,
  };
  const userRoleDef = roleDefinitions.find(r => r.role_name === staffProfile?.role);
  const roleRank = userRoleDef ? userRoleDef.rank : (BUILTIN_RANKS[staffProfile?.role] || 0);
  const isHighRank = roleRank > 10;

  const { canEdit: moduleCanEdit, canAdd: moduleCanAdd } = useModuleActions("homes", {
    canEdit: user?.role === "admin" || user?.role === "team_leader",
  });

  const canEdit = moduleCanEdit && isHighRank;
  const canAdd = moduleCanAdd && isHighRank;

  // Tenancy edit state
  const [editingTenancy, setEditingTenancy] = useState(false);
  const [tenancyForm, setTenancyForm] = useState({
    lease_start: home.lease_start?.split("T")[0] || "",
    lease_end: home.lease_end?.split("T")[0] || "",
    monthly_rent: home.monthly_rent || "",
    landlord_name: home.landlord_name || "",
    landlord_contact: home.landlord_contact || "",
    landlord_email: home.landlord_email || "",
    property_notes: home.property_notes || "",
  });

  // Documents state
  const [activeSection, setActiveSection] = useState("policies");
  const [activeCategory, setActiveCategory] = useState("All");
  const [filterType, setFilterType] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ doc_name: "", doc_type: "", category: "", expiry_date: "", notes: "" });
  const [uploadErrors, setUploadErrors] = useState({});

  const allDocs = home.documents || [];
  const policyDocs = allDocs.filter(d => !d.doc_section || d.doc_section === "policies");
  const lockerDocs = allDocs.filter(d => d.doc_section === "locker");
  const activeDocs = activeSection === "policies" ? policyDocs : lockerDocs;
  const filtered = activeDocs.filter(d => {
    if (activeCategory !== "All" && d.category !== activeCategory) return false;
    if (filterType && d.doc_type !== filterType) return false;
    return true;
  });

  const updateHomeMutation = useMutation({
    mutationFn: (data) => base44.entities.Home.update(home.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-detail", home.id] });
      qc.invalidateQueries({ queryKey: ["homes"] });
    },
  });

  const saveTenancy = () => {
    updateHomeMutation.mutate(
      { ...tenancyForm, monthly_rent: tenancyForm.monthly_rent ? Number(tenancyForm.monthly_rent) : undefined },
      {
        onSuccess: () => {
          setEditingTenancy(false);
          toast.success("Tenancy details updated");
          triggerWorkflow({
            workflowType: "property_document",
            entityId: home.id,
            entityRef: `PROP-${home.id.slice(0, 8)}`,
            title: `Tenancy details updated — ${home.name}`,
            description: "Tenancy/lease information was changed and is pending review.",
            homeId: home.id,
            homeName: home.name,
            priority: "routine",
          });
        },
      }
    );
  };

  const validateUploadForm = () => {
    const errs = {};
    if (!form.doc_name?.trim()) errs.doc_name = "Document name is required";
    if (activeSection === "policies" && !form.category) errs.category = "Please select a category";
    if (activeSection === "locker" && !form.doc_type) errs.doc_type = "Please select a document type";
    if (!form.expiry_date) errs.expiry_date = "Next review date is required";
    return errs;
  };

  const handleUploadClick = () => {
    const errs = validateUploadForm();
    if (Object.keys(errs).length > 0) { setUploadErrors(errs); toast.error("Please fill in all required fields"); return; }
    fileRef.current?.click();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newDoc = {
      doc_name: form.doc_name,
      doc_type: form.doc_type,
      category: activeSection === "policies" ? form.category : "Other",
      file_url,
      file_name: file.name,
      file_size: file.size,
      expiry_date: form.expiry_date,
      notes: form.notes,
      uploaded_at: new Date().toISOString(),
      doc_section: activeSection,
      created_by_name: staffProfile ? `${staffProfile.full_name} (${staffProfile.role?.replace(/_/g, " ") || "Staff"})` : (user?.email || "Unknown"),
    };
    updateHomeMutation.mutate(
      { documents: [...allDocs, newDoc] },
      {
        onSuccess: () => {
          toast.success("Document saved");
          setShowUpload(false);
          setForm({ doc_name: "", doc_type: "", category: "", expiry_date: "", notes: "" });
          setUploadErrors({});
          triggerWorkflow({
            workflowType: "property_document",
            entityId: home.id,
            entityRef: `PROP-${home.id.slice(0, 8)}`,
            title: `Document uploaded — ${newDoc.doc_name}`,
            description: `${newDoc.category} document submitted for ${home.name}, pending review.`,
            homeId: home.id,
            homeName: home.name,
            priority: "routine",
          });
        },
      }
    );
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = (doc) => {
    updateHomeMutation.mutate({ documents: allDocs.filter(d => d !== doc) });
    toast.success("Document deleted");
  };

  return (
    <div className="space-y-6">
      {/* ── Property & Tenancy ── */}
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
              <Button size="sm" onClick={saveTenancy} disabled={updateHomeMutation.isPending}>
                {updateHomeMutation.isPending ? "Saving..." : "Save Changes"}
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

      {/* ── Home Documents & Policies ── */}
      <div className="space-y-4">
        {/* Section toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setActiveSection("policies")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === "policies" ? "bg-teal-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}
          >
            Policies, Procedures &amp; Compliance Documents
          </button>

        </div>

        {/* Category filter — only for policies */}
        {activeSection === "policies" && (
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${activeCategory === cat ? "bg-teal-600 text-white border-teal-600" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {activeSection === "policies" && (
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All types</SelectItem>
                {CATEGORIES.filter(c => c !== "All").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-1.5 border border-border rounded-lg px-2 h-8 bg-card">
            <span className="text-xs text-muted-foreground">From Home</span>
            <span className="text-xs font-medium">{home.name}</span>
            <X className="w-3 h-3 text-muted-foreground cursor-pointer" onClick={() => { }} />
          </div>
          <div className="flex-1" />
          {canAdd && (
            <Button
              className="gap-2 rounded-lg text-sm bg-teal-600 hover:bg-teal-700 text-white h-8"
              onClick={() => setShowUpload(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Upload Document
            </Button>
          )}
        </div>

        {/* Upload form */}
        {showUpload && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Upload New Document</p>
              <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Document Name <span className="text-red-500">*</span></p>
                <Input placeholder="e.g. Visitors Policy & Procedures" value={form.doc_name} onChange={e => { setForm(f => ({ ...f, doc_name: e.target.value })); setUploadErrors(ex => ({ ...ex, doc_name: undefined })); }} className={`text-sm ${uploadErrors.doc_name ? "border-destructive" : ""}`} />
                {uploadErrors.doc_name && <p className="text-xs text-destructive mt-1">{uploadErrors.doc_name}</p>}
              </div>
              {activeSection === "policies" ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Category <span className="text-red-500">*</span></p>
                  <Select value={form.category} onValueChange={v => { setForm(f => ({ ...f, category: v })); setUploadErrors(ex => ({ ...ex, category: undefined })); }}>
                    <SelectTrigger className={`text-sm ${uploadErrors.category ? "border-destructive" : ""}`}><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>{CATEGORIES.filter(c => c !== "All").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  {uploadErrors.category && <p className="text-xs text-destructive mt-1">{uploadErrors.category}</p>}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Document Type <span className="text-red-500">*</span></p>
                  <Select value={form.doc_type} onValueChange={v => { setForm(f => ({ ...f, doc_type: v })); setUploadErrors(ex => ({ ...ex, doc_type: undefined })); }}>
                    <SelectTrigger className={`text-sm ${uploadErrors.doc_type ? "border-destructive" : ""}`}><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>{DOC_TYPES_LOCKER.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  {uploadErrors.doc_type && <p className="text-xs text-destructive mt-1">{uploadErrors.doc_type}</p>}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Next Review Date <span className="text-red-500">*</span></p>
                <Input type="date" value={form.expiry_date} onChange={e => { setForm(f => ({ ...f, expiry_date: e.target.value })); setUploadErrors(ex => ({ ...ex, expiry_date: undefined })); }} className={`text-sm ${uploadErrors.expiry_date ? "border-destructive" : ""}`} />
                {uploadErrors.expiry_date && <p className="text-xs text-destructive mt-1">{uploadErrors.expiry_date}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <Input placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm" />
              </div>
            </div>
            <Button className="gap-2 rounded-xl" onClick={handleUploadClick} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Choose & Upload File"}
            </Button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          </div>
        )}

        {/* Documents table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground">Document Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground">Latest File</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-40">Alerts Read By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-36">Next Review Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-40">Created/Updated by</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No documents uploaded yet.</td>
                </tr>
              ) : filtered.map((doc, idx) => {
                const today = new Date().toISOString().split("T")[0];
                const expired = doc.expiry_date && doc.expiry_date < today;
                const expiringSoon = doc.expiry_date && !expired && doc.expiry_date <= new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];
                const iconLabel = getFileIcon(doc.file_name);
                return (
                  <tr key={idx} className={`border-b border-border/50 last:border-0 align-middle ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-sm">{doc.doc_name}</p>
                      {doc.category && <span className="text-xs text-muted-foreground capitalize">{doc.category}</span>}
                    </td>
                    <td className="px-4 py-4">
                      {doc.file_url ? (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                          <div className="w-10 h-10 rounded border border-border bg-muted/30 flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">{iconLabel}</div>
                          <div>
                            <p className="text-xs font-semibold group-hover:underline text-foreground line-clamp-1">{doc.file_name || doc.doc_name}</p>
                            {doc.file_size && <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>}
                            {doc.uploaded_at && <p className="text-xs text-muted-foreground">{new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
                          </div>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No file</span>
                      )}
                    </td>
                    <td className="px-4 py-4"><span className="text-xs text-muted-foreground">—</span></td>
                    <td className="px-4 py-4">
                      {doc.expiry_date ? (
                        <span className={`text-xs font-medium ${expired ? "text-red-600" : expiringSoon ? "text-amber-600" : "text-foreground"}`}>{fmt(doc.expiry_date)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4"><span className="text-xs text-muted-foreground">{doc.created_by_name || "—"}</span></td>
                    <td className="px-4 py-4">
                      {canEdit && (
                        <button onClick={() => handleDelete(doc)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}