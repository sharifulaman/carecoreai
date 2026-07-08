import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ORG_ID = 'default_org';

    // Get all data
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

    const homes = await base44.entities.Home.filter({ org_id: ORG_ID });
    const residents = await base44.entities.Resident.filter({ org_id: ORG_ID });

    // Map support workers by team leader
    const swByTeamLeader = {};
    supportWorkers.forEach(sw => {
      if (sw.team_leader_id) {
        if (!swByTeamLeader[sw.team_leader_id]) {
          swByTeamLeader[sw.team_leader_id] = [];
        }
        swByTeamLeader[sw.team_leader_id].push(sw.id);
      }
    });

    let homesFixed = 0;
    let residentsFixed = 0;

    // Fix homes - assign team leaders and matching support workers
    for (let i = 0; i < homes.length; i++) {
      const home = homes[i];
      const tlIndex = i % teamLeaders.length;
      const assignedTL = teamLeaders[tlIndex];
      
      // Get support workers for this team leader
      const tlSWs = swByTeamLeader[assignedTL.id] || [];
      
      // Assign 1-2 support workers from this team leader
      const numSWs = Math.min(2, tlSWs.length);
      const assignedSWs = tlSWs.slice(0, numSWs);

      await base44.entities.Home.update(home.id, {
        team_leader_id: assignedTL.id,
        support_worker_ids: assignedSWs
      });
      homesFixed++;
    }

    // Fix residents - assign to homes and their team leaders
    const homesArray = await base44.entities.Home.filter({ org_id: ORG_ID });
    for (let i = 0; i < residents.length; i++) {
      const resident = residents[i];
      const homeIndex = i % homesArray.length;
      const assignedHome = homesArray[homeIndex];

      await base44.entities.Resident.update(resident.id, {
        home_id: assignedHome.id,
        team_leader_id: assignedHome.team_leader_id
      });
      residentsFixed++;
    }

    return Response.json({ 
      success: true,
      teamLeaders: teamLeaders.length,
      supportWorkers: supportWorkers.length,
      homesFixed,
      residentsFixed,
      swByTeamLeader
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});