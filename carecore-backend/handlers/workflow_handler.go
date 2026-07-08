package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// actionsRequiringComment lists the actions where a comment is mandatory.
var actionsRequiringComment = map[string]bool{
	"reject":          true,
	"request_changes": true,
	"escalate":        true,
}

// validActions is the set of all legal action strings.
var validActions = map[string]bool{
	"submit":          true,
	"approve":         true,
	"reject":          true,
	"request_changes": true,
	"resubmit":        true,
	"escalate":        true,
}

// statusesAllowingAction maps each action to the statuses it may be applied to.
var statusesAllowingAction = map[string][]string{
	"submit":          {"draft", "changes_requested"},
	"approve":         {"submitted", "under_review", "resubmitted", "escalated"},
	"reject":          {"submitted", "under_review", "resubmitted", "escalated"},
	"request_changes": {"submitted", "under_review", "resubmitted"},
	"resubmit":        {"changes_requested"},
	"escalate":        {"submitted", "under_review", "resubmitted"},
}

// ── List ──────────────────────────────────────────────────────────────────────

func ListWorkflowItems(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
		return
	}

	scopedDB, ok := mustScopedDB(c) 
	if !ok {
		 return 
		}


	q := scopedDB.Where("workflow_items.org_id = ?", claims.OrgID)

	switch c.Query("queue") {
	case "mine":
		q = q.Where("reviewer_role = ? AND status IN ?", claims.Role, []string{"submitted", "under_review", "resubmitted", "escalated"})
	case "submitted":
		q = q.Where("maker_id = ?", claims.UserID)
	case "team":
		if len(claims.HomeIDs) > 0 {
			q = q.Where("home_id IN ?", claims.HomeIDs)
		} else {
			q = q.Where("maker_id = ?", claims.UserID)
		}
	case "escalated":
		q = q.Where("status = 'escalated'")
	case "overdue":
		q = q.Where("is_overdue = true AND status NOT IN ?", []string{"approved", "rejected", "closed"})
	default:
		if claims.Role != "admin" && claims.Role != "rsm" {
			if len(claims.HomeIDs) > 0 {
				q = q.Where("home_id IN ? OR maker_id = ? OR reviewer_role = ?",
					claims.HomeIDs, claims.UserID, claims.Role)
			} else {
				q = q.Where("maker_id = ? OR reviewer_role = ?", claims.UserID, claims.Role)
			}
		}
	}

	var items []models.WorkflowItem
	if err := q.Order("created_date DESC").Limit(300).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to load workflow items"))
		return
	}

	enriched := enrichWorkflowItems(scopedDB, claims.OrgID, items)
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": enriched})
}

// ── Get single ────────────────────────────────────────────────────────────────

func GetWorkflowItem(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
		return
	}

	scopedDB, ok := mustScopedDB(c) 
	if !ok {
		 return 
		}

	var item models.WorkflowItem
	if err := scopedDB.Where("id = ? AND org_id = ?", c.Param("id"), claims.OrgID).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, wfError("NOT_FOUND", "Workflow item not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Database error"))
		return
	}
	enriched := enrichWorkflowItems(scopedDB, claims.OrgID, []models.WorkflowItem{item})
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": enriched[0]})
}

// ── Events ────────────────────────────────────────────────────────────────────

func GetWorkflowEvents(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
		return
	}

	scopedDB, ok := mustScopedDB(c) 
	if !ok {
		 return 
		}

	var events []models.WorkflowEvent
	if err := scopedDB.Where("workflow_item_id = ? AND org_id = ?", c.Param("id"), claims.OrgID).
		Order("created_date ASC").Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to load events"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": events})
}

// ── Matrix lookup ──────────────────────────────────────────────────────────

func getMatrix(scopedDB *gorm.DB,orgID, workflowType string) models.MakerCheckerMatrix {
	moduleKey := matrixModuleKey(workflowType)
	if moduleKey != "" {
		var row models.MakerCheckerMatrix
		if err := scopedDB.Where("org_id = ? AND module_key = ? AND is_active = true", orgID, moduleKey).
			First(&row).Error; err == nil {
			return row
		}
	}
	return models.MakerCheckerMatrix{
		ModuleKey:           "_default",
		MakerRoleSlugs:      models.StringArray{"support_worker", "team_leader"},
		CheckerRoleSlugs:    models.StringArray{"team_manager"},
		EscalationRoleSlugs: models.StringArray{"rsm"},
		LogicalFlow:         "Draft -> submitted -> manager review -> approved/returned.",
	}
}

