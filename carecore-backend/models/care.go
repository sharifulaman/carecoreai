package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

type DailyLog struct {
	Base
	ResidentID     string         `gorm:"not null;index" json:"resident_id"`
	ResidentName   string         `json:"resident_name"`
	WorkerID       string         `gorm:"not null;index" json:"worker_id"`
	WorkerName     string         `json:"worker_name"`
	HomeID         string         `gorm:"index" json:"home_id"`
	HomeName       string         `json:"home_name"`
	Date           string         `gorm:"not null" json:"date"`
	Shift          string         `gorm:"not null" json:"shift"` // morning|afternoon|night
	LogType        string         `gorm:"default:'general'" json:"log_type"`
	Content        datatypes.JSON `gorm:"type:jsonb" json:"content"`
	Flags          pq.StringArray `gorm:"type:text[]" json:"flags"`
	AISummary      string         `json:"ai_summary"`
	Flagged        bool           `gorm:"default:false" json:"flagged"`
	FlagSeverity   int            `json:"flag_severity"`
	AcknowledgedBy string         `json:"acknowledged_by"`
	AcknowledgedAt *time.Time     `json:"acknowledged_at"`
}

type VisitReport struct {
	Base
	ResidentID           string         `gorm:"not null;index" json:"resident_id"`
	ResidentName         string         `json:"resident_name"`
	HomeID               string         `gorm:"index" json:"home_id"`
	WorkerID             string         `gorm:"not null;index" json:"worker_id"`
	WorkerName           string         `json:"worker_name"`
	Date                 string         `gorm:"not null" json:"date"`
	TimeStart            string         `json:"time_start"`
	TimeEnd              string         `json:"time_end"`
	DurationMinutes      int            `json:"duration_minutes"`
	ActionText           string         `json:"action_text"`
	OutcomeText          string         `json:"outcome_text"`
	RecommendationsText  string         `json:"recommendations_text"`
	KPIData              datatypes.JSON `gorm:"type:jsonb" json:"kpi_data"`
	DailyLogIDs          pq.StringArray `gorm:"type:text[]" json:"daily_log_ids"`
	IsKeyWorkerSession   bool           `gorm:"default:false" json:"is_key_worker_session"`
	IsDailySummary       bool           `gorm:"default:false" json:"is_daily_summary"`
	Status               string         `gorm:"default:'draft'" json:"status"` // draft|submitted|reviewed|approved
}

type KPIRecord struct {
	Base
	VisitReportID          string `gorm:"not null;index" json:"visit_report_id"`
	ResidentID             string `gorm:"not null;index" json:"resident_id"`
	WorkerID               string `gorm:"not null;index" json:"worker_id"`
	HomeID                 string `gorm:"not null;index" json:"home_id"`
	Date                   string `gorm:"not null" json:"date"`
	IsKeyWorkerSession     bool   `gorm:"default:false" json:"is_key_worker_session"`
	IsDailySummary         bool   `gorm:"default:false" json:"is_daily_summary"`
	VisitType              string `json:"visit_type"`
	Presentation           string `json:"presentation"`
	PlacementCondition     string `json:"placement_condition"`
	PrimaryPurpose         string `json:"primary_purpose"`
	CollegeStatus          string `json:"college_status"`
	LifeSkills             pq.StringArray `gorm:"type:text[]" json:"life_skills"`
	EngagementLevel        string `json:"engagement_level"`
	RiskLevel              string `json:"risk_level"`
	IndependenceProgress   string `json:"independence_progress"`
	HealthAdherence        string `json:"health_adherence"`
	AppointmentType        string `json:"appointment_type"`
	AppointmentDetailsNotes string `json:"appointment_details_notes"`
}

type SWPerformanceKPI struct {
	Base
	WorkerID           string         `gorm:"not null;index" json:"worker_id"` // stores UUID (fixed from original email bug)
	WorkerName         string         `json:"worker_name"`
	EmployeeID         string         `json:"employee_id"`
	HomeID             string         `gorm:"index" json:"home_id"`
	ResidentID         string         `gorm:"index" json:"resident_id"`
	Date               string         `gorm:"not null" json:"date"`
	WeekStart          string         `json:"week_start"`
	Month              string         `json:"month"`
	ActivityType       string         `json:"activity_type"`
	SourceEntity       string         `json:"source_entity"`
	SourceID           string         `json:"source_id"`
	HoursWithYP        float64        `json:"hours_with_yp"`
	VisitType          string         `json:"visit_type"`
	EngagementLevel    string         `json:"engagement_level"`
	RiskLevel          string         `json:"risk_level"`
	IndependenceProgress string       `json:"independence_progress"`
	HealthAdherence    string         `json:"health_adherence"`
	LifeSkills         pq.StringArray `gorm:"type:text[]" json:"life_skills"`
	KWSessionCount     int            `json:"kw_session_count"`
	CICReportCount     int            `json:"cic_report_count"`
	SupportPlanCount   int            `json:"support_plan_count"`
	GPAppointmentCount int            `json:"gp_appointment_count"`
	Notes              string         `json:"notes"`
}

