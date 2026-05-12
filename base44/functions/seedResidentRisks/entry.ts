import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const org_id = 'default_org';
    
    // Fetch all residents
    const residents = await base44.asServiceRole.entities.Resident.filter({ org_id }, '-created_date', 100);
    
    const risks = ['low', 'medium', 'high', 'critical'];
    let updated = 0;

    // Update each resident with varied risk levels and placement types
    const placementTypes = ['childrens_home', 'supported_accommodation', 'adult_care'];
    for (let i = 0; i < residents.length; i++) {
      const resident = residents[i];
      
      // Distribute: 40% low, 35% medium, 15% high, 10% critical
      let riskLevel = 'low';
      const rand = Math.random() * 100;
      if (rand < 10) riskLevel = 'critical';
      else if (rand < 25) riskLevel = 'high';
      else if (rand < 60) riskLevel = 'medium';
      
      // Assign placement type if not already set
      const placementType = resident.placement_type || placementTypes[i % 3];
      
      await base44.asServiceRole.entities.Resident.update(resident.id, {
        risk_level: riskLevel,
        placement_type: placementType
      });
      updated++;
    }

    return Response.json({
      success: true,
      residentsUpdated: updated,
      message: 'Resident risk levels seeded successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});