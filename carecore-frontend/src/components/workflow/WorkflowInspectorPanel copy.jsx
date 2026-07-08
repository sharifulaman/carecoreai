// import { useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { format } from "date-fns";
// import { X, ExternalLink, ChevronDown, Info, CheckCircle2, Circle, Clock, AlertCircle, MessageSquare } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { base44 } from "@/api/base44Client";
// import { rankOf } from "@/lib/roleConfig";
// import {
//   WORKFLOW_META, APPROVAL_PATHS, CONTINGENCY_ROUTES, GOVERNANCE_BADGES,
//   getPriorityBadge, getGovernanceBadgeColor, getActionLabels
// } from "./workflowConfig";
// import WorkflowActionModals from "./WorkflowActionModals";

// const PREVIEW_TYPES = [
//   "bill", "expense_claim", "incident_report", "missing_episode", "support_plan",
//   "risk_assessment", "leave_request", "new_staff_entry", "maintenance_quote", "reg_32", "disciplinary", "staff_movement"
// ];

// // ── Summary bar (top of inspector) ─────────────────────────────────────────
// function SummaryBar({ workflow }) {
//   const meta = WORKFLOW_META[workflow.entity_type] || WORKFLOW_META[workflow.workflow_type] || WORKFLOW_META._default;
//   const isOverdue = workflow.deadline_datetime && new Date(workflow.deadline_datetime) < new Date();
//   const slaLabel = workflow.deadline_datetime
//     ? (isOverdue ? "Overdue" : `${Math.max(0, Math.ceil((new Date(workflow.deadline_datetime) - new Date()) / 86400000))} day left`)
//     : "1 day left";

//   return (
//     <div className="bg-white border border-border rounded-xl p-4 flex items-start gap-3">
//       <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
//         <meta.icon className={`w-5 h-5 ${meta.iconColor}`} />
//       </div>
//       <div className="flex-1 min-w-0">
//         <p className="text-sm font-bold text-foreground">{meta.label}</p>
//         <p className="text-xs text-muted-foreground">Submitted by: {workflow.maker_name || workflow.submitted_by_name || "Staff"}</p>
//       </div>
//       <div className="flex items-center gap-6 shrink-0 flex-wrap">
//         <div>
//           <p className="text-xs text-muted-foreground mb-1">Priority</p>
//           {getPriorityBadge(workflow.priority)}
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground mb-1">Current Stage</p>
//           <p className="text-xs font-semibold text-foreground flex items-center gap-1">
//             <Circle className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />
//             {workflow.current_stage || "Admin Validation"}
//           </p>
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground mb-1">SLA</p>
//           <p className={`text-xs font-semibold flex items-center gap-1 ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
//             <Clock className="w-3 h-3" /> {slaLabel}
//           </p>
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground mb-1">Workflow ID</p>
//           <p className="text-xs font-mono text-foreground">{workflow.entity_ref || workflow.entity_reference || workflow.reference || "—"}</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Approval path stepper ───────────────────────────────────────────────────
// function ApprovalPathStepper({ workflow, events = [] }) {
//   const wType = workflow.entity_type || workflow.workflow_type || "_default";
//   const paths = APPROVAL_PATHS[wType] || APPROVAL_PATHS._default;
//   const currentStep = workflow.current_step || 1;

//   // Find the real event for a given step index (1-based step_number).
//   // Approved events carry the actual timestamp of when a reviewer signed off.
//   const getStepEvent = (stepIdx) =>
//     events.find(e => e.step_number === stepIdx + 1 &&
//       (e.event_type === "approved" || e.event_type === "submitted"));

//   return (
//     <div className="bg-white border border-border rounded-xl p-4">
//       <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
//         <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
//         Standard Approval Path
//       </h3>
//       <div className="flex items-start overflow-x-auto pb-2 gap-0">
//         {paths.map((step, idx) => {
//           const isCompleted = idx < currentStep - 1;
//           const isCurrent = idx === currentStep - 1;
//           const isEnd = step.type === "end";
//           const stepEvent = getStepEvent(idx);
//           const stepDate = stepEvent?.created_date ? new Date(stepEvent.created_date) : null;

