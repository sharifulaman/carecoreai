package models

type ApprovalWorkflow struct {
	Base
	EntityType      string  `gorm:"index" json:"entity_type"`
	EntityID        string  `gorm:"index" json:"entity_id"`
	EntityReference string  `json:"entity_reference"`
	HomeID          string  `gorm:"index" json:"home_id"`
	HomeName        string  `json:"home_name"`
	Amount          float64 `json:"amount"`
	Priority        string  `gorm:"default:'normal'" json:"priority"`
	DeadlineDatetime string `json:"deadline_datetime"`
	Status          string  `gorm:"index;default:'pending_tl'" json:"status"`
	CurrentStep     int     `gorm:"default:1" json:"current_step"`
	Description     string  `json:"description"`
	Notes           string  `json:"notes"`
	DueDate         string  `json:"due_date"`

	SubmittedBy     string `gorm:"index" json:"submitted_by"`
	SubmittedByName string `json:"submitted_by_name"`
	SubmittedAt     string `json:"submitted_at"`

	TlApprovedBy     string `json:"tl_approved_by"`
	TlApprovedByName string `json:"tl_approved_by_name"`
	TlApprovedAt     string `json:"tl_approved_at"`

	TmApprovedBy     string `json:"tm_approved_by"`
	TmApprovedByName string `json:"tm_approved_by_name"`
	TmApprovedAt     string `json:"tm_approved_at"`

	RmApprovedBy     string `json:"rm_approved_by"`
	RmApprovedByName string `json:"rm_approved_by_name"`
	RmApprovedAt     string `json:"rm_approved_at"`

	RsmApprovedBy     string `json:"rsm_approved_by"`
	RsmApprovedByName string `json:"rsm_approved_by_name"`
	RsmApprovedAt     string `json:"rsm_approved_at"`

	AdminApprovedBy     string `json:"admin_approved_by"`
	AdminApprovedByName string `json:"admin_approved_by_name"`
	AdminApprovedAt     string `json:"admin_approved_at"`

	FoApprovedBy     string `json:"fo_approved_by"`
	FoApprovedByName string `json:"fo_approved_by_name"`
	FoApprovedAt     string `json:"fo_approved_at"`

	FmApprovedBy     string `json:"fm_approved_by"`
	FmApprovedByName string `json:"fm_approved_by_name"`
	FmApprovedAt     string `json:"fm_approved_at"`

	HoApprovedBy     string `json:"ho_approved_by"`
	HoApprovedByName string `json:"ho_approved_by_name"`
	HoApprovedAt     string `json:"ho_approved_at"`

	HmApprovedBy     string `json:"hm_approved_by"`
	HmApprovedByName string `json:"hm_approved_by_name"`
	HmApprovedAt     string `json:"hm_approved_at"`

	FinanceApprovedBy     string `json:"finance_approved_by"`
	FinanceApprovedByName string `json:"finance_approved_by_name"`
	FinanceApprovedAt     string `json:"finance_approved_at"`

	RejectionReason  string `json:"rejection_reason"`
	RejectedBy       string `json:"rejected_by"`
	RejectedByName   string `json:"rejected_by_name"`
	RejectedAt       string `json:"rejected_at"`

	PostedToExpenses bool   `gorm:"default:false" json:"posted_to_expenses"`
	ExpenseReference string `json:"expense_reference"`
}
