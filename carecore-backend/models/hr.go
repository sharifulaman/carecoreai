package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

// ── Pay Periods ───────────────────────────────────────────────────────────────

type PayPeriod struct {
	Base
	Label       string `gorm:"not null" json:"label"`       // e.g. "May 2026"
	PeriodStart string `gorm:"not null" json:"period_start"` // "2026-05-01"
	PeriodEnd   string `gorm:"not null" json:"period_end"`   // "2026-05-31"
	PayDate     string `json:"pay_date"`
	Frequency   string `gorm:"default:'monthly'" json:"frequency"` // weekly|biweekly|monthly
	Status      string `gorm:"default:'open'" json:"status"`       // open|closed|paid
}

// ── Timesheets ────────────────────────────────────────────────────────────────

type Timesheet struct {
	Base
	StaffID             string     `gorm:"not null;index" json:"staff_id"`
	StaffName           string     `json:"staff_name"`
	HomeID              string     `gorm:"index" json:"home_id"`
	PayPeriodID         string     `gorm:"index" json:"pay_period_id"`
	PayPeriodLabel      string     `json:"pay_period_label"`
	PeriodStart         string     `json:"period_start"`
	PeriodEnd           string     `json:"period_end"`
	TotalScheduledHours float64    `json:"total_scheduled_hours"`
	TotalActualHours    float64    `json:"total_actual_hours"`
	TotalOvertimeHours  float64    `json:"total_overtime_hours"`
	TotalSleepInHours   float64    `json:"total_sleep_in_hours"`
	TotalOnCallHours    float64    `json:"total_on_call_hours"`
	HourlyRate          float64    `json:"hourly_rate"`
	GrossPay            float64    `json:"gross_pay"`
	OvertimePay         float64    `json:"overtime_pay"`
	SleepInAllowance    float64    `json:"sleep_in_allowance"`
	OnCallAllowance     float64    `json:"on_call_allowance"`
	Status              string     `gorm:"default:'draft'" json:"status"` // draft|submitted|approved|paid
	ApprovedBy          string     `json:"approved_by"`
	ApprovedAt          *time.Time `json:"approved_at"`
	Notes               string     `json:"notes"`
}

// ── Payslips ──────────────────────────────────────────────────────────────────

