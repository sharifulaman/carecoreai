package business

import (
	"net/http"
	"time"

	"carecore-backend/db"
	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
)

type riskAssessmentRequest struct {
	Data struct {
		ResidentID         string `json:"resident_id" binding:"required"`
		HomeID             string `json:"home_id" binding:"required"`
		Category           string `json:"category" binding:"required"`
		IsPresent          string `json:"is_present"`
		Likelihood         string `json:"likelihood"`
		Consequence        string `json:"consequence"`
		OverallRating      string `json:"overall_rating"`
		Background         string `json:"background"`
		Triggers           string `json:"triggers"`
		ManagementStrategy string `json:"management_strategy"`
		ProtectiveFactors  string `json:"protective_factors"`
		YPConsulted        bool   `json:"yp_consulted"`
		ReviewDate         string `json:"review_date"`
		LastReviewedBy     string `json:"last_reviewed_by"`
		LastReviewedByName string `json:"last_reviewed_by_name"`
		LastReviewedAt     string `json:"last_reviewed_at"`
	} `json:"data"`
}

// UpsertRiskAssessment creates or updates the RiskAssessment record for a given
// resident + category pair, then handles side-effects (risk-level sync, notifications).
func UpsertRiskAssessment(c *gin.Context) {
	var req riskAssessmentRequest
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

	// Accept frontend-computed overall_rating or derive it ourselves.
	overallRating := d.OverallRating
	if overallRating == "" {
		overallRating = calcOverallRating(d.IsPresent, d.Likelihood, d.Consequence)
	}

	lastReviewedAt := d.LastReviewedAt
	if lastReviewedAt == "" {
		lastReviewedAt = now.Format(time.RFC3339)
	}

	// Upsert: find existing record for this resident + category.
	var existing models.RiskAssessment
	isUpdate := db.DB.Where(
		"resident_id = ? AND category = ? AND org_id = ? AND is_deleted = false",
		d.ResidentID, d.Category, claims.OrgID,
	).First(&existing).Error == nil

	var record models.RiskAssessment
	if isUpdate {
		updates := map[string]interface{}{
			"home_id":                d.HomeID,
			"is_present":             d.IsPresent,
			"likelihood":             d.Likelihood,
			"consequence":            d.Consequence,
			"overall_rating":         overallRating,
			"background":             d.Background,
			"triggers":               d.Triggers,
			"management_strategy":    d.ManagementStrategy,
			"protective_factors":     d.ProtectiveFactors,
			"yp_consulted":           d.YPConsulted,
			"review_date":            d.ReviewDate,
			"last_reviewed_by":       strPtrOrNil(d.LastReviewedBy),
			"last_reviewed_by_name":  strPtrOrNil(d.LastReviewedByName),
			"last_reviewed_at":       lastReviewedAt,
			"updated_date":           now,
		}
		db.DB.Model(&existing).Where("id = ?", existing.ID).Updates(updates)
		db.DB.Where("id = ?", existing.ID).First(&record)
	} else {
		record = models.RiskAssessment{
			Base:               models.Base{OrgID: claims.OrgID, CreatedBy: claims.Email},
			ResidentID:         d.ResidentID,
			HomeID:             d.HomeID,
			Category:           d.Category,
			IsPresent:          d.IsPresent,
			Likelihood:         d.Likelihood,
			Consequence:        d.Consequence,
			OverallRating:      overallRating,
			Background:         d.Background,
			Triggers:           d.Triggers,
			ManagementStrategy: d.ManagementStrategy,
			ProtectiveFactors:  d.ProtectiveFactors,
			YPConsulted:        d.YPConsulted,
			ReviewDate:         d.ReviewDate,
			LastReviewedBy:     strPtrOrNil(d.LastReviewedBy),
			LastReviewedByName: strPtrOrNil(d.LastReviewedByName),
			LastReviewedAt:     lastReviewedAt,
		}
		db.DB.Create(&record)
	}

	// Side-effect: sync resident risk_level when overall rating is high.
	if overallRating == "high" {
		db.DB.Model(&models.Resident{}).
			Where("id = ? AND org_id = ?", d.ResidentID, claims.OrgID).
			Update("risk_level", "high")
	}

	// Side-effect: notify the home team leader on medium/high ratings.
	if overallRating == "high" || overallRating == "medium" {
		var home models.Home
		if db.DB.Where("id = ?", d.HomeID).First(&home).Error == nil && home.TeamLeaderID != "" {
			var resident models.Resident
			db.DB.Where("id = ?", d.ResidentID).First(&resident)

			notif := models.Notification{
				Base:            models.Base{OrgID: claims.OrgID, CreatedBy: claims.Email},
				UserID:          home.TeamLeaderID,
				Type:            "alert",
				Message:         "Risk assessment updated for " + resident.DisplayName + " — " + d.Category + " rated " + overallRating,
				Priority:        priorityForRating(overallRating),
				RelatedModule:   "RiskAssessment",
				RelatedRecordID: record.ID.String(),
			}
			db.DB.Create(&notif)
		}
	}

	httpStatus := http.StatusCreated
	if isUpdate {
		httpStatus = http.StatusOK
	}
	c.JSON(httpStatus, gin.H{"status": "success", "data": record, "timestamp": now})
}

// calcOverallRating mirrors the frontend risk matrix exactly.
func calcOverallRating(isPresent, likelihood, consequence string) string {
	if isPresent == "none" {
		return "none"
	}
	if isPresent == "unknown" || likelihood == "" || likelihood == "unknown" || consequence == "" || consequence == "unknown" {
		return "unknown"
	}
	matrix := map[string]map[string]string{
		"low":    {"low": "low", "medium": "low", "high": "medium"},
		"medium": {"low": "low", "medium": "medium", "high": "high"},
		"high":   {"low": "medium", "medium": "high", "high": "high"},
	}
	if row, ok := matrix[likelihood]; ok {
		if rating, ok := row[consequence]; ok {
			return rating
		}
	}
	return "unknown"
}

func priorityForRating(rating string) string {
	if rating == "high" {
		return "high"
	}
	return "normal"
}

// strPtrOrNil converts a string to *string, returning nil for empty strings.
// Needed for nullable UUID columns — PostgreSQL rejects "" as a uuid value.
func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
