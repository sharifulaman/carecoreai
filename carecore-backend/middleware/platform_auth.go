package middleware

import (
	"net/http"
	"strings"

	"carecore-backend/services"

	"github.com/gin-gonic/gin"
)

const PlatformClaimsKey = "platform_claims"

// PlatformAuthRequired guards /api/platform/* routes only. Completely
// separate from AuthRequired — a tenant JWT will never pass this check,
// and a platform JWT will never pass AuthRequired, since the two use
// different validation functions and claim shapes entirely.
func PlatformAuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  gin.H{"code": "UNAUTHORIZED", "message": "Authorization header missing"},
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  gin.H{"code": "UNAUTHORIZED", "message": "Invalid Authorization header format"},
			})
			return
		}

		claims, err := services.ValidatePlatformToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  gin.H{"code": "UNAUTHORIZED", "message": "Invalid or expired platform token"},
			})
			return
		}

		c.Set(PlatformClaimsKey, claims)
		c.Next()
	}
}

func GetPlatformClaims(c *gin.Context) *services.PlatformClaims {
	val, exists := c.Get(PlatformClaimsKey)
	if !exists {
		return nil
	}
	claims, ok := val.(*services.PlatformClaims)
	if !ok {
		return nil
	}
	return claims
}