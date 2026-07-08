import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || (user.role !== 'admin' && user.role !== 'admin_officer')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { payslip_id, staff_email, staff_name, org_name, org_contact_email } = await req.json();

  if (!payslip_id || !staff_email) {
    return Response.json({ error: 'payslip_id and staff_email are required' }, { status: 400 });
  }

  const payslip = await base44.asServiceRole.entities.Payslip.get(payslip_id);
  if (!payslip) {
    return Response.json({ error: 'Payslip not found' }, { status: 404 });
  }

  const gross = (payslip.gross_pay || 0).toFixed(2);
  const totalDeductions = ((payslip.ni_deduction || 0) + (payslip.tax_deduction || 0) + (payslip.pension_deduction || 0)).toFixed(2);
  const net = (payslip.net_pay || 0).toFixed(2);
  const period = payslip.pay_period_label || '';
  const employeeId = payslip.employee_id || '';
  const safeOrgName = org_name || 'CareCore AI';
  const contactEmail = org_contact_email || '';

  const subject = `Your payslip for ${period} — ${safeOrgName}`;

  const body = `Dear ${staff_name || payslip.staff_name},

Please find below your payslip summary for ${period}.

Summary:
Gross Pay: £${gross}
Deductions: £${totalDeductions}
Net Pay: £${net}

If you have any questions about your payslip please speak to your manager or contact ${contactEmail}.

This is an automated email from CareCore AI. Please do not reply to this email.

${safeOrgName}`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: staff_email,
    subject,
    body,
    from_name: safeOrgName,
  });

  // Update payslip record with email metadata
  const now = new Date().toISOString();
  await base44.asServiceRole.entities.Payslip.update(payslip_id, {
    emailed_at: now,
    emailed_to: staff_email,
  });

  // Create in-app notification for the staff member
  const staffProfiles = await base44.asServiceRole.entities.StaffProfile.filter({ email: staff_email });
  const staffProfile = staffProfiles?.[0];
  if (staffProfile?.user_id) {
    await base44.asServiceRole.entities.Notification.create({
      org_id: payslip.org_id,
      user_id: staffProfile.user_id,
      recipient_staff_id: staffProfile.id,
      type: 'general',
      related_module: 'Your payslip is ready',
      message: `Your payslip for ${period} has been sent to ${staff_email}. Net pay: £${net}.`,
      priority: 'normal',
      link_url: '/settings?tab=profile',
      read: false,
    });
  }

  // Audit log
  await base44.asServiceRole.entities.AuditTrail.create({
    org_id: payslip.org_id,
    user_id: user.id,
    username: user.full_name || user.email,
    role: user.role,
    action: 'email',
    module: 'Payroll',
    record_type: 'Payslip',
    record_id: payslip_id,
    description: `Payslip emailed to ${staff_email} for ${period}`,
    new_value: { emailed_to: staff_email, emailed_at: now, period },
    retention_category: 'payroll',
  });

  return Response.json({ success: true, emailed_at: now, emailed_to: staff_email });
});