func firstRole(roles models.StringArray) string {
	if len(roles) == 0 {
		return ""
	}
	return roles[0]
}

func roleLabel(slug string) string {
	labels := map[string]string{
		"admin":                 "Admin",
		"admin_officer":         "Admin Officer",
		"admin_manager":         "Admin Manager",
		"team_leader":           "Team Leader",
		"team_manager":          "Team Manager",
		"rsm":                   "Compliance Manager",
		"regional_manager":      "Regional Manager",
		"risk_manager":          "Risk Manager",
		"risk_officer":          "Risk Officer",
		"hr_manager":            "HR Manager",
		"hr_officer":            "HR Officer",
		"finance_manager":       "Finance Manager",
		"finance_officer":       "Finance Officer",
		"compliance_manager":    "Compliance Manager",
		"support_worker":        "Support Worker",
		"maintenance_officer":   "Maintenance Officer",
		"tenant_admin":          "Tenant Admin",
		"super_admin":           "Super Admin",
		"personal_adviser":      "Personal Adviser",
		"external_professional": "External Professional",
		"resident":              "Young Person",
	}
	if l, ok := labels[slug]; ok {
		return l
	}
	if slug == "" {
		return "Under Review"
	}
	return strings.Title(strings.ReplaceAll(slug, "_", " "))
}

// statusToStepIndex returns the 0-based index of the CURRENTLY ACTIVE step
// for a given status, matching the step array built by buildApprovalPath.
// Step 0 = Maker/Submitter, Step 1 = Checker, Step 2 = Escalation (if present),
// last step = end/closed.
func statusToStepIndex(status string, hasEscalation bool) int {
	switch status {
	case "draft", "changes_requested":
		return 0 // back at maker
	case "submitted", "under_review", "resubmitted":
		return 1 // at checker
	case "escalated":
		if hasEscalation {
			return 2 // at escalation step
		}
		return 1
	case "approved", "rejected", "closed":
		// Point at the last step (end node)
		if hasEscalation {
			return 3
		}
		return 2
	default:
		return 1
	}
}

// buildApprovalPath builds the stepper steps from the matrix.
// Always produces: Maker → Checker → Escalation (if configured) → End
// The escalation step is ALWAYS included when the matrix has an escalation
// role, not just when status == "escalated", so the full path is always visible.
// current_step_index is included so the frontend knows which step to highlight
// without re-deriving it from status.
func buildApprovalPath(item models.WorkflowItem, matrix models.MakerCheckerMatrix) []gin.H {
	hasEscalation := len(matrix.EscalationRoleSlugs) > 0 &&
		firstRole(matrix.EscalationRoleSlugs) != ""

	activeIdx := statusToStepIndex(item.Status, hasEscalation)

	steps := []gin.H{}

	// Step 0 — Maker
	makerLabel := roleLabel(firstRole(matrix.MakerRoleSlugs))
	if makerLabel == "Under Review" || makerLabel == "" {
		makerLabel = "Submitter"
	}
	steps = append(steps, gin.H{
		"role":       makerLabel,
		"stage":      "Submitted",
		"type":       "submitter",
		"is_current": activeIdx == 0,
		"is_done":    activeIdx > 0,
	})

	// Step 1 — Checker
	checkerLabel := roleLabel(firstRole(matrix.CheckerRoleSlugs))
	if checkerLabel == "" || checkerLabel == "Under Review" {
		checkerLabel = "Reviewer"
	}
	steps = append(steps, gin.H{
		"role":       checkerLabel,
		"stage":      "Checker Review",
		"type":       "approver",
		"is_current": activeIdx == 1,
		"is_done":    activeIdx > 1,
	})

	// Step 2 — Escalation (always shown if configured)
	if hasEscalation {
		escLabel := roleLabel(firstRole(matrix.EscalationRoleSlugs))
		steps = append(steps, gin.H{
			"role":       escLabel,
			"stage":      "Escalation Review",
			"type":       "approver",
			"is_current": activeIdx == 2,
			"is_done":    activeIdx > 2,
		})
	}

	// Final step — End
	endLabel := "Completed"
	switch item.Status {
	case "rejected":
		endLabel = "Rejected"
	case "approved", "closed":
		endLabel = "Approved / Closed"
	}
	lastIdx := len(steps)
	steps = append(steps, gin.H{
		"role":       endLabel,
		"stage":      "Closed",
		"type":       "end",
		"is_current": activeIdx == lastIdx,
		"is_done":    activeIdx > lastIdx,
	})

	return steps
}

