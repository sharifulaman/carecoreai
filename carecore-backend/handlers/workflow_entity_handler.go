package handlers

import (
	"errors"
	"net/http"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// workflowTypeToEntity maps every workflow_type to the real Postgres table
// and the field groups shown in the detail modal.
// Table names are verified against the live schema (126 tables).
var workflowTypeToEntity = map[string]entityMeta{

	// ── Residents ─────────────────────────────────────────────────────────────

	"resident_creation": {
		EntityTable: "residents",
		DisplayName: "Resident / YP Creation",
		ModuleKey:   "residents_resident_yp_creation",
		FieldGroups: []fieldGroup{
			{Label: "Personal Details", Fields: []fieldDef{
				{Key: "first_name", Label: "First Name"},
				{Key: "last_name", Label: "Last Name"},
				{Key: "date_of_birth", Label: "Date of Birth"},
				{Key: "gender", Label: "Gender"},
				{Key: "ethnicity", Label: "Ethnicity"},
				{Key: "nationality", Label: "Nationality"},
				{Key: "preferred_name", Label: "Preferred Name"},
			}},
			{Label: "Placement", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "service_type", Label: "Service Type"},
				{Key: "placement_start_date", Label: "Placement Start"},
				{Key: "key_worker_name", Label: "Key Worker"},
				{Key: "risk_category", Label: "Risk Category"},
				{Key: "status", Label: "Status"},
			}},
		},
	},

	"support_plan": {
		EntityTable: "support_plans",
		DisplayName: "Support Plan",
		ModuleKey:   "residents_support_plans",
		FieldGroups: []fieldGroup{
			{Label: "Plan Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "plan_type", Label: "Plan Type"},
				{Key: "version", Label: "Version"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "key_worker_name", Label: "Key Worker"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Content", Fields: []fieldDef{
				{Key: "summary", Label: "Summary", Wide: true},
				{Key: "goals", Label: "Goals", Wide: true},
				{Key: "needs", Label: "Needs", Wide: true},
				{Key: "strengths", Label: "Strengths", Wide: true},
			}},
		},
	},

	"placement_plan": {
		EntityTable: "placement_plans",
		DisplayName: "Placement Plan",
		ModuleKey:   "residents_placement_plan",
		FieldGroups: []fieldGroup{
			{Label: "Placement Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "placement_type", Label: "Placement Type"},
				{Key: "start_date", Label: "Start Date"},
				{Key: "end_date", Label: "End Date"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Plan Content", Fields: []fieldDef{
				{Key: "objectives", Label: "Objectives", Wide: true},
				{Key: "support_needs", Label: "Support Needs", Wide: true},
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"ils": {
		EntityTable: "ils_plans",
		DisplayName: "Independent Living Skills Plan",
		ModuleKey:   "residents_ils",
		FieldGroups: []fieldGroup{
			{Label: "Plan Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "key_worker_name", Label: "Key Worker"},
				{Key: "start_date", Label: "Start Date"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Progress", Fields: []fieldDef{
				{Key: "current_level", Label: "Current Level"},
				{Key: "target_level", Label: "Target Level"},
				{Key: "progress_notes", Label: "Progress Notes", Wide: true},
				{Key: "evidence_summary", Label: "Evidence Summary", Wide: true},
			}},
		},
	},

	"referral": {
		EntityTable: "residents",
		DisplayName: "Referral",
		ModuleKey:   "residents_referrals",
		FieldGroups: []fieldGroup{
			{Label: "Referral Details", Fields: []fieldDef{
				{Key: "first_name", Label: "First Name"},
				{Key: "last_name", Label: "Last Name"},
				{Key: "date_of_birth", Label: "Date of Birth"},
				{Key: "referral_source", Label: "Referral Source"},
				{Key: "referral_date", Label: "Referral Date"},
				{Key: "home_name", Label: "Proposed Home"},
				{Key: "service_type", Label: "Service Type"},
				{Key: "risk_category", Label: "Risk Category"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Background", Fields: []fieldDef{
				{Key: "referral_reason", Label: "Reason for Referral", Wide: true},
				{Key: "needs_summary", Label: "Needs Summary", Wide: true},
			}},
		},
	},

	// ── Safety ────────────────────────────────────────────────────────────────

	"risk_assessment": {
		EntityTable: "risk_assessments",
		DisplayName: "Risk Assessment",
		ModuleKey:   "safety_risk_assessment",
		FieldGroups: []fieldGroup{
			{Label: "Assessment Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "risk_category", Label: "Risk Category"},
				{Key: "risk_level", Label: "Risk Level"},
				{Key: "assessed_by", Label: "Assessed By"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "version", Label: "Version"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Risk Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "triggers", Label: "Triggers", Wide: true},
				{Key: "control_measures", Label: "Control Measures", Wide: true},
				{Key: "contingency_plan", Label: "Contingency Plan", Wide: true},
			}},
		},
	},

	"behaviour_plan": {
		EntityTable: "behaviour_support_plans",
		DisplayName: "Behaviour Management Plan",
		ModuleKey:   "safety_behaviour_management",
		FieldGroups: []fieldGroup{
			{Label: "Plan Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "risk_level", Label: "Risk Level"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "author_name", Label: "Author"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Behaviour Detail", Fields: []fieldDef{
				{Key: "behaviour_description", Label: "Behaviour Description", Wide: true},
				{Key: "triggers", Label: "Triggers", Wide: true},
				{Key: "de_escalation_strategies", Label: "De-escalation Strategies", Wide: true},
				{Key: "physical_intervention_notes", Label: "Physical Intervention Notes", Wide: true},
				{Key: "post_incident_support", Label: "Post-Incident Support", Wide: true},
			}},
		},
	},

	"incident_report": {
		EntityTable: "accident_reports",
		DisplayName: "Incident Report",
		ModuleKey:   "safety_incident_logs",
		FieldGroups: []fieldGroup{
			{Label: "Incident Details", Fields: []fieldDef{
				{Key: "incident_type", Label: "Incident Type"},
				{Key: "title", Label: "Title"},
				{Key: "date", Label: "Date"},
				{Key: "time", Label: "Time"},
				{Key: "location", Label: "Location"},
				{Key: "risk_level", Label: "Risk Level"},
				{Key: "perceived_harm", Label: "Perceived Harm"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "People Involved", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "reported_by_name", Label: "Reported By"},
				{Key: "staff_involved", Label: "Staff Involved"},
				{Key: "witness_name", Label: "Witness"},
				{Key: "police_ref", Label: "Police Reference"},
			}},
			{Label: "Narrative", Fields: []fieldDef{
				{Key: "brief_description", Label: "Brief Description", Wide: true},
				{Key: "detailed_account", Label: "Detailed Account", Wide: true},
				{Key: "action_notes", Label: "Actions Taken", Wide: true},
				{Key: "manager_summary", Label: "Manager Summary", Wide: true},
				{Key: "reg40_notes", Label: "Reg 40 Notes", Wide: true},
			}},
			{Label: "Response", Fields: []fieldDef{
				{Key: "first_aid_given", Label: "First Aid Given", IsBool: true},
				{Key: "hospital_attendance", Label: "Hospital Attendance", IsBool: true},
				{Key: "follow_up_required", Label: "Follow Up Required", IsBool: true},
				{Key: "follow_up_notes", Label: "Follow Up Notes", Wide: true},
				{Key: "outcome", Label: "Outcome"},
			}},
		},
	},

	"accident": {
		EntityTable: "accident_reports",
		DisplayName: "Accident / Illness Report",
		ModuleKey:   "homes_accidents_illness",
		FieldGroups: []fieldGroup{
			{Label: "Incident Details", Fields: []fieldDef{
				{Key: "type", Label: "Type"},
				{Key: "title", Label: "Title"},
				{Key: "date", Label: "Date"},
				{Key: "end_date", Label: "End Date"},
				{Key: "time", Label: "Time"},
				{Key: "shift", Label: "Shift"},
				{Key: "location", Label: "Location"},
				{Key: "risk_level", Label: "Risk Level"},
				{Key: "perceived_harm", Label: "Perceived Harm"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Resident & Home", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "reported_by_name", Label: "Reported By"},
				{Key: "staff_involved", Label: "Staff Involved"},
				{Key: "witness_name", Label: "Witness"},
			}},
			{Label: "Description", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "injuries", Label: "Injuries", Wide: true},
				{Key: "action_notes", Label: "Action Notes", Wide: true},
				{Key: "manager_summary", Label: "Manager Summary", Wide: true},
			}},
			{Label: "Response", Fields: []fieldDef{
				{Key: "first_aid_given", Label: "First Aid Given", IsBool: true},
				{Key: "first_aid_details", Label: "First Aid Details"},
				{Key: "hospital_attendance", Label: "Hospital Attendance", IsBool: true},
				{Key: "follow_up_required", Label: "Follow Up Required", IsBool: true},
				{Key: "follow_up_notes", Label: "Follow Up Notes", Wide: true},
				{Key: "police_ref", Label: "Police Reference"},
				{Key: "reg40_notes", Label: "Reg 40 Notes", Wide: true},
				{Key: "sign_off_name", Label: "Signed Off By"},
				{Key: "confidential", Label: "Confidential", IsBool: true},
			}},
		},
	},

	"missing_episode": {
		EntityTable: "missing_from_homes",
		DisplayName: "Missing Episode",
		ModuleKey:   "safety_missing_episode",
		FieldGroups: []fieldGroup{
			{Label: "Episode Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "reported_by_name", Label: "Reported By"},
				{Key: "date_missing", Label: "Date Missing"},
				{Key: "time_missing", Label: "Time Missing"},
				{Key: "date_returned", Label: "Date Returned"},
				{Key: "time_returned", Label: "Time Returned"},
				{Key: "last_known_location", Label: "Last Known Location"},
				{Key: "risk_level", Label: "Risk Level"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "circumstances", Label: "Circumstances", Wide: true},
				{Key: "police_notified", Label: "Police Notified", IsBool: true},
				{Key: "police_ref", Label: "Police Reference"},
				{Key: "return_interview_completed", Label: "Return Interview Done", IsBool: true},
				{Key: "return_interview_notes", Label: "Return Interview Notes", Wide: true},
				{Key: "actions_taken", Label: "Actions Taken", Wide: true},
			}},
		},
	},

	"exploitation_risk": {
		EntityTable: "exploitation_risks",
		DisplayName: "Exploitation Risk",
		ModuleKey:   "safety_exploitation_risk",
		FieldGroups: []fieldGroup{
			{Label: "Risk Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "risk_type", Label: "Risk Type"},
				{Key: "risk_level", Label: "Risk Level"},
				{Key: "assessed_by", Label: "Assessed By"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Assessment", Fields: []fieldDef{
				{Key: "concern_description", Label: "Concern Description", Wide: true},
				{Key: "indicators", Label: "Indicators", Wide: true},
				{Key: "control_plan", Label: "Control Plan", Wide: true},
				{Key: "external_agencies", Label: "External Agencies Involved", Wide: true},
			}},
		},
	},

	// ── Records ───────────────────────────────────────────────────────────────

	"daily_log": {
		EntityTable: "daily_logs",
		DisplayName: "Daily Log",
		ModuleKey:   "records_daily_logs",
		FieldGroups: []fieldGroup{
			{Label: "Log Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "log_date", Label: "Date"},
				{Key: "shift", Label: "Shift"},
				{Key: "logged_by_name", Label: "Logged By"},
				{Key: "category", Label: "Category"},
				{Key: "flag_type", Label: "Flag Type"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Content", Fields: []fieldDef{
				{Key: "content", Label: "Log Entry", Wide: true},
				{Key: "follow_up_notes", Label: "Follow Up Notes", Wide: true},
			}},
		},
	},

	"visit_report": {
		EntityTable: "visit_reports",
		DisplayName: "Visit Report",
		ModuleKey:   "records_visit_reports",
		FieldGroups: []fieldGroup{
			{Label: "Visit Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "visit_date", Label: "Visit Date"},
				{Key: "visitor_name", Label: "Visitor"},
				{Key: "visitor_role", Label: "Visitor Role"},
				{Key: "visit_type", Label: "Visit Type"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Report Content", Fields: []fieldDef{
				{Key: "summary", Label: "Summary", Wide: true},
				{Key: "concerns", Label: "Concerns Raised", Wide: true},
				{Key: "actions", Label: "Actions Required", Wide: true},
				{Key: "yp_views", Label: "YP Views", Wide: true},
			}},
		},
	},

	"complaint": {
		EntityTable: "complaints",
		DisplayName: "Complaint / Compliment",
		ModuleKey:   "records_complaints_compliments",
		FieldGroups: []fieldGroup{
			{Label: "Details", Fields: []fieldDef{
				{Key: "type", Label: "Type"},
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "submitted_by", Label: "Submitted By"},
				{Key: "received_date", Label: "Received Date"},
				{Key: "category", Label: "Category"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Content", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "investigation_notes", Label: "Investigation Notes", Wide: true},
				{Key: "outcome", Label: "Outcome", Wide: true},
				{Key: "lessons_learned", Label: "Lessons Learned", Wide: true},
			}},
		},
	},

	"legal_restriction": {
		EntityTable: "deprivation_of_liberties",
		DisplayName: "Legal / Restrictions / Warnings",
		ModuleKey:   "records_legal_restrictions_warnings",
		FieldGroups: []fieldGroup{
			{Label: "Restriction Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "restriction_type", Label: "Restriction Type"},
				{Key: "start_date", Label: "Start Date"},
				{Key: "end_date", Label: "End Date"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "issued_by", Label: "Issued By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "rationale", Label: "Rationale", Wide: true},
				{Key: "conditions", Label: "Conditions", Wide: true},
			}},
		},
	},

	"yp_voice": {
		EntityTable: "yp_views_records",
		DisplayName: "YP Voice / Feedback",
		ModuleKey:   "records_yp_voice_feedback",
		FieldGroups: []fieldGroup{
			{Label: "Feedback Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "recorded_by", Label: "Recorded By"},
				{Key: "feedback_date", Label: "Date"},
				{Key: "category", Label: "Category"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Content", Fields: []fieldDef{
				{Key: "feedback", Label: "Feedback", Wide: true},
				{Key: "action_required", Label: "Action Required", Wide: true},
				{Key: "response", Label: "Response", Wide: true},
			}},
		},
	},

	// ── Wellbeing ─────────────────────────────────────────────────────────────

	"health_update": {
		EntityTable: "wellbeing_check_ins",
		DisplayName: "Health Update",
		ModuleKey:   "wellbeing_health",
		FieldGroups: []fieldGroup{
			{Label: "Health Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "check_date", Label: "Date"},
				{Key: "recorded_by", Label: "Recorded By"},
				{Key: "category", Label: "Category"},
				{Key: "flagged", Label: "Flagged for Review", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
				{Key: "follow_up_actions", Label: "Follow Up Actions", Wide: true},
			}},
		},
	},

	"therapeutic_plan": {
		EntityTable: "therapeutic_plans",
		DisplayName: "Therapeutic Plan",
		ModuleKey:   "wellbeing_therapeutic_plan",
		FieldGroups: []fieldGroup{
			{Label: "Plan Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "therapy_type", Label: "Therapy Type"},
				{Key: "provider_name", Label: "Provider"},
				{Key: "start_date", Label: "Start Date"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Content", Fields: []fieldDef{
				{Key: "goals", Label: "Goals", Wide: true},
				{Key: "interventions", Label: "Interventions", Wide: true},
				{Key: "progress_notes", Label: "Progress Notes", Wide: true},
			}},
		},
	},

	// ── Life & Community ──────────────────────────────────────────────────────

	"appointment": {
		EntityTable: "appointments",
		DisplayName: "Appointment",
		ModuleKey:   "life_community_appointments",
		FieldGroups: []fieldGroup{
			{Label: "Appointment Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "appointment_type", Label: "Type"},
				{Key: "provider_name", Label: "Provider"},
				{Key: "appointment_date", Label: "Date"},
				{Key: "appointment_time", Label: "Time"},
				{Key: "location", Label: "Location"},
				{Key: "escort_name", Label: "Escort"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Outcome", Fields: []fieldDef{
				{Key: "outcome", Label: "Outcome"},
				{Key: "notes", Label: "Notes", Wide: true},
				{Key: "follow_up_required", Label: "Follow Up Required", IsBool: true},
				{Key: "follow_up_notes", Label: "Follow Up Notes", Wide: true},
			}},
		},
	},

	// ── Education / Employment / NEET ─────────────────────────────────────────

	"education_record": {
		EntityTable: "neet_records",
		DisplayName: "Education / Employment / NEET",
		ModuleKey:   "education_employment_neet",
		FieldGroups: []fieldGroup{
			{Label: "Record Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "category", Label: "Category"},
				{Key: "provider_name", Label: "Provider / School"},
				{Key: "start_date", Label: "Start Date"},
				{Key: "end_date", Label: "End Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "concern_notes", Label: "Concerns", Wide: true},
				{Key: "action_plan", Label: "Action Plan", Wide: true},
			}},
		},
	},

	// ── Family Contact ────────────────────────────────────────────────────────

	"family_contact": {
		EntityTable: "family_contacts",
		DisplayName: "Family Contact",
		ModuleKey:   "family_contact",
		FieldGroups: []fieldGroup{
			{Label: "Contact Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "contact_name", Label: "Contact Name"},
				{Key: "relationship", Label: "Relationship"},
				{Key: "contact_date", Label: "Contact Date"},
				{Key: "contact_type", Label: "Contact Type"},
				{Key: "risk_level", Label: "Risk Level"},
				{Key: "restricted", Label: "Restricted Contact", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
				{Key: "concerns", Label: "Concerns", Wide: true},
				{Key: "actions", Label: "Actions", Wide: true},
			}},
		},
	},

	// ── 18+ ───────────────────────────────────────────────────────────────────

	"pathway_plan": {
		EntityTable: "pathway_plans",
		DisplayName: "Pathway Plan",
		ModuleKey:   "18_pathway_plans",
		FieldGroups: []fieldGroup{
			{Label: "Plan Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "personal_adviser_name", Label: "Personal Adviser"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "version", Label: "Version"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Plan Content", Fields: []fieldDef{
				{Key: "goals", Label: "Goals", Wide: true},
				{Key: "education_plan", Label: "Education Plan", Wide: true},
				{Key: "employment_plan", Label: "Employment Plan", Wide: true},
				{Key: "accommodation_plan", Label: "Accommodation Plan", Wide: true},
				{Key: "financial_plan", Label: "Financial Plan", Wide: true},
				{Key: "health_plan", Label: "Health Plan", Wide: true},
			}},
		},
	},

	"move_on_plan": {
		EntityTable: "placement_plans",
		DisplayName: "Move-On Planning",
		ModuleKey:   "18_move_on_planning",
		FieldGroups: []fieldGroup{
			{Label: "Move-On Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "target_move_date", Label: "Target Move Date"},
				{Key: "move_on_type", Label: "Move-On Type"},
				{Key: "new_address", Label: "New Address"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Plan", Fields: []fieldDef{
				{Key: "objectives", Label: "Objectives", Wide: true},
				{Key: "support_needs", Label: "Support Needs Post-Move", Wide: true},
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"pa_management": {
		EntityTable: "pa_visits",
		DisplayName: "PA Management",
		ModuleKey:   "18_pa_management",
		FieldGroups: []fieldGroup{
			{Label: "Visit Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "pa_name", Label: "Personal Adviser"},
				{Key: "visit_date", Label: "Visit Date"},
				{Key: "visit_type", Label: "Visit Type"},
				{Key: "location", Label: "Location"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "summary", Label: "Summary", Wide: true},
				{Key: "actions", Label: "Actions", Wide: true},
				{Key: "concerns", Label: "Concerns", Wide: true},
			}},
		},
	},

	"benefits_finance": {
		EntityTable: "resident_allowances",
		DisplayName: "Benefits & Finance",
		ModuleKey:   "18_benefits_finance",
		FieldGroups: []fieldGroup{
			{Label: "Entry Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "benefit_type", Label: "Benefit Type"},
				{Key: "amount", Label: "Amount"},
				{Key: "effective_date", Label: "Effective Date"},
				{Key: "recorded_by", Label: "Recorded By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
				{Key: "safeguarding_concern", Label: "Safeguarding Concern", IsBool: true},
			}},
		},
	},

	// ── 24h ───────────────────────────────────────────────────────────────────

	"rota": {
		EntityTable: "rota",
		DisplayName: "Rota / Shifts",
		ModuleKey:   "24h_rota_shifts",
		FieldGroups: []fieldGroup{
			{Label: "Rota Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "week_start", Label: "Week Starting"},
				{Key: "created_by_name", Label: "Created By"},
				{Key: "published", Label: "Published", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"shift_handover": {
		EntityTable: "shift_handovers",
		DisplayName: "Shift Handover",
		ModuleKey:   "24h_shift_handover",
		FieldGroups: []fieldGroup{
			{Label: "Handover Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "shift_date", Label: "Shift Date"},
				{Key: "shift_type", Label: "Shift Type"},
				{Key: "outgoing_staff_name", Label: "Outgoing Staff"},
				{Key: "incoming_staff_name", Label: "Incoming Staff"},
				{Key: "acknowledged", Label: "Acknowledged", IsBool: true},
				{Key: "risk_triggered", Label: "Risk Triggered", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Handover Notes", Fields: []fieldDef{
				{Key: "handover_notes", Label: "Handover Notes", Wide: true},
				{Key: "outstanding_actions", Label: "Outstanding Actions", Wide: true},
				{Key: "incidents_summary", Label: "Incidents Summary", Wide: true},
			}},
		},
	},

	"visitor_log": {
		EntityTable: "visitor_logs",
		DisplayName: "Visitor Log",
		ModuleKey:   "24h_visitor_log",
		FieldGroups: []fieldGroup{
			{Label: "Visit Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "visitor_name", Label: "Visitor Name"},
				{Key: "visitor_organisation", Label: "Organisation"},
				{Key: "purpose", Label: "Purpose of Visit"},
				{Key: "resident_visited", Label: "Resident Visited"},
				{Key: "arrival_time", Label: "Arrival Time"},
				{Key: "departure_time", Label: "Departure Time"},
				{Key: "signed_in_by", Label: "Signed In By"},
				{Key: "flagged", Label: "Flagged", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	// ── Staff & HR ────────────────────────────────────────────────────────────

	"onboarding": {
		EntityTable: "staff_profiles",
		DisplayName: "Staff Onboarding",
		ModuleKey:   "staff_hr_onboarding",
		FieldGroups: []fieldGroup{
			{Label: "Staff Details", Fields: []fieldDef{
				{Key: "full_name", Label: "Full Name"},
				{Key: "email", Label: "Email"},
				{Key: "role", Label: "Role"},
				{Key: "home_name", Label: "Home"},
				{Key: "start_date", Label: "Start Date"},
				{Key: "contract_type", Label: "Contract Type"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Compliance", Fields: []fieldDef{
				{Key: "dbs_checked", Label: "DBS Checked", IsBool: true},
				{Key: "dbs_number", Label: "DBS Number"},
				{Key: "right_to_work_verified", Label: "Right to Work Verified", IsBool: true},
				{Key: "references_received", Label: "References Received", IsBool: true},
				{Key: "induction_completed", Label: "Induction Completed", IsBool: true},
			}},
		},
	},

	"staff_movement": {
		EntityTable: "staff_movements",
		DisplayName: "Staff Movement",
		ModuleKey:   "staff_hr_staff_movement",
		FieldGroups: []fieldGroup{
			{Label: "Movement Details", Fields: []fieldDef{
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "movement_type", Label: "Movement Type"},
				{Key: "from_home", Label: "From Home"},
				{Key: "to_home", Label: "To Home"},
				{Key: "from_role", Label: "From Role"},
				{Key: "to_role", Label: "To Role"},
				{Key: "effective_date", Label: "Effective Date"},
				{Key: "reason", Label: "Reason"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"leave_request": {
		EntityTable: "leave_requests",
		DisplayName: "Leave Request",
		ModuleKey:   "staff_hr_leave",
		FieldGroups: []fieldGroup{
			{Label: "Leave Details", Fields: []fieldDef{
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "leave_type", Label: "Leave Type"},
				{Key: "start_date", Label: "Start Date"},
				{Key: "end_date", Label: "End Date"},
				{Key: "days_requested", Label: "Days Requested"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "reason", Label: "Reason", Wide: true},
				{Key: "manager_notes", Label: "Manager Notes", Wide: true},
			}},
		},
	},

	"toil": {
		EntityTable: "toil_balances",
		DisplayName: "TOIL",
		ModuleKey:   "staff_hr_toil",
		FieldGroups: []fieldGroup{
			{Label: "TOIL Details", Fields: []fieldDef{
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "home_name", Label: "Home"},
				{Key: "hours_claimed", Label: "Hours Claimed"},
				{Key: "date_worked", Label: "Date Worked"},
				{Key: "approved_by", Label: "Approved By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"timesheet": {
		EntityTable: "timesheets",
		DisplayName: "Timesheet / Salary",
		ModuleKey:   "staff_hr_timesheets_salary",
		FieldGroups: []fieldGroup{
			{Label: "Timesheet Details", Fields: []fieldDef{
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "home_name", Label: "Home"},
				{Key: "pay_period", Label: "Pay Period"},
				{Key: "total_hours", Label: "Total Hours"},
				{Key: "overtime_hours", Label: "Overtime Hours"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Approvals", Fields: []fieldDef{
				{Key: "line_manager_approved", Label: "Line Manager Approved", IsBool: true},
				{Key: "hr_approved", Label: "HR Approved", IsBool: true},
				{Key: "finance_approved", Label: "Finance Approved", IsBool: true},
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"expense_claim": {
		EntityTable: "staff_expenses",
		DisplayName: "Expense Claim",
		ModuleKey:   "staff_hr_expenses",
		FieldGroups: []fieldGroup{
			{Label: "Claim Details", Fields: []fieldDef{
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "home_name", Label: "Home"},
				{Key: "category", Label: "Category"},
				{Key: "amount", Label: "Amount"},
				{Key: "claim_date", Label: "Claim Date"},
				{Key: "receipt_attached", Label: "Receipt Attached", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "manager_notes", Label: "Manager Notes", Wide: true},
			}},
		},
	},

	"training": {
		EntityTable: "training_records",
		DisplayName: "Training",
		ModuleKey:   "staff_hr_training",
		FieldGroups: []fieldGroup{
			{Label: "Training Details", Fields: []fieldDef{
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "training_name", Label: "Training Name"},
				{Key: "training_type", Label: "Type"},
				{Key: "provider", Label: "Provider"},
				{Key: "completed_date", Label: "Completed Date"},
				{Key: "expiry_date", Label: "Expiry Date"},
				{Key: "mandatory", Label: "Mandatory", IsBool: true},
				{Key: "certificate_uploaded", Label: "Certificate Uploaded", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"supervision": {
		EntityTable: "supervision_records",
		DisplayName: "Supervision",
		ModuleKey:   "staff_hr_supervision",
		FieldGroups: []fieldGroup{
			{Label: "Session Details", Fields: []fieldDef{
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "supervisor_name", Label: "Supervisor"},
				{Key: "supervision_date", Label: "Date"},
				{Key: "supervision_type", Label: "Type"},
				{Key: "home_name", Label: "Home"},
				{Key: "staff_acknowledged", Label: "Staff Acknowledged", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Content", Fields: []fieldDef{
				{Key: "agenda", Label: "Agenda", Wide: true},
				{Key: "discussion_notes", Label: "Discussion Notes", Wide: true},
				{Key: "action_points", Label: "Action Points", Wide: true},
				{Key: "wellbeing_notes", Label: "Wellbeing Notes", Wide: true},
			}},
		},
	},

	"disciplinary": {
		EntityTable: "disciplinary_records",
		DisplayName: "Disciplinary Case",
		ModuleKey:   "staff_hr_disciplinary",
		FieldGroups: []fieldGroup{
			{Label: "Case Details", Fields: []fieldDef{
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "case_type", Label: "Case Type"},
				{Key: "severity", Label: "Severity"},
				{Key: "date_raised", Label: "Date Raised"},
				{Key: "investigating_officer", Label: "Investigating Officer"},
				{Key: "hearing_date", Label: "Hearing Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "evidence_summary", Label: "Evidence Summary", Wide: true},
				{Key: "outcome", Label: "Outcome", Wide: true},
				{Key: "appeal_submitted", Label: "Appeal Submitted", IsBool: true},
			}},
		},
	},

	// ── Finance ───────────────────────────────────────────────────────────────

	"placement_fee": {
		EntityTable: "placement_fees",
		DisplayName: "Placement Fee",
		ModuleKey:   "finance_placement_fees",
		FieldGroups: []fieldGroup{
			{Label: "Fee Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "la_name", Label: "Local Authority"},
				{Key: "weekly_fee", Label: "Weekly Fee"},
				{Key: "effective_date", Label: "Effective Date"},
				{Key: "end_date", Label: "End Date"},
				{Key: "placement_type", Label: "Placement Type"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"invoice": {
		EntityTable: "placement_invoices",
		DisplayName: "Invoice",
		ModuleKey:   "finance_invoicing",
		FieldGroups: []fieldGroup{
			{Label: "Invoice Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "la_name", Label: "Local Authority"},
				{Key: "invoice_number", Label: "Invoice Number"},
				{Key: "invoice_date", Label: "Invoice Date"},
				{Key: "due_date", Label: "Due Date"},
				{Key: "total_amount", Label: "Total Amount"},
				{Key: "paid_amount", Label: "Paid Amount"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"petty_cash": {
		EntityTable: "petty_cash_transactions",
		DisplayName: "Petty Cash",
		ModuleKey:   "finance_petty_cash",
		FieldGroups: []fieldGroup{
			{Label: "Transaction Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "staff_name", Label: "Staff Member"},
				{Key: "transaction_type", Label: "Type"},
				{Key: "amount", Label: "Amount"},
				{Key: "date", Label: "Date"},
				{Key: "category", Label: "Category"},
				{Key: "receipt_attached", Label: "Receipt Attached", IsBool: true},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "purpose", Label: "Purpose", Wide: true},
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"allowance": {
		EntityTable: "resident_allowances",
		DisplayName: "Allowances & Savings",
		ModuleKey:   "finance_allowances_savings",
		FieldGroups: []fieldGroup{
			{Label: "Allowance Details", Fields: []fieldDef{
				{Key: "resident_name", Label: "Resident"},
				{Key: "home_name", Label: "Home"},
				{Key: "allowance_type", Label: "Allowance Type"},
				{Key: "amount", Label: "Amount"},
				{Key: "frequency", Label: "Frequency"},
				{Key: "effective_date", Label: "Effective Date"},
				{Key: "approved_by", Label: "Approved By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"bill": {
		EntityTable: "bills",
		DisplayName: "Bill / Expense",
		ModuleKey:   "finance_bills_expenses",
		FieldGroups: []fieldGroup{
			{Label: "Bill Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "vendor", Label: "Vendor"},
				{Key: "category", Label: "Category"},
				{Key: "amount", Label: "Amount"},
				{Key: "bill_date", Label: "Bill Date"},
				{Key: "due_date", Label: "Due Date"},
				{Key: "submitted_by", Label: "Submitted By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "manager_notes", Label: "Manager Notes", Wide: true},
			}},
		},
	},

	"budget": {
		EntityTable: "home_budgets",
		DisplayName: "Budget",
		ModuleKey:   "finance_budgets",
		FieldGroups: []fieldGroup{
			{Label: "Budget Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "period", Label: "Period"},
				{Key: "total_budget", Label: "Total Budget"},
				{Key: "allocated_amount", Label: "Allocated"},
				{Key: "spent_amount", Label: "Spent"},
				{Key: "created_by", Label: "Created By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	// ── Homes ─────────────────────────────────────────────────────────────────

	"home_creation": {
		EntityTable: "homes",
		DisplayName: "Home Creation / Details",
		ModuleKey:   "homes_home_creation_details",
		FieldGroups: []fieldGroup{
			{Label: "Home Details", Fields: []fieldDef{
				{Key: "name", Label: "Home Name"},
				{Key: "address", Label: "Address", Wide: true},
				{Key: "home_type", Label: "Home Type"},
				{Key: "capacity", Label: "Capacity"},
				{Key: "registered_manager", Label: "Registered Manager"},
				{Key: "ofsted_number", Label: "Ofsted Number"},
				{Key: "phone", Label: "Phone"},
				{Key: "email", Label: "Email"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Regulatory", Fields: []fieldDef{
				{Key: "last_inspection_date", Label: "Last Inspection Date"},
				{Key: "last_inspection_rating", Label: "Last Inspection Rating"},
				{Key: "registration_date", Label: "Registration Date"},
			}},
		},
	},

	"property_document": {
		EntityTable: "home_documents",
		DisplayName: "Property / Tenancy / Documents",
		ModuleKey:   "homes_property_tenancy_documents",
		FieldGroups: []fieldGroup{
			{Label: "Document Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "document_type", Label: "Document Type"},
				{Key: "title", Label: "Title"},
				{Key: "issue_date", Label: "Issue Date"},
				{Key: "expiry_date", Label: "Expiry Date"},
				{Key: "uploaded_by", Label: "Uploaded By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
			}},
		},
	},

	"home_check": {
		EntityTable: "home_checks",
		DisplayName: "Checks / Chores / Audits",
		ModuleKey:   "homes_checks_chores_audits",
		FieldGroups: []fieldGroup{
			{Label: "Check Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "check_type", Label: "Check Type"},
				{Key: "check_date", Label: "Check Date"},
				{Key: "completed_by", Label: "Completed By"},
				{Key: "overall_result", Label: "Overall Result"},
				{Key: "failed_items_count", Label: "Failed Items"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "notes", Label: "Notes", Wide: true},
				{Key: "actions_required", Label: "Actions Required", Wide: true},
			}},
		},
	},

	"maintenance_log": {
		EntityTable: "maintenance_logs",
		DisplayName: "Maintenance Log",
		ModuleKey:   "homes_maintenance_maintenance_logs",
		FieldGroups: []fieldGroup{
			{Label: "Issue Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "issue_type", Label: "Issue Type"},
				{Key: "priority", Label: "Priority"},
				{Key: "reported_by", Label: "Reported By"},
				{Key: "reported_date", Label: "Reported Date"},
				{Key: "assigned_to", Label: "Assigned To"},
				{Key: "estimated_cost", Label: "Estimated Cost"},
				{Key: "actual_cost", Label: "Actual Cost"},
				{Key: "completion_date", Label: "Completion Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "resolution_notes", Label: "Resolution Notes", Wide: true},
			}},
		},
	},

	"asset": {
		EntityTable: "home_assets",
		DisplayName: "Assets",
		ModuleKey:   "homes_assets",
		FieldGroups: []fieldGroup{
			{Label: "Asset Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "asset_name", Label: "Asset Name"},
				{Key: "asset_type", Label: "Asset Type"},
				{Key: "category", Label: "Category"},
				{Key: "serial_number", Label: "Serial Number"},
				{Key: "purchase_date", Label: "Purchase Date"},
				{Key: "purchase_price", Label: "Purchase Price"},
				{Key: "current_value", Label: "Current Value"},
				{Key: "location", Label: "Location"},
				{Key: "condition", Label: "Condition"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Disposal", Fields: []fieldDef{
				{Key: "disposal_date", Label: "Disposal Date"},
				{Key: "disposal_reason", Label: "Disposal Reason", Wide: true},
				{Key: "disposal_approved_by", Label: "Disposal Approved By"},
			}},
		},
	},

	// ── Compliance ────────────────────────────────────────────────────────────

	"reg_32": {
		EntityTable: "reg44_reports",
		DisplayName: "Reg 32 / Reg 44 Report",
		ModuleKey:   "compliance_reg_32_report",
		FieldGroups: []fieldGroup{
			{Label: "Report Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "report_type", Label: "Report Type"},
				{Key: "reporting_period_start", Label: "Period Start"},
				{Key: "reporting_period_end", Label: "Period End"},
				{Key: "prepared_by", Label: "Prepared By"},
				{Key: "visit_date", Label: "Visit Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Content", Fields: []fieldDef{
				{Key: "summary", Label: "Summary", Wide: true},
				{Key: "findings", Label: "Findings", Wide: true},
				{Key: "recommendations", Label: "Recommendations", Wide: true},
				{Key: "actions_required", Label: "Actions Required", Wide: true},
			}},
		},
	},

	"internal_audit": {
		EntityTable: "reg45_reviews",
		DisplayName: "Internal Audit",
		ModuleKey:   "compliance_internal_audit",
		FieldGroups: []fieldGroup{
			{Label: "Audit Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "audit_type", Label: "Audit Type"},
				{Key: "audit_date", Label: "Audit Date"},
				{Key: "auditor_name", Label: "Auditor"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Findings", Fields: []fieldDef{
				{Key: "summary", Label: "Summary", Wide: true},
				{Key: "findings", Label: "Findings", Wide: true},
				{Key: "actions", Label: "Actions", Wide: true},
				{Key: "evidence_notes", Label: "Evidence Notes", Wide: true},
			}},
		},
	},

	"quality_assurance": {
		EntityTable: "kpi_records",
		DisplayName: "Quality Assurance",
		ModuleKey:   "compliance_quality_assurance",
		FieldGroups: []fieldGroup{
			{Label: "QA Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "review_date", Label: "Review Date"},
				{Key: "reviewer_name", Label: "Reviewer"},
				{Key: "area", Label: "Area Reviewed"},
				{Key: "rating", Label: "Rating"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Findings", Fields: []fieldDef{
				{Key: "findings", Label: "Findings", Wide: true},
				{Key: "actions", Label: "Actions", Wide: true},
				{Key: "evidence", Label: "Evidence", Wide: true},
			}},
		},
	},

	"ofsted_notification": {
		EntityTable: "ofsted_notifications",
		DisplayName: "Ofsted Notification",
		ModuleKey:   "compliance_ofsted_notifications",
		FieldGroups: []fieldGroup{
			{Label: "Notification Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "notification_type", Label: "Notification Type"},
				{Key: "event_date", Label: "Event Date"},
				{Key: "notified_by", Label: "Notified By"},
				{Key: "submission_date", Label: "Submission Date"},
				{Key: "ofsted_reference", Label: "Ofsted Reference"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "actions_taken", Label: "Actions Taken", Wide: true},
				{Key: "evidence_stored", Label: "Evidence Stored", IsBool: true},
			}},
		},
	},

	"reg_27_action": {
		EntityTable: "ofsted_notifications",
		DisplayName: "Reg 27 / 34 Action",
		ModuleKey:   "compliance_reg_27_34_actions",
		FieldGroups: []fieldGroup{
			{Label: "Action Details", Fields: []fieldDef{
				{Key: "home_name", Label: "Home"},
				{Key: "notification_type", Label: "Action Type"},
				{Key: "event_date", Label: "Event Date"},
				{Key: "owner_name", Label: "Owner"},
				{Key: "due_date", Label: "Due Date"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Detail", Fields: []fieldDef{
				{Key: "description", Label: "Description", Wide: true},
				{Key: "evidence_notes", Label: "Evidence Notes", Wide: true},
			}},
		},
	},

	// ── Tenant Admin ──────────────────────────────────────────────────────────

	"role_change": {
		EntityTable: "role_permissions",
		DisplayName: "Role / Permission Change",
		ModuleKey:   "tenant_admin_role_permission_changes",
		FieldGroups: []fieldGroup{
			{Label: "Change Details", Fields: []fieldDef{
				{Key: "role", Label: "Role"},
				{Key: "module", Label: "Module"},
				{Key: "old_level", Label: "Old Permission Level"},
				{Key: "new_level", Label: "New Permission Level"},
				{Key: "changed_by", Label: "Changed By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Notes", Fields: []fieldDef{
				{Key: "reason", Label: "Reason", Wide: true},
			}},
		},
	},

	"agency_access": {
		EntityTable: "agency_bank_staff_usages",
		DisplayName: "External Agency Access",
		ModuleKey:   "tenant_admin_external_agency_access",
		FieldGroups: []fieldGroup{
			{Label: "Access Details", Fields: []fieldDef{
				{Key: "agency_name", Label: "Agency Name"},
				{Key: "home_name", Label: "Home"},
				{Key: "access_type", Label: "Access Type"},
				{Key: "start_date", Label: "Start Date"},
				{Key: "end_date", Label: "End Date"},
				{Key: "approved_by", Label: "Approved By"},
				{Key: "status", Label: "Status"},
			}},
			{Label: "Scope", Fields: []fieldDef{
				{Key: "scope_description", Label: "Access Scope", Wide: true},
				{Key: "safeguarding_notes", Label: "Safeguarding Notes", Wide: true},
			}},
		},
	},
}

// ── Supporting types ──────────────────────────────────────────────────────────

type entityMeta struct {
	EntityTable string       `json:"entity_table"`
	DisplayName string       `json:"display_name"`
	ModuleKey   string       `json:"module_key"`
	FieldGroups []fieldGroup `json:"field_groups"`
}

type fieldGroup struct {
	Label  string     `json:"label"`
	Fields []fieldDef `json:"fields"`
}

type fieldDef struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Wide   bool   `json:"wide"`
	IsBool bool   `json:"is_bool"`
}

// ── Handler ───────────────────────────────────────────────────────────────────

// GetWorkflowEntity handles GET /workflow/:id/entity
func GetWorkflowEntity(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, wfError("UNAUTHORIZED", "Not authenticated"))
		return
	}

	scopedDB, ok := mustScopedDB(c) 
	if !ok {
		 return 
		}

	var item models.WorkflowItem
	if err := scopedDB.Where("id = ? AND org_id = ?", c.Param("id"), claims.OrgID).
		First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, wfError("NOT_FOUND", "Workflow item not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Database error"))
		return
	}

	enrichedItem := enrichWorkflowItems(scopedDB, claims.OrgID, []models.WorkflowItem{item})[0]

	if item.EntityID == "" {
		c.JSON(http.StatusOK, gin.H{
			"status":        "success",
			"workflow_item": enrichedItem,
			"entity":        nil,
			"entity_meta":   nil,
			"matrix":        nil,
			"message":       "No entity linked to this workflow item",
		})
		return
	}

	meta, ok := workflowTypeToEntity[item.WorkflowType]
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"status":        "success",
			"workflow_item": enrichedItem,
			"entity":        nil,
			"entity_meta":   nil,
			"matrix":        nil,
			"message":       "Entity detail view not configured for workflow type: " + item.WorkflowType,
		})
		return
	}

	var entityData map[string]interface{}
	if err := scopedDB.Table(meta.EntityTable).
		Where("id = ? AND org_id = ?", item.EntityID, claims.OrgID).
		Take(&entityData).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, gin.H{
				"status":        "success",
				"workflow_item": enrichedItem,
				"entity":        nil,
				"entity_meta":   meta,
				"matrix":        nil,
				"message":       "Entity record not found (may have been deleted)",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, wfError("DB_ERROR", "Failed to fetch entity record"))
		return
	}

	matrix := getMatrix(scopedDB, claims.OrgID, item.WorkflowType)

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"workflow_item": enrichedItem,
		"entity":        entityData,
		"entity_meta":   meta,
		"matrix": gin.H{
			"module_key":           matrix.ModuleKey,
			"module_name":          matrix.ModuleName,
			"category":             matrix.Category,
			"maker_roles_raw":      matrix.MakerRolesRaw,
			"checker_roles_raw":    matrix.CheckerRolesRaw,
			"escalation_roles_raw": matrix.EscalationRolesRaw,
			"logical_flow":         matrix.LogicalFlow,
		},
	})
}