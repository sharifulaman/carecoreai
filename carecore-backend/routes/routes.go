package routes

import (
	"carecore-backend/handlers"
	"carecore-backend/handlers/business"
	"carecore-backend/middleware"

	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine) {

	r.GET("/api/test", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"success": true,
			"message": "API is working",
		})
	})

	//Public routes
	r.POST("/api/login", handlers.UnifiedLogin)
	auth := r.Group("/api/auth")
	{
		auth.POST("/login", handlers.Login)
		auth.POST("/refresh", handlers.RefreshToken)
		auth.POST("/register", handlers.Register)
		auth.POST("/invite",
			middleware.AuthRequired(),
			middleware.RequireRole("admin", "admin_officer", "hr_manager", "rsm", "regional_manager"),
			handlers.InviteStaff,
		)
	}

	platform := r.Group("/api/platform")
	{
		platform.POST("/login", handlers.PlatformLogin)

		protected := platform.Group("")
		protected.Use(middleware.PlatformAuthRequired())
		{
			protected.GET("/organisations", handlers.ListOrganisationsHandler)
			protected.POST("/organisations", handlers.CreateOrganisationHandler)
			protected.POST("/organisations/:org_id/activate", handlers.ActivateOrganisationHandler)
			protected.POST("/organisations/:org_id/deactivate", handlers.DeactivateOrganisationHandler)
		}
	}

	// â”€â”€ Protected routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	api := r.Group("/api")
	api.Use(middleware.AuthRequired())
	api.Use(middleware.RLSScope()) // must be after AuthRequired
	{
		// Auth (me)
		api.GET("/auth/me", handlers.GetMe)
		api.PUT("/auth/me", handlers.UpdateMe)

		// â”€â”€ Own permissions (exempt from module-level checks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		// Any authenticated user must be able to read their own role's permission
		// config. Placing this outside /entities ensures RequireModuleAccess never
		// blocks the fetch even when all modules are set to None.
		api.GET("/my-permissions", handlers.GetMyPermissions)

		// â”€â”€ Role definitions (governed by admin_mgmt module) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		// System roles are read-only; only label/description/rank (custom only) can be
		// changed. Deletion is blocked for system roles. Admin role always bypasses.
		api.GET("/role-definitions",
			middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager"),
			middleware.RequireModuleLevel("admin_mgmt", "View"),
			handlers.ListRoleDefinitions,
		)
		api.POST("/role-definitions",
			middleware.RequireRole("admin", "rsm", "admin_manager"),
			middleware.RequireModuleLevel("admin_mgmt", "Edit"),
			handlers.CreateRoleDefinition,
		)
		api.PUT("/role-definitions/:id",
			middleware.RequireRole("admin", "rsm", "admin_manager"),
			middleware.RequireModuleLevel("admin_mgmt", "Edit"),
			handlers.UpdateRoleDefinition,
		)
		api.DELETE("/role-definitions/:id",
			middleware.RequireRole("admin", "rsm"),
			middleware.RequireModuleLevel("admin_mgmt", "Admin"),
			handlers.DeleteRoleDefinition,
		)

		// â”€â”€ Audit Trail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		// Requires Compliance module View permission. Admin always passes.
		// Rank-based visibility is enforced inside the handler.
		api.GET("/audit-trail",
			middleware.RequireModuleLevel("compliance", "View"),
			handlers.GetAuditTrail,
		)
		api.POST("/audit-trail/export-log",
			middleware.RequireModuleLevel("compliance", "View"),
			handlers.LogAuditExport,
		)

		// â”€â”€ Entity CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		entities := api.Group("/entities")
		entities.Use(middleware.RequireModuleAccess())
		{
			entities.GET("/:entity", handlers.ListEntities)
			entities.GET("/:entity/:id", handlers.GetEntity)
			entities.POST("/:entity", handlers.CreateEntity)
			entities.PUT("/:entity/:id", handlers.UpdateEntity)
			entities.DELETE("/:entity/:id", handlers.DeleteEntity)

			// Bulk
			entities.POST("/:entity/bulk", handlers.BulkCreateEntities)
			entities.PUT("/:entity/bulk", handlers.BulkUpdateEntities)
		}

		// â”€â”€ Maker-checker workflow engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		// All staff roles may create and act on workflow items.
		// Module-level access is enforced via RequireModuleLevel("approvals", ...).
		wf := api.Group("/workflow")
		wf.Use(middleware.RequireModuleLevel("approvals", "View"))
		{
			wf.GET("", handlers.ListWorkflowItems)
			wf.GET("/types", handlers.ListWorkflowTypes)
			wf.GET("/:id/entity", handlers.GetWorkflowEntity)
			wf.POST("",
				middleware.RequireModuleLevel("approvals", "Edit"),
				handlers.CreateWorkflowItem,
			)
			wf.GET("/:id", handlers.GetWorkflowItem)
			wf.GET("/:id/events", handlers.GetWorkflowEvents)
			wf.POST("/:id/action",
				middleware.RequireModuleLevel("approvals", "Edit"),
				handlers.PerformWorkflowAction,
			)
		}

		// â”€â”€ Business logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		biz := api.Group("/business")
		{
			biz.POST("/visit-report",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("residents", "Edit"),
				business.SubmitVisitReport,
			)
			biz.POST("/risk-assessment",
				middleware.RequireRole("admin", "team_leader"),
				middleware.RequireModuleLevel("residents", "Edit"),
				business.UpsertRiskAssessment,
			)
			biz.POST("/missing-from-home",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("residents", "Edit"),
				business.ReportMissingFromHome,
			)
			biz.POST("/timesheet",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("staff", "Edit"),
				business.SubmitTimesheet,
			)
			biz.POST("/timesheet/generate",
				middleware.RequireRole("admin", "team_leader", "hr_manager", "finance_manager", "admin_officer", "admin_manager"),
				middleware.RequireModuleLevel("staff", "Edit"),
				business.GenerateTimesheets,
			)

			// YP module â€” business operations
			biz.POST("/appointment",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("residents", "Edit"),
				business.CreateAppointment,
			)
			biz.PUT("/appointment/:id",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("residents", "Edit"),
				business.UpdateAppointment,
			)
			biz.POST("/daily-log",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("residents", "Edit"),
				business.SubmitDailyLog,
			)
			biz.POST("/complaint",
				middleware.RequireRole("admin", "team_leader"),
				middleware.RequireModuleLevel("residents", "Edit"),
				business.RaiseComplaint,
			)
			biz.POST("/safeguarding",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("residents", "Edit"),
				business.RaiseSafeguarding,
			)

			// â”€â”€ My Performance (self-view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
			biz.GET("/my-performance/summary",
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetMyPerformanceSummary,
			)
			biz.GET("/my-performance/activities",
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetMyPerformanceActivities,
			)

			// â”€â”€ Employee Performance (manager-view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
			// All endpoints require at minimum: authenticated + my_performance View.
			// Role-rank authorization is enforced inside each handler.
			biz.GET("/staff-performance/:staffId/summary",
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetStaffPerformanceSummaryForManager,
			)
			biz.GET("/staff-performance/:staffId/activities",
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetStaffActivitiesForManager,
			)
			biz.GET("/staff-performance/:staffId/goals",
				middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager", "team_leader"),
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetStaffGoals,
			)
			biz.POST("/staff-performance/:staffId/goals",
				middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager", "team_leader"),
				middleware.RequireModuleLevel("my_performance", "Edit"),
				business.SetGoalForEmployee,
			)
			biz.GET("/staff-performance/:staffId/pips",
				middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager", "team_leader"),
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetStaffPIPs,
			)
			biz.POST("/staff-performance/:staffId/pips",
				middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager", "team_leader"),
				middleware.RequireModuleLevel("my_performance", "Edit"),
				business.CreateStaffPIP,
			)
			biz.PUT("/staff-performance/:staffId/pips/:pipId",
				middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager", "team_leader"),
				middleware.RequireModuleLevel("my_performance", "Edit"),
				business.UpdateStaffPIP,
			)
			biz.GET("/performance/team-summary",
				middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager", "team_leader"),
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetTeamPerformanceSummary,
			)
			biz.GET("/performance/team-kpis",
				middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager", "team_leader"),
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetTeamKPICards,
			)
			biz.GET("/performance/alerts",
				middleware.RequireRole("admin", "rsm", "regional_manager", "admin_manager", "hr_manager", "team_leader"),
				middleware.RequireModuleLevel("my_performance", "View"),
				business.GetEmpPerformanceAlerts,
			)

			// YP workspace â€” read endpoints (View level sufficient)
			biz.GET("/yp-summary/:residentId",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("residents", "View"),
				business.GetYPSummary,
			)
			biz.GET("/yp-timeline/:residentId",
				middleware.RequireRole("admin", "team_leader", "support_worker"),
				middleware.RequireModuleLevel("residents", "View"),
				business.GetYPTimeline,
			)
		}

		// â”€â”€ Cloud / Business Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		// All authenticated staff roles may call functions; portal roles are blocked.
		// Per-entity module permission is enforced inside the secureDataGateway handler.
		api.POST("/functions/:name",
			middleware.RequireRole(
				"admin", "rsm", "regional_manager", "team_leader", "support_worker",
				"admin_officer", "admin_manager", "hr_manager", "finance_manager",
			),
			handlers.InvokeFunction,
		)

		// â”€â”€ LLM Integration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		// Staff-only; portal roles must not be able to invoke the AI gateway.
		api.POST("/integrations/llm",
			middleware.RequireRole(
				"admin", "rsm", "regional_manager", "team_leader", "support_worker",
				"admin_officer", "admin_manager", "hr_manager", "finance_manager",
			),
			handlers.InvokeLLM,
		)

		// â”€â”€ File uploads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
		// All staff roles may upload files (resident docs, staff docs, etc.).
		// Delete is restricted to admin and manager-level roles.
		uploads := api.Group("/uploads")
		{
			uploads.POST("",
				middleware.RequireRole(
					"admin", "rsm", "regional_manager", "team_leader", "support_worker",
					"admin_officer", "admin_manager", "hr_manager", "finance_manager",
				),
				handlers.UploadFile,
			)
			uploads.POST("/signed-url",
				middleware.RequireRole(
					"admin", "rsm", "regional_manager", "team_leader", "support_worker",
					"admin_officer", "admin_manager", "hr_manager", "finance_manager",
				),
				handlers.GetSignedUploadURL,
			)
			uploads.DELETE("",
				middleware.RequireRole(
					"admin", "rsm", "regional_manager", "team_leader",
					"admin_officer", "admin_manager", "hr_manager", "finance_manager",
				),
				handlers.DeleteUpload,
			)
		}

	}
}
