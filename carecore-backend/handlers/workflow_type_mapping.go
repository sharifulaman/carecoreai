package handlers

import (
	"carecore-backend/middleware"
	"carecore-backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// workflowTypeToModuleKey bridges the free-text WorkflowItem.WorkflowType
// values used across the frontend (filters, create modal, preview list) to
// the corresponding MakerCheckerMatrix.ModuleKey row. This is the single
// place that connects "what the UI calls a workflow" to "which row in the
// governance matrix defines its maker/checker/escalation rules".
//
// If a workflow_type is submitted that has no entry here, the handler falls
// back to a generic default (see getMatrixForWorkflowType in
// workflow_handler.go) rather than failing the request.
var workflowTypeToModuleKey = map[string]string{
	// Residents
	"resident_creation": "residents_resident_yp_creation",
	"support_plan":      "residents_support_plans",
	"placement_plan":    "residents_placement_plan",
	"ils":               "residents_ils",
	"referral":          "residents_referrals",
	// Safety
	"risk_assessment":   "safety_risk_assessment",
	"behaviour_plan":    "safety_behaviour_management",
	"incident_report":   "safety_incident_logs",
	"missing_episode":   "safety_missing_episode",
	"exploitation_risk": "safety_exploitation_risk",
	// Records
	"daily_log":         "records_daily_logs",
	"visit_report":      "records_visit_reports",
	"complaint":         "records_complaints_compliments",
	"legal_restriction": "records_legal_restrictions_warnings",
	"yp_voice":          "records_yp_voice_feedback",
	// Wellbeing
	"health_update":    "wellbeing_health",
	"therapeutic_plan": "wellbeing_therapeutic_plan",
	// Life & Community
	"appointment": "life_community_appointments",
	// Education
	"education_record": "education_employment_neet",
	// Family
	"family_contact": "family_contact",
	// 18+
	"pathway_plan":     "18_pathway_plans",
	"move_on_plan":     "18_move_on_planning",
	"pa_management":    "18_pa_management",
	"benefits_finance": "18_benefits_finance",
	// 24h
	"rota":           "24h_rota_shifts",
	"shift_handover":  "24h_shift_handover",
	"visitor_log":     "24h_visitor_log",
	// Staff & HR
	"onboarding":     "staff_hr_onboarding",
	"staff_movement": "staff_hr_staff_movement",
	"leave_request":  "staff_hr_leave",
	"toil":           "staff_hr_toil",
	"timesheet":      "staff_hr_timesheets_salary",
	"expense_claim":  "staff_hr_expenses",
	"training":       "staff_hr_training",
	"supervision":    "staff_hr_supervision",
	"disciplinary":   "staff_hr_disciplinary",
	// Finance
	"placement_fee": "finance_placement_fees",
	"invoice":       "finance_invoicing",
	"petty_cash":    "finance_petty_cash",
	"allowance":     "finance_allowances_savings",
	"bill":          "finance_bills_expenses",
	"budget":        "finance_budgets",
	// Homes
	"home_creation":     "homes_home_creation_details",
	"property_document": "homes_property_tenancy_documents",
	"home_check":        "homes_checks_chores_audits",
	"maintenance_log":   "homes_maintenance_maintenance_logs",
	"asset":             "homes_assets",
	"accident":          "homes_accidents_illness",
	// Compliance
	"reg_32":              "compliance_reg_32_report",
	"internal_audit":      "compliance_internal_audit",
	"quality_assurance":   "compliance_quality_assurance",
	"ofsted_notification": "compliance_ofsted_notifications",
	"reg_27_action":       "compliance_reg_27_34_actions",
	// Tenant Admin
	"role_change":   "tenant_admin_role_permission_changes",
	"agency_access": "tenant_admin_external_agency_access",
}

// matrixModuleKey returns the module_key for a given workflow_type, or "" if unmapped.
func matrixModuleKey(workflowType string) string {
	return workflowTypeToModuleKey[workflowType]
}

// moduleKeyToWorkflowType is the reverse of workflowTypeToModuleKey, built once.
// Used to tell the frontend "this matrix row corresponds to this workflow_type"
// when listing selectable workflow types for the Create Workflow dropdown.
var moduleKeyToWorkflowType = buildReverseMap(workflowTypeToModuleKey)

func buildReverseMap(in map[string]string) map[string]string {
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[v] = k
	}
	return out
}

// ListWorkflowTypes returns the workflow types the caller is allowed to create,
// derived from MakerCheckerMatrix rows that have a known workflow_type mapping.
// This powers the "Workflow Type" dropdown in the Create Workflow modal.
func ListWorkflowTypes(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
		return
	}

	scopedDB, ok := mustScopedDB(c) 
	if !ok {
		 return 
		}

	var rows []models.MakerCheckerMatrix
	q := scopedDB.Where("org_id = ? AND is_active = ?", claims.OrgID, true)
	if claims.Role != "admin" {
		// Only show types this role can actually submit (maker_role_slugs contains role).
		q = q.Where("? = ANY(maker_role_slugs)", claims.Role)
	}
	if err := q.Order("category, module_name").Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to load workflow types"))
		return
	}

	out := []gin.H{}
	for _, row := range rows {
		wfType, ok := moduleKeyToWorkflowType[row.ModuleKey]
		if !ok {
			continue // matrix row has no corresponding workflow_type yet — skip it
		}
		out = append(out, gin.H{
			"workflow_type": wfType,
			"module_key":    row.ModuleKey,
			"module_name":   row.ModuleName,
			"category":      row.Category,
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": out})
}