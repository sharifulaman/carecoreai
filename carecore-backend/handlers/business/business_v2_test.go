package business_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"carecore-backend/testutils"

	"carecore-backend/handlers"
	"carecore-backend/handlers/business"
	"carecore-backend/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupBusinessRouterNew() (*gin.Engine, string, string, string) {
	gin.SetMode(gin.TestMode)
	testutils.SetupTestDB()

	r := gin.Default()
	r.Use(middleware.CORS())
	r.POST("/auth/register", handlers.Register)
	r.POST("/auth/login", handlers.Login)

	protected := r.Group("/")
	protected.Use(middleware.AuthRequired())
	{

		protected.GET("/auth/me", handlers.GetMe)

		entities := protected.Group("/entities")
		entities.POST("/:entity", handlers.CreateEntity)
		entities.GET("/:entity", handlers.ListEntities)

		biz := protected.Group("/business")

		biz.POST("/appointment", business.CreateAppointment)
		biz.PUT("/appointment/:id", business.UpdateAppointment)
		biz.POST("/complaint", business.RaiseComplaint)
		biz.POST("/daily-log", business.SubmitDailyLog)
		biz.POST("/safeguarding", business.RaiseSafeguarding)
	}

	// Setup: register admin, create home, create resident
	token := registerAndLogin(r, "biz_admin@carecore.com", "Test1234", "admin")
	homeID := createHome(r, token, "Business Test Home")
	residentID := createResident(r, token, homeID, "Test YP")

	return r, token, homeID, residentID
}
func setupBusinessRouterNewV2() (*gin.Engine, string, string) {
	gin.SetMode(gin.TestMode)
	testutils.SetupTestDB()

	r := gin.Default()
	r.Use(middleware.CORS())
	r.POST("/auth/register", handlers.Register)
	r.POST("/auth/login", handlers.Login)

	protected := r.Group("/")
	protected.Use(middleware.AuthRequired())
	{

		protected.GET("/auth/me", handlers.GetMe)

		entities := protected.Group("/entities")
		entities.POST("/:entity", handlers.CreateEntity)
		entities.GET("/:entity", handlers.ListEntities)

		biz := protected.Group("/business")

		biz.POST("/appointment", business.CreateAppointment)
		biz.POST("/complaint", business.RaiseComplaint)
		biz.POST("/daily-log", business.SubmitDailyLog)
		biz.POST("/safeguarding", business.RaiseSafeguarding)
		biz.GET("/yp-summary/:residentId", business.GetYPSummary)
		biz.GET("/yp-timeline/:residentId", business.GetYPTimeline)

	}

	// Setup: register admin, create home, create resident
	token := registerAndLogin(r, "biz_admin@carecore.com", "Test1234", "admin")
	homeID := createHome(r, token, "Business Test Home")
	residentID := createResident(r, token, homeID, "Test YP")

	return r, token, residentID
}

func TestCreateAppointmentSuccess(t *testing.T) {
	r, token, homeID, residentID := setupBusinessRouterNew()

	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}
	testCases := []struct {
		name        string
		description string
		given       Given
		expected    Expected
	}{
		{
			name:        "create_appointment_with_follow_up_db_type",
			description: "Should successfully create an appointment with follow_up_db type",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":      residentID,
						"home_id":          homeID,
						"appointment_type": "follow_up_db",
						"title":            "Medical checkup DB 28th June",
						"date":             "2026-05-13",
						"start_datetime":   "2026-05-13T1:00:00Z",

						"end_datetime":       "2026-05-13T11:00:00Z",
						"location":           "Uttara, Dhaka",
						"attending_staff_id": "123",
					},
				},
			},
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "scheduled",
			},
		},
		{
			name:        "create_appointment_with_follow_up_type",
			description: "Should successfully create an appointment with follow_up type and return scheduled status",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":        residentID,
						"home_id":            homeID,
						"appointment_type":   "follow_up",
						"title":              "Medical Checkup",
						"date":               "2026-05-13",
						"start_datetime":     "2026-05-13T10:00:00Z",
						"end_datetime":       "2026-05-13T11:00:00Z",
						"location":           "Test Location",
						"attending_staff_id": "123",
					},
				},
			},
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "scheduled",
			},
		},
		{
			name:        "create_appointment_with_future_date",
			description: "Should successfully create an appointment with a future date far in advance",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":        residentID,
						"home_id":            homeID,
						"appointment_type":   "follow_up",
						"title":              "Future Medical Checkup",
						"date":               "2026-12-25",
						"start_datetime":     "2026-12-25T14:30:00Z",
						"end_datetime":       "2026-12-25T15:30:00Z",
						"location":           "Advanced Clinic",
						"attending_staff_id": "456",
					},
				},
			},
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "scheduled",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			b, err := json.Marshal(tc.given.payload)
			assert.NoError(t, err, "Failed to marshal request payload")

			w := httptest.NewRecorder()
			req, err := http.NewRequest("POST", "/business/appointment", bytes.NewBuffer(b))
			assert.NoError(t, err, "Failed to create new request")
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			r.ServeHTTP(w, req)
			assert.Equal(t, tc.expected.statusCode, w.Code,
				tc.expected.statusCode, w.Code, tc.name)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err, "Failed to unmarshal response body")
			assert.Equal(t, "success", response["status"])

			data, ok := response["data"].(map[string]interface{})
			assert.True(t, ok, "Expected 'data' field to be a map")

			assert.Equal(t, tc.expected.responseStatus, data["status"])

			appointmentID, ok := data["id"].(string)
			assert.True(t, ok && appointmentID != "", "Expected non-empty appointment ID")

			assert.NotNil(t, data["resident_id"], "Expected resident_id to be present")
			assert.NotNil(t, data["home_id"], "Expected home_id to be present")
			assert.NotNil(t, data["title"], "Expected title to be present")

		})
	}
}

