package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

type StaffProfile struct {
	Base
	// FIX: removed "not null" — user_id is a placeholder UUID until the staff
	// member is formally invited and an AuthUser record is created for them.
	// Back-fill with the real AuthUser.id when the invite flow is complete.
	UserID                       string         `gorm:"index" json:"user_id"`
	FullName                     string         `gorm:"not null" json:"full_name"`
	PreferredName                string         `json:"preferred_name"`
	Email                        string         `gorm:"index" json:"email"`
	EmployeeID                   string         `json:"employee_id"`
	Role                         string         `gorm:"default:'support_worker'" json:"role"` // admin|team_leader|support_worker|compliance_manager
	Department                  string         `json:"department"` // outreach|24_hours|18_plus|finance|hr_admin|maintenance|bank_staff
	DOB                          *time.Time     `json:"dob"`
	Gender                       string         `json:"gender"`
	Nationality                  string         `json:"nationality"`
	Address                      string         `json:"address"`
	EmergencyContactName         string         `json:"emergency_contact_name"`
	EmergencyContactPhone        string         `json:"emergency_contact_phone"`
	EmergencyContactRelationship string         `json:"emergency_contact_relationship"`
	JobTitle                     string         `json:"job_title"`
	ContractType                 string         `json:"contract_type"`
	TeamLeaderID                 string         `json:"team_leader_id"`
	HomeIDs                      pq.StringArray `gorm:"type:text[]" json:"home_ids"`
	Phone                        string         `json:"phone"`
	EndDate                      *time.Time     `json:"end_date"`
	ProbationEndDate             *time.Time     `json:"probation_end_date"`
	PayType                      string         `json:"pay_type"`
	HourlyRate                   float64        `json:"hourly_rate"`
	AnnualSalary                 float64        `json:"annual_salary"`
	PayFrequency                 string         `json:"pay_frequency"`
	TaxCode                      string         `json:"tax_code"`
	BankSortCode                 string         `json:"bank_sort_code"`
	BankAccountNumber            string         `json:"bank_account_number"`
	NINumber                     string         `json:"ni_number"`
	DBSNumber                    string         `json:"dbs_number"`
	DBSIssueDate                 *time.Time     `json:"dbs_issue_date"`
	DBSExpiry                    *time.Time     `json:"dbs_expiry"`
	DBSType                      string         `json:"dbs_type"`
	RTWChecked                   bool           `gorm:"default:false" json:"rtw_checked"`
	RTWCheckDate                 *time.Time     `json:"rtw_check_date"`
	RTWDocumentType              string         `json:"rtw_document_type"`
	RTWShareCode                 string         `json:"rtw_share_code"`
	RTWExpiryDate                *time.Time     `json:"rtw_expiry_date"`
	RTWFollowUpDate              *time.Time     `json:"rtw_follow_up_date"`
	RTWDocumentURL               string         `json:"rtw_document_url"`
	RTWNotes                     string         `json:"rtw_notes"`
	RTWCheckedBy                 string         `json:"rtw_checked_by"`
	WorkingTimeOptOut            bool           `gorm:"default:false" json:"working_time_opt_out"`
	OptOutSignedDate             *time.Time     `json:"opt_out_signed_date"`
	OptOutDocumentURL            string         `json:"opt_out_document_url"`
	StartDate                    *time.Time     `json:"start_date"`
	Status                       string         `gorm:"default:'pending'" json:"status"` // active|inactive|suspended|pending_approval|rejected
	PhotoURL                     string         `json:"photo_url"`
	Notes                        string         `json:"notes"`
	RejectionReason              string         `json:"rejection_reason"`
	OnboardingChecklist          datatypes.JSON `json:"onboarding_checklist"`
	OffboardingChecklist         datatypes.JSON `json:"offboarding_checklist"`
	AcceptanceLetter             string         `json:"acceptance_letter"`
}

type StaffAvailabilityProfile struct {
	Base
	StaffID                   string         `gorm:"not null;index" json:"staff_id"`
	ContractedHoursPerWeek    float64        `json:"contracted_hours_per_week"`
	EmploymentType            string         `json:"employment_type"` // full_time|part_time|bank|agency|zero_hours
	MaxHoursPerDay            int            `gorm:"default:12" json:"max_hours_per_day"`
	MaxConsecutiveDays        int            `gorm:"default:6" json:"max_consecutive_days"`
	MaxShiftsPerWeek          int            `json:"max_shifts_per_week"`
	MinRestHoursBetweenShifts int            `gorm:"default:11" json:"min_rest_hours_between_shifts"`
	SleepInQualified          bool           `json:"sleep_in_qualified"`
	WakingNightQualified      bool           `json:"waking_night_qualified"`
	FirstAidCertified         bool           `json:"first_aid_certified"`
	FirstAidExpiry            *time.Time     `json:"first_aid_expiry"`
	MedicationTrained         bool           `json:"medication_trained"`
	MedicationTrainingDate    *time.Time     `json:"medication_training_date"`
	MedicationTrainingExpiry  *time.Time     `json:"medication_training_expiry"`
	ManualHandlingTrained     bool           `json:"manual_handling_trained"`
	ManualHandlingExpiry      *time.Time     `json:"manual_handling_expiry"`
	DrivingLicence            bool           `json:"driving_licence"`
	VehicleAvailable          bool           `json:"vehicle_available"`
	SafeguardingTrained       bool           `json:"safeguarding_trained"`
	SafeguardingLevel         string         `json:"safeguarding_level"`
	SafeguardingExpiry        *time.Time     `json:"safeguarding_expiry"`
	PreferredShiftTypes       pq.StringArray `gorm:"type:text[]" json:"preferred_shift_types"`
	UnavailableShiftTypes     pq.StringArray `gorm:"type:text[]" json:"unavailable_shift_types"`
	FixedDaysOff              pq.StringArray `gorm:"type:text[]" json:"fixed_days_off"`
	PreferredDaysOff          pq.StringArray `gorm:"type:text[]" json:"preferred_days_off"`
	Notes                     string         `json:"notes"`
}

