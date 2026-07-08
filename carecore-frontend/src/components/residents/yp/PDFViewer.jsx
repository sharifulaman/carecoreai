import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Download, Loader2, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFViewer({ document, isAdmin, isResident, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const isPDF = document.file_type === "pdf";

  const handleLoadSuccess = ({ numPages }) => {
    setTotalPages(numPages);
    setLoading(false);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrint = () => {
    const printWindow = window.open(document.file_url, "_blank");
    printWindow?.print();
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-muted/50 border-b border-border p-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm truncate">{document.file_name}</h3>
        <div className="flex items-center gap-2">
          {isPDF && (
            <>
              <Button size="sm" variant="ghost" onClick={handlePrevPage} disabled={currentPage <= 1} title="Previous page">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
                {currentPage} / {totalPages}
              </span>
              <Button size="sm" variant="ghost" onClick={handleNextPage} disabled={currentPage >= totalPages} title="Next page">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {isResident && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handlePrint}
              title="Print document"
            >
              <Printer className="w-4 h-4" />
            </Button>
          )}
          <a href={document.file_url} target="_blank" rel="noopener noreferrer" download title="Download">
            <Button size="sm" variant="ghost">
              <Download className="w-4 h-4" />
            </Button>
          </a>
          {isAdmin && onDelete && (
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

      {/* Viewer */}
      <div className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center p-4">
        {isPDF ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            {loading && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            )}
            <Document file={document.file_url} onLoadSuccess={handleLoadSuccess}>
              <Page pageNumber={currentPage} />
            </Document>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">Word document</p>
            <a href={document.file_url} target="_blank" rel="noopener noreferrer" download>
              <Button>Download to view</Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}