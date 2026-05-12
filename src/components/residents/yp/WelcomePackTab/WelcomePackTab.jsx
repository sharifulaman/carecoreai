import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import WelcomePackLanguageSelector from "./WelcomePackLanguageSelector";
import WelcomePackUploadModal from "./WelcomePackUploadModal";
import WelcomePackViewer from "./WelcomePackViewer";

const LANGUAGES = [
  { id: "english", label: "English" },
  { id: "arabic", label: "Arabic" },
  { id: "somali", label: "Somali" },
  { id: "kurdish_kurmanji", label: "Kurdish (Kurmanji)" },
  { id: "kurdish_sorani", label: "Kurdish Sorani" },
];

export default function WelcomePackTab({ resident, staffProfile, homes = [], user }) {
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Check role from staffProfile OR from user context (fallback)
  const isAdmin = staffProfile?.role === "admin" || user?.role === "admin";
  const canUpload = isAdmin;
  const currentHome = useMemo(() => homes.find(h => h.id === resident?.home_id), [homes, resident?.home_id]);

  // Fetch all welcome pack documents for this home
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["welcome-pack", resident?.home_id],
    queryFn: async () => {
      if (!resident?.home_id) return [];
      return base44.entities.WelcomePack.filter({
        org_id: ORG_ID,
        home_id: resident.home_id,
        is_active: true,
      });
    },
    enabled: !!resident?.home_id,
  });

  // Get home details from homes prop
  const homeDetails = useMemo(() => homes.find(h => h.id === resident?.home_id), [homes, resident?.home_id]);

  // Get document for current language
  const currentDocument = documents.find(d => d.language === selectedLanguage);

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.WelcomePack.update(docId, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["welcome-pack"] });
      toast.success("Document removed");
    },
    onError: () => toast.error("Failed to remove document"),
  });

  if (!resident?.home_id) {
    return <div className="text-center py-12 text-muted-foreground">Select a resident to view welcome pack</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <WelcomePackLanguageSelector
          languages={LANGUAGES}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          availableLanguages={documents.map(d => d.language)}
        />
        {canUpload && (
          <Button onClick={() => setShowUploadModal(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <WelcomePackUploadModal
          resident={resident}
          homeDetails={homeDetails}
          staffProfile={staffProfile}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["welcome-pack"] });
            setShowUploadModal(false);
          }}
        />
      )}

      {/* Document Viewer or Empty State */}
      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : currentDocument ? (
        <WelcomePackViewer
          document={currentDocument}
          homeDetails={homeDetails}
          selectedLanguage={selectedLanguage}
          isAdmin={isAdmin}
          onDelete={() => {
            if (confirm(`Are you sure you want to remove the ${selectedLanguage} welcome pack for ${currentHome?.name}? Residents and staff will no longer be able to view it.`)) {
              deleteMutation.mutate(currentDocument.id);
            }
          }}
        />
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center space-y-4">
          <p className="text-muted-foreground">No welcome pack available in this language yet.</p>
          {canUpload && (
            <p className="text-sm text-muted-foreground">Upload a document to make it available for residents and staff.</p>
          )}
        </div>
      )}
    </div>
  );
}