// buildContingencyRoutes builds the "if X unavailable → Y" cards.
func buildContingencyRoutes(matrix models.MakerCheckerMatrix) []gin.H {
	routes := []gin.H{}

	checkerLabel := roleLabel(firstRole(matrix.CheckerRoleSlugs))
	escLabel := roleLabel(firstRole(matrix.EscalationRoleSlugs))

	if checkerLabel != "" && checkerLabel != "Under Review" {
		fallback := escLabel
		if fallback == "" || fallback == "Under Review" {
			fallback = "Next available senior role"
		}
		routes = append(routes, gin.H{
			"primary":  checkerLabel,
			"fallback": fallback,
		})
	}
	if escLabel != "" && escLabel != "Under Review" {
		routes = append(routes, gin.H{
			"primary":  escLabel,
			"fallback": "Regional Manager / Super Admin",
		})
	}
	if len(routes) == 0 {
		routes = append(routes, gin.H{
			"primary":  "Primary Approver",
			"fallback": "Equivalent Role / Deputy",
		})
	}
	return routes
}

// buildGovernanceBadges derives badges from actual matrix data.
func buildGovernanceBadges(matrix models.MakerCheckerMatrix) []string {
	badges := []string{}
	if !matrix.AllowSelfApproval {
		badges = append(badges, "No Self Approval")
	}
	badges = append(badges, "Audit Trail Enabled")
	if len(matrix.EscalationRoleSlugs) > 0 {
		badges = append(badges, "Escalation Path Defined")
	}

	if matrix.ModuleKey == "_default" {
		badges = append(badges, "Unmapped Module — Using Default Rules")
	}
	return badges
}

// enrichWorkflowItems decorates each WorkflowItem with matrix-derived fields.
func enrichWorkflowItems(scopedDB *gorm.DB,orgID string, items []models.WorkflowItem) []gin.H {
	out := make([]gin.H, 0, len(items))
	for _, item := range items {
		matrix := getMatrix(scopedDB, orgID, item.WorkflowType)
		approvalPath := buildApprovalPath(item, matrix)

		// Compute current_step (1-based) from status for the frontend stepper.
		hasEsc := len(matrix.EscalationRoleSlugs) > 0 && firstRole(matrix.EscalationRoleSlugs) != ""
		currentStepOneBased := statusToStepIndex(item.Status, hasEsc) + 1

		out = append(out, gin.H{
			// ── Persisted fields ──────────────────────────────────────
			"id":                  item.ID,
			"org_id":              item.OrgID,
			"created_date":        item.CreatedDate,
			"updated_date":        item.UpdatedDate,
			"workflow_type":       item.WorkflowType,
			"entity_id":           item.EntityID,
			"entity_ref":          item.EntityRef,
			"title":               item.Title,
			"description":         item.Description,
			"home_id":             item.HomeID,
			"home_name":           item.HomeName,
			"priority":            item.Priority,
			"due_at":              item.DueAt,
			"deadline_datetime":   item.DueAt,
			"is_overdue":          item.IsOverdue,
			"status":              item.Status,
			"current_step":        currentStepOneBased, // status-derived, not DB value
			"maker_id":            item.MakerID,
			"maker_role":          item.MakerRole,
			"maker_name":          item.MakerName,
			"submitted_by_name":   item.MakerName,
			"submitted_at":        item.SubmittedAt,
			"reviewer_role":       item.ReviewerRole,
			"reviewer_id":         item.ReviewerID,
			"reviewer_name":       item.ReviewerName,
			"assigned_to_name":    pickAssignedToName(item),
			"is_narrative_locked": item.IsNarrativeLocked,
			"closed_at":           item.ClosedAt,
			"closed_by_id":        item.ClosedByID,
			"closed_by_role":      item.ClosedByRole,
			"escalated":           item.Status == "escalated",

			// ── Matrix-derived display fields ──────────────────────────
			"current_stage":        roleLabel(item.ReviewerRole),
			"module_key":           matrix.ModuleKey,
			"module_name":          matrix.ModuleName,
			"maker_roles_raw":      matrix.MakerRolesRaw,
			"checker_roles_raw":    matrix.CheckerRolesRaw,
			"escalation_roles_raw": matrix.EscalationRolesRaw,
			"logical_flow":         matrix.LogicalFlow,
			"escalation_role":      roleLabel(firstRole(matrix.EscalationRoleSlugs)),

			// ── Live-computed panel data (replaces hardcoded frontend config) ──
			"approval_path":      approvalPath,
			"contingency_routes": buildContingencyRoutes(matrix),
			"governance_badges":  buildGovernanceBadges(matrix),
		})
	}
	return out
}