type Payslip struct {
	Base
	StaffID           string         `gorm:"not null;index" json:"staff_id"`
	StaffName         string         `json:"staff_name"`
	EmployeeID        string         `json:"employee_id"`
	HomeID            string         `gorm:"index" json:"home_id"`
	TimesheetID       string         `gorm:"index" json:"timesheet_id"`
	PayPeriodID       string         `gorm:"index" json:"pay_period_id"`
	PayPeriodLabel    string         `json:"pay_period_label"`
	PeriodStart       string         `json:"period_start"`
	PeriodEnd         string         `json:"period_end"`
	GrossPay          float64        `json:"gross_pay"`
	NiDeduction       float64        `json:"ni_deduction"`
	TaxDeduction      float64        `json:"tax_deduction"`
	PensionDeduction  float64        `json:"pension_deduction"`
	NetPay            float64        `json:"net_pay"`
	SspAmount         float64        `json:"ssp_amount"`
	TotalExpenses     float64        `json:"total_expenses"`
	EmployerNi        float64        `json:"employer_ni"`
	EmployerPension   float64        `json:"employer_pension"`
	TotalEmployerCost float64        `json:"total_employer_cost"`
	TaxCode           string         `json:"tax_code"`
	NiNumber          string         `json:"ni_number"`
	EmployerName      string         `json:"employer_name"`
	ExpenseLines      datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"expense_lines"`
	GeneratedAt       *time.Time     `json:"generated_at"`
	GeneratedBy       string         `json:"generated_by"`
	Status            string         `gorm:"default:'draft'" json:"status"` // draft|issued|acknowledged
}

// ── Attendance ────────────────────────────────────────────────────────────────

type AttendanceLog struct {
	Base
	StaffID      string  `gorm:"not null;index" json:"staff_id"`
	HomeID       string  `gorm:"index" json:"home_id"`
	ShiftID      string  `gorm:"index" json:"shift_id"`
	Date         string  `gorm:"index" json:"date"`     // "2026-05-18"
	ClockInTime  string  `json:"clock_in_time"`         // ISO8601 string
	ClockOutTime string  `json:"clock_out_time"`
	TotalHours   float64 `json:"total_hours"`
	Type         string  `gorm:"default:'standard'" json:"type"`   // standard|sleep_in|waking_night
	Method       string  `gorm:"default:'manual'" json:"method"`   // gps|manual|qr
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Notes        string  `json:"notes"`
	VerifiedBy   string  `json:"verified_by"`
	IsActive     bool    `gorm:"default:false" json:"is_active"` // true = clocked in, not yet out
}

// ── Leave ─────────────────────────────────────────────────────────────────────

type LeaveRequest struct {
	Base
	StaffID               string     `gorm:"not null;index" json:"staff_id"`
	StaffName             string     `json:"staff_name"`
	LeaveType             string     `gorm:"not null" json:"leave_type"` // annual_leave|sick_leave|unpaid_leave|compassionate|maternity_paternity|toil
	DateFrom              string     `gorm:"not null" json:"date_from"`
	DateTo                string     `gorm:"not null" json:"date_to"`
	Days                  float64    `json:"days"`
	Status                string     `gorm:"default:'pending'" json:"status"` // pending|approved|rejected|cancelled
	Notes                 string     `json:"notes"`
	ApprovedBy            string     `json:"approved_by"`
	ApprovedByName        string     `json:"approved_by_name"`
	ApprovedAt            *time.Time `json:"approved_at"`
	RejectionReason       string     `json:"rejection_reason"`
	ReturnToWorkCompleted bool       `gorm:"default:false" json:"return_to_work_completed"`
	SelfCertCompleted     bool       `gorm:"default:false" json:"self_cert_completed"`
	SspEligible           bool       `gorm:"default:false" json:"ssp_eligible"`
	SspAmount             float64    `json:"ssp_amount"`
}

type LeaveBalance struct {
	Base
	StaffID          string  `gorm:"not null;index" json:"staff_id"`
	StaffName        string  `json:"staff_name"`
	Year             int     `json:"year"`
	TotalEntitlement float64 `gorm:"default:28" json:"total_entitlement"` // UK statutory 28 days
	DaysTaken        float64 `json:"days_taken"`
	DaysRemaining    float64 `json:"days_remaining"`
	DaysPending      float64 `json:"days_pending"`
	CarriedOver      float64 `json:"carried_over"`
	SickDaysTaken    float64 `json:"sick_days_taken"`
	ToilEarned       float64 `json:"toil_earned"`
	ToilTaken        float64 `json:"toil_taken"`
	FlaggedForReview bool    `gorm:"default:false" json:"flagged_for_review"`
}

// ── TOIL ──────────────────────────────────────────────────────────────────────

type TOILBalance struct {
	Base
	StaffID          string  `gorm:"not null;index" json:"staff_id"`
	StaffName        string  `json:"staff_name"`
	Year             int     `json:"year"`
	ToilEarned       float64 `json:"toil_earned"`   // hours
	ToilTaken        float64 `json:"toil_taken"`    // hours
	ToilRemaining    float64 `json:"toil_remaining"` // hours
	FlaggedForReview bool    `gorm:"default:false" json:"flagged_for_review"`
}

// ── Supervision & Appraisals ──────────────────────────────────────────────────

type SupervisionRecord struct {
	Base
	SuperviseeID        string         `gorm:"not null;index" json:"supervisee_id"`
	SuperviseeName      string         `json:"supervisee_name"`
	SupervisorID        string         `gorm:"not null;index" json:"supervisor_id"`
	SupervisorName      string         `json:"supervisor_name"`
	HomeID              string         `gorm:"index" json:"home_id"`
	SessionDate         string         `gorm:"not null" json:"session_date"`
	Status              string         `gorm:"default:'scheduled'" json:"status"` // scheduled|completed|missed
	SupervisionType     string         `gorm:"default:'formal'" json:"supervision_type"` // formal|informal|telephone|group
	TopicsDiscussed     datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"topics_discussed"`
	Notes                   string         `json:"notes"`
	ActionPoints            string         `json:"action_points"`
	OverallRating           string         `json:"overall_rating"` // satisfactory|good|outstanding|requires_improvement
	StaffComments           string         `json:"staff_comments"`
	SupervisorComments      string         `json:"supervisor_comments"`
	NextSupervisionDate     string         `json:"next_supervision_date"`
	StaffAcknowledgedAt     *time.Time     `json:"staff_acknowledged_at"`
	SupervisorSignedAt      *time.Time     `json:"supervisor_signed_at"`
	
	// New detailed fields from frontend
	AgendaItems             datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"agenda_items"`
	WellbeingMood           string         `json:"wellbeing_mood"`
	StressRag               string         `json:"stress_rag"`
	WellbeingDrivers        datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"wellbeing_drivers"`
	WellbeingNote           string         `json:"wellbeing_note"`
	WorkloadStatus          string         `json:"workload_status"`
	ReflectiveQuestions     datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"reflective_questions"`
	SafeguardingConfidence  int            `json:"safeguarding_confidence"`
	SafeguardingSupportNeeded bool         `json:"safeguarding_support_needed"`
	SafeguardingNote        string         `json:"safeguarding_note"`
	TrainingNeeds           datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"training_needs"`
	Actions                 datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"actions"`
	ConcernFlags            datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"concern_flags"`
	SignoffStatus           string         `json:"signoff_status"`
	SupervisorSigned        bool           `json:"supervisor_signed"`
	SuperviseeSigned        bool           `json:"supervisee_signed"`
	SuperviseeSignedAt      *time.Time     `json:"supervisee_signed_at"`
	Transcript              string         `json:"transcript"`
	AudioFileUrl            string         `json:"audio_file_url"`
	AiStructured            bool           `json:"ai_structured"`
}

