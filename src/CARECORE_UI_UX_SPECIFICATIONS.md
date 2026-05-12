# CareCore Platform — UI/UX Specifications

**Version:** 1.0  
**Last Updated:** May 2, 2026  
**Audience:** External development team, product designers, UX researchers

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Core Page Layouts](#3-core-page-layouts)
4. [User Flows](#4-user-flows)
5. [Component Library](#5-component-library)
6. [Responsive Behavior](#6-responsive-behavior)
7. [Accessibility Requirements](#7-accessibility-requirements)

---

## 1. Design System

### 1.1 Color Palette

**Primary Colors:**
- **Primary Blue:** `#217EFF` (Button CTA, links, primary actions)
- **Navy Background:** `#1A1F3A` (Sidebar, dark mode background)
- **Success Green:** `#10B981` (Checkmarks, approval, safe actions)
- **Warning Orange:** `#F97316` (Alerts, due soon, attention needed)
- **Critical Red:** `#DC2626` (Errors, high risk, overdue)
- **Neutral Gray:** `#6B7280` (Text secondary, borders, disabled states)

**Semantic Colors:**
- **Risk Level Low:** Light Green background with dark green text
- **Risk Level Medium:** Light Yellow background with orange text
- **Risk Level High:** Light Red background with red text
- **Risk Level Critical:** Dark Red background with white text

### 1.2 Typography

- **Font Family:** Inter (system fallback: -apple-system, BlinkMacSystemFont, Segoe UI)
- **Heading 1:** 32px, weight 700, line-height 1.2 (page titles)
- **Heading 2:** 24px, weight 600, line-height 1.3 (section titles)
- **Heading 3:** 18px, weight 600, line-height 1.4 (subsection titles)
- **Body:** 14px, weight 400, line-height 1.6 (default text)
- **Small:** 12px, weight 400, line-height 1.5 (captions, helper text)
- **Monospace:** Monaco / Courier New (code blocks, reference numbers)

### 1.3 Spacing Scale

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

### 1.4 Border Radius

```
sm: 4px (small buttons, badges)
md: 8px (cards, inputs)
lg: 12px (larger components, modals)
full: 9999px (pills, circular elements)
```

### 1.5 Shadows

```
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px rgba(0,0,0,0.1)
lg: 0 10px 15px rgba(0,0,0,0.1)
xl: 0 20px 25px rgba(0,0,0,0.1)
```

---

## 2. Navigation Architecture

### 2.1 Top-Level Information Architecture

```
CareCore Platform
├─ Public Pages (unauthenticated)
│  ├─ Landing (/): Hero + features + CTA
│  └─ Login: OAuth redirect (handled by Base44)
│
├─ Admin/Manager Dashboards
│  ├─ Admin Dashboard (/dashboard): KPIs, home status, alerts
│  ├─ Team Leader Dashboard (/tl-dashboard): Home summary
│  └─ Support Worker Dashboard (/sw-dashboard): My shifts, my residents
│
├─ Core Modules
│  ├─ Residents (/residents): YP management, support plans, risk
│  ├─ Staff (/staff): HR, training, payroll, discipline
│  ├─ 24-Hour (/24hours): Shifts, rotas, handovers, sleep checks
│  ├─ Houses (/homes): Property, compliance, maintenance, tasks
│  ├─ Finance (/finance): Invoices, budgets, payroll
│  ├─ 18+ (/18-plus): Pathway plans, benefits, EET, move-on
│  └─ Care Services (/care-services): Health, education, leisure
│
└─ Settings & Admin
   ├─ Organization Settings (/settings)
   └─ User Profile
```

### 2.2 Primary Navigation (Sidebar)

**Desktop (>1024px):**
- Fixed left sidebar, 280px wide
- Logo + org name at top
- Main nav links (12 items max, grouped by role)
- Collapsible sub-sections (e.g., "Residents" expands to "Overview", "Plans", "Risk")
- User profile + logout at bottom
- Minimize icon (collapses to 80px icon-only view)

**Mobile (<1024px):**
- Bottom tab bar (5-6 primary items)
- Hamburger menu opens drawer sidebar
- Current section highlighted with blue underline

### 2.3 Secondary Navigation (Tab Bars)

**Residents Module Example:**
```
[Overview] [Young People] [Care Planning] [Safety] [Wellbeing] [Life & Community] [Records]
```
- Tabs scroll horizontally if > 8 tabs
- Active tab underlined in primary blue
- Content area below tab bar

---

## 3. Core Page Layouts

### 3.1 Admin Dashboard (`/dashboard`)

**Purpose:** Executive overview of all homes, residents, staff, compliance.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Admin Dashboard                       [⚙️]  │ (Header with settings)
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐ ┌──────────────┐        │
│  │ 23 Residents │ │ 45 Staff     │        │ (Metric cards, 4-column grid)
│  │ Across homes │ │ Active       │        │
│  └──────────────┘ └──────────────┘        │
│                                             │
│  ┌──────────────┐ ┌──────────────┐        │
│  │ 3 Missing    │ │ 12 High Risk │        │
│  │ From Home    │ │ Assessments  │        │
│  └──────────────┘ └──────────────┘        │
│                                             │
├─────────────────────────────────────────────┤
│ Urgent Alerts                               │ (Red alert section)
│ ├─ Alice (Resident A) missing >24hrs       │
│ ├─ DBS expiry alert: John (Staff)          │
│ └─ Reg44 inspection due: Home B            │
├─────────────────────────────────────────────┤
│ Homes Overview (scrollable table)           │
│ ┌─────────────────────────────────────────┐ │
│ │ Home   │ Capacity │ Current │ Manager   │ │
│ │─────────────────────────────────────────│ │
│ │ Home A │ 6 beds   │ 5/6     │ John D.   │ │
│ │ Home B │ 4 beds   │ 4/4     │ Sarah L.  │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Compliance Score (gauge chart)              │
│ ┌────────────────────────────┐              │
│ │ Overall: 87%               │              │
│ │ Training: 95% | DBS: 90%   │              │
│ │ Reg44: 78%   | Ofsted: ✓   │              │
│ └────────────────────────────┘              │
└─────────────────────────────────────────────┘
```

**Interactions:**
- Click metric card → filter residents/staff by that status
- Click alert → open detail modal or navigate to record
- Click home row → navigate to /homes/:id

---

### 3.2 Residents Overview (`/residents`)

**Purpose:** Central YP management with multi-tab interface.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Residents                      [⊕ Add]     │ (Header)
├─────────────────────────────────────────────┤
│ [Overview] [YP] [Plans] [Risk] [Health] ... │ (Primary nav)
├─────────────────────────────────────────────┤
│ Filter Bar:                                 │
│ [From Home: All ▼] [Age: All ▼] [🔍 Search] │
├─────────────────────────────────────────────┤
│ Showing 23 of 25 YP                         │
├─────────────────────────────────────────────┤
│                                             │
│ OVERVIEW TAB CONTENT:                       │
│                                             │
│ Metric Cards (4-col grid):                  │
│ ┌──────────┐ ┌──────────┐ ┌─────┐ ┌─────┐ │
│ │ 25 Total │ │ 3 Missing│ │ 8   │ │ 5   │ │
│ │ Active   │ │ From Home│ │High │ │Criti│ │
│ │ YP       │ │          │ │Risk │ │Risk │ │
│ └──────────┘ └──────────┘ └─────┘ └─────┘ │
│                                             │
│ Missing From Home (Alert Block):            │
│ ┌─────────────────────────────────────────┐ │
│ │ 🚨 URGENT: 3 residents missing         │ │
│ │ • Alice M. (24hrs) - unknown location   │ │
│ │ • Ben P. (18hrs) - likely with friend   │ │
│ │ • Chloe W. (6hrs) - at ex-partner's    │ │
│ │ [View Full List] [Create Report]        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ YP Card Grid (responsive, 2-4 cols):       │
│ ┌────────────────────┐ ┌────────────────┐ │
│ │ [Photo] Alice M.   │ │ [Photo] Ben P. │ │
│ │ Age: 15            │ │ Age: 17        │ │
│ │ Key Worker: John D │ │ Key Worker: S. │ │
│ │ Status: [HIGH RISK]│ │ Status: Medium │ │
│ │ Last Visit: 2h ago │ │ Last Visit: 1d │ │
│ │ [View] [Edit]      │ │ [View] [Edit]  │ │
│ └────────────────────┘ │ [Report Missing]│ │
│                        └────────────────┘ │
│ [Load More] or pagination...               │
│                                             │
└─────────────────────────────────────────────┘
```

**Tab Content (YP Tab):**
Shows card-based grid with status badges, quick actions.

---

### 3.3 Support Plan Editor (`/residents` → "Plans" tab)

**Purpose:** 12-section support plan completion + sign-off.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Support Plan: Alice M. (Age 15)             │
├─────────────────────────────────────────────┤
│ Status: [DRAFT] | Progress: 8/12 sections  │ (Progress bar: 67%)
│ [↓ Download PDF] [↗ Share with LA] [Sign Off]
├─────────────────────────────────────────────┤
│                                             │
│ Section 1: Placement Details ✓              │ (Green checkmark = complete)
│ ├─ Placement date: 01 Jan 2024              │
│ ├─ Type: Children's Home                    │
│ ├─ Aims (LA): "Provide safe accommodation" │
│ └─ [Edit]                                   │
│                                             │
│ Section 2: Family & Social ✓                │
│ ├─ Family background: Lives with mother...  │
│ ├─ Contacts: Mum (approved), Nan (pending)  │
│ └─ [Edit]                                   │
│                                             │
│ Section 3: Health 🟡 (In Progress)          │ (Yellow circle = incomplete)
│ ├─ GP: Dr Smith, NHS Practice               │
│ ├─ Allergies: Penicillin (severe)           │
│ ├─ Medical conditions: None recorded        │
│ └─ [Complete]                               │
│                                             │
│ ... Sections 4-11 (similar accordions) ...  │
│                                             │
│ Section 12: Signoff & Review ⭕             │ (Gray = locked until sections done)
│ ├─ Status: LOCKED (8/12 sections needed)    │
│ └─ [Unlock when ready]                      │
│                                             │
├─────────────────────────────────────────────┤
│ [← Back to YP List]  [Save Draft]  [Sign Off] │
│                                             │
└─────────────────────────────────────────────┘
```

**Signoff Modal (when clicked):**
```
┌─────────────────────────────────────┐
│ Sign Off Support Plan               │ X
├─────────────────────────────────────┤
│ This will mark the plan as ACTIVE   │
│ and set next review for:            │
│ 01 May 2027 (12 months)             │
│                                     │
│ Manager: [John Doe dropdown]        │
│ Password: [****] (confirm identity) │
│                                     │
│ [Cancel] [Sign Off]                 │
└─────────────────────────────────────┘
```

---

### 3.4 Staff Module (`/staff`)

**Purpose:** HR management, training, payroll, discipline.

**Primary Nav Tabs:**
```
[Dashboard] [Profiles] [Training] [Supervision] [Appraisals] [Leave] [Payroll] [Discipline]
```

**Dashboard Tab Layout:**
```
┌──────────────────────────────────────────┐
│ Staff Dashboard                          │
├──────────────────────────────────────────┤
│                                          │
│ Compliance Matrix (grid):                │
│ ┌─────────────┬─────────┬─────────────┐ │
│ │ Staff       │ DBS     │ Training    │ │
│ ├─────────────┼─────────┼─────────────┤ │
│ │ John D.     │ ✓ Valid │ 95% ✓      │ │
│ │ Sarah L.    │ ⚠ 30d   │ 87%        │ │
│ │ Mike T.     │ 🚨 Due  │ 72% Alert  │ │
│ │ Emma W.     │ ✓ Valid │ 100% ✓     │ │
│ └─────────────┴─────────┴─────────────┘ │
│                                          │
│ Upcoming Expirations (next 90 days):     │
│ ├─ Sarah L. — DBS expires in 30 days    │
│ ├─ Training renewals due (5 staff)      │
│ └─ Appraisals due (3 staff)             │
│                                          │
│ Absence Summary (this month):            │
│ ├─ Sickness: 3 days (John)              │
│ ├─ Holiday: 8 days (2 staff)            │
│ └─ Other: 1 day                         │
│                                          │
└──────────────────────────────────────────┘
```

**Staff Profile Tab:**
```
┌──────────────────────────────────────────┐
│ Staff: John Doe                [Edit]    │
├──────────────────────────────────────────┤
│                                          │
│ [Photo] John Doe         Role: Admin     │
│ Email: john@org.uk       Status: Active  │
│                                          │
│ Basic Info:                              │
│ ├─ Job Title: Operations Manager        │
│ ├─ Phone: 07700 900000                  │
│ ├─ Assigned Homes: Home A, Home B       │
│ └─ Line Manager: Sarah L.               │
│                                          │
│ Compliance:                              │
│ ├─ DBS: ✓ Valid until 15 Jan 2027      │
│ ├─ Training (last 12 months):           │
│ │  ├─ ✓ Safeguarding (15 Jan 2026)     │
│ │  ├─ ✓ First Aid (22 Feb 2025)        │
│ │  └─ ⚠ Manual Handling (due 30 Jun)   │
│ └─ Qualifications: NVQ L3 Childcare     │
│                                          │
│ Leave Balance (2025-2026):               │
│ ├─ Holiday: 25 days, 18 remaining       │
│ ├─ Sick: Unlimited                      │
│ └─ TOIL: 5 hours balance                │
│                                          │
│ Recent Actions:                          │
│ ├─ Appraisal: Due 22 May 2026          │
│ ├─ Supervision: Last 15 Apr 2026       │
│ └─ Training: Next due 30 Jun 2026      │
│                                          │
└──────────────────────────────────────────┘
```

---

### 3.5 24-Hour Module (`/24hours`)

**Purpose:** Shift scheduling, rotas, handovers, sleep checks.

**Primary Nav Tabs:**
```
[Shifts] [My Shifts] [Rota] [Handovers] [Sleep Checks]
```

**Rota Tab Layout (Weekly View):**
```
┌──────────────────────────────────────────┐
│ Rota: Week of 29 Apr - 5 May             │
│ [◀ Prev] [Week] [Month] [Next ▶]        │
├──────────────────────────────────────────┤
│                                          │
│ Mon 29 Apr:                              │
│ ┌─────────────────────────────────────┐ │
│ │ 06:00 - John D.  (Early)            │ │
│ │ 14:00 - Sarah L. (Late)             │ │
│ │ 22:00 - Mike T.  (Sleep-in)         │ │
│ │ [+ Add Shift]                       │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Tue 30 Apr:                              │
│ ┌─────────────────────────────────────┐ │
│ │ 06:00 - Emma W. (Early)  [⚠️ WTR Alert] │
│ │ 14:00 - John D. (Late)              │ │
│ │ 22:00 - Sarah L. (Sleep-in)         │ │
│ │ [+ Add Shift]                       │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ... Wed-Fri ...                          │
│                                          │
│ Alerts:                                  │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠️ WTR Breach Alert:                │ │
│ │    Emma W. — 50 hours this week     │ │
│ │    (limit: 48 hours)                │ │
│ │ [View Details]                      │ │
│ └─────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

**Handovers Tab Layout:**
```
┌──────────────────────────────────────────┐
│ Shift Handovers: Today (2 May 2026)     │
├──────────────────────────────────────────┤
│                                          │
│ 14:00 - End of Early Shift               │
│ From: John D. → To: Sarah L.             │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ ✅ Signed off by John D. at 13:58  │  │
│ │    Status: COMPLETE                │  │
│ │                                    │  │
│ │ Key Handover Notes:                │  │
│ │ • Alice: Attended GP appt, all ok  │  │
│ │ • Ben: Mood low, monitored        │  │
│ │ • Chloe: Refusing lunch, logged    │  │
│ │                                    │  │
│ │ Outstanding Tasks:                 │  │
│ │ • Follow up with Chloe re: eating │  │
│ │ • Phone call to SW tomorrow        │  │
│ │                                    │  │
│ │ [Download PDF] [Print]             │  │
│ └────────────────────────────────────┘  │
│                                          │
│ 22:00 - End of Late Shift                │
│ From: Sarah L. → To: Mike T.             │
│ ⏳ Awaiting sign-off...                  │
│                                          │
│ [Create New Handover]                    │
│                                          │
└──────────────────────────────────────────┘
```

---

### 3.6 Finance Module (`/finance`)

**Purpose:** Invoicing, budgets, expenses, payroll.

**Primary Nav Tabs:**
```
[Overview] [Invoices] [Bills] [Budgets] [Petty Cash] [Payroll]
```

**Overview Tab:**
```
┌──────────────────────────────────────────┐
│ Finance Dashboard                        │
├──────────────────────────────────────────┤
│                                          │
│ This Month Summary (May 2026):           │
│ ┌──────────────┐ ┌──────────────┐       │
│ │ Revenue:     │ │ Expenses:    │       │
│ │ £18,450      │ │ £22,340      │       │
│ │ (3 invoices) │ │ (from 5 LA)  │       │
│ └──────────────┘ └──────────────┘       │
│                                          │
│ Budget Status (Annual 2026):             │
│ ┌─────────────────────────────────────┐ │
│ │ Category        Budget  Spent  %    │ │
│ ├─────────────────────────────────────┤ │
│ │ Staffing        £450k  £186k  41% ▓ │ │
│ │ Utilities       £45k   £19k   42% ▓ │ │
│ │ Food            £60k   £28k   47% ▓ │ │
│ │ Maintenance     £30k   £14k   47% ▓ │ │
│ │ Other           £15k   £8k    53% ▓ │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Outstanding Invoices (Overdue):          │
│ • Home A → LA XYZ: £12,450 (23 days)    │
│ • Home B → LA ABC: £6,200 (18 days)     │
│ [View Full List]                         │
│                                          │
└──────────────────────────────────────────┘
```

**Payroll Tab:**
```
┌──────────────────────────────────────────┐
│ Payroll: May 2026 (Period: 1-31 May)    │
│ Status: DRAFT | [Process] [Approve]     │
├──────────────────────────────────────────┤
│                                          │
│ Staff Timesheets (5 submitted):          │
│ ┌─────────────────────────────────────┐ │
│ │ Staff       Hours  Gross    Status  │ │
│ ├─────────────────────────────────────┤ │
│ │ John D.     172    £3,440  ✓        │ │
│ │ Sarah L.    160    £3,200  ✓        │ │
│ │ Mike T.     154    £3,080  ✓        │ │
│ │ Emma W.     168    £3,360  ✓        │ │
│ │ Ben P.      165    £3,300  ✓        │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Total Payroll: £16,380                  │
│ ├─ Gross Pay: £16,380                  │
│ ├─ Tax: -£2,456 (15%)                  │
│ ├─ NI: -£1,148 (7%)                    │
│ ├─ Pension: -£1,310 (8%)               │
│ └─ Net: £11,466                        │
│                                          │
│ [Download Payslips] [Send Email] [Process]│
│                                          │
└──────────────────────────────────────────┘
```

---

## 4. User Flows

### 4.1 Visit Report Submission Flow

```
START: Support Worker Dashboard
│
├─ Click [Create Visit Report]
│  ↓
├─ STEP 1: Select Resident & Date
│  ├─ Resident dropdown (search if >10)
│  ├─ Date picker (default: today)
│  ├─ Visit type radio (face-to-face / phone / video)
│  └─ [Continue]
│  ↓
├─ STEP 2: Visit Details Form
│  ├─ Duration (HH:MM input)
│  ├─ Topics (multi-select checklist)
│  ├─ YP Mood/Demeanor (text area)
│  ├─ Observations (rich text)
│  ├─ Issues Identified (text area)
│  ├─ Actions Required (text area)
│  ├─ Next Visit Planned? (toggle)
│  │  └─ If yes → date picker for next visit
│  ├─ Flag for Safeguarding? (toggle)
│  │  └─ If yes → severity selector
│  └─ [Save Draft] [Submit for Approval]
│  ↓
├─ STEP 3: Confirmation
│  ├─ "Report submitted successfully"
│  ├─ "Awaiting team lead approval"
│  └─ [View Report] [Back to Dashboard]
│  ↓
└─ END: Notification sent to Team Lead

TEAM LEAD PATH:
│
├─ Notification: "New visit report awaiting approval"
│  ↓
├─ Click notification → /visit-reports
│  ├─ View report details
│  ├─ Read safeguarding flag (if present)
│  ├─ [Approve] or [Request Changes]
│  ↓
├─ If approved:
│  ├─ Status changes to "Signed Off"
│  ├─ Notification sent to support worker
│  └─ Report archived
│
└─ If requested changes:
   ├─ Support worker gets notification
   └─ Report returns to draft, can edit
```

---

### 4.2 Support Plan Signoff Flow

```
START: Care Team completes all 12 sections
│
├─ System calculates: all_sections_complete = TRUE
│  ↓
├─ Manager views plan, sees [Sign Off] button enabled
│  ↓
├─ Clicks [Sign Off]
│  ↓
├─ Modal appears:
│  ├─ Confirm 12 sections complete ✓
│  ├─ YP name: Alice M. (read-only)
│  ├─ Current review date (today)
│  ├─ Next review date will be: [today + 12 months]
│  ├─ Manager dropdown (pre-filled with current user)
│  ├─ Password confirmation (security)
│  └─ [Cancel] [Confirm Sign Off]
│  ↓
├─ If confirmed:
│  ├─ SupportPlanSignoff record created
│  ├─ SupportPlan.signed_off = TRUE, status = "active"
│  ├─ PDF generated (6-8 page document)
│  ├─ Notifications sent to:
│  │  ├─ YP (if 16+)
│  │  ├─ Parents/Guardians
│  │  └─ Social Worker
│  ├─ Email sent with PDF attachment
│  ├─ Calendar reminder set for next review
│  └─ Success message: "Plan signed off. LA notified."
│  ↓
└─ END: Plan is ACTIVE
```

---

### 4.3 Timesheet Approval Flow

```
START: Support Worker Clock In/Out
│
├─ Worker clocks in (Shift record created)
├─ Worker works through shift
├─ Worker clocks out (Shift.sign_out_time set)
│  ↓
├─ System aggregates shifts for week/month
│  ↓
├─ Timesheet auto-generated with status: DRAFT
│  ↓
├─ Worker reviews timesheet
│  ├─ Total hours calculated
│  ├─ Overtime hours calculated
│  ├─ Gross pay preview shown
│  └─ [Submit Timesheet]
│  ↓
├─ Team Lead receives notification
│  ↓
├─ Team Lead reviews in /staff → Timesheets
│  ├─ Checks hours against scheduled shifts
│  ├─ Verifies accuracy
│  ├─ Notes any anomalies
│  └─ [Approve] or [Request Changes]
│  ↓
├─ If approved:
│  ├─ Timesheet status = "approved"
│  ├─ Posted to HomeExpense (staffing cost)
│  ├─ Finance officer sees in payroll queue
│  └─ Worker notified
│  ↓
├─ Finance officer processes payroll (monthly)
│  ├─ Aggregates all approved timesheets
│  ├─ Calculates: gross pay + deductions
│  ├─ Generates payslips
│  ├─ Sends emails to staff
│  └─ Marks "paid"
│  ↓
└─ END: Worker receives salary
```

---

## 5. Component Library

### 5.1 Common Components

| Component | Usage | Props | Notes |
|-----------|-------|-------|-------|
| **Button** | Primary actions | variant (primary/secondary/ghost), size (sm/md/lg), disabled | Always has icon or clear label |
| **Input** | Text fields | type, placeholder, error, disabled | Required indicator for required fields |
| **Select** | Dropdowns | options, value, onChange, disabled | Search if >10 options |
| **Checkbox** | Multi-select | label, checked, onChange | Use for lists of options |
| **Radio** | Single select | options, value, onChange | Use for 2-5 mutually exclusive choices |
| **Toggle** | On/Off | checked, onChange, label | Use for binary choices only |
| **Badge** | Status indicators | variant (success/warning/critical), text | Never clickable |
| **Modal** | Overlay dialogs | title, children, onClose, footer | Confirm buttons bottom-right |
| **Card** | Content containers | children, header, footer, onClick | Default: white bg, shadow-md |
| **Table** | Tabular data | columns, data, sortable, pagination | Sticky header on scroll |
| **Tabs** | Section navigation | tabs[], activeTab, onChange | Underline indicator |
| **Accordion** | Collapsible sections | items[], defaultOpen | Use for long form sections |
| **Alert** | Messaging | type (info/warning/error/success), title, message | Auto-dismiss after 5s or manual close |
| **Notification** | Toast alerts | type, message, duration | Slide in from top-right |
| **Spinner** | Loading states | size (sm/md/lg), variant | Center on content area |
| **Pagination** | List navigation | total, current, onChange | Show page numbers (not arrows only) |

### 5.2 Module-Specific Components

**Residents Module:**
- `<YPCard>` — Individual resident card with photo, status badge, actions
- `<RiskBadge>` — Colored risk level (low/medium/high/critical)
- `<SupportPlanSection>` — Accordion for each plan section
- `<RiskAssessmentForm>` — 9-category risk entry form

**Staff Module:**
- `<StaffProfile>` — Full staff detail card
- `<ComplianceMatrix>` — Table of DBS/training/appraisals
- `<PayslipPreview>` — Formatted payslip display
- `<LeaveBalance>` — Visual leave balance tracker

**24-Hour Module:**
- `<RotaWeekView>` — Weekly shift grid
- `<ShiftCard>` — Individual shift display
- `<HandoverForm>` — Shift handover entry form
- `<WTRAlert>` — Working time regulation breach alert

**Finance Module:**
- `<InvoiceTable>` — Sortable invoice list
- `<BudgetBar>` — Budget vs actuals bar chart
- `<PayrollSummary>` — Monthly payroll overview

---

## 6. Responsive Behavior

### 6.1 Breakpoints

```
xs: 0px (mobile)
sm: 640px (tablet portrait)
md: 768px (small laptop)
lg: 1024px (desktop)
xl: 1280px (large desktop)
2xl: 1536px (ultra-wide)
```

### 6.2 Layout Adjustments by Breakpoint

**XS (Mobile) - 0-640px:**
- Single column layout
- Full-width inputs
- Bottom navigation bar instead of sidebar
- Modals full-screen
- Cards stack vertically
- Hide secondary information (show on tap)
- Hamburger menu for primary nav

**SM (Tablet) - 640-768px:**
- 2-column layout where possible
- Drawer sidebar (overlay)
- Slightly smaller fonts
- More compact spacing

**MD (Small Laptop) - 768-1024px:**
- 2-3 column layout
- Sidebar collapsible to icons
- Standard spacing
- Dropdowns instead of modals where possible

**LG (Desktop) - 1024px+:**
- 3-4 column layout
- Fixed sidebar (280px)
- Full content width
- Tables with all columns visible
- Side-by-side modals/forms

### 6.3 Example: Residents YP Card Grid

```
xs: 1 column (stacked cards)
   ┌────────────┐
   │ YP Card    │
   └────────────┘
   ┌────────────┐
   │ YP Card    │
   └────────────┘

sm: 2 columns
   ┌────────┐ ┌────────┐
   │ YP     │ │ YP     │
   └────────┘ └────────┘

md: 3 columns
   ┌────────┐ ┌────────┐ ┌────────┐
   │ YP     │ │ YP     │ │ YP     │
   └────────┘ └────────┘ └────────┘

lg+: 4 columns
   ┌────┐ ┌────┐ ┌────┐ ┌────┐
   │YP  │ │YP  │ │YP  │ │YP  │
   └────┘ └────┘ └────┘ └────┘
```

---

## 7. Accessibility Requirements

### 7.1 WCAG 2.1 AA Compliance

- **Color Contrast:** All text ≥ 4.5:1 ratio (normal text), ≥ 3:1 (large text)
- **Focus Indicators:** Clear visible focus state on all interactive elements
- **Keyboard Navigation:** All functionality accessible via keyboard (Tab, Enter, Escape, Arrow keys)
- **Screen Reader:** All images have alt text, form labels properly associated
- **Motion:** Respect prefers-reduced-motion setting, avoid auto-playing animations
- **Text Sizing:** Support up to 200% zoom without horizontal scroll

### 7.2 Implementation Checklist

- [ ] All buttons have text labels or aria-label
- [ ] Form inputs have associated `<label>` elements
- [ ] Image icons have `alt="description"` or `aria-hidden="true"` if decorative
- [ ] Modals have `role="dialog"` and `aria-labelledby`
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Loading spinners have `aria-live="polite"` announcements
- [ ] Alerts have `role="alert"` for screen readers
- [ ] Tables have proper `<thead>`, `<th>`, `<tbody>` structure
- [ ] Skip links present on all pages
- [ ] Language set correctly on `<html lang="en">`

### 7.3 Dark Mode Support

- Provide toggle in user profile
- Persist preference to localStorage
- All colors adjusted for dark mode
- Contrast ratios maintained in dark mode
- Recommended for 24/7 care staff (reduces eye strain)

---

## 8. Error States & Edge Cases

### 8.1 Form Validation

**Real-time validation (on blur):**
- Email: must match pattern
- Phone: must be 10-11 digits (UK)
- Required fields: cannot be empty
- Dates: must be in past/future depending on field

**Display:**
- Red border around field
- Error message below input in red text
- Icon indicator (❌) next to field

**Example:**
```
┌──────────────────────────────────────────┐
│ Email Address:                           │
│ [invalid@example]                      ❌ │
│ Invalid email format                     │
├──────────────────────────────────────────┤
│ [Cancel] [Disable Submit Button]         │
└──────────────────────────────────────────┘
```

### 8.2 Empty States

**No records found:**
```
┌──────────────────────────────────────┐
│ No visit reports yet                 │
│                                      │
│ 📋 Get started by creating one       │
│                                      │
│ [+ Create Visit Report]              │
└──────────────────────────────────────┘
```

**Loading state:**
```
┌──────────────────────────────────────┐
│ [spinning icon]                      │
│ Loading residents...                 │
└──────────────────────────────────────┘
```

**Error state:**
```
┌──────────────────────────────────────┐
│ ⚠️ Failed to load residents          │
│                                      │
│ Error: Network timeout               │
│ [Retry]                              │
└──────────────────────────────────────┘
```

---

## 9. Interaction Patterns

### 9.1 Modals & Dialogs

**Confirmation Modal:**
```
┌─────────────────────────────────┐
│ Are you sure?                 ✕ │
├─────────────────────────────────┤
│ This action cannot be undone.   │
│                                 │
│ [Cancel] [Delete] (red)         │
└─────────────────────────────────┘
```

**Form Modal:**
```
┌─────────────────────────────────┐
│ Create New Resident           ✕ │
├─────────────────────────────────┤
│ Name: [input]                   │
│ DOB: [date picker]              │
│ Home: [dropdown]                │
│                                 │
│ [Cancel] [Create]               │
└─────────────────────────────────┘
```

### 9.2 Notification Patterns

**Toast Alert (top-right):**
```
┌─────────────────────────────┐
│ ✓ Report saved successfully │ ✕
└─────────────────────────────┘
```

**Inline Alert (within form):**
```
┌─────────────────────────────┐
│ ⚠️ Warning: High risk level │
│ This YP requires immediate  │
│ safeguarding review         │
└─────────────────────────────┘
[Form fields below]
```

### 9.3 Hover & Focus States

**Button Hover:**
```
Default:
[Submit] — bg-primary, text-white

Hover:
[Submit] — bg-primary-dark (10% darker), shadow-lg

Focus:
[Submit] — outline: 2px solid primary, outline-offset: 2px

Active/Pressed:
[Submit] — bg-primary-darker, shadow-inset
```

**Card Hover:**
```
Default: shadow-md, cursor-default

Hover (clickable): shadow-lg, scale 1.01, cursor-pointer

Active: ring-2 ring-primary
```

---

## Appendix: Design Tokens

**All values to be used in design system:**

```
Spacing: 4, 8, 16, 24, 32, 48, 64px
Border Radius: 4, 8, 12, 24px (rounded-full)
Font Sizes: 12, 14, 16, 18, 24, 32px
Font Weights: 400, 500, 600, 700
Colors: See section 1.1
Shadows: sm, md, lg, xl (see 1.5)
Z-Index:
  - Base: 0
  - Dropdown/Popover: 50
  - Sticky Header: 40
  - Modal Overlay: 100
  - Modal: 101
  - Toast: 150
  - Tooltip: 200
```

---

**Document Version:** 1.0  
**Last Updated:** May 2, 2026  
**Distribution:** External development team, product design, QA

---