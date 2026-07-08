package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"carecore-backend/middleware"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
)

type uploadSignedURLRequest struct {
	Key              string `json:"key"`
	FileURL          string `json:"file_url"`
	ExpiresInSeconds int64  `json:"expires_in_seconds"`
}

type uploadDeleteRequest struct {
	Key     string `json:"key"`
	FileURL string `json:"file_url"`
}

func UploadFile(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": "file required"},
		})
		return
	}

	if claims := middleware.GetClaims(c); claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  gin.H{"code": "UNAUTHORIZED", "message": "Authentication required"},
		})
		return
	}

	folder := strings.TrimSpace(c.PostForm("folder"))
	if folder == "" {
		// try to infer a sensible folder from other form fields
		homeID := strings.TrimSpace(c.PostForm("home_id"))
		docType := strings.TrimSpace(c.PostForm("document_type"))
		sub := strings.TrimSpace(c.PostForm("subfolder"))

		if homeID != "" {
			if sub == "" {
				if docType != "" {
					sub = docType
				} else {
					sub = "documents"
				}
			}
			folder = fmt.Sprintf("homes/%s/%s", homeID, sub)
		} else {
			userID := strings.TrimSpace(c.PostForm("user_id"))
			residentID := strings.TrimSpace(c.PostForm("resident_id"))
			staffID := strings.TrimSpace(c.PostForm("staff_id"))
			if userID != "" {
				folder = fmt.Sprintf("users/%s/documents", userID)
			} else if residentID != "" {
				folder = fmt.Sprintf("residents/%s/attachments", residentID)
			} else if staffID != "" {
				folder = fmt.Sprintf("staff/%s/documents", staffID)
			} else {
				// leave empty -> service will default to temp
				folder = ""
			}
		}
	}
	result, err := services.UploadMultipartFile(c.Request.Context(), fileHeader, folder)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrUploadValidation) {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{
			"status": "error",
			"error":  gin.H{"code": http.StatusText(status), "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   result,
	})
}

func GetSignedUploadURL(c *gin.Context) {
	var req uploadSignedURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	key, err := services.ResolveObjectKey(firstNonEmpty(req.Key, req.FileURL))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	expires := req.ExpiresInSeconds
	if expires <= 0 {
		expires = 3600
	}

	signedURL, err := services.GenerateSignedURL(c.Request.Context(), key, time.Duration(expires)*time.Second)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"file_url": signedURL,
			"key":      key,
		},
	})
}

func DeleteUpload(c *gin.Context) {
	var req uploadDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	key, err := services.ResolveObjectKey(firstNonEmpty(req.Key, req.FileURL))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	if err := services.DeleteObject(c.Request.Context(), key); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"deleted": true,
			"key":     key,
		},
	})
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
