# CareCore Platform — API Contract Specifications

**Version:** 1.0  
**Last Updated:** May 2, 2026  
**Audience:** Backend developers, API architects, frontend team leads

---

## Table of Contents

1. [Authentication & Security](#1-authentication--security)
2. [Request/Response Standards](#2-requestresponse-standards)
3. [Error Handling](#3-error-handling)
4. [Entity CRUD Operations](#4-entity-crud-operations)
5. [Filtering, Sorting, Pagination](#5-filtering-sorting-pagination)
6. [Business Logic Endpoints](#6-business-logic-endpoints)
7. [Rate Limiting & Quotas](#7-rate-limiting--quotas)
8. [WebSocket/Real-time](#8-websocketreal-time)

---

## 1. Authentication & Security

### 1.1 Authentication Method

**Type:** Bearer Token (OAuth 2.0 / JWT)

**Header:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Token Structure:**
```json
{
  "sub": "user@org.uk",
  "iat": 1234567890,
  "exp": 1234571490,
  "org_id": "org-uuid",
  "user_id": "user-uuid",
  "email": "user@org.uk",
  "role": "admin|team_leader|support_worker|finance_officer|hr_officer",
  "home_ids": ["home-uuid-1", "home-uuid-2"],
  "iss": "carecore.auth",
  "aud": "carecore-api"
}
```

**Token Refresh:**
```
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token_value"
}

Response:
{
  "access_token": "new_jwt",
  "refresh_token": "new_refresh_token",
  "expires_in": 3600
}
```

### 1.2 Role-Based Access Control (RBAC)

**Roles & Permissions:**

| Role | Modules | Default Org Scope |
|------|---------|-------------------|
| **admin** | All | All homes, all residents, all staff |
| **team_leader** | Residents, Staff (team), Shifts (home), Finance (home view) | Assigned homes only |
| **support_worker** | My Shifts, Key Work Residents only, Visit Reports | Their own shifts, key work residents |
| **finance_officer** | Finance module only | All homes (finance only) |
| **hr_officer** | Staff module only | All staff records |

**Implementation:**
- Backend applies implicit `org_id` filter to all queries
- Team leaders filtered to `home_ids_assigned` array
- Support workers filtered to `key_work_resident_ids` array
- All queries include: `?org_id=<user_org_id>&home_id=<filtered_homes>`

### 1.3 Security Headers

**Required on All Responses:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
```

### 1.4 CORS Policy

```
Access-Control-Allow-Origin: https://carecore.domain.uk, https://staging.carecore.uk
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

## 2. Request/Response Standards

### 2.1 Base URL

**Production:** `https://api.carecore.uk/v1`  
**Staging:** `https://api.staging.carecore.uk/v1`  
**Local Dev:** `http://localhost:3000/api/v1`

### 2.2 Content-Type

**Request:**
```
Content-Type: application/json; charset=utf-8
```

**Response:**
```
Content-Type: application/json; charset=utf-8
```

### 2.3 Request Format

**Standard Request:**
```json
{
  "data": {
    "field1": "value",
    "field2": 123,
    "nested_object": {
      "sub_field": "value"
    }
  }
}
```

**List Request (with filters):**
```json
{
  "filter": {
    "status": "active",
    "home_id": "home-uuid-123",
    "created_date": {
      "$gte": "2026-01-01T00:00:00Z",
      "$lte": "2026-05-02T23:59:59Z"
    }
  },
  "sort": {
    "created_date": -1
  },
  "pagination": {
    "page": 1,
    "limit": 50
  }
}
```

### 2.4 Response Format

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "entity-uuid",
    "field1": "value",
    "created_date": "2026-05-02T14:30:00Z",
    "updated_date": "2026-05-02T14:30:00Z",
    "created_by": "user@org.uk"
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

**List Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "entity-uuid-1",
      "field1": "value1",
      "created_date": "2026-05-01T10:00:00Z"
    },
    {
      "id": "entity-uuid-2",
      "field1": "value2",
      "created_date": "2026-05-02T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

**Bulk Create Response (201):**
```json
{
  "status": "success",
  "data": [
    { "id": "uuid-1", "name": "Record 1", "status": "created" },
    { "id": "uuid-2", "name": "Record 2", "status": "created" }
  ],
  "metadata": {
    "created": 2,
    "failed": 0
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

---

## 3. Error Handling

### 3.1 Error Response Format

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-friendly error message",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

### 3.2 HTTP Status Codes & Error Codes

| HTTP | Code | Meaning | Retry? |
|------|------|---------|--------|
| 200 | OK | Success | N/A |
| 201 | CREATED | Resource created | N/A |
| 204 | NO_CONTENT | Success, no body | N/A |
| 400 | VALIDATION_ERROR | Bad request, invalid input | No |
| 400 | INVALID_ORG_ID | Org_id mismatch | No |
| 401 | UNAUTHORIZED | Missing/invalid token | Yes (refresh) |
| 403 | FORBIDDEN | User lacks permission | No |
| 404 | NOT_FOUND | Resource not found | No |
| 409 | CONFLICT | Duplicate resource or state conflict | No |
| 410 | GONE | Resource deleted (soft-delete) | No |
| 422 | UNPROCESSABLE_ENTITY | Validation failed (detailed) | No |
| 429 | RATE_LIMITED | Too many requests | Yes (exponential backoff) |
| 500 | INTERNAL_ERROR | Server error | Yes (exponential backoff) |
| 503 | SERVICE_UNAVAILABLE | Maintenance/overloaded | Yes (exponential backoff) |

### 3.3 Detailed Error Examples

**Validation Error (400):**
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for 1 field",
    "details": [
      {
        "field": "email",
        "value": "invalid@example",
        "issue": "Invalid email format",
        "constraint": "email_pattern"
      },
      {
        "field": "dob",
        "value": "2020-05-02",
        "issue": "Date of birth must be at least 5 years ago",
        "constraint": "min_age"
      }
    ]
  }
}
```

**Authorization Error (403):**
```json
{
  "status": "error",
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource",
    "details": {
      "required_role": "admin",
      "user_role": "support_worker",
      "resource": "POST /staff/salaries/export"
    }
  }
}
```

**Not Found (404):**
```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Resident not found",
    "details": {
      "entity": "Resident",
      "id": "invalid-uuid-123"
    }
  }
}
```

**Conflict (409):**
```json
{
  "status": "error",
  "error": {
    "code": "CONFLICT",
    "message": "Resident already exists in this home",
    "details": {
      "field": "unique_constraint",
      "conflicting_record_id": "existing-uuid"
    }
  }
}
```

**Rate Limited (429):**
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait before retrying.",
    "details": {
      "retry_after_seconds": 60,
      "limit": 100,
      "window_seconds": 3600
    }
  }
}
```

---

## 4. Entity CRUD Operations

### 4.1 Create Entity

**Endpoint:** `POST /entities/{entity_name}`

**Example: Create Resident**
```
POST /entities/Resident
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "data": {
    "org_id": "org-uuid",
    "home_id": "home-uuid",
    "display_name": "Alice M.",
    "dob": "2010-05-15",
    "placement_start": "2024-01-01",
    "placement_type": "childrens_home",
    "risk_level": "low",
    "status": "active"
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "resident-uuid-abc123",
    "org_id": "org-uuid",
    "home_id": "home-uuid",
    "display_name": "Alice M.",
    "dob": "2010-05-15",
    "placement_start": "2024-01-01",
    "placement_type": "childrens_home",
    "risk_level": "low",
    "status": "active",
    "created_date": "2026-05-02T14:30:00Z",
    "updated_date": "2026-05-02T14:30:00Z",
    "created_by": "user@org.uk"
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

### 4.2 Read Entity

**Endpoint:** `GET /entities/{entity_name}/{id}`

**Example: Get Resident**
```
GET /entities/Resident/resident-uuid-abc123
Authorization: Bearer <JWT>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "resident-uuid-abc123",
    "org_id": "org-uuid",
    "home_id": "home-uuid",
    "display_name": "Alice M.",
    ...all fields...
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

### 4.3 Update Entity

**Endpoint:** `PUT /entities/{entity_name}/{id}`

**Example: Update Resident Risk Level**
```
PUT /entities/Resident/resident-uuid-abc123
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "data": {
    "risk_level": "high",
    "updated_fields": ["risk_level"]
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "resident-uuid-abc123",
    "risk_level": "high",
    "updated_date": "2026-05-02T15:30:00Z",
    ...other fields...
  },
  "timestamp": "2026-05-02T15:30:00Z"
}
```

### 4.4 Delete Entity (Soft Delete)

**Endpoint:** `DELETE /entities/{entity_name}/{id}`

**Example: Delete Resident (mark as deleted)**
```
DELETE /entities/Resident/resident-uuid-abc123
Authorization: Bearer <JWT>
```

**Response (204 No Content):**
```
HTTP/1.1 204 No Content
```

**Note:** Soft-delete only. Records remain in database with `is_deleted=true`. Hard deletion not supported (audit trail preservation).

### 4.5 Bulk Create

**Endpoint:** `POST /entities/{entity_name}/bulk`

**Example: Bulk Create Residents**
```
POST /entities/Resident/bulk
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "data": [
    {
      "org_id": "org-uuid",
      "home_id": "home-uuid",
      "display_name": "Alice M.",
      "dob": "2010-05-15",
      "placement_start": "2024-01-01"
    },
    {
      "org_id": "org-uuid",
      "home_id": "home-uuid",
      "display_name": "Ben P.",
      "dob": "2008-03-22",
      "placement_start": "2024-02-01"
    }
  ]
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": [
    { "id": "resident-uuid-1", "display_name": "Alice M.", "status": "created" },
    { "id": "resident-uuid-2", "display_name": "Ben P.", "status": "created" }
  ],
  "metadata": {
    "created": 2,
    "failed": 0,
    "total": 2
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

### 4.6 Bulk Update

**Endpoint:** `PUT /entities/{entity_name}/bulk`

**Example: Bulk Update Risk Levels**
```
PUT /entities/Resident/bulk
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "data": [
    {
      "id": "resident-uuid-1",
      "risk_level": "high"
    },
    {
      "id": "resident-uuid-2",
      "risk_level": "medium"
    }
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": [
    { "id": "resident-uuid-1", "risk_level": "high", "status": "updated" },
    { "id": "resident-uuid-2", "risk_level": "medium", "status": "updated" }
  ],
  "metadata": {
    "updated": 2,
    "failed": 0,
    "total": 2
  }
}
```

---

## 5. Filtering, Sorting, Pagination

### 5.1 List Entities

**Endpoint:** `GET /entities/{entity_name}?filter=...&sort=...&page=...&limit=...`

**Example: List Active Residents**
```
GET /entities/Resident?status=active&home_id=home-uuid&sort=-created_date&page=1&limit=50
Authorization: Bearer <JWT>
```

### 5.2 Filter Operators

**Basic Equality:**
```
GET /entities/Resident?status=active
```

**Comparison Operators:**
```
GET /entities/Resident?dob[$gte]=2008-01-01&dob[$lte]=2010-12-31
GET /entities/Staff?dob[$gt]=1990-01-01
GET /entities/Staff?dob[$lt]=1985-01-01
```

**Range (between):**
```
GET /entities/Bill?amount[$gte]=1000&amount[$lte]=5000
```

**Array Contains:**
```
GET /entities/Staff?home_ids_assigned[$in]=home-uuid-1,home-uuid-2
```

**String Pattern (contains):**
```
GET /entities/Resident?display_name[$contains]=Alice
```

**Starts With:**
```
GET /entities/Resident?display_name[$startsWith]=A
```

**Multiple Filters (AND logic):**
```
GET /entities/Resident?status=active&home_id=home-uuid&risk_level=high
```

**Filter Operators Reference:**
```
$eq      — equals (default if no operator)
$ne      — not equals
$gt      — greater than
$gte     — greater than or equal
$lt      — less than
$lte     — less than or equal
$in      — in array
$nin     — not in array
$contains  — substring match
$startsWith — string prefix
$exists  — field exists
$regex   — regex pattern (advanced)
```

### 5.3 Sorting

**Ascending:**
```
GET /entities/Resident?sort=created_date
```

**Descending:**
```
GET /entities/Resident?sort=-created_date
```

**Multiple Sorts:**
```
GET /entities/Resident?sort=-risk_level,created_date
```

### 5.4 Pagination

**Offset-Based (Page Number):**
```
GET /entities/Resident?page=2&limit=50
```

**Cursor-Based (for large datasets):**
```
GET /entities/Resident?cursor=xyz123&limit=50
```

Response includes:
```json
{
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 250,
    "pages": 5,
    "cursor_next": "abc456",
    "has_next": true
  }
}
```

### 5.5 Response with Filters Applied

```json
{
  "status": "success",
  "data": [...50 resident objects...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  },
  "filters": {
    "status": "active",
    "home_id": "home-uuid",
    "risk_level": ["high", "critical"]
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

---

## 6. Business Logic Endpoints

### 6.1 Visit Report Submission

**Endpoint:** `POST /business/visit-report`

**Request:**
```json
{
  "data": {
    "org_id": "org-uuid",
    "home_id": "home-uuid",
    "resident_id": "resident-uuid",
    "date": "2026-05-02",
    "visit_type": "face_to_face",
    "duration_minutes": 60,
    "key_topics": "Health review, family contact planning",
    "yp_mood_demeanor": "Positive, engaged",
    "observations": "Alice appeared well, no safeguarding concerns",
    "issues_identified": "Slight increase in family tensions",
    "actions_required": "Follow-up call to social worker",
    "next_visit_planned": true,
    "next_visit_date": "2026-05-09",
    "flags": ["family_concern"]
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "visit-report-uuid",
    "status": "submitted",
    "created_date": "2026-05-02T14:30:00Z",
    "notification_sent_to": ["team-lead-uuid"],
    "awaiting_approval": true
  }
}
```

### 6.2 Support Plan Signoff

**Endpoint:** `POST /business/support-plan/signoff`

**Request:**
```json
{
  "data": {
    "org_id": "org-uuid",
    "support_plan_id": "plan-uuid",
    "resident_id": "resident-uuid",
    "signed_by": "manager-uuid",
    "password_hash": "hashed_confirmation"
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "support_plan_id": "plan-uuid",
    "status": "active",
    "signed_off_at": "2026-05-02T14:30:00Z",
    "next_review_date": "2027-05-02",
    "pdf_url": "https://storage.carecore.uk/plans/plan-uuid.pdf",
    "notifications_sent_to": ["yp-email", "parent-email", "social-worker-email"]
  }
}
```

### 6.3 Risk Assessment Save

**Endpoint:** `POST /business/risk-assessment`

**Request:**
```json
{
  "data": {
    "org_id": "org-uuid",
    "resident_id": "resident-uuid",
    "home_id": "home-uuid",
    "category": "sexual_exploitation",
    "is_present": "high",
    "likelihood": "medium",
    "consequence": "high",
    "background": "No known history",
    "triggers": "Unknown peers, unsupervised time",
    "management_strategy": "Supervised outings, trusted staff check-ins",
    "protective_factors": "Strong key worker relationship, family contact",
    "yp_consulted": true,
    "review_date": "2026-11-02"
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "risk-assessment-uuid",
    "overall_rating": "high",
    "created_date": "2026-05-02T14:30:00Z",
    "alerts_sent": true,
    "alert_recipients": ["team-lead-uuid", "manager-uuid"]
  }
}
```

### 6.4 Missing From Home Report

**Endpoint:** `POST /business/missing-from-home`

**Request:**
```json
{
  "data": {
    "org_id": "org-uuid",
    "home_id": "home-uuid",
    "resident_id": "resident-uuid",
    "reported_missing_datetime": "2026-05-02T18:00:00Z",
    "reported_by_id": "staff-uuid",
    "last_seen_datetime": "2026-05-02T17:30:00Z",
    "last_seen_location": "Home",
    "known_risks": "Low risk, has run before, likely with friend",
    "likely_location": "Friend's house on Smith Road",
    "police_notified": false
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "mfh-uuid",
    "status": "active",
    "created_date": "2026-05-02T18:00:00Z",
    "alerts_sent": true,
    "alert_recipients": ["team-lead-uuid", "manager-uuid", "admin-uuid"]
  }
}
```

### 6.5 Timesheet Submission

**Endpoint:** `POST /business/timesheet`

**Request:**
```json
{
  "data": {
    "org_id": "org-uuid",
    "staff_id": "staff-uuid",
    "pay_period_id": "period-uuid",
    "period_start": "2026-05-01",
    "period_end": "2026-05-31",
    "total_actual_hours": 172,
    "shifts": [
      {
        "date": "2026-05-01",
        "shift_id": "shift-uuid",
        "hours_worked": 8.5
      }
    ]
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "timesheet-uuid",
    "status": "submitted",
    "total_hours": 172,
    "calculated_gross_pay": 3440,
    "awaiting_approval": true,
    "notification_sent_to": "team-lead-uuid"
  }
}
```

### 6.6 Payslip Generation

**Endpoint:** `POST /business/payroll/generate-payslips`

**Request:**
```json
{
  "data": {
    "org_id": "org-uuid",
    "pay_period_id": "period-uuid"
  }
}
```

**Response (202 Accepted - Async):**
```json
{
  "status": "success",
  "data": {
    "job_id": "payroll-job-abc123",
    "status": "processing",
    "estimated_completion": "2026-05-02T16:00:00Z",
    "staff_count": 5,
    "poll_url": "/business/payroll/jobs/payroll-job-abc123"
  }
}
```

**Poll for Status:**
```
GET /business/payroll/jobs/payroll-job-abc123
Authorization: Bearer <JWT>
```

**Response (200 - Complete):**
```json
{
  "status": "success",
  "data": {
    "job_id": "payroll-job-abc123",
    "status": "completed",
    "payslips_generated": 5,
    "payslips": [
      {
        "staff_id": "staff-uuid-1",
        "payslip_id": "payslip-uuid-1",
        "net_pay": 2760,
        "download_url": "https://storage.carecore.uk/payslips/payslip-uuid-1.pdf"
      }
    ],
    "emails_sent": 5
  }
}
```

---

## 7. Rate Limiting & Quotas

### 7.1 Rate Limits

**Standard User:**
- 100 requests per hour per endpoint
- 1000 requests per hour total
- 10 concurrent requests

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

**Rate Limited Response (429):**
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "window_seconds": 3600,
      "retry_after_seconds": 45
    }
  }
}
```

**Backoff Strategy (Client-side):**
```
Attempt 1: Immediate
Attempt 2: Wait 2 seconds
Attempt 3: Wait 4 seconds
Attempt 4: Wait 8 seconds
Attempt 5: Wait 16 seconds
Max retries: 5
```

### 7.2 Data Transfer Quotas

**Bulk Operations Limits:**
- Bulk create: max 1000 records per request
- Bulk update: max 1000 records per request
- List export: max 10,000 records per request
- File upload: max 50MB per file

**Response on Quota Exceeded:**
```json
{
  "status": "error",
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Bulk request exceeds 1000 record limit",
    "details": {
      "limit": 1000,
      "requested": 1200,
      "suggestion": "Split into multiple requests"
    }
  }
}
```

---

## 8. WebSocket/Real-time

### 8.1 Establish Connection

**Endpoint:** `WSS://api.carecore.uk/ws?token=<JWT>`

**Connection Response:**
```json
{
  "type": "connection_established",
  "session_id": "session-uuid",
  "timestamp": "2026-05-02T14:30:00Z"
}
```

### 8.2 Subscribe to Entity Updates

**Client Message:**
```json
{
  "type": "subscribe",
  "entity": "Resident",
  "resident_id": "resident-uuid"
}
```

**Server Response:**
```json
{
  "type": "subscribed",
  "entity": "Resident",
  "resident_id": "resident-uuid"
}
```

### 8.3 Receive Real-time Events

**Entity Create:**
```json
{
  "type": "entity_created",
  "entity": "VisitReport",
  "id": "visit-report-uuid",
  "resident_id": "resident-uuid",
  "data": {
    "id": "visit-report-uuid",
    "created_by": "staff-uuid",
    "created_date": "2026-05-02T14:30:00Z"
  },
  "timestamp": "2026-05-02T14:30:00Z"
}
```

**Entity Update:**
```json
{
  "type": "entity_updated",
  "entity": "Resident",
  "id": "resident-uuid",
  "changes": {
    "risk_level": {
      "old": "low",
      "new": "high"
    },
    "updated_date": "2026-05-02T14:30:00Z"
  },
  "updated_by": "staff-uuid",
  "timestamp": "2026-05-02T14:30:00Z"
}
```

**Notification:**
```json
{
  "type": "notification",
  "category": "safeguarding_alert",
  "title": "High Risk Assessment Created",
  "message": "Alice M. flagged as high risk for sexual exploitation",
  "related_entity": "RiskAssessment",
  "entity_id": "risk-uuid",
  "priority": "high",
  "timestamp": "2026-05-02T14:30:00Z"
}
```

### 8.4 Heartbeat (Keep-Alive)

**Server (every 30 seconds):**
```json
{
  "type": "ping"
}
```

**Client Response:**
```json
{
  "type": "pong"
}
```

### 8.5 Unsubscribe

**Client Message:**
```json
{
  "type": "unsubscribe",
  "entity": "Resident",
  "resident_id": "resident-uuid"
}
```

---

## Appendix: Complete Endpoint Reference

| Method | Endpoint | Purpose | Auth Required | Pagination |
|--------|----------|---------|---------------|-----------|
| GET | `/entities/{entity_name}` | List entities | Yes | Yes |
| GET | `/entities/{entity_name}/{id}` | Get single entity | Yes | No |
| POST | `/entities/{entity_name}` | Create entity | Yes | No |
| PUT | `/entities/{entity_name}/{id}` | Update entity | Yes | No |
| DELETE | `/entities/{entity_name}/{id}` | Delete entity (soft) | Yes | No |
| POST | `/entities/{entity_name}/bulk` | Bulk create | Yes | No |
| PUT | `/entities/{entity_name}/bulk` | Bulk update | Yes | No |
| POST | `/business/visit-report` | Submit visit report | Yes (support_worker+) | No |
| POST | `/business/support-plan/signoff` | Sign off support plan | Yes (team_leader+) | No |
| POST | `/business/risk-assessment` | Create risk assessment | Yes (team_leader+) | No |
| POST | `/business/missing-from-home` | Report missing resident | Yes (team_leader+) | No |
| POST | `/business/timesheet` | Submit timesheet | Yes (support_worker+) | No |
| POST | `/business/payroll/generate-payslips` | Generate payslips | Yes (finance_officer+) | No |
| GET | `/business/payroll/jobs/{job_id}` | Check payroll job status | Yes (finance_officer+) | No |
| POST | `/auth/refresh` | Refresh JWT token | No (uses refresh_token) | No |
| WSS | `/ws?token=<JWT>` | WebSocket real-time | Yes (JWT in query) | No |

---

**Document Version:** 1.0  
**Last Updated:** May 2, 2026  
**Distribution:** Backend developers, API architects, QA teams