//           return (
//             <div key={idx} className="flex items-center">
//               <div className={`flex flex-col items-center min-w-[90px] max-w-[105px] ${isEnd ? "opacity-60" : ""}`}>
//                 {/* Circle */}
//                 <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${isCompleted ? "bg-green-500 border-green-500 text-white" :
//                     isCurrent ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100" :
//                       "bg-background border-border text-muted-foreground"
//                   }`}>
//                   {isCompleted ? (
//                     <CheckCircle2 className="w-5 h-5" />
//                   ) : isEnd ? (
//                     <CheckCircle2 className="w-4 h-4 opacity-40" />
//                   ) : (
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                     </svg>
//                   )}
//                 </div>

//                 {/* Role label */}
//                 <p className={`text-xs font-semibold text-center leading-tight ${isCurrent ? "text-blue-600" : isCompleted ? "text-green-700" : "text-muted-foreground"}`}>
//                   {stepEvent?.actor_name || step.role}
//                 </p>
//                 {/* Stage */}
//                 <p className={`text-xs text-center mt-0.5 leading-tight ${isCurrent ? "text-blue-500" : "text-muted-foreground"}`}>
//                   {isCurrent ? `(${step.stage})` : step.stage}
//                 </p>
//                 {/* Real timestamp for completed steps; "In Progress" for current */}
//                 {!isEnd && (
//                   isCompleted && stepDate ? (
//                     <p className="text-xs text-muted-foreground mt-1 text-center leading-tight">
//                       {format(stepDate, "d MMM yyyy")}<br />{format(stepDate, "h:mm a")}
//                     </p>
//                   ) : isCurrent ? (
//                     <p className="text-xs text-blue-500 mt-1 text-center leading-tight font-medium">In Progress</p>
//                   ) : null
//                 )}
//                 {/* Green check for completed */}
//                 {isCompleted && (
//                   <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-1">
//                     <CheckCircle2 className="w-3 h-3 text-white" />
//                   </div>
//                 )}
//               </div>

//               {idx < paths.length - 1 && (
//                 <div className={`w-8 h-0.5 mb-12 shrink-0 mx-1 ${isCompleted ? "bg-green-400" : isCurrent ? "bg-blue-300" : "bg-border"}`} />
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ── Audit Trail ─────────────────────────────────────────────────────────────
// const EVENT_LABELS = {
//   submitted:          { label: "Submitted",           color: "bg-blue-100 text-blue-700" },
//   resubmitted:        { label: "Resubmitted",         color: "bg-blue-100 text-blue-700" },
//   approved:           { label: "Approved",            color: "bg-green-100 text-green-700" },
//   rejected:           { label: "Rejected",            color: "bg-red-100 text-red-700" },
//   changes_requested:  { label: "Changes Requested",   color: "bg-amber-100 text-amber-700" },
//   escalated:          { label: "Escalated",           color: "bg-orange-100 text-orange-700" },
//   closed:             { label: "Closed",              color: "bg-slate-100 text-slate-700" },
// };

// function AuditTrailSection({ events }) {
//   if (!events.length) return null;
//   return (
//     <div className="bg-white border border-border rounded-xl p-4">
//       <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
//         <span className="w-5 h-5 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-bold shrink-0">5</span>
//         Audit Trail
//       </h3>
//       <div className="space-y-2">
//         {events.map((e, i) => {
//           const meta = EVENT_LABELS[e.event_type] || { label: e.event_type, color: "bg-muted text-muted-foreground" };
//           return (
//             <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
//               <div className="shrink-0 mt-0.5">
//                 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-xs font-semibold text-foreground">{e.actor_name}
//                   <span className="font-normal text-muted-foreground ml-1">({e.actor_role})</span>
//                 </p>
//                 {e.comment && (
//                   <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
//                     <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
//                     {e.comment}
//                   </p>
//                 )}
//               </div>
//               <p className="text-xs text-muted-foreground shrink-0 text-right">
//                 {e.created_date ? format(new Date(e.created_date), "d MMM yy, h:mm a") : "—"}
//               </p>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ── Contingency routing ─────────────────────────────────────────────────────
// function ContingencyPanel({ workflow }) {
//   const wType = workflow.entity_type || workflow.workflow_type || "_default";
//   const routes = CONTINGENCY_ROUTES[wType] || CONTINGENCY_ROUTES._default;

