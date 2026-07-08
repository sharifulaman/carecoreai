package handlers

// import (
// 	"errors"
// 	"net/http"
// 	"time"

// 	"carecore-backend/db"
// 	"carecore-backend/middleware"
// 	"carecore-backend/models"

// 	"github.com/gin-gonic/gin"
// 	"github.com/google/uuid"
// 	"gorm.io/gorm"
// )

// // actionsRequiringComment lists the actions where a comment is mandatory.
// var actionsRequiringComment = map[string]bool{
// 	"reject":           true,
// 	"request_changes":  true,
// 	"escalate":         true,
// }

// // validActions is the set of all legal action strings.
// var validActions = map[string]bool{
// 	"submit":           true,
// 	"approve":          true,
// 	"reject":           true,
// 	"request_changes":  true,
// 	"resubmit":         true,
// 	"escalate":         true,
// }

// // statusesAllowingAction maps each action to the statuses it may be applied to.
// var statusesAllowingAction = map[string][]string{
// 	"submit":          {"draft", "changes_requested"},
// 	"approve":         {"submitted", "under_review", "resubmitted"},
// 	"reject":          {"submitted", "under_review", "resubmitted"},
// 	"request_changes": {"submitted", "under_review", "resubmitted"},
// 	"resubmit":        {"changes_requested"},
// 	"escalate":        {"submitted", "under_review", "resubmitted"},
// }

// // ── List ──────────────────────────────────────────────────────────────────────

// // ListWorkflowItems returns workflow items scoped to the caller's role.
// // Optional query param ?queue=mine|submitted|team|escalated|overdue filters the result.
// func ListWorkflowItems(c *gin.Context) {
// 	claims := middleware.GetClaims(c)
// 	if claims == nil {
// 		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
// 		return
// 	}

// 	q := db.DB.Where("workflow_items.org_id = ?", claims.OrgID)

// 	switch c.Query("queue") {
// 	case "mine":
// 		// Items currently assigned to the caller's role for review.
// 		q = q.Where("reviewer_role = ? AND status IN ?", claims.Role, []string{"submitted", "under_review", "resubmitted"})
// 	case "submitted":
// 		// Items the caller created.
// 		q = q.Where("maker_id = ?", claims.UserID)
// 	case "team":
// 		// Items linked to homes the caller is assigned to.
// 		if len(claims.HomeIDs) > 0 {
// 			q = q.Where("home_id IN ?", claims.HomeIDs)
// 		} else {
// 			q = q.Where("maker_id = ?", claims.UserID)
// 		}
// 	case "escalated":
// 		q = q.Where("status = 'escalated'")
// 	case "overdue":
// 		q = q.Where("is_overdue = true AND status NOT IN ?", []string{"approved", "rejected", "closed"})
// 	default:
// 		// Scope by role: admin and RSM see all; others see their home + own items.
// 		if claims.Role != "admin" && claims.Role != "rsm" {
// 			if len(claims.HomeIDs) > 0 {
// 				q = q.Where("home_id IN ? OR maker_id = ? OR reviewer_role = ?",
// 					claims.HomeIDs, claims.UserID, claims.Role)
// 			} else {
// 				q = q.Where("maker_id = ? OR reviewer_role = ?", claims.UserID, claims.Role)
// 			}
// 		}
// 	}

// 	var items []models.WorkflowItem
// 	if err := q.Order("created_date DESC").Limit(300).Find(&items).Error; err != nil {
// 		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to load workflow items"))
// 		return
// 	}
// 	c.JSON(http.StatusOK, gin.H{"status": "success", "data": items})
// }

// // ── Get single ────────────────────────────────────────────────────────────────

// func GetWorkflowItem(c *gin.Context) {
// 	claims := middleware.GetClaims(c)
// 	if claims == nil {
// 		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
// 		return
// 	}
// 	var item models.WorkflowItem
// 	if err := db.DB.Where("id = ? AND org_id = ?", c.Param("id"), claims.OrgID).First(&item).Error; err != nil {
// 		if errors.Is(err, gorm.ErrRecordNotFound) {
// 			c.JSON(http.StatusNotFound, wfError("NOT_FOUND", "Workflow item not found"))
// 			return
// 		}
// 		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Database error"))
// 		return
// 	}
// 	c.JSON(http.StatusOK, gin.H{"status": "success", "data": item})
// }

