package handlers

import (
	"encoding/json"
	"net/http"
	"reflect"
	"time"

	"carecore-backend/middleware"

	"github.com/gin-gonic/gin"
)

// BulkCreateEntities handles POST /entities/:entity/bulk
func BulkCreateEntities(c *gin.Context) {
	entityName := c.Param("entity")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "NOT_FOUND", "message": "Unknown entity: " + entityName},
		})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return // error response already written
	}

	claims := middleware.GetClaims(c)

	var items []map[string]interface{}
	// Try parsing as flat array first
	if err := c.ShouldBindJSON(&items); err != nil {
		// Fallback to {"data": [...]}
		var body struct {
			Data []map[string]interface{} `json:"data"`
		}
		if err2 := c.ShouldBindJSON(&body); err2 == nil {
			items = body.Data
		} else {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
			})
			return
		}
	}

	if len(items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "VALIDATION_ERROR", "message": "data array is empty"},
		})
		return
	}

	if len(items) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error": gin.H{
				"code":    "QUOTA_EXCEEDED",
				"message": "Bulk request exceeds 1000 record limit",
				"details": gin.H{"limit": 1000, "requested": len(items)},
			},
		})
		return
	}

	createdIDs := []string{}
	failed := 0
	results := []map[string]interface{}{}

	// Run all inserts in a transaction
	tx := scopedDB.Begin()
	for _, item := range items {
		// Remove protected fields so BeforeCreate hook can set them if needed
		delete(item, "id")
		delete(item, "created_date")
		delete(item, "updated_date")
		delete(item, "is_deleted")

		item["org_id"] = claims.OrgID
		item["created_by"] = claims.Email

		if err := normalizeEntityData(entityName, item); err != nil {
			failed++
			continue
		}

		record := newModel()
		// Marshal map to JSON and then to struct to trigger hooks correctly
		jsonBytes, err := json.Marshal(item)
		if err != nil {
			failed++
			continue
		}
		if err := json.Unmarshal(jsonBytes, record); err != nil {
			failed++
			continue
		}

		if err := tx.Create(record).Error; err != nil {
			failed++
			continue
		}

		// Use reflection to get the ID
		var id string
		rv := reflect.ValueOf(record)
		if rv.Kind() == reflect.Ptr {
			rv = rv.Elem()
		}
		if idField := rv.FieldByName("ID"); idField.IsValid() {
			id = idField.String()
		}

		// Explicit JSONB field save
		if id != "" {
			saveJSONBFields(scopedDB,entityName, record, id, item)
			createdIDs = append(createdIDs, id)
			results = append(results, map[string]interface{}{
				"id":     id,
				"status": "created",
			})
		} else {
			failed++
		}
	}
	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   results,
		"metadata": gin.H{
			"created": len(createdIDs),
			"failed":  failed,
			"total":   len(items),
		},
		"timestamp": time.Now(),
	})
}

// BulkUpdateEntities handles PUT /entities/:entity/bulk
func BulkUpdateEntities(c *gin.Context) {
	entityName := c.Param("entity")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  gin.H{"code": "NOT_FOUND", "message": "Unknown entity: " + entityName},
		})
		return
	}

	scopedDB, ok := mustScopedDB(c)
	if !ok {
		return // error response already written
	}

	claims := middleware.GetClaims(c)

	var items []map[string]interface{}
	// Try parsing as flat array first
	if err := c.ShouldBindJSON(&items); err != nil {
		// Fallback to {"data": [...]}
		var body struct {
			Data []map[string]interface{} `json:"data"`
		}
		if err2 := c.ShouldBindJSON(&body); err2 == nil {
			items = body.Data
		} else {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error":  gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
			})
			return
		}
	}

	if len(items) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "QUOTA_EXCEEDED", "message": "Bulk request exceeds 1000 record limit"},
		})
		return
	}

	updated := 0
	failed := 0
	results := []map[string]interface{}{}

	tx := scopedDB.Begin()
	for _, item := range items {
		id, ok := item["id"].(string)
		if !ok || id == "" {
			failed++
			continue
		}

		// Protect immutable fields
		delete(item, "org_id")
		delete(item, "created_by")
		delete(item, "created_date")
		delete(item, "is_deleted")
		item["updated_date"] = time.Now().UTC()

		if err := normalizeEntityData(entityName, item); err != nil {
			failed++
			continue
		}

		record := newModel()
		res := tx.Model(record).
			Where("id = ? AND org_id = ? AND is_deleted = false", id, claims.OrgID).
			Updates(item)

		if res.Error != nil || res.RowsAffected == 0 {
			failed++
			results = append(results, map[string]interface{}{"id": id, "status": "failed"})
			continue
		}
		saveJSONBFields(scopedDB,entityName, record, id, item)

		updated++
		results = append(results, map[string]interface{}{"id": id, "status": "updated"})
	}
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   results,
		"metadata": gin.H{
			"updated": updated,
			"failed":  failed,
			"total":   len(items),
		},
		"timestamp": time.Now(),
	})
}
