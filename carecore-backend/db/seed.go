package db

import (
	"log"
	"time"

	"carecore-backend/config"
	"carecore-backend/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/datatypes"
)

func SeedTestData() {
	log.Println("Starting test data seeding...")

	orgID := config.AppConfig.OrgID

	// ── 1. Auth Users ──────────────────────────────────────────────────────────
	adminUser    := seedAuthUser("admin@carecore.com",    "Admin1234",   orgID)
	tlUser       := seedAuthUser("tl@carecore.com",       "Admin1234",   orgID)
	swUser       := seedAuthUser("sw@carecore.com",       "Admin1234",   orgID)
	sw2User      := seedAuthUser("sw2@carecore.com",      "Admin1234",   orgID)
	financeUser  := seedAuthUser("finance@carecore.com",  "Admin1234",   orgID)

	// ── 2. Staff Profiles ──────────────────────────────────────────────────────
	// Admin first (no home yet — home needs team leader which is admin)
	adminStaff := seedStaffProfile(models.StaffProfile{
		Base:     models.Base{OrgID: orgID, CreatedBy: "system"},
		UserID:   adminUser.ID.String(),
		FullName: "System Admin",
		Email:    adminUser.Email,
		Role:     "admin",
		Status:   "active",
	})
	log.Printf("Admin staff created: %s", adminStaff.ID)

	// ── 3. Homes ───────────────────────────────────────────────────────────────
	home1 := seedHome(models.Home{
		Base:                models.Base{OrgID: orgID, CreatedBy: "system"},
		Name:                "Sunrise House",
		Type:                "24_hours",
		Address:             "12 Oak Street, London",
		Postcode:            "E1 6RF",
		Phone:               "020 7946 0001",
		Email:               "sunrise@carecore.com",
		TeamLeaderID:        adminStaff.ID.String(),
		ComplianceFramework: "ofsted",
		Status:              "active",
	})

	home2 := seedHome(models.Home{
		Base:                models.Base{OrgID: orgID, CreatedBy: "system"},
		Name:                "Meadow Lodge",
		Type:                "care",
		Address:             "45 Elm Avenue, Manchester",
		Postcode:            "M1 2AB",
		Phone:               "0161 946 0002",
		Email:               "meadow@carecore.com",
		TeamLeaderID:        adminStaff.ID.String(),
		ComplianceFramework: "ofsted",
		Status:              "active",
	})

	home3 := seedHome(models.Home{
		Base:         models.Base{OrgID: orgID, CreatedBy: "system"},
		Name:         "Bridge Outreach",
		Type:         "outreach",
		Address:      "8 River Lane, Birmingham",
		Postcode:     "B1 3CD",
		TeamLeaderID: adminStaff.ID.String(),
		Status:       "active",
	})

	log.Printf("Homes created: %s, %s, %s", home1.ID, home2.ID, home3.ID)

	// ── 4. More Staff with home assignments ────────────────────────────────────
	tlStaff := seedStaffProfile(models.StaffProfile{
		Base:     models.Base{OrgID: orgID, CreatedBy: "system"},
		UserID:   tlUser.ID.String(),
		FullName: "Sarah Johnson",
		Email:    tlUser.Email,
		Role:     "team_leader",
		HomeIDs:  []string{home1.ID.String(), home2.ID.String()},
		Status:   "active",
	})

	swStaff := seedStaffProfile(models.StaffProfile{
		Base:         models.Base{OrgID: orgID, CreatedBy: "system"},
		UserID:       swUser.ID.String(),
		FullName:     "James Brown",
		Email:        swUser.Email,
		Role:         "support_worker",
		TeamLeaderID: tlStaff.ID.String(),
		HomeIDs:      []string{home1.ID.String()},
		Status:       "active",
	})

	sw2Staff := seedStaffProfile(models.StaffProfile{
		Base:         models.Base{OrgID: orgID, CreatedBy: "system"},
		UserID:       sw2User.ID.String(),
		FullName:     "Emma Davis",
		Email:        sw2User.Email,
		Role:         "support_worker",
		TeamLeaderID: tlStaff.ID.String(),
		HomeIDs:      []string{home1.ID.String(), home2.ID.String()},
		Status:       "active",
	})

	financeStaff := seedStaffProfile(models.StaffProfile{
		Base:     models.Base{OrgID: orgID, CreatedBy: "system"},
		UserID:   financeUser.ID.String(),
		FullName: "Finance Officer",
		Email:    financeUser.Email,
		Role:     "admin",
		HomeIDs:  []string{home1.ID.String(), home2.ID.String()},
		Status:   "active",
	})

	// Update home team leaders to tlStaff now that it exists
	DB.Model(&models.Home{}).Where("id = ?", home1.ID).Update("team_leader_id", tlStaff.ID)
	DB.Model(&models.Home{}).Where("id = ?", home2.ID).Update("team_leader_id", tlStaff.ID)

	log.Printf("Staff created: TL=%s SW=%s SW2=%s Finance=%s",
		tlStaff.ID, swStaff.ID, sw2Staff.ID, financeStaff.ID)

	// ── 5. Staff Availability Profiles ────────────────────────────────────────
	seedStaffAvailability(swStaff.ID.String(), orgID, "full_time", 40)
	seedStaffAvailability(sw2Staff.ID.String(), orgID, "part_time", 24)

	// ── 6. Residents (Young People) ────────────────────────────────────────────
	dob1, _ := time.Parse("2006-01-02", "2010-03-15")
	dob2, _ := time.Parse("2006-01-02", "2008-07-22")
	dob3, _ := time.Parse("2006-01-02", "2009-11-05")
	dob4, _ := time.Parse("2006-01-02", "2011-01-30")
	placementStart, _ := time.Parse("2006-01-02", "2024-01-01")
	gpRegDate, _        := time.Parse("2006-01-02", "2023-06-01")
	eduEnrol1, _        := time.Parse("2006-01-02", "2024-09-01")
	eduEnd1, _          := time.Parse("2006-01-02", "2026-07-31")
	eduEnrol2, _        := time.Parse("2006-01-02", "2025-01-15")
	eduEnd2, _          := time.Parse("2006-01-02", "2026-06-30")

	resident1 := seedResident(models.Resident{
		Base:         models.Base{OrgID: orgID, CreatedBy: "system"},
		HomeID:       home1.ID.String(),
		KeyWorkerID:  swStaff.ID.String(),
		TeamLeaderID: tlStaff.ID.String(),
		DisplayName:  "Alice M.",
		Initials:     "AM",
		DOB:          &dob1,
		Gender:       "female",
		Ethnicity:    "White British",
		Religion:     "Christian",
		Language:     "en",
		LegalStatus:  "section_31",
		RiskLevel:    "low",
		Status:       "active",
		PlacementType:  "childrens_home",
		PlacementStart: &placementStart,
		ContractedVisitsPerWeek: 2,
		// Social worker
		SocialWorkerName:  "Dr. Helen Wright",
		SocialWorkerOrg:   "London Borough Council",
		SocialWorkerEmail: "h.wright@council.gov.uk",
		SocialWorkerPhone: "07700 900001",
		IROName:           "Marcus Fields",
		IROContact:        "07700 900050",
		// Health
		NHSNumber:  "NHS123456A",
		GPName:     "Dr. Patel",
		GPPractice: "Oakfield Surgery",
		GPAddress:  "10 Oak Road, London, E1 7AB",
		GPPhone:    "020 7946 0050",
		GPRegisteredDate: &gpRegDate,
		DentistName:    "City Dental",
		DentistPhone:   "020 7946 0060",
		OpticianName:   "Vision Express",
		OpticianPhone:  "020 7946 0070",
		Allergies:         datatypes.JSON([]byte(`[{"allergen":"Penicillin","severity":"severe","notes":"Carries EpiPen"}]`)),
		MedicalConditions: datatypes.JSON([]byte(`[{"condition":"Asthma","diagnosed_date":"2018-03-01","notes":"Uses Salbutamol inhaler"}]`)),
		HealthNotes: "Asthma well-managed. Annual review due September.",
		// Education
		EducationStatus:          "in_college",
		EducationProvider:        "Eastside College",
		EducationCourse:          "Hair & Beauty Level 2",
		EducationEnrolmentDate:   &eduEnrol1,
		EducationExpectedEndDate: &eduEnd1,
		EducationDaysAttended:    []string{"Monday", "Tuesday", "Wednesday", "Thursday"},
		EducationContactName:     "Ms. Clarke",
		EducationContactPhone:    "020 7946 0080",
		EducationContactEmail:    "s.clarke@eastsidecollege.ac.uk",
		EducationNotes:           "Alice is performing well. Attendance at 92%.",
		// Finance
		BankName:          "Barclays",
		BankAccountName:   "Alice M.",
		BankSortCode:      "20-00-01",
		BankAccountNumber: "12345678",
		// Leisure
		LeisureGymEnrolled:      true,
		LeisureGymName:          "PureGym Hackney",
		LeisureFootballEnrolled: false,
		LeisureInterests:        "Fashion, cooking, music (piano)",
		// Family contacts (embedded JSON on Resident)
		FamilyContacts: datatypes.JSON([]byte(`[{"name":"Mary M.","relationship":"Mother","phone":"07700 900100","approved":true}]`)),
	})

	resident2 := seedResident(models.Resident{
		Base:         models.Base{OrgID: orgID, CreatedBy: "system"},
		HomeID:       home1.ID.String(),
		KeyWorkerID:  sw2Staff.ID.String(),
		TeamLeaderID: tlStaff.ID.String(),
		DisplayName:  "Ben P.",
		Initials:     "BP",
		DOB:          &dob2,
		Gender:       "male",
		Ethnicity:    "Black African",
		Religion:     "Muslim",
		Language:     "en",
		LegalStatus:  "section_20",
		RiskLevel:    "medium",
		Status:       "active",
		PlacementType:  "childrens_home",
		PlacementStart: &placementStart,
		ContractedVisitsPerWeek: 3,
		SocialWorkerName:  "Tracey Osei",
		SocialWorkerOrg:   "London Borough Council",
		SocialWorkerEmail: "t.osei@council.gov.uk",
		SocialWorkerPhone: "07700 900002",
		// Health
		NHSNumber:  "NHS654321B",
		GPName:     "Dr. Ahmed",
		GPPractice: "Riverside Medical Centre",
		GPPhone:    "020 7946 0051",
		DentistName:  "SmileCare Clinic",
		DentistPhone: "020 7946 0061",
		Allergies:         datatypes.JSON([]byte(`[]`)),
		MedicalConditions: datatypes.JSON([]byte(`[{"condition":"ADHD","diagnosed_date":"2020-01-10","notes":"On Methylphenidate 10mg"}]`)),
		// Education
		EducationStatus:          "in_college",
		EducationProvider:        "Eastside College",
		EducationCourse:          "IT & Computing Level 2",
		EducationEnrolmentDate:   &eduEnrol2,
		EducationExpectedEndDate: &eduEnd2,
		EducationDaysAttended:    []string{"Monday", "Wednesday", "Friday"},
		EducationContactName:     "Mr. Hassan",
		EducationContactEmail:    "m.hassan@eastsidecollege.ac.uk",
		EducationNotes:           "Attendance concerns — missed 3 sessions in last 4 weeks.",
		// Finance
		BankName:        "Nationwide",
		BankAccountName: "Ben P.",
		// Leisure
		LeisureFootballEnrolled: true,
		LeisureFootballClub:     "Hackney FC U18",
		LeisureInterests:        "Football, gaming, YouTube",
		FamilyContacts: datatypes.JSON([]byte(`[{"name":"Grace P.","relationship":"Aunt","phone":"07700 900101","approved":true}]`)),
	})

	resident3 := seedResident(models.Resident{
		Base:         models.Base{OrgID: orgID, CreatedBy: "system"},
		HomeID:       home2.ID.String(),
		KeyWorkerID:  sw2Staff.ID.String(),
		TeamLeaderID: tlStaff.ID.String(),
		DisplayName:  "Charlie K.",
		Initials:     "CK",
		DOB:          &dob3,
		Gender:       "male",
		Ethnicity:    "Mixed White and Asian",
		Language:     "en",
		LegalStatus:  "section_31",
		RiskLevel:    "high",
		Status:       "active",
		PlacementType:  "childrens_home",
		PlacementStart: &placementStart,
		ContractedVisitsPerWeek: 4,
		SocialWorkerName:  "Priya Shah",
		SocialWorkerOrg:   "Manchester City Council",
		SocialWorkerEmail: "p.shah@manchester.gov.uk",
		SocialWorkerPhone: "0161 900 0003",
		NHSNumber:  "NHS789012C",
		GPName:     "Dr. Williams",
		GPPractice: "Elm Street Surgery",
		GPPhone:    "0161 946 0052",
		Allergies:         datatypes.JSON([]byte(`[]`)),
		MedicalConditions: datatypes.JSON([]byte(`[{"condition":"Anxiety","diagnosed_date":"2022-05-15","notes":"Under CAMHS Tier 3"}]`)),
		EducationStatus: "neet",
		EducationNotes:  "Currently disengaged. NEET worker assigned. Exploring construction apprenticeship.",
		FamilyContacts:  datatypes.JSON([]byte(`[]`)),
		LeisureInterests: "Art, drawing, skateboarding",
	})

	resident4 := seedResident(models.Resident{
		Base:         models.Base{OrgID: orgID, CreatedBy: "system"},
		HomeID:       home2.ID.String(),
		KeyWorkerID:  swStaff.ID.String(),
		TeamLeaderID: tlStaff.ID.String(),
		DisplayName:  "Diana R.",
		Initials:     "DR",
		DOB:          &dob4,
		Gender:       "female",
		Ethnicity:    "White British",
		Religion:     "None",
		Language:     "en",
		LegalStatus:  "section_20",
		RiskLevel:    "low",
		Status:       "active",
		PlacementType:  "supported_accommodation",
		PlacementStart: &placementStart,
		ContractedVisitsPerWeek: 2,
		SocialWorkerName:  "Robert King",
		SocialWorkerOrg:   "Manchester City Council",
		SocialWorkerEmail: "r.king@manchester.gov.uk",
		SocialWorkerPhone: "0161 900 0004",
		NHSNumber:  "NHS345678D",
		GPName:     "Dr. Jones",
		GPPractice: "Willowbrook Health Centre",
		GPPhone:    "0161 946 0053",
		Allergies:         datatypes.JSON([]byte(`[]`)),
		MedicalConditions: datatypes.JSON([]byte(`[]`)),
		EducationStatus:   "employed",
		EducationProvider: "Tesco Metro",
		EducationCourse:   "Part-time retail (12hrs/wk)",
		EducationNotes:    "Diana started part-time work in March. Performing well.",
		BankName:          "Lloyds",
		BankAccountName:   "Diana R.",
		LeisureInterests:  "Reading, yoga, cooking",
		FamilyContacts:    datatypes.JSON([]byte(`[{"name":"Brian R.","relationship":"Father","phone":"07700 900102","approved":false,"notes":"Contact supervised only"}]`)),
	})

	log.Printf("Residents created: %s %s %s %s",
		resident1.ID, resident2.ID, resident3.ID, resident4.ID)

	// ── 7. Daily Logs ──────────────────────────────────────────────────────────
	seedDailyLog(orgID, resident1.ID.String(), resident1.DisplayName, swStaff.ID.String(), swStaff.FullName, home1.ID.String(), "Sunrise House", "2026-05-12", "morning", "general",
		`{"notes":"Alice was in good spirits today. Attended college and returned on time. Had dinner with other residents."}`,
		[]string{"current_status"},
	)
	seedDailyLog(orgID, resident1.ID.String(), resident1.DisplayName, swStaff.ID.String(), swStaff.FullName, home1.ID.String(), "Sunrise House", "2026-05-12", "night", "general",
		`{"notes":"Alice slept through the night. No concerns."}`,
		[]string{"night_stay"},
	)
	seedDailyLog(orgID, resident2.ID.String(), resident2.DisplayName, sw2Staff.ID.String(), sw2Staff.FullName, home1.ID.String(), "Sunrise House", "2026-05-12", "afternoon", "behaviour",
		`{"notes":"Ben had a difficult afternoon. Refused to engage with planned activities. Spoke with team leader."}`,
		[]string{"current_status", "flagged"},
	)
	seedDailyLog(orgID, resident3.ID.String(), resident3.DisplayName, sw2Staff.ID.String(), sw2Staff.FullName, home2.ID.String(), "Meadow Lodge", "2026-05-12", "morning", "health",
		`{"notes":"Charlie attended GP appointment. Prescription renewed."}`,
		[]string{"current_status"},
	)

	// ── 8. Visit Reports ───────────────────────────────────────────────────────
	vr1 := seedVisitReport(models.VisitReport{
		Base:                models.Base{OrgID: orgID, CreatedBy: swStaff.Email},
		ResidentID:          resident1.ID.String(),
		ResidentName:        resident1.DisplayName,
		HomeID:              home1.ID.String(),
		WorkerID:            swStaff.ID.String(),
		WorkerName:          swStaff.FullName,
		Date:                "2026-05-10",
		TimeStart:           "10:00",
		TimeEnd:             "11:00",
		DurationMinutes:     60,
		ActionText:          "Conducted a face-to-face key work session with Alice. Discussed her college progress and upcoming review.",
		OutcomeText:         "Alice engaged positively. Expressed enthusiasm about her hair and beauty course.",
		RecommendationsText: "Continue weekly key work sessions. Arrange visit from family contact next month.",
		IsKeyWorkerSession:  true,
		Status:              "submitted",
	})

	seedVisitReport(models.VisitReport{
		Base:                models.Base{OrgID: orgID, CreatedBy: sw2Staff.Email},
		ResidentID:          resident2.ID.String(),
		ResidentName:        resident2.DisplayName,
		HomeID:              home1.ID.String(),
		WorkerID:            sw2Staff.ID.String(),
		WorkerName:          sw2Staff.FullName,
		Date:                "2026-05-11",
		TimeStart:           "14:00",
		TimeEnd:             "15:30",
		DurationMinutes:     90,
		ActionText:          "Visited Ben at the home. Reviewed his support plan targets.",
		OutcomeText:         "Ben was reluctant initially but engaged once rapport was established.",
		RecommendationsText: "Increase visit frequency to twice weekly given recent behaviour concerns.",
		IsKeyWorkerSession:  false,
		Status:              "draft",
	})

	log.Printf("Visit reports created: %s", vr1.ID)

	// ── 9. KPI Options ─────────────────────────────────────────────────────────
	kpiOptions := []models.KPIOption{
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "visit_type", Label: "Face to Face", Value: "face_to_face", Active: true, Order: 1},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "visit_type", Label: "Phone Call", Value: "phone_call", Active: true, Order: 2},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "visit_type", Label: "Video Call", Value: "video_call", Active: true, Order: 3},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "presentation", Label: "Positive", Value: "positive", Active: true, Order: 1},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "presentation", Label: "Neutral", Value: "neutral", Active: true, Order: 2},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "presentation", Label: "Distressed", Value: "distressed", Active: true, Order: 3},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "engagement_level", Label: "High", Value: "high", Active: true, Order: 1},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "engagement_level", Label: "Medium", Value: "medium", Active: true, Order: 2},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "engagement_level", Label: "Low", Value: "low", Active: true, Order: 3},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "risk_level", Label: "Low", Value: "low", Active: true, Order: 1},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "risk_level", Label: "Medium", Value: "medium", Active: true, Order: 2},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "risk_level", Label: "High", Value: "high", Active: true, Order: 3},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "risk_level", Label: "Critical", Value: "critical", Active: true, Order: 4},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "life_skills", Label: "Cooking", Value: "cooking", Active: true, Order: 1},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "life_skills", Label: "Budgeting", Value: "budgeting", Active: true, Order: 2},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "life_skills", Label: "Hygiene", Value: "hygiene", Active: true, Order: 3},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "life_skills", Label: "Transport", Value: "transport", Active: true, Order: 4},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "placement_condition", Label: "Stable", Value: "stable", Active: true, Order: 1},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "placement_condition", Label: "At Risk", Value: "at_risk", Active: true, Order: 2},
		{Base: models.Base{OrgID: orgID, CreatedBy: "system"}, Category: "placement_condition", Label: "Breaking Down", Value: "breaking_down", Active: true, Order: 3},
	}
	for _, opt := range kpiOptions {
		opt.ID = uuid.New()
		DB.Where("org_id = ? AND category = ? AND value = ?", orgID, opt.Category, opt.Value).
			FirstOrCreate(&opt)
	}
	log.Println("KPI options seeded")

	// ── 10. Shift Templates ────────────────────────────────────────────────────
	seedShiftTemplate(orgID, home1.ID.String(), "Morning Shift", "morning", "07:00", "15:00", 2)
	seedShiftTemplate(orgID, home1.ID.String(), "Afternoon Shift", "afternoon", "15:00", "23:00", 2)
	seedShiftTemplate(orgID, home1.ID.String(), "Night/Sleeping", "sleeping", "23:00", "07:00", 1)
	seedShiftTemplate(orgID, home2.ID.String(), "Morning Shift", "morning", "07:00", "15:00", 2)
	seedShiftTemplate(orgID, home2.ID.String(), "Afternoon Shift", "afternoon", "15:00", "23:00", 2)
	log.Println("Shift templates seeded")

	// ── 11. Bills ──────────────────────────────────────────────────────────────
	seedBill(orgID, home1.ID.String(), "Sunrise House", "utilities", "British Gas", 180.00, "2026-06-01", "pending")
	seedBill(orgID, home1.ID.String(), "Sunrise House", "council_tax", "London Borough", 220.00, "2026-06-01", "pending")
	seedBill(orgID, home1.ID.String(), "Sunrise House", "rent", "Landlord Ltd", 2500.00, "2026-06-01", "paid")
	seedBill(orgID, home2.ID.String(), "Meadow Lodge", "utilities", "EDF Energy", 160.00, "2026-06-01", "overdue")
	seedBill(orgID, home2.ID.String(), "Meadow Lodge", "insurance", "Aviva", 95.00, "2026-06-01", "pending")
	log.Println("Bills seeded")

	// ── 12. Petty Cash ─────────────────────────────────────────────────────────
	pc1 := seedPettyCash(orgID, home1.ID.String(), "Sunrise House", 250.00, 50.00)
	pc2 := seedPettyCash(orgID, home2.ID.String(), "Meadow Lodge", 180.00, 50.00)
	seedPettyCashTransaction(orgID, home1.ID.String(), pc1.ID.String(), "cash_out", 15.50, "activities", "Cinema trip for residents", swStaff.Email)
	seedPettyCashTransaction(orgID, home1.ID.String(), pc1.ID.String(), "cash_out", 8.00, "food", "Snacks for house meeting", swStaff.Email)
	seedPettyCashTransaction(orgID, home2.ID.String(), pc2.ID.String(), "cash_in", 100.00, "replenishment", "Float top-up from finance", financeStaff.Email)
	log.Println("Petty cash seeded")

	// ── 13. Placement Fees ─────────────────────────────────────────────────────
	seedPlacementFee(orgID, resident1.ID.String(), home1.ID.String(), "London Borough Council", 4200.00, "2024-01-01")
	seedPlacementFee(orgID, resident2.ID.String(), home1.ID.String(), "London Borough Council", 3850.00, "2024-01-01")
	seedPlacementFee(orgID, resident3.ID.String(), home2.ID.String(), "Manchester City Council", 4500.00, "2024-01-01")
	log.Println("Placement fees seeded")

	// ── 14. Notifications ──────────────────────────────────────────────────────
	seedNotification(orgID, tlStaff.ID.String(), "alert", "James Brown submitted a visit report for Alice M.", "normal", "VisitReport", vr1.ID.String())
	seedNotification(orgID, tlStaff.ID.String(), "alert", "Ben P. had a difficult afternoon — review daily log", "high", "DailyLog", "")
	seedNotification(orgID, adminStaff.ID.String(), "certification", "James Brown DBS expiry in 30 days", "normal", "StaffProfile", swStaff.ID.String())
	log.Println("Notifications seeded")

	// ── 15. Home Documents ─────────────────────────────────────────────────────
	expiry1, _ := time.Parse("2006-01-02", "2026-12-01")
	expiry2, _ := time.Parse("2006-01-02", "2026-06-15")
	seedHomeDocument(orgID, home1.ID.String(), "Gas Safety Certificate", "gas_safety", "https://storage.carecore.uk/docs/gas_safety_home1.pdf", &expiry1, "current")
	seedHomeDocument(orgID, home1.ID.String(), "Fire Risk Assessment", "fire_risk", "https://storage.carecore.uk/docs/fire_risk_home1.pdf", &expiry2, "expiring_soon")
	seedHomeDocument(orgID, home2.ID.String(), "Electrical Certificate", "electric_cert", "https://storage.carecore.uk/docs/eicr_home2.pdf", &expiry1, "current")
	log.Println("Home documents seeded")

	// ── 16. Support Plans ──────────────────────────────────────────────────────
	seedSupportPlan(orgID, resident1.ID.String(), home1.ID.String(), swStaff.Email)
	seedSupportPlan(orgID, resident2.ID.String(), home1.ID.String(), sw2Staff.Email)
	log.Println("Support plans seeded")

	// ── 17. Accident Reports ───────────────────────────────────────────────────
	seedAccidentReport(orgID, home1.ID.String(), "Sunrise House", swStaff.ID.String(), swStaff.FullName, resident1.ID.String(), resident1.DisplayName)
	log.Println("Accident reports seeded")

	// ── 18. Appointments ───────────────────────────────────────────────────────
	appt1 := mustParseTime("2026-05-28T10:00:00Z")
	appt2 := mustParseTime("2026-06-05T14:00:00Z")
	appt3 := mustParseTime("2026-05-20T09:30:00Z")
	appt4 := mustParseTime("2026-06-12T11:00:00Z")
	appt5 := mustParseTime("2026-05-15T15:00:00Z") // past
	appt6 := mustParseTime("2026-07-01T10:00:00Z")

	seedAppointment(orgID, resident1.ID.String(), resident1.DisplayName, home1.ID.String(), "gp", "GP Check-up", &appt1, "Oakfield Surgery", swStaff.ID.String(), "scheduled")
	seedAppointment(orgID, resident1.ID.String(), resident1.DisplayName, home1.ID.String(), "social_worker_visit", "SW Visit — Alice", &appt2, "Sunrise House", swStaff.ID.String(), "scheduled")
	seedAppointment(orgID, resident1.ID.String(), resident1.DisplayName, home1.ID.String(), "dental", "Dental Check", &appt5, "City Dental", swStaff.ID.String(), "completed")
	seedAppointment(orgID, resident2.ID.String(), resident2.DisplayName, home1.ID.String(), "mental_health", "ADHD Review — CAMHS", &appt3, "CAMHS North London", sw2Staff.ID.String(), "scheduled")
	seedAppointment(orgID, resident2.ID.String(), resident2.DisplayName, home1.ID.String(), "social_worker_visit", "SW Visit — Ben", &appt4, "Sunrise House", sw2Staff.ID.String(), "scheduled")
	seedAppointment(orgID, resident3.ID.String(), resident3.DisplayName, home2.ID.String(), "mental_health", "CAMHS Therapy Session", &appt6, "CAMHS Manchester", sw2Staff.ID.String(), "scheduled")
	log.Println("Appointments seeded")

	// ── 19. Family Contacts ────────────────────────────────────────────────────
	seedFamilyContact(orgID, resident1.ID.String(), resident1.DisplayName, home1.ID.String(), "Mary M.", "Mother", "2026-05-10", "in_person", "weekly", swStaff.ID.String(), swStaff.FullName)
	seedFamilyContact(orgID, resident1.ID.String(), resident1.DisplayName, home1.ID.String(), "Mary M.", "Mother", "2026-05-03", "phone", "weekly", swStaff.ID.String(), swStaff.FullName)
	seedFamilyContact(orgID, resident2.ID.String(), resident2.DisplayName, home1.ID.String(), "Grace P.", "Aunt", "2026-05-08", "video_call", "fortnightly", sw2Staff.ID.String(), sw2Staff.FullName)
	log.Println("Family contacts seeded")

	// ── 20. Achievements ───────────────────────────────────────────────────────
	seedAchievement(orgID, resident1.ID.String(), resident1.DisplayName, home1.ID.String(), swStaff.ID.String(), swStaff.FullName, "education", "Passed Hair & Beauty Unit 3", "Alice achieved a Distinction in her Hair & Beauty Unit 3 assessment.", "2026-05-14")
	seedAchievement(orgID, resident1.ID.String(), resident1.DisplayName, home1.ID.String(), swStaff.ID.String(), swStaff.FullName, "personal", "Cooked a full Sunday roast independently", "Alice planned, shopped for, and cooked a full roast dinner for the house.", "2026-05-01")
	seedAchievement(orgID, resident2.ID.String(), resident2.DisplayName, home1.ID.String(), sw2Staff.ID.String(), sw2Staff.FullName, "sport", "Scored match-winning goal for Hackney FC", "Ben scored the winning penalty in the U18 league cup final.", "2026-04-22")
	seedAchievement(orgID, resident4.ID.String(), resident4.DisplayName, home2.ID.String(), swStaff.ID.String(), swStaff.FullName, "employment", "Completed first month at Tesco without absence", "Diana received positive feedback from her line manager.", "2026-04-30")
	log.Println("Achievements seeded")

	// ── 21. Risk Assessments ───────────────────────────────────────────────────
	seedRiskAssessment(orgID, resident2.ID.String(), resident2.DisplayName, home1.ID.String(), tlStaff.ID.String(), tlStaff.FullName, "substance_misuse", "medium", "Cannabis use suspected on two occasions.")
	seedRiskAssessment(orgID, resident3.ID.String(), resident3.DisplayName, home2.ID.String(), tlStaff.ID.String(), tlStaff.FullName, "missing_from_care", "high", "Charlie has gone missing 3 times in the past 6 months.")
	seedRiskAssessment(orgID, resident3.ID.String(), resident3.DisplayName, home2.ID.String(), tlStaff.ID.String(), tlStaff.FullName, "criminal_exploitation", "high", "Suspected county lines involvement — police referral made.")
	seedRiskAssessment(orgID, resident3.ID.String(), resident3.DisplayName, home2.ID.String(), tlStaff.ID.String(), tlStaff.FullName, "suicide_self_harm", "medium", "Reports of low mood. CAMHS Tier 3 engaged.")
	log.Println("Risk assessments seeded")

	// ── 22. Pathway Plans ─────────────────────────────────────────────────────
	seedPathwayPlan(orgID, resident1.ID.String(), resident1.DisplayName, home1.ID.String(), swStaff.Email)
	seedPathwayPlan(orgID, resident2.ID.String(), resident2.DisplayName, home1.ID.String(), sw2Staff.Email)
	log.Println("Pathway plans seeded")

	// ── 23. Medication Records ─────────────────────────────────────────────────
	seedMedicationRecord(orgID, resident1.ID.String(), home1.ID.String(), "Salbutamol 100mcg inhaler", "2 puffs", "as required", "Dr. Patel", "active")
	seedMedicationRecord(orgID, resident2.ID.String(), home1.ID.String(), "Methylphenidate 10mg", "1 tablet", "daily in the morning", "Dr. Ahmed", "active")
	seedMedicationRecord(orgID, resident3.ID.String(), home2.ID.String(), "Sertraline 50mg", "1 tablet", "daily", "Dr. Williams", "active")
	log.Println("Medication records seeded")

	log.Println("✅ Test data seeding complete!")
	log.Println("──────────────────────────────────────────")
	log.Printf("Admin login:   admin@carecore.com   / Admin1234")
	log.Printf("TL login:      tl@carecore.com      / Admin1234")
	log.Printf("SW login:      sw@carecore.com      / Admin1234")
	log.Printf("SW2 login:     sw2@carecore.com     / Admin1234")
	log.Printf("Finance login: finance@carecore.com / Admin1234")
	log.Println("──────────────────────────────────────────")
}

