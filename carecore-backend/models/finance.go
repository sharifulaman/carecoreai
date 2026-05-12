package models

type PlacementFee struct {
	Base
	ResidentID    string  `gorm:"not null;index" json:"resident_id"`
	HomeID        string  `gorm:"not null;index" json:"home_id"`
	LocalAuthority string `gorm:"not null" json:"local_authority"`
	LAContactName  string `json:"la_contact_name"`
	LAContactEmail string `json:"la_contact_email"`
	LAReference    string `json:"la_reference"`
	WeeklyRate     float64 `gorm:"not null" json:"weekly_rate"`
	MonthlyEquivalent float64 `json:"monthly_equivalent"`
	FeeStartDate   string  `gorm:"not null" json:"fee_start_date"`
	FeeEndDate     string  `json:"fee_end_date"`
	ReviewDate     string  `json:"review_date"`
	InvoiceDay     int     `json:"invoice_day"`
	Status         string  `gorm:"default:'active'" json:"status"` // active|paused|ended
	Notes          string  `json:"notes"`
}

type PlacementInvoice struct {
	Base
	ResidentID     string  `gorm:"not null;index" json:"resident_id"`
	HomeID         string  `gorm:"not null;index" json:"home_id"`
	PlacementFeeID string  `gorm:"not null;index" json:"placement_fee_id"`
	InvoiceNumber  string  `json:"invoice_number"`
	PeriodStart    string  `json:"period_start"`
	PeriodEnd      string  `json:"period_end"`
	Amount         float64 `json:"amount"`
	Status         string  `gorm:"default:'draft'" json:"status"` // draft|sent|paid|overdue|disputed
	DueDate        string  `json:"due_date"`
	PaidDate       string  `json:"paid_date"`
	ApprovedBy     string  `json:"approved_by"`
}

type PettyCash struct {
	Base
	HomeID         string  `gorm:"not null;index" json:"home_id"`
	HomeName       string  `json:"home_name"`
	CurrentBalance float64 `json:"current_balance"`
	FloatThreshold float64 `json:"float_threshold"`
	Status         string  `gorm:"default:'active'" json:"status"`
}

type PettyCashTransaction struct {
	Base
	HomeID          string  `gorm:"not null;index" json:"home_id"`
	PettyCashID     string  `gorm:"not null;index" json:"petty_cash_id"`
	TransactionType string  `json:"transaction_type"` // cash_in|cash_out
	Amount          float64 `json:"amount"`
	Category        string  `json:"category"`
	Description     string  `json:"description"`
	Date            string  `json:"date"`
	ReceiptPhotoURL string  `json:"receipt_photo_url"`
	ApprovedBy      string  `json:"approved_by"`
}

type Bill struct {
	Base
	HomeID       string  `gorm:"not null;index" json:"home_id"`
	HomeName     string  `json:"home_name"`
	BillType     string  `json:"bill_type"` // utilities|council_tax|insurance|cleaning|maintenance|rent
	Supplier     string  `json:"supplier"`
	Amount       float64 `json:"amount"`
	DueDate      string  `json:"due_date"`
	PaidDate     string  `json:"paid_date"`
	Status       string  `gorm:"default:'pending'" json:"status"` // pending|paid|overdue|disputed
	Notes        string  `json:"notes"`
	IsDirectDebit bool   `gorm:"default:false" json:"is_direct_debit"`
	IsRecurring  bool    `gorm:"default:false" json:"is_recurring"`
}