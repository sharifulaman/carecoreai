package services

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"carecore-backend/db"
	"carecore-backend/models"
)

// ── Response types ─────────────────────────────────────────────────────────────

type PeriodInfo struct {
	Label string `json:"label"`
	Start string `json:"start"`
	End   string `json:"end"`
}

type PerformanceMetrics struct {
	ActivitiesCompleted     int     `json:"activities_completed"`
	ActivitiesCompletedPrev int     `json:"activities_completed_prev"`
	ActivitiesTrendPct      int     `json:"activities_trend_pct"`
	HoursWithYP             float64 `json:"hours_with_yp"`
	HoursWithYPPrev         float64 `json:"hours_with_yp_prev"`
	HoursTrendPct           int     `json:"hours_trend_pct"`
	TrainingCompliancePct   int     `json:"training_compliance_pct"`
	TrainingExpiringSoon    int     `json:"training_expiring_soon"`
	SupervisionStatus       string  `json:"supervision_status"`
	LastSupervisionDate     string  `json:"last_supervision_date"`
	NextSupervisionDate     string  `json:"next_supervision_date"`
	ActiveGoalsCount        int     `json:"active_goals_count"`
	GoalsAchievedThisPeriod int     `json:"goals_achieved_this_period"`
	AppraisalOverallRating  int     `json:"appraisal_overall_rating"`
	AppraisalDate           string  `json:"appraisal_date"`
	AttendancePct           float64 `json:"attendance_pct"`
	ShiftsWorked            int     `json:"shifts_worked"`
}

type ActivitySummaryItem struct {
	ID              string  `json:"id"`
	Type            string  `json:"type"`
	Date            string  `json:"date"`
	EngagementLevel string  `json:"engagement_level"`
	HoursWithYP     float64 `json:"hours_with_yp"`
}

type SupervisionBrief struct {
	ID             string `json:"id"`
	Date           string `json:"date"`
	Type           string `json:"type"`
	SupervisorName string `json:"supervisor_name"`
	Status         string `json:"status"`
}

type GoalBrief struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Category   string `json:"category"`
	Status     string `json:"status"`
	Progress   int    `json:"progress"`
	TargetDate string `json:"target_date"`
}

type PerformanceSummary struct {
	StaffID              string                `json:"staff_id"`
	StaffName            string                `json:"staff_name"`
	Period               PeriodInfo            `json:"period"`
	Metrics              PerformanceMetrics    `json:"metrics"`
	RecentActivities     []ActivitySummaryItem `json:"recent_activities"`
	UpcomingSupervisions []SupervisionBrief    `json:"upcoming_supervisions"`
	ActiveGoals          []GoalBrief           `json:"active_goals"`
}

// ── Period resolution ──────────────────────────────────────────────────────────

// ResolvePeriod converts a named period (or explicit from/to dates) into the
// current and previous period boundaries. prevFrom/prevTo drive trend calculations.
// Named periods: this_month (default), last_month, this_quarter, this_year.
// Custom ranges override the named period when both ?from and ?to are provided.
func ResolvePeriod(periodParam, fromParam, toParam string) (from, to, prevFrom, prevTo time.Time, label string) {
	now := time.Now().UTC()

	switch periodParam {
	case "last_month":
		firstOfThisMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		to = firstOfThisMonth.AddDate(0, 0, -1)
		from = time.Date(to.Year(), to.Month(), 1, 0, 0, 0, 0, time.UTC)
		prevTo = from.AddDate(0, 0, -1)
		prevFrom = time.Date(prevTo.Year(), prevTo.Month(), 1, 0, 0, 0, 0, time.UTC)
		label = from.Format("January 2006")

	case "this_quarter":
		q := (int(now.Month()) - 1) / 3
		from = time.Date(now.Year(), time.Month(q*3+1), 1, 0, 0, 0, 0, time.UTC)
		to = from.AddDate(0, 3, -1)
		prevFrom = from.AddDate(0, -3, 0)
		prevTo = from.AddDate(0, 0, -1)
		label = fmt.Sprintf("Q%d %d", q+1, now.Year())

	case "this_year":
		from = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
		to = time.Date(now.Year(), 12, 31, 0, 0, 0, 0, time.UTC)
		prevFrom = time.Date(now.Year()-1, 1, 1, 0, 0, 0, 0, time.UTC)
		prevTo = time.Date(now.Year()-1, 12, 31, 0, 0, 0, 0, time.UTC)
		label = fmt.Sprintf("%d", now.Year())

	default: // "this_month" or empty
		from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		to = from.AddDate(0, 1, -1)
		prevTo = from.AddDate(0, 0, -1)
		prevFrom = time.Date(prevTo.Year(), prevTo.Month(), 1, 0, 0, 0, 0, time.UTC)
		label = now.Format("January 2006")
	}

	// Custom range overrides named period when both params are present.
	if fromParam != "" && toParam != "" {
		if t, err := time.Parse("2006-01-02", fromParam); err == nil {
			from = t
		}
		if t, err := time.Parse("2006-01-02", toParam); err == nil {
			to = t
		}
		duration := to.Sub(from)
		prevTo = from.AddDate(0, 0, -1)
		prevFrom = prevTo.Add(-duration)
		label = fromParam + " – " + toParam
	}

	return
}

// ── Main aggregation function ──────────────────────────────────────────────────