func TestCreateAppointmentMissingFields(t *testing.T) {
	r, token, homeID, residentID := setupBusinessRouterNew()
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}

	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "Missing resident_id",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id": homeID,
					},
				},
			},
		},
		{
			name: "Missing home_id",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"reident_id": residentID,
					},
				},
			},
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(tc.given.payload)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/business/appointment", bytes.NewBuffer(b))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			r.ServeHTTP(w, req)
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Equal(t, "success", response["status"])

		})
	}

}
func TestCreateAppointmentInvalidTimeRange(t *testing.T) {
	r, token, homeID, residentID := setupBusinessRouterNew()
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}
	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "create_appointment_with_future_date",

			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":        residentID,
						"home_id":            homeID,
						"appointment_type":   "follow_up",
						"title":              "Future Medical Checkup",
						"date":               "2026-12-25",
						"start_datetime":     "2026-12-25T19:30:00Z",
						"end_datetime":       "2026-12-25T15:30:00Z",
						"location":           "Advanced Clinic",
						"attending_staff_id": "456",
					},
				},
			},
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "scheduled",
			},
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(tc.given.payload)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/business/appointment", bytes.NewBuffer(b))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			r.ServeHTTP(w, req)
			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Equal(t, "success", response["status"])
		})
	}

}
func TestUpdateAppointment(t *testing.T) {
	r, token, homeID, residentID := setupBusinessRouterNew()

	body, _ := json.Marshal(map[string]interface{}{
		"data": map[string]interface{}{
			"resident_id":        residentID,
			"home_id":            homeID,
			"appointment_type":   "follow_up",
			"title":              "Medical Checkup",
			"date":               "2026-05-13",
			"start_datetime":     "2026-05-13T10:00:00Z",
			"end_datetime":       "2026-05-13T11:00:00Z",
			"location":           "Test Location",
			"attending_staff_id": "123",
		},
	})

	// b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/business/appointment", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	// assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	// assert.Equal(t, "success", resp["status"])
	data := resp["data"].(map[string]interface{})
	assert.Equal(t, "scheduled", data["status"])
	assert.NotEmpty(t, data["id"])

	appointmentID := data["id"].(string)
	url := fmt.Sprintf("/business/appointment/%s", appointmentID)
	bodyUpdate, _ := json.Marshal(map[string]interface{}{
		"data": map[string]interface{}{
			"resident_id":        residentID,
			"home_id":            homeID,
			"appointment_type":   "follow_up",
			"title":              "Medical Checkup",
			"date":               "2026-05-13",
			"start_datetime":     "2026-05-13T10:00:00Z",
			"end_datetime":       "2026-05-13T11:00:00Z",
			"location":           "Test Location",
			"attending_staff_id": "123",
		},
	})
	wNew := httptest.NewRecorder()
	reqNew, _ := http.NewRequest("PUT", url, bytes.NewBuffer(bodyUpdate))
	reqNew.Header.Set("Authorization", "Bearer "+token)
	reqNew.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wNew, reqNew)

	var respNew map[string]interface{}
	json.Unmarshal(wNew.Body.Bytes(), &respNew)
	assert.Equal(t, "success", respNew["status"])
	// dataNew := respNew["data"].(map[string]interface{})
	// assert.Equal(t, "success", dataNew["status"])

}

