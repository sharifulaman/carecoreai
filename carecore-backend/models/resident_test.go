package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResident(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.Resident{
		FamilyContacts:    contentJSON,
		Allergies:         contentJSON,
		MedicalConditions: contentJSON,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["family_contacts"])
	assert.Equal(t, unmarshaledContent, parsed["allergies"])
	assert.Equal(t, unmarshaledContent, parsed["medical_conditions"])
}

func TestResidentAllowance(t *testing.T) {
	testCase := models.ResidentAllowance{
		ResidentID:    "1",
		WeeklyAmount:  4.5,
		PaymentDay:    "Test",
		PaymentMethod: "Test",
		Status:        "Test",
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestResidentSavings(t *testing.T) {
	testCase := models.ResidentSavings{
		ResidentID:        "1",
		Balance:           4.5,
		TargetAmount:      40.0,
		TargetDescription: "Test",
		Status:            "Test",
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}
func TestResidentSavingsTransaction(t *testing.T) {
	testCase := models.ResidentSavingsTransaction{
		ResidentID:      "1",
		SavingsID:       "1",
		TransactionType: "Test",
		Amount:          4.5,
		Description:     "Test",
		RecordedBy:      "Test",
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}
