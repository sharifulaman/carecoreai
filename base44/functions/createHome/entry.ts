import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await req.json();
    
    const homeData = {
      org_id: data.org_id || 'default_org',
      name: data.name,
      type: data.type,
      address: data.address,
      postcode: data.postcode,
      phone: data.phone,
      email: data.email,
      team_leader_id: data.team_leader_id,
      monthly_rent: data.monthly_rent,
      landlord_name: data.landlord_name,
      landlord_contact: data.landlord_contact,
      landlord_email: data.landlord_email,
      lease_start: data.lease_start,
      lease_end: data.lease_end,
      property_notes: data.property_notes,
      status: 'active'
    };

    const home = await base44.asServiceRole.entities.Home.create(homeData);
    
    return Response.json({ id: home.id, ...home });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});