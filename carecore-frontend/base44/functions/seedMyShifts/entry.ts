import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff profile for current user
    const staffProfiles = await base44.entities.StaffProfile.filter({ user_id: user.id });
    if (staffProfiles.length === 0) {
      return Response.json({ error: 'No staff profile found for user' }, { status: 400 });
    }

    const staffProfile = staffProfiles[0];

    // Get homes assigned to this staff member
    const homes = await base44.entities.Home.filter({ status: 'active' });
    const assignedHomes = homes.slice(0, 2); // Use first 2 homes

    if (assignedHomes.length === 0) {
      return Response.json({ error: 'No homes found' }, { status: 400 });
    }

    // Create shifts for next 14 days
    const today = new Date();
    const shifts = [];

    for (let i = 0; i < 7; i++) {
      const shiftDate = new Date(today);
      shiftDate.setDate(shiftDate.getDate() + i);

      // Skip Sundays
      if (shiftDate.getDay() === 0) continue;

      const startTime = new Date(shiftDate);
      startTime.setHours(9, 0, 0);

      const endTime = new Date(shiftDate);
      endTime.setHours(17, 0, 0);

      shifts.push({
        org_id: user.org_id || 'default',
        staff_id: staffProfile.id,
        worker_id: user.email,
        home_id: assignedHomes[i % assignedHomes.length].id,
        start_datetime: startTime.toISOString(),
        end_datetime: endTime.toISOString(),
        shift_type: 'day',
        status: 'confirmed',
        hours: 8,
      });
    }

    // Bulk create shifts
    const created = await base44.entities.Shift.bulkCreate(shifts);

    return Response.json({
      message: `Created ${created.length} shifts for ${user.full_name}`,
      shifts: created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});