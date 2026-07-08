package handlers

import (
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"carecore-backend/db"
	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetAuditTrail handles GET /audit-trail
//
// Returns a paginated, rank-filtered list of audit trail entries for the
// authenticated user's organisation.
//
// Visibility rule:
//   - Non-admin users see only entries where the actor's role rank is strictly
//     less than their own rank (derived from RoleDefinition).
//   - Admin role bypasses all rank filtering and sees every entry.
//   - An authenticated user whose role is not present in RoleDefinition receives
//     an empty result set (fail-safe default).
//
// Supported query parameters:
//
//	page        int    Page number (default 1)
//	page_size   int    Results per page (default 25, max 100)
//	from_date   string Start of date range (RFC3339 or YYYY-MM-DD)
//	to_date     string End of date range (RFC3339 or YYYY-MM-DD, inclusive)
//	home_id     string Filter by care home UUID
//	actor_role  string Filter by the actor's role name
//	action_type string Filter by action (created|updated|deleted|exported|permission_denied …)
//	module_name string Filter by module (residents|finance|hr …)
//	severity    string Filter by severity (low|medium|high|critical)
//	search      string Space-separated search terms; every term must match at least
//	                    one of actor_name, record_reference, record_title, entity_name
//	                    (each term ANDed, matched case-insensitively as a substring)
func GetAuditTrail(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"},
		})
		return
	}

	// ── Pagination ────────────────────────────────────────────────────────────
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(c.DefaultQuery("page_size", "25"))
	if err != nil || pageSize < 1 || pageSize > 100 {
		pageSize = 25
	}

	// ── Base query ────────────────────────────────────────────────────────────
	q := db.DB.Model(&models.AuditTrail{}).Where("org_id = ?", claims.OrgID)

	// ── Rank-based visibility filter ──────────────────────────────────────────
	// Every non-admin user always sees their own audit entries.
	// In addition they see entries from roles ranked strictly below them.
	// (support_worker, finance_officer, hr_officer etc. have no subordinate roles
	// and will therefore only see their own entries.)
	if claims.Role != "admin" {
		lowerRoles, _ := rolesWithRankBelow(claims.OrgID, claims.Role)
		if len(lowerRoles) > 0 {
			q = q.Where("user_id = ? OR actor_role IN ?", claims.UserID, lowerRoles)
		} else {
			q = q.Where("user_id = ?", claims.UserID)
		}
	}

	// ── Optional filters ──────────────────────────────────────────────────────
	if v := strings.TrimSpace(c.Query("from_date")); v != "" {
		if t, err := parseAuditDate(v); err == nil {
			q = q.Where("created_date >= ?", t)
		}
	}
	if v := strings.TrimSpace(c.Query("to_date")); v != "" {
		if t, err := parseAuditDate(v); err == nil {
			// Add one day so the to_date is inclusive.
			q = q.Where("created_date < ?", t.AddDate(0, 0, 1))
		}
	}
	if v := c.Query("home_id"); v != "" {
		q = q.Where("home_id = ?", v)
	}
	if v := c.Query("actor_role"); v != "" {
		q = q.Where("actor_role = ?", v)
	}
	// The DB column is "action"; the JSON alias is "action_type".
	if v := c.Query("action_type"); v != "" {
		q = q.Where("action = ?", v)
	}
	if v := c.Query("module_name"); v != "" {
		q = q.Where("module_name = ?", v)
	}
	if v := c.Query("severity"); v != "" {
		q = q.Where("severity = ?", v)
	}
	if v := strings.TrimSpace(c.Query("search")); v != "" {
		// Each whitespace-separated term is ANDed; within a term, any of the four
		// columns may match. This lets "sarah deleted" find a row where the actor
		// name and the action live in different columns.
		for term := range strings.FieldsSeq(v) {
			like := "%" + escapeLikePattern(term) + "%"
			q = q.Where(
				"actor_name ILIKE ? OR record_reference ILIKE ? OR record_title ILIKE ? OR entity_name ILIKE ?",
				like, like, like, like,
			)
		}
	}

	// ── Count total matching rows ─────────────────────────────────────────────
	// Clone the session before adding ORDER BY / OFFSET so COUNT is unaffected.
	var total int64
	if err := q.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "DB_ERROR", "message": "Failed to count audit entries"},
		})
		return
	}

	// ── KPI breakdown counts ──────────────────────────────────────────────────
	// Computed against the full filtered result set (not just the current page),
	// so the KPI cards stay correct regardless of pagination.
	kpis := gin.H{
		"high_risk_events":  countMatching(q, "severity IN ?", []string{"high", "critical"}),
		"approval_actions":  countMatching(q, "action IN ?", []string{"created", "updated"}),
		"escalations":       countMatching(q, "action = ?", "permission_denied"),
		"deleted_restored":  countMatching(q, "action IN ?", []string{"deleted", "restored"}),
		"exports_downloads": countMatching(q, "action IN ?", []string{"exported", "downloaded"}),
	}

	// ── Fetch page ────────────────────────────────────────────────────────────
	var entries []models.AuditTrail
	offset := (page - 1) * pageSize
	if err := q.
		Order("created_date DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "DB_ERROR", "message": "Failed to fetch audit entries"},
		})
		return
	}

	c.JSON(http.StatusOK, buildAuditPage(entries, total, page, pageSize, kpis))
}

