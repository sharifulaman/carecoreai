package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"carecore-backend/config"
	"carecore-backend/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestCORS(t *testing.T) {
	// Set Gin to Test Mode so it doesn't log spam during testing
	gin.SetMode(gin.TestMode)

	// FIX: Initialize the global config pointer so it isn't nil during independent execution.
	// Note: If your struct name is different from "Config", change it to match your type definition.
	config.AppConfig = &config.Config{
		AllowedOrigins: "https://trustedapp.com",
	}

	// Define our table-driven test cases
	tests := map[string]struct {
		method         string
		incomingOrigin string
		expectedStatus int
		expectCORS     bool
	}{
		"Success - Trusted Origin standard request": {
			method:         "GET",
			incomingOrigin: "https://trustedapp.com",
			expectedStatus: http.StatusOK,
			expectCORS:     true,
		},
		"Success - Preflight OPTIONS request gets 204": {
			method:         "OPTIONS",
			incomingOrigin: "https://trustedapp.com",
			expectedStatus: http.StatusNoContent, // 204
			expectCORS:     true,
		},
		"Failure - Untrusted Origin does not get CORS headers": {
			method:         "GET",
			incomingOrigin: "https://hackerdomain.com",
			expectedStatus: http.StatusOK,
			expectCORS:     false,
		},
	}

	for name, tc := range tests {
		tc := tc // Capture range variable for loop safety
		t.Run(name, func(t *testing.T) {

			// 1. Setup a fresh, minimal Gin router for this subtest
			r := gin.New()
			r.Use(middleware.CORS())

			// Add dummy endpoints to verify execution flow
			r.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "reached_backend"})
			})
			r.OPTIONS("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "reached_backend"})
			})

			// 2. Build the HTTP Request mimicking a browser behavior
			w := httptest.NewRecorder()
			req, err := http.NewRequest(tc.method, "/test", nil)
			assert.NoError(t, err)

			if tc.incomingOrigin != "" {
				req.Header.Set("Origin", tc.incomingOrigin)
			}

			// 3. Execute
			r.ServeHTTP(w, req)

			// 4. Assertions
			assert.Equal(t, tc.expectedStatus, w.Code)

			// Verify general security headers are ALWAYS present regardless of origin validation
			assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
			assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
			assert.Equal(t, "1; mode=block", w.Header().Get("X-XSS-Protection"))

			// Verify dynamic CORS behavior matches expectations
			if tc.expectCORS {
				assert.Equal(t, tc.incomingOrigin, w.Header().Get("Access-Control-Allow-Origin"))
				assert.Equal(t, "GET, POST, PUT, DELETE, PATCH, OPTIONS", w.Header().Get("Access-Control-Allow-Methods"))
				assert.Equal(t, "Content-Type, Authorization", w.Header().Get("Access-Control-Allow-Headers"))
				assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
				assert.Equal(t, "86400", w.Header().Get("Access-Control-Max-Age"))
			} else {
				// If origin isn't allowed, these headers must be completely stripped out
				assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
				assert.Empty(t, w.Header().Get("Access-Control-Allow-Methods"))
				assert.Empty(t, w.Header().Get("Access-Control-Allow-Headers"))
				assert.Empty(t, w.Header().Get("Access-Control-Max-Age"))
			}
		})
	}
}
