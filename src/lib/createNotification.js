/**
 * Reusable helper to create a Notification record.
 * Fails silently — never crashes the calling action.
 *
 * The Notification entity uses:
 *   user_id  = User.id of the recipient (stored on StaffProfile as user_id, or we use staff_id as fallback key)
 *   message  = the notification body text
 *   type     = one of the entity enum values mapped below
 *   link_url = where to navigate on click
 *   org_id   = required
 *
 * We store extra context by prefixing the message with "[TITLE] body"
 * and use related_module for the display title.
 */
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";

// Map our semantic types to entity enum values
const TYPE_MAP = {
  dbs_expiry: "certification",
  training_expiry: "certification",
  flagged_log: "alert",
  leave_request: "holiday",
  leave_response: "holiday",
  visit_report: "general",
};

/**
 * @param {object} opts
 * @param {string} opts.recipient_user_id  - User.id of the recipient (from StaffProfile.user_id)
 * @param {string} opts.title              - Short title (stored in related_module)
 * @param {string} opts.body               - Full message text
 * @param {string} opts.type               - Semantic type key (dbs_expiry, training_expiry, etc.)
 * @param {string} [opts.link]             - URL to navigate to
 * @param {string} [opts.priority]         - normal | high | critical
 */
export async function createNotification({ recipient_user_id, recipient_staff_id, org_id, title, body, type, link, priority = "normal" }) {
  if (!recipient_user_id) return;
  try {
    // Dedup: don't create the same notification within 60 seconds
    const recent = await secureGateway.filter("Notification", { user_id: recipient_user_id }, "-created_date", 5);
    const cutoff = new Date(Date.now() - 60 * 1000);
    const isDuplicate = recent.some(n =>
      n.related_module === title &&
      n.message === body &&
      new Date(n.created_date) > cutoff
    );
    if (isDuplicate) return;

    await secureGateway.create("Notification", {
      org_id: org_id || ORG_ID,
      user_id: recipient_user_id,
      recipient_staff_id: recipient_staff_id || null,
      message: body,
      related_module: title,
      type: TYPE_MAP[type] || "general",
      priority,
      link_url: link || null,
      read: false,
      acknowledged: false,
    });
  } catch (e) {
    // Fail silently — notifications must never crash the main action
    console.warn("createNotification failed silently:", e?.message);
  }
}