import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const orgId = user.org_id;
    const results = {
      timestamp: new Date().toISOString(),
      org_id: orgId,
      tests: {},
      summary: {},
      errors: [],
    };

    // Test 1: OrganisationProfile — URN and registration details
    try {
      const orgProfiles = await base44.asServiceRole.entities.OrganisationProfile.filter(
        { org_id: orgId },
        '',
        1
      );

      const orgProfile = orgProfiles?.[0];
      results.tests.organisationProfile = {
        status: orgProfile ? 'PASS' : 'FAIL',
        details: {
          has_urn: !!orgProfile?.ofsted_urn,
          has_legal_name: !!orgProfile?.provider_legal_name,
          has_registration_date: !!orgProfile?.registration_date,
          has_registered_manager: !!orgProfile?.registered_service_manager_id,
          has_nominated_individual: !!orgProfile?.nominated_individual_id,
          record: orgProfile ? 'Found' : 'Not found',
        },
      };
    } catch (e) {
      results.tests.organisationProfile = { status: 'ERROR', error: e.message };
      results.errors.push('OrganisationProfile: ' + e.message);
    }

    // Test 2: OrganisationOfficer table works
    try {
      const officers = await base44.asServiceRole.entities.OrganisationOfficer.filter(
        { org_id: orgId }
      );

      results.tests.organisationOfficers = {
        status: officers?.length > 0 ? 'PASS' : 'WARNING',
        details: {
          officer_count: officers?.length || 0,
          has_directors: officers?.some((o) => o.role === 'director'),
          has_trustees: officers?.some((o) => o.role === 'trustee'),
          has_nominated_individual: officers?.some((o) => o.is_nominated_individual),
        },
      };
    } catch (e) {
      results.tests.organisationOfficers = { status: 'ERROR', error: e.message };
      results.errors.push('OrganisationOfficer: ' + e.message);
    }

    // Test 3: Registered manager qualification
    try {
      const orgProfiles = await base44.asServiceRole.entities.OrganisationProfile.filter(
        { org_id: orgId },
        '',
        1
      );

      const orgProfile = orgProfiles?.[0];
      results.tests.registeredManagerQualification = {
        status: orgProfile?.registered_manager_qualification_held ? 'PASS' : 'WARNING',
        details: {
          has_qualification: !!orgProfile?.registered_manager_qualification_held,
          qualification_name: orgProfile?.qualification_name || 'Not recorded',
          qualification_issue_date: orgProfile?.qualification_issued_date || 'Not recorded',
          has_evidence: !!orgProfile?.qualification_evidence_url,
        },
      };
    } catch (e) {
      results.tests.registeredManagerQualification = { status: 'ERROR', error: e.message };
      results.errors.push('Registered Manager Qualification: ' + e.message);
    }

    // Test 4: Premises category recorded (Home.type, Home.care_model)
    try {
      const homes = await base44.asServiceRole.entities.Home.filter({ org_id: orgId });

      results.tests.premisesCategory = {
        status: homes?.length > 0 ? 'PASS' : 'WARNING',
        details: {
          home_count: homes?.length || 0,
          all_have_type: homes?.every((h) => h.type) || false,
          all_have_care_model: homes?.every((h) => h.care_model) || false,
          type_distribution: {
            outreach: homes?.filter((h) => h.type === 'outreach').length || 0,
            '24_hours': homes?.filter((h) => h.type === '24_hours').length || 0,
            care: homes?.filter((h) => h.type === 'care').length || 0,
            '18_plus': homes?.filter((h) => h.type === '18_plus').length || 0,
          },
        },
      };
    } catch (e) {
      results.tests.premisesCategory = { status: 'ERROR', error: e.message };
      results.errors.push('Premises Category: ' + e.message);
    }

    // Test 5: Premises in use/not in use/added/altered status
    try {
      const homes = await base44.asServiceRole.entities.Home.filter({ org_id: orgId });

      results.tests.premisesStatus = {
        status: homes?.length > 0 ? 'PASS' : 'WARNING',
        details: {
          homes_checked: homes?.length || 0,
          have_premises_in_use_flag: homes?.filter((h) => h.premises_currently_in_use !== undefined).length || 0,
          have_alteration_flag: homes?.filter((h) => h.substantial_alteration_since_registration !== undefined).length || 0,
          have_added_date: homes?.filter((h) => h.date_added_to_registration).length || 0,
          in_use_count: homes?.filter((h) => h.premises_currently_in_use).length || 0,
          not_in_use_count: homes?.filter((h) => h.premises_not_in_use).length || 0,
          altered_count: homes?.filter((h) => h.substantial_alteration_since_registration).length || 0,
        },
      };
    } catch (e) {
      results.tests.premisesStatus = { status: 'ERROR', error: e.message };
      results.errors.push('Premises Status: ' + e.message);
    }

    // Test 6: Property compliance documents capture dates and evidence
    try {
      const homes = await base44.asServiceRole.entities.Home.filter({ org_id: orgId });

      const complianceStats = {
        gas_safety_recorded: 0,
        electrical_cert_recorded: 0,
        fire_risk_recorded: 0,
        with_expiry_dates: 0,
        with_evidence_urls: 0,
      };

      homes?.forEach((home) => {
        if (home.gas_safety_expiry) complianceStats.gas_safety_recorded++;
        if (home.electrical_cert_expiry) complianceStats.electrical_cert_recorded++;
        if (home.fire_risk_assessment_expiry) complianceStats.fire_risk_recorded++;
        if (
          home.gas_safety_expiry &&
          home.electrical_cert_expiry &&
          home.fire_risk_assessment_expiry
        ) {
          complianceStats.with_expiry_dates++;
        }
        if (home.gas_safety_evidence_url && home.electrical_pat_evidence_url && home.fire_risk_assessment_evidence_url) {
          complianceStats.with_evidence_urls++;
        }
      });

      results.tests.propertyCompliance = {
        status: complianceStats.with_expiry_dates > 0 ? 'PASS' : 'WARNING',
        details: {
          homes_checked: homes?.length || 0,
          ...complianceStats,
        },
      };
    } catch (e) {
      results.tests.propertyCompliance = { status: 'ERROR', error: e.message };
      results.errors.push('Property Compliance: ' + e.message);
    }

    // Test 7: Staff profiles capture support role and employment type
    try {
      const staff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id: orgId });

      results.tests.staffProfileEnhancements = {
        status: staff?.length > 0 ? 'PASS' : 'WARNING',
        details: {
          staff_count: staff?.length || 0,
          with_is_support_role: staff?.filter((s) => s.is_support_role !== undefined).length || 0,
          with_employment_type: staff?.filter((s) => s.employment_type).length || 0,
          support_workers: staff?.filter((s) => s.is_support_role === true).length || 0,
          permanent_count: staff?.filter((s) => s.employment_type === 'permanent').length || 0,
          agency_count: staff?.filter((s) => s.employment_type === 'agency').length || 0,
          bank_count: staff?.filter((s) => s.employment_type === 'bank').length || 0,
        },
      };
    } catch (e) {
      results.tests.staffProfileEnhancements = { status: 'ERROR', error: e.message };
      results.errors.push('Staff Profile Enhancements: ' + e.message);
    }

    // Test 8: Staff assignments link to accommodation category
    try {
      const assignments = await base44.asServiceRole.entities.StaffServiceAssignment.filter({
        org_id: orgId,
      });

      results.tests.staffServiceAssignments = {
        status: assignments?.length > 0 ? 'PASS' : 'WARNING',
        details: {
          assignment_count: assignments?.length || 0,
          with_accommodation_category: assignments?.filter((a) => a.accommodation_category).length || 0,
          self_contained_count: assignments?.filter((a) => a.accommodation_category === 'self_contained').length || 0,
          shared_ring_fenced_count: assignments?.filter((a) => a.accommodation_category === 'shared_ring_fenced').length || 0,
          shared_non_ring_fenced_count: assignments?.filter((a) => a.accommodation_category === 'shared_non_ring_fenced').length || 0,
        },
      };
    } catch (e) {
      results.tests.staffServiceAssignments = { status: 'ERROR', error: e.message };
      results.errors.push('Staff Service Assignments: ' + e.message);
    }

    // Test 9: New starters and leavers can be counted
    try {
      const movements = await base44.asServiceRole.entities.StaffMovement.filter({
        org_id: orgId,
      });

      const starters = movements?.filter((m) => m.movement_type === 'new_starter') || [];
      const leavers = movements?.filter((m) => m.movement_type === 'leaver') || [];

      results.tests.staffMovement = {
        status: movements?.length > 0 ? 'PASS' : 'WARNING',
        details: {
          total_movements: movements?.length || 0,
          new_starters: starters.length,
          leavers: leavers.length,
          role_changes: movements?.filter((m) => m.movement_type === 'role_change').length || 0,
          service_reassignments: movements?.filter((m) => m.movement_type === 'service_reassignment').length || 0,
          support_workers_moved: movements?.filter((m) => m.is_support_role).length || 0,
        },
      };
    } catch (e) {
      results.tests.staffMovement = { status: 'ERROR', error: e.message };
      results.errors.push('Staff Movement: ' + e.message);
    }

    // Test 10: Agency/bank usage can be counted
    try {
      const agencyUsage = await base44.asServiceRole.entities.AgencyBankStaffUsage.filter({
        org_id: orgId,
      });

      results.tests.agencyBankUsage = {
        status: agencyUsage?.length > 0 ? 'PASS' : 'WARNING',
        details: {
          total_usage_records: agencyUsage?.length || 0,
          agency_usage: agencyUsage?.filter((a) => a.agency_bank_type === 'agency').length || 0,
          bank_usage: agencyUsage?.filter((a) => a.agency_bank_type === 'bank').length || 0,
          temporary_usage: agencyUsage?.filter((a) => a.agency_bank_type === 'temporary').length || 0,
          support_roles: agencyUsage?.filter((a) => a.is_support_role).length || 0,
          total_hours_worked: agencyUsage?.reduce((sum, a) => sum + (a.hours_worked || 0), 0) || 0,
        },
      };
    } catch (e) {
      results.tests.agencyBankUsage = { status: 'ERROR', error: e.message };
      results.errors.push('Agency/Bank Usage: ' + e.message);
    }

    // Test 11: Vacancies can be counted
    try {
      const vacancies = await base44.asServiceRole.entities.Vacancy.filter({
        org_id: orgId,
      });

      const supportRoleVacancies = vacancies?.filter((v) => v.is_support_role) || [];

      results.tests.vacancies = {
        status: vacancies?.length > 0 ? 'PASS' : 'WARNING',
        details: {
          total_vacancies: vacancies?.length || 0,
          open_vacancies: vacancies?.filter((v) => v.status === 'open').length || 0,
          filled_vacancies: vacancies?.filter((v) => v.status === 'filled').length || 0,
          cancelled_vacancies: vacancies?.filter((v) => v.status === 'cancelled').length || 0,
          support_role_open: supportRoleVacancies.filter((v) => v.status === 'open').length,
          support_role_total_posts: supportRoleVacancies.reduce((sum, v) => sum + (v.number_of_posts || 0), 0),
          by_accommodation_category: {
            self_contained: vacancies?.filter((v) => v.accommodation_category === 'self_contained').length || 0,
            shared_ring_fenced: vacancies?.filter((v) => v.accommodation_category === 'shared_ring_fenced').length || 0,
            shared_non_ring_fenced: vacancies?.filter((v) => v.accommodation_category === 'shared_non_ring_fenced').length || 0,
          },
        },
      };
    } catch (e) {
      results.tests.vacancies = { status: 'ERROR', error: e.message };
      results.errors.push('Vacancies: ' + e.message);
    }

    // Test 12: Verify no existing functionality breaks (sample checks)
    try {
      const residents = await base44.asServiceRole.entities.Resident.filter({ org_id: orgId }, '', 5);
      const incidents = await base44.asServiceRole.entities.Incident.filter({ org_id: orgId }, '', 5);
      const healthProfiles = await base44.asServiceRole.entities.HealthProfile.filter({ org_id: orgId }, '', 5);

      results.tests.existingFunctionality = {
        status: residents && incidents && healthProfiles ? 'PASS' : 'WARNING',
        details: {
          residents_accessible: !!residents,
          incidents_accessible: !!incidents,
          health_profiles_accessible: !!healthProfiles,
          sample_residents_count: residents?.length || 0,
          sample_incidents_count: incidents?.length || 0,
          sample_health_profiles_count: healthProfiles?.length || 0,
        },
      };
    } catch (e) {
      results.tests.existingFunctionality = { status: 'ERROR', error: e.message };
      results.errors.push('Existing Functionality: ' + e.message);
    }

    // Calculate summary
    const testKeys = Object.keys(results.tests);
    const passCount = testKeys.filter((k) => results.tests[k].status === 'PASS').length;
    const failCount = testKeys.filter((k) => results.tests[k].status === 'FAIL').length;
    const errorCount = testKeys.filter((k) => results.tests[k].status === 'ERROR').length;
    const warningCount = testKeys.filter((k) => results.tests[k].status === 'WARNING').length;

    results.summary = {
      total_tests: testKeys.length,
      passed: passCount,
      failed: failCount,
      errors: errorCount,
      warnings: warningCount,
      overall_status:
        failCount > 0 || errorCount > 0
          ? 'FAILED'
          : passCount === testKeys.length
            ? 'PASSED'
            : 'PASSED_WITH_WARNINGS',
    };

    return Response.json(results);
  } catch (error) {
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
});