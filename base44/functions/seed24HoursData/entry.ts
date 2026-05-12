import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const orgId = 'default_org';
    const today = new Date().toISOString().split('T')[0];

    // Get 24-hour homes
    const homes = await base44.entities.Home.filter({ type: '24_hours' });
    if (homes.length === 0) {
      return Response.json({ error: 'No 24-hour homes found' }, { status: 400 });
    }

    // Get staff
    const staff = await base44.entities.StaffProfile.filter({}, '-created_date', 50);
    if (staff.length === 0) {
      return Response.json({ error: 'No staff found' }, { status: 400 });
    }

    // Get residents
    const residents = await base44.entities.Resident.filter({ status: 'active' }, '-created_date', 100);

    const counts = { shifts: 0, handovers: 0, homeChecks: 0, sleepChecks: 0, visitorLogs: 0, significantEvents: 0 };

    // Seed Shifts for today (morning, afternoon, night)
    const shifts_to_seed = ['morning', 'afternoon', 'night'];
    const shiftTimes = {
      morning: { start: '06:00', end: '14:00' },
      afternoon: { start: '14:00', end: '22:00' },
      night: { start: '22:00', end: '06:00' },
    };

    for (const home of homes) {
      for (const shiftType of shifts_to_seed) {
        const times = shiftTimes[shiftType];
        try {
          await base44.entities.Shift.create({
            org_id: orgId,
            home_id: home.id,
            shift_type: shiftType,
            date: today,
            time_start: times.start,
            time_end: times.end,
            assigned_staff: staff.slice(0, 2).map(s => s.id),
            staff_required: 2,
            status: 'published',
          });
          counts.shifts++;
        } catch (e) {
          // Shift may exist
        }
      }
    }

    // Seed ShiftHandovers for today
    for (const home of homes) {
      for (const shiftType of shifts_to_seed) {
        try {
          await base44.entities.ShiftHandover.create({
            org_id: orgId,
            home_id: home.id,
            home_name: home.name,
            date: today,
            shift: shiftType,
            outgoing_staff_id: staff[0]?.id,
            outgoing_staff_name: staff[0]?.full_name,
            incoming_staff_id: staff[1]?.id,
            incoming_staff_name: staff[1]?.full_name,
            resident_statuses: residents.slice(0, 3).map(r => ({
              resident_id: r.id,
              resident_name: r.display_name,
              location: 'in_home',
              mood: 'settled',
              any_concerns: false,
            })),
            incidents: [],
            property_secure: true,
            cleaning_completed: true,
            status: 'submitted',
            incoming_acknowledged: true,
          });
          counts.handovers++;
        } catch (e) {
          // Handover may exist
        }
      }
    }

    // Seed HomeChecks for today
    for (const home of homes) {
      try {
        await base44.entities.HomeCheck.create({
          org_id: orgId,
          home_id: home.id,
          home_name: home.name,
          check_date: today,
          check_type: 'daily',
          checked_by_id: staff[0]?.id,
          checked_by_name: staff[0]?.full_name,
          items: [
            { id: '1', item_name: 'Fire exits clear', status: 'pass' },
            { id: '2', item_name: 'Utilities functioning', status: 'pass' },
            { id: '3', item_name: 'Cleanliness standards met', status: 'pass' },
            { id: '4', item_name: 'H&S hazards', status: 'pass' },
            { id: '5', item_name: 'Security alarm tested', status: 'pass' },
          ],
          overall_result: 'pass',
          any_fails: false,
          maintenance_issues: [],
          signed_off_at: new Date().toISOString(),
        });
        counts.homeChecks++;
      } catch (e) {
        // Check may exist
      }
    }

    // Seed SleepChecks for tonight
    for (const home of homes) {
      try {
        await base44.entities.SleepCheckLog.create({
          org_id: orgId,
          home_id: home.id,
          home_name: home.name,
          date: today,
          shift: 'night',
          staff_on_duty_id: staff[0]?.id,
          staff_on_duty_name: staff[0]?.full_name,
          checks: [
            {
              check_time: '23:00',
              checked_by_id: staff[0]?.id,
              checked_by_name: staff[0]?.full_name,
              resident_checks: residents.slice(0, 3).map(r => ({
                resident_id: r.id,
                resident_name: r.display_name,
                status: 'in_room_sleeping',
              })),
            },
          ],
          all_residents_accounted: true,
          any_concerns: false,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        counts.sleepChecks++;
      } catch (e) {
        // Sleep check may exist
      }
    }

    // Seed VisitorLogs for today
    for (const home of homes) {
      try {
        await base44.entities.VisitorLog.create({
          org_id: orgId,
          home_id: home.id,
          home_name: home.name,
          recorded_by_id: staff[0]?.id,
          recorded_by_name: staff[0]?.full_name,
          visit_date: today,
          arrival_time: '14:00',
          departure_time: '15:30',
          visitor_name: 'Social Worker',
          visitor_organisation: 'Local Authority',
          visitor_role: 'social_worker',
          visitor_relationship: 'social_worker',
          purpose_of_visit: 'Routine welfare check',
          resident_visited_id: residents[0]?.id,
          resident_visited_name: residents[0]?.display_name,
          staff_who_authorised: staff[0]?.full_name,
          dbs_checked: true,
          signed_in: true,
          any_concerns: false,
        });
        counts.visitorLogs++;
      } catch (e) {
        // Visitor log may exist
      }
    }

    // Seed SignificantEvents
    for (const home of homes) {
      try {
        await base44.entities.SignificantEvent.create({
          org_id: orgId,
          home_id: home.id,
          home_name: home.name,
          event_datetime: new Date().toISOString(),
          event_type: 'incident',
          description: 'Routine daily operations - all well',
          reported_by_id: staff[0]?.id,
          reported_by_name: staff[0]?.full_name,
          immediate_action_taken: 'N/A - routine',
          status: 'reported',
        });
        counts.significantEvents++;
      } catch (e) {
        // Event may exist
      }
    }

    return Response.json({
      message: '24 Hours data seeded successfully',
      counts,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});