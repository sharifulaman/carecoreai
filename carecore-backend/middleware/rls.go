// middleware/rls.go
package middleware

import (
	"net/http"

	"carecore-backend/db"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const ScopedDBKey = "scoped_db"

// RLSScope must run AFTER AuthRequired() in the middleware chain, since it
// depends on claims already being set.
func RLSScope() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"},
			})
			return
		}

		tx, err := db.OrgScopedDB(c.Request.Context(), claims.OrgID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error":  gin.H{"code": "INTERNAL_ERROR", "message": "Failed to set tenant context"},
			})
			return
		}

		c.Set(ScopedDBKey, tx)
		c.Next()

		// Commit or rollback based on whether the handler set an error
		if len(c.Errors) > 0 || c.Writer.Status() >= 400 {
			tx.Rollback()
		} else {
			tx.Commit()
		}
	}
}

// GetScopedDB retrieves the RLS-scoped transaction for this request.
// Falls back to the global db.DB if somehow not set (should never happen
// if middleware is wired correctly) — but logs loudly if it does.
func GetScopedDB(c *gin.Context) *gorm.DB {
	val, exists := c.Get(ScopedDBKey)
	if !exists {
		// This should never happen in production if RLSScope() is registered.
		// Fail safe by returning nil so callers can detect and 500 rather than
		// silently querying without org scope.
		return nil
	}
	return val.(*gorm.DB)
}