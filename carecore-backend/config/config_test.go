package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

// helperToClearEnv removes keys from the environment temporarily and returns a restoration function
func helperToClearEnv(keys ...string) func() {
	saved := make(map[string]string)
	for _, key := range keys {
		saved[key] = os.Getenv(key)
		os.Unsetenv(key)
	}
	return func() {
		for key, val := range saved {
			if val != "" {
				os.Setenv(key, val)
			} else {
				os.Unsetenv(key)
			}
		}
	}
}

func TestLoad(t *testing.T) {
	// A list of all config keys handled by our setup
	envKeys := []string{
		"DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME",
		"JWT_SECRET", "JWT_EXPIRY_HOURS", "REFRESH_TOKEN_EXPIRY_DAYS",
		"APP_PORT", "ORG_ID", "ALLOWED_ORIGINS",
	}

	t.Run("Falls back to default parameters when environment is empty", func(t *testing.T) {
		// Clean environment variables to ensure fallback behavior executes cleanly
		restoreEnv := helperToClearEnv(envKeys...)
		defer restoreEnv()

		// Act
		Load()

		// Assertions matching fallback constants in config.go
		assert.NotNil(t, AppConfig)
		assert.Equal(t, "localhost", AppConfig.DBHost)
		assert.Equal(t, "5432", AppConfig.DBPort)
		assert.Equal(t, "postgres", AppConfig.DBUser)
		assert.Equal(t, "", AppConfig.DBPassword)
		assert.Equal(t, "carecore", AppConfig.DBName)
		assert.Equal(t, "secret", AppConfig.JWTSecret)
		assert.Equal(t, 8, AppConfig.JWTExpiryHours)
		assert.Equal(t, 30, AppConfig.RefreshTokenExpiryDays)
		assert.Equal(t, "8080", AppConfig.AppPort)
		assert.Equal(t, "default_org", AppConfig.OrgID)
		assert.Equal(t, "http://localhost:5173", AppConfig.AllowedOrigins)
	})

	t.Run("Overwrites defaults smoothly when explicit environment variables exist", func(t *testing.T) {
		restoreEnv := helperToClearEnv(envKeys...)
		defer restoreEnv()

		// Setup explicit mock parameters
		os.Setenv("DB_HOST", "production-rds.cluster.internal")
		os.Setenv("DB_PORT", "6432")
		os.Setenv("DB_USER", "admin_user")
		os.Setenv("DB_PASSWORD", "superPassword789")
		os.Setenv("DB_NAME", "carecore_production")
		os.Setenv("JWT_SECRET", "secure_long_random_hash_string")
		os.Setenv("JWT_EXPIRY_HOURS", "24")
		os.Setenv("REFRESH_TOKEN_EXPIRY_DAYS", "90")
		os.Setenv("APP_PORT", "3000")
		os.Setenv("ORG_ID", "org_care_core_v2")
		os.Setenv("ALLOWED_ORIGINS", "https://app.carecore.ai")

		// Act
		Load()

		// Assertions matching custom variables
		assert.Equal(t, "production-rds.cluster.internal", AppConfig.DBHost)
		assert.Equal(t, "6432", AppConfig.DBPort)
		assert.Equal(t, "admin_user", AppConfig.DBUser)
		assert.Equal(t, "superPassword789", AppConfig.DBPassword)
		assert.Equal(t, "carecore_production", AppConfig.DBName)
		assert.Equal(t, "secure_long_random_hash_string", AppConfig.JWTSecret)
		assert.Equal(t, 24, AppConfig.JWTExpiryHours)
		assert.Equal(t, 90, AppConfig.RefreshTokenExpiryDays)
		assert.Equal(t, "3000", AppConfig.AppPort)
		assert.Equal(t, "org_care_core_v2", AppConfig.OrgID)
		assert.Equal(t, "https://app.carecore.ai", AppConfig.AllowedOrigins)
	})
}

func TestGetEnv(t *testing.T) {
	t.Run("Returns existing value from environment", func(t *testing.T) {
		os.Setenv("TEST_KEY_DUMMY", "hello-world")
		defer os.Unsetenv("TEST_KEY_DUMMY")

		val := getEnv("TEST_KEY_DUMMY", "fallback-value")
		assert.Equal(t, "hello-world", val)
	})

	t.Run("Returns fallback value when environment key doesn't exist", func(t *testing.T) {
		os.Unsetenv("TEST_KEY_NONEXISTENT")

		val := getEnv("TEST_KEY_NONEXISTENT", "fallback-value")
		assert.Equal(t, "fallback-value", val)
	})
}