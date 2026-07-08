package handlers

import (
	"net/http"
	"time"

	"carecore-backend/config"
	"carecore-backend/db"
	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required"`
	Role     string `json:"role"`
}

func Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}
	loginTenant(c, req.Email, req.Password)
}

// loginTenant contains the original tenant-staff login logic, extracted so
// UnifiedLogin (POST /api/login) can call it as a fallback after checking
// platform_admins first.
func loginTenant(c *gin.Context, email, password string) {
	var authUser models.AuthUser
	if err := db.DB.Where("email = ? AND is_deleted = false", email).First(&authUser).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  gin.H{"code": "UNAUTHORIZED", "message": "Invalid email or password"},
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(authUser.PasswordHash), []byte(password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  gin.H{"code": "UNAUTHORIZED", "message": "Invalid email or password"},
		})
		return
	}

	var staff models.StaffProfile
	if err := db.DB.Where("user_id = ? AND is_deleted = false", authUser.ID).First(&staff).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"status": "error",
			"error":  gin.H{"code": "FORBIDDEN", "message": "No staff profile found. Contact your administrator."},
		})
		return
	}

	switch staff.Status {
	case "active":
	case "pending", "pending_approval":
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": gin.H{"code": "ACCOUNT_PENDING", "message": "Your account is awaiting approval. Please contact your administrator."}})
		return
	case "rejected":
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": gin.H{"code": "ACCOUNT_REJECTED", "message": "Your account application has been rejected. Please contact your administrator."}})
		return
	case "inactive":
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": gin.H{"code": "ACCOUNT_INACTIVE", "message": "Your account has been deactivated. Please contact your administrator."}})
		return
	case "suspended":
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": gin.H{"code": "ACCOUNT_SUSPENDED", "message": "Your account has been suspended. Please contact your administrator."}})
		return
	default:
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": gin.H{"code": "ACCOUNT_NOT_ACTIVE", "message": "Your account is not active. Please contact your administrator."}})
		return
	}

	accessToken, err := services.GenerateAccessToken(authUser.ID.String(), authUser.Email, staff.OrgID, staff.Role, staff.HomeIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to generate token"}})
		return
	}

	refreshToken := uuid.New().String()
	expiry := time.Duration(config.AppConfig.RefreshTokenExpiryDays) * 24 * time.Hour
	rt := models.RefreshToken{
		Base:      models.Base{OrgID: staff.OrgID, CreatedBy: authUser.Email},
		UserID:    authUser.ID.String(),
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(expiry),
	}
	db.DB.Create(&rt)

	now := time.Now()
	db.DB.Model(&authUser).Update("last_login_at", now)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"user_type":     "tenant",
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"expires_in":    config.AppConfig.JWTExpiryHours * 3600,
			"user": gin.H{
				"id":        authUser.ID,
				"email":     authUser.Email,
				"org_id":    staff.OrgID,
				"role":      staff.Role,
				"home_ids":  staff.HomeIDs,
				"full_name": staff.FullName,
			},
		},
		"timestamp": time.Now(),
	})
}

func RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	var rt models.RefreshToken
	if err := db.DB.Where("token = ? AND used = false AND expires_at > ?", req.RefreshToken, time.Now()).First(&rt).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": gin.H{"code": "UNAUTHORIZED", "message": "Invalid or expired refresh token"}})
		return
	}

	// Mark old token used
	db.DB.Model(&rt).Update("used", true)

	var authUser models.AuthUser
	db.DB.First(&authUser, "id = ?", rt.UserID)

	var staff models.StaffProfile
	db.DB.Where("user_id = ?", authUser.ID).First(&staff)

	newAccess, _ := services.GenerateAccessToken(authUser.ID.String(), authUser.Email, staff.OrgID, staff.Role, staff.HomeIDs)
	newRefresh := uuid.New().String()
	expiry := time.Duration(config.AppConfig.RefreshTokenExpiryDays) * 24 * time.Hour
	newRT := models.RefreshToken{
		Base:      models.Base{OrgID: staff.OrgID},
		UserID:    authUser.ID.String(),
		Token:     newRefresh,
		ExpiresAt: time.Now().Add(expiry),
	}
	db.DB.Create(&newRT)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"access_token":  newAccess,
			"refresh_token": newRefresh,
			"expires_in":    config.AppConfig.JWTExpiryHours * 3600,
		},
	})
}

