import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { latitude, longitude, accuracy, heading, speed, staff_id, staff_name, staff_role, org_id } = body;

    if (!latitude || !longitude) {
      return Response.json({ error: 'latitude and longitude are required' }, { status: 400 });
    }

    // Check consent exists
    const consents = await base44.asServiceRole.entities.LocationTrackingConsent.filter({
      staff_id: staff_id,
      consented: true,
    });

    if (!consents || consents.length === 0) {
      return Response.json({ error: 'No tracking consent found for this staff member' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Upsert: find existing location record for this staff member and update, or create new
    const existing = await base44.asServiceRole.entities.EmployeeLocation.filter({ staff_id });

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.EmployeeLocation.update(existing[0].id, {
        latitude,
        longitude,
        accuracy: accuracy || null,
        heading: heading || null,
        speed: speed || null,
        timestamp: now,
        is_active: true,
        staff_name: staff_name || existing[0].staff_name,
        staff_role: staff_role || existing[0].staff_role,
      });
      return Response.json({ success: true, action: 'updated' });
    } else {
      await base44.asServiceRole.entities.EmployeeLocation.create({
        org_id,
        staff_id,
        staff_name: staff_name || '',
        staff_role: staff_role || '',
        latitude,
        longitude,
        accuracy: accuracy || null,
        heading: heading || null,
        speed: speed || null,
        timestamp: now,
        is_active: true,
        tracking_consent: true,
        consent_given_at: consents[0]?.consented_at || now,
      });
      return Response.json({ success: true, action: 'created' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});