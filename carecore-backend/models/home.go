package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type DocumentIDList []string

func (d DocumentIDList) Value() (driver.Value, error) {
	if d == nil {
		return []byte("[]"), nil
	}
	return json.Marshal([]string(d))
}

func (d *DocumentIDList) Scan(value interface{}) error {
	switch v := value.(type) {
	case nil:
		*d = DocumentIDList{}
		return nil
	case []byte:
		return json.Unmarshal(v, d)
	case string:
		return json.Unmarshal([]byte(v), d)
	default:
		return fmt.Errorf("cannot scan %T into DocumentIDList", value)
	}
}

func (d DocumentIDList) MarshalJSON() ([]byte, error) {
	return json.Marshal([]string(d))
}

func (d *DocumentIDList) UnmarshalJSON(data []byte) error {
	var values []string
	if err := json.Unmarshal(data, &values); err != nil {
		return err
	}
	*d = DocumentIDList(values)
	return nil
}

type Home struct {
	Base
	Name                string         `gorm:"not null" json:"name"`
	Type                string         `gorm:"not null" json:"type"` // outreach|24_hours|care|18_plus
	CareModel           string         `json:"care_model"`
	Address             string         `json:"address"`
	Postcode            string         `json:"postcode"`
	Phone               string         `json:"phone"`
	Email               string         `json:"email"`
	TeamLeaderID        string         `json:"team_leader_id"`
	PrivacyMode         bool           `gorm:"default:false" json:"privacy_mode"`
	ComplianceFramework string         `gorm:"default:'ofsted'" json:"compliance_framework"`
	DefaultLanguage     string         `gorm:"default:'en'" json:"default_language"`
	Status              string         `gorm:"default:'active'" json:"status"` // active|archived|vacant|maintenance
	LeaseStart          *time.Time     `json:"lease_start"`
	LeaseEnd            *time.Time     `json:"lease_end"`
	MonthlyRent         float64        `json:"monthly_rent"`
	LandlordName        string         `json:"landlord_name"`
	LandlordContact     string         `json:"landlord_contact"`
	LandlordEmail       string         `json:"landlord_email"`
	PropertyNotes       string         `json:"property_notes"`
	DocumentIDs         DocumentIDList `gorm:"type:jsonb" json:"document_ids"`
	Documents           datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"documents"`
	SupportWorkerIDs    pq.StringArray `gorm:"-" json:"support_worker_ids"`
	TeamLeaderIDs       pq.StringArray `gorm:"-" json:"team_leader_ids"`
	// AssignedStaffIDs covers every active StaffServiceAssignment for this home,
	// regardless of role — unlike SupportWorkerIDs/TeamLeaderIDs above, which only
	// cover those two specific roles. Added so callers that need "is this staff
	// member assigned to this home at all" (e.g. Team Manager / Regional Manager
	// dashboards) have one field to check instead of re-deriving it per role.
	AssignedStaffIDs pq.StringArray `gorm:"-" json:"assigned_staff_ids"`
}

type HomeDocument struct {
	Base
	HomeID       string     `gorm:"not null;index" json:"home_id"`
	Title        string     `gorm:"not null" json:"title"`
	DocumentType string     `json:"document_type"` // gas_safety|electric_cert|fire_risk|insurance|lease
	FileURL      string     `json:"file_url"`
	FileName     string     `json:"file_name"`
	FileSize     string     `json:"file_size"`
	UploadDate   string     `json:"upload_date"`
	IssueDate    *time.Time `json:"issue_date"`
	ExpiryDate   *time.Time `json:"expiry_date"`
	ReminderDays int        `gorm:"default:30" json:"reminder_days"`
	Status       string     `gorm:"default:'current'" json:"status"` // current|expiring_soon|expired
	UploadedBy   string     `json:"uploaded_by"`
	Notes        string     `json:"notes"`
	Version      int        `gorm:"default:1" json:"version"`
	SupersededBy string     `gorm:"index" json:"superseded_by"`
	RemovedAt    string     `gorm:"column:removed_at" json:"deleted_at"`
}

type HomeTask struct {
	Base
	HomeID         string `gorm:"not null;index" json:"home_id"`
	HomeName       string `json:"home_name"`
	Title          string `gorm:"not null" json:"title"`
	Description    string `json:"description"`
	Type           string `gorm:"default:'task';index" json:"type"` // task|meeting|appointment
	DueDate        string `gorm:"index" json:"due_date"`
	DueTime        string `json:"due_time"`
	Location       string `json:"location"`
	Status         string `gorm:"default:'pending';index" json:"status"` // pending|in_progress|completed|cancelled
	Priority       string `gorm:"default:'medium';index" json:"priority"`
	AssignedToID   string `json:"assigned_to_id"`
	AssignedToName string `json:"assigned_to_name"`
	CompletedAt    string `json:"completed_at"`
	CompletedBy    string `json:"completed_by"`
	Notes          string `json:"notes"`
}

type HomeLog struct {
	Base
	HomeID      string         `gorm:"not null;index" json:"home_id"`
	HomeName    string         `json:"home_name"`
	Author      string         `json:"author"`
	AuthorID    string         `json:"author_id"`
	AuthorName  string         `json:"author_name"`
	LogType     string         `json:"log_type"`
	Date        string         `gorm:"index" json:"date"`
	Shift       string         `gorm:"default:'n/a'" json:"shift"`
	Category    string         `gorm:"default:'general';index" json:"category"`
	Content     string         `json:"content"`
	Flagged     bool           `gorm:"default:false;index" json:"flagged"`
	FlagReason  string         `json:"flag_reason"`
	Frequency   string         `json:"frequency"`
	Attachments datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"attachments"`
}

func (h *HomeLog) normalizeAliases() {
	if h.Author == "" {
		if h.AuthorName != "" {
			h.Author = h.AuthorName
		} else {
			h.Author = h.AuthorID
		}
	}
	if h.AuthorName == "" {
		h.AuthorName = h.Author
	}
	if h.LogType == "" {
		h.LogType = h.Category
	}
	if h.Category == "" {
		h.Category = h.LogType
	}
}

