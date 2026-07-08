package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInitAWS(t *testing.T) {
	// Track original environment values and global variable state to restore later
	oldRegion := os.Getenv("AWS_REGION")
	oldAccessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	oldSecretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	oldClient := S3Client

	defer func() {
		os.Setenv("AWS_REGION", oldRegion)
		os.Setenv("AWS_ACCESS_KEY_ID", oldAccessKey)
		os.Setenv("AWS_SECRET_ACCESS_KEY", oldSecretKey)
		S3Client = oldClient
	}()

	t.Run("Early return when AWS_REGION is empty", func(t *testing.T) {
		// Arrange: Enforce a completely empty environment state
		os.Unsetenv("AWS_REGION")
		S3Client = nil

		// Act
		InitAWS()

		// Assert: The execution should gracefully exit early without instantiating a client
		assert.Nil(t, S3Client, "S3Client must remain nil if AWS_REGION is missing")
	})

	t.Run("Successfully builds S3Client when region and credentials exist", func(t *testing.T) {
		// Arrange: Populate mock credentials and target AWS execution parameters
		os.Setenv("AWS_REGION", "eu-west-2")
		os.Setenv("AWS_ACCESS_KEY_ID", "AKIAIOSFODNN7EXAMPLE")
		os.Setenv("AWS_SECRET_ACCESS_KEY", "wJalrXUptFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")
		S3Client = nil

		// Act
		InitAWS()

		// Assert: Ensure the client instantiation successfully registered to the global pointer
		assert.NotNil(t, S3Client, "S3Client should be initialized when mandatory configurations are supplied")
	})

	t.Run("Successfully builds S3Client using machine role defaults if explicit keys are absent", func(t *testing.T) {
		// Arrange: Set a region but omit explicit key pairs (common for AWS IAM Instance Profiles/ECS Tasks)
		os.Setenv("AWS_REGION", "us-east-1")
		os.Unsetenv("AWS_ACCESS_KEY_ID")
		os.Unsetenv("AWS_SECRET_ACCESS_KEY")
		S3Client = nil

		// Act
		InitAWS()

		// Assert: The underlying SDK configuration pipeline should still initialize the client object structure
		assert.NotNil(t, S3Client, "S3Client should still build using fallback implicit environment configurations")
	})
}
