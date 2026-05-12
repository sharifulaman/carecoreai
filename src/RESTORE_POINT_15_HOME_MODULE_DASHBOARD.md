# RESTORE POINT 15 — Home Module Dashboard & Young Person Workspace

**Date:** 2026-05-08  
**Status:** ✅ Stable

---

## What Was Built / Changed in This Session

### 1. YoungPersonWorkspace (`pages/YoungPersonWorkspace`)
- Fully refactored from a tabbed interface into a **single scrollable dashboard layout**
- Profile header with avatar, age, risk badges, key worker, education status
- 6 KPI cards: Open Incidents, Active Risks, Upcoming Appointments, Education Status, Missing Episodes, Outstanding Actions
- 3-column info section: About, Current Care Summary, Recent Activity
- Right panel: Activity Timeline + Documents & Compliance alerts
- 4 section preview panels with internal mini-tabs:
  - **Care & Risk**: Care Plan, Risks, Behaviour, Incidents, Missing
  - **Health & Development**: Health, Therapeutic Plan, Appointments, Achievements
  - **Daily Life**: Education, Family Contact, Activities, Housing, Finance
  - **Records & Compliance**: Daily Logs, Visit Reports, Documents, Complaints

---

### 2. HomesHub (`pages/HomesHub`)
- 5-tab structure: Dashboard, My Homes, Compliance & Audits, Maintenance & Issues, Occupancy & Finance
- Support Worker role hides Dashboard, Compliance, Occupancy tabs
- Passes `onTabChange` to dashboard for cross-tab navigation

---

### 3. HomeModuleDashboard (`components/homes/dashboard/HomeModuleDashboard.jsx`)
**New comprehensive operational dashboard:**
- **Header** with 4 action buttons: Add Home, Log Issue, Add Bill, View Reports
- **6 KPI Cards** (all clickable → open detail modals):
  - Active Homes
  - Occupied Beds
  - Occupancy Rate
  - Open Compliance Alerts
  - Rent Attention Needed
  - Open Maintenance Issues
- **3 Charts**:
  - Compliance Health by Home (stacked horizontal bar)
  - Occupancy Trend last 6 months (line chart)
  - Expiring Documents & Leases next 6 months (bar chart)
- **Finance & Issues Row**:
  - Monthly Rent Snapshot (collected/pending/overdue)
  - Outstanding Bills by Home
  - Recent Issues / Tickets summary
- **Homes Overview** grid with search + type filter, per-home cards showing: status, address, TL, occupancy %, alert badges (overdue rent, lease expiring, DBS expiring, doc expired, open issues)
- **Recent Activity** feed
- **Modals**: ActiveHomes, Occupancy, ComplianceAlerts, Bills, Maintenance, LogIssue, AddBill, Reports, AddHome

---

### 4. MaintenanceIssuesTab (`components/homes/tabs/MaintenanceIssuesTab.jsx`)
- Full CRUD for maintenance issues
- Summary cards: Open, In Progress, High Priority, Resolved
- Filters: Home, Priority, Status
- Table with edit capability

---

### 5. ComplianceAuditsTab (`components/homes/tabs/ComplianceAuditsTab.jsx`)
- Aggregates data from HomeDocument, Home cert fields (gas, electrical, fire, lease), and Staff DBS
- Status: Expired / Due Soon (90 days) / Current
- Summary cards + full table with days remaining

---

### 6. OccupancyFinanceTab (`components/homes/tabs/OccupancyFinanceTab.jsx`)
- Occupancy by home table with progress bars
- Bills & Finance summary table

---

## Key Files Modified

| File | Change |
|------|--------|
| `pages/YoungPersonWorkspace` | Full rewrite — scrollable dashboard |
| `pages/HomesHub` | Added 5-tab structure with new tab components |
| `components/homes/dashboard/HomeModuleDashboard.jsx` | New — full dashboard |
| `components/homes/tabs/MaintenanceIssuesTab.jsx` | New |
| `components/homes/tabs/ComplianceAuditsTab.jsx` | New |
| `components/homes/tabs/OccupancyFinanceTab.jsx` | New |

---

## Data Sources Used

| Entity | Used For |
|--------|----------|
| `Home` | Active homes, lease expiry, cert expiry, rent status |
| `Resident` | Occupancy counts, workspace data |
| `StaffProfile` | DBS expiry, key worker, team leader |
| `Bill` | Pending bills, outstanding amounts |
| `MaintenanceLog` | Open issues, priorities |
| `HomeDocument` | Compliance alerts, expiry tracking |
| `HomeExpense` | Finance overview |
| `MissingFromHome` | Missing episodes in workspace |
| `AccidentReport` | Incidents in workspace |
| `RiskAssessment` | Active risks in workspace |
| `Appointment` | Upcoming appointments in workspace |
| `DailyLog` | Recent activity in workspace |
| `VisitReport` | Records & compliance |
| `Complaint` | Open complaints |
| `SafeguardingRecord` | Safeguarding panel |
| `SupportPlan` / `BehaviourSupportPlan` / `TherapeuticPlan` | Care summary |
| `PathwayPlan` | Housing/finance section |
| `FamilyContact` | Family contact tab |
| `Achievement` | Health & dev tab |
| `MedicationRecord` | Health summary |
| `ResidentDocument` | Documents & compliance |

---

## Architecture Notes

- All data fetched via `secureGateway` or `base44.entities` with TanStack Query
- Role-based tab visibility in HomesHub (SW cannot see Dashboard/Compliance/Occupancy)
- `ORG_ID = "default_org"` used consistently
- Modals are self-contained inline components within HomeModuleDashboard
- YPWorkspace uses `useOutletContext` for `user` and `staffProfile`

---

## Previous Restore Points
- RESTORE_POINT_14_COMPLIANCE_DASHBOARD.md
- RESTORE_POINT_13_OFSTED_QS7_FEATURES.md
- RESTORE_POINT_12_COMPREHENSIVE_RESIDENT_DATA.md
- RESTORE_POINT_11_BACKUP.md
- RESTORE_POINT_10_BACKUP.md