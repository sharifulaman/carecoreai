package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

type WelcomePackDocument struct {
	Base
	HomeID         string  `gorm:"type:uuid;index" json:"home_id"`
	HomeName       string  `gorm:"type:varchar(255)" json:"home_name"`
	Language       string  `gorm:"type:varchar(100)" json:"language"`
	FileURL        string  `gorm:"type:text" json:"file_url"`
	FileName       string  `gorm:"type:varchar(255)" json:"file_name"`
	FileType       string  `gorm:"type:varchar(50)" json:"file_type"`
	UploadedBy     *string `gorm:"type:uuid" json:"uploaded_by"`
	UploadedByName string  `gorm:"type:varchar(255)" json:"uploaded_by_name"`
	UploadedAt     string  `gorm:"type:varchar(100)" json:"uploaded_at"`
	IsActive       bool    `gorm:"default:true" json:"is_active"`
	Notes          *string `gorm:"type:text" json:"notes"`
}

type PlacementDetails struct {
	Base
	ResidentID        string         `gorm:"type:uuid;index" json:"resident_id"`
	HomeID            string         `gorm:"type:uuid;index" json:"home_id"`
	DateOfPlan        string         `gorm:"type:varchar(100)" json:"date_of_plan"`
	Domains           pq.StringArray `gorm:"type:text[]" json:"domains"`
	PlacementHistory  string         `gorm:"type:text" json:"placement_history"`
	LAPlacementAims   string         `gorm:"type:text" json:"la_placement_aims"`
	ParentsCarersAims string         `gorm:"type:text" json:"parents_carers_aims"`
	YPPlacementAims   string         `gorm:"type:text" json:"yp_placement_aims"`
	CompletedBy       *string        `gorm:"type:uuid" json:"completed_by"`
	CompletedByName   string         `gorm:"type:varchar(255)" json:"completed_by_name"`
	UpdatedAt         string         `gorm:"type:varchar(100)" json:"updated_at"`
}

type FamilySocialPlan struct {
	Base
	ResidentID                string  `gorm:"type:uuid;index" json:"resident_id"`
	HomeID                    string  `gorm:"type:uuid;index" json:"home_id"`
	FamilyBackground          string  `gorm:"type:text" json:"family_background"`
	FamilyContactArrangements string  `gorm:"type:text" json:"family_contact_arrangements"`
	SocialNetwork             string  `gorm:"type:text" json:"social_network"`
	RelationshipGoals         string  `gorm:"type:text" json:"relationship_goals"`
	Concerns                  string  `gorm:"type:text" json:"concerns"`
	YPViewsOnFamily           string  `gorm:"type:text" json:"yp_views_on_family"`
	ReviewDate                string  `gorm:"type:varchar(100)" json:"review_date"`
	CompletedBy               *string `gorm:"type:uuid" json:"completed_by"`
	CompletedByName           string  `gorm:"type:varchar(255)" json:"completed_by_name"`
	UpdatedAt                 string  `gorm:"type:varchar(100)" json:"updated_at"`
}

type BehaviourSupportPlan struct {
	Base
	ResidentID                    string  `gorm:"type:uuid;index" json:"resident_id"`
	HomeID                        string  `gorm:"type:uuid;index" json:"home_id"`
	BehavioursOfConcern           string  `gorm:"type:text" json:"behaviours_of_concern"`
	Triggers                      string  `gorm:"type:text" json:"triggers"`
	WarningSigns                  string  `gorm:"type:text" json:"warning_signs"`
	GreenStrategies               string  `gorm:"type:text" json:"green_strategies"`
	AmberStrategies               string  `gorm:"type:text" json:"amber_strategies"`
	RedStrategies                 string  `gorm:"type:text" json:"red_strategies"`
	PhysicalInterventionPermitted bool    `gorm:"default:false" json:"physical_intervention_permitted"`
	PhysicalInterventionDetail    string  `gorm:"type:text" json:"physical_intervention_detail"`
	ProhibitedSanctions           string  `gorm:"type:text" json:"prohibited_sanctions"`
	PostIncidentSupport           string  `gorm:"type:text" json:"post_incident_support"`
	YPInvolvedInPlan              bool    `gorm:"default:false" json:"yp_involved_in_plan"`
	ReviewDate                    string  `gorm:"type:varchar(100)" json:"review_date"`
	CompletedBy                   *string `gorm:"type:uuid" json:"completed_by"`
	CompletedByName               string  `gorm:"type:varchar(255)" json:"completed_by_name"`
	CompletedAt                   string  `gorm:"type:varchar(100)" json:"completed_at"`
	UpdatedAt                     string  `gorm:"type:varchar(100)" json:"updated_at"`
}

