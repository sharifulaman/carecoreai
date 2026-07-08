import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const DEMO_EVENTS = [
  { actor_name: "Morsalin Chowdhury", actor_role: "admin_manager", action_type: "updated", module_name: "incidents", record_reference: "INC-2025-0156", record_title: "Fall in bathroom", severity: "medium", reason_comment: "Updated incident details after reviewing CCTV footage" },
  { actor_name: "Sarah Khan", actor_role: "support_worker", action_type: "submitted", module_name: "support_plans", record_reference: "SP-2025-0042", record_title: "John Smith", severity: "low", reason_comment: "Submitted support plan for review" },
  { actor_name: "Aisha Johnson", actor_role: "team_leader", action_type: "escalated", module_name: "safeguarding", record_reference: "SG-2025-0088", record_title: "Maria Garcia", severity: "high", reason_comment: "Escalated due to immediate safeguarding concern" },
  { actor_name: "Tom Murray", actor_role: "finance_manager", action_type: "approved", module_name: "bills", record_reference: "BILL-2025-0731", record_title: "Home Expenses May 2025", severity: "low", reason_comment: "Approved for posting to home accounts" },
  { actor_name: "Ravi Patel", actor_role: "admin_officer", action_type: "created", module_name: "maintenance", record_reference: "MA-2025-0421", record_title: "Boiler Inspection", severity: "low", reason_comment: "Created scheduled boiler inspection record" },
  { actor_name: "Emma Davis", actor_role: "rsm", action_type: "approved", module_name: "incidents", record_reference: "INC-2025-0155", record_title: "Medication Error", severity: "critical", reason_comment: "Reviewed and approved incident closure" },
  { actor_name: "James Wilson", actor_role: "finance_officer", action_type: "rejected", module_name: "bills", record_reference: "BILL-2025-0730", record_title: "Utilities Overage", severity: "medium", reason_comment: "Requires further validation before approval" },
  { actor_name: "Lisa Chen", actor_role: "hr_manager", action_type: "created", module_name: "hr", record_reference: "TR-2025-0512", record_title: "Safeguarding Training", severity: "low", reason_comment: "Created training record for staff" },
  { actor_name: "Marcus Brown", actor_role: "team_manager", action_type: "escalated", module_name: "incidents", record_reference: "INC-2025-0154", record_title: "Serious Injury Report", severity: "critical", reason_comment: "Escalated to RSM for immediate review" },
  { actor_name: "Sophie Williams", actor_role: "risk_manager", action_type: "updated", module_name: "risk_assessments", record_reference: "RA-2025-0089", record_title: "Resident Risk Assessment", severity: "high", reason_comment: "Updated risk rating based on recent incidents" },
  { actor_name: "David Anderson", actor_role: "admin_manager", action_type: "exported", module_name: "finance", record_reference: "EXP-2025-0045", record_title: "Monthly Finance Report", severity: "low", reason_comment: "Exported report for board review" },
  { actor_name: "Olivia Martin", actor_role: "team_leader", action_type: "submitted", module_name: "incidents", record_reference: "INC-2025-0153", record_title: "Missing Episode Report", severity: "high", reason_comment: "Submitted missing person incident report" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org_id = user.data?.org_id || 'default_org';
    let created = 0;

    // Create demo audit events spread across last 7 days
    for (let i = 0; i < DEMO_EVENTS.length; i++) {
      const event = DEMO_EVENTS[i];
      const daysAgo = Math.floor(i / 2); // Spread across days
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

      try {
        await base44.asServiceRole.entities.AuditEvent.create({
          org_id,
          event_reference: `EVENT-2025-${String(9000 + i).slice(-5)}`,
          actor_name: event.actor_name,
          actor_role: event.actor_role,
          action_type: event.action_type,
          module_name: event.module_name,
          entity_type: event.module_name.replace(/_/g, ""),
          record_reference: event.record_reference,
          record_title: event.record_title,
          severity: event.severity,
          reason_comment: event.reason_comment,
        });
        created++;
        if (created % 3 === 0) await sleep(100); // Small delay to avoid rate limit
      } catch (e) {
        console.log(`Error creating audit event: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      auditsCreated: created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});