type AppraisalRecord struct {
	Base
	AppraiseeID        string         `gorm:"not null;index" json:"appraisee_id"`
	AppraiseeName      string         `json:"appraisee_name"`
	AppraiserID        string         `gorm:"not null;index" json:"appraiser_id"`
	AppraiserName      string         `json:"appraiser_name"`
	HomeID             string         `gorm:"index" json:"home_id"`
	AppraisalDate      string         `gorm:"not null" json:"appraisal_date"`
	ReviewType         string         `gorm:"default:'annual'" json:"review_type"` // probation_3m|probation_6m|annual|informal
	ReviewPeriodStart  string         `json:"review_period_start"`
	ReviewPeriodEnd    string         `json:"review_period_end"`
	Rating             int            `json:"rating"` // 1–5
	OverallRating      int            `json:"overall_rating"`
	PerformanceNotes   string         `json:"performance_notes"`
	Strengths          string         `json:"strengths"`
	AreasForDevelopment string        `json:"areas_for_development"`
	ObjectivesReview   datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"objectives_review"`
	NewObjectives      datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"new_objectives"`
	CompetencyRatings  datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"competency_ratings"`
	TrainingNeeds      datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"training_needs"`
	Notes              string         `json:"notes"`
	DevelopmentGoals   string         `json:"development_goals"` // legacy string
	Goals              datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"goals"` // new json array
	StaffComments      string         `json:"staff_comments"`
	EmployeeComments   string         `json:"employee_comments"` // mapped from frontend
	ReviewerComments   string         `json:"reviewer_comments"`
	Outcome            string         `json:"outcome"`
	AcknowledgedDate   string         `json:"acknowledged_date"`
	NextAppraisalDate  string         `json:"next_appraisal_date"`
	Status             string         `gorm:"default:'draft'" json:"status"` // draft|completed|acknowledged
	
	// Detailed appraisal fields from frontend
	AppraisalType      string         `gorm:"default:'annual'" json:"appraisal_type"`
	PeriodStart        string         `json:"period_start"`
	PeriodEnd          string         `json:"period_end"`
	CompetencyScores   datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"competency_scores"`
	EvidenceSnapshot   datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"evidence_snapshot"`
	SuggestedOutcome   string         `json:"suggested_outcome"`
	SuggestedRating    int            `json:"suggested_rating"`
	RollingScore       float64        `json:"rolling_score"`
	FeedbackSummary    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"feedback_summary"`
	AppraiserSigned    bool           `json:"appraiser_signed"`
	AppraiserSignedAt  *time.Time     `json:"appraiser_signed_at"`
	AppraiseeSigned    bool           `json:"appraisee_signed"`
	AppraiseeSignedAt  *time.Time     `json:"appraisee_signed_at"`
	ReviewedBy         string         `json:"reviewed_by"`
	ReviewedAt         *time.Time     `json:"reviewed_at"`
	SelfAssessment     datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"self_assessment"`
	ImprovementPlan    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"improvement_plan"`
}

// ── Performance Goals ─────────────────────────────────────────────────────────

