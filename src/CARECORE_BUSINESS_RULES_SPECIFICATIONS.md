# CareCore Platform — Business Rules Specifications

**Version:** 1.0  
**Last Updated:** May 2, 2026  
**Audience:** Backend developers, business analysts, compliance officers

---

## Table of Contents

1. [Compliance & Readiness Scoring](#1-compliance--readiness-scoring)
2. [Absence Management (Bradford Factor)](#2-absence-management-bradford-factor)
3. [Training Requirements](#3-training-requirements)
4. [Working Time Regulations (WTR)](#4-working-time-regulations-wtr)
5. [Payroll Calculations](#5-payroll-calculations)
6. [Risk Assessment Scoring](#6-risk-assessment-scoring)
7. [Support Plan Logic](#7-support-plan-logic)
8. [Transition & Move-On Rules](#8-transition--move-on-rules)

---

## 1. Compliance & Readiness Scoring

### 1.1 Ofsted Readiness Score (Overall Platform)

**Purpose:** Calculate organization's compliance readiness across 8 domains.

**Formula:**
```
Overall Readiness Score = (Sum of all domain scores × weights) / 100

Where:
- Each domain has a max score of 100
- Each domain has a weight (% of total)
- Final score: 0-100 (target: ≥85)
```

**Domain Weights:**
| Domain | Weight | Max Points | Rationale |
|--------|--------|-----------|-----------|
| Safeguarding & Child Protection | 20% | 100 | Critical: prevents harm |
| Quality of Care & Support | 18% | 100 | Resident wellbeing |
| Staffing & Professional Development | 17% | 100 | Staff capability |
| Leadership & Management | 15% | 100 | Organizational health |
| Compliance & Governance | 15% | 100 | Legal/regulatory |
| Premises & Safety | 10% | 100 | Physical environment |
| Financial Management | 3% | 100 | Business sustainability |
| Outcomes & Progress | 2% | 100 | Resident achievements |

### 1.2 Safeguarding & Child Protection Domain (20%)

**Sub-metrics:**

| Metric | Max Points | Calculation | Threshold |
|--------|-----------|-----------|-----------|
| Missing From Home Response | 25 | (Incidents with <4h response) / (Total MFH) × 25 | ≥95% |
| Safeguarding Alerts Created | 25 | (Concerns logged) / (Potential concerns) × 25 | ≥90% |
| Risk Assessments Current | 25 | (Up-to-date assessments) / (Total residents) × 25 | 100% within 6 months |
| DBS Compliance | 15 | (Valid DBS staff) / (Total staff) × 15 | 100% |
| Training Completion | 10 | (Safeguarding trained staff) / (Total staff) × 10 | ≥95% |

**Domain Score Calculation:**
```
Safeguarding Score = Sum of above metrics

Example:
- MFH Response: 24/25 (96% > 95% threshold)
- Safeguarding Alerts: 23/25 (92% > 90%)
- Risk Assessments: 25/25 (100% within 6 months)
- DBS: 15/15 (100%)
- Training: 9/10 (90% staff trained)
= 24 + 23 + 25 + 15 + 9 = 96/100
```

### 1.3 Quality of Care & Support Domain (18%)

| Metric | Max Points | Calculation | Threshold |
|--------|-----------|-----------|-----------|
| Support Plans Complete | 20 | (YP with complete 12-section plans) / (Total YP) × 20 | ≥90% |
| Plan Reviews On Time | 20 | (Reviews within 12-month window) / (Plans due) × 20 | ≥95% |
| Significant Events Logged | 20 | (Incidents properly documented) / (Reported incidents) × 20 | 100% |
| Resident Satisfaction | 20 | (Survey score 4-5 out of 5) / (Total responses) × 20 | ≥80% |
| Health Checks Current | 20 | (Annual health reviews completed) / (Total YP) × 20 | ≥95% |

### 1.4 Staffing & Professional Development Domain (17%)

| Metric | Max Points | Calculation | Threshold |
|--------|-----------|-----------|-----------|
| Training Compliance | 30 | (Staff with current training) / (Total staff) × 30 | ≥95% |
| Supervision Regularity | 25 | (Staff receiving monthly supervision) / (Total staff) × 25 | ≥95% |
| Appraisal Completion | 25 | (Annual appraisals done) / (Due) × 25 | ≥95% |
| Staff Turnover Rate | 20 | (100 - turnover %) × 0.2 | <15% turnover |

### 1.5 Leadership & Management Domain (15%)

| Metric | Max Points | Calculation | Threshold |
|--------|-----------|-----------|-----------|
| Manager Suitability Assessment | 30 | (Manager competency score) / 10 × 3 | Score ≥7/10 |
| Reg44 Visits Completed | 25 | (Completed visits) / (Due visits) × 25 | ≥95% (bi-monthly) |
| Performance Management | 25 | (Staff with clear goals) / (Total staff) × 25 | ≥80% |
| Strategic Planning | 20 | (Business plan current) × 20 | Yes = 20 |

### 1.6 Compliance & Governance Domain (15%)

| Metric | Max Points | Calculation | Threshold |
|--------|-----------|-----------|-----------|
| Policies Up-to-Date | 30 | (Current policies) / (Total policies) × 30 | ≥90% reviewed within 12m |
| Audit Trail Complete | 25 | (Logged actions) / (Total actions) × 25 | 100% |
| Data Protection Compliance | 25 | (GDPR requirements met) / (Total requirements) × 25 | 100% |
| Financial Controls | 20 | (Audit findings resolved) × 20 | 0 critical findings |

### 1.7 Premises & Safety Domain (10%)

| Metric | Max Points | Calculation | Threshold |
|--------|-----------|-----------|-----------|
| Fire Safety Certificate | 20 | Valid certificate × 20 | Current |
| Gas Safety Certificate | 20 | Valid certificate × 20 | Current |
| Electrical Safety | 20 | Valid certificate × 20 | Current |
| Legionella Assessment | 20 | Valid assessment × 20 | Current |
| Health & Safety Incident Rate | 20 | (0 serious incidents) / (Period) × 20 | <1 per 1000 staff-days |

### 1.8 Financial Management Domain (3%)

| Metric | Max Points | Calculation | Threshold |
|--------|-----------|-----------|-----------|
| Budget Variance | 50 | (100 - |budget variance %|) × 0.5 | ±10% variance |
| Invoice Payment On Time | 50 | (On-time payments) / (Total invoices) × 50 | ≥95% |

### 1.9 Outcomes & Progress Domain (2%)

| Metric | Max Points | Calculation | Threshold |
|--------|-----------|-----------|-----------|
| Education Progress | 50 | (YP progressing in ETE) / (Total YP) × 50 | ≥70% |
| Move-On Success | 50 | (Successful moves / placements) × 50 | ≥80% stable |

**Calculation Example (Full Organization):**
```
Safeguarding: 96/100 × 0.20 = 19.2
Quality of Care: 88/100 × 0.18 = 15.84
Staffing: 91/100 × 0.17 = 15.47
Leadership: 85/100 × 0.15 = 12.75
Compliance: 92/100 × 0.15 = 13.8
Premises: 100/100 × 0.10 = 10
Financial: 87/100 × 0.03 = 2.61
Outcomes: 78/100 × 0.02 = 1.56

Total Score = 19.2 + 15.84 + 15.47 + 12.75 + 13.8 + 10 + 2.61 + 1.56 = 91.23/100

Band: GOOD (85-94 = Requires Improvement, 85-94 = Good, 95-100 = Outstanding)
```

---

## 2. Absence Management (Bradford Factor)

### 2.1 Bradford Factor Formula

**Purpose:** Identify problematic absence patterns (frequent short absences worse than long illness).

**Formula:**
```
Bradford Factor = (Number of separate spells of absence)² × (Total days absent)

Example:
- 5 separate 1-day absences = 5² × 5 = 125
- 1 illness of 5 days = 1² × 5 = 5

The first is worse (125 vs 5) despite same total days.
```

### 2.2 Absence Types & Counting Rules

| Type | Counts Toward Spells? | Paid? | Notes |
|------|----------------------|-------|-------|
| Sickness (≤1 day) | Yes | Yes (SSP) | Separate spell if >1 day gap |
| Sickness (>1 day) | Yes | Yes (SSP) | Single spell regardless of length |
| Continuous illness (>28 days) | Counted as 1 spell | Yes (Statutory Sick Pay) | Resets after return + 4+ weeks |
| Approved holiday | No | Yes | Does not affect Bradford Factor |
| Approved unpaid leave | No | No | Does not affect Bradford Factor |
| Unauthorized absence | Yes (double) | No | Counts as 2 spells for each incident |
| Maternity leave | No | Yes | Protected—does not count |
| Medical appointment (≤2 hours) | No | Yes | Does not count as spell |
| Medical appointment (>2 hours) | Yes | Yes | Counts as half-day spell |

### 2.3 Bradford Factor Thresholds & Actions

| Score | Trigger | Action | Timeline |
|-------|---------|--------|----------|
| 0-49 | Low | Monitor—no action | Ongoing |
| 50-99 | Moderate | First discussion with employee | Within 1 week |
| 100-149 | High | Formal review meeting + absence plan | Within 5 days |
| 150-199 | Very High | Formal warning + HR involvement | Within 3 days |
| 200+ | Critical | Disciplinary procedure + occupational health referral | Immediately |

**First Discussion (50-99):**
- Line manager meets with staff member
- Review absence pattern
- Identify any health/personal issues
- Document discussion
- No formal warning yet

**Formal Review (100-149):**
- HR-led meeting with employee
- Absence improvement plan created
- Target: Reduce factor to <100 within 3 months
- May require GP note for recurring sickness
- Documented in personnel file

**Formal Warning (150-199):**
- Written warning issued
- Issued per disciplinary procedure
- 12-month warning period
- Further absences within 12 months trigger escalation
- Occupational health referral mandatory

**Disciplinary Procedure (200+):**
- Suspension pending investigation
- Occupational health assessment
- Potential dismissal on grounds of capability
- Follow full ACAS guidance

### 2.4 Bradford Factor Reset

```
Factor resets 12 months after the LAST spell of absence.

Example:
- Last absence: 1 May 2026
- Bradford factor active until: 1 May 2027
- After 1 May 2027: Factor resets to 0

Continuous absence >28 days resets the 12-month clock.
```

---

## 3. Training Requirements

### 3.1 Mandatory Training by Role

**All Staff (Annual):**

| Course | Frequency | Duration | Threshold | Refresh |
|--------|-----------|----------|-----------|---------|
| Safeguarding | Annual | 3 hours | ≥95% pass | Every 12 months |
| Health & Safety | Annual | 2 hours | ≥80% pass | Every 12 months |
| GDPR & Data Protection | Annual | 1 hour | ≥90% pass | Every 12 months |
| Fire Safety | Annual | 1.5 hours | Competency | Every 12 months |
| First Aid (Level 3) | Every 3 years | 2 days | Competency | Every 36 months |
| Manual Handling | Every 3 years | 1 day | Competency | Every 36 months |
| Food Safety | Every 2 years | 0.5 days | Competency | Every 24 months |

**Children's Home Staff (Additional):**

| Course | Frequency | Duration | Threshold |
|--------|-----------|----------|-----------|
| Child Development | Every 3 years | 2 days | Competency |
| Trauma-Informed Care | Every 2 years | 1 day | Competency |
| Safeguarding (Children) | Annual | 3 hours | ≥95% pass |
| Emotional Regulation | Every 2 years | 1 day | Competency |

**Support Workers:**

| Course | Frequency | Duration | Threshold |
|--------|-----------|----------|-----------|
| NVQ Level 2/3 Childcare | Every 3 years | Ongoing | Competency |
| Behaviour Management | Every 2 years | 1 day | Competency |
| Medication Support | Every 2 years | 0.5 days | Competency |

**Team Leaders (Additional):**

| Course | Frequency | Duration | Threshold |
|--------|-----------|----------|-----------|
| Management Skills | Every 3 years | 2 days | Competency |
| Supervision Skills | Every 3 years | 1 day | Competency |
| HR & Employment Law | Every 2 years | 1 day | Competency |
| Safeguarding (Advanced) | Annual | 1 day | Competency |

### 3.2 Training Compliance Calculation

**Mandatory Training Score:**
```
Score = (Staff with all mandatory training current) / (Total staff) × 100

Requirements:
- All courses must be within renewal date
- No grace period (must be completed by expiry)
- New staff: 30-day onboarding window before courses mandatory

Compliance thresholds:
- ≥95% = COMPLIANT (green)
- 90-94% = AT RISK (yellow)
- <90% = NON-COMPLIANT (red)
```

### 3.3 Training Escalation

**30 days before expiry:**
- System sends reminder email to staff member + line manager
- Notification appears on dashboard

**7 days before expiry:**
- Second reminder email
- Manager notified of imminent expiry
- May restrict shift assignments (if safety-critical)

**On expiry date:**
- Course automatically marked overdue
- Staff cannot work unsupervised (if safeguarding-critical)
- Manager flagged for disciplinary discussion

**30 days after expiry:**
- Formal breach recorded
- Affects compliance score
- May suspend staff from shifts (if child-facing)

---

## 4. Working Time Regulations (WTR)

### 4.1 WTR Breach Thresholds

**UK Working Time Regulations 1998:**

| Rule | Threshold | Calculation | Tolerance |
|------|-----------|-----------|-----------|
| **Weekly Hours** | ≤48 hours | Average over 17-week reference period | 0% (strict) |
| **Daily Rest** | ≥11 hours | Between end of work one day and start next | 0% |
| **Weekly Rest** | ≥1 day off | Per 7-day period (usually Sunday) | Must take 2 per 14 days |
| **In-Work Breaks** | ≥20 mins | If working >6 hours | Can't be consecutive |
| **Night Work** | ≤8 hours | Average per 24-hour period (10pm-6am) | Over 17-week period |

### 4.2 Shift Scheduling Rules

**Illegal Combinations (Prevent at Scheduling):**
```
❌ Early shift (06:00-14:00) + Late shift (14:00-22:00) = 0 hours rest = BREACH
✓ Early shift (06:00-14:00) + Late shift (next day 14:00-22:00) = 14+ hours rest = OK

❌ Night shift (22:00-06:00) 5 days straight = exceeds night work average
✓ Night shift (22:00-06:00) 2 days per week = OK

❌ 60 hours in one week
✓ Average 48 hours over 17 weeks
```

### 4.3 WTR Breach Detection Algorithm

**Weekly Hours Check (Run Every Sunday 23:59):**
```
FOR each staff member:
  hours_this_week = SUM(shift.duration) for shifts in past 7 days
  
  IF hours_this_week > 48:
    reference_period = past 17 weeks
    average_hours = SUM(all hours in 17 weeks) / 17
    
    IF average_hours > 48:
      FLAG: WTR breach — excessive weekly hours
      Alert team lead + manager
      severity = (average_hours - 48) (in hours)
```

**Daily Rest Check (Run After Every Shift Sign-Out):**
```
FOR each staff member:
  last_shift_end = TODAY shift.end_time
  next_shift_start = TOMORROW (or next working day) shift.start_time
  
  rest_hours = next_shift_start - last_shift_end
  
  IF rest_hours < 11:
    FLAG: WTR breach — insufficient daily rest
    Alert: team lead + manager
    deficit = 11 - rest_hours (in hours)
```

**Night Work Average (Run Weekly):**
```
FOR each staff member:
  night_shifts_17w = shifts between 22:00-06:00 in past 17 weeks
  night_hours_17w = SUM(duration) for night shifts
  weeks = 17
  
  average_nightly_hours = night_hours_17w / weeks
  
  IF average_nightly_hours > 8:
    FLAG: WTR breach — excessive night work
    Alert: manager + occupational health
    average = average_nightly_hours
```

### 4.4 Breach Remediation

**Minor Breach (Alert Only):**
- Notify manager + team lead
- Document in shift log
- No disciplinary action
- Offer: paid rest day within 1 week

**Repeated Breach (3+ in 4 weeks):**
- Formal review meeting
- Adjust rota to prevent future breaches
- Document improvement plan
- HR involvement

**Serious/Ongoing Breach:**
- Investigation
- Potential disciplinary
- Staff may be suspended from shifts
- Report to HSE if systemic

---

## 5. Payroll Calculations

### 5.1 Gross Pay Calculation

**Formula:**
```
Gross Pay = (Scheduled Hours × Hourly Rate) + Overtime Pay

Where:
- Scheduled Hours = contracted hours worked
- Overtime = hours beyond 37.5 per week (or contract hours)
- Overtime Pay = Overtime Hours × (Hourly Rate × 1.5)

Example:
- Hourly Rate: £10.00
- Scheduled Hours This Week: 40
- Overtime: 5 hours
- Gross = (40 × £10) + (5 × £10 × 1.5)
- Gross = £400 + £75 = £475
```

### 5.2 Income Tax Calculation (PAYE)

**2026-27 Tax Year (UK):**

| Tax Code | Personal Allowance | Annual Tax-Free | Notes |
|----------|-------------------|-----------------|-------|
| **1257L** | £12,570 | £12,570 | Standard (most staff) |
| **0T** | £0 | £0 | Emergency/no allowance |
| **BR** | £0 | £0 | Basic rate (2nd job) |
| **D0** | Variable | Variable | Higher rate |
| **D1** | Variable | Variable | Additional rate |
| **X** | Variable | Variable | Abnormal cessation |

**Tax Bands (2026-27):**

| Band | Income | Tax Rate |
|------|--------|----------|
| Personal Allowance | £0 - £12,570 | 0% |
| Basic Rate | £12,571 - £50,270 | 20% |
| Higher Rate | £50,271 - £125,140 | 40% |
| Additional Rate | £125,141+ | 45% |

**Calculation (Weekly, Tax Code 1257L):**
```
Weekly Personal Allowance = £12,570 / 52 = £241.73

Weekly Calculation:
1. Gross Pay = £475
2. Taxable Pay = £475 - £241.73 = £233.27
3. Tax = £233.27 × 20% = £46.65 (basic rate)
4. Check YTD to avoid overpayment
```

**YTD (Year-to-Date) Reconciliation:**
```
At week 26 (mid-June):
- Cumulative Gross: £12,350
- Cumulative Tax-Free (50% of allowance): £6,285
- Cumulative Taxable: £6,065
- Cumulative Tax at 20%: £1,213
- This week's tax: check against £1,213 / 26 = £46.65
- If YTD overpaid, refund next pay
```

### 5.3 National Insurance (NI) Calculation

**2026-27 Rates (Employee):**

| Band | Weekly Threshold | Rate | Annual Threshold |
|------|------------------|------|------------------|
| Below | <£175 | 0% | <£9,100 |
| Main | £175 - £967 | 10% | £9,100 - £50,270 |
| Above | >£967 | 2% | >£50,270 |

**Calculation (Weekly):**
```
Gross Pay = £475
NI Threshold = £175

1. Earnings above threshold = £475 - £175 = £300
2. Main rate (10%) = £300 × 0.10 = £30
3. No additional rate (stays below £967)
4. Total NI = £30
```

**Employer NI (Secondary):**
```
Threshold = £9,100 per year (£175 per week)
Rate = 15%

Earnings above threshold = £475 - £175 = £300
Employer NI = £300 × 0.15 = £45

(Employer pays this, not deducted from employee)
```

### 5.4 Pension Contribution

**Auto-Enrolment (Mandatory for qualifying workers):**

| Component | Employee % | Employer % | Notes |
|-----------|-----------|-----------|-------|
| Minimum | 3% | 2% | Qualifying earnings only |
| Target | 5% | 3% | Recommended |
| Enhanced | 6%+ | 4%+ | Optional per policy |

**Qualifying Earnings Band:**
```
2026-27: £6,725 - £50,270 per year (£129 - £967 per week)

Calculation:
- Gross Weekly Pay: £475
- Qualifying earnings = Min(£475, £967) - Min(0, £129)
- = £475 - £129 = £346
- Employee pension = £346 × 3% = £10.38
- Employer pension = £346 × 2% = £6.92
```

### 5.5 Net Pay Calculation

**Formula:**
```
Net Pay = Gross Pay - Income Tax - Employee NI - Pension - Other Deductions

Example (Weekly):
Gross Pay:              £475.00
- Income Tax:           -£46.65
- Employee NI:          -£30.00
- Pension (3%):         -£10.38
- Union Fees (if any):  -£0.00
- Court Order:          -£0.00
= Net Pay:              £388.97
```

**Monthly/Annual Extrapolation:**
```
Weekly Net: £388.97
Monthly (4.33 weeks): £1,685.26
Annual (52 weeks): £20,227.44

Payslip shows:
- Gross to date (YTD)
- Tax to date (YTD)
- NI to date (YTD)
- Pension to date (YTD)
- Net to date (YTD)
- P60 at year-end
```

### 5.6 Statutory Sick Pay (SSP)

**Eligibility:**
```
- Must have earned ≥£123/week (2026-27)
- Must have worked for employer ≥2 weeks
- Absence must be ≥4 consecutive days (including weekends/bank holidays)
```

**Rates (2026-27):**
```
First 3 days = Not paid (waiting period)
Days 4-28 = £111.35 per day (approx)
Day 29+ = Not paid by employer (moved to benefits)

Example:
5-day sickness (Mon-Fri):
- Days 1-3: £0 (waiting period)
- Days 4-5: £111.35 × 2 = £222.70 (SSP)

Calculation:
SSP = £111.35 × (eligible days)
Then deduct from normal pay if exceeds normal weekly salary
```

### 5.7 Payslip Components (Full Example)

```
PAYSLIP — May 2026 (Pay Period: 1-31 May)
Employee: John Doe | Payroll ID: EMP001 | NI: AB123456C | Tax Code: 1257L

EARNINGS:
  Basic Pay (172 hours × £10.00):        £1,720.00
  Overtime (8 hours × £15.00):           £120.00
  Bank Holiday Enhancement:              £0.00
                                    ─────────────
  Gross Pay:                             £1,840.00

DEDUCTIONS:
  Income Tax:                            -£250.40
  Employee National Insurance:           -£142.00
  Pension (3%):                          -£55.20
  Union Fees:                            -£0.00
  Court Order:                           -£0.00
                                    ─────────────
  Total Deductions:                      -£447.60

NET PAY:                                 £1,392.40

YTD SUMMARY (January - May):
  Gross YTD:                             £8,900.00
  Tax YTD:                               -£1,120.00
  NI YTD:                                -£710.00
  Pension YTD:                           -£267.00
                                    ─────────────
  Net YTD:                               £6,803.00

Employer contributions (not deducted):
  Employer NI:                           £142.00
  Employer Pension:                      £36.80
```

---

## 6. Risk Assessment Scoring

### 6.1 Risk Category Ratings

**9 Risk Categories (Residents):**

| Category | Examples | Rating Scale |
|----------|----------|---------------|
| **Suicide & Self-Harm** | Cutting, overdose, hanging risk | None / Low / Medium / High |
| **Harm to Others** | Violence, aggression, threats | None / Low / Medium / High |
| **Vulnerability** | Exploitation, abuse susceptibility | None / Low / Medium / High |
| **Criminal Exploitation** | County lines, organized crime | None / Low / Medium / High |
| **Sexual Exploitation** | CSE, grooming, abuse | None / Low / Medium / High |
| **Missing From Care** | Running away, unknown location | None / Low / Medium / High |
| **Substance Misuse** | Alcohol, drugs, inhalants | None / Low / Medium / High |
| **Communication/Language** | Cannot express needs, misunderstanding | None / Low / Medium / High |
| **Online Safety** | Grooming, cyberbullying, exposure | None / Low / Medium / High |

### 6.2 Risk Level Calculation

**For Each Category:**
```
Overall Risk = FUNCTION(is_present, likelihood, consequence, protective_factors)

Where:
- is_present = Actual observable indicators (None / Low / Medium / High)
- likelihood = Probability of occurrence in next 6 months (Low / Medium / High)
- consequence = Severity if occurs (Low / Medium / High)
- protective_factors = Mitigating strengths (text assessment)
```

**Scoring Matrix:**

| is_present | Likelihood | Consequence | Overall |
|-----------|-----------|-------------|---------|
| None | - | - | **NONE** |
| Low | Low | Low | **LOW** |
| Low | Low | Medium | **LOW** |
| Low | Medium | High | **MEDIUM** |
| Medium | Low | Low | **LOW** |
| Medium | Medium | Low | **MEDIUM** |
| Medium | Medium | Medium | **MEDIUM** |
| Medium | High | Medium | **HIGH** |
| High | Any | Any | **HIGH** |
| Any | High | High | **HIGH** |

**Example:**
```
Category: Sexual Exploitation
- is_present = "Medium" (some concerning behaviors noted)
- likelihood = "High" (significant risk factor present)
- consequence = "High" (severe if exploited)
- protective_factors = "Strong key worker, supervised outings, family contact"

Overall Rating = HIGH (due to High × High)

Action: Immediate safeguarding review, consider LA notification, heightened supervision
```

### 6.3 Resident Overall Risk Level

**Aggregated from all 9 categories:**

```
Resident Overall Risk = MAX(all category ratings)

Example:
- Suicide: LOW
- Harm to Others: LOW
- Vulnerability: MEDIUM
- Criminal Exploitation: NONE
- Sexual Exploitation: HIGH ← Max = HIGH
- Missing: MEDIUM
- Substance: LOW
- Communication: LOW
- Online: MEDIUM

Resident Overall = HIGH (due to sexual exploitation)
```

### 6.4 Risk Review Intervals

| Overall Level | Review Interval | Trigger Event |
|---------------|-----------------|---------------|
| NONE | Annually | New placement only |
| LOW | Every 6 months | Minor incident or no change |
| MEDIUM | Every 3 months | Regular review cadence |
| HIGH | Monthly | Active concerns, escalation |
| CRITICAL* | Weekly | Imminent danger, active intervention |

*Note: Critical is not in current schema but may be needed if assessed.

---

## 7. Support Plan Logic

### 7.1 Support Plan Completion Rules

**12 Sections Required:**

| Section | Status | Completion Rule |
|---------|--------|-----------------|
| 1. Placement Details | Required | Home, type, dates filled |
| 2. Family & Social | Required | Contact info, relationships documented |
| 3. Health | Required | GP, medical conditions, allergies entered |
| 4. Education | Required | ETE status, provider contact |
| 5. Risk Summary | Required | Min 1 risk assessment (≤6mo old) |
| 6. ILS Summary | Optional | May reference or skip |
| 7. Activities | Optional | Interests/clubs documented |
| 8. YP Views | Required | YP consultation recorded |
| 9. Attachments | Required | ≥1 document uploaded |
| 10. Signoff Preparation | Required | All above complete |
| 11. LA Reviews | Optional | IRO meeting notes |
| 12. Signoff | Required | Manager approval + date |

**All-or-Nothing Rule:**
```
Plan CAN be signed off only when:
- ALL 10 required sections have data
- No required section is empty
- YP consulted and documented
- No section is >6 months old (for time-sensitive sections)

IF any required section is incomplete:
  Sign-off button = DISABLED
  Show message: "Complete sections X, Y, Z to sign off"
```

### 7.2 Plan Review Dates

**Automatic Scheduling:**
```
Plan Signed Off: 01 May 2026
Next Review Date = 01 May 2027 (+ 12 months)

Alert Timeline:
- 01 April 2027: Reminder email (3 months before)
- 15 April 2027: Second reminder (1 month before)
- 01 May 2027: Plan marked "OVERDUE" (review due)
- 01 June 2027: Escalation to LA (1 month overdue)
```

### 7.3 Plan Archival & Versioning

**On New Plan Sign-Off:**
```
Current Plan:
- status = "active"
- signed_off = true

Previous Plan (if exists):
- status = "archived"
- archived_date = TODAY
- reason = "superseded by new plan"

Rule: Only 1 active plan per resident at any time
```

---

## 8. Transition & Move-On Rules

### 8.1 Move-On Eligibility

**Age Threshold:**
```
Standard children's home: Move-on at 18 years old
Extended care (certain circumstances): Up to 21 years old
Supported accommodation: 16-25 years old

Calculation:
DOB + 18 years = move-on date
Exception: If pathway plan indicates extended care, may extend to 21
```

### 8.2 Staying Close Offer

**Automatic Criteria:**
```
Young adult qualifies IF:
- In public care on 16th birthday, OR
- Entered care before age 16

Staying Close available for:
- 1 year post-move-on (to age 19), OR
- Until age 25 (if regular contact maintained)

Maximum contact: Monthly check-ins (minimum: quarterly)
```

### 8.3 Move-On Checklist

**Before Move-On, Complete:**

| Item | Status | Verification |
|------|--------|--------------|
| Accommodation secured | Required | Address confirmed |
| Tenancy type | Required | Independent/supported |
| ID documents | Required | Birth cert, passport |
| Benefits claimed | Required | UC/HB/Council Tax exemption |
| Bank account | Required | Own account (not parent's) |
| Emergency contact | Required | Non-parent contact identified |
| Staying close offer | Required | Verbal + written consent |
| Health registration | Required | Registered with new GP |
| Education/work plan | Required | ETE status agreed |
| Trusted adult identified | Required | Named person available |

**Move-On Blocked If:**
- Accommodation not confirmed
- No ID documents
- No staying close agreement
- High safeguarding risk without support plan

---

## 9. Calculation Reference Tables

### 9.1 Quick Reference: Thresholds

| Rule | Threshold | Period | Action |
|------|-----------|--------|--------|
| Weekly Working Hours | 48 hours | 17-week average | WTR breach if exceeded |
| Daily Rest | 11 hours | Per night | WTR breach if <11 |
| Bradford Factor | 100+ | Cumulative | First formal review |
| Bradford Factor | 150+ | Cumulative | Formal warning issued |
| Bradford Factor | 200+ | Cumulative | Disciplinary procedure |
| Training Overdue | 0 days | From expiry | Compliance breach |
| Compliance Score | 85+ | Annual | Target minimum |
| Risk Review | Based on level | Monthly (HIGH) to 12mo (LOW) | Schedule review |

---

## Appendix: Detailed Examples

### Example 1: Full Payslip Calculation

```
EMPLOYEE: Alice Smith
GROSS WEEKLY: £480
TAX CODE: 1257L
NI: AB123456C

WEEK 1 (1-7 May):
- Scheduled Hours: 40
- Overtime: 2 hours
- Gross: (40 × £12) + (2 × £12 × 1.5) = £480 + £36 = £516

DEDUCTIONS:
- Personal Allowance (weekly): £241.73
- Taxable Income: £516 - £241.73 = £274.27
- Income Tax (20%): £54.85
- NI (10% on £516 - £175): £34.10
- Pension (3% of £516): £15.48

NET: £516 - £54.85 - £34.10 - £15.48 = £411.57
```

### Example 2: Bradford Factor Progression

```
EMPLOYEE: Bob Johnson

SPELL 1: Monday 1 May (1 day) → Spell count: 1, Days: 1, Factor: 1² × 1 = 1
SPELL 2: Thursday 4 May (1 day) → Spell count: 2, Days: 2, Factor: 2² × 2 = 8
SPELL 3: Monday 8 May (2 days) → Spell count: 3, Days: 4, Factor: 3² × 4 = 36
SPELL 4: Friday 12 May (1 day) → Spell count: 4, Days: 5, Factor: 4² × 5 = 80

SCORE: 80 → Yellow flag (50-99 range)
ACTION: First discussion with manager within 1 week
```

### Example 3: WTR Breach Detection

```
WEEK OF 29 APRIL:
- Monday: 08:00-16:00 (8h)
- Tuesday: 08:00-16:00 (8h)
- Wednesday: 14:00-22:00 (8h)
- Thursday: 08:00-16:00 (8h)
- Friday: 14:00-22:00 (8h)

TOTAL: 40 hours ✓ Under 48

BUT:
- Monday end 16:00 → Wednesday start 14:00 = 46 hours ✓ Over 11
- Tuesday end 16:00 → Wednesday start 14:00 = 22 hours ✓ Over 11

NO WTR BREACH (all rules satisfied)
```

---

**Document Version:** 1.0  
**Last Updated:** May 2, 2026  
**Distribution:** Backend developers, compliance team, HR, finance