func pickAssignedToName(item models.WorkflowItem) string {
	if item.ReviewerName != "" {
		return item.ReviewerName
	}
	return roleLabel(item.ReviewerRole)
}

// ── Create ────────────────────────────────────────────────────────────────────

func CreateWorkflowItem(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
		return
	}

	scopedDB, ok := mustScopedDB(c) 
	if !ok {
		 return 
		}


	var body struct {
		WorkflowType string `json:"workflow_type" binding:"required"`
		EntityID     string `json:"entity_id"`
		EntityRef    string `json:"entity_ref"`
		Title        string `json:"title"`
		Description  string `json:"description"`
		HomeID       string `json:"home_id"`
		HomeName     string `json:"home_name"`
		Priority     string `json:"priority"`
		MakerName    string `json:"maker_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, wfError("VALIDATION_ERROR", err.Error()))
		return
	}

	entityRef := body.EntityRef
	if entityRef == "" {
		entityRef = "WF-" + uuid.New().String()[:8]
	}
	priority := body.Priority
	if priority == "" {
		priority = "routine"
	}

	item := models.WorkflowItem{
		Base:         models.Base{OrgID: claims.OrgID, CreatedBy: claims.Email},
		WorkflowType: body.WorkflowType,
		EntityID:     body.EntityID,
		EntityRef:    entityRef,
		Title:        body.Title,
		Description:  body.Description,
		HomeID:       body.HomeID,
		HomeName:     body.HomeName,
		Priority:     priority,
		Status:       "draft",
		CurrentStep:  1,
		MakerID:      claims.UserID,
		MakerRole:    claims.Role,
		MakerName:    body.MakerName,
	}
	if err := scopedDB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to create workflow item"))
		return
	}
	enriched := enrichWorkflowItems(scopedDB, claims.OrgID, []models.WorkflowItem{item})
	c.JSON(http.StatusCreated, gin.H{"status": "success", "data": enriched[0]})
}

// ── Action ────────────────────────────────────────────────────────────────────

func PerformWorkflowAction(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
		return
	}

	scopedDB, ok := mustScopedDB(c) 
	if !ok {
		 return 
		}

	var body struct {
		Action    string `json:"action" binding:"required"`
		Comment   string `json:"comment"`
		ActorName string `json:"actor_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, wfError("VALIDATION_ERROR", err.Error()))
		return
	}

	if !validActions[body.Action] {
		c.JSON(http.StatusBadRequest, wfError("INVALID_ACTION", "Unknown action: "+body.Action))
		return
	}
	if actionsRequiringComment[body.Action] && body.Comment == "" {
		c.JSON(http.StatusBadRequest, wfError("COMMENT_REQUIRED", "A comment is required for this action"))
		return
	}

	var item models.WorkflowItem
	if err := scopedDB.Where("id = ? AND org_id = ?", c.Param("id"), claims.OrgID).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, wfError("NOT_FOUND", "Workflow item not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Database error"))
		return
	}

	allowed := false
	for _, s := range statusesAllowingAction[body.Action] {
		if item.Status == s {
			allowed = true
			break
		}
	}
	if !allowed {
		c.JSON(http.StatusConflict, wfError("INVALID_TRANSITION",
			"Action '"+body.Action+"' is not allowed when status is '"+item.Status+"'"))
		return
	}

	matrix := getMatrix(scopedDB, claims.OrgID, item.WorkflowType)
	fromStatus := item.Status
	now := time.Now()

	switch body.Action {

	case "submit", "resubmit":
		if item.MakerID != claims.UserID {
			c.JSON(http.StatusForbidden, wfError("FORBIDDEN", "Only the maker can submit this item"))
			return
		}
		checkerRole := firstRole(matrix.CheckerRoleSlugs)
		if checkerRole == "" {
			c.JSON(http.StatusUnprocessableEntity, wfError("NO_CHECKER_CONFIGURED",
				"No checker role configured for this workflow type in the maker-checker matrix"))
			return
		}
		item.Status = "submitted"
		item.CurrentStep = 2
		item.ReviewerRole = checkerRole
		item.ReviewerID = ""
		item.ReviewerName = ""
		if item.SubmittedAt == nil {
			item.SubmittedAt = &now
		}
		item.IsNarrativeLocked = true

	case "approve":
		if !callerCanCheck(claims, item, matrix) {
			c.JSON(http.StatusForbidden, wfError("FORBIDDEN",
				"Your role is not assigned as the checker for this item"))
			return
		}
		if !matrix.AllowSelfApproval && item.MakerID == claims.UserID {
			c.JSON(http.StatusForbidden, wfError("SELF_APPROVAL_FORBIDDEN",
				"The maker cannot approve their own submission"))
			return
		}
		item.Status = "approved"
		item.ClosedAt = &now
		item.ClosedByID = claims.UserID
		item.ClosedByRole = claims.Role

	case "reject":
		if !callerCanCheck(claims, item, matrix) {
			c.JSON(http.StatusForbidden, wfError("FORBIDDEN",
				"Your role is not assigned as the checker for this item"))
			return
		}
		item.Status = "rejected"
		item.ClosedAt = &now
		item.ClosedByID = claims.UserID
		item.ClosedByRole = claims.Role
		item.IsNarrativeLocked = false

	case "request_changes":
		if !callerCanCheck(claims, item, matrix) {
			c.JSON(http.StatusForbidden, wfError("FORBIDDEN",
				"Your role is not assigned as the checker for this item"))
			return
		}
		item.Status = "changes_requested"
		item.IsNarrativeLocked = false

	case "escalate":
		escRole := firstRole(matrix.EscalationRoleSlugs)
		if escRole == "" {
			c.JSON(http.StatusUnprocessableEntity, wfError("NO_ESCALATION_ROLE",
				"No escalation role configured for this workflow type in the maker-checker matrix"))
			return
		}
		item.Status = "escalated"
		item.ReviewerRole = escRole
		item.ReviewerID = ""
		item.ReviewerName = ""
	}

	if err := scopedDB.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to save workflow item"))
		return
	}

	applyWorkflowSideEffect(scopedDB, claims.OrgID, item, body.Action, body.Comment)

	writeWorkflowEvent(scopedDB, claims.OrgID, item.ID.String(), claims.UserID, claims.Role, body.ActorName,
		body.Action, fromStatus, item.Status, item.CurrentStep, body.Comment)

	enriched := enrichWorkflowItems(scopedDB, claims.OrgID, []models.WorkflowItem{item})
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": enriched[0]})
}