type PerformanceGoal struct {
	Base
	StaffID       string         `gorm:"not null;index" json:"staff_id"`
	StaffName     string         `json:"staff_name"`
	HomeID        string         `gorm:"index" json:"home_id"`
	Title         string         `gorm:"not null" json:"title"`
	Description   string         `json:"description"`
	Category      string         `gorm:"default:'personal_development'" json:"category"` // personal_development|care_quality|training|leadership|other
	TargetDate    string         `json:"target_date"`
	Status        string         `gorm:"default:'not_started'" json:"status"` // not_started|in_progress|achieved|deferred|cancelled
	Progress      int            `gorm:"default:0" json:"progress"`           // 0–100
	ProgressNotes datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"progress_notes"`
	SetBy         string         `gorm:"default:'self'" json:"set_by"` // self|manager
	SetByID       string         `gorm:"index" json:"set_by_id"`
	SetByName     string         `json:"set_by_name"`
	ReviewDate    string         `json:"review_date"`
	AchievedDate  string         `json:"achieved_date"`
}

// ── Self Assessments ──────────────────────────────────────────────────────────

type SelfAssessment struct {
	Base
	StaffID             string `gorm:"not null;index" json:"staff_id"`
	StaffName           string `json:"staff_name"`
	HomeID              string `gorm:"index" json:"home_id"`
	PeriodStart         string `json:"period_start"`
	PeriodEnd           string `json:"period_end"`
	Strengths           string `json:"strengths"`
	AreasForDevelopment string `json:"areas_for_development"`
	Achievements        string `json:"achievements"`
	TrainingRequests    string `json:"training_requests"`
	SupportNeeded       string `json:"support_needed"`
	OverallSelfRating   string `gorm:"default:'good'" json:"overall_self_rating"` // outstanding|good|requires_improvement
	SubmittedDate       string `json:"submitted_date"`
	Status              string `gorm:"default:'draft'" json:"status"` // draft|submitted
	LinkedAppraisalID   string `gorm:"index" json:"linked_appraisal_id"`
}

// ── Performance Improvement Plans ────────────────────────────────────────────

// PerformancePIP is a formal, time-bound improvement plan raised by a manager
// when a staff member's performance falls below an acceptable level.
// Confidential — visible only to the involved manager, HR, and Admin.
type PerformancePIP struct {
	Base
	StaffID        string         `gorm:"not null;index" json:"staff_id"`
	StaffName      string         `json:"staff_name"`
	HomeID         string         `gorm:"index" json:"home_id"`
	CreatedByID    string         `gorm:"not null;index" json:"created_by_id"`
	CreatedByName  string         `json:"created_by_name"`
	StartDate      string         `gorm:"not null" json:"start_date"`
	ReviewDate     string         `json:"review_date"`
	EndDate        string         `json:"end_date"`
	Reason         string         `gorm:"type:text" json:"reason"`
	SupportOffered string         `gorm:"type:text" json:"support_offered"`
	// Targets: [{description, metric, target_value}]
	Targets    datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"targets"`
	// Milestones: [{date, description, met: bool}]
	Milestones datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"milestones"`
	Status         string         `gorm:"default:'active';index" json:"status"` // active|completed|escalated|withdrawn
	Outcome        string         `gorm:"type:text" json:"outcome"`
	HRReviewed     bool           `gorm:"default:false" json:"hr_reviewed"`
	HRReviewedByID string         `json:"hr_reviewed_by_id"`
	Confidential   bool           `gorm:"default:true" json:"confidential"`
}

// ── Disciplinary & Grievance ──────────────────────────────────────────────────

type DisciplinaryRecord struct {
	Base
	StaffID           string `gorm:"not null;index" json:"staff_id"`
	StaffName         string `json:"staff_name"`
	IssuedBy          string `json:"issued_by"`
	IssuedByName      string `json:"issued_by_name"`
	RecordType        string `gorm:"default:'disciplinary'" json:"record_type"` // disciplinary|grievance
	IncidentDate      string `json:"incident_date"`
	DisciplinaryType  string `json:"disciplinary_type"` // informal|verbal_warning|written_warning|final_warning|dismissal
	IncidentSummary   string `json:"incident_summary"`
	Outcome           string `json:"outcome"`
	Witnesses         string `json:"witnesses"`
	PolicyClause      string `json:"policy_clause"`
	ReviewDate        string `json:"review_date"`
	StatusStage       string `gorm:"default:'Issued'" json:"status_stage"`
	Confidential      bool   `gorm:"default:true" json:"confidential"`
	// Grievance-specific fields
	Nature            string `json:"nature"`
	Investigator      string `json:"investigator"`
	GrievanceOutcome  string `json:"grievance_outcome"`
	ResolutionActions string `json:"resolution_actions"`
	ResolvedBy        string `json:"resolved_by"`
	ResolutionDate    string `json:"resolution_date"`
}

// ── Training ──────────────────────────────────────────────────────────────────

type TrainingRequirement struct {
	Base
	CourseName    string         `json:"course_name"`
	Category      string         `json:"category"`
	HomeTypes     pq.StringArray `gorm:"type:text[]" json:"home_types"`
	Roles         pq.StringArray `gorm:"type:text[]" json:"roles"`
	ExpiryMonths  int            `json:"expiry_months"` // 0 = no expiry
	IsMandatory   bool           `gorm:"default:true" json:"is_mandatory"`
	Mandatory     string         `json:"mandatory"` // "Mandatory for all" | "Role-specific" | "Optional"
	IsActive      bool           `gorm:"default:true" json:"is_active"`
	DisplayOrder  int            `json:"display_order"`
	Notes         string         `json:"notes"`
	Provider      string         `json:"provider"`
	DurationHours float64        `json:"duration_hours"`
}

type TrainingRecord struct {
	Base
	StaffID        string  `gorm:"not null;index" json:"staff_id"`
	StaffName      string  `json:"staff_name"`
	RequirementID          string     `gorm:"index" json:"requirement_id"`
	CourseID               string     `gorm:"index" json:"course_id"`
	CourseName             string     `json:"course_name"`
	Title                  string     `gorm:"not null" json:"title"`
	Category               string     `json:"category"`
	CompletionDate         string     `json:"completion_date"`
	ExpiryDate             string     `json:"expiry_date"`
	Provider               string     `json:"provider"`
	Score                  float64    `json:"score"`
	QuizPassed             bool       `gorm:"default:false" json:"quiz_passed"`
	QuizPassedDate         *time.Time `json:"quiz_passed_date"`
	QuizScore              float64    `json:"quiz_score"`
	PolicyAcknowledged     bool       `gorm:"default:false" json:"policy_acknowledged"`
	PolicyAcknowledgedDate *time.Time `json:"policy_acknowledged_date"`
	Status                 string     `gorm:"default:'completed'" json:"status"` // completed|expired|scheduled|failed
	CertificateURL         string     `json:"certificate_url"`
	Notes                  string     `json:"notes"`
	HomeID                 string     `gorm:"index" json:"home_id"`
}

// ── Expenses ──────────────────────────────────────────────────────────────────

type StaffExpense struct {
	Base
	Title           string     `json:"title"`
	StaffID         string     `gorm:"not null;index" json:"staff_id"`
	StaffName       string     `json:"staff_name"`
	HomeID          string     `gorm:"index" json:"home_id"`
	TimesheetID     string     `gorm:"index" json:"timesheet_id"`
	PayslipID       string     `gorm:"index" json:"payslip_id"`
	ExpenseDate     string     `json:"expense_date"`
	Category        string     `json:"category"` // mileage|food|accommodation|equipment|other
	Description     string     `json:"description"`
	Amount          float64    `json:"amount"`
	Mileage         float64    `json:"mileage"`
	MileageRate     float64    `json:"mileage_rate"`
	ReceiptURL      string     `json:"receipt_url"`
	Status          string     `gorm:"default:'pending'" json:"status"` // pending|approved|rejected|paid
	ApprovedBy      string     `json:"approved_by"`
	ApprovedAt      *time.Time `json:"approved_at"`
	ReviewedAt      *time.Time `json:"reviewed_at"`
	RejectionReason string     `json:"rejection_reason"`
}

// ── Wellbeing ─────────────────────────────────────────────────────────────────

type WellbeingCheckIn struct {
	Base
	StaffID        *string `gorm:"index" json:"staff_id"`
	StaffName      string  `json:"staff_name"`
	HomeID         string  `gorm:"index" json:"home_id"`
	Month          string  `gorm:"index" json:"month"` // e.g., "2023-10"
	MoodRating     int     `json:"mood_rating"`        // 1-5
	WorkloadRating int     `json:"workload_rating"`    // 1-5
	SupportRating  int     `json:"support_rating"`     // 1-5
	Notes          string  `json:"notes"`
	ActionRequired bool    `gorm:"default:false" json:"action_required"`
	ActionTaken    string  `json:"action_taken"`
}

type ReturnToWorkRecord struct {
	Base
	StaffID             string `gorm:"not null;index" json:"staff_id"`
	StaffName           string `json:"staff_name"`
	ConductedBy         string `json:"conducted_by"`
	ConductedByName     string `json:"conducted_by_name"`
	ReturnDate          string `json:"return_date"`
	AbsenceFrom         string `json:"absence_from"`
	AbsenceTo           string `json:"absence_to"`
	AbsenceReason       string `json:"absence_reason"`
	LeaveRequestID      string `gorm:"index" json:"leave_request_id"`
	HealthDeclaration   bool   `gorm:"default:false" json:"health_declaration"`
	AdjustmentsRequired bool   `gorm:"default:false" json:"adjustments_required"`
	AdjustmentsDetails  string `json:"adjustments_details"`
	Notes               string `json:"notes"`
}

// ── Documents & Contracts ─────────────────────────────────────────────────────

type StaffDocument struct {
	Base
	StaffID       string     `gorm:"not null;index" json:"staff_id"`
	StaffName     string     `json:"staff_name"`
	DocumentType  string     `json:"document_type"` // employment_contract|dbs|rtw|training_cert|id|appraisal|other
	Title         string     `gorm:"not null" json:"title"`
	FileURL       string     `json:"file_url"`
	ExpiryDate    string     `json:"expiry_date"`
	IssuedDate    string     `json:"issued_date"`
	Notes         string     `json:"notes"`
	SignedAt      *time.Time `json:"signed_at"`
	SignedBy      string     `json:"signed_by"`
	VersionNumber string     `json:"version_number"`
	IsActive      bool       `gorm:"default:true" json:"is_active"`
}

type ContractTemplate struct {
	Base
	Name         string         `gorm:"not null" json:"name"`
	ContractType string         `json:"contract_type"` // full_time|part_time|bank|zero_hours|agency
	Description  string         `json:"description"`
	Content      string         `gorm:"type:text" json:"content"` // HTML body with {{variables}}
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	Variables    datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"variables"` // [{key, label}]
}

