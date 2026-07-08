package business

import (
	"net/http"
	"strings"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/datatypes"
	"encoding/json"
)

type dailyLogRequest struct {
	Data struct {
		ResidentID string                 `json:"resident_id" binding:"required"`
		HomeID     string                 `json:"home_id" binding:"required"`
		Date       string                 `json:"date" binding:"required"`
		Shift      string                 `json:"shift" binding:"required"`
		LogType    string                 `json:"log_type"`
		Content    map[string]interface{} `json:"content"`
		Flags      []string               `json:"flags"`
		Flagged    bool                   `json:"flagged"`
	} `json:"data"`
}

func SubmitDailyLog(c *gin.Context) {
	var req dailyLogRequest
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

	var staff models.StaffProfile
	scopedDB.Where("user_id = ? AND is_deleted = false", claims.UserID).First(&staff)

	var resident models.Resident
	scopedDB.Where("id = ? AND is_deleted = false", d.ResidentID).First(&resident)

	var home models.Home
	scopedDB.Where("id = ?", d.HomeID).First(&home)

	logType := d.LogType
	if logType == "" {
		logType = "general"
	}

	flags := make(pq.StringArray, 0, len(d.Flags))
	for _, f := range d.Flags {
		if s := strings.TrimSpace(f); s != "" {
			flags = append(flags, s)
		}
	}
	isFlagged := d.Flagged || len(flags) > 0

	var contentJSON datatypes.JSON
	if d.Content != nil {
		if b, err := json.Marshal(d.Content); err == nil {
			contentJSON = datatypes.JSON(b)
		}
	}

	logID := uuid.New()
	record := models.DailyLog{
		Base:         models.Base{ID: logID, OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
		ResidentID:   d.ResidentID,
		ResidentName: resident.DisplayName,
		WorkerID:     staff.ID.String(),
		WorkerName:   staff.FullName,
		HomeID:       d.HomeID,
		HomeName:     home.Name,
		Date:         d.Date,
		Shift:        d.Shift,
		LogType:      logType,
		Content:      contentJSON,
		Flags:        flags,
		Flagged:      isFlagged,
	}
	scopedDB.Create(&record)

	// Count this log as a performance activity, matching how Visit Reports create
	// their own SWPerformanceKPI record. Without this, staff who only submit daily
	// logs would never see their Activities count move on the performance dashboard.
	kpi := models.SWPerformanceKPI{
		Base:         models.Base{ID: uuid.New(), OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
		WorkerID:     staff.ID.String(),
		WorkerName:   staff.FullName,
		HomeID:       d.HomeID,
		ResidentID:   d.ResidentID,
		Date:         d.Date,
		ActivityType: logType,
		SourceEntity: "DailyLog",
		SourceID:     logID.String(),
	}
	scopedDB.Create(&kpi)

	// If flagged, notify team leader and all admins in the org
	if isFlagged && home.TeamLeaderID != "" {
		flagList := strings.Join(d.Flags, ", ")
		msg := staff.FullName + " flagged a daily log for " + resident.DisplayName + " (" + flagList + ")"

		notif := models.Notification{
			Base:            models.Base{ID: uuid.New(), OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
			UserID:          home.TeamLeaderID,
			Type:            "alert",
			Message:         msg,
			Priority:        "high",
			RelatedModule:   "DailyLog",
			RelatedRecordID: logID.String(),
		}
		scopedDB.Create(&notif)
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"id":      logID,
			"flagged": isFlagged,
		},
		"timestamp": now,
	})
}
