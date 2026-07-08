package models

// MakerCheckerMatrix is a simple, org-wide reference table describing who can
// MAKE (create/submit) and who must CHECK (approve) each module/record type,
// plus where it escalates if needed. This replaces the dynamic
// WorkflowRoutingStep engine with a single pre-seeded lookup table — no
// per-step routing logic required.
//
// Roles are stored as comma/slash-readable text exactly as defined in the
// source matrix (e.g. "TL/TM/RSM"), NOT as a structured array, because the
// source document itself mixes plain role lists with conditional logic
// ("TM and Finance Manager if money movement"). Keeping this as descriptive
// text avoids inventing structure the business rules don't actually have.
//
// If/when you need machine-enforced routing (e.g. to gate UI buttons by the
// logged-in user's role), parse maker_roles_raw / checker_roles_raw into the
// normalised role slugs in MakerRoleSlugs / CheckerRoleSlugs (text[]),
// which list ONLY the unconditional roles for simple permission checks.
//
// This table is org-wide (no home_id) because the supplied matrix does not
// vary by home — only by module. If a future requirement needs per-home
// overrides, add an optional home_id (*uuid.UUID) column and fall back to
// the org-wide row (home_id IS NULL) when no override exists.
type MakerCheckerMatrix struct {
	Base

	// Classification
	Category   string `gorm:"not null;index" json:"category"`    // e.g. "Residents", "Safety", "Finance", "Homes"
	ModuleName string `gorm:"not null"        json:"module_name"` // e.g. "Support Plans", "Incident Logs"
	ModuleKey  string `gorm:"not null;uniqueIndex" json:"module_key"` // slug used by the frontend to look up a row, e.g. "safety_incident_logs"

	// Roles — stored as the original descriptive text from the matrix.
	// These may include conditional logic in plain English (see notes above).
	MakerRolesRaw      string `gorm:"type:text" json:"maker_roles_raw"`
	CheckerRolesRaw     string `gorm:"type:text" json:"checker_roles_raw"`
	EscalationRolesRaw string `gorm:"type:text" json:"escalation_roles_raw"`

	// Normalised role slugs for simple permission checks (only the
	// unconditional/primary roles — NOT a full parse of conditional logic).
	// Use these to answer "can this role see the Submit/Approve button?".
	MakerRoleSlugs      StringArray `gorm:"type:text[]" json:"maker_role_slugs"`
	CheckerRoleSlugs    StringArray `gorm:"type:text[]" json:"checker_role_slugs"`
	EscalationRoleSlugs StringArray `gorm:"type:text[]" json:"escalation_role_slugs"`

	// Human-readable description of the approval flow, shown in the UI as
	// guidance text (e.g. a tooltip or info panel) — NOT parsed into logic.
	LogicalFlow string `gorm:"type:text" json:"logical_flow"`

	// Whether the maker can also act as checker for this module (almost
	// always false — kept explicit rather than inferred, since one module
	// in the source doc explicitly states "Claimant cannot approve").
	AllowSelfApproval bool `gorm:"default:false" json:"allow_self_approval"`

	// Soft toggle so individual rows can be disabled without deleting them.
	IsActive bool `gorm:"default:true;index" json:"is_active"`

	// Free-text notes for anything that doesn't fit the above columns
	// (e.g. absence/delegate fallback rules described in the source doc).
	Notes string `gorm:"type:text" json:"notes"`
}

// StringArray is a reusable text[] type alias if not already defined
// elsewhere in your models package. If you already have one (e.g. via
// pq.StringArray), use that instead and remove this type.
// type StringArray = pq.StringArray