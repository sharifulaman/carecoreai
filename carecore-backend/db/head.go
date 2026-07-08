package db

import (
	"fmt"
	"log"
	"time"

	"carecore-backend/config"
	"carecore-backend/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// HeadDB is a separate connection pool authenticated as carecore_head.
// It must NEVER be used for tenant data — the DB grants make that
// structurally impossible, but keep it that way in the app layer too:
// only the functions in this file should touch HeadDB.
var HeadDB *gorm.DB

func ConnectHead() {
	cfg := config.AppConfig
	if cfg.DBHeadUser == "" {
		log.Println("DB_HEAD_USER not set — platform admin features disabled")
		return
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		cfg.DBHost, cfg.DBPort, cfg.DBHeadUser, cfg.DBHeadPassword, cfg.DBName, cfg.DBSSLMode,
	)

	headDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("Failed to connect as carecore_head: %v", err)
	}
	HeadDB = headDB
	log.Println("Platform head connection established")
}

// ===========================================================
// Platform owner (carecore_head login identity)
// ===========================================================

// SeedPlatformAdmin creates the single owner login, idempotently.
// Returns the generated temporary password on first creation only —
// change it immediately after first login. Safe to call on every
// startup; does nothing if the admin already exists.
func SeedPlatformAdmin(email string) (tempPassword string, created bool, err error) {
	if HeadDB == nil {
		return "", false, fmt.Errorf("HeadDB not connected — call ConnectHead() first")
	}

	var count int64
	HeadDB.Model(&models.PlatformAdmin{}).Where("email = ?", email).Count(&count)
	if count > 0 {
		return "", false, nil
	}

	tempPassword = uuid.New().String()[:12]
	hash, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		return "", false, err
	}

	admin := models.PlatformAdmin{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(hash),
		FullName:     "Platform Owner",
		CreatedDate:  time.Now().UTC(),
	}
	if err := HeadDB.Create(&admin).Error; err != nil {
		return "", false, err
	}
	return tempPassword, true, nil
}

// AuthenticatePlatformAdmin verifies owner credentials for the
// platform-level login. Entirely separate from tenant JWT/auth_users —
// this is not an org member, it's the account that provisions orgs.
func AuthenticatePlatformAdmin(email, password string) (*models.PlatformAdmin, error) {
	if HeadDB == nil {
		return nil, fmt.Errorf("HeadDB not connected")
	}

	var admin models.PlatformAdmin
	if err := HeadDB.Where("email = ?", email).First(&admin).Error; err != nil {
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	HeadDB.Model(&admin).Update("last_login_at", now)
	return &admin, nil
}

// ===========================================================
// Organisation provisioning
// ===========================================================
// CreateOrganisation provisions a brand new tenant organisation, its
// first login-capable user (role "rsm"), and that org's role catalogue
// + default workflow routing steps — all inside one tenant-scoped
// connection, so a new org is fully usable the moment this returns.
func CreateOrganisation(name, orgID, createdBy string) (org *models.Organisation, tempPassword string, err error) {
	if HeadDB == nil {
		return nil, "", fmt.Errorf("HeadDB not connected — call ConnectHead() first")
	}

	newOrg := models.Organisation{
		Base: models.Base{
			ID:        uuid.New(),
			OrgID:     orgID,
			CreatedBy: createdBy,
		},
		Name:               name,
		AppName:            "CareCore AI",
		OrganisationStatus: "active",
	}
	if err := HeadDB.Create(&newOrg).Error; err != nil {
		return nil, "", fmt.Errorf("failed to create organisation: %w", err)
	}

	tempPassword = uuid.New().String()[:12]
	hash, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		return &newOrg, "", fmt.Errorf("organisation created but failed to hash password: %w", err)
	}

	// Placeholder address — replace with a real invite-by-email flow.
	adminEmail := "admin@" + orgID + ".carecoreai.local"

	err = DB.Connection(func(tx *gorm.DB) error {
		if err := tx.Exec("SET app.current_org = ?", orgID).Error; err != nil {
			return err
		}

		authUser := models.AuthUser{
			Base:         models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
			Email:        adminEmail,
			PasswordHash: string(hash),
			IsActive:     true,
		}
		if err := tx.Create(&authUser).Error; err != nil {
			return fmt.Errorf("failed to create first auth user: %w", err)
		}

		staff := models.StaffProfile{
			Base:     models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
			UserID:   authUser.ID.String(),
			FullName: name + " Administrator",
			Email:    adminEmail,
			Role:     "rsm",
			Status:   "active",
		}
		if err := tx.Create(&staff).Error; err != nil {
			return fmt.Errorf("failed to create first staff profile: %w", err)
		}

		// Roles and workflow steps now seed for THIS org, on the same
		// tenant-scoped connection — this is the piece that was
		// previously a TODO.
		SeedSystemRoleDefinitions(tx, orgID)
		SeedWorkflowRoutingSteps(tx, orgID)
		SeedMakerCheckerMatrix(tx, orgID)

		return nil
	})

	if err != nil {
		return &newOrg, "", fmt.Errorf("organisation %q created, but provisioning failed: %w", orgID, err)
	}

	log.Printf("Organisation %q (%s) created. First login: %s / %s", name, orgID, adminEmail, tempPassword)
	return &newOrg, tempPassword, nil
}

// ListOrganisations returns every org on the platform — head can see
// all rows (via head_full_visibility policy) but only the columns
// selected below, nothing tenant-specific.
func ListOrganisations() ([]models.Organisation, error) {
	var orgs []models.Organisation
	err := HeadDB.
		Select("id", "org_id", "name", "organisation_status", "created_date", "is_deleted").
		Find(&orgs).Error
	return orgs, err
}

// SetOrganisationStatus activates or deactivates an org.
// This works even though carecore_head can't SELECT/UPDATE any other
// column — the DB grant only permits touching these three columns.
func SetOrganisationStatus(orgID string, active bool) error {
	status := "active"
	if !active {
		status = "deactivated"
	}
	return HeadDB.Model(&models.Organisation{}).
		Where("org_id = ?", orgID).
		Update("organisation_status", status).Error
}