package models

// RoleDefinition stores the role catalogue for an organisation — each role's
// display label, escalation rank (used by the maker-checker routing engine to
// resolve fallback reviewers), and whether it is a system or custom role.
//
// One record per (org_id, role_name).
//
// System roles (IsSystem=true) are seeded on org creation and may not be
// deleted or have their Rank changed via the API. Custom roles are fully
// tenant-managed and may inherit default module permissions from a BaseRole.
type RoleDefinition struct {
	Base
	RoleName    string `gorm:"not null;uniqueIndex:idx_role_def_org_role" json:"role_name"`
	Label       string `gorm:"not null"                                   json:"label"`
	Rank        int    `gorm:"not null;default:10"                        json:"rank"`
	IsSystem    bool   `gorm:"default:false"                              json:"is_system"`
	BaseRole    string `json:"base_role"`   // custom roles only: inherit default module permissions
	Description string `json:"description"`
}
