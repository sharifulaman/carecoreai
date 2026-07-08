package middleware

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"carecore-backend/db"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
)

// levelRank maps permission levels to numeric ranks for ordered comparison.
// A higher rank grants all permissions of lower ranks.
var levelRank = map[string]int{
	"None":    0,
	"View":    1,
	"Edit":    2,
	"Approve": 3,
	"Admin":   4,
}

// entityModuleMap maps entity names (as used in /entities/:entity API routes)
// to the module key that governs access. Entities absent from this map pass
// through unchecked. Admin role always bypasses all checks.
var entityModuleMap = map[string]string{
	// ── Residents module ─────────────────────────────────────────────────────
	"Resident":                   "residents",
	"ResidentAllowance":          "residents",
	"ResidentSavings":            "residents",
	"ResidentSavingsTransaction": "residents",
	"ResidentDocument":           "residents",
	"PlacementDetails":           "residents",
	"PlacementPlan":              "residents",
	"PathwayPlan":                "residents",
	"SupportPlan":                "residents",
	"SupportPlanSignoff":         "residents",
	"ILSPlan":                    "residents",
	"ILSPlanSection":             "residents",
	"ILSSessionLog":              "residents",
	"DailyLog":                   "residents",
	"Appointment":                "residents",
	"BodyMap":                    "residents",
	"SafeguardingRecord":         "residents",
	"VisitReport":                "residents",
	"FamilyContact":              "residents",
	"MedicationRecord":           "residents",
	"MAREntry":                   "residents",
	"GPAppointment":              "residents",
	"CICReport":                  "residents",
	"Achievement":                "residents",
	"AdvocacyRecord":             "residents",
	"Complaint":                  "residents",
	"ExploitationRisk":           "residents",
	"MissingFromHome":            "residents",
	"BehaviourSupportPlan":       "residents",
	"TherapeuticPlan":            "residents",
	"RiskAssessment":             "residents",
	"NEETRecord":                 "residents",
	"YPViewsRecord":              "residents",
	"EmploymentRecord":           "residents",
	"FamilySocialPlan":           "residents",
	"DeprivationOfLiberty":       "residents",
	"WelcomePackDocument":        "residents",
	"VisitorLog":                 "residents",
	"KeyPerson":                  "residents",
	// 18+ specific
	"CareLeaverBenefit": "residents",
	"PADetails":         "residents",
	"LAReview":          "residents",
	"PostMoveOnContact": "residents",

	// ── Homes module ─────────────────────────────────────────────────────────
	"Home":                  "homes",
	"HomeAsset":             "homes",
	"HomeBudget":            "homes",
	"HomeBudgetLine":        "homes",
	"HomeDocument":          "homes",
	"HomeExpense":           "homes",
	"HomeLog":               "homes",
	"HomeTask":              "homes",
	"HomeCheck":             "homes",
	"HomeCheckCompletion":   "homes",
	"HomeCheckInstance":     "homes",
	"HomeCheckIssue":        "homes",
	"HomeCheckItemResponse": "homes",
	"HomeCheckTemplate":     "homes",
	"HomeCheckTemplateItem": "homes",
	"MealPlan":              "homes",
	"AccidentReport":        "homes",
	"Reg44Report":           "homes",
	"Reg45Review":           "homes",
	"SignificantEvent":      "homes",
	"OfstedNotification":    "homes",

	// ── Maintenance module ────────────────────────────────────────────────────
	"MaintenanceRequest":  "maintenance",
	"MaintenanceTask":     "maintenance",
	"MaintenanceLog":      "homes",
	"MaintenanceContract": "homes",
	"MaintenanceSchedule": "homes",

	// ── Staff module ──────────────────────────────────────────────────────────
	"StaffMovement":          "staff",
	"StaffServiceAssignment": "staff",

	// ── My Performance module ─────────────────────────────────────────────────
	// Self-service: all staff roles with my_performance access can read and write
	// their own PerformanceGoal and SelfAssessment records via entity CRUD.
	// SupervisionRecord and AppraisalRecord remain under "hr" — their data is
	// served to staff via dedicated /business/my-performance/* endpoints that
	// enforce supervisee_id = claims.UserID, preventing cross-staff data leakage.
	"PerformanceGoal": "my_performance",
	"SelfAssessment":  "my_performance",

	// ── Employee Performance module (manager-facing) ──────────────────────────
	// PerformancePIP is confidential — only managers, HR, and Admin can access it.
	"PerformancePIP": "employee_performance",

	// ── HR module ─────────────────────────────────────────────────────────────
	"AppraisalRecord":         "hr",
	"DisciplinaryRecord":      "hr",
	"SupervisionRecord":       "hr",
	"TrainingRecord":          "hr",
	"TrainingRequirement":     "hr",
	// LeaveRequest and LeaveBalance are self-service — every staff member must
	// be able to create and read their own records regardless of HR module access.
	// Timesheet, WellbeingCheckIn, and StaffExpense are similarly self-service.
	// "LeaveRequest":            "hr",
	// "LeaveBalance":            "hr",
	// "Timesheet":               "hr",
	// "WellbeingCheckIn":        "hr",
	// "StaffExpense":            "hr",
	"Payslip":                 "hr",
	"ReturnToWorkRecord":      "hr",
	"StaffDocument":           "hr",
	"Vacancy":                 "hr",
	"AgencyBankStaffUsage":    "hr",

	// ── Finance module ────────────────────────────────────────────────────────
	"Invoice":              "finance",
	"PayrollRecord":        "finance",
	"BudgetItem":           "finance",
	"Bill":                 "finance",
	"PlacementFee":         "finance",
	"PlacementInvoice":     "finance",
	"PettyCash":            "finance",
	"PettyCashTransaction": "finance",
	"CouncilTaxExemption":  "finance",
	"PayPeriod":            "finance",

	// ── Compliance module ─────────────────────────────────────────────────────
	"ComplianceItem": "compliance",
	"AuditEntry":     "compliance",
	"AuditTrail":     "compliance",

	// ── Approvals / Workflow module ───────────────────────────────────────────
	"WorkflowItem":        "approvals",
	"WorkflowEvent":       "approvals",
	"WorkflowRoutingStep": "approvals",
	"ApprovalRequest":     "approvals",
	"ApprovalWorkflow":    "approvals",

	// ── Handover module (part of homes/shifts workflow) ───────────────────────
	"HandoverDocument":   "homes",
	"HandoverRecord":     "homes",
	"HandoverTask":       "homes",
	"HandoverUpdate":     "homes",
	"HandoverYPSummary":  "homes",

	// ── Admin Management module ───────────────────────────────────────────────
	"Agency":          "admin_mgmt",
	"RolePermission":  "admin_mgmt",
	"RoleDefinition":  "admin_mgmt",

	// ── Residents module (external support lives under the residents section) ──
	"ExternalSupportService": "residents",
}

