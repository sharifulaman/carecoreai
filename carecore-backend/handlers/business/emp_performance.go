package business

import (
	"encoding/json"
	"net/http"
	"strconv"

	"carecore-backend/db"
	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
)


// parsePaginationAndSort extracts page, page_size, and sort_by from query params
// with sensible defaults and bounds.
func parsePaginationAndSort(c *gin.Context) (page, pageSize int, sortBy string) {
	page, _     = strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ = strconv.Atoi(c.DefaultQuery("page_size", "20"))
	sortBy       = c.DefaultQuery("sort_by", "score")
	if page < 1     { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 20 }
	return
}

// ── GetTeamPerformanceSummary (CCAI-361) ──────────────────────────────────────

// GetTeamPerformanceSummary handles GET /business/performance/team-summary
//
// Returns a paginated, pre-scored list of employee performance rows.
// The frontend table renders this directly — no client-side calculation needed.
//
// Query params:
//
//	period    = this_month (default) | last_month | this_quarter | this_year
//	from, to  = YYYY-MM-DD (override named period)
//	role      = single role name or comma-separated list (e.g. support_worker,team_leader)
//	home_id   = filter to a specific home
//	department = outreach|24_hours|18_plus|finance|hr_admin|maintenance|bank_staff
//	search    = matches staff full name or employee ID (case-insensitive substring)
//	status    = excellent|good|needs_review|at_risk — filters rows by computed score bucket
//	page      = 1-indexed (default 1)
//	page_size = records per page (default 20, max 100)
//	sort_by   = score (default) | name | training | supervision
func GetTeamPerformanceSummary(c *gin.Context) {
	claims := middleware.GetClaims(c)

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	roleFilter := c.Query("role")
	homeFilter := c.Query("home_id")
	departmentFilter := c.Query("department")
	search := c.Query("search")
	statusFilter := c.Query("status")
	page, pageSize, sortBy := parsePaginationAndSort(c)

	from, to, _, _, label := services.ResolvePeriod(c.Query("period"), c.Query("from"), c.Query("to"))

	staffList, ok := loadScopedStaff(scopedDB, c, claims, roleFilter, homeFilter, departmentFilter, search)
	if !ok {
		return
	}
	homeNames := batchHomeNamesForStaff(scopedDB,staffList)

	result, err := services.GetTeamPerformanceSummaries(
		claims.OrgID, staffList, homeNames, from, to, label, page, pageSize, sortBy, statusFilter,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "SUMMARY_ERROR", "message": "Failed to compute team performance"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": result})
}

// ── GetTeamKPICards (CCAI-362) ────────────────────────────────────────────────

// GetTeamKPICards handles GET /business/performance/team-kpis
//
// Returns the six aggregate KPI card values plus the data needed to populate
// the insights panel (top performers, needs review, role distribution, alert preview).
// One call replaces all the client-side kpiCalculations.js logic.
//
// Query params: same period/role/home_id/department/search/status filters as /team-summary.
func GetTeamKPICards(c *gin.Context) {
	claims := middleware.GetClaims(c)

	 scopedDB, ok := mustScopedDB(c)
    if !ok {
        return
    }

	roleFilter := c.Query("role")
	homeFilter := c.Query("home_id")
	departmentFilter := c.Query("department")
	search := c.Query("search")
	statusFilter := c.Query("status")

	from, to, prevFrom, prevTo, label := services.ResolvePeriod(c.Query("period"), c.Query("from"), c.Query("to"))

	staffList, ok := loadScopedStaff(scopedDB, c, claims, roleFilter, homeFilter, departmentFilter, search)
	if !ok {
		return
	}
	homeNames := batchHomeNamesForStaff(scopedDB, staffList)

	result, err := services.GetTeamKPIs(claims.OrgID, staffList, homeNames, from, to, prevFrom, prevTo, label, statusFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "KPI_ERROR", "message": "Failed to compute team KPIs"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": result})
}

// ── GetEmpPerformanceAlerts (CCAI-363) ────────────────────────────────────────

// GetEmpPerformanceAlerts handles GET /business/performance/alerts
//
// Returns the full list of active performance alerts (all five alert types) for
// staff in scope. Supports filtering by alert type and severity.
//
// Query params:
//
//	alert_type = supervision_overdue | training_expired | no_activity | goal_stalled | appraisal_overdue
//	severity   = low | medium | high
//	role, home_id, department, search, period, from, to (same as /team-summary)
func GetEmpPerformanceAlerts(c *gin.Context) {
	claims := middleware.GetClaims(c)

	 scopedDB, ok := mustScopedDB(c)
    if !ok {
        return
    }

	roleFilter := c.Query("role")
	homeFilter := c.Query("home_id")
	departmentFilter := c.Query("department")
	search := c.Query("search")
	typeFilter := c.Query("alert_type")
	sevFilter  := c.Query("severity")

	from, to, _, _, _ := services.ResolvePeriod(c.Query("period"), c.Query("from"), c.Query("to"))

	staffList, ok := loadScopedStaff( scopedDB, c, claims, roleFilter, homeFilter, departmentFilter, search)
	if !ok {
		return
	}

	alerts, err := services.GetPerformanceAlerts(claims.OrgID, staffList, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "ALERT_ERROR", "message": "Failed to compute performance alerts"},
		})
		return
	}

	// Optional post-filter by type / severity
	if typeFilter != "" || sevFilter != "" {
		filtered := make([]services.PerformanceAlert, 0, len(alerts))
		for _, a := range alerts {
			if typeFilter != "" && a.AlertType != typeFilter {
				continue
			}
			if sevFilter != "" && a.Severity != sevFilter {
				continue
			}
			filtered = append(filtered, a)
		}
		alerts = filtered
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"total":  len(alerts),
			"alerts": alerts,
		},
	})
}

