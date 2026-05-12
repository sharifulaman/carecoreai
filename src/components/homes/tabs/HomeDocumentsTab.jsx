import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Trash2, Loader2, Search, MessageSquare, Plus, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["All", "Plans", "Compliance", "Assessments", "Policies", "Reports", "Important Documents", "Other"];
const DOC_TYPES_LOCKER = ["Certificate", "License", "Insurance", "Inspection", "Other"];

// Reusable document tab — now used for Home Documents & Policies
export default function HomeDocumentsTab({ home, docCategory, title, allowedTypes }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [activeSection, setActiveSection] = useState("policies"); // "policies" | "locker"
  const [activeCategory, setActiveCategory] = useState("All");
  const [filterType, setFilterType] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [form, setForm] = useState({
    doc_name: "",
    doc_type: allowedTypes?.[0] || "Policies",
    category: "Policies",
    expiry_date: "",
    notes: "",
    doc_section: "policies",
  });

  const allDocs = home.documents || [];
  const isFullPolicyTab = docCategory === "policy";

  // For the Home Documents & Policies tab: split into policies vs locker
  // For all other tabs (reg32, ofsted, insurance): just show docs matching their category/types
  const policyDocs = allDocs.filter(d => !d.doc_section || d.doc_section === "policies" || (!d.doc_section && d.doc_category === docCategory));
  const lockerDocs = allDocs.filter(d => d.doc_section === "locker");
  const categoryDocs = allDocs.filter(d => !allowedTypes || allowedTypes.includes(d.doc_type) || d.doc_category === docCategory);

  const activeDocs = !isFullPolicyTab ? categoryDocs : (activeSection === "policies" ? policyDocs : lockerDocs);

  const filtered = activeDocs.filter(d => {
    if (activeCategory !== "All" && d.category !== activeCategory) return false;
    if (filterType && d.doc_type !== filterType) return false;
    if (nameSearch && !d.doc_name?.toLowerCase().includes(nameSearch.toLowerCase())) return false;
    return true;
  });

  const update = useMutation({
    mutationFn: (data) => base44.entities.Home.update(home.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-detail", home.id] });
      qc.invalidateQueries({ queryKey: ["homes-all"] });
      toast.success("Document saved");
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!form.doc_name.trim()) { toast.error("Please enter a document name first"); return; }
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
      doc_category: docCategory,
      created_by_name: "",
    };
    update.mutate({ documents: [...allDocs, newDoc] });
    setForm(f => ({ ...f, doc_name: "", expiry_date: "", notes: "" }));
    setUploading(false);
    setShowUpload(false);
    e.target.value = "";
  };

  const handleDelete = (doc) => {
    const updated = allDocs.filter(d => d !== doc);
    update.mutate({ documents: updated });
    toast.success("Document deleted");
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

  return (
    <div className="space-y-4">
      {/* Section tabs — only shown on Home Documents & Policies tab */}
      {isFullPolicyTab && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setActiveSection("policies")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === "policies" ? "bg-teal-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}
            >
              Policies, Procedures &amp; Compliance Documents
            </button>
            <button
              onClick={() => setActiveSection("locker")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === "locker" ? "bg-teal-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}
            >
              Home Document Locker
            </button>
          </div>

          {/* Category filter tabs — only for policies section */}
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
        </>
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
          <X className="w-3 h-3 text-muted-foreground cursor-pointer" onClick={() => {}} />
        </div>
        <div className="flex-1" />
        <Button
          className="gap-2 rounded-lg text-sm bg-teal-600 hover:bg-teal-700 text-white h-8"
          onClick={() => setShowUpload(true)}
        >
          <Plus className="w-3.5 h-3.5" /> Upload Document
        </Button>
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
              <Input placeholder="e.g. Visitors Policy & Procedures" value={form.doc_name} onChange={e => setForm(f => ({ ...f, doc_name: e.target.value }))} className="text-sm" />
            </div>
            {activeSection === "policies" && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.filter(c => c !== "All").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {activeSection === "locker" && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Document Type</p>
                <Select value={form.doc_type} onValueChange={v => setForm(f => ({ ...f, doc_type: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES_LOCKER.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Next Review Date</p>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <Input placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm" />
            </div>
          </div>
          <Button className="gap-2 rounded-xl" onClick={() => fileRef.current?.click()} disabled={uploading}>
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  Document Name
                  <button className="text-muted-foreground hover:text-foreground"><Search className="w-3 h-3" /></button>
                </div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  Latest File
                  <button className="text-muted-foreground hover:text-foreground"><Search className="w-3 h-3" /></button>
                </div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-40">Alerts Read By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-36">Next Review Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-40">
                <div className="flex items-center gap-1.5">
                  Created/Updated by
                  <button className="text-muted-foreground hover:text-foreground"><Search className="w-3 h-3" /></button>
                </div>
              </th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No documents uploaded yet.
                </td>
              </tr>
            ) : filtered.map((doc, idx) => {
              const today = new Date().toISOString().split("T")[0];
              const expired = doc.expiry_date && doc.expiry_date < today;
              const expiringSoon = doc.expiry_date && !expired && doc.expiry_date <= new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];
              const iconLabel = getFileIcon(doc.file_name);

              return (
                <tr key={idx} className={`border-b border-border/50 last:border-0 align-middle ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  {/* Document Name */}
                  <td className="px-4 py-4">
                    <p className="font-semibold text-sm">{doc.doc_name}</p>
                    {doc.category && (
                      <span className="text-xs text-muted-foreground capitalize">{doc.category}</span>
                    )}
                  </td>

                  {/* Latest File */}
                  <td className="px-4 py-4">
                    {doc.file_url ? (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded border border-border bg-muted/30 flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                          {iconLabel}
                        </div>
                        <div>
                          <p className="text-xs font-semibold group-hover:underline text-foreground line-clamp-1">{doc.file_name || doc.doc_name}</p>
                          {doc.file_size && <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>}
                          {doc.uploaded_at && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })},{" "}
                              {new Date(doc.uploaded_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No file</span>
                    )}
                  </td>

                  {/* Alerts Read By — placeholder */}
                  <td className="px-4 py-4">
                    <span className="text-xs text-muted-foreground">—</span>
                  </td>

                  {/* Next Review Date */}
                  <td className="px-4 py-4">
                    {doc.expiry_date ? (
                      <span className={`text-xs font-medium ${expired ? "text-red-600" : expiringSoon ? "text-amber-600" : "text-foreground"}`}>
                        {formatDate(doc.expiry_date)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Created/Updated by */}
                  <td className="px-4 py-4">
                    <span className="text-xs text-muted-foreground">{doc.created_by_name || "—"}</span>
                  </td>

                  {/* Delete */}
                  <td className="px-4 py-4">
                    <button onClick={() => handleDelete(doc)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}