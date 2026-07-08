import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ORG_ID = Deno.env.get("BASE44_APP_ID") || "default";

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function fmt(t) { return t; }

const SHIFT_TIMES = {
  morning:   { start: "07:00", end: "15:00", nextShift: "afternoon", nextStart: "15:00", nextEnd: "23:00" },
  afternoon: { start: "15:00", end: "23:00", nextShift: "night",     nextStart: "23:00", nextEnd: "07:00" },
  night:     { start: "23:00", end: "07:00", nextShift: "morning",   nextStart: "07:00", nextEnd: "15:00" },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const DAILY_OVERVIEWS = [
  "Quiet shift overall. All residents settled and accounted for.",
  "Busy shift with two doctor appointments. Both residents seen and returned safely.",
  "Evening was calm. Dinner prepared and eaten well by all residents.",
  "Night checks completed every hour. All residents sleeping by 23:00.",
  "Productive shift — education visits completed and key worker sessions done.",
];

const HIGHLIGHTS = [
  "YP1 received positive news about their college enrolment.",
  "Successful family contact call made for YP2 — positive outcome.",
  "New resident settled well into the home during first full day.",
  "YP completed independent cooking session.",
  "Team completed fire drill exercise — all residents participated.",
];

const CONCERNS = [
  "YP3 appeared withdrawn and low in mood during the afternoon.",
  "Minor altercation in the kitchen — de-escalated swiftly with no injuries.",
  "Late return from school — YP arrived back at 18:30, safe.",
  "YP refused medication — GP to be contacted in the morning.",
];

const TASKS = [
  { title: "Contact social worker for YP2", priority: "high", due_at: "09:00 AM" },
  { title: "Arrange GP appointment for YP1", priority: "urgent", due_at: "10:00 AM" },
  { title: "Restock kitchen supplies", priority: "low", due_at: "12:00 PM" },
  { title: "Complete daily log for YP3", priority: "medium", due_at: "End of shift" },
  { title: "Sign off medication record", priority: "high", due_at: "08:30 AM" },
  { title: "Call school to confirm attendance", priority: "medium", due_at: "09:30 AM" },
  { title: "Prepare handover notes for night shift", priority: "medium", due_at: "22:00 PM" },
];

const YP_STATUS = ["doing_well", "needs_monitoring", "concern", "doing_well", "doing_well"];
const YP_MOODS  = ["good", "neutral", "low", "anxious", "good", "good"];
const YP_UPDATES = [
  "Settled and engaged throughout the shift.",
  "Had a quiet day, required some encouragement to engage.",
  "Appeared low in mood — staff provided reassurance.",
  "Participated in cooking activity and was in good spirits.",
  "Returned from school and went straight to room — checked on regularly.",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get homes and staff
    const [homes, allStaff, allResidents] = await Promise.all([
      base44.asServiceRole.entities.Home.filter({ org_id: ORG_ID, status: "active" }),
      base44.asServiceRole.entities.StaffProfile.filter({ org_id: ORG_ID }),
      base44.asServiceRole.entities.Resident.filter({ org_id: ORG_ID, status: "active" }),
    ]);

    if (!homes.length) return Response.json({ error: "No active homes" }, { status: 404 });

    const home = homes[0];
    const homeResidents = allResidents.filter(r => r.home_id === home.id).slice(0, 4);
    const activeStaff = allStaff.filter(s => s.status === "active").slice(0, 6);
    if (activeStaff.length < 2) return Response.json({ error: "Need at least 2 active staff" }, { status: 400 });

    const results = { handovers: 0, updates: 0, yp_summaries: 0, tasks: 0 };

    // Seed 5 days of handovers (today and past 4 days), 3 shifts each
    for (let day = 4; day >= 0; day--) {
      const date = todayMinus(day);
      const shifts = ["morning", "afternoon", "night"];

      for (const shift of shifts) {
        const st = SHIFT_TIMES[shift];
        const outStaff = pick(activeStaff);
        const inStaff = activeStaff.find(s => s.id !== outStaff.id) || activeStaff[1];
        const isPast = day > 0 || shift !== "night";
        const status = isPast ? pick(["submitted", "acknowledged", "acknowledged"]) : "draft";

        // Check if already exists
        const existing = await base44.asServiceRole.entities.HandoverRecord.filter({
          home_id: home.id, handover_date: date, shift
        });
        if (existing.length > 0) continue;

        const handover = await base44.asServiceRole.entities.HandoverRecord.create({
          org_id: ORG_ID,
          home_id: home.id,
          home_name: home.name,
          handover_date: date,
          shift,
          outgoing_staff_id: outStaff.id,
          outgoing_staff_name: outStaff.full_name,
          outgoing_shift_start: st.start,
          outgoing_shift_end: st.end,
          incoming_staff_id: inStaff.id,
          incoming_staff_name: inStaff.full_name,
          incoming_shift_start: st.nextStart,
          incoming_shift_end: st.nextEnd,
          status,
          no_incidents_confirmed: Math.random() > 0.4,
          no_medication_issues_confirmed: Math.random() > 0.3,
          no_environment_concerns_confirmed: Math.random() > 0.5,
          outgoing_declaration: isPast,
          submitted_by_name: outStaff.full_name,
          submitted_at: isPast ? new Date(date + "T" + st.end + ":00").toISOString() : null,
          acknowledged_by_name: status === "acknowledged" ? inStaff.full_name : null,
          acknowledged_at: status === "acknowledged" ? new Date(date + "T" + st.nextStart + ":00").toISOString() : null,
          incoming_declaration: status === "acknowledged",
          progress_percent: isPast ? 85 : 0,
        });
        results.handovers++;

        // Add updates
        await base44.asServiceRole.entities.HandoverUpdate.create({
          org_id: ORG_ID,
          handover_id: handover.id,
          home_id: home.id,
          update_type: "daily_overview",
          title: "Daily Overview",
          summary: pick(DAILY_OVERVIEWS),
          severity: "low",
          recorded_at: st.end,
        });
        results.updates++;

        await base44.asServiceRole.entities.HandoverUpdate.create({
          org_id: ORG_ID,
          handover_id: handover.id,
          home_id: home.id,
          update_type: "highlight",
          title: "Shift Highlight",
          summary: pick(HIGHLIGHTS),
          severity: "low",
          recorded_at: st.end,
        });
        results.updates++;

        if (Math.random() > 0.5) {
          await base44.asServiceRole.entities.HandoverUpdate.create({
            org_id: ORG_ID,
            handover_id: handover.id,
            home_id: home.id,
            update_type: "concern",
            title: "Concern",
            summary: pick(CONCERNS),
            severity: pick(["medium", "high"]),
            recorded_at: st.end,
          });
          results.updates++;
        }

        // Add YP summaries
        for (const res of homeResidents) {
          await base44.asServiceRole.entities.HandoverYPSummary.create({
            org_id: ORG_ID,
            handover_id: handover.id,
            home_id: home.id,
            resident_id: res.id,
            resident_initials: (res.display_name || "YP").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
            resident_display: res.display_name?.split(" ").map((w, i) => i === 0 ? w[0] + "." : w).join(" ") || "YP",
            status: pick(YP_STATUS),
            mood: pick(YP_MOODS),
            key_update: pick(YP_UPDATES),
            follow_up_required: Math.random() > 0.7,
            follow_up_note: Math.random() > 0.7 ? "Check in with YP at start of next shift." : "",
          });
          results.yp_summaries++;
        }

        // Add tasks
        const numTasks = Math.floor(Math.random() * 3) + 1;
        for (let t = 0; t < numTasks; t++) {
          const task = pick(TASKS);
          await base44.asServiceRole.entities.HandoverTask.create({
            org_id: ORG_ID,
            handover_id: handover.id,
            home_id: home.id,
            title: task.title,
            priority: task.priority,
            due_at: task.due_at,
            status: isPast ? pick(["completed", "passed_to_next_shift", "completed"]) : "open",
            assigned_to_name: pick(activeStaff).full_name,
          });
          results.tasks++;
        }
      }
    }

    return Response.json({ success: true, home: home.name, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});