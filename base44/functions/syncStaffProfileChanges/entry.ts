import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * FIX 1: Denormalization Sync
 * When StaffProfile.full_name changes, sync to all references:
 * - DailyLog.worker_name
 * - VisitReport.worker_name
 * - HomeTask.assigned_to_name
 * - AccidentReport.reported_by_name
 * - HomeCheck.checked_by_name
 * - MaintenanceLog.reported_by_name
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { staff_profile_id, old_name, new_name, org_id } = await req.json();

    if (!staff_profile_id || !new_name || !org_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update all denormalized references
    const updates = await Promise.all([
      // DailyLog.worker_name
      base44.asServiceRole.entities.DailyLog.filter({ org_id, worker_name: old_name })
        .then(logs => Promise.all(logs.map(l => base44.asServiceRole.entities.DailyLog.update(l.id, { worker_name: new_name })))),
      
      // VisitReport.worker_name
      base44.asServiceRole.entities.VisitReport.filter({ org_id, worker_name: old_name })
        .then(reports => Promise.all(reports.map(r => base44.asServiceRole.entities.VisitReport.update(r.id, { worker_name: new_name })))),
      
      // HomeTask.assigned_to_name
      base44.asServiceRole.entities.HomeTask.filter({ org_id, assigned_to_name: old_name })
        .then(tasks => Promise.all(tasks.map(t => base44.asServiceRole.entities.HomeTask.update(t.id, { assigned_to_name: new_name })))),
      
      // AccidentReport.reported_by_name
      base44.asServiceRole.entities.AccidentReport.filter({ org_id, reported_by_name: old_name })
        .then(reports => Promise.all(reports.map(r => base44.asServiceRole.entities.AccidentReport.update(r.id, { reported_by_name: new_name })))),
      
      // HomeCheck.checked_by_name
      base44.asServiceRole.entities.HomeCheck.filter({ org_id, checked_by_name: old_name })
        .then(checks => Promise.all(checks.map(c => base44.asServiceRole.entities.HomeCheck.update(c.id, { checked_by_name: new_name })))),
      
      // MaintenanceLog.reported_by_name
      base44.asServiceRole.entities.MaintenanceLog.filter({ org_id, reported_by_name: old_name })
        .then(logs => Promise.all(logs.map(l => base44.asServiceRole.entities.MaintenanceLog.update(l.id, { reported_by_name: new_name }))))
    ]);

    const totalUpdated = updates.reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);

    return Response.json({ 
      success: true, 
      message: `Synced ${totalUpdated} denormalized references`,
      staff_profile_id,
      old_name,
      new_name 
    });
  } catch (error) {
    console.error('Error syncing staff profile changes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});