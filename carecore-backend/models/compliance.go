package models

import (
	"time"

	"gorm.io/datatypes"
)

// InternalAuditSubmission represents an internal audit form submission
type InternalAuditSubmission struct {
	Base
	HomeID                string         `gorm:"type:varchar(100);index" json:"home_id"`
	HomeName              string         `gorm:"type:varchar(255)" json:"home_name"`
	AuditDate             string         `gorm:"type:varchar(100)" json:"audit_date"`
	AuditTime             string         `gorm:"type:varchar(50)" json:"audit_time"`
	OverallScore          int            `json:"overall_score"`
	Status                string         `gorm:"type:varchar(50);default:'draft'" json:"status"`
	Title                 string         `gorm:"type:varchar(255)" json:"title"`
	AuditorID             string         `gorm:"type:varchar(100)" json:"auditor_id"`
	AuditorName           string         `gorm:"type:varchar(255)" json:"auditor_name"`
	RegisteredManagerName string         `gorm:"type:varchar(255)" json:"registered_manager_name"`
	VisitType             string         `gorm:"type:varchar(100)" json:"visit_type"`
	StaffOnDuty           datatypes.JSON `json:"staff_on_duty"`
	YoungPeoplePresent    int            `json:"young_people_present"`
	OverallStrengths      string         `gorm:"type:text" json:"overall_strengths"`
	AreasImprovement      string         `gorm:"type:text" json:"areas_improvement"`
	ImmediateConcerns     string         `gorm:"type:text" json:"immediate_concerns"`
	ComplianceRating      string         `gorm:"type:varchar(100)" json:"compliance_rating"`
	OfstedImpact          int            `json:"ofsted_impact"`
	WorkflowStatus        string         `gorm:"type:varchar(50)" json:"workflow_status"`
	SubmittedByID         string         `gorm:"type:varchar(100)" json:"submitted_by_id"`
	SubmittedByName       string         `gorm:"type:varchar(255)" json:"submitted_by_name"`
	SubmittedAt           *time.Time     `json:"submitted_at"`
	Section1Environment   datatypes.JSON `gorm:"column:section_1_environment" json:"section_1_environment"`
	Section2HealthSafety  datatypes.JSON `gorm:"column:section_2_health_safety" json:"section_2_health_safety"`
	Section3YpRecords     datatypes.JSON `gorm:"column:section_3_yp_records" json:"section_3_yp_records"`
	Section4StaffCompliance datatypes.JSON `gorm:"column:section_4_staff_compliance" json:"section_4_staff_compliance"`
	Section5Safeguarding  datatypes.JSON `gorm:"column:section_5_safeguarding" json:"section_5_safeguarding"`
	Sections              datatypes.JSON `json:"sections"`
}

// AuditAction represents an action item generated from an audit
type AuditAction struct {
	Base
	HomeID                    string     `gorm:"type:varchar(100);index" json:"home_id"`
	InternalAuditSubmissionID string     `gorm:"type:uuid;index" json:"internal_audit_submission_id"`
	ActionRequired            string     `gorm:"type:text" json:"action_required"`
	Priority                  string     `gorm:"type:varchar(50)" json:"priority"`
	Deadline                  *time.Time `json:"deadline"`
	Status                    string     `gorm:"type:varchar(50);default:'open'" json:"status"`
}

// YPFeedbackTemplate represents a template for young person feedback
type YPFeedbackTemplate struct {
	Base
	Title               string         `gorm:"type:varchar(255)" json:"title"`
	Name                string         `gorm:"type:varchar(255)" json:"name"`
	Category            string         `gorm:"type:varchar(100)" json:"category"`
	Frequency           string         `gorm:"type:varchar(100)" json:"frequency"`
	ActiveVersionNumber string         `gorm:"type:varchar(50)" json:"active_version_number"`
	Description         string         `gorm:"type:text" json:"description"`
	Status              string         `gorm:"type:varchar(50);default:'active'" json:"status"`
	Questions           datatypes.JSON `json:"questions"`
	CreatedByID         string         `gorm:"type:varchar(100)" json:"created_by_id"`
	CreatedByName       string         `gorm:"type:varchar(255)" json:"created_by_name"`
	UpdatedByID         string         `gorm:"type:varchar(100)" json:"updated_by_id"`
	UpdatedByName       string         `gorm:"type:varchar(255)" json:"updated_by_name"`
}