// LogAuditExport handles POST /audit-trail/export-log.
//
// Records that the authenticated user exported a batch of audit trail data
// (CSV/Excel/PDF) as its own audit entry, so the "Exports / Downloads" KPI
// reflects real activity instead of always reading zero. The frontend calls
// this once client-side export generation succeeds — it does not gate the
// export itself, only records that it happened.
//
// Body: { "format": "csv"|"excel"|"pdf", "record_count": int }
func LogAuditExport(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"},
		})
		return
	}

	var body struct {
		Format      string `json:"format"`
		RecordCount int    `json:"record_count"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Format) == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INVALID_BODY", "message": "format is required"},
		})
		return
	}

	if err := middleware.WriteAuditExportEvent(
		claims.OrgID, claims.Email, claims.UserID, claims.Role, c.ClientIP(),
		strings.ToLower(strings.TrimSpace(body.Format)), body.RecordCount,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "DB_ERROR", "message": "Failed to record export event"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// countMatching runs a COUNT against a clone of the given query session with
// an additional condition applied, so the original query (and its other
// clones) are left untouched. Errors are treated as zero — a KPI count
// failing should never block the main list response.
func countMatching(q *gorm.DB, cond string, args ...any) int64 {
	var n int64
	q.Session(&gorm.Session{}).Where(cond, args...).Count(&n)
	return n
}

// buildAuditPage constructs the standardised paginated response envelope.
func buildAuditPage(entries []models.AuditTrail, total int64, page, pageSize int, kpis gin.H) gin.H {
	if entries == nil {
		entries = []models.AuditTrail{}
	}
	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageSize)))
	}
	return gin.H{
		"status": "success",
		"data":   entries,
		"meta": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total_count": total,
			"total_pages": totalPages,
			"kpis":        kpis,
		},
	}
}

// rolesWithRankBelow returns the role names from RoleDefinition whose rank is
// strictly less than the given viewer role's rank. This is the core of the
// seniority-based visibility rule for the Audit Trail.
//
// Returns an error if the viewer's role cannot be found in RoleDefinition.
func rolesWithRankBelow(orgID, viewerRole string) ([]string, error) {
	var viewerDef models.RoleDefinition
	if err := db.DB.
		Where("org_id = ? AND role_name = ?", orgID, viewerRole).
		First(&viewerDef).Error; err != nil {
		return nil, err
	}

	var lowerDefs []models.RoleDefinition
	if err := db.DB.
		Where("org_id = ? AND rank < ?", orgID, viewerDef.Rank).
		Find(&lowerDefs).Error; err != nil {
		return nil, err
	}

	roles := make([]string, len(lowerDefs))
	for i, d := range lowerDefs {
		roles[i] = d.RoleName
	}
	return roles, nil
}

// escapeLikePattern escapes ILIKE wildcard characters (% and _) in raw user
// input so a literal % or _ typed by the user is matched literally instead of
// acting as a SQL wildcard, once the caller wraps the result in "%...%".
func escapeLikePattern(s string) string {
	return strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(s)
}

// parseAuditDate parses a date string from a query parameter.
// Accepts both RFC3339 ("2026-06-23T00:00:00Z") and plain date ("2026-06-23").
func parseAuditDate(v string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, v); err == nil {
		return t.UTC(), nil
	}
	t, err := time.Parse("2006-01-02", v)
	return t.UTC(), err
}
