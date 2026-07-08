import { base44 } from '@/api/base44Client';

/**
 * Secure Query Wrapper with RLS Enforcement
 * Enforces org_id isolation and role-based access control at query layer
 * Use this instead of direct entity queries for sensitive data
 */

// Team Manager and Regional Manager are treated the same as admin (org-wide, no home
// filtering) for the same reason as src/lib/managerHomeScope.js: there's no data yet
// recording which Team Leaders/homes report to a given Team Manager or Regional
// Manager, so scoping them to only their own direct assignments would show them next
// to nothing. Revisit once that reporting hierarchy exists.
const UNRESTRICTED_ROLES = new Set(['admin', 'team_manager', 'regional_manager']);

// resolveHomeIds combines StaffProfile.home_ids with any active StaffServiceAssignment
// for this staff member. The Staff & HR "Assign" screen (StaffServiceAssignmentForm.jsx)
// writes assignments there, not to home_ids, so relying on home_ids alone misses any
// home assigned through that screen. See src/lib/managerHomeScope.js for the same
// reasoning applied to the Manager Dashboard.
async function resolveHomeIds(staffProfile) {
  const legacyHomeIds = Array.isArray(staffProfile.home_ids) ? staffProfile.home_ids : [];
  let assignmentHomeIds = [];
  try {
    const assignments = await base44.entities.StaffServiceAssignment.filter({ staff_id: staffProfile.id, active: true });
    assignmentHomeIds = (assignments || []).map(a => a.home_id).filter(Boolean);
  } catch (_) {
    // Fall back to home_ids only if the assignment lookup fails.
  }
  return Array.from(new Set([...legacyHomeIds, ...assignmentHomeIds]));
}

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
    const { org_id, role } = staffProfile;

    // Always enforce org_id
    const secureFilters = { ...filters, org_id };

    // Role-based access control
    if (UNRESTRICTED_ROLES.has(role)) {
      // Admins, Team Managers and Regional Managers see all data in org (see note above)
      return await base44.entities[entityName].filter(secureFilters, sort, limit);
    }

    if (role === 'team_leader') {
      // Team leaders see data from homes they lead
      const home_ids = await resolveHomeIds(staffProfile);
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
      const home_ids = await resolveHomeIds(staffProfile);
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
    const { org_id, role } = staffProfile;

    // Fetch record (will fail if not found)
    const record = await base44.entities[entityName].filter({ id: recordId }, '-created_date', 1);
    if (!record || record.length === 0) throw new Error('Record not found');

    const item = record[0];

    // Verify org isolation
    if (item.org_id !== org_id) throw new Error('Access denied');

    // Verify home access for restricted entities
    if (['DailyLog', 'VisitReport', 'HomeCheck', 'AccidentReport', 'HomeLog', 'Home', 'Resident'].includes(entityName)) {
      const checkHomeId = item.home_id || item.id;
      if (!UNRESTRICTED_ROLES.has(role)) {
        const home_ids = await resolveHomeIds(staffProfile);
        if (!home_ids.includes(checkHomeId)) {
          throw new Error('Access denied');
        }
      }
    }

    return item;
  } catch (error) {
    console.error(`Secure Get Error (${entityName}):`, error);
    throw error;
  }
}