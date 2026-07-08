import { X, AlertCircle, CheckCircle, FileText, ShieldAlert, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";
import ComplaintOutcomeSection from "./ComplaintOutcomeSection";

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function DetailField({ label, value, variant = "default" }) {
  const variantStyles = {
    default: "bg-muted/30",
    success: "bg-green-50 border-l-4 border-green-400",
    warning: "bg-amber-50 border-l-4 border-amber-400",
    error: "bg-red-50 border-l-4 border-red-400",
  };
  return (
    <div className={`p-3 rounded-lg ${variantStyles[variant]}`}>
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

export default function ComplaintDetail({ complaint, residents, homes, staff, user, staffProfile, onClose, onUpdate }) {
  const qc = useQueryClient();
  const [reviewNote, setReviewNote] = useState("");
  const [showEscalatePanel, setShowEscalatePanel] = useState(false);

  const isAdminOrTL = user?.role === "admin" || (staffProfile?.role && ["admin","rsm","regional_manager","team_manager","team_leader"].includes(staffProfile.role));

  const reviewMutation = useMutation({
    mutationFn: async ({ status, note, escalated }) => {
      const update = {
        manager_review_status: status,
        manager_review_date: new Date().toISOString(),
        manager_review_by_id: user?.id,
        status: status === "escalated" ? "escalated" : status === "reviewed" ? "under_review" : complaint.status,
      };
      if (escalated) update.escalated_to_ofsted = true;
      if (note) update.outcome_manager_review_note = note;
      await secureGateway.update("Complaint", complaint.id, update);
    },
    onSuccess: () => {
      toast.success("Review saved");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      onUpdate?.();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const isOverdue = complaint.target_resolution_date && complaint.target_resolution_date < new Date().toISOString().split("T")[0];
  const daysOpen = daysSince(complaint.received_datetime);
  const residentMap = Object.fromEntries((residents || []).map(r => [r.id, r]));
  const homeMap = Object.fromEntries((homes || []).map(h => [h.id, h]));

  const statusColor = complaint.status === "resolved" || complaint.status === "closed" ? "bg-green-100" : complaint.status === "investigating" ? "bg-blue-100" : "bg-amber-100";
  const statusTextColor = complaint.status === "resolved" || complaint.status === "closed" ? "text-green-700" : complaint.status === "investigating" ? "text-blue-700" : "text-amber-700";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-border sticky top-0 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-lg font-bold text-foreground">{complaint.complaint_id}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusColor} ${statusTextColor}`}>
                  {complaint.status}
                </span>
                {complaint.is_child_complainant && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    Child complainant
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(complaint.received_datetime).toLocaleString("en-GB")} · {daysOpen}d ago
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          {/* Alert if overdue */}
          {isOverdue && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Overdue for Resolution</p>
                <p className="text-xs text-red-600 mt-1">Target date: {complaint.target_resolution_date}</p>
              </div>
            </div>
          )}

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Complainant" value={complaint.complainant_name} />
            <DetailField label="Complainant Source" value={complaint.complainant_source?.replace(/_/g, " ")} />
            <DetailField label="Resident" value={residentMap[complaint.resident_id]?.display_name} />
            <DetailField label="Home" value={homeMap[complaint.home_id]?.name} />
            <DetailField label="Complaint Category" value={complaint.complaint_type?.replace(/_/g, " ")} />
            <DetailField label="Accommodation Type" value={complaint.accommodation_category?.replace(/_/g, " ")} />
          </div>

          {/* Timeline */}
          <div className="border-t pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Timeline</p>
            <div className="space-y-2">
              <div className="flex gap-3">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Received</p>
                  <p className="text-sm font-medium">{new Date(complaint.received_datetime).toLocaleDateString("en-GB")}</p>
                </div>
              </div>
              {complaint.acknowledged && (
                <div className="flex gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-green-700 font-medium">Acknowledged</p>
                    <p className="text-sm font-medium">{complaint.acknowledged_date}</p>
                  </div>
                </div>
              )}
              {complaint.investigation_start_date && (
                <div className="flex gap-3">
                  <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-700 font-medium">Investigation Started</p>
                    <p className="text-sm font-medium">{complaint.investigation_start_date}</p>
                  </div>
                </div>
              )}
              {complaint.resolution_date && (
                <div className="flex gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-green-700 font-medium">Closed</p>
                    <p className="text-sm font-medium">{complaint.resolution_date}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Complaint Details */}
          {complaint.complaint_details && (
            <div className="border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Complaint Details</p>
              <div className="bg-muted/20 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{complaint.complaint_details}</p>
              </div>
            </div>
          )}

          {/* Investigation Results */}
          {complaint.investigation_outcome && (
            <div className="border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Investigation</p>
              <div className="space-y-3">
                {complaint.investigated_by_name && (
                  <DetailField label="Investigated By" value={complaint.investigated_by_name} />
                )}
                {complaint.outcome_category && (
                  <DetailField 
                    label="Outcome" 
                    value={complaint.outcome_category} 
                    variant={complaint.outcome_category === "upheld" ? "error" : "default"}
                  />
                )}
                {complaint.investigation_outcome && (
                  <DetailField label="Investigation Notes" value={complaint.investigation_outcome} />
                )}
                {complaint.actions_taken && (
                  <DetailField label="Actions Taken" value={complaint.actions_taken} />
                )}
                {complaint.lessons_learned && (
                  <DetailField label="Lessons Learned" value={complaint.lessons_learned} />
                )}
              </div>
            </div>
          )}

          {/* Manager Review & Compliance */}
          <div className="border-t pt-5 grid grid-cols-2 gap-3">
            {complaint.manager_review_status && (
              <DetailField label="Manager Review" value={complaint.manager_review_status} />
            )}
            {complaint.annex_a_reportable !== undefined && (
              <DetailField 
                label="Annex A Reportable" 
                value={complaint.annex_a_reportable ? "Yes" : "No"}
                variant={complaint.annex_a_reportable ? "warning" : "default"}
              />
            )}
          </div>

          {/* Evidence */}
          {complaint.evidence_urls?.length > 0 && (
            <div className="border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Evidence</p>
              <div className="space-y-2">
                {complaint.evidence_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-primary/10 transition-colors text-xs font-medium text-primary">
                    <FileText className="w-4 h-4" />
                    Document {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Outcome / Learning Section */}
          <div className="border-t pt-5">
            <ComplaintOutcomeSection
              complaint={complaint}
              staff={staff || []}
              user={user}
              staffProfile={user}
              onUpdate={onUpdate}
            />
          </div>

          {/* TL / Manager Review Panel */}
          {isAdminOrTL && (
            <div className="border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Manager Review & Approval</p>
              <div className={`rounded-lg px-4 py-3 border mb-3 text-sm font-medium flex items-center gap-2 ${
                complaint.manager_review_status === "reviewed" ? "bg-green-50 border-green-300 text-green-700"
                : complaint.manager_review_status === "escalated" ? "bg-red-50 border-red-300 text-red-700"
                : "bg-amber-50 border-amber-300 text-amber-700"
              }`}>
                {complaint.manager_review_status === "reviewed" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                Status: {complaint.manager_review_status === "pending_review" ? "Awaiting your review" : complaint.manager_review_status?.replace(/_/g, " ")}
              </div>
              {complaint.outcome_manager_review_note && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm mb-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Review Note:</p>
                  <p className="text-foreground">{complaint.outcome_manager_review_note}</p>
                </div>
              )}
              {complaint.manager_review_status !== "reviewed" && complaint.manager_review_status !== "escalated" && (
                <div className="space-y-3">
                  <Textarea
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    rows={2}
                    placeholder="Add review comments (optional)..."
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
                      onClick={() => reviewMutation.mutate({ status: "reviewed", note: reviewNote })}
                      disabled={reviewMutation.isPending}>
                      <ThumbsUp className="w-3.5 h-3.5" /> Approve & Mark Reviewed
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => setShowEscalatePanel(v => !v)}>
                      <ShieldAlert className="w-3.5 h-3.5" /> Escalate Further
                    </Button>
                  </div>
                  {showEscalatePanel && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                      <p className="text-xs font-semibold text-red-700">Escalation Options</p>
                      <Button size="sm" variant="outline" className="w-full border-red-400 text-red-700 hover:bg-red-100"
                        onClick={() => reviewMutation.mutate({ status: "escalated", note: reviewNote })}
                        disabled={reviewMutation.isPending}>
                        Escalate to Regional Manager / RSM
                      </Button>
                      <Button size="sm" variant="outline" className="w-full border-red-600 text-red-700 hover:bg-red-100"
                        onClick={() => reviewMutation.mutate({ status: "escalated", note: reviewNote, escalated: true })}
                        disabled={reviewMutation.isPending}>
                        Escalate to Ofsted
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Escalations */}
          {complaint.escalated_to_ofsted && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Escalated to Ofsted</p>
                {complaint.ofsted_reference && <p className="text-xs text-red-600 mt-1">Reference: {complaint.ofsted_reference}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-muted/20 sticky bottom-0">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}