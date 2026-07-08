package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestPayPeriod(t *testing.T) {
	testCase := models.PayPeriod{
		Label:       "1",
		PeriodStart: "1",
		PeriodEnd:   "1",
		PayDate:     "1",
		Frequency:   "1",
		Status:      "1",
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed %v", err)
	}
}

func TestTimeSheet(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.Timesheet{
		StaffID:             "1",
		StaffName:           "1",
		HomeID:              "1",
		PayPeriodID:         "1",
		PayPeriodLabel:      "1",
		PeriodStart:         "1",
		PeriodEnd:           "1",
		TotalScheduledHours: 10.5,
		TotalActualHours:    10.5,
		TotalOvertimeHours:  10.4,
		TotalSleepInHours:   5.4,
		TotalOnCallHours:    2.4,
		HourlyRate:          12.5,
		GrossPay:            4.4,
		OvertimePay:         3.4,
		SleepInAllowance:    3.3,
		OnCallAllowance:     1.3,
		Status:              "Hello",
		ApprovedBy:          "1",
		ApprovedAt:          &acknowledgedTime,
		Notes:               "1",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestPayslip(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)

	testCase := models.Payslip{
		ExpenseLines: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["expense_lines"])

}

func TestAttendanceLog(t *testing.T) {
	testCase := models.AttendanceLog{
		StaffID:      "1",
		HomeID:       "1",
		ShiftID:      "1",
		Date:         "Today",
		ClockInTime:  "Today",
		ClockOutTime: "Today",
		TotalHours:   4.4,
		Type:         "test",
		Method:       "Test",
		Latitude:     3.4,
		Longitude:    2.5,
		Notes:        "test",
		VerifiedBy:   "test",
		IsActive:     false,
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed %v", err)
	}
}

func TestLeaveRequest(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.LeaveRequest{
		StaffID:               "1",
		StaffName:             "Tahmid",
		LeaveType:             "Medical",
		DateFrom:              "Today",
		DateTo:                "Tomorrow",
		Days:                  3.0,
		Status:                "Absent",
		Notes:                 "Remarks",
		ApprovedBy:            "Shahbuddin",
		ApprovedByName:        "Shahbuddin",
		ApprovedAt:            &acknowledgedTime,
		RejectionReason:       "Not really ill",
		ReturnToWorkCompleted: true,
		SelfCertCompleted:     true,
		SspEligible:           false,
		SspAmount:             4.5,
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}
func TestLeaveBalance(t *testing.T) {

	testCase := models.LeaveBalance{
		StaffID:          "1",
		StaffName:        "Tahmid",
		Year:             2026,
		TotalEntitlement: 4.5,
		DaysTaken:        4.5,
		DaysRemaining:    4.4,
		DaysPending:      4.5,
		CarriedOver:      3.4,
		SickDaysTaken:    4.5,
		ToilEarned:       4.5,
		ToilTaken:        5.6,
		FlaggedForReview: true,
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}
func TestTOILBalance(t *testing.T) {

	testCase := models.TOILBalance{
		StaffID:   "1",
		StaffName: "Tahmid",
		Year:      2026,

		ToilEarned:       4.5,
		ToilTaken:        5.6,
		FlaggedForReview: true,
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}
func TestSupervisionRecord(t *testing.T) {

	testCase := models.SupervisionRecord{
		SuperviseeID:        "1",
		SuperviseeName:      "Pankaj",
		SupervisorID:        "10",
		SupervisorName:      "Zeba",
		SessionDate:         "Today",
		Status:              "Active",
		Notes:               "No notes",
		ActionPoints:        "Test",
		NextSupervisionDate: "Tomorrow",
		SupervisionType:     "Elite",
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}

func TestAppraisalRecord(t *testing.T) {

	testCase := models.AppraisalRecord{

		Status:        "Active",
		Notes:         "No notes",
		AppraiseeID:   "2",
		AppraiseeName: "Toha",
		AppraiserID:   "5",
		AppraiserName: "Shanto",
		AppraisalDate: "Tomorrow",
		Rating:        5.0,

		DevelopmentGoals:  "The grind",
		Outcome:           "No outcome",
		NextAppraisalDate: "Day after tomorrow",
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}

func TestDisciplinaryRecord(t *testing.T) {
	testCase := models.DisciplinaryRecord{
		StaffID:           "1",
		StaffName:         "John",
		IssuedBy:          "Carol",
		IssuedByName:      "Carol",
		RecordType:        "Demo",
		IncidentDate:      "Today",
		DisciplinaryType:  "Strict",
		IncidentSummary:   "Summary",
		Outcome:           "Test",
		Witnesses:         "Test",
		PolicyClause:      "Test",
		ReviewDate:        "Test",
		StatusStage:       "Test",
		Confidential:      true,
		Nature:            "Test",
		Investigator:      "Test",
		GrievanceOutcome:  "Test",
		ResolutionActions: "True",
		ResolvedBy:        "Rinky",
		ResolutionDate:    "Today",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}

func TestTrainingRequirement(t *testing.T) {
	testCase := models.TrainingRequirement{
		CourseName:    "Golang",
		Category:      "Programming",
		HomeTypes:     []string{"1", "2", "3"},
		Roles:         []string{"1", "2", "3"},
		ExpiryMonths:  1,
		IsMandatory:   true,
		Mandatory:     "yes",
		IsActive:      true,
		DisplayOrder:  3,
		Notes:         "Yes",
		Provider:      "Yes",
		DurationHours: 2.5,
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}

func TestTrainingRecord(t *testing.T) {
	testCase := models.TrainingRecord{
		StaffID:        "1",
		StaffName:      "Tahmid",
		RequirementID:  "1",
		Title:          "Test",
		CompletionDate: "Test",
		ExpiryDate:     "Test",
		Score:          4.5,
		Status:         "Test",
		CertificateURL: "Test",
		HomeID:         "5",

		Category: "Programming",

		Notes:    "Yes",
		Provider: "Yes",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}

func TestStaffExpense(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.StaffExpense{
		StaffID:     "1",
		StaffName:   "Tahmid",
		HomeID:      "1",
		TimesheetID: "1",
		PayslipID:   "1",
		ExpenseDate: "Today",
		Category:    "Test",
		Description: "Test",
		Amount:      4.5,
		Mileage:     4.5,
		MileageRate: 4.5,
		ReceiptURL:  "Test",
		Status:      "Test",
		ApprovedBy:  "Test",
		ApprovedAt:  &acknowledgedTime,

		ReviewedAt: &acknowledgedTime,

		RejectionReason: "Yes",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}

func TestWellbeingCheckIn(t *testing.T) {

	testCase := models.WellbeingCheckIn{
		StaffID:        "1",
		StaffName:      "Tahmid",
		// CheckedBy:      "Tahmid",
		// CheckedByName:  "Tahmid",
		// CheckInDate:    "Today",
		// MoodScore:      1,
		// StressLevel:    1,
		Notes:          "Test",
		ActionRequired: true,
		ActionTaken:    "test",
		// FollowUpDate:   "test",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}
func TestReturnToWorkRecord(t *testing.T) {

	testCase := models.ReturnToWorkRecord{
		StaffID:             "1",
		StaffName:           "Tahmid",
		ConductedBy:         "Shahbuddin",
		ConductedByName:     "Shahbuddin",
		ReturnDate:          "Tomorrow",
		AbsenceFrom:         "Today",
		AbsenceTo:           "Test",
		AbsenceReason:       "Sick",
		LeaveRequestID:      "33",
		HealthDeclaration:   true,
		AdjustmentsRequired: true,
		AdjustmentsDetails:  "test",
		Notes:               "test",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}

func TestStaffDocument(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)

	testCase := models.StaffDocument{
		StaffID:       "1",
		StaffName:     "Tahmid",
		DocumentType:  "Test",
		Title:         "Test",
		FileURL:       "Test",
		ExpiryDate:    "Test",
		IssuedDate:    "Test",
		Notes:         "Test",
		SignedAt:      &acknowledgedTime,
		SignedBy:      "Shahbuddin",
		VersionNumber: "123",
		IsActive:      true,
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}

}

func TestContractTemplate(t *testing.T) {
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}

	contentJSON, _ := json.Marshal(contentData)

	testCase := models.ContractTemplate{
		Variables: contentJSON,
	}
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)

	// FIX 1: Content - compare as map[string]interface{} after unmarshaling
	var unmarshaledContent map[string]interface{}
	json.Unmarshal(contentJSON, &unmarshaledContent)
	assert.Equal(t, unmarshaledContent, parsed["variables"])
}

func TestVacancy(t *testing.T) {
	testCase := models.Vacancy{
		VacancyRole:           "Test",
		IsSupportRole:         true,
		NumberOfPosts:         1,
		EmploymentType:        "Test",
		HomeID:                "1",
		HomeName:              "Test",
		ServiceType:           "Test",
		AccommodationCategory: "Test",
		ContractHours:         4.5,
		PayType:               "test",
		SalaryOrHourlyRate:    5.5,
		VacancyOpenedDate:     "Today",
		TargetStartDate:       "Today",
		ReasonForVacancy:      "Test",
		ReasonDetails:         "Test",
		RecruitingManagerID:   "Test",
		RecruitingManagerName: "Test",
		Status:                "Test",
		Notes:                 "Test",
		ApplicationsReceived:  4,
		InterviewsScheduled:   4,
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}
}

func TestAgencyBankStaffUsage(t *testing.T) {
	costPerHour := 4.4
	testCase := models.AgencyBankStaffUsage{
		// WorkerNameOrReference:  "Test",
		// AgencyBankType:         "Test",
		// AgencyOrganisationName: "Test",
		// Role:                   "Test",
		// IsSupportRole:          true,
		// UsageDate:              "test",
		// ShiftHomeID:            "test",
		// ShiftHomeName:          "test",
		// ServiceType:            "test",
		// AccommodationCategory:  "Test",
		// ShiftStartTime:         "Test",
		// ShiftEndTime:           "Test",
		// HoursWorked:            5.5,
		// ReasonUsed:             "test",
		CostPerHour: &costPerHour,
		// Notes:                  "Test",
	}
	// err := utils.ValidateJSONMarshaling(t, testCase)
	// if err != nil {
	// 	t.Errorf("Validation error %v", err)
	// }
	bytes, err := json.Marshal(testCase)
	assert.NoError(t, err)
	var parsed map[string]interface{}
	err = json.Unmarshal(bytes, &parsed)
	assert.Equal(t, costPerHour, parsed["cost_per_hour"])
}

func TestHRPolicyStaffAssignment(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.HRPolicyStaffAssignment{
		PolicyID:       "1",
		PolicyTitle:    "1",
		StaffID:        "1",
		StaffName:      "Nafis",
		AssignedBy:     "Shahbuddin",
		AssignedAt:     "today",
		AcknowledgedAt: &acknowledgedTime,
		SignedAt:       &acknowledgedTime,
		Status:         "Test",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation error %v", err)
	}

}
