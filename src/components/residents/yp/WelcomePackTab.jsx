import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import PDFViewer from "./PDFViewer";

const LANGUAGES = ["English", "Arabic", "Somali", "Kurdish", "Kurdish Sorani"];

export default function WelcomePackTab({ resident, staffProfile }) {
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedHome, setSelectedHome] = useState(resident?.home_id || "");
  const [uploading, setUploading] = useState(false);
  const [uploadLang, setUploadLang] = useState("English");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const isAdmin = staffProfile?.role === "admin";
  const canEdit = isAdmin;

  const { data: homes = [] } = useQuery({
    queryKey: ["welcome-pack-homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["welcome-pack-docs", selectedHome, selectedLanguage],
    queryFn: () => {
      if (!selectedHome) return [];
      return secureGateway.filter("WelcomePackDocument", {
        org_id: ORG_ID,
        home_id: selectedHome,
        language: selectedLanguage,
        is_active: true,
      });
    },
    enabled: !!selectedHome,
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => secureGateway.delete("WelcomePackDocument", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["welcome-pack-docs"] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only PDF and Word documents are supported");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const fileType = file.type === "application/pdf" ? "pdf" : "docx";
      
      await secureGateway.create("WelcomePackDocument", {
        org_id: ORG_ID,
        home_id: selectedHome,
        home_name: homes.find(h => h.id === selectedHome)?.name || "",
        language: uploadLang,
        file_url,
        file_name: file.name,
        file_type: fileType,
        uploaded_by: staffProfile?.id,
        uploaded_by_name: staffProfile?.full_name,
        uploaded_at: new Date().toISOString(),
        is_active: true,
      });

      queryClient.invalidateQueries({ queryKey: ["welcome-pack-docs"] });
      setShowUploadForm(false);
      setUploadLang("English");
      toast.success("Document uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload document");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const currentDoc = documents[0];

  return (
    <div className="space-y-4">
      {/* Home & Language Selection */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Home</label>
            <Select value={selectedHome} onValueChange={setSelectedHome}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select home..." />
              </SelectTrigger>
              <SelectContent>
                {homes.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Language</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isAdmin && (
          <Button 
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="w-full gap-2 rounded-lg"
          >
            <Upload className="w-4 h-4" />
            {showUploadForm ? "Cancel" : "Upload Document"}
          </Button>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && isAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Language for this document</label>
            <Select value={uploadLang} onValueChange={setUploadLang}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Choose file (PDF or Word)</label>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              disabled={uploading || !selectedHome}
              className="text-sm w-full"
            />
          </div>
          {uploading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>}
        </div>
      )}

      {/* Document Viewer */}
      {!selectedHome ? (
        <div className="text-center py-12 text-muted-foreground">
          Select a home to view welcome pack documents
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No documents available in {selectedLanguage} for this home
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Document List */}
          <div className="lg:col-span-1 space-y-2">
            {documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full text-left bg-card border-2 rounded-lg p-3 flex items-center justify-between transition-all ${
                  selectedDocId === doc.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className={`w-4 h-4 shrink-0 ${selectedDocId === doc.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{doc.language}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            {selectedDocId && documents.find(d => d.id === selectedDocId) ? (
              <PDFViewer 
                document={documents.find(d => d.id === selectedDocId)} 
                isAdmin={isAdmin}
                isResident={!isAdmin}
                onDelete={() => {
                  deleteDocMutation.mutate(selectedDocId);
                  setSelectedDocId(null);
                }}
              />
            ) : (
              <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                Select a document to view
              </div>
            )}
          </div>
        </div>
      )}

      {/* Home Info Sidebar */}
      {selectedHome && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-sm mb-3">Home Details</h3>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">Home</p>
              <p className="font-medium">{homes.find(h => h.id === selectedHome)?.name}</p>
            </div>
            {resident?.key_worker_id && (
              <div>
                <p className="text-muted-foreground">Key Worker</p>
                <p className="font-medium">{resident?.key_worker_id}</p>
              </div>
            )}
            {homes.find(h => h.id === selectedHome)?.address && (
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium text-xs">{homes.find(h => h.id === selectedHome)?.address}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}