package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"carecore-backend/db"
	"carecore-backend/middleware"
	"carecore-backend/models"
	"carecore-backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// entityRegistry maps frontend entity names to GORM models and table names
var entityRegistry = map[string]func() interface{}{
	"Organisation":               func() interface{} { return &models.Organisation{} },
	"StaffProfile":               func() interface{} { return &models.StaffProfile{} },
	"Home":                       func() interface{} { return &models.Home{} },
	"Resident":                   func() interface{} { return &models.Resident{} },
	"DailyLog":                   func() interface{} { return &models.DailyLog{} },
	"VisitReport":                func() interface{} { return &models.VisitReport{} },
	"KPIRecord":                  func() interface{} { return &models.KPIRecord{} },
	"SWPerformanceKPI":           func() interface{} { return &models.SWPerformanceKPI{} },
	"SupportPlan":                func() interface{} { return &models.SupportPlan{} },
	"ILSPlan":                    func() interface{} { return &models.ILSPlan{} },
	"ILSPlanSection":             func() interface{} { return &models.ILSPlanSection{} },
	"CICReport":                  func() interface{} { return &models.CICReport{} },
	"AccidentReport":             func() interface{} { return &models.AccidentReport{} },
	"SafeguardingRecord":         func() interface{} { return &models.SafeguardingRecord{} },
	"MedicationRecord":           func() interface{} { return &models.MedicationRecord{} },
	"MAREntry":                   func() interface{} { return &models.MAREntry{} },
	"GPAppointment":              func() interface{} { return &models.GPAppointment{} },
	"Bill":                       func() interface{} { return &models.Bill{} },
	"HomeDocument":               func() interface{} { return &models.HomeDocument{} },
	"HomeTask":                   func() interface{} { return &models.HomeTask{} },
	"HomeLog":                    func() interface{} { return &models.HomeLog{} },
	"HomeAsset":                  func() interface{} { return &models.HomeAsset{} },
	"HomeCheck":                  func() interface{} { return &models.HomeCheck{} },
	"HomeBudget":                 func() interface{} { return &models.HomeBudget{} },
	"HomeBudgetLine":             func() interface{} { return &models.HomeBudgetLine{} },
	"HomeExpense":                func() interface{} { return &models.HomeExpense{} },
	"PlacementFee":               func() interface{} { return &models.PlacementFee{} },
	"PlacementInvoice":           func() interface{} { return &models.PlacementInvoice{} },
	"PettyCash":                  func() interface{} { return &models.PettyCash{} },
	"PettyCashTransaction":       func() interface{} { return &models.PettyCashTransaction{} },
	"Shift":                      func() interface{} { return &models.Shift{} },
	"ShiftTemplate":              func() interface{} { return &models.ShiftTemplate{} },
	"ShiftHandover":              func() interface{} { return &models.ShiftHandover{} },
	"Rota":                       func() interface{} { return &models.Rota{} },
	"ResidentAllowance":          func() interface{} { return &models.ResidentAllowance{} },
	"ResidentSavings":            func() interface{} { return &models.ResidentSavings{} },
	"ResidentSavingsTransaction": func() interface{} { return &models.ResidentSavingsTransaction{} },
	"Notification":               func() interface{} { return &models.Notification{} },
	"KPIOption":                  func() interface{} { return &models.KPIOption{} },
	"StaffAvailabilityProfile":   func() interface{} { return &models.StaffAvailabilityProfile{} },
	"StaffAvailabilityOverride":  func() interface{} { return &models.StaffAvailabilityOverride{} },
	"AuditTrail":                 func() interface{} { return &models.AuditTrail{} },
}

