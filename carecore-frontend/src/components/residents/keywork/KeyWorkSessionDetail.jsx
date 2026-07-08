import { useState } from "react";
import { X, Lock, AlertTriangle, FileCheck, Shield } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { logOutcomeAudit, OUTCOME_ACTIONS } from "@/lib/logAudit";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import KeyWorkOutcomeSection from "./KeyWorkOutcomeSection";
import OutcomeWorkflowPanel from "@/components/outcome/OutcomeWorkflowPanel";

const TOPIC_LABELS = {
  placement_progress: "Placement Progress",
  emotional_wellbeing: "Emotional Wellbeing",
  education: "Education",
  health: "Health",
  family_contact: "Family Contact",
  behaviour: "Behaviour",
  safety: "Safety",
  independence: "Independence",
  finance: "Finance",
  immigration_asylum: "Immigration / Asylum",
  move_on_planning: "Move-On Planning",
  other: "Other",
};

export default function KeyWorkSessionDetail({ report, onClose, staffProfile, staff = [] }) {
  const qc = useQueryClient();
  const [outcomeData, setOutcomeData] = useState({
    kw_session_topic: report.kw_session_topic,
    kw_yp_voice: report.kw_yp_voice,
    kw_staff_observation: report.kw_staff_observation,
    kw_immediate_outcome: report.kw_immediate_outcome,
    kw_impact_on_yp: report.kw_impact_on_yp,
    kw_progress_made: report.kw_progress_made,
    kw_concern_identified: report.kw_concern_identified,
    kw_concern_escalated: report.kw_concern_escalated,
    kw_escalation_note: report.kw_escalation_note,
    kw_follow_up_required: report.kw_follow_up_required,
    kw_follow_up_action: report.kw_follow_up_action,
    kw_responsible_person_id: report.kw_responsible_person_id,
    kw_responsible_person_name: report.kw_responsible_person_name,
    kw_target_date: report.kw_target_date,
    kw_support_plan_update: report.kw_support_plan_update,
    kw_risk_assessment_update: report.kw_risk_assessment_update,
    kw_manager_review_required: report.kw_manager_review_required,
    kw_manager_review_note: report.kw_manager_review_note,
  });

  const currentStatus = report.status || "draft";
  const isLocked = report.kw_locked === true || ["submitted", "reviewed", "approved"].includes(currentStatus);

  const auditBase = {
    entityType: "VisitReport",
    entityId: report.id,
    recordReference: report.id,
    recordTitle: `Key Work Session – ${report.resident_name || ""} (${report.date || ""})`,
    actorId: staffProfile?.id || "",
    actorName: staffProfile?.full_name || "",
    actorRole: staffProfile?.role || "",
    homeId: report.home_id || "",
    residentId: report.resident_id || "",
    orgId: ORG_ID,
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["visit-reports-list"] });

  // Save outcome (draft only)
  const saveOutcomeMutation = useMutation({
    mutationFn: async () => {
      await secureGateway.update("VisitReport", report.id, outcomeData);
      await logOutcomeAudit({
        ...auditBase,
        action: OUTCOME_ACTIONS.OUTCOME_ADDED,
        actionLabel: "Outcome data saved",
        oldValues: { status: currentStatus },
        newValues: { ...outcomeData, status: currentStatus },
        severity: "low",
      });
    },
    onSuccess: () => { invalidate(); toast.success("Key work outcome saved"); },
    onError: () => toast.error("Failed to save outcome"),
  });

  // Submit
  const submitMutation = useMutation({
    mutationFn: async (note) => {
      await secureGateway.update("VisitReport", report.id, {
        status: "submitted",
        kw_locked: true,
        ...outcomeData,
      });
      await logOutcomeAudit({
        ...auditBase,
        action: OUTCOME_ACTIONS.SUBMITTED,
        actionLabel: "Session submitted for review",
        oldValues: { status: currentStatus },
        newValues: { status: "submitted", kw_locked: true },
        reasonComment: note || "",
        severity: "medium",
      });
    },
    onSuccess: () => { invalidate(); toast.success("Session submitted for review"); onClose(); },
    onError: () => toast.error("Failed to submit"),
  });

  // Approve
  const approveMutation = useMutation({
    mutationFn: async (note) => {
      await secureGateway.update("VisitReport", report.id, {
        status: "reviewed",
        kw_locked: true,
        kw_manager_review_note: note || outcomeData.kw_manager_review_note || "",
        ...outcomeData,
      });
      await logOutcomeAudit({
        ...auditBase,
        action: OUTCOME_ACTIONS.APPROVED,
        actionLabel: "Manager approved and locked session",
        oldValues: { status: currentStatus },
        newValues: { status: "reviewed", kw_locked: true },
        reasonComment: note || "",
        severity: "medium",
      });
    },
    onSuccess: () => { invalidate(); toast.success("Session approved and locked"); onClose(); },
    onError: () => toast.error("Failed to approve"),
  });

  // Request changes
  const changesMutation = useMutation({
    mutationFn: async (reason) => {
      await secureGateway.update("VisitReport", report.id, {
        status: "changes_requested",
        kw_locked: false,
        kw_manager_review_note: `[Changes requested]: ${reason}`,
      });
      await logOutcomeAudit({
        ...auditBase,
        action: OUTCOME_ACTIONS.CHANGES_REQUESTED,
        actionLabel: "Manager requested changes",
        oldValues: { status: currentStatus },
        newValues: { status: "changes_requested", kw_locked: false },
        reasonComment: reason,
        severity: "medium",
      });
    },
    onSuccess: () => { invalidate(); toast.success("Changes requested — session returned to staff"); onClose(); },
    onError: () => toast.error("Failed to request changes"),
  });

  // Escalate
  const escalateMutation = useMutation({
    mutationFn: async ({ reason, recipientId, recipientName }) => {
      await secureGateway.update("VisitReport", report.id, {
        status: "submitted",
        kw_concern_escalated: true,
        kw_escalation_note: reason,
        kw_manager_review_note: `[Escalated to ${recipientName}]: ${reason}`,
      });
      await logOutcomeAudit({
        ...auditBase,
        action: OUTCOME_ACTIONS.ESCALATED,
        actionLabel: `Record escalated to ${recipientName}`,
        oldValues: { status: currentStatus },
        newValues: { status: "submitted", kw_concern_escalated: true, escalated_to: recipientName },
        reasonComment: reason,
        severity: "high",
      });
    },
    onSuccess: () => { invalidate(); toast.success("Record escalated"); onClose(); },
    onError: () => toast.error("Failed to escalate"),
  });

  // Close
  const closeMutation = useMutation({
    mutationFn: async (note) => {
      await secureGateway.update("VisitReport", report.id, {
        status: "approved",
        kw_locked: true,
        kw_manager_review_note: note || "",
      });
      await logOutcomeAudit({
        ...auditBase,
        action: OUTCOME_ACTIONS.CLOSED,
        actionLabel: "Record closed",
        oldValues: { status: currentStatus },
        newValues: { status: "approved", kw_locked: true },
        reasonComment: note || "",
        severity: "low",
      });
    },
    onSuccess: () => { invalidate(); toast.success("Record closed"); onClose(); },
    onError: () => toast.error("Failed to close"),
  });

  const anySaving = saveOutcomeMutation.isPending || submitMutation.isPending ||
    approveMutation.isPending || changesMutation.isPending ||
    escalateMutation.isPending || closeMutation.isPending;

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 border-b border-border bg-card p-6 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">{report.resident_name}</h2>
              {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
              {report.kw_concern_identified && (
                <span className="flex items-center gap-1 text-xs text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full font-medium">
                  <AlertTriangle className="w-3 h-3" /> Concern
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Key Work Session · {report.date} · {report.duration_minutes ? `${report.duration_minutes} min` : "—"}
              {report.kw_session_topic && ` · ${TOPIC_LABELS[report.kw_session_topic] || report.kw_session_topic}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-5">
          {/* Status badges */}
          <div className="flex items-center gap-3 flex-wrap">
            {report.kw_support_plan_update === "yes" && (
              <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">
                <FileCheck className="w-3 h-3" /> Support Plan Update Required
              </span>
            )}
            {report.kw_risk_assessment_update === "yes" && (
              <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full font-medium">
                <Shield className="w-3 h-3" /> Risk Assessment Update Required
              </span>
            )}
          </div>

          {/* Narrative fields (read-only always — locked on submit) */}
          {report.action_text && (
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Session Notes</p>
              <div className={`text-sm leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-lg p-3 border border-border ${isLocked ? "opacity-90" : ""}`}>
                {report.action_text}
              </div>
            </div>
          )}
          {report.outcome_text && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Outcome</p>
              <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-lg p-3 border border-border">
                {report.outcome_text}
              </div>
            </div>
          )}

          {/* Manager review note (if returned) */}
          {currentStatus === "changes_requested" && report.kw_manager_review_note && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 mb-1">Changes Requested</p>
                <p className="text-sm text-amber-700 whitespace-pre-wrap">{report.kw_manager_review_note}</p>
              </div>
            </div>
          )}

          {/* Key Work Outcome Section */}
          <KeyWorkOutcomeSection
            data={outcomeData}
            onChange={setOutcomeData}
            locked={isLocked}
            staff={staff}
          />

          {/* Save outcome (draft only) */}
          {!isLocked && (
            <button
              className="w-full py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
              onClick={() => saveOutcomeMutation.mutate()}
              disabled={saveOutcomeMutation.isPending}
            >
              {saveOutcomeMutation.isPending ? "Saving…" : "Save Outcome (Draft)"}
            </button>
          )}

          {/* Workflow panel */}
          <OutcomeWorkflowPanel
            status={currentStatus}
            isLocked={isLocked}
            createdById={report.worker_id || ""}
            staffProfile={staffProfile}
            staff={staff}
            onSubmit={(note) => submitMutation.mutateAsync(note)}
            onApprove={(note) => approveMutation.mutateAsync(note)}
            onRequestChanges={(reason) => changesMutation.mutateAsync(reason)}
            onEscalate={(args) => escalateMutation.mutateAsync(args)}
            onClose={(note) => closeMutation.mutateAsync(note)}
            saving={anySaving}
          />
        </div>
      </div>
    </div>
  );
}