# Restore Point 4 — Care Module + Care Services Navigation

**Date:** 2026-04-24

## What Was Done

### 1. 16 New Care Entities Created
All entities are fully defined with comprehensive field schemas:

- `CareProfile` — Full care profile including diagnosis, mobility, MHA status, DoLS, LPA, DNACPR, GP, NOK, funding
- `CarePlan` — Versioned care plans with review tracking and LA copy management
- `CarePlanSection` — Domain-based care plan sections (personal_care, mobility, nutrition, medication, etc.)
- `BehaviourSupportPlan` — Behaviour of concern, triggers, proactive/reactive strategies
- `MentalCapacityAssessment` — MCA records with DoLS/MHA triggers, best interest decisions
- `MedicationRecord` — Full medication management including controlled drugs, covert administration, PRN
- `MAREntry` — Medication Administration Record entries with outcome tracking
- `ControlledDrugRegister` — CD register with running balance, witnessed entries
- `PRNProtocol` — PRN authorisation protocols with minimum interval rules
- `HealthObservation` — Vitals, fluid/food intake, mood, pressure area, behaviour ratings
- `GPAppointment` — All clinical appointments with capacity, outcome, referral tracking
- `HospitalAdmission` — Hospital admissions with NOK/LA notification, bed hold, discharge
- `PersonalCareRecord` — Shift-by-shift personal care records (bath, oral hygiene, continence, mood, etc.)
- `SafeguardingRecord` — Safeguarding concerns with LA/police/CQC notification and outcome
- `ComplianceEvidence` — CQC KLOE and LA monitoring evidence records
- `LAContractMonitoring` — LA quality visits, action plans, outcomes

### 2. Care Dashboard (`pages/Care.jsx`)
- Alert cards: Medication alerts (24h), Care plans due (2 weeks), Health alerts, Open safeguarding
- Home-by-home care needs breakdown (Low/Moderate/High/Complex)
- DoLS/MHA expiry warnings per home
- Personal care completion % per home

### 3. Resident Care Record (`pages/CareResident.jsx`)
7-tab resident care view:
- **Overview** — Care profile, legal status, key contacts
- **Care Plan** — Active plan + domain sections
- **Medication & MAR** — Active medications table
- **Health & Observations** — Observations with alert highlighting
- **Personal Care** — Shift records with mood, skin, meals
- **Capacity & Legal** — MCA assessments, DoLS, LPA
- **Safeguarding** — Restricted to admin/team_leader

### 4. Navigation Changes
- Care Module moved under **Care Services** group in sidebar
- Standalone Care Services button removed
- Care Services group visible to: admin, team_leader, support_worker
- Routes: `/care` and `/care/resident/:resident_id`

## How to Roll Back
If you need to revert to Restore Point 3:
1. Remove `CareProfile`, `CarePlan`, `CarePlanSection`, `BehaviourSupportPlan`, `MentalCapacityAssessment`, `MedicationRecord`, `MAREntry`, `ControlledDrugRegister`, `PRNProtocol`, `HealthObservation`, `GPAppointment`, `HospitalAdmission`, `PersonalCareRecord`, `SafeguardingRecord`, `ComplianceEvidence`, `LAContractMonitoring` entity files
2. Delete `pages/Care.jsx` and `pages/CareResident.jsx`
3. Restore `lib/roleConfig.js` care-services-group to original (admin, admin_officer only)
4. Remove `/care` and `/care/resident/:resident_id` routes from `App.jsx`
5. Remove `Care` and `CareResident` imports from `App.jsx`

## Current Database State
- All previous entities intact
- 16 new Care Module entities available
- No sample data seeded for care entities (to be done separately)