// GetStaffPerformanceSummary aggregates performance data from multiple tables for
// a single staff member. It is the shared engine used by both the self-view
// (My Performance) and the manager-view (Employee Performance) endpoints.
// All queries are scoped to orgID to enforce multi-tenancy.
func GetStaffPerformanceSummary(
	orgID, staffID, staffName, staffRole string,
	from, to, prevFrom, prevTo time.Time,
	periodLabel string,
) (*PerformanceSummary, error) {
	fromStr     := from.Format("2006-01-02")
	toStr       := to.Format("2006-01-02")
	prevFromStr := prevFrom.Format("2006-01-02")
	prevToStr   := prevTo.Format("2006-01-02")
	today       := time.Now().UTC().Format("2006-01-02")

	// ── 1. Activity counts & hours with YP (SWPerformanceKPI) ─────────────────
	var activitiesCount, prevActivitiesCount int64
	db.DB.Model(&models.SWPerformanceKPI{}).
		Where("worker_id = ? AND org_id = ? AND is_deleted = false AND date >= ? AND date <= ?",
			staffID, orgID, fromStr, toStr).
		Count(&activitiesCount)
	db.DB.Model(&models.SWPerformanceKPI{}).
		Where("worker_id = ? AND org_id = ? AND is_deleted = false AND date >= ? AND date <= ?",
			staffID, orgID, prevFromStr, prevToStr).
		Count(&prevActivitiesCount)

	type sumResult struct{ Total float64 }
	var hoursResult, prevHoursResult sumResult
	db.DB.Model(&models.SWPerformanceKPI{}).
		Select("COALESCE(SUM(hours_with_yp), 0) as total").
		Where("worker_id = ? AND org_id = ? AND is_deleted = false AND date >= ? AND date <= ?",
			staffID, orgID, fromStr, toStr).
		Scan(&hoursResult)
	db.DB.Model(&models.SWPerformanceKPI{}).
		Select("COALESCE(SUM(hours_with_yp), 0) as total").
		Where("worker_id = ? AND org_id = ? AND is_deleted = false AND date >= ? AND date <= ?",
			staffID, orgID, prevFromStr, prevToStr).
		Scan(&prevHoursResult)

	// ── 2. Training compliance ─────────────────────────────────────────────────
	trainingPct, expiringSoon := calcTrainingCompliance(orgID, staffID, staffRole, today)

	// ── 3. Supervision ────────────────────────────────────────────────────────
	var lastSup models.SupervisionRecord
	db.DB.Where("supervisee_id = ? AND org_id = ? AND is_deleted = false AND status = 'completed'",
		staffID, orgID).Order("session_date DESC").Limit(1).First(&lastSup)

	var nextSup models.SupervisionRecord
	db.DB.Where("supervisee_id = ? AND org_id = ? AND is_deleted = false AND status = 'scheduled' AND session_date >= ?",
		staffID, orgID, today).Order("session_date ASC").Limit(1).First(&nextSup)

	// ── 4. Goals ──────────────────────────────────────────────────────────────
	activeStatuses := []string{"not_started", "in_progress"}
	var activeGoalsCount, goalsAchievedCount int64
	db.DB.Model(&models.PerformanceGoal{}).
		Where("staff_id = ? AND org_id = ? AND is_deleted = false AND status IN ?",
			staffID, orgID, activeStatuses).
		Count(&activeGoalsCount)
	db.DB.Model(&models.PerformanceGoal{}).
		Where("staff_id = ? AND org_id = ? AND is_deleted = false AND status = 'achieved' AND achieved_date >= ? AND achieved_date <= ?",
			staffID, orgID, fromStr, toStr).
		Count(&goalsAchievedCount)

	// ── 5. Latest appraisal ───────────────────────────────────────────────────
	var latestAppraisal models.AppraisalRecord
	db.DB.Where("appraisee_id = ? AND org_id = ? AND is_deleted = false", staffID, orgID).
		Order("appraisal_date DESC").Limit(1).First(&latestAppraisal)

	// ── 6. Attendance ─────────────────────────────────────────────────────────
	attendancePct, shiftsWorked := calcAttendance(orgID, staffID, fromStr, toStr)

	// ── 7. Recent activities list (last 5) ────────────────────────────────────
	var recentKPIs []models.SWPerformanceKPI
	db.DB.Where("worker_id = ? AND org_id = ? AND is_deleted = false", staffID, orgID).
		Order("date DESC").Limit(5).Find(&recentKPIs)

	recentActivities := make([]ActivitySummaryItem, 0, len(recentKPIs))
	for _, k := range recentKPIs {
		actType := "activity"
		if k.KWSessionCount > 0 {
			actType = "kw_session"
		}
		recentActivities = append(recentActivities, ActivitySummaryItem{
			ID:              k.ID.String(),
			Type:            actType,
			Date:            k.Date,
			EngagementLevel: k.EngagementLevel,
			HoursWithYP:     k.HoursWithYP,
		})
	}

	// ── 8. Active goals list (up to 5, soonest deadline first) ────────────────
	var activeGoalsList []models.PerformanceGoal
	db.DB.Where("staff_id = ? AND org_id = ? AND is_deleted = false AND status IN ?",
		staffID, orgID, activeStatuses).
		Order("target_date ASC").Limit(5).Find(&activeGoalsList)

	goalBriefs := make([]GoalBrief, 0, len(activeGoalsList))
	for _, g := range activeGoalsList {
		goalBriefs = append(goalBriefs, GoalBrief{
			ID:         g.ID.String(),
			Title:      g.Title,
			Category:   g.Category,
			Status:     g.Status,
			Progress:   g.Progress,
			TargetDate: g.TargetDate,
		})
	}

	// ── 9. Upcoming supervisions (next 3) ─────────────────────────────────────
	var upcomingSups []models.SupervisionRecord
	db.DB.Where("supervisee_id = ? AND org_id = ? AND is_deleted = false AND status = 'scheduled' AND session_date >= ?",
		staffID, orgID, today).Order("session_date ASC").Limit(3).Find(&upcomingSups)

	supBriefs := make([]SupervisionBrief, 0, len(upcomingSups))
	for _, s := range upcomingSups {
		supBriefs = append(supBriefs, SupervisionBrief{
			ID:             s.ID.String(),
			Date:           s.SessionDate,
			Type:           s.SupervisionType,
			SupervisorName: s.SupervisorName,
			Status:         s.Status,
		})
	}

	return &PerformanceSummary{
		StaffID:   staffID,
		StaffName: staffName,
		Period: PeriodInfo{
			Label: periodLabel,
			Start: fromStr,
			End:   toStr,
		},
		Metrics: PerformanceMetrics{
			ActivitiesCompleted:     int(activitiesCount),
			ActivitiesCompletedPrev: int(prevActivitiesCount),
			ActivitiesTrendPct:      trendPct(int(activitiesCount), int(prevActivitiesCount)),
			HoursWithYP:             roundF(hoursResult.Total, 1),
			HoursWithYPPrev:         roundF(prevHoursResult.Total, 1),
			HoursTrendPct:           trendPctFloat(hoursResult.Total, prevHoursResult.Total),
			TrainingCompliancePct:   trainingPct,
			TrainingExpiringSoon:    expiringSoon,
			SupervisionStatus:       calcSupervisionStatus(lastSup.SessionDate),
			LastSupervisionDate:     lastSup.SessionDate,
			NextSupervisionDate:     nextSup.SessionDate,
			ActiveGoalsCount:        int(activeGoalsCount),
			GoalsAchievedThisPeriod: int(goalsAchievedCount),
			AppraisalOverallRating:  latestAppraisal.OverallRating,
			AppraisalDate:           latestAppraisal.AppraisalDate,
			AttendancePct:           attendancePct,
			ShiftsWorked:            shiftsWorked,
		},
		RecentActivities:     recentActivities,
		UpcomingSupervisions: supBriefs,
		ActiveGoals:          goalBriefs,
	}, nil
}

