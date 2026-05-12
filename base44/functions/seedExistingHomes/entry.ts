import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const ORG_ID = 'default_org';
    
    // Fetch all homes
    const homes = await base44.entities.Home.filter({ org_id: ORG_ID });
    
    // Update any homes without property_type to "outreach"
    let updated = 0;
    for (const home of homes) {
      if (!home.property_type) {
        await base44.entities.Home.update(home.id, { property_type: 'outreach' });
        updated++;
      }
    }

    return Response.json({
      success: true,
      message: `Updated ${updated} homes to property_type: outreach`,
      totalHomes: homes.length,
      updatedHomes: updated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});