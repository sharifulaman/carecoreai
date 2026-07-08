import { X, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function StatsModal({ status, complaints, residents, homes, onSelectComplaint, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);
  const residentMap = Object.fromEntries((residents || []).map(r => [r.id, r]));
  const homeMap = Object.fromEntries((homes || []).map(h => [h.id, h]));

  const title = status === "open" ? "Open Complaints" : status === "resolved" ? "Resolved Complaints" : "All Complaints";
  const icon = status === "open" ? AlertCircle : status === "resolved" ? CheckCircle : null;
  const iconColor = status === "open" ? "text-amber-600" : status === "resolved" ? "text-green-600" : "text-slate-600";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <icon className={`w-6 h-6 ${iconColor}`} />}
            <div>
              <p className="text-lg font-bold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{complaints.length} {complaints.length === 1 ? "complaint" : "complaints"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {complaints.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">No complaints in this category.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {complaints.map(c => {
                const isOverdue = c.target_resolution_date && c.target_resolution_date < new Date().toISOString().split("T")[0];
                const statusColor = c.status === "resolved" || c.status === "closed" ? "border-l-green-400 bg-green-50/30" : "border-l-amber-400 bg-amber-50/30";
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectComplaint(c)}
                    className={`block w-full text-left bg-card border border-border rounded-lg p-3 hover:shadow-md hover:border-primary/40 transition-all duration-200 ${statusColor} ${isOverdue ? "border-l-red-500" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{residentMap[c.resident_id]?.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.complaint_id} · {c.complaint_type?.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{homeMap[c.home_id]?.name || "Unknown home"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-muted-foreground">{new Date(c.received_datetime).toLocaleDateString("en-GB")}</p>
                        <p className="text-xs text-muted-foreground">{daysSince(c.received_datetime)}d ago</p>
                        {isOverdue && <p className="text-xs text-red-700 font-semibold mt-1">⚠️ Overdue</p>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}