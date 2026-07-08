import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const org_id = 'default_org';
    const validTypes = ['outreach', '24_hours', 'care', '18_plus'];
    let deleted = 0;
    let updated = 0;

    // Get all homes
    const allHomes = await base44.asServiceRole.entities.Home.filter({ org_id }, '-created_date', 500);

    // Delete homes with invalid types (childrens, adult, etc)
    for (const home of allHomes) {
      if (!validTypes.includes(home.type)) {
        await base44.asServiceRole.entities.Home.delete(home.id);
        deleted++;
      }
    }

    // Get fresh list of valid homes
    const validHomes = await base44.asServiceRole.entities.Home.filter({ org_id }, '-created_date', 500);

    // Randomly assign valid types to homes
    for (const home of validHomes) {
      const randomType = validTypes[Math.floor(Math.random() * validTypes.length)];
      await base44.asServiceRole.entities.Home.update(home.id, { type: randomType });
      updated++;
    }

    return Response.json({
      success: true,
      deleted,
      updated,
      message: `Deleted ${deleted} invalid homes, assigned types to ${updated} homes`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});