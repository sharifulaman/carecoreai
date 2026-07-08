// handlers/business/scope_helper.go
package business

import (
    "net/http"

    "carecore-backend/middleware"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

func mustScopedDB(c *gin.Context) (*gorm.DB, bool) {
    scopedDB := middleware.GetScopedDB(c)
    if scopedDB == nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "status": "error",
            "error":  gin.H{"code": "INTERNAL_ERROR", "message": "Tenant context not set"},
        })
        return nil, false
    }
    return scopedDB, true
}