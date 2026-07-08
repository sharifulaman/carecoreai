package business_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"carecore-backend/testutils"

	"carecore-backend/handlers"
	"carecore-backend/handlers/business"
	"carecore-backend/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupBusinessRouter() (*gin.Engine, string, string, string) {
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
		biz.POST("/visit-report", business.SubmitVisitReport)
		biz.POST("/risk-assessment", business.UpsertRiskAssessment)
		biz.POST("/missing-from-home", business.ReportMissingFromHome)
		biz.POST("/timesheet", business.SubmitTimesheet)
	}

	// Setup: register admin, create home, create resident
	token := registerAndLogin(r, "biz_admin@carecore.com", "Test1234", "admin")
	homeID := createHome(r, token, "Business Test Home")
	residentID := createResident(r, token, homeID, "Test YP")

	return r, token, homeID, residentID
}

func TestSubmitVisitReportSuccess(t *testing.T) {
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}

	testCases := []struct {
		name     string
		expected Expected

		buildPayload func(homeID, residentID string) map[string]interface{}
	}{
		{
			name: "Test Success - Case 1",
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "high",
			},
			buildPayload: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":           residentID,
						"home_id":               homeID,
						"date":                  "2026-05-13",
						"time_start":            "10:00",
						"time_end":              "11:00",
						"duration_minutes":      60,
						"action_text":           "Discussed goals",
						"outcome_text":          "Positive engagement",
						"recommendations_text":  "Continue weekly sessions",
						"is_key_worker_session": true,
					},
				}
			},
		},
		{
			name: "Test Success - Case 2",
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "high",
			},
			buildPayload: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":           residentID,
						"home_id":               homeID,
						"date":                  "2026-05-13",
						"time_start":            "10:00",
						"time_end":              "11:00",
						"duration_minutes":      60,
						"action_text":           "Discussed goals",
						"outcome_text":          "Positive engagement",
						"recommendations_text":  "Continue weekly sessions",
						"is_key_worker_session": true,
					},
				}
			},
		},
	}

	for _, test := range testCases {

		t.Run(test.name, func(t *testing.T) {

			r, token, homeID, residentID := setupBusinessRouter()

			given := Given{
				payload: test.buildPayload(homeID, residentID),
			}

			b, _ := json.Marshal(given.payload)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/business/visit-report", bytes.NewBuffer(b))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			r.ServeHTTP(w, req)

			assert.Equal(t, http.StatusCreated, w.Code)
			var resp map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &resp)
			assert.Equal(t, "success", resp["status"])
			data := resp["data"].(map[string]interface{})
			assert.Equal(t, "submitted", data["status"])
			assert.NotEmpty(t, data["id"])
		})
	}
}

func TestSubmitVisitReportMissingResidentID(t *testing.T) {
	r, token, homeID, _ := setupBusinessRouter()
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
			name: "Test case for success",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"home_id": homeID,
						"date":    "2026-05-13",
					},
				},
			},
			expected: Expected{
				statusCode:     http.StatusBadRequest,
				responseStatus: "401",
			},
		},
	}
	for _, test := range testCases {
		b, _ := json.Marshal(test.given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/visit-report", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		// var resp map[string]interface{}
		// json.Unmarshal(w.Body.Bytes(), &resp)
		// assert.Equal(t, "success", resp["status"])
		// data := resp["data"].(map[string]interface{})
		// assert.Equal(t, "submitted", data["status"])
		// assert.NotEmpty(t, data["id"])
	}
}

