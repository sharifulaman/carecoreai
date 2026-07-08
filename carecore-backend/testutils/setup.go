package testutils

import (
	"os"
	"path/filepath"
	"runtime"

	"carecore-backend/config"
	"carecore-backend/db"
)

// LoadTestEnv walks up the directory tree to find the .env file
// no matter which package is running the test
func LoadTestEnv() {
	// Get the file path of THIS file at runtime
	_, filename, _, _ := runtime.Caller(0)

	// Walk up to project root (where .env lives)
	root := filepath.Join(filepath.Dir(filename), "..")

	envPath := filepath.Join(root, ".env")

	// Set it so godotenv can find it
	os.Chdir(root)

	_ = envPath
	config.Load()
}

// SetupTestDB loads config and connects + migrates the DB
func SetupTestDB() {
	LoadTestEnv()
	db.Connect()
	db.Migrate()
	db.SeedOrganisation()
}