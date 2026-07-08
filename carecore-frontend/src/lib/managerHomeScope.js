// Home-based data scoping for the Manager Dashboard (Team Leader / Team Manager /
// Regional Manager). A Team Leader must only ever see the homes they are assigned to
// — never the whole organisation. Admin and RSM have organisation-wide visibility,
// matching how the rest of the app already treats those two roles (see roleConfig.js
// MANAGER_ROLES / isAdminRole checks).
//
// Team Manager and Regional Manager are ALSO treated as unrestricted for now — not
// because they should see everything by design, but because there's currently no
// data anywhere recording "which Team Leaders report to this Team Manager" or "which
// Team Managers report to this Regional Manager". Without that reporting hierarchy,
// scoping them to only their own direct home assignments would show them next to
// nothing (they don't typically get personally assigned to homes — their Team
// Leaders do). Revisit this once that hierarchy exists; see JIRA TL/TM/RM Dashboard
// subtask for the proper fix (option 2 — build the reporting hierarchy).
//
// IMPORTANT: this app currently records "which homes is this staff member assigned
// to" in more than one place:
//   1. StaffProfile.home_ids — a simple legacy array field.
//   2. StaffServiceAssignment records — created via the "Assign" button on the
//      Staff & HR page (StaffServiceAssignmentForm.jsx), with service type,
//      accommodation category, allocation % etc. This is what that screen actually
//      writes to, NOT home_ids, so the two can disagree.
// The backend already reconciles #2 for us: every Home returned by GET /entities/Home
// carries a computed `assigned_staff_ids` field (handlers/entity.go,
// populateHomeStaffAssignments) listing every staff ID with an active
// StaffServiceAssignment for that home, for any role. We use that plus the legacy
// home_ids field so a home counts as "assigned" via either route.

const UNRESTRICTED_ROLES = new Set(["admin", "rsm", "team_manager", "regional_manager"]);

/**
 * Returns the list of home IDs the given staff member is allowed to see, or `null`
 * if they can see every home in the organisation (admin/rsm). `homes` should be the
 * full list of Home records already fetched for the page (each carrying the
 * backend-computed `assigned_staff_ids` — see note above).
 */
export function getMyHomeIds(staffProfile, homes = []) {
  if (!staffProfile) return [];
  if (UNRESTRICTED_ROLES.has(staffProfile.role)) return null;
  const legacyHomeIds = Array.isArray(staffProfile.home_ids) ? staffProfile.home_ids : [];
  const assignedHomeIds = (homes || [])
    .filter(h => (h.assigned_staff_ids || []).includes(staffProfile.id))
    .map(h => h.id);
  return Array.from(new Set([...legacyHomeIds, ...assignedHomeIds]));
}

/**
 * Combines the manager's own remit with the "Home" filter dropdown selection into
 * one effective list of home IDs to scope every widget by. Returns `null` when
 * there's no restriction at all (unrestricted role + "All homes" selected).
 */
export function resolveEffectiveHomeIds(myHomeIds, homeFilter) {
  if (myHomeIds === null) {
    return homeFilter === "all" ? null : [homeFilter];
  }
  if (homeFilter === "all") return myHomeIds;
  // Guard against a selection outside the manager's own remit — fall back to their
  // full remit rather than silently showing nothing or, worse, another home's data.
  return myHomeIds.includes(homeFilter) ? [homeFilter] : myHomeIds;
}

/** Filters any list of records that carry a `home_id` field (Resident, DailyLog, etc). */
export function scopeToHomes(records, homeIds) {
  if (homeIds === null) return records;
  const allowed = new Set(homeIds);
  return records.filter(r => allowed.has(r.home_id));
}

/** Filters Home records themselves, which are keyed by `id`, not `home_id`. */
export function scopeHomesList(homes, homeIds) {
  if (homeIds === null) return homes;
  const allowed = new Set(homeIds);
  return homes.filter(h => allowed.has(h.id));
}

/** Filters StaffProfile records — a match if ANY of their assigned homes is allowed. */
export function scopeStaffToHomes(staff, homeIds) {
  if (homeIds === null) return staff;
  const allowed = new Set(homeIds);
  return staff.filter(s => (s.home_ids || []).some(hid => allowed.has(hid)));
}
