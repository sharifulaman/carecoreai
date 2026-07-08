import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const allStaff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id: 'default_org' }, 'created_date', 500);
    const without = allStaff.filter(s => !s.employee_id);

    // Find the highest existing EMP number
    const existing = allStaff
      .filter(s => s.employee_id && s.employee_id.startsWith('EMP-'))
      .map(s => parseInt(s.employee_id.replace('EMP-', ''), 10))
      .filter(n => !isNaN(n));

    let counter = existing.length > 0 ? Math.max(...existing) + 1 : 1;

    const updates = [];
    for (const staff of without) {
      const employee_id = `EMP-${String(counter).padStart(4, '0')}`;
      await base44.asServiceRole.entities.StaffProfile.update(staff.id, { employee_id });
      updates.push({ id: staff.id, name: staff.full_name, employee_id });
      counter++;
    }

    return Response.json({ updated: updates.length, records: updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});