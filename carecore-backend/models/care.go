package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

type DailyChecklist struct {
	Base
	ResidentID string         `gorm:"not null;index" json:"resident_id"`
	Date       string         `gorm:"not null" json:"date"`
	Items      datatypes.JSON `gorm:"type:jsonb" json:"items"`
}

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
	ResidentID          string         `gorm:"not null;index" json:"resident_id"`
	ResidentName        string         `json:"resident_name"`
	HomeID              string         `gorm:"index" json:"home_id"`
	WorkerID            string         `gorm:"not null;index" json:"worker_id"`
	WorkerName          string         `json:"worker_name"`
	Date                string         `gorm:"not null" json:"date"`
	TimeStart           string         `json:"time_start"`
	TimeEnd             string         `json:"time_end"`
	DurationMinutes     int            `json:"duration_minutes"`
	ActionText          string         `json:"action_text"`
	OutcomeText         string         `json:"outcome_text"`
	RecommendationsText string         `json:"recommendations_text"`
	KPIData             datatypes.JSON `gorm:"type:jsonb" json:"kpi_data"`
	DailyLogIDs         pq.StringArray `gorm:"type:text[]" json:"daily_log_ids"`
	IsKeyWorkerSession  bool           `gorm:"default:false" json:"is_key_worker_session"`
	IsDailySummary      bool           `gorm:"default:false" json:"is_daily_summary"`
	Status              string         `gorm:"default:'draft'" json:"status"` // draft|submitted|reviewed|approved
}

type KPIRecord struct {
	Base
	VisitReportID           string         `gorm:"not null;index" json:"visit_report_id"`
	ResidentID              string         `gorm:"not null;index" json:"resident_id"`
	WorkerID                string         `gorm:"not null;index" json:"worker_id"`
	HomeID                  string         `gorm:"not null;index" json:"home_id"`
	Date                    string         `gorm:"not null" json:"date"`
	IsKeyWorkerSession      bool           `gorm:"default:false" json:"is_key_worker_session"`
	IsDailySummary          bool           `gorm:"default:false" json:"is_daily_summary"`
	VisitType               string         `json:"visit_type"`
	Presentation            string         `json:"presentation"`
	PlacementCondition      string         `json:"placement_condition"`
	PrimaryPurpose          string         `json:"primary_purpose"`
	CollegeStatus           string         `json:"college_status"`
	LifeSkills              pq.StringArray `gorm:"type:text[]" json:"life_skills"`
	EngagementLevel         string         `json:"engagement_level"`
	RiskLevel               string         `json:"risk_level"`
	IndependenceProgress    string         `json:"independence_progress"`
	HealthAdherence         string         `json:"health_adherence"`
	AppointmentType         string         `json:"appointment_type"`
	AppointmentDetailsNotes string         `json:"appointment_details_notes"`
}

type SWPerformanceKPI struct {
	Base
	WorkerID             string         `gorm:"not null;index" json:"worker_id"` // stores UUID (fixed from original email bug)
	WorkerName           string         `json:"worker_name"`
	EmployeeID           string         `json:"employee_id"`
	HomeID               string         `gorm:"index" json:"home_id"`
	ResidentID           string         `gorm:"index" json:"resident_id"`
	Date                 string         `gorm:"not null" json:"date"`
	WeekStart            string         `json:"week_start"`
	Month                string         `json:"month"`
	ActivityType         string         `json:"activity_type"`
	SourceEntity         string         `json:"source_entity"`
	SourceID             string         `json:"source_id"`
	HoursWithYP          float64        `json:"hours_with_yp"`
	VisitType            string         `json:"visit_type"`
	EngagementLevel      string         `json:"engagement_level"`
	RiskLevel            string         `json:"risk_level"`
	IndependenceProgress string         `json:"independence_progress"`
	HealthAdherence      string         `json:"health_adherence"`
	LifeSkills           pq.StringArray `gorm:"type:text[]" json:"life_skills"`
	KWSessionCount       int            `json:"kw_session_count"`
	CICReportCount       int            `json:"cic_report_count"`
	SupportPlanCount     int            `json:"support_plan_count"`
	GPAppointmentCount   int            `json:"gp_appointment_count"`
	Notes                string         `json:"notes"`
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
	ReviewedBy    string `json:"reviewed_by"`
	OverallNotes  string `json:"overall_notes"`
}

