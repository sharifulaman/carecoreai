package business

import (
	"net/http"
	"strconv"

	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
)

// GetMyPerformanceSummary handles GET /business/my-performance/summary
//
// Returns the aggregated performance summary for the authenticated staff member.
// Staff can only retrieve their own summary — the staffID is taken from the JWT,
// never from a query param, preventing any cross-staff data access.
//
// Query params:
//
//	period = this_month (default) | last_month | this_quarter | this_year
//	from   = YYYY-MM-DD  (overrides period when paired with ?to)
//	to     = YYYY-MM-DD
func GetMyPerformanceSummary(c *gin.Context) {
	claims := middleware.GetClaims(c)

	scopedDB, ok := mustScopedDB(c)
    if !ok {
        return
    }

	profile, ok := resolveStaffProfile(scopedDB, c, claims.UserID, claims.OrgID)
	if !ok {
		return
	}

	from, to, prevFrom, prevTo, label := services.ResolvePeriod(
		c.Query("period"), c.Query("from"), c.Query("to"),
	)

	summary, err := services.GetStaffPerformanceSummary(
		claims.OrgID,
		profile.ID.String(),
		profile.FullName,
		profile.Role,
		from, to, prevFrom, prevTo,
		label,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "SUMMARY_ERROR", "message": "Failed to compute performance summary"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": summary})
}

// GetMyPerformanceActivities handles GET /business/my-performance/activities
//
// Returns a paginated, filterable list of the authenticated staff member's personal
// activity history drawn from SWPerformanceKPI records. Results are ordered newest first.
//
// Query params:
//
//	type      = all (default) | visit_report | kw_session | daily_log
//	from      = YYYY-MM-DD
//	to        = YYYY-MM-DD
//	page      = 1-indexed page number (default 1)
//	page_size = records per page (default 20, max 100)
func GetMyPerformanceActivities(c *gin.Context) {
	claims := middleware.GetClaims(c)

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	profile, ok := resolveStaffProfile(scopedDB, c, claims.UserID, claims.OrgID)
	if !ok {
		return
	}
	staffID := profile.ID.String()

	// ── Pagination ────────────────────────────────────────────────────────────
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// ── Base query ────────────────────────────────────────────────────────────
	q := scopedDB.Model(&models.SWPerformanceKPI{}).
		Where("worker_id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID)

	// ── Type filter ───────────────────────────────────────────────────────────
	switch c.Query("type") {
	case "kw_session":
		q = q.Where("kw_session_count > 0")
	case "daily_log":
		q = q.Where("source_entity = ?", "DailyLog")
	case "visit_report":
		q = q.Where("source_entity = ? AND kw_session_count = 0", "VisitReport")
	}

	// ── Date range filter ─────────────────────────────────────────────────────
	if from := c.Query("from"); from != "" {
		q = q.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		q = q.Where("date <= ?", to)
	}

	// ── Count before pagination ───────────────────────────────────────────────
	var total int64
	q.Count(&total)

	// ── Fetch page ────────────────────────────────────────────────────────────
	var kpis []models.SWPerformanceKPI
	q.Order("date DESC").Offset(offset).Limit(pageSize).Find(&kpis)

	// ── Batch load resident display names ─────────────────────────────────────
	residentNames := batchResidentNames(scopedDB,kpis)

	// ── Batch load home names ─────────────────────────────────────────────────
	homeNames := batchHomeNames(scopedDB,kpis)

	// ── Map to response ───────────────────────────────────────────────────────
	type activityItem struct {
		ID              string  `json:"id"`
		Type            string  `json:"type"`
		Date            string  `json:"date"`
		ResidentName    string  `json:"resident_name"`
		HomeName        string  `json:"home_name"`
		EngagementLevel string  `json:"engagement_level"`
		HoursWithYP     float64 `json:"hours_with_yp"`
		Summary         string  `json:"summary"`
	}

	items := make([]activityItem, 0, len(kpis))
	for _, k := range kpis {
		actType := deriveActivityType(k)
		summary := k.Notes
		if summary == "" {
			summary = k.ActivityType
		}

		items = append(items, activityItem{
			ID:              k.ID.String(),
			Type:            actType,
			Date:            k.Date,
			ResidentName:    residentNames[k.ResidentID],
			HomeName:        homeNames[k.HomeID],
			EngagementLevel: k.EngagementLevel,
			HoursWithYP:     k.HoursWithYP,
			Summary:         summary,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"total":      total,
			"page":       page,
			"page_size":  pageSize,
			"activities": items,
		},
	})
}

// GetStaffPerformanceSummaryForManager handles GET /business/staff-performance/:staffId/summary
//
// Allows managers and team leaders to view a specific staff member's performance
// summary. Reuses the same aggregation service as the self-view endpoint.
//
// Authorization rule: the requester's role rank must be strictly greater than the
// target staff member's role rank (sourced from RoleDefinition). Admin bypasses.
//
// Query params: same as /my-performance/summary (period, from, to).
func GetStaffPerformanceSummaryForManager(c *gin.Context) {
	claims := middleware.GetClaims(c)
	staffID := c.Param("staffId")

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	// Look up target staff profile — must belong to same org.
	var targetProfile models.StaffProfile
	if err := scopedDB.
		Where("id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID).
		First(&targetProfile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "STAFF_NOT_FOUND", "message": "Staff member not found"},
		})
		return
	}

	// Role-rank check — admin always passes.
	if claims.Role != "admin" {
		allowed, err := viewerOutranksTarget(scopedDB, claims.OrgID, claims.Role, targetProfile.Role)
		if err != nil || !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"status": "error",
				"error":  gin.H{"code": "RANK_INSUFFICIENT", "message": "You do not have sufficient rank to view this staff member's performance"},
			})
			return
		}
	}

	from, to, prevFrom, prevTo, label := services.ResolvePeriod(
		c.Query("period"), c.Query("from"), c.Query("to"),
	)

	summary, err := services.GetStaffPerformanceSummary(
		claims.OrgID,
		targetProfile.ID.String(),
		targetProfile.FullName,
		targetProfile.Role,
		from, to, prevFrom, prevTo,
		label,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "SUMMARY_ERROR", "message": "Failed to compute performance summary"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": summary})
}


// deriveActivityType maps SWPerformanceKPI fields to a display type string.
func deriveActivityType(k models.SWPerformanceKPI) string {
	if k.KWSessionCount > 0 {
		return "kw_session"
	}
	if k.SourceEntity == "DailyLog" {
		return "daily_log"
	}
	return "visit_report"
}