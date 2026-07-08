package db

import (
	"carecore-backend/models"
	"fmt"
	"os"
	"path/filepath"

	// "carecore-backend/testutils"
	// "carecore-backend/testutils"

	// "carecore-backend/testutils"
	"log"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func SetupTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to the testing database: %v", err)
	}
	err = db.AutoMigrate(
		&models.AuthUser{},
		&models.StaffProfile{},
		&models.StaffAvailabilityProfile{},
		&models.MedicationRecord{},
		&models.PathwayPlan{},
		&models.RiskAssessment{},
		&models.Achievement{},
		&models.FamilyContact{},
		&models.Appointment{},
		&models.AccidentReport{},
		&models.SupportPlan{},
		&models.HomeDocument{},
		&models.Notification{},
		&models.PlacementFee{},
		&models.PettyCashTransaction{},
		&models.Bill{},
		&models.ShiftTemplate{},
		&models.DailyLog{},
	)
	if err != nil {
		log.Fatalf("Failed to migratetesting database: %v", err)
	}
	return db
}

func TestMain(m *testing.M) {
	// 1. Automatically locate the .env file by climbing up directories
	err := loadEnvFromRoot()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// 2. Fetch variables using os.Getenv and build the DSN string dynamically
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	user := "postgres"

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		host, user, password, dbname, port,
	)

	// 3. Initialize the connection
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to the real database: %v", err)
	}

	if DB == nil {
		log.Fatalf("Database connection 'DB' is nil.")
	}

	// 4. Run the test suite
	code := m.Run()

	// 5. Exit
	os.Exit(code)
}

// Helper function to find the .env file from any subfolder depth
func loadEnvFromRoot() error {
	dir, err := os.Getwd()
	if err != nil {
		return err
	}

	for {
		envPath := filepath.Join(dir, ".env")
		if _, err := os.Stat(envPath); err == nil {
			// Found it! Load it up.
			return godotenv.Load(envPath)
		}

		// Move up one directory level
		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached the system root directory without finding .env
			return fmt.Errorf(".env file not found in project tree")
		}
		dir = parent
	}
}

func TestSeedAuthUser(t *testing.T) {
	// 1. Setup the global DB instance for the test environment
	oldDB := DB // Save original DB if needed
	DB = SetupTestDB()
	defer func() { DB = oldDB }() // Restore after test finishes

	// Test Data
	email := "testuser@example.com"
	password := "securepassword123"
	orgID := uuid.New().String()

	t.Run("Successfully create a new user", func(t *testing.T) {
		// Act
		createdUser := seedAuthUser(email, password, orgID)

		// Assertions
		assert.NotEmpty(t, createdUser.ID)
		assert.Equal(t, email, createdUser.Email)
		assert.Equal(t, orgID, createdUser.OrgID)
		assert.Equal(t, "system", createdUser.CreatedBy)
		assert.True(t, createdUser.IsActive)

		// Verify password hash is valid
		err := bcrypt.CompareHashAndPassword([]byte(createdUser.PasswordHash), []byte(password))
		assert.NoError(t, err, "Password hash should match the plain text password")

		// Verify it actually exists in the database
		var dbUser models.AuthUser
		err = DB.Where("email = ?", email).First(&dbUser).Error
		assert.NoError(t, err)
		assert.Equal(t, createdUser.ID, dbUser.ID)
	})

	t.Run("Return existing user if email already exists", func(t *testing.T) {
		// Act: Call it a second time with the same email but different password/org
		existingUser := seedAuthUser(email, "different_password", "different_org")

		// Assertions: It should return the original user details, not the new ones
		assert.Equal(t, email, existingUser.Email)
		assert.NotEqual(t, "different_org", existingUser.OrgID, "Should return old org ID")

		// Verify database count didn't increase
		var count int64
		DB.Model(&models.AuthUser{}).Where("email = ?", email).Count(&count)
		assert.Equal(t, int64(1), count, "There should still be only 1 user in the DB")
	})
}

