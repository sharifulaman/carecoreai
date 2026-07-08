import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch homes and staff
    const homes = await base44.entities.Home.list('-created_date', 10);
    const staff = await base44.entities.StaffProfile.list('-created_date', 20);

    if (homes.length === 0 || staff.length === 0) {
      return Response.json({ error: 'Homes and staff profiles required' }, { status: 400 });
    }

    const workflows = [];
    const orgId = user.org_id || 'default';
    const statuses = ['pending', 'submitted', 'approved', 'rejected', 'escalated'];
    const priorities = ['low', 'medium', 'high'];

    // Bill Approvals (5)
    for (let i = 0; i < 5; i++) {
      const submittedTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      workflows.push({
        org_id: orgId,
        entity_type: 'bill',
        workflow_type: 'bill',
        entity_id: `bill-${i}`,
        reference: `BILL-${Date.now()}-${i}`,
        home_id: homes[i % homes.length]?.id,
        home_name: homes[i % homes.length]?.name,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        assigned_to_id: staff[Math.floor(Math.random() * staff.length)]?.id,
        assigned_to_name: staff[Math.floor(Math.random() * staff.length)]?.full_name,
        created_by_id: staff[0]?.id,
        created_by_name: staff[0]?.full_name,
        submitted_by: staff[0]?.id,
        created_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        submitted_at: submittedTime,
        due_date: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        current_step: Math.ceil(Math.random() * 5),
        escalated: Math.random() > 0.7,
        description: `Bill approval for ${homes[i % homes.length]?.name}`,
      });
    }

    // Visit Report Approvals (5)
    for (let i = 0; i < 5; i++) {
      const submittedTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      workflows.push({
        org_id: orgId,
        entity_type: 'visit_report',
        workflow_type: 'visit_report',
        entity_id: `visit-${i}`,
        reference: `VISIT-${Date.now()}-${i}`,
        home_id: homes[i % homes.length]?.id,
        home_name: homes[i % homes.length]?.name,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        assigned_to_id: staff[Math.floor(Math.random() * staff.length)]?.id,
        assigned_to_name: staff[Math.floor(Math.random() * staff.length)]?.full_name,
        created_by_id: staff[1]?.id,
        created_by_name: staff[1]?.full_name,
        submitted_by: staff[1]?.id,
        created_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        submitted_at: submittedTime,
        due_date: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        current_step: Math.ceil(Math.random() * 4),
        escalated: Math.random() > 0.8,
        description: `Visit report review for ${homes[i % homes.length]?.name}`,
      });
    }

    // Missing Episode Acknowledgement (5)
    for (let i = 0; i < 5; i++) {
      const submittedTime = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString();
      workflows.push({
        org_id: orgId,
        entity_type: 'missing_episode',
        workflow_type: 'missing_episode',
        entity_id: `missing-${i}`,
        reference: `MISSING-${Date.now()}-${i}`,
        home_id: homes[i % homes.length]?.id,
        home_name: homes[i % homes.length]?.name,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: ['high', 'high', 'high', 'medium', 'low'][Math.floor(Math.random() * 5)],
        assigned_to_id: staff[Math.floor(Math.random() * staff.length)]?.id,
        assigned_to_name: staff[Math.floor(Math.random() * staff.length)]?.full_name,
        created_by_id: staff[2]?.id,
        created_by_name: staff[2]?.full_name,
        submitted_by: staff[2]?.id,
        created_date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
        submitted_at: submittedTime,
        due_date: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        current_step: Math.ceil(Math.random() * 6),
        escalated: Math.random() > 0.6,
        description: `Missing episode acknowledgement for ${homes[i % homes.length]?.name}`,
      });
    }

    // Contingency Plan Reviews (5)
    for (let i = 0; i < 5; i++) {
      const submittedTime = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString();
      workflows.push({
        org_id: orgId,
        entity_type: 'contingency_plan',
        workflow_type: 'contingency_plan',
        entity_id: `contingency-${i}`,
        reference: `CONTINGENCY-${Date.now()}-${i}`,
        home_id: homes[i % homes.length]?.id,
        home_name: homes[i % homes.length]?.name,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        assigned_to_id: staff[Math.floor(Math.random() * staff.length)]?.id,
        assigned_to_name: staff[Math.floor(Math.random() * staff.length)]?.full_name,
        created_by_id: staff[3]?.id,
        created_by_name: staff[3]?.full_name,
        submitted_by: staff[3]?.id,
        created_date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
        submitted_at: submittedTime,
        due_date: new Date(Date.now() + Math.random() * 21 * 24 * 60 * 60 * 1000).toISOString(),
        current_step: Math.ceil(Math.random() * 5),
        escalated: Math.random() > 0.75,
        description: `Contingency plan review for ${homes[i % homes.length]?.name}`,
      });
    }

    // Bulk create workflows
    const created = await base44.entities.ApprovalWorkflow.bulkCreate(workflows);

    return Response.json({
      success: true,
      message: `Created ${created.length} workflows`,
      count: created.length,
      types: {
        bill: 5,
        visit_report: 5,
        missing_episode: 5,
        contingency_plan: 5,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});