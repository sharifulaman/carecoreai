import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get homes for staff assignment
    const homes = await base44.asServiceRole.entities.Home.list();
    const homeIds = homes.filter(h => h.type === '24_hours' || h.type === 'care').map(h => h.id);

    const staffProfiles = [];
    const firstNames = ['James', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'John', 'Anna', 'Robert', 'Sophie', 'Thomas', 'Charlotte', 'Peter', 'Olivia', 'Paul', 'Grace', 'Mark', 'Ella', 'Daniel', 'Ava'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin'];

    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@careorg.uk`;
      
      staffProfiles.push({
        org_id: 'default_org',
        user_id: `user_${Date.now()}_${i}`,
        full_name: `${firstName} ${lastName}`,
        email: email,
        employee_id: `EMP-${String(1000 + i).padStart(4, '0')}`,
        role: 'support_worker',
        home_ids: homeIds.slice(0, Math.max(1, Math.floor(Math.random() * 3))),
        phone: `07${String(Math.floor(Math.random() * 900000000) + 100000000).slice(0, 9)}`,
        start_date: new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        status: 'active',
        notes: `Support worker - Shift worker`
      });
    }

    if (staffProfiles.length > 0) {
      const created = await base44.asServiceRole.entities.StaffProfile.bulkCreate(staffProfiles);
      
      // Create availability profiles for each worker
      const avProfiles = created.map(s => ({
        org_id: 'default_org',
        staff_id: s.id,
        contracted_hours_per_week: Math.random() > 0.5 ? 40 : 30,
        employment_type: ['full_time', 'part_time', 'bank'][Math.floor(Math.random() * 3)],
        max_hours_per_day: 12,
        max_consecutive_days: 5,
        min_rest_hours_between_shifts: 11,
        preferred_shift_types: ['morning', 'afternoon'],
        sleep_in_qualified: Math.random() > 0.7,
        waking_night_qualified: Math.random() > 0.6,
        first_aid_certified: true,
        first_aid_expiry: new Date(2025, 11, 31).toISOString().split('T')[0],
        safeguarding_trained: true,
        safeguarding_level: 'level_2',
        safeguarding_expiry: new Date(2026, 11, 31).toISOString().split('T')[0],
      }));
      
      if (avProfiles.length > 0) {
        await base44.asServiceRole.entities.StaffAvailabilityProfile.bulkCreate(avProfiles);
      }
      
      // Create weekly availability for each worker
      const weeklyAvail = [];
      const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const s of created) {
        for (const day of DAYS) {
          weeklyAvail.push({
            org_id: 'default_org',
            staff_id: s.id,
            day_of_week: day,
            is_available: Math.random() > 0.15, // 85% available
            available_from: '07:00',
            available_until: '23:00',
            shift_type_pref: 'any'
          });
        }
      }
      
      if (weeklyAvail.length > 0) {
        await base44.asServiceRole.entities.StaffWeeklyAvailability.bulkCreate(weeklyAvail);
      }
    }
    
    return Response.json({ 
      success: true, 
      workersCreated: staffProfiles.length,
      message: `Created ${staffProfiles.length} support workers with availability profiles`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});