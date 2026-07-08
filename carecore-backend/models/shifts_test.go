package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"testing"
)

func TestShiftTemplate(t *testing.T) {
	testCase := models.ShiftTemplate{
		HomeID:        "1",
		HomeName:      "Test",
		Name:          "Shahbuddin",
		ShiftType:     "Test",
		TimeStart:     "Today",
		TimeEnd:       "Today",
		StaffRequired: 1,
		Active:        true,
		Notes:         "Test",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error :%v", result)
	}
}

func TestRota(t *testing.T) {
	testCase := models.Rota{
		HomeID:      "1",
		WeekStart:   "Sunday",
		Status:      "Completed",
		CreatedBy:   "Shahbuddin",
		PublishedBy: "Tahmid",
		PublishedAt: "Today",
		Notes:       "Test",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}

func TestShift(t *testing.T) {
	testCase := models.Shift{
		HomeID:         "1",
		HomeName:       "test",
		RotaID:         "1",
		TemplateID:     "1",
		ShiftType:      "Evening",
		Date:           "Today",
		TimeStart:      "Now",
		TimeEnd:        "Later",
		StaffID:        "13",
		StaffName:      "Nafis Tahmid",
		AssignedStaff:  []string{"1", "2", "3"},
		Status:         "Scheduled",
		AcknowledgedBy: []string{"1", "2", "3"},
		Notes:          "Test",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}

}
func TestShiftHandover(t *testing.T) {
	testCase := models.ShiftHandover{
		HomeID:         "1",
		ShiftID:        "1",
		ShiftDate:      "Today",
		ShiftType:      "Evening",
		WrittenBy:      "Shahbuddin",
		Notes:          "Test...",
		Flags:          []string{"1", "2", "3"},
		SubmittedAt:    "Email",
		AcknowledgedBy: "Shahbuddin",
		AcknowledgedAt: "Today",
	}

	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}
