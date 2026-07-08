/**
 * SSP Calculation Engine — Working Time Regulations / HMRC SSP Rules 2025/26
 */

const SSP_WEEKLY_RATE = 116.75;   // 2025/26
const LEL_WEEKLY = 123;            // Lower Earnings Limit 2025/26
const MAX_SSP_WEEKS = 28;
const WAITING_DAYS = 3;

/**
 * Determine qualifying days per week based on contract type and hours.
 * Returns a number between 1 and 7.
 */
export function getQualifyingDaysPerWeek(staffProfile, attendanceLogs = []) {
  const contractType = staffProfile?.contract_type || "full_time";
  const contractedHours = staffProfile?.contracted_weekly_hours || 37.5;

  if (contractType === "full_time") return 5;
  if (contractType === "agency") return 5;

  if (contractType === "zero_hours") {
    // Average days worked in last 8 weeks from AttendanceLog
    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
    const recentLogs = attendanceLogs.filter(l => {
      const d = new Date(l.clock_in_time);
      return d >= eightWeeksAgo && d <= now;
    });
    // Count distinct days worked
    const distinctDays = new Set(recentLogs.map(l => l.clock_in_time?.split("T")[0]));
    const avgDaysPerWeek = distinctDays.size / 8;
    return Math.max(1, Math.min(7, Math.round(avgDaysPerWeek)));
  }

  // part_time: pro-rata based on contracted hours vs 37.5 full-time
  const ratio = contractedHours / 37.5;
  return Math.max(1, Math.min(5, Math.round(ratio * 5)));
}

/**
 * Check if there's a linked absence (PIW) within the last 8 weeks.
 * If so, waiting days are NOT applied again.
 */
export function isLinkedAbsence(staffId, sickStartDate, allLeaveRequests = []) {
  const start = new Date(sickStartDate);
  const eightWeeksAgo = new Date(start.getTime() - 56 * 24 * 60 * 60 * 1000);

  return allLeaveRequests.some(r =>
    r.staff_id === staffId &&
    r.id !== undefined &&
    r.leave_type === "sick_leave" &&
    r.status === "approved" &&
    r.ssp_eligible === true &&
    new Date(r.date_to) >= eightWeeksAgo &&
    new Date(r.date_to) < start
  );
}

/**
 * Calculate SSP for a sick leave period.
 * Returns a full breakdown object.
 */
export function calculateSSP({ staffProfile, dateFrom, dateTo, attendanceLogs = [], allLeaveRequests = [] }) {
  if (!staffProfile || !dateFrom || !dateTo) {
    return { eligible: false, reason: "Missing staff or date information" };
  }

  // 1. Determine weekly earnings
  let weeklyPay = 0;
  if (staffProfile.pay_type === "salary" && staffProfile.annual_salary) {
    weeklyPay = staffProfile.annual_salary / 52;
  } else if (staffProfile.hourly_rate && staffProfile.contracted_weekly_hours) {
    weeklyPay = staffProfile.hourly_rate * staffProfile.contracted_weekly_hours;
  }

  // 2. Check LEL eligibility
  if (weeklyPay < LEL_WEEKLY) {
    return {
      eligible: false,
      reason: `Earnings below Lower Earnings Limit (£${LEL_WEEKLY}/week) — SSP not payable`,
      weeklyPay: weeklyPay.toFixed(2),
    };
  }

  // 3. Qualifying days per week
  const qualDaysPerWeek = getQualifyingDaysPerWeek(staffProfile, attendanceLogs);

  if (qualDaysPerWeek === 0) {
    return {
      eligible: false,
      reason: "Zero hours — insufficient work history to calculate qualifying days",
    };
  }

  // 4. Count calendar days and convert to qualifying days
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const calendarDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Qualifying days = proportional to calendar days
  const totalQualifyingDays = Math.round((calendarDays / 7) * qualDaysPerWeek);

  if (totalQualifyingDays <= 0) {
    return { eligible: false, reason: "No qualifying days in this sick period" };
  }

  // 5. Check for linked absence (PIW) — if linked, no additional waiting days
  const linked = isLinkedAbsence(staffProfile.id, dateFrom, allLeaveRequests);
  const waitingDaysApplied = linked ? 0 : Math.min(WAITING_DAYS, totalQualifyingDays);
  const sspDays = Math.max(0, totalQualifyingDays - waitingDaysApplied);

  // 6. Cap at 28 weeks
  const maxSSPDays = MAX_SSP_WEEKS * qualDaysPerWeek;
  const cappedSSPDays = Math.min(sspDays, maxSSPDays);
  const cappedAt28Weeks = sspDays > maxSSPDays;

  // 7. Calculate SSP amount
  const dailyRate = SSP_WEEKLY_RATE / qualDaysPerWeek;
  const totalSSP = parseFloat((cappedSSPDays * dailyRate).toFixed(2));

  // 8. Weekly breakdown
  const weeklyBreakdown = [];
  let remainingDays = cappedSSPDays;
  let week = 1;
  while (remainingDays > 0 && week <= MAX_SSP_WEEKS) {
    const daysThisWeek = Math.min(qualDaysPerWeek, remainingDays);
    weeklyBreakdown.push({
      week,
      days: daysThisWeek,
      amount: parseFloat((daysThisWeek * dailyRate).toFixed(2)),
    });
    remainingDays -= daysThisWeek;
    week++;
  }

  return {
    eligible: true,
    weeklyPay: weeklyPay.toFixed(2),
    qualifyingDaysPerWeek: qualDaysPerWeek,
    totalQualifyingDays,
    waitingDays: waitingDaysApplied,
    sspDays: cappedSSPDays,
    dailyRate: parseFloat(dailyRate.toFixed(4)),
    totalSSP,
    weeklyBreakdown,
    linkedAbsence: linked,
    cappedAt28Weeks,
    calendarDays,
    sspWeeklyRate: SSP_WEEKLY_RATE,
  };
}