// ── Private helpers ────────────────────────────────────────────────────────────

func trendPct(current, prev int) int {
	if prev == 0 {
		return 0
	}
	return int(math.Round(float64(current-prev) / float64(prev) * 100))
}

func trendPctFloat(current, prev float64) int {
	if prev == 0 {
		return 0
	}
	return int(math.Round((current - prev) / prev * 100))
}

func roundF(v float64, decimals int) float64 {
	pow := math.Pow(10, float64(decimals))
	return math.Round(v*pow) / pow
}

// calcSupervisionStatus derives an alert status from the date of the most recent
// completed supervision session. CQC guidance recommends supervision every 6 weeks.
func calcSupervisionStatus(lastDate string) string {
	if lastDate == "" {
		return "no_record"
	}
	last, err := time.Parse("2006-01-02", lastDate)
	if err != nil {
		return "no_record"
	}
	weeksSince := time.Since(last).Hours() / (24 * 7)
	switch {
	case weeksSince <= 6:
		return "on_track"
	case weeksSince <= 8:
		return "due_soon"
	default:
		return "overdue"
	}
}

// calcTrainingCompliance counts how many active TrainingRequirements applicable
// to the staff role have a valid (non-expired) completion record, and how many
// of those are expiring within 30 days.
func calcTrainingCompliance(orgID, staffID, staffRole, today string) (pct, expiringSoon int) {
	var requirements []models.TrainingRequirement
	db.DB.Where("org_id = ? AND is_active = true AND is_deleted = false", orgID).Find(&requirements)

	applicable := make([]models.TrainingRequirement, 0, len(requirements))
	for _, req := range requirements {
		for _, r := range req.Roles {
			if r == staffRole || r == "all" {
				applicable = append(applicable, req)
				break
			}
		}
	}
	if len(applicable) == 0 {
		return 100, 0
	}

	var records []models.TrainingRecord
	db.DB.Where("staff_id = ? AND org_id = ? AND is_deleted = false AND status = 'completed'",
		staffID, orgID).Find(&records)

	// Map requirement_id → record (first completed record wins; typically unique per requirement)
	recordMap := make(map[string]models.TrainingRecord, len(records))
	for _, rec := range records {
		if _, exists := recordMap[rec.RequirementID]; !exists {
			recordMap[rec.RequirementID] = rec
		}
	}

	in30 := time.Now().UTC().AddDate(0, 0, 30).Format("2006-01-02")
	completed := 0
	for _, req := range applicable {
		rec, has := recordMap[req.ID.String()]
		if !has {
			continue
		}
		if req.ExpiryMonths > 0 && rec.ExpiryDate != "" && rec.ExpiryDate < today {
			continue // expired — does not count toward compliance
		}
		completed++
		if req.ExpiryMonths > 0 && rec.ExpiryDate != "" && rec.ExpiryDate >= today && rec.ExpiryDate <= in30 {
			expiringSoon++
		}
	}

	pct = int(math.Round(float64(completed) / float64(len(applicable)) * 100))
	return
}

// ── Team-level response types ──────────────────────────────────────────────────

type GoalPreview struct {
	Title    string `json:"title"`
	Status   string `json:"status"`
	Progress int    `json:"progress"`
}

// TeamStaffRow is one employee's pre-computed performance row, returned inside
// TeamPerformancePage. The frontend renders this directly — no client-side maths.
type TeamStaffRow struct {
	StaffID               string             `json:"staff_id"`
	StaffName             string             `json:"staff_name"`
	Role                  string             `json:"role"`
	HomeID                string             `json:"home_id"`
	HomeName              string             `json:"home_name"`
	Score                 int                `json:"score"`            // 0–100; -1 = insufficient data
	ActivitiesCount       int                `json:"activities_count"`
	HoursWithYP           float64            `json:"hours_with_yp"`
	AvgHoursPerWeek       float64            `json:"avg_hours_per_week"`
	TrainingCompliancePct int                `json:"training_compliance_pct"`
	SupervisionStatus     string             `json:"supervision_status"`
	LastSupervisionDate   string             `json:"last_supervision_date"`
	GoalsCount            int                `json:"goals_count"`
	AvgGoalProgress       float64            `json:"avg_goal_progress"`
	GoalsPreview          []GoalPreview      `json:"goals_preview"`
	AttendancePct         float64            `json:"attendance_pct"`
	DaysWorked            int                `json:"days_worked"`
	Alerts                []PerformanceAlert `json:"alerts"`
}

type TeamPerformancePage struct {
	Total    int64          `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"page_size"`
	Period   PeriodInfo     `json:"period"`
	Data     []TeamStaffRow `json:"data"`
}

type RoleDistEntry struct {
	Role  string `json:"role"`
	Count int    `json:"count"`
}

// DeptScore is the average performance score for a role-group department.
type DeptScore struct {
	Dept  string `json:"dept"`
	Score int    `json:"score"` // 0–100; -1 = no scored staff
	Count int    `json:"count"`
}

type TeamKPIs struct {
	Period                PeriodInfo        `json:"period"`
	TotalEmployees        int               `json:"total_employees"`
	AvgScore              float64           `json:"avg_score"`
	AvgScoreTrendPct      int               `json:"avg_score_trend_pct"`
	TasksCompleted        int               `json:"tasks_completed"`
	TasksTrendPct         int               `json:"tasks_trend_pct"`
	AvgHoursLogged        float64           `json:"avg_hours_logged"`
	TrainingCompliancePct int               `json:"training_compliance_pct"`
	AlertsCount           int               `json:"alerts_count"`
	AlertsList            []PerformanceAlert `json:"alerts_list"`
	TopPerformers         []TeamStaffRow    `json:"top_performers"`
	NeedsReview           []TeamStaffRow    `json:"needs_review"`
	RoleDistribution      []RoleDistEntry   `json:"role_distribution"`
	DeptPerformance       []DeptScore       `json:"dept_performance"`
}

type PerformanceAlert struct {
	StaffID   string `json:"staff_id"`
	StaffName string `json:"staff_name"`
	StaffRole string `json:"staff_role"`
	HomeID    string `json:"home_id"`
	AlertType string `json:"alert_type"` // supervision_overdue|training_expired|no_activity|goal_stalled|appraisal_overdue
	Severity  string `json:"severity"`   // low|medium|high
	Detail    string `json:"detail"`
}

