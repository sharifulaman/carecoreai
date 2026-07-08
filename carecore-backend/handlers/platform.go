package handlers

import (
	"net/http"
	"time"

	"carecore-backend/db"
	"carecore-backend/middleware"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
)

type platformLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func PlatformLogin(c *gin.Context) {
	var req platformLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	admin, err := db.AuthenticatePlatformAdmin(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  gin.H{"code": "UNAUTHORIZED", "message": "Invalid email or password"},
		})
		return
	}

	token, err := services.GeneratePlatformAccessToken(admin.ID.String(), admin.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INTERNAL_ERROR", "message": "Failed to generate token"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"access_token": token,
			"admin": gin.H{
				"id":    admin.ID,
				"email": admin.Email,
			},
		},
		"timestamp": time.Now(),
	})
}

// ListOrganisationsHandler — GET /api/platform/organisations
func ListOrganisationsHandler(c *gin.Context) {
	orgs, err := db.ListOrganisations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INTERNAL_ERROR", "message": "Failed to list organisations"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": orgs, "timestamp": time.Now()})
}

type createOrganisationRequest struct {
	Name  string `json:"name" binding:"required"`
	OrgID string `json:"org_id" binding:"required"`
}

// CreateOrganisationHandler — POST /api/platform/organisations
func CreateOrganisationHandler(c *gin.Context) {
	claims := middleware.GetPlatformClaims(c)


	var req createOrganisationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	org, tempPassword, err := db.CreateOrganisation(req.Name, req.OrgID, claims.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"org_id":              org.OrgID,
			"name":                org.Name,
			"first_admin_email":   "admin@" + org.OrgID + ".carecoreai.local",
			"first_admin_password": tempPassword,
		},
		"timestamp": time.Now(),
	})
}

type orgStatusRequest struct {
	OrgID string `uri:"org_id" binding:"required"`
}

// ActivateOrganisationHandler — POST /api/platform/organisations/:org_id/activate
func ActivateOrganisationHandler(c *gin.Context) {
	setOrgStatus(c, true)
}

// DeactivateOrganisationHandler — POST /api/platform/organisations/:org_id/deactivate
func DeactivateOrganisationHandler(c *gin.Context) {
	setOrgStatus(c, false)
}

func setOrgStatus(c *gin.Context, active bool) {
	var params orgStatusRequest
	if err := c.ShouldBindUri(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": "org_id is required"},
		})
		return
	}

	if err := db.SetOrganisationStatus(params.OrgID, active); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update organisation status"},
		})
		return
	}

	status := "activated"
	if !active {
		status = "deactivated"
	}
	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"data":      gin.H{"org_id": params.OrgID, "organisation_status": status},
		"timestamp": time.Now(),
	})
}