import { X } from "lucide-react";

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ComplaintDetail({ complaint, resident, staff, onClose, onUpdate }) {
  const isOverdue = complaint.target_resolution_date && complaint.target_resolution_date < new Date().toISOString().split("T")[0];
  const daysOpen = daysSince(complaint.received_datetime);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-bold">{complaint.complainant_name}</h2>
            <p className="text-xs text-muted-foreground">{new Date(complaint.received_datetime).toLocaleString("en-GB")}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Status</p>
              <p className="text-sm font-medium capitalize mt-1">{complaint.status}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">Days Open</p>
              <p className={`text-sm font-medium mt-1 ${daysOpen > 14 && complaint.status !== "resolved" ? "text-amber-600" : ""}`}>{daysOpen}d</p>
            </div>
            {isOverdue && (
              <div className="text-right">
                <p className="text-xs text-red-700 font-bold">⚠️ OVERDUE</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="border-l-2 border-muted space-y-3 pl-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Received</p>
              <p className="text-sm font-medium">{new Date(complaint.received_datetime).toLocaleDateString("en-GB")}</p>
            </div>
            {complaint.acknowledged && (
              <div>
                <p className="text-xs text-green-700 font-medium">✓ Acknowledged</p>
                <p className="text-sm">{complaint.acknowledged_date}</p>
              </div>
            )}
            {complaint.investigation_start_date && (
              <div>
                <p className="text-xs text-blue-700 font-medium">Investigation Started</p>
                <p className="text-sm">{complaint.investigation_start_date}</p>
              </div>
            )}
            {complaint.resolution_date && (
              <div>
                <p className="text-xs text-green-700 font-medium">✓ Resolved</p>
                <p className="text-sm">{complaint.resolution_date}</p>
              </div>
            )}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground font-medium">Target Resolution</p>
              <p className={`text-sm font-medium ${isOverdue ? "text-red-700" : "text-amber-700"}`}>{complaint.target_resolution_date}</p>
            </div>
          </div>

          {/* Complainant & Complaint */}
          <div className="border-t border-border pt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Complainant Type</p>
              <p className="text-sm font-medium mt-1 capitalize">{complaint.complainant_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Complaint Type</p>
              <p className="text-sm font-medium mt-1 capitalize">{complaint.complaint_type?.replace(/_/g, " ")}</p>
            </div>
            {complaint.severity && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Severity</p>
                <p className="text-sm font-medium mt-1 capitalize">{complaint.severity}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground font-medium">Contact</p>
              <p className="text-sm font-medium mt-1">{complaint.complainant_contact || "—"}</p>
            </div>
          </div>

          {/* Summary & Detail */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Summary</p>
            <p className="text-sm font-medium mb-3">{complaint.summary}</p>
            {complaint.full_detail && (
              <>
                <p className="text-xs text-muted-foreground font-medium mb-1">Full Detail</p>
                <p className="text-sm whitespace-pre-wrap text-foreground">{complaint.full_detail}</p>
              </>
            )}
          </div>

          {/* Investigation */}
          {complaint.investigation_outcome && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Investigation</p>
              {complaint.investigated_by_name && (
                <p className="text-xs mb-1"><span className="text-muted-foreground">Investigated by:</span> {complaint.investigated_by_name}</p>
              )}
              {complaint.outcome_category && (
                <p className="text-xs mb-1"><span className="text-muted-foreground">Outcome:</span> <strong>{complaint.outcome_category}</strong></p>
              )}
              {complaint.investigation_outcome && (
                <p className="text-sm mt-2 p-3 bg-muted/30 rounded">{complaint.investigation_outcome}</p>
              )}
              {complaint.actions_taken && (
                <>
                  <p className="text-xs text-muted-foreground font-medium mt-3 mb-1">Actions Taken</p>
                  <p className="text-sm">{complaint.actions_taken}</p>
                </>
              )}
              {complaint.lessons_learned && (
                <>
                  <p className="text-xs text-muted-foreground font-medium mt-3 mb-1">Lessons Learned</p>
                  <p className="text-sm">{complaint.lessons_learned}</p>
                </>
              )}
            </div>
          )}

          {/* Notification */}
          {complaint.complainant_informed && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-green-700 font-medium mb-1">✓ Complainant Informed</p>
              <p className="text-xs">{complaint.complainant_informed_date}</p>
            </div>
          )}

          {complaint.escalated_to_ofsted && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 mt-4">
              <p className="text-xs text-red-700 font-medium">⚠️ Escalated to Ofsted</p>
              {complaint.ofsted_reference && <p className="text-xs text-red-700 mt-1">Reference: {complaint.ofsted_reference}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}