// ── Shared scoring helpers ─────────────────────────────────────────────────────

// ComputePerformanceScore returns a 0–100 integer score using a role-aware
// weighted formula. Returns -1 when data is insufficient to produce a meaningful score.
//
// Support worker weights: activities(30%) + training(25%) + attendance(25%) + goals(20%)
// All other role weights:  training(40%)  + attendance(40%)               + goals(20%)
//
// When attendance data is absent (attendancePct == 0), weights are redistributed
// between the remaining components rather than penalising the score.
func ComputePerformanceScore(
	role string,
	activitiesCount, trainingPct int,
	attendancePct, avgGoalProgress float64,
	periodDays int,
) int {
	goalScore := 75.0 // neutral when staff has no active goals
	if avgGoalProgress > 0 {
		goalScore = avgGoalProgress
	}

	var score float64
	if role == "support_worker" {
		expectedInPeriod := (8.0 / 30.0) * float64(periodDays)
		actScore := 0.0
		if expectedInPeriod > 0 {
			actScore = math.Min(100, float64(activitiesCount)/expectedInPeriod*100)
		}
		if attendancePct == 0 {
			score = actScore*0.40 + float64(trainingPct)*0.35 + goalScore*0.25
		} else {
			score = actScore*0.30 + float64(trainingPct)*0.25 + attendancePct*0.25 + goalScore*0.20
		}
	} else {
		if attendancePct == 0 {
			score = float64(trainingPct)*0.60 + goalScore*0.40
		} else {
			score = float64(trainingPct)*0.40 + attendancePct*0.40 + goalScore*0.20
		}
	}
	return int(math.Round(score))
}

// calcTrainingComplianceFromRecords is the batch-friendly variant of
// calcTrainingCompliance. It accepts pre-loaded slices instead of querying the DB,
// making it safe to call in a loop without triggering N+1 queries.
func calcTrainingComplianceFromRecords(
	requirements []models.TrainingRequirement,
	records []models.TrainingRecord,
	staffRole, today string,
) int {
	applicable := make([]models.TrainingRequirement, 0, len(requirements))
	for _, req := range requirements {
		for _, r := range req.Roles {
			if r == staffRole || r == "all" {
				applicable = append(applicable, req)
				break
			}
		}
	}
	if len(applicable) == 0 {
		return 100
	}
	recordMap := make(map[string]models.TrainingRecord, len(records))
	for _, rec := range records {
		if _, exists := recordMap[rec.RequirementID]; !exists {
			recordMap[rec.RequirementID] = rec
		}
	}
	completed := 0
	for _, req := range applicable {
		rec, has := recordMap[req.ID.String()]
		if !has {
			continue
		}
		if req.ExpiryMonths > 0 && rec.ExpiryDate != "" && rec.ExpiryDate < today {
			continue
		}
		completed++
	}
	return int(math.Round(float64(completed) / float64(len(applicable)) * 100))
}

// extractStaffIDs converts a slice of StaffProfiles to a plain string slice of UUIDs.
func extractStaffIDs(staffList []models.StaffProfile) []string {
	ids := make([]string, len(staffList))
	for i, s := range staffList {
		ids[i] = s.ID.String()
	}
	return ids
}

// supSortRank maps supervision status to a numeric rank for descending sort
// (most-urgent first: overdue > no_record > due_soon > on_track).
func supSortRank(status string) int {
	switch status {
	case "overdue":   return 3
	case "no_record": return 2
	case "due_soon":  return 1
	default:          return 0
	}
}

// ── buildTeamRows — shared batch aggregation engine ───────────────────────────

