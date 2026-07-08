import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, ChevronDown, FileText, Receipt, ClipboardList,
  Wallet, Calendar, User, CheckCircle2, XCircle, Clock, X
} from "lucide-react";

const ENTITY_LABELS = {
  bill: "Bill",
  visit_report: "Visit Report",
  support_plan: "Support Plan",
  expense_claim: "Expense Claim",
  leave_request: "Leave Request",
  new_staff_entry: "New Staff Entry",
  staff_movement: "Staff Movement",
  incident_report: "Incident Report",
  missing_episode: "Missing Episode",
};

const ENTITY_ICONS = {
  bill: Receipt,
  visit_report: FileText,
  support_plan: ClipboardList,
  expense_claim: Wallet,
  leave_request: Calendar,
  new_staff_entry: User,
};

const STATUS_CONFIG = {
  submitted:       { label: "Awaiting TL",              color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_tl:      { label: "Awaiting TL",              color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_tm:      { label: "Awaiting Team Manager",    color: "bg-violet-500/15 text-violet-700 border-violet-400/40" },
  pending_rm:      { label: "Awaiting Regional Mgr",    color: "bg-indigo-500/15 text-indigo-700 border-indigo-400/40" },
  pending_rsm:     { label: "Awaiting RSM",             color: "bg-teal-500/15 text-teal-700 border-teal-400/40" },
  pending_admin:   { label: "Awaiting Admin",           color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_finance: { label: "Awaiting Finance",         color: "bg-blue-500/15 text-blue-700 border-blue-400/40" },
  pending_fo:      { label: "Awaiting Finance Officer", color: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40" },
  pending_fm:      { label: "Awaiting Finance Manager", color: "bg-emerald-700/15 text-emerald-800 border-emerald-500/40" },
  pending_ho:      { label: "Awaiting HR Officer",      color: "bg-pink-500/15 text-pink-700 border-pink-400/40" },
  pending_hm:      { label: "Awaiting HR Manager",      color: "bg-pink-700/15 text-pink-800 border-pink-500/40" },
  pending_ro:      { label: "Awaiting Risk Officer",    color: "bg-red-400/15 text-red-600 border-red-400/40" },
  pending_rkm:     { label: "Awaiting Risk Manager",    color: "bg-red-700/15 text-red-800 border-red-500/40" },
  approved:        { label: "Approved",                 color: "bg-green-500/15 text-green-700 border-green-400/40" },
  rejected:        { label: "Rejected",                 color: "bg-red-500/15 text-red-700 border-red-400/40" },
  draft:           { label: "Draft",                    color: "bg-slate-100 text-slate-500 border-slate-300" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function RejectModal({ wf, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold">Reject {wf.entity_reference || wf.entity_type}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block text-sm font-medium">Reason for rejection <span className="text-red-500">*</span></label>
          <textarea
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            rows={4}
            placeholder="Provide a reason (minimum 10 characters)..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">{reason.length}/10 characters minimum</p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            disabled={reason.trim().length < 10 || loading}
            onClick={() => onConfirm(reason)}
          >
            Confirm Rejection
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function ApprovalTrail({ events }) {
  const sorted = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (!sorted.length) return <p className="text-xs text-muted-foreground py-2 px-4">No events recorded yet.</p>;
  return (
    <div className="px-4 pb-4 space-y-0">
      {sorted.map((ev, i) => (
        <div key={ev.id || i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 z-10 ${
              ev.event_type === "approved" ? "bg-green-500 border-green-500 text-white" :
              ev.event_type === "rejected" ? "bg-red-500 border-red-500 text-white" :
              "bg-background border-border text-muted-foreground"
            }`}>
              {ev.event_type === "approved" ? <CheckCircle2 className="w-3 h-3" /> :
               ev.event_type === "rejected" ? <XCircle className="w-3 h-3" /> :
               <Clock className="w-3 h-3" />}
            </div>
            {i < sorted.length - 1 && <div className="w-px flex-1 bg-border min-h-[24px] mt-0.5" />}
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold capitalize">{ev.event_type.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted-foreground">· Step {ev.step}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ev.actor_name || "—"} · {ev.created_at ? format(new Date(ev.created_at), "dd MMM yyyy HH:mm") : "—"}
            </p>
            {ev.comment && (
              <p className="text-xs text-foreground/70 mt-1 italic bg-muted/40 rounded px-2 py-1">"{ev.comment}"</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkflowRow({ wf, allEvents, showActions, onApprove, onReject, actionLoading }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const EIcon = ENTITY_ICONS[wf.entity_type] || FileText;
  const wfEvents = (allEvents || []).filter(e => e.workflow_id === wf.id);
  const showAmount = wf.entity_type === "bill" || wf.entity_type === "expense_claim";
  const showDays = wf.entity_type === "leave_request";
  const canAct = showActions && wf.status !== "approved" && wf.status !== "rejected";

  return (
    <>
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <button
          onClick={() => { setExpanded(v => !v); setConfirmApprove(false); }}
          className="w-full hover:bg-muted/20 transition-colors text-left"
        >
          {/* Desktop row */}
          <div className="hidden md:grid grid-cols-[28px_1fr_140px_130px_90px_100px_160px_auto] gap-3 items-center px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <EIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{ENTITY_LABELS[wf.entity_type] || wf.entity_type}</p>
              {wf.entity_reference && <p className="text-xs text-muted-foreground font-mono truncate">#{wf.entity_reference}</p>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{wf.home_name || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{wf.submitted_by_name || "—"}</p>
            <p className="text-xs font-medium">
              {showAmount && wf.amount != null ? `£${Number(wf.amount).toFixed(2)}` : ""}
              {showDays && wf.notes ? wf.notes : ""}
            </p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">{wf.submitted_at ? format(new Date(wf.submitted_at), "dd MMM yy") : "—"}</p>
            <StatusBadge status={wf.status} />
            <div className="flex justify-end">
              {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          {/* Mobile row */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <EIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{ENTITY_LABELS[wf.entity_type] || wf.entity_type}</span>
                {wf.entity_reference && <span className="text-xs text-muted-foreground font-mono">#{wf.entity_reference}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <span>{wf.home_name || "—"}</span>
                {showAmount && wf.amount != null && <span>· £{Number(wf.amount).toFixed(2)}</span>}
                <span>· {wf.submitted_at ? format(new Date(wf.submitted_at), "dd MMM yy") : "—"}</span>
              </div>
            </div>
            <StatusBadge status={wf.status} />
            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          </div>
        </button>

        {canAct && !confirmApprove && (
          <div className="flex items-center gap-2 px-4 pb-3" onClick={e => e.stopPropagation()}>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-3"
              onClick={() => setConfirmApprove(true)} disabled={actionLoading}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 h-7 text-xs px-3"
              onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          </div>
        )}

        {confirmApprove && (
          <div className="flex items-center gap-3 px-4 pb-3 bg-green-50/60 border-t border-green-200/50" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium flex-1">Confirm approval of {wf.entity_reference || wf.entity_type}?</p>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
              onClick={async () => { await onApprove(wf); setConfirmApprove(false); }} disabled={actionLoading}>
              Confirm
            </Button>
            <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setConfirmApprove(false)}>
              Cancel
            </button>
          </div>
        )}

        {expanded && (
          <div className="border-t border-border bg-muted/20 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-4 mb-3">Approval Trail</p>
            <ApprovalTrail events={wfEvents} />
          </div>
        )}
      </div>

      {showRejectModal && (
        <RejectModal
          wf={wf}
          loading={actionLoading}
          onClose={() => setShowRejectModal(false)}
          onConfirm={async (reason) => { await onReject(wf, reason); setShowRejectModal(false); }}
        />
      )}
    </>
  );
}

function TableHeader() {
  return (
    <div className="hidden md:grid grid-cols-[28px_1fr_140px_130px_90px_100px_160px_auto] gap-3 items-center px-4 py-2 bg-muted/30 border border-border rounded-lg text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      <div /><div>Type / Ref</div><div>Home</div><div>Submitted By</div><div>Amount</div><div>Date</div><div>Status</div><div />
    </div>
  );
}

export default function WorkflowList({ workflows, events, handlers, readOnly = false }) {
  if (!workflows || workflows.length === 0) {
    return (
      <div className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
        <ClipboardList className="w-10 h-10 opacity-20" />
        <p className="text-sm">No items found.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <TableHeader />
      {workflows.map(wf => (
        <WorkflowRow
          key={wf.id}
          wf={wf}
          allEvents={events}
          showActions={!readOnly}
          onApprove={handlers?.approve}
          onReject={handlers?.reject}
          actionLoading={handlers?.loading}
        />
      ))}
    </div>
  );
}