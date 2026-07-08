package models_test

import (
	"carecore-backend/models"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"testing"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

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

func TestAuthUserModel(t *testing.T) {
	type Given struct {
		email     string
		password  string
		createdBy string
	}

	type Expected struct {
		dataPosted bool

		email string
	}

	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "For user auth successful",
			given: Given{
				email:     "test4fdg3sasdsdsdfdfssssdassdfdfsdsssfsddffddsss48@sl.com",
				password:  "123456",
				createdBy: "Test user",
			},
			expected: Expected{
				dataPosted: true,

				email: "test4fdg3sasdsdsdfdfssssdassdfdfsdsssfsddffddsss48@sl.com",
			},
		},
		{
			name: "Testing without password",
			given: Given{
				email:     "test85sddasdfssswssdsdffdwerfr58sdfdsfd@sl.com",
				password:  "",
				createdBy: "Test user",
			},
			expected: Expected{
				dataPosted: true,

				email: "test85sddasdfssswssdsdffdwerfr58sdfdsfd@sl.com",
			},
		},
	}

	for _, test := range testCases {
		t.Run(test.name, func(t *testing.T) {
			hash, _ := bcrypt.GenerateFromPassword([]byte(test.given.password), bcrypt.DefaultCost)
			input := models.AuthUser{
				Base: models.Base{
					OrgID:     uuid.New().String(),
					CreatedBy: test.given.createdBy,
				},
				Email:        test.given.email,
				PasswordHash: string(hash),
				IsActive:     true,
			}

			err := DB.Create(&input).Error
			if test.expected.dataPosted {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}

			var retrievedCase models.AuthUser

			err = DB.Where("id = ?", input.ID).Find(&retrievedCase).Error
			assert.NoError(t, err)

			// assert.True(t, DB.Where("id = ?", input.ID).Find(&retrievedCase).RowsAffected > 0, test.expected.dataExists)
			assert.Equal(t, test.expected.email, retrievedCase.Email)
		})
	}
}

// func TestStaffProfile(t *testing.T) {
// 	type ContentData struct {
// 		payload map[string]interface{}
// 	}
// 	type Expected struct {
// 		messageOne string
// 		messageTwo string
// 	}

// 	testCases := []struct {
// 		email    string
// 		payload  ContentData
// 		expected Expected
// 	}{
// 		{
// 			email: "test@test.com",
// 			payload: ContentData{
// 				payload: map[string]interface{}{
// 					"title":          "Urgent Appointment Log 9th June",
// 					"appointment_id": "apt-abc-123",
// 					"priority_level": 2,
// 					"notes":          "Standard verification check.",
// 				},
// 			},
// 			expected: Expected{
// 				messageOne: "Couldn't post into database",
// 				messageTwo: "Data doesn't exist in database",
// 			},
// 		},
// 		{
// 			email: "test2@test.com",
// 			payload: ContentData{
// 				payload: map[string]interface{}{
// 					"title":          "Urgent Appointment Log 9th June",
// 					"appointment_id": "apt-abc-123",
// 					"priority_level": 2,
// 					"notes":          "Standard verification check.",
// 				},
// 			},
// 			expected: Expected{
// 				messageOne: "Couldn't post into database",
// 				messageTwo: "Data doesn't exist in database",
// 			},
// 		},
// 		{
// 			email: "test3@test.com",
// 			payload: ContentData{
// 				payload: map[string]interface{}{
// 					"title":          "Urgent Appointment Log 9th June",
// 					"appointment_id": "apt-abc-123",
// 					"priority_level": 2,
// 					"notes":          "Standard verification check.",
// 				},
// 			},
// 			expected: Expected{
// 				messageOne: "Couldn't post into database",
// 				messageTwo: "Data doesn't exist in database",
// 			},
// 		},
// 	}
// 	for _, test := range testCases {
// 		contentJSON, _ := json.Marshal(test.payload.payload)
// 		input := models.StaffProfile{
// 			Email:               test.email,
// 			OnboardingChecklist: contentJSON,
// 		}