// ── Private seed helpers ──────────────────────────────────────────────────────

func seedAuthUser(email, password, orgID string) models.AuthUser {
	var existing models.AuthUser
	if err := DB.Where("email = ?", email).First(&existing).Error; err == nil {
		log.Printf("AuthUser already exists: %s", email)
		return existing
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	user := models.AuthUser{
		Base:         models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		Email:        email,
		PasswordHash: string(hash),
		IsActive:     true,
	}
	DB.Create(&user)
	return user
}

func seedStaffProfile(sp models.StaffProfile) models.StaffProfile {
	var existing models.StaffProfile
	if err := DB.Where("email = ?", sp.Email).First(&existing).Error; err == nil {
		return existing
	}
	sp.ID = uuid.New()
	DB.Create(&sp)
	return sp
}

func seedHome(h models.Home) models.Home {
	var existing models.Home
	if err := DB.Where("org_id = ? AND name = ?", h.OrgID, h.Name).First(&existing).Error; err == nil {
		return existing
	}
	h.ID = uuid.New()
	DB.Create(&h)
	return h
}

func seedResident(r models.Resident) models.Resident {
	var existing models.Resident
	if err := DB.Where("org_id = ? AND display_name = ? AND home_id = ?", r.OrgID, r.DisplayName, r.HomeID).First(&existing).Error; err == nil {
		return existing
	}
	r.ID = uuid.New()
	DB.Create(&r)
	return r
}

func seedDailyLog(orgID, residentID, residentName, workerID, workerName, homeID, homeName, date, shift, logType, content string, flags []string) {
	var existing models.DailyLog
	if err := DB.Where("org_id = ? AND resident_id = ? AND date = ? AND shift = ?", orgID, residentID, date, shift).First(&existing).Error; err == nil {
		return
	}
	log := models.DailyLog{
		Base:         models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: workerName},
		ResidentID:   residentID,
		ResidentName: residentName,
		WorkerID:     workerID,
		WorkerName:   workerName,
		HomeID:       homeID,
		HomeName:     homeName,
		Date:         date,
		Shift:        shift,
		LogType:      logType,
		Content:      datatypes.JSON([]byte(content)),
		Flags:        flags,
	}
	DB.Create(&log)
}

