# RESTORE POINT 16 — Residents / Young People Architecture
**Date:** 2026-05-20
**Status:** Stable — Pre-refactor snapshot

---

## 1. BUSINESS CONTEXT

This is a **single-organisation** care management platform for **Bright Sky Youth Services**.
- All data is scoped to `org_id = "default_org"` (constant: `ORG_ID`)
- **Residents = Young People (YP)** — the central entity. Everything else revolves around them.
- Staff are linked via `StaffProfile` (separate from the base44 `User` entity)
- Homes are properties where residents live. Each resident has a `home_id`.

---

## 2. RESIDENT ENTITY — KEY FIELDS

Entity: `Resident`
- `org_id` — always "default_org"
- `home_id` — which home they live in
- `display_name`, `initials`, `dob`, `gender`, `ethnicity`, `nationality`
- `key_worker_id` → FK to StaffProfile
- `team_leader_id` → FK to StaffProfile
- `placement_type` → "childrens_home" | "supported_accommodation" | "adult_care"
- `placement_start` — date
- `status` → "active" | "on_leave" | "moved_on" | "archived"
- `risk_level` → "low" | "medium" | "high" | "critical"
- `social_worker_name`, `social_worker_org` (= Local Authority), `iro_name`
- `privacy_mode` (boolean)
- Health: `nhs_number`, `gp_name`, `gp_practice`, `gp_phone`, `gp_email`, `gp_registered_date`, `medical_conditions[]`, `allergies[]`, `dentist_*`, `optician_*`, `health_notes`
- Education: `education_status`, `education_provider`, `education_course`, `education_enrolment_date`, `education_expected_end_date`, `education_days_attended[]`, `education_contact_*`, `education_notes`
- Finance: `bank_account_name`, `bank_name`, `bank_sort_code`, `bank_account_number`
- Legal: `solicitor_name`, `solicitor_firm`, `solicitor_phone`, `solicitor_email`, `solicitor_case_ref`
- Leisure: `leisure_gym_enrolled`, `leisure_gym_name`, `leisure_football_enrolled`, `leisure_interests`
- Outreach: `contracted_visits_per_week`, `minimum_contact_hours_per_week`

---

## 3. THREE SURFACES FOR RESIDENTS

### 3a. `/residents` — pages/Residents.jsx
**Primary module. All residents across all homes.**

**Navigation structure:**
- TOP_TABS: `overview`, `yp` (Resident Young People)
- GROUPS (5 groups, each with sub-tabs):
  1. **Care & Planning**: support-plans, placement-plan, pathway-plan, ils-plans, referrals
  2. **Safety & Safeguarding**: risk-assessment, behaviour-management, incidents, missing
  3. **Wellbeing**: health, therapeutic-plan, leisure, achievements
  4. **Life & Community**: education, finance-legal, housing, family-contact, appointments
  5. **Records & Compliance**: daily-logs-tab, visit-reports, welcome-pack, complaints

**Data fetched (all via secureGateway or base44.entities):**
- residents, homes, staff
- visitReports, dailyLogs, accidents, homeTasks, transitions
- supportPlans, ilsPlans, allAppointments
- mfhRecords (MissingFromHome — direct base44.entities)
- bodyMaps, allComplaints, significantEvents, reg44Reports
- supervisionRecords, medicationRecords, gpAppointments
- eetRecords, achievementsData, advocacyRecords, ypViews
- cicReports, therapeuticPlans, familyContacts
- riskAssessments, exploitationRisks, trainingRecords
- pathwayPlansData (PathwayPlan), placementPlansData (PlacementDetails)
- supportPlanSignoffs, laReviews, reg45Reviews, carePlans

**Key components used:**
- `YPOverviewDashboard` (compliance overview for all YP)
- `YPCardView` → `YPCard` → `YPCardExpanded` (the YP list with expand/collapse)
- `SupportPlansTab`, `ILSPlansTab`
- `RiskTab`, `ExploitationRiskTab`
- `BehaviourManagementForm`, `TherapeuticPlanForm`
- `LogIncidentTab`, `MissingTab`
- `HealthTab`, `LeisureTab`, `EducationTab`
- `FinanceLegalTab`, `FamilyContactTab`
- `AppointmentsTab`, `ComplaintsTab`
- `AchievementsTab`, `AdvocacyTab`
- `PlacementPlanTab`, `PathwayPlanTab`
- `WelcomePackTab`, `VisitReportsTab`
- `DailyLogTimeline`, `DailyLogModal`
- Modals: `CurrentStatusModal`, `NightStayModal`, `EducationAttendanceModal`, `MealIntakeModal`, `ILSPlanModal`

