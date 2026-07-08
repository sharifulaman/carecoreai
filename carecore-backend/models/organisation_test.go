package models_test

import (
	"carecore-backend/models"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestOrganisation(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)

	testCase := models.Organisation{
		Settings: contentJSON,
		HRPolicy: contentJSON,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["settings"])
	assert.Equal(t, unmarshaledContent, parsed["hr_policy"])
}
