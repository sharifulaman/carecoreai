package business

import (
	"net/http"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type missingFromHomeRequest struct {
	Data struct {
		ResidentID              string `json:"resident_id" binding:"required"`
		HomeID                  string `json:"home_id" binding:"required"`
		ReportedMissingDatetime string `json:"reported_missing_datetime" binding:"required"`
		ReportedByID            string `json:"reported_by_id"`
		LastSeenDatetime        string `json:"last_seen_datetime"`
		LastSeenLocation        string `json:"last_seen_location"`
		KnownRisks              string `json:"known_risks"`
		LikelyLocation          string `json:"likely_location"`
		PoliceNotified          bool   `json:"police_notified"`
	} `json:"data"`
}

func ReportMissingFromHome(c *gin.Context) {
	var req missingFromHomeRequest
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
	recordID := uuid.New()

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	// Save as a SafeguardingRecord with type "missing_from_home"
	record := models.SafeguardingRecord{
		Base:        models.Base{ID: recordID, OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
		ResidentID:  d.ResidentID,
		HomeID:      d.HomeID,
		Date:        now.Format("2006-01-02"),
		ReportedBy:  claims.Email,
		ConcernType: "missing_from_home",
		Description: "Last seen: " + d.LastSeenDatetime + " at " + d.LastSeenLocation + ". Known risks: " + d.KnownRisks,
		ActionTaken: "Likely location: " + d.LikelyLocation,
		Status:      "open",
	}
	scopedDB.Create(&record)

	// Alert everyone — team leader + all admins
	var home models.Home
	scopedDB.Where("id = ?", d.HomeID).First(&home)

	var resident models.Resident
	scopedDB.Where("id = ?", d.ResidentID).First(&resident)

	// Get all admins in org
	var admins []models.StaffProfile
	scopedDB.Where("org_id = ? AND role = 'admin' AND is_deleted = false", claims.OrgID).Find(&admins)

	alertRecipients := []string{}
	recipients := []string{home.TeamLeaderID}
	for _, admin := range admins {
		recipients = append(recipients, admin.ID.String())
	}

	for _, recipientID := range recipients {
		if recipientID == "" {
			continue
		}
		notifID := uuid.New()
		notif := models.Notification{
			Base:            models.Base{ID: notifID, OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
			UserID:          recipientID,
			Type:            "alert",
			Message:         "MISSING FROM HOME: " + resident.DisplayName + " reported missing at " + d.ReportedMissingDatetime,
			Priority:        "critical",
			RelatedModule:   "SafeguardingRecord",
			RelatedRecordID: recordID.String(),
		}
		scopedDB.Create(&notif)
		alertRecipients = append(alertRecipients, recipientID)
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"id":               recordID,
			"status":           "active",
			"created_date":     now,
			"alerts_sent":      true,
			"alert_recipients": alertRecipients,
		},
		"timestamp": now,
	})
}