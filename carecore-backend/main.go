package main

import (
	"log"
	"os"

	"carecore-backend/config"
	"carecore-backend/db"
	"carecore-backend/middleware"
	"carecore-backend/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load config
	config.Load()
	config.InitAWS()

	// Connect database and run migrations
	db.Connect()
	db.ConnectHead()
	db.Migrate()

	// db.SeedOrganisation() removed — carecore_head is now the only
	// supported path for creating organisations (see db/head.go,
	// CreateOrganisation). The old direct-insert seed would violate
	// RLS on organisations now that carecore's INSERT is revoked there.

	// NOTE: these currently seed roles/workflow steps for a single
	// hardcoded org (config.AppConfig.OrgID). Once multiple orgs
	// exist, each new org needs its own call to these — see the
	// that safely.
	tx := db.DB.Begin()
	if err := tx.Exec("SELECT set_config('app.current_org', ?, true)", config.AppConfig.OrgID).Error; err != nil {
		log.Fatalf("Failed to set tenant scope for seeding: %v", err)
	}

	db.SeedMakerCheckerMatrix(tx, config.AppConfig.OrgID)
	db.SeedSystemRoleDefinitions(tx, config.AppConfig.OrgID)
	db.SeedWorkflowRoutingSteps(tx, config.AppConfig.OrgID)

	if err := tx.Commit().Error; err != nil {
		log.Fatalf("Failed to commit seed transaction: %v", err)
	}

	// One-off CLI flags for platform bootstrapping.
	if len(os.Args) > 1 {
		switch os.Args[1] {

		case "--seed-platform-admin":
			email := "owner@carecoreai.com"
			if len(os.Args) > 2 {
				email = os.Args[2]
			}
			pw, created, err := db.SeedPlatformAdmin(email)
			if err != nil {
				log.Fatalf("Failed to seed platform admin: %v", err)
			}
			if created {
				log.Printf("Platform admin created. Email: %s  Temp password: %s", email, pw)
				log.Println("CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN.")
			} else {
				log.Println("Platform admin already exists, skipping.")
			}
			return

		case "--create-org":
			if len(os.Args) < 4 {
				log.Fatal("Usage: go run main.go --create-org <org_name> <org_id>")
			}
			orgName := os.Args[2]
			orgID := os.Args[3]
			org, tempPassword, err := db.CreateOrganisation(orgName, orgID, "platform_owner")
			if err != nil {
				log.Fatalf("Failed to create org: %v", err)
			}
			log.Printf("Created org %q (%s). First admin temp password: %s", org.Name, org.OrgID, tempPassword)
			return

		case "--seed":
			db.SeedTestData()
			log.Println("Seeding complete. Exiting.")
			return
		}
	}

	// Setup router
	r := gin.Default()
	r.Use(middleware.CORS())
	routes.Register(r)

	port := config.AppConfig.AppPort
	log.Printf("CareCore backend running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
