import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Clock, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { differenceInHours } from "date-fns";

/**
 * IncidentReg27ReviewModal
 * Used by TL (step 1) and TM (step 2) to review and approve a Reg 27 incident.
 * TL cannot edit the SW narrative — only adds review notes.
 */
export default function IncidentReg27ReviewModal({ incident, staffProfile, stepRole, onClose, onSaved }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const isTL = stepRole === "tl";

  const deadline = incident.incident_datetime
    ? new Date(new Date(incident.incident_datetime).getTime() + 24 * 3600 * 1000)
    : null;
  const hoursRemaining = deadline ? Math.max(0, differenceInHours(deadline, new Date())) : null;
  const isUrgent = hoursRemaining !== null && hoursRemaining <= 8;

  const approveMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke("reg27Workflow", {
        action: isTL ? "tl_approve" : "tm_approve",
        incident_id: incident.id,
        ...(isTL
          ? { tl_review_notes: notes, tl_staff_profile: staffProfile }
          : { tm_review_notes: notes, tm_staff_profile: staffProfile }
        ),
      });
    },
    onSuccess: () => {
      toast.success(isTL
        ? "Approved — Team Manager notified for next review"
        : "Approved — RSM notified urgently for Ofsted notification"
      );
      qc.invalidateQueries({ queryKey: ["accidents"] });
      qc.invalidateQueries({ queryKey: ["accidents", "all"] });
      onSaved?.();
      onClose();
    },
    onError: (err) => toast.error(err.message || "Error approving"),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 ${isUrgent ? 'bg-red-600' : 'bg-amber-600'}`}>
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-bold">Reg 27 — {isTL ? "Team Leader Review" : "Team Manager Approval"}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Deadline countdown */}
          {hoursRemaining !== null && (
            <div className={`rounded-lg p-3 flex items-center gap-3 border-2 ${isUrgent ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-300'}`}>
              <Clock className={`w-5 h-5 shrink-0 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
              <div>
                <p className={`font-bold text-sm ${isUrgent ? 'text-red-700' : 'text-amber-800'}`}>
                  {hoursRemaining}h remaining for Ofsted notification
                </p>
                <p className="text-xs text-muted-foreground">Ofsted must be notified within 24h of the incident. Deadline: {deadline?.toLocaleString('en-GB')}</p>
              </div>
            </div>
          )}

          {/* Incident details (read-only) */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Incident Details (Read Only)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{incident.incident_type?.replace(/_/g, ' ')}</span></div>
              <div><span className="text-muted-foreground">Date/Time:</span> <span className="font-medium">{incident.incident_datetime ? new Date(incident.incident_datetime).toLocaleString('en-GB') : '—'}</span></div>
              <div><span className="text-muted-foreground">YP:</span> <span className="font-medium">{incident.resident_name || '—'}</span></div>
              <div><span className="text-muted-foreground">Home:</span> <span className="font-medium">{incident.home_name || '—'}</span></div>
              <div><span className="text-muted-foreground">Reported by:</span> <span className="font-medium">{incident.recorded_by_name || '—'}</span></div>
            </div>

            {/* SW Narrative — locked, TL cannot edit */}
            {incident.narrative && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">SW Narrative (locked)</p>
                </div>
                <p className="text-sm text-foreground/80 bg-white border border-border rounded-lg p-3">{incident.narrative}</p>
              </div>
            )}
          </div>

          {/* TL review notes (if TM, show TL notes too) */}
          {!isTL && incident.tl_review_notes && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-1">TL Review Notes ({incident.tl_reviewed_by_name})</p>
              <p className="text-sm text-blue-900">{incident.tl_review_notes}</p>
            </div>
          )}

          {/* Review notes input */}
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {isTL ? "Your Review Notes" : "Your Approval Notes"}
              <span className="text-xs text-muted-foreground ml-1">(optional but recommended)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={isTL
                ? "Add your review notes here. You cannot alter the SW's narrative."
                : "Add your approval notes. Once approved, RSM will be immediately notified to action Ofsted notification."
              }
            />
          </div>

          {!isTL && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              <strong>Important:</strong> Approving this will immediately send a <strong>critical priority</strong> notification to the RSM with the Ofsted notification deadline. The RSM must notify Ofsted within the remaining {hoursRemaining}h.
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/20 sticky bottom-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className={isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
          >
            {approveMutation.isPending ? "Processing..." : (
              isTL ? "Approve & Forward to Team Manager" : "Approve & Notify RSM"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}