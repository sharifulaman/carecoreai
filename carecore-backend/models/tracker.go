package models

import (
	"time"
)

// ── Location Tracking ─────────────────────────────────────────────────────────

type LocationTrackingConsent struct {
	Base
	StaffID        string     `gorm:"not null;index" json:"staff_id"`
	UserEmail      string     `json:"user_email"`
	Consented      bool       `gorm:"default:false" json:"consented"`
	ConsentedAt    *time.Time `json:"consented_at"`
	RevokedAt      *time.Time `json:"revoked_at"`
	ConsentVersion string     `json:"consent_version"`
	UserAgent      string     `json:"user_agent"`
}

type EmployeeLocation struct {
	Base
	StaffID   string     `gorm:"not null;index" json:"staff_id"`
	StaffName string     `json:"staff_name"`
	StaffRole string     `json:"staff_role"`
	Latitude  float64    `json:"latitude"`
	Longitude float64    `json:"longitude"`
	Accuracy  float64    `json:"accuracy"`
	Heading   float64    `json:"heading"`
	Speed     float64    `json:"speed"`
	Timestamp *time.Time `json:"timestamp"`
	IsActive  bool       `gorm:"default:true;index" json:"is_active"`
}
