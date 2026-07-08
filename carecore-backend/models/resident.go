package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

// Resident represents a Young Person placed in a care home.
// Fields are grouped by domain: identity, placement, health, education, finance, leisure.
type Resident struct {
	Base

	// ── Placement & Identity ──────────────────────────────────────────────────
	HomeID        string         `gorm:"index" json:"home_id"`
	KeyWorkerID   string         `json:"key_worker_id"`
	TeamLeaderID  string         `json:"team_leader_id"`
	DisplayName   string         `gorm:"not null" json:"display_name"`
	Initials      string         `json:"initials"`
	PrivacyMode   bool           `gorm:"default:false" json:"privacy_mode"`
	DOB           *time.Time     `json:"dob"`
	Gender        string         `json:"gender"`
	Ethnicity     string         `json:"ethnicity"`
	Nationality   string         `json:"nationality"`
	Religion      string         `json:"religion"`
	Language      string         `gorm:"default:'en'" json:"language"`
	LegalStatus   string         `json:"legal_status"` // looked_after|remand|section_20|section_31|etc.
	PlacementStart *time.Time    `json:"placement_start"`
	PlacementType string         `json:"placement_type"` // childrens_home|supported_accommodation|adult_care
	PlacementEnd  *time.Time     `json:"placement_end"`
	Address       string         `json:"address"`
	RiskLevel     string         `gorm:"default:'low'" json:"risk_level"` // low|medium|high|critical
	Status        string         `gorm:"default:'active'" json:"status"`  // active|on_leave|moved_on|archived
	PhotoURL      string         `json:"photo_url"`
	ShortNotes    string         `json:"short_notes"`
	FamilyContacts datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"family_contacts"`

	// ── Placement Legal Details ───────────────────────────────────────────────
	ServiceType            string     `json:"service_type"`             // outreach|eighteen_plus|twenty_four_hours
	AccommodationCategory  string     `json:"accommodation_category"`   // self_contained|shared_ring_fenced|shared_non_ring_fenced
	LookedAfterChild       bool       `gorm:"default:false" json:"looked_after_child"`
	CareLeaverStatus       bool       `gorm:"default:false" json:"care_leaver_status"`
	LegalPlacementBasis    string     `json:"legal_placement_basis"`
	PlacingLocalAuthority  string     `json:"placing_local_authority"`
	UASC                   bool       `gorm:"default:false" json:"uasc"`
	EnglishFirstLanguage   bool       `gorm:"default:true" json:"english_first_language"`
	FirstLanguage          string     `json:"first_language"`
	InterpreterRequired    bool       `gorm:"default:false" json:"interpreter_required"`
	AnnexAApplicable       bool       `gorm:"default:false" json:"annex_a_applicable"`
	UKArrivalDate          *time.Time `json:"uk_arrival_date"`

	// Visit frequency
	ContractedVisitsPerWeek     int    `json:"contracted_visits_per_week"`
	MinContactHoursPerWeek      int    `json:"minimum_contact_hours_per_week"`
	VisitFrequencyNotes         string `json:"visit_frequency_notes"`

	// ── Social Worker / IRO / PA ──────────────────────────────────────────────
	SocialWorkerName  string `json:"social_worker_name"`
	SocialWorkerOrg   string `json:"social_worker_org"`
	SocialWorkerPhone string `json:"social_worker_phone"`
	SocialWorkerEmail string `json:"social_worker_email"`
	IROName           string `json:"iro_name"`
	IROContact        string `json:"iro_contact"`
	PAName            string `json:"pa_name"`
	PAContact         string `json:"pa_contact"`

	// ── Health & Medical ──────────────────────────────────────────────────────
	NHSNumber        string         `json:"nhs_number"`
	Allergies        datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"allergies"`          // [{allergen, severity, notes}]
	MedicalConditions datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"medical_conditions"` // [{condition, diagnosed_date, notes}]
	HealthNotes      string         `json:"health_notes"`
	HealthUpdatedAt  *time.Time     `json:"health_updated_at"`

	// GP
	GPName           string     `json:"gp_name"`
	GPPractice       string     `json:"gp_practice"`
	GPAddress        string     `json:"gp_address"`
	GPPhone          string     `json:"gp_phone"`
	GPEmail          string     `json:"gp_email"`
	GPRegisteredDate *time.Time `json:"gp_registered_date"`

	// Dentist
	DentistName             string `json:"dentist_name"`
	DentistPractice         string `json:"dentist_practice"`
	DentistAddress          string `json:"dentist_address"`
	DentistPhone            string `json:"dentist_phone"`
	DentistLastAppointment  string `json:"dentist_last_appointment"`
	DentistNextAppointment  string `json:"dentist_next_appointment"`

	// Optician
	OpticianName            string `json:"optician_name"`
	OpticianPractice        string `json:"optician_practice"`
	OpticianAddress         string `json:"optician_address"`
	OpticianPhone           string `json:"optician_phone"`
	OpticianLastAppointment string `json:"optician_last_appointment"`
	OpticianNextAppointment string `json:"optician_next_appointment"`
	OpticianNeedsGlasses    bool   `gorm:"default:false" json:"optician_needs_glasses"`

	// ── Education & Training ──────────────────────────────────────────────────
	EducationStatus          string         `json:"education_status"` // in_school|in_college|neet|training|employed|other
	EducationProvider        string         `json:"education_provider"`
	EducationCourse          string         `json:"education_course"`
	EducationEnrolmentDate   *time.Time     `json:"education_enrolment_date"`
	EducationExpectedEndDate *time.Time     `json:"education_expected_end_date"`
	EducationDaysAttended    pq.StringArray `gorm:"type:text[]" json:"education_days_attended"` // [Monday, Tuesday, ...]
	EducationContactName     string         `json:"education_contact_name"`
	EducationContactPhone    string         `json:"education_contact_phone"`
	EducationContactEmail    string         `json:"education_contact_email"`
	EducationNotes           string         `json:"education_notes"`
	EducationUpdatedAt       *time.Time     `json:"education_updated_at"`

	// ── Finance & Legal ───────────────────────────────────────────────────────
	BankAccountName  string `json:"bank_account_name"`
	BankName         string `json:"bank_name"`
	BankSortCode     string `json:"bank_sort_code"`
	BankAccountNumber string `json:"bank_account_number"`
	BankNotes        string `json:"bank_notes"`

	SolicitorName    string `json:"solicitor_name"`
	SolicitorFirm    string `json:"solicitor_firm"`
	SolicitorPhone   string `json:"solicitor_phone"`
	SolicitorEmail   string `json:"solicitor_email"`
	SolicitorAddress string `json:"solicitor_address"`
	SolicitorCaseRef string `json:"solicitor_case_ref"`
	SolicitorNotes   string `json:"solicitor_notes"`

	// ── Leisure & Interests ───────────────────────────────────────────────────
	LeisureGymEnrolled              bool           `gorm:"default:false" json:"leisure_gym_enrolled"`
	LeisureGymName                  string         `json:"leisure_gym_name"`
	LeisureGymNotes                 string         `json:"leisure_gym_notes"`
	LeisureGymMembershipExpiry      string         `json:"leisure_gym_membership_expiry"`
	LeisureLeisureCentreEnrolled    bool           `gorm:"default:false" json:"leisure_leisure_centre_enrolled"`
	LeisureLeisureCentre            string         `json:"leisure_leisure_centre"`
	LeisureFootballEnrolled         bool           `gorm:"default:false" json:"leisure_football_enrolled"`
	LeisureFootballClub             string         `json:"leisure_football_club"`
	LeisureOtherClubs               datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"leisure_other_clubs"`
	LeisureInterests                string         `json:"leisure_interests"`
	LeisureNotes                    string         `json:"leisure_notes"`
	LeisureUpdatedAt                *time.Time     `json:"leisure_updated_at"`
}

type ResidentAllowance struct {
	Base
	ResidentID    string `gorm:"not null;index" json:"resident_id"`
	WeeklyAmount  float64 `json:"weekly_amount"`
	PaymentDay    string  `json:"payment_day"`
	PaymentMethod string  `json:"payment_method"`
	Status        string  `gorm:"default:'active'" json:"status"`
}

type ResidentSavings struct {
	Base
	ResidentID        string  `gorm:"not null;index" json:"resident_id"`
	Balance           float64 `json:"balance"`
	TargetAmount      float64 `json:"target_amount"`
	TargetDescription string  `json:"target_description"`
	Status            string  `gorm:"default:'active'" json:"status"`
}

type ResidentSavingsTransaction struct {
	Base
	ResidentID      string  `gorm:"not null;index" json:"resident_id"`
	SavingsID       string  `gorm:"not null;index" json:"savings_id"`
	TransactionType string  `json:"transaction_type"` // deposit|withdrawal
	Amount          float64 `json:"amount"`
	Description     string  `json:"description"`
	RecordedBy      string  `json:"recorded_by"`
}