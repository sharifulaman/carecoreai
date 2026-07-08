/**
 * Syncs AttendanceLog entries to Timesheet entity
 * Called when staff clock in/out to update timesheet totals for the current pay period
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { org_id, staff_id, staff_name, home_id, period_start, period_end } = await req.json();

    if (!org_id || !staff_id || !period_start || !period_end) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch AttendanceLog entries for this staff member in the pay period
    const attendanceLogs = await base44.asServiceRole.entities.AttendanceLog.filter({
      staff_id,
      org_id,
    });

    // Filter to only completed logs (clock_out_time set) within the period
    const periodStart = new Date(period_start);
    const periodEnd = new Date(period_end);
    const periodLogs = attendanceLogs.filter(log => {
      const clockInDate = new Date(log.clock_in_time);
      return log.total_hours && clockInDate >= periodStart && clockInDate <= periodEnd;
    });

    // Calculate totals
    const totalActualHours = periodLogs.reduce((sum, log) => sum + (log.total_hours || 0), 0);
    const overtimeHours = Math.max(0, totalActualHours - 40); // Assume 40-hour week
    const overtimePay = periodLogs[0]?.hourly_rate ? (overtimeHours * periodLogs[0].hourly_rate * 1.5) : 0;
    const grossPay = periodLogs[0]?.hourly_rate ? (totalActualHours * periodLogs[0].hourly_rate) : 0;

    // Find or create Timesheet record
    const timesheets = await base44.asServiceRole.entities.Timesheet.filter({
      org_id,
      staff_id,
      period_start,
      period_end,
    });

    const timesheet = timesheets[0];

    if (timesheet) {
      // Update existing timesheet
      await base44.asServiceRole.entities.Timesheet.update(timesheet.id, {
        total_actual_hours: totalActualHours,
        total_overtime_hours: overtimeHours,
        overtime_pay: overtimePay,
        gross_pay: grossPay,
      });
      return Response.json({ success: true, action: 'updated', timesheet_id: timesheet.id });
    } else {
      // Create new timesheet
      const newTimesheet = await base44.asServiceRole.entities.Timesheet.create({
        org_id,
        staff_id,
        staff_name,
        home_id: home_id || null,
        period_start,
        period_end,
        pay_period_label: `${new Date(period_start).toLocaleDateString()} - ${new Date(period_end).toLocaleDateString()}`,
        total_actual_hours: totalActualHours,
        total_overtime_hours: overtimeHours,
        overtime_pay: overtimePay,
        gross_pay: grossPay,
        status: 'draft',
      });
      return Response.json({ success: true, action: 'created', timesheet_id: newTimesheet.id });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});