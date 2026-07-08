package models

type HandoverRecord struct {
	Base
	HomeID                         string  `gorm:"not null;index" json:"home_id"`
	HomeName                       string  `json:"home_name"`
	HandoverDate                   string  `json:"handover_date"`
	Shift                          string  `json:"shift"`
	OutgoingStaffID                string  `json:"outgoing_staff_id"`
	OutgoingStaffName              string  `json:"outgoing_staff_name"`
	OutgoingShiftStart             string  `json:"outgoing_shift_start"`
	OutgoingShiftEnd               string  `json:"outgoing_shift_end"`
	IncomingStaffID                string  `json:"incoming_staff_id"`
	IncomingStaffName              string  `json:"incoming_staff_name"`
	IncomingShiftStart             string  `json:"incoming_shift_start"`
	IncomingShiftEnd               string  `json:"incoming_shift_end"`
	Status                         string  `gorm:"default:'draft'" json:"status"`
	ProgressPercent                float64 `json:"progress_percent"`
	SubmittedByStaffID             string  `json:"submitted_by_staff_id"`
	SubmittedByName                string  `json:"submitted_by_name"`
	SubmittedAt                    string  `json:"submitted_at"`
	OutgoingDeclaration            bool    `json:"outgoing_declaration"`
	LockedAt                       string  `json:"locked_at"`
	NoIncidentsConfirmed           bool    `json:"no_incidents_confirmed"`
	NoMedicationIssuesConfirmed    bool    `json:"no_medication_issues_confirmed"`
	NoEnvironmentConcernsConfirmed bool    `json:"no_environment_concerns_confirmed"`
	DailyOverview                  string  `json:"daily_overview"`
	Highlights                     string  `json:"highlights"`
	PointsToNote                   string  `json:"points_to_note"`
	ConcernsSummary                string  `json:"concerns_summary"`
	RequestsSummary                string  `json:"requests_summary"`
}

type HandoverUpdate struct {
	Base
	HandoverID string `gorm:"not null;index" json:"handover_id"`
	HomeID     string `gorm:"not null;index" json:"home_id"`
	UpdateType string `json:"update_type"`
	Title      string `json:"title"`
	Summary    string `json:"summary"`
	Severity   string `json:"severity"`
	RecordedAt string `json:"recorded_at"`
}

type HandoverYPSummary struct {
	Base
	HandoverID       string `gorm:"not null;index" json:"handover_id"`
	HomeID           string `gorm:"not null;index" json:"home_id"`
	ResidentID       string `gorm:"not null;index" json:"resident_id"`
	ResidentInitials string `json:"resident_initials"`
	ResidentDisplay  string `json:"resident_display"`
	Status           string `json:"status"`
	Mood             string `json:"mood"`
	KeyUpdate        string `json:"key_update"`
	FollowUpRequired bool   `json:"follow_up_required"`
	FollowUpNote     string `json:"follow_up_note"`
}

type HandoverTask struct {
	Base
	HandoverID        string `gorm:"not null;index" json:"handover_id"`
	HomeID            string `gorm:"not null;index" json:"home_id"`
	Title             string `json:"title"`
	Description       string `json:"description"`
	Priority          string `json:"priority"`
	DueAt             string `json:"due_at"`
	AssignedToName    string `json:"assigned_to_name"`
	Status            string `gorm:"default:'open'" json:"status"`
	CompletedAt       string `json:"completed_at"`
	PassedToNextShift bool   `json:"passed_to_next_shift"`
}

type HandoverDocument struct {
	Base
	HandoverID   string `gorm:"not null;index" json:"handover_id"`
	HomeID       string `gorm:"not null;index" json:"home_id"`
	Title        string `json:"title"`
	FileName     string `json:"file_name"`
	FileURL      string `json:"file_url"`
	UploadedBy   string `json:"uploaded_by"`
}
