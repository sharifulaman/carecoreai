import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ORG_ID = 'default_org';
    
    // Get existing homes
    const homes = await base44.asServiceRole.entities.Home.list('', 100);
    const homeIds = homes.slice(0, 5).map(h => h.id);

    // Staff seed data with diverse roles
    const staffData = [
      { name: 'Sarah Mitchell', role: 'team_leader', home: homeIds[0], empId: 'EMP-001' },
      { name: 'James Patel', role: 'support_worker', home: homeIds[0], empId: 'EMP-002' },
      { name: 'Emily Carter', role: 'support_worker', home: homeIds[1], empId: 'EMP-003' },
      { name: 'Michael Jones', role: 'support_worker', home: homeIds[0], empId: 'EMP-004' },
      { name: 'Priya Sharma', role: 'admin_officer', home: homeIds[2], empId: 'EMP-005' },
      { name: 'David Brown', role: 'support_worker', home: homeIds[1], empId: 'EMP-006' },
      { name: 'Lisa Johnson', role: 'team_leader', home: homeIds[3], empId: 'EMP-007' },
      { name: 'Robert Wilson', role: 'hr_officer', home: homeIds[4], empId: 'EMP-008' },
      { name: 'Emma Davis', role: 'support_worker', home: homeIds[2], empId: 'EMP-009' },
      { name: 'John Davis', role: 'maintenance_officer', home: homeIds[3], empId: 'EMP-010' },
    ];

    // Create/update staff profiles
    const createdStaff = [];
    for (const staff of staffData) {
      try {
        const created = await base44.asServiceRole.entities.StaffProfile.create({
          org_id: ORG_ID,
          full_name: staff.name,
          email: `${staff.name.toLowerCase().replace(/\s+/g, '.')}@carecore.test`,
          role: staff.role,
          job_title: staff.role.replace(/_/g, ' '),
          home_ids: [staff.home],
          employee_id: staff.empId,
          start_date: '2023-01-15',
          status: 'active',
        });
        createdStaff.push(created);
      } catch (e) {
        console.log(`Staff ${staff.name} may already exist or error: ${e.message}`);
      }
    }

    // Get residents to link to KPI records
    const residents = await base44.asServiceRole.entities.Resident.list('', 100);
    const residentPool = residents.filter(r => r.status !== 'archived').slice(0, 20);

    // Seed performance KPI data for support workers
    const now = new Date();
    const kpiRecords = [];
    
    for (let i = 0; i < createdStaff.length; i++) {
      const staff = createdStaff[i];
      if (staff.role !== 'support_worker') continue;

      // Assign 2-4 residents to this worker
      const workerResidents = residentPool.length > 0
        ? residentPool.slice((i * 3) % residentPool.length, (i * 3) % residentPool.length + 3)
        : [];

      // Create 15-20 activity records per support worker
      for (let j = 0; j < 18; j++) {
        const daysAgo = Math.floor(Math.random() * 90);
        const actDate = new Date(now);
        actDate.setDate(actDate.getDate() - daysAgo);
        const dateStr = actDate.toISOString().split('T')[0];
        const monthStr = dateStr.slice(0, 7);

        const activityTypes = [
          'visit_report',
          'key_worker_session',
          'daily_summary',
          'cic_report',
          'home_check_completed',
        ];
        const actType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

        // Link to a resident for visit_report and key_worker_session activities
        const resident = workerResidents.length > 0 && (actType === 'visit_report' || actType === 'key_worker_session')
          ? workerResidents[j % workerResidents.length]
          : null;
        
        kpiRecords.push({
          org_id: ORG_ID,
          worker_id: staff.id,
          worker_name: staff.full_name,
          worker_email_legacy: staff.email,
          activity_type: actType,
          date: dateStr,
          month: monthStr,
          hours_with_yp: Math.random() * 8 + 2,
          appointment_type: actType === 'visit_report' ? 'Routine Visit' : 'None',
          cic_report_count: actType === 'cic_report' ? 1 : 0,
          home_id: staff.home_ids?.[0],
          resident_id: resident ? resident.id : null,
          resident_name: resident ? (resident.display_name || resident.initials) : null,
        });
      }
    }

    // Bulk insert KPI records
    if (kpiRecords.length > 0) {
      try {
        await base44.asServiceRole.entities.SWPerformanceKPI.bulkCreate(kpiRecords);
        console.log(`Created ${kpiRecords.length} KPI records`);
      } catch (e) {
        console.log(`KPI bulk insert: ${e.message}`);
      }
    }

    // Seed daily logs for team leaders and other roles
    const dailyLogRecords = [];
    for (const staff of createdStaff) {
      if (staff.role === 'team_leader' || staff.role === 'support_worker') {
        for (let j = 0; j < 10; j++) {
          const daysAgo = Math.floor(Math.random() * 60);
          const logDate = new Date(now);
          logDate.setDate(logDate.getDate() - daysAgo);
          const dateStr = logDate.toISOString().split('T')[0];

          dailyLogRecords.push({
            org_id: ORG_ID,
            staff_id: staff.id,
            home_id: staff.home_ids?.[0],
            log_date: dateStr,
            summary: `Daily activity log for ${staff.full_name}`,
            mood: ['good', 'neutral', 'low'][Math.floor(Math.random() * 3)],
            risk_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            status: 'recorded',
          });
        }
      }
    }

    if (dailyLogRecords.length > 0) {
      try {
        await base44.asServiceRole.entities.DailyLog.bulkCreate(dailyLogRecords);
        console.log(`Created ${dailyLogRecords.length} daily log records`);
      } catch (e) {
        console.log(`Daily log insert: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      message: 'Employee performance data seeded',
      staffCreated: createdStaff.length,
      kpiRecordsCreated: kpiRecords.length,
      dailyLogsCreated: dailyLogRecords.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});