// permCacheEntry caches a module→level map with a TTL.
type permCacheEntry struct {
	// levels maps module key → permission level string (e.g. "View", "Edit").
	// nil means no RolePermission record exists for this org+role (no restriction).
	levels map[string]string
	expiry time.Time
}

var (
	permCache sync.Map
	cacheTTL  = 60 * time.Second
)

// getModuleLevels returns the module→level map for a given org+role,
// using an in-memory cache with a 60 s TTL. Returns nil when no
// RolePermission record exists (backward-compatible: no restriction).
func getModuleLevels(orgID, role string) map[string]string {
	cacheKey := orgID + ":" + role
	if v, ok := permCache.Load(cacheKey); ok {
		entry := v.(permCacheEntry)
		if time.Now().Before(entry.expiry) {
			return entry.levels
		}
	}

	var record models.RolePermission
	if err := db.DB.Where("org_id = ? AND role_name = ?", orgID, role).First(&record).Error; err != nil {
		permCache.Store(cacheKey, permCacheEntry{levels: nil, expiry: time.Now().Add(cacheTTL)})
		return nil
	}

	levels := parseModuleLevels(record.EnabledModules)
	permCache.Store(cacheKey, permCacheEntry{levels: levels, expiry: time.Now().Add(cacheTTL)})
	return levels
}

