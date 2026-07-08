package models

import (
	"errors"
	"strings"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// errAuditImmutable is returned by GORM hooks to prevent any mutation of audit records.
var errAuditImmutable = errors.New("audit trail records are immutable and cannot be modified or deleted")

type Notification struct {
	Base
	UserID           string `gorm:"index" json:"user_id"`
	RecipientUserID  string `gorm:"index" json:"recipient_user_id"`
	RecipientStaffID string `gorm:"index" json:"recipient_staff_id"`
	RecipientRole    string `gorm:"index" json:"recipient_role"`
	Title            string `json:"title"`
	Type             string `json:"type"` // handover|holiday|rota|alert|certification|general
	Message          string `json:"message"`
	Body             string `json:"body"`
	Priority         string `gorm:"default:'normal'" json:"priority"` // normal|high|critical
	LinkURL          string `json:"link_url"`
	Link             string `json:"link"`
	RelatedModule    string `json:"related_module"`
	RelatedRecordID  string `json:"related_record_id"`
	Read             bool   `gorm:"default:false" json:"read"`
	IsRead           bool   `gorm:"default:false" json:"is_read"`
	Acknowledged     bool   `gorm:"default:false" json:"acknowledged"`
}

func (n *Notification) normalizeAliases() {
	if n.UserID == "" {
		n.UserID = n.RecipientUserID
	}
	if n.RecipientUserID == "" {
		n.RecipientUserID = n.UserID
	}
	if n.Message == "" {
		n.Message = n.Body
	}
	if n.Body == "" {
		n.Body = n.Message
	}
	if n.RelatedModule == "" {
		n.RelatedModule = n.Title
	}
	if n.Title == "" {
		n.Title = n.RelatedModule
	}
	if n.LinkURL == "" {
		n.LinkURL = n.Link
	}
	if n.Link == "" {
		n.Link = n.LinkURL
	}
	n.Read = n.Read || n.IsRead
	n.IsRead = n.Read
	if strings.TrimSpace(n.Type) == "" {
		n.Type = "general"
	}
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	n.normalizeAliases()
	return n.Base.BeforeCreate(tx)
}

func (n *Notification) BeforeUpdate(tx *gorm.DB) error {
	n.normalizeAliases()
	return n.Base.BeforeUpdate(tx)
}

// AuditTrail is an append-only ledger of every user action in the system.
// Records are immutable: BeforeUpdate and BeforeDelete hooks reject all mutations.
//
// Severity levels: low | medium | high | critical
// ActionType values: created | updated | deleted | permission_denied | role_definition_created |
//
//	role_definition_updated | role_definition_deleted | permission_changed
type AuditTrail struct {
	Base
	// Actor fields — who performed the action
	UserID    string `gorm:"not null;index"        json:"user_id"`
	ActorName string `json:"actor_name"`
	ActorRole string `gorm:"index"                 json:"actor_role"`

	// Target fields — what was acted upon
	EntityName      string `gorm:"not null"  json:"entity_name"`
	EntityID        string `gorm:"not null;index" json:"entity_id"`
	ModuleName      string `gorm:"index"     json:"module_name"`
	HomeID          string `gorm:"index"     json:"home_id"`
	RecordReference string `json:"record_reference"`
	RecordTitle     string `json:"record_title"`

	// Action metadata
	// column:action keeps the existing DB column name; json:"action_type" matches the frontend contract.
	Action   string `gorm:"not null;column:action" json:"action_type"`
	Severity string `gorm:"not null;default:'low'" json:"severity"`

	// Change snapshot
	BeforeData datatypes.JSON `gorm:"type:jsonb" json:"before_data"`
	AfterData  datatypes.JSON `gorm:"type:jsonb" json:"after_data"`

	// Request metadata
	IPAddress string `json:"ip_address"`
}

// BeforeUpdate blocks all UPDATE statements on audit_trails via GORM.
func (a *AuditTrail) BeforeUpdate(*gorm.DB) error {
	return errAuditImmutable
}

// BeforeDelete blocks all DELETE (including soft-delete) statements on audit_trails via GORM.
func (a *AuditTrail) BeforeDelete(*gorm.DB) error {
	return errAuditImmutable
}

type KPIOption struct {
	Base
	Category string `gorm:"not null;index" json:"category"`
	Label    string `gorm:"not null" json:"label"`
	Value    string `gorm:"not null" json:"value"`
	Active   bool   `gorm:"default:true" json:"active"`
	Order    int    `gorm:"default:0" json:"order"`
}
