import { differenceInHours, differenceInMinutes, format } from "date-fns";

/**
 * Incident Intelligence Hub — analytics helpers
 * All functions are pure and operate on live Incident / OfstedNotification records.
 */

// ── Timeline stages ──────────────────────────────────────────────────────────
export const TIMELINE_STAGES = ["Logged", "Submitted", "Reviewed", "Actioned", "Closed"];

/**
 * Derive the current timeline stage index (0-4) for an incident.
 * 0 = Logged, 1 = Submitted, 2 = Reviewed (TL), 3 = Actioned (TM), 4 = Closed
 */
export function getTimelineStage(incident) {
  if (!incident) return 0;
  if (incident.status === "closed") return 4;
  if (incident.tm_reviewed_at || incident.manager_review_status === "reviewed") return 3;
  if (incident.tl_reviewed_at || ["pending_tm", "pending_rsm"].includes(incident.manager_review_status)) return 2;
  if (incident.status === "submitted" || incident.manager_review_status === "submitted" || incident.manager_review_status === "pending_tl") return 1;
  return 0;
}

/**
 * Build timestamp map for each stage (if available).
 */
export function getTimelineTimestamps(incident) {
  return {
    Logged: incident.incident_datetime || incident.created_date,
    Submitted: incident.status === "submitted" || incident.manager_review_status ? incident.submitted_at || incident.created_date : null,
    Reviewed: incident.tl_reviewed_at || null,
    Actioned: incident.tm_reviewed_at || incident.manager_review_date || null,
    Closed: incident.status === "closed" ? incident.manager_review_date || incident.updated_date : null,
  };
}

// ── Resolution time ──────────────────────────────────────────────────────────
/**
 * Returns resolution in hours. If closed, uses closure date. If open, uses now (elapsed).
 */
export function getResolutionHours(incident) {
  if (!incident?.incident_datetime) return 0;
  const start = new Date(incident.incident_datetime);
  const end = incident.status === "closed" && incident.manager_review_date
    ? new Date(incident.manager_review_date)
    : new Date();
  return Math.max(0, differenceInHours(end, start));
}

/**
 * Human-readable resolution string e.g. "2d 14h"
 */
export function formatResolution(hours) {
  if (!hours || hours < 1) return "<1h";
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  if (days > 0) return `${days}d ${h}h`;
  return `${h}h`;
}

/**
 * Mean time to resolution across a list of CLOSED incidents (in hours).
 */
export function getMeanResolutionHours(incidents) {
  const closed = incidents.filter(i => i.status === "closed");
  if (closed.length === 0) return 0;
  const total = closed.reduce((sum, i) => sum + getResolutionHours(i), 0);
  return Math.round(total / closed.length);
}

// ── Ofsted informed status ───────────────────────────────────────────────────
const NOTIFIED_STATUSES = ["notified", "acknowledged", "closed"];
const PENDING_STATUSES = ["pending", "pending_tl", "pending_tm", "pending_rsm", "overdue"];

/**
 * Determine Ofsted notification status for an incident.
 * @param {object} incident
 * @param {array} ofstedNotifications - all OfstedNotification records
 * @returns {"Yes" | "Pending" | "No" | "Not Required" | "Needs Review"}
 */
export function getOfstedStatus(incident, ofstedNotifications = []) {
  const linked = ofstedNotifications.find(n => n.incident_id === incident.id);

  if (linked) {
    if (NOTIFIED_STATUSES.includes(linked.status)) return "Yes";
    if (PENDING_STATUSES.includes(linked.status)) return "Pending";
  }

  // If reg27 trigger is true but no notification record → No
  if (incident.reg27_trigger) return "No";

  // If reviewed and explicitly no trigger → Not Required
  if (incident.manager_review_status === "reviewed" && !incident.reg27_trigger) return "Not Required";

  return "Needs Review";
}

/**
 * Check if an incident review is overdue (open > 72h without review).
 */
export function isReviewOverdue(incident) {
  if (!incident?.incident_datetime) return false;
  if (incident.status === "closed") return false;
  if (incident.manager_review_status === "reviewed") return false;
  const hours = getResolutionHours(incident);
  return hours > 72;
}

/**
 * Get deadline status for Reg 27 notification.
 */
export function getReg27DeadlineStatus(incident, ofstedNotifications = []) {
  if (!incident?.reg27_trigger) return null;
  const linked = ofstedNotifications.find(n => n.incident_id === incident.id);
  if (linked && NOTIFIED_STATUSES.includes(linked.status)) return "notified";

  const eventDate = incident.incident_datetime ? new Date(incident.incident_datetime) : null;
  if (!eventDate) return "unknown";
  const deadline = new Date(eventDate.getTime() + 24 * 3600 * 1000);
  const hoursRemaining = differenceInHours(deadline, new Date());

  if (hoursRemaining <= 0) return "overdue";
  if (hoursRemaining <= 4) return "urgent";
  return "pending";
}

// ── Readiness checks ─────────────────────────────────────────────────────────
/**
 * Returns array of missing readiness items for an incident.
 */
export function getMissingReadinessItems(incident, ofstedNotifications = []) {
  const missing = [];
  if (!incident.manager_review_notes && incident.manager_review_status !== "reviewed") missing.push("Manager sign-off");
  if (!incident.narrative) missing.push("Incident narrative");
  if (!incident.closure_outcome && incident.status === "closed") missing.push("Closure note");
  if (incident.reg27_trigger) {
    const ofstedStatus = getOfstedStatus(incident, ofstedNotifications);
    if (ofstedStatus === "No") missing.push("Ofsted notification decision");
    if (getReg27DeadlineStatus(incident, ofstedNotifications) === "overdue") missing.push("Notification overdue");
  }
  return missing;
}

// ── Severity mapping ─────────────────────────────────────────────────────────
export function getIncidentSeverity(incident) {
  if (incident.reg27_trigger) return "Critical";
  if (incident.injury_occurred || incident.medical_attention_required) return "High";
  if (incident.police_called || incident.restraint_used) return "Medium";
  return "Low";
}

export const SEVERITY_COLORS = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-green-100 text-green-700 border-green-200",
};

export const OFSTED_STATUS_COLORS = {
  Yes: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
  No: "bg-red-100 text-red-700",
  "Not Required": "bg-slate-100 text-slate-500",
  "Needs Review": "bg-orange-100 text-orange-700",
};

export const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-purple-100 text-purple-700",
  closed: "bg-green-100 text-green-700",
};

export const INCIDENT_TYPE_LABELS = {
  restraint: "Restraint",
  police_behaviour_management: "Police — Behaviour Management",
  police_victim_of_crime: "Police — Victim of Crime",
  police_missing: "Police — Missing",
  serious_injury: "Serious Injury",
  safeguarding_concern: "Safeguarding Concern",
  medical_emergency: "Medical Emergency",
  fire_evacuation: "Fire / Evacuation",
  other: "Other",
};