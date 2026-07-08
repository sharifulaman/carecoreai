import {
  Receipt, Wallet, AlertTriangle, AlertCircle, ClipboardList, FileText,
  UserCheck, Plane, Wrench, Shield, Building2, Scale, HeartPulse, 
  BookOpen, Users, Settings, Package, HardHat
} from "lucide-react";

export const WORKFLOW_META = {
  bill: { label: "Bill Approval", icon: Receipt, iconBg: "bg-orange-100", iconColor: "text-orange-600", category: "Finance" },
  expense_claim: { label: "Expense Claim", icon: Wallet, iconBg: "bg-green-100", iconColor: "text-green-600", category: "Finance" },
  petty_cash: { label: "Petty Cash", icon: Wallet, iconBg: "bg-green-100", iconColor: "text-green-600", category: "Finance" },
  budget_change: { label: "Budget Change", icon: Receipt, iconBg: "bg-orange-100", iconColor: "text-orange-600", category: "Finance" },
  placement_fee: { label: "Placement Fee", icon: Receipt, iconBg: "bg-orange-100", iconColor: "text-orange-600", category: "Finance" },
  incident_report: { label: "Incident Review", icon: AlertTriangle, iconBg: "bg-red-100", iconColor: "text-red-600", category: "Care" },
  missing_episode: { label: "Missing Episode", icon: AlertCircle, iconBg: "bg-red-100", iconColor: "text-red-600", category: "Care" },
  safeguarding: { label: "Safeguarding Concern", icon: Shield, iconBg: "bg-red-100", iconColor: "text-red-600", category: "Care" },
  medication_error: { label: "Medication Error", icon: HeartPulse, iconBg: "bg-red-100", iconColor: "text-red-600", category: "Care" },
  complaint_review: { label: "Complaint Review", icon: AlertCircle, iconBg: "bg-amber-100", iconColor: "text-amber-600", category: "Care" },
  visit_report: { label: "Visit Report", icon: FileText, iconBg: "bg-blue-100", iconColor: "text-blue-600", category: "Care" },
  support_plan: { label: "Support Plan Review", icon: ClipboardList, iconBg: "bg-blue-100", iconColor: "text-blue-600", category: "Planning" },
  risk_assessment: { label: "Risk Assessment Review", icon: Shield, iconBg: "bg-amber-100", iconColor: "text-amber-600", category: "Planning" },
  placement_plan: { label: "Placement Plan", icon: ClipboardList, iconBg: "bg-blue-100", iconColor: "text-blue-600", category: "Planning" },
  behaviour_plan: { label: "Behaviour Plan", icon: ClipboardList, iconBg: "bg-purple-100", iconColor: "text-purple-600", category: "Planning" },
  pathway_plan: { label: "Pathway Plan", icon: BookOpen, iconBg: "bg-blue-100", iconColor: "text-blue-600", category: "Planning" },
  leave_request: { label: "Leave Request", icon: Plane, iconBg: "bg-sky-100", iconColor: "text-sky-600", category: "HR" },
  staff_onboarding: { label: "Staff Onboarding", icon: UserCheck, iconBg: "bg-teal-100", iconColor: "text-teal-600", category: "HR" },
  new_staff_entry: { label: "Staff Onboarding", icon: UserCheck, iconBg: "bg-teal-100", iconColor: "text-teal-600", category: "HR" },
  staff_movement: { label: "Staff Movement", icon: Users, iconBg: "bg-teal-100", iconColor: "text-teal-600", category: "HR" },
  disciplinary: { label: "Disciplinary Case", icon: Scale, iconBg: "bg-red-100", iconColor: "text-red-600", category: "HR" },
  maintenance_request: { label: "Maintenance Request", icon: Wrench, iconBg: "bg-slate-100", iconColor: "text-slate-600", category: "Maintenance" },
  maintenance_quote: { label: "Maintenance Quote Approval", icon: Wrench, iconBg: "bg-slate-100", iconColor: "text-slate-600", category: "Maintenance" },
  home_document: { label: "Home Document Review", icon: Building2, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", category: "Home/Admin" },
  reg_32: { label: "Reg 32 Report Review", icon: FileText, iconBg: "bg-purple-100", iconColor: "text-purple-600", category: "Compliance" },
  internal_audit: { label: "Internal Audit", icon: Shield, iconBg: "bg-purple-100", iconColor: "text-purple-600", category: "Compliance" },
  ofsted_notification: { label: "Ofsted Notification", icon: AlertTriangle, iconBg: "bg-red-100", iconColor: "text-red-600", category: "Compliance" },
  reg_27: { label: "Reg 27 Action", icon: FileText, iconBg: "bg-purple-100", iconColor: "text-purple-600", category: "Compliance" },
  role_change: { label: "Role Change", icon: Settings, iconBg: "bg-slate-100", iconColor: "text-slate-600", category: "Tenant/System" },

  // ── Homes module — keyed by module_key (matches MakerCheckerMatrix.module_key) ──
  homes_accidents_illness: { label: "Accident/Illness Report", icon: AlertTriangle, iconBg: "bg-red-100", iconColor: "text-red-600", category: "Homes" },
  homes_assets: { label: "Asset Approval", icon: Package, iconBg: "bg-purple-100", iconColor: "text-purple-600", category: "Homes" },
  homes_home_creation_details: { label: "Home Creation", icon: Building2, iconBg: "bg-blue-100", iconColor: "text-blue-600", category: "Homes" },
  homes_property_tenancy_documents: { label: "Property/Tenancy Document", icon: FileText, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", category: "Homes" },
  homes_checks_chores_audits: { label: "Failed Home Check", icon: HardHat, iconBg: "bg-amber-100", iconColor: "text-amber-600", category: "Homes" },

  // ── Staff & HR — onboarding alias (workflow_type "onboarding" used by triggerWorkflow,
  // doesn't match the existing "staff_onboarding" key above) ──
  staff_hr_onboarding: { label: "Staff Onboarding", icon: UserCheck, iconBg: "bg-teal-100", iconColor: "text-teal-600", category: "HR" },
  onboarding: { label: "Staff Onboarding", icon: UserCheck, iconBg: "bg-teal-100", iconColor: "text-teal-600", category: "HR" },

  _default: { label: "Workflow", icon: FileText, iconBg: "bg-slate-100", iconColor: "text-slate-600", category: "General" },
};

// Standard approval paths per workflow type
export const APPROVAL_PATHS = {
  bill: [
    { role: "Support Worker", stage: "Submitted", type: "submitter" },
    { role: "Team Leader / Team Manager", stage: "Reviewed", type: "approver" },
    { role: "Admin Manager", stage: "Admin Validation", type: "approver", current: true },
    { role: "Finance Manager", stage: "Financial Approval", type: "approver" },
    { role: "Posted / Paid", stage: "Completed", type: "end" },
  ],
  expense_claim: [
    { role: "Staff", stage: "Submitted", type: "submitter" },
    { role: "Line Manager", stage: "Manager Review", type: "approver" },
    { role: "Finance Manager", stage: "Finance Approval", type: "approver" },
    { role: "Reimbursed", stage: "Completed", type: "end" },
  ],
  incident_report: [
    { role: "Support Worker", stage: "Logged", type: "submitter" },
    { role: "Team Leader", stage: "Initial Review", type: "approver" },
    { role: "Team Manager", stage: "Medium/High Risk Review", type: "approver" },
    { role: "Registered Service Manager", stage: "Serious Incident Sign-Off", type: "approver" },
    { role: "Closed", stage: "Case Closed", type: "end" },
  ],
  missing_episode: [
    { role: "Support Worker / Team Leader", stage: "Reported", type: "submitter" },
    { role: "Team Leader", stage: "Immediate Review", type: "approver" },
    { role: "Team Manager", stage: "Risk Assessment", type: "approver" },
    { role: "Registered Service Manager", stage: "Closure Sign-Off", type: "approver" },
    { role: "Closed", stage: "Episode Closed", type: "end" },
  ],
  safeguarding: [
    { role: "Any Care Staff", stage: "Reported", type: "submitter" },
    { role: "Team Manager / RSM", stage: "Initial Review", type: "approver" },
    { role: "Risk Manager", stage: "Risk Controls", type: "approver" },
    { role: "Registered Service Manager", stage: "Final Sign-Off", type: "approver" },
  ],
  support_plan: [
    { role: "Support Worker", stage: "Contributed", type: "submitter" },
    { role: "Team Leader / Team Manager", stage: "Drafted & Reviewed", type: "approver" },
    { role: "Team Manager", stage: "Manager Sign-Off", type: "approver" },
    { role: "Registered Service Manager", stage: "Final Sign-Off", type: "approver" },
  ],
  risk_assessment: [
    { role: "Team Leader / Team Manager", stage: "Drafted", type: "submitter" },
    { role: "Risk Manager", stage: "Risk Review", type: "approver" },
    { role: "Registered Service Manager", stage: "High/Critical Final Sign-Off", type: "approver" },
    { role: "Active Risk Version", stage: "Completed", type: "end" },
  ],
  leave_request: [
    { role: "Staff Member", stage: "Requested", type: "submitter" },
    { role: "Line Manager / TL / TM", stage: "Manager Review", type: "approver" },
    { role: "HR Manager", stage: "Exception Review (if required)", type: "approver" },
    { role: "Approved / Rejected", stage: "HR Record Updated", type: "end" },
  ],
  staff_onboarding: [
    { role: "HR Officer / Admin / TM", stage: "Submitted", type: "submitter" },
    { role: "HR Manager", stage: "HR Review", type: "approver" },
    { role: "Compliance Manager", stage: "Compliance Evidence Review", type: "approver" },
    { role: "Registered Service Manager", stage: "Home/Role Activation", type: "approver" },
    { role: "Active Staff", stage: "Onboarded", type: "end" },
  ],
  maintenance_quote: [
    { role: "Admin / Maintenance Officer", stage: "Submitted", type: "submitter" },
    { role: "Admin Manager", stage: "Admin Review", type: "approver" },
    { role: "Finance Manager", stage: "Finance Approval", type: "approver" },
    { role: "Registered Service Manager", stage: "Final Approval (if high-value)", type: "approver" },
    { role: "Approved", stage: "Work Instructed", type: "end" },
  ],
  reg_32: [
    { role: "Compliance Manager / RSM / TM", stage: "Drafted", type: "submitter" },
    { role: "Compliance Manager / RSM", stage: "Review", type: "approver" },
    { role: "Registered Service Manager", stage: "Sign-Off", type: "approver" },
    { role: "Regional Manager", stage: "Final Approval", type: "approver" },
  ],
  new_staff_entry: [
    { role: "HR Officer / Admin / TM", stage: "Submitted", type: "submitter" },
    { role: "HR Manager", stage: "HR Review", type: "approver" },
    { role: "Compliance Manager", stage: "Compliance Evidence Review", type: "approver" },
    { role: "Registered Service Manager", stage: "Home/Role Activation", type: "approver" },
    { role: "Active Staff", stage: "Onboarded", type: "end" },
  ],
  staff_movement: [
    { role: "Team Manager / HR", stage: "Requested", type: "submitter" },
    { role: "HR Manager", stage: "HR Review", type: "approver" },
    { role: "Registered Service Manager", stage: "Sign-Off", type: "approver" },
    { role: "Confirmed", stage: "Completed", type: "end" },
  ],
  disciplinary: [
    { role: "HR / Team Manager / RSM", stage: "Initiated", type: "submitter" },
    { role: "HR Manager", stage: "HR Review", type: "approver" },
    { role: "RSM / Regional Manager", stage: "Final Decision (Serious Cases)", type: "approver" },
  ],
  _default: [
    { role: "Staff", stage: "Submitted", type: "submitter" },
    { role: "Line Manager", stage: "Manager Review", type: "approver" },
    { role: "Senior Manager", stage: "Sign-Off", type: "approver" },
    { role: "Completed", stage: "Closed", type: "end" },
  ],
};

// Contingency fallbacks per workflow type
export const CONTINGENCY_ROUTES = {
  bill: [
    { primary: "Team Leader / Team Manager", fallback: "Team Manager / Covering Manager" },
    { primary: "Admin Manager", fallback: "Deputy Admin Manager or Admin Equivalent" },
    { primary: "Finance Manager", fallback: "Deputy Finance Manager or Finance Equivalent" },
    { primary: "No delegate / SLA breached", fallback: "Registered Service Manager / Regional Manager" },
  ],
  expense_claim: [
    { primary: "Line Manager", fallback: "Team Manager" },
    { primary: "Finance Manager", fallback: "Deputy Finance Manager" },
    { primary: "SLA breached", fallback: "RSM" },
  ],
  incident_report: [
    { primary: "Team Leader", fallback: "Duty TL / Another TL / Team Manager" },
    { primary: "Team Manager", fallback: "Covering TM / Registered Service Manager" },
    { primary: "Registered Service Manager", fallback: "Deputy RSM / Regional Manager" },
  ],
  risk_assessment: [
    { primary: "Risk Manager", fallback: "Registered Service Manager" },
    { primary: "Registered Service Manager", fallback: "Deputy RSM / Regional Manager" },
  ],
  support_plan: [
    { primary: "Team Leader", fallback: "Duty TL / Team Manager" },
    { primary: "Team Manager", fallback: "Covering TM / RSM" },
    { primary: "RSM", fallback: "Deputy RSM / Regional Manager" },
  ],
  leave_request: [
    { primary: "Line Manager", fallback: "Team Manager" },
    { primary: "HR Manager", fallback: "Deputy HR Manager / HR Equivalent" },
    { primary: "Urgent, no HR equivalent", fallback: "Registered Service Manager" },
  ],
  staff_onboarding: [
    { primary: "HR Manager", fallback: "Deputy HR Manager" },
    { primary: "Compliance Manager", fallback: "RSM" },
    { primary: "RSM", fallback: "Regional Manager" },
  ],
  reg_32: [
    { primary: "Compliance Manager", fallback: "RSM / Authorised Compliance Equivalent" },
    { primary: "RSM", fallback: "Regional Manager" },
    { primary: "Regulatory deadline close", fallback: "Regional Manager (immediate)" },
  ],
  new_staff_entry: [
    { primary: "HR Manager", fallback: "Deputy HR Manager" },
    { primary: "Compliance Manager", fallback: "RSM" },
    { primary: "RSM", fallback: "Regional Manager" },
  ],
  staff_movement: [
    { primary: "HR Manager", fallback: "Deputy HR Manager" },
    { primary: "RSM", fallback: "Regional Manager" },
  ],
  maintenance_quote: [
    { primary: "Admin Manager", fallback: "Deputy Admin Manager / Admin Equivalent" },
    { primary: "Finance Manager", fallback: "Deputy Finance Manager" },
    { primary: "SLA breached", fallback: "RSM" },
  ],
  _default: [
    { primary: "Primary Approver", fallback: "Equivalent Role / Deputy" },
    { primary: "SLA breached", fallback: "Registered Service Manager" },
    { primary: "All unavailable", fallback: "Regional Manager" },
  ],
};

// Governance badges per workflow type
export const GOVERNANCE_BADGES = {
  bill: ["No Self Approval", "Delegation Enabled", "Audit Trail Enabled", "SLA Monitored", "Maker-Checker Enforced"],
  expense_claim: ["No Self Approval", "Delegation Enabled", "Audit Trail Enabled", "SLA Monitored"],
  incident_report: ["No Self Approval", "Care Narrative Locked", "Audit Trail Enabled", "SLA Monitored"],
  missing_episode: ["No Self Approval", "Care Narrative Locked", "Audit Trail Enabled", "SLA Monitored"],
  safeguarding: ["No Self Approval", "Care Narrative Locked", "Audit Trail Enabled", "SLA Monitored", "External Notification Required"],
  support_plan: ["No Self Approval", "Version Controlled", "Care Narrative Locked", "Audit Trail Enabled"],
  risk_assessment: ["Version Controlled", "Risk Manager → RSM", "Audit Trail Enabled", "No Risk Officer"],
  leave_request: ["No Self Approval", "Delegation Enabled", "Audit Trail Enabled"],
  staff_onboarding: ["No Self Approval", "Audit Trail Enabled", "SLA Monitored"],
  maintenance_quote: ["No Self Approval", "Delegation Enabled", "Audit Trail Enabled", "SLA Monitored"],
  reg_32: ["No Self Approval", "Audit Trail Enabled", "SLA Monitored", "Version Controlled"],
  disciplinary: ["No Self Approval", "Audit Trail Enabled", "Emergency Override Requires Reason"],
  _default: ["No Self Approval", "Audit Trail Enabled"],
};

// Badge colours
const BADGE_COLORS = {
  "No Self Approval": "bg-red-100 text-red-700",
  "Delegation Enabled": "bg-blue-100 text-blue-700",
  "Audit Trail Enabled": "bg-green-100 text-green-700",
  "SLA Monitored": "bg-amber-100 text-amber-700",
  "Maker-Checker Enforced": "bg-purple-100 text-purple-700",
  "Care Narrative Locked": "bg-orange-100 text-orange-700",
  "Version Controlled": "bg-indigo-100 text-indigo-700",
  "Risk Manager → RSM": "bg-red-100 text-red-700",
  "No Risk Officer": "bg-slate-100 text-slate-700",
  "External Notification Required": "bg-red-100 text-red-700",
  "Emergency Override Requires Reason": "bg-orange-100 text-orange-700",
};

export function getGovernanceBadgeColor(badge) {
  return BADGE_COLORS[badge] || "bg-slate-100 text-slate-700";
}

// Priority display
const PRIORITY_CONFIG = {
  critical: { label: "Critical", bg: "bg-red-100", text: "text-red-700" },
  urgent: { label: "Urgent", bg: "bg-red-50", text: "text-red-600" },
  high: { label: "High", bg: "bg-orange-100", text: "text-orange-700" },
  important: { label: "Important", bg: "bg-amber-100", text: "text-amber-700" },
  routine: { label: "Routine", bg: "bg-slate-100", text: "text-slate-600" },
};

export function getPriorityBadge(priority) {
  if (!priority) return null;
  const c = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.routine;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
  );
}

const STATUS_CONFIG = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-600" },
  submitted: { label: "Submitted", bg: "bg-amber-100", text: "text-amber-700" },
  under_review: { label: "Under Review", bg: "bg-blue-100", text: "text-blue-700" },
  changes_requested: { label: "Changes Requested", bg: "bg-orange-100", text: "text-orange-700" },
  approved: { label: "Approved", bg: "bg-green-100", text: "text-green-700" },
  rejected: { label: "Rejected", bg: "bg-red-100", text: "text-red-700" },
  escalated: { label: "Escalated", bg: "bg-purple-100", text: "text-purple-700" },
  closed: { label: "Closed", bg: "bg-slate-100", text: "text-slate-600" },
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700" },
};

export function getStatusBadge(status) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
  );
}

// Action wording by category
export function getActionLabels(workflowType) {
  const meta = WORKFLOW_META[workflowType] || WORKFLOW_META._default;
  if (meta.category === "Care") return { approve: "Sign Off", reject: "Return", escalate: "Escalate", startReview: "Triage", close: "Close" };
  if (meta.category === "Finance") return { approve: "Approve", reject: "Reject", escalate: "Escalate", startReview: "Review", close: "Post" };
  if (meta.category === "Compliance") return { approve: "Sign Off Report", reject: "Request Changes", escalate: "Escalate", startReview: "Verify Evidence", close: "Close Action" };
  return { approve: "Approve", reject: "Reject", escalate: "Escalate", startReview: "Start Review", close: "Close" };
}