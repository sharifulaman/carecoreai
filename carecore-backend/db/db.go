package db

import (
	"fmt"
	"log"

	"carecore-backend/config"
	"carecore-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	cfg := config.AppConfig

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=UTC",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connected successfully")
	DB = db
}

func Migrate() {
	err := DB.AutoMigrate(
		&models.Organisation{},
		&models.AuthUser{},
		&models.StaffProfile{},
		&models.Home{},
		&models.Resident{},
		&models.DailyLog{},
		&models.VisitReport{},
		&models.KPIRecord{},
		&models.SWPerformanceKPI{},
		&models.ShiftTemplate{},
		&models.Rota{},
		&models.Shift{},
		&models.ShiftHandover{},
		&models.Bill{},
		&models.HomeDocument{},
		&models.HomeTask{},
		&models.HomeLog{},
		&models.HomeAsset{},
		&models.HomeCheck{},
		&models.HomeBudget{},
		&models.HomeBudgetLine{},
		&models.HomeExpense{},
		&models.PlacementFee{},
		&models.PlacementInvoice{},
		&models.PettyCash{},
		&models.PettyCashTransaction{},
		&models.SupportPlan{},
		&models.ILSPlan{},
		&models.ILSPlanSection{},
		&models.CICReport{},
		&models.AccidentReport{},
		&models.SafeguardingRecord{},
		&models.MedicationRecord{},
		&models.MAREntry{},
		&models.GPAppointment{},
		&models.ResidentAllowance{},
		&models.ResidentSavings{},
		&models.ResidentSavingsTransaction{},
		&models.Notification{},
		&models.AuditTrail{},
		&models.KPIOption{},
		&models.StaffAvailabilityProfile{},
		&models.StaffAvailabilityOverride{},
		&models.RefreshToken{},
	)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Database migration completed")
}