// ── Vacancies ─────────────────────────────────────────────────────────────────

type Vacancy struct {
	Base
	// Role
	VacancyRole    string `json:"vacancy_role"`
	IsSupportRole  bool   `gorm:"default:true" json:"is_support_role"`
	NumberOfPosts  int    `gorm:"default:1" json:"number_of_posts"`
	EmploymentType string `gorm:"default:'permanent'" json:"employment_type"` // permanent|fixed_term|temporary
	// Location & service
	HomeID                string `gorm:"index" json:"home_id"`
	HomeName              string `json:"home_name"`
	ServiceType           string `gorm:"default:'twenty_four_hours'" json:"service_type"`         // outreach|eighteen_plus|twenty_four_hours
	AccommodationCategory string `gorm:"default:'self_contained'" json:"accommodation_category"` // self_contained|shared_ring_fenced|shared_non_ring_fenced
	// Terms
	ContractHours      float64 `gorm:"default:37.5" json:"contract_hours"`
	PayType            string  `gorm:"default:'salary'" json:"pay_type"` // salary|hourly
	SalaryOrHourlyRate float64 `json:"salary_or_hourly_rate"`
	// Vacancy details
	VacancyOpenedDate     string `gorm:"index" json:"vacancy_opened_date"`
	TargetStartDate       string `json:"target_start_date"`
	ReasonForVacancy      string `gorm:"default:'replacement'" json:"reason_for_vacancy"` // new_post|replacement|maternity_cover|expansion|restructure|other
	ReasonDetails         string `json:"reason_details"`
	RecruitingManagerID   string `json:"recruiting_manager_id"`
	RecruitingManagerName string `json:"recruiting_manager_name"`
	Status                string `gorm:"default:'open';index" json:"status"` // open|on_hold|filled|cancelled
	Notes                 string `json:"notes"`
	// Tracking counters
	ApplicationsReceived int `gorm:"default:0" json:"applications_received"`
	InterviewsScheduled  int `gorm:"default:0" json:"interviews_scheduled"`
}

