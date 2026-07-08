import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.data?.org_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ORG_ID = user.data.org_id;
    const HOME_IDS = ['69ec9f28bffd00a555ebb5d2', '69ec9f26b58e45ecdd5aed15'];

    const names = [
      { first: 'Aisha', last: 'Khan' },
      { first: 'Liam', last: 'Patel' },
      { first: 'Ella', last: 'Johnson' },
      { first: 'Shanto', last: 'Ahmed' },
      { first: 'Jayden', last: 'Brown' },
      { first: 'Sophie', last: 'Williams' },
      { first: 'Marcus', last: 'Davis' },
      { first: 'Zara', last: 'Ali' },
    ];

    const residents = [];
    for (let i = 0; i < HOME_IDS.length; i++) {
      for (let j = 0; j < 4; j++) {
        const idx = i * 4 + j;
        if (idx >= names.length) break;

        const name = names[idx];
        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - (16 + Math.random() * 4));

        try {
          const resident = await base44.asServiceRole.entities.Resident.create({
            org_id: ORG_ID,
            home_id: HOME_IDS[i],
            display_name: `${name.first} ${name.last}`,
            full_name: `${name.first} ${name.last}`,
            dob: dob.toISOString().split('T')[0],
            service_type: 'twenty_four_hours',
            accommodation_category: 'shared_ring_fenced',
            placement_start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active',
          });
          residents.push(resident);
        } catch (e) {
          console.log(`Resident error: ${e.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      residentsCreated: residents.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});