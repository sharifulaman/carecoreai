package models

import "time"

// WorkflowItem is the central record for every maker-checker approval request.
// One row per submission. Status advances through the routing chain defined in
// WorkflowRoutingStep. All actions are recorded in WorkflowEvent (immutable).
//
// Maker-checker rules enforced by the action handler:
//   - Maker cannot approve their own submission (MakerID != actor UserID).
//   - Care narratives are locked (IsNarrativeLocked=true) once submitted.
//   - Status transitions are validated — only legal moves are accepted.
type WorkflowItem struct {
	Base

	// Classification
	WorkflowType string `gorm:"not null;index"         json:"workflow_type"` // incident_report, support_plan, etc.
	EntityID     string `gorm:"index"                  json:"entity_id"`     // UUID of the linked record
	EntityRef    string `json:"entity_ref"`                                   // human-readable, e.g. "INC-20260614-001"
	Title        string `json:"title"`
	Description  string `json:"description"`

	// Context
	HomeID   string `gorm:"index" json:"home_id"`
	HomeName string `json:"home_name"`

	// Priority / SLA
	Priority  string     `gorm:"default:'routine'" json:"priority"` // critical|urgent|important|routine
	DueAt     *time.Time `json:"due_at"`
	IsOverdue bool       `gorm:"default:false" json:"is_overdue"`

	// Lifecycle
	Status      string `gorm:"not null;default:'draft';index" json:"status"`
	CurrentStep int    `gorm:"default:1"                     json:"current_step"`

	// Maker — locked at submission, never updated
	MakerID     string     `gorm:"not null;index" json:"maker_id"`
	MakerRole   string     `gorm:"not null"       json:"maker_role"`
	MakerName   string     `gorm:"not null"       json:"maker_name"`
	MakerRank   int        `gorm:"default:0"      json:"maker_rank"` // rank from RoleDefinition at submission time
	SubmittedAt *time.Time `json:"submitted_at"`

	// Current reviewer assignment (changes as item moves up the chain)
	ReviewerRole string `json:"reviewer_role"`
	ReviewerID   string `json:"reviewer_id"`
	ReviewerName string `json:"reviewer_name"`

	// Narrative lock — prevents editing the linked care record after submission
	IsNarrativeLocked bool `gorm:"default:false" json:"is_narrative_locked"`

	// Final decision
	ClosedAt     *time.Time `json:"closed_at"`
	ClosedByID   string     `json:"closed_by_id"`
	ClosedByRole string     `json:"closed_by_role"`
}

// WorkflowEvent is an append-only audit record for every action taken on a
// WorkflowItem. Events are never updated or deleted.
type WorkflowEvent struct {
	Base

	WorkflowItemID string `gorm:"not null;index" json:"workflow_item_id"`

	// Actor snapshot — captured at the moment of action, not resolved later
	ActorID   string `gorm:"not null" json:"actor_id"`
	ActorRole string `gorm:"not null" json:"actor_role"`
	ActorName string `gorm:"not null" json:"actor_name"`

	// What happened
	EventType  string `gorm:"not null" json:"event_type"` // submitted|approved|rejected|changes_requested|resubmitted|escalated|closed
	FromStatus string `json:"from_status"`
	ToStatus   string `json:"to_status"`
	StepNumber int    `json:"step_number"`

	// Comment is required for reject, request_changes, and escalate.
	Comment string `json:"comment"`
}

// WorkflowRoutingStep defines one approval step in a workflow type's chain.
// Steps are ordered by StepOrder. The routing engine reads these to determine
// who reviews next and whether the current step is the final one.
//
// Seeded on org creation; tenant admins can customise via the Tenant Admin panel.
type WorkflowRoutingStep struct {
	Base

	WorkflowType string `gorm:"not null;index" json:"workflow_type"`
	StepOrder    int    `gorm:"not null"       json:"step_order"`
	StepName     string `json:"step_name"`
	RequiredRole string `gorm:"not null"       json:"required_role"`
	SLAHours     int    `gorm:"default:48"     json:"sla_hours"`
	IsFinalStep  bool   `gorm:"default:false"  json:"is_final_step"`
}
