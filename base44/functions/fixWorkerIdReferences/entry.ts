import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Tables to migrate: field name -> entity name
const WORKER_FIELD_MAP = [
  { entity: "VisitReport",      field: "worker_id" },
  { entity: "SWPerformanceKPI", field: "worker_id" },
  { entity: "CICReport",        field: "worker_id" },
  { entity: "SupportPlan",      field: "worker_id" },
  { entity: "ILSPlan",          field: "worker_id" },
  { entity: "AccidentReport",   field: "reported_by_id" },
  { entity: "HomeCheck",        field: "checked_by" },
  { entity: "MaintenanceLog",   field: "reported_by" },
  { entity: "HomeLog",          field: "logged_by" },
  { entity: "KPIRecord",        field: "worker_id" },
  { entity: "GPAppointment",    field: "worker_id" },
  { entity: "ShiftHandover",    field: "written_by" },
  { entity: "ShiftHandover",    field: "incoming_staff_id" },
  { entity: "ShiftHandover",    field: "acknowledged_by" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Load all StaffProfiles for email -> UUID lookup
    const allProfiles = await base44.asServiceRole.entities.StaffProfile.list('-created_date', 500);
    const emailToId = {};
    allProfiles.forEach(p => {
      if (p.email) emailToId[p.email.toLowerCase().trim()] = p.id;
    });

    const results = {};
    const unresolvable = [];

    for (const { entity, field } of WORKER_FIELD_MAP) {
      results[`${entity}.${field}`] = { updated: 0, skipped: 0, unresolvable: 0 };
      try {
        const records = await base44.asServiceRole.entities[entity].list('-created_date', 2000);
        for (const record of records) {
          const val = record[field];
          if (!val || !val.includes('@')) continue; // already UUID or empty
          const uuid = emailToId[val.toLowerCase().trim()];
          if (uuid) {
            await base44.asServiceRole.entities[entity].update(record.id, { [field]: uuid });
            results[`${entity}.${field}`].updated++;
          } else {
            unresolvable.push({ entity, field, record_id: record.id, email: val });
            results[`${entity}.${field}`].unresolvable++;
          }
        }
      } catch (err) {
        results[`${entity}.${field}`].error = err.message;
      }
    }

    return Response.json({
      status: 'completed',
      summary: results,
      unresolvable,
      total_unresolvable: unresolvable.length,
      message: unresolvable.length > 0
        ? `Migration complete. ${unresolvable.length} records could not be resolved — check unresolvable[] for manual review.`
        : 'Migration complete. All email references successfully converted to UUIDs.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});