**Filters:** filterHomeId (home), filterAge, search (name), cardFilterHome, cardFilterFlagged

---

### 3b. `/18-plus` — pages/18Plus.jsx
**Filtered view. Only residents in homes with `type: "18_plus"`.**

**Tabs:** overview, residents, pathway, ils, moveon, pa, benefits, eet

**Data fetched:**
- 18+ homes (Home filtered by `type: "18_plus"`)
- residents filtered to only those in 18+ homes
- pathwayPlans, ilsPlans, appointments, staff
- transitions, allowances (ResidentAllowance), savings (ResidentSavings)

**Key components:**
- `EighteenPlusOverview` — dashboard KPIs
- `EighteenPlusResidents` — resident list with transfer/moved-on actions
- `PathwayPlansTabMain`, `ILSTabMain`, `MoveOnTabMain`
- `PATabMain` (Personal Adviser management)
- `BenefitsTabMain` (admin/admin_officer only)
- `EETTabMain` (Education, Employment, Training)

**NOTE:** Uses the SAME `Resident` entity — just filtered by home type.

---

### 3c. `/young-people/:residentId/workspace` — pages/YoungPersonWorkspace.jsx
**Per-resident deep dive. Accessed via "View Details" button on YP cards.**

**Two sections (nav tabs):**
1. `overview` — full dashboard for one resident
2. `yp-placement-journey` — YPJourneyTab (life story, journey stages, asylum records)

**Overview layout:**
- KPI row: Open Incidents, Active Risks, Upcoming Appointments, Education Status, Missing Episodes, Outstanding Actions
- 3-col: About / Current Care Summary / Recent Activity
- Right panel: Activity Timeline + Documents & Compliance
- 4-col section panels (MiniTabPanel each):
  - Care & Risk: Care Plan, Risks, Behaviour, Incidents, Missing
  - Health & Development: Health, Therapeutic Plan, Appointments, Achievements
  - Daily Life: Education, Family Contact, Activities, Housing, Finance
  - Records & Compliance: Daily Logs, Visit Reports, Documents, Complaints

**Data fetched (all resident-scoped):**
- resident (single), homes, staff
- accidents, riskAssessments, mfhRecords, appointments
- dailyLogs, visitReports, complaints, safeguardingRecords
- supportPlans, behaviourPlans, therapeuticPlans, pathwayPlans
- familyContacts, achievements, medicationRecords, residentDocuments

---

## 4. RESIDENT FORM (Add New Young Person)

Component: `components/residents/ResidentForm.jsx`

**Fields captured on creation:**
- display_name*, initials, dob, gender
- home_id*, team_leader_id, key_worker_id
- placement_type, placement_start
- nationality, uk_arrival_date
- social_worker_org (= Local Authority), social_worker_name, iro_name
- health_notes (general notes)
- risk_level

**Saved to:** `Resident` entity via parent (`pages/Residents` mutates with `secureGateway.create`)

---

## 5. YP CARD VIEW

Component: `components/residents/yp/YPCardView.jsx`
- Sorted by risk_level (critical → high → medium → low), then alphabetically
- Each card: `YPCard` (collapsed header) + `YPCardExpanded` (inline detail)
- Collapse/expand per card
- "View Details" button → navigates to `/young-people/:residentId/workspace`
- Status badges auto-generated: No log today, Flagged log, Face-to-face done, Severe allergy, Support plan due, ILS plan due, Transition active, All clear

**Filters passed in:** filterHomeId, filterFlagged

---

## 6. RELATED ENTITIES (linked to Resident via `resident_id`)

