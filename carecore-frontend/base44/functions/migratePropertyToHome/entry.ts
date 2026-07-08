import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const ORG_ID = Deno.env.get("BASE44_APP_ID") || "default";
    const { body } = req;
    const payload = body ? await req.json().catch(() => ({})) : {};
    const org_id = payload.org_id || ORG_ID;

    // Fetch all Property records
    const properties = await base44.asServiceRole.entities.Property.filter({ org_id });
    // Fetch all Home records
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id });
    // Fetch all Bill records
    const bills = await base44.asServiceRole.entities.Bill.filter({ org_id });

    const results = [];

    // Step 1: Migrate Property data to Home
    for (const prop of properties) {
      const home = homes.find(h => h.id === prop.home_id);
      if (!home) {
        results.push({ property_id: prop.id, status: 'skipped', reason: 'No matching home found' });
        continue;
      }

      const update = {};
      if (!home.address && prop.address) update.address = prop.address;
      if (!home.postcode && prop.postcode) update.postcode = prop.postcode;
      if (prop.lease_start) update.lease_start = prop.lease_start;
      if (prop.lease_end) update.lease_end = prop.lease_end;
      if (prop.monthly_rent) update.monthly_rent = prop.monthly_rent;
      if (prop.landlord_name) update.landlord_name = prop.landlord_name;
      if (prop.landlord_contact) update.landlord_contact = prop.landlord_contact;
      if (prop.landlord_email) update.landlord_email = prop.landlord_email;
      if (prop.notes) update.property_notes = prop.notes;

      if (Object.keys(update).length > 0) {
        await base44.asServiceRole.entities.Home.update(home.id, update);
      }

      results.push({
        property_id: prop.id,
        home_id: home.id,
        home_name: home.name,
        status: 'migrated',
        fields_updated: Object.keys(update),
      });

      console.log(`Migrated property ${prop.id} to home ${home.id}`);
    }

    // Step 2: Update Bill records — set home_id from property's home_id
    const billResults = [];
    for (const bill of bills) {
      if (bill.property_id && !bill.home_id) {
        const prop = properties.find(p => p.id === bill.property_id);
        if (prop?.home_id) {
          await base44.asServiceRole.entities.Bill.update(bill.id, {
            home_id: prop.home_id,
          });
          billResults.push({ bill_id: bill.id, home_id: prop.home_id, status: 'updated' });
        }
      }
    }

    return Response.json({
      success: true,
      properties_processed: properties.length,
      migration_results: results,
      bills_updated: billResults.length,
      bill_results: billResults,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});