// 		err := DB.Create(&input).Error
// 		assert.NoError(t, err, test.expected.messageOne)

// 		var retrievedCase models.StaffProfile

// 		err = DB.Where("id = ?", input.ID).Find(&retrievedCase).Error
// 		assert.NoError(t, err)

// 		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrievedCase).RowsAffected > 0, test.expected.messageTwo)
// 	}
// }

func TestHomeModel(t *testing.T) {
	type Given struct {
		name      string
		homeType  string
		careModel string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		payload  Given
		expected Expected
	}{
		{
			payload: Given{
				name:      "Home 1",
				homeType:  "Apartment",
				careModel: "Test",
			},
			expected: Expected{
				messageOne: "Couldn't post into database",
				messageTwo: "Data doesn't exist in database",
			},
		},
		{
			payload: Given{
				name:      "Home 2",
				homeType:  "Villa",
				careModel: "Test",
			},
			expected: Expected{
				messageOne: "Couldn't post into database",
				messageTwo: "Data doesn't exist in database",
			},
		},
		{
			payload: Given{
				name:      "Home 3",
				homeType:  "Cottage",
				careModel: "Test",
			},
			expected: Expected{
				messageOne: "Couldn't post into database",
				messageTwo: "Data doesn't exist in database",
			},
		},
	}

	for _, test := range testCases {
		input := models.Home{
			Name:      test.payload.name,
			Type:      test.payload.homeType,
			CareModel: test.payload.careModel,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)

		var retrievedCase models.Home

		err = DB.Where("id = ?", input.ID).Find(&retrievedCase).Error
		assert.NoError(t, err)

		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrievedCase).RowsAffected > 0, test.expected.messageTwo)
	}
}

func TestResidentModel(t *testing.T) {
	type Given struct {
		displayName string
		initials    string
		privacyMode bool
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}
	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				displayName: "Test",
				initials:    "Test",
				privacyMode: true,
			},
			expected: Expected{
				messageOne: "Failed to insert resident into database",
				messageTwo: "Data doesn't exist on database",
			},
		},
		{
			given: Given{
				displayName: "Test 2",
				initials:    "Test 2",
				privacyMode: false,
			},
			expected: Expected{
				messageOne: "Failed to insert resident into database",
				messageTwo: "Data doesn't exist on database",
			},
		},
		{
			given: Given{
				displayName: "Test 3",
				initials:    "Test 3",
				privacyMode: true,
			},
			expected: Expected{
				messageOne: "Failed to insert resident into database",
				messageTwo: "Data doesn't exist on database",
			},
		},
	}

	for _, test := range testCases {
		input := models.Resident{
			DisplayName: test.given.displayName,
			Initials:    test.given.initials,
			PrivacyMode: test.given.privacyMode,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.Resident
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)
	}
}

func TestVisitReportMode(t *testing.T) {
	type Given struct {
		actionText  string
		outcomeText string
		dailyLogID  []string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				actionText:  "Action 1",
				outcomeText: "Outcome 1",
				dailyLogID:  []string{"1", "2", "3"},
			},
			expected: Expected{
				messageOne: "Failed to insert data nto database",
				messageTwo: "Data doesn't exist on database",
			},
		},
		{
			given: Given{
				actionText:  "Action 2",
				outcomeText: "Outcome 2",
				dailyLogID:  []string{"4", "5", "6"},
			},
			expected: Expected{
				messageOne: "Failed to insert data nto database",
				messageTwo: "Data doesn't exist on database",
			},
		},
	}

	for _, test := range testCases {
		input := models.VisitReport{
			ActionText:  test.given.actionText,
			OutcomeText: test.given.outcomeText,
			DailyLogIDs: test.given.dailyLogID,
		}

		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.VisitReport
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)
	}
}

