import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Reg 27 Workflow Handler
 * Actions: 
 *   - tl_approve: TL approves incident → pending_tm + notify TM
 *   - tm_approve: TM approves → pending_rsm + notify RSM (critical)
 *   - rsm_notify: RSM marks as notified to Ofsted
 *   - check_overdue: scheduled check for 20h warning + 24h overdue flag
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, incident_id, notification_id } = body;

    // ── check_overdue: called by scheduler, uses service role ─────────────────
    if (action === 'check_overdue') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      return await handleCheckOverdue(base44);
    }

    // ── tl_approve ────────────────────────────────────────────────────────────
    if (action === 'tl_approve') {
      const { tl_review_notes, tl_staff_profile } = body;
      const incident = (await base44.asServiceRole.entities.Incident.filter({ id: incident_id }))?.[0];
      if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

      // Update incident
      await base44.asServiceRole.entities.Incident.update(incident_id, {
        manager_review_status: 'pending_tm',
        tl_review_notes: tl_review_notes || '',
        tl_reviewed_by_id: tl_staff_profile?.id || '',
        tl_reviewed_by_name: tl_staff_profile?.full_name || '',
        tl_reviewed_at: new Date().toISOString(),
      });

      // Update linked OfstedNotification if exists
      if (incident.reg27_notification_id) {
        await base44.asServiceRole.entities.OfstedNotification.update(incident.reg27_notification_id, {
          status: 'pending_tm',
          approved_by_tl_id: tl_staff_profile?.id || '',
          approved_by_tl_name: tl_staff_profile?.full_name || '',
          tl_review_notes: tl_review_notes || '',
        });
      }

      // Find TMs for this home and notify
      const teamManagers = await base44.asServiceRole.entities.StaffProfile.filter({
        role: 'team_manager',
        org_id: incident.org_id,
      });
      const homeManagers = teamManagers.filter(tm =>
        (tm.home_ids || []).includes(incident.home_id)
      );

      for (const tm of homeManagers) {
        await base44.asServiceRole.entities.Notification.create({
          org_id: incident.org_id,
          recipient_id: tm.id,
          recipient_email: tm.email || '',
          type: 'workflow',
          priority: 'high',
          title: 'Reg 27 Incident: Your Approval Required',
          message: `Reg 27 incident reviewed by TL ${tl_staff_profile?.full_name || 'Team Leader'}. Your approval is required before RSM notification.`,
          related_entity: 'Incident',
          related_entity_id: incident_id,
          status: 'unread',
          created_at: new Date().toISOString(),
        });
      }

      return Response.json({ success: true, new_status: 'pending_tm' });
    }

    // ── tm_approve ────────────────────────────────────────────────────────────
    if (action === 'tm_approve') {
      const { tm_review_notes, tm_staff_profile } = body;
      const incident = (await base44.asServiceRole.entities.Incident.filter({ id: incident_id }))?.[0];
      if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

      await base44.asServiceRole.entities.Incident.update(incident_id, {
        manager_review_status: 'pending_rsm',
        tm_review_notes: tm_review_notes || '',
        tm_reviewed_by_id: tm_staff_profile?.id || '',
        tm_reviewed_by_name: tm_staff_profile?.full_name || '',
        tm_reviewed_at: new Date().toISOString(),
      });

      // Update notification status
      if (incident.reg27_notification_id) {
        await base44.asServiceRole.entities.OfstedNotification.update(incident.reg27_notification_id, {
          status: 'pending_rsm',
          approved_by_tm_id: tm_staff_profile?.id || '',
          approved_by_tm_name: tm_staff_profile?.full_name || '',
          tm_review_notes: tm_review_notes || '',
        });
      }

      // Calculate deadline and hours remaining
      const incidentDatetime = new Date(incident.incident_datetime);
      const deadlineDatetime = new Date(incidentDatetime.getTime() + 24 * 3600 * 1000);
      const hoursRemaining = Math.max(0, Math.round((deadlineDatetime - Date.now()) / 3600000));

      // Notify all RSMs and admins
      const rsms = await base44.asServiceRole.entities.StaffProfile.filter({ org_id: incident.org_id });
      const rsmList = rsms.filter(s => ['rsm', 'admin'].includes(s.role));

      const home = (await base44.asServiceRole.entities.Home.filter({ id: incident.home_id }))?.[0];
      const residentInitials = incident.resident_name ? incident.resident_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'YP';

      for (const rsm of rsmList) {
        await base44.asServiceRole.entities.Notification.create({
          org_id: incident.org_id,
          recipient_id: rsm.id,
          recipient_email: rsm.email || '',
          type: 'reg27_critical',
          priority: 'critical',
          title: `REG 27 REQUIRED: Action needed within ${hoursRemaining} hours`,
          message: `REG 27 REQUIRED: ${incident.incident_type?.replace(/_/g,' ')} involving ${residentInitials} at ${home?.name || incident.home_name}. You have ${hoursRemaining} hours to notify Ofsted. Deadline: ${deadlineDatetime.toLocaleString('en-GB')}.`,
          related_entity: 'Incident',
          related_entity_id: incident_id,
          deadline_datetime: deadlineDatetime.toISOString(),
          status: 'unread',
          created_at: new Date().toISOString(),
        });
      }

      // Update notification deadline
      if (incident.reg27_notification_id) {
        await base44.asServiceRole.entities.OfstedNotification.update(incident.reg27_notification_id, {
          deadline_datetime: deadlineDatetime.toISOString(),
        });
      }

      return Response.json({ success: true, new_status: 'pending_rsm', deadline: deadlineDatetime.toISOString() });
    }

    // ── rsm_notify ────────────────────────────────────────────────────────────
    if (action === 'rsm_notify') {
      const { notification_method, notified_datetime, ofsted_reference_number, ofsted_screenshot_url, rsm_notes, rsm_staff_profile } = body;
      if (!notification_method || !notified_datetime) {
        return Response.json({ error: 'notification_method and notified_datetime are required' }, { status: 400 });
      }

      const notification = (await base44.asServiceRole.entities.OfstedNotification.filter({ id: notification_id }))?.[0];
      if (!notification) return Response.json({ error: 'Notification not found' }, { status: 404 });

      const eventDate = new Date(notification.event_date);
      const notifyDate = new Date(notified_datetime);
      const hoursToNotify = Math.round((notifyDate - eventDate) / 3600000);

      await base44.asServiceRole.entities.OfstedNotification.update(notification_id, {
        status: 'notified',
        notification_method,
        notified_datetime: notifyDate.toISOString(),
        ofsted_reference_number: ofsted_reference_number || null,
        ofsted_screenshot_url: ofsted_screenshot_url || null,
        hours_to_notify: hoursToNotify,
        rsm_notified_by_id: rsm_staff_profile?.id || '',
        rsm_notified_by_name: rsm_staff_profile?.full_name || '',
        rsm_notes: rsm_notes || '',
      });

      // Update linked incident
      if (notification.incident_id) {
        await base44.asServiceRole.entities.Incident.update(notification.incident_id, {
          manager_review_status: 'reviewed',
          manager_review_date: new Date().toISOString(),
          manager_review_by_id: rsm_staff_profile?.id || '',
        });
      }

      // Audit trail
      await base44.asServiceRole.entities.AuditTrail.create({
        org_id: notification.org_id,
        entity_name: 'OfstedNotification',
        entity_id: notification_id,
        action: 'reg27_notified',
        changed_by: rsm_staff_profile?.id || '',
        changed_by_name: rsm_staff_profile?.full_name || 'RSM',
        description: `Reg 27 Ofsted notification completed by ${rsm_staff_profile?.full_name || 'RSM'}. Method: ${notification_method}. Hours to notify: ${hoursToNotify}h.`,
        new_values: { status: 'notified', hours_to_notify: hoursToNotify, notification_method },
        org_id: notification.org_id,
        created_at: new Date().toISOString(),
      });

      // Notify TM and TL confirming Ofsted notified
      const toNotify = [];
      if (notification.approved_by_tm_id) {
        const tm = (await base44.asServiceRole.entities.StaffProfile.filter({ id: notification.approved_by_tm_id }))?.[0];
        if (tm) toNotify.push(tm);
      }
      if (notification.approved_by_tl_id) {
        const tl = (await base44.asServiceRole.entities.StaffProfile.filter({ id: notification.approved_by_tl_id }))?.[0];
        if (tl) toNotify.push(tl);
      }

      for (const recipient of toNotify) {
        await base44.asServiceRole.entities.Notification.create({
          org_id: notification.org_id,
          recipient_id: recipient.id,
          recipient_email: recipient.email || '',
          type: 'workflow',
          priority: 'medium',
          title: 'Reg 27: Ofsted Notified',
          message: `Ofsted has been notified (Reg 27) for the incident at ${notification.home_name}. Method: ${notification_method}. Reference: ${ofsted_reference_number || 'Pending'}. Completed by: ${rsm_staff_profile?.full_name || 'RSM'}.`,
          related_entity: 'OfstedNotification',
          related_entity_id: notification_id,
          status: 'unread',
          created_at: new Date().toISOString(),
        });
      }

      return Response.json({ success: true, hours_to_notify: hoursToNotify });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleCheckOverdue(base44) {
  const now = Date.now();
  const allPending = await base44.asServiceRole.entities.OfstedNotification.filter({
    is_reg27: true,
  });

  const toCheck = allPending.filter(n => ['pending_rsm', 'pending'].includes(n.status) && !n.is_deleted);
  let warned = 0, overdued = 0;

  for (const n of toCheck) {
    if (!n.event_date) continue;
    const eventTime = new Date(n.event_date).getTime();
    const hoursElapsed = (now - eventTime) / 3600000;

    // 20h warning (4h remaining) — send once
    if (hoursElapsed >= 20 && !n.warning_20h_sent) {
      const hoursLeft = Math.max(0, 24 - hoursElapsed).toFixed(1);
      const rsms = await base44.asServiceRole.entities.StaffProfile.filter({ org_id: n.org_id });
      const rsmList = rsms.filter(s => ['rsm', 'admin'].includes(s.role));
      for (const rsm of rsmList) {
        await base44.asServiceRole.entities.Notification.create({
          org_id: n.org_id,
          recipient_id: rsm.id,
          recipient_email: rsm.email || '',
          type: 'reg27_critical',
          priority: 'critical',
          title: `URGENT: ${hoursLeft} hours remaining to notify Ofsted (Reg 27)`,
          message: `URGENT: You have approximately ${hoursLeft} hours remaining to notify Ofsted for the Reg 27 incident at ${n.home_name}. Deadline: ${new Date(eventTime + 24 * 3600000).toLocaleString('en-GB')}.`,
          related_entity: 'OfstedNotification',
          related_entity_id: n.id,
          status: 'unread',
          created_at: new Date().toISOString(),
        });
      }
      await base44.asServiceRole.entities.OfstedNotification.update(n.id, { warning_20h_sent: true });
      warned++;
    }

    // 24h overdue
    if (hoursElapsed >= 24) {
      await base44.asServiceRole.entities.OfstedNotification.update(n.id, { status: 'overdue' });

      // Audit trail
      await base44.asServiceRole.entities.AuditTrail.create({
        org_id: n.org_id,
        entity_name: 'OfstedNotification',
        entity_id: n.id,
        action: 'reg27_overdue',
        description: `REG 27 BREACH: Ofsted notification not completed within 24 hours for incident at ${n.home_name}. Event: ${new Date(n.event_date).toLocaleString('en-GB')}.`,
        changed_by: 'system',
        changed_by_name: 'System',
        created_at: new Date().toISOString(),
      });

      // Notify all admins
      const allAdmins = await base44.asServiceRole.entities.StaffProfile.filter({ role: 'admin', org_id: n.org_id });
      const allRsms = await base44.asServiceRole.entities.StaffProfile.filter({ role: 'rsm', org_id: n.org_id });
      const toAlert = [...allAdmins, ...allRsms];
      for (const admin of toAlert) {
        await base44.asServiceRole.entities.Notification.create({
          org_id: n.org_id,
          recipient_id: admin.id,
          recipient_email: admin.email || '',
          type: 'reg27_breach',
          priority: 'critical',
          title: 'REG 27 BREACH: Ofsted not notified within 24 hours',
          message: `REGULATORY BREACH: The 24-hour Ofsted notification window has been missed for a Reg 27 incident at ${n.home_name}. Immediate action required.`,
          related_entity: 'OfstedNotification',
          related_entity_id: n.id,
          status: 'unread',
          created_at: new Date().toISOString(),
        });
      }
      overdued++;
    }
  }

  return Response.json({ success: true, warned, overdued, checked: toCheck.length });
}