// parseModuleLevels converts the JSONB enabled_modules field into a module→level map.
// Handles both storage formats:
//
//	Legacy:  ["staff", "finance"]                           → defaults level to "Edit"
//	Current: [{"key": "staff", "level": "Edit"}, ...]
func parseModuleLevels(raw []byte) map[string]string {
	if len(raw) == 0 {
		return nil
	}
	var items []interface{}
	if err := json.Unmarshal(raw, &items); err != nil || len(items) == 0 {
		return nil
	}
	result := make(map[string]string, len(items))
	for _, item := range items {
		switch v := item.(type) {
		case string:
			// Legacy format — treat as Edit (full write access) to preserve existing behaviour.
			result[v] = "Edit"
		case map[string]interface{}:
			key, ok := v["key"].(string)
			if !ok || key == "" {
				continue
			}
			level, _ := v["level"].(string)
			if level == "" {
				level = "Edit"
			}
			result[key] = level
		}
	}
	return result
}

// moduleError builds a consistent 403 JSON body for permission failures.
// rank is the user's actual rank for the module.
// Internal details (module name, role, level) are intentionally omitted from the
// response to avoid leaking access-control topology to unauthorised callers.
func moduleError(module, role, level string, rank int) gin.H {
	errCode := "MODULE_FORBIDDEN"
	errMsg := "Your role does not have access to this module"
	if rank >= levelRank["View"] {
		errCode = "MODULE_INSUFFICIENT_LEVEL"
		errMsg = "Your role does not have sufficient permission level for this operation"
	}
	return gin.H{
		"status": "error",
		"error": gin.H{
			"code":    errCode,
			"message": errMsg,
		},
	}
}

// minRankForMethod returns the minimum permission rank required for the given
// HTTP method, matching the frontend level→action mapping:
//
//	GET             → View  (rank 1)
//	POST/PUT/PATCH  → Edit  (rank 2)
//	DELETE          → Admin (rank 4)
func minRankForMethod(method string) int {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch:
		return levelRank["Edit"]
	case http.MethodDelete:
		return levelRank["Admin"]
	default:
		return levelRank["View"]
	}
}

// RequireModuleLevel returns a Gin middleware that enforces a minimum permission
// level for an explicitly named module. Use this for routes that do not follow
// the /entities/:entity pattern (e.g. /business/... named routes).
//
// minLevel must be one of: "View", "Edit", "Approve", "Admin".
// Admin role always passes. Missing RolePermission record → no restriction.
func RequireModuleLevel(module, minLevel string) gin.HandlerFunc {
	minRank, ok := levelRank[minLevel]
	if !ok {
		minRank = levelRank["Edit"]
	}
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"},
			})
			return
		}
		if claims.Role == "admin" {
			c.Next()
			return
		}
		levels := getModuleLevels(claims.OrgID, claims.Role)
		if levels == nil {
			c.Next()
			return
		}
		level, configured := levels[module]
		if !configured {
			// Module not listed in the role's permissions → treat as unrestricted,
			// consistent with the no-record case above.
			c.Next()
			return
		}
		rank := levelRank[level]
		if rank < minRank {
			LogPermissionDenied(c, claims, module, c.Request.Method)
			c.AbortWithStatusJSON(http.StatusForbidden, moduleError(module, claims.Role, level, rank))
			return
		}
		c.Next()
	}
}

// RequireModuleAccess is a Gin middleware that enforces module-level permissions
// on all /entities/:entity routes.
//
// Access rules:
//   - GET requests require level ≥ "View"  (rank ≥ 1)
//   - Write requests (POST/PUT/PATCH/DELETE) require level ≥ "Edit" (rank ≥ 2)
//   - Admin role always passes, regardless of RolePermission records
//   - Entities absent from entityModuleMap pass through unchecked
//   - Missing RolePermission record → no restriction (backward-compatible)
func RequireModuleAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"},
			})
			return
		}

		// Admin bypasses all module checks.
		if claims.Role == "admin" {
			c.Next()
			return
		}

		entity := c.Param("entity")
		module, protected := entityModuleMap[entity]
		if !protected {
			c.Next()
			return
		}

		levels := getModuleLevels(claims.OrgID, claims.Role)
		if levels == nil {
			// No RolePermission record configured — no restriction.
			c.Next()
			return
		}

		level, configured := levels[module]
		if !configured {
			// Module not listed in the role's permissions → treat as unrestricted.
			c.Next()
			return
		}
		rank := levelRank[level]

		minRank := minRankForMethod(c.Request.Method)

		if rank < minRank {
			LogPermissionDenied(c, claims, module, c.Request.Method)
			c.AbortWithStatusJSON(http.StatusForbidden, moduleError(module, claims.Role, level, rank))
			return
		}

		c.Next()
	}
}

