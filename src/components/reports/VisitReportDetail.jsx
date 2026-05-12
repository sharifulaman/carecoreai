import { useState } from "react";
import { X, CheckCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";

export default function VisitReportDetail({ report, onClose, staffProfile }) {
  const qc = useQueryClient();
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesNote, setChangesNote] = useState("");

  const isTL = staffProfile?.role === "team_leader" || staffProfile?.role === "admin";
  const canReview = isTL && report.status === "submitted";

  const approveMutation = useMutation({
    mutationFn: () => secureGateway.update("VisitReport", report.id, { status: "reviewed" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visit-reports-list"] });
      qc.invalidateQueries({ queryKey: ["tl-pending-reports"] });
      toast.success("Report approved");
      onClose();
    },
    onError: () => toast.error("Failed to approve report"),
  });

  const requestChangesMutation = useMutation({
    mutationFn: () => secureGateway.update("VisitReport", report.id, {
      status: "draft",
      recommendations_text: changesNote
        ? `[Changes requested]: ${changesNote}\n\n${report.recommendations_text || ""}`
        : report.recommendations_text,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visit-reports-list"] });
      qc.invalidateQueries({ queryKey: ["tl-pending-reports"] });
      toast.success("Changes requested — report sent back to draft");
      setShowChangesModal(false);
      onClose();
    },
    onError: () => toast.error("Failed to request changes"),
  });

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 border-b border-border bg-card p-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-lg">{report.resident_name}</h2>
            <p className="text-xs text-muted-foreground mt-1">{report.date} · {report.duration_minutes} min</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Worker</p>
            <p className="text-sm">{report.worker_name}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
              report.status === "approved" ? "bg-green-500/10 text-green-500" :
              report.status === "submitted" ? "bg-blue-500/10 text-blue-500" :
              report.status === "reviewed" ? "bg-purple-500/10 text-purple-500" :
              "bg-muted text-muted-foreground"
            }`}>
              {report.status}
            </span>
          </div>

          {report.action_text && (
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Action</p>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{report.action_text}</p>
            </div>
          )}

          {report.outcome_text && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Outcome</p>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{report.outcome_text}</p>
            </div>
          )}

          {report.recommendations_text && (
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Recommendations</p>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{report.recommendations_text}</p>
            </div>
          )}

          {report.kpi_data && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KPI Data</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(report.kpi_data).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-foreground font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TL Review Actions */}
          {canReview && (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Review Actions</p>
              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 rounded-xl"
                  onClick={() => setShowChangesModal(true)}
                  disabled={requestChangesMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4" /> Request Changes
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Request Changes Modal */}
        {showChangesModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowChangesModal(false)}>
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-base">Request Changes</h3>
              <p className="text-sm text-muted-foreground">Add a note explaining what needs to be changed. The report will be sent back to draft.</p>
              <Textarea
                rows={4}
                value={changesNote}
                onChange={e => setChangesNote(e.target.value)}
                placeholder="Describe the changes needed..."
                className="resize-none text-sm"
              />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="rounded-xl" onClick={() => setShowChangesModal(false)}>Cancel</Button>
                <Button
                  className="rounded-xl"
                  onClick={() => requestChangesMutation.mutate()}
                  disabled={requestChangesMutation.isPending}
                >
                  Send Back
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}