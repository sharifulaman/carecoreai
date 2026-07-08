package handlers

import (
	"net/http"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
)

// GetMyPermissions returns the RolePermission record for the authenticated user's own role.
//
// This endpoint is intentionally placed outside the /entities/:entity group so it bypasses
// RequireModuleAccess entirely. Without this exemption a user whose admin_mgmt module is set
// to "None" would receive a 403 when trying to fetch their own permission config — causing a
// chicken-and-egg loop where the frontend never learns it should restrict access.
func GetMyPermissions(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"},
		})
		return
	}

	scopedDB, ok := mustScopedDB(c) 
	if !ok {
		 return 
		}

	var record models.RolePermission
	if err := scopedDB.Where("org_id = ? AND role_name = ?", claims.OrgID, claims.Role).First(&record).Error; err != nil {
		// No record means permissions are unconfigured — return null so the frontend
		// falls back to role-based defaults (no restriction).
		c.JSON(http.StatusOK, gin.H{"status": "success", "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": record})
}
