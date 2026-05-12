import { base44 } from '@/api/base44Client';

/**
 * Secure Query Wrapper with RLS Enforcement
 * Enforces org_id isolation and role-based access control at query layer
 * Use this instead of direct entity queries for sensitive data
 */

export async function secureQueryWithRBAC(entityName, filters = {}, sort = '-created_date', limit = 100) {
  try {
    // Get current user & staff profile
    const user = await base44.auth.me();
    if (!user) throw new Error('Unauthorized');

    const staffProfiles = await base44.entities.StaffProfile.filter(
      { user_id: user.id },
      '-created_date',
      1
    );

    if (!staffProfiles || staffProfiles.length === 0) {
      throw new Error('No staff profile found');
    }

    const staffProfile = staffProfiles[0];
    const { org_id, role, home_ids = [] } = staffProfile;

    // Always enforce org_id
    const secureFilters = { ...filters, org_id };

    // Role-based access control
    if (role === 'admin') {
      // Admins see all data in org
      return await base44.entities[entityName].filter(secureFilters, sort, limit);
    }

    if (role === 'team_leader') {
      // Team leaders see data from homes they lead
      if (['DailyLog', 'VisitReport', 'HomeCheck', 'AccidentReport', 'HomeLog', 'Resident'].includes(entityName)) {
        secureFilters.home_id = { $in: home_ids };
      }
      if (entityName === 'Home') {
        secureFilters.id = { $in: home_ids };
      }
      return await base44.entities[entityName].filter(secureFilters, sort, limit);
    }

    if (role === 'support_worker') {
      // Support workers see data from assigned homes only
      if (['DailyLog', 'VisitReport', 'HomeCheck', 'AccidentReport', 'HomeLog', 'Resident'].includes(entityName)) {
        secureFilters.home_id = { $in: home_ids };
      }
      if (entityName === 'Home') {
        secureFilters.id = { $in: home_ids };
      }
      return await base44.entities[entityName].filter(secureFilters, sort, limit);
    }

    throw new Error('Unknown role');
  } catch (error) {
    console.error(`RLS Query Error (${entityName}):`, error);
    throw error;
  }
}

/**
 * Secure Single Record Access
 * Verifies user has access to the specific record
 */
export async function secureGetRecord(entityName, recordId) {
  try {
    const user = await base44.auth.me();
    if (!user) throw new Error('Unauthorized');

    const staffProfiles = await base44.entities.StaffProfile.filter(
      { user_id: user.id },
      '-created_date',
      1
    );

    if (!staffProfiles || staffProfiles.length === 0) {
      throw new Error('No staff profile found');
    }

    const staffProfile = staffProfiles[0];
    const { org_id, role, home_ids = [] } = staffProfile;

    // Fetch record (will fail if not found)
    const record = await base44.entities[entityName].filter({ id: recordId }, '-created_date', 1);
    if (!record || record.length === 0) throw new Error('Record not found');

    const item = record[0];

    // Verify org isolation
    if (item.org_id !== org_id) throw new Error('Access denied');

    // Verify home access for restricted entities
    if (['DailyLog', 'VisitReport', 'HomeCheck', 'AccidentReport', 'HomeLog', 'Home', 'Resident'].includes(entityName)) {
      const checkHomeId = item.home_id || item.id;
      if (role !== 'admin' && !home_ids.includes(checkHomeId)) {
        throw new Error('Access denied');
      }
    }

    return item;
  } catch (error) {
    console.error(`Secure Get Error (${entityName}):`, error);
    throw error;
  }
}