func TestSeedStaffProfile(t *testing.T) {
	// oldDB := DB
	// DB = SetupTestDB()
	// defer func() { DB = oldDB }()
	inputProfile := models.StaffProfile{
		UserID:   "1",
		FullName: "Nafis Tahmid",
		Email:    "tahmid@test.com",
	}
	result := seedStaffProfile(inputProfile)
	assert.Equal(t, inputProfile.Email, result.Email)
	assert.Equal(t, inputProfile.UserID, result.UserID)
	assert.Equal(t, inputProfile.FullName, result.FullName)
}

func TestSeedHome(t *testing.T) {
	// oldDB := DB
	// DB = SetupTestDB()
	// defer func() { DB = oldDB }()

	tests :=
		[]struct {
			name         string
			inputProfile models.Home
		}{
			{
				name: "Standard Appointment",
				inputProfile: models.Home{
					Name:      "Pulok & Co.",
					Type:      "Apartment",
					CareModel: "Villa",
				},
			},
			{
				name: "Standard Appointment",
				inputProfile: models.Home{
					Name:      "Rinky & Co.",
					Type:      "Apartment",
					CareModel: "Villa",
				},
			},
			{
				name: "Standard Appointment",
				inputProfile: models.Home{
					Name:      "Shanto & Co. DB",
					Type:      "Apartment",
					CareModel: "Villa DB",
				},
			},
		}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := seedHome(tc.inputProfile)

			// 3. Assertions
			assert.Equal(t, tc.inputProfile.Name, result.Name)
			assert.Equal(t, tc.inputProfile.Type, result.Type)
			assert.Equal(t, tc.inputProfile.CareModel, result.CareModel)
		})
	}
}

//	func TestSeedResident(t *testing.T) {
//		oldDB := DB
//		DB = SetupTestDB()
//		defer func() { DB = oldDB }()
//		inputProfile := models.Resident{
//			HomeID:      "Shahbuddin & Co.",
//			KeyWorkerID: "Apartment",
//			DisplayName: "Villa",
//		}
//		result := seedResident(inputProfile)
//		assert.Equal(t, inputProfile.HomeID, result.HomeID)
//		assert.Equal(t, inputProfile.KeyWorkerID, result.KeyWorkerID)
//		assert.Equal(t, inputProfile.DisplayName, result.DisplayName)
//	}
func TestSeedResident(t *testing.T) {
	// oldDB := DB
	// DB = SetupTestDB()
	// defer func() { DB = oldDB }()
	tests := []struct {
		name         string
		inputProfile models.Resident
	}{
		{
			name: "Test 1",
			inputProfile: models.Resident{
				HomeID:      "Shahbuddin & Co.",
				KeyWorkerID: "Apartment",
				DisplayName: "Villa",
			},
		},
		{
			name: "Test 2",
			inputProfile: models.Resident{
				HomeID:      "Shahbuddin & Co.",
				KeyWorkerID: "Apartment",
				DisplayName: "Villa",
			},
		},
		{
			name: "Test 3",
			inputProfile: models.Resident{
				HomeID:      "Shahbuddin & Co.",
				KeyWorkerID: "Apartment",
				DisplayName: "Villa",
			},
		},
	}
	for _, test := range tests {
		result := seedResident(test.inputProfile)
		assert.Equal(t, test.inputProfile.HomeID, result.HomeID)
		assert.Equal(t, test.inputProfile.KeyWorkerID, result.KeyWorkerID)
		assert.Equal(t, test.inputProfile.DisplayName, result.DisplayName)
	}
}

func TestSeedVisitReport(t *testing.T) {
	// oldDB := DB
	// DB = SetupTestDB()
	// defer func() { DB = oldDB }()
	inputProfile := models.VisitReport{
		HomeID: "Shahbuddin & Co.",
	}
	result := seedVisitReport(inputProfile)
	assert.Equal(t, inputProfile.HomeID, result.HomeID)
}

// func TestSeedPettyCash(t *testing.T) {
// 	oldDB := DB
// 	DB = SetupTestDB()
// 	defer func() { DB = oldDB }()
// 	orgID := "1"
// 	homeID := "1"
// 	homeName := "Shahbuddin & Co."
// 	balance := 4.5
// 	threshold := 44.5