type StaffAvailabilityOverride struct {
	Base
	StaffID      string     `gorm:"not null;index" json:"staff_id"`
	OverrideType string     `json:"override_type"` // unavailable|holiday|sick|training|lieu_day
	DateFrom     time.Time  `json:"date_from"`
	DateTo       time.Time  `json:"date_to"`
	AllDay       bool       `gorm:"default:true" json:"all_day"`
	Reason       string     `json:"reason"`
	Approved     bool       `gorm:"default:false" json:"approved"`
	ApprovedBy   string     `json:"approved_by"`
	ApprovedAt   *time.Time `json:"approved_at"`
	SubmittedBy  string     `json:"submitted_by"`
}

type StaffWeeklyAvailability struct {
	Base
	StaffID        string `gorm:"not null;index" json:"staff_id"`
	DayOfWeek      string `gorm:"not null;index" json:"day_of_week"` // monday|tuesday|wednesday|thursday|friday|saturday|sunday
	IsAvailable    bool   `gorm:"default:true" json:"is_available"`
	AvailableFrom  string `json:"available_from"`  // HH:MM format
	AvailableUntil string `json:"available_until"` // HH:MM format
	ShiftTypePref  string `json:"shift_type_pref"` // any|morning|night|none
	Notes          string `json:"notes"`
}

type StaffServiceAssignment struct {
	Base
	StaffID               string `gorm:"not null;index" json:"staff_id"`
	StaffName             string `json:"staff_name"`
	HomeID                string `gorm:"not null;index" json:"home_id"`
	HomeName              string `json:"home_name"`
	ServiceType           string `json:"service_type"`           // outreach|eighteen_plus|twenty_four_hours
	AccommodationCategory string `json:"accommodation_category"` // self_contained|shared_ring_fenced|shared_non_ring_fenced
	AssignmentStartDate   string `json:"assignment_start_date"`
	PrimaryAssignment     bool   `gorm:"default:false" json:"primary_assignment"`
	AllocationPercentage  int    `gorm:"default:100" json:"allocation_percentage"`
	Active                bool   `gorm:"default:true" json:"active"`
}

type StaffMovement struct {
	Base
	StaffID                       string `gorm:"not null;index" json:"staff_id"`
	StaffName                     string `json:"staff_name"`
	StaffRole                     string `json:"staff_role"`
	IsSupportRole                 bool   `json:"is_support_role"`
	MovementType                  string `json:"movement_type"` // new_starter|leaver|role_change|service_reassignment
	MovementDate                  string `json:"movement_date"`
	EmploymentType                string `json:"employment_type"`
	PreviousRole                  string `json:"previous_role"`
	NewRole                       string `json:"new_role"`
	PreviousHomeID                string `json:"previous_home_id"`
	PreviousHomeName              string `json:"previous_home_name"`
	NewHomeID                     string `json:"new_home_id"`
	NewHomeName                   string `json:"new_home_name"`
	AccommodationCategoryAffected string `json:"accommodation_category_affected"`
	Reason                        string `json:"reason"`
}

type StaffPerformance struct {
	Base
	WorkerID                string         `gorm:"not null;uniqueIndex" json:"worker_id"`
	OverallScore            float64        `json:"overall_score"`
	QualityOfWorkScore      float64        `json:"quality_of_work_score"`
	ReliabilityScore        float64        `json:"reliability_score"`
	CommunicationScore      float64        `json:"communication_score"`
	TeamworkScore           float64        `json:"teamwork_score"`
	InitiativeScore         float64        `json:"initiative_score"`
	AttendanceScore         float64        `json:"attendance_score"`
	TrainingComplianceScore float64        `json:"training_compliance_score"`
	PendingReviewsCount     int            `json:"pending_reviews_count"`
	LastReviewDate          *time.Time     `json:"last_review_date"`
	ReviewScore             float64        `json:"review_score"`
	KeyStrengths            pq.StringArray `gorm:"type:text[]" json:"key_strengths"`
	AreasForImprovement     pq.StringArray `gorm:"type:text[]" json:"areas_for_improvement"`
}
