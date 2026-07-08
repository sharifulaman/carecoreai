/**
 * OutcomeWorkflowPanel — Phase 9
 *
 * Reusable maker-checker panel for Impact / Outcome records.
 * Handles: Submit, Approve, Request Changes, Escalate, Close.
 * Every action is written to AuditEvent via logOutcomeAudit.
 *
 * Props:
 *   status              - current record status ("draft" | "submitted" | "reviewed" | "approved" | "closed" | "changes_requested")
 *   isLocked            - bool: narrative fields are read-only
 *   createdById         - StaffProfile.id of the original creator
 *   staffProfile        - current user's StaffProfile
 *   staff               - all StaffProfile[] for escalation recipient picker
 *   onSubmit(reason)    - async: called when staff submit
 *   onApprove(note)     - async: called when manager approves
 *   onRequestChanges(reason) - async: called when manager requests changes (reason mandatory)
 *   onEscalate({ reason, recipientId, recipientName }) - async (all fields mandatory)
 *   onClose(note)       - async: close the record
 *   saving              - bool
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, RotateCcw, ArrowUpCircle, XCircle, Send, Lock, AlertTriangle, Info } from "lucide-react";

const STATUS_BADGES = {
  draft:              { label: "Draft",               color: "bg-muted text-muted-foreground" },
  submitted:          { label: "Submitted",           color: "bg-blue-100 text-blue-700" },
  reviewed:           { label: "Under Review",        color: "bg-purple-100 text-purple-700" },
  approved:           { label: "Approved",            color: "bg-green-100 text-green-700" },
  changes_requested:  { label: "Changes Requested",   color: "bg-amber-100 text-amber-700" },
  escalated:          { label: "Escalated",           color: "bg-red-100 text-red-700" },
  closed:             { label: "Closed",              color: "bg-slate-100 text-slate-600" },
};

const MANAGER_ROLES = new Set([
  "admin", "rsm", "regional_manager", "team_manager", "team_leader",
  "risk_manager", "risk_officer",
]);

export default function OutcomeWorkflowPanel({
  status = "draft",
  isLocked = false,
  createdById,
  staffProfile,
  staff = [],
  onSubmit,
  onApprove,
  onRequestChanges,
  onEscalate,
  onClose,
  saving = false,
}) {
  const [mode, setMode] = useState(null); // null | "changes" | "escalate" | "close"
  const [reason, setReason] = useState("");
  const [escalateRecipientId, setEscalateRecipientId] = useState("");

  const myId = staffProfile?.id || "";
  const myRole = staffProfile?.role || "";
  const isManager = MANAGER_ROLES.has(myRole);
  const isOwnRecord = createdById && createdById === myId;
  // Maker-checker: manager cannot approve their own record
  const canApprove = isManager && !isOwnRecord && status === "submitted";
  const canRequestChanges = isManager && status === "submitted";
  const canEscalate = isManager && (status === "submitted" || status === "reviewed");
  const canClose = isManager && ["approved", "escalated"].includes(status);
  const canSubmit = !isLocked && status === "draft" || status === "changes_requested";

  const badge = STATUS_BADGES[status] || STATUS_BADGES["draft"];

  const reset = () => { setMode(null); setReason(""); setEscalateRecipientId(""); };

  const handleSubmit = async () => {
    if (onSubmit) await onSubmit(reason);
    reset();
  };
  const handleApprove = async () => {
    if (onApprove) await onApprove(reason);
    reset();
  };
  const handleChanges = async () => {
    if (!reason.trim()) return;
    if (onRequestChanges) await onRequestChanges(reason);
    reset();
  };
  const handleEscalate = async () => {
    if (!reason.trim() || !escalateRecipientId) return;
    const recipient = staff.find(s => s.id === escalateRecipientId);
    if (onEscalate) await onEscalate({ reason, recipientId: escalateRecipientId, recipientName: recipient?.full_name || "" });
    reset();
  };
  const handleClose = async () => {
    if (onClose) await onClose(reason);
    reset();
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-3 bg-muted/30 border-b border-border">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
        {isLocked && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" /> Record locked
          </span>
        )}
        {isOwnRecord && isManager && status === "submitted" && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <Info className="w-3 h-3" /> You cannot approve your own record
          </span>
        )}
        <div className="flex-1" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Workflow</p>
      </div>

      <div className="px-5 py-4 space-y-3 bg-card">
        {/* Changes-requested notice for staff */}
        {status === "changes_requested" && !isManager && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium">
              Changes have been requested. Please amend and re-submit.
            </p>
          </div>
        )}

        {/* Main action buttons */}
        {mode === null && (
          <div className="flex flex-wrap gap-2">
            {canSubmit && (
              <Button size="sm" className="gap-1.5" onClick={() => setMode("submit")} disabled={saving}>
                <Send className="w-3.5 h-3.5" /> Submit for Review
              </Button>
            )}
            {canApprove && (
              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => setMode("approve")} disabled={saving}>
                <CheckCircle className="w-3.5 h-3.5" /> Approve & Lock
              </Button>
            )}
            {canRequestChanges && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMode("changes")} disabled={saving}>
                <RotateCcw className="w-3.5 h-3.5" /> Request Changes
              </Button>
            )}
            {canEscalate && (
              <Button size="sm" variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => setMode("escalate")} disabled={saving}>
                <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
              </Button>
            )}
            {canClose && (
              <Button size="sm" variant="outline" className="gap-1.5 text-slate-600" onClick={() => setMode("close")} disabled={saving}>
                <XCircle className="w-3.5 h-3.5" /> Close
              </Button>
            )}
          </div>
        )}

        {/* Submit confirmation */}
        {mode === "submit" && (
          <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800">Submit for manager review?</p>
            <p className="text-xs text-blue-700">Once submitted, narrative fields will be locked for audit integrity.</p>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional: any notes for reviewer..." className="text-sm resize-none" />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={saving}>
                <Send className="w-3.5 h-3.5" /> {saving ? "Submitting..." : "Confirm Submit"}
              </Button>
            </div>
          </div>
        )}

        {/* Approve confirmation */}
        {mode === "approve" && (
          <div className="space-y-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">Approve and lock this record?</p>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional: approval note..." className="text-sm resize-none" />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>
              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={saving}>
                <CheckCircle className="w-3.5 h-3.5" /> {saving ? "Approving..." : "Confirm Approve"}
              </Button>
            </div>
          </div>
        )}

        {/* Request changes */}
        {mode === "changes" && (
          <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-800">Request changes</p>
            <Textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe what needs to be changed (required)..."
              className={`text-sm resize-none ${!reason.trim() ? "border-amber-400" : ""}`}
            />
            {!reason.trim() && <p className="text-xs text-amber-600 font-medium">Reason is required.</p>}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={handleChanges} disabled={saving || !reason.trim()}>
                <RotateCcw className="w-3.5 h-3.5" /> {saving ? "Sending..." : "Send Back"}
              </Button>
            </div>
          </div>
        )}

        {/* Escalate */}
        {mode === "escalate" && (
          <div className="space-y-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800">Escalate record</p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 font-medium">Escalation Recipient <span className="text-red-500">*</span></label>
              <Select value={escalateRecipientId} onValueChange={setEscalateRecipientId}>
                <SelectTrigger className={`text-sm ${!escalateRecipientId ? "border-red-300" : ""}`}><SelectValue placeholder="Select recipient..." /></SelectTrigger>
                <SelectContent>
                  {staff
                    .filter(s => MANAGER_ROLES.has(s.role) && s.id !== myId)
                    .map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.role}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <Textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Escalation reason (required)..."
              className={`text-sm resize-none ${!reason.trim() ? "border-red-300" : ""}`}
            />
            {(!reason.trim() || !escalateRecipientId) && (
              <p className="text-xs text-red-600 font-medium">Both reason and recipient are required.</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleEscalate}
                disabled={saving || !reason.trim() || !escalateRecipientId}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" /> {saving ? "Escalating..." : "Confirm Escalate"}
              </Button>
            </div>
          </div>
        )}

        {/* Close */}
        {mode === "close" && (
          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-medium">Close this record?</p>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional: closing note..." className="text-sm resize-none" />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-slate-700" onClick={handleClose} disabled={saving}>
                <XCircle className="w-3.5 h-3.5" /> {saving ? "Closing..." : "Confirm Close"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}