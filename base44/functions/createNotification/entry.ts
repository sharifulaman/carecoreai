/**
 * createNotification — reusable backend helper.
 * Called from: handover submit, holiday approve, rota publish.
 * 
 * Payload: { org_id, user_id, type, message, link_url, priority? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both authenticated user calls and service-role internal calls
    const body = await req.json();
    const { org_id, user_id, type, message, link_url, priority, related_module, related_record_id } = body;

    if (!org_id || !user_id || !message) {
      return Response.json({ error: "org_id, user_id, and message are required" }, { status: 400 });
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      org_id,
      user_id,
      type: type || "general",
      message,
      link_url: link_url || null,
      priority: priority || "normal",
      related_module: related_module || null,
      related_record_id: related_record_id || null,
      read: false,
      acknowledged: false,
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});