type SupportPlan struct {
	Base
	ResidentID    string         `gorm:"not null;index" json:"resident_id"`
	HomeID        string         `gorm:"index" json:"home_id"`
	Version       int            `gorm:"default:1" json:"version"`
	Status        string         `gorm:"default:'draft'" json:"status"` // draft|active|archived
	EffectiveDate string         `json:"effective_date"`
	ReviewDueDate string         `json:"review_due_date"`
	ReviewedDate  string         `json:"reviewed_date"`
	ReviewedBy    string         `json:"reviewed_by"`
	OverallNotes  string         `json:"overall_notes"`
	Sections      datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"sections"`
}

type ILSPlan struct {
	Base
	ResidentID    string `gorm:"not null;index" json:"resident_id"`
	HomeID        string `gorm:"index" json:"home_id"`
	Version       int    `gorm:"default:1" json:"version"`
	Status        string `gorm:"default:'draft'" json:"status"`
	EffectiveDate string `json:"effective_date"`
	ReviewDueDate string `json:"review_due_date"`
	ReviewedDate  string `json:"reviewed_date"`
	CreatedBy     string `json:"created_by_user"`
	ReviewedBy    string `json:"reviewed_by"`
	OverallNotes  string `json:"overall_notes"`
}

type ILSPlanSection struct {
	Base
	ILSPlanID          string `gorm:"not null;index" json:"ils_plan_id"`
	ResidentID         string `gorm:"not null;index" json:"resident_id"`
	SkillArea          string `json:"skill_area"`
	CustomSkillName    string `json:"custom_skill_name"`
	CurrentLevel       string `json:"current_level"`
	Goal               string `json:"goal"`
	CurrentAbility     string `json:"current_ability"`
	SupportNeeded      string `json:"support_needed"`
	Actions            string `json:"actions"`
	TargetDate         string `json:"target_date"`
	ProgressPercentage int    `gorm:"default:0" json:"progress_percentage"`
	Notes              string `json:"notes"`
	LastUpdatedBy      string `json:"last_updated_by"`
}

type CICReport struct {
	Base
	ResidentID   string         `gorm:"not null;index" json:"resident_id"`
	ResidentName string         `json:"resident_name"`
	HomeID       string         `gorm:"index" json:"home_id"`
	DateFrom     string         `json:"date_from"`
	DateTo       string         `json:"date_to"`
	Title        string         `json:"title"`
	GeneratedBy  string         `json:"generated_by"`
	Status       string         `gorm:"default:'draft'" json:"status"` // draft|saved
	ReportData   datatypes.JSON `gorm:"type:jsonb" json:"report_data"`
}

type AccidentReport struct {
	Base
	HomeID            string `gorm:"not null;index" json:"home_id"`
	HomeName          string `json:"home_name"`
	ReportedByID      string `json:"reported_by_id"`
	ReportedByName    string `json:"reported_by_name"`
	ResidentID        string `gorm:"index" json:"resident_id"`
	ResidentName      string `json:"resident_name"`
	Type              string `json:"type"` // accident|illness|near_miss|injury
	Date              string `json:"date"`
	Time              string `json:"time"`
	Location          string `json:"location"`
	Description       string `json:"description"`
	Injuries          string `json:"injuries"`
	FirstAidGiven     bool   `json:"first_aid_given"`
	FirstAidDetails   string `json:"first_aid_details"`
	HospitalAttendance bool  `json:"hospital_attendance"`
	WitnessName       string `json:"witness_name"`
	FollowUpRequired  bool   `json:"follow_up_required"`
	FollowUpNotes     string `json:"follow_up_notes"`
	Status            string `gorm:"default:'open'" json:"status"` // open|reviewed|closed
}

type SafeguardingRecord struct {
	Base
	ResidentID  string `gorm:"not null;index" json:"resident_id"`
	HomeID      string `gorm:"index" json:"home_id"`
	Date        string `json:"date"`
	ReportedBy  string `json:"reported_by"`
	ConcernType string `json:"concern_type"`
	Description string `json:"description"`
	ActionTaken string `json:"action_taken"`
	Status      string `gorm:"default:'open'" json:"status"` // open|referred|closed
	LAReference string `json:"la_reference"`
	Notes       string `json:"notes"`
}

type MedicationRecord struct {
	Base
	ResidentID       string     `gorm:"not null;index" json:"resident_id"`
	MedicationName   string     `gorm:"not null" json:"medication_name"`
	Dosage           string     `json:"dosage"`
	Frequency        string     `json:"frequency"`
	Route            string     `json:"route"`
	PrescribedBy     string     `json:"prescribed_by"`
	PrescriberContact string    `json:"prescriber_contact"`
	StartDate        *time.Time `json:"start_date"`
	EndDate          *time.Time `json:"end_date"`
	ReviewDate       *time.Time `json:"review_date"`
	Status           string     `gorm:"default:'active'" json:"status"` // active|discontinued|paused
	Notes            string     `json:"notes"`
}

type MAREntry struct {
	Base
	ResidentID      string `gorm:"not null;index" json:"resident_id"`
	MedicationID    string `gorm:"not null;index" json:"medication_id"`
	Date            string `json:"date"`
	TimeScheduled   string `json:"time_scheduled"`
	TimeAdministered string `json:"time_administered"`
	AdministeredBy  string `json:"administered_by"`
	Outcome         string `json:"outcome"` // given|refused|missed
	Notes           string `json:"notes"`
}

type GPAppointment struct {
	Base
	ResidentID      string `gorm:"not null;index" json:"resident_id"`
	HomeID          string `gorm:"index" json:"home_id"`
	Date            string `json:"date"`
	GPName          string `json:"gp_name"`
	AppointmentType string `json:"appointment_type"`
	Attended        bool   `json:"attended"`
	Outcome         string `json:"outcome"`
	Notes           string `json:"notes"`
	RecordedBy      string `json:"recorded_by"`
}