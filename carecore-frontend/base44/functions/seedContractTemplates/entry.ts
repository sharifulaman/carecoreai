import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_TEMPLATES = [
  {
    name: "Full-Time Employment Contract",
    contract_type: "full_time",
    body_html: `<p>This Employment Agreement is made between <strong>{{organisation_name}}</strong> and <strong>{{employee_full_name}}</strong>.</p>
<h3>1. Role and Responsibilities</h3>
<p>Job Title: {{job_title}}<br>Place of Work: {{place_of_work}}<br>Reporting to: {{manager_name}}</p>
<h3>2. Employment Terms</h3>
<p>Start Date: {{start_date}}<br>Contract Type: Full-Time<br>Contracted Hours: {{contracted_hours}} hours per week<br>Notice Period: {{notice_period}} weeks</p>
<h3>3. Remuneration</h3>
<p>Pay Type: {{pay_type}}<br>Hourly Rate: £{{hourly_rate}} per hour OR Annual Salary: £{{annual_salary}} per year<br>Pay Frequency: {{pay_frequency}}</p>
<h3>4. Annual Leave</h3>
<p>You are entitled to {{annual_leave_days}} days paid annual leave per year (pro-rata for part years).</p>
<h3>5. Probation</h3>
<p>Your employment is subject to a {{probation_period}} month probation period. During this time, your performance will be reviewed.</p>
<p><strong>Signed by {{organisation_name}} on {{today_date}}</strong></p>`,
  },
  {
    name: "Part-Time Employment Contract",
    contract_type: "part_time",
    body_html: `<p>This Employment Agreement is made between <strong>{{organisation_name}}</strong> and <strong>{{employee_full_name}}</strong>.</p>
<h3>1. Role and Responsibilities</h3>
<p>Job Title: {{job_title}}<br>Place of Work: {{place_of_work}}<br>Reporting to: {{manager_name}}</p>
<h3>2. Employment Terms</h3>
<p>Start Date: {{start_date}}<br>Contract Type: Part-Time<br>Contracted Hours: {{contracted_hours}} hours per week<br>Notice Period: {{notice_period}} weeks</p>
<h3>3. Remuneration</h3>
<p>Hourly Rate: £{{hourly_rate}} per hour<br>Pay Frequency: {{pay_frequency}}</p>
<h3>4. Annual Leave</h3>
<p>You are entitled to {{annual_leave_days}} days paid annual leave per year (pro-rata).</p>
<p><strong>Signed by {{organisation_name}} on {{today_date}}</strong></p>`,
  },
  {
    name: "Zero Hours Contract",
    contract_type: "zero_hours",
    body_html: `<p>This Zero Hours Agreement is made between <strong>{{organisation_name}}</strong> and <strong>{{employee_full_name}}</strong>.</p>
<h3>1. Role</h3>
<p>Job Title: {{job_title}}<br>Place of Work: {{place_of_work}}</p>
<h3>2. Terms</h3>
<p>Start Date: {{start_date}}<br>Contract Type: Zero Hours (flexible, hours offered as needed)<br>You are not guaranteed any minimum hours.</p>
<h3>3. Remuneration</h3>
<p>Hourly Rate: £{{hourly_rate}} per hour<br>Pay Frequency: {{pay_frequency}}</p>
<h3>4. Notice Period</h3>
<p>Either party may terminate this agreement with {{notice_period}} weeks notice.</p>
<p><strong>Signed by {{organisation_name}} on {{today_date}}</strong></p>`,
  },
  {
    name: "Contract Variation Letter",
    contract_type: "variation",
    body_html: `<p>Dear {{employee_full_name}},</p>
<p>We are writing to confirm a variation to your employment contract with {{organisation_name}}, effective from {{effective_date}}.</p>
<h3>Changes to Your Contract</h3>
<p>[Details of change: e.g., Pay rise from £X to £Y, Hours changed from X to Y, Role changed to {{job_title}}]</p>
<p>All other terms of your employment remain unchanged.</p>
<p>Please confirm your acceptance of this variation by signing below or replying to this letter.</p>
<p>Yours sincerely,<br>{{organisation_name}}</p>`,
  },
  {
    name: "Probation Extension Letter",
    contract_type: "probation_extension",
    body_html: `<p>Dear {{employee_full_name}},</p>
<p>Following your probation review on {{today_date}}, we have decided to extend your probation period for a further period.</p>
<p>Your extended probation will end on {{effective_date}}, after which your performance will be reviewed again.</p>
<p>During this time, you will continue to receive support and guidance from {{manager_name}}.</p>
<p>Yours sincerely,<br>{{organisation_name}}</p>`,
  },
  {
    name: "Probation Confirmation Letter",
    contract_type: "probation_confirmation",
    body_html: `<p>Dear {{employee_full_name}},</p>
<p>Congratulations! Following your successful completion of your {{probation_period}} month probation period, we are pleased to confirm your permanent employment with {{organisation_name}}.</p>
<p>Your probation ended on {{today_date}}, and you are now a permanent member of staff.</p>
<p>We look forward to your continued contribution to the team.</p>
<p>Yours sincerely,<br>{{organisation_name}}</p>`,
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const org = await base44.asServiceRole.entities.Organisation.list();
    if (!org || org.length === 0) {
      return Response.json({ error: "Organisation not found" }, { status: 404 });
    }

    const orgId = org[0].id;
    let created = 0;

    for (const tpl of DEFAULT_TEMPLATES) {
      const existing = await base44.asServiceRole.entities.ContractTemplate.filter({
        org_id: orgId,
        contract_type: tpl.contract_type,
      });

      if (!existing || existing.length === 0) {
        await base44.asServiceRole.entities.ContractTemplate.create({
          ...tpl,
          org_id: orgId,
          version: 1,
          is_active: true,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });
        created++;
      }
    }

    return Response.json({ message: `Seeded ${created} contract templates` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});