// applyWorkflowSideEffect updates the underlying entity record when a workflow
// item reaches a terminal state. The maker-checker engine itself only tracks
// WorkflowItem.Status — this is where workflow_type-specific consequences live.
func applyWorkflowSideEffect(scopedDB *gorm.DB,orgID string, item models.WorkflowItem, action string, comment string) {
	if item.EntityID == "" {
		return
	}
	switch item.WorkflowType {
	case "onboarding":
		updates := map[string]interface{}{}
		switch action {
		case "approve":
			updates["status"] = "active"
		case "reject":
			updates["status"] = "rejected"
			updates["rejection_reason"] = comment
		}
		if len(updates) > 0 {
			scopedDB.Table("staff_profiles").
				Where("id = ? AND org_id = ?", item.EntityID, orgID).
				Updates(updates)
		}
	}
}

// callerCanCheck returns true if the caller's role can act as checker.
func callerCanCheck(claims *services.Claims, item models.WorkflowItem, matrix models.MakerCheckerMatrix) bool {
	if claims.Role == "admin" {
		return true
	}
	if claims.Role == item.ReviewerRole {
		return true
	}
	for _, r := range matrix.CheckerRoleSlugs {
		if claims.Role == r {
			return true
		}
	}
	for _, r := range matrix.EscalationRoleSlugs {
		if claims.Role == r {
			return true
		}
	}
	return false
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func wfError(code, message string) gin.H {
	return gin.H{"status": "error", "error": gin.H{"code": code, "message": message}}
}

func writeWorkflowEvent(scopedDB *gorm.DB, orgID, workflowItemID, actorID, actorRole, actorName,
	eventType, fromStatus, toStatus string, stepNumber int, comment string) {
	event := models.WorkflowEvent{
		Base:           models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: actorID},
		WorkflowItemID: workflowItemID,
		ActorID:        actorID,
		ActorRole:      actorRole,
		ActorName:      actorName,
		EventType:      eventType,
		FromStatus:     fromStatus,
		ToStatus:       toStatus,
		StepNumber:     stepNumber,
		Comment:        comment,
	}
	go func() { scopedDB.Create(&event) }()
}
