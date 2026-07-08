package models_test

import (
	"carecore-backend/models"
	"carecore-backend/utils"
	"testing"
	"time"
)

func TestPlacementFee(t *testing.T) {
	testCase := models.PlacementFee{
		ResidentID:        "1",
		HomeID:            "1",
		LocalAuthority:    "1",
		LAContactName:     "1",
		LAContactEmail:    "1",
		LAReference:       "1",
		WeeklyRate:        1.0,
		MonthlyEquivalent: 1.0,
		FeeStartDate:      "1",
		FeeEndDate:        "1",
		ReviewDate:        "1",
		InvoiceDay:        1,
		Status:            "1",
		Notes:             "1",
	}
	if err := utils.ValidateJSONMarshaling(t, testCase); err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestPettyCash(t *testing.T) {
	testCase := models.PettyCash{
		HomeID:         "1",
		HomeName:       "1",
		CurrentBalance: 1.0,
		FloatThreshold: 1.0,
		Status:         "1",
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestPettyCashTransaction(t *testing.T) {
	testCase := models.PettyCashTransaction{
		HomeID:          "1",
		PettyCashID:     "1",
		TransactionType: "1",
		Amount:          1.0,
		Category:        "1",
		Description:     "1",
		Date:            "1",
		ReceiptPhotoURL: "1",
		ApprovedBy:      "1",
	}

	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed %v", err)
	}
}

func TestBill(t *testing.T) {
	testCase := models.Bill{
		HomeID:        "1",
		HomeName:      "1",
		BillType:      "1",
		Supplier:      "1",
		Amount:        1.0,
		DueDate:       "1",
		PaidDate:      "1",
		Status:        "1",
		Notes:         "1",
		IsDirectDebit: true,
		IsRecurring:   true,
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestCouncilTaxExemption(t *testing.T) {
	acknowledgedTime := time.Date(2026, time.June, 6, 14, 30, 0, 0, time.UTC)
	testCase := models.CouncilTaxExemption{
		ResidentID:          "1",
		ResidentName:        "1",
		HomeID:              "1",
		HomeName:            "1",
		ExemptionType:       "1",
		ExemptionStatus:     "1",
		StartDate:           &acknowledgedTime,
		EndDate:             &acknowledgedTime,
		RenewalDate:         &acknowledgedTime,
		ExemptionPercentage: 1,
		CouncilName:         "1",
		CouncilContact:      "1",
		CouncilEmail:        "1",
		ReferenceNumber:     "1",
		Notes:               "1",
		AppliedByStaffID:    "1",
		AppliedByName:       "1",
		AppliedDate:         &acknowledgedTime,
	}
	err := utils.ValidateJSONMarshaling(t, testCase)
	if err != nil {
		t.Errorf("Validation failed: %d", err)
	}
}
