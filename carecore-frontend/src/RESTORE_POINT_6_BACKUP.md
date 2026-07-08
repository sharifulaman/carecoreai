# Restore Point 6 — Staff Availability Profile System

**Date:** 2026-04-24

## What Was Done

### 1. Three New Entities Created

- **`StaffAvailabilityProfile`** — Master availability record per staff member:
  - Contracted hours, employment type (full_time, part_time, bank, agency, zero_hours)
  - Max hours/day, max consecutive days, min rest between shifts (enforced ≥ 11h legal minimum)
  - Preferred and hard-blocked shift types (morning, afternoon, night, sleeping)
  - Fixed and preferred days off
  - Qualifications: sleep-in, waking night, driving licence, vehicle available
  - Training records: first aid, medication, manual handling, safeguarding (with expiry dates)

- **`StaffWeeklyAvailability`** — 7-day recurring pattern per staff member:
  - Per-day availability toggle, available_from / available_until times
  - Preferred shift type per day (morning, afternoon, night, sleeping, any, none)
  - Optional day-level notes

- **`StaffAvailabilityOverride`** — Date-specific exceptions:
  - Types: unavailable, available, holiday, sick, training, lieu_day, other
  - Date range with optional time slots (all_day or specific times)
  - Approval workflow: holiday requires TL/admin approval, sick/training auto-approved
  - Tracks submitted_by, approved_by, approved_at

### 2. Availability Side Panel (`components/staff/availability/AvailabilityPanel.jsx`)
Slides in from the right when clicking "Availability" on any staff card. Contains 4 tabs:

- **Profile tab** (`AvailabilityProfileTab.jsx`):
  - Set/edit working pattern (contracted hours, employment type, rest limits)
  - Shift type preferences vs hard restrictions (with conflict detection)
  - Fixed days off + preferred days off (with conflict detection)
  - Business rule enforcement: min_rest_hours_between_shifts cannot go below 11
  - Auto-creates 7 StaffWeeklyAvailability records when a profile is first created

- **Weekly tab** (`WeeklyPatternTab.jsx`):
  - One card per day, individually toggled on/off
  - Time range and shift preference per day
  - Fixed days (from profile) shown as locked/read-only
  - Each day saved independently

- **Overrides & Leave tab** (`OverridesTab.jsx`):
  - Pending holiday approval section (admin/TL only)
  - Approve/decline buttons for pending requests
  - Upcoming and past overrides with colour-coded type badges
  - Support workers see "Submit Request" (holidays → pending approval)
  - Admin/TL see "Add Override" (all types, auto-approved)

- **Training/Qualifications tab** (`QualificationsTab.jsx`):
  - DBS read-only (sourced from StaffProfile)
  - Toggles + expiry dates for: medication training, first aid, manual handling, safeguarding
  - Expiry badges: green (valid), yellow (<60d), amber (<30d), red (<7d or expired)
  - Sleep-in, waking night, driving licence qualifications
  - Read-only view for support workers, editable for admin/TL

### 3. Availability Overview Tab (`components/staff/availability/AvailabilityOverviewTab.jsx`)
Added as a new "Availability" tab on the main Staff & HR page (admin/TL only):

- **Weekly Grid view**: colour-coded 7-day grid for current week
  - 🟢 Green = available, 🔴 Red = unavailable/fixed off
  - 🔵 Blue = approved holiday, 🟡 Amber = pending holiday
  - 🟣 Purple = training/lieu, ⬜ White dashed = no profile
  - Hover tooltips with shift times and override details
  - Click any cell or name → opens AvailabilityPanel for that staff
  - Filter by home

- **Expiring Certifications view**: table of all staff with certs expiring within 60 days
  - DBS, First Aid, Medication Training, Manual Handling, Safeguarding
  - Status badges: expired, <7 days, <30 days, <60 days
  - "View Profile" button links directly to Training tab

### 4. Staff Page Updates (`pages/Staff.jsx`)
- "Availability" button added to every staff card (Calendar icon)
- New "Availability" tab added to main tab bar
- Role colours/labels extended: admin, finance, hr, regional_manager, rsm
- StaffForm role selector extended with all new roles

### 5. Sample Data Seeded
All 10 active staff members have full availability profiles:

| Staff | Role | Pattern |
|---|---|---|
| Kk | team_leader | Mon–Fri office hours, no sleep-ins |
| Sarah Mitchell | team_leader | Mon–Fri primary, occasional Sat morning |
| James Okafor | team_leader | Full week, waking night qualified |
| Priya Sharma | team_leader | Mon–Sat, no nights or sleep-ins |
| David Nkosi | support_worker | Mon/Tue/Thu/Fri/Sat, sleep-in qualified |
| Emma Clarke | support_worker | Part-time, Mon–Thu + Sun, no Sat |
| Mohammed Ali | support_worker | Afternoon/night pattern, Tue–Sat |
| Nia Thomas | support_worker | Part-time, Mon–Wed + Fri, day shifts only |
| Callum Davies | support_worker | Flexible 6-day rota, sleep-in qualified |
| Fatima Hassan | support_worker | Part-time, Mon/Tue/Thu/Fri + sleep-in Fri |
| Leon Brooks | team_leader | Mon–Sat TL pattern, covers 2 homes |

**8 overrides seeded:**
- Sarah Mitchell: approved holiday 5–9 May
- Emma Clarke: pending holiday 12–16 May
- Mohammed Ali: sickness 22–24 Apr (auto-approved)
- David Nkosi: training day 28 Apr (approved)
- Callum Davies: lieu day 25 Apr (approved)
- James Okafor: approved holiday 19–23 May
- Nia Thomas: training day 1 May (approved)
- Fatima Hassan: pending holiday 2–6 Jun

## How to Roll Back to Restore Point 4
1. Delete entity files: `StaffAvailabilityProfile.json`, `StaffWeeklyAvailability.json`, `StaffAvailabilityOverride.json`
2. Delete component folder: `components/staff/availability/`
3. Revert `pages/Staff.jsx` — remove `availPanel` state, `AvailabilityPanel`, `AvailabilityOverviewTab` imports and usages, remove "Availability" tab, restore original `StaffCard` without the Availability button, restore original `roleColors`/`roleLabels`
4. Clear seeded records from the three new entities

## Current File State
### New Files
- `entities/StaffAvailabilityProfile.json`
- `entities/StaffWeeklyAvailability.json`
- `entities/StaffAvailabilityOverride.json`
- `components/staff/availability/AvailabilityPanel.jsx`
- `components/staff/availability/AvailabilityProfileTab.jsx`
- `components/staff/availability/WeeklyPatternTab.jsx`
- `components/staff/availability/OverridesTab.jsx`
- `components/staff/availability/QualificationsTab.jsx`
- `components/staff/availability/AvailabilityOverviewTab.jsx`

### Modified Files
- `pages/Staff.jsx` — availability panel, new tab, role colours
- `components/staff/StaffForm.jsx` — extended role selector