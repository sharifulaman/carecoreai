package business

import (
	"encoding/json"
	"net/http"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
)

type timesheetRequest struct {
	Data struct {
		StaffID         string                   `json:"staff_id" binding:"required"`
		PeriodStart     string                   `json:"period_start" binding:"required"`
		PeriodEnd       string                   `json:"period_end" binding:"required"`
		TotalActualHours float64                 `json:"total_actual_hours" binding:"required"`
		Shifts          []map[string]interface{} `json:"shifts"`
	} `json:"data"`
}

func SubmitTimesheet(c *gin.Context) {
	var req timesheetRequest
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

	var staff models.StaffProfile
	scopedDB.Where("id = ? AND is_deleted = false", d.StaffID).First(&staff)

	hourlyRate := staff.HourlyRate
	if hourlyRate == 0 {
		hourlyRate = 20.0
	}
	grossPay := d.TotalActualHours * hourlyRate

	ts := models.Timesheet{
		Base: models.Base{
			OrgID:     claims.OrgID,
			CreatedBy: claims.Email,
		},
		StaffID:          d.StaffID,
		StaffName:        staff.FullName,
		PeriodStart:      d.PeriodStart,
		PeriodEnd:        d.PeriodEnd,
		TotalActualHours: d.TotalActualHours,
		HourlyRate:       hourlyRate,
		GrossPay:         grossPay,
		Status:           "submitted",
	}

	if err := scopedDB.Create(&ts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}

	// Notify team leader
	var home models.Home
	if len(staff.HomeIDs) > 0 {
		scopedDB.Where("id = ? AND is_deleted = false", staff.HomeIDs[0]).First(&home)
	}
	if home.TeamLeaderID != "" {
		now := time.Now().UTC()
		notif := models.Notification{
			Base:            models.Base{OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
			UserID:          home.TeamLeaderID,
			Type:            "alert",
			Message:         staff.FullName + " submitted a timesheet for " + d.PeriodStart + " to " + d.PeriodEnd,
			Priority:        "normal",
			RelatedModule:   "Timesheet",
			RelatedRecordID: ts.ID.String(),
		}
		scopedDB.Create(&notif)
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"id":                   ts.ID,
			"status":               ts.Status,
			"total_hours":          ts.TotalActualHours,
			"calculated_gross_pay": ts.GrossPay,
			"awaiting_approval":    true,
			"notification_sent_to": home.TeamLeaderID,
		},
		"timestamp": time.Now(),
	})
}

type generateTimesheetRequest struct {
	PayPeriodID string `json:"pay_period_id" binding:"required"`
}

func GenerateTimesheets(c *gin.Context) {
	var req generateTimesheetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": "pay_period_id is required"},
		})
		return
	}

	claims := middleware.GetClaims(c)

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var period models.PayPeriod
	if err := scopedDB.Where("id = ? AND org_id = ?", req.PayPeriodID, claims.OrgID).First(&period).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "NOT_FOUND", "message": "Pay period not found"},
		})
		return
	}

	var org models.Organisation
	scopedDB.Where("org_id = ?", claims.OrgID).First(&org)

	// Defaults
	weeklyThreshold := 37.5
	otRate := 1.5

	// Parse JSONB settings to get hr_policy if it exists
	if len(org.Settings) > 0 && string(org.Settings) != "null" {
		var settings map[string]interface{}
		importJson := json.Unmarshal // need encoding/json but it's already imported
		if err := importJson(org.Settings, &settings); err == nil {
			if hrPolicy, ok := settings["hr_policy"].(map[string]interface{}); ok {
				if wt, ok := hrPolicy["overtime_threshold_hours"].(float64); ok {
					weeklyThreshold = wt
				}
				if otr, ok := hrPolicy["overtime_rate_multiplier"].(float64); ok {
					otRate = otr
				}
			}
		}
	}

	otThreshold := weeklyThreshold
	if period.Frequency == "monthly" {
		otThreshold = weeklyThreshold * 4.333
	}

	var activeStaff []models.StaffProfile
	scopedDB.Where("org_id = ? AND status = 'active' AND is_deleted = false", claims.OrgID).Find(&activeStaff)

	var timesheets []models.Timesheet
	scopedDB.Where("org_id = ? AND pay_period_id = ? AND is_deleted = false", claims.OrgID, period.ID).Find(&timesheets)

	var logs []models.AttendanceLog
	scopedDB.Where("org_id = ? AND clock_in_time >= ? AND clock_in_time <= ? AND is_deleted = false", claims.OrgID, period.PeriodStart, period.PeriodEnd+"T23:59:59").Find(&logs)

	logsByStaff := make(map[string][]models.AttendanceLog)
	for _, l := range logs {
		logsByStaff[l.StaffID] = append(logsByStaff[l.StaffID], l)
	}

	now := time.Now().UTC()
	created := 0
	updated := 0

	for _, s := range activeStaff {
		var existing *models.Timesheet
		for i := range timesheets {
			if timesheets[i].StaffID == s.ID.String() {
				existing = &timesheets[i]
				break
			}
		}

		if existing != nil && existing.Status != "draft" {
			continue
		}

		calculatedLogHours := 0.0
		for _, l := range logsByStaff[s.ID.String()] {
			calculatedLogHours += l.TotalHours
		}

		totalHours := calculatedLogHours
		if existing != nil && existing.TotalActualHours > calculatedLogHours {
			totalHours = existing.TotalActualHours
		}

		otHours := totalHours - otThreshold
		if otHours < 0 {
			otHours = 0
		}

		rate := s.HourlyRate
		gross := 0.0
		if s.PayType == "salary" || s.AnnualSalary > 0 {
			gross = (s.AnnualSalary / 12.0) + (otHours * rate * otRate)
		} else {
			gross = ((totalHours - otHours) * rate) + (otHours * rate * otRate)
		}

		overtimePay := otHours * rate * otRate

		homeID := ""
		if len(s.HomeIDs) > 0 {
			homeID = s.HomeIDs[0]
		}

		if existing != nil {
			updates := map[string]interface{}{
				"total_actual_hours":   totalHours,
				"total_overtime_hours": otHours,
				"hourly_rate":          rate,
				"gross_pay":            gross,
				"overtime_pay":         overtimePay,
				"updated_date":         now,
			}
			scopedDB.Model(existing).Where("id = ?", existing.ID).Updates(updates)
			updated++
		} else {
			ts := models.Timesheet{
				Base: models.Base{
					OrgID:       claims.OrgID,
					CreatedBy:   claims.Email,
					CreatedDate: now,
					UpdatedDate: now,
				},
				StaffID:            s.ID.String(),
				StaffName:          s.FullName,
				HomeID:             homeID,
				PayPeriodID:        period.ID.String(),
				PayPeriodLabel:     period.Label,
				PeriodStart:        period.PeriodStart,
				PeriodEnd:          period.PeriodEnd,
				TotalActualHours:   totalHours,
				TotalOvertimeHours: otHours,
				HourlyRate:         rate,
				GrossPay:           gross,
				OvertimePay:        overtimePay,
				Status:             "draft",
			}
			scopedDB.Create(&ts)
			created++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"created": created,
			"updated": updated,
		},
	})
}
