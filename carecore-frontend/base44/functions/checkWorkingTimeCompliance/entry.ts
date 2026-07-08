/**
 * Working Time Regulations 1998 Compliance Checks
 * Checks: 48h weekly average, 11h rest between shifts, 24h rest per 7 days,
 * 6h break entitlement, young worker rules.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

function parseTime(dateStr, timeStr) {
  // dateStr = "2024-01-15", timeStr = "19:00"
  const [h, m] = (timeStr || "00:00").split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

function shiftEndDate(shift) {
  // If end time < start time, shift ends next day
  const [sh, sm] = (shift.time_start || "00:00").split(":").map(Number);
  const [eh, em] = (shift.time_end || "00:00").split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins <= startMins) {
    const d = new Date(shift.date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return toDateStr(d);
  }
  return shift.date;
}

function shiftDurationHours(shift) {
  const start = parseTime(shift.date, shift.time_start);
  const endDate = shiftEndDate(shift);
  const end = parseTime(endDate, shift.time_end);
  return (end - start) / 3600000;
}

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { staff_id, date_from, date_to } = body;

    const allStaff = await base44.asServiceRole.entities.StaffProfile.filter({ status: "active" });
    const targetStaff = staff_id ? allStaff.filter(s => s.id === staff_id) : allStaff;

    if (!targetStaff.length) return Response.json({ breaches: [], warnings: [] });

    // Date range — default to last 17 weeks
    const endDate = date_to ? new Date(date_to) : new Date();
    const startDate = date_from ? new Date(date_from) : new Date(endDate.getTime() - 17 * 7 * 24 * 3600000);
    const startStr = toDateStr(startDate);
    const endStr = toDateStr(endDate);

    // Fetch all shifts and attendance logs in range
    const allShifts = await base44.asServiceRole.entities.Shift.filter({});
    const allLogs = await base44.asServiceRole.entities.AttendanceLog.filter({});

    const breaches = [];
    const warnings = [];

    for (const staffMember of targetStaff) {
      const sid = staffMember.id;
      const age = calcAge(staffMember.dob);
      const isYoung = age !== null && age < 18;
      const hasOptOut = staffMember.working_time_opt_out === true;

      // Shifts for this staff in range
      const staffShifts = allShifts
        .filter(s => (s.assigned_staff || []).includes(sid) &&
          s.date >= startStr && s.date <= endStr && s.status !== "cancelled")
        .sort((a, b) => {
          const aStart = parseTime(a.date, a.time_start);
          const bStart = parseTime(b.date, b.time_start);
          return aStart - bStart;
        });

      // Attendance logs for this staff in range
      const staffLogs = allLogs.filter(l =>
        l.staff_id === sid &&
        l.clock_in_time >= startStr &&
        l.clock_in_time <= endStr + "T23:59:59"
      );

      // ─── CHECK 1: 48h Weekly Average over 17-week reference ────────────────
      // Group logs by ISO week
      const weekHours = {};
      for (const log of staffLogs) {
        const d = new Date(log.clock_in_time);
        // Get Monday of the week
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((day + 6) % 7));
        const weekKey = toDateStr(monday);
        weekHours[weekKey] = (weekHours[weekKey] || 0) + (log.total_hours || 0);
      }

      const weekValues = Object.values(weekHours);
      if (weekValues.length > 0) {
        const avgHours = weekValues.reduce((a, b) => a + b, 0) / Math.max(weekValues.length, 1);
        const maxHours = isYoung ? 40 : 48;

        if (avgHours > maxHours) {
          const item = {
            staff_id: sid,
            staff_name: staffMember.full_name,
            check: isYoung ? "young_worker_weekly" : "48h_weekly_average",
            severity: isYoung ? "critical" : (hasOptOut ? "warning" : "breach"),
            detail: `Average weekly hours: ${avgHours.toFixed(1)}h (max ${maxHours}h${!isYoung && hasOptOut ? ", opt-out on file" : ""})`,
            avg_hours: parseFloat(avgHours.toFixed(1)),
          };
          if (item.severity === "breach" || item.severity === "critical") breaches.push(item);
          else warnings.push(item);
        }
      }

      // ─── CHECK 2: 11h Rest Between Shifts ──────────────────────────────────
      for (let i = 0; i < staffShifts.length - 1; i++) {
        const curr = staffShifts[i];
        const next = staffShifts[i + 1];
        const currEnd = parseTime(shiftEndDate(curr), curr.time_end);
        const nextStart = parseTime(next.date, next.time_start);
        const gapHours = (nextStart - currEnd) / 3600000;

        const minRest = isYoung ? 12 : 11;
        if (gapHours < minRest && gapHours >= 0) {
          breaches.push({
            staff_id: sid,
            staff_name: staffMember.full_name,
            check: "rest_between_shifts",
            severity: isYoung ? "critical" : "breach",
            detail: `Only ${gapHours.toFixed(1)}h rest between shift ending ${curr.date} ${curr.time_end} and starting ${next.date} ${next.time_start} (min ${minRest}h required)`,
            shift_end_date: curr.date,
            shift_end_time: curr.time_end,
            next_shift_date: next.date,
            next_shift_time: next.time_start,
            gap_hours: parseFloat(gapHours.toFixed(1)),
          });
        }
      }

      // ─── CHECK 3: 24h Rest Per 7 Days ──────────────────────────────────────
      const days7 = Math.ceil((endDate - startDate) / 86400000);
      for (let d = 0; d < days7 - 6; d++) {
        const windowStart = new Date(startDate.getTime() + d * 86400000);
        const windowEnd = new Date(windowStart.getTime() + 7 * 86400000);
        const windowStartStr = toDateStr(windowStart);
        const windowEndStr = toDateStr(windowEnd);

        const windowShifts = staffShifts.filter(s => s.date >= windowStartStr && s.date < windowEndStr);
        if (windowShifts.length === 0) continue;

        // Build a sorted list of all occupied intervals
        const intervals = windowShifts.map(s => ({
          start: parseTime(s.date, s.time_start),
          end: parseTime(shiftEndDate(s), s.time_end),
        })).sort((a, b) => a.start - b.start);

        // Check if there is a 24h gap anywhere in the window
        const twentyFourHours = 24 * 3600000;
        let has24hGap = false;

        // Check gap before first shift
        if (intervals[0].start - windowStart >= twentyFourHours) {
          has24hGap = true;
        }
        // Check gap after last shift
        if (!has24hGap && windowEnd - intervals[intervals.length - 1].end >= twentyFourHours) {
          has24hGap = true;
        }
        // Check gaps between shifts
        if (!has24hGap) {
          for (let k = 0; k < intervals.length - 1; k++) {
            if (intervals[k + 1].start - intervals[k].end >= twentyFourHours) {
              has24hGap = true;
              break;
            }
          }
        }

        if (!has24hGap) {
          breaches.push({
            staff_id: sid,
            staff_name: staffMember.full_name,
            check: "24h_rest_per_7_days",
            severity: "breach",
            detail: `No 24-hour rest period found in 7-day window ${windowStartStr} to ${windowEndStr}`,
            week_start: windowStartStr,
            week_end: windowEndStr,
          });
          d += 6; // skip ahead to avoid duplicate reports for same breach
        }
      }

      // ─── CHECK 4: 6h Break Entitlement ─────────────────────────────────────
      for (const log of staffLogs) {
        if ((log.total_hours || 0) > 6) {
          const breakMins = log.break_minutes || 0;
          if (breakMins < 20) {
            const dateStr = log.clock_in_time?.split("T")[0] || "";
            warnings.push({
              staff_id: sid,
              staff_name: staffMember.full_name,
              check: "6h_break_entitlement",
              severity: "warning",
              detail: `Shift on ${dateStr} was ${log.total_hours?.toFixed(1)}h but only ${breakMins} minutes break recorded (min 20 mins required)`,
              date: dateStr,
              hours_worked: log.total_hours,
              break_minutes: breakMins,
            });
          }
        }
      }

      // ─── CHECK 5: Young Workers (under 18) ─────────────────────────────────
      if (isYoung) {
        // Max 8h per day
        for (const log of staffLogs) {
          if ((log.total_hours || 0) > 8) {
            const dateStr = log.clock_in_time?.split("T")[0] || "";
            breaches.push({
              staff_id: sid,
              staff_name: staffMember.full_name,
              check: "young_worker_daily",
              severity: "critical",
              detail: `Young worker (age ${age}) worked ${log.total_hours?.toFixed(1)}h on ${dateStr} (max 8h per day)`,
              date: dateStr,
            });
          }
        }

        // 30 min break after 4.5 hours
        for (const log of staffLogs) {
          if ((log.total_hours || 0) > 4.5) {
            const breakMins = log.break_minutes || 0;
            if (breakMins < 30) {
              const dateStr = log.clock_in_time?.split("T")[0] || "";
              breaches.push({
                staff_id: sid,
                staff_name: staffMember.full_name,
                check: "young_worker_break",
                severity: "critical",
                detail: `Young worker (age ${age}) worked over 4.5h on ${dateStr} with only ${breakMins}min break (min 30 min required)`,
                date: dateStr,
              });
            }
          }
        }

        // No night work (23:00–06:00)
        for (const shift of staffShifts) {
          const [sh] = (shift.time_start || "00:00").split(":").map(Number);
          const [eh] = (shift.time_end || "00:00").split(":").map(Number);
          const endsNextDay = eh < sh;
          const isNightWork = sh >= 23 || sh < 6 || (endsNextDay && eh > 0 && eh <= 6);
          if (isNightWork) {
            breaches.push({
              staff_id: sid,
              staff_name: staffMember.full_name,
              check: "young_worker_night",
              severity: "critical",
              detail: `Young worker (age ${age}) assigned to night shift on ${shift.date} (${shift.time_start}–${shift.time_end}). Night work is prohibited for workers under 18.`,
              date: shift.date,
            });
          }
        }
      }
    }

    // Deduplicate 24h rest breaches per staff per week
    const seen = new Set();
    const uniqueBreaches = breaches.filter(b => {
      if (b.check !== "24h_rest_per_7_days") return true;
      const key = `${b.staff_id}:${b.week_start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return Response.json({
      success: true,
      breaches: uniqueBreaches,
      warnings,
      total_breaches: uniqueBreaches.length,
      total_warnings: warnings.length,
      checked_staff: targetStaff.length,
      date_range: { from: startStr, to: endStr },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});