func GetMe(c *gin.Context) {
	claims := middleware.GetClaims(c)
	var staff models.StaffProfile
	db.DB.Where("user_id = ? AND is_deleted = false", claims.UserID).First(&staff)

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"data":      staff,
		"timestamp": time.Now(),
	})
}

func UpdateMe(c *gin.Context) {
	claims := middleware.GetClaims(c)
	var req struct {
		FullName string `json:"full_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}
	db.DB.Model(&models.StaffProfile{}).
		Where("user_id = ?", claims.UserID).
		Update("full_name", req.FullName)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": gin.H{"updated": true}})
}

// InviteStaff creates or updates login credentials for a staff member.
// If an AuthUser already exists for the email, their password is updated.
// Requires admin role.
func InviteStaff(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to process password"}})
		return
	}

	orgID := config.AppConfig.OrgID

	// Check if an AuthUser already exists for this email
	var existing models.AuthUser
	authExists := db.DB.Where("email = ?", req.Email).First(&existing).Error == nil

	if authExists {
		// Update password on existing account (admin reset / re-invite)
		if err := db.DB.Model(&existing).Update("password_hash", string(hash)).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update password"}})
			return
		}

		// Ensure StaffProfile is linked
		var staff models.StaffProfile
		staffExists := db.DB.Where("email = ? AND is_deleted = false", req.Email).First(&staff).Error == nil
		if staffExists && staff.UserID == "" {
			if err := db.DB.Model(&staff).Update("user_id", existing.ID).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to link staff profile"}})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"user_id": existing.ID,
				"email":   existing.Email,
				"updated": true,
			},
		})
		return
	}

	// Create new AuthUser
	authUser := models.AuthUser{
		Base:         models.Base{OrgID: orgID, CreatedBy: req.Email},
		Email:        req.Email,
		PasswordHash: string(hash),
	}
	if err := db.DB.Create(&authUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create auth account"}})
		return
	}

	// Link to existing StaffProfile if one exists for this email
	var staff models.StaffProfile
	staffExists := db.DB.Where("email = ? AND is_deleted = false", req.Email).First(&staff).Error == nil

	if staffExists {
		// Update the existing profile's user_id so login works
		role := staff.Role
		if req.Role != "" {
			role = req.Role
			db.DB.Model(&staff).Updates(map[string]interface{}{"user_id": authUser.ID, "role": role})
		} else {
			db.DB.Model(&staff).Update("user_id", authUser.ID)
		}
		c.JSON(http.StatusCreated, gin.H{
			"status": "success",
			"data": gin.H{
				"user_id":  authUser.ID,
				"staff_id": staff.ID,
				"email":    authUser.Email,
				"role":     role,
				"linked":   true,
			},
		})
		return
	}

	// No existing profile — create one
	role := req.Role
	if role == "" {
		role = "support_worker"
	}
	newStaff := models.StaffProfile{
		Base:     models.Base{OrgID: orgID, CreatedBy: req.Email},
		UserID:   authUser.ID.String(),
		FullName: req.FullName,
		Email:    req.Email,
		Role:     role,
	}
	if err := db.DB.Create(&newStaff).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create staff profile"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"user_id":  authUser.ID,
			"staff_id": newStaff.ID,
			"email":    authUser.Email,
			"role":     role,
			"linked":   false,
		},
	})
}

func Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	// Check email not taken
	var existing models.AuthUser
	if err := db.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"status": "error", "error": gin.H{"code": "CONFLICT", "message": "Email already registered"}})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to process password"}})
		return
	}

	orgID := config.AppConfig.OrgID
	role := req.Role
	if role == "" {
		role = "support_worker"
	}

	authUser := models.AuthUser{
		Base:         models.Base{OrgID: orgID, CreatedBy: req.Email},
		Email:        req.Email,
		PasswordHash: string(hash),
	}
	if err := db.DB.Create(&authUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create auth account"}})
		return
	}
	staff := models.StaffProfile{
		Base:     models.Base{OrgID: orgID, CreatedBy: req.Email},
		UserID:   authUser.ID.String(),
		FullName: req.FullName,
		Email:    req.Email,
		Role:     role,
	}
	if err := db.DB.Create(&staff).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create staff profile"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"user_id":  authUser.ID,
			"staff_id": staff.ID,
			"email":    authUser.Email,
			"role":     staff.Role,
		},
	})
}
