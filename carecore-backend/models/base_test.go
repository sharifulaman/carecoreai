package models

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestBeforeCreate(t *testing.T) {
	now := time.Now()

	testCases := []struct {
		base     Base
		expected error
	}{
		{
			base: Base{
				ID:          uuid.New(),
				OrgID:       "1234",
				CreatedDate: time.Now(),
				UpdatedDate: time.Now(),
				CreatedBy:   "Nafis",
				IsDeleted:   true,
				DeletedAt:   gorm.DeletedAt{Time: now, Valid: true},
			},
			expected: nil,
		},
	}

	for _, tc := range testCases {
		name := tc.base.ID
		t.Run(name.String(), func(t *testing.T) {
			result := tc.base.BeforeCreate(&gorm.DB{})
			// if result != tc.expected {
			// 	t.Fatalf("unexpected result: got %v, want %v", result, tc.expected)
			// }
			assert.Equal(t, result, tc.expected)
		})
	}
}

func TestBeforeUpdate(t *testing.T) {
	now := time.Now()

	testCases := []struct {
		base     Base
		expected error
	}{
		{
			base: Base{
				ID:          uuid.New(),
				OrgID:       "1234",
				CreatedDate: time.Now(),
				UpdatedDate: time.Now(),
				CreatedBy:   "Nafis",
				IsDeleted:   true,
				DeletedAt:   gorm.DeletedAt{Time: now, Valid: true},
			},
			expected: nil,
		},
	}

	for _, tc := range testCases {
		name := tc.base.ID
		t.Run(name.String(), func(t *testing.T) {
			result := tc.base.BeforeUpdate(&gorm.DB{})
			// if result != tc.expected {
			// 	t.Fatalf("unexpected result: got %v, want %v", result, tc.expected)
			// }
			assert.Equal(t, result, tc.expected)
		})
	}
}