func (h *HomeLog) BeforeCreate(tx *gorm.DB) error {
	h.normalizeAliases()
	return h.Base.BeforeCreate(tx)
}

func (h *HomeLog) BeforeUpdate(tx *gorm.DB) error {
	h.normalizeAliases()
	return h.Base.BeforeUpdate(tx)
}

type MaintenanceLog struct {
	Base
	HomeID              string         `gorm:"not null;index" json:"home_id"`
	HomeName            string         `json:"home_name"`
	IssueTitle          string         `json:"issue_title"`
	IssueReference      string         `gorm:"index" json:"issue_reference"`
	Title               string         `json:"title"`
	IssueDescription    string         `json:"issue_description"`
	Description         string         `json:"description"`
	IssueCategory       string         `json:"issue_category"`
	Category            string         `json:"category"`
	MaintenanceType     string         `json:"maintenance_type"`
	Priority            string         `gorm:"default:'medium';index" json:"priority"`
	Status              string         `gorm:"default:'reported';index" json:"status"`
	ReportedDate        string         `gorm:"index" json:"reported_date"`
	DateReported        string         `gorm:"index" json:"date_reported"`
	ReportedAt          string         `gorm:"index" json:"reported_at"`
	IssueDate           string         `json:"issue_date"`
	DueAt               string         `gorm:"index" json:"due_at"`
	DueDate             string         `json:"due_date"`
	StartDatetime       string         `json:"start_datetime"`
	ReportedBy          string         `json:"reported_by"`
	ReportedByName      string         `json:"reported_by_name"`
	IssueReportedByID   string         `json:"issue_reported_by_id"`
	IssueReportedByName string         `json:"issue_reported_by_name"`
	AssignedTo          string         `json:"assigned_to"`
	AssignedToName      string         `json:"assigned_to_name"`
	Contractor          string         `json:"contractor"`
	ContractorName      string         `json:"contractor_name"`
	Cost                *float64       `json:"cost"`
	EstimatedCost       *float64       `json:"estimated_cost"`
	ActualCost          *float64       `json:"actual_cost"`
	DateResolved        string         `json:"date_resolved"`
	ResolutionDate      string         `json:"resolution_date"`
	ResolutionDetails   string         `json:"resolution_details"`
	CompletedAt         string         `gorm:"index" json:"completed_at"`
	CompletedByName     string         `json:"completed_by_name"`
	Notes               string         `json:"notes"`
	PhotoURL            string         `json:"photo_url"`
	EvidenceURL         string         `json:"evidence_url"`
	EvidenceURLs        datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"evidence_urls"`
	IsRecurring         bool           `gorm:"default:false" json:"is_recurring"`
	IsPlanned           bool           `gorm:"default:false" json:"is_planned"`
}

// PropertyMaintenance is an alias of MaintenanceLog for the new frontend entity name
type PropertyMaintenance = MaintenanceLog

// MaintenanceSchedule tracks planned recurring maintenance tasks
type MaintenanceSchedule struct {
	Base
	HomeID               string   `gorm:"index" json:"home_id"`
	HomeName             string   `json:"home_name"`
	AppliesToAllHomes    bool     `gorm:"default:false" json:"applies_to_all_homes"`
	// Title aliases
	Title                string   `json:"title"`
	ScheduleTitle        string   `json:"schedule_title"`
	Category             string   `json:"category"`
	MaintenanceType      string   `json:"maintenance_type"`
	Frequency            string   `json:"frequency"` // one_off|weekly|monthly|quarterly|biannually|yearly|custom
	StartDate            string   `json:"start_date"`
	// Next due aliases
	NextDueDate          string   `gorm:"index" json:"next_due_date"`
	NextDueAt            string   `gorm:"index" json:"next_due_at"`
	LastDoneDate         string   `json:"last_done_date"`
	// Assignee aliases
	AssignedTo           string   `json:"assigned_to"`
	AssignedToName       string   `json:"assigned_to_name"`
	ContractorName       string   `json:"contractor_name"`
	EstimatedCost        *float64 `json:"estimated_cost"`
	ReminderDaysBefore   int      `gorm:"default:7" json:"reminder_days_before"`
	CreatedByName        string   `json:"created_by_name"`
	Notes                string   `json:"notes"`
	Status               string   `gorm:"default:'active'" json:"status"` // active|paused|completed
}

// MaintenanceContract tracks contractor / supplier agreements
type MaintenanceContract struct {
	Base
	HomeID             string   `gorm:"index" json:"home_id"` // empty = applies to all homes
	HomeName           string   `json:"home_name"`
	ContractorName     string   `gorm:"not null" json:"contractor_name"`
	ServiceType        string   `json:"service_type"`
	ContractStartDate  string   `json:"contract_start_date"`
	ContractEndDate    string   `gorm:"index" json:"contract_end_date"`
	CostAmount         *float64 `json:"cost_amount"`
	CostFrequency      string   `json:"cost_frequency"` // monthly|annual|one_off
	ContactName        string   `json:"contact_name"`
	ContactPhone       string   `json:"contact_phone"`
	ContactEmail       string   `json:"contact_email"`
	Status             string   `gorm:"default:'active'" json:"status"` // active|expired|cancelled
	Notes              string   `json:"notes"`
	DocumentURL        string   `json:"document_url"`
}

func (m *MaintenanceLog) normalizeAliases() {
	if m.IssueTitle == "" {
		m.IssueTitle = m.Title
	}
	if m.Title == "" {
		m.Title = m.IssueTitle
	}
	if m.IssueDescription == "" {
		m.IssueDescription = m.Description
	}
	if m.Description == "" {
		m.Description = m.IssueDescription
	}
	if m.IssueCategory == "" {
		if m.Category != "" {
			m.IssueCategory = m.Category
		} else {
			m.IssueCategory = m.MaintenanceType
		}
	}
	if m.Category == "" {
		m.Category = m.IssueCategory
	}
	if m.MaintenanceType == "" {
		m.MaintenanceType = m.IssueCategory
	}
	// Normalize date fields
	if m.ReportedDate == "" {
		if m.DateReported != "" {
			m.ReportedDate = m.DateReported
		} else if m.ReportedAt != "" {
			m.ReportedDate = m.ReportedAt
		} else {
			m.ReportedDate = m.IssueDate
		}
	}
	if m.DateReported == "" {
		m.DateReported = m.ReportedDate
	}
	if m.ReportedAt == "" {
		m.ReportedAt = m.ReportedDate
	}
	if m.IssueDate == "" {
		m.IssueDate = m.ReportedDate
	}
	if m.DueAt == "" {
		m.DueAt = m.DueDate
	}
	if m.DueDate == "" {
		m.DueDate = m.DueAt
	}
	// Contractor alias
	if m.ContractorName == "" {
		m.ContractorName = m.Contractor
	}
	if m.Contractor == "" {
		m.Contractor = m.ContractorName
	}
	// Reporter
	if m.ReportedBy == "" {
		m.ReportedBy = m.IssueReportedByID
	}
	if m.IssueReportedByID == "" {
		m.IssueReportedByID = m.ReportedBy
	}
	if m.ReportedByName == "" {
		m.ReportedByName = m.IssueReportedByName
	}
	if m.IssueReportedByName == "" {
		m.IssueReportedByName = m.ReportedByName
	}
	if m.ResolutionDate == "" {
		m.ResolutionDate = m.DateResolved
	}
	if m.DateResolved == "" {
		m.DateResolved = m.ResolutionDate
	}
	// Evidence
	if m.EvidenceURL == "" {
		m.EvidenceURL = m.PhotoURL
	}
	if m.PhotoURL == "" {
		m.PhotoURL = m.EvidenceURL
	}
}

func (m *MaintenanceLog) BeforeCreate(tx *gorm.DB) error {
	m.normalizeAliases()
	return m.Base.BeforeCreate(tx)
}

func (m *MaintenanceLog) BeforeUpdate(tx *gorm.DB) error {
	m.normalizeAliases()
	return m.Base.BeforeUpdate(tx)
}

type HomeAsset struct {
	Base
	HomeID                   string     `gorm:"index" json:"home_id"`
	AssignedHomeID           string     `gorm:"-" json:"assigned_home_id"`
	HomeName                 string     `json:"home_name"`
	AssignedHomeName         string     `gorm:"-" json:"assigned_home_name"`
	
	AssetRef                 string     `gorm:"index" json:"asset_ref"`
	AssetID                  string     `gorm:"-" json:"asset_id"` // alias to asset_ref
	Name                     string     `json:"name"`
	AssetName                string     `gorm:"-" json:"asset_name"` // alias to Name
	Category                 string     `json:"category"`
	AssetCategory            string     `gorm:"-" json:"asset_category"` // alias to Category
	AssetType                string     `json:"asset_type"`
	BrandModel               string     `json:"brand_model"`
	SerialNumber             string     `json:"serial_number"`
	Barcode                  string     `json:"barcode"`
	Description              string     `json:"description"`
	Quantity                 int        `gorm:"default:1" json:"quantity"`
	UnitOfMeasure            string     `gorm:"default:'Each'" json:"unit_of_measure"`
	Condition                string     `json:"condition"`
	Status                   string     `json:"status"`

	PurchaseDate             *time.Time `json:"purchase_date"`
	Supplier                 string     `json:"supplier"`
	SupplierName             string     `gorm:"-" json:"supplier_name"`
	PurchaseCost             *float64   `json:"purchase_cost"`
	Value                    float64    `json:"value"`
	DepreciationType         string     `json:"depreciation_type"`
	WarrantyExpiry           string     `json:"warranty_expiry"`
	InvoiceReference         string     `json:"invoice_reference"`
	InvoiceURL               string     `json:"invoice_url"`
	FundingSource            string     `json:"funding_source"`
	BudgetCode               string     `json:"budget_code"`
	LinkedBillID             string     `json:"linked_bill_id"`
	FinanceLinkStatus        string     `json:"finance_link_status"`

	AssignedStaffID          string     `json:"assigned_staff_id"`
	AssignedStaffName        string     `json:"assigned_staff_name"`
	RoomLocation             string     `json:"room_location"`
	AssignedRoom             string     `gorm:"-" json:"assigned_room"`
	LocationInHome           string     `gorm:"-" json:"location_in_home"`
	DepartmentTeam           string     `json:"department_team"`
	CustodianOwner           string     `json:"custodian_owner"`
	IssueDate                *time.Time `json:"issue_date"`
	ReturnDueDate            *time.Time `json:"return_due_date"`

	NextServiceDate          *time.Time `json:"next_service_date"`
	LastInspectionDate       *time.Time `json:"last_inspection_date"`
	PatTestDue               *time.Time `json:"pat_test_due"`
	RiskLevel                string     `json:"risk_level"`
	ReplacementDueDate       *time.Time `json:"replacement_due_date"`
	MaintenanceNotes         string     `json:"maintenance_notes"`

	PatRequired              bool       `gorm:"default:false" json:"pat_required"`
	FireSafetyCritical       bool       `gorm:"default:false" json:"fire_safety_critical"`
	ManualHandling           bool       `gorm:"default:false" json:"manual_handling"`
	DataProtection           bool       `gorm:"default:false" json:"data_protection"`
	CoshhRelated             bool       `gorm:"default:false" json:"coshh_related"`
	InfectionControl         bool       `gorm:"default:false" json:"infection_control"`
	HealthSafetyCritical     bool       `gorm:"default:false" json:"health_safety_critical"`
	RequiresAnnualInspection bool       `gorm:"default:false" json:"requires_annual_inspection"`
	RequiresStaffTraining    bool       `gorm:"default:false" json:"requires_staff_training"`
	WarrantyMonitored        bool       `gorm:"default:false" json:"warranty_monitored"`

	InternalNotes            string     `json:"internal_notes"`
	Notes                    string     `gorm:"-" json:"notes"`
	HandoverNotes            string     `json:"handover_notes"`
	PhotoURL                 string     `json:"photo_url"`

	ApprovalStatus           string     `gorm:"default:'Draft'" json:"approval_status"`
	CreatedByName            string     `json:"created_by_name"`
	SubmittedBy              string     `json:"submitted_by"`
	ApprovedBy               string     `json:"approved_by"`
	SubmittedAt              *time.Time `json:"submitted_at"`
}

func (a *HomeAsset) normalizeAliases() {
	if a.HomeID == "" && a.AssignedHomeID != "" {
		a.HomeID = a.AssignedHomeID
	}
	if a.HomeName == "" && a.AssignedHomeName != "" {
		a.HomeName = a.AssignedHomeName
	}
	if a.AssetRef == "" && a.AssetID != "" {
		a.AssetRef = a.AssetID
	}
	if a.Name == "" && a.AssetName != "" {
		a.Name = a.AssetName
	}
	if a.Category == "" && a.AssetCategory != "" {
		a.Category = a.AssetCategory
	}
	if a.Supplier == "" && a.SupplierName != "" {
		a.Supplier = a.SupplierName
	}
	if a.RoomLocation == "" {
		if a.AssignedRoom != "" {
			a.RoomLocation = a.AssignedRoom
		} else if a.LocationInHome != "" {
			a.RoomLocation = a.LocationInHome
		}
	}
	if a.InternalNotes == "" && a.Notes != "" {
		a.InternalNotes = a.Notes
	}
}

func (a *HomeAsset) BeforeCreate(tx *gorm.DB) error {
	a.normalizeAliases()
	return a.Base.BeforeCreate(tx)
}

func (a *HomeAsset) BeforeUpdate(tx *gorm.DB) error {
	a.normalizeAliases()
	return a.Base.BeforeUpdate(tx)
}

type HomeCheck struct {
	Base
	HomeID            string         `gorm:"not null;index" json:"home_id"`
	HomeName          string         `json:"home_name"`
	CheckType         string         `gorm:"index" json:"check_type"` // daily|weekly|monthly
	CheckDate         string         `gorm:"index" json:"check_date"`
	CheckedByID       string         `json:"checked_by_id"`
	CheckedByName     string         `json:"checked_by_name"`
	CompletedBy       string         `json:"completed_by"`
	Items             datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"items"`
	OverallResult     string         `gorm:"default:'pass';index" json:"overall_result"` // pass|advisory|fail
	AnyFails          bool           `gorm:"default:false;index" json:"any_fails"`
	MaintenanceIssues pq.StringArray `gorm:"type:text[]" json:"maintenance_issues"`
	SignedOffAt       string         `json:"signed_off_at"`
	Passed            bool           `gorm:"default:true" json:"passed"`
	Notes             string         `json:"notes"`
}

