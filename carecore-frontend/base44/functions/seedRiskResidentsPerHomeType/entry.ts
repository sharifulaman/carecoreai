import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const org_id = 'default_org';
    const homeTypes = ['childrens', 'adult', 'care', 'outreach'];
    const riskLevels = ['critical', 'high', 'high', 'critical'];
    let updated = 0;

    for (let i = 0; i < homeTypes.length; i++) {
      const homeType = homeTypes[i];
      const riskLevel = riskLevels[i];

      // Get a home of this type
      const homes = await base44.asServiceRole.entities.Home.filter({ 
        org_id, 
        type: homeType,
        status: 'active'
      }, '-created_date', 10);

      if (homes.length === 0) continue;

      const home = homes[0];

      // Get a resident in this home
      const residents = await base44.asServiceRole.entities.Resident.filter({ 
        org_id, 
        home_id: home.id 
      });

      // Create resident if home has none
      let resident;
      if (residents.length === 0) {
        resident = await base44.asServiceRole.entities.Resident.create({
          org_id,
          home_id: home.id,
          display_name: `Resident - ${homeType}`,
          status: 'active'
        });
      } else {
        resident = residents[0];
      }

      // Update to high/critical risk
      await base44.asServiceRole.entities.Resident.update(resident.id, {
        risk_level: riskLevel
      });

      updated++;
    }

    return Response.json({
      success: true,
      updated,
      message: `Updated ${updated} residents with high/critical risk across home types`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});