// // ── Events ────────────────────────────────────────────────────────────────────

// func GetWorkflowEvents(c *gin.Context) {
// 	claims := middleware.GetClaims(c)
// 	if claims == nil {
// 		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
// 		return
// 	}
// 	var events []models.WorkflowEvent
// 	if err := db.DB.Where("workflow_item_id = ? AND org_id = ?", c.Param("id"), claims.OrgID).
// 		Order("created_date ASC").Find(&events).Error; err != nil {
// 		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to load events"))
// 		return
// 	}
// 	c.JSON(http.StatusOK, gin.H{"status": "success", "data": events})
// }

// // ── Create ────────────────────────────────────────────────────────────────────

// // CreateWorkflowItem creates a new workflow item in draft status.
// func CreateWorkflowItem(c *gin.Context) {
// 	claims := middleware.GetClaims(c)
// 	if claims == nil {
// 		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
// 		return
// 	}

// 	var body struct {
// 		WorkflowType string `json:"workflow_type" binding:"required"`
// 		EntityID     string `json:"entity_id"`
// 		EntityRef    string `json:"entity_ref"`
// 		Title        string `json:"title"`
// 		Description  string `json:"description"`
// 		HomeID       string `json:"home_id"`
// 		HomeName     string `json:"home_name"`
// 		Priority     string `json:"priority"`
// 		MakerName    string `json:"maker_name" binding:"required"`
// 	}
// 	if err := c.ShouldBindJSON(&body); err != nil {
// 		c.JSON(http.StatusBadRequest, wfError("VALIDATION_ERROR", err.Error()))
// 		return
// 	}

// 	entityRef := body.EntityRef
// 	if entityRef == "" {
// 		entityRef = "WF-" + uuid.New().String()[:8]
// 	}

// 	priority := body.Priority
// 	if priority == "" {
// 		priority = "routine"
// 	}

// 	item := models.WorkflowItem{
// 		Base:         models.Base{OrgID: claims.OrgID, CreatedBy: claims.Email},
// 		WorkflowType: body.WorkflowType,
// 		EntityID:     body.EntityID,
// 		EntityRef:    entityRef,
// 		Title:        body.Title,
// 		Description:  body.Description,
// 		HomeID:       body.HomeID,
// 		HomeName:     body.HomeName,
// 		Priority:     priority,
// 		Status:       "draft",
// 		CurrentStep:  1,
// 		MakerID:      claims.UserID,
// 		MakerRole:    claims.Role,
// 		MakerName:    body.MakerName,
// 		MakerRank:    lookupRoleRank(claims.OrgID, claims.Role),
// 	}
// 	if err := db.DB.Create(&item).Error; err != nil {
// 		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to create workflow item"))
// 		return
// 	}
// 	c.JSON(http.StatusCreated, gin.H{"status": "success", "data": item})
// }

// // ── Action ────────────────────────────────────────────────────────────────────

// // PerformWorkflowAction executes a state transition on a WorkflowItem and writes
// // a WorkflowEvent. All business rules are enforced here.
// func PerformWorkflowAction(c *gin.Context) {
// 	claims := middleware.GetClaims(c)
// 	if claims == nil {
// 		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
// 		return
// 	}

// 	var body struct {
// 		Action    string `json:"action" binding:"required"`
// 		Comment   string `json:"comment"`
// 		ActorName string `json:"actor_name" binding:"required"`
// 	}
// 	if err := c.ShouldBindJSON(&body); err != nil {
// 		c.JSON(http.StatusBadRequest, wfError("VALIDATION_ERROR", err.Error()))
// 		return
// 	}

// 	if !validActions[body.Action] {
// 		c.JSON(http.StatusBadRequest, wfError("INVALID_ACTION", "Unknown action: "+body.Action))
// 		return
// 	}
// 	if actionsRequiringComment[body.Action] && body.Comment == "" {
// 		c.JSON(http.StatusBadRequest, wfError("COMMENT_REQUIRED", "A comment is required for this action"))
// 		return
// 	}

// 	// Load item
// 	var item models.WorkflowItem
// 	if err := db.DB.Where("id = ? AND org_id = ?", c.Param("id"), claims.OrgID).First(&item).Error; err != nil {
// 		if errors.Is(err, gorm.ErrRecordNotFound) {
// 			c.JSON(http.StatusNotFound, wfError("NOT_FOUND", "Workflow item not found"))
// 			return
// 		}
// 		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Database error"))
// 		return
// 	}