func (h *HomeCheck) normalizeAliases() {
	if h.CompletedBy == "" {
		h.CompletedBy = h.CheckedByName
	}
	if h.OverallResult == "" {
		if h.Passed {
			h.OverallResult = "pass"
		} else if h.AnyFails {
			h.OverallResult = "fail"
		}
	}
	h.Passed = h.OverallResult != "fail" && !h.AnyFails
}

func (h *HomeCheck) BeforeCreate(tx *gorm.DB) error {
	h.normalizeAliases()
	return h.Base.BeforeCreate(tx)
}

func (h *HomeCheck) BeforeUpdate(tx *gorm.DB) error {
	h.normalizeAliases()
	return h.Base.BeforeUpdate(tx)
}

// HomeCheckTemplate defines a reusable check/chore template for a home.
type HomeCheckTemplate struct {
	Base
	Title                 string `json:"title"`
	Description           string `json:"description"`
	Frequency             string `gorm:"index" json:"frequency"` // daily|weekly|monthly|quarterly|yearly|as_needed
	Area                  string `json:"area"`
	DefaultDueTime        string `json:"default_due_time"`
	IsActive              bool   `gorm:"default:true;index" json:"is_active"`
	RequiresManagerReview bool   `gorm:"default:true" json:"requires_manager_review"`
	DisplayOrder          int    `json:"display_order"`
}

