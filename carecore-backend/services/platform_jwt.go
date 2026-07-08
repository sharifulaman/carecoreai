// services/platform_jwt.go
package services

import (
	"errors"
	"time"

	"carecore-backend/config"

	"github.com/golang-jwt/jwt/v5"
)

// PlatformClaims deliberately has NO org_id and NO tenant role — this
// token only ever authorizes /api/platform/* routes. It cannot be
// confused with a tenant Claims token because ValidatePlatformToken
// and ValidateToken are entirely separate functions with different
// expected claim shapes.
type PlatformClaims struct {
	AdminID string `json:"admin_id"`
	Email   string `json:"email"`
	jwt.RegisteredClaims
}

func GeneratePlatformAccessToken(adminID, email string) (string, error) {
	expiry := time.Duration(config.AppConfig.JWTExpiryHours) * time.Hour
	claims := PlatformClaims{
		AdminID: adminID,
		Email:   email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   adminID,
			Issuer:    "carecore-platform", // distinct issuer from tenant tokens
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

func ValidatePlatformToken(tokenString string) (*PlatformClaims, error) {
	claims := &PlatformClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired platform token")
	}
	if claims.Issuer != "carecore-platform" {
		return nil, errors.New("not a platform token")
	}
	return claims, nil
}