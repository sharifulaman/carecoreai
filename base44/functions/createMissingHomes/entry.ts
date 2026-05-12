import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const org_id = 'default_org';
    const created = [];

    // Get a team leader for assignment
    const teamLeaders = await base44.asServiceRole.entities.StaffProfile.filter({
      org_id,
      role: 'team_leader'
    }, '-created_date', 1);

    const teamLeaderId = teamLeaders.length > 0 ? teamLeaders[0].id : 'default_tl';

    // Create care home if missing
    const careHomes = await base44.asServiceRole.entities.Home.filter({
      org_id,
      type: 'care'
    });

    if (careHomes.length === 0) {
      const care = await base44.asServiceRole.entities.Home.create({
        org_id,
        name: 'Cedar View - Care Services',
        type: 'care',
        team_leader_id: teamLeaderId,
        status: 'active'
      });
      created.push('Care home');
    }

    // Create outreach home if missing
    const outreachHomes = await base44.asServiceRole.entities.Home.filter({
      org_id,
      type: 'outreach'
    });

    if (outreachHomes.length === 0) {
      const outreach = await base44.asServiceRole.entities.Home.create({
        org_id,
        name: 'Outreach Services',
        type: 'outreach',
        team_leader_id: teamLeaderId,
        status: 'active'
      });
      created.push('Outreach home');
    }

    return Response.json({
      success: true,
      created,
      message: `Created ${created.length} homes`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});