type TherapeuticPlan struct {
	Base
	ResidentID                  string  `gorm:"type:uuid;index" json:"resident_id"`
	HomeID                      string  `gorm:"type:uuid;index" json:"home_id"`
	EmotionalNeedsSummary       string  `gorm:"type:text" json:"emotional_needs_summary"`
	TraumaHistorySummary        string  `gorm:"type:text" json:"trauma_history_summary"`
	CAMHSInvolved               bool    `gorm:"default:false" json:"camhs_involved"`
	CAMHSTier                   string  `gorm:"type:varchar(50)" json:"camhs_tier"`
	CAMHSTherapistName          string  `gorm:"type:varchar(255)" json:"camhs_therapist_name"`
	CAMHSFrequency              string  `gorm:"type:varchar(100)" json:"camhs_frequency"`
	TherapyType                 string  `gorm:"type:varchar(255)" json:"therapy_type"`
	OtherTherapeuticServices    string  `gorm:"type:text" json:"other_therapeutic_services"`
	StaffTherapeuticApproach    string  `gorm:"type:text" json:"staff_therapeutic_approach"`
	AttachmentRelationshipNotes string  `gorm:"type:text" json:"attachment_relationship_notes"`
	EmotionalRegulationStrats   string  `gorm:"column:emotional_regulation_strategies;type:text" json:"emotional_regulation_strategies"`
	LifeStoryWork               bool    `gorm:"default:false" json:"life_story_work"`
	LifeStoryWorker             string  `gorm:"type:varchar(255)" json:"life_story_worker"`
	TherapeuticGoals            string  `gorm:"type:text" json:"therapeutic_goals"`
	ProgressNotes               string  `gorm:"type:text" json:"progress_notes"`
	YPUnderstandsPlan           bool    `gorm:"default:false" json:"yp_understands_plan"`
	ReviewDate                  string  `gorm:"type:varchar(100)" json:"review_date"`
	CompletedBy                 *string `gorm:"type:uuid" json:"completed_by"`
	CompletedByName             string  `gorm:"type:varchar(255)" json:"completed_by_name"`
	CompletedAt                 string  `gorm:"type:varchar(100)" json:"completed_at"`
	UpdatedAt                   string  `gorm:"type:varchar(100)" json:"updated_at"`
}

type RiskAssessment struct {
	Base
	ResidentID         string  `gorm:"type:uuid;index" json:"resident_id"`
	HomeID             string  `gorm:"type:uuid;index" json:"home_id"`
	Category           string  `gorm:"type:varchar(100)" json:"category"`
	IsPresent          string  `gorm:"type:varchar(50)" json:"is_present"`
	Likelihood         string  `gorm:"type:varchar(50)" json:"likelihood"`
	Consequence        string  `gorm:"type:varchar(50)" json:"consequence"`
	OverallRating      string  `gorm:"type:varchar(50)" json:"overall_rating"`
	Background         string  `gorm:"type:text" json:"background"`
	Triggers           string  `gorm:"type:text" json:"triggers"`
	ManagementStrategy string  `gorm:"type:text" json:"management_strategy"`
	ProtectiveFactors  string  `gorm:"type:text" json:"protective_factors"`
	YPConsulted        bool    `gorm:"default:false" json:"yp_consulted"`
	ReviewDate         string  `gorm:"type:varchar(100)" json:"review_date"`
	LastReviewedBy     *string `gorm:"type:uuid" json:"last_reviewed_by"`
	LastReviewedByName *string `gorm:"type:varchar(255)" json:"last_reviewed_by_name"`
	LastReviewedAt     string  `gorm:"type:varchar(100)" json:"last_reviewed_at"`
}

