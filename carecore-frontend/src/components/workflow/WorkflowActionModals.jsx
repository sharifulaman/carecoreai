import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ActionModal = ({ show, onClose, title, onSubmit, children, loading }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="font-semibold mb-4">{title}</h2>
        <div className="mb-4">{children}</div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? "Processing..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function WorkflowActionModals({
  workflow,
  staffProfile,
  showApprove, setShowApprove,
  showReject, setShowReject,
  showReturn, setShowReturn,
  showEscalate, setShowEscalate,
  showNote, setShowNote,
  onSuccess
}) {
  const qc = useQueryClient();
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [noteText, setNoteText] = useState("");

  const approveMutation = useMutation({
    mutationFn: async () => {
      await base44.workflow.action(workflow.id, {
        action: "approve",
        actor_name: staffProfile?.full_name || staffProfile?.email || "Unknown",
        comment: approveNote,
      });
    },
    onSuccess: () => {
      toast.success("Workflow approved");
      qc.invalidateQueries({ queryKey: ["workflow-items"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-mine"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-submitted"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-team"] });
      setShowApprove(false);
      setApproveNote("");
      onSuccess?.();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await base44.workflow.action(workflow.id, {
        action: "reject",
        actor_name: staffProfile?.full_name || staffProfile?.email || "Unknown",
        comment: rejectReason,
      });
    },
    onSuccess: () => {
      toast.success("Workflow rejected");
      qc.invalidateQueries({ queryKey: ["workflow-items"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-mine"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-submitted"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-team"] });
      setShowReject(false);
      setRejectReason("");
      onSuccess?.();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      await base44.workflow.action(workflow.id, {
        action: "request_changes",
        actor_name: staffProfile?.full_name || staffProfile?.email || "Unknown",
        comment: returnReason,
      });
    },
    onSuccess: () => {
      toast.success("Workflow returned for changes");
      qc.invalidateQueries({ queryKey: ["workflow-items"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-mine"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-submitted"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-team"] });
      setShowReturn(false);
      setReturnReason("");
      onSuccess?.();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const escalateMutation = useMutation({
    mutationFn: async () => {
      await base44.workflow.action(workflow.id, {
        action: "escalate",
        actor_name: staffProfile?.full_name || staffProfile?.email || "Unknown",
        comment: escalateReason,
      });
    },
    onSuccess: () => {
      toast.success("Workflow escalated");
      qc.invalidateQueries({ queryKey: ["workflow-items"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-mine"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-submitted"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-team"] });
      setShowEscalate(false);
      setEscalateReason("");
      onSuccess?.();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const noteMutation = useMutation({
    mutationFn: async () => {
      await base44.workflow.action(workflow.id, {
        action: "request_changes",
        actor_name: staffProfile?.full_name || staffProfile?.email || "Unknown",
        comment: noteText,
      });
    },
    onSuccess: () => {
      toast.success("Note added");
      qc.invalidateQueries({ queryKey: ["workflow-items"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-mine"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-submitted"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-team"] });
      setShowNote(false);
      setNoteText("");
      onSuccess?.();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  return (
    <>
      <ActionModal
        show={showApprove}
        onClose={() => setShowApprove(false)}
        title="Approve Workflow"
        loading={approveMutation.isPending}
        onSubmit={() => approveMutation.mutate()}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Add optional approval note:</p>
          <Textarea
            placeholder="Approval note..."
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            className="h-24"
          />
        </div>
      </ActionModal>

      <ActionModal
        show={showReject}
        onClose={() => setShowReject(false)}
        title="Reject Workflow"
        loading={rejectMutation.isPending}
        onSubmit={() => rejectMutation.mutate()}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Rejection reason (required):</p>
          <Textarea
            placeholder="Explain why you're rejecting this workflow..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="h-24"
            required
          />
          {!rejectReason && <p className="text-xs text-red-600">Reason is required</p>}
        </div>
      </ActionModal>

      <ActionModal
        show={showReturn}
        onClose={() => setShowReturn(false)}
        title="Return for Changes"
        loading={returnMutation.isPending}
        onSubmit={() => returnMutation.mutate()}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Details of changes required:</p>
          <Textarea
            placeholder="What changes need to be made?"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="h-24"
            required
          />
          {!returnReason && <p className="text-xs text-red-600">Changes details are required</p>}
        </div>
      </ActionModal>

      <ActionModal
        show={showEscalate}
        onClose={() => setShowEscalate(false)}
        title="Escalate Workflow"
        loading={escalateMutation.isPending}
        onSubmit={() => escalateMutation.mutate()}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Escalation reason:</p>
          <Textarea
            placeholder="Why are you escalating this?"
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            className="h-24"
            required
          />
          {!escalateReason && <p className="text-xs text-red-600">Reason is required</p>}
        </div>
      </ActionModal>

      <ActionModal
        show={showNote}
        onClose={() => setShowNote(false)}
        title="Add Note"
        loading={noteMutation.isPending}
        onSubmit={() => noteMutation.mutate()}
      >
        <div className="space-y-3">
          <Textarea
            placeholder="Add a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="h-24"
            required
          />
          {!noteText && <p className="text-xs text-red-600">Note is required</p>}
        </div>
      </ActionModal>
    </>
  );
}