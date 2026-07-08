import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.data?.org_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ORG_ID = user.data.org_id;
    const STAFF_ID = '69ecb9ef5a0facbdda3e9c42';
    const STAFF_NAME = 'Morsalin Chowdhury';
    const HOME_IDS = ['69ec9f28bffd00a555ebb5d2', '69ec9f26b58e45ecdd5aed15'];

    // Create assignments
    const assignments = [];
    for (const homeId of HOME_IDS) {
      try {
        const assignment = await base44.asServiceRole.entities.StaffServiceAssignment.create({
          org_id: ORG_ID,
          staff_id: STAFF_ID,
          staff_name: STAFF_NAME,
          home_id: homeId,
          service_type: 'twenty_four_hours',
          accommodation_category: 'shared_ring_fenced',
          assignment_start_date: new Date().toISOString().split('T')[0],
          primary_assignment: true,
          allocation_percentage: 100,
          active: true,
        });
        assignments.push(assignment);
      } catch (e) {
        console.log(`Assignment error for ${homeId}: ${e.message}`);
      }
    }

    // Get residents for these homes
    const allResidents = await base44.asServiceRole.entities.Resident.filter({
      org_id: ORG_ID,
      status: 'active',
    });

    const homeResidents = allResidents.filter(r => HOME_IDS.includes(r.home_id)).slice(0, 8);

    // Create appointments
    const appointments = [];
    for (const resident of homeResidents) {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 14));

      try {
        const appt = await base44.asServiceRole.entities.Appointment.create({
          org_id: ORG_ID,
          resident_id: resident.id,
          resident_name: resident.display_name,
          home_id: resident.home_id,
          date: appointmentDate.toISOString().split('T')[0],
          time: `${9 + Math.floor(Math.random() * 8)}:00`,
          appointment_type: ['GP', 'Dentist', 'Optician'][Math.floor(Math.random() * 3)],
          location: 'City Health Centre',
          status: 'scheduled',
        });
        appointments.push(appt);
      } catch (e) {
        console.log(`Appointment error: ${e.message}`);
      }
    }

    // Create visit reports
    const visitReports = [];
    for (const resident of homeResidents) {
      try {
        const report = await base44.asServiceRole.entities.VisitReport.create({
          org_id: ORG_ID,
          resident_id: resident.id,
          resident_name: resident.display_name,
          home_id: resident.home_id,
          worker_id: STAFF_ID,
          worker_name: STAFF_NAME,
          date: new Date().toISOString().split('T')[0],
          time_start: '10:00',
          time_end: '11:30',
          duration_minutes: 90,
          action_text: 'Positive engagement during support session. Discussed pathway plan progress.',
          outcome_text: 'Young person engaged well with key worker session.',
          status: 'submitted',
        });
        visitReports.push(report);
      } catch (e) {
        console.log(`Visit report error: ${e.message}`);
      }
    }

    // Create incidents
    const incidents = [];
    if (homeResidents.length > 0) {
      try {
        const incident = await base44.asServiceRole.entities.Incident.create({
          org_id: ORG_ID,
          home_id: HOME_IDS[0],
          resident_ids: [homeResidents[0].id],
          incident_date: new Date().toISOString().split('T')[0],
          incident_time: '14:30',
          incident_type: 'behaviour',
          description: 'Minor incident during afternoon activities.',
          location: 'Living room',
          status: 'submitted',
        });
        incidents.push(incident);
      } catch (e) {
        console.log(`Incident error: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      assignmentsCreated: assignments.length,
      appointmentsCreated: appointments.length,
      visitReportsCreated: visitReports.length,
      incidentsCreated: incidents.length,
      residentsCount: homeResidents.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});