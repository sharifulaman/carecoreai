import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { X, ExternalLink, ChevronDown, Info, CheckCircle2, Circle, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { rankOf } from "@/lib/roleConfig";
import {
  WORKFLOW_META,
  getPriorityBadge, getGovernanceBadgeColor, getActionLabels
} from "./workflowConfig";
import WorkflowActionModals from "./WorkflowActionModals";
import WorkflowDetailModal from "./WorkflowDetailModal";

// const PREVIEW_TYPES = [
//   "bill", "expense_claim", "incident_report", "missing_episode", "support_plan",
//   "risk_assessment", "leave_request", "new_staff_entry", "maintenance_quote", "reg_32", "disciplinary", "staff_movement"
// ];



// ── Summary bar ─────────────────────────────────────────────────────────────
function SummaryBar({ workflow }) {
  const meta = WORKFLOW_META[workflow.entity_type] || WORKFLOW_META[workflow.workflow_type] || WORKFLOW_META._default;
  const isOverdue = workflow.deadline_datetime && new Date(workflow.deadline_datetime) < new Date();
  const slaLabel = workflow.deadline_datetime
    ? (isOverdue ? "Overdue" : `${Math.max(0, Math.ceil((new Date(workflow.deadline_datetime) - new Date()) / 86400000))} day left`)
    : "1 day left";

  return (
    <div className="bg-white border border-border rounded-xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
        <meta.icon className={`w-5 h-5 ${meta.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{meta.label}</p>
        <p className="text-xs text-muted-foreground">Submitted by: {workflow.maker_name || workflow.submitted_by_name || "Staff"}</p>
      </div>
      <div className="flex items-center gap-6 shrink-0 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Priority</p>
          {getPriorityBadge(workflow.priority)}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Current Stage</p>
          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Circle className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />
            {workflow.current_stage || "Under Review"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">SLA</p>
          <p className={`text-xs font-semibold flex items-center gap-1 ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
            <Clock className="w-3 h-3" /> {slaLabel}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Workflow ID</p>
          <p className="text-xs font-mono text-foreground">{workflow.entity_ref || workflow.entity_reference || workflow.reference || "—"}</p>
        </div>
      </div>
    </div>
  );
}

// ── Approval path stepper ───────────────────────────────────────────────────
// Reads live `approval_path` array from the backend (built by buildApprovalPath
// in workflow_handler.go). Each step already has is_current / is_done flags
// computed server-side from the real item status, so no status mapping needed here.
function ApprovalPathStepper({ workflow, events = [] }) {
  const paths = workflow.approval_path || [];

  // Find the real audit event for a step (1-based step_number in events).
  const getStepEvent = (stepIdx) =>
    events.find(e =>
      e.step_number === stepIdx + 1 &&
      (e.event_type === "approved" || e.event_type === "submitted" || e.event_type === "resubmitted")
    );

  if (!paths.length) {
    return (
      <div className="bg-white border border-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
          Standard Approval Path
        </h3>
        <p className="text-xs text-muted-foreground italic">Loading approval path…</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
        Standard Approval Path
      </h3>
      <div className="flex items-start overflow-x-auto pb-2 gap-0">
        {paths.map((step, idx) => {
          // Use server-computed flags first; fall back to index comparison as safety net.
          const isCompleted = step.is_done === true;
          const isCurrent = step.is_current === true;
          const isEnd = step.type === "end";
          const stepEvent = getStepEvent(idx);
          const stepDate = stepEvent?.created_date ? new Date(stepEvent.created_date) : null;

          return (
            <div key={idx} className="flex items-center">
              {/* Step node */}
              <div className={`flex flex-col items-center min-w-[90px] max-w-[110px] ${isEnd ? "opacity-60" : ""}`}>

                {/* Circle icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 transition-all ${isCompleted
                  ? "bg-green-500 border-green-500 text-white"
                  : isCurrent
                    ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-background border-border text-muted-foreground"
                  }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isEnd ? (
                    <CheckCircle2 className="w-4 h-4 opacity-40" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>

                {/* Role label — show real actor name from audit trail if available */}
                <p className={`text-xs font-semibold text-center leading-tight ${isCurrent ? "text-blue-600"
                  : isCompleted ? "text-green-700"
                    : "text-muted-foreground"
                  }`}>
                  {(isCompleted && stepEvent?.actor_name) ? stepEvent.actor_name : step.role}
                </p>

                {/* Stage label */}
                <p className={`text-xs text-center mt-0.5 leading-tight ${isCurrent ? "text-blue-500" : "text-muted-foreground"
                  }`}>
                  {isCurrent ? `(${step.stage})` : step.stage}
                </p>

                {/* Timestamp for completed; "In Progress" for current */}
                {!isEnd && (
                  isCompleted && stepDate ? (
                    <p className="text-xs text-muted-foreground mt-1 text-center leading-tight">
                      {format(stepDate, "d MMM yyyy")}<br />{format(stepDate, "h:mm a")}
                    </p>
                  ) : isCurrent ? (
                    <p className="text-xs text-blue-500 mt-1 text-center font-medium">In Progress</p>
                  ) : null
                )}

                {/* Green check dot below completed steps */}
                {isCompleted && (
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-1">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Connector line between steps */}
              {idx < paths.length - 1 && (
                <div className={`w-8 h-0.5 mb-12 shrink-0 mx-1 ${isCompleted ? "bg-green-400"
                  : isCurrent ? "bg-blue-300"
                    : "bg-border"
                  }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Audit Trail ─────────────────────────────────────────────────────────────
const EVENT_LABELS = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  resubmitted: { label: "Resubmitted", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  changes_requested: { label: "Changes Requested", color: "bg-amber-100 text-amber-700" },
  escalated: { label: "Escalated", color: "bg-orange-100 text-orange-700" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-700" },
};

function AuditTrailSection({ events }) {
  if (!events.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-bold shrink-0">5</span>
        Audit Trail
      </h3>
      <div className="space-y-2">
        {events.map((e, i) => {
          const meta = EVENT_LABELS[e.event_type] || { label: e.event_type, color: "bg-muted text-muted-foreground" };
          return (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
              <div className="shrink-0 mt-0.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {e.actor_name}
                  <span className="font-normal text-muted-foreground ml-1">({e.actor_role})</span>
                </p>
                {e.comment && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                    <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                    {e.comment}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground shrink-0 text-right">
                {e.created_date ? format(new Date(e.created_date), "d MMM yy, h:mm a") : "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Contingency routing ─────────────────────────────────────────────────────
// Reads live `contingency_routes` from backend — no more hardcoded CONTINGENCY_ROUTES.
function ContingencyPanel({ workflow }) {
  const routes = workflow.contingency_routes || [];
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <h3 className="text-xs font-bold text-foreground mb-1 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
        Contingency Routing
      </h3>
      <p className="text-xs text-muted-foreground mb-3 ml-7">(Absence / Holiday / Unavailable)</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {routes.length === 0 ? (
          <p className="text-xs text-muted-foreground col-span-3 italic">No contingency routes configured.</p>
        ) : routes.map((r, i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-muted-foreground leading-tight mb-1.5">
              If <span className="font-semibold text-foreground">{r.primary}</span> is unavailable
            </p>
            <p className="text-xs font-semibold text-blue-700">→ {r.fallback}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Escalation + Governance ─────────────────────────────────────────────────
// Reads live `governance_badges` and `escalation_role` from backend.
function EscalationGovernancePanel({ workflow }) {
  const badges = workflow.governance_badges || [];
  const escalationRole = workflow.escalation_role || "Registered Service Manager";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Escalation */}
      <div className="bg-white border border-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
          Escalation
        </h3>
        <p className="text-xs text-muted-foreground mb-1">(If all above unavailable or SLA breached)</p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mt-2">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Escalate to {escalationRole}</p>
            <p className="text-xs text-muted-foreground mt-0.5">If unresolved → Regional Manager / Super Admin</p>
          </div>
        </div>
      </div>

      {/* Rules & Governance */}
      <div className="bg-white border border-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
          Rules &amp; Governance
        </h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {badges.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No governance rules configured.</p>
          ) : badges.map((badge, i) => (
            <span key={i} className={`text-xs font-medium px-2 py-1 rounded-full ${getGovernanceBadgeColor(badge)}`}>
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Right sidebar: Current Details ─────────────────────────────────────────
function CurrentDetailsCard({ workflow }) {
  const fmtDate = (d) => d ? format(new Date(d), "d MMM yyyy, h:mm a") : "—";
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Current Details
      </h4>
      <div className="space-y-2.5">
        <div>
          <p className="text-xs text-muted-foreground">Current Reviewer</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.assigned_to_name || "Under Review"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Assigned By</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.assigned_by_name || "System"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Assigned On</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{fmtDate(workflow.submitted_at || workflow.created_date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Due Date</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{fmtDate(workflow.deadline_datetime || workflow.due_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Priority</p>
          <div className="mt-0.5">{getPriorityBadge(workflow.priority)}</div>
        </div>
        {workflow.amount && (
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-xs font-bold text-foreground mt-0.5">
              £{Number(workflow.amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Home</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.home_name || "—"}</p>
        </div>
      </div>
    </div>
  );
}

// ── Right sidebar: Delegation Info ─────────────────────────────────────────
function DelegationCard({ workflow }) {
  const isDelegated = workflow.is_delegated || workflow.delegated_to_name;

  if (!isDelegated) {
    return (
      <div className="bg-white border border-border rounded-xl p-4">
        <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Delegation Info
        </h4>
        <p className="text-xs text-muted-foreground">No delegation currently active</p>
      </div>
    );
  }

  const fmtDate = (d) => d ? format(new Date(d), "d MMM yyyy") : "—";
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Delegation Info
      </h4>
      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <p className="text-xs text-red-700 font-medium">
          {workflow.original_assignee_name || "Primary Approver"} is on leave<br />
          <span className="font-normal text-red-600 text-xs">
            {fmtDate(workflow.leave_start)} – {fmtDate(workflow.leave_end)}
          </span>
        </p>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Delegated To</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.delegated_to_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Delegated On</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{fmtDate(workflow.delegated_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reason</p>
          <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.delegation_reason || "Annual Leave"}</p>
        </div>
      </div>
      <button className="text-xs text-blue-600 hover:underline mt-3 block">View Delegation History →</button>
    </div>
  );
}



// ── Main Inspector Panel ────────────────────────────────────────────────────
export default function WorkflowInspectorPanel({ workflow, staffProfile, user, homes, staff, onRefresh, onClose, isMobile, onFilterWorkflow }) {
  const [showApprove, setShowApprove] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [previewType, setPreviewType] = useState("");

  // Fetch real audit trail events for the selected workflow.
  const { data: events = [] } = useQuery({
    queryKey: ["workflow-events", workflow?.id],
    queryFn: () => base44.workflow.events(workflow.id),
    enabled: !!workflow?.id,
    staleTime: 30 * 1000,
  });

  const { data: workflowTypes = [] } = useQuery({
    queryKey: ["workflow-types"],
    queryFn: async () => {
      const data = await base44.workflow.types();
      console.log("workflow types:", data);
      return data;
    },
  });

  const activeWorkflow = previewType && !workflow
    ? {
      entity_type: previewType,
      workflow_type: previewType,
      priority: "routine",
      status: "submitted",
      current_step: 2,
      current_stage: "Under Review",
      // Preview mode has no live matrix data — will show loading state in stepper
      approval_path: [],
      contingency_routes: [],
      governance_badges: [],
    }
    : workflow;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!activeWorkflow) {
    return (
      <div className="flex-1 bg-card border border-border rounded-xl flex flex-col items-center justify-center p-12 text-center mt-4">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7 text-blue-300" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">Select a workflow</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Select a workflow to view its approval path and contingency route.
        </p>
        <div className="mt-6">
          <p className="text-xs text-muted-foreground mb-2">Or preview a workflow type:</p>
          <div className="relative inline-block">
            <select
              value={previewType}
              // onChange={e => setPreviewType(e.target.value)}
              onChange={e => {
                const type = e.target.value;
                setPreviewType(type);

                if (onFilterWorkflow) {
                  onFilterWorkflow(type);
                }
              }}
              className="h-8 text-xs border border-border rounded-lg pl-3 pr-7 bg-background appearance-none cursor-pointer"
            >
              <option value="">Preview Another Workflow…</option>
              {/* {PREVIEW_TYPES.map(t => {
                const m = WORKFLOW_META[t];
                return <option key={t} value={t}>{m?.label}</option>;
              })} */}
              {workflowTypes.map(t => (
                <option
                  key={t.workflow_type}
                  value={t.workflow_type}
                >
                  {t.label || t.workflow_type}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>
    );
  }



  // ── Permission logic ──────────────────────────────────────────────────────
  const wType = activeWorkflow.entity_type || activeWorkflow.workflow_type;
  const meta = WORKFLOW_META[wType] || WORKFLOW_META._default;
  const actions = getActionLabels(wType);

  const role = staffProfile?.role || user?.role || "support_worker";
  const authUserId = user?.id || staffProfile?.user_id;
  const myRank = rankOf(role);
  const makerRank = activeWorkflow.maker_rank || 0;

  const isOwnSubmission = activeWorkflow.maker_id === authUserId;
  const isClosed = ["approved", "rejected", "closed"].includes(activeWorkflow.status);
  const isAssignedReviewer = activeWorkflow.reviewer_role === role;
  const outranksReviewer = myRank > rankOf(activeWorkflow.reviewer_role);
  const passesRankGuard = makerRank === 0 ? true : myRank > makerRank;

  const canAct = !isOwnSubmission && !isClosed && passesRankGuard &&
    (isAssignedReviewer || outranksReviewer);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 mt-4 flex flex-col min-h-0">

      {/* Panel header */}
      <div className="bg-white border border-border rounded-t-xl px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <meta.icon className={`w-4 h-4 ${meta.iconColor}`} />
          <div>
            <h2 className="text-sm font-bold text-foreground">Approval Path &amp; Contingency</h2>
            <p className="text-xs text-muted-foreground">Dynamic path based on selected workflow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={previewType}
              // onChange={e => setPreviewType(e.target.value)}
              onChange={e => {
                const type = e.target.value;
                setPreviewType(type);

                if (onFilterWorkflow) {
                  onFilterWorkflow(type);
                }
              }}
              className="h-8 text-xs border border-border rounded-lg pl-3 pr-7 bg-background appearance-none cursor-pointer"
            >
              <option value="">Preview Another Workflow</option>
              {/* {PREVIEW_TYPES.map(t => {
                const m = WORKFLOW_META[t];
                return <option key={t} value={t}>{m?.label}</option>;
              })} */}
              {workflowTypes.map(t => (
                <option
                  key={t.workflow_type}
                  value={t.workflow_type}
                >
                  {t.label || t.workflow_type}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {workflow && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
              onClick={() => setShowDetail(true)}>
              <ExternalLink className="w-3 h-3" /> View Full Details
            </Button>
          )}
          {isMobile && (
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg ml-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showDetail && (
          <WorkflowDetailModal
            workflowId={workflow?.id}
            onClose={() => setShowDetail(false)}
          />
        )}

      </div>

      {/* Scrollable body */}
      <div className="bg-slate-50 border-x border-b border-border rounded-b-xl overflow-y-auto flex-1 p-4">

        {/* Summary bar */}
        {workflow && <SummaryBar workflow={activeWorkflow} />}

        {/* Two-column layout */}
        <div className="mt-3 flex gap-3">

          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* 1 — Approval path stepper (live from matrix) */}
            <ApprovalPathStepper workflow={activeWorkflow} events={events} />

            {/* 2 — Contingency routing (live from matrix) */}
            <ContingencyPanel workflow={activeWorkflow} />

            {/* 3 & 4 — Escalation + Governance (live from matrix) */}
            <EscalationGovernancePanel workflow={activeWorkflow} />

            {/* 5 — Audit trail (live from workflow_events table) */}
            {workflow && <AuditTrailSection events={events} />}

            {/* Actions */}
            {workflow && canAct && (
              <div className="bg-white border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-foreground mb-3">Actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => setShowApprove(true)}>
                    <CheckCircle2 className="w-3 h-3" /> {actions.approve}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => setShowReturn(true)}>
                    {actions.reject}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => setShowEscalate(true)}>
                    {actions.escalate}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => setShowNote(true)}>
                    Add Note
                  </Button>
                </div>
              </div>
            )}

            {/* Footer info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-blue-700">
                  Delegations are automatic based on leave calendar, role equivalency, workload and approval
                  authority rules. All actions are logged in Audit Trail.
                </p>
                <button className="text-xs text-blue-600 hover:underline mt-1">Learn more about workflows</button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          {workflow && (
            <div className="w-56 shrink-0 space-y-3">
              <CurrentDetailsCard workflow={activeWorkflow} />
              <DelegationCard workflow={activeWorkflow} />
            </div>
          )}
        </div>
      </div>

      {/* Action modals */}
      {
        workflow && (
          <WorkflowActionModals
            workflow={activeWorkflow}
            staffProfile={staffProfile}
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
        )
      }
    </div >
  );
}
