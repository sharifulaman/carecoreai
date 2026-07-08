package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"carecore-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// seedTestCache pre-populates the permission cache with a fixed TTL so tests
// never need a real database connection.
func seedTestCache(orgID, role string, levels map[string]string) {
	permCache.Store(orgID+":"+role, permCacheEntry{
		levels: levels,
		expiry: time.Now().Add(time.Hour),
	})
}

// claimsRouter builds a minimal Gin router that injects claims without JWT
// validation, letting tests exercise middleware without a running server.
func claimsRouter(claims *services.Claims) *gin.Engine {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(ClaimsKey, claims)
		c.Next()
	})
	return r
}

// ── levelRank & minRankForMethod ─────────────────────────────────────────────

func TestLevelRankOrdering(t *testing.T) {
	assert.Equal(t, 0, levelRank["None"])
	assert.Equal(t, 1, levelRank["View"])
	assert.Equal(t, 2, levelRank["Edit"])
	assert.Equal(t, 3, levelRank["Approve"])
	assert.Equal(t, 4, levelRank["Admin"])

	assert.Less(t, levelRank["None"], levelRank["View"])
	assert.Less(t, levelRank["View"], levelRank["Edit"])
	assert.Less(t, levelRank["Edit"], levelRank["Approve"])
	assert.Less(t, levelRank["Approve"], levelRank["Admin"])
}

func TestMinRankForMethod(t *testing.T) {
	assert.Equal(t, levelRank["View"], minRankForMethod(http.MethodGet), "GET needs View")
	assert.Equal(t, levelRank["Edit"], minRankForMethod(http.MethodPost), "POST needs Edit")
	assert.Equal(t, levelRank["Edit"], minRankForMethod(http.MethodPut), "PUT needs Edit")
	assert.Equal(t, levelRank["Edit"], minRankForMethod(http.MethodPatch), "PATCH needs Edit")
	assert.Equal(t, levelRank["Admin"], minRankForMethod(http.MethodDelete), "DELETE needs Admin")
	assert.Equal(t, levelRank["View"], minRankForMethod("UNKNOWN"), "unknown method defaults to View")
}

// ── parseModuleLevels ────────────────────────────────────────────────────────

func TestParseModuleLevels(t *testing.T) {
	t.Run("nil input", func(t *testing.T) {
		assert.Nil(t, parseModuleLevels(nil))
	})
	t.Run("empty array", func(t *testing.T) {
		assert.Nil(t, parseModuleLevels([]byte(`[]`)))
	})
	t.Run("current format with levels", func(t *testing.T) {
		raw := `[{"key":"residents","level":"View"},{"key":"homes","level":"Edit"},{"key":"finance","level":"Admin"}]`
		m := parseModuleLevels([]byte(raw))
		assert.Equal(t, "View", m["residents"])
		assert.Equal(t, "Edit", m["homes"])
		assert.Equal(t, "Admin", m["finance"])
	})
	t.Run("legacy string array defaults to Edit", func(t *testing.T) {
		raw := `["staff","finance","hr"]`
		m := parseModuleLevels([]byte(raw))
		assert.Equal(t, "Edit", m["staff"])
		assert.Equal(t, "Edit", m["finance"])
		assert.Equal(t, "Edit", m["hr"])
	})
	t.Run("current format missing level defaults to Edit", func(t *testing.T) {
		raw := `[{"key":"residents"}]`
		m := parseModuleLevels([]byte(raw))
		assert.Equal(t, "Edit", m["residents"])
	})
	t.Run("invalid JSON returns nil", func(t *testing.T) {
		assert.Nil(t, parseModuleLevels([]byte(`{not json}`)))
	})
}

// ── RequireModuleLevel — 5 levels × min-level matrix ────────────────────────