// 	// Validate the current status allows this action.
// 	allowed := false
// 	for _, s := range statusesAllowingAction[body.Action] {
// 		if item.Status == s {
// 			allowed = true
// 			break
// 		}
// 	}
// 	if !allowed {
// 		c.JSON(http.StatusConflict, wfError("INVALID_TRANSITION",
// 			"Action '"+body.Action+"' is not allowed when status is '"+item.Status+"'"))
// 		return
// 	}

// 	fromStatus := item.Status
// 	now := time.Now()

// 	switch body.Action {

// 	case "submit", "resubmit":
// 		// Guard: only the maker may submit.
// 		if item.MakerID != claims.UserID {
// 			c.JSON(http.StatusForbidden, wfError("FORBIDDEN", "Only the maker can submit this item"))
// 			return
// 		}
// 		// Find step 1 routing rule.
// 		step, err := findRoutingStep(claims.OrgID, item.WorkflowType, 1)
// 		if err != nil {
// 			c.JSON(http.StatusInternalServerError, wfError("NO_ROUTING_STEP",
// 				"No routing step configured for workflow type: "+item.WorkflowType))
// 			return
// 		}
// 		item.Status = "submitted"
// 		item.CurrentStep = 1
// 		item.ReviewerRole = step.RequiredRole
// 		item.ReviewerID = ""
// 		item.ReviewerName = ""
// 		if item.SubmittedAt == nil {
// 			item.SubmittedAt = &now
// 		}
// 		item.IsNarrativeLocked = true
// 		setSLA(&item, step.SLAHours, now)

// 	case "approve":
// 		// Guard: only the assigned reviewer role (or admin) may approve.
// 		if claims.Role != item.ReviewerRole && claims.Role != "admin" {
// 			// Allow if caller's rank is higher than reviewer's rank (senior override).
// 			if !callerOutranksReviewer(claims.OrgID, claims.Role, item.ReviewerRole) {
// 				c.JSON(http.StatusForbidden, wfError("FORBIDDEN",
// 					"Your role is not assigned as the reviewer for this step"))
// 				return
// 			}
// 		}
// 		// Guard: maker cannot self-approve.
// 		if item.MakerID == claims.UserID {
// 			c.JSON(http.StatusForbidden, wfError("SELF_APPROVAL_FORBIDDEN",
// 				"The maker cannot approve their own submission"))
// 			return
// 		}
// 		// Check for a next step.
// 		nextStep, err := findRoutingStep(claims.OrgID, item.WorkflowType, item.CurrentStep+1)
// 		if err != nil || nextStep.IsFinalStep || findIsFinalStep(claims.OrgID, item.WorkflowType, item.CurrentStep) {
// 			// Final approval.
// 			item.Status = "approved"
// 			item.ClosedAt = &now
// 			item.ClosedByID = claims.UserID
// 			item.ClosedByRole = claims.Role
// 		} else {
// 			// Advance to next step.
// 			item.CurrentStep = item.CurrentStep + 1
// 			item.Status = "submitted"
// 			item.ReviewerRole = nextStep.RequiredRole
// 			item.ReviewerID = ""
// 			item.ReviewerName = ""
// 			setSLA(&item, nextStep.SLAHours, now)
// 		}

// 	case "reject":
// 		item.Status = "rejected"
// 		item.ClosedAt = &now
// 		item.ClosedByID = claims.UserID
// 		item.ClosedByRole = claims.Role
// 		item.IsNarrativeLocked = false

// 	case "request_changes":
// 		item.Status = "changes_requested"
// 		item.IsNarrativeLocked = false // unlock so maker can edit

// 	case "escalate":
// 		// Find a role with a higher rank than the current reviewer.
// 		higherRole, err := findEscalationRole(claims.OrgID, item.ReviewerRole)
// 		if err != nil {
// 			c.JSON(http.StatusUnprocessableEntity, wfError("NO_ESCALATION_ROLE",
// 				"No higher-ranked role found for escalation"))
// 			return
// 		}
// 		item.Status = "escalated"
// 		item.ReviewerRole = higherRole
// 		item.ReviewerID = ""
// 		item.ReviewerName = ""
// 	}

// 	if err := db.DB.Save(&item).Error; err != nil {
// 		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to save workflow item"))
// 		return
// 	}

