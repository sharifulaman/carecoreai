package db

import (
	"log"

	"carecore-backend/config"
	"carecore-backend/models"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

var DB *gorm.DB

// func Connect() {
// 	cfg := config.AppConfig

// 	dsn := fmt.Sprintf(
// 		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=UTC",
// 		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
// 	)

// 	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
// 		Logger: logger.Default.LogMode(logger.Info),
// 	})
// 	if err != nil {
// 		log.Fatalf("Failed to connect to database: %v", err)
// 	}

// 	log.Println("Database connected successfully")
// 	DB = db
// }

func preMigrate() {
	// Convert leisure_other_clubs from text[] to jsonb if needed.
	// AutoMigrate only adds columns; it won't change a column's type.
	DB.Exec(`DO $$ BEGIN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'residents'
			  AND column_name = 'leisure_other_clubs'
			  AND data_type = 'ARRAY'
		) THEN
			ALTER TABLE residents
				ALTER COLUMN leisure_other_clubs TYPE jsonb
				USING '[]'::jsonb;
		END IF;
	END $$`)

	// Convert neet_records uuid columns to text so empty strings are accepted.
	// The original model used gorm:"type:uuid" which rejects empty strings.
	DB.Exec(`DO $$ BEGIN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'neet_records'
			  AND column_name = 'resident_id'
			  AND data_type = 'uuid'
		) THEN
			ALTER TABLE neet_records
				ALTER COLUMN resident_id TYPE text USING resident_id::text,
				ALTER COLUMN home_id TYPE text USING home_id::text,
				ALTER COLUMN responsible_staff_id TYPE text USING responsible_staff_id::text;
		END IF;
	END $$`)

	// Prevent NOT NULL constraint error when adding staff_id to key_people
	DB.Exec(`DO $$ BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'key_people'
			  AND column_name = 'staff_id'
		) THEN
			ALTER TABLE key_people ADD COLUMN staff_id uuid;
			UPDATE key_people SET staff_id = '00000000-0000-0000-0000-000000000000' WHERE staff_id IS NULL;
		END IF;
	END $$`)

	// Rename old 'responses' column to 'response_json' in yp_feedback_submissions
	DB.Exec(`DO $$ BEGIN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'yp_feedback_submissions'
			  AND column_name = 'responses'
		) AND NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'yp_feedback_submissions'
			  AND column_name = 'response_json'
		) THEN
			ALTER TABLE yp_feedback_submissions RENAME COLUMN responses TO response_json;
		END IF;
	END $$`)

	// Fix resident_id column type in yp_feedback_submissions (uuid -> text) to accept empty strings
	DB.Exec(`DO $$ BEGIN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'yp_feedback_submissions'
			  AND column_name = 'resident_id'
			  AND data_type = 'uuid'
		) THEN
			ALTER TABLE yp_feedback_submissions
				ALTER COLUMN resident_id TYPE varchar(100) USING resident_id::text;
		END IF;
	END $$`)
}

func Migrate() {
	preMigrate()
	err := DB.AutoMigrate(
		&models.PlatformAdmin{},
		&models.Organisation{},
		&models.AuthUser{},
		&models.StaffProfile{},
		&models.StaffPerformance{},
		&models.Home{},
		&models.Resident{},
		&models.DailyChecklist{},
		&models.DailyLog{},
		&models.VisitReport{},
		&models.KPIRecord{},
		&models.SWPerformanceKPI{},
		&models.ShiftTemplate{},
		&models.Rota{},
		&models.Shift{},
		&models.ShiftHandover{},
		&models.ShiftConflict{},
		&models.Bill{},
		&models.HomeDocument{},
		&models.HomeTask{},
		&models.HomeLog{},
		&models.MaintenanceLog{},
		&models.MaintenanceSchedule{},
		&models.MaintenanceContract{},
		&models.HomeAsset{},
		&models.HomeCheck{},
		&models.HomeCheckTemplate{},
		&models.HomeCheckTemplateItem{},
		&models.HomeCheckInstance{},
		&models.HomeCheckCompletion{},
		&models.HomeCheckItemResponse{},
		&models.HomeCheckIssue{},
		&models.HomeBudget{},
		&models.HomeBudgetLine{},
		&models.HomeExpense{},
		&models.MealPlan{},
		&models.VisitorLog{},
		&models.OfstedNotification{},
		&models.Reg44Report{},
		&models.Reg45Review{},
		&models.AdmissionDischargeNotice{},
		&models.SignificantEvent{},
		&models.Complaint{},
		&models.MissingFromHome{},
		&models.DeprivationOfLiberty{},
		&models.PlacementFee{},
		&models.PlacementInvoice{},
		&models.PettyCash{},
		&models.PettyCashTransaction{},
		&models.SupportPlan{},
		&models.ILSPlan{},
		&models.ILSPlanSection{},
		&models.CICReport{},
		&models.AccidentReport{},
		&models.SafeguardingRecord{},
		&models.BodyMap{},
		&models.MedicationRecord{},
		&models.MAREntry{},
		&models.GPAppointment{},
		&models.Appointment{},
		&models.FamilyContact{},
		&models.PathwayPlan{},
		&models.PlacementPlan{},
		&models.ResidentAllowance{},
		&models.ResidentSavings{},
		&models.ResidentSavingsTransaction{},
		&models.PAVisit{},
		&models.PADetails{},
		&models.LAReview{},
		&models.Notification{},
		&models.AuditTrail{},
		&models.KPIOption{},
		&models.StaffAvailabilityProfile{},
		&models.StaffAvailabilityOverride{},
		&models.StaffWeeklyAvailability{},
		&models.StaffServiceAssignment{},
		&models.StaffMovement{},
		&models.RefreshToken{},
		&models.WelcomePackDocument{},
		&models.PlacementDetails{},
		&models.FamilySocialPlan{},
		&models.BehaviourSupportPlan{},
		&models.TherapeuticPlan{},
		&models.RiskAssessment{},
		&models.YPViewsRecord{},
		&models.ResidentDocument{},
		&models.SupportPlanSignoff{},
		&models.ExploitationRisk{},
		&models.AdvocacyRecord{},
		&models.Achievement{},
		&models.NEETRecord{},
		&models.EmploymentRecord{},
		&models.CouncilTaxExemption{},
		&models.Vacancy{},
		&models.AgencyBankStaffUsage{},
		// HR operational models
		&models.PayPeriod{},
		&models.Timesheet{},
		&models.Payslip{},
		&models.AttendanceLog{},
		&models.LeaveRequest{},
		&models.LeaveBalance{},
		&models.TOILBalance{},
		&models.SupervisionRecord{},
		&models.AppraisalRecord{},
		&models.PerformanceGoal{},
		&models.SelfAssessment{},
		&models.PerformancePIP{},
		&models.DisciplinaryRecord{},
		&models.TrainingRequirement{},
		&models.TrainingRecord{},
		&models.StaffExpense{},
		&models.WellbeingCheckIn{},
		&models.ReturnToWorkRecord{},
		&models.StaffDocument{},
		&models.ContractTemplate{},
		&models.HRPolicy{},
		&models.HRPolicyVersion{},
		&models.HRPolicyActivityEvent{},
		&models.HRPolicyStaffAssignment{},
		&models.HandoverRecord{},
		&models.HandoverUpdate{},
		&models.HandoverYPSummary{},
		&models.HandoverTask{},
		&models.HandoverDocument{},
		&models.ApprovalWorkflow{},
		&models.LocationTrackingConsent{},
		&models.EmployeeLocation{},
		&models.RolePermission{},
		&models.RoleDefinition{},
		// Maker-checker workflow engine
		&models.WorkflowItem{},
		&models.WorkflowEvent{},
		&models.WorkflowRoutingStep{},
		&models.MakerCheckerMatrix{},
		&models.ExternalSupportService{},
		// 18+ care leaver & key person entities
		&models.KeyPerson{},
		&models.CareLeaverBenefit{},
		&models.PostMoveOnContact{},
		&models.ILSSessionLog{},
		// Compliance & Audit Models
		&models.InternalAuditSubmission{},
		&models.AuditAction{},
		&models.YPFeedbackTemplate{},
		&models.YPFeedbackSubmission{},
		&models.SWPAFeedbackTemplate{},
		&models.SWPAFeedbackSubmission{},
		&models.ComplianceItem{},
		&models.ComplianceActivityEvent{},
		&models.ComplianceEvidence{},
		&models.ComplianceTask{},
		&models.ComplianceNote{},
		&models.Reg32Report{},
		&models.StorageAudit{},
		&models.RecordCompletenessCheck{},
		&models.RecordRetentionConfig{},
		&models.ContingencyPlan{},
		// HR Additions
		&models.ChildProtectionPolicy{},
		&models.PolicyAcknowledgement{},
		&models.PolicyQuizResult{},
		&models.WarningLetter{},
		// Care Additions
		&models.Allegation{},
		&models.EducationRecord{},
		&models.HealthProfile{},
		&models.Referral{},
	)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Database migration completed")
}

func SeedOrganisation() {
	var count int64
	DB.Model(&models.Organisation{}).Count(&count)
	if count > 0 {
		log.Println("Organisation already exists, skipping seed")
		return
	}

	org := models.Organisation{
		Base: models.Base{
			ID:        uuid.New(),
			OrgID:     config.AppConfig.OrgID, // "default_org"
			CreatedBy: "system",
		},
		Name:     "CareCore Organisation",
		AppName:  "CareCore AI",
		Settings: datatypes.JSON([]byte(`{}`)),
	}

	if err := DB.Create(&org).Error; err != nil {
		log.Printf("Failed to seed organisation: %v", err)
	} else {
		log.Println("Organisation seeded successfully")
	}
}

// SeedWorkflowRoutingSteps seeds the default approval chains for each workflow type.
// Idempotent — existing steps are left untouched.
//
// Accepts a *gorm.DB rather than using the global DB directly, so this
// can run either against the default connection at startup, or inside
// a tenant-scoped connection (app.current_org set) when provisioning a
// brand new organisation via CreateOrganisation.
func SeedWorkflowRoutingSteps(tx *gorm.DB, orgID string) {
	type stepSeed struct {
		workflowType string
		stepOrder    int
		stepName     string
		requiredRole string
		slaHours     int
		isFinalStep  bool
	}

	seeds := []stepSeed{
		{"incident_report", 1, "Team Leader Review", "team_leader", 24, false},
		{"incident_report", 2, "RSM Sign-Off", "rsm", 48, true},

		{"missing_episode", 1, "Team Leader Review", "team_leader", 4, false},
		{"missing_episode", 2, "RSM Sign-Off", "rsm", 24, true},

		{"support_plan", 1, "Team Manager Review", "team_manager", 72, false},
		{"support_plan", 2, "RSM Sign-Off", "rsm", 120, true},

		{"leave_request", 1, "Team Leader Approval", "team_leader", 48, false},
		{"leave_request", 2, "HR Manager Approval", "hr_manager", 72, true},

		{"bill", 1, "Team Leader Validation", "team_leader", 24, false},
		{"bill", 2, "Admin Manager Review", "admin_manager", 48, false},
		{"bill", 3, "Finance Manager Approval", "finance_manager", 48, true},
	}

	for _, s := range seeds {
		var existing models.WorkflowRoutingStep
		if err := tx.Where("org_id = ? AND workflow_type = ? AND step_order = ?", orgID, s.workflowType, s.stepOrder).First(&existing).Error; err == nil {
			continue
		}
		record := models.WorkflowRoutingStep{
			Base:         models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
			WorkflowType: s.workflowType,
			StepOrder:    s.stepOrder,
			StepName:     s.stepName,
			RequiredRole: s.requiredRole,
			SLAHours:     s.slaHours,
			IsFinalStep:  s.isFinalStep,
		}
		if err := tx.Create(&record).Error; err != nil {
			log.Printf("Failed to seed routing step %s/%d: %v", s.workflowType, s.stepOrder, err)
		}
	}
	log.Println("Workflow routing steps seeded for org:", orgID)
}

// SeedSystemRoleDefinitions seeds the built-in role catalogue for the given org.
// It is idempotent — existing records are left untouched.
//
// Accepts a *gorm.DB for the same reason as SeedWorkflowRoutingSteps above.
func SeedSystemRoleDefinitions(tx *gorm.DB, orgID string) {
	type roleSeed struct {
		roleName    string
		label       string
		rank        int
		description string
	}

	seeds := []roleSeed{
		{"admin", "Admin", 99, "Full system access — bypasses all module checks."},
		{"rsm", "Registered Service Manager", 50, "Regulatory and clinical oversight across all homes."},
		{"regional_manager", "Regional Manager", 40, "Regional operational oversight and cross-home escalation."},
		{"team_manager", "Team Manager", 30, "Day-to-day management of care teams within a home."},
		{"hr_manager", "HR Manager", 30, "Human resources management and workforce compliance."},
		{"admin_manager", "Admin Manager", 30, "Administrative management and tenant governance."},
		{"finance_manager", "Finance Manager", 30, "Financial approval authority across billing and payroll."},
		{"risk_manager", "Risk Manager", 30, "Risk assessment and safeguarding lead."},
		{"compliance_manager", "Compliance Manager", 30, "Compliance and regulatory oversight."},
		{"team_leader", "Team Leader", 20, "Shift-level leadership and first-line maker-checker approval."},
		{"finance_officer", "Finance Officer", 15, "Finance data entry and reporting."},
		{"admin_officer", "Admin Officer", 15, "Administrative operations and document management."},
		{"hr_officer", "HR Officer", 15, "HR records and staff administration support."},
		{"risk_officer", "Risk Officer", 15, "Risk monitoring and incident recording."},
		{"support_worker", "Support Worker", 10, "Frontline care delivery."},
		{"maintenance_officer", "Maintenance Officer", 10, "Property maintenance and asset management."},
	}

	for _, s := range seeds {
		var existing models.RoleDefinition
		if err := tx.Where("org_id = ? AND role_name = ?", orgID, s.roleName).First(&existing).Error; err == nil {
			continue // already seeded
		}
		record := models.RoleDefinition{
			Base:        models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
			RoleName:    s.roleName,
			Label:       s.label,
			Rank:        s.rank,
			IsSystem:    true,
			Description: s.description,
		}
		if err := tx.Create(&record).Error; err != nil {
			log.Printf("Failed to seed role definition %q: %v", s.roleName, err)
		}
	}
	log.Println("System role definitions seeded for org:", orgID)
}
