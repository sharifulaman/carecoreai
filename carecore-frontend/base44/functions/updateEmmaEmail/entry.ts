import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can update staff emails
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find Emma Davis in StaffProfile
    const staff = await base44.entities.StaffProfile.filter({ full_name: "Emma Davis" });
    
    if (staff.length === 0) {
      return Response.json({ error: 'Emma Davis not found in staff profiles' }, { status: 404 });
    }

    const emma = staff[0];
    const newEmail = 'morsalin.chowdhury@evolvixdigitalltd.co.uk';

    // Update Emma's email in StaffProfile
    await base44.entities.StaffProfile.update(emma.id, { email: newEmail });

    return Response.json({ 
      success: true, 
      message: `Updated Emma Davis email from ${emma.email} to ${newEmail}`,
      staffId: emma.id 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});