func TestRaiseComplaintSuccess(t *testing.T) {
	r, token, residentID, homeID := setupBusinessRouterNew()

	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode int
		response   string
	}

	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "General test case",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id":                homeID,
						"resident_id":            residentID,
						"title":                  "Test Title",
						"description":            "Test description",
						"received_datetime":      "Enter date here",
						"target_resolution_date": "Any date",
						"escalated_to_otsted":    "Test",
					},
				},
			},
			expected: Expected{
				statusCode: http.StatusCreated,
				response:   "open",
			},
		},
	}

	for i, test := range testCases {
		t.Logf("Start running test case for Test: %d", i)
		b, _ := json.Marshal(test.given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/complaint", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		assert.Equal(t, test.expected.statusCode, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "success", resp["status"])
		data := resp["data"].(map[string]interface{})
		assert.Equal(t, test.expected.response, data["status"])
		assert.NotEmpty(t, data["id"])
		t.Logf("Test case completed for Test: %d", i)
	}
}

func TestRaiseComplaintMissingInput(t *testing.T) {
	r, token, residentID, homeID := setupBusinessRouterNew()
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode int
	}

	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "Missing description",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id":     homeID,
						"resident_id": residentID,
						"title":       "Test title",
					},
				},
			},
		},
		{
			name: "Missing title",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id":     homeID,
						"resident_id": residentID,
						"description": "Test description",
					},
				},
			},
		},
		{
			name: "Missing home_id",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"title":       "test title",
						"resident_id": residentID,
						"description": "Test description",
					},
				},
			},
		},
		{
			name: "Empty payload",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{},
				},
			},
		},
	}

	for _, test := range testCases {
		t.Run(test.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			b, _ := json.Marshal(test.given.payload)
			req, _ := http.NewRequest("POST", "/business/complaint", bytes.NewBuffer(b))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			r.ServeHTTP(w, req)
			assert.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}

func TestSubmitDailyLogSuccess(t *testing.T) {
	r, token, homeID, residentID := setupBusinessRouterNew()
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode int
		response   bool
	}
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}
	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "Passing all required fields",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id":     homeID,
						"resident_id": residentID,
						"date":        "2026-01-12",
						"shift":       "Night",
						"log_type":    "Test log 28th June",
						"content":     contentData,
						"flags":       []string{"Test one", "Test two", "Test three"},
						"flagged":     true,
					},
				},
			},
			expected: Expected{
				statusCode: http.StatusCreated,
				response:   true,
			},
		},
	}

	for i, test := range testCases {
		t.Logf("Start running test case for Test: %d", i)
		b, _ := json.Marshal(test.given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/daily-log", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		assert.Equal(t, test.expected.statusCode, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "success", resp["status"])
		data := resp["data"].(map[string]interface{})
		assert.Equal(t, test.expected.response, data["flagged"])
		assert.NotEmpty(t, data["id"])
		t.Logf("Test case completed for Test: %d", i)
	}
}

func TestSubmitDailyLogMissingInputs(t *testing.T) {
	r, token, homeID, residentID := setupBusinessRouterNew()
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode int
		response   bool
	}
	contentData := map[string]interface{}{
		"title":          "Urgent Appointment Log",
		"appointment_id": "apt-abc-123",
		"priority_level": 2,
		"notes":          "Standard verification check.",
	}
	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "Missing resident_id",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id": homeID,
						// "resident_id": residentID,
						"date":     "2026-01-12",
						"shift":    "Night",
						"log_type": "Test log",
						"content":  contentData,
						"flags":    []string{"Test one", "Test two", "Test three"},
						"flagged":  true,
					},
				},
			},
			expected: Expected{
				statusCode: http.StatusBadRequest,
				response:   true,
			},
		},
		{
			name: "Missing home_id",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{

						"resident_id": residentID,
						"date":        "2026-01-12",
						"shift":       "Night",
						"log_type":    "Test log",
						"content":     contentData,
						"flags":       []string{"Test one", "Test two", "Test three"},
						"flagged":     true,
					},
				},
			},
			expected: Expected{
				statusCode: http.StatusBadRequest,
				response:   true,
			},
		},
		{
			name: "Missing date",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id":     homeID,
						"resident_id": residentID,
						// "date":        "2026-01-12",
						"shift":    "Night",
						"log_type": "Test log",
						"content":  contentData,
						"flags":    []string{"Test one", "Test two", "Test three"},
						"flagged":  true,
					},
				},
			},
			expected: Expected{
				statusCode: http.StatusBadRequest,
				response:   true,
			},
		},
		{
			name: "Missing shift",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id":     homeID,
						"resident_id": residentID,
						"date":        "2026-01-12",
						// "shift":    "Night",
						"log_type": "Test log",
						"content":  contentData,
						"flags":    []string{"Test one", "Test two", "Test three"},
						"flagged":  true,
					},
				},
			},
			expected: Expected{
				statusCode: http.StatusBadRequest,
				response:   true,
			},
		},

		{
			name: "Empty payload",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{},
				},
			},
			expected: Expected{
				statusCode: http.StatusBadRequest,
				response:   true,
			},
		},
	}

	for i, test := range testCases {
		t.Logf("Start running test case for Test: %d", i)
		b, _ := json.Marshal(test.given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/daily-log", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "error", resp["status"])
		// data := resp["data"].(map[string]interface{})
		// assert.Equal(t, test.expected.response, data["flagged"])
		// assert.NotEmpty(t, data["id"])
		// t.Logf("Test case completed for Test: %d", i)
	}
}

