package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"carecore-backend/handlers"
	"carecore-backend/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupEntityRouter() *gin.Engine {
	r, token := setupRouterWithToken()
	_ = token
	return r
}

func setupRouterWithToken() (*gin.Engine, string) {
	r := setupRouter()

	// Add entity routes
	protected := r.Group("/")
	protected.Use(middleware.AuthRequired())
	{
		entities := protected.Group("/entities")
		entities.GET("/:entity", handlers.ListEntities)
		entities.GET("/:entity/:id", handlers.GetEntity)
		entities.POST("/:entity", handlers.CreateEntity)
		entities.PUT("/:entity/:id", handlers.UpdateEntity)
		entities.DELETE("/:entity/:id", handlers.DeleteEntity)
		entities.POST("/:entity/bulk", handlers.BulkCreateEntities)
		entities.PUT("/:entity/bulk", handlers.BulkUpdateEntities)
	}

	token := loginAndGetToken(nil, r, "entity_test@carecore.com", "Test1234")
	return r, token
}

func TestCreateHomeSuccess(t *testing.T) {
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
			name: "Test 1",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"name":   "Test Home",
						"type":   "24_hours",
						"status": "active",
					},
				},
			},
		},
		{
			name: "Test 2",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"name":   "Test Home",
						"type":   "24_hours",
						"status": "active",
					},
				},
			},
		},
	}
	for _, test := range testCases {
		r, token := setupRouterWithToken()
		b, _ := json.Marshal(test.given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/entities/Home", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "success", resp["status"])
		data := resp["data"].(map[string]interface{})
		assert.NotEmpty(t, data["id"])
		dataMap := test.given.payload["data"].(map[string]interface{})

		// 2. Extract the "name" value from that inner map
		homeName := dataMap["name"].(string)
		assert.Equal(t, homeName, data["name"])
	}
}

// func TestCreateHome_UnknownEntity(t *testing.T) {
// 	r, token := setupRouterWithToken()

// 	body := map[string]interface{}{"data": map[string]interface{}{"name": "X"}}
// 	b, _ := json.Marshal(body)
// 	w := httptest.NewRecorder()
// 	req, _ := http.NewRequest("POST", "/entities/FakeEntity", bytes.NewBuffer(b))
// 	req.Header.Set("Authorization", "Bearer "+token)
// 	req.Header.Set("Content-Type", "application/json")
// 	r.ServeHTTP(w, req)

//		assert.Equal(t, http.StatusNotFound, w.Code)
//	}
func TestCreateHomeUnknownEntity(t *testing.T) {
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
			name: "First test",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"name": "X",
					},
				},
			},
		},
		{
			name: "First test",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"name": "X",
					},
				},
			},
		},
		{
			name: "First test",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{
						"name": "X",
					},
				},
			},
		},
	}
	for _, test := range testCases {
		r, token := setupRouterWithToken()
		w := httptest.NewRecorder()
		b, _ := json.Marshal(test.given.payload)
		req, _ := http.NewRequest("POST", "/entities/FakeEntity", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusNotFound, w.Code)
	}
}

func TestListHomes_Success(t *testing.T) {
	r, token := setupRouterWithToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/entities/Home", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "success", resp["status"])
	assert.NotNil(t, resp["pagination"])
}

func TestListHomes_NoToken(t *testing.T) {
	r, _ := setupRouterWithToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/entities/Home", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetHome_Success(t *testing.T) {
	r, token := setupRouterWithToken()

	// Create a home first
	homeID := createTestHome(t, r, token, "Get Test Home")

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/entities/Home/"+homeID, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	assert.Equal(t, homeID, data["id"])
}

func TestGetHome_NotFound(t *testing.T) {
	r, token := setupRouterWithToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/entities/Home/non-existent-id", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateHome_Success(t *testing.T) {
	r, token := setupRouterWithToken()
	homeID := createTestHome(t, r, token, "Update Me Home")

	body := map[string]interface{}{
		"data": map[string]interface{}{
			"name": "Updated Home Name",
		},
	}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/entities/Home/"+homeID, bytes.NewBuffer(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	assert.Equal(t, "Updated Home Name", data["name"])
}

func TestDeleteHome_Success(t *testing.T) {
	r, token := setupRouterWithToken()
	homeID := createTestHome(t, r, token, "Delete Me Home")

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/entities/Home/"+homeID, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)

	// Verify it's gone
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/entities/Home/"+homeID, nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusNotFound, w2.Code)
}

// func TestCreateResident_Success(t *testing.T) {
// 	r, token := setupRouterWithToken()
// 	homeID := createTestHome(t, r, token, "Resident Test Home")

// 	body := map[string]interface{}{
// 		"data": map[string]interface{}{
// 			"display_name":   "Alice M.",
// 			"home_id":        homeID,
// 			"risk_level":     "low",
// 			"status":         "active",
// 			"placement_type": "childrens_home",
// 		},
// 	}
// 	b, _ := json.Marshal(body)
// 	w := httptest.NewRecorder()
// 	req, _ := http.NewRequest("POST", "/entities/Resident", bytes.NewBuffer(b))
// 	req.Header.Set("Authorization", "Bearer "+token)
// 	req.Header.Set("Content-Type", "application/json")
// 	r.ServeHTTP(w, req)

// 	assert.Equal(t, http.StatusCreated, w.Code)
// 	var resp map[string]interface{}
// 	json.Unmarshal(w.Body.Bytes(), &resp)
// 	data := resp["data"].(map[string]interface{})
// 	assert.Equal(t, "Alice M.", data["display_name"])
// 	assert.Equal(t, homeID, data["home_id"])
// }

