import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ORG_ID = Deno.env.get("BASE44_APP_ID") || "default";

const TEMPLATES = [
  { title: "Check the water is working properly", area: "Daily", frequency: "daily", default_due_time: "08:00 AM", items: [
    { item_title: "Kitchen tap", item_question: "Does the kitchen tap run hot and cold?", display_order: 1 },
    { item_title: "Bathroom tap", item_question: "Does the bathroom tap run hot and cold?", display_order: 2 },
    { item_title: "Shower", item_question: "Does the shower run hot and cold water?", display_order: 3 },
    { item_title: "No leaks observed", item_question: "Are there any visible leaks under sinks or around pipes?", display_order: 4 },
    { item_title: "Water pressure acceptable", item_question: "Is the water pressure normal?", display_order: 5 },
  ]},
  { title: "Daily appointment and calendar check", area: "Daily", frequency: "daily", default_due_time: "09:00 AM", items: [
    { item_title: "Today's appointments reviewed", item_question: "Have all today's appointments been checked?", display_order: 1 },
    { item_title: "Upcoming appointments flagged", item_question: "Are any upcoming appointments within 48 hours flagged?", display_order: 2 },
    { item_title: "Transport arranged", item_question: "Has transport been arranged where needed?", display_order: 3 },
    { item_title: "Residents informed", item_question: "Have residents been informed of their appointments today?", display_order: 4 },
  ]},
  { title: "Daily office safety, cleanliness, and maintenance check", area: "Daily", frequency: "daily", default_due_time: "09:30 AM", items: [
    { item_title: "Office area clean and tidy", item_question: "Is the office clean and free from clutter?", display_order: 1 },
    { item_title: "Documents secured", item_question: "Are confidential documents locked away?", display_order: 2 },
    { item_title: "Equipment working", item_question: "Is all office equipment working?", display_order: 3 },
    { item_title: "No maintenance issues", item_question: "Are there any maintenance issues in the office area?", display_order: 4 },
    { item_title: "First aid kit present", item_question: "Is the first aid kit in place and accessible?", display_order: 5 },
  ]},
  { title: "Daily smart meter reading and recording", area: "Daily", frequency: "daily", default_due_time: "10:00 AM", items: [
    { item_title: "Electricity meter reading recorded", item_question: "Has the electricity meter reading been recorded?", display_order: 1 },
    { item_title: "Gas meter reading recorded", item_question: "Has the gas meter reading been recorded (if applicable)?", display_order: 2 },
    { item_title: "Reading photo uploaded", item_question: "Has a photo of the meter reading been uploaded?", display_order: 3 },
    { item_title: "Unusual usage or fault noted", item_question: "Is there any unusual usage or fault showing on the meter?", display_order: 4 },
  ]},
  { title: "Driveway safety and condition check", area: "Daily", frequency: "daily", default_due_time: "10:30 AM", items: [
    { item_title: "Driveway clear of obstruction", item_question: "Is the driveway free from obstructions?", display_order: 1 },
    { item_title: "Surface safe and free from trip hazards", item_question: "Is the driveway surface safe and free from trip hazards?", display_order: 2 },
    { item_title: "External lighting working", item_question: "Is external driveway lighting working?", display_order: 3 },
    { item_title: "Gates/fences secure", item_question: "Are gates and fences secure?", display_order: 4 },
  ]},
  { title: "Flooring safety check", area: "Daily", frequency: "daily", default_due_time: "11:00 AM", items: [
    { item_title: "Hallways clear of hazards", item_question: "Are hallways clear of trip hazards?", display_order: 1 },
    { item_title: "Flooring intact – lounge", item_question: "Is the lounge floor in safe condition?", display_order: 2 },
    { item_title: "Flooring intact – kitchen", item_question: "Is the kitchen floor in safe condition?", display_order: 3 },
    { item_title: "Flooring intact – bathroom", item_question: "Is the bathroom floor safe and non-slip?", display_order: 4 },
    { item_title: "Stairs safe", item_question: "Are stair coverings secure and bannisters stable?", display_order: 5 },
  ]},
  { title: "Garden checks", area: "Daily", frequency: "daily", default_due_time: "11:30 AM", items: [
    { item_title: "Garden area free from hazards", item_question: "Is the garden area free from hazards?", display_order: 1 },
    { item_title: "Rubbish removed", item_question: "Has rubbish or waste been removed from the garden?", display_order: 2 },
    { item_title: "Fencing/gate secure", item_question: "Are garden fences and gates secure?", display_order: 3 },
    { item_title: "Pathways clear", item_question: "Are garden pathways clear and safe to walk on?", display_order: 4 },
  ]},
  { title: "Kitchen", area: "Daily", frequency: "daily", default_due_time: "12:00 PM", items: [
    { item_title: "Worktops clean", item_question: "Are all worktops clean and free from debris?", display_order: 1 },
    { item_title: "Sink clean", item_question: "Is the sink clean and free from food debris?", display_order: 2 },
    { item_title: "Fridge clean and temperature acceptable", item_question: "Is the fridge clean and at an acceptable temperature?", display_order: 3 },
    { item_title: "Food stored correctly", item_question: "Is all food properly labelled and stored correctly?", display_order: 4 },
    { item_title: "Bins emptied", item_question: "Have bins been emptied and relined?", display_order: 5 },
    { item_title: "Appliances visually safe", item_question: "Are all kitchen appliances visually safe?", display_order: 6 },
  ]},
  { title: "Fire Safety – fire prevention & protection", area: "Weekly", frequency: "weekly", default_due_time: "09:00 AM", items: [
    { item_title: "Fire alarm panel checked", item_question: "Is the fire alarm panel visible and operational?", display_order: 1 },
    { item_title: "Smoke detectors unobstructed", item_question: "Are all smoke detectors present and unobstructed?", display_order: 2 },
    { item_title: "Fire extinguishers in place", item_question: "Are fire extinguishers in their correct locations and in date?", display_order: 3 },
    { item_title: "Fire exits clear and unlocked", item_question: "Are all fire exits clear and unlocked?", display_order: 4 },
    { item_title: "Emergency lighting working", item_question: "Is emergency lighting checked and working?", display_order: 5 },
    { item_title: "Evacuation routes unobstructed", item_question: "Are all evacuation routes free from obstructions?", display_order: 6 },
  ]},
  { title: "Electrical Safety – electrical installations & appliances", area: "Weekly", frequency: "weekly", default_due_time: "09:30 AM", items: [
    { item_title: "Sockets/outlets visually safe", item_question: "Are all visible sockets and outlets free from damage?", display_order: 1 },
    { item_title: "Appliances visually safe", item_question: "Are all electrical appliances visually safe with no frayed cables?", display_order: 2 },
    { item_title: "Fuse box accessible", item_question: "Is the fuse box accessible and clearly labelled?", display_order: 3 },
  ]},
  { title: "Gas & carbon monoxide safety", area: "Weekly", frequency: "weekly", default_due_time: "10:00 AM", items: [
    { item_title: "CO alarm present and working", item_question: "Is the carbon monoxide alarm present and working?", display_order: 1 },
    { item_title: "No smell of gas", item_question: "Is there no smell of gas in any area?", display_order: 2 },
    { item_title: "Boiler visual check", item_question: "Is the boiler showing a normal status with no fault lights?", display_order: 3 },
    { item_title: "Heating working", item_question: "Is the heating system working correctly?", display_order: 4 },
  ]},
  { title: "General building safety and security", area: "Weekly", frequency: "weekly", default_due_time: "10:30 AM", items: [
    { item_title: "All doors and windows secure", item_question: "Are all doors and windows locking correctly?", display_order: 1 },
    { item_title: "Interior lighting working", item_question: "Is all interior lighting working?", display_order: 2 },
    { item_title: "Exterior lighting working", item_question: "Is all exterior lighting working?", display_order: 3 },
    { item_title: "Resident wellbeing checked", item_question: "Have all residents been visually checked for wellbeing?", display_order: 4 },
  ]},
  { title: "Hygiene & sanitation", area: "Weekly", frequency: "weekly", default_due_time: "11:00 AM", items: [
    { item_title: "Bathrooms deep cleaned", item_question: "Have bathrooms been deep cleaned this week?", display_order: 1 },
    { item_title: "Kitchen deep cleaned", item_question: "Has the kitchen been deep cleaned this week?", display_order: 2 },
    { item_title: "Bins disinfected", item_question: "Have bins been disinfected and relined?", display_order: 3 },
    { item_title: "No pest concerns", item_question: "Are there any signs of pests to report?", display_order: 4 },
    { item_title: "Cleaning supplies stocked", item_question: "Are cleaning supplies stocked and accessible?", display_order: 5 },
  ]},
  { title: "Kitchen / living room / rooms items checklist", area: "Weekly", frequency: "weekly", default_due_time: "11:30 AM", items: [
    { item_title: "Kitchen appliances all present", item_question: "Are all expected kitchen appliances present and working?", display_order: 1 },
    { item_title: "Living room furniture safe", item_question: "Is living room furniture in safe and acceptable condition?", display_order: 2 },
    { item_title: "Bedrooms checked for damage", item_question: "Have bedrooms been checked for any damage or missing items?", display_order: 3 },
  ]},
  { title: "First aid & emergency procedures", area: "Weekly", frequency: "weekly", default_due_time: "12:00 PM", items: [
    { item_title: "First aid kit stocked", item_question: "Is the first aid kit fully stocked and in date?", display_order: 1 },
    { item_title: "Emergency contact list visible", item_question: "Is the emergency contact list clearly displayed?", display_order: 2 },
    { item_title: "Evacuation plan visible", item_question: "Is the evacuation/fire plan clearly displayed?", display_order: 3 },
  ]},
  { title: "Fire Safety – monthly checks", area: "Monthly", frequency: "monthly", default_due_time: "09:00 AM", items: [
    { item_title: "Fire alarm full test completed", item_question: "Has the fire alarm been fully tested this month?", display_order: 1 },
    { item_title: "Fire drill completed", item_question: "Has a fire drill been completed this month?", display_order: 2 },
    { item_title: "Fire risk assessment reviewed", item_question: "Has the fire risk assessment been reviewed?", display_order: 3 },
  ]},
  { title: "Electrical & Gas – monthly checks", area: "Monthly", frequency: "monthly", default_due_time: "09:30 AM", items: [
    { item_title: "PAT testing records reviewed", item_question: "Have PAT testing records been reviewed for upcoming expiry?", display_order: 1 },
    { item_title: "Gas safety certificate reviewed", item_question: "Has the gas safety certificate been reviewed for expiry date?", display_order: 2 },
    { item_title: "CO alarm tested", item_question: "Has the carbon monoxide alarm been tested this month?", display_order: 3 },
  ]},
  { title: "Property walkthrough & welfare", area: "Monthly", frequency: "monthly", default_due_time: "10:00 AM", items: [
    { item_title: "Full property walkthrough completed", item_question: "Has a full property walkthrough been completed?", display_order: 1 },
    { item_title: "Damp or mould inspection", item_question: "Have all rooms been checked for damp or mould?", display_order: 2 },
    { item_title: "Resident welfare assessment", item_question: "Has a monthly welfare check been completed with all residents?", display_order: 3 },
  ]},
  { title: "Monthly deep clean & inventory", area: "Monthly", frequency: "monthly", default_due_time: "11:00 AM", items: [
    { item_title: "Deep clean of all communal areas", item_question: "Has a deep clean of all communal areas been completed?", display_order: 1 },
    { item_title: "Full inventory check completed", item_question: "Has a full inventory check been completed?", display_order: 2 },
    { item_title: "First aid kit fully restocked", item_question: "Has the first aid kit been fully restocked?", display_order: 3 },
  ]},
];

