import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ORG_ID = Deno.env.get("BASE44_APP_ID") || "default";

function dateStr(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const staffNames = ["Sarah Johnson", "David Patel", "Emma Clarke", "James Williams", "Fatima Hassan"];
const notes = ["All checks passed.", "Minor issues noted, actioned.", "All good.", "Completed as scheduled.", "No concerns raised."];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { home_id } = await req.json();
    if (!home_id) {
      return Response.json({ error: 'home_id is required' }, { status: 400 });
    }

    const templates = await base44.asServiceRole.entities.HomeCheckTemplate.filter({ is_active: true });
    if (templates.length === 0) {
      return Response.json({ error: 'No active templates found. Run seedChecksData first.' }, { status: 404 });
    }

    // Past 7 days only to avoid rate limits
    const pastDays = Array.from({ length: 7 }, (_, i) => -(7 - i)); // -7 to -1

    let instances = 0, completions = 0;

    // Limit to 6 templates to stay within rate limits
    const limitedTemplates = templates.slice(0, 6);

    for (const tpl of limitedTemplates) {
      let daysToSeed;
      if (tpl.frequency === 'daily') {
        daysToSeed = pastDays;
      } else if (tpl.frequency === 'weekly') {
        daysToSeed = [-7];
      } else {
        daysToSeed = [-7];
      }

      for (const offset of daysToSeed) {
        const d = dateStr(offset);

        // Skip if instance already exists for this home/template/date
        const existing = await base44.asServiceRole.entities.HomeCheckInstance.filter({
          home_id, template_id: tpl.id, scheduled_date: d
        });
        if (existing.length > 0) continue;

        // 90% completed, 10% submitted_for_review — all past so all "done"
        const status = Math.random() < 0.9 ? 'completed' : 'submitted_for_review';
        const staffName = pick(staffNames);
        const submittedAt = new Date(d + 'T10:00:00').toISOString();

        const instance = await base44.asServiceRole.entities.HomeCheckInstance.create({
          org_id: ORG_ID,
          home_id,
          template_id: tpl.id,
          template_title: tpl.title,
          template_area: tpl.area || 'General',
          template_frequency: tpl.frequency,
          scheduled_date: d,
          due_at: tpl.default_due_time || '09:00 AM',
          status,
        });
        instances++;

        const completion = await base44.asServiceRole.entities.HomeCheckCompletion.create({
          org_id: ORG_ID,
          home_id,
          template_id: tpl.id,
          instance_id: instance.id,
          submitted_by_name: staffName,
          submitted_at: submittedAt,
          completion_date: d,
          overall_status: status === 'submitted_for_review' ? 'submitted_for_review' : 'approved_as_recorded',
          manager_review_status: status === 'submitted_for_review' ? 'pending' : 'approved',
          general_note: pick(notes),
        });
        completions++;

        // Seed item responses for this completion
        const templateItems = await base44.asServiceRole.entities.HomeCheckTemplateItem.filter({ template_id: tpl.id });
        for (const item of templateItems) {
          const rand = Math.random();
          const responseStatus = rand < 0.75 ? 'pass' : rand < 0.90 ? 'na' : 'fail';
          const responseRecord = {
            org_id: ORG_ID,
            completion_id: completion.id,
            instance_id: instance.id,
            template_item_id: item.id,
            item_title: item.item_title,
            response_status: responseStatus,
            note: responseStatus === 'pass' ? pick(["Checked and confirmed.", "All clear.", "", ""]) : "",
            issue_created: responseStatus === 'fail',
            completed_by_name: staffName,
            completed_at: submittedAt,
          };
          if (responseStatus === 'fail') {
            responseRecord.issue_details = pick(["Requires attention", "Damage observed", "Item missing", "Not functioning correctly"]);
          }
          await base44.asServiceRole.entities.HomeCheckItemResponse.create(responseRecord);
        }
      }
    }

    return Response.json({ success: true, instances, completions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});