import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import {
  ClipboardCheck, ChevronRight, ChevronDown, FileText, Receipt,
  ClipboardList, Wallet, TrendingUp, CheckCircle2, XCircle, Clock,
  Filter, ArrowRight, User, Building2, X, AlertTriangle, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApprovalsFlowPipeline from "@/components/approvals/ApprovalsFlowPipeline";

// ── Constants ──────────────────────────────────────────────────────────────────

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
  submitted:       { label: "Awaiting TL",           color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_tl:      { label: "Awaiting TL",            color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_admin:   { label: "Awaiting Admin",         color: "bg-amber-500/15 text-amber-700 border-amber-400/40" },
  pending_finance: { label: "Awaiting Finance",       color: "bg-blue-500/15 text-blue-700 border-blue-400/40" },
  approved:        { label: "Approved & Posted",      color: "bg-green-500/15 text-green-700 border-green-400/40" },
  rejected:        { label: "Rejected",               color: "bg-red-500/15 text-red-700 border-red-400/40" },
  draft:           { label: "Draft",                  color: "bg-slate-100 text-slate-500 border-slate-300" },
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
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 z-10 ${
              ev.event_type === "approved" || ev.event_type === "posted" ? "bg-green-500 border-green-500 text-white" :
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
            {/* Amount */}
            <p className="text-xs font-medium">{showAmount && wf.amount != null ? `£${Number(wf.amount).toFixed(2)}` : ""}</p>
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

// ── Role Views ─────────────────────────────────────────────────────────────────

function SWView({ workflows, events, homes, myStaffProfile, handlers }) {
  const [filters, setFilters] = useState({ home: "all", type: "all", status: "all" });
  const [showAddBill, setShowAddBill] = useState(false);
  const [billForm, setBillForm] = useState({ home_id: "", amount: "", description: "" });
  const [billSaving, setBillSaving] = useState(false);
  const mine = useMemo(() => applyFilters(
    workflows.filter(w => w.submitted_by === myStaffProfile?.id), filters
  ), [workflows, myStaffProfile, filters]);
  const total = workflows.filter(w => w.submitted_by === myStaffProfile?.id);

  const handleAddBill = async () => {
    if (!billForm.home_id || !billForm.amount) { return; }
    setBillSaving(true);
    try {
      const home = homes.find(h => h.id === billForm.home_id);
      await secureGateway.create("ApprovalWorkflow", {
        org_id: ORG_ID,
        entity_type: "bill",
        entity_reference: `BILL-${Date.now()}`,
        home_id: billForm.home_id,
        home_name: home?.name || "",
        submitted_by: myStaffProfile?.id,
        submitted_by_name: myStaffProfile?.full_name || "",
        submitted_at: new Date().toISOString(),
        amount: parseFloat(billForm.amount),
        description: billForm.description,
        status: "submitted",
        current_step: 1,
      });
      setShowAddBill(false);
      setBillForm({ home_id: "", amount: "", description: "" });
      toast.success("Bill submitted for approval");
    } catch (e) {
      toast.error("Failed to submit bill");
    } finally {
      setBillSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
          <StatCard label="My Submissions" value={total.length} icon={ClipboardCheck} accentColor="border-l-primary" />
          <StatCard label="Approved" value={total.filter(w => w.status === "approved").length} icon={CheckCircle2} accentColor="border-l-green-500" />
          <StatCard label="Rejected" value={total.filter(w => w.status === "rejected").length} icon={XCircle} accentColor="border-l-red-500" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <FilterBar homes={homes} filters={filters} setFilters={setFilters} />
        <Button size="sm" className="gap-1.5 rounded-lg" onClick={() => setShowAddBill(v => !v)}>
          <Plus className="w-3.5 h-3.5" /> Add Bill
        </Button>
      </div>

      {showAddBill && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Submit a Bill</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Home *</label>
              <select className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                value={billForm.home_id} onChange={e => setBillForm(f => ({ ...f, home_id: e.target.value }))}>
                <option value="">Select home…</option>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount (£) *</label>
              <input type="number" className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                placeholder="0.00" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <input type="text" className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                placeholder="e.g. Gas bill April" value={billForm.description} onChange={e => setBillForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddBill} disabled={billSaving || !billForm.home_id || !billForm.amount}>
              {billSaving ? "Submitting…" : "Submit Bill"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddBill(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <WorkflowList items={mine} events={events} showActions={false} emptyMsg="You haven't submitted anything yet." />
    </div>
  );
}

function TLView({ workflows, events, homes, myStaffProfile, handlers }) {
  const [tab, setTab] = useState("pending");
  const [filters, setFilters] = useState({ home: "all", type: "all", status: "all" });
  const pending = useMemo(() => applyFilters(
    workflows.filter(w => w.status === "pending_tl" && w.current_step === 1), filters
  ), [workflows, filters]);
  const team = useMemo(() => applyFilters(workflows, filters), [workflows, filters]);
  const pendingCount = workflows.filter(w => w.status === "pending_tl").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pending My Approval" value={pendingCount} icon={Clock} accentColor="border-l-amber-500" />
        <StatCard label="Team Submissions" value={workflows.length} icon={ClipboardList} accentColor="border-l-primary" />
      </div>
      <Tabs tabs={[
        { key: "pending", label: "Pending My Approval", count: pendingCount },
        { key: "team", label: "Team Submissions", count: workflows.length },
      ]} active={tab} setActive={setTab} />
      <FilterBar homes={homes} filters={filters} setFilters={setFilters} />
      {tab === "pending" && <WorkflowList items={pending} events={events} showActions onApprove={handlers.approve} onReject={handlers.reject} actionLoading={handlers.loading} emptyMsg="" isPending />}
      {tab === "team" && <WorkflowList items={team} events={events} showActions={false} emptyMsg="No team submissions yet." />}
    </div>
  );
}

function AdminOfficerView({ workflows, events, homes, myStaffProfile, handlers }) {
  const [tab, setTab] = useState("review");
  const [filters, setFilters] = useState({ home: "all", type: "all", status: "all" });
  const awaitingReview = useMemo(() => applyFilters(
    workflows.filter(w => w.entity_type === "bill" && w.status === "pending_admin" && w.current_step === 2), filters
  ), [workflows, filters]);
  const mySubmissions = useMemo(() => applyFilters(
    workflows.filter(w => w.submitted_by === myStaffProfile?.id), filters
  ), [workflows, myStaffProfile, filters]);
  const reviewCount = workflows.filter(w => w.status === "pending_admin" && w.entity_type === "bill").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Awaiting My Review" value={reviewCount} icon={Clock} accentColor="border-l-amber-500" />
        <StatCard label="My Submissions" value={workflows.filter(w => w.submitted_by === myStaffProfile?.id).length} icon={ClipboardList} accentColor="border-l-primary" />
      </div>
      <Tabs tabs={[
        { key: "review", label: "Bills Awaiting My Review", count: reviewCount },
        { key: "mine", label: "My Submissions" },
      ]} active={tab} setActive={setTab} />
      <FilterBar homes={homes} filters={filters} setFilters={setFilters} />
      {tab === "review" && <WorkflowList items={awaitingReview} events={events} showActions onApprove={handlers.approve} onReject={handlers.reject} actionLoading={handlers.loading} emptyMsg="" isPending />}
      {tab === "mine" && <WorkflowList items={mySubmissions} events={events} showActions={false} emptyMsg="You haven't submitted anything yet." />}
    </div>
  );
}

function AdminManagerView({ workflows, events, homes, myStaffProfile, handlers }) {
  const [tab, setTab] = useState("pending");
  const [filters, setFilters] = useState({ home: "all", type: "all", status: "all" });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const pendingApproval = useMemo(() => applyFilters(
    workflows.filter(w => w.status === "pending_admin"), filters
  ), [workflows, filters]);
  const all = useMemo(() => applyFilters(workflows, filters), [workflows, filters]);
  const pendingCount = workflows.filter(w => w.status === "pending_admin").length;
  const approvedThisMonth = workflows.filter(w => w.status === "approved" && w.admin_approved_at && new Date(w.admin_approved_at) >= monthStart).length;
  const rejectedThisMonth = workflows.filter(w => w.status === "rejected" && w.rejected_at && new Date(w.rejected_at) >= monthStart).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Pending My Approval" value={pendingCount} icon={Clock} accentColor="border-l-amber-500" />
        <StatCard label="Approved This Month" value={approvedThisMonth} icon={CheckCircle2} accentColor="border-l-green-500" />
        <StatCard label="Rejected This Month" value={rejectedThisMonth} icon={XCircle} accentColor="border-l-red-500" />
      </div>
      <Tabs tabs={[
        { key: "pending", label: "Pending My Approval", count: pendingCount },
        { key: "all", label: "Full Overview", count: workflows.length },
      ]} active={tab} setActive={setTab} />
      <FilterBar homes={homes} filters={filters} setFilters={setFilters} />
      {tab === "pending" && <WorkflowList items={pendingApproval} events={events} showActions onApprove={handlers.approve} onReject={handlers.reject} actionLoading={handlers.loading} emptyMsg="" isPending />}
      {tab === "all" && <WorkflowList items={all} events={events} showActions onApprove={handlers.approve} onReject={handlers.reject} actionLoading={handlers.loading} emptyMsg="No submissions found." />}
    </div>
  );
}

function FinanceView({ workflows, events, homes, handlers }) {
  const [tab, setTab] = useState("pending");
  const [filters, setFilters] = useState({ home: "all", type: "all", status: "all" });
  const pendingFinance = useMemo(() => applyFilters(
    workflows.filter(w => w.entity_type === "bill" && w.status === "pending_finance" && w.current_step === 3 && w.admin_approved_at), filters
  ), [workflows, filters]);
  const processed = useMemo(() => applyFilters(
    workflows.filter(w => w.status === "approved" && w.posted_to_expenses), filters
  ), [workflows, filters]);
  const totalPending = pendingFinance.reduce((s, w) => s + (w.amount || 0), 0);
  const pendingCount = workflows.filter(w => w.status === "pending_finance").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Awaiting Final Approval" value={pendingCount} icon={Clock} accentColor="border-l-amber-500" />
        <StatCard label="Processed Bills" value={processed.length} icon={CheckCircle2} accentColor="border-l-green-500" />
        <StatCard label="Total Value Pending" value={`£${totalPending.toFixed(0)}`} icon={TrendingUp} accentColor="border-l-blue-500" />
      </div>
      <Tabs tabs={[
        { key: "pending", label: "Pending Final Approval", count: pendingCount },
        { key: "processed", label: "Processed", count: processed.length },
      ]} active={tab} setActive={setTab} />
      <FilterBar homes={homes} filters={filters} setFilters={setFilters} showTypeFilter={false} />
      {tab === "pending" && <WorkflowList items={pendingFinance} events={events} showActions onApprove={handlers.approve} onReject={handlers.reject} actionLoading={handlers.loading} emptyMsg="" isPending />}
      {tab === "processed" && <WorkflowList items={processed} events={events} showActions={false} emptyMsg="No processed bills yet." />}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Approvals() {
  const { user, staffProfile: contextStaffProfile } = useOutletContext();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
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

  const scopedWorkflows = useMemo(() => {
    if (!myStaffProfile && user?.role !== "admin") return [];
    switch (role) {
      case "support_worker":
        return workflows.filter(w => w.submitted_by === myStaffProfile?.id);
      case "team_leader":
      case "team_manager": {
        const myHomeIds = myStaffProfile?.home_ids || [];
        return workflows.filter(w => myHomeIds.includes(w.home_id) || w.submitted_by === myStaffProfile?.id);
      }
      case "admin_officer":
        return workflows.filter(w => w.entity_type === "bill" || w.submitted_by === myStaffProfile?.id);
      case "admin":
      case "admin_manager":
        return workflows;
      case "finance":
      case "finance_officer":
        return workflows.filter(w => w.entity_type === "bill");
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

  const handleApprove = async (wf) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const actorName = myStaffProfile?.full_name || user?.full_name || "Unknown";
      let updateData;
      if (wf.current_step === 1) {
        updateData = { status: "pending_admin", current_step: 2, tl_approved_by: myStaffProfile?.id, tl_approved_by_name: actorName, tl_approved_at: now };
      } else if (wf.current_step === 2) {
        updateData = { status: "pending_finance", current_step: 3, admin_approved_by: myStaffProfile?.id, admin_approved_by_name: actorName, admin_approved_at: now };
      } else {
        updateData = { status: "approved", current_step: 4, finance_approved_by: myStaffProfile?.id, finance_approved_by_name: actorName, finance_approved_at: now, posted_to_expenses: true, expense_reference: `EXP-${Date.now()}` };
      }
      await secureGateway.update("ApprovalWorkflow", wf.id, updateData);
      await logEvent(wf.id, "approved", wf.current_step);
      queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["approval-events"] });
      toast.success("Approved and forwarded to next stage.");
    } catch (e) {
      toast.error("Failed to approve: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (wf, reason) => {
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
      queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["approval-events"] });
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

  const viewProps = { workflows: filteredByDiagram, events, homes, myStaffProfile, handlers };

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
          {(role === "team_leader" || role === "team_manager") && <TLView {...viewProps} />}
          {role === "admin_officer" && <AdminOfficerView {...viewProps} />}
          {(role === "admin" || role === "admin_manager") && <AdminManagerView {...viewProps} />}
          {(role === "finance" || role === "finance_officer") && <FinanceView {...viewProps} />}
        </>
      )}
    </div>
  );
}