// YPFeedbackSubmission represents a filled out young person feedback form
type YPFeedbackSubmission struct {
	Base
	// Template info
	TemplateID       string `gorm:"type:varchar(100);index" json:"template_id"`
	TemplateName     string `gorm:"type:varchar(255)" json:"template_name"`
	TemplateCategory string `gorm:"type:varchar(100);index" json:"template_category"`
	TemplateVersion  string `gorm:"type:varchar(50)" json:"template_version"`
	// Young person / home
	ResidentID   string `gorm:"type:varchar(100);index" json:"resident_id"`
	ResidentName string `gorm:"type:varchar(255)" json:"resident_name"`
	HomeID       string `gorm:"type:varchar(100);index" json:"home_id"`
	HomeName     string `gorm:"type:varchar(255)" json:"home_name"`
	// Submission
	Status          string         `gorm:"type:varchar(50);default:'draft'" json:"status"`
	SubmittedAt     *time.Time     `json:"submitted_at"`
	SubmittedByID   string         `gorm:"type:varchar(100)" json:"submitted_by_id"`
	SubmittedByName string         `gorm:"type:varchar(255)" json:"submitted_by_name"`
	// Last-update tracking (for draft saves)
	LastUpdatedByID   string `gorm:"type:varchar(100)" json:"last_updated_by_id"`
	LastUpdatedByName string `gorm:"type:varchar(255)" json:"last_updated_by_name"`
	// Responses (JSON blob)
	ResponseJSON datatypes.JSON `gorm:"column:response_json" json:"response_json"`
	// Flags
	ConcernFlagged bool `json:"concern_flagged"`
	ActionRequired bool `json:"action_required"`
	// Review / sign-off
	ReviewedByID   string     `gorm:"type:varchar(100)" json:"reviewed_by_id"`
	ReviewedByName string     `gorm:"type:varchar(255)" json:"reviewed_by_name"`
	ReviewedAt     *time.Time `json:"reviewed_at"`
	ReviewNotes    string     `gorm:"type:text" json:"review_notes"`
}

// SWPAFeedbackTemplate represents a template for social worker/parent/advocate feedback
type SWPAFeedbackTemplate struct {
	Base
	Title               string         `gorm:"type:varchar(255)" json:"title"`
	Name                string         `gorm:"type:varchar(255)" json:"name"`
	Category            string         `gorm:"type:varchar(100)" json:"category"`
	Frequency           string         `gorm:"type:varchar(100)" json:"frequency"`
	ActiveVersionNumber string         `gorm:"type:varchar(50)" json:"active_version_number"`
	Description         string         `gorm:"type:text" json:"description"`
	Status              string         `gorm:"type:varchar(50);default:'active'" json:"status"`
	Questions           datatypes.JSON `json:"questions"`
	Sections            datatypes.JSON `json:"sections"`
	VersionNumber       string         `gorm:"type:varchar(50)" json:"version_number"`
	CreatedByID         string         `gorm:"type:varchar(100)" json:"created_by_id"`
	CreatedByName       string         `gorm:"type:varchar(255)" json:"created_by_name"`
	UpdatedByID         string         `gorm:"type:varchar(100)" json:"updated_by_id"`
	UpdatedByName       string         `gorm:"type:varchar(255)" json:"updated_by_name"`
}

// SWPAFeedbackSubmission represents a filled out SWPA feedback form
type SWPAFeedbackSubmission struct {
	Base
	HomeID         string         `gorm:"type:varchar(100);index" json:"home_id"`
	TemplateID     string         `gorm:"type:uuid;index" json:"template_id"`
	RespondentType string         `gorm:"type:varchar(100)" json:"respondent_type"`
	Status           string         `gorm:"type:varchar(50);default:'draft'" json:"status"`
	SubmittedAt      *time.Time     `json:"submitted_at"`
	Responses        datatypes.JSON `json:"responses"`
	SocialWorkerName string         `gorm:"type:varchar(255)" json:"social_worker_name"`
}

