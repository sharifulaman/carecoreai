import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APPOINTMENT_TYPES = [
  "gp_appointment",
  "hospital_appointment",
  "dental",
  "optician",
  "mental_health",
  "social_worker_visit",
  "iro_review",
  "lac_review",
  "court_hearing",
  "school_meeting",
  "college_meeting",
  "key_worker_session",
  "family_contact",
  "counselling",
  "probation",
];

const LOCATIONS = [
  "GP Surgery",
  "Hospital",
  "Dental Clinic",
  "Eye Care Centre",
  "Mental Health Clinic",
  "Local Authority Office",
  "Court Building",
  "School",
  "College",
  "Youth Offending Team",
  "Probation Office",
  "Home Visit",
  "Community Centre",
  "Counselling Room",
];

const LOCATION_TYPES = ["in_person", "video_call", "phone_call", "home_visit"];

const TITLES = [
  "Regular checkup",
  "Follow-up appointment",
  "Initial consultation",
  "Review meeting",
  "Assessment",
  "Planning session",
  "Support meeting",
  "Placement review",
  "Health screening",
  "Educational assessment",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Fetch staff, residents, and homes
    const [staff, residents] = await Promise.all([
      base44.asServiceRole.entities.StaffProfile.list(),
      base44.asServiceRole.entities.Resident.list(),
    ]);

    if (!staff || staff.length === 0) {
      return Response.json({ error: "No staff found" }, { status: 400 });
    }

    if (!residents || residents.length === 0) {
      return Response.json({ error: "No residents found" }, { status: 400 });
    }

    // Select 10 random staff (or all if less than 10)
    const selectedStaff = staff.slice(0, Math.min(10, staff.length));
    const appointmentCount = 30; // ~3 appointments per staff member across the month

    const now = new Date();
    const orgId = residents[0].org_id;

    const mkApt = (resident, organiser, offsetDays, offsetHours, status, extras = {}) => {
      const start = new Date(now);
      start.setDate(start.getDate() + offsetDays);
      start.setHours(9 + offsetHours, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const type = APPOINTMENT_TYPES[Math.floor(Math.random() * APPOINTMENT_TYPES.length)];
      const title = TITLES[Math.floor(Math.random() * TITLES.length)];
      return {
        org_id: orgId,
        title,
        appointment_type: type,
        description: `${title} for ${resident.display_name}`,
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        location_type: LOCATION_TYPES[Math.floor(Math.random() * LOCATION_TYPES.length)],
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        all_day: false,
        is_recurring: false,
        resident_id: resident.id,
        resident_name: resident.display_name,
        home_id: resident.home_id,
        organiser_id: organiser.id,
        organiser_name: organiser.full_name,
        attendees: [{ staff_id: organiser.id, staff_name: organiser.full_name, role: organiser.role, response_status: "accepted" }],
        reminder_minutes_before: 15,
        status,
        colour: "#3B82F6",
        is_private: false,
        ...extras,
      };
    };

    const appointments = [];

    // 1. Scheduled this week (8 appointments, days 1–6 from now)
    for (let i = 0; i < 8; i++) {
      const r = residents[i % residents.length];
      const s = selectedStaff[i % selectedStaff.length];
      appointments.push(mkApt(r, s, 1 + (i % 5), i % 6, "scheduled"));
    }

    // 2. Overdue follow-ups: completed past appointments with follow_up_required=true, no follow_up_notes
    for (let i = 0; i < 5; i++) {
      const r = residents[(i + 3) % residents.length];
      const s = selectedStaff[(i + 2) % selectedStaff.length];
      appointments.push(mkApt(r, s, -(5 + i), i % 6, "completed", {
        follow_up_required: true,
        follow_up_notes: "",
      }));
    }

    // 3. Did Not Attend this month (6 appointments)
    for (let i = 0; i < 6; i++) {
      const r = residents[(i + 1) % residents.length];
      const s = selectedStaff[(i + 1) % selectedStaff.length];
      appointments.push(mkApt(r, s, -(i + 1), i % 6, "did_not_attend"));
    }

    // 4. Outcomes Needed: status=scheduled but end_datetime in the past (7 appointments)
    for (let i = 0; i < 7; i++) {
      const r = residents[(i + 2) % residents.length];
      const s = selectedStaff[(i + 3) % selectedStaff.length];
      const start = new Date(now);
      start.setDate(start.getDate() - (i + 1));
      start.setHours(9 + (i % 6), 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // end is also in the past
      appointments.push({
        org_id: orgId,
        title: TITLES[i % TITLES.length],
        appointment_type: APPOINTMENT_TYPES[i % APPOINTMENT_TYPES.length],
        description: `Pending outcome for ${r.display_name}`,
        location: LOCATIONS[i % LOCATIONS.length],
        location_type: "in_person",
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        all_day: false,
        is_recurring: false,
        resident_id: r.id,
        resident_name: r.display_name,
        home_id: r.home_id,
        organiser_id: s.id,
        organiser_name: s.full_name,
        attendees: [{ staff_id: s.id, staff_name: s.full_name, role: s.role, response_status: "accepted" }],
        reminder_minutes_before: 15,
        status: "scheduled", // still scheduled but past = needs outcome
        colour: "#F59E0B",
        is_private: false,
      });
    }

    // 5. General past completed appointments (15 more for history)
    for (let i = 0; i < 15; i++) {
      const r = residents[i % residents.length];
      const s = selectedStaff[i % selectedStaff.length];
      appointments.push(mkApt(r, s, -(10 + i), i % 7, "completed"));
    }

    // Bulk create in batches of 10
    for (let i = 0; i < appointments.length; i += 10) {
      const batch = appointments.slice(i, i + 10);
      await Promise.all(batch.map(apt => base44.asServiceRole.entities.Appointment.create(apt)));
    }

    return Response.json({
      success: true,
      message: `Seeded ${appointments.length} appointments (8 scheduled this week, 5 overdue follow-ups, 6 DNA, 7 outcomes needed, 15 historical)`,
      appointmentCount: appointments.length,
    });
  } catch (error) {
    console.error("Error seeding appointments:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});