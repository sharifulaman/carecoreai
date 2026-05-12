import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * FIX 2: Foreign Key Validation
 * Prevents orphaned records by validating references before create/update
 * Called before creating/updating records with foreign key dependencies
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entity_name, fk_data, org_id } = await req.json();

    if (!entity_name || !fk_data || !org_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const errors = [];

    // Validate foreign keys per entity
    if (entity_name === 'DailyLog' && fk_data.resident_id) {
      const residents = await base44.asServiceRole.entities.Resident.filter({ org_id, id: fk_data.resident_id });
      if (!residents || residents.length === 0) {
        errors.push(`Resident ${fk_data.resident_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'DailyLog' && fk_data.worker_id) {
      const staff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id, id: fk_data.worker_id });
      if (!staff || staff.length === 0) {
        errors.push(`Staff ${fk_data.worker_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'DailyLog' && fk_data.home_id) {
      const homes = await base44.asServiceRole.entities.Home.filter({ org_id, id: fk_data.home_id });
      if (!homes || homes.length === 0) {
        errors.push(`Home ${fk_data.home_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'Resident' && fk_data.home_id) {
      const homes = await base44.asServiceRole.entities.Home.filter({ org_id, id: fk_data.home_id });
      if (!homes || homes.length === 0) {
        errors.push(`Home ${fk_data.home_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'Resident' && fk_data.key_worker_id) {
      const staff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id, id: fk_data.key_worker_id });
      if (!staff || staff.length === 0) {
        errors.push(`Key Worker ${fk_data.key_worker_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'Resident' && fk_data.team_leader_id) {
      const staff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id, id: fk_data.team_leader_id });
      if (!staff || staff.length === 0) {
        errors.push(`Team Leader ${fk_data.team_leader_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'VisitReport' && fk_data.resident_id) {
      const residents = await base44.asServiceRole.entities.Resident.filter({ org_id, id: fk_data.resident_id });
      if (!residents || residents.length === 0) {
        errors.push(`Resident ${fk_data.resident_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'VisitReport' && fk_data.worker_id) {
      const staff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id, id: fk_data.worker_id });
      if (!staff || staff.length === 0) {
        errors.push(`Worker ${fk_data.worker_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'HomeTask' && fk_data.home_id) {
      const homes = await base44.asServiceRole.entities.Home.filter({ org_id, id: fk_data.home_id });
      if (!homes || homes.length === 0) {
        errors.push(`Home ${fk_data.home_id} not found in org ${org_id}`);
      }
    }

    if (entity_name === 'HomeTask' && fk_data.assigned_to_id) {
      const staff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id, id: fk_data.assigned_to_id });
      if (!staff || staff.length === 0) {
        errors.push(`Staff ${fk_data.assigned_to_id} not found in org ${org_id}`);
      }
    }

    if (errors.length > 0) {
      return Response.json({ 
        success: false, 
        errors,
        entity_name 
      }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      message: 'All foreign keys valid',
      entity_name 
    });
  } catch (error) {
    console.error('Error validating foreign keys:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});