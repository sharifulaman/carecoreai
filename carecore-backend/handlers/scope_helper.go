// handlers/scope_helper.go
package handlers

import (
    "net/http"

    "carecore-backend/middleware"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

// mustScopedDB retrieves the RLS-scoped DB for this request, or writes the
// standard error response and returns ok=false if it's missing.
// Every handler should call this as its first line instead of repeating
// the nil-check boilerplate.

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