// writeAuditEntry persists an AuditTrail record asynchronously so it does not
// add latency to the request path. Errors are silently discarded.
func writeAuditEntry(entry models.AuditTrail) {
	go func() {
		db.DB.Create(&entry)
	}()
}

// writeAuditEntrySync persists an AuditTrail record synchronously. Use this
// instead of writeAuditEntry when the caller needs read-after-write
// consistency — e.g. the frontend refetches the audit trail immediately
// after the request completes and would otherwise race the background
// goroutine's insert.
func writeAuditEntrySync(entry models.AuditTrail) error {
	return db.DB.Create(&entry).Error
}

// LogPermissionDenied records a permission_denied event to the audit trail.
// It is exported so handlers can call it from outside the middleware chain.
func LogPermissionDenied(c *gin.Context, claims *services.Claims, module, method string) {
	detail, _ := json.Marshal(map[string]string{
		"module": module,
		"method": method,
		"role":   claims.Role,
	})
	writeAuditEntry(models.AuditTrail{
		Base:        models.Base{OrgID: claims.OrgID, CreatedBy: claims.Email},
		UserID:      claims.UserID,
		ActorName:   claims.Email,
		ActorRole:   claims.Role,
		EntityName:  "RolePermission",
		EntityID:    module,
		ModuleName:  module,
		Action:      "permission_denied",
		Severity:    "high",
		IPAddress:   c.ClientIP(),
		AfterData:   detail,
	})
}

// WritePermissionChangeAudit records a RolePermission create or update event to
// the audit trail. beforeData / afterData may be nil for create operations.
// actorRole is the role of the user who made the change (from JWT claims).
func WritePermissionChangeAudit(orgID, email, userID, actorRole, recordID, action string, beforeData, afterData []byte) {
	entry := models.AuditTrail{
		Base:        models.Base{OrgID: orgID, CreatedBy: email},
		UserID:      userID,
		ActorName:   email,
		ActorRole:   actorRole,
		EntityName:  "RolePermission",
		EntityID:    recordID,
		ModuleName:  "admin_mgmt",
		Action:      action,
		Severity:    "medium",
		BeforeData:  beforeData,
		AfterData:   afterData,
	}
	writeAuditEntry(entry)
}

// InvalidatePermCache removes the cached permission record for a specific org+role,
// forcing the next request to re-fetch from the database. Call this immediately
// after any write to the RolePermission table.
func InvalidatePermCache(orgID, role string) {
	permCache.Delete(orgID + ":" + role)
}

// EnforceEntityPermission checks whether claims has sufficient permission to perform
// the equivalent of httpMethod on the given entity. It is exported so non-middleware
// packages (e.g. handlers) can reuse the same logic for non-URL entity targets.
//
// Returns (0, nil, true) when the operation is allowed.
// Returns (http.StatusForbidden, errorBody, false) when it is denied.
// Entities absent from entityModuleMap and missing RolePermission records pass through.
func EnforceEntityPermission(claims *services.Claims, entity, httpMethod string) (int, gin.H, bool) {
	if claims.Role == "admin" {
		return 0, nil, true
	}
	module, protected := entityModuleMap[entity]
	if !protected {
		return 0, nil, true
	}
	levels := getModuleLevels(claims.OrgID, claims.Role)
	if levels == nil {
		return 0, nil, true
	}
	level, configured := levels[module]
	if !configured {
		// Module absent from the role's permission record → treat as unrestricted.
		return 0, nil, true
	}
	rank := levelRank[level]
	minRank := minRankForMethod(httpMethod)
	if rank < minRank {
		return http.StatusForbidden, moduleError(module, claims.Role, level, rank), false
	}
	return 0, nil, true
}
