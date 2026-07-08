import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.data?.org_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ORG_ID = user.data.org_id;

    // Get or create the support worker's staff profile
    let staffProfiles = await base44.entities.StaffProfile.filter({
      org_id: ORG_ID,
      email: 'morsalin.chowdhury@evolvixdigitalltd.co.uk',
    });

    let staffProfile;
    
    if (!staffProfiles || staffProfiles.length === 0) {
      // Create staff profile if it doesn't exist
      staffProfile = await base44.entities.StaffProfile.create({
        org_id: ORG_ID,
        full_name: 'Morsalin Chowdhury',
        email: 'morsalin.chowdhury@evolvixdigitalltd.co.uk',
        role: 'support_worker',
        is_support_role: true,
        job_title: 'Support Worker',
        start_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });
    } else {
      staffProfile = staffProfiles[0];
    }

    // Get all homes
    const homes = await base44.entities.Home.filter({ org_id: ORG_ID });
    if (!homes || homes.length === 0) {
      return Response.json({ error: 'No homes found' }, { status: 404 });
    }

    // Get all residents
    const residents = await base44.entities.Resident.filter({
      org_id: ORG_ID,
      status: 'active',
    });

    if (!residents || residents.length === 0) {
      return Response.json({ error: 'No residents found' }, { status: 404 });
    }

    // Create assignments for this support worker to first 2 homes
    const assignments = [];
    const homesToAssign = homes.slice(0, 2);
    
    for (const home of homesToAssign) {
      try {
        const assignment = await base44.entities.StaffServiceAssignment.create({
          org_id: ORG_ID,
          staff_id: staffProfile.id,
          staff_name: staffProfile.full_name,
          home_id: home.id,
          home_name: home.name,
          service_type: 'twenty_four_hours',
          accommodation_category: 'shared_ring_fenced',
          assignment_start_date: new Date().toISOString().split('T')[0],
          primary_assignment: true,
          allocation_percentage: 100,
          active: true,
        });
        assignments.push(assignment);
      } catch (e) {
        console.log(`Assignment already exists for home ${home.id}`);
      }
    }

    // Create sample appointments for assigned residents
    const assignedResidents = residents.filter(r => homesToAssign.map(h => h.id).includes(r.home_id)).slice(0, 5);
    const appointments = [];
    
    for (const resident of assignedResidents) {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 7));
      
      try {
        const appt = await base44.entities.Appointment.create({
          org_id: ORG_ID,
          resident_id: resident.id,
          resident_name: resident.display_name,
          home_id: resident.home_id,
          date: appointmentDate.toISOString().split('T')[0],
          time: `${Math.floor(Math.random() * 12) + 9}:00`,
          appointment_type: ['GP', 'Dentist', 'Optician'][Math.floor(Math.random() * 3)],
          location: 'TBD',
          status: 'scheduled',
        });
        appointments.push(appt);
      } catch (e) {
        console.log(`Error creating appointment: ${e.message}`);
      }
    }

    // Create sample visit reports
    const visitReports = [];
    for (const resident of assignedResidents) {
      try {
        const report = await base44.entities.VisitReport.create({
          org_id: ORG_ID,
          resident_id: resident.id,
          resident_name: resident.display_name,
          home_id: resident.home_id,
          worker_id: staffProfile.id,
          worker_name: staffProfile.full_name,
          date: new Date().toISOString().split('T')[0],
          time_start: '10:00',
          time_end: '11:00',
          action_text: 'Support session completed. Young person engaged well.',
          outcome_text: 'Positive engagement observed.',
          status: 'submitted',
        });
        visitReports.push(report);
      } catch (e) {
        console.log(`Error creating visit report: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      staffId: staffProfile.id,
      staffName: staffProfile.full_name,
      homeCount: homesToAssign.length,
      residentCount: assignedResidents.length,
      assignmentsCreated: assignments.length,
      appointmentsCreated: appointments.length,
      visitReportsCreated: visitReports.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});