// 	result := seedPettyCash(
// 		orgID,
// 		homeID,
// 		homeName,
// 		balance,
// 		threshold,
// 	)
// 	assert.Equal(t, orgID, result.OrgID)
// 	assert.Equal(t, homeID, result.HomeID)
// }

func TestSeedPettyCash(t *testing.T) {
	// oldDB := DB
	// DB = SetupTestDB()
	// defer func() { DB = oldDB }()
	// gin.SetMode(gin.TestMode)

	tests := []struct {
		name      string
		orgID     string
		homeID    string
		homeName  string
		balance   float64
		threshold float64
	}{
		{
			name:      "Test 1",
			orgID:     "1",
			homeID:    "1",
			homeName:  "Test",
			balance:   44.5,
			threshold: 44.5,
		},
		{
			name:      "Test 1",
			orgID:     "1",
			homeID:    "1",
			homeName:  "Test",
			balance:   44.5,
			threshold: 44.5,
		},
		{
			name:      "Test 1",
			orgID:     "1",
			homeID:    "1",
			homeName:  "Test",
			balance:   44.5,
			threshold: 44.5,
		},
		{
			name:      "Test 1",
			orgID:     "1",
			homeID:    "1",
			homeName:  "Test",
			balance:   44.5,
			threshold: 44.5,
		},
	}
	for _, test := range tests {
		result := seedPettyCash(
			test.orgID,
			test.homeID,
			test.homeName,
			test.balance,
			test.threshold,
		)
		assert.Equal(t, test.orgID, result.OrgID)
		assert.Equal(t, test.homeID, result.HomeID)
		assert.Equal(t, test.homeName, result.HomeName)
		assert.Equal(t, test.balance, result.CurrentBalance)
		assert.Equal(t, test.threshold, result.FloatThreshold)

	}
}
func TestMustParseTime(t *testing.T) {
	tm, _ := time.Parse(time.RFC3339, "2026-06-07T11:30:00Z")
	result := mustParseTime("2026-06-07T11:30:00Z")
	assert.Equal(t, tm, result)
}

func TestStrPtr(t *testing.T) {
	input := "test"
	inputTwo := &input
	result := strPtr(input)
	assert.Equal(t, inputTwo, result)
}

// func TestSeedStaffAvailability(t *testing.T) {
// 	oldDB := DB
// 	DB = SetupTestDB()
// 	defer func() { DB = oldDB }()

// 	staffID := "1"
// 	orgID := "1"
// 	employmentType := "Full-time"
// 	hours := 45.5

// 	// 1. Run the seed function
// 	seedStaffAvailability(
// 		staffID,
// 		orgID,
// 		employmentType,
// 		hours,
// 	)

// 	// 2. Fetch the result from the test database (UNCOMMENTED)
// 	var result models.StaffAvailabilityProfile
// 	err := DB.Where("staff_id = ?", staffID).First(&result).Error

//		// 3. Assertions
//		assert.NoError(t, err, "The record should exist in the database")
//		assert.Equal(t, staffID, result.StaffID)
//		assert.Equal(t, orgID, result.OrgID)
//		assert.Equal(t, employmentType, result.EmploymentType)
//		assert.Equal(t, hours, result.ContractedHoursPerWeek)
//	}
// func TestSeedStaffAvailability(t *testing.T) {
// 	oldDB := DB
// 	DB = SetupTestDB()
// 	defer func() { DB = oldDB }()
// 	tests := []struct {
// 		name           string
// 		staffID        string
// 		orgID          string
// 		employmentType string
// 		hours          float64
// 	}{
// 		{
// 			name:           "Test 1",
// 			staffID:        "1",
// 			orgID:          "1",
// 			employmentType: "Full-time",
// 			hours:          45.5,
// 		},
// 		{
// 			name:           "Test 2",
// 			staffID:        "1",
// 			orgID:          "1",
// 			employmentType: "Full-time",
// 			hours:          45.5,
// 		},
// 		{
// 			name:           "Test 3",
// 			staffID:        "1",
// 			orgID:          "1",
// 			employmentType: "Full-time",
// 			hours:          45.5,
// 		},
// 		{
// 			name:           "Test 4",
// 			staffID:        "1",
// 			orgID:          "1",
// 			employmentType: "Full-time",
// 			hours:          45.5,
// 		},
// 	}
// 	for _, test := range tests {
// 		var result models.StaffAvailabilityProfile
// 		err := DB.Where("staff_id = ?", staffID).First(&result).Error

