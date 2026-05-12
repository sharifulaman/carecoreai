import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ORG_ID = 'default_org';

    // Get all team leaders and support workers
    const teamLeaders = await base44.entities.StaffProfile.filter({ 
      org_id: ORG_ID, 
      role: 'team_leader',
      status: 'active'
    });
    
    const supportWorkers = await base44.entities.StaffProfile.filter({ 
      org_id: ORG_ID, 
      role: 'support_worker',
      status: 'active'
    });

    // Assign 3 support workers to each team leader
    let workerIndex = 0;
    for (const tl of teamLeaders) {
      for (let i = 0; i < 3; i++) {
        if (workerIndex < supportWorkers.length) {
          const sw = supportWorkers[workerIndex];
          await base44.entities.StaffProfile.update(sw.id, { 
            team_leader_id: tl.id 
          });
          workerIndex++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: `Assigned ${workerIndex} support workers to ${teamLeaders.length} team leaders` 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});