// ── Agency & Bank Staff Usage ─────────────────────────────────────────────────

type AgencyBankStaffUsage struct {
	Base
	// Worker details
	WorkerNameOrReference  string `json:"worker_name_or_reference"`
	AgencyBankType         string `gorm:"index" json:"agency_bank_type"`          // agency|bank|temporary
	AgencyOrganisationName string `json:"agency_organisation_name"`
	Role                   string `json:"role"`
	IsSupportRole          bool   `gorm:"default:true" json:"is_support_role"`
	// Shift details
	UsageDate             string  `gorm:"index" json:"usage_date"`
	ShiftHomeID           string  `gorm:"index" json:"shift_home_id"`
	ShiftHomeName         string  `json:"shift_home_name"`
	ServiceType           string  `gorm:"default:'twenty_four_hours'" json:"service_type"`         // outreach|eighteen_plus|twenty_four_hours
	AccommodationCategory string  `gorm:"default:'self_contained'" json:"accommodation_category"` // self_contained|shared_ring_fenced|shared_non_ring_fenced
	ShiftStartTime        string  `json:"shift_start_time"`
	ShiftEndTime          string  `json:"shift_end_time"`
	HoursWorked           float64 `gorm:"default:8" json:"hours_worked"`
	ReasonUsed            string  `gorm:"default:'staff_absence'" json:"reason_used"` // staff_absence|vacancy_cover|peak_demand|specialist_skill|maternity_cover|other
	// Cost & notes
	CostPerHour *float64 `json:"cost_per_hour"`
	Notes       string   `json:"notes"`
	// Status
	Status      string   `gorm:"default:'pending';index" json:"status"` // pending|active
}