//   return (
//     <div className="bg-white border border-border rounded-xl p-4">
//       <h3 className="text-xs font-bold text-foreground mb-1 flex items-center gap-2">
//         <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
//         Contingency Routing
//       </h3>
//       <p className="text-xs text-muted-foreground mb-3 ml-7">(Absence / Holiday / Unavailable)</p>
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
//         {routes.map((r, i) => (
//           <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
//             <p className="text-xs text-muted-foreground leading-tight mb-1.5">
//               If <span className="font-semibold text-foreground">{r.primary}</span> is unavailable
//             </p>
//             <p className="text-xs font-semibold text-blue-700">→ {r.fallback}</p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ── Escalation + Governance (row) ───────────────────────────────────────────
// function EscalationGovernancePanel({ workflow }) {
//   const wType = workflow.entity_type || workflow.workflow_type || "_default";
//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//       {/* Escalation */}
//       <div className="bg-white border border-border rounded-xl p-4">
//         <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
//           <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
//           Escalation
//         </h3>
//         <p className="text-xs text-muted-foreground mb-1">(If all above unavailable or SLA breached)</p>
//         <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mt-2">
//           <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
//             <AlertCircle className="w-4 h-4 text-red-500" />
//           </div>
//           <div>
//             <p className="text-xs font-semibold text-foreground">Escalate to Registered Service Manager</p>
//             <p className="text-xs text-muted-foreground mt-0.5">If unresolved → Regional Manager / Super Admin</p>
//           </div>
//         </div>
//       </div>

//       {/* Rules & Governance */}
//       <div className="bg-white border border-border rounded-xl p-4">
//         <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
//           <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
//           Rules & Governance
//         </h3>
//         <div className="flex flex-wrap gap-1.5 mt-2">
//           {(GOVERNANCE_BADGES[wType] || GOVERNANCE_BADGES._default).map((badge, i) => (
//             <span key={i} className={`text-xs font-medium px-2 py-1 rounded-full ${getGovernanceBadgeColor(badge)}`}>
//               {badge}
//             </span>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Right sidebar: Current Details ─────────────────────────────────────────
// function CurrentDetailsCard({ workflow }) {
//   const fmtDate = (d) => d ? format(new Date(d), "d MMM yyyy, h:mm a") : "—";
//   return (
//     <div className="bg-white border border-border rounded-xl p-4">
//       <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
//         <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//         </svg>
//         Current Details
//       </h4>
//       <div className="space-y-2.5">
//         <div>
//           <p className="text-xs text-muted-foreground">Current Reviewer</p>
//           <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.assigned_to_name || currentLabelFromStatus(workflow)}</p>
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground">Assigned By</p>
//           <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.assigned_by_name || "Team Manager"}</p>
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground">Assigned On</p>
//           <p className="text-xs font-semibold text-foreground mt-0.5">{fmtDate(workflow.submitted_at || workflow.created_date)}</p>
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground">Due Date</p>
//           <p className="text-xs font-semibold text-foreground mt-0.5">{fmtDate(workflow.deadline_datetime || workflow.due_date)}</p>
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground">Priority</p>
//           <div className="mt-0.5">{getPriorityBadge(workflow.priority)}</div>
//         </div>
//         {workflow.amount && (
//           <div>
//             <p className="text-xs text-muted-foreground">Amount</p>
//             <p className="text-xs font-bold text-foreground mt-0.5">£{Number(workflow.amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
//           </div>
//         )}
//         <div>
//           <p className="text-xs text-muted-foreground">Home</p>
//           <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.home_name || "—"}</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// function currentLabelFromStatus(w) {
//   const statusMap = {
//     pending_tl: "Team Leader",
//     pending_tm: "Team Manager",
//     pending_rm: "Risk Manager",
//     pending_rsm: "Compliance Manager",
//     pending_admin: "Admin Manager",
//     pending_finance: "Finance Manager",
//     pending_fo: "Finance Officer",
//     pending_fm: "Finance Manager",
//     pending_ho: "HR Officer",
//     pending_hm: "HR Manager",
//   };
//   return statusMap[w.status] || "Under Review";
// }

// // ── Right sidebar: Delegation Info ─────────────────────────────────────────
// function DelegationCard({ workflow }) {
//   const isDelegated = workflow.is_delegated || workflow.delegated_to_name;
//   if (!isDelegated) {
//     return (
//       <div className="bg-white border border-border rounded-xl p-4">
//         <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
//           <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
//           </svg>
//           Delegation Info
//         </h4>
//         <p className="text-xs text-muted-foreground">No delegation currently active</p>
//       </div>
//     );
//   }

//   const fmtDate = (d) => d ? format(new Date(d), "d MMM yyyy") : "—";