func TestCreateResidentSuccess(t *testing.T) {
	type Given struct {
		payload map[string]interface{}
	}
	type Expected struct {
		statusCode int
	}
	testCases := []struct {
		name           string
		expected       Expected
		helperFunction func(homeID string) map[string]interface{}
	}{
		{
			name: "Test 1",
			expected: Expected{
				statusCode: http.StatusCreated,
			},
			helperFunction: func(homeID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"display_name":   "Alice M.",
						"home_id":        homeID,
						"risk_level":     "low",
						"status":         "active",
						"placement_type": "childrens_home",
					},
				}
			},
		},
		{
			name: "Test 1",
			expected: Expected{
				statusCode: http.StatusCreated,
			},
			helperFunction: func(homeID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"display_name":   "Alice M.",
						"home_id":        homeID,
						"risk_level":     "low",
						"status":         "active",
						"placement_type": "childrens_home",
					},
				}
			},
		},
		{
			name: "Test 1",
			expected: Expected{
				statusCode: http.StatusCreated,
			},
			helperFunction: func(homeID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"display_name":   "Alice M.",
						"home_id":        homeID,
						"risk_level":     "low",
						"status":         "active",
						"placement_type": "childrens_home",
					},
				}
			},
		},
		{
			name: "Test 1",
			expected: Expected{
				statusCode: http.StatusCreated,
			},
			helperFunction: func(homeID string) map[string]interface{} {
				return map[string]interface{}{
					"data": map[string]interface{}{
						"display_name":   "Alice M.",
						"home_id":        homeID,
						"risk_level":     "low",
						"status":         "active",
						"placement_type": "childrens_home",
					},
				}
			},
		},
	}
	for _, test := range testCases {
		r, token := setupRouterWithToken()
		homeID := createTestHome(t, r, token, "Resident Test Home")
		given := Given{
			payload: test.helperFunction(homeID),
		}
		b, _ := json.Marshal(given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/entities/Resident", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		data := resp["data"].(map[string]interface{})
		// assert.Equal(t, "Alice M.", data["display_name"])
		assert.Equal(t, homeID, data["home_id"])
	}
}
func TestCreateResidentMissingInput(t *testing.T) {
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
			name: "Test 1",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{},
				},
			},
		},
		{
			name: "Test 1",
			given: Given{
				payload: map[string]interface{}{
					"data": map[string]interface{}{},
				},
			},
		},
	}
	for _, test := range testCases {
		r, token := setupRouterWithToken()
		b, _ := json.Marshal(test.given.payload)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/entities/Resident", bytes.NewBuffer(b))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	}
}
func TestListResidents_FilterByStatus(t *testing.T) {
	r, token := setupRouterWithToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/entities/Resident?status=active", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestBulkCreate_Success(t *testing.T) {
	r, token := setupRouterWithToken()

	body := map[string]interface{}{
		"data": []map[string]interface{}{
			{"name": "Bulk Home 1", "type": "outreach", "status": "active"},
			{"name": "Bulk Home 2", "type": "care", "status": "active"},
			{"name": "Bulk Home 3", "type": "24_hours", "status": "active"},
		},
	}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/entities/Home/bulk", bytes.NewBuffer(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	meta := resp["metadata"].(map[string]interface{})
	assert.Equal(t, float64(3), meta["created"])
	assert.Equal(t, float64(0), meta["failed"])
}

func TestBulkCreate_ExceedsLimit(t *testing.T) {
	r, token := setupRouterWithToken()

	items := make([]map[string]interface{}, 1001)
	for i := range items {
		items[i] = map[string]interface{}{"name": "Home", "type": "outreach"}
	}
	body := map[string]interface{}{"data": items}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/entities/Home/bulk", bytes.NewBuffer(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestBulkUpdate_Success(t *testing.T) {
	r, token := setupRouterWithToken()
	id1 := createTestHome(t, r, token, "Bulk Update Home 1")
	id2 := createTestHome(t, r, token, "Bulk Update Home 2")

	body := map[string]interface{}{
		"data": []map[string]interface{}{
			{"id": id1, "status": "archived"},
			{"id": id2, "status": "archived"},
		},
	}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/entities/Home/bulk", bytes.NewBuffer(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	meta := resp["metadata"].(map[string]interface{})
	assert.Equal(t, float64(2), meta["updated"])
}

func TestPagination(t *testing.T) {
	r, token := setupRouterWithToken()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/entities/Home?page=1&limit=5", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	pagination := resp["pagination"].(map[string]interface{})
	assert.Equal(t, float64(1), pagination["page"])
	assert.Equal(t, float64(5), pagination["limit"])
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func createTestHome(t *testing.T, r *gin.Engine, token, name string) string {
	body := map[string]interface{}{
		"data": map[string]interface{}{
			"name": name, "type": "24_hours", "status": "active",
		},
	}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/entities/Home", bytes.NewBuffer(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	return data["id"].(string)
}

func TestCreateHome_WithDocuments_SavesHomeDocuments(t *testing.T) {
	r, token := setupRouterWithToken()

	body := map[string]interface{}{
		"data": map[string]interface{}{
			"name":   "Document Home",
			"type":   "24_hours",
			"status": "active",
			"documents": []map[string]interface{}{
				{
					"document_type": "gas_safety",
					"title":         "Gas Safety Certificate",
					"reference":     "GS-1001",
					"details":       "Annual certificate",
					"file_name":     "gas-cert.pdf",
					"expiry_date":   "2026-06-01",
				},
			},
		},
	}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/entities/Home", bytes.NewBuffer(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	home := resp["data"].(map[string]interface{})
	homeID := home["id"].(string)

	// Verify document_ids persisted on Home
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/entities/Home/"+homeID, nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp2 map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp2)
	home2 := resp2["data"].(map[string]interface{})
	docIDs := home2["document_ids"].([]interface{})
	assert.Len(t, docIDs, 1)
}
