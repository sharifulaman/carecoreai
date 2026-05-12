package main

import (
	"log"

	"carecore-backend/config"
	"carecore-backend/db"
	"carecore-backend/handlers"
	"carecore-backend/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load config
	config.Load()

	// Connect database and run migrations
	db.Connect()
	db.Migrate()

	// Setup router
	r := gin.Default()
	r.Use(middleware.CORS())

	// ── Public routes ─────────────────────────────────────
	auth := r.Group("/auth")
	{
		auth.POST("/login", handlers.Login)
		auth.POST("/refresh", handlers.RefreshToken)
		auth.POST("/register", handlers.Register)
	}

	// ── Protected routes ──────────────────────────────────
	api := r.Group("/")
	api.Use(middleware.AuthRequired())
	{
		// Auth
		api.GET("/auth/me", handlers.GetMe)
		api.PUT("/auth/me", handlers.UpdateMe)

		// Generic entity CRUD — handles ALL 40+ entities
		entities := api.Group("/entities")
		{
			entities.GET("/:entity", handlers.ListEntities)
			entities.GET("/:entity/:id", handlers.GetEntity)
			entities.POST("/:entity", handlers.CreateEntity)
			entities.PUT("/:entity/:id", handlers.UpdateEntity)
			entities.DELETE("/:entity/:id", handlers.DeleteEntity)
		}
	}

	port := config.AppConfig.AppPort
	log.Printf("CareCore backend running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}