// sliceRegistry returns a pointer to a slice for list queries
var sliceRegistry = map[string]func() interface{}{
	"Organisation":               func() interface{} { return &[]models.Organisation{} },
	"StaffProfile":               func() interface{} { return &[]models.StaffProfile{} },
	"Home":                       func() interface{} { return &[]models.Home{} },
	"Resident":                   func() interface{} { return &[]models.Resident{} },
	"DailyLog":                   func() interface{} { return &[]models.DailyLog{} },
	"VisitReport":                func() interface{} { return &[]models.VisitReport{} },
	"KPIRecord":                  func() interface{} { return &[]models.KPIRecord{} },
	"SWPerformanceKPI":           func() interface{} { return &[]models.SWPerformanceKPI{} },
	"SupportPlan":                func() interface{} { return &[]models.SupportPlan{} },
	"ILSPlan":                    func() interface{} { return &[]models.ILSPlan{} },
	"ILSPlanSection":             func() interface{} { return &[]models.ILSPlanSection{} },
	"CICReport":                  func() interface{} { return &[]models.CICReport{} },
	"AccidentReport":             func() interface{} { return &[]models.AccidentReport{} },
	"SafeguardingRecord":         func() interface{} { return &[]models.SafeguardingRecord{} },
	"MedicationRecord":           func() interface{} { return &[]models.MedicationRecord{} },
	"MAREntry":                   func() interface{} { return &[]models.MAREntry{} },
	"GPAppointment":              func() interface{} { return &[]models.GPAppointment{} },
	"Bill":                       func() interface{} { return &[]models.Bill{} },
	"HomeDocument":               func() interface{} { return &[]models.HomeDocument{} },
	"HomeTask":                   func() interface{} { return &[]models.HomeTask{} },
	"HomeLog":                    func() interface{} { return &[]models.HomeLog{} },
	"HomeAsset":                  func() interface{} { return &[]models.HomeAsset{} },
	"HomeCheck":                  func() interface{} { return &[]models.HomeCheck{} },
	"HomeBudget":                 func() interface{} { return &[]models.HomeBudget{} },
	"HomeBudgetLine":             func() interface{} { return &[]models.HomeBudgetLine{} },
	"HomeExpense":                func() interface{} { return &[]models.HomeExpense{} },
	"PlacementFee":               func() interface{} { return &[]models.PlacementFee{} },
	"PlacementInvoice":           func() interface{} { return &[]models.PlacementInvoice{} },
	"PettyCash":                  func() interface{} { return &[]models.PettyCash{} },
	"PettyCashTransaction":       func() interface{} { return &[]models.PettyCashTransaction{} },
	"Shift":                      func() interface{} { return &[]models.Shift{} },
	"ShiftTemplate":              func() interface{} { return &[]models.ShiftTemplate{} },
	"ShiftHandover":              func() interface{} { return &[]models.ShiftHandover{} },
	"Rota":                       func() interface{} { return &[]models.Rota{} },
	"ResidentAllowance":          func() interface{} { return &[]models.ResidentAllowance{} },
	"ResidentSavings":            func() interface{} { return &[]models.ResidentSavings{} },
	"ResidentSavingsTransaction": func() interface{} { return &[]models.ResidentSavingsTransaction{} },
	"Notification":               func() interface{} { return &[]models.Notification{} },
	"KPIOption":                  func() interface{} { return &[]models.KPIOption{} },
	"StaffAvailabilityProfile":   func() interface{} { return &[]models.StaffAvailabilityProfile{} },
	"StaffAvailabilityOverride":  func() interface{} { return &[]models.StaffAvailabilityOverride{} },
	"AuditTrail":                 func() interface{} { return &[]models.AuditTrail{} },
}

// applyScope injects org_id and role-based home filtering
func applyScope(q *gorm.DB, claims *services.Claims, entityName string) *gorm.DB {
	q = q.Where("org_id = ? AND is_deleted = false", claims.OrgID)

	// Home-scoped entities for non-admins
	homeScoped := map[string]bool{
		"Resident": true, "DailyLog": true, "VisitReport": true,
		"Shift": true, "ShiftHandover": true, "Rota": true,
		"Bill": true, "PettyCash": true, "PettyCashTransaction": true,
		"AccidentReport": true, "HomeDocument": true, "HomeTask": true,
		"HomeLog": true, "HomeAsset": true, "HomeCheck": true,
		"HomeBudget": true, "HomeBudgetLine": true, "HomeExpense": true,
		"PlacementFee": true, "PlacementInvoice": true,
		"SafeguardingRecord": true, "MedicationRecord": true,
		"GPAppointment": true, "SupportPlan": true,
	}

	if claims.Role != "admin" && homeScoped[entityName] && len(claims.HomeIDs) > 0 {
		q = q.Where("home_id IN ?", claims.HomeIDs)
	}
	return q
}