func seedVisitReport(vr models.VisitReport) models.VisitReport {
	var existing models.VisitReport
	if err := DB.Where("org_id = ? AND resident_id = ? AND date = ?", vr.OrgID, vr.ResidentID, vr.Date).First(&existing).Error; err == nil {
		return existing
	}
	vr.ID = uuid.New()
	DB.Create(&vr)
	return vr
}

func seedShiftTemplate(orgID, homeID, name, shiftType, start, end string, staffRequired int) {
	var existing models.ShiftTemplate
	if err := DB.Where("org_id = ? AND home_id = ? AND name = ?", orgID, homeID, name).First(&existing).Error; err == nil {
		return
	}
	t := models.ShiftTemplate{
		Base:          models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		HomeID:        homeID,
		Name:          name,
		ShiftType:     shiftType,
		TimeStart:     start,
		TimeEnd:       end,
		StaffRequired: staffRequired,
		Active:        true,
	}
	DB.Create(&t)
}

func seedBill(orgID, homeID, homeName, billType, supplier string, amount float64, dueDate, status string) {
	var existing models.Bill
	if err := DB.Where("org_id = ? AND home_id = ? AND bill_type = ? AND due_date = ?", orgID, homeID, billType, dueDate).First(&existing).Error; err == nil {
		return
	}
	b := models.Bill{
		Base:     models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		HomeID:   homeID,
		HomeName: homeName,
		BillType: billType,
		Supplier: supplier,
		Amount:   amount,
		DueDate:  dueDate,
		Status:   status,
	}
	DB.Create(&b)
}