// HomeCheckTemplateItem is a single sub-check within a HomeCheckTemplate.
type HomeCheckTemplateItem struct {
	Base
	TemplateID          string `gorm:"not null;index" json:"template_id"`
	ItemTitle           string `json:"item_title"`
	ItemQuestion        string `json:"item_question"`
	IsRequired          bool   `gorm:"default:true" json:"is_required"`
	AllowsNa            bool   `gorm:"default:true" json:"allows_na"`
	RequiresNoteOnFail  bool   `gorm:"default:false" json:"requires_note_on_fail"`
	RequiresPhotoOnFail bool   `gorm:"default:false" json:"requires_photo_on_fail"`
	IsActive            bool   `gorm:"default:true" json:"is_active"`
	DisplayOrder        int    `json:"display_order"`
}

// HomeCheckInstance is a scheduled occurrence of a template for a specific home and date.
type HomeCheckInstance struct {
	Base
	HomeID            string `gorm:"not null;index" json:"home_id"`
	TemplateID        string `gorm:"not null;index" json:"template_id"`
	TemplateTitle     string `json:"template_title"`
	TemplateArea      string `json:"template_area"`
	TemplateFrequency string `json:"template_frequency"`
	ScheduledDate     string `gorm:"index" json:"scheduled_date"`
	DueAt             string `json:"due_at"`
	Status            string `gorm:"default:'due';index" json:"status"` // due|in_progress|submitted_for_review|completed|cancelled|archived
}

