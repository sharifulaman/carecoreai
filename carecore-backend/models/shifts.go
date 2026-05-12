package models

import "github.com/lib/pq"

type ShiftTemplate struct {
	Base
	HomeID        string `gorm:"not null;index" json:"home_id"`
	HomeName      string `json:"home_name"`
	Name          string `gorm:"not null" json:"name"`
	ShiftType     string `json:"shift_type"` // morning|afternoon|night|sleeping
	TimeStart     string `json:"time_start"`
	TimeEnd       string `json:"time_end"`
	StaffRequired int    `gorm:"default:1" json:"staff_required"`
	Active        bool   `gorm:"default:true" json:"active"`
	Notes         string `json:"notes"`
}

type Rota struct {
	Base
	HomeID      string `gorm:"not null;index" json:"home_id"`
	WeekStart   string `gorm:"not null" json:"week_start"`
	Status      string `gorm:"default:'draft'" json:"status"` // draft|published|archived
	CreatedBy   string `json:"created_by_user"`
	PublishedBy string `json:"published_by"`
	PublishedAt string `json:"published_at"`
	Notes       string `json:"notes"`
}

type Shift struct {
	Base
	HomeID        string         `gorm:"not null;index" json:"home_id"`
	HomeName      string         `json:"home_name"`
	RotaID        string         `gorm:"index" json:"rota_id"`
	TemplateID    string         `gorm:"index" json:"template_id"`
	ShiftType     string         `json:"shift_type"`
	Date          string         `gorm:"not null" json:"date"`
	TimeStart     string         `json:"time_start"`
	TimeEnd       string         `json:"time_end"`
	AssignedStaff pq.StringArray `gorm:"type:text[]" json:"assigned_staff"`
	Status        string         `gorm:"default:'open'" json:"status"` // open|confirmed|completed|cancelled
	AcknowledgedBy pq.StringArray `gorm:"type:text[]" json:"acknowledged_by"`
	Notes         string         `json:"notes"`
}

type ShiftHandover struct {
	Base
	HomeID         string `gorm:"not null;index" json:"home_id"`
	ShiftID        string `gorm:"not null;index" json:"shift_id"`
	ShiftDate      string `json:"shift_date"`
	ShiftType      string `json:"shift_type"`
	WrittenBy      string `json:"written_by"`
	Notes          string `json:"notes"`
	Flags          pq.StringArray `gorm:"type:text[]" json:"flags"`
	SubmittedAt    string `json:"submitted_at"`
	AcknowledgedBy string `json:"acknowledged_by"`
	AcknowledgedAt string `json:"acknowledged_at"`
}