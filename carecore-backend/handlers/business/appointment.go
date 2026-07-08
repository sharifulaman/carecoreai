package business

import (
	"encoding/json"
	"net/http"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)


type appointmentRequest struct {
	Data struct {
		models.Appointment
		SendInvites bool `json:"send_invites"`
	} `json:"data"`
}

func CreateAppointment(c *gin.Context) {
	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var req appointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	claims := middleware.GetClaims(c)
	now := time.Now().UTC()
	d := req.Data

	appointment := d.Appointment
	appointment.ID = uuid.New()
	appointment.OrgID = claims.OrgID
	appointment.CreatedBy = claims.Email
	appointment.CreatedDate = now
	appointment.UpdatedDate = now

	// Save appointment
	if err := scopedDB.Create(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "DATABASE_ERROR", "message": err.Error()},
		})
		return
	}

	handleInvites(&appointment, claims, now, d.SendInvites)

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   appointment,
		"timestamp": now,
	})
}

func UpdateAppointment(c *gin.Context) {
	id := c.Param("id")
	var req appointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return
	}

	var existing models.Appointment
	if err := scopedDB.Where("id = ? AND is_deleted = false", id).First(&existing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"message": "Not found"}})
		return
	}

	claims := middleware.GetClaims(c)
	now := time.Now().UTC()
	d := req.Data

	appointment := d.Appointment
	appointment.ID = existing.ID
	appointment.OrgID = existing.OrgID
	appointment.CreatedBy = existing.CreatedBy
	appointment.CreatedDate = existing.CreatedDate
	appointment.UpdatedDate = now

	// Save appointment
	if err := scopedDB.Save(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "DATABASE_ERROR", "message": err.Error()},
		})
		return
	}

	handleInvites(&appointment, claims, now, d.SendInvites)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   appointment,
		"timestamp": now,
	})
}

func handleInvites(appointment *models.Appointment, claims *services.Claims, now time.Time, sendInvites bool) {
	if !sendInvites {
		return
	}

	var attendees []struct {
		StaffID string `json:"staff_id"`
	}

	if len(appointment.Attendees) > 0 {
		json.Unmarshal(appointment.Attendees, &attendees)
	}

	dateStr := ""
	if appointment.StartDatetime != nil {
		dateStr = appointment.StartDatetime.Format("Monday 2 January 2006 at 15:04")
	}

	scopedDB, ok := mustScopedDB(nil)
	if !ok {
		return
	}

	for _, a := range attendees {
		if a.StaffID == "" {
			continue
		}
		
		notif := models.Notification{
			Base:            models.Base{ID: uuid.New(), OrgID: claims.OrgID, CreatedBy: claims.Email, CreatedDate: now, UpdatedDate: now},
			UserID:          a.StaffID,
			Type:            "appointment_invite",
			Title:           "Appointment Invitation: " + appointment.Title,
			Body:            appointment.OrganiserName + " has invited you to: " + appointment.Title + " on " + dateStr + ".",
			Link:            "/residents?tab=appointments",
			Priority:        "normal",
			RelatedModule:   "Appointment",
			RelatedRecordID: appointment.ID.String(),
			Read:            false,
		}
		scopedDB.Create(&notif)
	}
}