func seedPettyCash(orgID, homeID, homeName string, balance, threshold float64) models.PettyCash {
	var existing models.PettyCash
	if err := DB.Where("org_id = ? AND home_id = ?", orgID, homeID).First(&existing).Error; err == nil {
		return existing
	}
	pc := models.PettyCash{
		Base:           models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		HomeID:         homeID,
		HomeName:       homeName,
		CurrentBalance: balance,
		FloatThreshold: threshold,
		Status:         "active",
	}
	DB.Create(&pc)
	return pc
}

func seedPettyCashTransaction(orgID, homeID, pettyCashID, txType string, amount float64, category, description, createdBy string) {
	tx := models.PettyCashTransaction{
		Base:            models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: createdBy},
		HomeID:          homeID,
		PettyCashID:     pettyCashID,
		TransactionType: txType,
		Amount:          amount,
		Category:        category,
		Description:     description,
		Date:            time.Now().Format("2006-01-02"),
	}
	DB.Create(&tx)
}

func seedPlacementFee(orgID, residentID, homeID, la string, weeklyRate float64, startDate string) {
	var existing models.PlacementFee
	if err := DB.Where("org_id = ? AND resident_id = ?", orgID, residentID).First(&existing).Error; err == nil {
		return
	}
	pf := models.PlacementFee{
		Base:           models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		ResidentID:     residentID,
		HomeID:         homeID,
		LocalAuthority: la,
		WeeklyRate:     weeklyRate,
		FeeStartDate:   startDate,
		Status:         "active",
	}
	DB.Create(&pf)
}