//   return (
//     <div className="bg-white border border-border rounded-xl p-4">
//       <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
//         <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
//         </svg>
//         Delegation Info
//       </h4>
//       {/* Admin Manager on leave warning */}
//       <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
//         <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
//         <p className="text-xs text-red-700 font-medium">
//           {workflow.original_assignee_name || "Admin Manager"} is on leave<br />
//           <span className="font-normal text-red-600 text-xs">
//             {fmtDate(workflow.leave_start || workflow.submitted_at)} – {fmtDate(workflow.leave_end || workflow.deadline_datetime)}
//           </span>
//         </p>
//       </div>
//       <div className="space-y-2">
//         <div>
//           <p className="text-xs text-muted-foreground">Delegated To</p>
//           <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.delegated_to_name}</p>
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground">Delegated On</p>
//           <p className="text-xs font-semibold text-foreground mt-0.5">{fmtDate(workflow.delegated_at || workflow.submitted_at)}</p>
//         </div>
//         <div>
//           <p className="text-xs text-muted-foreground">Reason</p>
//           <p className="text-xs font-semibold text-foreground mt-0.5">{workflow.delegation_reason || "Annual Leave"}</p>
//         </div>
//       </div>
//       <button className="text-xs text-blue-600 hover:underline mt-3 block">View Delegation History →</button>
//     </div>
//   );
// }

// // ── Main Inspector Panel ────────────────────────────────────────────────────
// export default function WorkflowInspectorPanel({ workflow, staffProfile, user, homes, staff, onRefresh, onClose, isMobile }) {
//   const [showApprove, setShowApprove] = useState(false);
//   const [showReject, setShowReject] = useState(false);
//   const [showReturn, setShowReturn] = useState(false);
//   const [showEscalate, setShowEscalate] = useState(false);
//   const [showNote, setShowNote] = useState(false);
//   const [previewType, setPreviewType] = useState("");

//   // Fetch the real audit trail for the selected workflow.
//   const { data: events = [] } = useQuery({
//     queryKey: ["workflow-events", workflow?.id],
//     queryFn: () => base44.workflow.events(workflow.id),
//     enabled: !!workflow?.id,
//     staleTime: 30 * 1000,
//   });

//   const activeWorkflow = previewType && !workflow
//     ? { entity_type: previewType, workflow_type: previewType, priority: "normal", status: "pending_admin", current_step: 2, current_stage: "Admin Validation" }
//     : workflow;

//   if (!activeWorkflow) {
//     return (
//       <div className="flex-1 bg-card border border-border rounded-xl flex flex-col items-center justify-center p-12 text-center mt-4">
//         <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
//           <CheckCircle2 className="w-7 h-7 text-blue-300" />
//         </div>
//         <p className="text-sm font-semibold text-foreground mb-1">Select a workflow</p>
//         <p className="text-xs text-muted-foreground max-w-xs">Select a workflow to view its approval path and contingency route.</p>
//         <div className="mt-6">
//           <p className="text-xs text-muted-foreground mb-2">Or preview a workflow type:</p>
//           <div className="relative inline-block">
//             <select
//               value={previewType}
//               onChange={e => setPreviewType(e.target.value)}
//               className="h-8 text-xs border border-border rounded-lg pl-3 pr-7 bg-background appearance-none cursor-pointer"
//             >
//               <option value="">Preview Another Workflow…</option>
//               {PREVIEW_TYPES.map(t => {
//                 const m = WORKFLOW_META[t];
//                 return <option key={t} value={t}>{m?.label}</option>;
//               })}
//             </select>
//             <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const wType = activeWorkflow.entity_type || activeWorkflow.workflow_type;
//   const meta = WORKFLOW_META[wType] || WORKFLOW_META._default;
//   const actions = getActionLabels(wType);

//   const role = staffProfile?.role || user?.role || "support_worker";
//   // Use the auth user ID for maker check — maker_id is stored from JWT claims.
//   const authUserId = user?.id || staffProfile?.user_id;
//   const myRank = rankOf(role);
//   const makerRank = activeWorkflow.maker_rank || 0;

//   const isOwnSubmission = activeWorkflow.maker_id === authUserId;
//   const isClosed = ["approved", "rejected", "closed"].includes(activeWorkflow.status);
//   const isAssignedReviewer = activeWorkflow.reviewer_role === role;
//   const outranksCurrentReviewer = myRank > rankOf(activeWorkflow.reviewer_role);
//   // Rank guard: caller must be strictly above the maker.
//   // Fallback for old records without maker_rank: only the assigned reviewer (or higher) may act.
//   const passesRankGuard = makerRank === 0 ? true : myRank > makerRank;

