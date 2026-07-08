package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestHome(t *testing.T) {
	// 1. Arrange
	testHome := models.Home{
		Name:        "Test Home",
		Type:        "care",
		DocumentIDs: models.DocumentIDList{"doc-id-abc", "doc-id-xyz"},
	}

	// 2. Act (Marshal to JSON)
	bytes, err := json.Marshal(testHome)
	assert.NoError(t, err)

	// 3. Assert Unmarshaling back works
	var result models.Home
	err = json.Unmarshal(bytes, &result)
	assert.NoError(t, err)

	// Check that values remain intact
	assert.Len(t, result.DocumentIDs, 2)
	assert.Equal(t, "doc-id-abc", result.DocumentIDs[0])
}

func TestHomeDocument(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.HomeDocument{
		HomeID:       "1",
		Title:        "Test",
		DocumentType: "Test",
		FileURL:      "test",
		FileName:     "test",
		FileSize:     "test",
		UploadDate:   "Today",
		IssueDate:    &acknowledgedTime,
		ExpiryDate:   &acknowledgedTime,
		ReminderDays: 1,
		Status:       "Sold",
		UploadedBy:   "Shahbuddin",
		Notes:        "Test",
		Version:      10,
		SupersededBy: "Shahbuddin",
		RemovedAt:    "Today",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}

func TestHomeTask(t *testing.T) {
	testCase := models.HomeTask{
		HomeID:         "1",
		HomeName:       "Test",
		Title:          "Test",
		Description:    "Test",
		Type:           "Test",
		DueDate:        "Test",
		DueTime:        "Test",
		Location:       "Test",
		Status:         "Test",
		Priority:       "Test",
		AssignedToID:   "Test",
		AssignedToName: "Test",
		CompletedAt:    "Today",
		CompletedBy:    "Shahbuddin",
		Notes:          "Test...",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}

func TestHomeLog(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.HomeLog{
		Attachments: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["attachments"])
}

func TestMaintenanceLog(t *testing.T) {
	cost := 55.5
	testCase := models.MaintenanceLog{
		Cost: &cost,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	assert.Equal(t, cost, parsed["cost"])
}

func TestMaintenanceSchedule(t *testing.T) {
	cost := 55.5
	testCase := models.MaintenanceSchedule{
		EstimatedCost: &cost,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	assert.Equal(t, cost, parsed["estimated_cost"])
}

func TestHomeAsset(t *testing.T) {
	cost := 55.5
	testCase := models.HomeAsset{
		PurchaseCost: &cost,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	assert.Equal(t, cost, parsed["purchase_cost"])
}

func TestHomeCheck(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.HomeCheck{
		Items: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["items"])

}

func TestHomeCheckTemplate(t *testing.T) {
	testCase := models.HomeCheckTemplate{
		Title:                 "Test",
		Description:           "Test",
		Frequency:             "Test",
		Area:                  "Test",
		DefaultDueTime:        "Test",
		IsActive:              true,
		RequiresManagerReview: true,
		DisplayOrder:          10,
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error %v", result)
	}
}

func TestHomeCheckTemplateItem(t *testing.T) {
	testCase := models.HomeCheckTemplateItem{
		TemplateID:          "1",
		ItemTitle:           "Test",
		ItemQuestion:        "Test",
		IsRequired:          true,
		AllowsNa:            true,
		RequiresNoteOnFail:  true,
		RequiresPhotoOnFail: true,
		IsActive:            true,

		DisplayOrder: 10,
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error %v", result)
	}
}

func TestHomeCheckInstance(t *testing.T) {
	testCase := models.HomeCheckInstance{
		HomeID:            "1",
		TemplateID:        "1",
		TemplateTitle:     "Test",
		TemplateArea:      "test",
		TemplateFrequency: "Test",
		ScheduledDate:     "Test",
		DueAt:             "Today",
		Status:            "Test",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}

func TestHomeCheckCompletion(t *testing.T) {
	testCase := models.HomeCheckCompletion{
		HomeID:              "1",
		InstanceID:          "1",
		TemplateID:          "1",
		SubmittedByStaffID:  "1",
		SubmittedByName:     "1",
		SubmittedAt:         "Today",
		CompletionDate:      "Today",
		OverallStatus:       "Done",
		GeneralNote:         "Done",
		PhotoUrl:            "Test",
		ManagerReviewStatus: "Test",
	}

	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}
}
func TestHomeCheckItemResponse(t *testing.T) {
	testCase := models.HomeCheckItemResponse{
		CompletionID:       "1",
		InstanceID:         "1",
		TemplateItemID:     "1",
		ItemTitle:          "Test",
		ResponseStatus:     "Test",
		Note:               "Test",
		IssueDetails:       "Test",
		IssueCreated:       true,
		CompletedByStaffID: "test",
		CompletedByName:    "test",
		CompletedAt:        "Today",
	}

	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}
}

func TestHomeCheckIssue(t *testing.T) {
	testCase := models.HomeCheckIssue{
		HomeID:               "1",
		InstanceID:           "1",
		CompletionID:         "1",
		TemplateID:           "1",
		IssueTitle:           "1",
		IssueDetails:         "Test",
		Severity:             "Test",
		ImmediateActionTaken: "Test",
		Status:               "test",
		ReportedByStaffID:    "test",
		ReportedByName:       "Shahbuddin",
		ResolvedByStaffID:    "123",
		ResolvedAt:           "Today",
		AssignedToName:       "Tahmid",
		DueDate:              "Today",
	}

	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}
}

func TestHomeBudget(t *testing.T) {
	testCase := models.HomeBudget{
		HomeID:      "1",
		PeriodStart: "Now",
		PeriodEnd:   "Later",
		TotalBudget: 44.5,
		SpentAmount: 44.5,
		Status:      "Done",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}

}

func TestHomeBudgetLine(t *testing.T) {
	testCase := models.HomeBudgetLine{
		HomeID:          "1",
		BudgetID:        "1",
		Category:        "Test",
		AllocatedAmount: 44.5,
		SpentAmount:     44.5,
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}

}
func TestHomeExpense(t *testing.T) {
	testCase := models.HomeExpense{
		HomeID:      "1",
		Date:        "Today",
		Category:    "Test",
		Amount:      44.5,
		Description: "test",
		SubmittedBy: "Shahbuddin",
		ApprovedBy:  "Shahbuddin",
		ReceiptURL:  "test.com",
		Status:      "Done",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}

}

func TestMealPlan(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.MealPlan{
		Days: contentJSON,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["days"])

}

func TestVisitorLog(t *testing.T) {
	testCase := models.VisitorLog{
		HomeID:              "1",
		HomeName:            "Test",
		RecordedByID:        "1",
		RecordedByName:      "Shahbuddin",
		VisitDate:           "Today",
		ArrivalTime:         "Today",
		DepartureTime:       "Today",
		VisitorName:         "Shahbuddin",
		VisitorOrganisation: "Apple",
		VisitorRelationship: "CEO",
		PurposeOfVisit:      "Tour",
		ResidentVisitedID:   "test",
		ResidentVisitedName: "test",
		DBSChecked:          true,
		DBSCheckDate:        "test",
		StaffWhoAuthorised:  "Tahmid",
		AnyConcerns:         false,
		ConcernNotes:        "Test",
		SignedIn:            true,
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}
}

func TestOfstedNotification(t *testing.T) {
	testCase := models.OfstedNotification{
		HomeID:                "1",
		HomeName:              "Test",
		NotificationType:      "Test",
		EventDate:             "T",
		ResidentID:            "1",
		ResidentName:          "T",
		StaffID:               "1",
		StaffName:             "T",
		EventSummary:          "T",
		HoursToNotify:         12,
		NotificationMethod:    "Te",
		NotifiedDatetime:      "Te",
		OfstedReferenceNumber: "Te",
		OfstedContactName:     "T",
		OfstedResponse:        "T",
		Status:                "T",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}
}

func TestReg44Report(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.Reg44Report{
		RecordsReviewed:                 contentJSON,
		QualityStandards:                contentJSON,
		PreviousRecommendationsActioned: contentJSON,
		NewRecommendations:              contentJSON,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["records_reviewed"])
	assert.Equal(t, unmarshaledContent, parsed["quality_standards"])
	assert.Equal(t, unmarshaledContent, parsed["previous_recommendations_actioned"])
	assert.Equal(t, unmarshaledContent, parsed["new_recommendations"])
}

func TestReg45Review(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.Reg45Review{
		OverallRatingsBreakdown: contentJSON,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["overall_ratings_breakdown"])

}

func TestSignificantEvent(t *testing.T) {
	testCase := models.SignificantEvent{
		HomeID:                     "1",
		HomeName:                   "t",
		RecordedByID:               "1",
		RecordedByName:             "Te",
		EventDatetime:              "t",
		EventType:                  "t",
		ResidentID:                 "t",
		ResidentName:               "t",
		Summary:                    "t",
		FullDetail:                 "sdf",
		ImmediateActionTaken:       "te",
		ManagerNotified:            true,
		ManagerNotifiedDatetime:    "er",
		LANotified:                 true,
		LANotifiedDatetime:         "Now",
		OfstedNotified:             true,
		OfstedNotificationRequired: true,
		OfstedNotifiedDatetime:     "Te",
		PoliceInvolved:             true,
		PoliceReference:            "test",
		FollowUpRequired:           true,
		FollowUpActions:            "te",
		ReviewCompleted:            false,
		ReviewDate:                 "te",
		ReviewedByName:             "Ne",
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}

}