func TestRequireModuleLevel_Matrix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const orgID = "org-matrix"

	tests := []struct {
		userLevel string
		minLevel  string
		wantAllow bool
	}{
		// min=View: only None is blocked
		{"None", "View", false},
		{"View", "View", true},
		{"Edit", "View", true},
		{"Approve", "View", true},
		{"Admin", "View", true},
		// min=Edit: None and View are blocked
		{"None", "Edit", false},
		{"View", "Edit", false},
		{"Edit", "Edit", true},
		{"Approve", "Edit", true},
		{"Admin", "Edit", true},
		// min=Approve: only Approve and Admin pass
		{"None", "Approve", false},
		{"View", "Approve", false},
		{"Edit", "Approve", false},
		{"Approve", "Approve", true},
		{"Admin", "Approve", true},
		// min=Admin: only Admin passes
		{"None", "Admin", false},
		{"View", "Admin", false},
		{"Edit", "Admin", false},
		{"Approve", "Admin", false},
		{"Admin", "Admin", true},
	}

	for _, tc := range tests {
		tc := tc
		name := fmt.Sprintf("level=%s,min=%s", tc.userLevel, tc.minLevel)
		t.Run(name, func(t *testing.T) {
			role := "role_" + tc.userLevel + "_" + tc.minLevel
			seedTestCache(orgID, role, map[string]string{"residents": tc.userLevel})

			r := claimsRouter(&services.Claims{OrgID: orgID, Role: role})
			r.GET("/test", RequireModuleLevel("residents", tc.minLevel), func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest(http.MethodGet, "/test", nil)
			r.ServeHTTP(w, req)

			if tc.wantAllow {
				assert.Equal(t, http.StatusOK, w.Code, name)
			} else {
				assert.Equal(t, http.StatusForbidden, w.Code, name)
			}
		})
	}
}

// ── RequireModuleAccess — 5 levels × HTTP method matrix ──────────────────────

func TestRequireModuleAccess_MethodMatrix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const orgID = "org-method"

	tests := []struct {
		level     string
		method    string
		wantAllow bool
	}{
		// GET requires View (rank 1)
		{"None", http.MethodGet, false},
		{"View", http.MethodGet, true},
		{"Edit", http.MethodGet, true},
		{"Approve", http.MethodGet, true},
		{"Admin", http.MethodGet, true},
		// POST requires Edit (rank 2)
		{"None", http.MethodPost, false},
		{"View", http.MethodPost, false},
		{"Edit", http.MethodPost, true},
		{"Approve", http.MethodPost, true},
		{"Admin", http.MethodPost, true},
		// PUT requires Edit (rank 2)
		{"None", http.MethodPut, false},
		{"View", http.MethodPut, false},
		{"Edit", http.MethodPut, true},
		{"Approve", http.MethodPut, true},
		{"Admin", http.MethodPut, true},
		// PATCH requires Edit (rank 2)
		{"None", http.MethodPatch, false},
		{"View", http.MethodPatch, false},
		{"Edit", http.MethodPatch, true},
		{"Approve", http.MethodPatch, true},
		{"Admin", http.MethodPatch, true},
		// DELETE requires Admin (rank 4)
		{"None", http.MethodDelete, false},
		{"View", http.MethodDelete, false},
		{"Edit", http.MethodDelete, false},
		{"Approve", http.MethodDelete, false},
		{"Admin", http.MethodDelete, true},
	}

	for _, tc := range tests {
		tc := tc
		name := fmt.Sprintf("level=%s,method=%s", tc.level, tc.method)
		t.Run(name, func(t *testing.T) {
			role := "role_" + tc.level + "_" + tc.method
			seedTestCache(orgID, role, map[string]string{"residents": tc.level})

			r := claimsRouter(&services.Claims{OrgID: orgID, Role: role})
			r.Any("/entities/:entity", RequireModuleAccess(), func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest(tc.method, "/entities/Resident", nil)
			r.ServeHTTP(w, req)

			if tc.wantAllow {
				assert.Equal(t, http.StatusOK, w.Code, name)
			} else {
				assert.Equal(t, http.StatusForbidden, w.Code, name)
			}
		})
	}
}

// ── Special cases ────────────────────────────────────────────────────────────

