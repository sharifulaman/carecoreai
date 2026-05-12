package models

import "gorm.io/datatypes"

type Notification struct {
	Base
	UserID          string `gorm:"not null;index" json:"user_id"`
	Type            string `json:"type"` // handover|holiday|rota|alert|certification|general
	Message         string `json:"message"`
	Priority        string `gorm:"default:'normal'" json:"priority"` // normal|high|critical
	LinkURL         string `json:"link_url"`
	RelatedModule   string `json:"related_module"`
	RelatedRecordID string `json:"related_record_id"`
	Read            bool   `gorm:"default:false" json:"read"`
	Acknowledged    bool   `gorm:"default:false" json:"acknowledged"`
}

type AuditTrail struct {
	Base
	UserID     string         `gorm:"not null;index" json:"user_id"`
	EntityName string         `gorm:"not null" json:"entity_name"`
	EntityID   string         `gorm:"not null;index" json:"entity_id"`
	Action     string         `gorm:"not null" json:"action"` // create|update|delete
	BeforeData datatypes.JSON `gorm:"type:jsonb" json:"before_data"`
	AfterData  datatypes.JSON `gorm:"type:jsonb" json:"after_data"`
	IPAddress  string         `json:"ip_address"`
}

type KPIOption struct {
	Base
	Category string `gorm:"not null;index" json:"category"`
	Label    string `gorm:"not null" json:"label"`
	Value    string `gorm:"not null" json:"value"`
	Active   bool   `gorm:"default:true" json:"active"`
	Order    int    `gorm:"default:0" json:"order"`
}