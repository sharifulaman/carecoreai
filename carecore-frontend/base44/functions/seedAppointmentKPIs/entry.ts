import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APPOINTMENT_TYPES = [
  "Dentist", "Optician", "Health assessment", "Vaccination", "TB clinic",
  "Solicitor", "Job Centre and UC", "PEP meeting", "PA meeting", "CAMHS",
  "Sexual health", "Blood Test", "Urine Test", "ECG", "Weight Check",
  "Blood Pressure Check", "Vision Test", "Hearing Test", "Dental Check",
  "Mental Health Review", "Physiotherapy"
];

const WORKERS = [
  { worker_id: 's.mitchell@carecore.org', worker_name: 'Sarah Mitchell', employee_id: 'EMP-0010', home_id: '69e8d17a9855396d7f77d924' },
  { worker_id: 'j.okafor@carecore.org', worker_name: 'James Okafor', employee_id: 'EMP-0009', home_id: '69e8d17a9855396d7f77d925' },
  { worker_id: 'p.sharma@carecore.org', worker_name: 'Priya Sharma', employee_id: 'EMP-0008', home_id: '69e8d17a9855396d7f77d926' },
  { worker_id: 'd.nkosi@carecore.org', worker_name: 'David Nkosi', employee_id: 'EMP-0007', home_id: '69e8d17a9855396d7f77d924' },
  { worker_id: 'e.clarke@carecore.org', worker_name: 'Emma Clarke', employee_id: 'EMP-0006', home_id: '69e8d17a9855396d7f77d924' },
  { worker_id: 'm.ali@carecore.org', worker_name: 'Mohammed Ali', employee_id: 'EMP-0005', home_id: '69e8d17a9855396d7f77d925' },
  { worker_id: 'n.thomas@carecore.org', worker_name: 'Nia Thomas', employee_id: 'EMP-0004', home_id: '69e8d17a9855396d7f77d925' },
  { worker_id: 'c.davies@carecore.org', worker_name: 'Callum Davies', employee_id: 'EMP-0003', home_id: '69e8d17a9855396d7f77d926' },
  { worker_id: 'f.hassan@carecore.org', worker_name: 'Fatima Hassan', employee_id: 'EMP-0002', home_id: '69e8d17a9855396d7f77d926' },
  { worker_id: 'l.brooks@carecore.org', worker_name: 'Leon Brooks', employee_id: 'EMP-0001', home_id: '69e8d17a9855396d7f77d924' },
];

const RESIDENTS = [
  { id: '69e8d1a19855396d7f77d974', home_id: '69e8d17a9855396d7f77d924' },
  { id: '69e8d1a19855396d7f77d975', home_id: '69e8d17a9855396d7f77d925' },
  { id: '69e8d1a19855396d7f77d976', home_id: '69e8d17a9855396d7f77d926' },
  { id: '69e8d1a19855396d7f77d96e', home_id: '69e8d17a9855396d7f77d924' },
  { id: '69e8d1a19855396d7f77d96f', home_id: '69e8d17a9855396d7f77d925' },
  { id: '69eb7efa890310a752a5755e', home_id: '69ea9ed9084ba1deceaa9544' },
  { id: '69eb7efa890310a752a5755f', home_id: '69ea9ed9084ba1deceaa9544' },
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMonday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(dateStr).setDate(diff)).toISOString().split("T")[0];
}

function getMonth(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function randomDate(monthsBack) {
  const now = new Date();
  const past = new Date();
  past.setMonth(past.getMonth() - monthsBack);
  const diff = now - past;
  const randomMs = Math.random() * diff;
  return new Date(past.getTime() + randomMs).toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const records = [];

    // Generate ~3-4 varied appointments per worker across 6 months
    for (const worker of WORKERS) {
      const appointmentCount = 3 + Math.floor(Math.random() * 4); // 3-6 per worker
      const usedTypes = new Set();

      for (let i = 0; i < appointmentCount; i++) {
        // Pick a unique appointment type per worker where possible
        let apptType;
        let attempts = 0;
        do {
          apptType = randomFrom(APPOINTMENT_TYPES);
          attempts++;
        } while (usedTypes.has(apptType) && attempts < 10);
        usedTypes.add(apptType);

        const resident = randomFrom(RESIDENTS);
        const date = randomDate(6);
        const hours = parseFloat((0.5 + Math.random() * 2).toFixed(1));

        records.push({
          org_id: 'default_org',
          worker_id: worker.worker_id,
          worker_name: worker.worker_name,
          employee_id: worker.employee_id,
          home_id: worker.home_id,
          resident_id: resident.id,
          date,
          week_start: getMonday(date),
          month: getMonth(date),
          activity_type: 'visit_report', // it was a visit that included an appointment
          source_entity: 'VisitReport',
          source_id: `appt-seed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          hours_with_yp: hours,
          appointment_type: apptType,
          visit_type: 'In-person at placement',
          presentation: randomFrom(['Happy and healthy', 'Calm and settled', 'Worried or anxious']),
          engagement_level: randomFrom(['3', '4', '5']),
          risk_level: randomFrom(['low', 'medium']),
          independence_progress: randomFrom(['Progressing', 'Maintaining']),
          health_adherence: randomFrom(['All up to date', 'One or more overdue']),
          life_skills: [],
          kw_session_count: 0,
          cic_report_count: 0,
          support_plan_count: 0,
          gp_appointment_count: 0,
        });
      }
    }

    // Bulk create in batches of 20
    let created = 0;
    for (let i = 0; i < records.length; i += 20) {
      const batch = records.slice(i, i + 20);
      await base44.asServiceRole.entities.SWPerformanceKPI.bulkCreate(batch);
      created += batch.length;
    }

    return Response.json({ success: true, created, total: records.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});