func TestCreateRiskAssessmentSuccess(t *testing.T) {
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}

	testCases := []struct {
		name     string
		expected Expected

		buildPayload func(homeID, residentID string) map[string]interface{}
	}{
		{
			name: "Test Success - Case 1",
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "high",
			},
			buildPayload: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":         residentID,
						"home_id":             homeID,
						"category":            "sexual_exploitation",
						"likelihood":          "medium",
						"consequence":         "high",
						"background":          "No known history",
						"triggers":            "Unknown peers",
						"management_strategy": "Supervised outings",
						"protective_factors":  "Strong key worker relationship",
						"yp_consulted":        true,
						"review_date":         "2026-11-01",
					},
				}
			},
		},
		{
			name: "Test Success - Case 2",
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "high",
			},
			buildPayload: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":         residentID,
						"home_id":             homeID,
						"category":            "sexual_exploitation",
						"likelihood":          "medium",
						"consequence":         "high",
						"background":          "No known history ", // noticed your trailing space here
						"triggers":            "Unknown peers",
						"management_strategy": "Supervised outings",
						"protective_factors":  "Strong key worker relationship",
						"yp_consulted":        true,
						"review_date":         "2026-11-01",
					},
				}
			},
		},
	}

	for _, test := range testCases {

		t.Run(test.name, func(t *testing.T) {

			r, token, homeID, residentID := setupBusinessRouter()

			given := Given{
				payload: test.buildPayload(homeID, residentID),
			}

			b, _ := json.Marshal(given.payload)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/business/risk-assessment", bytes.NewBuffer(b))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")

			r.ServeHTTP(w, req)

			// 4. Run your assertions using your Expected struct parameters
			assert.Equal(t, test.expected.statusCode, w.Code)

			var resp map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &resp)

			data := resp["data"].(map[string]interface{})
			assert.Equal(t, test.expected.responseStatus, data["overall_rating"])
		})
	}
}

// Error

func TestCreateRiskAssessment_CriticalRating(t *testing.T) {
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}

	testCases := []struct {
		name     string
		expected Expected

		buildPayload func(homeID, residentID string) map[string]interface{}
	}{
		{
			name: "Test Success - Case 1",
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "critical",
			},
			buildPayload: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id": residentID,
						"home_id":     homeID,
						"category":    "violence",
						"likelihood":  "high",
						"consequence": "critical",
					},
				}
			},
		},
		{
			name: "Test Success - Case 2",
			expected: Expected{
				statusCode:     http.StatusCreated,
				responseStatus: "critical",
			},
			buildPayload: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id": residentID,
						"home_id":     homeID,
						"category":    "violence",
						"likelihood":  "high",
						"consequence": "critical",
					},
				}
			},
		},
	}

	for _, test := range testCases {

		t.Run(test.name, func(t *testing.T) {

			r, token, homeID, residentID := setupBusinessRouter()

			given := Given{
				payload: test.buildPayload(homeID, residentID),
			}

			b, _ := json.Marshal(given.payload)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/business/risk-assessment", bytes.NewBuffer(b))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			r.ServeHTTP(w, req)

			assert.Equal(t, http.StatusCreated, w.Code)
			var resp map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &resp)
			data := resp["data"].(map[string]interface{})
			assert.Equal(t, "critical", data["overall_rating"])
		})
	}
}

// func TestReportMissingFromHome_Success(t *testing.T) {
// 	r, token, homeID, residentID := setupBusinessRouter()

// 	body := map[string]interface{}{
// 		"data": map[string]interface{}{
// 			"resident_id":               residentID,
// 			"home_id":                   homeID,
// 			"reported_missing_datetime": "2026-05-13T18:00:00Z",
// 			"last_seen_datetime":        "2026-05-13T17:30:00Z",
// 			"last_seen_location":        "Home",
// 			"known_risks":               "Low risk",
// 			"likely_location":           "Friend's house",
// 			"police_notified":           false,
// 		},
// 	}
// 	b, _ := json.Marshal(body)
// 	w := httptest.NewRecorder()
// 	req, _ := http.NewRequest("POST", "/business/missing-from-home", bytes.NewBuffer(b))
// 	req.Header.Set("Authorization", "Bearer "+token)
// 	req.Header.Set("Content-Type", "application/json")
// 	r.ServeHTTP(w, req)

