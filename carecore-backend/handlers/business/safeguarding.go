package business

import (
	"net/http"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type safeguardingRequest struct {
	Data struct {
		ResidentID  string `json:"resident_id" binding:"required"`
		HomeID      string `json:"home_id" binding:"required"`
		Date        string `json:"date" binding:"required"`
		ConcernType string `json:"concern_type" binding:"required"`
		Description string `json:"description" binding:"required"`
		ActionTaken string `json:"action_taken"`
		LAReference string `json:"la_reference"`
		Notes       string `json:"notes"`
	} `json:"data"`
}

func RaiseSafeguarding(c *gin.Context) {
	var req safeguardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	claims := middleware.GetClaims(c)
	d := req.Data
	now := time.Now().UTC()

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var resident models.Resident
	scopedDB.Where("id = ? AND is_deleted = false", d.ResidentID).First(&resident)

	var reporter models.StaffProfile
	scopedDB.Where("user_id = ? AND is_deleted = false", claims.UserID).First(&reporter)

	recordID := uuid.New()
	record := models.SafeguardingRecord{
		Base:        models.Base{ID: recordID, OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
		ResidentID:  d.ResidentID,
		HomeID:      d.HomeID,
		Date:        d.Date,
		ReportedBy:  reporter.FullName,
		ConcernType: d.ConcernType,
		Description: d.Description,
		ActionTaken: d.ActionTaken,
		Status:      "open",
		LAReference: d.LAReference,
		Notes:       d.Notes,
	}
	scopedDB.Create(&record)

	// Safeguarding must always notify ALL admins in the org — not just home team leader
	var admins []models.StaffProfile
	scopedDB.Where("org_id = ? AND role = 'admin' AND is_deleted = false", claims.OrgID).Find(&admins)
	for _, admin := range admins {
		notif := models.Notification{
			Base:            models.Base{ID: uuid.New(), OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
			UserID:          admin.UserID,
			Type:            "alert",
			Message:         "SAFEGUARDING: " + d.ConcernType + " concern raised for " + resident.DisplayName + " by " + reporter.FullName,
			Priority:        "urgent",
			RelatedModule:   "SafeguardingRecord",
			RelatedRecordID: recordID.String(),
		}
		scopedDB.Create(&notif)
	}

	// Also notify the home team leader if not already an admin
	var home models.Home
	scopedDB.Where("id = ?", d.HomeID).First(&home)
	if home.TeamLeaderID != "" {
		alreadyNotified := false
		for _, a := range admins {
			if a.UserID == home.TeamLeaderID {
				alreadyNotified = true
				break
			}
		}
		if !alreadyNotified {
			notif := models.Notification{
				Base:            models.Base{ID: uuid.New(), OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
				UserID:          home.TeamLeaderID,
				Type:            "alert",
				Message:         "SAFEGUARDING: " + d.ConcernType + " concern raised for " + resident.DisplayName,
				Priority:        "urgent",
				RelatedModule:   "SafeguardingRecord",
				RelatedRecordID: recordID.String(),
			}
			scopedDB.Create(&notif)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"id":     recordID,
			"status": "open",
		},
		"timestamp": now,
	})
}