func seedNotification(orgID, userID, notifType, message, priority, module, recordID string) {
	n := models.Notification{
		Base:            models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		UserID:          userID,
		Type:            notifType,
		Message:         message,
		Priority:        priority,
		RelatedModule:   module,
		RelatedRecordID: recordID,
		Read:            false,
	}
	DB.Create(&n)
}

func seedHomeDocument(orgID, homeID, title, docType, fileURL string, expiry *time.Time, status string) {
	var existing models.HomeDocument
	if err := DB.Where("org_id = ? AND home_id = ? AND title = ?", orgID, homeID, title).First(&existing).Error; err == nil {
		return
	}
	d := models.HomeDocument{
		Base:         models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		HomeID:       homeID,
		Title:        title,
		DocumentType: docType,
		FileURL:      fileURL,
		ExpiryDate:   expiry,
		Status:       status,
	}
	DB.Create(&d)
}

func seedSupportPlan(orgID, residentID, homeID, createdBy string) {
	var existing models.SupportPlan
	if err := DB.Where("org_id = ? AND resident_id = ? AND status = ?", orgID, residentID, "active").First(&existing).Error; err == nil {
		return
	}
	sp := models.SupportPlan{
		Base:          models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: createdBy},
		ResidentID:    residentID,
		HomeID:        homeID,
		Version:       1,
		Status:        "active",
		EffectiveDate: "2024-01-01",
		ReviewDueDate: "2026-12-31",
		OverallNotes:  "Initial support plan.",
		Sections:      datatypes.JSON([]byte(`[]`)),
	}
	DB.Create(&sp)
}

