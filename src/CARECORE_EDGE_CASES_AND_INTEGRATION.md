# CareCore Platform — Edge Cases & Third-Party Integration Specs

**Version:** 1.0  
**Last Updated:** May 2, 2026  
**Audience:** Backend developers, QA engineers, integration specialists

---

## Table of Contents

1. [Edge Cases & Data Constraints](#1-edge-cases--data-constraints)
2. [Known Issues Register](#2-known-issues-register)
3. [Base44 SDK Integration Details](#3-base44-sdk-integration-details)
4. [Migration Path (Off Base44)](#4-migration-path-off-base44)

---

## 1. Edge Cases & Data Constraints

### 1.1 Daily Log Uniqueness Constraint (BUG-011)

**Issue:** Duplicate daily logs can be created if staff submits the same form twice.

**Root Cause:** No unique constraint preventing duplicate entries for same resident + day + flag combination.

**Correct Behavior:**

```
Uniqueness Key = (resident_id, home_id, date, flag_category)

Where flag_category = 'current_status' | 'night_stay' | 'edu_attendance' | 'meal_intake' | 'general'

Rule: Only 1 log per resident per day per flag category can exist.

Example valid logs for Alice (2026-05-02):
✓ 2026-05-02, current_status flag → Log 1
✓ 2026-05-02, meal_intake flag → Log 2  (different flag)
✓ 2026-05-03, current_status flag → Log 3 (different day)

Example invalid:
❌ 2026-05-02, current_status → Log 1
❌ 2026-05-02, current_status → Log 2 (DUPLICATE - same resident, day, flag)
```

**Implementation:**

**Database Constraint (PostgreSQL):**
```sql
ALTER TABLE DailyLog
ADD CONSTRAINT unique_daily_log_per_category
UNIQUE (resident_id, home_id, date, flags);

-- Or if flags is an array:
CREATE UNIQUE INDEX idx_daily_log_unique
ON DailyLog (resident_id, home_id, date, (flags[1]))
WHERE flags IS NOT NULL;
```

**Application-Level Check (before insert):**
```javascript
async function createDailyLog(base44, logData) {
  const { resident_id, home_id, date, flags } = logData;
  
  // Check for existing log with same flag
  const primaryFlag = flags?.[0] || 'general';
  
  const existing = await base44.asServiceRole.entities.DailyLog.filter({
    resident_id,
    home_id,
    date,
    flags: primaryFlag
  });
  
  if (existing.length > 0) {
    throw new Error(
      `Daily log already exists for ${resident_id} on ${date} with flag ${primaryFlag}`
    );
  }
  
  return await base44.asServiceRole.entities.DailyLog.create(logData);
}
```

**Frontend Validation:**
```javascript
const createMutation = useMutation({
  mutationFn: async (logData) => {
    // Check if log already exists in cache
    const existingLogs = queryClient.getQueryData(['daily-logs', resident_id]);
    const duplicate = existingLogs?.find(
      l => l.date === logData.date && l.flags?.[0] === logData.flags?.[0]
    );
    
    if (duplicate) {
      throw new Error('Log for this date and type already exists. Update it instead.');
    }
    
    return await secureGateway.create('DailyLog', logData);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['daily-logs', resident_id] });
  }
});
```

---

### 1.2 Recurring Appointment Sync (BUG-013)

**Issue:** Recurring appointments don't expand into individual instances correctly. If a recurring event is created but the expansion fails, calendar shows no events even though the database has the recurring record.

**Root Cause:** Expansion happens in frontend; if browser crashes or network fails mid-expansion, orphaned recurring record with no instances.

**Correct Behavior:**

```
Recurring Appointment Record:
{
  id: "appt-recurring-123",
  type: "recurring",
  title: "Supervision Meeting",
  start_datetime: "2026-05-01T09:00:00Z",
  recurrence_pattern: {
    frequency: "weekly",
    days: [1, 3],  // Monday, Wednesday
    end_date: "2026-12-31"
  }
}

Expansion on CREATE:
→ Generate instances from start_date to end_date, respecting frequency & days
→ Create separate Appointment records for each instance (type: "instance")
→ Link each instance: appointment.parent_id = recurring.id
→ Atomic transaction: all-or-nothing (all instances created or none)

Instances for above example (May 2026):
- 2026-05-01 09:00 (instance)
- 2026-05-03 09:00 (instance)
- 2026-05-08 09:00 (instance)
- 2026-05-10 09:00 (instance)
- ... etc until 2026-12-31

If a future instance is cancelled (e.g., 2026-05-15):
→ Create exception: { parent_id, exception_date: "2026-05-15", status: "cancelled" }
→ Calendar view filters: skip date if exception exists

If recurring pattern is updated (e.g., added Thursday):
→ Delete all future instances (after today)
→ Regenerate with new pattern
→ Keep past instances (audit trail)
```

**Database Schema:**

```sql
CREATE TABLE Appointment (
  id UUID PRIMARY KEY,
  
  -- For all appointments
  resident_id UUID NOT NULL,
  home_id UUID NOT NULL,
  title VARCHAR(255),
  start_datetime TIMESTAMP,
  end_datetime TIMESTAMP,
  status ENUM('scheduled', 'completed', 'cancelled'),
  
  -- For recurring appointments
  recurrence_type ENUM('once', 'recurring', 'instance') DEFAULT 'once',
  parent_id UUID REFERENCES Appointment(id),  -- Points to recurring parent
  
  -- Recurring pattern (only for recurrence_type='recurring')
  recurrence_frequency VARCHAR(50),  -- 'weekly', 'daily', 'monthly', 'yearly'
  recurrence_days INT[],  -- For weekly: [0-6] = Sun-Sat; for monthly: [1-31]
  recurrence_end_date DATE,
  
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE AppointmentException (
  id UUID PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES Appointment(id),  -- Points to recurring parent
  exception_date DATE NOT NULL,
  exception_type ENUM('cancelled', 'rescheduled') DEFAULT 'cancelled',
  new_datetime TIMESTAMP,  -- If rescheduled
  reason VARCHAR(500),
  created_date TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_appointment_recurring
ON Appointment(parent_id, start_datetime)
WHERE recurrence_type = 'instance';

CREATE INDEX idx_appointment_exceptions
ON AppointmentException(appointment_id, exception_date);
```

**Expansion Function (Backend):**

```javascript
async function expandRecurringAppointment(base44, recurringApptData) {
  const {
    resident_id,
    home_id,
    title,
    start_datetime,
    recurrence_pattern: {
      frequency,
      days,  // [0-6] for weekly, [1-31] for monthly
      end_date
    }
  } = recurringApptData;

  // Create parent recurring appointment
  const parent = await base44.asServiceRole.entities.Appointment.create({
    resident_id,
    home_id,
    title,
    start_datetime,
    recurrence_type: 'recurring',
    recurrence_frequency: frequency,
    recurrence_days: days,
    recurrence_end_date: end_date,
    status: 'scheduled'
  });

  // Generate all instances
  const instances = [];
  let current = new Date(start_datetime);
  const maxDate = new Date(end_date);

  while (current <= maxDate) {
    const dayOfWeek = current.getDay();
    
    // Check if current date matches recurrence pattern
    let shouldInclude = false;
    
    if (frequency === 'weekly' && days.includes(dayOfWeek)) {
      shouldInclude = true;
    } else if (frequency === 'daily') {
      shouldInclude = true;
    } else if (frequency === 'monthly' && days.includes(current.getDate())) {
      shouldInclude = true;
    }

    if (shouldInclude) {
      instances.push({
        resident_id,
        home_id,
        title,
        start_datetime: current.toISOString(),
        end_datetime: new Date(current.getTime() + 60 * 60 * 1000).toISOString(),  // +1h
        recurrence_type: 'instance',
        parent_id: parent.id,
        status: 'scheduled'
      });
    }

    // Advance to next day
    current.setDate(current.getDate() + 1);
  }

  // Bulk create instances atomically
  try {
    const created = await base44.asServiceRole.entities.Appointment.bulkCreate(instances);
    return { parent, instances: created };
  } catch (error) {
    // Rollback: delete parent if instance creation fails
    await base44.asServiceRole.entities.Appointment.delete(parent.id);
    throw new Error(`Failed to expand recurring appointment: ${error.message}`);
  }
}
```

**Calendar View (Frontend):**

```javascript
async function getAppointmentsForResident(residentId, dateRange) {
  // Fetch instances within date range
  const instances = await secureGateway.filter('Appointment', {
    resident_id: residentId,
    recurrence_type: 'instance',
    start_datetime: {
      $gte: dateRange.start,
      $lte: dateRange.end
    }
  });

  // Fetch exceptions and filter them out
  const exceptions = await secureGateway.filter('AppointmentException', {
    appointment_id: { $in: instances.map(i => i.parent_id) },
    exception_date: {
      $gte: dateRange.start.split('T')[0],
      $lte: dateRange.end.split('T')[0]
    }
  });

  // Filter out cancelled instances
  const cancelledDates = new Set(
    exceptions
      .filter(e => e.exception_type === 'cancelled')
      .map(e => e.exception_date)
  );

  return instances.filter(appt => {
    const apptDate = appt.start_datetime.split('T')[0];
    return !cancelledDates.has(apptDate);
  });
}
```

---

### 1.3 Age Verification (Support Plan Eligibility)

**Edge Case:** YP born near midnight on boundary dates.

**Rule:**
```
Age = FLOOR((TODAY - DOB) / 365.25)

YP becomes eligible for pathway plan when age >= 16 (at any time during the year)

Example:
- DOB: 2010-05-16
- Today: 2026-05-16 → Age = 16 (eligible immediately)
- Today: 2026-05-15 → Age = 15 (not yet eligible)

Pathway plan sections should be disabled until age 16.
```

**Implementation:**

```javascript
function isEligibleForPathwayPlan(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 16;
}

// In component:
{isEligibleForPathwayPlan(resident.dob) ? (
  <PathwayPlanSection />
) : (
  <DisabledMessage>Pathway plan available when resident reaches 16</DisabledMessage>
)}
```

---

### 1.4 Soft Deletion & Cascading (Audit Trail)

**Constraint:** Records must never be hard-deleted (audit compliance). But if a resident is deleted, what happens to their linked records?

**Rule:**
```
Soft deletion only (is_deleted = true, deleted_at = timestamp).

Cascade soft-delete:
- Delete Resident → Mark all related Support Plans, Risk Assessments, etc. as deleted
- Delete Staff → Mark all shifts, supervision records as deleted
- Do NOT delete: Audit trail, historical transactions, completed timesheets

Foreign key behavior:
- Resident deleted → Risk Assessment.resident_id stays (orphaned, soft-deleted)
- Staff deleted → Supervision record stays (orphaned, soft-deleted)
- Home deleted → Residents cannot be fetched by home_id (filtered in queries)
```

**Implementation:**

```javascript
async function softDeleteResident(base44, residentId) {
  const timestamp = new Date().toISOString();
  
  // Mark resident as deleted
  await base44.asServiceRole.entities.Resident.update(residentId, {
    is_deleted: true,
    deleted_at: timestamp
  });
  
  // Cascade: mark related records
  const relatedEntities = [
    'SupportPlan',
    'RiskAssessment',
    'Appointment',
    'DailyLog',
    'VisitReport'
  ];
  
  for (const entity of relatedEntities) {
    const records = await base44.asServiceRole.entities[entity].filter({
      resident_id: residentId
    });
    
    for (const record of records) {
      await base44.asServiceRole.entities[entity].update(record.id, {
        is_deleted: true,
        deleted_at: timestamp
      });
    }
  }
  
  return { deleted: true, residentId, timestamp };
}
```

**Query filtering (always exclude soft-deleted):**

```javascript
const residents = await secureGateway.filter('Resident', {
  status: 'active',
  is_deleted: false  // Always filter out soft-deleted
});

// Or in secureGateway wrapper:
async filter(entityName, query = {}) {
  const secureQuery = {
    ...query,
    is_deleted: false,  // Implicit in all queries
    org_id: this.user.org_id
  };
  return base44.entities[entityName].filter(secureQuery);
}
```

---

## 2. Known Issues Register

### BUG-001: Missing From Home Double Alert

**Status:** Fixed in v1.2.1

**Description:** When MFH report is created, both email and Slack notifications sent even if Slack disabled.

**Solution:** Check `ENABLE_SLACK_ALERTS` flag before Slack call.

---

### BUG-002: Compliance Score Calculation Lag

**Status:** Documented behavior

**Description:** Ofsted readiness score shows previous day's data (calculated at 02:00 nightly).

**Expected Behavior:** This is by design. Dashboard shows "Last calculated: 2026-05-01 02:00 UTC"

---

### BUG-011: Duplicate Daily Logs

**Status:** Requires fix

**Description:** Staff can submit current_status log twice, creating duplicate.

**Solution:** See section 1.1 (Uniqueness Constraint Implementation)

---

### BUG-013: Recurring Appointments Not Expanding

**Status:** Requires fix

**Description:** Recurring appointment created but instances not generated; calendar shows nothing.

**Solution:** See section 1.2 (Recurring Appointment Sync)

---

### BUG-015: WTR Calculation Timezone Aware

**Status:** Fixed in v1.3

**Description:** WTR breach alerts sent in UTC; need to be in org's local timezone.

**Solution:** Store org timezone in Home entity, calculate WTR in that timezone.

---

## 3. Base44 SDK Integration Details

### 3.1 SecureGateway Wrapper

**What It Does:**
```
Base44 SDK
    ↓
secureGateway wrapper (lib/secureGateway.js)
    ↓
Components (via useQuery/useMutation)
```

**Why It's Needed:**
```
Raw Base44 API doesn't enforce org_id filtering.
secureGateway ensures:
- org_id always added to queries
- RBAC filtering (team leader homes, support worker residents)
- Error logging
- Consistent interface
```

**Detailed Implementation:**

```javascript
// lib/secureGateway.js
import { base44 } from '@/api/base44Client';

export class SecureGateway {
  setUser(user) {
    this.user = user;  // { org_id, role, home_ids_assigned, key_work_resident_ids }
  }

  async filter(entityName, query = {}, sort = '-created_date', limit = 100) {
    const secureQuery = {
      org_id: this.user.org_id,  // ← Always add org filter
      is_deleted: false,          // ← Always exclude soft-deleted
      ...query
    };

    // RBAC: Team leader can only see their homes
    if (this.user.role === 'team_leader') {
      secureQuery.home_id = { $in: this.user.home_ids_assigned };
    }

    // RBAC: Support worker can only see key work residents
    if (
      this.user.role === 'support_worker' &&
      entityName === 'Resident'
    ) {
      secureQuery.id = { $in: this.user.key_work_resident_ids };
    }

    return base44.entities[entityName].filter(
      secureQuery,
      sort,
      limit
    );
  }
}

export const secureGateway = new SecureGateway();
```

### 3.2 Core.InvokeLLM Usage

**What It Does:** Call LLM (GPT, Gemini) with optional web search & file attachments.

**Available Models:**
```
- gpt_4o-mini (default, fast, cheap)
- gpt_5 (more capable, pricier)
- gemini_3_flash (faster)
- claude_sonnet_4_6 (best for complex analysis)
```

**Example: Summarize Resident Profile**

```javascript
const summary = await base44.integrations.Core.InvokeLLM({
  prompt: `
    Summarize this resident's key support needs:
    
    Name: ${resident.display_name}
    Age: ${calcAge(resident.dob)}
    Risks: ${resident.risks.map(r => r.category).join(', ')}
    Health: ${resident.health.conditions.join(', ') || 'None recorded'}
    
    Provide 3-4 sentences.
  `,
  response_json_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      key_risks: { type: 'array', items: { type: 'string' } }
    }
  }
});

// Returns: { summary: "...", key_risks: ["..."] }
```

**Important:** Uses integration credits. Check quota before high-volume calls.

---

### 3.3 Core.SendEmail

```javascript
await base44.integrations.Core.SendEmail({
  to: 'user@example.com',
  subject: 'Timesheet Approved',
  body: 'Your May timesheet (£1500 net) was approved.',
  from_name: 'CareCore HR'
});

// Returns on success
// Throws on failure (invalid email, service down, etc.)
```

---

### 3.4 Core.UploadFile

```javascript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const { file_url } = await base44.integrations.Core.UploadFile({
  file: file
});

// file_url is publicly accessible URL
// Store in database: { document_url: file_url, ... }
```

---

## 4. Migration Path (Off Base44)

### 4.1 Why Migrate Off Base44?

```
Base44 is best for MVP/initial launch.
Production considerations:
- Cost: base44 SDK + integration credits
- Performance: API calls slower than direct DB
- Control: Can't optimize queries, caching
- Scaling: Limited by base44 infrastructure

Production alternatives:
- PostgreSQL directly (cost: $200-500/month)
- GraphQL layer (Apollo, Hasura)
- REST API (express, fastapi)
```

### 4.2 Replacement Specs

**For secureGateway → Direct PostgreSQL:**

```javascript
// Old (Base44)
const residents = await secureGateway.filter('Resident', { status: 'active' });

// New (PostgreSQL + express)
import pgPool from './db/pool.js';  // Connection pool

async function getResidents(userId, filters = {}) {
  const user = await getUser(userId);  // From cache/DB
  
  const query = `
    SELECT * FROM "Resident"
    WHERE org_id = $1
      AND is_deleted = false
      AND status = $2
    LIMIT $3
  `;
  
  const params = [user.org_id, filters.status || 'active', 100];
  
  // Apply RBAC
  if (user.role === 'team_leader') {
    query += ` AND home_id = ANY($4)`;
    params.push(user.home_ids_assigned);
  }
  
  const result = await pgPool.query(query, params);
  return result.rows;
}
```

**For Core.InvokeLLM → Direct OpenAI API:**

```javascript
// Old (Base44)
const response = await base44.integrations.Core.InvokeLLM({
  prompt: '...',
  model: 'gpt_5'
});

// New (Direct API)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function summarizeResident(resident) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `Summarize: ${resident.display_name}...`
      }
    ]
  });
  
  return completion.choices[0].message.content;
}
```

**For Core.SendEmail → Direct SendGrid:**

```javascript
// Old (Base44)
await base44.integrations.Core.SendEmail({
  to: 'user@example.com',
  subject: 'Alert',
  body: 'Message'
});

// New (Direct API)
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendAlert(email, subject, message) {
  await sgMail.send({
    to: email,
    from: 'noreply@carecore.uk',
    subject,
    text: message
  });
}
```

**For Core.UploadFile → Direct S3:**

```javascript
// Old (Base44)
const { file_url } = await base44.integrations.Core.UploadFile({
  file: fileBlob
});

// New (AWS S3)
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

async function uploadFile(fileBuffer, fileName) {
  const params = {
    Bucket: 'carecore-files',
    Key: `uploads/${Date.now()}_${fileName}`,
    Body: fileBuffer,
    ContentType: 'application/octet-stream'
  };
  
  const result = await s3.upload(params).promise();
  return result.Location;  // Public URL
}
```

### 4.3 Migration Checklist

- [ ] Map all Base44 entities → PostgreSQL schemas
- [ ] Implement secureGateway with direct DB queries
- [ ] Replace Core.InvokeLLM with OpenAI SDK
- [ ] Replace Core.SendEmail with SendGrid
- [ ] Replace Core.UploadFile with S3
- [ ] Implement auth layer (JWT issuance, validation)
- [ ] Create REST API endpoints (equivalent to Base44 CRUD)
- [ ] Implement real-time subscriptions (WebSocket layer)
- [ ] Test all RBAC rules
- [ ] Data migration (export from Base44, import to PostgreSQL)
- [ ] Performance testing
- [ ] Security audit

---

**Document Version:** 1.0  
**Last Updated:** May 2, 2026  
**Distribution:** Backend developers, QA, product management