type YPViewsRecord struct {
	Base
	ResidentID          string  `gorm:"type:uuid;index" json:"resident_id"`
	HomeID              string  `gorm:"type:uuid;index" json:"home_id"`
	YPViewsOnPlacement  string  `gorm:"column:yp_views_on_placement;type:text" json:"yp_views_on_placement"`
	YPGoalsAndWishes    string  `gorm:"column:yp_goals_and_wishes;type:text" json:"yp_goals_and_wishes"`
	YPConcerns          string  `gorm:"column:yp_concerns;type:text" json:"yp_concerns"`
	YPSignatureObtained bool    `gorm:"column:yp_signature_obtained;default:false" json:"yp_signature_obtained"`
	DateViewsRecorded   string  `gorm:"column:date_views_recorded;type:varchar(100)" json:"date_views_recorded"`
	CompletedBy         *string `gorm:"type:uuid" json:"completed_by"`
	CompletedByName     string  `gorm:"type:varchar(255)" json:"completed_by_name"`
	UpdatedAt           string  `gorm:"type:varchar(100)" json:"updated_at"`
}

type ResidentDocument struct {
	Base
	ResidentID     string  `gorm:"type:uuid;index" json:"resident_id"`
	HomeID         string  `gorm:"type:uuid;index" json:"home_id"`
	FileURL        string  `gorm:"type:text" json:"file_url"`
	FileName       string  `gorm:"type:varchar(255)" json:"file_name"`
	DocumentType   string  `gorm:"type:varchar(100)" json:"document_type"`
	UploadedBy     *string `gorm:"type:uuid" json:"uploaded_by"`
	UploadedByName string  `gorm:"type:varchar(255)" json:"uploaded_by_name"`
	UploadedAt     string  `gorm:"type:varchar(100)" json:"uploaded_at"`
}

type SupportPlanSignoff struct {
	Base
	ResidentID      string  `gorm:"type:uuid;index" json:"resident_id"`
	HomeID          string  `gorm:"type:uuid;index" json:"home_id"`
	SignedOffBy     *string `gorm:"type:uuid" json:"signed_off_by"`
	SignedOffByName string  `gorm:"type:varchar(255)" json:"signed_off_by_name"`
	SignedOffAt     string  `gorm:"type:varchar(100)" json:"signed_off_at"`
	NextReviewDate  string  `gorm:"type:varchar(100)" json:"next_review_date"`
	ManagerNotes    string  `gorm:"type:text" json:"manager_notes"`
	PlanVersion     int     `gorm:"default:1" json:"plan_version"`
}

