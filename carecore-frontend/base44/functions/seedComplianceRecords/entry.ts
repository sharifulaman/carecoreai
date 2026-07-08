import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch existing data
    const [homes, residents, staff] = await Promise.all([
      base44.entities.Home.list(),
      base44.entities.Resident.list(),
      base44.entities.StaffProfile.list(),
    ]);

    if (!homes.length || !residents.length || !staff.length) {
      return Response.json({ error: 'Need homes, residents, and staff first' }, { status: 400 });
    }

    const results = [];

    // ========== MISSING FROM HOME ==========
    const mfhRecords = [];
    for (let i = 0; i < 8; i++) {
      const resident = residents[Math.floor(Math.random() * residents.length)];
      const home = homes.find(h => h.id === resident.home_id);
      const reporter = staff[Math.floor(Math.random() * staff.length)];
      const daysAgo = Math.floor(Math.random() * 60);
      const lastSeen = new Date();
      lastSeen.setDate(lastSeen.getDate() - daysAgo);
      const reported = new Date(lastSeen);
      reported.setHours(reported.getHours() + Math.floor(Math.random() * 4));

      mfhRecords.push({
        org_id: home?.org_id || 'org_1',
        resident_id: resident.id,
        resident_name: resident.display_name,
        home_id: home?.id,
        home_name: home?.name,
        reported_by_id: reporter.id,
        reported_by_name: reporter.full_name,
        last_seen_datetime: lastSeen.toISOString(),
        last_seen_location: ['Town centre', 'Friend\'s house', 'Park', 'Shopping centre', 'Local pub'][Math.floor(Math.random() * 5)],
        last_seen_by: reporter.full_name,
        reported_missing_datetime: reported.toISOString(),
        reported_to_police: Math.random() > 0.3,
        police_reference_number: Math.random() > 0.5 ? `POL-${Math.floor(Math.random() * 999999)}` : null,
        areas_searched: ['Local parks', 'Railway station', 'Friends addresses', 'Town centre'],
        people_contacted: ['Parents', 'Social worker', 'Friends', 'School'],
        risk_level_at_time: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        cse_risk_considered: Math.random() > 0.6,
        returned_datetime: Math.random() > 0.4 ? new Date(reported.getTime() + Math.random() * 36000000).toISOString() : null,
        return_interview_completed: Math.random() > 0.5,
        status: Math.random() > 0.4 ? 'returned' : 'active',
      });
    }
    if (mfhRecords.length) {
      await base44.entities.MissingFromHome.bulkCreate(mfhRecords);
      results.push({ entity: 'MissingFromHome', count: mfhRecords.length });
    }

    // ========== BODY MAPS ==========
    const bodyMaps = [];
    for (let i = 0; i < 6; i++) {
      const resident = residents[Math.floor(Math.random() * residents.length)];
      const home = homes.find(h => h.id === resident.home_id);
      const recorder = staff[Math.floor(Math.random() * staff.length)];
      const daysAgo = Math.floor(Math.random() * 90);
      const recorded = new Date();
      recorded.setDate(recorded.getDate() - daysAgo);

      bodyMaps.push({
        org_id: home?.org_id || 'org_1',
        resident_id: resident.id,
        resident_name: resident.display_name,
        home_id: home?.id,
        home_name: home?.name,
        recorded_by_id: recorder.id,
        recorded_by_name: recorder.full_name,
        recorded_datetime: recorded.toISOString(),
        discovery_circumstance: ['During routine care', 'Reported by resident', 'During medical appointment', 'Noticed during bath time'][Math.floor(Math.random() * 4)],
        marks: [
          {
            id: `mark_${Math.random()}`,
            body_location: 'left forearm',
            body_side: 'front',
            x_position: 25,
            y_position: 40,
            mark_type: ['bruise', 'cut', 'scratch'][Math.floor(Math.random() * 3)],
            colour: ['purple', 'red', 'brown'][Math.floor(Math.random() * 3)],
            size_cm: '3x2',
            description: 'Mark consistent with accidental injury',
            child_explanation: 'Fell during sports',
          },
        ],
        consistent_with_explanation: Math.random() > 0.3,
        safeguarding_concern: Math.random() > 0.7,
        safeguarding_referral_made: Math.random() > 0.8,
        manager_notified: true,
        status: ['open', 'reviewed', 'closed'][Math.floor(Math.random() * 3)],
      });
    }
    if (bodyMaps.length) {
      await base44.entities.BodyMap.bulkCreate(bodyMaps);
      results.push({ entity: 'BodyMap', count: bodyMaps.length });
    }

    // ========== SHIFT HANDOVERS ==========
    const handovers = [];
    for (let i = 0; i < 10; i++) {
      const home = homes[Math.floor(Math.random() * homes.length)];
      const outgoing = staff[Math.floor(Math.random() * staff.length)];
      const incoming = staff[Math.floor(Math.random() * staff.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const handoverDate = new Date();
      handoverDate.setDate(handoverDate.getDate() - daysAgo);
      const dateStr = handoverDate.toISOString().split('T')[0];

      handovers.push({
        org_id: home.org_id || 'org_1',
        home_id: home.id,
        home_name: home.name,
        date: dateStr,
        shift: ['morning', 'afternoon', 'night'][Math.floor(Math.random() * 3)],
        outgoing_staff_id: outgoing.id,
        outgoing_staff_name: outgoing.full_name,
        incoming_staff_id: incoming.id,
        incoming_staff_name: incoming.full_name,
        resident_statuses: residents
          .filter(r => r.home_id === home.id)
          .slice(0, 3)
          .map(r => ({
            resident_id: r.id,
            resident_name: r.display_name,
            location: ['in_home', 'out', 'overnight_stay'][Math.floor(Math.random() * 3)],
            mood: ['settled', 'anxious', 'happy'][Math.floor(Math.random() * 3)],
            any_concerns: Math.random() > 0.7,
            medication_given_this_shift: Math.random() > 0.5,
          })),
        incidents: [],
        controlled_drug_balance_checked: true,
        medication_storage_secure: true,
        property_secure: true,
        cleaning_completed: Math.random() > 0.2,
        summary: 'All residents accounted for, calm evening.',
        status: ['draft', 'submitted', 'acknowledged'][Math.floor(Math.random() * 3)],
      });
    }
    if (handovers.length) {
      await base44.entities.ShiftHandover.bulkCreate(handovers);
      results.push({ entity: 'ShiftHandover', count: handovers.length });
    }

    // ========== REGULATION 44 REPORTS ==========
    const reg44Reports = [];
    for (let i = 0; i < 5; i++) {
      const home = homes[Math.floor(Math.random() * homes.length)];
      const inspector = staff[Math.floor(Math.random() * staff.length)];
      const manager = staff[Math.floor(Math.random() * staff.length)];
      const daysAgo = Math.floor(Math.random() * 180);
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - daysAgo);
      const visitDateStr = visitDate.toISOString().split('T')[0];
      const monthYear = visitDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

      reg44Reports.push({
        org_id: home.org_id || 'org_1',
        home_id: home.id,
        home_name: home.name,
        visit_date: visitDateStr,
        visit_month: monthYear,
        inspector_name: inspector.full_name,
        inspector_organisation: 'Ofsted',
        residents_spoken_to: Math.floor(Math.random() * residents.filter(r => r.home_id === home.id).length) + 1,
        staff_spoken_to: Math.floor(Math.random() * 5) + 2,
        quality_standards: [
          {
            standard_number: 1,
            standard_name: 'View of children',
            rating: ['outstanding', 'good', 'requires_improvement'][Math.floor(Math.random() * 3)],
            evidence: 'Residents speak positively about their experience.',
          },
          {
            standard_number: 2,
            standard_name: 'Personal development and welfare',
            rating: ['outstanding', 'good', 'requires_improvement'][Math.floor(Math.random() * 3)],
            evidence: 'Staff demonstrate knowledge of safeguarding.',
          },
        ],
        overall_rating: ['outstanding', 'good', 'requires_improvement'][Math.floor(Math.random() * 3)],
        strengths: 'Strong staffing, good relationship with residents, effective safeguarding practices.',
        areas_for_improvement: 'Documentation could be more thorough. Consider additional training.',
        status: ['draft', 'submitted'][Math.floor(Math.random() * 2)],
        manager_id: manager.id,
        manager_name: manager.full_name,
      });
    }
    if (reg44Reports.length) {
      await base44.entities.Reg44Report.bulkCreate(reg44Reports);
      results.push({ entity: 'Reg44Report', count: reg44Reports.length });
    }

    // ========== COMPLAINTS ==========
    const complaintRecords = [];
    for (let i = 0; i < 7; i++) {
      const resident = residents[Math.floor(Math.random() * residents.length)];
      const home = homes.find(h => h.id === resident.home_id);
      const receiver = staff[Math.floor(Math.random() * staff.length)];
      const daysAgo = Math.floor(Math.random() * 120);
      const received = new Date();
      received.setDate(received.getDate() - daysAgo);

      complaintRecords.push({
        org_id: home?.org_id || 'org_1',
        resident_id: resident.id,
        resident_name: resident.display_name,
        home_id: home?.id,
        home_name: home?.name,
        received_by_id: receiver.id,
        received_by_name: receiver.full_name,
        received_datetime: received.toISOString(),
        received_method: ['in_person', 'phone', 'letter'][Math.floor(Math.random() * 3)],
        complainant_type: ['resident', 'parent', 'family_member'][Math.floor(Math.random() * 3)],
        complaint_type: ['care_quality', 'staff_conduct', 'accommodation', 'food'][Math.floor(Math.random() * 4)],
        summary: 'Resident unhappy with meal options. Wants more choice.',
        full_detail: 'Resident has complained that meal choices are limited and not tailored to preferences.',
        severity: ['minor', 'moderate'][Math.floor(Math.random() * 2)],
        acknowledged: Math.random() > 0.3,
        status: ['received', 'investigating', 'resolved'][Math.floor(Math.random() * 3)],
      });
    }
    if (complaintRecords.length) {
      await base44.entities.Complaint.bulkCreate(complaintRecords);
      results.push({ entity: 'Complaint', count: complaintRecords.length });
    }

    // ========== SIGNIFICANT EVENTS ==========
    const significantEvents = [];
    for (let i = 0; i < 6; i++) {
      const home = homes[Math.floor(Math.random() * homes.length)];
      const resident = residents.filter(r => r.home_id === home.id)[0];
      const recorder = staff[Math.floor(Math.random() * staff.length)];
      const daysAgo = Math.floor(Math.random() * 60);
      const eventTime = new Date();
      eventTime.setDate(eventTime.getDate() - daysAgo);

      significantEvents.push({
        org_id: home.org_id || 'org_1',
        home_id: home.id,
        home_name: home.name,
        recorded_by_id: recorder.id,
        recorded_by_name: recorder.full_name,
        event_datetime: eventTime.toISOString(),
        event_type: ['safeguarding_concern', 'missing_from_home', 'police_attendance', 'serious_injury'][Math.floor(Math.random() * 4)],
        resident_id: resident?.id,
        resident_name: resident?.display_name,
        summary: 'Resident displayed concerning behaviour. De-escalation techniques used.',
        full_detail: 'Resident became agitated during afternoon activity. Staff responded calmly with established strategies.',
        immediate_action_taken: 'Resident moved to quiet space. Offered preferred activity to calm.',
        manager_notified: Math.random() > 0.2,
        ofsted_notification_required: Math.random() > 0.8,
        status: 'open',
      });
    }
    if (significantEvents.length) {
      await base44.entities.SignificantEvent.bulkCreate(significantEvents);
      results.push({ entity: 'SignificantEvent', count: significantEvents.length });
    }

    return Response.json({
      success: true,
      message: 'Seeded compliance records',
      results,
      total: mfhRecords.length + bodyMaps.length + handovers.length + reg44Reports.length + complaintRecords.length + significantEvents.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});