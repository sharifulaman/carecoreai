package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestVisitReport(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)

	testCase := models.DailyLog{
		ResidentID:     "1",
		ResidentName:   "Test",
		WorkerID:       "1",
		WorkerName:     "Nafis",
		HomeID:         "1",
		HomeName:       "Test",
		Date:           "Test",
		Shift:          "Night",
		LogType:        "Test",
		Content:        contentJSON,
		Flags:          []string{"1", "2"},
		AISummary:      "Test",
		Flagged:        true,
		FlagSeverity:   1,
		AcknowledgedBy: "Shahbuddin",
		AcknowledgedAt: &acknowledgedTime,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// String assertions (unchanged)
	assert.Equal(t, "1", parsed["resident_id"])
	assert.Equal(t, "Test", parsed["resident_name"])
	assert.Equal(t, "1", parsed["worker_id"])
	assert.Equal(t, "Nafis", parsed["worker_name"])
	assert.Equal(t, "1", parsed["home_id"])
	assert.Equal(t, "Test", parsed["home_name"])
	assert.Equal(t, "Test", parsed["date"])
	assert.Equal(t, "Night", parsed["shift"])
	assert.Equal(t, "Test", parsed["log_type"])

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["content"])

	// FIX 2: Flags - JSON arrays unmarshal as []interface{}, not []string
	expectedFlags := []interface{}{"1", "2"}
	assert.Equal(t, expectedFlags, parsed["flags"])

	// String assertions (unchanged)
	assert.Equal(t, "Test", parsed["ai_summary"])
	assert.Equal(t, true, parsed["flagged"])

	// FIX 3: flag_severity - JSON numbers are float64, not int
	assert.Equal(t, float64(1), parsed["flag_severity"])

	// String assertion (unchanged)
	assert.Equal(t, "Shahbuddin", parsed["acknowledged_by"])

	// FIX 4: acknowledged_at - JSON times are strings in ISO8601 format
	expectedTime := acknowledgedTime.Format(time.RFC3339)
	assert.Equal(t, expectedTime, parsed["acknowledged_at"])
}

// func TestKPIRecord(t *testing.T) {
// 	testCase := models.KPIRecord{
// 		VisitReportID:           "1",
// 		ResidentID:              "1",
// 		WorkerID:                "1",
// 		HomeID:                  "1",
// 		Date:                    "test",
// 		IsKeyWorkerSession:      true,
// 		IsDailySummary:          true,
// 		VisitType:               "test",
// 		Presentation:            "test",
// 		PlacementCondition:      "test",
// 		PrimaryPurpose:          "test",
// 		CollegeStatus:           "test",
// 		LifeSkills:              []string{"1", "2"},
// 		EngagementLevel:         "test",
// 		RiskLevel:               "test",
// 		IndependenceProgress:    "test",
// 		HealthAdherence:         "test",
// 		AppointmentType:         "test",
// 		AppointmentDetailsNotes: "test",
// 	}

// 	bytes, err := json.Marshal(testCase)
// 	assert.NoError(t, err)
// 	var parsed map[string]interface{}
// 	err = json.Unmarshal(bytes, &parsed)
// 	assert.Equal(t, "1", parsed["visit_report_id"])
// 	assert.Equal(t, "1", parsed["resident_id"])
// 	assert.Equal(t, "1", parsed["worker_id"])
// 	assert.Equal(t, "1", parsed["home_id"])
// 	assert.Equal(t, "test", parsed["date"])
// 	assert.Equal(t, true, parsed["is_key_worker_session"])
// 	assert.Equal(t, true, parsed["is_daily_summary"])
// 	assert.Equal(t, "test", parsed["visit_type"])
// 	assert.Equal(t, "test", parsed["presentation"])
// 	assert.Equal(t, "test", parsed["placement_condition"])
// 	assert.Equal(t, "test", parsed["primary_purpose"])
// 	assert.Equal(t, "test", parsed["college_status"])
// 	expectedLifeSkills := []interface{}{"1", "2"}
// 	assert.Equal(t, expectedLifeSkills, parsed["life_skills"])
// 	assert.Equal(t, "test", parsed["engagement_level"])
// 	assert.Equal(t, "test", parsed["risk_level"])
// 	assert.Equal(t, "test", parsed["independence_progress"])
// 	assert.Equal(t, "test", parsed["health_adherence"])
// 	assert.Equal(t, "test", parsed["appointment_type"])
// 	assert.Equal(t, "test", parsed["appointment_details_notes"])

// }

