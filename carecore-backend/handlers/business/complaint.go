package business

import (
	"net/http"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type complaintRequest struct {
	Data struct {
		HomeID               string `json:"home_id" binding:"required"`
		ResidentID           string `json:"resident_id"`
		Title                string `json:"title" binding:"required"`
		Description          string `json:"description" binding:"required"`
		ReceivedDatetime     string `json:"received_datetime"`
		TargetResolutionDate string `json:"target_resolution_date"`
		EscalatedToOfsted    bool   `json:"escalated_to_ofsted"`
	} `json:"data"`
}

func RaiseComplaint(c *gin.Context) {
	var req complaintRequest
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

	received := d.ReceivedDatetime
	if received == "" {
		received = now.Format("2006-01-02T15:04:05Z")
	}

	complaintID := uuid.New()
	record := models.Complaint{
		Base:                 models.Base{ID: complaintID, OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
		HomeID:               d.HomeID,
		ResidentID:           d.ResidentID,
		Title:                d.Title,
		Description:          d.Description,
		ReceivedDatetime:     received,
		TargetResolutionDate: d.TargetResolutionDate,
		Status:               "open",
		EscalatedToOfsted:    d.EscalatedToOfsted,
	}
	scopedDB.Create(&record)

	// Notify team leader and, if escalated, flag with higher priority
	var home models.Home
	scopedDB.Where("id = ?", d.HomeID).First(&home)

	priority := "normal"
	if d.EscalatedToOfsted {
		priority = "urgent"
	}

	if home.TeamLeaderID != "" {
		notif := models.Notification{
			Base:            models.Base{ID: uuid.New(), OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
			UserID:          home.TeamLeaderID,
			Type:            "alert",
			Message:         "New complaint raised: " + d.Title,
			Priority:        priority,
			RelatedModule:   "Complaint",
			RelatedRecordID: complaintID.String(),
		}
		scopedDB.Create(&notif)
	}

	// Notify all org admins if escalated to Ofsted
	if d.EscalatedToOfsted {
		var admins []models.StaffProfile
		scopedDB.Where("org_id = ? AND role = 'admin' AND is_deleted = false", claims.OrgID).Find(&admins)
		for _, admin := range admins {
			if admin.UserID == home.TeamLeaderID {
				continue // already notified
			}
			notif := models.Notification{
				Base:            models.Base{ID: uuid.New(), OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
				UserID:          admin.UserID,
				Type:            "alert",
				Message:         "ESCALATED complaint raised for Ofsted: " + d.Title,
				Priority:        "urgent",
				RelatedModule:   "Complaint",
				RelatedRecordID: complaintID.String(),
			}
			scopedDB.Create(&notif)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"id":     complaintID,
			"status": "open",
		},
		"timestamp": now,
	})
}