//		assert.Equal(t, http.StatusCreated, w.Code)
//		var resp map[string]interface{}
//		json.Unmarshal(w.Body.Bytes(), &resp)
//		data := resp["data"].(map[string]interface{})
//		assert.Equal(t, "active", data["status"])
//		assert.Equal(t, true, data["alerts_sent"])
//	}
func TestReportMissingFromHomeSuccess(t *testing.T) {
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}
	testCases := []struct {
		name           string
		expected       Expected
		helperFunction func(homeID, residentID string) map[string]interface{}
	}{
		{
			name: "Test case 1",
			expected: Expected{
				statusCode: http.StatusCreated,
			},
			helperFunction: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":               residentID,
						"home_id":                   homeID,
						"reported_missing_datetime": "2026-05-13T18:00:00Z",
						"last_seen_datetime":        "2026-05-13T17:30:00Z",
						"last_seen_location":        "Home",
						"known_risks":               "Low risk",
						"likely_location":           "Friend's house",
						"police_notified":           false,
					},
				}
			},
		},
		{
			name: "Test case 1",
			expected: Expected{
				statusCode: http.StatusCreated,
			},
			helperFunction: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"resident_id":               residentID,
						"home_id":                   homeID,
						"reported_missing_datetime": "2026-05-13T18:00:00Z",
						"last_seen_datetime":        "2026-05-13T17:30:00Z",
						"last_seen_location":        "Home",
						"known_risks":               "Low risk",
						"likely_location":           "Friend's house",
						"police_notified":           false,
					},
				}
			},
		},
	}
	for _, test := range testCases {
		r, token, homeID, residentID := setupBusinessRouter()
		given := Given{
			payload: test.helperFunction(homeID, residentID),
		}
		b, _ := json.Marshal(given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/missing-from-home", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		data := resp["data"].(map[string]interface{})
		assert.Equal(t, "active", data["status"])
		assert.Equal(t, true, data["alerts_sent"])
	}
}

// func TestReportMissingFromHome_MissingFields(t *testing.T) {
// 	r, token, _, _ := setupBusinessRouter()

// 	body := map[string]interface{}{
// 		"data": map[string]interface{}{
// 			// missing resident_id, home_id, reported_missing_datetime
// 		},
// 	}
// 	b, _ := json.Marshal(body)
// 	w := httptest.NewRecorder()
// 	req, _ := http.NewRequest("POST", "/business/missing-from-home", bytes.NewBuffer(b))
// 	req.Header.Set("Authorization", "Bearer "+token)
// 	req.Header.Set("Content-Type", "application/json")
// 	r.ServeHTTP(w, req)

//		assert.Equal(t, http.StatusBadRequest, w.Code)
//	}
func TestReportMissingFromHome_MissingFields(t *testing.T) {
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}
	testCases := []struct {
		name           string
		expected       Expected
		helperFunction func(homeID, residentID string) map[string]interface{}
	}{
		{
			name: "Test case 1",
			expected: Expected{
				statusCode: http.StatusBadRequest,
			},
			helperFunction: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						// "resident_id":               residentID,
						// "home_id":                   homeID,
						// "reported_missing_datetime": "2026-05-13T18:00:00Z",
						// "last_seen_datetime":        "2026-05-13T17:30:00Z",
						// "last_seen_location":        "Home",
						// "known_risks":               "Low risk",
						// "likely_location":           "Friend's house",
						// "police_notified":           false,
					},
				}
			},
		},
		{
			name: "Test case 2",
			expected: Expected{
				statusCode: http.StatusBadRequest,
			},
			helperFunction: func(homeID, residentID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						// "resident_id":               residentID,
						// "home_id":                   homeID,
						// "reported_missing_datetime": "2026-05-13T18:00:00Z",
						// "last_seen_datetime":        "2026-05-13T17:30:00Z",
						// "last_seen_location":        "Home",
						// "known_risks":               "Low risk",
						// "likely_location":           "Friend's house",
						// "police_notified":           false,
					},
				}
			},
		},
	}
	for _, test := range testCases {
		r, token, homeID, residentID := setupBusinessRouter()
		given := Given{
			payload: test.helperFunction(homeID, residentID),
		}
		b, _ := json.Marshal(given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/missing-from-home", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	}
}

// func TestSubmitTimesheet_Success(t *testing.T) {
// 	r, token, _, _ := setupBusinessRouter()
// 	staffID := getStaffID(r, token)

// 	body := map[string]interface{}{
// 		"data": map[string]interface{}{
// 			"staff_id":           staffID,
// 			"period_start":       "2026-05-01",
// 			"period_end":         "2026-05-31",
// 			"total_actual_hours": 160.0,
// 			"shifts":             []interface{}{},
// 		},
// 	}
// 	b, _ := json.Marshal(body)
// 	w := httptest.NewRecorder()
// 	req, _ := http.NewRequest("POST", "/business/timesheet", bytes.NewBuffer(b))
// 	req.Header.Set("Authorization", "Bearer "+token)
// 	req.Header.Set("Content-Type", "application/json")
// 	r.ServeHTTP(w, req)

// 	assert.Equal(t, http.StatusCreated, w.Code)
// 	var resp map[string]interface{}
// 	json.Unmarshal(w.Body.Bytes(), &resp)
// 	data := resp["data"].(map[string]interface{})
// 	assert.Equal(t, float64(160), data["total_hours"])
// 	assert.Equal(t, float64(3200), data["calculated_gross_pay"]) // 160 * 20
// }

func TestSubmitTimeSheetSuccess(t *testing.T) {
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode     int
		responseStatus string
	}

	testCases := []struct {
		name           string
		expected       Expected
		helperFunction func(staffID string) map[string]interface{}
	}{
		{
			name: "Test 1",
			expected: Expected{
				statusCode: http.StatusCreated,
			},
			helperFunction: func(staffID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"staff_id":           staffID,
						"period_start":       "2026-05-01",
						"period_end":         "2026-05-31",
						"total_actual_hours": 160.0,
						"shifts":             []interface{}{},
					},
				}
			},
		},
		{
			name: "Test 2",
			expected: Expected{
				statusCode: http.StatusCreated,
			},
			helperFunction: func(staffID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"staff_id":           staffID,
						"period_start":       "2026-05-01",
						"period_end":         "2026-05-31",
						"total_actual_hours": 160.0,
						"shifts":             []interface{}{},
					},
				}
			},
		},
	}
	for _, test := range testCases {
		r, token, _, _ := setupBusinessRouter()
		staffID := getStaffID(r, token)
		given := Given{
			payload: test.helperFunction(staffID),
		}
		b, _ := json.Marshal(given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/business/timesheet", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		data := resp["data"].(map[string]interface{})
		assert.Equal(t, float64(160), data["total_hours"])
		assert.Equal(t, float64(3200), data["calculated_gross_pay"]) // 160 * 20
	}
}

