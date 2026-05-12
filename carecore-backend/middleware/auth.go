package middleware

import (
	"net/http"
	"strings"

	"carecore-backend/services"

	"github.com/gin-gonic/gin"
)

const (
	ClaimsKey = "claims"
)

func AuthRequired() gin.HandlerFunc {
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

		claims, err := services.ValidateToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  gin.H{"code": "UNAUTHORIZED", "message": "Invalid or expired token"},
			})
			return
		}

		c.Set(ClaimsKey, claims)
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  gin.H{"code": "UNAUTHORIZED", "message": "Not authenticated"},
			})
			return
		}
		for _, r := range roles {
			if claims.Role == r {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"status": "error",
			"error": gin.H{
				"code":          "FORBIDDEN",
				"message":       "You do not have permission to access this resource",
				"details":       gin.H{"required_roles": roles, "user_role": claims.Role},
			},
		})
	}
}

func GetClaims(c *gin.Context) *services.Claims {
	val, exists := c.Get(ClaimsKey)
	if !exists {
		return nil
	}
	claims, ok := val.(*services.Claims)
	if !ok {
		return nil
	}
	return claims
}