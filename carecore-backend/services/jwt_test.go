package services_test

import (
	"testing"
	"time"
    "carecore-backend/testutils"

	"carecore-backend/config"
	"carecore-backend/services"

	"github.com/stretchr/testify/assert"
)

func init() {
	testutils.LoadTestEnv()
	config.AppConfig = &config.Config{
		JWTSecret:      "test-secret-key",
		JWTExpiryHours: 8,
	}
}

func TestGenerateAndValidateToken(t *testing.T) {
	token, err := services.GenerateAccessToken(
		"user-123",
		"test@carecore.com",
		"default_org",
		"admin",
		[]string{"home-1", "home-2"},
	)
	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := services.ValidateToken(token)
	assert.NoError(t, err)
	assert.Equal(t, "user-123", claims.UserID)
	assert.Equal(t, "test@carecore.com", claims.Email)
	assert.Equal(t, "default_org", claims.OrgID)
	assert.Equal(t, "admin", claims.Role)
	assert.Equal(t, []string{"home-1", "home-2"}, claims.HomeIDs)
}

func TestValidateToken_InvalidToken(t *testing.T) {
	_, err := services.ValidateToken("this.is.not.valid")
	assert.Error(t, err)
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	// Temporarily set expiry to past
	original := config.AppConfig.JWTExpiryHours
	config.AppConfig.JWTExpiryHours = 0
	defer func() { config.AppConfig.JWTExpiryHours = original }()

	token, _ := services.GenerateAccessToken("u1", "e@e.com", "org", "admin", []string{})
	time.Sleep(1 * time.Second)

	_, err := services.ValidateToken(token)
	assert.Error(t, err)
}

func TestValidateToken_WrongSecret(t *testing.T) {
	token, _ := services.GenerateAccessToken("u1", "e@e.com", "org", "admin", []string{})

	// Swap secret
	config.AppConfig.JWTSecret = "wrong-secret"
	defer func() { config.AppConfig.JWTSecret = "test-secret-key" }()

	_, err := services.ValidateToken(token)
	assert.Error(t, err)
}

func TestTokenContainsCorrectRoles(t *testing.T) {
	for _, role := range []string{"admin", "team_leader", "support_worker"} {
		token, _ := services.GenerateAccessToken("u1", "e@e.com", "org", role, []string{})
		claims, err := services.ValidateToken(token)
		assert.NoError(t, err)
		assert.Equal(t, role, claims.Role)
	}
}