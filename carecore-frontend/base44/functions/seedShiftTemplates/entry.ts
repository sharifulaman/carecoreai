import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all homes
    const homes = await base44.asServiceRole.entities.Home.list();
    
    const templates = [];
    
    for (const home of homes) {
      if (home.type === '24_hours') {
        // Day shift - 1 person
        templates.push({
          org_id: 'default_org',
          home_id: home.id,
          home_name: home.name,
          name: 'Day Shift',
          shift_type: 'morning',
          time_start: '07:00',
          time_end: '15:00',
          staff_required: 1,
          active: true,
          notes: 'Morning shift for 24-hour housing'
        });
        
        // Night shift - 1 person
        templates.push({
          org_id: 'default_org',
          home_id: home.id,
          home_name: home.name,
          name: 'Night Shift',
          shift_type: 'night',
          time_start: '23:00',
          time_end: '07:00',
          staff_required: 1,
          active: true,
          notes: 'Night shift for 24-hour housing'
        });
      }
      
      if (home.type === 'care') {
        // Day shift - 4 people
        templates.push({
          org_id: 'default_org',
          home_id: home.id,
          home_name: home.name,
          name: 'Day Shift',
          shift_type: 'morning',
          time_start: '08:00',
          time_end: '16:00',
          staff_required: 4,
          active: true,
          notes: 'Morning shift for care services'
        });
        
        // Night shift - 4 people
        templates.push({
          org_id: 'default_org',
          home_id: home.id,
          home_name: home.name,
          name: 'Night Shift',
          shift_type: 'night',
          time_start: '20:00',
          time_end: '08:00',
          staff_required: 4,
          active: true,
          notes: 'Night shift for care services'
        });
      }
    }

    if (templates.length > 0) {
      await base44.asServiceRole.entities.ShiftTemplate.bulkCreate(templates);
    }
    
    return Response.json({ 
      success: true, 
      templatesCreated: templates.length,
      message: `Created ${templates.length} shift templates`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});