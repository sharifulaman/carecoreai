package models_test

import (
	"carecore-backend/models"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestAuthUser_JSONBinding(t *testing.T) {

	loginAt := time.Now().UTC()
	testCase := models.AuthUser{
		Email:        "admin@test.com",
		PasswordHash: "123456",
		IsActive:     true,
		LastLoginAt:  &loginAt,
	}

	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)

	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	assert.NoError(t, err)

	// Assert your exact expectations
	assert.Equal(t, "admin@test.com", parsed["email"])
	assert.Equal(t, true, parsed["is_active"])
	assert.NotEmpty(t, parsed["last_login_at"])

	assert.Nil(t, parsed["password_hash"])
	assert.Nil(t, parsed["-"])
}

func TestRefreshToken(t *testing.T) {
	testCase := models.RefreshToken{
		UserID:    "1",
		Token:     "1234",
		ExpiresAt: time.Now(),
		Used:      true,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	assert.NoError(t, err)
	assert.Equal(t, "1", parsed["user_id"])
	assert.Equal(t, "1234", parsed["token"])
}
