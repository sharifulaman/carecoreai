package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost                string
	DBPort                string
	DBUser                string
	DBPassword            string
	DBName                string
	JWTSecret             string
	JWTExpiryHours        int
	RefreshTokenExpiryDays int
	AppPort               string
	OrgID                 string
	AllowedOrigins        string
}

var AppConfig *Config

func Load() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, reading from environment")
	}

	jwtExpiry, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "8"))
	refreshExpiry, _ := strconv.Atoi(getEnv("REFRESH_TOKEN_EXPIRY_DAYS", "30"))

	AppConfig = &Config{
		DBHost:                 getEnv("DB_HOST", "localhost"),
		DBPort:                 getEnv("DB_PORT", "5432"),
		DBUser:                 getEnv("DB_USER", "postgres"),
		DBPassword:             getEnv("DB_PASSWORD", ""),
		DBName:                 getEnv("DB_NAME", "carecore"),
		JWTSecret:              getEnv("JWT_SECRET", "secret"),
		JWTExpiryHours:         jwtExpiry,
		RefreshTokenExpiryDays: refreshExpiry,
		AppPort:                getEnv("APP_PORT", "8080"),
		OrgID:                  getEnv("ORG_ID", "default_org"),
		AllowedOrigins:         getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}