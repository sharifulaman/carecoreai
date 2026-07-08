import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ORG_ID = user.org_id || Deno.env.get('ORG_ID') || 'default-org';

    // Fetch existing data
    const [homes, residents, staff] = await Promise.all([
      base44.entities.Home.filter({ org_id: ORG_ID }),
      base44.entities.Resident.filter({ org_id: ORG_ID }),
      base44.entities.StaffProfile.filter({ org_id: ORG_ID }),
    ]);

    if (!homes.length || !residents.length || !staff.length) {
      return Response.json({ error: 'Missing core data (homes, residents, or staff)' }, { status: 400 });
    }

    const results = {};
    const now = new Date();
    const registrationDate = new Date(now.getFullYear(), now.getMonth() - 6, 1); // 6 months ago

    // ========== 1. STAFF MOVEMENTS ==========
    const movements = staff.slice(0, 3).flatMap((s, i) => [
      {
        org_id: ORG_ID,
        staff_id: s.id,
        staff_name: s.full_name,
        staff_role: s.role,
        movement_type: 'new_starter',
        movement_date: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0],
        is_support_role: s.role === 'support_worker',
        employment_type: s.employment_type || 'permanent',
        new_home_id: homes[i % homes.length].id,
        new_home_name: homes[i % homes.length].name,
        recorded_by_name: 'Admin User',
        reason: 'New hire',
      },
      {
        org_id: ORG_ID,
        staff_id: s.id,
        staff_name: s.full_name,
        staff_role: s.role,
        movement_type: 'role_change',
        movement_date: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString().split('T')[0],
        is_support_role: s.role === 'support_worker',
        previous_role: 'Support Worker',
        new_role: s.role,
        recorded_by_name: 'Team Leader',
        reason: 'Promotion',
      },
    ]);
    results.movements = await base44.entities.StaffMovement.bulkCreate(movements);

    // ========== 2. VACANCIES ==========
    const vacancies = homes.slice(0, 2).map((h, i) => ({
      org_id: ORG_ID,
      vacancy_role: i === 0 ? 'Support Worker' : 'Team Leader',
      is_support_role: i === 0,
      home_id: h.id,
      home_name: h.name,
      service_type: h.type || 'twenty_four_hours',
      accommodation_category: ['self_contained', 'shared_ring_fenced', 'shared_non_ring_fenced'][i % 3],
      number_of_posts: 1,
      employment_type: 'permanent',
      contract_hours: 37.5,
      salary_or_hourly_rate: 28000,
      pay_type: 'salary',
      vacancy_opened_date: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0],
      target_start_date: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0],
      status: i === 0 ? 'open' : 'filled',
      reason_for_vacancy: 'replacement',
      recruiting_manager_id: staff[0].id,
      recruiting_manager_name: staff[0].full_name,
      applications_received: 8,
      interviews_scheduled: 3,
      filled_by_id: i === 0 ? null : staff[1]?.id,
      filled_by_name: i === 0 ? null : staff[1]?.full_name,
      filled_date: i === 0 ? null : new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0],
      notes: `Vacancy for ${h.name}`,
      created_by_id: staff[0].id,
      created_by_name: staff[0].full_name,
    }));
    results.vacancies = await base44.entities.Vacancy.bulkCreate(vacancies);

    // ========== 3. AGENCY & BANK USAGE ==========
    const agencyUsage = homes.flatMap((h, hIdx) =>
      [1, 2].map(dayOffset => ({
        org_id: ORG_ID,
        usage_date: new Date(now.getFullYear(), now.getMonth(), dayOffset * 5).toISOString().split('T')[0],
        worker_name_or_reference: `Agency Worker ${hIdx}-${dayOffset}`,
        agency_bank_type: 'agency',
        agency_organisation_name: dayOffset === 1 ? 'Staff Vantage Ltd' : 'Premier Recruitment',
        shift_home_id: h.id,
        shift_home_name: h.name,
        service_type: h.type || 'twenty_four_hours',
        accommodation_category: ['self_contained', 'shared_ring_fenced'][dayOffset % 2],
        hours_worked: 8,
        shift_start_time: '09:00',
        shift_end_time: '17:00',
        role: 'Support Worker',
        is_support_role: true,
        reason_used: 'staff_absence',
        approved_by_id: staff[0].id,
        approved_by_name: staff[0].full_name,
        cost_per_hour: 18.50,
        notes: `Cover for absent staff`,
      }))
    );
    results.agencyUsage = await base44.entities.AgencyBankStaffUsage.bulkCreate(agencyUsage.slice(0, 8));

    // ========== 4. EXTERNAL SUPPORT SERVICES ==========
    const externalServices = [
      {
        org_id: ORG_ID,
        agency_organisation_name: 'Local CAMHS Service',
        contact_name: 'Dr Sarah Mitchell',
        contact_phone: '020 7123 4567',
        contact_email: 's.mitchell@camhs.local',
        service_type: 'camhs',
        service_description: 'Mental health support and therapeutic intervention',
        hours_per_week_provided: 4,
        number_of_children_receiving_service: 3,
        linked_resident_ids: residents.slice(0, 3).map(r => r.id),
        linked_home_ids: homes.slice(0, 1).map(h => h.id),
        accommodation_categories: ['self_contained', 'shared_ring_fenced'],
        contract_start_date: registrationDate.toISOString().split('T')[0],
        contract_end_date: new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString().split('T')[0],
        status: 'active',
        notes: 'Key provider for trauma-informed therapy',
      },
      {
        org_id: ORG_ID,
        agency_organisation_name: 'City College Education Service',
        contact_name: 'John Reynolds',
        contact_phone: '020 7456 7890',
        service_type: 'education',
        service_description: 'Alternative education provision and GCSE support',
        hours_per_week_provided: 15,
        number_of_children_receiving_service: 5,
        linked_resident_ids: residents.slice(1, 6).map(r => r.id),
        linked_home_ids: homes.slice(0, 2).map(h => h.id),
        contract_start_date: registrationDate.toISOString().split('T')[0],
        status: 'active',
        notes: 'Main education provider for KS4 residents',
      },
    ];
    results.externalServices = await base44.entities.ExternalSupportService.bulkCreate(externalServices);

    // ========== 5. EDUCATION RECORDS ==========
    const educationRecords = residents.slice(0, 5).map((r, i) => ({
      org_id: ORG_ID,
      resident_id: r.id,
      resident_name: r.display_name,
      home_id: r.home_id,
      home_name: homes.find(h => h.id === r.home_id)?.name,
      accommodation_category: r.accommodation_category || 'self_contained',
      education_status: i % 3 === 0 ? 'full_time_education' : i % 3 === 1 ? 'part_time_education' : 'neet',
      education_provider_name: i % 2 === 0 ? 'City College' : 'Alternative Provision Centre',
      course_programme_name: i % 2 === 0 ? 'GCSE Maths & English' : 'Vocational Skills',
      course_level: i % 2 === 0 ? 'gcse' : 'vocational_btec',
      start_date: new Date(now.getFullYear(), now.getMonth() - 8, 1).toISOString().split('T')[0],
      hours_per_week_provided: 25,
      hours_per_week_attended: 22 + Math.random() * 3,
      attendance_period_start: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0],
      attendance_period_end: now.toISOString().split('T')[0],
      attendance_percentage: 85 + Math.random() * 10,
      education_contact_name: 'Ms Jane Smith',
      record_date: now.toISOString().split('T')[0],
      status: 'active',
    }));
    results.educationRecords = await base44.entities.EducationRecord.bulkCreate(educationRecords);

    // ========== 6. HEALTH PROFILES ==========
    const healthProfiles = residents.slice(0, 5).map((r, i) => ({
      org_id: ORG_ID,
      resident_id: r.id,
      resident_name: r.display_name,
      home_id: r.home_id,
      home_name: homes.find(h => h.id === r.home_id)?.name,
      accommodation_category: r.accommodation_category || 'self_contained',
      appropriate_healthcare_access: true,
      gp_registered: true,
      gp_practice_name: 'Local Health Centre',
      gp_registration_date: registrationDate.toISOString().split('T')[0],
      gp_contact: '020 7111 2222',
      dentist_registered: i % 2 === 0,
      dentist_practice_name: i % 2 === 0 ? 'Smile Dental Practice' : null,
      dentist_registration_date: i % 2 === 0 ? registrationDate.toISOString().split('T')[0] : null,
      optician_registered: true,
      optician_practice_name: 'Vision Express',
      last_health_appointment: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().split('T')[0],
      last_dental_appointment: i % 2 === 0 ? new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0] : null,
      last_optician_appointment: new Date(now.getFullYear(), now.getMonth() - 3, 10).toISOString().split('T')[0],
      health_action_plan: 'Regular GP reviews, mental health support, medication management',
      record_date: now.toISOString().split('T')[0],
      status: 'active',
    }));
    results.healthProfiles = await base44.entities.HealthProfile.bulkCreate(healthProfiles);

    // ========== 7. ALLEGATIONS ==========
    const allegations = residents.slice(0, 2).map((r, i) => ({
      org_id: ORG_ID,
      allegation_date: new Date(now.getFullYear(), now.getMonth() - (3 - i), 5).toISOString().split('T')[0],
      allegation_made_by: 'child',
      is_allegation_against_staff: i === 0,
      resident_ids: [r.id],
      resident_names: [r.display_name],
      staff_subject_to_allegation_id: i === 0 ? staff[2]?.id : null,
      staff_subject_to_allegation_name: i === 0 ? staff[2]?.full_name : null,
      home_id: r.home_id,
      home_name: homes.find(h => h.id === r.home_id)?.name,
      accommodation_category: r.accommodation_category || 'self_contained',
      allegation_details: i === 0 ? 'Alleged inappropriate conduct during shift' : 'Concern regarding boundaries with staff member',
      lado_notified: i === 0,
      lado_notified_date: i === 0 ? new Date(now.getFullYear(), now.getMonth() - 3, 6).toISOString().split('T')[0] : null,
      local_authority_notified: true,
      la_notified_date: new Date(now.getFullYear(), now.getMonth() - 3, 5).toISOString().split('T')[0],
      investigation_status: i === 0 ? 'closed' : 'open',
      outcome: i === 0 ? 'unsubstantiated' : 'pending',
      outcome_notes: i === 0 ? 'Investigation found no evidence of misconduct' : null,
      manager_review_status: 'reviewed',
      status: 'closed',
      created_by_id: staff[0].id,
    }));
    results.allegations = await base44.entities.Allegation.bulkCreate(allegations);

    // ========== 8. REFERRALS ==========
    const referrals = residents.slice(0, 3).map((r, i) => ({
      org_id: ORG_ID,
      referral_date: new Date(now.getFullYear(), now.getMonth() - (4 - i), 1).toISOString().split('T')[0],
      resident_ids: [r.id],
      resident_names: [r.display_name],
      referral_type: i === 0 ? 'child_protection' : i === 1 ? 'safeguarding' : 'other',
      local_authority_children_services_referral: i === 0,
      la_reference: i === 0 ? 'LA/2026/00123' : null,
      home_id: r.home_id,
      home_name: homes.find(h => h.id === r.home_id)?.name,
      accommodation_category: r.accommodation_category || 'self_contained',
      referral_details: i === 0 ? 'Concerns about neglect and supervision' : 'Risk assessment and support planning',
      outcome_status: 'supported',
      status: 'closed',
      created_by_id: staff[0].id,
    }));
    results.referrals = await base44.entities.Referral.bulkCreate(referrals);

    // ========== 9. COMPLAINTS ==========
    const complaints = residents.slice(0, 3).map((r, i) => ({
      org_id: ORG_ID,
      resident_id: r.id,
      resident_name: r.display_name,
      home_id: r.home_id,
      home_name: homes.find(h => h.id === r.home_id)?.name,
      accommodation_category: r.accommodation_category || 'self_contained',
      complaint_date: new Date(now.getFullYear(), now.getMonth() - (4 - i), 10).toISOString().split('T')[0],
      received_by_id: staff[0].id,
      received_by_name: staff[0].full_name,
      received_datetime: new Date(now.getFullYear(), now.getMonth() - (4 - i), 10, 10, 0).toISOString(),
      received_method: 'in_person',
      complainant_source: 'child',
      is_child_complainant: true,
      complaint_type: i === 0 ? 'care_quality' : i === 1 ? 'staff_conduct' : 'food',
      complaint_details: ['Poor food quality and limited choice', 'Staff member rude and dismissive', 'Activities not age-appropriate'][i],
      severity: 'moderate',
      acknowledged: true,
      investigated_by_id: staff[0].id,
      investigated_by_name: staff[0].full_name,
      investigation_start_date: new Date(now.getFullYear(), now.getMonth() - (4 - i), 11).toISOString().split('T')[0],
      outcome_category: 'partially_upheld',
      actions_taken: 'Improved meal planning, staff training',
      target_resolution_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      resolution_date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0],
      complainant_informed: true,
      complainant_satisfied: true,
      status: 'resolved',
      annex_a_reportable: true,
      created_by_id: staff[0].id,
    }));
    results.complaints = await base44.entities.Complaint.bulkCreate(complaints);

    // ========== 10. SAFEGUARDING RECORDS ==========
    const safeguardingRecords = residents.slice(0, 2).map((r, i) => ({
      org_id: ORG_ID,
      resident_id: r.id,
      resident_name: r.display_name,
      home_id: r.home_id,
      home_name: homes.find(h => h.id === r.home_id)?.name,
      accommodation_category: r.accommodation_category || 'self_contained',
      concern_type: i === 0 ? 'physical' : 'emotional',
      date_of_concern: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString().split('T')[0],
      date_reported_internally: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString().split('T')[0],
      reported_by_id: staff[0].id,
      reported_by_name: staff[0].full_name,
      description: i === 0 ? 'Unexplained bruising on arms' : 'Withdrawn and anxious behaviour',
      immediate_risk: 'medium',
      immediate_action_taken: i === 0 ? 'Documented with photos, safeguarding referral' : 'Pastoral support increased',
      allegation_against_staff: false,
      manager_informed: true,
      la_safeguarding_referred: true,
      la_reference: `LA/SAF/2026/${1001 + i}`,
      la_referral_date: new Date(now.getFullYear(), now.getMonth() - 2, 16).toISOString().split('T')[0],
      outcome: 'substantiated',
      investigation_status: 'closed',
      status: 'closed',
    }));
    results.safeguardingRecords = await base44.entities.SafeguardingRecord.bulkCreate(safeguardingRecords);

    // ========== 11. MISSING FROM HOME ==========
    const mfhRecords = residents.slice(0, 2).map((r, i) => ({
      org_id: ORG_ID,
      resident_id: r.id,
      resident_name: r.display_name,
      home_id: r.home_id,
      home_name: homes.find(h => h.id === r.home_id)?.name,
      accommodation_category: r.accommodation_category || 'self_contained',
      reported_missing_datetime: new Date(now.getFullYear(), now.getMonth() - 1, 10, 20, 30).toISOString(),
      returned_datetime: i === 0 ? new Date(now.getFullYear(), now.getMonth() - 1, 11, 8, 0).toISOString() : null,
      reported_by_id: staff[0].id,
      reported_by_name: staff[0].full_name,
      risk_assessment: i === 0 ? 'low' : 'high',
      concern_details: i === 0 ? 'Left after argument, returned home safely' : 'Missing 3+ times this month, exploitation concerns',
      police_notified: i === 0,
      police_reference: i === 0 ? 'MPS/2026/654321' : null,
      welfare_check_conducted: i === 0,
      status: i === 0 ? 'returned' : 'active',
      created_by_id: staff[0].id,
    }));
    results.mfhRecords = await base44.entities.MissingFromHome.bulkCreate(mfhRecords);

    // ========== 12. EXPLOITATION RISK ==========
    const exploitationRecords = residents.slice(1, 4).map((r, i) => ({
      org_id: ORG_ID,
      resident_id: r.id,
      resident_name: r.display_name,
      home_id: r.home_id,
      home_name: homes.find(h => h.id === r.home_id)?.name,
      accommodation_category: r.accommodation_category || 'self_contained',
      risk_type: ['sexual_exploitation', 'criminal_exploitation', 'labour_exploitation'][i],
      concern_description: ['Evidence of grooming by older males', 'Gang involvement and knife crime', 'Suspected illicit working'][i],
      identified_date: new Date(now.getFullYear(), now.getMonth() - (3 - i), 1).toISOString().split('T')[0],
      overall_risk_level: ['high', 'critical', 'medium'][i],
      risk_factors: ['Missing from home', 'Peer relationships with gang members', 'Financial hardship'][i],
      protective_measures: ['Increased supervision', 'Specialist youth worker', 'School engagement'][i],
      key_person_id: staff[0].id,
      key_person_name: staff[0].full_name,
      last_assessment_date: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().split('T')[0],
      status: 'active',
      created_by_id: staff[0].id,
    }));
    results.exploitationRecords = await base44.entities.ExploitationRisk.bulkCreate(exploitationRecords);

    // ========== 13. STAFF SERVICE ASSIGNMENTS ==========
    const assignments = staff.slice(0, 4).flatMap((s, sIdx) =>
      homes.slice(0, 2).map((h, hIdx) => ({
        org_id: ORG_ID,
        staff_id: s.id,
        staff_name: s.full_name,
        home_id: h.id,
        home_name: h.name,
        service_type: h.type || 'twenty_four_hours',
        accommodation_category: ['self_contained', 'shared_ring_fenced'][hIdx % 2],
        assignment_start_date: registrationDate.toISOString().split('T')[0],
        primary_assignment: sIdx === 0 && hIdx === 0,
        allocation_percentage: sIdx === 0 && hIdx === 0 ? 100 : 50 + Math.random() * 40,
        active: true,
      }))
    );
    results.assignments = await base44.entities.StaffServiceAssignment.bulkCreate(assignments.slice(0, 6));

    return Response.json({
      success: true,
      summary: {
        staffMovements: results.movements?.length || 0,
        vacancies: results.vacancies?.length || 0,
        agencyUsage: results.agencyUsage?.length || 0,
        externalServices: results.externalServices?.length || 0,
        educationRecords: results.educationRecords?.length || 0,
        healthProfiles: results.healthProfiles?.length || 0,
        allegations: results.allegations?.length || 0,
        referrals: results.referrals?.length || 0,
        complaints: results.complaints?.length || 0,
        safeguardingRecords: results.safeguardingRecords?.length || 0,
        mfhRecords: results.mfhRecords?.length || 0,
        exploitationRecords: results.exploitationRecords?.length || 0,
        assignments: results.assignments?.length || 0,
      },
      message: 'All Annex A data capture seeding completed successfully. Ready for Annex A report builder.',
    }, { status: 200 });
  } catch (error) {
    console.error('Seeding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});