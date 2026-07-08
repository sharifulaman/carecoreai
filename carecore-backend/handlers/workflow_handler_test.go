package handlers_test

import (
	"bytes"
	"carecore-backend/handlers"
	"carecore-backend/middleware"
	"carecore-backend/services"
	"carecore-backend/testutils"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func workflowRouterWithAuth() *gin.Engine {
	gin.SetMode(gin.TestMode)
	testutils.SetupTestDB()

	r := gin.Default()
	r.Use(middleware.CORS())
	r.POST("/auth/register", handlers.Register)
	r.POST("/auth/login", handlers.Login)

	protected := r.Group("/")
	protected.Use(middleware.AuthRequired())
	{
		protected.POST("/workflow", handlers.CreateWorkflowItem)
		protected.GET("/workflow/:id", handlers.GetWorkflowItem)
	}

	return r
}

func workflowRouterNoAuth(claims *services.Claims) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		if claims != nil {
			c.Set(middleware.ClaimsKey, claims)
		}
		c.Next()
	})
	r.GET("/workflow/:id", handlers.GetWorkflowItem)
	return r
}

func TestCreateWorkflowItem_NoClaims(t *testing.T) {
	r := workflowRouterWithAuth()
	body := map[string]interface{}{
		"workflow_type": "support_plan",
		"maker_name":    "Test Maker",
	}
	b, err := json.Marshal(body)
	assert.NoError(t, err)
	w := httptest.NewRecorder()
	req, err := http.NewRequest("POST", "/workflow", bytes.NewBuffer(b))
	assert.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestCreateWorkflowItem_ValidationError(t *testing.T) {
	r := workflowRouterWithAuth()
	token := loginAndGetToken(t, r, "admin@test.com", "SafePassword123@")

	body := map[string]interface{}{
		"workflow_type": "support_plan_carecore_ai",
		// maker_name intentionally missing

	}
	b, err := json.Marshal(body)
	assert.NoError(t, err)

	w := httptest.NewRecorder()
	req, err := http.NewRequest("POST", "/workflow", bytes.NewBuffer(b))
	assert.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateWorkflowItem_Success(t *testing.T) {
	r := workflowRouterWithAuth()
	token := loginAndGetToken(t, r, "admin@test.com", "SafePassword123@")

	body := map[string]interface{}{
		"workflow_type": "support_plan",
		"maker_name":    "Test Maker",
		"title":         "Support plan review",
		"description":   "Create a workflow item for a support plan",
	}
	b, err := json.Marshal(body)
	assert.NoError(t, err)

	w := httptest.NewRecorder()
	req, err := http.NewRequest("POST", "/workflow", bytes.NewBuffer(b))
	assert.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "success", resp["status"])

	data := resp["data"].(map[string]interface{})
	assert.Equal(t, "support_plan", data["workflow_type"])
	assert.Equal(t, "Test Maker", data["maker_name"])
	assert.Equal(t, "Support plan review", data["title"])
	assert.Equal(t, "Create a workflow item for a support plan", data["description"])
}

// ----- Codes for GetWorkflowItem ----------
func TestGetWorkflowItemNoClaims(t *testing.T) {
	r := workflowRouterNoAuth(nil)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/workflow/1", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetWorkflowItemNotFound(t *testing.T) {
	// 1. Initialize the middleware
	r := workflowRouterWithAuth()
	token := loginAndGetToken(t, r, "admin@test.com", "SafePassword123@")
	nonExistentID := "11111111-1111-1111-1111-111111111111"

	w := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/workflow/"+nonExistentID, nil)
	assert.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "error", response["status"])
	errObj := response["error"].(map[string]interface{})
	assert.Equal(t, "NOT_FOUND", errObj["code"])
}

func TestGetWorkflowItemSuccess(t *testing.T) {
	r := workflowRouterWithAuth()
	token := loginAndGetToken(t, r, "admin@test.com", "SafePassword123@")
	existingID := "0024201e-a0fc-46b4-a319-7bea4d53e64c"

	w := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/workflow/"+existingID, nil)
	assert.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response["status"])
}