// 		// 3. Assertions
// 		assert.NoError(t, err, "The record should exist in the database")
// 		assert.Equal(t, staffID, result.StaffID)
// 		assert.Equal(t, orgID, result.OrgID)
// 		assert.Equal(t, employmentType, result.EmploymentType)
// 		assert.Equal(t, hours, result.ContractedHoursPerWeek)
// 	}
// }

func TestSeedMedicationRecord(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()
	orgID := "1"
	residentID := "1"
	homeID := "1"
	name := "test"
	dosage := "test"
	frequency := "test"
	prescriber := "test"
	status := "test"

	seedMedicationRecord(
		orgID,
		residentID,
		homeID,
		name,
		dosage,
		frequency,
		prescriber,
		status,
	)
	var result models.MedicationRecord
	err := DB.Where("resident_id = ?", residentID).First(&result).Error
	assert.NoError(t, err, "The record should exist in the database")
	assert.Equal(t, orgID, result.OrgID)

}

func TestSeedDailyLog(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()
	orgID := "1"
	residentID := "1"
	residentName := "Shanto"
	workerID := "1"
	workerName := "Tahmid"
	homeID := "1"
	homeName := "Shanto's Villa"
	date := "2026"
	shift := "Night"
	logType := "All"
	content := "Tech"
	flags := []string{"1", "2", "3"}

	seedDailyLog(
		orgID,
		residentID,
		residentName,
		workerID,
		workerName,
		homeID,
		homeName,
		date,
		shift,
		logType,
		content,
		flags,
	)
	var result models.DailyLog
	err := DB.Where("resident_id = ?", residentID).First(&result).Error
	assert.NoError(t, err, "The record should be in the database")
}

func TestSeedShiftTemplate(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	homeID := "1"
	name := "test"
	shiftType := "Evening"
	start := "Now"
	end := "Later"
	staffRequired := 3

	seedShiftTemplate(
		orgID,
		homeID,
		name,
		shiftType,
		start,
		end,
		staffRequired,
	)
	var result models.ShiftTemplate
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should exist in the DB")
}

func TestSeedBill(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	homeID := "1"
	homeName := "Test"
	billType := "Any"
	supplier := "Remote"
	amount := 55.5
	dueDate := "Today"
	status := "Done"

	seedBill(
		orgID,
		homeID,
		homeName,
		billType,
		supplier,
		amount,
		dueDate,
		status,
	)

	var result models.Bill

	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should exist")
}

func TestSeedPettyCashTransaction(t *testing.T) {

	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()
	orgID := "1"
	homeID := "1"
	pettyCashID := "1"
	txType := "1"
	amount := 55.5
	category := "Test"
	description := "Test"
	createdBy := "Shahbuddin"

	seedPettyCashTransaction(
		orgID,
		homeID,
		pettyCashID,
		txType,
		amount,
		category,
		description,
		createdBy,
	)
	var result models.PettyCashTransaction
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should exist")
}

func TestSeedPlacementFee(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	residentID := "1"
	homeID := "1"
	la := "1"
	weeklyRate := 55.4
	startDate := "Today"

	seedPlacementFee(
		orgID,
		residentID,
		homeID,
		la,
		weeklyRate,
		startDate,
	)

	var result models.PlacementFee
	err := DB.Where("org_id =? ", orgID).First(&result).Error
	assert.NoError(t, err, "Record should exist")
}