// 	// Append immutable event.
// 	writeWorkflowEvent(claims.OrgID, item.ID.String(), claims.UserID, claims.Role, body.ActorName,
// 		body.Action, fromStatus, item.Status, item.CurrentStep, body.Comment)

// 	c.JSON(http.StatusOK, gin.H{"status": "success", "data": item})
// }

// // ── Helpers ───────────────────────────────────────────────────────────────────

// func wfError(code, message string) gin.H {
// 	return gin.H{"status": "error", "error": gin.H{"code": code, "message": message}}
// }

// func findRoutingStep(orgID, workflowType string, stepOrder int) (*models.WorkflowRoutingStep, error) {
// 	var step models.WorkflowRoutingStep
// 	err := db.DB.Where("org_id = ? AND workflow_type = ? AND step_order = ?", orgID, workflowType, stepOrder).
// 		First(&step).Error

// 	if err != nil && stepOrder == 1 {
// 		// Fallback for unseeded systems — use the actual role name used in this codebase.
// 		step = models.WorkflowRoutingStep{
// 			WorkflowType: workflowType,
// 			StepOrder:    1,
// 			StepName:     "Team Leader Review",
// 			RequiredRole: "team_leader",
// 			SLAHours:     48,
// 			IsFinalStep:  true,
// 		}
// 		return &step, nil
// 	}

// 	return &step, err
// }

// func findIsFinalStep(orgID, workflowType string, stepOrder int) bool {
// 	var step models.WorkflowRoutingStep
// 	if err := db.DB.Where("org_id = ? AND workflow_type = ? AND step_order = ?", orgID, workflowType, stepOrder).
// 		First(&step).Error; err != nil {
// 		return true // treat missing step as final
// 	}
// 	return step.IsFinalStep
// }

// func findEscalationRole(orgID, currentReviewerRole string) (string, error) {
// 	// Find the rank of the current reviewer role.
// 	var currentDef models.RoleDefinition
// 	if err := db.DB.Where("org_id = ? AND role_name = ?", orgID, currentReviewerRole).
// 		First(&currentDef).Error; err != nil {
// 		return "", err
// 	}
// 	// Find the next role up by rank.
// 	var higherDef models.RoleDefinition
// 	if err := db.DB.Where("org_id = ? AND rank > ? AND role_name != 'admin'", orgID, currentDef.Rank).
// 		Order("rank ASC").First(&higherDef).Error; err != nil {
// 		return "", err
// 	}
// 	return higherDef.RoleName, nil
// }

// // callerOutranksReviewer returns true when the caller's role has a higher rank
// // than the currently assigned reviewer — allowing senior override approvals.
// func callerOutranksReviewer(orgID, callerRole, reviewerRole string) bool {
// 	var callerDef, reviewerDef models.RoleDefinition
// 	if err := db.DB.Where("org_id = ? AND role_name = ?", orgID, callerRole).First(&callerDef).Error; err != nil {
// 		return false
// 	}
// 	if err := db.DB.Where("org_id = ? AND role_name = ?", orgID, reviewerRole).First(&reviewerDef).Error; err != nil {
// 		return false
// 	}
// 	return callerDef.Rank > reviewerDef.Rank
// }

// func lookupRoleRank(orgID, role string) int {
// 	var def models.RoleDefinition
// 	if err := db.DB.Where("org_id = ? AND role_name = ?", orgID, role).First(&def).Error; err != nil {
// 		return 0
// 	}
// 	return def.Rank
// }

// func setSLA(item *models.WorkflowItem, slaHours int, from time.Time) {
// 	if slaHours > 0 {
// 		due := from.Add(time.Duration(slaHours) * time.Hour)
// 		item.DueAt = &due
// 	}
// }

// func writeWorkflowEvent(orgID, workflowItemID, actorID, actorRole, actorName,
// 	eventType, fromStatus, toStatus string, stepNumber int, comment string) {
// 	event := models.WorkflowEvent{
// 		Base:           models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: actorID},
// 		WorkflowItemID: workflowItemID,
// 		ActorID:        actorID,
// 		ActorRole:      actorRole,
// 		ActorName:      actorName,
// 		EventType:      eventType,
// 		FromStatus:     fromStatus,
// 		ToStatus:       toStatus,
// 		StepNumber:     stepNumber,
// 		Comment:        comment,
// 	}
// 	go func() { db.DB.Create(&event) }()
// }
