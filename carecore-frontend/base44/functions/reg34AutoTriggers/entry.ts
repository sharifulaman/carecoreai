import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { triggerType, payload } = await req.json();

    if (triggerType === 'resident_created') {
      // Trigger 1: New resident placed at home → check for first use (Reg 34(4))
      const resident = payload.data;
      const homeId = resident.home_id;

      if (!homeId) return Response.json({ success: true });

      const home = await base44.asServiceRole.entities.Home.read(homeId);
      
      // Check if this is the first child at this premises
      const existingResidents = await base44.asServiceRole.entities.Resident.filter({
        home_id: homeId,
        status: 'active'
      }, null, 1);

      if (existingResidents.length === 1) {
        // First resident at this home
        const now = new Date();
        const deadline = new Date(now);
        deadline.setDate(deadline.getDate() + 3);

        // Create draft notification
        await base44.asServiceRole.entities.Reg34ChangeNotification.create({
          org_id: home.org_id,
          change_type: 'additional_premises_first_use',
          change_type_description: `First child accommodation at ${home.name}`,
          deadline_type: 'seventy_two_hours',
          change_event_date: now.toISOString().split('T')[0],
          change_event_time: now.toTimeString().slice(0, 5),
          notification_deadline: deadline.toISOString().split('T')[0],
          hours_until_deadline: 72,
          is_overdue: false,
          home_id: homeId,
          home_name: home.name,
          home_address: home.address,
          first_accommodation_date: now.toISOString().split('T')[0],
          first_accommodation_time: now.toTimeString().slice(0, 5),
          resident_id: resident.id,
          status: 'pending_notification',
          submitted_by_id: resident.created_by,
        });

        // Create urgent notification
        await base44.asServiceRole.functions.invoke('createNotification', {
          roles: ['admin', 'admin_officer', 'rsm'],
          title: `URGENT — 72-Hour Ofsted Notice Required: New Premises`,
          body: `A child has been placed at ${home.name} for the first time. Ofsted must be notified in writing within 72 hours. Deadline: ${deadline.toLocaleDateString()}. Go to Reg 34 in the Compliance Hub immediately.`,
          link: '/compliance-hub?report=reg34',
          severity: 'critical',
        });
      }
    }

    if (triggerType === 'home_premises_use_toggled') {
      // Trigger 2 & 3: Home.premises_currently_in_use changed
      const home = payload.data;
      const oldData = payload.old_data;

      if (home.premises_currently_in_use === false && oldData?.premises_currently_in_use !== false) {
        // Marked as no longer in use → 10 working day deadline
        const now = new Date();
        const deadline = calculateTenWorkingDaysFromNow(now);

        await base44.asServiceRole.entities.Reg34ChangeNotification.create({
          org_id: home.org_id,
          change_type: 'premises_no_longer_in_use',
          change_type_description: `${home.name} is no longer in use`,
          deadline_type: 'ten_working_days',
          change_event_date: now.toISOString().split('T')[0],
          notification_deadline: deadline.toISOString().split('T')[0],
          is_overdue: false,
          home_id: home.id,
          home_name: home.name,
          home_address: home.address,
          status: 'pending_notification',
          submitted_by_id: home.compliance_last_reviewed_by_id,
        });

        // Notify admin and RSM
        await base44.asServiceRole.functions.invoke('createNotification', {
          roles: ['admin', 'rsm'],
          title: `Reg 34 Notice Required: Premises No Longer in Use`,
          body: `${home.name} has been marked as no longer in use. Ofsted must be notified within 10 working days by ${deadline.toLocaleDateString()}.`,
          link: '/compliance-hub?report=reg34',
          severity: 'high',
        });
      } else if (home.premises_currently_in_use === true && oldData?.premises_currently_in_use === false) {
        // Returned to use → set up for 72-hour rule on next resident placement
        // Notification will be created when resident is placed (Trigger 1)
      }
    }

    if (triggerType === 'org_profile_changed') {
      // Trigger 4: OrganisationProfile changes
      const orgProfile = payload.data;
      const oldData = payload.old_data;
      const now = new Date();
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 5); // as_soon_as_practicable interpretation

      const changedFields = [];
      if (oldData?.provider_legal_name !== orgProfile.provider_legal_name) {
        changedFields.push({
          type: 'registered_provider_name_change',
          description: `Organisation name changed from "${oldData?.provider_legal_name}" to "${orgProfile.provider_legal_name}"`,
          previous: oldData?.provider_legal_name,
          new: orgProfile.provider_legal_name,
        });
      }
      if (oldData?.contact_address !== orgProfile.contact_address) {
        changedFields.push({
          type: 'organisation_name_or_address_change',
          description: `Organisation address changed`,
          previous: oldData?.contact_address,
          new: orgProfile.contact_address,
        });
      }
      if (oldData?.nominated_individual_id !== orgProfile.nominated_individual_id) {
        changedFields.push({
          type: 'nominated_individual_change',
          description: `Nominated Individual changed`,
          previous: oldData?.nominated_individual_id,
          new: orgProfile.nominated_individual_id,
        });
      }

      for (const field of changedFields) {
        await base44.asServiceRole.entities.Reg34ChangeNotification.create({
          org_id: orgProfile.org_id,
          change_type: field.type,
          change_type_description: field.description,
          deadline_type: 'as_soon_as_practicable',
          change_event_date: now.toISOString().split('T')[0],
          change_effective_date: now.toISOString().split('T')[0],
          notification_deadline: deadline.toISOString().split('T')[0],
          is_overdue: false,
          previous_value: field.previous,
          new_value: field.new,
          status: 'pending_notification',
          submitted_by_id: orgProfile.last_updated_by_id,
        });
      }

      if (changedFields.length > 0) {
        await base44.asServiceRole.functions.invoke('createNotification', {
          roles: ['admin', 'rsm'],
          title: `Reg 34 Notice Required: Organisational Change`,
          body: `${changedFields.map(f => f.description).join('; ')}. Ofsted must be notified as soon as reasonably practicable.`,
          link: '/compliance-hub?report=reg34',
          severity: 'high',
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateTenWorkingDaysFromNow(startDate) {
  let current = new Date(startDate);
  let workingDays = 0;

  // Would need to fetch BankHoliday records in real implementation
  // For now, simple approximation: add 14 calendar days (10 working + 4 weekends)
  while (workingDays < 10) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      workingDays++;
    }
  }

  return current;
}