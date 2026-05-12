package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Base is embedded in every model
type Base struct {
	ID          string         `gorm:"type:uuid;primaryKey" json:"id"`
	OrgID       string         `gorm:"type:varchar(100);not null;index" json:"org_id"`
	CreatedDate time.Time      `json:"created_date"`
	UpdatedDate time.Time      `json:"updated_date"`
	CreatedBy   string         `gorm:"type:varchar(255)" json:"created_by"`
	IsDeleted   bool           `gorm:"default:false;index" json:"-"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (b *Base) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	b.CreatedDate = time.Now().UTC()
	b.UpdatedDate = time.Now().UTC()
	return nil
}

func (b *Base) BeforeUpdate(tx *gorm.DB) error {
	b.UpdatedDate = time.Now().UTC()
	return nil
}