type ExploitationRisk struct {
	Base
	ResidentID                    string  `gorm:"type:uuid;index" json:"resident_id"`
	ResidentName                  string  `gorm:"type:varchar(255)" json:"resident_name"`
	HomeID                        string  `gorm:"type:uuid;index" json:"home_id"`
	AssessedByID                  *string `gorm:"type:uuid" json:"assessed_by_id"`
	AssessedByName                string  `gorm:"type:varchar(255)" json:"assessed_by_name"`
	AssessmentDate                string  `gorm:"type:varchar(100)" json:"assessment_date"`
	ReviewDate                    string  `gorm:"type:varchar(100)" json:"review_date"`
	NextReviewDate                string  `gorm:"type:varchar(100)" json:"next_review_date"`
	IndicatorsNotes               string  `gorm:"type:text" json:"indicators_notes"`
	CSERiskLevel                  string  `gorm:"column:cse_risk_level;type:varchar(50)" json:"cse_risk_level"`
	CriminalExploitationRiskLevel string  `gorm:"column:criminal_exploitation_risk_level;type:varchar(50)" json:"criminal_exploitation_risk_level"`
	OverallRiskLevel              string  `gorm:"column:overall_risk_level;type:varchar(50)" json:"overall_risk_level"`
	RiskLevelRationale            string  `gorm:"type:text" json:"risk_level_rationale"`
	PositiveRelationships         bool    `gorm:"default:false" json:"positive_relationships"`
	EngagedWithEducation          bool    `gorm:"default:false" json:"engaged_with_education"`
	EngagedWithSupportWorker      bool    `gorm:"default:false" json:"engaged_with_support_worker"`
	TrustedAdultIdentified        bool    `gorm:"default:false" json:"trusted_adult_identified"`
	TrustedAdultName              string  `gorm:"type:varchar(255)" json:"trusted_adult_name"`
	ProtectiveFactorsNotes        string  `gorm:"type:text" json:"protective_factors_notes"`
	MASHReferralMade              bool    `gorm:"column:mash_referral_made;default:false" json:"mash_referral_made"`
	MASHReference                 string  `gorm:"column:mash_reference;type:varchar(100)" json:"mash_reference"`
	PoliceReferralMade            bool    `gorm:"default:false" json:"police_referral_made"`
	MultiAgencyMeetingRequired    bool    `gorm:"default:false" json:"multi_agency_meeting_required"`
	MeetingDate                   string  `gorm:"type:varchar(100)" json:"meeting_date"`
	IOMReferral                   bool    `gorm:"column:iom_referral;default:false" json:"iom_referral"`
	ActionPlan                    string  `gorm:"type:text" json:"action_plan"`

	// CSE Indicators
	GoingMissingFrequently             bool   `gorm:"default:false" json:"going_missing_frequently"`
	GoingMissingFrequentlyNotes        string `gorm:"type:text" json:"going_missing_frequently_notes"`
	ReturningWithUnexplainedGifts      bool   `gorm:"default:false" json:"returning_with_unexplained_gifts"`
	ReturningWithUnexplainedGiftsNotes string `gorm:"type:text" json:"returning_with_unexplained_gifts_notes"`
	UnexplainedMoney                   bool   `gorm:"default:false" json:"unexplained_money"`
	UnexplainedMoneyNotes              string `gorm:"type:text" json:"unexplained_money_notes"`
	NewPhoneOrMultiplePhones           bool   `gorm:"default:false" json:"new_phone_or_multiple_phones"`
	NewPhoneOrMultiplePhonesNotes      string `gorm:"type:text" json:"new_phone_or_multiple_phones_notes"`
	NewOlderFriendsUnknownAdults       bool   `gorm:"default:false" json:"new_older_friends_unknown_adults"`
	NewOlderFriendsUnknownAdultsNotes  string `gorm:"type:text" json:"new_older_friends_unknown_adults_notes"`
	StayingOutLateUnexplained          bool   `gorm:"default:false" json:"staying_out_late_unexplained"`
	StayingOutLateUnexplainedNotes     string `gorm:"type:text" json:"staying_out_late_unexplained_notes"`
	ReluctantToDiscussWhereabouts      bool   `gorm:"default:false" json:"reluctant_to_discuss_whereabouts"`
	ReluctantToDiscussWhereaboutsNotes string `gorm:"type:text" json:"reluctant_to_discuss_whereabouts_notes"`
	ChangesInBehaviourOrMood           bool   `gorm:"default:false" json:"changes_in_behaviour_or_mood"`
	ChangesInBehaviourOrMoodNotes      string `gorm:"type:text" json:"changes_in_behaviour_or_mood_notes"`
	SignsOfPhysicalAbuse               bool   `gorm:"default:false" json:"signs_of_physical_abuse"`
	SignsOfPhysicalAbuseNotes          string `gorm:"type:text" json:"signs_of_physical_abuse_notes"`
	EvidenceOfDrugOrAlcoholUse         bool   `gorm:"default:false" json:"evidence_of_drug_or_alcohol_use"`
	EvidenceOfDrugOrAlcoholUseNotes    string `gorm:"type:text" json:"evidence_of_drug_or_alcohol_use_notes"`
	WithdrawalFromFamilyWorkers        bool   `gorm:"default:false" json:"withdrawal_from_family_workers"`
	WithdrawalFromFamilyWorkersNotes   string `gorm:"type:text" json:"withdrawal_from_family_workers_notes"`
	SexualisedBehaviourOrLanguage      bool   `gorm:"default:false" json:"sexualised_behaviour_or_language"`
	SexualisedBehaviourOrLanguageNotes string `gorm:"type:text" json:"sexualised_behaviour_or_language_notes"`
	FoundInRiskyLocations              bool   `gorm:"default:false" json:"found_in_risky_locations"`
	FoundInRiskyLocationsNotes         string `gorm:"type:text" json:"found_in_risky_locations_notes"`
	OnlineActivityConcerns             bool   `gorm:"default:false" json:"online_activity_concerns"`
	OnlineActivityConcernsNotes        string `gorm:"type:text" json:"online_activity_concerns_notes"`

	// Criminal Indicators
	CarryingWeapons                      bool   `gorm:"default:false" json:"carrying_weapons"`
	CarryingWeaponsNotes                 string `gorm:"type:text" json:"carrying_weapons_notes"`
	SuspectedCountyLinesInvolvement      bool   `gorm:"default:false" json:"suspected_county_lines_involvement"`
	SuspectedCountyLinesInvolvementNotes string `gorm:"type:text" json:"suspected_county_lines_involvement_notes"`
	UnexplainedInjuries                  bool   `gorm:"default:false" json:"unexplained_injuries"`
	UnexplainedInjuriesNotes             string `gorm:"type:text" json:"unexplained_injuries_notes"`
	AssociatingWithKnownGangMembers      bool   `gorm:"default:false" json:"associating_with_known_gang_members"`
	AssociatingWithKnownGangMembersNotes string `gorm:"type:text" json:"associating_with_known_gang_members_notes"`
	FoundInDifferentAreaRepeatedly       bool   `gorm:"default:false" json:"found_in_different_area_repeatedly"`
	FoundInDifferentAreaRepeatedlyNotes  string `gorm:"type:text" json:"found_in_different_area_repeatedly_notes"`
}