// ComplianceItem tracks a specific compliance requirement
type ComplianceItem struct {
	Base
	HomeID         string `gorm:"type:varchar(100);index" json:"home_id"`
	HomeName       string `gorm:"type:varchar(255)" json:"home_name"`
	ItemName       string `gorm:"type:varchar(255)" json:"item_name"`
	Category       string `gorm:"type:varchar(100)" json:"category"`
	Status         string `gorm:"type:varchar(50);default:'active'" json:"status"`
	OwnerName      string `gorm:"type:varchar(255)" json:"owner_name"`
	EvidenceStatus string `gorm:"type:varchar(50);default:'pending'" json:"evidence_status"`
	CreatedByName  string `gorm:"type:varchar(255)" json:"created_by_name"`
}

// ComplianceActivityEvent logs activities on a compliance item
type ComplianceActivityEvent struct {
	Base
	HomeID             string    `gorm:"type:varchar(100);index" json:"home_id"`
	HomeName           string    `gorm:"type:varchar(255)" json:"home_name"`
	ComplianceItemID   string    `gorm:"type:uuid;index" json:"compliance_item_id"`
	ComplianceItemName string    `gorm:"type:varchar(255)" json:"compliance_item_name"`
	EventType          string    `gorm:"type:varchar(100)" json:"event_type"`
	EventTitle         string    `gorm:"type:varchar(255)" json:"event_title"`
	EventDatetime      time.Time `json:"event_datetime"`
	PerformedByName    string    `gorm:"type:varchar(255)" json:"performed_by_name"`
}

// ComplianceEvidence stores evidence files for a compliance item
type ComplianceEvidence struct {
	Base
	ComplianceItemID      string    `gorm:"type:uuid;index" json:"compliance_item_id"`
	FileURL               string    `gorm:"type:text" json:"file_url"`
	FileName              string    `gorm:"type:varchar(255)" json:"file_name"`
	FileType              string    `gorm:"type:varchar(100)" json:"file_type"`
	EvidenceType          string    `gorm:"type:varchar(100)" json:"evidence_type"`
	Notes                 string    `gorm:"type:text" json:"notes"`
	UploadedByName        string    `gorm:"type:varchar(255)" json:"uploaded_by_name"`
	UploadedAt            time.Time `json:"uploaded_at"`
	IsLatest              bool      `json:"is_latest"`
	RequiresManagerReview bool      `json:"requires_manager_review"`
}

// ComplianceTask is a task related to a compliance item (e.g. renewal)
type ComplianceTask struct {
	Base
	HomeID           string     `gorm:"type:varchar(100);index" json:"home_id"`
	HomeName         string     `gorm:"type:varchar(255)" json:"home_name"`
	ComplianceItemID string     `gorm:"type:uuid;index" json:"compliance_item_id"`
	Title            string     `gorm:"type:varchar(255)" json:"title"`
	AssignedToName   string     `gorm:"type:varchar(255)" json:"assigned_to_name"`
	DueDate          *time.Time `json:"due_date"`
	Priority         string     `gorm:"type:varchar(50)" json:"priority"`
	Status           string     `gorm:"type:varchar(50);default:'open'" json:"status"`
	Notes            string     `gorm:"type:text" json:"notes"`
}

// ComplianceNote is a note attached to a compliance item
type ComplianceNote struct {
	Base
	ComplianceItemID string    `gorm:"type:uuid;index" json:"compliance_item_id"`
	NoteText         string    `gorm:"type:text" json:"note_text"`
	NoteType         string    `gorm:"type:varchar(100)" json:"note_type"`
	AddedByName      string    `gorm:"type:varchar(255)" json:"added_by_name"`
	AddedAt          time.Time `json:"added_at"`
}

