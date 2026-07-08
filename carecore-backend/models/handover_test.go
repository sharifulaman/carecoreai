package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"testing"
)

func TestHandoverRecord(t *testing.T) {
	testCase := models.HandoverRecord{
		HomeID:                         "1",
		HomeName:                       "1",
		HandoverDate:                   "1",
		Shift:                          "1",
		OutgoingStaffID:                "1",
		OutgoingStaffName:              "1",
		OutgoingShiftStart:             "1",
		OutgoingShiftEnd:               "1",
		IncomingStaffID:                "1",
		IncomingStaffName:              "1",
		IncomingShiftStart:             "1",
		IncomingShiftEnd:               "1",
		Status:                         "1",
		ProgressPercent:                1.0,
		SubmittedByStaffID:             "1",
		SubmittedByName:                "1",
		SubmittedAt:                    "1",
		OutgoingDeclaration:            true,
		LockedAt:                       "1",
		NoIncidentsConfirmed:           true,
		NoMedicationIssuesConfirmed:    false,
		NoEnvironmentConcernsConfirmed: false,
		DailyOverview:                  "1",
		Highlights:                     "1",
		PointsToNote:                   "1",
		ConcernsSummary:                "1",
		RequestsSummary:                "1",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error : %v", err)
	}
}

func TestHandoverUpdate(t *testing.T) {
	testCase := models.HandoverUpdate{
		HandoverID: "1",
		HomeID:     "1",
		UpdateType: "1",
		Title:      "1",
		Summary:    "1",
		Severity:   "1",
		RecordedAt: "1",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestHandoverYPSummary(t *testing.T) {
	testCase := models.HandoverYPSummary{
		HandoverID:       "1",
		HomeID:           "1",
		ResidentID:       "1",
		ResidentInitials: "1",
		ResidentDisplay:  "1",
		Status:           "1",
		Mood:             "1",
		KeyUpdate:        "1",
		FollowUpRequired: false,
		FollowUpNote:     "1",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error: %v", err)
	}
}

func TestHandoverTask(t *testing.T) {
	testCase := models.HandoverTask{
		HandoverID:        "1",
		HomeID:            "1",
		Title:             "1",
		Description:       "1",
		Priority:          "1",
		DueAt:             "1",
		AssignedToName:    "1",
		Status:            "1",
		CompletedAt:       "1",
		PassedToNextShift: true,
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed %v", err)
	}
}

func TestHandoverDocument(t *testing.T) {
	testCase := models.HandoverDocument{
		HandoverID: "1",
		HomeID:     "1",
		Title:      "1",
		FileName:   "1",
		FileURL:    "1",
		UploadedBy: "1",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}