type AdvocacyRecord struct {
	Base
	ResidentID           string         `gorm:"type:uuid;index" json:"resident_id"`
	ResidentName         string         `gorm:"type:varchar(255)" json:"resident_name"`
	HomeID               string         `gorm:"type:uuid;index" json:"home_id"`
	InformedOfRight      bool           `gorm:"column:informed_of_right;default:false" json:"informed_of_right"`
	InformedDate         string         `gorm:"column:informed_date;type:varchar(100)" json:"informed_date"`
	InformedByID         *string        `gorm:"column:informed_by_id;type:uuid" json:"informed_by_id"`
	InformedByName       string         `gorm:"column:informed_by_name;type:varchar(255)" json:"informed_by_name"`
	AdvocateRequested    bool           `gorm:"column:advocate_requested;default:false" json:"advocate_requested"`
	AdvocateName         string         `gorm:"column:advocate_name;type:varchar(255)" json:"advocate_name"`
	AdvocateOrganisation string         `gorm:"column:advocate_organisation;type:varchar(255)" json:"advocate_organisation"`
	AdvocateContact      string         `gorm:"column:advocate_contact;type:varchar(255)" json:"advocate_contact"`
	IsActive             bool           `gorm:"default:true" json:"is_active"`
	FirstMeetingDate     string         `gorm:"column:first_meeting_date;type:varchar(100)" json:"first_meeting_date"`
	Sessions             datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"sessions"`
	ChildFeedback        string         `gorm:"column:child_feedback;type:text" json:"child_feedback"`
}

type Achievement struct {
	Base
	ResidentID       string  `gorm:"type:uuid;index" json:"resident_id"`
	ResidentName     string  `gorm:"type:varchar(255)" json:"resident_name"`
	HomeID           string  `gorm:"type:uuid;index" json:"home_id"`
	RecordedByID     *string `gorm:"column:recorded_by_id;type:uuid" json:"recorded_by_id"`
	RecordedByName   string  `gorm:"column:recorded_by_name;type:varchar(255)" json:"recorded_by_name"`
	AchievementDate  string  `gorm:"column:achievement_date;type:varchar(100)" json:"achievement_date"`
	Category         string  `gorm:"type:varchar(100)" json:"category"`
	Title            string  `gorm:"type:varchar(255)" json:"title"`
	Description      string  `gorm:"type:text" json:"description"`
	CelebratedHow    string  `gorm:"column:celebrated_how;type:varchar(255)" json:"celebrated_how"`
	SharedWithLA     bool    `gorm:"column:shared_with_la;default:false" json:"shared_with_la"`
	SharedWithFamily bool    `gorm:"column:shared_with_family;default:false" json:"shared_with_family"`
	PhotoURL         string  `gorm:"column:photo_url;type:text" json:"photo_url"`
}

type NEETRecord struct {
	Base
	ResidentID                          string     `gorm:"index" json:"resident_id"`
	ResidentName                        string     `json:"resident_name"`
	HomeID                              string     `gorm:"index" json:"home_id"`
	HomeName                            string     `json:"home_name"`
	AccommodationCategory               string     `json:"accommodation_category"`
	CurrentlyNEET                       bool       `gorm:"default:false" json:"currently_neet"`
	DateNEETStarted                     *time.Time `json:"date_neet_started"`
	LastDateEducationTrainingEmployment *time.Time `gorm:"column:last_date_education_training_employment" json:"last_date_education_training_employment"`
	ReasonCurrentlyNEET                 string     `gorm:"type:text" json:"reason_currently_neet"`
	ActionPlan                          string     `gorm:"type:text" json:"action_plan"`
	ResponsibleStaffID                  *string    `json:"responsible_staff_id"`
	ReviewDate                          *time.Time `json:"review_date"`
	OutcomeNotes                        string     `gorm:"type:text" json:"outcome_notes"`
	ManagerReviewStatus                 string     `gorm:"default:'submitted'" json:"manager_review_status"`
	ManagerReviewDate                   *time.Time `json:"manager_review_date"`
}

type EmploymentRecord struct {
	Base
	ResidentID            string         `gorm:"type:uuid;index" json:"resident_id"`
	ResidentName          string         `gorm:"type:varchar(255)" json:"resident_name"`
	HomeID                string         `gorm:"type:uuid;index" json:"home_id"`
	HomeName              string         `gorm:"type:varchar(255)" json:"home_name"`
	AccommodationCategory string         `gorm:"type:varchar(100)" json:"accommodation_category"`
	EmployerProviderName  string         `gorm:"type:varchar(255)" json:"employer_provider_name"`
	StartDate             *time.Time     `json:"start_date"`
	NatureOfEmployment    string         `gorm:"type:varchar(255)" json:"nature_of_employment"`
	IsApprenticeship      bool           `gorm:"default:false" json:"is_apprenticeship"`
	HoursWorkedPerWeek    float64        `gorm:"type:numeric(5,2)" json:"hours_worked_per_week"`
	EmploymentStatus      string         `gorm:"type:varchar(50);default:'active'" json:"employment_status"`
	EvidenceURLs          datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"evidence_urls"`
	ReviewDate            *time.Time     `json:"review_date"`
}