// Tester could add more inputs in this function
func TestSafeGuardingRequestSuccess(t *testing.T) {
	r, token, residentID, homeID := setupBusinessRouterNew()

	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		responseCode int
		response     string
	}

	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "Passing all required fields",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":  residentID,
						"home_id":      homeID,
						"date":         "2016-6-28",
						"concern_type": "Test Concern 28th June 2026",
						"description":  "Test description",
						"action_taken": "Test action",
						"la_reference": "Test reference",
						"notes":        "Test notes",
					},
				},
			},
		},
	}
	for i, test := range testCases {
		t.Logf("Running test case for input %d", i+1)
		b, _ := json.Marshal(test.given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/safeguarding", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "success", resp["status"])
		data := resp["data"].(map[string]interface{})
		assert.Equal(t, "open", data["status"])
		assert.NotEmpty(t, data["id"])
		t.Logf("Completed running test case for input %d", i+1)

	}
}
func TestSafeGuardingInputMissing(t *testing.T) {
	r, token, homeID, residentID := setupBusinessRouterNew()

	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		responseCode int
		response     string
	}

	testCases := []struct {
		name     string
		given    Given
		expected Expected
	}{
		{
			name: "Missing resident_id",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						// "resident_id":  residentID,
						"home_id":      homeID,
						"date":         "Test date",
						"concern_type": "Test Concern",
						"description":  "Test description",
						"action_taken": "Test action",
						"la_reference": "Test reference",
						"notes":        "Test notes",
					},
				},
			},
		},
		{
			name: "Missing home_id",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id": residentID,
						// "home_id":      homeID,
						"date":         "Test date",
						"concern_type": "Test Concern",
						"description":  "Test description",
						"action_taken": "Test action",
						"la_reference": "Test reference",
						"notes":        "Test notes",
					},
				},
			},
		},
		{
			name: "Missing date",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id": residentID,
						"home_id":     homeID,
						// "date":         "Test date",
						"concern_type": "Test Concern",
						"description":  "Test description",
						"action_taken": "Test action",
						"la_reference": "Test reference",
						"notes":        "Test notes",
					},
				},
			},
		},
		{
			name: "Missing concern_type",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id": residentID,
						"home_id":     homeID,
						"date":        "Test date",
						// "concern_type": "Test Concern",
						"description":  "Test description",
						"action_taken": "Test action",
						"la_reference": "Test reference",
						"notes":        "Test notes",
					},
				},
			},
		},
		{
			name: "Missing description",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":  residentID,
						"home_id":      homeID,
						"date":         "Test date",
						"concern_type": "Test Concern",
						// "description":  "Test description",
						"action_taken": "Test action",
						"la_reference": "Test reference",
						"notes":        "Test notes",
					},
				},
			},
		},
	}
	for i, test := range testCases {
		t.Logf("Running test case for input %d", i+1)
		b, _ := json.Marshal(test.given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/safeguarding", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "error", resp["status"])
		t.Logf("Completed running test case for input %d", i+1)

	}
}

func TestGetYPSummarySuccess(t *testing.T) {
	r, token, residentID := setupBusinessRouterNewV2()
	url := fmt.Sprintf("/business/yp-summary/%s", residentID)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetYPSummaryInvalidID(t *testing.T) {
	r, token, _ := setupBusinessRouterNewV2()
	url := fmt.Sprintf("/business/yp-summary/%s", "1121")
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "error", resp["status"])
}

func TestGetYPTimelineSuccess(t *testing.T) {
	r, token, residentID := setupBusinessRouterNewV2()
	url := fmt.Sprintf("/business/yp-timeline/%s", residentID)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

}
func TestGetYPTimelineInvalidID(t *testing.T) {
	r, token, _ := setupBusinessRouterNewV2()

	url := fmt.Sprintf("/business/yp-timeline/%s", "8873")
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "error", response["status"])
}
