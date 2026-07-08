import { X, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import WorkflowActionModals from "./WorkflowActionModals";

export default function WorkflowDetailDrawer({ workflow, onClose, onRefresh }) {
  const [actionType, setActionType] = useState(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const isOverdue = workflow.due_date && new Date(workflow.due_date) < new Date();

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Workflow Details</h2>
            <p className="text-xs text-muted-foreground mt-1">{workflow.reference}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
              workflow.status === "approved" ? "bg-green-100 text-green-700" :
              workflow.status === "rejected" ? "bg-red-100 text-red-700" :
              workflow.status === "escalated" ? "bg-purple-100 text-purple-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {workflow.status?.replace(/_/g, " ")}
            </span>
            {isOverdue && (
              <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Overdue
              </span>
            )}
          </div>

          {/* Key Info */}
          <div className="space-y-3 pb-3 border-b border-border/50">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Workflow Type</p>
              <p className="text-sm font-medium mt-1">{workflow.workflow_type?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Created</p>
              <p className="text-sm font-medium mt-1">{format(new Date(workflow.created_date), "MMM d, yyyy")}</p>
            </div>
            {workflow.due_date && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Due Date</p>
                <p className="text-sm font-medium mt-1">{format(new Date(workflow.due_date), "MMM d, yyyy")}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground font-medium">Assigned To</p>
              <p className="text-sm font-medium mt-1">{workflow.assigned_to_name || "Unassigned"}</p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">Activity Timeline</h3>
            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{format(new Date(workflow.created_date), "MMM d, yyyy HH:mm")}</p>
                </div>
              </div>
              {workflow.submitted_at && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium">Submitted</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{format(new Date(workflow.submitted_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>
              )}
              {workflow.approved_at && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-600 mt-1.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium">Approved</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{format(new Date(workflow.approved_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!["approved", "rejected", "closed"].includes(workflow.status) && (
            <div className="space-y-2 pt-3 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground">Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setShowApprove(true)} size="sm" className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </Button>
                <Button onClick={() => setShowReject(true)} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <XCircle className="w-3 h-3" /> Reject
                </Button>
                <Button onClick={() => setShowReturn(true)} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Return
                </Button>
                <Button onClick={() => setShowEscalate(true)} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Share2 className="w-3 h-3" /> Escalate
                </Button>
                <Button onClick={() => setShowNote(true)} variant="outline" size="sm" className="h-8 text-xs col-span-2 gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Add Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Modals */}
      <WorkflowActionModals
        workflow={workflow}
        showApprove={showApprove}
        setShowApprove={setShowApprove}
        showReject={showReject}
        setShowReject={setShowReject}
        showReturn={showReturn}
        setShowReturn={setShowReturn}
        showEscalate={showEscalate}
        setShowEscalate={setShowEscalate}
        showNote={showNote}
        setShowNote={setShowNote}
        onSuccess={onRefresh}
      />
    </>
  );
}