func TestSeedNotification(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	userID := "1"
	notifType := "Urgent"
	message := "test"
	priority := "high"
	module := "test"
	recordID := "test"

	seedNotification(
		orgID,
		userID,
		notifType,
		message,
		priority,
		module,
		recordID,
	)

	var result models.Notification
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should Exist")
}

func TestSeedHomeDocument(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()
	actualTime := time.Now().Add(24 * time.Hour)
	var expiryTime *time.Time = &actualTime
	orgID := "1"
	homeID := "1"
	title := "test"
	docType := "test"
	fileURL := "test"
	expiry := expiryTime
	status := "test"

	seedHomeDocument(
		orgID,
		homeID,
		title,
		docType,
		fileURL,
		expiry,
		status,
	)

	var result models.HomeDocument
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should exist")
}

func TestSeedSupportPlan(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()
	orgID := "1"
	residentID := "1"
	homeID := "1"
	createdBy := "Shahbuddin"

	seedSupportPlan(
		orgID,
		residentID,
		homeID,
		createdBy,
	)

	var result models.SupportPlan
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should Exist")
}

func TestSeedAccidentReport(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	homeID := "1"
	homeName := "test"
	reportedByID := "1"
	reportedByName := "test"
	residentID := "1"
	residentName := "test"

	seedAccidentReport(
		orgID,
		homeID,
		homeName,
		reportedByID,
		reportedByName,
		residentID,
		residentName,
	)

	var result models.AccidentReport
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should exist")
}

func TestSeedAppointment(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()

	defer func() { DB = oldDB }()
	timeNow := time.Now().Add(24 * time.Hour)
	var expiry *time.Time = &timeNow
	orgID := "1"

	residentID := "1"
	residentName := "Nafis"
	homeID := "1"
	apptType := "Skyscrapper"
	title := "test"
	start := expiry
	location := "test"
	staffID := "1"
	status := "test"

	seedAppointment(
		orgID,
		residentID,
		residentName,
		homeID,
		apptType,
		title,
		start,
		location,
		staffID,
		status,
	)

	var result models.Appointment

	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record doesn't exist")
}

func TestSeedFamilyContact(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	residentID := "1"
	residentName := "Test"
	homeID := "1"
	contactName := "Test"
	relationship := "Test"
	contactDate := "Today"
	contactType := "Remote"
	frequency := "Daily"
	staffID := "1"
	staffName := "Tahmid"

	seedFamilyContact(
		orgID,
		residentID,
		residentName,
		homeID,
		contactName,
		relationship,
		contactDate,
		contactType,
		frequency,
		staffID,
		staffName,
	)
	var result models.FamilyContact
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should Exist")
}

func TestSeedAchievement(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	residentID := "1"
	residentName := "Shahbuddin"
	homeID := "1"
	staffID := "1"
	staffName := "Tahmid"
	category := "test"
	title := "test"
	description := "test"
	date := "test"

	seedAchievement(
		orgID,
		residentID,
		residentName,
		homeID,
		staffID,
		staffName,
		category,
		title,
		description,
		date,
	)

	var result models.Achievement
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should Exist")
}

func TestSeedRiskAssessment(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	residentID := "1"
	residentName := "Shahbuddin"
	homeID := "1"
	reviewerID := "1"
	reviewerName := "Shahbuddin"
	category := "test"
	overallRating := "Full"
	background := "test"

	seedRiskAssessment(
		orgID,
		residentID,
		residentName,
		homeID,
		reviewerID,
		reviewerName,
		category,
		overallRating,
		background,
	)

	var result models.RiskAssessment
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should exist")
}

func TestSeedPathwayPlan(t *testing.T) {
	oldDB := DB
	DB = SetupTestDB()
	defer func() { DB = oldDB }()

	orgID := "1"
	residentID := "1"
	residentName := "test"
	homeID := "1"
	createdBy := "Shahbuddin"

	seedPathwayPlan(
		orgID,
		residentID,
		residentName,
		homeID,
		createdBy,
	)
	var result models.PathwayPlan
	err := DB.Where("org_id = ?", orgID).First(&result).Error
	assert.NoError(t, err, "Record should exist")
}
