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
	Name        string `json:"name"`
	WeekStart   string `gorm:"not null" json:"week_start"`
	Status      string `gorm:"default:'draft'" json:"status"` // draft|published|archived
	CreatedBy   string `json:"created_by_user"`
	PublishedBy string `json:"published_by"`
	PublishedAt string `json:"published_at"`
	Notes       string `json:"notes"`
}

type Shift struct {
	Base
	HomeID          string         `gorm:"not null;index" json:"home_id"`
	HomeName        string         `json:"home_name"`
	RotaID          string         `gorm:"index" json:"rota_id"`
	TemplateID      string         `gorm:"index" json:"template_id"`
	ShiftType       string         `json:"shift_type"` // morning|afternoon|night|sleeping
	Date            string         `gorm:"not null" json:"date"`
	TimeStart       string         `json:"time_start"`
	TimeEnd         string         `json:"time_end"`
	StaffRequired   int            `gorm:"default:1" json:"staff_required"`
	StaffID         string         `gorm:"index" json:"staff_id"`
	StaffName       string         `json:"staff_name"`
	AssignedStaff   pq.StringArray `gorm:"type:text[]" json:"assigned_staff"`
	LeadStaffID     string         `json:"lead_staff_id"`
	IsSleepingShift bool           `gorm:"default:false" json:"is_sleeping_shift"`
	IsOpenShift     bool           `gorm:"default:false" json:"is_open_shift"`
	Status          string         `gorm:"default:'draft'" json:"status"` // draft|open|published|confirmed|in_progress|completed|cancelled
	AcknowledgedBy  pq.StringArray `gorm:"type:text[]" json:"acknowledged_by"`
	Notes           string         `json:"notes"`
}

type ShiftHandover struct {
	Base
	HomeID         string         `gorm:"not null;index" json:"home_id"`
	ShiftID        string         `gorm:"not null;index" json:"shift_id"`
	ShiftDate      string         `json:"shift_date"`
	ShiftType      string         `json:"shift_type"`
	WrittenBy      string         `json:"written_by"`
	Notes          string         `json:"notes"`
	Flags          pq.StringArray `gorm:"type:text[]" json:"flags"`
	SubmittedAt    string         `json:"submitted_at"`
	AcknowledgedBy string         `json:"acknowledged_by"`
	AcknowledgedAt string         `json:"acknowledged_at"`
}

// ShiftConflict records scheduling violations detected during rota generation or staff assignment.
type ShiftConflict struct {
	Base
	HomeID          string `gorm:"not null;index" json:"home_id"`
	ShiftID         string `gorm:"not null;index" json:"shift_id"`
	StaffID         string `gorm:"index" json:"staff_id"`
	ConflictType    string `json:"conflict_type"` // double_booking|rest_period_violation|consecutive_day_limit|insufficient_staff|sleep_in_not_qualified|contracted_hours_exceeded|unavailable_day|override_conflict|medication_not_trained
	Severity        string `gorm:"default:'warning';index" json:"severity"` // critical|warning
	Description     string `gorm:"type:text" json:"description"`
	Resolved        bool   `gorm:"default:false;index" json:"resolved"`
	ResolvedBy      string `json:"resolved_by"`
	ResolvedAt      string `json:"resolved_at"`
	ResolutionNotes string `gorm:"type:text" json:"resolution_notes"`
}