import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function StatDetailModal({ title, children, onClose, linkLabel, linkPath }) {
  const navigate = useNavigate();

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleBackdropClick}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-base">{title}</h2>
          <div className="flex items-center gap-2">
            {linkPath && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs rounded-lg h-7"
                onClick={() => { navigate(linkPath); onClose(); }}
              >
                {linkLabel || "View All"}
              </Button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-5 space-y-3 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}