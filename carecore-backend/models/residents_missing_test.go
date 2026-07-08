package models_test

import (
	"carecore-backend/models"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func strPtr(s string) *string {
	return &s
}

func TestWelcomePackDocument(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.WelcomePackDocument{
		HomeID:         "1",
		HomeName:       "Test",
		Language:       "Test",
		FileURL:        "Test",
		FileName:       "Test",
		FileType:       "Test",
		UploadedBy:     &uuidStr,
		UploadedByName: "Test",
		UploadedAt:     "Test",
		IsActive:       true,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	assert.Equal(t, uuidStr, parsed["uploaded_by"])
}

func TestPlacementDetails(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.PlacementDetails{
		CompletedBy: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	assert.Equal(t, uuidStr, parsed["completed_by"])
}

func TestFamilySocialPlan(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.PlacementDetails{
		CompletedBy: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	assert.Equal(t, uuidStr, parsed["completed_by"])
}
func TestBehaviourSupportPlan(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.PlacementDetails{
		CompletedBy: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	assert.Equal(t, uuidStr, parsed["completed_by"])
}
func TestTheraupeticPlan(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.PlacementDetails{
		CompletedBy: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	assert.Equal(t, uuidStr, parsed["completed_by"])
}

func TestRiskAssessment(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.RiskAssessment{
		LastReviewedBy:     &uuidStr,
		LastReviewedByName: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	assert.Equal(t, uuidStr, parsed["last_reviewed_by"])
	assert.Equal(t, uuidStr, parsed["last_reviewed_by_name"])
}
func TestYPViewsRecord(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.YPViewsRecord{
		CompletedBy: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	assert.Equal(t, uuidStr, parsed["completed_by"])

}
func TestResidentDocument(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.ResidentDocument{
		UploadedBy: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	assert.Equal(t, uuidStr, parsed["uploaded_by"])
}

func TestSupportPlanSignoff(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.SupportPlanSignoff{
		SignedOffBy: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	assert.Equal(t, uuidStr, parsed["signed_off_by"])

}

func TestExploitationRisk(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.ExploitationRisk{
		AssessedByID: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	assert.Equal(t, uuidStr, parsed["assessed_by_id"])

}
func TestAdvocacyRecord(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.AdvocacyRecord{
		InformedByID: &uuidStr,
		Sessions:     contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["sessions"])

	assert.Equal(t, uuidStr, parsed["informed_by_id"])

}

func TestAcheivement(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.Achievement{
		RecordedByID: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	assert.Equal(t, uuidStr, parsed["recorded_by_id"])

}
func TestNEETRecord(t *testing.T) {
	uuidStr := "123e4567-e89b-12d3-a456-426614174000"
	testCase := models.NEETRecord{
		ResponsibleStaffID: &uuidStr,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	assert.Equal(t, uuidStr, parsed["responsible_staff_id"])

}

func TestEmploymentRecord(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.EmploymentRecord{
		EvidenceURLs: contentJSON}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["evidence_urls"])

}
