package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"carecore-backend/db"
	"carecore-backend/handlers"
	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/testutils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	testutils.SetupTestDB()

	// Clean up stale test users to ensure robust test execution
	testEmails := []string{
		"test_register@carecore.com",
		"duplicate@carecore.com",
		"login_test@carecore.com",
		"me_test@carecore.com",
		"refresh_test@carecore.com",
	}
	for _, email := range testEmails {
		db.DB.Unscoped().Where("email = ?", email).Delete(&models.AuthUser{})
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	r.POST("/auth/register", handlers.Register)
	r.POST("/auth/login", handlers.Login)
	r.POST("/auth/refresh", handlers.RefreshToken)

	protected := r.Group("/")
	protected.Use(middleware.AuthRequired())
	{
		protected.GET("/auth/me", handlers.GetMe)
		protected.PUT("/auth/me", handlers.UpdateMe)
	}
	return r
}


func TestRegister_Success(t *testing.T) {
	r := setupRouter()

	body := map[string]interface{}{
		"email":     "test_register@carecore.com",
		"password":  "Test1234",
		"full_name": "Test User",
		"role":      "support_worker",
	}
	b, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "success", resp["status"])
	assert.NotNil(t, resp["data"])
}

func TestRegister_DuplicateEmail(t *testing.T) {
	r := setupRouter()

	body := map[string]interface{}{
		"email":     "duplicate@carecore.com",
		"password":  "Test1234",
		"full_name": "Dup User",
		"role":      "support_worker",
	}
	b, _ := json.Marshal(body)

	// First registration
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(b))
	req1.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w1, req1)

	// Second registration with same email
	w2 := httptest.NewRecorder()
	b2, _ := json.Marshal(body)
	req2, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(b2))
	req2.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusConflict, w2.Code)
}

func TestRegister_MissingFields(t *testing.T) {
	r := setupRouter()

	body := map[string]interface{}{
		"email": "incomplete@carecore.com",
		// missing password and full_name
	}
	b, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestLogin_Success(t *testing.T) {
	r := setupRouter()

	// Register first
	regBody := map[string]interface{}{
		"email":     "login_test@carecore.com",
		"password":  "Test1234",
		"full_name": "Login Tester",
		"role":      "admin",
	}
	rb, _ := json.Marshal(regBody)
	wr := httptest.NewRecorder()
	rr, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(rb))
	rr.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wr, rr)

	// Now login
	loginBody := map[string]interface{}{
		"email":    "login_test@carecore.com",
		"password": "Test1234",
	}
	lb, _ := json.Marshal(loginBody)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(lb))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	assert.NotEmpty(t, data["access_token"])
	assert.NotEmpty(t, data["refresh_token"])
}

func TestLogin_WrongPassword(t *testing.T) {
	r := setupRouter()

	body := map[string]interface{}{
		"email":    "login_test@carecore.com",
		"password": "WrongPassword",
	}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestLogin_NonExistentEmail(t *testing.T) {
	r := setupRouter()

	body := map[string]interface{}{
		"email":    "nobody@carecore.com",
		"password": "Test1234",
	}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetMe_WithValidToken(t *testing.T) {
	r := setupRouter()
	token := loginAndGetToken(t, r, "me_test@carecore.com", "Test1234")

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetMe_NoToken(t *testing.T) {
	r := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/auth/me", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetMe_InvalidToken(t *testing.T) {
	r := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer invalidtoken123")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRefreshToken_Success(t *testing.T) {
	r := setupRouter()
	_, refreshToken := loginAndGetBothTokens(t, r, "refresh_test@carecore.com", "Test1234")

	body := map[string]interface{}{"refresh_token": refreshToken}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/auth/refresh", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	assert.NotEmpty(t, data["access_token"])
}

func TestRefreshToken_InvalidToken(t *testing.T) {
	r := setupRouter()

	body := map[string]interface{}{"refresh_token": "fake-refresh-token"}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/auth/refresh", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func loginAndGetToken(t *testing.T, r *gin.Engine, email, password string) string {
	access, _ := loginAndGetBothTokens(t, r, email, password)
	return access
}

func loginAndGetBothTokens(t *testing.T, r *gin.Engine, email, password string) (string, string) {
	// Register
	regBody := map[string]interface{}{
		"email": email, "password": password,
		"full_name": "Test User", "role": "admin",
	}
	rb, _ := json.Marshal(regBody)
	wr := httptest.NewRecorder()
	rr, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(rb))
	rr.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wr, rr)

	// Login
	lb, _ := json.Marshal(map[string]interface{}{"email": email, "password": password})
	wl := httptest.NewRecorder()
	rl, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(lb))
	rl.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wl, rl)

	var resp map[string]interface{}
	json.Unmarshal(wl.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	return data["access_token"].(string), data["refresh_token"].(string)
}