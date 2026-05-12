# RESTORE POINT 11 — 30 April 2026

## Summary of state at this restore point

### Recent changes since last restore point:
1. **Bell notification dropdown** — scroll-to-bottom triggers a refetch to pull new data
2. **Logo updated** — new CareCore AI logo image applied to sidebar (`AppSidebar`) and landing page nav (`HeroSection`)
3. **Nightly automation created** — `nightlyAlerts` backend function scheduled daily at 07:00 (UTC 06:00) checking DBS expiry, training expiry, overdue supervisions, overdue appraisals
4. **Accident/Incident reporting** — notifications now fire to TL/admin on new report creation (high priority if hospital attendance)
5. **HR Module fully documented** — comprehensive internal documentation written covering all tabs, schemas, connected modules, gaps

---

## HR Module State (as of this restore point)

### Working Features:
- HR Dashboard: stat cards, training matrix, charts, DBS expiry panel, auto-notifications
- Leave Management: requests, approve/reject, leave balances, Bradford Factor detection, calendar (list view)
- Supervision & Appraisals: log sessions, overdue alerts, star ratings
- Disciplinary & Grievance: log records, admin-only access
- Timesheets & Payroll: approve timesheets, generate payslips, print payslips, creates HomeExpense on approval
- Staff Profile Modal: 6 tabs (Personal, Employment, Pay & Bank, DBS, Documents, Notes), photo upload, masked sensitive fields
- Training Courses: OFSTED seed courses (21), add/edit/delete training requirements, training matrix
- HR Policy: full policy configuration saved to Organisation.hr_policy
- Rota view: read-only weekly grid with conflict and availability detection
- Availability: weekly patterns, overrides, qualifications per staff member
- Nightly automated alerts at 07:00 daily

### Known Gaps:
- Staff profile has no edit form (display-only)
- No timesheet creation UI (must be seeded)
- Payroll deductions are manual (no PAYE engine)
- Leave calendar is flat list, not real grid
- Audit trail not connected to HR writes
- Leave clash detection not enforced
- Carry-over automation missing
- Most HR policy values not consumed by code
- Disciplinary/Supervision records have no edit/delete
- next_appraisal_date never populated
- No payslip email delivery
- No HMRC RTI export

---

## Key Entities
- StaffProfile, TrainingRecord, TrainingRequirement
- SupervisionRecord, AppraisalRecord
- LeaveRequest, LeaveBalance
- DisciplinaryRecord
- Timesheet, TimesheetEntry, Payslip, PayPeriod
- Organisation (hr_policy embedded)
- Notification, AuditTrail
- Shift, AttendanceLog
- StaffWeeklyAvailability, StaffAvailabilityOverride, StaffAvailabilityProfile

## Key Files
- pages/Staff.jsx — main HR page, all tab routing
- components/staff/tabs/HRDashboardTab.jsx
- components/staff/tabs/LeaveManagementTab.jsx
- components/staff/tabs/SupervisionTab.jsx
- components/staff/tabs/DisciplinaryTab.jsx
- components/staff/tabs/TimesheetsTab.jsx
- components/staff/tabs/StaffProfileModal.jsx
- components/staff/tabs/StaffRotaTab.jsx
- components/staff/tabs/HRPolicyTab.jsx
- components/staff/training/TrainingCoursesTab.jsx
- components/staff/training/TrainingMatrix.jsx
- components/staff/training/TrainingCharts.jsx
- components/staff/training/useTrainingData.jsx
- components/staff/availability/AvailabilityPanel.jsx
- components/staff/availability/AvailabilityOverviewTab.jsx
- functions/nightlyAlerts.js
- lib/createNotification.js

## Routes & Navigation
- /staff — main HR module
- /dashboard — admin dashboard
- /messages — notifications centre
- All other routes unchanged from previous restore points