import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
  const base44 = createClientFromRequest(req);

  const ORG_ID = "default_org";

  // Check if already seeded
  const existingFees = await base44.asServiceRole.entities.PlacementFee.filter({ org_id: ORG_ID });
  if (existingFees.length > 0) {
    return Response.json({ seeded: false, message: "Already seeded", count: existingFees.length });
  }

  const homes = await base44.asServiceRole.entities.Home.filter({ org_id: ORG_ID, status: "active" });
  const allResidents = await base44.asServiceRole.entities.Resident.filter({ org_id: ORG_ID, status: "active" });
  const adminStaff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id: ORG_ID });
  const adminUser = adminStaff.find(s => s.role === "admin") || adminStaff[0];
  const createdById = adminUser?.id || "system";

  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const feeStartDate = threeMonthsAgo.toISOString().split("T")[0];

  const MONTHLY_RATES = [3000, 4000, 5000, 6000];
  const STATUSES = ["paid", "paid", "draft"];

  const LA_MAP = {
    // rough postcodes → LA
    "SW": "Wandsworth",
    "SE": "Southwark",
    "N": "Islington",
    "E": "Tower Hamlets",
    "W": "Ealing",
    "NW": "Camden",
    "EC": "City of London",
    "WC": "Camden",
  };

  function guessLA(address) {
    if (!address) return "Croydon";
    const upper = address.toUpperCase();
    for (const [prefix, la] of Object.entries(LA_MAP)) {
      if (upper.includes(prefix)) return la;
    }
    return "Croydon";
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  let totalFees = 0;
  let totalInvoices = 0;
  let totalPettyCash = 0;

  for (const home of homes) {
    const homeResidents = allResidents.filter(r => r.home_id === home.id);
    const la = guessLA(home.address);

    let rateIdx = 0;

    // Create placement fees + invoices per resident
    for (const resident of homeResidents) {
      const monthly = MONTHLY_RATES[rateIdx % MONTHLY_RATES.length];
      rateIdx++;
      const weeklyRate = (monthly * 12) / 52;

      const fee = await base44.asServiceRole.entities.PlacementFee.create({
        org_id: ORG_ID,
        resident_id: resident.id,
        home_id: home.id,
        local_authority: la,
        la_contact_name: "",
        la_contact_email: "",
        la_reference: "",
        weekly_rate: weeklyRate,
        monthly_equivalent: monthly,
        fee_start_date: feeStartDate,
        fee_end_date: null,
        status: "active",
        notes: "Seeded",
        created_by: createdById,
      });
      totalFees++;

      // Create 3 months of invoices
      for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - monthOffset);
        const year = d.getFullYear();
        const month = d.getMonth();
        const days = getDaysInMonth(year, month);
        const from = new Date(year, month, 1).toISOString().split("T")[0];
        const to = new Date(year, month + 1, 0).toISOString().split("T")[0];
        const dailyRate = (weeklyRate * 52) / 365;
        const amountDue = dailyRate * days;
        const monthStr = String(month + 1).padStart(2, "0");
        const invStatus = STATUSES[2 - monthOffset]; // oldest=paid, mid=paid, newest=draft

        await base44.asServiceRole.entities.PlacementInvoice.create({
          org_id: ORG_ID,
          placement_fee_id: fee.id,
          resident_id: resident.id,
          home_id: home.id,
          local_authority: la,
          invoice_number: `INV-${year}-${monthStr}-SEED-${String(totalInvoices + 1).padStart(4, "0")}`,
          invoice_date: from,
          period_from: from,
          period_to: to,
          days_in_period: days,
          daily_rate: dailyRate,
          amount_due: amountDue,
          additional_items: [],
          total_amount: amountDue,
          status: invStatus,
          sent_date: invStatus !== "draft" ? from : null,
          paid_date: invStatus === "paid" ? to : null,
          generated_by: createdById,
        });
        totalInvoices++;
      }
    }

    // Create petty cash ledger per home
    const currentBalance = 50 + Math.floor(Math.random() * 150);
    await base44.asServiceRole.entities.PettyCash.create({
      org_id: ORG_ID,
      home_id: home.id,
      opening_balance: 200,
      current_balance: currentBalance,
      float_threshold: 50,
      status: "active",
      created_by: createdById,
    });
    totalPettyCash++;
  }

  return Response.json({
    seeded: true,
    fees: totalFees,
    invoices: totalInvoices,
    pettyCash: totalPettyCash,
  });
  } catch (err) {
    console.error("Seed error:", err?.message || err);
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
});