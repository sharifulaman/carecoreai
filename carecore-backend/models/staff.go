package models

import (
	"time"

	"github.com/lib/pq"
)

type StaffProfile struct {
	Base
	UserID       string         `gorm:"not null;index" json:"user_id"`
	FullName     string         `gorm:"not null" json:"full_name"`
	Email        string         `gorm:"not null;index" json:"email"`
	EmployeeID   string         `json:"employee_id"`
	Role         string         `gorm:"default:'support_worker'" json:"role"` // admin|team_leader|support_worker
	TeamLeaderID string         `json:"team_leader_id"`
	HomeIDs      pq.StringArray `gorm:"type:text[]" json:"home_ids"`
	Phone        string         `json:"phone"`
	DBSNumber    string         `json:"dbs_number"`
	DBSExpiry    *time.Time     `json:"dbs_expiry"`
	StartDate    *time.Time     `json:"start_date"`
	Status       string         `gorm:"default:'active'" json:"status"` // active|inactive|suspended
	Notes        string         `json:"notes"`
}

type StaffAvailabilityProfile struct {
	Base
	StaffID                   string         `gorm:"not null;index" json:"staff_id"`
	ContractedHoursPerWeek    float64        `json:"contracted_hours_per_week"`
	EmploymentType            string         `json:"employment_type"` // full_time|part_time|bank|agency|zero_hours
	MaxHoursPerDay            int            `gorm:"default:12" json:"max_hours_per_day"`
	MaxConsecutiveDays        int            `gorm:"default:6" json:"max_consecutive_days"`
	MinRestHoursBetweenShifts int            `gorm:"default:11" json:"min_rest_hours_between_shifts"`
	SleepInQualified          bool           `json:"sleep_in_qualified"`
	WakingNightQualified      bool           `json:"waking_night_qualified"`
	FirstAidCertified         bool           `json:"first_aid_certified"`
	FirstAidExpiry            *time.Time     `json:"first_aid_expiry"`
	MedicationTrained         bool           `json:"medication_trained"`
	DrivingLicence            bool           `json:"driving_licence"`
	SafeguardingTrained       bool           `json:"safeguarding_trained"`
	SafeguardingLevel         string         `json:"safeguarding_level"`
	SafeguardingExpiry        *time.Time     `json:"safeguarding_expiry"`
	PreferredShiftTypes       pq.StringArray `gorm:"type:text[]" json:"preferred_shift_types"`
	Notes                     string         `json:"notes"`
}

type StaffAvailabilityOverride struct {
	Base
	StaffID      string     `gorm:"not null;index" json:"staff_id"`
	OverrideType string     `json:"override_type"` // unavailable|holiday|sick|training|lieu_day
	DateFrom     time.Time  `json:"date_from"`
	DateTo       time.Time  `json:"date_to"`
	AllDay       bool       `gorm:"default:true" json:"all_day"`
	Reason       string     `json:"reason"`
	Approved     bool       `gorm:"default:false" json:"approved"`
	ApprovedBy   string     `json:"approved_by"`
	ApprovedAt   *time.Time `json:"approved_at"`
	SubmittedBy  string     `json:"submitted_by"`
}