// HomeCheckCompletion captures a staff submission for a HomeCheckInstance.
type HomeCheckCompletion struct {
	Base
	HomeID              string `gorm:"not null;index" json:"home_id"`
	InstanceID          string `gorm:"not null;index" json:"instance_id"`
	TemplateID          string `gorm:"index" json:"template_id"`
	SubmittedByStaffID  string `json:"submitted_by_staff_id"`
	SubmittedByName     string `json:"submitted_by_name"`
	SubmittedAt         string `json:"submitted_at"`
	CompletionDate      string `gorm:"index" json:"completion_date"`
	OverallStatus       string `gorm:"default:'submitted_for_review'" json:"overall_status"`
	GeneralNote         string `json:"general_note"`
	PhotoUrl            string `json:"photo_url"`
	ManagerReviewStatus string `gorm:"default:'pending'" json:"manager_review_status"` // pending|approved|rejected
}

// HomeCheckItemResponse records a staff answer to one sub-check item within a completion.
type HomeCheckItemResponse struct {
	Base
	CompletionID       string `gorm:"not null;index" json:"completion_id"`
	InstanceID         string `gorm:"index" json:"instance_id"`
	TemplateItemID     string `gorm:"index" json:"template_item_id"`
	ItemTitle          string `json:"item_title"`
	ResponseStatus     string `gorm:"index" json:"response_status"` // pass|fail|na
	Note               string `json:"note"`
	IssueDetails       string `json:"issue_details"`
	IssueCreated       bool   `gorm:"default:false" json:"issue_created"`
	CompletedByStaffID string `json:"completed_by_staff_id"`
	CompletedByName    string `json:"completed_by_name"`
	CompletedAt        string `json:"completed_at"`
}

// HomeCheckIssue is raised automatically when a sub-check item is marked as failed.
type HomeCheckIssue struct {
	Base
	HomeID               string `gorm:"not null;index" json:"home_id"`
	InstanceID           string `gorm:"index" json:"instance_id"`
	CompletionID         string `gorm:"index" json:"completion_id"`
	TemplateID           string `gorm:"index" json:"template_id"`
	TemplateItemID       string `json:"template_item_id"`
	IssueTitle           string `json:"issue_title"`
	IssueDetails         string `json:"issue_details"`
	Severity             string `gorm:"default:'medium';index" json:"severity"` // low|medium|high|critical
	ImmediateActionTaken string `json:"immediate_action_taken"`
	Status               string `gorm:"default:'open';index" json:"status"` // open|in_progress|resolved|escalated
	ReportedByStaffID    string `json:"reported_by_staff_id"`
	ReportedByName       string `json:"reported_by_name"`
	ResolvedByStaffID    string `json:"resolved_by_staff_id"`
	ResolvedAt           string `json:"resolved_at"`
	AssignedToName       string `json:"assigned_to_name"`
	DueDate              string `json:"due_date"`
}

type HomeBudget struct {
	Base
	HomeID      string  `gorm:"not null;index" json:"home_id"`
	PeriodStart string  `json:"period_start"`
	PeriodEnd   string  `json:"period_end"`
	TotalBudget float64 `json:"total_budget"`
	SpentAmount float64 `json:"spent_amount"`
	Status      string  `json:"status"`
}

type HomeBudgetLine struct {
	Base
	HomeID          string  `gorm:"not null;index" json:"home_id"`
	BudgetID        string  `gorm:"not null;index" json:"budget_id"`
	Category        string  `json:"category"`
	AllocatedAmount float64 `json:"allocated_amount"`
	SpentAmount     float64 `json:"spent_amount"`
}

type HomeExpense struct {
	Base
	HomeID      string  `gorm:"not null;index" json:"home_id"`
	Date        string  `json:"date"`
	Category    string  `json:"category"`
	Amount      float64 `json:"amount"`
	Description string  `json:"description"`
	SubmittedBy string  `json:"submitted_by"`
	ApprovedBy  string  `json:"approved_by"`
	ReceiptURL  string  `json:"receipt_url"`
	Status      string  `gorm:"default:'pending'" json:"status"`
}

