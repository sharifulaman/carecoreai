import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const getMonday = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(dateStr).setDate(diff)).toISOString().split('T')[0];
};

const getMonth = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ORG_ID = 'default_org';

    const [allStaff, allResidents, allHomes] = await Promise.all([
      base44.asServiceRole.entities.StaffProfile.filter({ org_id: ORG_ID, status: 'active' }),
      base44.asServiceRole.entities.Resident.filter({ org_id: ORG_ID, status: 'active' }),
      base44.asServiceRole.entities.Home.filter({ org_id: ORG_ID, status: 'active' }),
    ]);

    const workers = allStaff.filter(s => s.role === 'support_worker' || s.role === 'team_leader');
    if (workers.length === 0) return Response.json({ error: 'No workers found' }, { status: 400 });

    const visitTypes = ['In-person at placement', 'In-person in community', 'Phone call only', 'In-person at college'];
    const presentations = ['Happy and healthy', 'Calm and settled', 'Talkative and engaged', 'Worried or anxious'];
    const placementConditions = ['Clean and tidy', 'Slightly untidy', 'Untidy — required cleaning'];
    const engagementLevels = ['1', '2', '3', '4', '5'];
    const riskLevels = ['low', 'medium', 'high'];
    const progressLevels = ['Progressing', 'Maintaining', 'Declining'];
    const healthAdherences = ['All up to date', 'One or more overdue', 'Not assessed today'];
    const activityTypes = ['visit_report', 'key_worker_session', 'visit_report', 'visit_report', 'cic_report', 'gp_appointment', 'support_plan_created'];

    const records = [];
    const today = new Date();

    // Generate 6 months of data
    for (let daysAgo = 180; daysAgo >= 0; daysAgo -= randomInt(1, 3)) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split('T')[0];

      // 2-4 activities per day across workers
      const dailyCount = randomInt(2, 4);
      for (let i = 0; i < dailyCount; i++) {
        const worker = randomItem(workers);
        const resident = allResidents.length > 0 ? randomItem(allResidents) : null;
        const home = allHomes.length > 0 ? randomItem(allHomes) : null;
        const activityType = randomItem(activityTypes);

        records.push({
          org_id: ORG_ID,
          worker_id: worker.email || worker.id,
          worker_name: worker.full_name,
          employee_id: worker.employee_id || '',
          home_id: resident?.home_id || home?.id || '',
          resident_id: resident?.id || null,
          date: dateStr,
          week_start: getMonday(dateStr),
          month: getMonth(dateStr),
          activity_type: activityType,
          source_entity: activityType === 'cic_report' ? 'CICReport' : activityType === 'gp_appointment' ? 'GPAppointment' : 'VisitReport',
          source_id: `seed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          hours_with_yp: activityType === 'visit_report' || activityType === 'key_worker_session' ? randomInt(1, 3) + Math.random() : 0,
          visit_type: activityType === 'visit_report' ? randomItem(visitTypes) : null,
          presentation: randomItem(presentations),
          placement_condition: randomItem(placementConditions),
          engagement_level: randomItem(engagementLevels),
          risk_level: randomItem(riskLevels),
          independence_progress: randomItem(progressLevels),
          health_adherence: randomItem(healthAdherences),
          life_skills: ['Cooking', 'Budgeting', 'Transport'].slice(0, randomInt(0, 3)),
          kw_session_count: activityType === 'key_worker_session' ? 1 : 0,
          cic_report_count: activityType === 'cic_report' ? 1 : 0,
          support_plan_count: activityType === 'support_plan_created' ? 1 : 0,
          gp_appointment_count: activityType === 'gp_appointment' ? 1 : 0,
        });
      }
    }

    // Batch insert in chunks of 50
    let created = 0;
    for (let i = 0; i < records.length; i += 50) {
      const chunk = records.slice(i, i + 50);
      await base44.asServiceRole.entities.SWPerformanceKPI.bulkCreate(chunk);
      created += chunk.length;
    }

    return Response.json({ created, workers: workers.length, residents: allResidents.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});