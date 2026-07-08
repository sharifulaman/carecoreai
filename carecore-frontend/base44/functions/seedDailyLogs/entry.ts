import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  // Get residents
  const residents = await base44.asServiceRole.entities.Resident.list('-created_date', 10);
  if (!residents || residents.length === 0) {
    return Response.json({ error: 'No residents found. Seed residents first.' }, { status: 400 });
  }

  // Get staff
  const staff = await base44.asServiceRole.entities.StaffProfile.list('-created_date', 20);
  const supportWorkers = staff.filter(s => s.role === 'support_worker' || s.role === 'team_leader');
  if (supportWorkers.length === 0) {
    return Response.json({ error: 'No staff found. Seed staff first.' }, { status: 400 });
  }

  const today = new Date();
  const dateStr = d => {
    const dt = new Date(today);
    dt.setDate(today.getDate() - d);
    return dt.toISOString().split('T')[0];
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Daily log templates per type
  const LOG_TEMPLATES = {
    "Morning Log": [
      { title: "Morning Check & Wellbeing", summary: "Jamie was awake, in good spirits and had breakfast.\nSlept well. No concerns." },
      { title: "Morning Routine", summary: "Up by 8am, had breakfast, good mood.\nNo overnight concerns reported." },
      { title: "Morning Check", summary: "Woke up independently, had cereal and toast.\nAppeared rested and in positive mood." },
    ],
    "Education": [
      { title: "Education / School", summary: "Attended school. Left home at 09:15.\nNo issues reported by school staff." },
      { title: "College Attendance", summary: "Attended college today. Left at 09:00.\nTeacher reported good engagement." },
      { title: "School Day", summary: "Attended school. Left on time with packed lunch.\nNo concerns from education staff." },
    ],
    "Nutrition": [
      { title: "Lunch", summary: "Ate lunch with encouragement.\nDiscussed healthy food options." },
      { title: "Evening Meal", summary: "Cooked pasta together. Good appetite.\nEngaged positively in meal preparation." },
      { title: "Dinner", summary: "Had dinner at home. Ate well.\nTried a new recipe, seemed to enjoy it." },
    ],
    "Key Work Session": [
      { title: "Key Work Session", summary: "Reviewed Jamie's weekly goals.\nFocused on anger management strategies and positive coping mechanisms.\nJamie was engaged and open in discussion.", tags: ["Key Work", "Goals", "Wellbeing"] },
      { title: "Key Worker Meeting", summary: "Discussed progress towards independence goals.\nReviewed pathway plan milestones. Positive session.", tags: ["Key Work", "Pathway Plan"] },
      { title: "Key Work Session", summary: "Explored feelings around family contact.\nJamie opened up about concerns. Action plan agreed.", tags: ["Key Work", "Family", "Emotional Support"] },
    ],
    "Activity": [
      { title: "Physical Activity", summary: "Went for a walk and played football in the park.\nPositive engagement with peers." },
      { title: "Gym Session", summary: "Attended gym session. Good engagement.\nBuilding routine around fitness." },
      { title: "Arts & Crafts", summary: "Participated in art session at the community centre.\nCreated a painting, very proud of the outcome." },
    ],
    "Wellbeing": [
      { title: "Night Check", summary: "Settled in bed. No concerns.\nAsleep by 21:00." },
      { title: "Wellbeing Check", summary: "Mood was calm and settled.\nEngaged positively with staff. No concerns." },
      { title: "Evening Wellbeing", summary: "Appeared relaxed in the evening.\nWatched TV, went to bed without issue." },
    ],
    "Reflection": [
      { title: "Evening Reflection", summary: "Watched a movie. Talked about future plans.\nJamie in good mood before bed." },
      { title: "Daily Reflection", summary: "Reflected on the day's events.\nAcknowledged challenges but remained positive." },
    ],
    "General Note": [
      { title: "General Note", summary: "Spoke with Jamie about weekend plans.\nLooking forward to seeing family on Sunday." },
      { title: "Staff Note", summary: "Reminded about upcoming appointment.\nJamie acknowledged and agreed to attend." },
    ],
    "Family Contact": [
      { title: "Family Contact", summary: "Supervised phone call with mother.\nPositive interaction, lasted 30 minutes.\nJamie appeared happy after the call.", tags: ["Family", "Contact"] },
    ],
    "Medication": [
      { title: "Medication Administered", summary: "Medication administered as per MAR chart.\nNo adverse reactions noted. Signed and witnessed." },
    ],
    "Health": [
      { title: "Health Check", summary: "GP appointment attended.\nBlood pressure and general health checked.\nAll within normal range." },
    ],
  };

  const logTypes = Object.keys(LOG_TEMPLATES);

  // Build logs for each resident across last 7 days
  const logsToCreate = [];

  for (const resident of residents.slice(0, 5)) {
    const residentStaff = supportWorkers.slice(0, Math.min(3, supportWorkers.length));

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = dateStr(dayOffset);

      // Create 6-10 logs per day for today, fewer for past days
      const logsPerDay = dayOffset === 0 ? 8 : (dayOffset <= 2 ? 5 : 3);

      // Pick log types for this day
      const dayTypes = dayOffset === 0
        ? ["Morning Log", "Education", "Nutrition", "Key Work Session", "Activity", "Reflection", "Wellbeing", "General Note"]
        : pick([
            ["Morning Log", "Education", "Nutrition", "Activity"],
            ["Morning Log", "Nutrition", "Key Work Session", "Wellbeing"],
            ["Morning Log", "Nutrition", "Health", "General Note"],
            ["Morning Log", "Education", "Family Contact", "Reflection"],
            ["Morning Log", "Nutrition", "Medication", "Wellbeing"],
          ]);

      const times = ["07:30", "08:00", "09:00", "09:30", "10:00", "12:00", "12:45", "13:00", "15:20", "17:00", "17:30", "19:00", "20:00", "21:00", "21:15", "21:30"];
      const sortedTimes = [...times].sort(() => 0.5 - Math.random()).slice(0, dayTypes.length).sort();

      dayTypes.slice(0, logsPerDay).forEach((logType, idx) => {
        const templates = LOG_TEMPLATES[logType] || LOG_TEMPLATES["General Note"];
        const tpl = pick(templates);
        const worker = pick(residentStaff);
        const roles = { admin: "Admin", admin_officer: "Admin Officer", team_leader: "Team Leader", support_worker: "Support Worker" };

        logsToCreate.push({
          org_id: resident.org_id,
          resident_id: resident.id,
          resident_name: resident.display_name,
          home_id: resident.home_id,
          home_name: resident.home_name || "",
          worker_id: worker.id,
          staff_id: worker.id,
          worker_name: worker.full_name,
          recorded_by_role: roles[worker.role] || "Support Worker",
          date,
          log_time: sortedTimes[idx] || "09:00",
          log_type: logType,
          title: tpl.title,
          summary: tpl.summary,
          details: tpl.summary,
          tags: tpl.tags || [],
          visibility: "Home Staff",
          status: "Submitted",
          risk_level: "None",
          mood: pick(["Positive", "Calm", "Settled", "Anxious", "Unknown"]),
          source_module: "daily_logs",
          source_entity_type: "manual_daily_log",
          is_auto_generated: false,
          requires_manager_review: false,
          review_status: "Not Required",
          follow_up_required: false,
          flagged: false,
        });
      });
    }
  }

  // Batch create
  const batchSize = 20;
  let created = 0;
  for (let i = 0; i < logsToCreate.length; i += batchSize) {
    const batch = logsToCreate.slice(i, i + batchSize);
    await base44.asServiceRole.entities.DailyLog.bulkCreate(batch);
    created += batch.length;
  }

  return Response.json({ success: true, created, residents: residents.slice(0, 5).map(r => r.display_name) });
});