type MealPlan struct {
	Base
	HomeID        string         `gorm:"not null;index" json:"home_id"`
	HomeName      string         `json:"home_name"`
	WeekStart     string         `gorm:"not null;index" json:"week_start"`
	Days          datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"days"`
	CreatedByName string         `json:"created_by_name"`
}

type VisitorLog struct {
	Base
	HomeID              string `gorm:"not null;index" json:"home_id"`
	HomeName            string `json:"home_name"`
	RecordedByID        string `json:"recorded_by_id"`
	RecordedByName      string `json:"recorded_by_name"`
	VisitDate           string `gorm:"index" json:"visit_date"`
	ArrivalTime         string `json:"arrival_time"`
	DepartureTime       string `json:"departure_time"`
	VisitorName         string `gorm:"index" json:"visitor_name"`
	VisitorOrganisation string `json:"visitor_organisation"`
	VisitorRelationship string `gorm:"index" json:"visitor_relationship"`
	PurposeOfVisit      string `json:"purpose_of_visit"`
	ResidentVisitedID   string `gorm:"index" json:"resident_visited_id"`
	ResidentVisitedName string `json:"resident_visited_name"`
	DBSChecked          bool   `gorm:"default:false" json:"dbs_checked"`
	DBSCheckDate        string `json:"dbs_check_date"`
	StaffWhoAuthorised  string `json:"staff_who_authorised"`
	AnyConcerns         bool   `gorm:"default:false" json:"any_concerns"`
	ConcernNotes        string `json:"concern_notes"`
	SignedIn            bool   `gorm:"default:true;index" json:"signed_in"`
}

type OfstedNotification struct {
	Base
	HomeID                string `gorm:"not null;index" json:"home_id"`
	HomeName              string `json:"home_name"`
	NotificationType      string `gorm:"index" json:"notification_type"`
	EventDate             string `gorm:"index" json:"event_date"`
	ResidentID            string `gorm:"index" json:"resident_id"`
	ResidentName          string `json:"resident_name"`
	StaffID               string `gorm:"index" json:"staff_id"`
	StaffName             string `json:"staff_name"`
	EventSummary          string `json:"event_summary"`
	HoursToNotify         int    `json:"hours_to_notify"`
	NotificationMethod    string `json:"notification_method"`
	NotifiedDatetime      string `gorm:"index" json:"notified_datetime"`
	OfstedReferenceNumber string `json:"ofsted_reference_number"`
	OfstedContactName     string `json:"ofsted_contact_name"`
	OfstedResponse        string `json:"ofsted_response"`
	Status                string `gorm:"default:'pending';index" json:"status"`
}

type Reg44Report struct {
	Base
	HomeID                          string         `gorm:"not null;index" json:"home_id"`
	HomeName                        string         `json:"home_name"`
	VisitDate                       string         `gorm:"index" json:"visit_date"`
	VisitMonth                      string         `gorm:"index" json:"visit_month"`
	InspectorName                   string         `json:"inspector_name"`
	InspectorOrganisation           string         `json:"inspector_organisation"`
	InspectorContact                string         `json:"inspector_contact"`
	VisitDurationHours              string         `json:"visit_duration_hours"`
	ResidentsSpokenTo               string         `json:"residents_spoken_to"`
	StaffSpokenTo                   string         `json:"staff_spoken_to"`
	RecordsReviewed                 datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"records_reviewed"`
	QualityStandards                datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"quality_standards"`
	OverallRating                   string         `gorm:"default:'good';index" json:"overall_rating"`
	Strengths                       string         `json:"strengths"`
	AreasForImprovement             string         `json:"areas_for_improvement"`
	SeriousConcerns                 bool           `gorm:"default:false" json:"serious_concerns"`
	SeriousConcernDetail            string         `json:"serious_concern_detail"`
	PreviousRecommendationsReviewed bool           `gorm:"default:false" json:"previous_recommendations_reviewed"`
	PreviousRecommendationsActioned datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"previous_recommendations_actioned"`
	NewRecommendations              datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"new_recommendations"`
	ManagerResponse                 string         `json:"manager_response"`
	ActionPlan                      string         `json:"action_plan"`
	ManagerID                       string         `json:"manager_id"`
	ManagerName                     string         `json:"manager_name"`
	ManagerResponseDate             string         `json:"manager_response_date"`
	Status                          string         `gorm:"default:'submitted';index" json:"status"`
	SubmittedAt                     string         `json:"submitted_at"`
}

type Reg45Review struct {
	Base
	HomeID                     string         `gorm:"not null;index" json:"home_id"`
	HomeName                   string         `json:"home_name"`
	ReviewYear                 string         `gorm:"index" json:"review_year"`
	PeriodStart                string         `json:"period_start"`
	PeriodEnd                  string         `json:"period_end"`
	PreparedByID               string         `json:"prepared_by_id"`
	PreparedByName             string         `json:"prepared_by_name"`
	Reg44ReportsCompleted      int            `json:"reg44_reports_completed"`
	OverallRatingsBreakdown    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"overall_ratings_breakdown"`
	TotalRecommendationsMade   int            `json:"total_recommendations_made"`
	RecommendationsActioned    int            `json:"recommendations_actioned"`
	RecommendationsOutstanding int            `json:"recommendations_outstanding"`
	TotalComplaints            int            `json:"total_complaints"`
	UpheldComplaints           int            `json:"upheld_complaints"`
	ResolvedWithinTimescale    int            `json:"resolved_within_timescale"`
	EscalatedToOfsted          int            `json:"escalated_to_ofsted"`
	TotalIncidents             int            `json:"total_incidents"`
	MissingFromHomeEpisodes    int            `json:"missing_from_home_episodes"`
	OfstedNotificationsMade    int            `json:"ofsted_notifications_made"`
	QualityOfCareAssessment    string         `json:"quality_of_care_assessment"`
	ChildrenOutcomesAssessment string         `json:"children_outcomes_assessment"`
	SafeguardingEffectiveness  string         `json:"safeguarding_effectiveness"`
	LeadershipAssessment       string         `json:"leadership_assessment"`
	ImprovementsMadeThisYear   string         `json:"improvements_made_this_year"`
	AreasForDevelopment        string         `json:"areas_for_development"`
	PrioritiesForNextYear      string         `json:"priorities_for_next_year"`
	Status                     string         `gorm:"default:'draft';index" json:"status"`
}

type AdmissionDischargeNotice struct {
	Base
	HomeID                         string     `gorm:"not null;index" json:"home_id"`
	HomeName                       string     `json:"home_name"`
	HomeAddress                    string     `json:"home_address"`
	ResidentID                     string     `gorm:"not null;index" json:"resident_id"`
	ResidentName                   string     `json:"resident_name"`
	NoticeType                     string     `gorm:"not null;index;default:'admission'" json:"notice_type"` // admission|discharge
	ChildName                      string     `json:"child_name"`
	ChildDOB                       string     `json:"child_dob"`
	AccommodationBasis             string     `json:"accommodation_basis"`
	SubjectToCareOrder             bool       `gorm:"default:false" json:"subject_to_care_order"`
	CareOrderType                  string     `json:"care_order_type"`
	IROOrPAName                    string     `json:"iro_or_pa_name"`
	IROOrPAContact                 string     `json:"iro_or_pa_contact"`
	AccommodatingAuthorityName     string     `json:"accommodating_authority_name"`
	AccommodatingAuthorityContact  string     `json:"accommodating_authority_contact"`
	HasEHCPlan                     bool       `gorm:"default:false" json:"has_ehc_plan"`
	EHCPlanLA                      string     `json:"ehc_plan_la"`
	HasSENStatement                bool       `gorm:"default:false" json:"has_sen_statement"`
	SENStatementLA                 string     `json:"sen_statement_la"`
	IsSameAsAccommodatingAuthority bool       `gorm:"default:false" json:"is_same_as_accommodating_authority"`
	ReceivingLAName                string     `json:"receiving_la_name"`
	ReceivingLAContactName         string     `json:"receiving_la_contact_name"`
	ReceivingLAEmail               string     `json:"receiving_la_email"`
	ReceivingLAAddress             string     `json:"receiving_la_address"`
	NotificationDate               string     `json:"notification_date"`
	NotificationMethod             string     `json:"notification_method"`
	NotificationSentByID           string     `json:"notification_sent_by_id"`
	NotificationSentByName         string     `json:"notification_sent_by_name"`
	NotificationConfirmedReceived  bool       `gorm:"default:false" json:"notification_confirmed_received"`
	ConfirmationReceivedAt         *time.Time `json:"confirmation_received_at"`
	ConfirmationReference          string     `json:"confirmation_reference"`
	AdmissionDate                  string     `json:"admission_date"`
	DischargeDate                  string     `json:"discharge_date"`
	DischargeDestination           string     `json:"discharge_destination"`
	DischargeReason                string     `json:"discharge_reason"`
	Status                         string     `gorm:"default:'draft';index" json:"status"` // draft|sent|confirmed|overdue
	DaysSincePlacementChange       int        `json:"days_since_placement_change"`
	NotifiedWithinRequiredPeriod   *bool      `json:"notified_within_required_period"`
	CreatedByID                    string     `json:"created_by_id"`
	CreatedByName                  string     `json:"created_by_name"`
}