type ILSPlanSection struct {
	Base
	ILSPlanID          string `gorm:"not null;index" json:"ils_plan_id"`
	ResidentID         string `gorm:"not null;index" json:"resident_id"`
	HomeID             string `gorm:"index" json:"home_id"`
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
	HomeID             string         `gorm:"not null;index" json:"home_id"`
	HomeName           string         `json:"home_name"`
	ReportedByID       string         `json:"reported_by_id"`
	ReportedByName     string         `json:"reported_by_name"`
	ReportedBy         string         `json:"reported_by"`
	ResidentID         string         `gorm:"index" json:"resident_id"`
	ResidentName       string         `json:"resident_name"`
	Type               string         `json:"type"` // accident|illness|near_miss|injury|incident
	Title              string         `json:"title"`
	Date               string         `json:"date"`
	EndDate            string         `json:"end_date"`
	Time               string         `json:"time"`
	Shift              string         `json:"shift"`
	Location           string         `json:"location"`
	Description        string         `json:"description"`
	Injuries           string         `json:"injuries"`
	StaffInvolved      string         `json:"staff_involved"`
	FirstAidGiven      bool           `json:"first_aid_given"`
	FirstAidDetails    string         `json:"first_aid_details"`
	HospitalAttendance bool           `json:"hospital_attendance"`
	WitnessName        string         `json:"witness_name"`
	FollowUpRequired   bool           `json:"follow_up_required"`
	FollowUpNotes      string         `json:"follow_up_notes"`
	Confidential       bool           `gorm:"default:false;index" json:"confidential"`
	SignOffName        string         `json:"sign_off_name"`
	AlertNames         string         `json:"alert_names"`
	Status             string         `gorm:"default:'open'" json:"status"` // open|reviewed|closed|Draft|Submitted
	// Incident-specific fields
	IncidentType    string         `json:"incident_type"`
	BriefDescription string        `json:"brief_description"`
	DetailedAccount string         `json:"detailed_account"`
	PerceivedHarm   string         `json:"perceived_harm"`
	RiskLevel       string         `json:"risk_level"`
	ActionsTaken    datatypes.JSON `gorm:"type:jsonb" json:"actions_taken"`
	Outcome         string         `json:"outcome"`
	ActionNotes     string         `json:"action_notes"`
	Notifications   datatypes.JSON `gorm:"type:jsonb" json:"notifications"`
	PoliceRef       string         `json:"police_ref"`
	Reg40Notes      string         `json:"reg40_notes"`
	ManagerSummary  string         `json:"manager_summary"`
	ReviewedByID    string         `json:"reviewed_by_id"`
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
	ResidentID        string     `gorm:"not null;index" json:"resident_id"`
	MedicationName    string     `gorm:"not null" json:"medication_name"`
	Dosage            string     `json:"dosage"`
	Frequency         string     `json:"frequency"`
	Route             string     `json:"route"`
	PrescribedBy      string     `json:"prescribed_by"`
	PrescriberContact string     `json:"prescriber_contact"`
	StartDate         *time.Time `json:"start_date"`
	EndDate           *time.Time `json:"end_date"`
	ReviewDate        *time.Time `json:"review_date"`
	Status            string     `gorm:"default:'active'" json:"status"` // active|discontinued|paused
	Notes             string     `json:"notes"`
}