// ── GetStaffActivitiesForManager (CCAI-364) ───────────────────────────────────

// GetStaffActivitiesForManager handles GET /business/staff-performance/:staffId/activities
//
// Allows managers to view a specific employee's activity log. Reuses the same
// query logic as the self-view endpoint but enforces role-rank authorization.
//
// Query params: same as GET /business/my-performance/activities
// (type, from, to, page, page_size).
func GetStaffActivitiesForManager(c *gin.Context) {
	claims  := middleware.GetClaims(c)
	staffID := c.Param("staffId")

	 scopedDB, ok := mustScopedDB(c)
    if !ok {
        return
    }

	var targetProfile models.StaffProfile
	if err := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID).
		First(&targetProfile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "STAFF_NOT_FOUND", "message": "Staff member not found"},
		})
		return
	}

	if claims.Role != "admin" {
		allowed, err := viewerOutranksTarget(scopedDB, claims.OrgID, claims.Role, targetProfile.Role)
		if err != nil || !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"status": "error",
				"error":  gin.H{"code": "RANK_INSUFFICIENT", "message": "Insufficient rank to view this employee's activities"},
			})
			return
		}
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 20 }
	offset := (page - 1) * pageSize

	q := db.DB.Model(&models.SWPerformanceKPI{}).
		Where("worker_id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID)

	switch c.Query("type") {
	case "kw_session":
		q = q.Where("kw_session_count > 0")
	case "daily_log":
		q = q.Where("source_entity = ?", "DailyLog")
	case "visit_report":
		q = q.Where("source_entity = ? AND kw_session_count = 0", "VisitReport")
	}
	if from := c.Query("from"); from != "" {
		q = q.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		q = q.Where("date <= ?", to)
	}

	var total int64
	q.Count(&total)

	var kpis []models.SWPerformanceKPI
	q.Order("date DESC").Offset(offset).Limit(pageSize).Find(&kpis)

	residentNames := batchResidentNames(scopedDB, kpis)
	homeNames     := batchHomeNames(scopedDB, kpis)

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
		summary := k.Notes
		if summary == "" { summary = k.ActivityType }
		items = append(items, activityItem{
			ID:              k.ID.String(),
			Type:            deriveActivityType(k),
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

// ── SetGoalForEmployee (CCAI-365) ─────────────────────────────────────────────

// SetGoalForEmployee handles POST /business/staff-performance/:staffId/goals
//
// Allows a manager to create a performance goal on behalf of an employee.
// The goal is marked set_by = "manager" so the employee can see who set it.
// Only the creating manager (or admin) can delete a manager-assigned goal;
// the employee can update progress but cannot delete it.
//
// Request body: {title, description, category, target_date, review_date}
func SetGoalForEmployee(c *gin.Context) {
	claims  := middleware.GetClaims(c)
	staffID := c.Param("staffId")

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	// Resolve target staff
	var targetProfile models.StaffProfile
	if err := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID).
		First(&targetProfile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "STAFF_NOT_FOUND", "message": "Staff member not found"},
		})
		return
	}

	// Authorization: manager must outrank the employee
	if claims.Role != "admin" {
		allowed, err := viewerOutranksTarget(scopedDB, claims.OrgID, claims.Role, targetProfile.Role)
		if err != nil || !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"status": "error",
				"error":  gin.H{"code": "RANK_INSUFFICIENT", "message": "Insufficient rank to set goals for this employee"},
			})
			return
		}
	}

	// Resolve manager's own staff profile to get their display name
	managerProfile, ok := resolveStaffProfile(scopedDB,c, claims.UserID, claims.OrgID)
	if !ok {
		return
	}

	var body struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
		Category    string `json:"category"`
		TargetDate  string `json:"target_date"`
		ReviewDate  string `json:"review_date"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INVALID_BODY", "message": "title is required"},
		})
		return
	}

	category := body.Category
	if category == "" { category = "personal_development" }

	homeID := ""
	if len(targetProfile.HomeIDs) > 0 { homeID = targetProfile.HomeIDs[0] }

	goal := models.PerformanceGoal{
		StaffID:     staffID,
		StaffName:   targetProfile.FullName,
		HomeID:      homeID,
		Title:       body.Title,
		Description: body.Description,
		Category:    category,
		TargetDate:  body.TargetDate,
		ReviewDate:  body.ReviewDate,
		Status:      "not_started",
		Progress:    0,
		SetBy:       "manager",
		SetByID:     managerProfile.ID.String(),
		SetByName:   managerProfile.FullName,
	}
	goal.OrgID     = claims.OrgID
	goal.CreatedBy = claims.UserID

	if err := db.DB.Create(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "CREATE_FAILED", "message": "Failed to create goal"},
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "data": goal})
}

// ── PIP handlers (CCAI-417) ───────────────────────────────────────────────────

// GetStaffPIPs handles GET /business/staff-performance/:staffId/pips
//
// Returns all non-deleted PIPs for the given staff member. Requires the caller
// to outrank the target (or be admin). PIPs are confidential — rank enforcement
// is the only access gate beyond module-level auth.
func GetStaffPIPs(c *gin.Context) {
	claims  := middleware.GetClaims(c)
	staffID := c.Param("staffId")

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var target models.StaffProfile
	if err := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID).
		First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "STAFF_NOT_FOUND", "message": "Staff member not found"},
		})
		return
	}
	if claims.Role != "admin" {
		allowed, err := viewerOutranksTarget(scopedDB, claims.OrgID, claims.Role, target.Role)
		if err != nil || !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"status": "error",
				"error":  gin.H{"code": "RANK_INSUFFICIENT", "message": "Insufficient rank to view PIPs for this employee"},
			})
			return
		}
	}

	var pips []models.PerformancePIP
	db.DB.Where("staff_id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID).
		Order("created_date DESC").Find(&pips)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": pips})
}

// CreateStaffPIP handles POST /business/staff-performance/:staffId/pips
//
// Creates a new PIP for the given staff member. The caller's name is stamped
// as created_by_name so the record is auditable without a secondary lookup.
//
// Request body: {start_date, review_date, reason, support_offered, targets, milestones}
func CreateStaffPIP(c *gin.Context) {
	claims  := middleware.GetClaims(c)
	staffID := c.Param("staffId")

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var target models.StaffProfile
	if err := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID).
		First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "STAFF_NOT_FOUND", "message": "Staff member not found"},
		})
		return
	}
	if claims.Role != "admin" {
		allowed, err := viewerOutranksTarget(scopedDB, claims.OrgID, claims.Role, target.Role)
		if err != nil || !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"status": "error",
				"error":  gin.H{"code": "RANK_INSUFFICIENT", "message": "Insufficient rank to create a PIP for this employee"},
			})
			return
		}
	}

	managerProfile, ok := resolveStaffProfile(scopedDB, c, claims.UserID, claims.OrgID)
	if !ok {
		return
	}

	var body struct {
		StartDate      string `json:"start_date" binding:"required"`
		ReviewDate     string `json:"review_date"`
		Reason         string `json:"reason" binding:"required"`
		SupportOffered string `json:"support_offered"`
		// Targets and Milestones arrive as plain string slices; stored as JSONB.
		Targets    []string `json:"targets"`
		Milestones []string `json:"milestones"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INVALID_BODY", "message": "start_date and reason are required"},
		})
		return
	}

	homeID := ""
	if len(target.HomeIDs) > 0 {
		homeID = target.HomeIDs[0]
	}

	pip := models.PerformancePIP{
		StaffID:        staffID,
		StaffName:      target.FullName,
		HomeID:         homeID,
		CreatedByID:    managerProfile.ID.String(),
		CreatedByName:  managerProfile.FullName,
		StartDate:      body.StartDate,
		ReviewDate:     body.ReviewDate,
		Reason:         body.Reason,
		SupportOffered: body.SupportOffered,
		Status:         "active",
		Confidential:   true,
	}
	pip.OrgID     = claims.OrgID
	pip.CreatedBy = claims.UserID

	// Encode targets and milestones as JSONB (default to empty array if nil)
	if len(body.Targets) > 0 {
		if j, err := marshalStringSlice(body.Targets); err == nil {
			pip.Targets = j
		}
	}
	if len(body.Milestones) > 0 {
		if j, err := marshalStringSlice(body.Milestones); err == nil {
			pip.Milestones = j
		}
	}

	if err := db.DB.Create(&pip).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "CREATE_FAILED", "message": "Failed to create PIP"},
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "data": pip})
}

