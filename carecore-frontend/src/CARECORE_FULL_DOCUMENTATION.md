# CareCore AI — Full Technical Documentation
> Generated: 2026-04-26 | Version: Production | Author: Base44 AI Architect

---

## TABLE OF CONTENTS
1. [Database Schema](#1-database-schema)
2. [Entity Relationship Map](#2-entity-relationship-map)
3. [Pages & Components](#3-pages--components)
4. [Button & Interaction Map](#4-button--interaction-map)
5. [Forms & Fields](#5-forms--fields)
6. [API / Query Layer](#6-api--query-layer)
7. [Business Logic & Functions](#7-business-logic--functions)
8. [Roles & Permissions](#8-roles--permissions)
9. [Module Status](#9-module-status)
10. [Known Issues & Tech Debt](#10-known-issues--tech-debt)

---

# 1. DATABASE SCHEMA

> All entities are stored in the Base44 BaaS platform. Every record automatically includes:
> - `id` (UUID, PK, auto-generated)
> - `created_date` (ISO datetime, auto-set on creation)
> - `updated_date` (ISO datetime, auto-updated on write)
> - `created_by` (email of authenticated user who created the record)
> No soft-delete is implemented — deletion is hard (permanent). Status fields simulate archiving.

---

### TABLE: Organisation
**Purpose:** Single-tenant configuration record. One per deployment. Stores all admin-configurable settings in a JSON blob.

```
- id              (UUID, PK)
- org_id          (String, required) — "default_org" in this deployment
- name            (String, required)
- app_name        (String, default: "CareCore AI")
- logo_url        (String, optional)
- primary_colour  (String, default: "#4B8BF5")
- default_language(String, default: "en")
- default_theme   (Enum: light|dark, default: light)
- contact_email   (String, optional)
- session_timeout_hours         (Number, default: 8)
- failed_login_attempts_limit   (Number, default: 5)
- lockout_duration_minutes      (Number, default: 15)
- min_password_length           (Number, default: 8)
- require_number                (Boolean, default: true)
- require_special_char          (Boolean, default: false)
- gps_clock_in_enabled          (Boolean, default: false)
- settings        (Object, JSON blob) — all Admin Control Panel config lives here
```

**Settings blob keys (stored in `Organisation.settings`):**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| active_home_types | Array<string> | ['outreach','24_hours','care','18_plus'] | Active home type modules |
| kpi_form_fields | Array<object> | DEFAULT_FIELDS | KPI form field visibility/order config |
| ai_report_length | string | 'standard' | AI report generation length |
| ai_report_tone | string | 'professional' | AI report tone |
| ai_include_age | boolean | true | Include age in AI context |
| ai_include_home_type | boolean | true | Include home type in AI context |
| ai_gender_neutral | boolean | false | Gender-neutral language |
| ai_prompt_prefix | string | '' | Custom AI generation instructions |
| ai_prompt_suffix | string | '' | Custom AI closing instruction |
| allow_report_drafts | boolean | true | Allow draft reports |
| require_report_review | boolean | true | Require TL review |
| allow_edit_after_submit | boolean | false | Allow editing submitted reports |
| cic_auto_save | boolean | false | Auto-save CIC reports |
| default_weekly_rate | number/null | null | Default placement fee weekly rate |
| invoice_rate_basis | string | '7_day' | Daily rate calculation method |
| default_invoice_day | number | 1 | Default invoice day of month |
| invoice_payment_terms | number | 30 | Invoice payment terms in days |
| fee_review_reminder_days | number | 30 | Days before fee review to alert |
| invoice_overdue_days | number | 30 | Days until invoice marked overdue |
| invoice_overdue_escalation_days | number | 60 | Days until escalation alert |
| budget_period_default | string | 'annual' | Default budget period |
| budget_warning_threshold | number | 20 | % over budget for warning |
| budget_critical_threshold | number | 40 | % over budget for critical |
| mileage_rate | number | 0.45 | £ per mile for mileage claims |
| expense_approval_threshold | number | 50 | £ requiring manager approval |
| expense_receipt_threshold | number | 10 | £ requiring receipt upload |
| default_weekly_allowance | number/null | null | Default resident weekly allowance |
| default_allowance_day | string | 'friday' | Allowance payment day |
| savings_tracking_enabled | boolean | true | Enable resident savings tracking |
| petty_cash_receipt_threshold | number | 10 | Receipt required above this £ |
| petty_cash_approval_threshold | number | 50 | Approval required above this £ |
| petty_cash_float_threshold_default | number | 50 | Default float threshold |
| petty_cash_low_alert | number | 50 | Low balance alert level £ |
| petty_cash_max_transaction | number | 200 | Max single transaction £ |
| petty_cash_active_categories | Array<string> | [...all] | Active petty cash categories |
| petty_cash_custom_categories | Array<string> | [] | Custom category names |
| petty_cash_custom_categories_enabled | boolean | false | Allow custom categories |
| petty_cash_reconciliation_required | boolean | true | Weekly reconciliation required |
| petty_cash_reconciliation_day | string | 'friday' | Reconciliation due day |
| petty_cash_reconciliation_reminder_hours | number | 24 | Hours before reminder is sent |
| petty_cash_reconciliation_notify | Array<string> | ['team_leader'] | Who to notify |
| petty_cash_opening_balance_default | number | 0 | Default opening balance |
| petty_cash_opening_balance_approval | boolean | false | Require admin approval for opening balance |
| invoice_number_format | string | 'INV-{YEAR}-{MONTH}-{SEQUENCE}' | Invoice number pattern |
| invoice_sequence_reset | string | 'monthly' | When sequence resets |
| invoice_sequence_start | number | 1 | Starting sequence number |
| invoice_org_name | string | '' | Org name on invoices |
| invoice_header_text | string | '' | Invoice header text |
| invoice_footer_text | string | '' | Invoice footer/bank details |
| invoice_terms | string | '' | T&Cs on invoices |
| vat_number | string | '' | VAT reg number |
| vat_rate | number | 0 | VAT rate % |
| payment_ref_prefix | string | '' | Payment reference prefix |
| invoice_auto_overdue | boolean | true | Auto mark overdue |
| invoice_overdue_escalation_days | number | 60 | Escalation alert threshold |
| invoice_overdue_reminder_days | number | 7 | Reminder frequency in days |
| invoice_export_format | string | 'xero' | Accounting software format |
| xero_account_code | string | '' | Xero account code |
| xero_tax_type | string | 'NONE' | Xero tax type |
| quickbooks_account | string | '' | QuickBooks account |
| export_include_resident | boolean | true | Include resident initials in export |
| invoice_require_approval | boolean | false | Require admin approval before sending |
| invoice_auto_generate | boolean | false | Auto-generate monthly draft invoices |
| yp_card_sort | string | 'risk_level' | Default YP card sort |
| yp_cards_expanded_default | boolean | false | Cards expanded on load |
| yp_show_progress_bars | boolean | true | Show progress bars |
| yp_show_timeline | boolean | true | Show activity timeline |
| yp_timeline_collapse_after | number | 6 | Timeline items before collapse |
| yp_summary_collapse_lines | number | 4 | Summary lines before collapse |
| yp_show_home_name | boolean | true | Show home name on card |
| yp_show_key_worker | boolean | true | Show key worker on card |
| yp_cards_per_page | number | 20 | Cards per page |
| kw_session_overdue_days | number | 7 | KW session overdue threshold |
| daily_log_missing_hours | number | 24 | Log missing alert threshold |
| face_to_face_overdue_days | number | 7 | F2F visit overdue threshold |
| support_plan_overdue_warning_days | number | 0 | Support plan overdue warning |
| night_stay_alert_time | string | '21:00' | Night stay alert time |
| risk_level_labels | object | {low:'Low',...} | Risk level display labels |
| risk_level_colours | object | {low:'#1D9E75',...} | Risk level badge colours |
| resident_visibility | object | {} | SW visibility flags per field |
| require_key_worker | boolean | true | Require KW on resident creation |
| require_home_assignment | boolean | true | Require home on resident creation |
| privacy_mode_default | boolean | false | Default privacy mode |
| require_risk_level | boolean | true | Require risk level |
| default_resident_status | string | 'active' | Default new resident status |
| resident_auto_archive_days | number | 30 | Days until auto-archive |

---

### TABLE: StaffProfile
**Purpose:** Represents a care staff member. One record per user. Links to User (auth system) via `user_id`. Central to role-based access control.

```
- id              (UUID, PK)
- org_id          (String, required, FK → Organisation.org_id)
- user_id         (String, required) — matches User.id from auth system
- full_name       (String, required)
- email           (String, required) — matches authenticated user email
- employee_id     (String, optional, format: EMP-XXXX)
- role            (Enum: admin|team_leader|support_worker, default: support_worker)
- team_leader_id  (String, optional, FK → StaffProfile.id)
- home_ids        (Array<String>) — list of Home.id values assigned to this staff
- phone           (String, optional)
- dbs_number      (String, optional)
- dbs_expiry      (Date, optional)
- start_date      (Date, optional)
- status          (Enum: active|inactive|suspended, default: active)
- notes           (String, optional)
```

**Relationships:**
- Many-to-one: StaffProfile → Organisation (via org_id)
- One-to-many: StaffProfile → Shift (as assigned staff)
- Many-to-many (implicit): StaffProfile ↔ Home (via home_ids array)
- One-to-one (optional): StaffProfile → StaffAvailabilityProfile (via staff_id)

---

### TABLE: Home
**Purpose:** Represents a residential care property or outreach location. Central to multi-home operations.

```
- id                (UUID, PK)
- org_id            (String, required)
- name              (String, required)
- type              (Enum: outreach|24_hours|care|18_plus, default: outreach)
- care_model        (Enum: outreach|residential|both, optional)
- address           (String, optional)
- postcode          (String, optional)
- phone             (String, optional)
- email             (String, optional)
- team_leader_id    (String, required, FK → StaffProfile.id)
- privacy_mode      (Boolean, default: false)
- compliance_framework (Enum: ofsted|cqc|custom, default: ofsted)
- default_language  (String, default: "en")
- status            (Enum: active|archived|vacant|maintenance, default: active)
- lease_start       (Date, optional)
- lease_end         (Date, optional)
- monthly_rent      (Number, optional)
- landlord_name     (String, optional)
- landlord_contact  (String, optional)
- landlord_email    (String, optional)
- property_notes    (String, optional)
- document_ids      (Array<String>, FK → HomeDocument.id[])
```

**Relationships:**
- Many-to-one: Home → Organisation
- One-to-many: Home → Resident
- One-to-many: Home → HomeDocument
- One-to-many: Home → Bill
- One-to-many: Home → ShiftTemplate, Shift, Rota
- One-to-many: Home → PettyCash

---

### TABLE: Resident
**Purpose:** Represents a young person or adult in care. Core entity for all care management operations.

```
- id                  (UUID, PK)
- org_id              (String, required)
- home_id             (String, optional, FK → Home.id)
- key_worker_id       (String, optional, FK → StaffProfile.id)
- team_leader_id      (String, optional, FK → StaffProfile.id)
- display_name        (String, required) — pseudonym or full name depending on privacy
- initials            (String, optional) — used in privacy mode
- privacy_mode        (Boolean, default: false)
- dob                 (Date, optional)
- gender              (String, optional)
- ethnicity           (String, optional)
- nationality         (String, optional)
- language            (String, default: "en")
- placement_start     (Date, optional)
- placement_type      (Enum: childrens_home|supported_accommodation|adult_care, optional)
- social_worker_name  (String, optional)
- social_worker_org   (String, optional)
- social_worker_phone (String, optional)
- social_worker_email (String, optional)
- iro_name            (String, optional)
- iro_contact         (String, optional)
- pa_name             (String, optional)
- pa_contact          (String, optional)
- family_contacts     (Array<Object>, optional) — [{name, relationship, phone, email, approved}]
- address             (String, optional)
- risk_level          (Enum: low|medium|high|critical, default: low)
- status              (Enum: active|on_leave|moved_on|archived, default: active)
- photo_url           (String, optional)
```

---

### TABLE: DailyLog
**Purpose:** Free-form daily care log entries written by support workers per shift. Used for KPI tracking, AI analysis, and CIC report generation.

```
- id              (UUID, PK)
- org_id          (String, required)
- resident_id     (String, required, FK → Resident.id)
- resident_name   (String, denormalised)
- worker_id       (String, required, FK → StaffProfile.id)
- worker_name     (String, denormalised)
- home_id         (String, optional, FK → Home.id)
- home_name       (String, denormalised)
- date            (Date, required)
- shift           (Enum: morning|afternoon|night, required)
- log_type        (Enum: general|incident|health|education|behaviour, default: general)
- content         (Object) — free-form JSON content for the log entry
- flags           (Array<String>) — e.g. ["current_status","night_stay","edu_attendance","meal_intake"]
- ai_summary      (String, optional) — AI-generated summary
- flagged         (Boolean, default: false) — manually flagged for review
- flag_severity   (Number, optional)
- acknowledged_by (String, optional) — FK → StaffProfile.id
- acknowledged_at (ISO string, optional)
```

---

### TABLE: VisitReport
**Purpose:** Formal visit report written by a support worker after visiting a resident. Used for compliance, KPI tracking, and performance monitoring.

```
- id                    (UUID, PK)
- org_id                (String, required)
- resident_id           (String, required, FK → Resident.id)
- resident_name         (String, denormalised)
- home_id               (String, optional, FK → Home.id)
- worker_id             (String, required, FK → StaffProfile.id — stored as email in some contexts)
- worker_name           (String, denormalised)
- date                  (Date, required)
- time_start            (String, HH:mm)
- time_end              (String, HH:mm)
- duration_minutes      (Number, optional)
- action_text           (String) — AI-generated Action section
- outcome_text          (String) — AI-generated Outcome section
- recommendations_text  (String) — AI-generated Recommendations section
- kpi_data              (Object) — raw KPI form answers
- daily_log_ids         (Array<String>, FK → DailyLog.id[])
- is_key_worker_session (Boolean, default: false)
- is_daily_summary      (Boolean, default: false)
- status                (Enum: draft|submitted|reviewed|approved, default: draft)
```

---

### TABLE: KPIRecord
**Purpose:** Structured KPI data extracted from a VisitReport. One per VisitReport. Used for analytics and performance tracking.

```
- id                        (UUID, PK)
- org_id                    (String, required)
- visit_report_id           (String, required, FK → VisitReport.id)
- resident_id               (String, required, FK → Resident.id)
- worker_id                 (String, required, FK → StaffProfile.id)
- home_id                   (String, required, FK → Home.id)
- date                      (Date, required)
- is_key_worker_session     (Boolean, default: false)
- is_daily_summary          (Boolean, default: false)
- visit_type                (String)
- presentation              (String)
- placement_condition       (String)
- primary_purpose           (String)
- college_status            (String)
- life_skills               (Array<String>)
- liaison                   (String)
- engagement_level          (String)
- risk_level                (String)
- independence_progress     (String)
- health_adherence          (String)
- appointment_type          (String)
- appointment_details_notes (String)
```

---

### TABLE: SWPerformanceKPI
**Purpose:** Aggregated performance metrics per worker per activity. Created alongside KPIRecord to drive the SW Performance module.

```
- id                    (UUID, PK)
- org_id                (String, required)
- worker_id             (String, required — StaffProfile.email, NOT .id)
- worker_name           (String, denormalised)
- employee_id           (String)
- home_id               (String, FK → Home.id)
- resident_id           (String, FK → Resident.id)
- date                  (Date, required)
- week_start            (Date)
- month                 (String, YYYY-MM)
- activity_type         (Enum: visit_report|key_worker_session|daily_summary|cic_report|...)
- source_entity         (String)
- source_id             (String)
- hours_with_yp         (Number)
- visit_type, presentation, placement_condition (String)
- engagement_level, risk_level, independence_progress, health_adherence (String)
- life_skills           (Array<String>)
- kw_session_count, cic_report_count, support_plan_count, gp_appointment_count (Integer)
- notes                 (String)
```

**Note:** `worker_id` in this table stores the worker's **email** not their UUID — this is a known inconsistency (see Section 10).

---

### TABLE: PlacementFee
**Purpose:** Records the weekly placement fee agreed with a local authority for a specific resident placement.

```
- id                  (UUID, PK)
- org_id              (String, required)
- resident_id         (String, required, FK → Resident.id)
- home_id             (String, required, FK → Home.id)
- local_authority     (String, required)
- la_contact_name     (String)
- la_contact_email    (String)
- la_reference        (String)
- weekly_rate         (Number, required)
- monthly_equivalent  (Number)
- fee_start_date      (Date, required)
- fee_end_date        (Date, optional)
- review_date         (Date)
- invoice_day         (Integer)
- status              (Enum: active|paused|ended, default: active)
- notes               (String)
- created_by          (String, required — email)
```

---

### TABLE: PlacementInvoice
**Purpose:** Invoice records generated against active placement fees for local authority billing.

```
- (Schema not fully read — referenced in secureGateway but entity file not reviewed)
- org_id, resident_id, home_id, placement_fee_id, invoice_number, period_start, period_end
- amount, status (draft|sent|paid|overdue|disputed), due_date, paid_date
- approved_by, created_by
```

---

### TABLE: PettyCash
**Purpose:** Petty cash ledger per home. One ledger per home, tracks balance.

```
- org_id, home_id, home_name
- current_balance (Number)
- float_threshold (Number)
- status
```

---

### TABLE: PettyCashTransaction
**Purpose:** Individual debit/credit entries against a petty cash ledger.

```
- org_id, home_id, petty_cash_id
- transaction_type (cash_in|cash_out)
- amount, category, description
- date, receipt_photo_url, approved_by
- created_by
```

---

### TABLE: Shift
**Purpose:** An individual shift instance assigned to specific staff at a specific home.

```
- org_id, home_id, home_name
- rota_id (FK → Rota.id)
- template_id (FK → ShiftTemplate.id)
- shift_type (morning|afternoon|night|sleeping)
- date, time_start, time_end
- assigned_staff[] (Array of StaffProfile.id)
- status (open|confirmed|completed|cancelled)
- acknowledged_by[], notes
```

---

### TABLE: ShiftTemplate
**Purpose:** Reusable shift configuration for a specific home (e.g. "Morning Shift 07:00–15:00").

```
- org_id, home_id, home_name
- name, shift_type (morning|afternoon|night|sleeping)
- time_start, time_end
- staff_required (Integer, default: 1)
- active (Boolean, default: true)
- notes
```

---

### TABLE: ShiftHandover
**Purpose:** Formal handover note written at the end of a shift by a team leader.

```
- org_id, home_id, shift_id
- shift_date, shift_type
- written_by (StaffProfile.id)
- notes, flags[]
- submitted_at, acknowledged_by, acknowledged_at
```

---

### TABLE: Rota
**Purpose:** A weekly rota for a specific home, containing multiple shifts.

```
- org_id, home_id, week_start (Date)
- status (draft|published|archived)
- created_by, published_by, published_at
- notes
```

---

### TABLE: HomeDocument
**Purpose:** Compliance and tenancy document attached to a home.

```
- org_id, home_id, property_id (legacy)
- title, document_type (gas_safety|electric_cert|eicr|fire_risk|insurance|lease|...)
- file_url, issue_date, expiry_date
- reminder_days (Integer, default: 30)
- status (current|expiring_soon|expired|not_applicable)
- uploaded_by (FK → StaffProfile.id)
- notes
```

---

### TABLE: HomeCheck
**Purpose:** Scheduled home inspection checklist completion record.

```
- org_id, home_id
- check_type, check_date, completed_by
- items[] (checklist answers)
- passed (Boolean), notes
```

---

### TABLE: HomeAsset
**Purpose:** Physical asset inventory for a home (furniture, appliances, etc.).

```
- org_id, home_id
- name, category, serial_number, purchase_date, value
- condition, notes
```

---

### TABLE: HomeTask
**Purpose:** Action items and tasks assigned to a home.

```
- org_id, home_id
- title, type, assigned_to_name
- due_date, status (pending|in_progress|completed)
- notes
```

---

### TABLE: HomeLog
**Purpose:** General log entries about a home (maintenance, observations, etc.).

```
- org_id, home_id
- date, author, log_type, content
```

---

### TABLE: Bill
**Purpose:** Recurring or one-off bills associated with a home.

```
- org_id, home_id, home_name
- bill_type (utilities|council_tax|insurance|cleaning|maintenance|rent|other)
- supplier, amount, due_date, paid_date
- status (pending|paid|overdue|disputed)
- notes, is_direct_debit, is_recurring (Boolean)
```

---

### TABLE: HomeBudget
**Purpose:** Annual/quarterly budget for a home.

```
- org_id, home_id
- period_start, period_end
- total_budget, spent_amount, status
```

---

### TABLE: HomeBudgetLine
**Purpose:** Line items within a HomeBudget (per category).

```
- org_id, home_id, budget_id (FK → HomeBudget.id)
- category, allocated_amount, spent_amount
```

---

### TABLE: HomeExpense
**Purpose:** Individual expense record against a home.

```
- org_id, home_id
- date, category, amount, description
- submitted_by, approved_by, receipt_url, status
```

---

### TABLE: SupportPlan
**Purpose:** Formal support plan for a resident.

```
- org_id, resident_id, home_id
- version (Integer)
- status (draft|active|archived)
- effective_date, review_due_date, reviewed_date
- created_by, reviewed_by
- overall_notes, sections[]
```

---

### TABLE: ILSPlan
**Purpose:** Independent Living Skills plan for a resident.

```
- org_id, resident_id, home_id
- version (Integer)
- status (draft|active|archived)
- effective_date, review_due_date, reviewed_date
- created_by, reviewed_by, overall_notes
```

---

### TABLE: ILSPlanSection
**Purpose:** Individual skill area within an ILS Plan.

```
- org_id, ils_plan_id (FK → ILSPlan.id), resident_id
- skill_area (cooking|budgeting|hygiene|transport|health|relationships|employment|education|custom)
- custom_skill_name, current_level, goal, current_ability
- support_needed, actions, target_date
- progress_percentage (0–100, default: 0)
- notes, last_updated_by
```

---

### TABLE: CICReport
**Purpose:** Children in Care (CIC) formal review report.

```
- org_id, resident_id, resident_name, home_id
- date_from, date_to, title, generated_by
- status (draft|saved)
- report_data: { placement_update, health_update, ils_update, education_update, finances_update }
- template_version (default: v1)
```

---

### TABLE: CICReportSection
**Purpose:** Individual section within a CIC report.

```
- org_id, cic_report_id, resident_id
- section_type, title, content, generated_by
```

---

### TABLE: KPIOption
**Purpose:** Configurable dropdown options for KPI form fields. Admin-managed via Settings.

```
- org_id
- category (visit_type|presentation|placement_condition|primary_purpose|college_status|life_skills|...)
- label, value
- active (Boolean)
- order (Integer)
```

---

### TABLE: AccidentReport
**Purpose:** Accident/incident/near-miss report for a resident at a home.

```
- org_id, home_id, home_name
- reported_by_id, reported_by_name
- resident_id, resident_name
- type (accident|illness|near_miss|injury)
- date, time, location, description, injuries
- first_aid_given (Boolean), first_aid_details
- hospital_attendance (Boolean)
- witness_name, follow_up_required (Boolean), follow_up_notes
- status (open|reviewed|closed)
```

---

### TABLE: GPAppointment
**Purpose:** Tracks GP appointment attendance and outcomes for a resident.

```
- org_id, resident_id, home_id
- date, gp_name, appointment_type
- attended (Boolean), outcome, notes
- recorded_by
```

---

### TABLE: HospitalAdmission
**Purpose:** Records a hospital admission event for a resident.

```
- org_id, resident_id, home_id
- admission_date, discharge_date, hospital_name
- reason, outcome, notes
```

---

### TABLE: MedicationRecord
**Purpose:** Medication prescribed to a resident.

```
- org_id, resident_id
- medication_name, dosage, frequency, route
- prescribed_by, prescriber_contact
- start_date, end_date, review_date
- status (active|discontinued|paused)
- notes
```

---

### TABLE: MAREntry
**Purpose:** Medication Administration Record — individual dose administration log.

```
- org_id, resident_id, medication_id (FK → MedicationRecord.id)
- date, time_scheduled, time_administered
- administered_by, outcome (given|refused|missed)
- notes
```

---

### TABLE: PRNProtocol
**Purpose:** "As required" medication protocol for a resident.

```
- org_id, resident_id
- medication_name, max_daily_dose, instructions
- created_by, review_date
```

---

### TABLE: ControlledDrugRegister
**Purpose:** Register of controlled drugs held at a home.

```
- org_id, home_id, resident_id
- medication_name, stock_in, stock_out, balance
- date, recorded_by, witnessed_by
```

---

### TABLE: SafeguardingRecord
**Purpose:** Safeguarding concern or referral record for a resident.

```
- org_id, resident_id, home_id
- date, reported_by, concern_type
- description, action_taken
- status (open|referred|closed)
- la_reference, notes
```

---

### TABLE: BehaviourSupportPlan
**Purpose:** Behaviour support and positive behaviour plan for a resident.

```
- org_id, resident_id, home_id
- triggers, strategies, de_escalation
- created_by, review_date, status
```

---

### TABLE: CarePlan / CarePlanSection
**Purpose:** Formal care plan and its individual sections for a resident.

```
CarePlan: org_id, resident_id, home_id, version, status, effective_date, review_due_date
CarePlanSection: org_id, care_plan_id, section_type, content, updated_by
```

---

### TABLE: CareProfile
**Purpose:** Static care needs profile for a resident.

```
- org_id, resident_id
- care_level, care_needs[], dietary_requirements
- mobility, communication_needs, equipment_needs
```

---

### TABLE: HealthObservation
**Purpose:** Regular health observation record (vitals, weight, etc.).

```
- org_id, resident_id, home_id
- date, observation_type, value, unit
- recorded_by, notes
```

---

### TABLE: PersonalCareRecord
**Purpose:** Daily personal care task completion record.

```
- org_id, resident_id, home_id
- date, tasks_completed[], recorded_by
```

---

### TABLE: MentalCapacityAssessment
**Purpose:** Formal mental capacity assessment for a specific decision.

```
- org_id, resident_id
- decision_being_assessed, assessment_date
- assessor, outcome (has_capacity|lacks_capacity)
- evidence, review_date
```

---

### TABLE: LAContractMonitoring
**Purpose:** Local authority contract monitoring records and visits.

```
- org_id, home_id, resident_id
- visit_date, la_representative, visit_type
- outcome, actions_required, notes
```

---

### TABLE: ResidentAllowance
**Purpose:** Regular allowance configuration for a resident.

```
- org_id, resident_id
- weekly_amount, payment_day
- payment_method, account_details
- status (active|paused)
```

---

### TABLE: ResidentAllowancePayment
**Purpose:** Individual allowance payment transaction record.

```
- org_id, resident_id, allowance_id
- date, amount, paid_by, receipt_url, notes
```

---

### TABLE: ResidentSavings
**Purpose:** Savings account/pot for a resident.

```
- org_id, resident_id
- balance, target_amount, target_description
- opened_date, status
```

---

### TABLE: ResidentSavingsTransaction
**Purpose:** Individual debit/credit entry for a resident's savings pot.

```
- org_id, resident_id, savings_id
- date, transaction_type (deposit|withdrawal), amount
- description, recorded_by
```

---

### TABLE: HomeSupportWorker
**Purpose:** Junction record linking support workers to specific homes (alternative to home_ids array on StaffProfile).

```
- org_id, home_id, staff_id (FK → StaffProfile.id)
- assigned_date, role_at_home
```

---

### TABLE: Transition
**Purpose:** Records a resident's transition / move-on plan.

```
- org_id, resident_id, home_id
- transition_type (move_on|step_down|step_up|independence)
- target_date, new_placement, la_involved
- status (planning|in_progress|completed)
- notes, key_worker_id
```

---

### TABLE: StaffAvailabilityProfile
**Purpose:** Employment contract and qualification profile for a staff member.

```
- org_id, staff_id (FK → StaffProfile.id)
- contracted_hours_per_week, employment_type (full_time|part_time|bank|agency|zero_hours)
- max_hours_per_day (default: 12), max_consecutive_days (default: 6)
- min_rest_hours_between_shifts (default: 11)
- preferred_shift_types[], unavailable_shift_types[]
- sleep_in_qualified, waking_night_qualified, first_aid_certified
- first_aid_expiry, medication_trained, medication_training_date
- driving_licence, vehicle_available
- manual_handling_trained, safeguarding_trained, safeguarding_level, safeguarding_expiry
- max_shifts_per_week, preferred_days_off[], fixed_days_off[]
- notes, created_by
```

---

### TABLE: StaffWeeklyAvailability
**Purpose:** Recurring weekly availability pattern per staff member per day.

```
- org_id, staff_id, day_of_week (monday|...|sunday)
- is_available (Boolean), available_from (HH:MM), available_until (HH:MM)
- shift_type_pref (morning|afternoon|night|sleeping|any|none)
- notes
```

---

### TABLE: StaffAvailabilityOverride
**Purpose:** One-off date range override for a staff member's availability (holiday, sick, etc.).

```
- org_id, staff_id
- override_type (unavailable|available|holiday|sick|training|lieu_day|other)
- date_from, date_to, all_day (Boolean)
- time_from, time_to, reason
- approved (Boolean), approved_by, approved_at
- submitted_by
```

---

### TABLE: ShiftConflict
**Purpose:** Records detected scheduling conflicts for a staff member.

```
- org_id, staff_id, shift_id
- conflict_type, conflicting_shift_id
- detected_at, resolved (Boolean)
```

---

### TABLE: AuditTrail
**Purpose:** Log of significant system events for compliance and accountability.

```
- org_id, user_id (FK → StaffProfile.id)
- entity_name, entity_id
- action (create|update|delete)
- before_data, after_data (JSON)
- timestamp, ip_address
```

---

### TABLE: Notification
**Purpose:** In-app notifications sent to specific users.

```
- org_id, user_id (FK → User.id)
- type (handover|holiday|rota|alert|certification|general)
- message, priority (normal|high|critical)
- link_url, related_module, related_record_id
- read (Boolean, default: false)
- acknowledged (Boolean, default: false)
```

---

# 2. ENTITY RELATIONSHIP MAP

```
Organisation (1)
  └── (many) Home
        ├── (many) Resident
        │     ├── (many) DailyLog
        │     ├── (many) VisitReport ──> (1) KPIRecord
        │     ├── (many) SWPerformanceKPI
        │     ├── (1-active) SupportPlan ──> (many) [sections embedded]
        │     ├── (1-active) ILSPlan ──> (many) ILSPlanSection
        │     ├── (many) CICReport ──> (many) CICReportSection
        │     ├── (1-active) PlacementFee ──> (many) PlacementInvoice
        │     ├── (many) AccidentReport
        │     ├── (many) GPAppointment
        │     ├── (many) HospitalAdmission
        │     ├── (many) MedicationRecord ──> (many) MAREntry
        │     ├── (many) PRNProtocol
        │     ├── (many) SafeguardingRecord
        │     ├── (1) BehaviourSupportPlan
        │     ├── (1-active) CarePlan ──> (many) CarePlanSection
        │     ├── (1) CareProfile
        │     ├── (many) HealthObservation
        │     ├── (many) PersonalCareRecord
        │     ├── (1) MentalCapacityAssessment
        │     ├── (1) ResidentAllowance ──> (many) ResidentAllowancePayment
        │     ├── (1) ResidentSavings ──> (many) ResidentSavingsTransaction
        │     ├── (many) LAContractMonitoring
        │     └── (many) Transition
        │
        ├── (many) StaffProfile ──> (1) StaffAvailabilityProfile
        │                       ──> (many) StaffWeeklyAvailability
        │                       ──> (many) StaffAvailabilityOverride
        │
        ├── (many) ShiftTemplate
        ├── (many) Rota ──> (many) Shift ──> (many) ShiftHandover
        ├── (many) ShiftConflict
        ├── (many) HomeDocument
        ├── (many) HomeCheck
        ├── (many) HomeAsset
        ├── (many) HomeTask
        ├── (many) HomeLog
        ├── (many) HomeExpense
        ├── (many) Bill
        ├── (1) HomeBudget ──> (many) HomeBudgetLine
        ├── (many) PettyCash ──> (many) PettyCashTransaction
        ├── (many) ControlledDrugRegister
        └── (many) AccidentReport (home-level incidents)

StaffProfile (many-to-many with Home via home_ids[])
Notification ──> User (auth system, not an entity)
AuditTrail ──> any entity (generic)
KPIOption ──> used by KPI form (no FK, matched by category string)
```

**Implicit / Non-FK Links:**
- `SWPerformanceKPI.worker_id` stores **email** not UUID
- `DailyLog.worker_id` stores **StaffProfile.id** (UUID) — inconsistent with above
- `VisitReport.worker_id` stores **StaffProfile.id**
- `Notification.user_id` → **User.id** (auth system, not StaffProfile)
- `DailyLog.flags[]` is matched by string key convention, no FK

**Orphan Risks:**
- Deleting a Home orphans all Residents, DailyLogs, VisitReports, Bills, etc.
- Deleting a StaffProfile orphans VisitReports assigned to that worker
- Deleting a Resident orphans all associated care records
- No cascade deletes are implemented — manual cleanup required

---

# 3. PAGES & COMPONENTS

### `/` — Landing
- **Purpose:** Public-facing marketing page with feature overview, module list, and login CTA
- **Access:** Public (unauthenticated)
- **Components:** HeroSection, FeaturesSection, ModulesSection, RolesSection, ComplianceSection, CTASection, FooterSection
- **Data loaded:** None

---

### `/auth-redirect` — AuthRedirect
- **Purpose:** Processes OAuth callback token, stores auth token, redirects to role-appropriate dashboard
- **Access:** Public
- **Components:** None (logic only)

---

### `/dashboard` — AdminDashboard
- **Purpose:** Executive overview for admin role showing KPIs, financials, risk indicators, and AI insights
- **Access:** admin only
- **Components:** StatCard, AIInsightsPanel, RiskSection, FinancialSection, IncidentsSection, OperationsSection, StaffCapacitySection, DashboardFilterBar, StatDetailModal
- **Data loaded:** Home, Resident (active), VisitReport (recent 200), DailyLog (recent 200), Bill, PlacementFee, AccidentReport, StaffProfile

---

### `/tl-dashboard` — TLDashboard
- **Purpose:** Team leader hub showing their assigned homes, residents, and pending tasks
- **Access:** team_leader
- **Components:** StatCard, AIInsightsPanel, HomeCard
- **Data loaded:** StaffProfile (own), Home (assigned), Resident (assigned homes), VisitReport

---

### `/sw-dashboard` — SWDashboard
- **Purpose:** Support worker daily view with clock-in/out, assigned residents, and report tracker
- **Access:** support_worker
- **Components:** StatCard
- **Data loaded:** StaffProfile (own), Resident (assigned), VisitReport (recent)

---

### `/residents` — Residents
- **Purpose:** Main resident management hub with multiple sub-tabs
- **Access:** admin, team_leader, support_worker
- **Components:** YPCardView, YPCardExpanded, SupportPlansTab, ILSPlansTab, VisitReportsTab, CurrentStatusModal, NightStayModal, EducationAttendanceModal, MealIntakeModal, SupportPlanModal, ILSPlanModal
- **Sub-tabs:** Overview | Young People (YP Cards) | Support Plans | ILS Plans | Visit Reports/Logs | Incidents | Tasks | Activities | Risk | Health | Education | Housing | Referrals | Medicines
- **Data loaded:** Resident (active), Home (active), StaffProfile, VisitReport (200), DailyLog (500), AccidentReport, HomeTask, Transition, SupportPlan, ILSPlan

---

### `/visit-reports` — VisitReports
- **Purpose:** Browse and manage all visit reports, daily summaries, and key worker sessions
- **Access:** admin, team_leader, support_worker
- **Components:** ReportsTable, VisitReportDetail
- **Sub-tabs:** Visit Reports | Daily Summary | Key Worker Sessions
- **Data loaded:** VisitReport (200), Resident, Home

---

### `/visit-reports/new` — VisitReportNew
- **Purpose:** Multi-step form to create a new visit report with AI generation
- **Access:** admin, team_leader, support_worker
- **Components:** VisitReportKPIForm, VisitReportPreview
- **Data loaded:** Resident, Home, KPIOption
- **Writes:** VisitReport, KPIRecord, SWPerformanceKPI

---

### `/staff` — Staff
- **Purpose:** Staff directory and HR management
- **Access:** admin, team_leader
- **Components:** StaffForm, HierarchyView, AvailabilityPanel (AvailabilityProfileTab, WeeklyPatternTab, OverridesTab, QualificationsTab, AvailabilityOverviewTab)
- **Data loaded:** StaffProfile, Home, StaffAvailabilityProfile, StaffWeeklyAvailability, StaffAvailabilityOverride

---

### `/homes-hub` — HomesHub
- **Purpose:** Hub for home management with sub-tabs for Homes list and Operations
- **Access:** admin, team_leader, support_worker
- **Components:** Homes, ComingSoonTab
- **Sub-tabs:** My Homes | Checks, Chores & Audits (checks|chores|audit)

---

### `/homes` — Homes
- **Purpose:** Grid list of all homes with summary stats
- **Access:** admin, team_leader, support_worker (filtered by assignment)
- **Components:** HomeCard, AddHomeModal
- **Data loaded:** Home (active), Resident (active), StaffProfile

---

### `/homes/:id` — HomeDetail
- **Purpose:** Full detail and management view for a single home
- **Access:** admin, team_leader (assigned)
- **Components:** HomeDetailsTab, PropertyTenancyTab, HomeDocumentsTab, ShiftTemplatesTab, AccidentsTab, HomeLogsTab, ShiftsHandoversTab, MealPlanTab, HomeChecksTab, HomeAssetsTab, HomeTasksTab, MaintenanceTab
- **Data loaded:** Home (by ID), Resident (by home_id), StaffProfile

---

### `/24hours` — TwentyFourHoursHub
- **Purpose:** Hub for 24-hour housing with shifts and rota management
- **Access:** admin, team_leader, support_worker
- **Components:** Shifts, MyShifts
- **Sub-tabs:** Dashboard | Shifts | My Shifts

---

### `/finance` — Finance
- **Purpose:** Finance overview with per-home navigation
- **Access:** admin, team_leader
- **Data loaded:** Home, PlacementFee, PlacementInvoice, PettyCash, HomeBudget

---

### `/finance/home/:home_id` — FinanceHome
- **Purpose:** Detailed finance management for a specific home
- **Components:** IncomeGraph, BudgetTab, PettyCashTab, ResidentAllowanceTab, InvoiceGeneratorForm, PlacementFeeForm
- **Data loaded:** Home, Resident (for home), PlacementFee, PlacementInvoice, PettyCash, PettyCashTransaction, HomeBudget, ResidentAllowance

---

### `/care` — Care
- **Purpose:** Care module overview listing all care-enabled residents
- **Access:** admin, team_leader, support_worker

---

### `/care/resident/:resident_id` — CareResident
- **Purpose:** Full care record for a single resident
- **Components:** CarePlan, CareProfile, MedicationRecord, MAREntry, HealthObservation, PersonalCareRecord
- **Access:** admin, team_leader, support_worker

---

### `/sw-performance` — SWPerformance
- **Purpose:** KPI performance dashboard for support workers
- **Access:** admin, team_leader, support_worker
- **Data loaded:** SWPerformanceKPI, StaffProfile

---

### `/analytics` — Analytics
- **Purpose:** Analytics and AI insights across the organisation
- **Access:** admin, team_leader
- **Data loaded:** Multiple entities for aggregation

---

### `/settings` — Settings
- **Purpose:** User settings and admin system configuration
- **Access:** All roles (profile/display tabs); admin-only tabs for KPI, Org, Users, Admin Control Panel
- **Components:** AdminControlPanelTabs (20 sub-tabs)
- **Data loaded:** User (current), Organisation, KPIOption

---

### `/house` — HouseManagement
- **Purpose:** Admin Management — property bills, compliance docs, financial overview
- **Access:** admin, admin_officer
- **Components:** PropertyList, BillList, BillForm, HouseStatCard, HouseCharts, ExpiringItemsModal
- **Data loaded:** Home, Bill, HomeDocument, StaffProfile

---

# 4. BUTTON & INTERACTION MAP

### VisitReportNew.jsx
```
BUTTON: "Generate Report" 
  Action: Calls base44.integrations.Core.InvokeLLM with KPI form data
  Writes: Nothing immediately — populates preview state
  Validation: KPI fields marked required must be filled

BUTTON: "Save Report" (in VisitReportPreview)
  Action: Creates VisitReport, KPIRecord, SWPerformanceKPI
  Writes: VisitReport (status: draft/submitted), KPIRecord, SWPerformanceKPI
  Side effect: Navigates to /visit-reports on success
```

### YPCardView
```
BUTTON/ICON: Expand card chevron
  Action: Toggles expanded state of individual YP card (local state)

BUTTON: "Add Log"
  Action: Switches active tab to "visit-reports" and pre-selects resident

BUTTON: "Support Plan" 
  Action: Opens SupportPlanModal with resident data

BUTTON: "ILS Plan"
  Action: Opens ILSPlanModal with resident data
```

### Staff.jsx
```
BUTTON: "Add Staff Member"
  Action: Opens StaffForm modal
  Writes: StaffProfile.create()

BUTTON: "Save" (StaffForm)
  Action: StaffProfile.create() or StaffProfile.update()
  Validation: full_name, role required

BUTTON: "Generate Employee IDs" 
  Action: Invokes generateEmployeeIds backend function
  Writes: StaffProfile.employee_id (bulk update)
```

### Settings.jsx
```
BUTTON: "Save Changes" (My Profile tab)
  Action: base44.auth.updateMe({ full_name })
  Writes: User.full_name in auth system

BUTTON: "Add" (KPI Options)
  Action: KPIOption.create()
  Writes: KPIOption { label, value, category, org_id, active: true }

BUTTON: Edit icon (KPI Options)
  Action: Sets editingId state, shows inline edit form

BUTTON: Trash icon (KPI Options)
  Action: KPIOption.delete(id)

BUTTON: "Save [Section] Settings" (Admin Control Panel tabs)
  Action: saveSettings() → Organisation.update({ settings: merged })
  Side effect: clearSettingsCache()
```

### Finance / PettyCash
```
BUTTON: "Add Transaction"
  Action: Opens PettyCashTransaction form
  Writes: PettyCashTransaction.create(), updates PettyCash.current_balance

BUTTON: "Generate Invoice"
  Action: Opens InvoiceGeneratorForm
  Writes: PlacementInvoice.create()
```

### HomeDetail
```
BUTTON: "Upload Document" (HomeDocumentsTab)
  Action: base44.integrations.Core.UploadFile → HomeDocument.create()
  Writes: HomeDocument { file_url, title, document_type, home_id }

BUTTON: "Add Shift Template" (ShiftTemplatesTab)
  Action: ShiftTemplate.create()

BUTTON: "Add Task" (HomeTasksTab)
  Action: HomeTask.create()
```

### Shifts / Rota
```
BUTTON: "Generate Rota" (RotaGenerateFlow)
  Action: Multi-step wizard → creates Rota + Shift records
  Writes: Rota.create(), Shift.bulkCreate()

BUTTON: "Acknowledge" (MyShifts)
  Action: Shift.update({ acknowledged_by: [...] })

BUTTON: "Submit Handover" (HandoverForm)
  Action: ShiftHandover.create()
  Writes: ShiftHandover { home_id, shift_id, written_by, notes, flags[] }
  Side effect: Notification.create() to manager
```

---

# 5. FORMS & FIELDS

### Form: VisitReportKPIForm
Page: `/visit-reports/new`
| Field | Input Type | Bound Field | Required |
|-------|-----------|-------------|----------|
| Resident | Select | resident_id | Yes |
| Date | Date | date | Yes |
| Visit Type | Select (KPIOption) | visit_type | Configurable |
| Presentation | Select (KPIOption) | presentation | Configurable |
| Placement Condition | Select (KPIOption) | placement_condition | Configurable |
| Primary Purpose | Select (KPIOption) | primary_purpose | Configurable |
| College Status | Select (KPIOption) | college_status | Configurable |
| Life Skills | MultiSelect (KPIOption) | life_skills | Configurable |
| Engagement Level | Select (KPIOption) | engagement_level | Configurable |
| Risk Level | Select (KPIOption) | risk_level | Configurable |
| Independence Progress | Select (KPIOption) | independence_progress | Configurable |
| Health Adherence | Select (KPIOption) | health_adherence | Configurable |
| Appointment Type | Select (KPIOption) | appointment_type | Configurable |
| Time Start | Time | time_start | No |
| Time End | Time | time_end | No |
| Worker Notes | Textarea | worker_notes | No |

*Field visibility and required status are controlled by `Organisation.settings.kpi_form_fields`*

**Submit:** Calls InvokeLLM → populates preview → on confirm writes VisitReport + KPIRecord + SWPerformanceKPI

---

### Form: ResidentForm (Add/Edit Resident)
Page: `/residents` (modal)
| Field | Input Type | Bound Field | Required |
|-------|-----------|-------------|----------|
| Display Name | Text | display_name | Yes |
| DOB | Date | dob | Configurable |
| Gender | Select | gender | No |
| Risk Level | Select | risk_level | Configurable |
| Status | Select | status | Yes |
| Home | Select | home_id | Configurable |
| Key Worker | Select | key_worker_id | Configurable |
| Team Leader | Select | team_leader_id | No |
| Placement Start | Date | placement_start | No |
| Placement Type | Select | placement_type | No |
| Privacy Mode | Toggle | privacy_mode | No |

---

### Form: StaffForm
Page: `/staff`
| Field | Input Type | Bound Field | Required |
|-------|-----------|-------------|----------|
| Full Name | Text | full_name | Yes |
| Email | Email | email | Yes |
| Role | Select | role | Yes |
| Assigned Homes | Multi-select | home_ids | No |
| Team Leader | Select | team_leader_id | No |
| Phone | Tel | phone | No |
| DBS Number | Text | dbs_number | No |
| DBS Expiry | Date | dbs_expiry | No |
| Start Date | Date | start_date | No |
| Status | Select | status | Yes |

---

### Form: HandoverForm
Page: `/24hours` (ShiftsHandoversTab)
| Field | Input Type | Bound Field | Required |
|-------|-----------|-------------|----------|
| Home | Select | home_id | Yes |
| Shift | Select | shift_id | Yes |
| Notes | Textarea | notes | Yes (min 10 chars assumed) |
| Flags | MultiSelect | flags[] | No |

---

### Form: AddHomeModal
Page: `/homes`
| Field | Input Type | Bound Field | Required |
|-------|-----------|-------------|----------|
| Name | Text | name | Yes |
| Type | Select (outreach\|24_hours\|care\|18_plus) | type | Yes |
| Address | Text | address | No |
| Postcode | Text | postcode | No |
| Team Leader | Select | team_leader_id | Yes |
| Status | Select | status | Yes |

---

### Form: PlacementFeeForm
Page: `/finance/home/:id`
| Field | Input Type | Bound Field | Required |
|-------|-----------|-------------|----------|
| Resident | Select | resident_id | Yes |
| Local Authority | Text | local_authority | Yes |
| Weekly Rate | Number | weekly_rate | Yes |
| Fee Start Date | Date | fee_start_date | Yes |
| Invoice Day | Number (1–28) | invoice_day | No |
| Review Date | Date | review_date | No |
| Status | Select | status | Yes |

---

# 6. API / QUERY LAYER

## Primary Access Pattern: secureGateway

All frontend data access goes through `secureGateway` (→ `secureDataGateway` backend function). This function:
1. Authenticates the caller via `base44.auth.me()`
2. Resolves `StaffProfile` by email
3. Validates `org_id` against `Organisation` table
4. Injects `org_id` into all queries/writes
5. Applies home-scope filtering for non-admin roles

### Common Query Patterns

```javascript
// Fetch all active residents
secureGateway.filter('Resident', { status: 'active' }, '-created_date', 500)

// Fetch recent visit reports  
secureGateway.filter('VisitReport', {}, '-date', 200)

// Fetch homes active
secureGateway.filter('Home', { status: 'active' })

// Fetch daily logs for date
secureGateway.filter('DailyLog', {}, '-date', 500)

// Create a resident
secureGateway.create('Resident', { display_name, home_id, ... })

// Update resident status
secureGateway.update('Resident', id, { status: 'archived' })
```

### Direct SDK Calls (bypasses secureGateway — legacy/admin-only)

```javascript
// Used in Settings for KPI Options (admin only)
base44.entities.KPIOption.filter({ org_id: ORG_ID })
base44.entities.KPIOption.create({ ... })
base44.entities.KPIOption.update(id, { ... })
base44.entities.KPIOption.delete(id)

// Used in orgSettings.js
base44.entities.Organisation.list()
base44.entities.Organisation.update(id, { settings: merged })

// Used in AuthContext for profile resolution
base44.entities.StaffProfile.filter({ user_id: currentUser.id })
```

### Integration Calls

```javascript
// AI Report Generation
base44.integrations.Core.InvokeLLM({
  prompt: "...",
  response_json_schema: { type: "object", properties: { action: {}, outcome: {}, recommendations: {} } }
})

// File Upload
base44.integrations.Core.UploadFile({ file })
// → returns { file_url }
```

### Backend Functions

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `secureDataGateway` | All entity CRUD with org isolation | Yes |
| `createNotification` | Create Notification records | Yes (service role) |
| `generateEmployeeIds` | Bulk generate EMP-XXXX IDs | Yes (admin) |
| `createHome` | Create home with validation | Yes |
| `updateHome` | Update home record | Yes |
| `uploadHomeDocument` | Upload and attach document | Yes |
| Various `seed*` functions | Test data seeding | Admin only |

---

# 7. BUSINESS LOGIC & FUNCTIONS

### `getNavItemsForRole(role)` — lib/roleConfig.js
- **Input:** role string (admin|team_leader|support_worker|...)
- **Output:** Array of nav items the role is permitted to see
- **Logic:** Filters `allNavItems` where `item.roles.includes(role)`
- **Called from:** AppSidebar

---

### `applyScopeFilter(records, staffProfile)` — secureDataGateway.js
- **Input:** Array of entity records, staffProfile { role, org_id, home_ids }
- **Output:** Filtered array based on role
- **Logic:**
  - `admin` → all records where `r.org_id === org_id`
  - `team_leader` / `support_worker` → records where `r.home_id` is in `home_ids[]`, or no `home_id` field exists (org-wide)
- **Called from:** Every operation in secureDataGateway

---

### `getSetting(key, defaultValue)` — lib/orgSettings.js
- **Input:** Setting key string, fallback value
- **Output:** Setting value from `Organisation.settings` blob or defaultValue
- **Logic:** Loads org record (cached in module-level variable), reads `settings[key]`
- **Called from:** All Admin Control Panel tabs, various components

---

### `saveSettings(newSettings)` — lib/orgSettings.js
- **Input:** Object of key-value pairs to merge
- **Output:** Merged settings object
- **Logic:** Loads org record, merges new settings with existing, calls `Organisation.update()`
- **Side effect:** Updates module-level cache
- **Called from:** All Admin Control Panel save buttons

---

### `clearSettingsCache()` — lib/orgSettings.js
- **Input:** None
- **Output:** Resets `cachedSettings` and `cacheOrgId` to null
- **Called from:** After every saveSettings call to force fresh load

---

### `calcAge(dob)` — Residents.jsx (inline)
- **Input:** DOB string (ISO date)
- **Output:** Integer age in years, or null
- **Logic:** `today.getFullYear() - dob.getFullYear()` with birthday correction
- **Called from:** Residents page, YPCardView

---

### `timeAgo(isoStr)` — Residents.jsx (inline)
- **Input:** ISO datetime string
- **Output:** Human-readable relative time string (e.g. "3h ago", "2 days ago")
- **Called from:** YP card last activity display

---

### `getWeekStart(date)` — Shifts.jsx (inline)
- **Input:** Date object or string
- **Output:** Date of Monday of that week
- **Called from:** Shifts rota weekly navigation

---

### Risk Flag Derivation
DailyLog `flags[]` is a string array set by the form that creates the log. Special values:
- `"current_status"` — marks log as a Current Status entry (queried in YP cards)
- `"night_stay"` — marks log as a Night Stay entry for today
- `"edu_attendance"` — marks log as an Education Attendance entry
- `"meal_intake"` — marks log as a Meal Intake entry
- `"flagged"` — general manual flag for review

These are matched by string convention, not an enum or FK.

---

### Visit Duration Calculation
```javascript
// In VisitReportNew.jsx
const duration = (() => {
  if (!timeStart || !timeEnd) return null;
  const [sh, sm] = timeStart.split(':').map(Number);
  const [eh, em] = timeEnd.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
})();
```

---

### SWPerformanceKPI Population
When a VisitReport is saved, `SWPerformanceKPI.create()` is called with:
- `activity_type` = "visit_report" (or "key_worker_session" if `is_key_worker_session`)
- `week_start` = Monday of the report date
- `month` = "YYYY-MM" format
- KPI fields copied from the form answers

---

# 8. ROLES & PERMISSIONS

### Role: `admin`
- **Dashboard:** `/dashboard`
- **Can see:** All pages, all homes, all residents, all staff, all financial data
- **Can do:** Full CRUD on all entities; invite users; access Admin Control Panel; approve invoices; delete records
- **Row-level:** No restriction — sees all records within `org_id`

---

### Role: `admin_officer`
- **Dashboard:** `/house` (Admin Management)
- **Can see:** Homes, Bills, Documents, 18+ Accommodation module
- **Can do:** Create/edit homes and bills; manage documents
- **Row-level:** Org-scoped
- **Cannot:** Access resident care records, staff HR, financial placement fees, Admin Control Panel

---

### Role: `team_leader`
- **Dashboard:** `/tl-dashboard`
- **Can see:** Residents (assigned homes), Staff (assigned homes), Finance (assigned homes), Shifts, SW Performance
- **Can do:** Create/edit residents; approve shift requests; submit handovers; create invoices; manage rota
- **Row-level:** `home_ids[]` scoped — only sees records where `home_id` is in their assigned homes

---

### Role: `support_worker`
- **Dashboard:** `/sw-dashboard`
- **Can see:** Residents (assigned homes), Daily Logs, Visit Reports (own), My Shifts, SW Performance (own)
- **Can do:** Create daily logs; create visit reports; acknowledge shifts; update resident status flags
- **Row-level:** `home_ids[]` scoped — same as team_leader scope
- **Cannot:** View financial data; access staff HR; generate invoices; access Admin Control Panel

---

### Role: `resident`
- **Dashboard:** `/resident-portal`
- **Can see:** Own portal only
- **Note:** This role exists in config but the resident portal is a placeholder

---

### Role: `external`
- **Dashboard:** `/external-portal`
- **Can see:** External-facing portal only
- **Note:** Placeholder

---

### Admin Control Panel — Admin-only
All 20 tabs in the Admin Control Panel (`/settings` → Admin Control Panel tab) are admin-only. The entire Settings page checks `isAdmin` before rendering those tabs.

---

# 9. MODULE STATUS

| Module | Route | Status | What Works | What's Missing |
|--------|-------|--------|-----------|----------------|
| Landing Page | `/` | ✅ Fully built | Marketing sections, login CTA | — |
| Auth Redirect | `/auth-redirect` | ✅ Fully built | Token processing, role routing | — |
| Admin Dashboard | `/dashboard` | ✅ Fully built | KPIs, AI insights, risk, finance, incidents | Real-time updates |
| TL Dashboard | `/tl-dashboard` | ✅ Fully built | Home stats, team view | — |
| SW Dashboard | `/sw-dashboard` | ✅ Fully built | Clock in/out (localStorage), resident list | GPS clock-in |
| Residents / YP | `/residents` | ✅ Mostly built | YP cards, support plans, ILS plans, visit logs | Activities, Risk, Health, Education, Housing, Medicines tabs are placeholders |
| Visit Reports | `/visit-reports` | ✅ Fully built | Table, search, filter, detail view | — |
| New Visit Report | `/visit-reports/new` | ✅ Fully built | KPI form, AI generation, save | — |
| Staff & HR | `/staff` | ✅ Fully built | Staff list, profiles, availability, qualifications, hierarchy | Payroll integration |
| Homes Hub | `/homes-hub` | ⚠️ Partially built | My Homes tab works | Checks, Chores, Audit are placeholders |
| Home List | `/homes` | ✅ Fully built | Grid, type filter, stats | — |
| Home Detail | `/homes/:id` | ✅ Mostly built | 12 tabs | Some tabs may be thin |
| 24 Hours Hub | `/24hours` | ✅ Fully built | Shifts, rota, handovers, my shifts | — |
| Finance Overview | `/finance` | ✅ Fully built | Per-home navigation | — |
| Finance (Home) | `/finance/home/:id` | ✅ Mostly built | Placement fees, invoices, petty cash, allowances, budget | Invoice auto-generation not wired |
| Care Module | `/care` | ⚠️ Partially built | Resident list | CareResident detail page needs more tabs |
| 18+ Accommodation | `/18-plus` | ⚠️ Placeholder | Basic shell | Not developed |
| Admin Management | `/house` | ✅ Mostly built | Bills, properties, documents, compliance | — |
| SW Performance | `/sw-performance` | ✅ Fully built | KPI charts, worker breakdown | — |
| Analytics | `/analytics` | ⚠️ Partially built | Basic charts | Full AI analysis not complete |
| Messages | `/messages` | ⚠️ Placeholder | Basic shell | Not developed |
| Settings | `/settings` | ✅ Fully built | Profile, KPI options, all 20 Admin Panel tabs | 12 Admin Panel tabs are functional stubs |
| Resident Portal | `/resident-portal` | ⚠️ Placeholder | Shell only | Not developed |
| External Portal | `/external-portal` | ⚠️ Placeholder | Shell only | Not developed |

### Admin Control Panel Tab Status
| Tab | Status |
|-----|--------|
| Organisation | ✅ Fully built |
| Module Visibility | ✅ Fully built |
| Home Types | ✅ Fully built |
| KPI Form | ✅ Fully built |
| Financial Rules | ✅ Fully built |
| Petty Cash Rules | ✅ Fully built |
| Invoice Settings | ✅ Fully built |
| Resident and YP | ✅ Fully built |
| Care Settings | ⚠️ Functional stub (saves defaults) |
| Compliance Thresholds | ⚠️ Functional stub |
| Rota and Shifts | ⚠️ Functional stub |
| Handover Settings | ⚠️ Functional stub |
| Notification Rules | ⚠️ Functional stub |
| Dashboard Config | ⚠️ Functional stub |
| CIC Template | ⚠️ Functional stub |
| Analytics Settings | ⚠️ Functional stub |
| Staff and HR Rules | ⚠️ Functional stub |
| Security and Access | ⚠️ Functional stub |
| Data and Export | ⚠️ Functional stub |
| Audit Log | ⚠️ Functional stub |

---

# 10. KNOWN ISSUES & TECH DEBT

### 1. `worker_id` Field Inconsistency
**Issue:** `SWPerformanceKPI.worker_id` stores the worker's **email address**, while `VisitReport.worker_id` and `DailyLog.worker_id` store the **StaffProfile UUID**. This makes joins between these tables impossible without additional lookups.
**Impact:** SW Performance queries must match by email; cross-table analytics are fragile.
**Fix needed:** Standardise all `worker_id` fields to store `StaffProfile.id` UUID.

---

### 2. `org_id` Hardcoded as `"default_org"`
**Location:** `lib/roleConfig.js` — `export const ORG_ID = "default_org";`
**Issue:** This is hardcoded. Multi-tenancy support would require dynamic resolution.
**Impact:** Direct SDK calls (bypassing secureGateway) use this hardcoded value.
**Fix needed:** All direct `base44.entities.*` calls should be migrated to secureGateway.

---

### 3. Direct SDK Calls Bypass Security Gateway
**Locations:** `pages/Settings.jsx` (KPIOption queries), `lib/orgSettings.js` (Organisation reads/writes), `lib/AuthContext.jsx` (StaffProfile lookup)
**Issue:** These bypass `secureDataGateway` and its org_id enforcement, role-checking, and home-scoping.
**Risk:** Low for Organisation/KPIOption (admin-only), but represents architectural inconsistency.
**Fix needed:** Either route through gateway or explicitly document as privileged calls.

---

### 4. Settings Blob Not Type-Safe
**Issue:** `Organisation.settings` is a free-form JSON object. No schema validation. Any typo in a key name silently falls through to the default value.
**Impact:** Admin Control Panel saves could be silently lost if key names differ between tab and getSetting call.
**Fix needed:** Add a settings schema constants file with all key names as exported constants.

---

### 5. Clock In/Out Uses `localStorage`
**Location:** `pages/SWDashboard.jsx`
**Issue:** Shift clock-in/out state is stored in browser localStorage, not the database. Clears on browser data clear. Not auditable. Not visible to managers.
**Fix needed:** Persist clock-in/out events to a `ShiftClockEvent` entity or update `Shift.status`.

---

### 6. `DailyLog.flags[]` is Convention-Based
**Issue:** Flags like `"current_status"`, `"night_stay"`, `"edu_attendance"` are matched as string literals with no enum enforcement. A typo creates a silent bug.
**Fix needed:** Add an enum or constant file for flag values.

---

### 7. Denormalised Name Fields Across Multiple Tables
**Issue:** `resident_name`, `worker_name`, `home_name` are stored as strings alongside FKs on DailyLog, VisitReport, SWPerformanceKPI, etc. These can become stale if the source record is renamed.
**Impact:** Historical records may show wrong names if a resident or worker is renamed.
**Fix needed:** Accept this as a design decision for performance OR implement name sync on update.

---

### 8. `HomeSupportWorker` vs `StaffProfile.home_ids`
**Issue:** There are two mechanisms for linking staff to homes:
- `StaffProfile.home_ids[]` (array on the staff record)
- `HomeSupportWorker` entity (junction table)
These appear to be duplicates. It's unclear which is the authoritative source.
**Fix needed:** Pick one mechanism and deprecate the other.

---

### 9. Placeholder / Not-Started Resident Sub-tabs
**Issue:** 8 of the 14 sub-tabs in the Residents module render a `<PlaceholderTab>` component:
Activities, Risk & Behaviour, Health, Education, Housing & Transitions, Referrals, Medicines and Inventory
**Impact:** These navigation items appear but do nothing.

---

### 10. AuthContext Blocks All Users Without StaffProfile
**Location:** `lib/AuthContext.jsx` lines 109–117
**Issue:** If a user is in the auth system but has no matching `StaffProfile`, they receive a `no_staff_profile` error and cannot access the app at all. There is no self-registration flow or admin-create-profile flow documented.
**Impact:** Newly invited users who haven't had a StaffProfile created yet are locked out.

---

### 11. Admin Control Panel Settings Not Consumed In-App
**Issue:** The Admin Control Panel tabs save settings correctly to `Organisation.settings`, but most of the configured values (KPI form rules, financial rules, petty cash rules, resident visibility, etc.) are **not yet read back** by the actual forms and components they are supposed to affect.
**Impact:** Saving settings in the panel has no visible effect on PettyCash forms, ResidentForm, YPCard display, etc. until the consuming components are updated to call `getSetting()` at render time.
**Priority:** High — this is the primary outstanding integration task for the Admin Control Panel.

---

### 12. `property_id` Legacy Field
**Issue:** `HomeDocument.property_id` exists as a legacy FK from an older data model where `Property` was a separate entity. `Property` was merged into `Home` during a migration. `property_id` is now unused but still appears in the schema.

---

### 13. Seeding Functions in Production
**Issue:** Multiple `seed*` backend functions exist (`seedDashboardData`, `seedResidentActivityData`, `seedTestLogs`, etc.) that were used during development and testing. These exist in the production function list.
**Risk:** If accidentally called, they could pollute production data.
**Fix needed:** Delete or restrict seeding functions to dev environment only.

---

*End of Documentation*
*For queries about specific implementation details, refer to the source files listed in each section.*