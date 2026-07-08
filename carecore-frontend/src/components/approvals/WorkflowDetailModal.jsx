import { useState } from "react";
import { format } from "date-fns";
import {
  X, Check, Clock, AlertTriangle, Receipt, FileText,
  ClipboardList, Wallet, Building2, User, Calendar,
  PoundSterling, CheckCircle2, XCircle, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ENTITY_LABELS = {
  bill: "Bill",
  visit_report: "Visit Report",
  support_plan: "Support Plan",
  expense_claim: "Expense Claim",
};

const ENTITY_ICONS = {
  bill: Receipt,
  visit_report: FileText,
  support_plan: ClipboardList,
  expense_claim: Wallet,
};

const STATUS_CONFIG = {
  pending_tl:      { label: "Pending TL Approval",    color: "bg-amber-500/15 text-amber-600 border-amber-400/30" },
  pending_admin:   { label: "Pending Admin Approval",  color: "bg-blue-500/15 text-blue-600 border-blue-400/30" },
  pending_finance: { label: "Pending Finance",         color: "bg-purple-500/15 text-purple-600 border-purple-400/30" },
  approved:        { label: "Approved",                color: "bg-green-500/15 text-green-600 border-green-400/30" },
  rejected:        { label: "Rejected",                color: "bg-red-500/15 text-red-600 border-red-400/30" },
};

// Step progress indicator
const STEPS = [
  { label: "Submitted",    status: null },
  { label: "TL Review",   status: "pending_tl" },
  { label: "Admin Check", status: "pending_admin" },
  { label: "Finance",     status: "pending_finance" },
  { label: "Approved",    status: "approved" },
];

function getStepIndex(wf) {
  if (wf.status === "rejected") return -1;
  if (wf.status === "approved") return 4;
  if (wf.status === "pending_finance") return 3;
  if (wf.status === "pending_admin") return 2;
  if (wf.status === "pending_tl") return 1;
  return 0;
}

function StepProgress({ wf }) {
  const currentIdx = getStepIndex(wf);
  if (currentIdx === -1) {
    return (
      <div className="flex items-center gap-2 px-1 py-2">
        <XCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium text-red-600">Rejected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < currentIdx
                ? "bg-green-500 border-green-500 text-white"
                : i === currentIdx
                ? "bg-primary border-primary text-white"
                : "bg-background border-border text-muted-foreground"
            }`}>
              {i < currentIdx ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
            </div>
            <span className={`text-xs whitespace-nowrap hidden sm:block ${i === currentIdx ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 sm:w-12 h-0.5 mx-0.5 mb-5 ${i < currentIdx ? "bg-green-500" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function ApprovalTrail({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No events recorded yet.</p>;
  }
  return (
    <div className="space-y-3">
      {events.map((ev, i) => (
        <div key={ev.id || i} className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
            ev.event_type === "approved" || ev.event_type === "posted" ? "bg-green-500/15 text-green-600 border-green-400/30" :
            ev.event_type === "rejected" ? "bg-red-500/15 text-red-600 border-red-400/30" :
            "bg-muted text-muted-foreground border-border"
          }`}>
            {ev.event_type === "approved" || ev.event_type === "posted" ? <Check className="w-3.5 h-3.5" /> :
             ev.event_type === "rejected" ? <X className="w-3.5 h-3.5" /> :
             <Clock className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1 pb-3 border-b border-border last:border-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold capitalize">{ev.event_type.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted-foreground">Step {ev.step}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">by {ev.actor_name || "—"} · {ev.created_at ? format(new Date(ev.created_at), "dd MMM yyyy HH:mm") : "—"}</p>
            {ev.comment && <p className="text-xs text-foreground/70 mt-1 italic bg-muted/40 rounded px-2 py-1">"{ev.comment}"</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkflowDetailModal({ wf, events, showActions, onApprove, onReject, actionLoading, onClose }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const EIcon = ENTITY_ICONS[wf.entity_type] || FileText;
  const cfg = STATUS_CONFIG[wf.status] || { label: wf.status, color: "bg-muted text-muted-foreground border-border" };

  const wfEvents = (events || []).filter(e => e.workflow_id === wf.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <EIcon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold">{ENTITY_LABELS[wf.entity_type] || wf.entity_type}</h2>
              {wf.entity_reference && <span className="text-xs text-muted-foreground font-mono">#{wf.entity_reference}</span>}
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Step progress */}
          <div className="bg-muted/30 rounded-xl p-3">
            <StepProgress wf={wf} />
          </div>

          {/* Key info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={Building2} label="Home" value={wf.home_name} />
            {wf.amount != null && <InfoRow icon={PoundSterling} label="Amount" value={`£${Number(wf.amount).toFixed(2)}`} />}
            <InfoRow icon={User} label="Submitted by" value={wf.submitted_by_name} />
            <InfoRow icon={Calendar} label="Submitted on" value={wf.submitted_at ? format(new Date(wf.submitted_at), "dd MMM yyyy") : null} />
            {wf.tl_approved_by_name && <InfoRow icon={CheckCircle2} label="TL Approved by" value={wf.tl_approved_by_name} />}
            {wf.admin_approved_by_name && <InfoRow icon={CheckCircle2} label="Admin Approved by" value={wf.admin_approved_by_name} />}
            {wf.finance_approved_by_name && <InfoRow icon={CheckCircle2} label="Finance Approved by" value={wf.finance_approved_by_name} />}
            {wf.expense_reference && <InfoRow icon={Receipt} label="Expense Reference" value={wf.expense_reference} />}
          </div>

          {/* Notes */}
          {wf.notes && (
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{wf.notes}</p>
            </div>
          )}

          {/* Rejection reason */}
          {wf.rejection_reason && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-400/20">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-600">Rejection reason</p>
                <p className="text-sm text-red-600/80 mt-0.5">{wf.rejection_reason}</p>
                {wf.rejected_by_name && <p className="text-xs text-red-500/70 mt-0.5">by {wf.rejected_by_name} · {wf.rejected_at ? format(new Date(wf.rejected_at), "dd MMM yyyy HH:mm") : ""}</p>}
              </div>
            </div>
          )}

          {/* Approval trail */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Approval Trail</p>
            <ApprovalTrail events={wfEvents} />
          </div>
        </div>

        {/* Action footer */}
        {showActions && wf.status !== "approved" && wf.status !== "rejected" && (
          <div className="border-t border-border px-5 py-4 shrink-0 bg-background">
            {!rejectMode ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
                  onClick={() => { onApprove(wf); onClose(); }}
                  disabled={actionLoading}
                >
                  <Check className="w-4 h-4" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50 gap-1"
                  onClick={() => setRejectMode(true)}
                  disabled={actionLoading}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                  placeholder="Rejection reason (required)..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      if (!rejectReason.trim()) { toast.error("Rejection reason is required."); return; }
                      onReject(wf, rejectReason);
                      onClose();
                    }}
                    disabled={actionLoading}
                  >
                    Confirm Reject
                  </Button>
                  <Button variant="ghost" onClick={() => { setRejectMode(false); setRejectReason(""); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}