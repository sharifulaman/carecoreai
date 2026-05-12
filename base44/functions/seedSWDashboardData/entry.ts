import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const org_id = 'default_org';
    const today = new Date().toISOString().split('T')[0];

    // Get Sarah Johnson's staff profile (the SW user)
    const allStaff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id });
    const sarah = allStaff.find(s => s.email === 'morsalin.chowdhury@evolvixdigitalltd.co.uk') || allStaff.find(s => s.role === 'support_worker');

    if (!sarah) {
      return Response.json({ error: 'Support worker profile not found' }, { status: 404 });
    }

    // Ensure Sarah has home_ids set
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id });
    let sarahHomeIds = sarah.home_ids || [];
    if (sarahHomeIds.length === 0 && homes.length > 0) {
      sarahHomeIds = [homes[0].id];
      await base44.asServiceRole.entities.StaffProfile.update(sarah.id, { home_ids: sarahHomeIds });
    }
    const sarahHome = homes.find(h => sarahHomeIds.includes(h.id)) || homes[0];

    let results = { shifts: 0, residents: 0, checks: 0, handovers: 0, incidents: 0, training: 0, notifications: 0, visitReports: 0 };

    // 1. Create today's shift for Sarah (Shift schema: no staff_id field, use assigned_staff array)
    const existingShifts = await base44.asServiceRole.entities.Shift.filter({ org_id });
    const sarahShiftToday = existingShifts.find(s => 
      (s.assigned_staff || []).includes(sarah.id) && s.date === today
    );
    if (!sarahShiftToday && sarahHome) {
      await base44.asServiceRole.entities.Shift.create({
        org_id, home_id: sarahHome.id,
        assigned_staff: [sarah.id],
        lead_staff_id: sarah.id,
        date: today,
        time_start: '07:00', time_end: '15:00',
        shift_type: 'morning', status: 'in_progress',
        staff_required: 1,
      });
      results.shifts++;
    }

    // 2. Ensure residents exist for Sarah's home
    const allResidents = await base44.asServiceRole.entities.Resident.filter({ org_id });
    const homeResidents = allResidents.filter(r => sarahHomeIds.includes(r.home_id) && r.status === 'active');

    const residentSeeds = [
      { display_name: 'Liam Johnson', initials: 'LJ', dob: '2009-03-15', risk_level: 'low', medical_conditions: [], allergies: [] },
      { display_name: 'Maya Patel', initials: 'MP', dob: '2010-06-22', risk_level: 'medium', medical_conditions: [], allergies: [{ allergen: 'Peanuts', severity: 'severe', reaction: 'Anaphylaxis', notes: '' }] },
      { display_name: 'Ethan Blake', initials: 'EB', dob: '2011-01-08', risk_level: 'low', medical_conditions: [{ condition: 'Asthma', diagnosed_date: '2020-01-01', notes: 'Requires inhaler' }], allergies: [] },
      { display_name: 'Sophie Williams', initials: 'SW2', dob: '2010-11-30', risk_level: 'low', medical_conditions: [], allergies: [] },
      { display_name: 'Noah Brown', initials: 'NB', dob: '2011-08-19', risk_level: 'low', medical_conditions: [], allergies: [] },
    ];

    let createdResidents = [...homeResidents];
    if (homeResidents.length < 3 && sarahHome) {
      for (const seed of residentSeeds) {
        const exists = allResidents.some(r => r.display_name === seed.display_name);
        if (!exists) {
          const created = await base44.asServiceRole.entities.Resident.create({
            org_id, home_id: sarahHome.id, key_worker_id: sarah.id,
            display_name: seed.display_name, initials: seed.initials,
            dob: seed.dob, risk_level: seed.risk_level, status: 'active',
            medical_conditions: seed.medical_conditions,
            allergies: seed.allergies,
            placement_type: 'childrens_home', placement_start: '2024-01-01',
          });
          createdResidents.push(created);
          results.residents++;
        }
      }
    }

    // 3. Home checks (using correct check_type: daily/weekly/monthly)
    const existingChecks = await base44.asServiceRole.entities.HomeCheck.filter({ org_id });
    const todayChecks = existingChecks.filter(c => c.check_date === today && sarahHomeIds.includes(c.home_id));

    if (todayChecks.length === 0 && sarahHome) {
      // Daily room check
      await base44.asServiceRole.entities.HomeCheck.create({
        org_id, home_id: sarahHome.id, home_name: sarahHome.name,
        check_date: today, check_type: 'daily',
        checked_by_id: sarah.id, checked_by_name: sarah.full_name,
        items: [
          { id: '1', item_name: 'Room 1 - Noah', status: 'pass', notes: 'Clean and tidy' },
          { id: '2', item_name: 'Room 2 - Ethan', status: 'pass', notes: 'Inhaler present' },
          { id: '3', item_name: 'Room 3 - Liam', status: 'pass', notes: 'All good' },
          { id: '4', item_name: 'Room 4 - Sophie', status: 'pass', notes: 'Clean' },
          { id: '5', item_name: 'Room 5 - Maya', status: 'pass', notes: 'OK' },
          { id: '6', item_name: 'Fire Exit - Main', status: 'pass', notes: 'Clear' },
          { id: '7', item_name: 'Fire Alarm Test', status: 'pass', notes: 'Tested 07:15' },
          { id: '8', item_name: 'Medication Cabinet', status: 'pass', notes: 'Locked and stocked' },
          { id: '9', item_name: 'Medication - Morning Round', status: 'pass', notes: 'Given to 4/4 residents' },
        ],
        overall_result: 'pass', any_fails: false, is_deleted: false,
      });
      results.checks++;
    }

    // 4. Handover notes (correct ShiftHandover schema)
    const existingHandovers = await base44.asServiceRole.entities.ShiftHandover.filter({ org_id });
    const recentHandovers = existingHandovers.filter(h => sarahHomeIds.includes(h.home_id));

    if (recentHandovers.length < 2 && sarahHome) {
      const handoverSeeds = [
        {
          outgoing_staff_name: 'Alex Turner',
          date: today,
          shift: 'morning',
          summary: "Maya had a good evening. Attended cooking group and settled well.",
          additional_notes: 'All residents settled. Meds given.',
          status: 'submitted',
        },
        {
          outgoing_staff_name: 'Alex Turner',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          shift: 'afternoon',
          summary: "Liam feeling anxious re: school project. Encouraged use of coping box.",
          additional_notes: 'Monitor Liam tomorrow.',
          status: 'submitted',
        },
        {
          outgoing_staff_name: 'Sam Clarke',
          date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          shift: 'morning',
          summary: "Ethan used inhaler after PE. No further issues. Appetite good.",
          additional_notes: 'Inhaler logged in med records.',
          status: 'submitted',
        },
      ];

      for (const h of handoverSeeds) {
        const exists = existingHandovers.find(ex => ex.outgoing_staff_name === h.outgoing_staff_name && ex.date === h.date);
        if (!exists) {
          await base44.asServiceRole.entities.ShiftHandover.create({
            org_id, home_id: sarahHome.id, home_name: sarahHome.name,
            outgoing_staff_id: sarah.id, is_deleted: false, ...h,
          });
          results.handovers++;
        }
      }
    }

    // 5. Incidents to review
    const existingIncidents = await base44.asServiceRole.entities.SignificantEvent.filter({ org_id });
    const unreviewed = existingIncidents.filter(i => !i.review_completed && sarahHomeIds.includes(i.home_id));
    if (unreviewed.length === 0 && sarahHome) {
      await base44.asServiceRole.entities.SignificantEvent.create({
        org_id, home_id: sarahHome.id, home_name: sarahHome.name,
        recorded_by_id: sarah.id, recorded_by_name: sarah.full_name,
        event_datetime: new Date(Date.now() - 3600000).toISOString(),
        event_type: 'safeguarding_concern',
        summary: 'Minor altercation between residents resolved — monitoring required.',
        immediate_action_taken: 'Both residents spoken to separately. Calm restored.',
        review_completed: false, is_deleted: false,
      });
      results.incidents++;
    }

    // 6. Training records
    const existingTraining = await base44.asServiceRole.entities.TrainingRecord.filter({ org_id });
    const sarahTraining = existingTraining.filter(t => t.staff_id === sarah.id);
    if (sarahTraining.length < 2) {
      const trainingSeeds = [
        { course_name: 'Safeguarding Level 2', status: 'in_progress', training_status: 'expiring_soon', expiry_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], category: 'Safeguarding', is_mandatory: true },
        { course_name: 'First Aid at Work', status: 'completed', training_status: 'valid', expiry_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0], category: 'First Aid', is_mandatory: true },
        { course_name: 'Moving & Handling', status: 'completed', training_status: 'valid', expiry_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0], category: 'Manual Handling', is_mandatory: true },
      ];
      for (const t of trainingSeeds) {
        if (!sarahTraining.find(ex => ex.course_name === t.course_name)) {
          await base44.asServiceRole.entities.TrainingRecord.create({
            org_id, staff_id: sarah.id, staff_name: sarah.full_name, ...t,
          });
          results.training++;
        }
      }
    }

    // 7. Visit reports (today's tasks)
    const existingReports = await base44.asServiceRole.entities.VisitReport.filter({ org_id });
    const sarahReports = existingReports.filter(r => r.worker_id === sarah.id && r.date === today);
    const freshResidents = await base44.asServiceRole.entities.Resident.filter({ org_id });
    const myResidents = freshResidents.filter(r => sarahHomeIds.includes(r.home_id) && r.status === 'active');

    if (sarahReports.length === 0 && myResidents.length > 0) {
      const taskSeeds = [
        { time_start: '09:30', action_text: 'School Drop-off', status: 'In Progress', priority: 'High', idx: 0 },
        { time_start: '10:00', action_text: 'Room 3 Medication', status: 'Due Soon', priority: 'High', idx: 1 },
        { time_start: '11:00', action_text: 'Inhaler Check', status: 'Pending', priority: 'Medium', idx: 2 },
        { time_start: '12:00', action_text: 'Lunch Support', status: 'Pending', priority: 'Medium', idx: 3 },
        { time_start: '14:00', action_text: '1:1 Check-in', status: 'Pending', priority: 'Low', idx: 4 },
      ];
      for (const task of taskSeeds) {
        const resident = myResidents[task.idx % myResidents.length];
        if (resident) {
          await base44.asServiceRole.entities.VisitReport.create({
            org_id, home_id: sarahHome?.id, worker_id: sarah.id,
            worker_name: sarah.full_name, date: today,
            resident_id: resident.id, resident_name: resident.display_name,
            time_start: task.time_start, action_text: task.action_text,
            status: task.status, priority: task.priority,
          });
          results.visitReports++;
        }
      }
    }

    // 8. Notifications (Notification requires user_id not recipient_id)
    const existingNotifications = await base44.asServiceRole.entities.Notification.filter({ org_id });
    const sarahNotifs = existingNotifications.filter(n => n.recipient_staff_id === sarah.id);
    if (sarahNotifs.length < 2) {
      const notifSeeds = [
        { type: 'general', related_module: 'Team Messages', message: 'New message from Alex', priority: 'normal' },
        { type: 'general', related_module: 'Manager Update', message: 'Staff meeting Friday 09:30', priority: 'high' },
        { type: 'alert', related_module: 'Safeguarding Alert', message: 'Incident #INC-1028 requires review', priority: 'critical' },
      ];
      for (const n of notifSeeds) {
        if (!sarahNotifs.find(ex => ex.related_module === n.related_module)) {
          await base44.asServiceRole.entities.Notification.create({
            org_id,
            user_id: sarah.user_id || sarah.id,
            recipient_staff_id: sarah.id,
            read: false, acknowledged: false,
            ...n,
          });
          results.notifications++;
        }
      }
    }

    return Response.json({ success: true, results, staffId: sarah.id, homeIds: sarahHomeIds });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});