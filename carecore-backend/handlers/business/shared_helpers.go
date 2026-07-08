package business

import (
	"carecore-backend/models"
	"carecore-backend/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// resolveStaffProfile — add scopedDB parameter
func resolveStaffProfile(scopedDB *gorm.DB, c *gin.Context, userID, orgID string) (models.StaffProfile, bool) {
    var profile models.StaffProfile
    if err := scopedDB.
        Where("user_id = ? AND org_id = ? AND is_deleted = false", userID, orgID).
        First(&profile).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{
            "status": "error",
            "error":  gin.H{"code": "STAFF_NOT_FOUND", "message": "No staff profile found for this account"},
        })
        return profile, false
    }
    return profile, true
}

// viewerOutranksTarget — add scopedDB parameter
func viewerOutranksTarget(scopedDB *gorm.DB, orgID, viewerRole, targetRole string) (bool, error) {
    var viewer, target models.RoleDefinition
    if err := scopedDB.Where("org_id = ? AND role_name = ?", orgID, viewerRole).First(&viewer).Error; err != nil {
        return false, err
    }
    if err := scopedDB.Where("org_id = ? AND role_name = ?", orgID, targetRole).First(&target).Error; err != nil {
        return false, err
    }
    return viewer.Rank > target.Rank, nil
}

// batchResidentNames — add scopedDB parameter
func batchResidentNames(scopedDB *gorm.DB, kpis []models.SWPerformanceKPI) map[string]string {
    ids := make([]string, 0, len(kpis))
    seen := map[string]bool{}
    for _, k := range kpis {
        if k.ResidentID != "" && !seen[k.ResidentID] {
            ids = append(ids, k.ResidentID)
            seen[k.ResidentID] = true
        }
    }
    names := map[string]string{}
    if len(ids) == 0 {
        return names
    }
    var rows []struct {
        ID          string
        DisplayName string
    }
    scopedDB.Model(&models.Resident{}).
        Select("id, display_name").
        Where("id IN ? AND is_deleted = false", ids).
        Find(&rows)
    for _, r := range rows {
        names[r.ID] = r.DisplayName
    }
    return names
}

// batchHomeNames — add scopedDB parameter
func batchHomeNames(scopedDB *gorm.DB, kpis []models.SWPerformanceKPI) map[string]string {
    ids := make([]string, 0, len(kpis))
    seen := map[string]bool{}
    for _, k := range kpis {
        if k.HomeID != "" && !seen[k.HomeID] {
            ids = append(ids, k.HomeID)
            seen[k.HomeID] = true
        }
    }
    names := map[string]string{}
    if len(ids) == 0 {
        return names
    }
    var rows []struct {
        ID   string
        Name string
    }
    scopedDB.Model(&models.Home{}).
        Select("id, name").
        Where("id IN ? AND is_deleted = false", ids).
        Find(&rows)
    for _, r := range rows {
        names[r.ID] = r.Name
    }
    return names
}

// batchHomeNamesForStaff — add scopedDB parameter
func batchHomeNamesForStaff(scopedDB *gorm.DB, staffList []models.StaffProfile) map[string]string {
    seen := map[string]bool{}
    ids  := make([]string, 0)
    for _, s := range staffList {
        for _, hid := range s.HomeIDs {
            if hid != "" && !seen[hid] {
                seen[hid] = true
                ids = append(ids, hid)
            }
        }
    }
    names := map[string]string{}
    if len(ids) == 0 {
        return names
    }
    var rows []struct {
        ID   string
        Name string
    }
    scopedDB.Model(&models.Home{}).Select("id, name").Where("id IN ? AND is_deleted = false", ids).Find(&rows)
    for _, r := range rows {
        names[r.ID] = r.Name
    }
    return names
}
// ── Shared helper: load staff in scope ────────────────────────────────────────
// loadScopedStaff — add scopedDB parameter
// loadScopedStaff returns the set of active StaffProfiles visible to the caller.
//
// Scoping rules (applied in order):
//  1. Always filtered to the caller's orgID.
//  2. Non-admin callers are restricted to staff whose role rank is strictly
//     below their own. If RoleDefinition is not configured, home-based scoping
//     applies only.
//  3. Non-admin callers whose JWT contains home_ids are further restricted to
//     staff who share at least one of those homes.
//  4. The optional roleFilter, homeFilter, departmentFilter, and search params
//     narrow the result within the already-scoped set. search matches against
//     full_name and employee_id (case-insensitive substring).
//
// Returns (nil, false) and writes a 500 response only on unexpected DB error.
// An empty slice is a valid result (not an error).
func loadScopedStaff(
    scopedDB *gorm.DB,
    c *gin.Context,
    claims *services.Claims,
    roleFilter, homeFilter, departmentFilter, search string,
) ([]models.StaffProfile, bool) {
    q := scopedDB.Where("org_id = ? AND is_deleted = false AND status = 'active'", claims.OrgID)

    if claims.Role != "admin" {
        var viewer models.RoleDefinition
        if err := scopedDB.Where("org_id = ? AND role_name = ?", claims.OrgID, claims.Role).
            First(&viewer).Error; err == nil && viewer.Rank > 0 {
            var lowerRoles []models.RoleDefinition
            scopedDB.Where("org_id = ? AND rank < ?", claims.OrgID, viewer.Rank).Find(&lowerRoles)
            names := make([]string, 0, len(lowerRoles))
            for _, r := range lowerRoles {
                names = append(names, r.RoleName)
            }
            if len(names) > 0 {
                q = q.Where("role IN ?", names)
            } else {
                return []models.StaffProfile{}, true
            }
        }
        if len(claims.HomeIDs) > 0 {
            q = q.Where("home_ids && ?", pq.Array(claims.HomeIDs))
        }
    }

    if roleFilter != "" && roleFilter != "all" {
        roles := strings.Split(roleFilter, ",")
        q = q.Where("role IN ?", roles)
    }
    if homeFilter != "" && homeFilter != "all" {
        q = q.Where("? = ANY(home_ids)", homeFilter)
    }
    if departmentFilter != "" && departmentFilter != "all" {
        q = q.Where("department = ?", departmentFilter)
    }
    if search != "" {
        like := "%" + search + "%"
        q = q.Where("full_name ILIKE ? OR employee_id ILIKE ?", like, like)
    }

    var staffList []models.StaffProfile
    if err := q.Find(&staffList).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "status": "error",
            "error":  gin.H{"code": "DB_ERROR", "message": "Failed to load staff list"},
        })
        return nil, false
    }
    return staffList, true
}