// buildTeamRows fetches and aggregates performance data for a list of staff
// using 6 batched queries (one per data domain). It is the shared engine for
// GetTeamPerformanceSummaries and GetTeamKPIs; extracting it here prevents
// the two service functions from duplicating their DB calls.
func buildTeamRows(
	orgID string,
	staffList []models.StaffProfile,
	homeNames map[string]string,
	from, to time.Time,
) ([]TeamStaffRow, error) {
	if len(staffList) == 0 {
		return []TeamStaffRow{}, nil
	}
	staffIDs := extractStaffIDs(staffList)
	fromStr := from.Format("2006-01-02")
	toStr   := to.Format("2006-01-02")
	today   := time.Now().UTC().Format("2006-01-02")
	periodDays := int(to.Sub(from).Hours()/24) + 1

	// 1. KPI: activities count + hours per worker
	type kpiRow struct {
		WorkerID string
		Count    int64
		Hours    float64
	}
	var kpiRows []kpiRow
	db.DB.Model(&models.SWPerformanceKPI{}).
		Select("worker_id, COUNT(*) as count, COALESCE(SUM(hours_with_yp),0) as hours").
		Where("worker_id IN ? AND org_id = ? AND is_deleted = false AND date >= ? AND date <= ?",
			staffIDs, orgID, fromStr, toStr).
		Group("worker_id").Scan(&kpiRows)
	kpiByWorker := make(map[string]kpiRow, len(kpiRows))
	for _, r := range kpiRows { kpiByWorker[r.WorkerID] = r }

	// 2. Last completed supervision date per staff
	type supRow struct {
		SuperviseeID string
		LastDate     string
	}
	var supRows []supRow
	db.DB.Model(&models.SupervisionRecord{}).
		Select("supervisee_id, MAX(session_date) as last_date").
		Where("supervisee_id IN ? AND org_id = ? AND is_deleted = false AND status = 'completed'",
			staffIDs, orgID).
		Group("supervisee_id").Scan(&supRows)
	lastSupByStaff := make(map[string]string, len(supRows))
	for _, r := range supRows { lastSupByStaff[r.SuperviseeID] = r.LastDate }

	// 3. Active goal count + average progress per staff
	type goalRow struct {
		StaffID     string
		Count       int64
		AvgProgress float64
	}
	var goalRows []goalRow
	activeStatuses := []string{"not_started", "in_progress"}
	db.DB.Model(&models.PerformanceGoal{}).
		Select("staff_id, COUNT(*) as count, COALESCE(AVG(progress),0) as avg_progress").
		Where("staff_id IN ? AND org_id = ? AND is_deleted = false AND status IN ?",
			staffIDs, orgID, activeStatuses).
		Group("staff_id").Scan(&goalRows)
	goalsByStaff := make(map[string]goalRow, len(goalRows))
	for _, r := range goalRows { goalsByStaff[r.StaffID] = r }

	// 4. Attendance — actual hours from timesheets, scheduled hours from the rota
	type attRow struct {
		StaffID     string
		TotalActual float64
	}
	var attRows []attRow
	db.DB.Model(&models.Timesheet{}).
		Select("staff_id, COALESCE(SUM(total_actual_hours),0) as total_actual").
		Where("staff_id IN ? AND org_id = ? AND is_deleted = false AND period_start <= ? AND period_end >= ?",
			staffIDs, orgID, toStr, fromStr).
		Group("staff_id").Scan(&attRows)
	attByStaff := make(map[string]attRow, len(attRows))
	for _, r := range attRows { attByStaff[r.StaffID] = r }
	scheduledByStaff := batchScheduledHoursFromShifts(orgID, staffIDs, fromStr, toStr)

	// 4b. Days worked — count of AttendanceLog records per staff in the period
	type attLogRow struct {
		StaffID string
		Count   int64
	}
	var attLogRows []attLogRow
	db.DB.Model(&models.AttendanceLog{}).
		Select("staff_id, COUNT(*) as count").
		Where("staff_id IN ? AND org_id = ? AND is_deleted = false AND date >= ? AND date <= ?",
			staffIDs, orgID, fromStr, toStr).
		Group("staff_id").Scan(&attLogRows)
	daysWorkedByStaff := make(map[string]int, len(attLogRows))
	for _, r := range attLogRows { daysWorkedByStaff[r.StaffID] = int(r.Count) }

	// 5. Training requirements (one fetch for the whole org) + records for all staff
	var requirements []models.TrainingRequirement
	db.DB.Where("org_id = ? AND is_active = true AND is_deleted = false", orgID).Find(&requirements)

	var allRecords []models.TrainingRecord
	db.DB.Where("staff_id IN ? AND org_id = ? AND is_deleted = false AND status = 'completed'",
		staffIDs, orgID).Find(&allRecords)
	trainingByStaff := make(map[string][]models.TrainingRecord, len(staffIDs))
	for _, rec := range allRecords {
		trainingByStaff[rec.StaffID] = append(trainingByStaff[rec.StaffID], rec)
	}

	// 7. Goal previews — up to 4 most-recent active goals per staff (no extra round-trip)
	type goalPreviewRow struct {
		StaffID  string
		Title    string
		Status   string
		Progress int
	}
	var gpRows []goalPreviewRow
	db.DB.Model(&models.PerformanceGoal{}).
		Select("staff_id, title, status, progress").
		Where("staff_id IN ? AND org_id = ? AND is_deleted = false AND status IN ?",
			staffIDs, orgID, activeStatuses).
		Order("created_date DESC").
		Scan(&gpRows)
	goalPreviewByStaff := make(map[string][]GoalPreview, len(staffIDs))
	for _, gp := range gpRows {
		if len(goalPreviewByStaff[gp.StaffID]) < 4 {
			goalPreviewByStaff[gp.StaffID] = append(goalPreviewByStaff[gp.StaffID], GoalPreview{
				Title:    gp.Title,
				Status:   gp.Status,
				Progress: gp.Progress,
			})
		}
	}

	// 6. Assemble rows
	weeksInPeriod := float64(periodDays) / 7.0
	rows := make([]TeamStaffRow, 0, len(staffList))
	for _, s := range staffList {
		sid  := s.ID.String()
		kpi  := kpiByWorker[sid]
		att  := attByStaff[sid]
		goal := goalsByStaff[sid]

		attPct := 0.0
		scheduled := scheduledByStaff[sid]
		if scheduled > 0 {
			attPct = roundF(att.TotalActual/scheduled*100, 1)
		}
		avgHours := 0.0
		if weeksInPeriod > 0 && kpi.Hours > 0 {
			avgHours = roundF(kpi.Hours/weeksInPeriod, 1)
		}
		trainingPct := calcTrainingComplianceFromRecords(requirements, trainingByStaff[sid], s.Role, today)
		score       := ComputePerformanceScore(s.Role, int(kpi.Count), trainingPct, attPct, goal.AvgProgress, periodDays)
		supStatus   := calcSupervisionStatus(lastSupByStaff[sid])

		homeID, homeName := "", ""
		if len(s.HomeIDs) > 0 {
			homeID   = s.HomeIDs[0]
			homeName = homeNames[homeID]
		}

		goalsPreview := goalPreviewByStaff[sid]
		if goalsPreview == nil {
			goalsPreview = []GoalPreview{}
		}

		// Derive per-staff alerts from already-computed metrics — no extra query needed
		staffAlerts := make([]PerformanceAlert, 0)
		if supStatus == "overdue" {
			staffAlerts = append(staffAlerts, PerformanceAlert{
				StaffID: sid, StaffName: s.FullName, StaffRole: s.Role, AlertType: "supervision_overdue",
				Severity: "high", Detail: "Supervision session is overdue",
			})
		}
		if trainingPct < 60 {
			staffAlerts = append(staffAlerts, PerformanceAlert{
				StaffID: sid, StaffName: s.FullName, StaffRole: s.Role, AlertType: "training_expired",
				Severity: "high", Detail: "Training compliance below 60%",
			})
		} else if trainingPct < 80 {
			staffAlerts = append(staffAlerts, PerformanceAlert{
				StaffID: sid, StaffName: s.FullName, StaffRole: s.Role, AlertType: "training_expired",
				Severity: "medium", Detail: "Training compliance below 80%",
			})
		}
		if int(kpi.Count) == 0 {
			staffAlerts = append(staffAlerts, PerformanceAlert{
				StaffID: sid, StaffName: s.FullName, StaffRole: s.Role, AlertType: "no_activity",
				Severity: "medium", Detail: "No activities recorded this period",
			})
		}
		if goal.Count > 0 && goal.AvgProgress < 10 {
			staffAlerts = append(staffAlerts, PerformanceAlert{
				StaffID: sid, StaffName: s.FullName, StaffRole: s.Role, AlertType: "goal_stalled",
				Severity: "low", Detail: "Active goals with less than 10% progress",
			})
		}

		rows = append(rows, TeamStaffRow{
			StaffID:               sid,
			StaffName:             s.FullName,
			Role:                  s.Role,
			HomeID:                homeID,
			HomeName:              homeName,
			Score:                 score,
			ActivitiesCount:       int(kpi.Count),
			HoursWithYP:           roundF(kpi.Hours, 1),
			AvgHoursPerWeek:       avgHours,
			TrainingCompliancePct: trainingPct,
			SupervisionStatus:     supStatus,
			LastSupervisionDate:   lastSupByStaff[sid],
			GoalsCount:            int(goal.Count),
			AvgGoalProgress:       goal.AvgProgress,
			GoalsPreview:          goalsPreview,
			AttendancePct:         attPct,
			DaysWorked:            daysWorkedByStaff[sid],
			Alerts:                staffAlerts,
		})
	}
	return rows, nil
}

