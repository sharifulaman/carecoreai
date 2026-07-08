import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const org_id = body.org_id;

    // Check if already seeded (check both org_id variants)
    const existingRecords = await base44.asServiceRole.entities.TrainingRecord.list();
    if (existingRecords && existingRecords.length > 0) {
      return Response.json({ seeded: false, message: 'Training records already exist', count: existingRecords.length });
    }

    // Fetch active staff (all, regardless of org_id field value)
    const allStaff = await base44.asServiceRole.entities.StaffProfile.list();
    const activeStaff = allStaff.filter(s => s.status === 'active');
    const requirements = await base44.asServiceRole.entities.TrainingRequirement.list();

    if (!requirements || requirements.length === 0) {
      return Response.json({ error: 'No requirements found. Seed requirements first.' }, { status: 400 });
    }

    // Only seed first 8 courses for variety
    const courses = requirements
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 8);

    const today = new Date();
    const created = [];

    for (const staffMember of activeStaff) {
      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        // Distribute: 70% completed, 15% in_progress, 10% expiring_soon, 5% expired
        const rand = Math.random();
        let status, completion_date, expiry_date, training_status;

        if (rand < 0.05) {
          // 5% expired
          const daysAgo = randomInt(30, 365);
          const completedDate = addDays(today, -(daysAgo + (course.expiry_months * 30)));
          completion_date = toDateStr(completedDate);
          if (course.expiry_months > 0) {
            expiry_date = toDateStr(addDays(today, -randomInt(5, 60)));
          }
          status = 'completed';
          training_status = 'expired';
        } else if (rand < 0.15) {
          // 10% expiring soon (within 45 days)
          const daysAgo = (course.expiry_months * 30) - randomInt(10, 45);
          completion_date = toDateStr(addDays(today, -daysAgo));
          if (course.expiry_months > 0) {
            expiry_date = toDateStr(addDays(today, randomInt(5, 44)));
          }
          status = 'completed';
          training_status = 'expiring_soon';
        } else if (rand < 0.30) {
          // 15% in_progress
          status = 'in_progress';
          training_status = 'in_progress';
          completion_date = null;
          expiry_date = null;
        } else {
          // 70% completed (6-18 months ago)
          const monthsAgo = randomInt(6, 18);
          completion_date = toDateStr(addMonths(today, -monthsAgo));
          if (course.expiry_months > 0) {
            expiry_date = toDateStr(addMonths(new Date(completion_date), course.expiry_months));
          }
          status = 'completed';
          training_status = 'valid';
        }

        const record = await base44.asServiceRole.entities.TrainingRecord.create({
          org_id: staffMember.org_id || org_id || 'default_org',
          staff_id: staffMember.id,
          staff_name: staffMember.full_name,
          home_id: staffMember.home_ids?.[0] || staffMember.home_id || null,
          course_name: course.course_name,
          category: course.category,
          is_mandatory: true,
          status,
          training_status,
          completion_date: completion_date || null,
          date_completed: completion_date || null,
          expiry_date: expiry_date || null,
        });
        created.push(record);
      }
    }

    return Response.json({ seeded: true, count: created.length, staff_count: activeStaff.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});