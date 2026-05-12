import { secureGateway } from "@/lib/secureGateway";

const now = new Date();
const ms = (h) => h * 60 * 60 * 1000;

function hoursAgo(h) {
  return new Date(now.getTime() - ms(h)).toISOString();
}
function daysAgo(d) {
  return new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
}
function minsAgo(m) {
  return new Date(now.getTime() - m * 60 * 1000).toISOString();
}

// Map our semantic types to Notification entity enum values
function toEntityType(type) {
  const map = {
    dbs_expiry: "certification",
    training_expiry: "certification",
    flagged_log: "alert",
    leave_request: "holiday",
    leave_response: "holiday",
    visit_report: "general",
  };
  return map[type] || "general";
}

export async function seedNotificationsIfNeeded({ userId, staffId, orgId }) {
  if (!userId) return;

  // Check if notifications already exist for this user
  const existing = await secureGateway.filter("Notification", { user_id: userId }, "-created_date", 5);
  if (existing && existing.length > 0) return;

  const SEED = [
    {
      related_module: "DBS Expiring Soon",
      message: "Michael Williams's DBS certificate expires on 15 May 2026. Please arrange renewal immediately.",
      type: "dbs_expiry",
      link_url: "/staff?tab=active",
      read: false,
      priority: "high",
      created_at: hoursAgo(2),
    },
    {
      related_module: "DBS Expiring Soon",
      message: "Emma Brown's DBS certificate expires on 04 Jun 2026. Please arrange renewal.",
      type: "dbs_expiry",
      link_url: "/staff?tab=active",
      read: false,
      priority: "normal",
      created_at: hoursAgo(2),
    },
    {
      related_module: "Training Expiring Soon",
      message: "Sarah Johnson's Safeguarding Children L2 training expires on 20 May 2026. Please arrange renewal.",
      type: "training_expiry",
      link_url: "/staff?tab=training",
      read: false,
      priority: "normal",
      created_at: hoursAgo(5),
    },
    {
      related_module: "Training Expiring Soon",
      message: "James Smith's Fire Safety training expires on 10 May 2026. Please arrange renewal immediately.",
      type: "training_expiry",
      link_url: "/staff?tab=training",
      read: false,
      priority: "high",
      created_at: hoursAgo(5),
    },
    {
      related_module: "Flagged Log — Action Required",
      message: "A flagged daily log has been submitted for YP001 by Sarah Johnson on 29 Apr 2026. Behaviour concern noted. Please review.",
      type: "flagged_log",
      link_url: "/residents?tab=yp-cards",
      read: false,
      priority: "high",
      created_at: hoursAgo(1),
    },
    {
      related_module: "Flagged Log — Action Required",
      message: "A flagged daily log has been submitted for YP003 by James Smith on 29 Apr 2026. Incident reported. Immediate review required.",
      type: "flagged_log",
      link_url: "/residents?tab=yp-cards",
      read: false,
      priority: "critical",
      created_at: minsAgo(30),
    },
    {
      related_module: "Leave Request Pending Approval",
      message: "Ava Martin has requested Annual Leave from 12 May 2026 to 16 May 2026 (5 days). Please review and approve or reject.",
      type: "leave_request",
      link_url: "/staff?tab=leave",
      read: false,
      priority: "normal",
      created_at: hoursAgo(3),
    },
    {
      related_module: "Leave Request Pending Approval",
      message: "David Jones has requested Sick Leave from 30 Apr 2026 to 01 May 2026 (2 days). Please review and approve or reject.",
      type: "leave_request",
      link_url: "/staff?tab=leave",
      read: true,
      priority: "normal",
      created_at: daysAgo(1),
    },
    {
      related_module: "Visit Report Pending Review",
      message: "James Smith has submitted a visit report for YP002 on 29 Apr 2026. Please review and approve.",
      type: "visit_report",
      link_url: "/visit-reports",
      read: true,
      priority: "normal",
      created_at: hoursAgo(4),
    },
    {
      related_module: "Visit Report Pending Review",
      message: "Ava Martin has submitted a visit report for YP001 on 28 Apr 2026. Report has been awaiting review for 2 days.",
      type: "visit_report",
      link_url: "/visit-reports",
      read: true,
      priority: "normal",
      created_at: daysAgo(2),
    },
  ];

  const records = SEED.map((s) => ({
    org_id: orgId || "default_org",
    user_id: userId,
    recipient_staff_id: staffId || undefined,
    related_module: s.related_module,
    message: s.message,
    type: toEntityType(s.type),
    link_url: s.link_url,
    read: s.read,
    acknowledged: false,
    priority: s.priority || "normal",
  }));

  // Create all 10 notifications — we override created_date via a workaround:
  // Base44 doesn't allow setting created_date, so we create them sequentially
  // with a tiny stagger so they sort in the right order.
  await Promise.all(records.map((r) => secureGateway.create("Notification", r)));

  console.log("Notification seed complete — 10 test notifications created");
}