package handlers

import (
	"net/http"
	"time"

	"carecore-backend/db"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
)

type unifiedLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// UnifiedLogin — POST /api/login
// Single entry point for the one login form on the frontend. Tries
// platform_admins first (small table, cheap check); if that doesn't
// match, falls back to the normal tenant staff login. The response
// carries "user_type": "platform" | "tenant" so the frontend knows
// which token/redirect to use without needing to guess up front.
func UnifiedLogin(c *gin.Context) {
	var req unifiedLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	if admin, err := db.AuthenticatePlatformAdmin(req.Email, req.Password); err == nil {
		token, terr := services.GeneratePlatformAccessToken(admin.ID.String(), admin.Email)
		if terr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error":  gin.H{"code": "INTERNAL_ERROR", "message": "Failed to generate token"},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"user_type":    "platform",
				"access_token": token,
				"admin": gin.H{
					"id":    admin.ID,
					"email": admin.Email,
				},
			},
			"timestamp": time.Now(),
		})
		return
	}

	// Not a platform admin — fall through to tenant staff login.
	loginTenant(c, req.Email, req.Password)
}