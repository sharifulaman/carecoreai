import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const orgId = user.org_id;

    // Fetch all residents
    const residents = await base44.entities.Resident.filter({ org_id: orgId });

    // Fetch homes for accommodation category lookups
    const homes = await base44.entities.Home.list();
    const homeMap = new Map(homes.map(h => [h.id, h]));

    // Fetch education, employment, neet, and health records
    const educationRecords = await base44.entities.EducationRecord.filter({
      org_id: orgId
    });
    const employmentRecords = await base44.entities.EmploymentRecord.filter({
      org_id: orgId
    });
    const neetRecords = await base44.entities.NEETRecord.filter({
      org_id: orgId
    });
    const healthProfiles = await base44.entities.HealthProfile.filter({
      org_id: orgId
    });

    // Clear existing alerts for Phase 3 data
    const existingAlerts = await base44.entities.DataQualityAlert.filter({
      org_id: orgId,
      is_annex_a_reportable: true
    });

    for (const alert of existingAlerts) {
      if (alert.resolved === false) {
        await base44.entities.DataQualityAlert.delete(alert.id);
      }
    }

    const alertsToCreate = [];

    // Check each resident for Phase 3 data quality issues
    for (const resident of residents) {
      const homeId = resident.home_id;
      const homeName = homeMap.get(homeId)?.name || 'Unknown';

      // Check education status
      const educationRecord = educationRecords.find(
        e => e.resident_id === resident.id
      );
      if (!educationRecord || !educationRecord.education_status) {
        alertsToCreate.push({
          org_id: orgId,
          resident_id: resident.id,
          home_id: homeId,
          alert_type: 'no_education_status',
          severity: 'warning',
          description: `Education status not recorded for ${resident.display_name}`,
          data_source: 'EducationRecord',
          missing_field: 'education_status',
          is_annex_a_reportable: true,
          created_date: new Date().toISOString()
        });
      }

      // Check education hours if education is recorded
      if (
        educationRecord &&
        educationRecord.education_status !== 'not_in_education' &&
        !educationRecord.hours_per_week_provided
      ) {
        alertsToCreate.push({
          org_id: orgId,
          resident_id: resident.id,
          home_id: homeId,
          alert_type: 'education_hours_missing',
          severity: 'warning',
          description: `Education hours per week missing for ${resident.display_name}`,
          data_source: 'EducationRecord',
          missing_field: 'hours_per_week_provided',
          is_annex_a_reportable: true,
          created_date: new Date().toISOString()
        });
      }

      // Check education attendance hours
      if (
        educationRecord &&
        educationRecord.education_status !== 'not_in_education' &&
        educationRecord.hours_per_week_provided &&
        !educationRecord.hours_per_week_attended
      ) {
        alertsToCreate.push({
          org_id: orgId,
          resident_id: resident.id,
          home_id: homeId,
          alert_type: 'education_attendance_missing',
          severity: 'warning',
          description: `Education attendance hours missing for ${resident.display_name}`,
          data_source: 'EducationRecord',
          missing_field: 'hours_per_week_attended',
          is_annex_a_reportable: true,
          created_date: new Date().toISOString()
        });
      }

      // Check employment status
      const employmentRecord = employmentRecords.find(
        e => e.resident_id === resident.id && e.employment_status === 'active'
      );
      if (!employmentRecord && !educationRecord) {
        // If no active employment and no education, might be NEET
        const neetRecord = neetRecords.find(r => r.resident_id === resident.id);
        if (!neetRecord || !neetRecord.neet_start_date) {
          alertsToCreate.push({
            org_id: orgId,
            resident_id: resident.id,
            home_id: homeId,
            alert_type: 'neet_date_missing',
            severity: 'critical',
            description: `NEET record missing or incomplete for ${resident.display_name}`,
            data_source: 'NEETRecord',
            missing_field: 'neet_start_date',
            is_annex_a_reportable: true,
            created_date: new Date().toISOString()
          });
        }
      }

      // Check health profile
      const healthProfile = healthProfiles.find(h => h.resident_id === resident.id);
      if (!healthProfile) {
        alertsToCreate.push({
          org_id: orgId,
          resident_id: resident.id,
          home_id: homeId,
          alert_type: 'healthcare_access_unknown',
          severity: 'warning',
          description: `Health profile not recorded for ${resident.display_name}`,
          data_source: 'HealthProfile',
          missing_field: 'health_profile',
          is_annex_a_reportable: true,
          created_date: new Date().toISOString()
        });
      } else {
        // Check specific health fields
        if (healthProfile.appropriate_healthcare_access === null) {
          alertsToCreate.push({
            org_id: orgId,
            resident_id: resident.id,
            home_id: homeId,
            alert_type: 'healthcare_access_unknown',
            severity: 'warning',
            description: `Healthcare access not recorded for ${resident.display_name}`,
            data_source: 'HealthProfile',
            missing_field: 'appropriate_healthcare_access',
            is_annex_a_reportable: true,
            created_date: new Date().toISOString()
          });
        }

        // Check dentist
        if (healthProfile.dentist_registered === null) {
          alertsToCreate.push({
            org_id: orgId,
            resident_id: resident.id,
            home_id: homeId,
            alert_type: 'dentist_unknown',
            severity: 'warning',
            description: `Dentist registration status unknown for ${resident.display_name}`,
            data_source: 'HealthProfile',
            missing_field: 'dentist_registered',
            is_annex_a_reportable: true,
            created_date: new Date().toISOString()
          });
        }

        // Check GP
        if (healthProfile.gp_registered === null) {
          alertsToCreate.push({
            org_id: orgId,
            resident_id: resident.id,
            home_id: homeId,
            alert_type: 'gp_registration_missing',
            severity: 'warning',
            description: `GP registration status unknown for ${resident.display_name}`,
            data_source: 'HealthProfile',
            missing_field: 'gp_registered',
            is_annex_a_reportable: true,
            created_date: new Date().toISOString()
          });
        }
      }

      // Check accommodation category
      if (!resident.accommodation_category) {
        alertsToCreate.push({
          org_id: orgId,
          resident_id: resident.id,
          home_id: homeId,
          alert_type: 'accommodation_category_missing',
          severity: 'critical',
          description: `Accommodation category not set for ${resident.display_name}`,
          data_source: 'Resident',
          missing_field: 'accommodation_category',
          is_annex_a_reportable: true,
          created_date: new Date().toISOString()
        });
      }

      // Check placement start date
      if (!resident.placement_start) {
        alertsToCreate.push({
          org_id: orgId,
          resident_id: resident.id,
          home_id: homeId,
          alert_type: 'placement_start_missing',
          severity: 'critical',
          description: `Placement start date not recorded for ${resident.display_name}`,
          data_source: 'Resident',
          missing_field: 'placement_start',
          is_annex_a_reportable: true,
          created_date: new Date().toISOString()
        });
      }
    }

    // Bulk create alerts
    if (alertsToCreate.length > 0) {
      await base44.entities.DataQualityAlert.bulkCreate(alertsToCreate);
    }

    return Response.json({
      success: true,
      alertsGenerated: alertsToCreate.length,
      totalResidents: residents.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});