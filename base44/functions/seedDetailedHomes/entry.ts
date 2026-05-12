import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const ORG_ID = 'default_org';

    // Fetch a team leader for assignments
    const staff = await base44.entities.StaffProfile.filter({ org_id: ORG_ID, role: 'team_leader' });
    const teamLeaderId = staff.length > 0 ? staff[0].id : 'tl_placeholder';

    const newHomes = [
      {
        org_id: ORG_ID,
        name: 'Grafton House - Outreach',
        type: 'childrens',
        care_model: 'outreach',
        property_type: 'outreach',
        address: '42 Grafton Street, Manchester',
        postcode: 'M1 2RA',
        phone: '0161 234 5678',
        email: 'grafton@outreach.org.uk',
        team_leader_id: teamLeaderId,
        compliance_framework: 'ofsted',
        lease_start: '2022-01-15',
        lease_end: '2027-01-14',
        landlord_name: 'Manchester Property Group',
        landlord_contact: '0161 987 6543',
        monthly_rent: 1200,
        status: 'active',
      },
      {
        org_id: ORG_ID,
        name: 'Haven Care - Care Services',
        type: 'supported',
        care_model: 'residential',
        property_type: 'care',
        address: '17 Haven Lane, Liverpool',
        postcode: 'L1 5DG',
        phone: '0151 456 7890',
        email: 'haven@careservices.org.uk',
        team_leader_id: teamLeaderId,
        compliance_framework: 'cqc',
        lease_start: '2021-06-01',
        lease_end: '2026-05-31',
        landlord_name: 'Liverpool Real Estate Ltd',
        landlord_contact: '0151 654 3210',
        monthly_rent: 2800,
        status: 'active',
      },
      {
        org_id: ORG_ID,
        name: 'Bridge House - 24 Hours Housing',
        type: 'childrens',
        care_model: 'residential',
        property_type: '24_hours',
        address: '88 Bridge Road, Birmingham',
        postcode: 'B1 1AA',
        phone: '0121 567 8901',
        email: 'bridge@24hours.org.uk',
        team_leader_id: teamLeaderId,
        compliance_framework: 'ofsted',
        lease_start: '2023-03-10',
        lease_end: '2028-03-09',
        landlord_name: 'Birmingham Housing Trust',
        landlord_contact: '0121 765 4321',
        monthly_rent: 3200,
        status: 'active',
      },
      {
        org_id: ORG_ID,
        name: 'Summit House - 18+ Accommodation',
        type: 'adult',
        care_model: 'both',
        property_type: '18_plus',
        address: '55 Summit Court, Bristol',
        postcode: 'BS1 3EF',
        phone: '0117 789 0123',
        email: 'summit@18plus.org.uk',
        team_leader_id: teamLeaderId,
        compliance_framework: 'custom',
        lease_start: '2020-09-01',
        lease_end: '2025-08-31',
        landlord_name: 'Bristol Urban Properties',
        landlord_contact: '0117 432 1098',
        monthly_rent: 2500,
        status: 'active',
      },
    ];

    const created = [];
    for (const home of newHomes) {
      const result = await base44.entities.Home.create(home);
      created.push(result);
    }

    return Response.json({
      success: true,
      message: `Created ${created.length} detailed homes`,
      homes: created.map(h => ({ id: h.id, name: h.name, property_type: h.property_type })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});