func seedAccidentReport(orgID, homeID, homeName, reportedByID, reportedByName, residentID, residentName string) {
	var existing models.AccidentReport
	if err := DB.Where("org_id = ? AND resident_id = ?", orgID, residentID).First(&existing).Error; err == nil {
		return
	}
	ar := models.AccidentReport{
		Base:           models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: reportedByName},
		HomeID:         homeID,
		HomeName:       homeName,
		ReportedByID:   reportedByID,
		ReportedByName: reportedByName,
		ResidentID:     residentID,
		ResidentName:   residentName,
		Type:           "near_miss",
		Date:           "2026-05-10",
		Time:           "14:30",
		Location:       "Kitchen",
		Description:    "Resident slipped on wet floor. No injury sustained.",
		FirstAidGiven:  false,
		Status:         "open",
	}
	DB.Create(&ar)
}

// mustParseTime parses an RFC3339 string and panics on failure — safe for seed-only use.
func mustParseTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic("seed: bad time literal: " + s + " — " + err.Error())
	}
	return t
}

func strPtr(s string) *string { return &s }

func seedAppointment(orgID, residentID, residentName, homeID, apptType, title string, start *time.Time, location, staffID, status string) {
	var existing models.Appointment
	if err := DB.Where("org_id = ? AND resident_id = ? AND appointment_type = ? AND date = ?",
		orgID, residentID, apptType, start.Format("2006-01-02")).First(&existing).Error; err == nil {
		return
	}
	a := models.Appointment{
		Base:             models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		ResidentID:       residentID,
		ResidentName:     residentName,
		HomeID:           homeID,
		AppointmentType:  apptType,
		Title:            title,
		StartDatetime:    start,
		Location:      location,
		OrganiserID:   staffID,
		Status:           status,
	}
	DB.Create(&a)
}