func TestPettyCaseModel(t *testing.T) {
	type Given struct {
		homeName  string
		balance   float64
		threshold float64
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				homeName:  "Test",
				balance:   45.0,
				threshold: 44.5,
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist on database",
			},
		},
		{
			given: Given{
				homeName:  "Test2 ",
				balance:   55.0,
				threshold: 64.5,
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist on database",
			},
		},
	}
	for _, test := range testCases {
		input := models.PettyCash{
			HomeName:       test.given.homeName,
			CurrentBalance: test.given.balance,
			FloatThreshold: test.given.threshold,
		}

		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.PettyCash
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)
	}
}

func TestMedicationRecordModel(t *testing.T) {
	type Given struct {
		name       string
		dosage     string
		frequency  string
		prescriber string
		status     string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				name:       "Test name",
				dosage:     "test",
				frequency:  "test",
				prescriber: "test",
				status:     "test",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in database",
			},
		},
		{
			given: Given{
				name:       "Test name",
				dosage:     "test",
				frequency:  "test",
				prescriber: "test",
				status:     "test",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in database",
			},
		},
	}

	for _, test := range testCases {
		input := models.MedicationRecord{
			MedicationName: test.given.name,
			Dosage:         test.given.dosage,
			Frequency:      test.given.frequency,
			PrescribedBy:   test.given.prescriber,
			Status:         test.given.status,
		}

		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.MedicationRecord
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)
	}
}

