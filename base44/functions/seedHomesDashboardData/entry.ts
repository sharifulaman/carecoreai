/**
 * Seed realistic compliance, tenancy, and rent data for all existing homes.
 * Only adds the new dashboard fields — does not overwrite name, address, type, etc.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a compliance expiry date with a mix of statuses
function complianceDate(seed) {
  const today = new Date();
  const options = [
    // Current: 1–12 months away
    randomBetween(31, 365),
    randomBetween(31, 365),
    randomBetween(31, 365),
    // Due soon: 1–30 days
    randomBetween(1, 30),
    randomBetween(1, 30),
    // Expired: 1–90 days ago
    -randomBetween(1, 90),
  ];
  const days = options[seed % options.length];
  return addDays(today, days);
}

const LANDLORDS = [
  'Greenfield Properties Ltd', 'R. & J. Patel Holdings', 'Oakwood Estates',
  'Meridian Housing Trust', 'Bluebell Property Group', 'North Star Lettings',
  'Crown Residential Ltd', 'J. Harrison & Sons', 'Citywide Property Management',
];

const DEPOSIT_HOLDERS = ['DPS (Deposit Protection Service)', 'MyDeposits', 'TDS (Tenancy Deposit Scheme)', 'Landlord'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.StaffProfile.filter({ email: user.email });
    if (!profiles?.length || profiles[0].role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const homes = await base44.asServiceRole.entities.Home.filter({ status: 'active' });
    const today = new Date();

    const RENT_RANGES = {
      outreach: [800, 1200],
      '24_hours': [1500, 2500],
      care: [1400, 2200],
      '18_plus': [900, 1500],
    };

    const RENT_STATUSES = ['current', 'current', 'current', 'due_soon', 'overdue'];
    const LEASE_DURATIONS = [
      // Long-term: 2–5 years from now
      { start: -365, end: 730 }, { start: -180, end: 900 }, { start: -90, end: 1460 },
      // Expiring soon: end within 3 months
      { start: -730, end: 45 }, { start: -548, end: 60 }, { start: -365, end: 20 },
      // Already expired
      { start: -1095, end: -30 }, { start: -730, end: -10 },
    ];

    const updates = homes.map((home, i) => {
      const rentRange = RENT_RANGES[home.type] || [900, 1600];
      const monthlyRent = randomBetween(rentRange[0], rentRange[1]);
      const leaseDur = LEASE_DURATIONS[i % LEASE_DURATIONS.length];
      const leaseEnd = addDays(today, leaseDur.end);
      const leaseStart = addDays(today, leaseDur.start);
      const rentStatus = RENT_STATUSES[i % RENT_STATUSES.length];
      const rentDueDay = randomChoice([1, 1, 1, 5, 15, 25]);

      // Rent paid to date: if overdue, paid ~2 months ago; if due_soon, paid last month; if current, paid this month
      let rentPaidDaysAgo = 5;
      if (rentStatus === 'overdue') rentPaidDaysAgo = randomBetween(35, 65);
      else if (rentStatus === 'due_soon') rentPaidDaysAgo = randomBetween(20, 34);
      const rentPaidToDate = addDays(today, -rentPaidDaysAgo);

      return base44.asServiceRole.entities.Home.update(home.id, {
        // Tenancy fields
        lease_start: leaseStart,
        lease_end: leaseEnd,
        monthly_rent: monthlyRent,
        landlord_name: LANDLORDS[i % LANDLORDS.length],
        landlord_contact: `0${randomBetween(7700, 7999)} ${randomBetween(100000, 999999)}`,
        landlord_email: `landlord${i + 1}@properties.co.uk`,
        rent_due_day: rentDueDay,
        rent_paid_to_date: rentPaidToDate,
        rent_status: rentStatus,
        deposit_amount: monthlyRent * randomChoice([1, 1.5, 2]),
        deposit_held_by: DEPOSIT_HOLDERS[i % DEPOSIT_HOLDERS.length],
        next_rent_review_date: addDays(today, randomBetween(60, 400)),
        // Compliance fields — varied mix using seed offsets
        gas_safety_expiry: complianceDate(i),
        electrical_cert_expiry: complianceDate(i + 1),
        fire_risk_assessment_expiry: complianceDate(i + 2),
        epc_expiry: complianceDate(i + 3),
        insurance_expiry: complianceDate(i + 4),
        pat_testing_expiry: complianceDate(i + 5),
        water_hygiene_expiry: complianceDate(i + 6),
        last_inspection_date: addDays(today, -randomBetween(60, 500)),
        next_inspection_due: addDays(today, randomBetween(30, 730)),
      });
    });

    await Promise.all(updates);

    return Response.json({ success: true, updated: homes.length, message: `Seeded dashboard data for ${homes.length} homes` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});