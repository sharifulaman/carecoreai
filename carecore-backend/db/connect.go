// db/connect.go
package db

import (
	"fmt"
	"log"
	"os"

	"carecore-backend/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens the runtime connection using the least-privilege carecore_app role.
// This connection is what all handlers use via db.DB — RLS policies apply to it.
func Connect() {
	cfg := config.AppConfig

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	log.Printf("Connecting with DSN: host=%s port=%s user=%s dbname=%s sslmode=%s",
       cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBName, cfg.DBSSLMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connected successfully")
	DB = db
}

// adminConnect opens a one-off superuser connection for DDL migrations.
// Returns nil if DB_ADMIN_USER is not set — migrations are then skipped.
func adminConnect() *gorm.DB {
	cfg := config.AppConfig
	if cfg.DBAdminUser == "" {
		return nil
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		cfg.DBHost, cfg.DBPort, cfg.DBAdminUser, cfg.DBAdminPassword, cfg.DBName, cfg.DBSSLMode,
	)

	adminDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Printf("Warning: could not connect as admin for migrations: %v", err)
		return nil
	}
	return adminDB
}

// RunRLSMigration applies the RLS policies file using the admin connection.
// Safe to call on every startup — policies use CREATE POLICY IF NOT EXISTS logic
// via the SQL file, so re-running is idempotent.
func RunRLSMigration() {
	adminDB := adminConnect()
	if adminDB == nil {
		log.Println("Skipping RLS migration — DB_ADMIN_USER not set")
		return
	}

	content, err := os.ReadFile("migrations/0001_enable_rls.sql")
	if err != nil {
		log.Printf("Skipping RLS migration — file not found: %v", err)
		return
	}

	if err := adminDB.Exec(string(content)).Error; err != nil {
		log.Printf("RLS migration error (may already be applied): %v", err)
	} else {
		log.Println("RLS migration applied successfully")
	}
}