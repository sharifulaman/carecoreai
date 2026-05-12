# CareCore Platform — Environment & Configuration Guide

**Version:** 1.0  
**Last Updated:** May 2, 2026  
**Audience:** DevOps, backend developers, infrastructure engineers

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Base44 Configuration](#2-base44-configuration)
3. [API Keys & Secrets](#3-api-keys--secrets)
4. [Database Configuration](#4-database-configuration)
5. [Nightly Scheduler](#5-nightly-scheduler)
6. [Deployment Environments](#6-deployment-environments)

---

## 1. Environment Variables

### 1.1 Frontend .env Structure

**Location:** `/.env.local` (or `.env.production`, `.env.staging`)

```env
# Base44 App Configuration
VITE_BASE44_APP_ID=your-app-id-here
VITE_BASE44_APP_OWNER=your-org-id-here
VITE_BASE44_ENV=production

# API Configuration
VITE_API_URL=https://api.carecore.uk/v1
VITE_WEBSOCKET_URL=wss://api.carecore.uk/ws

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PAYMENTS=false
VITE_ENABLE_BULK_EXPORTS=true
VITE_MAX_BULK_IMPORT_SIZE=1000

# UI Configuration
VITE_THEME=light
VITE_LOCALE=en-GB
VITE_DATE_FORMAT=DD/MM/YYYY

# Monitoring
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_LOG_LEVEL=info
```

**Usage in Code:**
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
const appId = import.meta.env.VITE_BASE44_APP_ID;
const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
```

### 1.2 Backend .env Structure

**Location:** `/functions/.env` (for local dev)

```env
# Base44 SDK
BASE44_APP_ID=your-app-id-here
BASE44_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/carecore
DB_ENCRYPTION_KEY=your-encryption-key-here

# External APIs
STRIPE_API_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SENDGRID_API_KEY=SG.xxxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx

# Job Scheduler
NIGHTLY_SCHEDULER_ENABLED=true
NIGHTLY_SCHEDULER_TIME=02:00  # UTC
SCHEDULER_TIMEZONE=UTC

# File Storage
STORAGE_BUCKET=carecore-files
STORAGE_REGION=eu-west-2
STORAGE_ACCESS_KEY=xxxxx
STORAGE_SECRET_KEY=xxxxx

# Security
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=604800

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
ENABLE_REQUEST_LOGGING=true
```

### 1.3 Environment Variables by Context

**Development (.env.local):**
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WEBSOCKET_URL=ws://localhost:3000/ws
LOG_LEVEL=debug
DATABASE_URL=postgresql://dev:dev@localhost:5432/carecore_dev
```

**Staging (.env.staging):**
```env
VITE_API_URL=https://api.staging.carecore.uk/v1
VITE_WEBSOCKET_URL=wss://api.staging.carecore.uk/ws
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@staging-db.carecore.uk:5432/carecore_staging
```

**Production (.env.production):**
```env
VITE_API_URL=https://api.carecore.uk/v1
VITE_WEBSOCKET_URL=wss://api.carecore.uk/ws
LOG_LEVEL=warn
DATABASE_URL=postgresql://user:pass@prod-db.carecore.uk:5432/carecore
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
```

---

## 2. Base44 Configuration

### 2.1 Base44 Platform Initialization

**In Frontend (main.jsx):**
```javascript
import { base44 } from '@/api/base44Client';

// Base44 is pre-initialized by @base44/vite-plugin
// No additional setup needed, just use:
await base44.auth.me();
await base44.entities.Resident.list();
```

**In Backend Functions (functions/example.js):**
```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // User-scoped (current user)
  const user = await base44.auth.me();
  
  // Service-scoped (admin privileges)
  const allResidents = await base44.asServiceRole.entities.Resident.list();
  
  return Response.json({ user, residents: allResidents });
});
```

### 2.2 Base44 SDK Methods Reference

**Authentication:**
```javascript
// Get current user
const user = await base44.auth.me();

// Check if authenticated
const isAuth = await base44.auth.isAuthenticated();

// Update current user
await base44.auth.updateMe({ full_name: 'New Name' });

// Logout
await base44.auth.logout('/login');

// Redirect to login
await base44.auth.redirectToLogin('/dashboard');
```

**Entity Operations:**
```javascript
// List (with filters/sort/limit)
const residents = await base44.entities.Resident.list(
  '-created_date',  // sort
  100,              // limit
  { status: 'active' }  // filters (optional)
);

// Filter (explicit filters)
const residents = await base44.entities.Resident.filter(
  { status: 'active', home_id: 'home-123' },
  '-created_date',
  50
);

// Get single
const resident = await base44.entities.Resident.get('resident-id');

// Create
const resident = await base44.entities.Resident.create({
  display_name: 'Alice',
  dob: '2010-05-15',
  org_id: 'org-123'
});

// Bulk create
const residents = await base44.entities.Resident.bulkCreate([
  { display_name: 'Alice', ... },
  { display_name: 'Ben', ... }
]);

// Update
await base44.entities.Resident.update('resident-id', {
  risk_level: 'high'
});

// Bulk update
await base44.entities.Resident.bulkUpdate([
  { id: 'res-1', risk_level: 'high' },
  { id: 'res-2', risk_level: 'medium' }
]);

// Delete (soft-delete)
await base44.entities.Resident.delete('resident-id');

// Get schema
const schema = await base44.entities.Resident.schema();
```

**Real-time Subscriptions:**
```javascript
// Subscribe to entity changes
const unsubscribe = base44.entities.Resident.subscribe((event) => {
  console.log(event.type);  // 'create', 'update', 'delete'
  console.log(event.id);
  console.log(event.data);  // Current entity data
});

// Unsubscribe
unsubscribe();
```

**Integrations:**
```javascript
// Invoke LLM
const response = await base44.integrations.Core.InvokeLLM({
  prompt: 'Summarize this: ...',
  model: 'gpt_4o-mini',
  add_context_from_internet: true,
  response_json_schema: { type: 'object', properties: { summary: { type: 'string' } } }
});

// Upload file
const { file_url } = await base44.integrations.Core.UploadFile({
  file: fileBlob
});

// Send email
await base44.integrations.Core.SendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello...',
  from_name: 'CareCore'
});

// Extract data from file
const data = await base44.integrations.Core.ExtractDataFromUploadedFile({
  file_url: 'https://...',
  json_schema: { ... }
});

// Generate image
const { url } = await base44.integrations.Core.GenerateImage({
  prompt: 'A calm office...'
});
```

**Analytics:**
```javascript
base44.analytics.track({
  eventName: 'resident_created',
  properties: { home_id: 'home-123', age: 16 }
});
```

---

## 3. API Keys & Secrets

### 3.1 Required Secrets

**Critical (must have before launch):**
| Secret | Purpose | Where to Get | Storage |
|--------|---------|-------------|---------|
| STRIPE_API_KEY | Payment processing | Stripe dashboard | Secrets manager |
| SENDGRID_API_KEY | Email sending | SendGrid dashboard | Secrets manager |
| JWT_SECRET | Token signing | Generate (openssl) | Secrets manager |
| DATABASE_URL | DB connection | Infrastructure team | Secrets manager |
| BASE44_SERVICE_ROLE_KEY | Backend admin access | Base44 dashboard | Secrets manager |

**Optional (feature-dependent):**
| Secret | Purpose | Feature Gate |
|--------|---------|--------------|
| SLACK_WEBHOOK_URL | Slack alerts | ENABLE_SLACK_ALERTS |
| GOOGLE_OAUTH_CLIENT_ID | Google auth | ENABLE_GOOGLE_LOGIN |
| SENTRY_DSN | Error tracking | ENABLE_ERROR_TRACKING |

### 3.2 Secret Rotation Policy

**Schedule:**
```
JWT_SECRET: Every 90 days
Database passwords: Every 180 days
API keys: Every 6 months or on employee separation
Encryption keys: Never (archive old, create new)
```

**Rotation Process:**
```
1. Generate new secret
2. Update in secrets manager
3. Update app config (grace period: 24h)
4. Both old & new accepted for 24 hours
5. Old secret deleted after 24h grace
6. Log rotation event
```

### 3.3 Accessing Secrets in Code

**Frontend (NOT recommended - never expose secrets):**
```javascript
// ❌ WRONG - Never put secrets in frontend
const apiKey = import.meta.env.VITE_STRIPE_KEY;

// ✓ CORRECT - Only store in backend
// Frontend calls backend endpoint to use the key
const response = await base44.functions.invoke('processPayment', { ... });
```

**Backend Functions (correct approach):**
```javascript
// Access from environment
const stripeKey = Deno.env.get('STRIPE_API_KEY');
const jwtSecret = Deno.env.get('JWT_SECRET');
```

**Local Development:**
```bash
# .env.local (never commit)
STRIPE_API_KEY=sk_test_xxxxx

# Load in dev server
source .env.local
npm run dev

# Or use a tool like direnv
echo "export STRIPE_API_KEY=sk_test_xxxxx" > .envrc
direnv allow
```

---

## 4. Database Configuration

### 4.1 PostgreSQL Setup

**Connection String Format:**
```
postgresql://username:password@host:port/database?sslmode=require

Example:
postgresql://carecore:SecurePass123@db.carecore.uk:5432/carecore_prod?sslmode=require
```

**Connection Pooling (PgBouncer):**
```
[databases]
carecore_prod = host=db-primary.carecore.uk port=5432 dbname=carecore_prod

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
```

### 4.2 Data Encryption

**At-Rest Encryption:**
```
Database encryption: Enable AWS RDS encryption (default)
Backup encryption: Enable automatic backup encryption
Field-level encryption: Use for PII (DOB, NI numbers)
```

**Field-Level Encryption (Example):**
```javascript
// Helper function
async function encryptField(value, encryptionKey) {
  const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
  return cipher.update(value, 'utf8', 'hex') + cipher.final('hex');
}

async function decryptField(encrypted, encryptionKey) {
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

// Before saving
const encrypted_dob = await encryptField(resident.dob, Deno.env.get('DB_ENCRYPTION_KEY'));

// On retrieval
const dob = await decryptField(resident.encrypted_dob, Deno.env.get('DB_ENCRYPTION_KEY'));
```

### 4.3 Backup Strategy

**Frequency:**
```
Full backup: Daily at 02:00 UTC
Incremental: Every 6 hours
Point-in-time recovery: 30-day retention
```

**Testing:**
```
Monthly full backup restore test
Verify data integrity
Document restore time
```

---

## 5. Nightly Scheduler

### 5.1 Purpose

Run automated tasks after hours:
- Generate compliance reports
- Process payroll
- Send notifications
- Clean up logs
- Generate statistics

### 5.2 Configuration

**In .env:**
```env
NIGHTLY_SCHEDULER_ENABLED=true
NIGHTLY_SCHEDULER_TIME=02:00  # Run at 2:00 AM UTC
SCHEDULER_TIMEZONE=UTC
SCHEDULER_TIMEOUT_SECONDS=3600
SCHEDULER_MAX_RETRIES=3
```

### 5.3 Implementation (functions/nightlyScheduler.js)

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// This function is triggered nightly via Base44 automation
Deno.serve(async (req) => {
  try {
    console.log(`[${new Date().toISOString()}] Starting nightly scheduler...`);
    
    // Get service-level access
    const base44 = createClientFromRequest(req);
    
    // Task 1: Process compliance score
    console.log('Task 1: Calculating compliance scores...');
    await calculateComplianceScores(base44);
    
    // Task 2: Generate payroll
    console.log('Task 2: Generating payroll...');
    await generatePayroll(base44);
    
    // Task 3: Create alerts
    console.log('Task 3: Creating alerts...');
    await createNightlyAlerts(base44);
    
    // Task 4: Cleanup logs
    console.log('Task 4: Archiving old logs...');
    await archiveOldLogs(base44);
    
    console.log(`[${new Date().toISOString()}] Nightly scheduler completed.`);
    
    return Response.json({
      status: 'success',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Nightly scheduler failed: ${error.message}`);
    return Response.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
});

async function calculateComplianceScores(base44) {
  // Implementation: Calculate and update compliance scores
  const homes = await base44.asServiceRole.entities.Home.list();
  
  for (const home of homes) {
    const score = await computeOfstedScore(base44, home.id);
    await base44.asServiceRole.entities.Home.update(home.id, {
      compliance_score: score
    });
  }
}

async function generatePayroll(base44) {
  // Implementation: Process pending timesheets, generate payslips
  const pendingTimesheets = await base44.asServiceRole.entities.Timesheet.filter(
    { status: 'approved' }
  );
  
  // Process each timesheet
  for (const timesheet of pendingTimesheets) {
    const payslip = calculatePayslip(timesheet);
    await base44.asServiceRole.entities.Payslip.create(payslip);
  }
}

async function createNightlyAlerts(base44) {
  // Implementation: Check for expiring certifications, missing reviews, etc.
  
  // Check DBS expirations
  const dbsExpiring = await base44.asServiceRole.entities.StaffProfile.filter({
    dbs_expiry: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
  });
  
  for (const staff of dbsExpiring) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: staff.email,
      subject: 'DBS Renewal Due',
      body: `Your DBS check expires on ${staff.dbs_expiry}. Please renew immediately.`,
      from_name: 'CareCore HR'
    });
  }
}

async function archiveOldLogs(base44) {
  // Implementation: Move logs >90 days old to archive storage
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const oldLogs = await base44.asServiceRole.entities.AuditTrail.filter({
    created_date: { $lt: thirtyDaysAgo }
  });
  
  console.log(`Archiving ${oldLogs.length} old audit logs`);
  // Transfer to cold storage (S3, GCS, etc.)
}
```

### 5.4 Scheduling the Nightly Task

**Via Base44 Automation:**
```javascript
// In the platform dashboard, create automation:

Automation Type: Scheduled
Name: Nightly Scheduler
Function: nightlyScheduler
Schedule: Daily
Time: 02:00 UTC
Repeat: Every day
Retry on failure: Yes (3 retries)
Timeout: 1 hour
```

**Or via CLI (if available):**
```bash
base44 automation create \
  --type scheduled \
  --name nightly_scheduler \
  --function nightlyScheduler \
  --schedule "0 2 * * *"  # Cron: 2:00 AM every day
```

### 5.5 Monitoring Nightly Execution

**Logging:**
```javascript
// All nightly tasks log to cloud logging (Cloud Logging, DataDog, etc.)
console.log('Task completed at:', new Date().toISOString());
console.error('Task failed:', error.message);

// Queried via:
// GCP: `gcloud logging read "resource.labels.function_name='nightlyScheduler'"`
// AWS: CloudWatch Logs
// Datadog: Dashboard
```

**Alerts:**
```
If nightly scheduler fails:
1. Alert sent to #ops Slack channel
2. Email to on-call engineer
3. Incident created in Pagerduty
```

---

## 6. Deployment Environments

### 6.1 Environment Progression

```
Local Dev
  ↓
Staging (full integration test)
  ↓
Production (live)
```

### 6.2 Staging Environment

**Purpose:** Test all changes before production

**Configuration:**
```env
# .env.staging
VITE_API_URL=https://api.staging.carecore.uk/v1
DATABASE_URL=postgresql://...staging...
STRIPE_API_KEY=sk_test_xxxxx  (test keys, not live)
LOG_LEVEL=info
BACKUP_RETENTION_DAYS=7
```

**Data:**
- Copy of production data (anonymized PII)
- Test users created
- Test homes & residents
- ~1000 historical records

**Release Process:**
```
1. Deploy to staging
2. Run smoke tests (API endpoints, auth, core workflows)
3. Run integration tests (full user journey)
4. Manual QA testing (new features)
5. Approval from product owner
6. Deploy to production
```

### 6.3 Production Environment

**Configuration:**
```env
# .env.production
VITE_API_URL=https://api.carecore.uk/v1
DATABASE_URL=postgresql://...production...
STRIPE_API_KEY=sk_live_xxxxx  (live keys)
LOG_LEVEL=warn
BACKUP_RETENTION_DAYS=30
ENABLE_MONITORING=true
ENABLE_ERROR_TRACKING=true
```

**High Availability:**
```
Load balancer → API servers (3 instances, auto-scale)
                ↓
           Database cluster (primary + standby)
                ↓
           Cache layer (Redis)
                ↓
           File storage (S3)
```

**Deployment Strategy:**
```
Blue-Green Deployment:
1. Deploy to green environment
2. Run smoke tests
3. Route 10% traffic to green
4. Monitor for 10 minutes
5. Route 100% traffic to green
6. Keep blue as rollback
7. After 24h with no errors, decommission blue
```

---

**Document Version:** 1.0  
**Last Updated:** May 2, 2026  
**Distribution:** DevOps, backend developers, infrastructure team