func seedFamilyContact(orgID, residentID, residentName, homeID, contactName, relationship, contactDate, contactType, frequency, staffID, staffName string) {
	var existing models.FamilyContact
	if err := DB.Where("org_id = ? AND resident_id = ? AND contact_person_name = ? AND contact_datetime = ?",
		orgID, residentID, contactName, contactDate).First(&existing).Error; err == nil {
		return
	}
	fc := models.FamilyContact{
		Base:                      models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: staffName},
		ResidentID:                residentID,
		ResidentName:              residentName,
		HomeID:                    homeID,
		ContactPersonName:         contactName,
		ContactPersonRelationship: relationship,
		ContactDatetime:           contactDate,
		ContactMethod:             contactType,
		RecordedByID:              staffID,
		RecordedByName:            staffName,
	}
	DB.Create(&fc)
}

func seedAchievement(orgID, residentID, residentName, homeID, staffID, staffName, category, title, description, date string) {
	var existing models.Achievement
	if err := DB.Where("org_id = ? AND resident_id = ? AND title = ?", orgID, residentID, title).First(&existing).Error; err == nil {
		return
	}
	a := models.Achievement{
		Base:            models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: staffName},
		ResidentID:      residentID,
		ResidentName:    residentName,
		HomeID:          homeID,
		RecordedByID:    strPtr(staffID),
		RecordedByName:  staffName,
		Category:        category,
		Title:           title,
		Description:     description,
		AchievementDate: date,
	}
	DB.Create(&a)
}

