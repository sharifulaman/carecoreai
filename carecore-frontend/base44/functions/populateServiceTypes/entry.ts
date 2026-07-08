import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch all residents
    const allResidents = await base44.asServiceRole.entities.Resident.list('-created_date', 500);
    
    let updated = 0;
    const services = ['outreach', 'eighteen_plus', 'twenty_four_hours'];
    
    for (let i = 0; i < allResidents.length; i++) {
      const resident = allResidents[i];
      
      // Distribute evenly across 3 service types
      const serviceType = services[i % 3];
      
      await base44.asServiceRole.entities.Resident.update(resident.id, {
        service_type: serviceType
      });
      updated++;
    }

    return Response.json({ 
      success: true, 
      message: `Updated ${updated} residents with default service_type`,
      total: allResidents.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});