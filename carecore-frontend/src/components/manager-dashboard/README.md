# Feature: Manager Dashboard (Team Leader / Team Manager / Regional Manager)

Live oversight dashboard for care operations: home health, young people status,
staff/shift coverage, approvals, missed checklists, compliance snapshot, and an
action-centre table. Entry point is [`src/pages/UNVSL_Dashboard.jsx`](../../pages/UNVSL_Dashboard.jsx),
routed at `/manager-dashboard`. Built from the client's base44 export and made
functional against our own Go backend (JIRA: *TL/TM/RM Dashboard*).

## Who sees what

Every widget takes an `orgId` and `homeIds` prop from the page, resolved in
[`src/lib/managerHomeScope.js`](../../lib/managerHomeScope.js):

| Role | Sees |
|---|---|
| `admin`, `rsm` | Every home in the organisation |
| `team_manager`, `regional_manager` | Every home in the organisation — **stopgap**, see below |
| `team_leader` | Only the homes they're assigned to |
| `support_worker` | Not shown this dashboard (has its own, `SWDashboard.jsx`) |

**Why Team Manager/Regional Manager are unrestricted:** properly scoping them
would mean "every home my Team Leaders cover" / "every home my region covers",
but nothing in the data model yet records which Team Leaders report to which
Team Manager, or which Team Managers report to which Regional Manager. Without
that reporting hierarchy, restricting them to only their *own* direct home
assignment would show them next to nothing (managers don't typically get
personally assigned to homes — their Team Leaders do). Until that hierarchy
exists, they're treated like Admin. **Follow-up ticket:** build the real
TL → TM → RM reporting hierarchy and tighten this back down.

### Two sources of "which homes is this person assigned to" — check both

This app records home assignments in two places that are **not kept in sync**:

1. `StaffProfile.home_ids` — a simple legacy array field.
2. `StaffServiceAssignment` records — created by the "Assign" button on the
   Staff & HR page (`StaffServiceAssignmentForm.jsx`). **This is what that
   screen actually writes to**, not `home_ids`.

The backend folds #2 into every `Home` record automatically — see
`assigned_staff_ids` on the `Home` model (`carecore-backend/models/home.go`,
populated in `handlers/entity.go` → `populateHomeStaffAssignments`). `getMyHomeIds()`
checks both `home_ids` and `assigned_staff_ids` so a home assigned through
*either* screen counts. If a Team Leader reports an empty dashboard, check both
places before assuming it's a bug — see the regression test in
[`src/tests/managerHomeScope.test.js`](../../tests/managerHomeScope.test.js) for
the exact incident this was written to prevent (a Team Leader with empty
`home_ids` but a valid `StaffServiceAssignment` saw nothing until this was fixed).

**Follow-up ticket:** pick one of these two as the actual source of truth
(almost certainly `StaffServiceAssignment`, since that's what the UI writes to)
and either migrate `home_ids` away or keep it in sync automatically.

## The "Home" filter

The dropdown in the header narrows `homeIds` further via `resolveEffectiveHomeIds()`.
Selecting a home outside the viewer's own remit is guarded against — it falls
back to their full remit rather than silently showing nothing or, worse,
leaking another home's data.

## The role badge

The old "Team Leader / Team Manager / Regional Manager" buttons at the top used
to be a non-functional toggle. It's now a read-only "Viewing as: {role}" label —
see the comment above `UNRESTRICTED_ROLES` in `UNVSL_Dashboard.jsx` for why this
isn't a "view as a different role" control (same reporting-hierarchy gap as above).

## Audit logging

Opening a section that reveals **named** safeguarding cases, missing-from-home
episodes, or the individual young-people list logs a `view` entry via
`src/lib/logAudit.js` (GDPR Article 5(2) / Ofsted compliance — the same helper
used elsewhere for payslips, disciplinary records, etc.). Summary stat counts,
appointments, support plans, and risk plans are **not** logged — only the
case-identifying views, to keep the audit trail meaningful rather than flooded.
See `AUDITED_SECTIONS` in `ManagerKPIBanner.jsx` / `YoungPeopleStatusWidget.jsx`.

## Known scale limitation (not yet fixed)

`SafeguardingRecord` and `HomeCheckCompletion` queries still fetch without a
status filter (unlike `MissingFromHome` and `AttendanceLog`, which were fixed).
As an org's historical data grows past the backend's default 500-row cap, an
old-but-still-open case could theoretically be pushed out of the fetched window.
Different widgets need different subsets of this data (some want only "open"
cases, `ComplianceSnapshotWidget` genuinely needs the full historical set for a
closure-rate ratio), so fixing this safely means giving those queries distinct
React Query cache keys per subset — deliberately not rushed in this pass.

## File map

- `src/pages/UNVSL_Dashboard.jsx` — the page: header, home filter, role badge, refresh, layout.
- `src/lib/managerHomeScope.js` — all the scoping/filtering logic above, unit tested.
- `src/components/manager-dashboard/WidgetStatus.jsx` — shared loading/error UI.
- `ManagerKPIBanner.jsx`, `HomeHealthTable.jsx`, `YoungPeopleStatusWidget.jsx`,
  `TeamShiftWidget.jsx`, `ApprovalQueueWidget.jsx`, `MissedChecksWidget.jsx`,
  `ComplianceSnapshotWidget.jsx`, `DashboardActionsTable.jsx` — the eight widgets.

## Tests

`src/tests/managerHomeScope.test.js` (scoping logic), `managerDashboardAuditLog.test.jsx`
(audit logging fires/doesn't fire correctly), `managerDashboardAccessibility.test.jsx`
(modals are keyboard/screen-reader accessible). Run with `npm test` or
`npx vitest run src/tests/managerHomeScope.test.js src/tests/managerDashboardAuditLog.test.jsx src/tests/managerDashboardAccessibility.test.jsx`.
