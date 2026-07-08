import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const org_id = 'default_org';
    const today = new Date();

    // Delete all existing homes
    const existingHomes = await base44.asServiceRole.entities.Home.filter({ org_id }, '-created_date', 500);
    for (const home of existingHomes) {
      await base44.asServiceRole.entities.Home.delete(home.id);
    }

    // Fetch residents and staff to assign
    const residents = await base44.asServiceRole.entities.Resident.filter({ org_id }, '-created_date', 100);
    const staffProfiles = await base44.asServiceRole.entities.StaffProfile.filter({ org_id }, '-created_date', 100);
    
    // Get team leaders
    const teamLeaders = staffProfiles.filter(s => s.role === 'team_leader');
    const supportWorkers = staffProfiles.filter(s => s.role === 'support_worker');

    if (teamLeaders.length === 0) {
      return Response.json({ error: 'No team leaders found' }, { status: 400 });
    }

    // 10 homes data
    const homeData = [
      {
        name: 'Riverside Haven',
        type: '24_hours',
        address: '42 Riverside Drive, Manchester',
        postcode: 'M1 2AB',
        phone: '0161 234 5678',
        email: 'riverside@homes.org.uk',
        leaseStart: '2023-01-15',
        leaseEnd: '2026-01-14'
      },
      {
        name: 'Summit House',
        type: '18_plus',
        address: '55 Summit Court, Bristol',
        postcode: 'BS1 3EF',
        phone: '0117 987 6543',
        email: 'summit@homes.org.uk',
        leaseStart: '2022-06-01',
        leaseEnd: '2027-05-31'
      },
      {
        name: 'Oak Grove',
        type: 'care',
        address: '78 Oak Lane, Leeds',
        postcode: 'LS1 4BB',
        phone: '0113 456 7890',
        email: 'oakgrove@homes.org.uk',
        leaseStart: '2023-03-20',
        leaseEnd: '2026-03-19'
      },
      {
        name: 'City Outreach Centre',
        type: 'outreach',
        address: '12 City Road, Birmingham',
        postcode: 'B1 1AA',
        phone: '0121 567 8901',
        email: 'cityoutreach@homes.org.uk',
        leaseStart: '2023-09-01',
        leaseEnd: '2025-08-31'
      },
      {
        name: 'Meadow View',
        type: '24_hours',
        address: '89 Meadow Street, Glasgow',
        postcode: 'G2 1AB',
        phone: '0141 234 5678',
        email: 'meadowview@homes.org.uk',
        leaseStart: '2024-01-10',
        leaseEnd: '2027-01-09'
      },
      {
        name: 'Castle Heights',
        type: '18_plus',
        address: '101 Castle Road, Edinburgh',
        postcode: 'EH1 3BB',
        phone: '0131 987 6543',
        email: 'castleheights@homes.org.uk',
        leaseStart: '2023-05-15',
        leaseEnd: '2026-05-14'
      },
      {
        name: 'Valley Care Home',
        type: 'care',
        address: '156 Valley Lane, Cardiff',
        postcode: 'CF1 2AB',
        phone: '029 456 7890',
        email: 'valleycare@homes.org.uk',
        leaseStart: '2022-11-01',
        leaseEnd: '2027-10-31'
      },
      {
        name: 'North Star Outreach',
        type: 'outreach',
        address: '23 North Road, Liverpool',
        postcode: 'L1 1AA',
        phone: '0151 567 8901',
        email: 'northstaroutreach@homes.org.uk',
        leaseStart: '2024-02-01',
        leaseEnd: '2025-01-31'
      },
      {
        name: 'Parkside Living',
        type: '24_hours',
        address: '67 Park Avenue, Newcastle',
        postcode: 'NE1 1AA',
        phone: '0191 234 5678',
        email: 'parkside@homes.org.uk',
        leaseStart: '2023-07-20',
        leaseEnd: '2026-07-19'
      },
      {
        name: 'Riverside Independent',
        type: '18_plus',
        address: '134 Riverside Park, Southampton',
        postcode: 'SO1 1AA',
        phone: '023 987 6543',
        email: 'riversideindep@homes.org.uk',
        leaseStart: '2023-04-01',
        leaseEnd: '2026-03-31'
      }
    ];

    const createdHomes = [];
    let homeIndex = 0;

    // Create all homes
    for (const data of homeData) {
      const leaseEnd = new Date(data.leaseEnd);
      const createdHome = await base44.asServiceRole.entities.Home.create({
        org_id,
        name: data.name,
        type: data.type,
        address: data.address,
        postcode: data.postcode,
        phone: data.phone,
        email: data.email,
        team_leader_id: teamLeaders[homeIndex % teamLeaders.length].id,
        lease_start: data.leaseStart,
        lease_end: data.leaseEnd,
        monthly_rent: 3500 + Math.random() * 2000,
        status: 'active'
      });
      createdHomes.push(createdHome);
      homeIndex++;
    }

    // Assign residents to homes (distribute randomly)
    let residentIndex = 0;
    for (const home of createdHomes) {
      // Assign 2-5 residents to each home
      const residentCount = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < residentCount && residentIndex < residents.length; i++) {
        const resident = residents[residentIndex % residents.length];
        await base44.asServiceRole.entities.Resident.update(resident.id, {
          home_id: home.id
        });
        residentIndex++;
      }
    }

    // Assign support workers to homes (1 worker per 2-3 homes)
    let homeGroupIndex = 0;
    let workerIndex = 0;
    for (let i = 0; i < createdHomes.length; i += Math.floor(Math.random() * 2) + 2) {
      if (workerIndex >= supportWorkers.length) workerIndex = 0;
      
      const worker = supportWorkers[workerIndex];
      const assignedHomeIds = createdHomes.slice(i, i + 3).map(h => h.id);
      
      await base44.asServiceRole.entities.StaffProfile.update(worker.id, {
        home_ids: assignedHomeIds
      });
      workerIndex++;
    }

    return Response.json({
      success: true,
      homesCreated: createdHomes.length,
      residentsAssigned: Math.min(residentIndex, residents.length),
      workersAssigned: Math.ceil(createdHomes.length / 2.5),
      message: 'Comprehensive homes dataset created'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});