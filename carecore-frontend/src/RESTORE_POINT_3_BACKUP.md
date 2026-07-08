# Restore Point 3 — Property Type Filtering & Display

**Date:** 2026-04-23

## Changes Made

### 1. Property Type Filter Added to Homes Page
- **File:** `pages/Homes`
- Added dropdown filter to display homes by property type (Outreach, 24 Hours Housing, Care Services, 18+ Accommodation)
- Filter logic: homes without property_type still show in "All" view
- Displays error message when no homes match selected filter

### 2. Seeded 4 New Homes
- **Function:** `seedDetailedHomes` (executed)
- Created homes for each property type:
  - Grafton House - Outreach
  - Haven Care - Care Services
  - Bridge House - 24 Hours Housing
  - Summit House - 18+ Accommodation

### 3. Updated Old 3 Homes
- **Function:** `seedExistingHomes` (executed)
- Set `property_type: "outreach"` for the 3 existing homes (Maple House, Oak Lodge, Cedar View)

### 4. Fixed Display to Show Property Type
- **File:** `pages/Homes` — Changed home card subtitle from `home.type` to `home.property_type`
- **File:** `pages/HomeDetail` — Changed header subtitle from `home.type` to `home.property_type`

## Revert Instructions

To revert to previous state:
1. Remove property_type filter dropdown from `pages/Homes`
2. Change display back to show `home.type` instead of `home.property_type` in both files
3. Delete the 4 seeded homes (Grafton House, Haven Care, Bridge House, Summit House)
4. Remove `property_type` field from the 3 old homes in the database

## Database State
- Total homes: 7 (3 old + 4 new)
- All homes now have `property_type` assigned