type SignificantEvent struct {
	Base
	HomeID                     string `gorm:"not null;index" json:"home_id"`
	HomeName                   string `json:"home_name"`
	RecordedByID               string `json:"recorded_by_id"`
	RecordedByName             string `json:"recorded_by_name"`
	EventDatetime              string `gorm:"index" json:"event_datetime"`
	EventType                  string `gorm:"index" json:"event_type"`
	ResidentID                 string `gorm:"index" json:"resident_id"`
	ResidentName               string `json:"resident_name"`
	Summary                    string `json:"summary"`
	FullDetail                 string `json:"full_detail"`
	ImmediateActionTaken       string `json:"immediate_action_taken"`
	ManagerNotified            bool   `gorm:"default:false" json:"manager_notified"`
	ManagerNotifiedDatetime    string `json:"manager_notified_datetime"`
	LANotified                 bool   `gorm:"default:false" json:"la_notified"`
	LANotifiedDatetime         string `json:"la_notified_datetime"`
	OfstedNotified             bool   `gorm:"default:false" json:"ofsted_notified"`
	OfstedNotificationRequired bool   `gorm:"default:false;index" json:"ofsted_notification_required"`
	OfstedNotifiedDatetime     string `json:"ofsted_notified_datetime"`
	PoliceInvolved             bool   `gorm:"default:false" json:"police_involved"`
	PoliceReference            string `json:"police_reference"`
	FollowUpRequired           bool   `gorm:"default:false" json:"follow_up_required"`
	FollowUpActions            string `json:"follow_up_actions"`
	ReviewCompleted            bool   `gorm:"default:false" json:"review_completed"`
	ReviewDate                 string `json:"review_date"`
	ReviewedByName             string `json:"reviewed_by_name"`
}

