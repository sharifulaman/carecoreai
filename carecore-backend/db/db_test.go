package db

import (
	"carecore-backend/config" // Make sure to import your config package
	"carecore-backend/models"
	"log"
	"os"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func SetupTestDBNew() *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to the testing database: %v", err)
	}
	err = db.AutoMigrate(

		&models.Organisation{},
	)
	if err != nil {
		log.Fatalf("Failed to migratetesting database: %v", err)
	}
	return db
}

func TestSeedOrganisation(t *testing.T) {
	oldDB := DB
	DB = SetupTestDBNew()
	defer func() { DB = oldDB }()

	// ⚠️ FIX: Mock the AppConfig so it isn't empty during the test execution
	// Make sure to import your config package

	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		OrgID: "test_default_org", // Provide a mock string here
	}
	defer func() { config.AppConfig = oldConfig }() // Restore it when done

	// Now it is safe to run the seed function
	SeedOrganisation()

	var result models.Organisation
	err := DB.First(&result).Error
	assert.NoError(t, err, "An organisation should exist in the database")
}

func TestConnect_Success(t *testing.T) {
	// If you have an accessible local/CI test postgres instance running:
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		DBHost:     "localhost",
		DBPort:     "5432",
		DBUser:     "postgres",
		DBPassword: "password",
		DBName:     "carecore_test",
	}
	defer func() { config.AppConfig = oldConfig }()

	// If a real DB is unavailable in this test environment, skip this case
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping Happy Path; set RUN_INTEGRATION_TESTS=true with a real DB to run.")
	}

	// Act
	Connect()

	// Assert
	assert.NotNil(t, DB, "Global DB instance should be populated")

	// Clean up connection pool after test
	sqlDB, _ := DB.DB()
	sqlDB.Close()
}
