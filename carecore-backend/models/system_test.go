package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNotification(t *testing.T) {
	testCase := models.Notification{
		UserID:           "1",
		RecipientUserID:  "1",
		RecipientStaffID: "1",
		RecipientRole:    "Admin",
		Title:            "Admin User",
		Type:             "Admin",
		Message:          "Test",
		Body:             "Test",
		Priority:         "High",
		LinkURL:          "test.com",
		Link:             "test",
		RelatedModule:    "Test",
		RelatedRecordID:  "Test",
		Read:             true,
		IsRead:           true,
		Acknowledged:     true,
	}

	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation Error: %v", result)
	}
}

func TestNotification_NormalizeAliases(t *testing.T) {
	tests := []struct {
		name     string
		input    models.Notification
		expected models.Notification
	}{
		{
			name: "Fallback UserID and RecipientUserID",
			input: models.Notification{
				UserID: "user-123",
			},
			expected: models.Notification{
				UserID:          "user-123",
				RecipientUserID: "user-123",
				Type:            "general",
			},
		},
		{
			name: "Fallback RecipientUserID to UserID",
			input: models.Notification{
				RecipientUserID: "user-456",
			},
			expected: models.Notification{
				UserID:          "user-456",
				RecipientUserID: "user-456",
				Type:            "general",
			},
		},
		{
			name: "Fallback Message and Body",
			input: models.Notification{
				Message: "Hello World",
			},
			expected: models.Notification{
				Message: "Hello World",
				Body:    "Hello World",
				Type:    "general",
			},
		},
		{
			name: "Fallback Title and RelatedModule",
			input: models.Notification{
				Title: "New Alert",
			},
			expected: models.Notification{
				Title:         "New Alert",
				RelatedModule: "New Alert",
				Type:          "general",
			},
		},
		{
			name: "Fallback Link and LinkURL",
			input: models.Notification{
				Link: "/home",
			},
			expected: models.Notification{
				Link:    "/home",
				LinkURL: "/home",
				Type:    "general",
			},
		},
		{
			name: "Boolean sync logic (IsRead evaluation)",
			input: models.Notification{
				IsRead: true,
			},
			expected: models.Notification{
				Read:   true,
				IsRead: true,
				Type:   "general",
			},
		},
		{
			name: "Keep explicitly configured notification type",
			input: models.Notification{
				Type: "alert",
			},
			expected: models.Notification{
				Type: "alert",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Access and execute unexported package method via pointer instantiation
			// Note: As this test sits in package models_test, ensure normalizeAliases
			// is exported or the test runs properly if models has access.
			// Since normalizeAliases is unexported, we can test it directly if it's
			// internal or test via BeforeCreate/BeforeUpdate which expose it.
			// However, since it is unexported and we are in `models_test`, we test its effects via a helper or direct execution if visible.
			// Since it's lower-case 'normalizeAliases', we will test it implicitly using BeforeCreate to preserve package boundaries safely.
			n := tt.input
			err := n.BeforeCreate(nil)
			assert.NoError(t, err)

			assert.Equal(t, tt.expected.UserID, n.UserID)
			assert.Equal(t, tt.expected.RecipientUserID, n.RecipientUserID)
			assert.Equal(t, tt.expected.Message, n.Message)
			assert.Equal(t, tt.expected.Body, n.Body)
			assert.Equal(t, tt.expected.Title, n.Title)
			assert.Equal(t, tt.expected.RelatedModule, n.RelatedModule)
			assert.Equal(t, tt.expected.Link, n.Link)
			assert.Equal(t, tt.expected.LinkURL, n.LinkURL)
			assert.Equal(t, tt.expected.Read, n.Read)
			assert.Equal(t, tt.expected.IsRead, n.IsRead)
			assert.Equal(t, tt.expected.Type, n.Type)
		})
	}
}

func TestNotification_BeforeCreate(t *testing.T) {
	n := models.Notification{
		Message: "Create Hook Check",
	}

	// BeforeCreate handles internal setups. Passing nil DB transaction is safe here.
	err := n.BeforeCreate(nil)
	assert.NoError(t, err)

	// Ensure structural fields normalized correctly inside hook logic
	assert.Equal(t, "Create Hook Check", n.Body)
	assert.Equal(t, "general", n.Type)
}

func TestNotification_BeforeUpdate(t *testing.T) {
	n := models.Notification{
		LinkURL: "https://carecore.ai",
	}

	err := n.BeforeUpdate(nil)
	assert.NoError(t, err)

	// Ensure structural fields normalized correctly inside hook logic
	assert.Equal(t, "https://carecore.ai", n.Link)
	assert.Equal(t, "general", n.Type)
}

func TestAuditTrail(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": float64(2),
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)
	testCase := models.AuditTrail{
		BeforeData: contentJSON,
		AfterData:  contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	assert.NoError(t, err)

	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)

	// Need to check inner field properties directly since map raw structures map differently
	assert.NotEmpty(t, parsed["before_data"])
	assert.NotEmpty(t, parsed["after_data"])
}

func TestKPIOption(t *testing.T) {
	testCase := models.KPIOption{
		Category: "test",
		Label:    "test",
		Value:    "test",
		Active:   true,
		Order:    100,
	}
	result := utils.ValidateJSONMarshaling(t, testCase)
	if result != nil {
		t.Errorf("Validation error: %v", result)
	}
}
