package models

import "gorm.io/datatypes"

// RolePermission stores which app modules are enabled for a given role within an org.
// One record per (org_id, role_name).
//
// EnabledModules is a JSONB field that supports two formats:
//
//	Current: [{key: "staff", level: "Edit"}, {key: "finance", level: "View"}, ...]
//	Legacy:  ["staff", "finance", ...]   (treated as level "View")
//
// Both formats are handled by middleware.parseModuleLevels.
// Legacy string entries default to level "Edit" to preserve existing behaviour.
type RolePermission struct {
	Base
	RoleName       string         `gorm:"not null;uniqueIndex:idx_role_perm_org_role" json:"role_name"`
	EnabledModules datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"enabled_modules"`
}