// matchesStatusBucket reports whether score falls within the named Performance
// Status bucket used by the Employee Performance filter bar. Scores of -1
// (insufficient data) never match a specific bucket.
func matchesStatusBucket(score int, statusFilter string) bool {
	switch statusFilter {
	case "", "all":
		return true
	case "excellent":
		return score >= 90
	case "good":
		return score >= 75 && score < 90
	case "needs_review":
		return score >= 60 && score < 75
	case "at_risk":
		return score >= 0 && score < 60
	default:
		return true
	}
}

// filterRowsByStatus keeps only the rows whose score falls within statusFilter's bucket.
func filterRowsByStatus(rows []TeamStaffRow, statusFilter string) []TeamStaffRow {
	if statusFilter == "" || statusFilter == "all" {
		return rows
	}
	filtered := make([]TeamStaffRow, 0, len(rows))
	for _, r := range rows {
		if matchesStatusBucket(r.Score, statusFilter) {
			filtered = append(filtered, r)
		}
	}
	return filtered
}

// ── GetTeamPerformanceSummaries (CCAI-361) ────────────────────────────────────

// GetTeamPerformanceSummaries returns a sorted, paginated list of employee
// performance rows for the manager dashboard table. All calculations are done
// here; the frontend receives pre-computed, display-ready data.
func GetTeamPerformanceSummaries(
	orgID string,
	staffList []models.StaffProfile,
	homeNames map[string]string,
	from, to time.Time,
	periodLabel string,
	page, pageSize int,
	sortBy, statusFilter string,
) (*TeamPerformancePage, error) {
	rows, err := buildTeamRows(orgID, staffList, homeNames, from, to)
	if err != nil {
		return nil, err
	}
	rows = filterRowsByStatus(rows, statusFilter)

	sort.Slice(rows, func(i, j int) bool {
		switch sortBy {
		case "name":
			return rows[i].StaffName < rows[j].StaffName
		case "training":
			return rows[i].TrainingCompliancePct > rows[j].TrainingCompliancePct
		case "supervision":
			return supSortRank(rows[i].SupervisionStatus) > supSortRank(rows[j].SupervisionStatus)
		default: // "score"
			if rows[i].Score != rows[j].Score {
				return rows[i].Score > rows[j].Score
			}
			return rows[i].StaffName < rows[j].StaffName
		}
	})

	total := int64(len(rows))
	start := (page - 1) * pageSize
	if start >= len(rows) {
		rows = []TeamStaffRow{}
	} else {
		end := start + pageSize
		if end > len(rows) {
			end = len(rows)
		}
		rows = rows[start:end]
	}

	return &TeamPerformancePage{
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Period:   PeriodInfo{Label: periodLabel, Start: from.Format("2006-01-02"), End: to.Format("2006-01-02")},
		Data:     rows,
	}, nil
}

// ── GetTeamKPIs (CCAI-362) ────────────────────────────────────────────────────

// GetTeamKPIs returns the aggregate KPI cards for the dashboard header plus the
// data needed to render the right-hand insights panel (top performers, needs review,
// role distribution, and a preview of the first 5 performance alerts).
func GetTeamKPIs(
	orgID string,
	staffList []models.StaffProfile,
	homeNames map[string]string,
	from, to, prevFrom, prevTo time.Time,
	periodLabel, statusFilter string,
) (*TeamKPIs, error) {
	rows, err := buildTeamRows(orgID, staffList, homeNames, from, to)
	if err != nil {
		return nil, err
	}
	rows = filterRowsByStatus(rows, statusFilter)

	// Restrict staffList/trend baseline to the same staff that passed the status
	// filter, so previous-period comparisons and alerts stay apples-to-apples.
	if statusFilter != "" && statusFilter != "all" {
		matched := make(map[string]bool, len(rows))
		for _, r := range rows {
			matched[r.StaffID] = true
		}
		filteredStaff := make([]models.StaffProfile, 0, len(rows))
		for _, s := range staffList {
			if matched[s.ID.String()] {
				filteredStaff = append(filteredStaff, s)
			}
		}
		staffList = filteredStaff
	}

	prevRows, err := buildTeamRows(orgID, staffList, homeNames, prevFrom, prevTo)
	if err != nil {
		return nil, err
	}

	// Aggregate
	var scoreSum, prevScoreSum float64
	scoredCount, prevScoredCount := 0, 0
	tasks, prevTasks := 0, 0
	hoursTotal := 0.0
	swCount, trainingSum := 0, 0

	for _, r := range rows {
		if r.Score >= 0 {
			scoreSum += float64(r.Score)
			scoredCount++
		}
		tasks += r.ActivitiesCount
		if r.Role == "support_worker" {
			hoursTotal += r.HoursWithYP
			swCount++
		}
		trainingSum += r.TrainingCompliancePct
	}
	for _, r := range prevRows {
		if r.Score >= 0 {
			prevScoreSum += float64(r.Score)
			prevScoredCount++
		}
		prevTasks += r.ActivitiesCount
	}

	avgScore, prevAvgScore := 0.0, 0.0
	if scoredCount > 0 {
		avgScore = roundF(scoreSum/float64(scoredCount), 1)
	}
	if prevScoredCount > 0 {
		prevAvgScore = roundF(prevScoreSum/float64(prevScoredCount), 1)
	}
	avgHours := 0.0
	if swCount > 0 {
		avgHours = roundF(hoursTotal/float64(swCount), 1)
	}
	trainingPct := 0
	if len(rows) > 0 {
		trainingPct = int(math.Round(float64(trainingSum) / float64(len(rows))))
	}

	// Sort copy by score for top/bottom lists
	sorted := make([]TeamStaffRow, len(rows))
	copy(sorted, rows)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Score > sorted[j].Score })

	top5 := sorted
	if len(top5) > 5 {
		top5 = top5[:5]
	}
	needsReview := make([]TeamStaffRow, 0, 5)
	for i := len(sorted) - 1; i >= 0 && len(needsReview) < 5; i-- {
		if sorted[i].Score >= 0 {
			needsReview = append(needsReview, sorted[i])
		}
	}

	// Role distribution
	roleDist := map[string]int{}
	for _, r := range rows {
		roleDist[r.Role]++
	}
	roleDistList := make([]RoleDistEntry, 0, len(roleDist))
	for role, count := range roleDist {
		roleDistList = append(roleDistList, RoleDistEntry{Role: role, Count: count})
	}
	sort.Slice(roleDistList, func(i, j int) bool { return roleDistList[i].Count > roleDistList[j].Count })

	// Alerts preview (first 5 only — full list via /business/performance/alerts)
	allAlerts, _ := GetPerformanceAlerts(orgID, staffList, from, to)
	preview := allAlerts
	if len(preview) > 5 {
		preview = preview[:5]
	}

	// Department performance — avg score per role-group, sorted by score descending
	deptGroups := []struct {
		Name  string
		Roles map[string]bool
	}{
		{"Support Workers",  map[string]bool{"support_worker": true}},
		{"Team Leaders",     map[string]bool{"team_leader": true}},
		{"HR & Admin",       map[string]bool{"hr_officer": true, "hr_manager": true, "admin": true, "admin_officer": true, "admin_manager": true}},
		{"Management",       map[string]bool{"team_manager": true, "regional_manager": true, "rsm": true}},
		{"Maintenance",      map[string]bool{"maintenance_officer": true, "maintenance_manager": true}},
	}
	deptPerf := make([]DeptScore, 0, len(deptGroups))
	for _, dg := range deptGroups {
		var scoreAcc float64
		count, scored := 0, 0
		for _, r := range rows {
			if dg.Roles[r.Role] {
				count++
				if r.Score >= 0 {
					scoreAcc += float64(r.Score)
					scored++
				}
			}
		}
		if count == 0 {
			continue
		}
		avg := -1
		if scored > 0 {
			avg = int(math.Round(scoreAcc / float64(scored)))
		}
		deptPerf = append(deptPerf, DeptScore{Dept: dg.Name, Score: avg, Count: count})
	}
	sort.Slice(deptPerf, func(i, j int) bool { return deptPerf[i].Score > deptPerf[j].Score })

	return &TeamKPIs{
		Period:                PeriodInfo{Label: periodLabel, Start: from.Format("2006-01-02"), End: to.Format("2006-01-02")},
		TotalEmployees:        len(rows),
		AvgScore:              avgScore,
		AvgScoreTrendPct:      trendPctFloat(avgScore, prevAvgScore),
		TasksCompleted:        tasks,
		TasksTrendPct:         trendPct(tasks, prevTasks),
		AvgHoursLogged:        avgHours,
		TrainingCompliancePct: trainingPct,
		AlertsCount:           len(allAlerts),
		AlertsList:            preview,
		TopPerformers:         top5,
		NeedsReview:           needsReview,
		RoleDistribution:      roleDistList,
		DeptPerformance:       deptPerf,
	}, nil
}

