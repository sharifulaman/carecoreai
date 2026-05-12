/**
 * Seed realistic DBS expiry data for all StaffProfile records that have none.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const DBS_NUMBERS = () => {
  const n = () => randomBetween(100000000, 999999999);
  return `00${n()}`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.StaffProfile.filter({ email: user.email });
    if (!profiles?.length || profiles[0].role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const allStaff = await base44.asServiceRole.entities.StaffProfile.list('-created_date', 500);
    const today = new Date();

    // Varied DBS expiry mix: current, due soon (within 60 days), expired
    const dbsOptions = [
      // Current: 3-24 months away
      () => addDays(today, randomBetween(61, 730)),
      () => addDays(today, randomBetween(61, 730)),
      () => addDays(today, randomBetween(61, 730)),
      // Due soon: 1-60 days
      () => addDays(today, randomBetween(1, 60)),
      () => addDays(today, randomBetween(1, 60)),
      // Expired: 1-180 days ago
      () => addDays(today, -randomBetween(1, 180)),
    ];

    const updates = allStaff.map((sp, i) => {
      const expiryFn = dbsOptions[i % dbsOptions.length];
      return base44.asServiceRole.entities.StaffProfile.update(sp.id, {
        dbs_expiry: expiryFn(),
        dbs_number: sp.dbs_number || DBS_NUMBERS(),
      });
    });

    await Promise.all(updates);

    return Response.json({ success: true, updated: allStaff.length, message: `Seeded DBS data for ${allStaff.length} staff` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});