// KeyPerson records the key worker / key person assignment for a Young Person.
// A resident may have only one active key person at a time; previous assignments are retained with is_active=false.
type KeyPerson struct {
	Base
	ResidentID       string     `gorm:"type:uuid;not null;index" json:"resident_id"`
	ResidentName     string     `gorm:"type:varchar(255)" json:"resident_name"`
	HomeID           *string    `gorm:"type:uuid;index" json:"home_id"`
	StaffID          *string    `gorm:"type:uuid;index" json:"staff_id"`
	StaffName        string     `gorm:"type:varchar(255)" json:"staff_name"`
	// role: key_worker|deputy_key_worker|team_leader
	Role             string     `gorm:"type:varchar(100);default:'key_worker'" json:"role"`
	AssignedDate     string     `gorm:"type:varchar(100)" json:"assigned_date"`
	EndDate          string     `gorm:"type:varchar(100)" json:"end_date"`
	IsActive         bool       `gorm:"default:true;index" json:"is_active"`
	AssignedByID     *string    `gorm:"type:uuid" json:"assigned_by_id"`
	AssignedByName   string     `gorm:"type:varchar(255)" json:"assigned_by_name"`
	Notes            string     `gorm:"type:text" json:"notes"`

	// Professional / Family key contacts form fields
	ContactName      string     `gorm:"type:varchar(255)" json:"contact_name"`
	Organisation     string     `gorm:"type:varchar(255)" json:"organisation"`
	OfficePhone      string     `gorm:"type:varchar(100)" json:"office_phone"`
	MobileNumber     string     `gorm:"type:varchar(100)" json:"mobile_number"`
	EmailAddress     string     `gorm:"type:varchar(255)" json:"email_address"`
	RelationshipType string     `gorm:"type:varchar(100)" json:"relationship_type"`
	IsPrimaryContact bool       `gorm:"default:false;index" json:"is_primary_contact"`
	Status           string     `gorm:"type:varchar(50);default:'active';index" json:"status"`
	ContactNotes     string     `gorm:"type:text" json:"contact_notes"`
	LastVerifiedDate string     `gorm:"type:varchar(100)" json:"last_verified_date"`
}

