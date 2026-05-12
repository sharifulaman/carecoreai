package models

import "gorm.io/datatypes"

type Organisation struct {
	Base
	Name                      string         `gorm:"not null" json:"name"`
	AppName                   string         `gorm:"default:'CareCore AI'" json:"app_name"`
	LogoURL                   string         `json:"logo_url"`
	PrimaryColour             string         `gorm:"default:'#4B8BF5'" json:"primary_colour"`
	DefaultLanguage           string         `gorm:"default:'en'" json:"default_language"`
	DefaultTheme              string         `gorm:"default:'light'" json:"default_theme"`
	ContactEmail              string         `json:"contact_email"`
	SessionTimeoutHours       int            `gorm:"default:8" json:"session_timeout_hours"`
	FailedLoginAttemptsLimit  int            `gorm:"default:5" json:"failed_login_attempts_limit"`
	LockoutDurationMinutes    int            `gorm:"default:15" json:"lockout_duration_minutes"`
	MinPasswordLength         int            `gorm:"default:8" json:"min_password_length"`
	RequireNumber             bool           `gorm:"default:true" json:"require_number"`
	RequireSpecialChar        bool           `gorm:"default:false" json:"require_special_char"`
	GPSClockInEnabled         bool           `gorm:"default:false" json:"gps_clock_in_enabled"`
	Settings                  datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"settings"`
}