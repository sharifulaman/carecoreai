package models

import (
	"time"
	"gorm.io/datatypes"
)

type Resident struct {
	Base
	HomeID             string         `gorm:"index" json:"home_id"`
	KeyWorkerID        string         `json:"key_worker_id"`
	TeamLeaderID       string         `json:"team_leader_id"`
	DisplayName        string         `gorm:"not null" json:"display_name"`
	Initials           string         `json:"initials"`
	PrivacyMode        bool           `gorm:"default:false" json:"privacy_mode"`
	DOB                *time.Time     `json:"dob"`
	Gender             string         `json:"gender"`
	Ethnicity          string         `json:"ethnicity"`
	Nationality        string         `json:"nationality"`
	Language           string         `gorm:"default:'en'" json:"language"`
	PlacementStart     *time.Time     `json:"placement_start"`
	PlacementType      string         `json:"placement_type"` // childrens_home|supported_accommodation|adult_care
	SocialWorkerName   string         `json:"social_worker_name"`
	SocialWorkerOrg    string         `json:"social_worker_org"`
	SocialWorkerPhone  string         `json:"social_worker_phone"`
	SocialWorkerEmail  string         `json:"social_worker_email"`
	IROName            string         `json:"iro_name"`
	IROContact         string         `json:"iro_contact"`
	PAName             string         `json:"pa_name"`
	PAContact          string         `json:"pa_contact"`
	FamilyContacts     datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"family_contacts"`
	Address            string         `json:"address"`
	RiskLevel          string         `gorm:"default:'low'" json:"risk_level"` // low|medium|high|critical
	Status             string         `gorm:"default:'active'" json:"status"`  // active|on_leave|moved_on|archived
	PhotoURL           string         `json:"photo_url"`
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