// CareLeaverBenefit tracks statutory and welfare benefits for 18+ care leavers.
type CareLeaverBenefit struct {
	Base
	ResidentID       string     `gorm:"type:uuid;not null;index" json:"resident_id"`
	ResidentName     string     `gorm:"type:varchar(255)" json:"resident_name"`
	HomeID           string     `gorm:"type:uuid;index" json:"home_id"`
	// benefit_type: universal_credit|pip|esa|housing_benefit|council_tax_reduction|council_tax_exemption|job_seekers|other
	BenefitType      string     `gorm:"type:varchar(100)" json:"benefit_type"`
	BenefitTypeOther string     `gorm:"type:varchar(255)" json:"benefit_type_other"`
	Amount           float64    `gorm:"type:numeric(10,2)" json:"amount"`
	// payment_frequency: weekly|fortnightly|monthly|four_weekly
	PaymentFrequency string     `gorm:"type:varchar(50)" json:"payment_frequency"`
	StartDate        string     `gorm:"type:varchar(100)" json:"start_date"`
	EndDate          string     `gorm:"type:varchar(100)" json:"end_date"`
	ReferenceNumber  string     `gorm:"type:varchar(255)" json:"reference_number"`
	// status: active|pending|stopped|appealing|under_review
	Status           string     `gorm:"type:varchar(50);default:'active'" json:"status"`
	RecordedByID     *string    `gorm:"type:uuid" json:"recorded_by_id"`
	RecordedByName   string     `gorm:"type:varchar(255)" json:"recorded_by_name"`
	Notes            string     `gorm:"type:text" json:"notes"`
}

// PostMoveOnContact records contact made with a care leaver after they have moved on from the placement.
type PostMoveOnContact struct {
	Base
	ResidentID             string  `gorm:"type:uuid;not null;index" json:"resident_id"`
	ResidentName           string  `gorm:"type:varchar(255)" json:"resident_name"`
	HomeID                 string  `gorm:"type:uuid;index" json:"home_id"`
	ContactDate            string  `gorm:"type:varchar(100)" json:"contact_date"`
	// contact_method: phone|visit|email|text|video_call|letter|other
	ContactMethod          string  `gorm:"type:varchar(100)" json:"contact_method"`
	ContactByID            *string `gorm:"type:uuid" json:"contact_by_id"`
	ContactByName          string  `gorm:"type:varchar(255)" json:"contact_by_name"`
	ResidentCurrentAddress string  `gorm:"type:text" json:"resident_current_address"`
	// resident_current_status: settled|at_risk|homeless|unknown|in_custody|hospitalised|deceased
	ResidentCurrentStatus  string  `gorm:"type:varchar(100)" json:"resident_current_status"`
	// engagement_level: engaged|partially_engaged|refused|not_reachable
	EngagementLevel        string  `gorm:"type:varchar(100)" json:"engagement_level"`
	Notes                  string  `gorm:"type:text" json:"notes"`
	NextContactDate        string  `gorm:"type:varchar(100)" json:"next_contact_date"`
	ActionRequired         bool    `gorm:"default:false" json:"action_required"`
	ActionDetails          string  `gorm:"type:text" json:"action_details"`
}

// ILSSessionLog records individual Independent Living Skills session activity against an ILSPlan.
type ILSSessionLog struct {
	Base
	ILSPlanID          string  `gorm:"type:uuid;not null;index" json:"ils_plan_id"`
	ILSSectionID       *string `gorm:"type:uuid;index" json:"ils_section_id"`
	ResidentID         string  `gorm:"type:uuid;not null;index" json:"resident_id"`
	HomeID             string  `gorm:"type:uuid;index" json:"home_id"`
	SessionDate        string  `gorm:"type:varchar(100)" json:"session_date"`
	// session_type: formal|informal|observed|community
	SessionType        string  `gorm:"type:varchar(100);default:'informal'" json:"session_type"`
	SkillArea          string  `gorm:"type:varchar(255)" json:"skill_area"`
	FacilitatedByID    *string `gorm:"type:uuid" json:"facilitated_by_id"`
	FacilitatedByName  string  `gorm:"type:varchar(255)" json:"facilitated_by_name"`
	DurationMinutes    int     `json:"duration_minutes"`
	ActivityDescription string `gorm:"type:text" json:"activity_description"`
	// resident_engagement: very_engaged|engaged|partially_engaged|refused|absent
	ResidentEngagement string  `gorm:"type:varchar(100)" json:"resident_engagement"`
	// progress_observed: improved|maintained|declined|too_early_to_tell
	ProgressObserved   string  `gorm:"type:varchar(100)" json:"progress_observed"`
	ProgressNotes      string  `gorm:"type:text" json:"progress_notes"`
	NextSessionDate    string  `gorm:"type:varchar(100)" json:"next_session_date"`
	NextSessionGoal    string  `gorm:"type:text" json:"next_session_goal"`
}
