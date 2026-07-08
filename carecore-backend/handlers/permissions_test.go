package handlers_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"carecore-backend/db"
	"carecore-backend/handlers"
	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"
	"carecore-backend/testutils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/datatypes"
)

func permissionsRouter(claims *services.Claims) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		if claims != nil {
			c.Set(middleware.ClaimsKey, claims)
		}
		c.Next()
	})
	r.GET("/my-permissions", handlers.GetMyPermissions)
	return r
}

func TestGetMyPermissions_NoClaims(t *testing.T) {
	r := permissionsRouter(nil)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/my-permissions", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetMyPermissions_NoRecord_ReturnsNull(t *testing.T) {
	testutils.SetupTestDB()

	orgID := "org-perm-test-2"
	role := "support_worker"

	db.DB.Where("org_id = ? AND role_name = ?", orgID, role).Delete(&models.RolePermission{})

	r := permissionsRouter(&services.Claims{
		OrgID: orgID,
		Role:  role,
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/my-permissions", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)

	assert.Equal(t, "success", resp["status"])
	assert.Nil(t, resp["data"])

}

func TestGetMyPermissions_Success(t *testing.T) {
	testutils.SetupTestDB()

	orgID := "org-perm-test"
	role := "admin_manager"

	db.DB.Where("org_id = ? AND role_name = ?", orgID, role).Delete(&models.RolePermission{})

	record := models.RolePermission{
		Base:           models.Base{OrgID: orgID},
		RoleName:       role,
		EnabledModules: datatypes.JSON([]byte(`[{"key":"admin_mgmt","level":"Edit"}]`)),
	}
	err := db.DB.Create(&record).Error
	assert.NoError(t, err)

	r := permissionsRouter(&services.Claims{
		OrgID: orgID,
		Role:  role,
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/my-permissions", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)

	assert.Equal(t, "success", resp["status"])
	data := resp["data"].(map[string]interface{})
	assert.Equal(t, role, data["role_name"])
}