// ── HR Policy Assignments ─────────────────────────────────────────────────────

type HRPolicyStaffAssignment struct {
	Base
	PolicyID                string     `gorm:"not null;index" json:"policy_id"`
	PolicyTitle             string     `json:"policy_title"`
	StaffID                 string     `gorm:"not null;index" json:"staff_id"`
	StaffName               string     `json:"staff_name"`
	AssignedBy              string     `json:"assigned_by"`
	AssignedAt              string     `json:"assigned_at"`
	AcknowledgedAt          *time.Time `json:"acknowledged_at"`
	SignedAt                *time.Time `json:"signed_at"`
	Status                  string     `gorm:"default:'Assigned'" json:"status"` // sent|acknowledged|signed etc.
	AssignmentBatchID       string     `gorm:"index" json:"assignment_batch_id"`
	AssignmentName          string     `json:"assignment_name"`
	AssignmentScope         string     `json:"assignment_scope"`
	PolicyVersionID         string     `json:"policy_version_id"`
	PolicyVersionNumber     string     `json:"policy_version_number"`
	StaffRole               string     `json:"staff_role"`
	StaffDepartment         string     `json:"staff_department"`
	StaffHomeID             string     `json:"staff_home_id"`
	StaffHomeName           string     `json:"staff_home_name"`
	AssignedByStaffID       string     `json:"assigned_by_staff_id"`
	AssignedByName          string     `json:"assigned_by_name"`
	DueDate                 *time.Time    `json:"due_date"`
	ViewedAt                *time.Time `json:"viewed_at"`
	AcknowledgementRequired bool       `gorm:"default:true" json:"acknowledgement_required"`
	AcknowledgementText     string     `json:"acknowledgement_text"`
	ExemptedAt              *time.Time `json:"exempted_at"`
	ExemptedByStaffID       string     `json:"exempted_by_staff_id"`
	ExemptionReason         string     `json:"exemption_reason"`
	LastReminderSentAt      *time.Time `json:"last_reminder_sent_at"`
	ReminderCount           int        `gorm:"default:0" json:"reminder_count"`
	FileURL                 string     `json:"file_url"`
	FileName                string     `json:"file_name"`
}

// ── Policies & Warnings ───────────────────────────────────────────────────────

type ChildProtectionPolicy struct {
	Base
	Title                string         `gorm:"type:varchar(255)" json:"title"`
	PolicyType           string         `gorm:"type:varchar(100);index" json:"policy_type"` // e.g., 'behaviour_management', 'safeguarding'
	Description          string         `gorm:"type:text" json:"description"`
	Content              datatypes.JSON `json:"content"`
	VersionNumber        string         `gorm:"type:varchar(50)" json:"version_number"`
	EffectiveDate        string         `gorm:"type:varchar(50)" json:"effective_date"`
	ReviewDate           string         `gorm:"type:varchar(50)" json:"review_date"`
	Status               string         `gorm:"type:varchar(50);default:'active'" json:"status"`
	DocumentURL          string         `gorm:"type:text" json:"document_url"`
	DocumentFileName     string         `gorm:"type:varchar(255)" json:"document_file_name"`
	DocumentUploadedAt   *time.Time     `json:"document_uploaded_at"`
	DocumentUploadedByID string         `gorm:"type:varchar(100)" json:"document_uploaded_by_id"`
	PreparedByID         string         `gorm:"type:varchar(100)" json:"prepared_by_id"`
	PreparedByName       string         `gorm:"type:varchar(255)" json:"prepared_by_name"`
	PreparedAt           *time.Time     `json:"prepared_at"`
	ReviewedByID         string         `gorm:"type:varchar(100)" json:"reviewed_by_id"`
	ReviewedByName       string         `gorm:"type:varchar(255)" json:"reviewed_by_name"`
	ReviewedAt           *time.Time     `json:"reviewed_at"`
	ApprovedByID         string         `gorm:"type:varchar(100)" json:"approved_by_id"`
	ApprovedByName       string         `gorm:"type:varchar(255)" json:"approved_by_name"`
	ApprovedAt           *time.Time     `json:"approved_at"`
	SupersededAt         *time.Time     `json:"superseded_at"`
	PreviousVersionID    *string        `gorm:"type:uuid" json:"previous_version_id"`
}