function dateStr(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const homeIdFilter = body.home_id;
    const allHomes = await base44.asServiceRole.entities.Home.filter({ status: "active" });
    const homes = homeIdFilter ? allHomes.filter(h => h.id === homeIdFilter) : allHomes.slice(0, 1);
    if (!homes || homes.length === 0) {
      return Response.json({ error: "No active homes found" }, { status: 404 });
    }

    const results = { templates: 0, items: 0, instances: 0, completions: 0, issues: 0 };

    // Check if templates already seeded
    const existing = await base44.asServiceRole.entities.HomeCheckTemplate.filter({ org_id: ORG_ID });
    let templateRecords = existing;

    if (existing.length === 0) {
      // Create templates + items
      for (const tpl of TEMPLATES) {
        const created = await base44.asServiceRole.entities.HomeCheckTemplate.create({
          org_id: ORG_ID, title: tpl.title, area: tpl.area, frequency: tpl.frequency,
          default_due_time: tpl.default_due_time, is_active: true, requires_manager_review: true,
        });
        results.templates++;
        for (const item of tpl.items) {
          await base44.asServiceRole.entities.HomeCheckTemplateItem.create({
            org_id: ORG_ID, template_id: created.id, item_title: item.item_title,
            item_question: item.item_question, display_order: item.display_order,
            is_required: true, allows_na: true, requires_note_on_fail: false,
          });
          results.items++;
        }
        templateRecords.push({ ...created, ...tpl });
      }
    }

    const staffNames = ["Sarah Johnson", "David Patel", "Emma Clarke", "James Williams", "Fatima Hassan"];
    const statuses = ["completed", "completed", "completed", "submitted_for_review", "in_progress", "due", "overdue"];
    const issueTitles = [
      "Smoke detector battery low", "Broken window latch in bedroom 2",
      "Fridge temperature above 5°C", "Fire exit partially blocked by boxes",
      "Damp patch found on bathroom wall", "External light not working",
      "Loose bannister on staircase", "Missing fire blanket in kitchen",
    ];
    const issueSeverities = ["low", "medium", "high", "critical"];
    const issueStatuses = ["open", "open", "in_progress", "awaiting_manager_review", "resolved"];

    // For each home, create instances for today ± 7 days + historical completions + issues
    for (const home of homes) {
      // Dates: -7 to +6 (14 days total centred on today)
      const allDays = Array.from({ length: 14 }, (_, i) => i - 7);

      for (const tpl of templateRecords) {
        const daysToSchedule = tpl.frequency === "daily" ? allDays
          : tpl.frequency === "weekly" ? [-7, 0, 7].filter(d => d >= -7 && d <= 6)
          : [-7, 0];

        for (const offset of daysToSchedule) {
          const d = dateStr(offset);
          const isPast = offset < 0;
          const isToday = offset === 0;
          const status = isPast
            ? pick(["completed", "completed", "submitted_for_review", "overdue"])
            : isToday
            ? pick(["due", "due", "in_progress", "submitted_for_review"])
            : "due";

          const instance = await base44.asServiceRole.entities.HomeCheckInstance.create({
            org_id: ORG_ID, home_id: home.id, template_id: tpl.id,
            template_title: tpl.title, template_area: tpl.area,
            template_frequency: tpl.frequency, scheduled_date: d,
            due_at: tpl.default_due_time, status,
          });
          results.instances++;

          // Create completion records for past/submitted items
          if (["completed", "submitted_for_review"].includes(status)) {
            const staffName = pick(staffNames);
            const submittedAt = new Date(d + "T10:00:00").toISOString();
            const completion = await base44.asServiceRole.entities.HomeCheckCompletion.create({
              org_id: ORG_ID, home_id: home.id, template_id: tpl.id,
              instance_id: instance.id, submitted_by_name: staffName,
              submitted_at: submittedAt, completion_date: d,
              overall_status: status === "submitted_for_review" ? "submitted_for_review" : "approved_as_recorded",
              manager_review_status: status === "submitted_for_review" ? "pending" : "approved",
              general_note: pick(["All checks passed.", "Minor issues noted, actioned.", "All good.", "Completed as scheduled."]),
            });
            results.completions++;

            // Occasionally create an issue (20% chance on past completions)
            if (isPast && Math.random() < 0.2) {
              await base44.asServiceRole.entities.HomeCheckIssue.create({
                org_id: ORG_ID, home_id: home.id,
                instance_id: instance.id, completion_id: completion.id,
                template_id: tpl.id, issue_title: pick(issueTitles),
                severity: pick(issueSeverities), status: pick(issueStatuses),
                reported_by_name: staffName,
                issue_details: "Issue identified during routine check. Immediate action noted.",
                immediate_action_taken: "Staff informed manager. Temporary measures in place.",
              });
              results.issues++;
            }
          }
        }
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});