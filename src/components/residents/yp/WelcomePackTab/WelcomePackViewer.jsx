import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";

const LANGUAGE_LABELS = {
  english: "English",
  arabic: "Arabic",
  somali: "Somali",
  kurdish_kurmanji: "Kurdish (Kurmanji)",
  kurdish_sorani: "Kurdish Sorani",
};

export default function WelcomePackViewer({ document, homeDetails, selectedLanguage, isAdmin, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isPDF = document.file_type === "pdf";

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Document Viewer */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="bg-muted/50 border-b border-border p-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm">{document.file_name}</h3>
          <div className="flex items-center gap-2">
            {isPDF && (
              <>
                <Button size="sm" variant="ghost" onClick={handlePrevPage} disabled={currentPage <= 1} title="Previous page">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">Page {currentPage}</span>
                <Button size="sm" variant="ghost" onClick={handleNextPage} disabled={currentPage >= totalPages} title="Next page">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
            <a href={document.file_url} target="_blank" rel="noopener noreferrer" download>
              <Button size="sm" variant="ghost" title="Download">
                <Download className="w-4 h-4" />
              </Button>
            </a>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Viewer Content */}
         <div className="flex-1 bg-muted/20 flex items-center justify-center p-6 min-h-screen">
          {error ? (
            <div className="text-center space-y-4">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <a href={document.file_url} target="_blank" rel="noopener noreferrer" download>
                <Button>Download File</Button>
              </a>
            </div>
          ) : isPDF ? (
            <iframe
               src={document.file_url}
               className="w-full h-full rounded-lg border border-border"
               onError={() => setError("Failed to load document. Please try downloading it.")}
               onLoad={() => setLoading(false)}
               title="PDF Viewer"
             />
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Word Document</p>
              <a href={document.file_url} target="_blank" rel="noopener noreferrer" download>
                <Button>Download and View</Button>
              </a>
            </div>
          )}
        </div>
      </div>
      </div>
  );
}