func TestKPIRecord(t *testing.T) {
	testCase := models.KPIRecord{
		VisitReportID:           "1",
		ResidentID:              "1",
		WorkerID:                "1",
		HomeID:                  "1",
		Date:                    "test",
		IsKeyWorkerSession:      true,
		IsDailySummary:          true,
		VisitType:               "test",
		Presentation:            "test",
		PlacementCondition:      "test",
		PrimaryPurpose:          "test",
		CollegeStatus:           "test",
		LifeSkills:              []string{"1", "2"},
		EngagementLevel:         "test",
		RiskLevel:               "test",
		IndependenceProgress:    "test",
		HealthAdherence:         "test",
		AppointmentType:         "test",
		AppointmentDetailsNotes: "test",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestSWPerformanceKPI(t *testing.T) {
	testCase := models.SWPerformanceKPI{
		WorkerID:             "1",
		WorkerName:           "1",
		EmployeeID:           "1",
		HomeID:               "1",
		ResidentID:           "1",
		Date:                 "1",
		WeekStart:            "1",
		Month:                "1",
		ActivityType:         "1",
		SourceEntity:         "1",
		SourceID:             "1",
		HoursWithYP:          100.0,
		VisitType:            "1",
		EngagementLevel:      "1",
		RiskLevel:            "1",
		IndependenceProgress: "1",
		HealthAdherence:      "1",
		LifeSkills:           []string{"1", "2"},
		KWSessionCount:       1,
		CICReportCount:       1,
		SupportPlanCount:     1,
		GPAppointmentCount:   1,
		// Notes:                "1",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}

}

func TestSupportPlan(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.SupportPlan{

		Sections: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// String assertions (unchanged)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["sections"])

}

func TestILSPlanSection(t *testing.T) {
	testCase := models.ILSPlanSection{
		ILSPlanID:          "1",
		ResidentID:         "1",
		HomeID:             "1",
		SkillArea:          "1",
		CustomSkillName:    "1",
		CurrentLevel:       "1",
		Goal:               "1",
		CurrentAbility:     "1",
		SupportNeeded:      "1",
		Actions:            "1",
		TargetDate:         "1",
		ProgressPercentage: 1,
		Notes:              "1",
		LastUpdatedBy:      "1",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestSafeguardingRecore(t *testing.T) {
	testCase := models.SafeguardingRecord{
		ResidentID:  "1",
		HomeID:      "1",
		Date:        "1",
		ReportedBy:  "1",
		ConcernType: "1",
		Description: "1",
		ActionTaken: "1",
		Status:      "1",
		LAReference: "1",
		Notes:       "1",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestMedicationRecord(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.MedicationRecord{
		ResidentID:        "1",
		MedicationName:    "1",
		Dosage:            "1",
		Frequency:         "1",
		Route:             "1",
		PrescribedBy:      "1",
		PrescriberContact: "1",
		StartDate:         &acknowledgedTime,
		EndDate:           &acknowledgedTime,
		ReviewDate:        &acknowledgedTime,
		Status:            "1",
		Notes:             "1",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestMAREntry(t *testing.T) {
	testCase := models.MAREntry{
		ResidentID:       "1",
		MedicationID:     "1",
		Date:             "1",
		TimeScheduled:    "1",
		TimeAdministered: "1",
		AdministeredBy:   "1",
		Outcome:          "1",
		Notes:            "1",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestGPAppointment(t *testing.T) {
	testCase := models.GPAppointment{
		ResidentID:      "1",
		HomeID:          "1",
		Date:            "1",
		GPName:          "1",
		AppointmentType: "1",
		Attended:        true,
		Outcome:         "t",
		Notes:           "t",
		RecordedBy:      "t",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestFamilyContact(t *testing.T) {
	testCase := models.FamilyContact{
		ResidentID:                     "1",
		ResidentName:                   "1",
		HomeID:                         "1",
		ContactPersonName:              "1",
		ContactPersonRelationship:      "1",
		ContactPersonRelationshipOther: "1",
		ContactDatetime:                "1",
		ContactMethod:                  "1",
		ContactInitiatedBy:             "1",
		DurationMinutes:                1,
		Location:                       "1",
		WasSupervised:                  true,
		SupervisedByID:                 "1",
		SupervisedByName:               "1",
		IsCourtOrdered:                 true,
		CourtOrderReference:            "1",
		MoodBefore:                     "1",
		MoodAfter:                      "1",
		ResidentEngagement:             "1",
		ResidentComments:               "1",
		AnyConcerns:                    true,
		ConcernDetails:                 "1",
		SafeguardingConcern:            true,
		LaToBeNotified:                 true,
		LaNotifiedDatetime:             "1",
		ContactToBeReviewed:            true,
		ReviewReason:                   "1",
		NextContactPlanned:             true,
		NextContactDatetime:            "1",
		RecordedByID:                   "1",
		RecordedByName:                 "1",
		Notes:                          "1",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestBodyMap(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.BodyMap{
		Marks: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// String assertions (unchanged)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["marks"])

}

func TestPathwayPlan(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.PathwayPlan{
		Sections: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// String assertions (unchanged)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["sections"])
}

func TestPlacementPlan(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.PlacementPlan{
		Goals: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// String assertions (unchanged)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["goals"])
}

func TestAppointment(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.Appointment{
		Attendees:         contentJSON,
		ExternalAttendees: contentJSON,
		CancelledDates:    contentJSON,
		DocumentTypes:     contentJSON,
		DocumentUrls:      contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// String assertions (unchanged)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["attendees"])
	assert.Equal(t, unmarshaledContent, parsed["external_attendees"])
	assert.Equal(t, unmarshaledContent, parsed["cancelled_dates"])
	assert.Equal(t, unmarshaledContent, parsed["document_types"])
	assert.Equal(t, unmarshaledContent, parsed["document_urls"])
}

func TestAccidentReport(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)

	testCase := models.AccidentReport{
		ActionsTaken:  contentJSON,
		Notifications: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["actions_taken"])
	assert.Equal(t, unmarshaledContent, parsed["notifications"])
}