func TestRequireModuleAccess_AdminBypass(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Admin role must pass even if no RolePermission record exists.
	r := claimsRouter(&services.Claims{OrgID: "org-1", Role: "admin"})
	r.DELETE("/entities/:entity", RequireModuleAccess(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/entities/Resident", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireModuleAccess_NilLevels_PassThrough(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const orgID = "org-nil"
	const role = "role_no_record"

	// No cache entry — getModuleLevels will query the DB which returns not found,
	// so levels == nil, which is the backward-compatible pass-through.
	// We seed nil explicitly to simulate this without a real DB.
	permCache.Store(orgID+":"+role, permCacheEntry{levels: nil, expiry: time.Now().Add(time.Hour)})

	r := claimsRouter(&services.Claims{OrgID: orgID, Role: role})
	r.DELETE("/entities/:entity", RequireModuleAccess(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/entities/Resident", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code, "no RolePermission record → no restriction")
}

func TestRequireModuleAccess_UnknownEntity_PassThrough(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const orgID = "org-unk"
	const role = "role_unk"
	seedTestCache(orgID, role, map[string]string{"residents": "View"})

	r := claimsRouter(&services.Claims{OrgID: orgID, Role: role})
	r.POST("/entities/:entity", RequireModuleAccess(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	// "UnknownThing" is not in entityModuleMap → no restriction
	req, _ := http.NewRequest(http.MethodPost, "/entities/UnknownThing", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code, "entity not in entityModuleMap → no restriction")
}

// ── Error response shape ─────────────────────────────────────────────────────

func TestModuleError_NoDetailsLeaked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const orgID = "org-err"
	const role = "role_view"
	seedTestCache(orgID, role, map[string]string{"residents": "View"})

	r := claimsRouter(&services.Claims{OrgID: orgID, Role: role})
	r.POST("/entities/:entity", RequireModuleAccess(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/entities/Resident", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var body map[string]interface{}
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))

	errObj, _ := body["error"].(map[string]interface{})
	assert.Equal(t, "MODULE_INSUFFICIENT_LEVEL", errObj["code"])
	assert.NotEmpty(t, errObj["message"])
	// Confirm internal details are not present in the response.
	assert.Nil(t, errObj["details"], "details field must not leak module/role/level info")
}

func TestModuleError_ForbiddenCode_WhenNoneLevel(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const orgID = "org-none"
	const role = "role_none_level"
	seedTestCache(orgID, role, map[string]string{"residents": "None"})

	r := claimsRouter(&services.Claims{OrgID: orgID, Role: role})
	r.GET("/entities/:entity", RequireModuleAccess(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/entities/Resident", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	var body map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &body)
	errObj, _ := body["error"].(map[string]interface{})
	assert.Equal(t, "MODULE_FORBIDDEN", errObj["code"], "None level → MODULE_FORBIDDEN, not MODULE_INSUFFICIENT_LEVEL")
}

// ── EnforceEntityPermission ──────────────────────────────────────────────────

func TestEnforceEntityPermission(t *testing.T) {
	const orgID = "org-enforce"

	tests := []struct {
		level     string
		method    string
		wantAllow bool
	}{
		{"View", http.MethodGet, true},
		{"View", http.MethodPost, false},
		{"Edit", http.MethodPost, true},
		{"Edit", http.MethodDelete, false},
		{"Admin", http.MethodDelete, true},
	}

	for _, tc := range tests {
		tc := tc
		name := fmt.Sprintf("level=%s,method=%s", tc.level, tc.method)
		t.Run(name, func(t *testing.T) {
			role := "enforce_" + tc.level + "_" + tc.method
			seedTestCache(orgID, role, map[string]string{"residents": tc.level})

			claims := &services.Claims{OrgID: orgID, Role: role}
			status, errBody, allowed := EnforceEntityPermission(claims, "Resident", tc.method)

			assert.Equal(t, tc.wantAllow, allowed, name)
			if tc.wantAllow {
				assert.Equal(t, 0, status)
				assert.Nil(t, errBody)
			} else {
				assert.Equal(t, http.StatusForbidden, status)
				assert.NotNil(t, errBody)
			}
		})
	}
}

func TestEnforceEntityPermission_AdminBypass(t *testing.T) {
	claims := &services.Claims{OrgID: "org-1", Role: "admin"}
	status, errBody, allowed := EnforceEntityPermission(claims, "Resident", http.MethodDelete)
	assert.True(t, allowed)
	assert.Equal(t, 0, status)
	assert.Nil(t, errBody)
}
