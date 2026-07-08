import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all staff
    const allStaff = await base44.asServiceRole.entities.StaffProfile.list();
    
    // Get existing availability profiles
    const existingProfiles = await base44.asServiceRole.entities.StaffAvailabilityProfile.list();
    const staffWithProfiles = new Set(existingProfiles.map(p => p.staff_id));
    
    // Find staff missing profiles
    const missingProfileStaff = allStaff.filter(s => !staffWithProfiles.has(s.id));
    
    const newProfiles = missingProfileStaff.map(s => ({
      org_id: s.org_id,
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
    
    if (newProfiles.length > 0) {
      await base44.asServiceRole.entities.StaffAvailabilityProfile.bulkCreate(newProfiles);
      
      // Create weekly availability for each new profile
      const weeklyAvail = [];
      const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const s of missingProfileStaff) {
        for (const day of DAYS) {
          weeklyAvail.push({
            org_id: s.org_id,
            staff_id: s.id,
            day_of_week: day,
            is_available: Math.random() > 0.15,
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
      staffProcessed: missingProfileStaff.length,
      profilesCreated: newProfiles.length,
      message: `Created availability profiles for ${newProfiles.length} staff`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});