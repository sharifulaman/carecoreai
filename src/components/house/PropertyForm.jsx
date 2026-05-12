import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, Upload, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DOC_TYPES = [
  "Ofsted Registration",
  "CQC Registration",
  "Fire Risk Assessment",
  "Gas Safety Certificate",
  "Electrical Safety Certificate",
  "EPC Certificate",
  "Public Liability Insurance",
  "Building Insurance",
  "DBS Renewal Reminder",
  "Lease Agreement",
  "Planning Permission",
  "Other",
];

function DocumentRow({ doc, index, onChange, onRemove }) {
  const set = (k, v) => onChange(index, { ...doc, [k]: v });
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("file_url", file_url);
    setUploading(false);
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Document {index + 1}</span>
        <button onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Document Type *</Label>
          <Select value={doc.doc_type} onValueChange={v => set("doc_type", v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Document Name</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="e.g. Gas Safety 2025" value={doc.doc_name} onChange={e => set("doc_name", e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Expiry Date</Label>
          <Input className="mt-1 h-8 text-sm" type="date" value={doc.expiry_date} onChange={e => set("expiry_date", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="Optional notes" value={doc.notes} onChange={e => set("notes", e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">File Upload (optional)</Label>
        <div className="mt-1 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <Upload className="w-3 h-3" />
            {uploading ? "Uploading…" : doc.file_url ? "Replace file" : "Choose file"}
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
          </label>
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              <FileText className="w-3 h-3" /> View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PropertyForm({ existingHomes = [], staff = [], onSubmit, onClose, saving }) {
  const [mode, setMode] = useState("new"); // "new" | "existing"
  const [selectedHomeId, setSelectedHomeId] = useState("");
  const [showDocs, setShowDocs] = useState(true);

  const [data, setData] = useState({
    name: "", address: "", postcode: "", phone: "", email: "",
    type: "outreach", care_model: "residential",
    compliance_framework: "ofsted", status: "active",
    team_leader_id: "", support_worker_ids: [],
    documents: [],
  });
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  
  const teamLeaders = staff.filter(s => s.role === "team_leader" && s.status === "active");
  const supportWorkers = staff.filter(s => s.role === "support_worker" && s.status === "active");

  // When selecting an existing home, load its data
  const handleSelectHome = (id) => {
    setSelectedHomeId(id);
    const home = existingHomes.find(h => h.id === id);
    if (home) {
      setData({
        name: home.name || "",
        address: home.address || "",
        postcode: home.postcode || "",
        phone: home.phone || "",
        email: home.email || "",
        type: home.type || "outreach",
        care_model: home.care_model || "residential",
        compliance_framework: home.compliance_framework || "ofsted",
        status: home.status || "active",
        team_leader_id: home.team_leader_id || "",
        support_worker_ids: home.support_worker_ids || [],
        documents: home.documents || [],
      });
    }
  };

  const addDoc = () => set("documents", [...data.documents, { doc_type: "", doc_name: "", file_url: "", expiry_date: "", notes: "", uploaded_at: new Date().toISOString().split("T")[0] }]);
  const updateDoc = (i, doc) => set("documents", data.documents.map((d, idx) => idx === i ? doc : d));
  const removeDoc = (i) => set("documents", data.documents.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (mode === "existing" && selectedHomeId) {
      onSubmit({ id: selectedHomeId, data });
    } else {
      onSubmit({ data });
    }
  };

  const canSave = mode === "new" ? (data.name && data.address && data.team_leader_id) : !!selectedHomeId;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg md:max-w-2xl max-h-[95vh] md:max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-base md:text-lg">Add / Modify Home</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-5">
          {/* Mode selector */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "new" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => { setMode("new"); setSelectedHomeId(""); setData({ name: "", address: "", postcode: "", phone: "", email: "", type: "outreach", care_model: "residential", compliance_framework: "ofsted", status: "active", documents: [] }); }}
            >
              + New Home
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "existing" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode("existing")}
            >
              Modify Existing
            </button>
          </div>

          {/* Existing home selector */}
          {mode === "existing" && (
            <div>
              <Label>Select Home *</Label>
              <Select value={selectedHomeId} onValueChange={handleSelectHome}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose a home to edit…" /></SelectTrigger>
                <SelectContent>
                  {existingHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name} — {h.address}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Home details */}
          {(mode === "new" || selectedHomeId) && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input className="mt-1.5" value={data.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Maple House" /></div>
                <div>
                    <Label>Home Type</Label>
                    <Select value={data.type} onValueChange={v => set("type", v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outreach">Outreach</SelectItem>
                        <SelectItem value="24_hours">24 Hours Housing</SelectItem>
                        <SelectItem value="care">Care Services</SelectItem>
                        <SelectItem value="18_plus">18+ Accommodation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
              <div><Label>Address *</Label><Input className="mt-1.5" value={data.address} onChange={e => set("address", e.target.value)} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Postcode</Label><Input className="mt-1.5" value={data.postcode} onChange={e => set("postcode", e.target.value)} /></div>
                <div><Label>Phone</Label><Input className="mt-1.5" value={data.phone} onChange={e => set("phone", e.target.value)} /></div>
              </div>
              <div><Label>Email</Label><Input className="mt-1.5" type="email" value={data.email} onChange={e => set("email", e.target.value)} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Team Leader *</Label>
                  <Select value={data.team_leader_id} onValueChange={v => set("team_leader_id", v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select team leader…" /></SelectTrigger>
                    <SelectContent>
                      {teamLeaders.map(tl => <SelectItem key={tl.id} value={tl.id}>{tl.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Support Workers</Label>
                  <Select value={data.support_worker_ids[0] || ""} onValueChange={v => set("support_worker_ids", v ? [v] : [])}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select support workers…" /></SelectTrigger>
                    <SelectContent>
                      {supportWorkers.map(sw => <SelectItem key={sw.id} value={sw.id}>{sw.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Care Model</Label>
                  <Select value={data.care_model} onValueChange={v => set("care_model", v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compliance</Label>
                  <Select value={data.compliance_framework} onValueChange={v => set("compliance_framework", v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ofsted">Ofsted</SelectItem>
                      <SelectItem value="cqc">CQC</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={data.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Documents section */}
              <div>
                <button
                  type="button"
                  className="flex items-center justify-between w-full py-2 border-b border-border"
                  onClick={() => setShowDocs(v => !v)}
                >
                  <span className="font-medium text-sm">Documents ({data.documents.length})</span>
                  {showDocs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showDocs && (
                  <div className="mt-3 space-y-3">
                    {data.documents.map((doc, i) => (
                      <DocumentRow key={i} doc={doc} index={i} onChange={updateDoc} onRemove={removeDoc} />
                    ))}
                    <button
                      type="button"
                      onClick={addDoc}
                      className="flex items-center gap-2 text-sm text-primary border border-dashed border-primary/40 rounded-xl px-4 py-2.5 w-full justify-center hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Document
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 md:gap-3 p-4 md:p-6 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSave || saving}>
            {saving ? "Saving…" : mode === "existing" ? "Save Changes" : "Add Home"}
          </Button>
        </div>
      </div>
    </div>
  );
}