// Reg32Report represents a Regulation 32 report
type Reg32Report struct {
	Base
	HomeID     string         `gorm:"type:varchar(100);index" json:"home_id"`
	ReportDate *time.Time     `json:"report_date"`
	Status     string         `gorm:"type:varchar(50);default:'draft'" json:"status"`
	Content    datatypes.JSON `json:"content"`
}

// StorageAudit represents a check on physical/digital storage records (Reg 26)
type StorageAudit struct {
	Base
	HomeID    string         `gorm:"type:varchar(100);index" json:"home_id"`
	AuditDate *time.Time     `json:"audit_date"`
	Findings  datatypes.JSON `json:"findings"`
}

// RecordCompletenessCheck represents an audit on record completeness
type RecordCompletenessCheck struct {
	Base
	HomeID        string         `gorm:"type:varchar(100);index" json:"home_id"`
	LastCheckedAt *time.Time     `json:"last_checked_at"`
	Results       datatypes.JSON `json:"results"`
}

// RecordRetentionConfig represents configurations for data retention policies
type RecordRetentionConfig struct {
	Base
	Config datatypes.JSON `json:"config"`
}

// ContingencyPlan represents a Regulation 23 contingency plan policy
type ContingencyPlan struct {
	Base
	HomeID                             string     `gorm:"type:varchar(100);index" json:"home_id"`
	VersionNumber                      string     `gorm:"type:varchar(50)" json:"version_number"`
	EffectiveDate                      string     `gorm:"type:varchar(50)" json:"effective_date"`
	ReviewDate                         string     `gorm:"type:varchar(50)" json:"review_date"`
	Status                             string     `gorm:"type:varchar(50);default:'active'" json:"status"`
	DocumentURL                        string     `gorm:"type:text" json:"document_url"`
	PreparedByID                       string     `gorm:"type:varchar(100)" json:"prepared_by_id"`
	PreparedByName                     string     `gorm:"type:varchar(255)" json:"prepared_by_name"`
	PreparedAt                         *time.Time `json:"prepared_at"`
	ReviewedByID                       string     `gorm:"type:varchar(100)" json:"reviewed_by_id"`
	ReviewedByName                     string     `gorm:"type:varchar(255)" json:"reviewed_by_name"`
	ReviewedAt                         *time.Time `json:"reviewed_at"`
	ApprovedByID                       string     `gorm:"type:varchar(100)" json:"approved_by_id"`
	ApprovedByName                     string     `gorm:"type:varchar(255)" json:"approved_by_name"`
	ApprovedAt                         *time.Time `json:"approved_at"`
	DocumentFileName                   string     `gorm:"type:varchar(255)" json:"document_file_name"`
	DocumentUploadedAt                 *time.Time `json:"document_uploaded_at"`
	DocumentUploadedByID               string     `gorm:"type:varchar(100)" json:"document_uploaded_by_id"`
	ChangeSummary                      string     `gorm:"type:text" json:"change_summary"`
	CoversPermanentClosure             bool       `json:"covers_permanent_closure"`
	CoversTemporaryClosure             bool       `json:"covers_temporary_closure"`
	CoversRegistrationConditions       bool       `json:"covers_registration_conditions"`
	CoversRegistrationSuspension       bool       `json:"covers_registration_suspension"`
	CoversRegistrationCancellation     bool       `json:"covers_registration_cancellation"`
	ChildrenTransferPlan               string     `gorm:"type:text" json:"children_transfer_plan"`
	EmergencyAccommodationArrangements string     `gorm:"type:text" json:"emergency_accommodation_arrangements"`
	LANotificationProcess              string     `gorm:"type:text" json:"la_notification_process"`
	ChildNotificationProcess           string     `gorm:"type:text" json:"child_notification_process"`
	SupportContinuityPlan              string     `gorm:"type:text" json:"support_continuity_plan"`
	SupersededAt                       *time.Time `json:"superseded_at"`
	PreviousVersionID                  *string    `gorm:"type:uuid" json:"previous_version_id"`
}
