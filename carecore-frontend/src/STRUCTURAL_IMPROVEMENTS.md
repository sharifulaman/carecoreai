# STRUCTURAL IMPROVEMENTS — Implementation Log

## Status Overview

| Priority | Item | Status | Notes |
|----------|------|--------|-------|
| 🔴 | Fix Denormalization | ✅ DONE | `syncStaffProfileChanges.js` |
| 🔴 | Implement Foreign Keys | ✅ DONE | `validateForeignKeys.js` |
| 🟡 | Normalize Arrays | ✅ DONE | New entities: HomeDocument, HomeSupportWorker |
| 🟡 | Split CICReport | ✅ DONE | New entity: CICReportSection |
| 🟡 | Link Data Flow | ⏳ PENDING | Update CICProgressNotes component |
| 🟠 | Create Shift Table | ✅ DONE | New entity: Shift |
| 🟠 | Add RLS | ⏳ PENDING | Use secureQueryWithRBAC() in all pages |
| 🟠 | Complete Modules | ⏳ PENDING | Finance, Analytics, Health, etc. |

---

## 🔴 CRITICAL FIXES (DONE)

### 1. Denormalization Sync — `syncStaffProfileChanges.js`

**Problem:** When staff name changes, denormalized copies in logs aren't updated.

**Solution:** Backend function that atomically updates all references when StaffProfile.full_name changes.

**Usage:**
```javascript
const result = await base44.functions.invoke('syncStaffProfileChanges', {
  staff_profile_id: '123',
  old_name: 'John Smith',
  new_name: 'John Jones',
  org_id: ORG_ID
});
```

**Syncs:**
- DailyLog.worker_name
- VisitReport.worker_name
- HomeTask.assigned_to_name
- AccidentReport.reported_by_name
- HomeCheck.checked_by_name
- MaintenanceLog.reported_by_name

---

### 2. Foreign Key Validation — `validateForeignKeys.js`

**Problem:** Can create DailyLog with invalid resident_id, creating orphaned records.

**Solution:** Function validates all FKs before insert/update.

**Usage:**
```javascript
const validation = await base44.functions.invoke('validateForeignKeys', {
  entity_name: 'DailyLog',
  fk_data: {
    resident_id: '123',
    worker_id: '456',
    home_id: '789'
  },
  org_id: ORG_ID
});

if (!validation.data.success) {
  console.log('Validation errors:', validation.data.errors);
}
```

**Validates:**
- DailyLog → Resident, StaffProfile, Home
- Resident → Home, StaffProfile (key_worker, team_leader)
- VisitReport → Resident, StaffProfile
- HomeTask → Home, StaffProfile

---

## 🟡 NORMALIZATION (DONE)

### New Entities

#### HomeDocument
Replaces `Home.documents[]` array.

```
Home (1) ──→ (M) HomeDocument
```

**Fields:**
- org_id, home_id, doc_type, doc_name, file_url, expiry_date, notes

#### HomeSupportWorker
Replaces `Home.support_worker_ids[]` array.

```
Home (1) ──→ (M) HomeSupportWorker
StaffProfile (1) ──→ (M) HomeSupportWorker
```

**Fields:**
- org_id, home_id, support_worker_id, assigned_date, notes

#### CICReportSection
Splits `CICReport.report_data` (9-section object) into 9 rows.

```
CICReport (1) ──→ (M) CICReportSection
```

**Fields:**
- org_id, cic_report_id, section_key, section_label, going_well, concerns, needs_to_happen

#### Shift
Creates explicit shift assignments from ShiftTemplate.

```
ShiftTemplate (1) ──→ (M) Shift
Home (1) ──→ (M) Shift
StaffProfile (1) ──→ (M) Shift
```

**Fields:**
- org_id, home_id, shift_template_id, assigned_staff_id, shift_date, status, notes

---

### Migration Path

**Step 1: Run Migration Function**
```javascript
await base44.functions.invoke('migrateNormalizedData', { org_id: ORG_ID });
```

This copies data from old denormalized format → new normalized tables.

**Step 2: Update Components**

**Before:**
```javascript
const homes = await base44.entities.Home.filter({ org_id });
homes[0].documents.forEach(doc => console.log(doc.doc_name));
```

**After:**
```javascript
const docs = await base44.entities.HomeDocument.filter({ org_id, home_id: homeId });
docs.forEach(doc => console.log(doc.doc_name));
```

**Step 3: Update CICProgressNotes Component**

Currently saves:
```javascript
report_data: {
  accommodation: { going_well: '...', concerns: '...', needs_to_happen: '...' },
  education: { ... },
  // ... 7 more sections
}
```

Will save instead:
```javascript
// Create CICReport (header)
const report = await base44.entities.CICReport.create({
  org_id, resident_id, resident_name, date_from, date_to, title
});

// Create 9 CICReportSection rows
for (const sectionKey of CIC_SECTIONS) {
  await base44.entities.CICReportSection.create({
    org_id, cic_report_id: report.id, section_key, section_label, ...sectionData
  });
}
```

---

## 🟡 DATA LINKING (NEXT)

### Current State
- DailyLog standalone
- VisitReport standalone
- CICReport standalone (reads from logs, but not explicitly linked)

### Target State
```
DailyLog (many) ──→ (one) VisitReport
VisitReport (many) ──→ (one) CICReport
```

**Add to VisitReport schema:**
```json
{
  "daily_log_ids": {
    "type": "array",
    "items": { "type": "string" },
    "description": "DailyLogs that feed this visit"
  }
}
```

**Add to CICReport schema:**
```json
{
  "visit_report_ids": {
    "type": "array",
    "items": { "type": "string" },
    "description": "VisitReports that feed this CIC review"
  }
}
```

---

## 🟠 ROW-LEVEL SECURITY (NEXT)

Use `secureQueryWithRBAC()` in all page components.

**Current:** UI hides data based on role
**Target:** Data access enforced at query layer

### Pages to Update
1. Residents → Filter by home_ids[]
2. DailyLogs → Filter by home_ids[]
3. VisitReports → Filter by home_ids[]
4. HomeDetail → Limit to assigned homes
5. Staff → Admin only (hide other staff details)

---

## 🟠 PLACEHOLDERS (FUTURE)

Modules to complete:
- Finance (Bills, Budgets, Expenses)
- Analytics (Charts, KPI trends)
- Health (Medication, Appointments)
- Education (Enrollment, Progress)
- Transitions (Pathway Planning)

Each needs dedicated pages with forms and data visualization.

---

## Testing Checklist

- [ ] Run `migrateNormalizedData()` on test org
- [ ] Verify HomeDocument records exist
- [ ] Verify HomeSupportWorker junction records exist
- [ ] Verify CICReportSection rows created (9 per report)
- [ ] Query Home → no documents[] array returned
- [ ] Query CICReport → no report_data object returned
- [ ] Call `validateForeignKeys()` with invalid FK → returns error
- [ ] Call `syncStaffProfileChanges()` → all denormalized fields updated
- [ ] Test secureQueryWithRBAC() blocks cross-home access