func seedRiskAssessment(orgID, residentID, residentName, homeID, reviewerID, reviewerName, category, overallRating, background string) {
	var existing models.RiskAssessment
	if err := DB.Where("org_id = ? AND resident_id = ? AND category = ?", orgID, residentID, category).First(&existing).Error; err == nil {
		return
	}
	now := time.Now().Format("2006-01-02")
	ra := models.RiskAssessment{
		Base:               models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: reviewerName},
		ResidentID:         residentID,
		HomeID:             homeID,
		Category:           category,
		IsPresent:          "yes",
		OverallRating:      overallRating,
		Background:         background,
		LastReviewedBy:     strPtr(reviewerID),
		LastReviewedByName: strPtr(reviewerName),
		LastReviewedAt:     now,
		ReviewDate:         time.Now().AddDate(0, 3, 0).Format("2006-01-02"),
	}
	DB.Create(&ra)
}

func seedPathwayPlan(orgID, residentID, residentName, homeID, createdBy string) {
	var existing models.PathwayPlan
	if err := DB.Where("org_id = ? AND resident_id = ? AND status = ?", orgID, residentID, "active").First(&existing).Error; err == nil {
		return
	}
	pp := models.PathwayPlan{
		Base:          models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: createdBy},
		ResidentID:    residentID,
		ResidentName:  residentName,
		HomeID:        homeID,
		Version:       1,
		Status:        "active",
		EffectiveDate: "2024-06-01",
		ReviewDueDate: "2026-12-01",
		YPInvolved:    true,
		YPAgreement:   "agreed",
		Sections:      datatypes.JSON([]byte(`[]`)),
	}
	DB.Create(&pp)
}

func seedMedicationRecord(orgID, residentID, homeID, name, dosage, frequency, prescriber, status string) {
	var existing models.MedicationRecord
	if err := DB.Where("org_id = ? AND resident_id = ? AND medication_name = ?", orgID, residentID, name).First(&existing).Error; err == nil {
		return
	}
	startDate := time.Now().AddDate(0, -3, 0)
	reviewDate := time.Now().AddDate(0, 3, 0)
	mr := models.MedicationRecord{
		Base:           models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		ResidentID:     residentID,
		MedicationName: name,
		Dosage:         dosage,
		Frequency:      frequency,
		PrescribedBy:   prescriber,
		StartDate:      &startDate,
		ReviewDate:     &reviewDate,
		Status:         status,
	}
	DB.Create(&mr)
}

func seedStaffAvailability(staffID, orgID, employmentType string, hours float64) {
	var existing models.StaffAvailabilityProfile
	if err := DB.Where("staff_id = ?", staffID).First(&existing).Error; err == nil {
		return
	}
	ap := models.StaffAvailabilityProfile{
		Base:                   models.Base{ID: uuid.New(), OrgID: orgID, CreatedBy: "system"},
		StaffID:                staffID,
		ContractedHoursPerWeek: hours,
		EmploymentType:         employmentType,
		MaxHoursPerDay:         12,
		MaxConsecutiveDays:     6,
		MinRestHoursBetweenShifts: 11,
		FirstAidCertified:      true,
		MedicationTrained:      true,
		SafeguardingTrained:    true,
		SafeguardingLevel:      "level_2",
	}
	DB.Create(&ap)
}