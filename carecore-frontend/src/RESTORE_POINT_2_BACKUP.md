# RESTORE POINT 2 - Home & Property Merge Backup
**Date**: 2026-04-23  
**Change**: Merging Home and Property entities into unified Home entity

## Current Entities Before Merge

### Home Entity Schema
```json
{
  "name": "Home",
  "type": "object",
  "properties": {
    "org_id": "string",
    "name": "string",
    "type": "enum: [childrens, supported, adult]",
    "care_model": "enum: [outreach, residential, both]",
    "address": "string",
    "postcode": "string",
    "phone": "string",
    "email": "string",
    "team_leader_id": "string",
    "privacy_mode": "boolean",
    "compliance_framework": "enum: [ofsted, cqc, custom]",
    "default_language": "string",
    "status": "enum: [active, archived]"
  }
}
```

### Property Entity Schema
```json
{
  "name": "Property",
  "type": "object",
  "properties": {
    "org_id": "string",
    "home_id": "string (FK to Home)",
    "name": "string",
    "address": "string",
    "postcode": "string",
    "property_type": "enum: [house, flat, bungalow, supported_unit]",
    "lease_start": "date",
    "lease_end": "date",
    "landlord_name": "string",
    "landlord_contact": "string",
    "monthly_rent": "number",
    "status": "enum: [active, vacant, maintenance, archived]",
    "notes": "string"
  }
}
```

## Current Code References

### Files Using Property Entity:
- `pages/Finance.jsx` - Fetches bills related to properties
- `components/house/PropertyList.jsx` - Lists properties
- `components/house/PropertyForm.jsx` - Form for property creation
- `components/house/BillList.jsx` - References property_id
- `pages/HouseManagement.jsx` - Main page for properties

### Files Using Home Entity:
- `pages/Homes.jsx`
- `pages/HomeDetail.jsx`
- `pages/AdminDashboard.jsx`
- `pages/Residents.jsx`
- `pages/VisitReports.jsx`
- Multiple component files
- `components/layout/AppSidebar.jsx`

### Bill Entity (References Property):
```json
"property_id": "string",
"property_name": "string"
```

### Bill Usage Files:
- `pages/Finance.jsx`
- `components/house/BillForm.jsx`
- `components/house/BillDetailsModal.jsx`

## Revert Instructions

If you need to revert, you will need to:
1. Restore Home entity (original schema above)
2. Restore Property entity (original schema above)
3. Restore all files listed above to their original state
4. Update Bill entity to use property_id and property_name again