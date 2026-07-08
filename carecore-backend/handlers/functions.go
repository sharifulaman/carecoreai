package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strings"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func InvokeFunction(c *gin.Context) {
	name := c.Param("name")
	claims := middleware.GetClaims(c)

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return // error response already written
	}

	if name == "seedHandoverData" {
		// Find a home to seed handovers for
		var home models.Home
		q := scopedDB.Where("org_id = ? AND is_deleted = false", claims.OrgID)
		if len(claims.HomeIDs) > 0 {
			q = q.Where("id = ?", claims.HomeIDs[0])
		}
		if err := q.First(&home).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "BAD_REQUEST", "message": "No home found to seed data for"}})
			return
		}

		// Find residents in this home
		var residents []models.Resident
		scopedDB.Where("home_id = ? AND org_id = ? AND is_deleted = false", home.ID, claims.OrgID).Find(&residents)

		// Find staff in the organisation
		var staff []models.StaffProfile
		scopedDB.Where("org_id = ? AND is_deleted = false", claims.OrgID).Find(&staff)

		// Set default staff if none found
		outgoingStaffName := claims.Email
		outgoingStaffID := claims.UserID
		incomingStaffName := "Alex Smith"
		incomingStaffID := "alex_smith_id"
		if len(staff) > 0 {
			outgoingStaffName = staff[0].FullName
			outgoingStaffID = staff[0].ID.String()
			if len(staff) > 1 {
				incomingStaffName = staff[1].FullName
				incomingStaffID = staff[1].ID.String()
			}
		}

		// Let's seed for the past 5 days
		shifts := []string{"morning", "afternoon", "evening", "night"}
		shiftTimes := map[string][]string{
			"morning":   {"07:00", "12:00", "12:00", "19:00"},
			"afternoon": {"12:00", "19:00", "19:00", "21:00"},
			"evening":   {"19:00", "21:00", "21:00", "07:00"},
			"night":     {"21:00", "07:00", "07:00", "12:00"},
		}

		now := time.Now()
		count := 0

		for i := 4; i >= 0; i-- {
			day := now.AddDate(0, 0, -i)
			dateStr := day.Format("2006-01-02")

			for _, s := range shifts {
				times := shiftTimes[s]
				nextShiftMap := map[string]string{
					"morning":   "afternoon",
					"afternoon": "evening",
					"evening":   "night",
					"night":     "morning",
				}
				nextShift := nextShiftMap[s]

				// Check if handover already exists
				var existing int64
				scopedDB.Model(&models.HandoverRecord{}).Where("home_id = ? AND handover_date = ? AND shift = ?", home.ID, dateStr, s).Count(&existing)
				if existing > 0 {
					continue
				}

				handoverID := uuid.New()
				status := "submitted"
				if i == 0 && s == "night" {
					status = "draft"
				}

				// Create HandoverRecord
				record := models.HandoverRecord{
					Base: models.Base{
						ID:          handoverID,
						OrgID:       claims.OrgID,
						CreatedBy:   claims.Email,
						CreatedDate: day,
						UpdatedDate: day,
					},
					HomeID:                         home.ID.String(),
					HomeName:                       home.Name,
					HandoverDate:                   dateStr,
					Shift:                          s,
					OutgoingStaffID:                outgoingStaffID,
					OutgoingStaffName:              outgoingStaffName,
					OutgoingShiftStart:             times[0],
					OutgoingShiftEnd:               times[1],
					IncomingStaffID:                incomingStaffID,
					IncomingStaffName:              incomingStaffName,
					IncomingShiftStart:             times[2],
					IncomingShiftEnd:               times[3],
					Status:                         status,
					ProgressPercent:                100,
					SubmittedByStaffID:             outgoingStaffID,
					SubmittedByName:                outgoingStaffName,
					SubmittedAt:                    day.Format(time.RFC3339),
					OutgoingDeclaration:            true,
					LockedAt:                       day.Format(time.RFC3339),
					NoIncidentsConfirmed:           true,
					NoMedicationIssuesConfirmed:    true,
					NoEnvironmentConcernsConfirmed: true,
					DailyOverview:                  fmt.Sprintf("Routine %s shift completed successfully. All standard duties performed.", s),
					Highlights:                     "Young people engaged well in activities.",
					PointsToNote:                   "Ensure diary check is completed.",
					ConcernsSummary:                "None",
					RequestsSummary:                "None",
				}

				if err := scopedDB.Create(&record).Error; err != nil {
					continue
				}
				count++

				// Create HandoverUpdate: Daily Overview
				scopedDB.Create(&models.HandoverUpdate{
					Base: models.Base{
						ID:          uuid.New(),
						OrgID:       claims.OrgID,
						CreatedBy:   claims.Email,
						CreatedDate: day,
						UpdatedDate: day,
					},
					HandoverID: handoverID.String(),
					HomeID:     home.ID.String(),
					UpdateType: "daily_overview",
					Title:      "Daily Overview",
					Summary:    fmt.Sprintf("All routines followed on the %s shift. No major incidents.", s),
					Severity:   "low",
					RecordedAt: "11:30",
				})

				// Create HandoverUpdate: Highlight
				scopedDB.Create(&models.HandoverUpdate{
					Base: models.Base{
						ID:          uuid.New(),
						OrgID:       claims.OrgID,
						CreatedBy:   claims.Email,
						CreatedDate: day,
						UpdatedDate: day,
					},
					HandoverID: handoverID.String(),
					HomeID:     home.ID.String(),
					UpdateType: "highlight",
					Title:      "Highlights",
					Summary:    "Young person cooked dinner with support worker.",
					Severity:   "low",
					RecordedAt: "18:00",
				})

				// Create HandoverYPSummary for each resident
				for _, r := range residents {
					initialsVal := "??"
					displayNameVal := "YP"
					if r.DisplayName != "" {
						displayNameVal = r.DisplayName
						if len(r.DisplayName) > 0 {
							initialsVal = string(r.DisplayName[0])
						}
					}
					scopedDB.Create(&models.HandoverYPSummary{
						Base: models.Base{
							ID:          uuid.New(),
							OrgID:       claims.OrgID,
							CreatedBy:   claims.Email,
							CreatedDate: day,
							UpdatedDate: day,
						},
						HandoverID:       handoverID.String(),
						HomeID:           home.ID.String(),
						ResidentID:       r.ID.String(),
						ResidentInitials: initialsVal,
						ResidentDisplay:  displayNameVal,
						Status:           "doing_well",
						Mood:             "good",
						KeyUpdate:        "Participated well in shift activities and routine discussions.",
						FollowUpRequired: false,
					})
				}

				// Create a task
				scopedDB.Create(&models.HandoverTask{
					Base: models.Base{
						ID:          uuid.New(),
						OrgID:       claims.OrgID,
						CreatedBy:   claims.Email,
						CreatedDate: day,
						UpdatedDate: day,
					},
					HandoverID:        handoverID.String(),
					HomeID:            home.ID.String(),
					Title:             fmt.Sprintf("Check logs for %s shift", nextShift),
					Description:       "Verify everything is recorded correctly",
					Priority:          "medium",
					DueAt:             "Within shift",
					AssignedToName:    incomingStaffName,
					Status:            "completed",
					CompletedAt:       day.Format(time.RFC3339),
					PassedToNextShift: false,
				})
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"handovers": count,
				"home":      home.Name,
			},
		})
		return
	}

	if name == "seedChecksData" {
		var count int64
		scopedDB.Model(&models.HomeCheckTemplate{}).Where("org_id = ? AND is_deleted = false", claims.OrgID).Count(&count)
		if count > 0 {
			c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Check templates already exist"})
			return
		}

		templates := []struct {
			Title                 string
			Description           string
			Frequency             string
			Area                  string
			DefaultDueTime        string
			RequiresManagerReview bool
			Items                 []struct {
				Title      string
				Question   string
				AllowsNa   bool
				IsRequired bool
			}
		}{
			{
    Title:                 "Daily Home Inspection",
    Description:           "Daily health, safety, and care environment checks.",
    Frequency:             "daily",
    Area:                  "Home",
    DefaultDueTime:        "09:00 AM",
    RequiresManagerReview: false,
    Items: []struct {
        Title      string
        Question   string
        AllowsNa   bool
        IsRequired bool
    }{
        {"Home is clean, tidy, and free from hazards", "Is the home clean, tidy, and free from hazards?", false, true},
        {"Kitchen area is clean and hygienic", "Is the kitchen clean and hygienic?", false, true},
        {"Bathrooms are clean and in good condition", "Are bathrooms clean and in good condition?", false, true},
        {"Communal areas are safe and welcoming", "Are communal areas safe and welcoming?", false, true},
        {"Fire exits clear and accessible", "Are all fire exits clear and accessible?", false, true},
        {"First aid kit available and stocked", "Is the first aid kit stocked and available?", false, true},
        {"Medication storage secure and compliant", "Is medication stored securely?", false, true},
        {"Electrical equipment appears safe", "Does all electrical equipment appear safe?", false, true},
        {"Daily logs accurate and professional", "Have all daily logs been completed?", false, true},
        {"Incidents recorded appropriately", "Have today's incidents been recorded correctly?", true, true},
        {"Safeguarding concerns recorded and followed up", "Have safeguarding concerns been recorded where required?", true, true},
        {"Staffing rota appropriately covered", "Has staff handover been completed?", false, true},
        {"Staff interaction with young people positive", "Were positive interactions observed today?", false, true},
    },
},


{
    Title:                 "Weekly Home Compliance Audit",
    Description:           "Weekly operational and compliance inspection.",
    Frequency:             "weekly",
    Area:                  "Compliance",
    DefaultDueTime:        "10:00 AM",
    RequiresManagerReview: true,
    Items: []struct {
        Title      string
        Question   string
        AllowsNa   bool
        IsRequired bool
    }{
        {"Bedrooms are personalised and maintained", "Are bedrooms personalised and maintained?", false, true},
        {"Furniture in good condition with fire label", "Is furniture in good condition and fire labelled?", false, true},
        {"Windows, doors, and locks functioning properly", "Are windows, doors and locks functioning correctly?", false, true},
        {"Lighting and heating systems working", "Are lighting and heating systems working?", false, true},
        {"Laundry facilities available and working", "Are laundry facilities operational?", false, true},
        {"Garden/external areas safe and maintained", "Are external areas safe and maintained?", true, true},
        {"Fire alarm checks completed and recorded", "Have fire alarm checks been completed?", false, true},
        {"Emergency lighting tested", "Has emergency lighting been tested?", false, true},
        {"Food hygiene standards maintained", "Are food hygiene standards maintained?", false, true},
        {"Support plans updated regularly and personalised", "Are support plans up to date?", false, true},
        {"Risk assessments updated regularly", "Are risk assessments current?", false, true},
        {"Key work sessions completed and recorded", "Have key work sessions been completed?", false, true},
        {"WWeekly reports sent to social workers", "Have weekly reports been sent to social workers?", false, true},
        {"Team meetings take place regularly", "Have team meetings taken place?", true, true},
        {"Supervisions completed regularly", "Have staff supervisions been completed?", true, true},
        {"Behaviour support strategies effective", "Are behaviour support strategies effective?", false, true},
        {"Incident debriefs completed", "Have incident debriefs been completed?", true, true},
    },
},




{
    Title:                 "Monthly Compliance Review",
    Description:           "Monthly statutory compliance and certification review.",
    Frequency:             "monthly",
    Area:                  "Management",
    DefaultDueTime:        "12:00 PM",
    RequiresManagerReview: true,
    Items: []struct {
        Title      string
        Question   string
        AllowsNa   bool
        IsRequired bool
    }{
        {"Fire risk assessment is current", "Is the Fire Risk Assessment current?", false, true},
        {"Fire extinguishers available and in date", "Are fire extinguishers in date?", false, true},
        {"PAT test certificate available and valid", "Is the PAT certificate valid?", true, true},
        {"Gas safety certificate available and valid", "Is the Gas Safety Certificate valid?", false, true},
        {"Electrical safety certificate available and valid", "Is the Electrical Safety Certificate valid?", false, true},
        {"Internet/Wi-Fi operational and accessible", "Is the Wi-Fi service fully operational?", true, true},
        {"COSHH materials stored safely", "Are COSHH materials stored safely?", false, true},
        {"Staff files complete and compliant", "Are staff files complete and compliant?", false, true},
        {"DBS checks valid", "Are DBS checks valid?", false, true},
        {"Mandatory training up to date", "Is mandatory training up to date?", false, true},
        {"Policies understood", "Do staff understand required policies?", false, true},
        {"Pathway plans available and up to date", "Are pathway plans up to date?", false, true},
        {"Progress reports sent to IRO/social worker", "Have progress reports been sent to the IRO/Social Worker?", false, true},
        {"Consent forms", "Are consent forms completed?", false, true},
        {"Education records", "Are education/employment records updated?", false, true},
        {"Missing from home procedures followed", "Have Missing From Home procedures been followed?", true, true},
        {"Return home interviews", "Have Return Home Interviews been completed?", true, true},
        {"Police/social worker communication recorded", "Has communication been properly recorded?", false, true},
    },
},
		}

		for idx, t := range templates {
			tpl := models.HomeCheckTemplate{
				Base: models.Base{
					ID:        uuid.New(),
					OrgID:     claims.OrgID,
					CreatedBy: claims.Email,
				},
				Title:                 t.Title,
				Description:           t.Description,
				Frequency:             t.Frequency,
				Area:                  t.Area,
				DefaultDueTime:        t.DefaultDueTime,
				IsActive:              true,
				RequiresManagerReview: t.RequiresManagerReview,
				DisplayOrder:          idx,
			}
			if err := scopedDB.Create(&tpl).Error; err != nil {
				continue
			}

			for itemIdx, item := range t.Items {
				tplItem := models.HomeCheckTemplateItem{
					Base: models.Base{
						ID:        uuid.New(),
						OrgID:     claims.OrgID,
						CreatedBy: claims.Email,
					},
					TemplateID:          tpl.ID.String(),
					ItemTitle:           item.Title,
					ItemQuestion:        item.Question,
					AllowsNa:            item.AllowsNa,
					IsRequired:          item.IsRequired,
					RequiresNoteOnFail:  true,
					RequiresPhotoOnFail: false,
					IsActive:            true,
					DisplayOrder:        itemIdx,
				}
				scopedDB.Create(&tplItem)
			}
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Successfully seeded default check templates"})
		return
	}

	if name == "seedHomeChecksHistory" {
		var reqBody struct {
			HomeID string `json:"home_id"`
		}
		_ = c.ShouldBindJSON(&reqBody)

		homeID := reqBody.HomeID
		if homeID == "" {
			var home models.Home
			q := scopedDB.Where("org_id = ? AND is_deleted = false", claims.OrgID)
			if len(claims.HomeIDs) > 0 {
				q = q.Where("id = ?", claims.HomeIDs[0])
			}
			if err := q.First(&home).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "BAD_REQUEST", "message": "No home found to seed history for"}})
				return
			}
			homeID = home.ID.String()
		}

		var templates []models.HomeCheckTemplate
		scopedDB.Where("org_id = ? AND is_deleted = false", claims.OrgID).Find(&templates)
		if len(templates) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "BAD_REQUEST", "message": "No check templates found. Please seed templates first."}})
			return
		}

		var staff []models.StaffProfile
		scopedDB.Where("org_id = ? AND is_deleted = false", claims.OrgID).Find(&staff)
		staffID := claims.UserID
		staffName := claims.Email
		if len(staff) > 0 {
			staffID = staff[0].ID.String()
			staffName = staff[0].FullName
		}

		now := time.Now()
		instancesCount := 0
		completionsCount := 0

		// Seed for the past 30 days
		for dayIdx := 30; dayIdx >= 0; dayIdx-- {
			day := now.AddDate(0, 0, -dayIdx)
			dateStr := day.Format("2006-01-02")

			for _, tpl := range templates {
				// Filter check frequency applicability
				applicable := false
				if tpl.Frequency == "daily" {
					applicable = true
				} else if tpl.Frequency == "weekly" && day.Weekday() == time.Sunday {
					applicable = true
				} else if tpl.Frequency == "monthly" && day.Day() == 1 {
					applicable = true
				}

				if !applicable {
					continue
				}

				// Check if instance already exists
				var count int64
				scopedDB.Model(&models.HomeCheckInstance{}).Where("home_id = ? AND template_id = ? AND scheduled_date = ?", homeID, tpl.ID, dateStr).Count(&count)
				if count > 0 {
					continue
				}

				// Determine instance status
				// If today, mark as due. If yesterday, submitted_for_review. Otherwise completed.
				status := "completed"
				if dayIdx == 0 {
					status = "due"
				} else if dayIdx == 1 {
					status = "submitted_for_review"
				}

				instanceID := uuid.New()
				inst := models.HomeCheckInstance{
					Base: models.Base{
						ID:          instanceID,
						OrgID:       claims.OrgID,
						CreatedBy:   claims.Email,
						CreatedDate: day,
						UpdatedDate: day,
					},
					HomeID:            homeID,
					TemplateID:        tpl.ID.String(),
					TemplateTitle:     tpl.Title,
					TemplateArea:      tpl.Area,
					TemplateFrequency: tpl.Frequency,
					ScheduledDate:     dateStr,
					DueAt:             tpl.DefaultDueTime,
					Status:            status,
				}
				if err := scopedDB.Create(&inst).Error; err != nil {
					continue
				}
				instancesCount++

				// If not due, create a completion
				if status != "due" {
					completionID := uuid.New()
					overallStatus := "completed"
					managerReviewStatus := "approved"
					if status == "submitted_for_review" {
						overallStatus = "submitted_for_review"
						managerReviewStatus = "pending"
					}

					compl := models.HomeCheckCompletion{
						Base: models.Base{
							ID:          completionID,
							OrgID:       claims.OrgID,
							CreatedBy:   claims.Email,
							CreatedDate: day,
							UpdatedDate: day,
						},
						HomeID:              homeID,
						InstanceID:          instanceID.String(),
						TemplateID:          tpl.ID.String(),
						SubmittedByStaffID:  staffID,
						SubmittedByName:     staffName,
						SubmittedAt:         day.Format(time.RFC3339),
						CompletionDate:      dateStr,
						OverallStatus:       overallStatus,
						GeneralNote:         "Routine checks carried out.",
						ManagerReviewStatus: managerReviewStatus,
					}
					if err := scopedDB.Create(&compl).Error; err != nil {
						continue
					}
					completionsCount++

					// Fetch template items
					var items []models.HomeCheckTemplateItem
					scopedDB.Where("template_id = ? AND is_deleted = false", tpl.ID).Order("display_order").Find(&items)

					for itemIdx, item := range items {
						respStatus := "pass"
						note := ""
						issueCreated := false

						// Create occasional failures for variety
						if dayIdx%12 == 3 && itemIdx == 0 {
							respStatus = "fail"
							note = "Failed check"
							issueCreated = true
						}

						resp := models.HomeCheckItemResponse{
							Base: models.Base{
								ID:          uuid.New(),
								OrgID:       claims.OrgID,
								CreatedBy:   claims.Email,
								CreatedDate: day,
								UpdatedDate: day,
							},
							CompletionID:       completionID.String(),
							InstanceID:          instanceID.String(),
							TemplateItemID:     item.ID.String(),
							ItemTitle:          item.ItemTitle,
							ResponseStatus:     respStatus,
							Note:               note,
							IssueDetails:       "Detected an issue during routine inspection.",
							IssueCreated:       issueCreated,
							CompletedByStaffID: staffID,
							CompletedByName:    staffName,
							CompletedAt:        day.Format(time.RFC3339),
						}
						scopedDB.Create(&resp)

						if issueCreated {
							// For older issues, resolve them. For newer ones, keep them open.
							issueStatus := "open"
							resolvedByStaffID := ""
							resolvedAt := ""
							if dayIdx > 10 {
								issueStatus = "resolved"
								resolvedByStaffID = staffID
								resolvedAt = day.Add(time.Hour * 2).Format(time.RFC3339)
							}

							issue := models.HomeCheckIssue{
								Base: models.Base{
									ID:          uuid.New(),
									OrgID:       claims.OrgID,
									CreatedBy:   claims.Email,
									CreatedDate: day,
									UpdatedDate: day,
								},
								HomeID:               homeID,
								InstanceID:           instanceID.String(),
								CompletionID:         completionID.String(),
								TemplateID:           tpl.ID.String(),
								TemplateItemID:       item.ID.String(),
								IssueTitle:           fmt.Sprintf("%s — Failed", item.ItemTitle),
								IssueDetails:         "Detected an issue during routine inspection.",
								Severity:             "medium",
								ImmediateActionTaken: "Informed team leader.",	
								Status:               issueStatus,
								ReportedByStaffID:    staffID,
								ReportedByName:       staffName,
								ResolvedByStaffID:    resolvedByStaffID,
								ResolvedAt:           resolvedAt,
							}
							scopedDB.Create(&issue)
						}
					}
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"instances":   instancesCount,
				"completions": completionsCount,
			},
		})
		return
	}

	if name == "compileAppraisalEvidence" {
		var reqBody struct {
			StaffID     string `json:"staff_id"`
			StaffEmail  string `json:"staff_email"`
			PeriodStart string `json:"period_start"`
			PeriodEnd   string `json:"period_end"`
		}
		if err := c.ShouldBindJSON(&reqBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid request body"})
			return
		}

		// Mock evidence generation based on the request
		evidence := gin.H{
			"hours_with_yp": 32.7,
			"key_work_sessions": 0,
			"engagement_level_mode": "medium",
			"independence_progress_avg": "—",
			"achievements_count": 0,
			"life_skills_worked": []string{},
			"training_complete_pct": 20,
			"training_overdue_count": 1,
			"training_expiring_soon_count": 1,
			"avg_quiz_score": 80,
			"supervision_count": 3,
			"supervision_missed": 0,
			"bradford_factor": 0,
			"late_clock_ins": 0,
			"disciplinary_count": 0,
			"allegations_against": 0,
			"incomplete_records": 0,
			"open_data_quality_alerts": 0,
			"yp_feedback_count": 0,
			"swpa_feedback_count": 0,
			"feedback_highlights": []string{},
		}
		
		competencies := []gin.H{
			{"key": "safeguarding", "suggested_score": 4, "heuristic_notes": "Completed all safeguarding records properly."},
			{"key": "engagement", "suggested_score": 3, "heuristic_notes": "Consistent engagement with YPs."},
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"evidence": evidence,
				"competency_scores": competencies,
				"suggested_outcome": "satisfactory",
				"suggested_rating": 3,
				"rolling_score": 68.5,
			},
		})
		return
	}

	if name == "recordEmployeeLocation" {
		var reqBody struct {
			StaffID   string  `json:"staff_id"`
			StaffName string  `json:"staff_name"`
			StaffRole string  `json:"staff_role"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
			Accuracy  float64 `json:"accuracy"`
			Heading   float64 `json:"heading"`
			Speed     float64 `json:"speed"`
		}
		if err := c.ShouldBindJSON(&reqBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid request body"})
			return
		}

		if reqBody.StaffID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "staff_id is required"})
			return
		}

		now := time.Now()
		var existingLocations []models.EmployeeLocation
		err := scopedDB.Where("staff_id = ? AND org_id = ? AND is_active = true", reqBody.StaffID, claims.OrgID).Find(&existingLocations).Error

		if err != nil || len(existingLocations) == 0 {
			// Create new record
			newLoc := models.EmployeeLocation{
				Base: models.Base{
					ID:          uuid.New(),
					OrgID:       claims.OrgID,
					CreatedBy:   claims.Email,
					CreatedDate: now,
					UpdatedDate: now,
				},
				StaffID:   reqBody.StaffID,
				StaffName: reqBody.StaffName,
				StaffRole: reqBody.StaffRole,
				Latitude:  reqBody.Latitude,
				Longitude: reqBody.Longitude,
				Accuracy:  reqBody.Accuracy,
				Heading:   reqBody.Heading,
				Speed:     reqBody.Speed,
				Timestamp: &now,
				IsActive:  true,
			}
			if err := scopedDB.Create(&newLoc).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to save location"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"status": "success", "data": newLoc})
			return
		}

		// Update existing record
		existing := existingLocations[0]
		existing.Latitude = reqBody.Latitude
		existing.Longitude = reqBody.Longitude
		existing.Accuracy = reqBody.Accuracy
		existing.Heading = reqBody.Heading
		existing.Speed = reqBody.Speed
		existing.Timestamp = &now
		existing.UpdatedDate = now

		if err := scopedDB.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to update location"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "data": existing})
		return
	}

	if name == "seedStaffTracking" {
		var staffList []models.StaffProfile
		if err := scopedDB.Where("org_id = ? AND is_deleted = false", claims.OrgID).Find(&staffList).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch staff"})
			return
		}

		createdCount := 0
		now := time.Now()

		for _, staff := range staffList {
			var count int64
			scopedDB.Model(&models.LocationTrackingConsent{}).Where("staff_id = ? AND org_id = ?", staff.ID, claims.OrgID).Count(&count)
			if count == 0 {
				newConsent := models.LocationTrackingConsent{
					Base: models.Base{
						ID:          uuid.New(),
						OrgID:       claims.OrgID,
						CreatedBy:   "system",
						CreatedDate: now,
						UpdatedDate: now,
					},
					StaffID:        staff.ID.String(),
					UserEmail:      staff.Email,
					Consented:      false,
					ConsentVersion: "1.0",
				}
				scopedDB.Create(&newConsent)
				createdCount++
			}
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "message": fmt.Sprintf("Created tracking consent for %d staff members", createdCount)})
		return
	}

	if name == "secureDataGateway" {
		invokeSecureDataGateway(c, claims)
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown function: " + name}})
}

type secureGatewayPayload struct {
	Entity    string                 `json:"entity"`
	Operation string                 `json:"operation"`
	Sort      string                 `json:"sort"`
	Limit     int                    `json:"limit"`
	Filters   map[string]interface{} `json:"filters"`
	ID        string                 `json:"id"`
	Data      map[string]interface{} `json:"data"`
	Hint      map[string]interface{} `json:"_hint"`
}

func sgOK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": gin.H{"data": data, "error": nil}})
}

func sgErr(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": gin.H{"data": nil, "error": msg}})
}

func sgBodyFilters(q *gorm.DB, filters map[string]interface{}) *gorm.DB {
	for field, value := range filters {
		switch v := value.(type) {
		case map[string]interface{}:
			for op, opVal := range v {
				switch op {
				case "$in":
					if arr, ok := toIfaceSlice(opVal); ok {
						q = q.Where(field+" IN ?", arr)
					}
				case "$nin":
					if arr, ok := toIfaceSlice(opVal); ok {
						q = q.Where(field+" NOT IN ?", arr)
					}
				case "$gte":
					q = q.Where(field+" >= ?", opVal)
				case "$gt":
					q = q.Where(field+" > ?", opVal)
				case "$lte":
					q = q.Where(field+" <= ?", opVal)
				case "$lt":
					q = q.Where(field+" < ?", opVal)
				case "$ne":
					q = q.Where(field+" != ?", opVal)
				case "$contains":
					q = q.Where(field+" ILIKE ?", "%"+fmt.Sprint(opVal)+"%")
				case "$startsWith":
					q = q.Where(field+" ILIKE ?", fmt.Sprint(opVal)+"%")
				case "$exists":
					if opVal == true {
						q = q.Where(field + " IS NOT NULL")
					} else {
						q = q.Where(field + " IS NULL")
					}
				}
			}
		default:
			q = q.Where(field+" = ?", v)
		}
	}
	return q
}

func toIfaceSlice(v interface{}) ([]interface{}, bool) {
	if arr, ok := v.([]interface{}); ok {
		return arr, true
	}
	if s, ok := v.(string); ok {
		parts := strings.Split(s, ",")
		out := make([]interface{}, len(parts))
		for i, p := range parts {
			out[i] = strings.TrimSpace(p)
		}
		return out, true
	}
	return nil, false
}

func sgOrderStr(sort string) string {
	if sort == "" {
		return "created_date DESC"
	}
	if strings.HasPrefix(sort, "-") {
		return strings.TrimPrefix(sort, "-") + " DESC"
	}
	return sort + " ASC"
}

func invokeSecureDataGateway(c *gin.Context, claims *services.Claims) {
	var body secureGatewayPayload
	if err := c.ShouldBindJSON(&body); err != nil {
		sgErr(c, "Invalid request body")
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return // error response already written
	}

	entityName := body.Entity
	newModel, modelOk := entityRegistry[entityName]
	newSlice, sliceOk := sliceRegistry[entityName]
	if !modelOk || !sliceOk {
		sgErr(c, "Unknown entity: "+entityName)
		return
	}

	// Map gateway operation to equivalent HTTP method for module permission check.
	method := http.MethodGet
	switch body.Operation {
	case "create":
		method = http.MethodPost
	case "update":
		method = http.MethodPut
	case "delete":
		method = http.MethodDelete
	}
	if status, errBody, allowed := middleware.EnforceEntityPermission(claims, entityName, method); !allowed {
		// HR Self-Service Bypass
		selfServiceAllowed := false
		if body.Hint != nil && body.Hint["staff_profile_id"] != nil {
			staffProfileID := fmt.Sprint(body.Hint["staff_profile_id"])
			hrEntities := map[string]bool{
				"StaffDocument": true, "Payslip": true, "Timesheet": true,
				"LeaveRequest": true, "LeaveBalance": true, "TrainingRecord": true,
			}
			if hrEntities[entityName] {
				if method == http.MethodGet && body.Filters != nil && fmt.Sprint(body.Filters["staff_id"]) == staffProfileID {
					selfServiceAllowed = true
				} else if method == http.MethodPost && body.Data != nil && fmt.Sprint(body.Data["staff_id"]) == staffProfileID {
					selfServiceAllowed = true
				} else if method == http.MethodPut && body.Data != nil && fmt.Sprint(body.Data["staff_id"]) == staffProfileID {
					selfServiceAllowed = true
				}
			}
		}

		if !selfServiceAllowed {
			c.JSON(status, errBody)
			return
		}
	}

	limit := body.Limit
	if limit <= 0 {
		limit = 500
	}
	if limit > 500 {
		limit = 500
	}
	order := sgOrderStr(body.Sort)

	switch body.Operation {

	case "list":
		results := newSlice()
		q := scopedDB.Model(newModel())
		q = applyScope(q, claims, entityName)
		q.Order(order).Limit(limit).Find(results)
		sgOK(c, results)

	case "filter":
		results := newSlice()
		q := scopedDB.Model(newModel())
		q = applyScope(q, claims, entityName)
		q = sgBodyFilters(q, body.Filters)
		q.Order(order).Limit(limit).Find(results)
		sgOK(c, results)

	case "get":
		if body.ID == "" {
			sgErr(c, "ID required")
			return
		}
		result := newModel()
		if err := scopedDB.Where("id = ? AND org_id = ? AND is_deleted = false", body.ID, claims.OrgID).First(result).Error; err != nil {
			sgErr(c, entityName+" not found")
			return
		}
		sgOK(c, result)

	case "create":
		data := body.Data
		if data == nil {
			sgErr(c, "Data required")
			return
		}
		data["org_id"] = claims.OrgID
		data["created_by"] = claims.Email
		delete(data, "id")
		delete(data, "created_date")
		delete(data, "updated_date")
		delete(data, "is_deleted")

		if err := normalizeEntityData(entityName, data); err != nil {
			sgErr(c, err.Error())
			return
		}

		record := newModel()
		jsonBytes, err := json.Marshal(data)
		if err != nil {
			sgErr(c, err.Error())
			return
		}
		if err := json.Unmarshal(jsonBytes, record); err != nil {
			sgErr(c, err.Error())
			return
		}
		if err := scopedDB.Create(record).Error; err != nil {
			sgErr(c, err.Error())
			return
		}
		rv := reflect.ValueOf(record)
		if rv.Kind() == reflect.Ptr {
			rv = rv.Elem()
		}
		if idField := rv.FieldByName("ID"); idField.IsValid() {
			idStr := fmt.Sprintf("%v", idField.Interface())
			saveJSONBFields(scopedDB ,entityName, record, idStr, data)
		}
		if entityName == "RolePermission" {
			if roleName, ok := data["role_name"].(string); ok && roleName != "" {
				middleware.InvalidatePermCache(claims.OrgID, roleName)
			}
		}

		// Write a generic audit entry for every entity, same as the /entities/:entity
		// REST path (CreateEntity) — this gateway is a second entry point to the
		// exact same tables and must not skip audit logging.
		afterSnap, _ := json.Marshal(record)
		middleware.WriteEntityAudit(
			claims.OrgID, claims.Email, claims.UserID, claims.Role, c.ClientIP(),
			entityName, "created",
			nil, afterSnap,
			record,
		)

		sgOK(c, record)

	case "update":
		if body.ID == "" {
			sgErr(c, "ID required")
			return
		}
		data := body.Data
		if data == nil {
			sgErr(c, "Data required")
			return
		}

		record := newModel()
		if err := scopedDB.Where("id = ? AND org_id = ? AND is_deleted = false", body.ID, claims.OrgID).First(record).Error; err != nil {
			sgErr(c, entityName+" not found")
			return
		}

		data["updated_date"] = time.Now().UTC()
		delete(data, "id")
		delete(data, "org_id")
		delete(data, "created_by")
		delete(data, "created_date")
		delete(data, "is_deleted")

		if err := normalizeEntityData(entityName, data); err != nil {
			sgErr(c, err.Error())
			return
		}
		if err := scopedDB.Model(record).Where("id = ?", body.ID).Updates(data).Error; err != nil {
			sgErr(c, err.Error())
			return
		}
		saveJSONBFields(scopedDB,entityName, record, body.ID, data)

		updated := newModel()
		scopedDB.Where("id = ?", body.ID).First(updated)
		if entityName == "RolePermission" {
			if rp, ok := updated.(*models.RolePermission); ok {
				middleware.InvalidatePermCache(claims.OrgID, rp.RoleName)
			}
		}

		// Write a generic audit entry — see the "create" case above for why.
		beforeSnap, _ := json.Marshal(record)
		afterSnap, _ := json.Marshal(updated)
		middleware.WriteEntityAudit(
			claims.OrgID, claims.Email, claims.UserID, claims.Role, c.ClientIP(),
			entityName, "updated",
			beforeSnap, afterSnap,
			updated,
		)

		sgOK(c, updated)

	case "delete":
		if body.ID == "" {
			sgErr(c, "ID required")
			return
		}
		record := newModel()
		if err := scopedDB.Where("id = ? AND org_id = ? AND is_deleted = false", body.ID, claims.OrgID).First(record).Error; err != nil {
			sgErr(c, entityName+" not found")
			return
		}
		beforeSnap, _ := json.Marshal(record)
		scopedDB.Model(record).Where("id = ?", body.ID).Updates(map[string]interface{}{"is_deleted": true, "updated_date": time.Now().UTC()})

		// Write a generic audit entry — see the "create" case above for why.
		middleware.WriteEntityAudit(
			claims.OrgID, claims.Email, claims.UserID, claims.Role, c.ClientIP(),
			entityName, "deleted",
			beforeSnap, nil,
			record,
		)

		sgOK(c, gin.H{"deleted": true})

	default:
		sgErr(c, "Unknown operation: "+body.Operation)
	}
}