// UpdateStaffPIP handles PUT /business/staff-performance/:staffId/pips/:pipId
//
// Updates mutable fields on an existing PIP: status, outcome, review_date, end_date.
// Only the creator, HR, or admin may update. Supports closing the PIP by setting
// status to completed, escalated, or withdrawn.
func UpdateStaffPIP(c *gin.Context) {
	claims := middleware.GetClaims(c)
	pipID  := c.Param("pipId")

	var pip models.PerformancePIP
	if err := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", pipID, claims.OrgID).
		First(&pip).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "PIP_NOT_FOUND", "message": "PIP not found"},
		})
		return
	}

	// Only the original creator, HR roles, or admin may update
	isHR := claims.Role == "hr_manager" || claims.Role == "hr_officer"
	if claims.Role != "admin" && !isHR && pip.CreatedByID != claims.UserID {
		c.JSON(http.StatusForbidden, gin.H{
			"status": "error",
			"error":  gin.H{"code": "FORBIDDEN", "message": "Only the creator or HR may update this PIP"},
		})
		return
	}

	var body struct {
		Status     string `json:"status"`
		Outcome    string `json:"outcome"`
		ReviewDate string `json:"review_date"`
		EndDate    string `json:"end_date"`
		HRReviewed *bool  `json:"hr_reviewed"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INVALID_BODY", "message": "Invalid request body"},
		})
		return
	}

	validStatuses := map[string]bool{
		"active": true, "completed": true, "escalated": true, "withdrawn": true,
	}
	updates := map[string]interface{}{}
	if body.Status != "" && validStatuses[body.Status] {
		updates["status"] = body.Status
	}
	if body.Outcome != "" {
		updates["outcome"] = body.Outcome
	}
	if body.ReviewDate != "" {
		updates["review_date"] = body.ReviewDate
	}
	if body.EndDate != "" {
		updates["end_date"] = body.EndDate
	}
	if body.HRReviewed != nil {
		updates["hr_reviewed"] = *body.HRReviewed
		if *body.HRReviewed {
			updates["hr_reviewed_by_id"] = claims.UserID
		}
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "NO_CHANGES", "message": "No updatable fields provided"},
		})
		return
	}

	if err := db.DB.Model(&pip).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "UPDATE_FAILED", "message": "Failed to update PIP"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": pip})
}

// GetStaffGoals handles GET /business/staff-performance/:staffId/goals
//
// Returns all non-deleted performance goals for the given staff member.
// The optional ?status= query param filters by goal status (e.g. "in_progress").
// Requires the caller to outrank the target (or be admin).
func GetStaffGoals(c *gin.Context) {
	claims  := middleware.GetClaims(c)
	staffID := c.Param("staffId")

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var target models.StaffProfile
	if err := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID).
		First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "STAFF_NOT_FOUND", "message": "Staff member not found"},
		})
		return
	}
	if claims.Role != "admin" {
		allowed, err := viewerOutranksTarget(scopedDB, claims.OrgID, claims.Role, target.Role)
		if err != nil || !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"status": "error",
				"error":  gin.H{"code": "RANK_INSUFFICIENT", "message": "Insufficient rank to view goals for this employee"},
			})
			return
		}
	}

	q := db.DB.Where("staff_id = ? AND org_id = ? AND is_deleted = false", staffID, claims.OrgID)
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}

	var goals []models.PerformanceGoal
	q.Order("created_date DESC").Find(&goals)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   goals,
		"total":  len(goals),
	})
}

// marshalStringSlice encodes a []string to datatypes.JSON (a JSON byte array).
func marshalStringSlice(ss []string) ([]byte, error) {
	return json.Marshal(ss)
}
