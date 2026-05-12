package models

import "time"

type Home struct {
	Base
	Name                string     `gorm:"not null" json:"name"`
	Type                string     `gorm:"not null" json:"type"` // outreach|24_hours|care|18_plus
	CareModel           string     `json:"care_model"`
	Address             string     `json:"address"`
	Postcode            string     `json:"postcode"`
	Phone               string     `json:"phone"`
	Email               string     `json:"email"`
	TeamLeaderID        string     `gorm:"not null" json:"team_leader_id"`
	PrivacyMode         bool       `gorm:"default:false" json:"privacy_mode"`
	ComplianceFramework string     `gorm:"default:'ofsted'" json:"compliance_framework"`
	DefaultLanguage     string     `gorm:"default:'en'" json:"default_language"`
	Status              string     `gorm:"default:'active'" json:"status"` // active|archived|vacant|maintenance
	LeaseStart          *time.Time `json:"lease_start"`
	LeaseEnd            *time.Time `json:"lease_end"`
	MonthlyRent         float64    `json:"monthly_rent"`
	LandlordName        string     `json:"landlord_name"`
	LandlordContact     string     `json:"landlord_contact"`
	LandlordEmail       string     `json:"landlord_email"`
	PropertyNotes       string     `json:"property_notes"`
}

type HomeDocument struct {
	Base
	HomeID       string     `gorm:"not null;index" json:"home_id"`
	Title        string     `gorm:"not null" json:"title"`
	DocumentType string     `json:"document_type"` // gas_safety|electric_cert|fire_risk|insurance|lease
	FileURL      string     `json:"file_url"`
	IssueDate    *time.Time `json:"issue_date"`
	ExpiryDate   *time.Time `json:"expiry_date"`
	ReminderDays int        `gorm:"default:30" json:"reminder_days"`
	Status       string     `gorm:"default:'current'" json:"status"` // current|expiring_soon|expired
	UploadedBy   string     `json:"uploaded_by"`
	Notes        string     `json:"notes"`
}

type HomeTask struct {
	Base
	HomeID          string     `gorm:"not null;index" json:"home_id"`
	Title           string     `gorm:"not null" json:"title"`
	Type            string     `json:"type"`
	AssignedToName  string     `json:"assigned_to_name"`
	DueDate         *time.Time `json:"due_date"`
	Status          string     `gorm:"default:'pending'" json:"status"` // pending|in_progress|completed
	Notes           string     `json:"notes"`
}

type HomeLog struct {
	Base
	HomeID   string `gorm:"not null;index" json:"home_id"`
	Author   string `json:"author"`
	LogType  string `json:"log_type"`
	Content  string `json:"content"`
}

type HomeAsset struct {
	Base
	HomeID       string     `gorm:"not null;index" json:"home_id"`
	Name         string     `gorm:"not null" json:"name"`
	Category     string     `json:"category"`
	SerialNumber string     `json:"serial_number"`
	PurchaseDate *time.Time `json:"purchase_date"`
	Value        float64    `json:"value"`
	Condition    string     `json:"condition"`
	Notes        string     `json:"notes"`
}

type HomeCheck struct {
	Base
	HomeID      string `gorm:"not null;index" json:"home_id"`
	CheckType   string `json:"check_type"`
	CheckDate   string `json:"check_date"`
	CompletedBy string `json:"completed_by"`
	Passed      bool   `json:"passed"`
	Notes       string `json:"notes"`
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