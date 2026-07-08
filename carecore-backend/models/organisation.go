package models

import "gorm.io/datatypes"

type Organisation struct {
	Base
	Name                      string         `gorm:"not null" json:"name"`
	AppName                   string         `gorm:"default:'CareCore AI'" json:"app_name"`
	LogoURL                   string         `json:"logo_url"`
	PrimaryColour             string         `gorm:"default:'#4B8BF5'" json:"primary_colour"`
	DefaultLanguage           string         `gorm:"default:'en'" json:"default_language"`
	DefaultTheme              string         `gorm:"default:'light'" json:"default_theme"`
	ContactEmail              string         `json:"contact_email"`
	SessionTimeoutHours       int            `gorm:"default:8" json:"session_timeout_hours"`
	FailedLoginAttemptsLimit  int            `gorm:"default:5" json:"failed_login_attempts_limit"`
	LockoutDurationMinutes    int            `gorm:"default:15" json:"lockout_duration_minutes"`
	MinPasswordLength         int            `gorm:"default:8" json:"min_password_length"`
	RequireNumber             bool           `gorm:"default:true" json:"require_number"`
	RequireSpecialChar        bool           `gorm:"default:false" json:"require_special_char"`
	GPSClockInEnabled         bool           `gorm:"default:false" json:"gps_clock_in_enabled"`
	TradingName               string         `json:"trading_name"`
	OfstedURN                 string         `json:"ofsted_urn"`
	RegistrationDate          string         `json:"registration_date"`
	CompanyRegistrationNumber string         `json:"company_registration_number"`
	AimsAndObjectives         string         `json:"aims_and_objectives"`
	AdmissionCriteria         string         `json:"admission_criteria"`
	ComplaintsProcedure       string         `json:"complaints_procedure"`
	OrganisationStatus                string `json:"organisation_status"`
	RegisteredServiceManagerName      string `json:"registered_service_manager_name"`
	RegisteredManagerQualificationHeld bool   `json:"registered_manager_qualification_held"`
	QualificationName                 string `json:"qualification_name"`
	QualificationIssuedDate           string `json:"qualification_issued_date"`
	NominatedIndividualName           string `json:"nominated_individual_name"`
	NominatedIndividualContact        string `json:"nominated_individual_contact"`
	ContactPhone                      string `json:"contact_phone"`
	ContactAddress                    string `json:"contact_address"`
	Settings                  datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"settings"`
	// HR payroll policy — read by TimesheetsTab for overtime/allowance calculations
	HRPolicy                  datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"hr_policy"`
}

// ExternalSupportService records an external agency or provider supporting one or more residents.
// linked_resident_ids and linked_home_ids are JSONB arrays of UUIDs.
type ExternalSupportService struct {
	Base
	AgencyOrganisationName          string         `json:"agency_organisation_name"`
	ServiceType                     string         `json:"service_type"`
	ServiceDescription              string         `json:"service_description"`
	ContactName                     string         `json:"contact_name"`
	ContactPhone                    string         `json:"contact_phone"`
	ContactEmail                    string         `json:"contact_email"`
	ContactAddress                  string         `json:"contact_address"`
	HoursPerWeekProvided            float64        `json:"hours_per_week_provided"`
	NumberOfChildrenReceivingService int           `json:"number_of_children_receiving_service"`
	LinkedResidentIDs               datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"linked_resident_ids"`
	LinkedHomeIDs                   datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"linked_home_ids"`
	AccommodationCategories         datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"accommodation_categories"`
	ContractStartDate               string         `json:"contract_start_date"`
	ContractEndDate                 string         `json:"contract_end_date"`
	Status                          string         `gorm:"default:'active'" json:"status"`
	Notes                           string         `json:"notes"`
}