// ── Test helpers ─────────────────────────────────────────────────────────────

func registerAndLogin(r *gin.Engine, email, password, role string) string {
	regBody, _ := json.Marshal(map[string]interface{}{
		"email": email, "password": password,
		"full_name": "Test User", "role": role,
	})
	wr := httptest.NewRecorder()
	rr, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(regBody))
	rr.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wr, rr)

	loginBody, _ := json.Marshal(map[string]interface{}{
		"email": email, "password": password,
	})
	wl := httptest.NewRecorder()
	rl, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(loginBody))
	rl.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wl, rl)

	var resp map[string]interface{}
	json.Unmarshal(wl.Body.Bytes(), &resp)
	return resp["data"].(map[string]interface{})["access_token"].(string)
}

func createHome(r *gin.Engine, token, name string) string {
	body, _ := json.Marshal(map[string]interface{}{
		"data": map[string]interface{}{
			"name":   name,
			"type":   "24_hours",
			"status": "active",
		},
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/entities/Home", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	// Safety check before accessing data
	if w.Code != http.StatusCreated {
		panic("createHome failed with status " + strconv.Itoa(w.Code) + ": " + w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	data, ok := resp["data"].(map[string]interface{})
	if !ok || data == nil {
		panic("createHome: response data is nil — " + w.Body.String())
	}

	return data["id"].(string)
}

func createResident(r *gin.Engine, token, homeID, name string) string {
	body, _ := json.Marshal(map[string]interface{}{
		"data": map[string]interface{}{
			"display_name": name,
			"home_id":      homeID,
			"risk_level":   "low",
			"status":       "active",
		},
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/entities/Resident", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		panic("createResident failed with status " + strconv.Itoa(w.Code) + ": " + w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	data, ok := resp["data"].(map[string]interface{})
	if !ok || data == nil {
		panic("createResident: response data is nil — " + w.Body.String())
	}

	return data["id"].(string)
}

func getStaffID(r *gin.Engine, token string) string {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		panic("getStaffID failed with status " + strconv.Itoa(w.Code) + ": " + w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	data, ok := resp["data"].(map[string]interface{})
	if !ok || data == nil {
		panic("getStaffID: response data is nil — " + w.Body.String())
	}

	id, ok := data["id"].(string)
	if !ok || id == "" {
		panic("getStaffID: id field missing in response — " + w.Body.String())
	}

	return id
}
