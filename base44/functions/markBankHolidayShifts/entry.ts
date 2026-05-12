import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Marks shifts that fall on bank holidays with is_bank_holiday flag.
 * Called when a shift is created or updated.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { shift_date, shift_id } = await req.json();

    if (!shift_date || !shift_id) {
      return Response.json({ error: "shift_date and shift_id required" }, { status: 400 });
    }

    // Get all bank holidays for this date
    const bankHolidays = await base44.asServiceRole.entities.BankHoliday.filter({
      date: shift_date,
    });

    const isBankHoliday = bankHolidays && bankHolidays.length > 0;
    const bankHolidayName = isBankHoliday ? bankHolidays[0].name : null;

    // Update the shift
    await base44.asServiceRole.entities.Shift.update(shift_id, {
      is_bank_holiday: isBankHoliday,
      bank_holiday_name: bankHolidayName,
    });

    return Response.json({
      success: true,
      is_bank_holiday: isBankHoliday,
      bank_holiday_name: bankHolidayName,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});