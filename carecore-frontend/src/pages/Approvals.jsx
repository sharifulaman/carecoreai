import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import {
  ClipboardCheck, ChevronRight, ChevronDown, FileText, Receipt,
  ClipboardList, Wallet, TrendingUp, CheckCircle2, XCircle, Clock,
  Filter, ArrowRight, User, Building2, X, AlertTriangle, Plus, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApprovalsFlowPipeline from "@/components/approvals/ApprovalsFlowPipeline";
import { useModuleActions } from "@/lib/PermissionContext";
import Reg27ActionModal from "@/components/compliance-hub/Reg27ActionModal";
import SWView from "@/components/approvals/SWView";
import TLView from "@/components/approvals/TLView";
import TMView from "@/components/approvals/TMView";
import RMView from "@/components/approvals/RMView";
import RSMView from "@/components/approvals/RSMView";
import FOView from "@/components/approvals/FOView";
import FMView from "@/components/approvals/FMView";
import HOView from "@/components/approvals/HOView";
import HMView from "@/components/approvals/HMView";
import ROView from "@/components/approvals/ROView";
import RkMView from "@/components/approvals/RkMView";
import AdminManagerView from "@/components/approvals/AdminManagerView";

// ── Constants ──────────────────────────────────────────────────────────────────

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
  submitted: { label: "Awaiting TL", color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_tl: { label: "Awaiting TL", color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_tm: { label: "Awaiting Team Manager", color: "bg-violet-500/15 text-violet-700 border-violet-400/40" },
  pending_rm: { label: "Awaiting Regional Manager", color: "bg-indigo-500/15 text-indigo-700 border-indigo-400/40" },
  pending_rsm: { label: "Awaiting RSM", color: "bg-teal-500/15 text-teal-700 border-teal-400/40" },
  pending_admin: { label: "Awaiting Admin", color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_finance: { label: "Awaiting Finance", color: "bg-blue-500/15 text-blue-700 border-blue-400/40" },
  pending_fo: { label: "Awaiting Finance Officer", color: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40" },
  pending_fm: { label: "Awaiting Finance Manager", color: "bg-emerald-700/15 text-emerald-800 border-emerald-500/40" },
  pending_ho: { label: "Awaiting HR Officer", color: "bg-pink-500/15 text-pink-700 border-pink-400/40" },
  pending_hm: { label: "Awaiting HR Manager", color: "bg-pink-700/15 text-pink-800 border-pink-500/40" },
  pending_ro: { label: "Awaiting Risk Officer", color: "bg-red-400/15 text-red-600 border-red-400/40" },
  pending_rkm: { label: "Awaiting Risk Manager", color: "bg-red-700/15 text-red-800 border-red-500/40" },
  approved: { label: "Approved & Posted", color: "bg-green-500/15 text-green-700 border-green-400/40" },
  rejected: { label: "Rejected", color: "bg-red-500/15 text-red-700 border-red-400/40" },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-500 border-slate-300" },
};

// ── Small reusable components ──────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, accentColor }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 flex items-center gap-4 border-l-[3px] ${accentColor}`}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[32px] font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

function EmptyPending() {
  return (
    <div className="py-20 flex flex-col items-center gap-3 text-center">
      <ClipboardCheck className="w-14 h-14 text-muted-foreground/20" />
      <p className="text-base font-semibold text-foreground">You're all caught up</p>
      <p className="text-sm text-muted-foreground">No submissions are pending your approval right now.</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
      <ClipboardList className="w-10 h-10 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Reject Modal ───────────────────────────────────────────────────────────────

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

// ── Approval Trail (inline timeline) ──────────────────────────────────────────

function ApprovalTrailInline({ events }) {
  const sorted = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (!sorted.length) return <p className="text-xs text-muted-foreground py-2 px-4">No events recorded yet.</p>;
  return (
    <div className="px-4 pb-4 space-y-0">
      {sorted.map((ev, i) => (
        <div key={ev.id || i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 z-10 ${ev.event_type === "approved" || ev.event_type === "posted" ? "bg-green-500 border-green-500 text-white" :
                ev.event_type === "rejected" ? "bg-red-500 border-red-500 text-white" :
                  "bg-background border-border text-muted-foreground"
              }`}>
              {ev.event_type === "approved" || ev.event_type === "posted"
                ? <CheckCircle2 className="w-3 h-3" />
                : ev.event_type === "rejected"
                  ? <XCircle className="w-3 h-3" />
                  : <Clock className="w-3 h-3" />}
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

// ── Workflow Row ───────────────────────────────────────────────────────────────

function WorkflowRow({ wf, allEvents, showActions, onApprove, onReject, actionLoading }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const EIcon = ENTITY_ICONS[wf.entity_type] || FileText;
  const wfEvents = (allEvents || []).filter(e => e.workflow_id === wf.id);
  const showAmount = wf.entity_type === "bill" || wf.entity_type === "expense_claim";
  const showDays = wf.entity_type === "leave_request";
  const showNotes = wf.entity_type === "new_staff_entry";

  return (
    <>
      {/* Row */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        {/* Main clickable row */}
        <button
          onClick={() => { setExpanded(v => !v); setConfirmApprove(false); }}
          className="w-full hover:bg-muted/20 transition-colors text-left"
        >
          {/* Desktop table row */}
          <div className="hidden md:grid grid-cols-[28px_1fr_140px_130px_90px_100px_160px_auto] gap-3 items-center px-4 py-3">
            {/* Type icon */}
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <EIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            {/* Type + ref */}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{ENTITY_LABELS[wf.entity_type] || wf.entity_type}</p>
              {wf.entity_reference && <p className="text-xs text-muted-foreground font-mono truncate">#{wf.entity_reference}</p>}
            </div>
            {/* Home */}
            <p className="text-xs text-muted-foreground truncate">{wf.home_name || "—"}</p>
            {/* Submitted by */}
            <p className="text-xs text-muted-foreground truncate">{wf.submitted_by_name || "—"}</p>
            {/* Amount / Days / Notes */}
            <p className="text-xs font-medium">
              {showAmount && wf.amount != null ? `£${Number(wf.amount).toFixed(2)}` : ""}
              {showDays && wf.notes ? wf.notes : ""}
              {showNotes && wf.notes ? wf.notes : ""}
            </p>
            {/* Date */}
            <p className="text-xs text-muted-foreground whitespace-nowrap">{wf.submitted_at ? format(new Date(wf.submitted_at), "dd MMM yy") : "—"}</p>
            {/* Status */}
            <StatusBadge status={wf.status} />
            {/* Chevron */}
            <div className="flex justify-end">
              {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>

          {/* Mobile compact row */}
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
                {showDays && wf.notes && <span>· {wf.notes}</span>}
                {showNotes && wf.notes && <span>· {wf.notes}</span>}
                <span>· {wf.submitted_at ? format(new Date(wf.submitted_at), "dd MMM yy") : "—"}</span>
              </div>
            </div>
            <StatusBadge status={wf.status} />
            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          </div>
        </button>

        {/* Actions bar (shown when actions enabled and not expanded into confirm) */}
        {showActions && !confirmApprove && (wf.status !== "approved" && wf.status !== "rejected") && (
          <div className="flex items-center gap-2 px-4 pb-3" onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-3"
              onClick={() => setConfirmApprove(true)}
              disabled={actionLoading}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 h-7 text-xs px-3"
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          </div>
        )}

        {/* Inline approve confirm */}
        {confirmApprove && (
          <div className="flex items-center gap-3 px-4 pb-3 bg-green-50/60 border-t border-green-200/50" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium flex-1">Confirm approval of {wf.entity_reference || wf.entity_type}?</p>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
              onClick={async () => { await onApprove(wf); setConfirmApprove(false); }}
              disabled={actionLoading}
            >
              Confirm
            </Button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setConfirmApprove(false)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Expanded trail */}
        {expanded && (
          <div className="border-t border-border bg-muted/20 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-4 mb-3">Approval Trail</p>
            <ApprovalTrailInline events={wfEvents} />
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <RejectModal
          wf={wf}
          loading={actionLoading}
          onClose={() => setShowRejectModal(false)}
          onConfirm={async (reason) => {
            await onReject(wf, reason);
            setShowRejectModal(false);
            toast.success("Bill rejected and returned to submitter.");
          }}
        />
      )}
    </>
  );
}

// ── Table header (desktop only) ────────────────────────────────────────────────

function TableHeader() {
  return (
    <div className="hidden md:grid grid-cols-[28px_1fr_140px_130px_90px_100px_160px_auto] gap-3 items-center px-4 py-2 bg-muted/30 border border-border rounded-lg text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      <div />
      <div>Type / Ref</div>
      <div>Home</div>
      <div>Submitted By</div>
      <div>Amount</div>
      <div>Date</div>
      <div>Status</div>
      <div />
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function FilterBar({ homes, filters, setFilters, showTypeFilter = true }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <select
        className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        value={filters.home}
        onChange={e => setFilters(f => ({ ...f, home: e.target.value }))}
      >
        <option value="all">All Homes</option>
        {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
      {showTypeFilter && (
        <select
          className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
        >
          <option value="all">All Types</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      )}
      <select
        className="h-8 text-xs border border-border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        value={filters.status}
        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
      >
        <option value="all">All Statuses</option>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
    </div>
  );
}

function applyFilters(list, filters) {
  return list.filter(wf => {
    if (filters.home !== "all" && wf.home_id !== filters.home) return false;
    if (filters.type !== "all" && wf.entity_type !== filters.type) return false;
    if (filters.status !== "all" && wf.status !== filters.status) return false;
    return true;
  });
}

// ── Workflow List ──────────────────────────────────────────────────────────────

function WorkflowList({ items, events, showActions, onApprove, onReject, actionLoading, emptyMsg, isPending = false }) {
  if (items.length === 0) {
    return isPending ? <EmptyPending /> : <EmptyState message={emptyMsg} />;
  }
  return (
    <div className="space-y-2">
      <TableHeader />
      {items.map(wf => (
        <WorkflowRow
          key={wf.id}
          wf={wf}
          allEvents={events}
          showActions={showActions}
          onApprove={onApprove}
          onReject={onReject}
          actionLoading={actionLoading}
        />
      ))}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

function Tabs({ tabs, active, setActive }) {
  return (
    <div className="flex gap-0 border-b border-border">
      {tabs.map(t => (
        <button key={t.key} onClick={() => setActive(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {t.label}
          {t.count != null && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold ${active === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Reg 27 Pending Panel (for RSM + Risk Manager) ────────────────────────────

function Reg27Panel({ notifications, myStaffProfile }) {
  const [actionModal, setActionModal] = useState(null);
  const qc = useQueryClient();
  const actionable = notifications.filter(n =>
    n.is_reg27 && ["pending_rsm", "pending", "overdue"].includes(n.status) && !n.is_deleted
  );
  if (actionable.length === 0) return null;

  return (
    <>
      <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 animate-pulse" />
          <h3 className="font-bold text-red-800 text-sm">⚠️ REG 27 — Ofsted Notification Required ({actionable.length})</h3>
        </div>
        <div className="space-y-2">
          {actionable.map(n => {
            const eventDate = n.event_date ? new Date(n.event_date) : null;
            const deadline = eventDate ? new Date(eventDate.getTime() + 24 * 3600 * 1000) : null;
            const hoursLeft = deadline ? Math.max(0, Math.floor((deadline - Date.now()) / 3600000)) : null;
            const isOverdue = n.status === "overdue" || (hoursLeft !== null && hoursLeft <= 0);
            const isUrgent = hoursLeft !== null && hoursLeft <= 4;
            return (
              <div key={n.id} className="bg-white rounded-lg border border-red-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{n.notification_type?.replace(/_/g, ' ') || "Ofsted Notification"} — {n.home_name || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">YP: {n.resident_initials || n.resident_name || "—"} · Submitted by: {n.submitted_by_name || "—"}</p>
                  {deadline && (
                    <p className={`text-xs font-medium mt-0.5 ${isOverdue ? 'text-red-700' : isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
                      Deadline: {deadline.toLocaleString('en-GB')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isOverdue ? 'bg-red-700 text-white' : isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isOverdue ? 'OVERDUE' : hoursLeft !== null ? `${hoursLeft}h left` : 'Check now'}
                  </span>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setActionModal(n)}>
                    Notify Ofsted
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {actionModal && (
        <Reg27ActionModal
          notification={actionModal}
          staffProfile={myStaffProfile}
          onClose={() => setActionModal(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["ofsted-notifications-approvals"] });
            setActionModal(null);
          }}
        />
      )}
    </>
  );
}


// ── Main page ──────────────────────────────────────────────────────────────────

export default function Approvals() {
  const { user, staffProfile: contextStaffProfile } = useOutletContext();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const { canApprove, canEdit: canEditApprovals } = useModuleActions("approvals");
  const [diagramFilter, setDiagramFilter] = useState("all");

  const { data: fetchedStaffProfiles = [] } = useQuery({
    queryKey: ["staff-profile-approvals", user?.email],
    queryFn: () => secureGateway.filter("StaffProfile", { email: user?.email }),
    enabled: !!user?.email && !contextStaffProfile,
    staleTime: 5 * 60 * 1000,
  });

  const myStaffProfile = contextStaffProfile || fetchedStaffProfiles[0] || null;
  const role = myStaffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-approvals"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: workflows = [], isLoading: wfLoading } = useQuery({
    queryKey: ["approval-workflows"],
    queryFn: () => secureGateway.filter("ApprovalWorkflow", {}, "-created_date", 500),
    staleTime: 30 * 1000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["approval-events"],
    queryFn: () => secureGateway.filter("ApprovalWorkflowEvent", {}, "-created_at", 2000),
    staleTime: 30 * 1000,
  });

  const { data: ofstedNotifications = [] } = useQuery({
    queryKey: ["ofsted-notifications-approvals"],
    queryFn: () => secureGateway.filter("OfstedNotification", {}, "-created_date", 200),
    staleTime: 60 * 1000,
    enabled: ["rsm", "risk_manager", "admin"].includes(role),
  });

  const scopedWorkflows = useMemo(() => {
    if (!myStaffProfile && user?.role !== "admin") return [];
    const myHomeIds = myStaffProfile?.home_ids || [];
    switch (role) {
      case "support_worker":
        return workflows.filter(w => w.submitted_by === myStaffProfile?.id);
      case "team_leader": {
        return workflows.filter(w =>
          myHomeIds.includes(w.home_id) ||
          w.submitted_by === myStaffProfile?.id ||
          (w.entity_type === "leave_request" && w.status === "pending_tl")
        );
      }
      case "team_manager": {
        return workflows.filter(w => myHomeIds.includes(w.home_id) || w.submitted_by === myStaffProfile?.id);
      }
      case "regional_manager": {
        return workflows.filter(w => myHomeIds.includes(w.home_id));
      }
      case "rsm":
        return workflows;
      case "admin_officer":
        return workflows.filter(w => ["bill", "new_staff_entry"].includes(w.entity_type) || w.submitted_by === myStaffProfile?.id);
      case "admin":
      case "admin_manager":
        return workflows;
      case "finance_officer":
        return workflows.filter(w => ["bill", "expense_claim"].includes(w.entity_type));
      case "finance_manager":
        return workflows.filter(w => ["bill", "expense_claim"].includes(w.entity_type));
      case "hr_officer":
        return workflows.filter(w => ["leave_request", "new_staff_entry"].includes(w.entity_type));
      case "hr_manager":
        return workflows.filter(w => ["leave_request", "new_staff_entry", "staff_movement"].includes(w.entity_type));
      case "risk_officer":
        return workflows.filter(w => ["incident_report", "missing_episode"].includes(w.entity_type));
      case "risk_manager":
        return workflows.filter(w => ["incident_report", "missing_episode"].includes(w.entity_type));
      default:
        return workflows;
    }
  }, [workflows, myStaffProfile, role]);

  const logEvent = async (workflowId, eventType, step, comment = "") => {
    await secureGateway.create("ApprovalWorkflowEvent", {
      org_id: ORG_ID,
      workflow_id: workflowId,
      event_type: eventType,
      actor_id: myStaffProfile?.id,
      actor_name: myStaffProfile?.full_name || user?.full_name || "Unknown",
      step,
      comment,
      created_at: new Date().toISOString(),
    });
  };

  const getNextStep = (wf) => {
    const { entity_type, status } = wf;

    // Bill and Expense Claim flow
    if (["bill", "expense_claim"].includes(entity_type)) {
      if (status === "pending_tl") return { status: "pending_tm", step: 2, approverField: "tl", label: "Team Manager review" };
      if (status === "pending_tm") return { status: "pending_fo", step: 3, approverField: "tm", label: "Finance Officer review" };
      if (status === "pending_fo") return { status: "pending_fm", step: 4, approverField: "fo", label: "Finance Manager review" };
      if (status === "pending_fm") return { status: "approved", step: 5, approverField: "fm", label: "Final approval" };
    }

    // Leave Request flow
    if (entity_type === "leave_request") {
      if (status === "pending_tl") return { status: "pending_tm", step: 2, approverField: "tl", label: "Team Manager review" };
      if (status === "pending_tm") return { status: "pending_ho", step: 3, approverField: "tm", label: "HR Officer review" };
      if (status === "pending_ho") return { status: "approved", step: 4, approverField: "ho", label: "Final approval" };
    }

    // New Staff Entry flow
    if (entity_type === "new_staff_entry") {
      if (status === "pending_ho") return { status: "pending_hm", step: 2, approverField: "ho", label: "HR Manager review" };
      if (status === "pending_hm") return { status: "approved", step: 3, approverField: "hm", label: "Final approval" };
    }

    // Incident Report and Missing Episode flow
    if (["incident_report", "missing_episode"].includes(entity_type)) {
      if (status === "pending_tl") return { status: "pending_tm", step: 2, approverField: "tl", label: "Team Manager review" };
      if (status === "pending_tm") return { status: "pending_ro", step: 3, approverField: "tm", label: "Risk Officer review" };
      if (status === "pending_ro") return { status: wf.reg27_trigger ? "pending_rkm" : "pending_rsm", step: 4, approverField: "ro", label: wf.reg27_trigger ? "Risk Manager review (Reg 27)" : "RSM review" };
      if (status === "pending_rkm") return { status: "pending_rsm", step: 5, approverField: "rkm", label: "RSM final review (Reg 27)" };
      if (status === "pending_rsm") return { status: "approved", step: 6, approverField: "rsm", label: "Final approval" };
    }

    // Staff Movement flow
    if (entity_type === "staff_movement") {
      if (status === "pending_tm") return { status: "pending_hm", step: 2, approverField: "tm", label: "HR Manager review" };
      if (status === "pending_hm") return { status: "approved", step: 3, approverField: "hm", label: "Final approval" };
    }

    // Fallback
    return { status: "approved", step: wf.current_step + 1, approverField: "admin", label: "Final approval" };
  };

  const handleApprove = async (wf) => {
    if (!canApprove) { toast.error("You do not have permission to approve."); return; }
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const nextStep = getNextStep(wf);
      const updateData = {
        status: nextStep.status,
        current_step: nextStep.step,
        [`${nextStep.approverField}_approved_by`]: myStaffProfile?.id,
        [`${nextStep.approverField}_approved_by_name`]: myStaffProfile?.full_name || user?.full_name || "Unknown",
        [`${nextStep.approverField}_approved_at`]: now,
      };

      // Handle final approval for new_staff_entry (activate staff)
      if (wf.entity_type === "new_staff_entry" && nextStep.status === "approved" && wf.entity_id) {
        await secureGateway.update("StaffProfile", wf.entity_id, { status: "active" });
        queryClient.invalidateQueries({ queryKey: ["staff"] });
      }

      // Handle final approval for leave_request (deduct balance)
      if (wf.entity_type === "leave_request" && nextStep.status === "approved" && wf.entity_id) {
        const leaveReq = await secureGateway.filter("LeaveRequest", { id: wf.entity_id }).then(r => r?.[0]).catch(() => null);
        if (leaveReq?.days_requested) {
          const currentYear = new Date().getFullYear();
          const balances = await secureGateway.filter("LeaveBalance", { staff_id: leaveReq.staff_id }).catch(() => []);
          const existing = balances.find(b => b.year === currentYear);
          if (existing) {
            await secureGateway.update("LeaveBalance", existing.id, {
              days_taken: (existing.days_taken || 0) + leaveReq.days_requested,
              days_remaining: Math.max(0, (existing.days_remaining ?? existing.annual_entitlement ?? 28) - leaveReq.days_requested),
              sick_occurrences: leaveReq.leave_type === "sick_leave" ? (existing.sick_occurrences || 0) + 1 : existing.sick_occurrences,
            });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      }

      // Handle bill final approval
      if (["bill", "expense_claim"].includes(wf.entity_type) && nextStep.status === "approved") {
        updateData.posted_to_expenses = true;
        updateData.expense_reference = `EXP-${Date.now()}`;
      }

      // Update workflow
      await secureGateway.update("ApprovalWorkflow", wf.id, updateData);

      // Log event
      await logEvent(wf.id, nextStep.status === "approved" ? "approved" : "approved", wf.current_step, `Approved. Next: ${nextStep.label}`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["approval-events"] });
      if (wf.entity_type === "leave_request") queryClient.invalidateQueries({ queryKey: ["leave-requests"] });

      toast.success(`Approved. Moving to: ${nextStep.label}`);
    } catch (e) {
      toast.error("Failed to approve: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (wf, reason) => {
    if (!canEditApprovals) { toast.error("You do not have permission to reject."); return; }
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      await secureGateway.update("ApprovalWorkflow", wf.id, {
        status: "rejected",
        rejection_reason: reason,
        rejected_by: myStaffProfile?.id,
        rejected_by_name: myStaffProfile?.full_name || user?.full_name,
        rejected_at: now,
      });
      await logEvent(wf.id, "rejected", wf.current_step, reason);

      // For new staff entries: mark the profile as inactive (rejected — needs re-review)
      if (wf.entity_type === "new_staff_entry" && wf.entity_id) {
        await secureGateway.update("StaffProfile", wf.entity_id, { status: "inactive" });
        queryClient.invalidateQueries({ queryKey: ["staff"] });
      }

      // For leave requests: also update the underlying LeaveRequest and notify requester
      if (wf.entity_type === "leave_request" && wf.entity_id) {
        await secureGateway.update("LeaveRequest", wf.entity_id, {
          status: "rejected",
          reviewed_by: myStaffProfile?.id,
          reviewed_at: now,
          rejection_reason: reason,
        });
        const leaveReq = await secureGateway.filter("LeaveRequest", { id: wf.entity_id }).then(r => r?.[0]).catch(() => null);
        const submitterProfile = await secureGateway.filter("StaffProfile", { id: wf.submitted_by }).then(r => r?.[0]).catch(() => null);
        if (submitterProfile?.user_id && leaveReq) {
          const { createNotification: notify } = await import("@/lib/createNotification");
          notify({
            recipient_user_id: submitterProfile.user_id,
            recipient_staff_id: submitterProfile.id,
            title: "Leave Request Rejected",
            body: `Your ${(leaveReq.leave_type || "").replace(/_/g, " ")} leave from ${leaveReq.date_from} to ${leaveReq.date_to} was rejected. Reason: ${reason}`,
            type: "leave_response",
            link: "/my-hr",
          });
        }
        queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      }

      queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["approval-events"] });
      toast.success("Rejected and requester notified.");
    } catch (e) {
      toast.error("Failed to reject: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlers = { approve: handleApprove, reject: handleReject, loading: actionLoading };

  const filteredByDiagram = useMemo(() => {
    if (diagramFilter === "all") return scopedWorkflows;
    return scopedWorkflows.filter(w => w.status === diagramFilter);
  }, [scopedWorkflows, diagramFilter]);

  const viewProps = { workflows: filteredByDiagram, events, homes, myStaffProfile, handlers, ofstedNotifications };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Bill & Report Status</h1>
          <p className="text-sm text-muted-foreground">Submission tracking and approval hub</p>
        </div>
      </div>

      {/* Pipeline */}
      <ApprovalsFlowPipeline role={role} activeStatus={diagramFilter} onFilter={setDiagramFilter} />

      {/* Content */}
      {wfLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading workflows...
          </div>
        </div>
      ) : !myStaffProfile && user?.role !== "admin" ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Unable to load staff profile. Please refresh.
        </div>
      ) : (
        <>
          {role === "support_worker" && <SWView {...viewProps} />}
          {role === "team_leader" && <TLView {...viewProps} />}
          {role === "team_manager" && <TMView {...viewProps} />}
          {role === "regional_manager" && <RMView {...viewProps} />}
          {role === "rsm" && <RSMView {...viewProps} />}
          {role === "finance_officer" && <FOView {...viewProps} />}
          {role === "finance_manager" && <FMView {...viewProps} />}
          {role === "hr_officer" && <HOView {...viewProps} />}
          {role === "hr_manager" && <HMView {...viewProps} />}
          {role === "risk_officer" && <ROView {...viewProps} />}
          {role === "risk_manager" && <RkMView {...viewProps} />}
          {(role === "admin" || role === "admin_manager") && <AdminManagerView {...viewProps} />}
        </>
      )}
    </div>
  );
}