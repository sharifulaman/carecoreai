import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { staff_id, staff_name, staff_role, home_ids, employment_start_date, org_id } = await req.json();

    if (!staff_id || !org_id) {
      return Response.json({ error: 'Missing staff_id or org_id' }, { status: 400 });
    }

    // Create the Schedule1CheckRecord
    const record = await base44.entities.Schedule1CheckRecord.create({
      org_id,
      staff_id,
      staff_name: staff_name || '',
      staff_role: staff_role || '',
      home_ids: home_ids || [],
      employment_start_date: employment_start_date || new Date().toISOString().split('T')[0],
      all_checks_complete: false,
      outstanding_checks: [
        'Identity Check',
        'DBS Check',
        'References',
        'Previous Work Verification',
        'Qualifications',
        'Employment History'
      ],
      record_status: 'incomplete',
      created_by_id: user.id || user.email,
      created_by_name: user.full_name || user.email
    });

    // Create notification for HR team
    const notifData = {
      org_id,
      user_id: user.id,
      title: `Schedule 1 Checks Required — ${staff_name}`,
      body: `${staff_name} has been added as active staff. All Schedule 1 checks must be completed and recorded before they begin work with children. Open their compliance record to complete the checks.`,
      module_name: 'Schedule1Checks',
      action_type: 'alert',
      link_path: `/staff?tab=schedule1_checks&staff_id=${staff_id}`,
      severity: 'high'
    };

    await base44.entities.Notification.create(notifData);

    return Response.json({ success: true, record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});