package models

import (
	"time"

	"github.com/google/uuid"
)

// PlatformAdmin is the login identity for carecore_head — the platform
// owner. Deliberately has NO org_id and does NOT embed Base: this table
// sits outside RLS entirely, because the platform owner isn't a member
// of any organisation, they administer the organisations themselves.
type PlatformAdmin struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Email        string     `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string     `gorm:"not null" json:"-"`
	FullName     string     `json:"full_name"`
	CreatedDate  time.Time  `json:"created_date"`
	LastLoginAt  *time.Time `json:"last_login_at"`
}