func TestDailyLogModel(t *testing.T) {
	type Given struct {
		residentName string
		workerName   string
		homeName     string
		flags        []string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				residentName: "Test",
				workerName:   "Test",
				homeName:     "Test",
				flags:        []string{"1", "2", "3"},
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
		{
			given: Given{
				residentName: "Test 2",
				workerName:   "Test 2",
				homeName:     "Test 2",
				flags:        []string{"4", "5", "6"},
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.DailyLog{
			ResidentName: test.given.residentName,
			WorkerName:   test.given.workerName,
			HomeName:     test.given.homeName,
			Flags:        test.given.flags,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.DailyLog
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestShiftTemplateModel(t *testing.T) {
	type Given struct {
		name      string
		shiftType string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				name:      "Test name",
				shiftType: "Evening",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
		{
			given: Given{
				name:      "Test name 2",
				shiftType: "Night",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.ShiftTemplate{
			Name:      test.given.name,
			ShiftType: test.given.shiftType,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.ShiftTemplate
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestSeedBillModel(t *testing.T) {
	type Given struct {
		supplier string
		amount   float64
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				supplier: "Test supplier",
				amount:   50.5,
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
		{
			given: Given{
				supplier: "Test supplier 2",
				amount:   90.8,
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.Bill{
			Supplier: test.given.supplier,
			Amount:   test.given.amount,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.Bill
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestPettyCashTransactionModel(t *testing.T) {
	type Given struct {
		category    string
		description string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				category:    "Test category",
				description: "Test description",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
		{
			given: Given{
				category:    "Test category 2",
				description: "Test description 2",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.PettyCashTransaction{
			Category:    test.given.category,
			Description: test.given.description,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.PettyCashTransaction
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestPlacementFeeModel(t *testing.T) {
	type Given struct {
		weeklyRate     float64
		localAuthority string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				weeklyRate:     99.9,
				localAuthority: "Test",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
		{
			given: Given{
				weeklyRate:     99.9,
				localAuthority: "Test",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.PlacementFee{
			WeeklyRate:     test.given.weeklyRate,
			LocalAuthority: test.given.localAuthority,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.PlacementFee
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestNotificationModel(t *testing.T) {
	type Given struct {
		message string
		body    string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				message: "Test message",
				body:    "Test body",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
		{
			given: Given{
				message: "Test message",
				body:    "Test body",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.Notification{
			Message: test.given.message,
			Body:    test.given.body,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.Notification
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestHomeDocumentModel(t *testing.T) {
	type Given struct {
		title   string
		fileURL string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				title:   "Test title",
				fileURL: "Test url",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},

		{
			given: Given{
				title:   "Test title 2",
				fileURL: "Test url 2",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.HomeDocument{
			Title:   test.given.title,
			FileURL: test.given.fileURL,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.HomeDocument
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestSupportPlanModel(t *testing.T) {
	type Given struct {
		status     string
		reviewedBy string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				status:     "Test status",
				reviewedBy: "Bob",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},

		{
			given: Given{
				status:     "Test status 2",
				reviewedBy: "Carol",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.SupportPlan{
			Status:     test.given.status,
			ReviewedBy: test.given.reviewedBy,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.SupportPlan
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestAccidentReportModel(t *testing.T) {
	type Given struct {
		residentName   string
		reportedByName string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				residentName:   "Test resident",
				reportedByName: "Bob",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},

		{
			given: Given{
				residentName:   "Test resident",
				reportedByName: "Bob",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.AccidentReport{
			ResidentName:   test.given.residentName,
			ReportedByName: test.given.reportedByName,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.AccidentReport
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}
func TestAppointmentModel(t *testing.T) {
	type Given struct {
		residentName string
		title        string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				residentName: "Test resident",
				title:        "Bob",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},

		{
			given: Given{
				residentName: "Test resident",
				title:        "John",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.Appointment{
			ResidentName: test.given.residentName,
			Title:        test.given.title,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.Appointment
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestFamilyContactModel(t *testing.T) {
	type Given struct {
		contactName         string
		safeguardingConcern bool
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				contactName:         "Test Contact",
				safeguardingConcern: true,
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},

		{
			given: Given{
				contactName:         "Test contact Two",
				safeguardingConcern: false,
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.FamilyContact{
			ContactPersonName:   test.given.contactName,
			SafeguardingConcern: test.given.safeguardingConcern,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.FamilyContact
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestAchievementModel(t *testing.T) {
	type Given struct {
		id          string
		title       string
		description string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				id:          uuid.New().String(),
				title:       "Test Title",
				description: "Test Description",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},

		{
			given: Given{
				id:          uuid.New().String(),
				title:       "Test Title 2",
				description: "Test Description 2",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.Achievement{
			HomeID:     test.given.id,
			ResidentID: test.given.id,

			Title:       test.given.title,
			Description: test.given.description,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.Achievement
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestSeedRiskAssessment(t *testing.T) {
	type Given struct {
		id           string
		reviewerName string
		background   string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				id:           uuid.New().String(),
				reviewerName: "Test Reviewer",
				background:   "Test Background",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},

		{
			given: Given{
				id:           uuid.New().String(),
				reviewerName: "Test Reviewer",
				background:   "Test Background",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.RiskAssessment{
			ResidentID:         test.given.id,
			HomeID:             test.given.id,
			LastReviewedByName: &test.given.reviewerName,
			Background:         test.given.background,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.RiskAssessment
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}

func TestPathwayPlanModel(t *testing.T) {
	type Given struct {
		id        string
		createdBy string
	}
	type Expected struct {
		messageOne string
		messageTwo string
	}

	testCases := []struct {
		given    Given
		expected Expected
	}{
		{
			given: Given{
				id:        uuid.New().String(),
				createdBy: "Shahbuddin",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},

		{
			given: Given{
				id:        uuid.New().String(),
				createdBy: "Shahbuddin Ahmed",
			},
			expected: Expected{
				messageOne: "Failed to insert into database",
				messageTwo: "Data doesn't exist in the database",
			},
		},
	}
	for _, test := range testCases {
		input := models.PathwayPlan{
			ResidentID: test.given.id,
			HomeID:     test.given.id,
			CreatedBy:  test.given.createdBy,
		}
		err := DB.Create(&input).Error
		assert.NoError(t, err, test.expected.messageOne)
		var retrieved models.PathwayPlan
		err = DB.Where("id = ?", input.ID).Find(&retrieved).Error
		assert.NoError(t, err)
		assert.True(t, DB.Where("id = ?", input.ID).Find(&retrieved).RowsAffected > 0, test.expected.messageTwo)

	}
}