type MAREntry struct {
	Base
	ResidentID       string `gorm:"not null;index" json:"resident_id"`
	MedicationID     string `gorm:"not null;index" json:"medication_id"`
	Date             string `json:"date"`
	TimeScheduled    string `json:"time_scheduled"`
	TimeAdministered string `json:"time_administered"`
	AdministeredBy   string `json:"administered_by"`
	Outcome          string `json:"outcome"` // given|refused|missed
	Notes            string `json:"notes"`
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

// Appointment covers all scheduled events for a Young Person:
// medical, educational, legal, social worker visits, IRO reviews, etc.
type Appointment struct {
	Base
	// Core
	ResidentID   string `gorm:"not null;index" json:"resident_id"`
	ResidentName string `json:"resident_name"`
	HomeID       string `gorm:"index" json:"home_id"`
	// appointment_type: gp_appointment|hospital_appointment|dental|optician|mental_health|
	//   social_worker_visit|iro_review|lac_review|court_hearing|school_meeting|college_meeting|
	//   key_worker_session|family_contact|counselling|probation|youth_offending|other
	AppointmentType string     `gorm:"index" json:"appointment_type"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	StartDatetime   *time.Time `json:"start_datetime"`
	EndDatetime     *time.Time `json:"end_datetime"`
	AllDay          bool       `gorm:"default:false" json:"all_day"`
	// status: scheduled|completed|cancelled|did_not_attend
	Status             string `gorm:"default:'scheduled';index" json:"status"`
	CancellationReason string `json:"cancellation_reason"`
	// Location
	Location     string `json:"location"`
	LocationType string `gorm:"default:'in_person'" json:"location_type"` // in_person|online|phone
	// Organiser
	OrganiserID   string `json:"organiser_id"`
	OrganiserName string `json:"organiser_name"`
	// Attendees (stored as JSONB arrays)
	Attendees         datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"attendees"`
	ExternalAttendees datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"external_attendees"`
	// Recurrence
	IsRecurring        bool           `gorm:"default:false" json:"is_recurring"`
	RecurrencePattern  string         `gorm:"default:'none'" json:"recurrence_pattern"` // none|daily|weekly|fortnightly|monthly
	RecurrenceEndDate  string         `json:"recurrence_end_date"`
	CancelledDates     datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"cancelled_dates"`
	// Display
	Colour    string `json:"colour"`
	IsPrivate bool   `gorm:"default:false" json:"is_private"`
	// Reminders
	ReminderMinutesBefore int  `gorm:"default:15" json:"reminder_minutes_before"`
	ReminderSent          bool `gorm:"default:false" json:"reminder_sent"`
	// Follow-up (set at creation)
	FollowUpRequired bool   `gorm:"default:false" json:"follow_up_required"`
	FollowUpNotes    string `json:"follow_up_notes"`
	// Outcome & impact (recorded after the appointment)
	AttendanceStatus    string `gorm:"index" json:"attendance_status"` // attended|missed|cancelled|rearranged
	MissedReason        string `json:"missed_reason"`
	AppointmentOutcome  string `json:"appointment_outcome"`
	ImpactOnYoungPerson string `json:"impact_on_young_person"`
	YpEngagement        string `json:"yp_engagement"` // engaged_well|partially_engaged|refused|anxious|required_staff_support|not_applicable
	OutcomeNotes        string `json:"outcome_notes"`
	// Follow-up (recorded after the appointment)
	NextAppointmentDate   string `json:"next_appointment_date"`
	FollowUpTargetDate    string `json:"follow_up_target_date"`
	ResponsiblePersonID   string `json:"responsible_person_id"`
	ResponsiblePersonName string `json:"responsible_person_name"`
	// Priority flag
	IsPriority     bool   `gorm:"default:false" json:"is_priority"`
	PriorityReason string `json:"priority_reason"`
	// Documents uploaded at outcome
	DocumentTypes datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"document_types"`
	DocumentUrls  datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"document_urls"`
	// Staff comments / manager review
	StaffComment          string `json:"staff_comment"`
	ManagerReviewRequired bool   `gorm:"default:false" json:"manager_review_required"`
	ManagerReviewStatus   string `gorm:"default:'not_required'" json:"manager_review_status"`
	ManagerReviewNote     string `gorm:"type:text" json:"manager_review_note"`
	OutcomeRecordedAt     string `json:"outcome_recorded_at"`
	OutcomeRecordedByID   string `json:"outcome_recorded_by_id"`
	OutcomeRecordedByName string `json:"outcome_recorded_by_name"`
}

// FamilyContact records each instance of contact between a Young Person and their family.
type FamilyContact struct {
	Base
	// Core
	ResidentID   string `gorm:"not null;index" json:"resident_id"`
	ResidentName string `json:"resident_name"`
	HomeID       string `gorm:"index" json:"home_id"`
	// Contact person
	ContactPersonName              string `json:"contact_person_name"`
	ContactPersonRelationship      string `json:"contact_person_relationship"` // mother|father|sibling|grandparent|aunt_uncle|other_family|friend|professional|unknown
	ContactPersonRelationshipOther string `json:"contact_person_relationship_other"`
	// Contact details
	ContactDatetime    string `gorm:"index" json:"contact_datetime"`
	ContactMethod      string `json:"contact_method"`      // phone_call|video_call|in_person_visit|letter|text_message|social_media|other
	ContactInitiatedBy string `json:"contact_initiated_by"` // resident|family|staff|court_order|la_arranged
	DurationMinutes    int    `json:"duration_minutes"`
	Location           string `json:"location"`
	// Supervision & court order
	WasSupervised       bool   `gorm:"default:false" json:"was_supervised"`
	SupervisedByID      string `json:"supervised_by_id"`
	SupervisedByName    string `json:"supervised_by_name"`
	IsCourtOrdered      bool   `gorm:"default:false" json:"is_court_ordered"`
	CourtOrderReference string `json:"court_order_reference"`
	// Resident presentation
	MoodBefore         string `json:"mood_before"` // happy|calm|anxious|distressed|angry|withdrawn|excited|neutral
	MoodAfter          string `json:"mood_after"`
	ResidentEngagement string `json:"resident_engagement"` // positive|neutral|reluctant|refused|distressed
	ResidentComments   string `json:"resident_comments"`
	// Concerns
	AnyConcerns         bool   `gorm:"default:false" json:"any_concerns"`
	ConcernDetails      string `json:"concern_details"`
	SafeguardingConcern bool   `gorm:"default:false" json:"safeguarding_concern"`
	// LA notification
	LaToBeNotified     bool   `gorm:"default:false" json:"la_to_be_notified"`
	LaNotifiedDatetime string `json:"la_notified_datetime"`
	// Review flag
	ContactToBeReviewed bool   `gorm:"default:false" json:"contact_to_be_reviewed"`
	ReviewReason        string `json:"review_reason"`
	// Next contact
	NextContactPlanned  bool   `gorm:"default:false" json:"next_contact_planned"`
	NextContactDatetime string `json:"next_contact_datetime"`
	// Recorded by
	RecordedByID   string `json:"recorded_by_id"`
	RecordedByName string `json:"recorded_by_name"`
	Notes          string `json:"notes"`
}

// PlacementPlan is the statutory placement planning document required from day one of placement.
type PlacementPlan struct {
	Base
	ResidentID                 string         `gorm:"not null;index" json:"resident_id"`
	ResidentName               string         `json:"resident_name"`
	HomeID                     string         `gorm:"index" json:"home_id"`
	HomeName                   string         `json:"home_name"`
	Status                     string         `gorm:"default:'draft'" json:"status"` // draft|active|reviewed|archived
	Version                    int            `gorm:"default:1" json:"version"`
	EffectiveDate              string         `json:"effective_date"`
	ReviewDate                 string         `json:"review_date"`
	ReasonForPlacement         string         `json:"reason_for_placement"`
	PlacementType              string         `json:"placement_type"`
	PlannedDuration            string         `json:"planned_duration"`
	PlannedEndDate             string         `json:"planned_end_date"`
	EmergencyPlacement         bool           `gorm:"default:false" json:"emergency_placement"`
	NumberOfPlacements12Months int            `gorm:"column:number_of_placements_12_months" json:"number_of_placements_12_months"`
	Goals                      datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"goals"`
	RiskOfBreakdown            bool           `gorm:"default:false" json:"risk_of_breakdown"`
	BreakdownRiskNotes         string         `json:"breakdown_risk_notes"`
	ContingencyPlan            string         `json:"contingency_plan"`
	SocialWorkerName           string         `json:"social_worker_name"`
	SocialWorkerContact        string         `json:"social_worker_contact"`
	IROName                    string         `json:"iro_name"`
	IROContact                 string         `json:"iro_contact"`
	LAArea                     string         `json:"la_area"`
	ChildConsulted             bool           `gorm:"default:false" json:"child_consulted"`
	ChildAgrees                bool           `gorm:"default:false" json:"child_agrees"`
	ChildComments              string         `json:"child_comments"`
	ParentConsulted            bool           `gorm:"default:false" json:"parent_consulted"`
	ParentComments             string         `json:"parent_comments"`
	LAagreed                   bool           `gorm:"column:la_agreed;default:false" json:"la_agreed"`
	CreatedByID                string         `json:"created_by_id"`
	CreatedByName              string         `json:"created_by_name"`
	UpdatedAt                  string         `gorm:"type:varchar(100)" json:"updated_at"`
}

// PathwayPlan is the statutory planning document for Young People approaching 16+,
// mapping their route toward independence and life after care.
type PathwayPlan struct {
	Base
	ResidentID      string `gorm:"not null;index" json:"resident_id"`
	ResidentName    string `json:"resident_name"`
	HomeID          string `gorm:"index" json:"home_id"`
	Version         int    `gorm:"default:1" json:"version"`
	// status: draft|active|under_review|archived
	Status          string         `gorm:"default:'draft'" json:"status"`
	EffectiveDate   string         `json:"effective_date"`
	ReviewDueDate   string         `json:"review_due_date"`
	ReviewedDate    string         `json:"reviewed_date"`
	ReviewedBy      string         `json:"reviewed_by"`
	ReviewedByName  string         `json:"reviewed_by_name"`
	// Pathway domain sections stored as JSON for flexibility
	// Each section: {domain, goals, actions, progress_notes, target_date}
	Sections        datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"sections"`
	OverallNotes    string         `json:"overall_notes"`
	YPInvolved      bool           `gorm:"default:false" json:"yp_involved"`
	YPAgreement     string         `json:"yp_agreement"` // agreed|partially_agreed|disagreed
	CreatedBy       string         `json:"created_by_user"`
	CreatedByName   string         `json:"created_by_name"`
	// Statutory Areas (JSON mapped from frontend)
	PersonalAdviserName                string         `json:"personal_adviser_name"`
	PersonalAdviserContact             string         `json:"personal_adviser_contact"`
	HealthAndDevelopment               datatypes.JSON `gorm:"type:jsonb" json:"health_and_development"`
	EducationTrainingEmployment        datatypes.JSON `gorm:"type:jsonb" json:"education_training_employment"`
	FinancialCapability                datatypes.JSON `gorm:"type:jsonb" json:"financial_capability"`
	Accommodation                      datatypes.JSON `gorm:"type:jsonb" json:"accommodation"`
	FamilyAndSocialRelationships       datatypes.JSON `gorm:"type:jsonb" json:"family_and_social_relationships"`
	IdentityAndSelfCare                datatypes.JSON `gorm:"type:jsonb" json:"identity_and_self_care"`
	EmotionalAndBehaviouralDevelopment datatypes.JSON `gorm:"type:jsonb" json:"emotional_and_behavioural_development"`
	ContingencyPlan                    string         `json:"contingency_plan"`
	YoungPersonConsulted               bool           `gorm:"default:false" json:"young_person_consulted"`
	YoungPersonAgrees                  bool           `gorm:"default:false" json:"young_person_agrees"`
	YoungPersonGoals                   string         `json:"young_person_goals"`
	YoungPersonConcerns                string         `json:"young_person_concerns"`
}

// BodyMap records physical marks on a young person's body at a point in time.
// Marks are stored as JSONB: [{id, body_location, body_side, x_position, y_position,
// mark_type, colour, size_cm, description, child_explanation}]
type BodyMap struct {
	Base
	ResidentID                string         `gorm:"not null;index" json:"resident_id"`
	ResidentName              string         `json:"resident_name"`
	HomeID                    string         `gorm:"index" json:"home_id"`
	RecordedByID              string         `json:"recorded_by_id"`
	RecordedByName            string         `json:"recorded_by_name"`
	RecordedDatetime          string         `json:"recorded_datetime"`
	DiscoveryCircumstance     string         `json:"discovery_circumstance"`
	Marks                     datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"marks"`
	ConsistentWithExplanation *bool          `json:"consistent_with_explanation"`
	SafeguardingConcern       bool           `gorm:"default:false" json:"safeguarding_concern"`
	SafeguardingReferralMade  bool           `gorm:"default:false" json:"safeguarding_referral_made"`
	ReferredTo                string         `json:"referred_to"`
	ManagerNotified           bool           `gorm:"default:false" json:"manager_notified"`
	ManagerNotifiedDatetime   string         `json:"manager_notified_datetime"`
	PoliceNotified            bool           `gorm:"default:false" json:"police_notified"`
	Notes                     string         `json:"notes"`
	Status                    string         `gorm:"default:'open';index" json:"status"` // open|reviewed|closed
	ReviewedByID              string         `json:"reviewed_by_id"`
	ReviewedAt                string         `json:"reviewed_at"`
}

// PAVisit represents a Personal Adviser visit
type PAVisit struct {
	Base
	ResidentID               string         `gorm:"not null;index" json:"resident_id"`
	ResidentName             string         `json:"resident_name"`
	HomeID                   string         `gorm:"index" json:"home_id"`
	PADetailsID              string         `json:"pa_details_id"`
	PAName                   string         `json:"pa_name"`
	VisitDate                string         `json:"visit_date"`
	VisitType                string         `json:"visit_type"`
	Location                 string         `json:"location"`
	DurationMinutes          int            `json:"duration_minutes"`
	YoungPersonPresent       bool           `gorm:"default:false" json:"young_person_present"`
	TopicsDiscussed          pq.StringArray `gorm:"type:text[]" json:"topics_discussed"`
	YoungPersonViews         string         `json:"young_person_views"`
	KeyConcerns              string         `json:"key_concerns"`
	ActionsAgreed            string         `json:"actions_agreed"`
	PARecommendations        string         `json:"pa_recommendations"`
	PathwayPlanReviewed      bool           `gorm:"default:false" json:"pathway_plan_reviewed"`
	PathwayPlanUpdateNeeded  bool           `gorm:"default:false" json:"pathway_plan_update_needed"`
	NextVisitDate            string         `json:"next_visit_date"`
	NextVisitType            string         `json:"next_visit_type"`
	Notes                    string         `json:"notes"`
	RecordedByName           string         `json:"recorded_by_name"`
}

// PADetails records the Personal Adviser information for a resident
type PADetails struct {
	Base
	ResidentID         string `gorm:"not null;index" json:"resident_id"`
	HomeID             string `gorm:"index" json:"home_id"`
	PAName             string `json:"pa_name"`
	Organisation       string `json:"organisation"`
	AllocatedDate      string `json:"allocated_date"`
	Email              string `json:"email"`
	Phone              string `json:"phone"`
	LocalAuthority     string `json:"local_authority"`
	AreaDistrict       string `json:"area_district"`
	SocialWorkerName   string `json:"social_worker_name"`
	SocialWorkerEmail  string `json:"social_worker_email"`
	SocialWorkerPhone  string `json:"social_worker_phone"`
	Notes              string `json:"notes"`
}

// LAReview represents a Local Authority Review log
type LAReview struct {
	Base
	ResidentID               string         `gorm:"not null;index" json:"resident_id"`
	ResidentName             string         `json:"resident_name"`
	HomeID                   string         `gorm:"index" json:"home_id"`
	ReviewDate               string         `json:"review_date"`
	ReviewType               string         `json:"review_type"`
	ChairName                string         `json:"chair_name"`
	ChairRole                string         `json:"chair_role"`
	Attendees                pq.StringArray `gorm:"type:text[]" json:"attendees"`
	YoungPersonAttended      bool           `gorm:"default:false" json:"young_person_attended"`
	YoungPersonViewsShared   bool           `gorm:"default:false" json:"young_person_views_shared"`
	KeyDecisions             string         `json:"key_decisions"`
	PathwayPlanUpdated       bool           `gorm:"default:false" json:"pathway_plan_updated"`
	PlacementContinues       bool           `gorm:"default:false" json:"placement_continues"`
	AnyConcernsRaised        bool           `gorm:"default:false" json:"any_concerns_raised"`
	ConcernDetails           string         `json:"concern_details"`
	Actions                  datatypes.JSON `json:"actions"`
	NextReviewDate           string         `json:"next_review_date"`
	Notes                    string         `json:"notes"`
	RecordedByName           string         `json:"recorded_by_name"`
}

// ── Additional Care Records ───────────────────────────────────────────────────

type Allegation struct {
	Base
	ResidentID string `gorm:"type:uuid;index" json:"resident_id"`
	HomeID     string `gorm:"type:varchar(100);index" json:"home_id"`
	Date       string `gorm:"type:varchar(100)" json:"date"`
	Details    string `gorm:"type:text" json:"details"`
	Status     string `gorm:"type:varchar(50);default:'open'" json:"status"`
}

type EducationRecord struct {
	Base
	ResidentID     string `gorm:"type:uuid;index" json:"resident_id"`
	HomeID         string `gorm:"type:varchar(100);index" json:"home_id"`
	Institution    string `gorm:"type:varchar(255)" json:"institution"`
	AttendanceRate int    `json:"attendance_rate"`
	Notes          string `gorm:"type:text" json:"notes"`
}

type HealthProfile struct {
	Base
	ResidentID   string `gorm:"type:uuid;index" json:"resident_id"`
	HomeID       string `gorm:"type:varchar(100);index" json:"home_id"`
	BloodType    string `gorm:"type:varchar(50)" json:"blood_type"`
	Allergies    string `gorm:"type:text" json:"allergies"`
	MedicalNotes string `gorm:"type:text" json:"medical_notes"`
}

type Referral struct {
	Base
	ReferralID                              string         `gorm:"type:varchar(50)" json:"referral_id"`
	HomeID                                  string         `gorm:"type:varchar(100);index" json:"home_id"`
	HomeName                                string         `gorm:"type:varchar(255)" json:"home_name"`
	AccommodationCategory                   string         `gorm:"type:varchar(100)" json:"accommodation_category"`
	ReferredByName                          string         `gorm:"type:varchar(255)" json:"referred_by_name"`
	ReferralDate                            string         `gorm:"type:varchar(100)" json:"referral_date"`
	ReferralType                            string         `gorm:"type:varchar(100)" json:"referral_type"`
	ResidentIDs                             datatypes.JSON `json:"resident_ids"`
	ResidentNames                           datatypes.JSON `json:"resident_names"`
	LocalAuthorityChildrenServicesReferral  bool           `gorm:"default:false" json:"local_authority_children_services_referral"`
	RadicalisationConcern                   bool           `gorm:"default:false" json:"radicalisation_concern"`
	PreventReferral                         bool           `gorm:"default:false" json:"prevent_referral"`
	ReferralDetails                         string         `gorm:"type:text" json:"referral_details"`
	OutcomeStatus                           string         `gorm:"type:varchar(50)" json:"outcome_status"`
	Status                                  string         `gorm:"type:varchar(50);default:'open'" json:"status"`
	Documents                               datatypes.JSON `json:"documents"`
}
