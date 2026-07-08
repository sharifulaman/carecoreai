package business

import (
	"net/http"
	"sort"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"

	"github.com/gin-gonic/gin"
)

// GetYPSummary returns a single-resident snapshot used by the YP workspace header card.
// GET /business/yp-summary/:residentId
func GetYPSummary(c *gin.Context) {
	residentID := c.Param("residentId")
	claims := middleware.GetClaims(c)

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var resident models.Resident
	if err := scopedDB.Where("id = ? AND org_id = ? AND is_deleted = false", residentID, claims.OrgID).First(&resident).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "NOT_FOUND", "message": "Resident not found"},
		})
		return
	}

	// Open safeguarding concerns
	var openSafeguarding int64
	scopedDB.Model(&models.SafeguardingRecord{}).
		Where("resident_id = ? AND status = 'open' AND is_deleted = false", residentID).
		Count(&openSafeguarding)

	// Latest visit report
	var latestVisit models.VisitReport
	scopedDB.Where("resident_id = ? AND is_deleted = false", residentID).
		Order("created_date DESC").Limit(1).First(&latestVisit)

	// Active medication count
	var activeMeds int64
	scopedDB.Model(&models.MedicationRecord{}).
		Where("resident_id = ? AND status = 'active' AND is_deleted = false", residentID).
		Count(&activeMeds)

	// Upcoming appointments (next 30 days)
	now := time.Now().UTC()
	in30 := now.AddDate(0, 0, 30)
	var upcomingAppointments int64
	scopedDB.Model(&models.Appointment{}).
		Where("resident_id = ? AND status = 'scheduled' AND is_deleted = false AND start_datetime BETWEEN ? AND ?", residentID, now, in30).
		Count(&upcomingAppointments)

	// Open pathway plan
	var pathwayStatus string
	var plan models.PathwayPlan
	if err := scopedDB.Where("resident_id = ? AND is_deleted = false", residentID).
		Order("version DESC").Limit(1).First(&plan).Error; err == nil {
		pathwayStatus = plan.Status
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"resident_id":           residentID,
			"display_name":          resident.DisplayName,
			"education_status":      resident.EducationStatus,
			"placement_type":        resident.PlacementType,
			"open_safeguarding":     openSafeguarding,
			"active_medications":    activeMeds,
			"upcoming_appointments": upcomingAppointments,
			"pathway_plan_status":   pathwayStatus,
			"latest_visit_date":     latestVisit.Date,
		},
		"timestamp": now,
	})
}

// timelineItem is a single event in chronological order.
type timelineItem struct {
	ID         string    `json:"id"`
	Module     string    `json:"module"`
	Title      string    `json:"title"`
	Date       time.Time `json:"date"`
	RecordedBy string    `json:"recorded_by"`
	Extra      string    `json:"extra,omitempty"`
}

// GetYPTimeline returns a merged chronological event feed for one resident.
// GET /business/yp-timeline/:residentId
func GetYPTimeline(c *gin.Context) {
	residentID := c.Param("residentId")
	claims := middleware.GetClaims(c)

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	// Confirm the resident belongs to the caller's org
	var resident models.Resident
	if err := scopedDB.Where("id = ? AND org_id = ? AND is_deleted = false", residentID, claims.OrgID).First(&resident).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "NOT_FOUND", "message": "Resident not found"},
		})
		return
	}

	var items []timelineItem

	// Visit reports
	var visits []models.VisitReport
	scopedDB.Where("resident_id = ? AND is_deleted = false", residentID).
		Order("created_date DESC").Limit(50).Find(&visits)
	for _, v := range visits {
		items = append(items, timelineItem{
			ID:         v.ID.String(),
			Module:     "VisitReport",
			Title:      "Visit report — " + v.Date,
			Date:       v.CreatedDate,
			RecordedBy: v.WorkerName,
		})
	}

	// Daily logs
	var logs []models.DailyLog
	scopedDB.Where("resident_id = ? AND is_deleted = false", residentID).
		Order("created_date DESC").Limit(50).Find(&logs)
	for _, l := range logs {
		title := "Daily log — " + l.Date + " (" + l.Shift + ")"
		if l.Flagged {
			title = "[FLAGGED] " + title
		}
		items = append(items, timelineItem{
			ID:         l.ID.String(),
			Module:     "DailyLog",
			Title:      title,
			Date:       l.CreatedDate,
			RecordedBy: l.WorkerName,
		})
	}

	// Appointments
	var appts []models.Appointment
	scopedDB.Where("resident_id = ? AND is_deleted = false", residentID).
		Order("created_date DESC").Limit(30).Find(&appts)
	for _, a := range appts {
		items = append(items, timelineItem{
			ID:         a.ID.String(),
			Module:     "Appointment",
			Title:      a.Title + " (" + a.AppointmentType + ")",
			Date:       a.CreatedDate,
			RecordedBy: a.OrganiserName,
			Extra:      a.Status,
		})
	}

	// Safeguarding records
	var sg []models.SafeguardingRecord
	scopedDB.Where("resident_id = ? AND is_deleted = false", residentID).
		Order("created_date DESC").Limit(20).Find(&sg)
	for _, s := range sg {
		items = append(items, timelineItem{
			ID:         s.ID.String(),
			Module:     "SafeguardingRecord",
			Title:      "Safeguarding — " + s.ConcernType,
			Date:       s.CreatedDate,
			RecordedBy: s.ReportedBy,
			Extra:      s.Status,
		})
	}

	// Medication records
	var meds []models.MedicationRecord
	scopedDB.Where("resident_id = ? AND is_deleted = false", residentID).
		Order("created_date DESC").Limit(20).Find(&meds)
	for _, m := range meds {
		items = append(items, timelineItem{
			ID:         m.ID.String(),
			Module:     "MedicationRecord",
			Title:      m.MedicationName + " — " + m.Status,
			Date:       m.CreatedDate,
			RecordedBy: m.CreatedBy,
		})
	}

	// Sort all events newest-first
	sort.Slice(items, func(i, j int) bool {
		return items[i].Date.After(items[j].Date)
	})

	// Cap at 200 events to keep response manageable
	if len(items) > 200 {
		items = items[:200]
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"data":      items,
		"timestamp": time.Now().UTC(),
	})
}
