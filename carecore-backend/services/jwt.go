package services

import (
	"errors"
	"time"

	"carecore-backend/config"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID  string   `json:"user_id"`
	Email   string   `json:"email"`
	OrgID   string   `json:"org_id"`
	Role    string   `json:"role"`
	HomeIDs []string `json:"home_ids"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(userID, email, orgID, role string, homeIDs []string) (string, error) {
	expiry := time.Duration(config.AppConfig.JWTExpiryHours) * time.Hour
	claims := Claims{
		UserID:  userID,
		Email:   email,
		OrgID:   orgID,
		Role:    role,
		HomeIDs: homeIDs,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			Issuer:    "carecore.auth",
			Audience:  []string{"carecore-api"},
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

func ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(config.AppConfig.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}