type Complaint struct {
	Base

	// ── Core identifiers ──────────────────────────────────────────────────────
	HomeID                string `gorm:"index" json:"home_id"`
	ResidentID            string `gorm:"index" json:"resident_id"`
	ComplaintID           string `json:"complaint_id"` // human-readable reference e.g. CMP-2024-001
	ResidentName          string `json:"resident_name"`
	HomeName              string `json:"home_name"`
	AccommodationCategory string `json:"accommodation_category"`

	// ── Receipt details ───────────────────────────────────────────────────────
	ReceivedDatetime string `gorm:"index" json:"received_datetime"`
	ReceivedByID     string `json:"received_by_id"`
	ReceivedByName   string `json:"received_by_name"`
	ReceivedMethod   string `json:"received_method"` // in_person|phone|letter|email|other

	// ── Complainant details ───────────────────────────────────────────────────
	ComplainantSource       string `json:"complainant_source"` // child|parent_carer|local_authority|professional|staff|other
	IsChildComplainant      bool   `gorm:"default:false;index" json:"is_child_complainant"`
	ComplainantName         string `json:"complainant_name"`
	ComplainantRelationship string `json:"complainant_relationship"`
	ComplainantContact      string `json:"complainant_contact"`

	// ── Complaint details ─────────────────────────────────────────────────────
	ComplaintType    string `json:"complaint_type"` // care_quality|staff_conduct|accommodation|food|activities|etc.
	ComplaintDetails string `gorm:"type:text" json:"complaint_details"`
	Severity         string `json:"severity"` // minor|moderate|serious|very_serious
	Summary          string `json:"summary"`
	FullDetail       string `gorm:"type:text" json:"full_detail"`
	IsRepresentation bool   `gorm:"default:false" json:"is_representation"`

	// Legacy title/description fields kept for backward compatibility
	Title       string `json:"title"`
	Description string `gorm:"type:text" json:"description"`

	// ── Status & timeline ─────────────────────────────────────────────────────
	Status               string `gorm:"default:'received';index" json:"status"` // received|investigating|resolved|closed
	TargetResolutionDate string `json:"target_resolution_date"`
	ResolutionDate       string `json:"resolution_date"`

	// ── Acknowledgement ───────────────────────────────────────────────────────
	Acknowledged     bool   `gorm:"default:false" json:"acknowledged"`
	AcknowledgedDate string `json:"acknowledged_date"`

	// ── Compliance & Ofsted ───────────────────────────────────────────────────
	AnnexAReportable    bool   `gorm:"default:true" json:"annex_a_reportable"`
	ManagerReviewStatus string `json:"manager_review_status"` // pending_review|reviewed|escalated
	EscalatedToOfsted   bool   `gorm:"default:false" json:"escalated_to_ofsted"`
	OfstedReference     string `json:"ofsted_reference"`

	// ── Investigation ─────────────────────────────────────────────────────────
	InvestigationStartDate string         `json:"investigation_start_date"`
	InvestigatedByName     string         `json:"investigated_by_name"`
	InvestigationOutcome   string         `gorm:"type:text" json:"investigation_outcome"`
	ActionsTaken           string         `gorm:"type:text" json:"actions_taken"`
	LessonsLearned         string         `gorm:"type:text" json:"lessons_learned"`
	EvidenceURLs           datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"evidence_urls"`

	// ── Outcome & learning ────────────────────────────────────────────────────
	OutcomeStatus             string `json:"outcome_status"` // open|under_review|response_issued|resolved|escalated|closed
	OutcomeCategory           string `json:"outcome_category"` // upheld|partially_upheld|not_upheld|resolved_informally|withdrawn|escalated_externally
	ResponseGivenToYP         *bool  `json:"response_given_to_yp"`
	YPUnderstoodOutcome       string `json:"yp_understood_outcome"` // yes|no|partially|not_confirmed
	ImpactOnYP                string `gorm:"type:text" json:"impact_on_yp"`
	ServiceLearningIdentified string `gorm:"type:text" json:"service_learning_identified"`
	PracticeChanged           *bool  `json:"practice_changed"`
	WhatChanged               string `gorm:"type:text" json:"what_changed"`
	ApologyGiven              string `json:"apology_given"` // yes|no|not_applicable

	// ── Follow-up ─────────────────────────────────────────────────────────────
	OutcomeFollowUpRequired      bool   `gorm:"default:false" json:"outcome_follow_up_required"`
	OutcomeFollowUpAction        string `gorm:"type:text" json:"outcome_follow_up_action"`
	OutcomeResponsiblePersonID   string `json:"outcome_responsible_person_id"`
	OutcomeResponsiblePersonName string `json:"outcome_responsible_person_name"`
	OutcomeTargetDate            string `json:"outcome_target_date"`

	// ── Outcome manager review ────────────────────────────────────────────────
	OutcomeManagerReviewStatus string `json:"outcome_manager_review_status"` // pending|approved|changes_requested|escalated|closed
	OutcomeManagerReviewNote   string `gorm:"type:text" json:"outcome_manager_review_note"`
	OutcomeRecordedByID        string `json:"outcome_recorded_by_id"`
	OutcomeRecordedByName      string `json:"outcome_recorded_by_name"`
	OutcomeRecordedAt          string `json:"outcome_recorded_at"`
}

// DeprivationOfLiberty records court orders and legal restrictions applied to a resident.
type DeprivationOfLiberty struct {
	Base

	// ── Resident / home context ───────────────────────────────────────────────
	ResidentID            string `gorm:"not null;index" json:"resident_id"`
	ResidentName          string `json:"resident_name"`
	HomeID                string `gorm:"index" json:"home_id"`
	HomeName              string `json:"home_name"`
	AccommodationCategory string `json:"accommodation_category"`

	// ── Order details ─────────────────────────────────────────────────────────
	SubjectToOrder           bool           `gorm:"default:false" json:"subject_to_order"`
	OrderType                string         `json:"order_type"`                              // mental_capacity_act|best_interests_safeguards|other
	CourtOrderReference      string         `json:"court_order_reference"`
	OrderStartDate           string         `json:"order_start_date"`
	OrderEndDate             string         `json:"order_end_date"`
	ResponsibleLocalAuthority string        `json:"responsible_local_authority"`
	AddressWhereOrderApplies string         `gorm:"type:text" json:"address_where_order_applies"`
	DocumentURLs             datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"document_urls"`

	// ── Review schedule ───────────────────────────────────────────────────────
	ReviewDate    string `json:"review_date"`
	NextReviewDue string `json:"next_review_due"`

	// ── Status & notes ────────────────────────────────────────────────────────
	Status string `gorm:"default:'active';index" json:"status"` // active|inactive|expired
	Notes  string `gorm:"type:text" json:"notes"`
}

type MissingFromHome struct {
	Base
	HomeID                   string         `gorm:"index" json:"home_id"`
	HomeName                 string         `json:"home_name"`
	ResidentID               string         `gorm:"index" json:"resident_id"`
	ResidentName             string         `json:"resident_name"`
	ReportedByID             string         `json:"reported_by_id"`
	ReportedByName           string         `json:"reported_by_name"`
	ReportedMissingDatetime  string         `gorm:"index" json:"reported_missing_datetime"`
	LastSeenDatetime         string         `json:"last_seen_datetime"`
	LastSeenLocation         string         `json:"last_seen_location"`
	LastSeenBy               string         `json:"last_seen_by"`
	ReportedToPolice         bool           `gorm:"default:false" json:"reported_to_police"`
	PoliceReportDatetime     string         `json:"police_report_datetime"`
	PoliceReferenceNumber    string         `json:"police_reference_number"`
	PoliceStation            string         `json:"police_station"`
	RiskLevelAtTime          string         `json:"risk_level_at_time"`
	CseRiskConsidered        bool           `gorm:"default:false" json:"cse_risk_considered"`
	KnownAssociatesChecked   bool           `gorm:"default:false" json:"known_associates_checked"`
	AreasSearched            pq.StringArray `gorm:"type:text[]" json:"areas_searched"`
	PeopleContacted          pq.StringArray `gorm:"type:text[]" json:"people_contacted"`
	LANotified               bool           `gorm:"default:false" json:"la_notified"`
	OfstedNotified           bool           `gorm:"default:false" json:"ofsted_notified"`
	Status                   string         `gorm:"default:'active';index" json:"status"`
	ReturnedDatetime         string         `json:"returned_datetime"`
	ReturnedTo               string         `json:"returned_to"`
	ConditionOnReturn        string         `json:"condition_on_return"`
	ConditionNotes           string         `json:"condition_notes"`
	TotalHoursMissing        int            `json:"total_hours_missing"`
	ReturnInterviewCompleted bool           `gorm:"default:false" json:"return_interview_completed"`
	ReturnInterviewDatetime  string         `json:"return_interview_datetime"`
	ReturnInterviewByID      string         `json:"return_interview_by_id"`
	ReturnInterviewByName    string         `json:"return_interview_by_name"`
	ReturnInterviewNotes     string         `json:"return_interview_notes"`
	Notes                    string         `json:"notes"`
}