// applyFilters parses query params and builds WHERE clauses
func applyFilters(q *gorm.DB, c *gin.Context, skip map[string]bool) *gorm.DB {
	for key, vals := range c.Request.URL.Query() {
		if skip[key] {
			continue
		}
		val := vals[0]

		// Handle operator syntax: field[$op]=value
		if strings.Contains(key, "[$") {
			parts := strings.SplitN(key, "[$", 2)
			field := parts[0]
			op := strings.TrimSuffix(parts[1], "]")
			switch op {
			case "gte":
				q = q.Where(field+" >= ?", val)
			case "gt":
				q = q.Where(field+" > ?", val)
			case "lte":
				q = q.Where(field+" <= ?", val)
			case "lt":
				q = q.Where(field+" < ?", val)
			case "ne":
				q = q.Where(field+" != ?", val)
			case "in":
				q = q.Where(field+" IN ?", strings.Split(val, ","))
			case "nin":
				q = q.Where(field+" NOT IN ?", strings.Split(val, ","))
			case "contains":
				q = q.Where(field+" ILIKE ?", "%"+val+"%")
			case "startsWith":
				q = q.Where(field+" ILIKE ?", val+"%")
			case "exists":
				if val == "true" {
					q = q.Where(field + " IS NOT NULL")
				} else {
					q = q.Where(field + " IS NULL")
				}
			}
		} else {
			// Simple equality
			q = q.Where(key+" = ?", val)
		}
	}
	return q
}

// ListEntities handles GET /entities/:entity
func ListEntities(c *gin.Context) {
	entityName := c.Param("entity")
	newSlice, ok := sliceRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity: " + entityName}})
		return
	}

	claims := middleware.GetClaims(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	sort := c.DefaultQuery("sort", "-created_date")
	if page < 1 {
		page = 1
	}
	if limit > 500 {
		limit = 500
	}
	offset := (page - 1) * limit

	// Build sort
	orderStr := "created_date DESC"
	if sort != "" {
		if strings.HasPrefix(sort, "-") {
			orderStr = strings.TrimPrefix(sort, "-") + " DESC"
		} else {
			orderStr = sort + " ASC"
		}
	}

	skipParams := map[string]bool{"page": true, "limit": true, "sort": true}
	q := db.DB.Model(entityRegistry[entityName]())
	q = applyScope(q, claims, entityName)
	q = applyFilters(q, c, skipParams)

	var total int64
	q.Count(&total)

	results := newSlice()
	q.Order(orderStr).Limit(limit).Offset(offset).Find(results)

	pages := int(total) / limit
	if int(total)%limit != 0 {
		pages++
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   results,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": pages,
		},
		"timestamp": time.Now(),
	})
}

// GetEntity handles GET /entities/:entity/:id
func GetEntity(c *gin.Context) {
	entityName := c.Param("entity")
	id := c.Param("id")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
		return
	}

	claims := middleware.GetClaims(c)
	result := newModel()
	q := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", id, claims.OrgID)
	if err := q.First(result).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": entityName + " not found"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": result, "timestamp": time.Now()})
}

// CreateEntity handles POST /entities/:entity
func CreateEntity(c *gin.Context) {
	entityName := c.Param("entity")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
		return
	}

	claims := middleware.GetClaims(c)
	record := newModel()

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	// Support both {data: {...}} and flat body
	data, hasData := body["data"].(map[string]interface{})
	if !hasData {
		data = body
	}
	data["org_id"] = claims.OrgID
	data["created_by"] = claims.Email

	if err := db.DB.Model(record).Create(data).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "success", "data": record, "timestamp": time.Now()})
}

// UpdateEntity handles PUT /entities/:entity/:id
func UpdateEntity(c *gin.Context) {
	entityName := c.Param("entity")
	id := c.Param("id")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
		return
	}

	claims := middleware.GetClaims(c)
	record := newModel()
	if err := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", id, claims.OrgID).First(record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": entityName + " not found"}})
		return
	}

	var body map[string]interface{}
	c.ShouldBindJSON(&body)
	data, hasData := body["data"].(map[string]interface{})
	if !hasData {
		data = body
	}
	delete(data, "id")
	delete(data, "org_id")
	delete(data, "created_by")
	delete(data, "created_date")

	db.DB.Model(record).Updates(data)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": record, "timestamp": time.Now()})
}

// DeleteEntity handles DELETE /entities/:entity/:id (soft delete)
func DeleteEntity(c *gin.Context) {
	entityName := c.Param("entity")
	id := c.Param("id")
	newModel, ok := entityRegistry[entityName]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": "Unknown entity"}})
		return
	}

	claims := middleware.GetClaims(c)
	record := newModel()
	if err := db.DB.Where("id = ? AND org_id = ? AND is_deleted = false", id, claims.OrgID).First(record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "error": gin.H{"code": "NOT_FOUND", "message": entityName + " not found"}})
		return
	}

	db.DB.Model(record).Update("is_deleted", true)
	c.JSON(http.StatusNoContent, nil)
}