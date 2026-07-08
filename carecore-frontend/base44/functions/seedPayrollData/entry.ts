import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Seed 3 months of pay periods + timesheets + payslips for all active staff
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const org_id = body.org_id || 'default_org';

    // Get active staff (limit to first 10 to avoid rate limits)
    const allStaffRaw = await base44.asServiceRole.entities.StaffProfile.filter({ status: 'active' });
    const allStaff = allStaffRaw.slice(0, 10);
    if (!allStaff || allStaff.length === 0) {
      return Response.json({ error: 'No active staff found' }, { status: 400 });
    }

    // Clear existing payroll data first
    const existingPeriods = await base44.asServiceRole.entities.PayPeriod.list();
    for (const p of existingPeriods) {
      await base44.asServiceRole.entities.PayPeriod.delete(p.id);
    }
    const existingTimesheets = await base44.asServiceRole.entities.Timesheet.list();
    for (const t of existingTimesheets) {
      await base44.asServiceRole.entities.Timesheet.delete(t.id);
    }
    const existingPayslips = await base44.asServiceRole.entities.Payslip.list();
    for (const p of existingPayslips) {
      await base44.asServiceRole.entities.Payslip.delete(p.id);
    }

    // 3 months: Feb, Mar, Apr 2026
    const months = [
      { label: 'February 2026', start: '2026-02-01', end: '2026-02-28', status: 'paid' },
      { label: 'March 2026',    start: '2026-03-01', end: '2026-03-31', status: 'paid' },
      { label: 'April 2026',    start: '2026-04-01', end: '2026-04-30', status: 'open' },
    ];

    const createdPeriods = [];
    for (const m of months) {
      const period = await base44.asServiceRole.entities.PayPeriod.create({
        org_id,
        label: m.label,
        period_start: m.start,
        period_end: m.end,
        frequency: 'monthly',
        status: m.status,
      });
      createdPeriods.push({ ...m, id: period.id });
    }

    const HOURLY_RATES = {
      admin: 18,
      admin_officer: 16,
      team_leader: 14,
      support_worker: 12,
    };

    let timesheetCount = 0;
    let payslipCount = 0;

    for (const period of createdPeriods) {
      for (const s of allStaff) {
        const rate = s.hourly_rate || HOURLY_RATES[s.role] || 12;
        // Randomise hours slightly (between 140-170h/month)
        const actualHours = 140 + Math.floor(Math.random() * 30);
        const overtime = Math.max(0, actualHours - 160);
        const grossPay = parseFloat(((actualHours - overtime) * rate + overtime * rate * 1.5).toFixed(2));
        const homeId = s.home_ids?.[0] || null;

        const tsStatus = period.status === 'paid' ? 'paid' : 'submitted';

        const ts = await base44.asServiceRole.entities.Timesheet.create({
          org_id,
          staff_id: s.id,
          staff_name: s.full_name,
          home_id: homeId,
          pay_period_id: period.id,
          pay_period_label: period.label,
          period_start: period.start,
          period_end: period.end,
          total_scheduled_hours: 160,
          total_actual_hours: actualHours,
          total_overtime_hours: overtime,
          hourly_rate: rate,
          gross_pay: grossPay,
          overtime_pay: parseFloat((overtime * rate * 0.5).toFixed(2)),
          status: tsStatus,
          approved_by: user.id,
          approved_at: period.end + 'T23:59:00Z',
          notes: '',
        });
        timesheetCount++;

        // Generate payslip for paid periods
        if (period.status === 'paid') {
          const tax = parseFloat((grossPay * 0.20).toFixed(2));
          const ni = parseFloat((grossPay * 0.12).toFixed(2));
          const pension = parseFloat((grossPay * 0.05).toFixed(2));
          const netPay = parseFloat((grossPay - tax - ni - pension).toFixed(2));

          await base44.asServiceRole.entities.Payslip.create({
            org_id,
            staff_id: s.id,
            staff_name: s.full_name,
            employee_id: s.employee_id || '',
            home_id: homeId,
            timesheet_id: ts.id,
            pay_period_label: period.label,
            period_start: period.start,
            period_end: period.end,
            gross_pay: grossPay,
            ni_deduction: ni,
            tax_deduction: tax,
            pension_deduction: pension,
            net_pay: netPay,
            employer_name: 'CareCore AI',
            generated_at: period.end + 'T23:59:00Z',
            generated_by: user.id,
          });
          payslipCount++;

          // Also create HomeExpense for Finance module
          if (homeId) {
            await base44.asServiceRole.entities.HomeExpense.create({
              org_id,
              home_id: homeId,
              expense_type: 'staff_expense',
              amount: grossPay,
              date: period.end,
              description: `${s.full_name} (${s.employee_id || 'N/A'}) — ${period.label}`,
              claimed_by: s.id,
              status: 'approved',
              approved_by: user.id,
              approved_at: period.end + 'T23:59:00Z',
            });
          }
        }
      }
    }

    return Response.json({
      success: true,
      pay_periods: createdPeriods.length,
      timesheets: timesheetCount,
      payslips: payslipCount,
      staff_count: allStaff.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});