// ── GetPerformanceAlerts (CCAI-363) ───────────────────────────────────────────

// GetPerformanceAlerts scans all staff in scope against five alert rules and
// returns a slice of PerformanceAlert for every staff member that triggers one.
// All queries are batched — no N+1 patterns.
func GetPerformanceAlerts(orgID string, staffList []models.StaffProfile, from, to time.Time) ([]PerformanceAlert, error) {
	if len(staffList) == 0 {
		return []PerformanceAlert{}, nil
	}
	staffIDs := extractStaffIDs(staffList)
	staffByID := make(map[string]models.StaffProfile, len(staffList))
	for _, s := range staffList { staffByID[s.ID.String()] = s }

	today   := time.Now().UTC().Format("2006-01-02")
	fromStr := from.Format("2006-01-02")
	toStr   := to.Format("2006-01-02")
	alerts  := make([]PerformanceAlert, 0)

	homeID := func(s models.StaffProfile) string {
		if len(s.HomeIDs) > 0 { return s.HomeIDs[0] }
		return ""
	}

	// ── 1. Supervision overdue ─────────────────────────────────────────────────
	type supRow struct {
		SuperviseeID string
		LastDate     string
	}
	var supRows []supRow
	db.DB.Model(&models.SupervisionRecord{}).
		Select("supervisee_id, MAX(session_date) as last_date").
		Where("supervisee_id IN ? AND org_id = ? AND is_deleted = false AND status = 'completed'",
			staffIDs, orgID).
		Group("supervisee_id").Scan(&supRows)
	lastSupMap := make(map[string]string, len(supRows))
	for _, r := range supRows { lastSupMap[r.SuperviseeID] = r.LastDate }

	for _, s := range staffList {
		sid    := s.ID.String()
		status := calcSupervisionStatus(lastSupMap[sid])
		if status != "overdue" && status != "no_record" {
			continue
		}
		severity, detail := "medium", "No supervision on record"
		if ld := lastSupMap[sid]; ld != "" {
			if last, err := time.Parse("2006-01-02", ld); err == nil {
				weeks := time.Since(last).Hours() / (24 * 7)
				detail = fmt.Sprintf("Last supervision was %.0f weeks ago (CQC recommends every 6 weeks)", weeks)
				if weeks > 12 { severity = "high" }
			}
		}
		alerts = append(alerts, PerformanceAlert{StaffID: sid, StaffName: s.FullName, StaffRole: s.Role, HomeID: homeID(s), AlertType: "supervision_overdue", Severity: severity, Detail: detail})
	}

	// ── 2. Training expired ────────────────────────────────────────────────────
	type expiredRow struct{ StaffID string }
	var expiredRows []expiredRow
	db.DB.Model(&models.TrainingRecord{}).
		Select("DISTINCT staff_id").
		Where("staff_id IN ? AND org_id = ? AND is_deleted = false AND expiry_date != '' AND expiry_date < ?",
			staffIDs, orgID, today).
		Scan(&expiredRows)
	for _, r := range expiredRows {
		s, ok := staffByID[r.StaffID]
		if !ok { continue }
		alerts = append(alerts, PerformanceAlert{StaffID: r.StaffID, StaffName: s.FullName, StaffRole: s.Role, HomeID: homeID(s), AlertType: "training_expired", Severity: "high", Detail: "One or more mandatory training certificates have expired"})
	}

	// ── 3. No activity (support workers only) ─────────────────────────────────
	swIDs := make([]string, 0)
	for _, s := range staffList {
		if s.Role == "support_worker" { swIDs = append(swIDs, s.ID.String()) }
	}
	if len(swIDs) > 0 {
		type actRow struct {
			WorkerID string
			Count    int64
		}
		var actRows []actRow
		db.DB.Model(&models.SWPerformanceKPI{}).
			Select("worker_id, COUNT(*) as count").
			Where("worker_id IN ? AND org_id = ? AND is_deleted = false AND date >= ? AND date <= ?",
				swIDs, orgID, fromStr, toStr).
			Group("worker_id").Scan(&actRows)
		activeSet := make(map[string]bool, len(actRows))
		for _, r := range actRows { activeSet[r.WorkerID] = true }
		for _, sid := range swIDs {
			if activeSet[sid] { continue }
			s := staffByID[sid]
			alerts = append(alerts, PerformanceAlert{StaffID: sid, StaffName: s.FullName, StaffRole: s.Role, HomeID: homeID(s), AlertType: "no_activity", Severity: "medium", Detail: "No activities logged in the current period"})
		}
	}

	// ── 4. Goal stalled (in_progress, not updated in 30+ days) ───────────────
	type goalRow struct{ StaffID string }
	var stalledGoals []goalRow
	staleThreshold := time.Now().UTC().AddDate(0, 0, -30)
	db.DB.Model(&models.PerformanceGoal{}).
		Select("DISTINCT staff_id").
		Where("staff_id IN ? AND org_id = ? AND is_deleted = false AND status = 'in_progress' AND updated_date < ?",
			staffIDs, orgID, staleThreshold).
		Scan(&stalledGoals)
	for _, g := range stalledGoals {
		s, ok := staffByID[g.StaffID]
		if !ok { continue }
		alerts = append(alerts, PerformanceAlert{StaffID: g.StaffID, StaffName: s.FullName, StaffRole: s.Role, HomeID: homeID(s), AlertType: "goal_stalled", Severity: "low", Detail: "One or more in-progress goals have not been updated in over 30 days"})
	}

	// ── 5. Appraisal overdue (> 12 months since last completed appraisal) ─────
	type apprRow struct {
		AppraiseeID string
		LastDate    string
	}
	var apprRows []apprRow
	db.DB.Model(&models.AppraisalRecord{}).
		Select("appraisee_id, MAX(appraisal_date) as last_date").
		Where("appraisee_id IN ? AND org_id = ? AND is_deleted = false",
			staffIDs, orgID).
		Group("appraisee_id").Scan(&apprRows)
	lastApprMap := make(map[string]string, len(apprRows))
	for _, r := range apprRows { lastApprMap[r.AppraiseeID] = r.LastDate }
	twelveMonthsAgo := time.Now().UTC().AddDate(-1, 0, 0).Format("2006-01-02")

	for _, s := range staffList {
		sid      := s.ID.String()
		lastAppr := lastApprMap[sid]
		if lastAppr != "" && lastAppr >= twelveMonthsAgo {
			continue
		}
		detail := "No appraisal on record"
		if lastAppr != "" {
			if last, err := time.Parse("2006-01-02", lastAppr); err == nil {
				months := int(time.Since(last).Hours() / (24 * 30))
				detail = fmt.Sprintf("Last appraisal was %d months ago (annual review overdue)", months)
			}
		}
		alerts = append(alerts, PerformanceAlert{StaffID: sid, StaffName: s.FullName, StaffRole: s.Role, HomeID: homeID(s), AlertType: "appraisal_overdue", Severity: "high", Detail: detail})
	}

	return alerts, nil
}

