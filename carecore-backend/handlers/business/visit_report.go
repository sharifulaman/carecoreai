package business

import (
	"net/http"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type visitReportRequest struct {
	Data struct {
		ResidentID      string   `json:"resident_id" binding:"required"`
		HomeID          string   `json:"home_id" binding:"required"`
		Date            string   `json:"date" binding:"required"`
		TimeStart       string   `json:"time_start"`
		TimeEnd         string   `json:"time_end"`
		DurationMinutes int      `json:"duration_minutes"`
		ActionText      string   `json:"action_text"`
		OutcomeText     string   `json:"outcome_text"`
		RecommendationsText string `json:"recommendations_text"`
		IsKeyWorkerSession  bool   `json:"is_key_worker_session"`
		IsDailySummary      bool   `json:"is_daily_summary"`
		Flags               []string `json:"flags"`
		KPIData             map[string]interface{} `json:"kpi_data"`
	} `json:"data"`
}

func SubmitVisitReport(c *gin.Context) {
	var req visitReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	claims := middleware.GetClaims(c)
	d := req.Data

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	// Fetch worker's name
	var staff models.StaffProfile
	scopedDB.Where("user_id = ? AND is_deleted = false", claims.UserID).First(&staff)

	// Fetch resident name
	var resident models.Resident
	scopedDB.Where("id = ? AND is_deleted = false", d.ResidentID).First(&resident)

	reportID := uuid.New()	
	now := time.Now().UTC()

	report := models.VisitReport{
		Base:                models.Base{ID: reportID, OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
		ResidentID:          d.ResidentID,
		ResidentName:        resident.DisplayName,
		HomeID:              d.HomeID,
		WorkerID:            staff.ID.String(),
		WorkerName:          staff.FullName,
		Date:                d.Date,
		TimeStart:           d.TimeStart,
		TimeEnd:             d.TimeEnd,
		DurationMinutes:     d.DurationMinutes,
		ActionText:          d.ActionText,
		OutcomeText:         d.OutcomeText,
		RecommendationsText: d.RecommendationsText,
		IsKeyWorkerSession:  d.IsKeyWorkerSession,
		IsDailySummary:      d.IsDailySummary,
		Status:              "submitted",
	}
	scopedDB.Create(&report)

	// Find team leader to notify
	var home models.Home
	scopedDB.Where("id = ?", d.HomeID).First(&home)

	notifID := uuid.New()	
	notification := models.Notification{
		Base:            models.Base{ID: notifID, OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
		UserID:          home.TeamLeaderID,
		Type:            "alert",
		Message:         staff.FullName + " submitted a visit report for " + resident.DisplayName,
		Priority:        "normal",
		RelatedModule:   "VisitReport",
		RelatedRecordID: reportID.String(),
	}
	scopedDB.Create(&notification)

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"id":                   reportID,
			"status":               "submitted",
			"created_date":         now,
			"notification_sent_to": home.TeamLeaderID,
			"awaiting_approval":    true,
		},
		"timestamp": now,
	})
}