| Entity | Purpose |
|--------|---------|
| DailyLog | Daily shift logs, flagged entries, status/night/edu/meal flags |
| VisitReport | Support worker visit records |
| AccidentReport | Incident/accident records |
| SupportPlan | Active care/support plans |
| ILSPlan | Independent Living Skills plans |
| PathwayPlan | Statutory pathway planning (16+) |
| PlacementDetails | Placement-specific records |
| BehaviourSupportPlan | Behaviour management plans |
| TherapeuticPlan | Therapy plans |
| RiskAssessment | Risk assessments by category |
| ExploitationRisk | Modern slavery / exploitation risk |
| MissingFromHome | Missing episodes |
| Appointment | Appointments (GP, dental, etc.) |
| FamilyContact | Family contact log |
| Complaint | Complaints & representations |
| Achievement | Positive achievements |
| AdvocacyRecord | Advocacy support |
| YPViewsRecord | Young person's views |
| EETRecord | Education/Employment/Training records |
| MedicationRecord | Medication records |
| GPAppointment | GP appointment tracking |
| BodyMap | Body map injury records |
| ResidentDocument | Documents (welcome pack, sign-off) |
| WelcomePack | Welcome pack status |
| LAReview | Local Authority reviews |
| SafeguardingRecord | Safeguarding referrals |
| Transition | Move-on / transition records |
| ResidentAllowance | Weekly/monthly allowances |
| ResidentSavings | Savings tracking |
| CarePlan | Care plans |
| CICReport | Child in Care reports |

---

## 7. DOCUMENT TITLES (StaffDocument — for Staff, not Residents)

Document titles dropdown added to `components/staff/tabs/DocumentsTab.jsx`:
- **Employee Induction group:** Confirmation of Staff Form, HM Revenue & Customs, Medical Questionnaire/Health Certificate, Data Protection Form, National Insurance Number Letter
- Job Description/Interview Questions
- Reference
- Offer Letter
- DBS/Origin-country Police Check Certificate (Overseas Staff Only)
- Contract
- Identification/Right to Work
- Proof of Address / Driving Licence Check
- Curriculum Vitae (CV) / Application for Employment
- Qualification and Training
- Probation Period, Supervision, Reward, Yearly Appraisals and Complaints

Title auto-maps to `document_type` for grouping/filtering.

---

## 8. ROLE-BASED ACCESS TO RESIDENTS

| Role | Access |
|------|--------|
| admin | All residents across all homes |
| admin_officer | All residents (finance/admin focus) |
| team_leader | Residents in their assigned homes only |
| support_worker | Residents in their assigned homes only |

Enforced by `secureDataGateway` backend function via `applyScopeFilter`.

---

## 9. KEY ARCHITECTURAL RULES (do not break)

1. **Never create a new Resident entity.** All resident types (children's home, 18+, outreach) use the SAME `Resident` entity — differentiated by `home.type` and `placement_type`.
2. **secureGateway for all entity ops** — never call `base44.entities.*` directly for sensitive/scoped data (exception: `MissingFromHome` and `DailyLog` use direct calls in some places due to legacy).
3. **Do not duplicate forms.** ResidentForm is the single source of truth for creating residents. Do not create a separate "18+ form" or "outreach form".
4. **`/18-plus` is a filtered view**, not a separate resident system. It filters by `home.type === "18_plus"`.
5. **`/young-people/:residentId/workspace`** is the per-resident detail page. All "View Details" links point here.
6. **`org_id` is always injected** by secureGateway on create/update — don't worry about it in frontend forms.
7. **React Query cache keys** — always invalidate the right key after mutations:
   - `["all-residents"]` — main residents list
   - `["18plus-residents"]` — 18+ filtered list
   - Entity-specific keys (e.g. `["risk-assessments-all"]`)

---

## 10. NAVIGATION ROUTES

| Route | Component | Who sees it |
|-------|-----------|-------------|
| /residents | Residents.jsx | admin, team_leader, support_worker |
| /18-plus | 18Plus.jsx | admin, admin_officer |
| /young-people/:residentId/workspace | YoungPersonWorkspace.jsx | all authenticated |
| /homes-hub | HomesHub.jsx | admin, team_leader, support_worker |
| /homes/:id | HomeDetail.jsx | admin, team_leader, support_worker |

---

## 11. KNOWN ISSUES / AREAS TO WATCH

- `DailyLog` and `MissingFromHome` use direct `base44.entities` calls in some places (bypassing secureGateway scope filter) — these should be migrated to secureGateway
- The `overview` tab in `/residents` uses `YPOverviewDashboard` (compliance dashboard) not `YPDashboard` — `YPDashboard` component exists but is not currently rendered in the main residents page
- `PlaceholderTab` components exist for "Housing & Transitions" and "Referrals" — not yet implemented
- `/18-plus` fetches its own copy of residents rather than sharing the cache with `/residents` — separate React Query keys (`18plus-residents` vs `all-residents`)

---

*Restore point created before any resident architecture refactoring.*