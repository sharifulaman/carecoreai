package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestStaffProfile(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)

	testCase := models.StaffProfile{
		OnboardingChecklist: contentJSON,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["onboarding_checklist"])
}

func TestStaffAvailabilityProfile(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.StaffAvailabilityProfile{
		StaffID:                   "1",
		ContractedHoursPerWeek:    4.5,
		EmploymentType:            "Full-time",
		MaxHoursPerDay:            7,
		MaxConsecutiveDays:        10,
		MaxShiftsPerWeek:          4,
		MinRestHoursBetweenShifts: 1,
		SleepInQualified:          true,
		WakingNightQualified:      false,
		FirstAidCertified:         true,
		FirstAidExpiry:            &acknowledgedTime,
		MedicationTrained:         true,
		MedicationTrainingDate:    &acknowledgedTime,
		MedicationTrainingExpiry:  &acknowledgedTime,
		ManualHandlingTrained:     false,
		ManualHandlingExpiry:      &acknowledgedTime,
		DrivingLicence:            false,
		VehicleAvailable:          true,
		SafeguardingTrained:       true,
		SafeguardingLevel:         "Best",
		SafeguardingExpiry:        &acknowledgedTime,
		PreferredShiftTypes:       []string{"1", "2", "3"},
		UnavailableShiftTypes:     []string{"1", "2", "3"},
		FixedDaysOff:              []string{"1", "2", "3"},
		PreferredDaysOff:          []string{"1", "3", "4"},
		Notes:                     "Done",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}

func TestStaffAvailabilityOverride(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.StaffAvailabilityOverride{
		StaffID:      "1",
		OverrideType: "Multiple",
		DateFrom:     acknowledgedTime,
		DateTo:       acknowledgedTime,
		AllDay:       true,
		Reason:       "Yes",
		Approved:     true,
		ApprovedBy:   "Shahbuddin",
		ApprovedAt:   &acknowledgedTime,
		SubmittedBy:  "Tahmid",
	}

	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validaton Error: %v", result)
	}
}

func TestStaffWeeklyAvailability(t *testing.T) {
	testCase := models.StaffWeeklyAvailability{
		StaffID:        "1",
		DayOfWeek:      "Sunday",
		IsAvailable:    true,
		AvailableFrom:  "Today",
		AvailableUntil: "Thursday",
		ShiftTypePref:  "Night",
		Notes:          "Test",
	}

	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}

func TestStaffServiceAssignment(t *testing.T) {
	testCase := models.StaffServiceAssignment{
		StaffID:               "1",
		StaffName:             "Tahmid",
		HomeID:                "1",
		HomeName:              "Ryan Momo Nibash",
		ServiceType:           "Always",
		AccommodationCategory: "Multiple",
		AssignmentStartDate:   "Today",
		PrimaryAssignment:     true,
		AllocationPercentage:  1,
		Active:                true,
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}

func TestStaffMovement(t *testing.T) {
	testCase := models.StaffMovement{
		StaffID:                       "1",
		StaffName:                     "Tahmid",
		StaffRole:                     "Programmer/Developer",
		IsSupportRole:                 true,
		MovementType:                  "Always",
		MovementDate:                  "Test",
		EmploymentType:                "Full time",
		PreviousRole:                  "Intern",
		NewRole:                       "Full-Time",
		PreviousHomeID:                "123",
		PreviousHomeName:              "Mirpur 12",
		NewHomeID:                     "333",
		NewHomeName:                   "Faidabad Home",
		AccommodationCategoryAffected: "All",
		Reason:                        "Whatever",
	}

	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}
