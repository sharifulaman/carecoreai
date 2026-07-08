package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ListRoleDefinitions returns all role definitions for the caller's org,
// ordered by rank descending (highest authority first).
func ListRoleDefinitions(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var records []models.RoleDefinition
	if err := scopedDB.Where("org_id = ?", claims.OrgID).Order("rank DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "DB_ERROR", "message": "Failed to load role definitions"}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": records})
}

// CreateRoleDefinition creates a new custom role for the org.
// System roles are seeded automatically and cannot be created via this endpoint.
func CreateRoleDefinition(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var body struct {
		RoleName    string `json:"role_name" binding:"required"`
		Label       string `json:"label" binding:"required"`
		Rank        int    `json:"rank"`
		BaseRole    string `json:"base_role"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	var existing models.RoleDefinition
	if err := scopedDB.Where("org_id = ? AND role_name = ?", claims.OrgID, body.RoleName).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"status": "error", "error": gin.H{"code": "ROLE_EXISTS", "message": "A role with this name already exists"}})
		return
	}

	rank := body.Rank
	if rank <= 0 {
		rank = 10
	}

	record := models.RoleDefinition{
		Base:        models.Base{OrgID: claims.OrgID, CreatedBy: claims.Email},
		RoleName:    body.RoleName,
		Label:       body.Label,
		Rank:        rank,
		IsSystem:    false,
		BaseRole:    body.BaseRole,
		Description: body.Description,
	}
	if err := scopedDB.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "DB_ERROR", "message": "Failed to create role definition"}})
		return
	}

	after, _ := json.Marshal(map[string]interface{}{
		"role_name": record.RoleName,
		"label":     record.Label,
		"rank":      record.Rank,
	})
	middleware.WritePermissionChangeAudit(claims.OrgID, claims.Email, claims.UserID, claims.Role, record.ID.String(), "role_definition_created", nil, after)

	c.JSON(http.StatusCreated, gin.H{"status": "success", "data": record})
}

// UpdateRoleDefinition updates a role's label, description, or rank.
// Rank changes are blocked for system roles.
func UpdateRoleDefinition(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var record models.RoleDefinition
	if err := scopedDB.Where("id = ? AND org_id = ?", id, claims.OrgID).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Role definition not found"}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "DB_ERROR", "message": "Database error"}})
		return
	}

	var body struct {
		Label       *string `json:"label"`
		Rank        *int    `json:"rank"`
		Description *string `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	// Guard: system roles cannot have their rank changed.
	if record.IsSystem && body.Rank != nil && *body.Rank != record.Rank {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": gin.H{"code": "SYSTEM_ROLE_PROTECTED", "message": "Rank cannot be changed for system roles"}})
		return
	}

	before, _ := json.Marshal(map[string]interface{}{"label": record.Label, "rank": record.Rank})

	updates := map[string]interface{}{}
	if body.Label != nil {
		updates["label"] = *body.Label
	}
	if body.Rank != nil && !record.IsSystem {
		updates["rank"] = *body.Rank
	}
	if body.Description != nil {
		updates["description"] = *body.Description
	}

	if len(updates) > 0 {
		if err := scopedDB.Model(&record).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "DB_ERROR", "message": "Failed to update role definition"}})
			return
		}
	}

	after, _ := json.Marshal(updates)
	middleware.WritePermissionChangeAudit(claims.OrgID, claims.Email, claims.UserID, claims.Role, record.ID.String(), "role_definition_updated", before, after)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": record})
}

// DeleteRoleDefinition deletes a custom role. System roles cannot be deleted.
func DeleteRoleDefinition(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"}})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var record models.RoleDefinition
	if err := scopedDB.Where("id = ? AND org_id = ?", id, claims.OrgID).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Role definition not found"}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "DB_ERROR", "message": "Database error"}})
		return
	}

	if record.IsSystem {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": gin.H{"code": "SYSTEM_ROLE_PROTECTED", "message": "System roles cannot be deleted"}})
		return
	}

	if err := scopedDB.Delete(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "DB_ERROR", "message": "Failed to delete role definition"}})
		return
	}

	after, _ := json.Marshal(map[string]string{"role_name": record.RoleName, "label": record.Label})
	middleware.WritePermissionChangeAudit(claims.OrgID, claims.Email, claims.UserID, claims.Role, record.ID.String(), "role_definition_deleted", nil, after)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": gin.H{"deleted": true}})
}