// calcAttendance derives attendance % (actual hours from timesheets vs scheduled
// hours from the rota) and shift count from AttendanceLog records within the
// given date range.
func calcAttendance(orgID, staffID, fromStr, toStr string) (pct float64, shiftsWorked int) {
	type actualResult struct{ TotalActual float64 }
	var ar actualResult
	db.DB.Model(&models.Timesheet{}).
		Select("COALESCE(SUM(total_actual_hours), 0) as total_actual").
		Where("staff_id = ? AND org_id = ? AND is_deleted = false AND period_start <= ? AND period_end >= ?",
			staffID, orgID, toStr, fromStr).
		Scan(&ar)

	scheduled := batchScheduledHoursFromShifts(orgID, []string{staffID}, fromStr, toStr)[staffID]
	if scheduled > 0 {
		pct = roundF(ar.TotalActual/scheduled*100, 1)
	}

	var workedCount int64
	db.DB.Model(&models.AttendanceLog{}).
		Where("staff_id = ? AND org_id = ? AND is_deleted = false AND date >= ? AND date <= ?",
			staffID, orgID, fromStr, toStr).
		Count(&workedCount)
	shiftsWorked = int(workedCount)
	return
}

// batchScheduledHoursFromShifts sums rota Shift durations per staff member within
// [fromStr, toStr], for whichever of staffIDs appear as the shift's StaffID or in
// its AssignedStaff list. Cancelled shifts don't count as scheduled. Fetches all
// in-range shifts once (no N+1) and attributes hours in memory.
func batchScheduledHoursFromShifts(orgID string, staffIDs []string, fromStr, toStr string) map[string]float64 {
	result := make(map[string]float64, len(staffIDs))
	if len(staffIDs) == 0 {
		return result
	}
	staffSet := make(map[string]bool, len(staffIDs))
	for _, id := range staffIDs {
		staffSet[id] = true
	}

	var shifts []models.Shift
	db.DB.Where("org_id = ? AND is_deleted = false AND date >= ? AND date <= ? AND status != 'cancelled'",
		orgID, fromStr, toStr).Find(&shifts)

	for _, s := range shifts {
		hours := shiftHours(s.TimeStart, s.TimeEnd)
		if hours <= 0 {
			continue
		}
		assigned := make(map[string]bool, len(s.AssignedStaff)+1)
		if s.StaffID != "" {
			assigned[s.StaffID] = true
		}
		for _, id := range s.AssignedStaff {
			assigned[id] = true
		}
		for id := range assigned {
			if staffSet[id] {
				result[id] += hours
			}
		}
	}
	return result
}

// shiftHours computes the duration in hours between two "HH:MM" times, treating
// an end time at or before the start time as crossing midnight (overnight/waking-night shifts).
func shiftHours(start, end string) float64 {
	sh, sm, ok1 := parseHHMM(start)
	eh, em, ok2 := parseHHMM(end)
	if !ok1 || !ok2 {
		return 0
	}
	startMin := sh*60 + sm
	endMin := eh*60 + em
	if endMin <= startMin {
		endMin += 24 * 60
	}
	return float64(endMin-startMin) / 60.0
}

func parseHHMM(s string) (h, m int, ok bool) {
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, 0, false
	}
	var err1, err2 error
	h, err1 = strconv.Atoi(parts[0])
	m, err2 = strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return 0, 0, false
	}
	return h, m, true
}