type PolicyAcknowledgement struct {
	Base
	PolicyID       string     `gorm:"type:uuid;index" json:"policy_id"`
	PolicyType     string     `gorm:"type:varchar(100);index" json:"policy_type"`
	PolicyName     string     `gorm:"type:varchar(255)" json:"policy_name"`
	StaffID        string     `gorm:"type:uuid;index" json:"staff_id"`
	Status         string     `gorm:"type:varchar(50);default:'pending'" json:"status"` // pending|acknowledged|overdue
	AcknowledgedAt *time.Time `json:"acknowledged_at"`
}

type WarningLetter struct {
	Base
	HomeID      string `gorm:"type:varchar(100);index" json:"home_id"`
	StaffID     string `gorm:"type:uuid;index" json:"staff_id"`
	Reason      string `gorm:"type:text" json:"reason"`
	IssuedDate  string `gorm:"type:varchar(100)" json:"issued_date"`
	Status      string `gorm:"type:varchar(50);default:'active'" json:"status"`
	DocumentURL string `gorm:"type:text" json:"document_url"`
}

type HRPolicy struct {
	Base
	PolicyTitle             string `json:"policy_title"`
	PolicyCode              string `json:"policy_code"`
	PolicyType              string `json:"policy_type"`
	Category                string `json:"category"`
	Status                  string `json:"status"` // Active, Draft, Archived
	Description             string `json:"description"`
	Notes                   string `json:"notes"`
	RequiresAcknowledgement bool   `json:"requires_acknowledgement"`
	OwnerDepartment         string `json:"owner_department"`
	EffectiveDate           *time.Time `json:"effective_date"`
	ReviewDate              *time.Time `json:"review_date"`
	ExpiryDate              *time.Time `json:"expiry_date"`
	CurrentVersionNumber    string `json:"current_version_number"`
	CurrentFileUrl          string `json:"current_file_url"`
	CurrentFileName         string `json:"current_file_name"`
	CreatedByStaffId        string `json:"created_by_staff_id"`
	CreatedByName           string `json:"created_by_name"`
}

type HRPolicyVersion struct {
	Base
	PolicyID          string `gorm:"index" json:"policy_id"`
	PolicyTitle       string `json:"policy_title"`
	VersionNumber     string `json:"version_number"`
	FileUrl           string `json:"file_url"`
	FileName          string `json:"file_name"`
	FileType          string `json:"file_type"`
	UploadedByStaffId string `json:"uploaded_by_staff_id"`
	UploadedByName    string `json:"uploaded_by_name"`
	EffectiveDate     *time.Time `json:"effective_date"`
	ReviewDate        *time.Time `json:"review_date"`
	ExpiryDate        *time.Time `json:"expiry_date"`
	Status            string `json:"status"`
}

type HRPolicyActivityEvent struct {
	Base
	EventType          string `json:"event_type"`
	EventTitle         string `json:"event_title"`
	EventDescription   string `json:"event_description"`
	PolicyID           string `gorm:"index" json:"policy_id"`
	PolicyTitle        string `json:"policy_title"`
	PerformedByStaffId string `json:"performed_by_staff_id"`
	PerformedByName    string `json:"performed_by_name"`
	EventDate          *time.Time `json:"event_date"`
}

// ── Policy Quizzes ────────────────────────────────────────────────────────────

type PolicyQuizResult struct {
	Base
	QuizID          string         `gorm:"index" json:"quiz_id"`
	QuizTitle       string         `json:"quiz_title"`
	StaffID         string         `gorm:"index" json:"staff_id"`
	StaffName       string         `json:"staff_name"`
	StaffRole       string         `json:"staff_role"`
	AssignedByID    string         `json:"assigned_by_id"`
	AssignedByName  string         `json:"assigned_by_name"`
	Score           int            `json:"score"`
	CorrectAnswers  int            `json:"correct_answers"`
	TotalQuestions  int            `json:"total_questions"`
	Passed          bool           `json:"passed"`
	PassThreshold   int            `json:"pass_threshold"`
	Answers         datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"answers"`
	CompletedAt     *time.Time     `json:"completed_at"`
	AttemptNumber   int            `json:"attempt_number"`
	Status          string         `gorm:"default:'assigned'" json:"status"` // assigned|completed
}