//   const canAct = !isOwnSubmission
//     && !isClosed
//     && passesRankGuard
//     && (isAssignedReviewer || outranksCurrentReviewer);

//   return (
//     <div className="flex-1 mt-4 flex flex-col min-h-0">
//       {/* Panel Header */}
//       <div className="bg-white border border-border rounded-t-xl px-5 py-3 flex items-center justify-between shrink-0">
//         <div className="flex items-center gap-2">
//           <meta.icon className={`w-4 h-4 ${meta.iconColor}`} />
//           <div>
//             <h2 className="text-sm font-bold text-foreground">Approval Path &amp; Contingency</h2>
//             <p className="text-xs text-muted-foreground">Dynamic path based on selected workflow</p>
//           </div>
//         </div>
//         <div className="flex items-center gap-2">
//           <div className="relative">
//             <select
//               value={previewType}
//               onChange={e => setPreviewType(e.target.value)}
//               className="h-8 text-xs border border-border rounded-lg pl-3 pr-7 bg-background appearance-none cursor-pointer"
//             >
//               <option value="">Preview Another Workflow</option>
//               {PREVIEW_TYPES.map(t => {
//                 const m = WORKFLOW_META[t];
//                 return <option key={t} value={t}>{m?.label}</option>;
//               })}
//             </select>
//             <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
//           </div>
//           {workflow && (
//             <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
//               <ExternalLink className="w-3 h-3" /> View Full Details
//             </Button>
//           )}
//           {isMobile && <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg ml-1"><X className="w-4 h-4" /></button>}
//         </div>
//       </div>

//       {/* Scrollable body */}
//       <div className="bg-slate-50 border-x border-b border-border rounded-b-xl overflow-y-auto flex-1 p-4">
//         {/* Summary bar */}
//         {workflow && <SummaryBar workflow={activeWorkflow} />}

//         {/* Main two-column layout: left (path sections) + right sidebar */}
//         <div className="mt-3 flex gap-3">
//           {/* Left: approval path, contingency, escalation+governance */}
//           <div className="flex-1 min-w-0 space-y-3">
//             <ApprovalPathStepper workflow={activeWorkflow} events={events} />
//             <ContingencyPanel workflow={activeWorkflow} />
//             <EscalationGovernancePanel workflow={activeWorkflow} />

//             {/* Audit Trail — real history of every action taken on this workflow */}
//             {workflow && <AuditTrailSection events={events} />}

//             {/* Actions */}
//             {workflow && canAct && (
//               <div className="bg-white border border-border rounded-xl p-4">
//                 <p className="text-xs font-bold text-foreground mb-3">Actions</p>
//                 <div className="flex flex-wrap gap-2">
//                   <Button size="sm" className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => setShowApprove(true)}>
//                     <CheckCircle2 className="w-3 h-3" /> {actions.approve}
//                   </Button>
//                   <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowReturn(true)}>
//                     {actions.reject}
//                   </Button>
//                   <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowEscalate(true)}>
//                     {actions.escalate}
//                   </Button>
//                   <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNote(true)}>
//                     Add Note
//                   </Button>
//                 </div>
//               </div>
//             )}

//             {/* Footer info */}
//             <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
//               <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
//               <div className="flex-1">
//                 <p className="text-xs text-blue-700">
//                   Delegations are automatic based on leave calendar, role equivalency, workload and approval authority rules. All actions are logged in Audit Trail.
//                 </p>
//                 <button className="text-xs text-blue-600 hover:underline mt-1">Learn more about workflows</button>
//               </div>
//             </div>
//           </div>

//           {/* Right sidebar: Current Details + Delegation (always visible when workflow selected) */}
//           {workflow && (
//             <div className="w-56 shrink-0 space-y-3">
//               <CurrentDetailsCard workflow={activeWorkflow} />
//               <DelegationCard workflow={activeWorkflow} />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Action Modals */}
//       {workflow && (
//         <WorkflowActionModals
//           workflow={activeWorkflow}
//           staffProfile={staffProfile}
//           showApprove={showApprove}
//           setShowApprove={setShowApprove}
//           showReject={showReject}
//           setShowReject={setShowReject}
//           showReturn={showReturn}
//           setShowReturn={setShowReturn}
//           showEscalate={showEscalate}
//           setShowEscalate={setShowEscalate}
//           showNote={showNote}
//           setShowNote={setShowNote}
//           onSuccess={onRefresh}
//         />
//       )}
//     </div>
//   );
// }