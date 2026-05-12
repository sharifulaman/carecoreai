import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const ORG_ID = "default_org";
    const CREATED_BY = "69ea25e95cd4159d8c74d329";

    // All 7 homes with their residents and petty cash IDs
    const homes = [
      {
        id: "69e8d17a9855396d7f77d924", name: "Maple House",
        residents: ["69e8d1a19855396d7f77d974", "69e8d1a19855396d7f77d96d", "69e8d1a19855396d7f77d970"],
        pettyCashId: "69eb75fb0daf529bb432fe35", la: "Birmingham City Council",
        rent: 1800
      },
      {
        id: "69e8d17a9855396d7f77d925", name: "Oak Lodge",
        residents: ["69ea25596a9aead39428a6cb", "69e8d1a19855396d7f77d975", "69e8d1a19855396d7f77d96e", "69e8d1a19855396d7f77d971"],
        pettyCashId: "69eb76014c5a3877ecd8ac47", la: "Birmingham City Council",
        rent: 2000
      },
      {
        id: "69e8d17a9855396d7f77d926", name: "Cedar View",
        residents: ["69e8d1a19855396d7f77d976", "69e8d1a19855396d7f77d96f", "69e8d1a19855396d7f77d972"],
        pettyCashId: "69eb760e90551e6043e3e82b", la: "Birmingham City Council",
        rent: 1900
      },
      {
        id: "69ea9ed90daf529bb432cdea", name: "Summit House",
        residents: [],
        pettyCashId: "69eb75ea7b4eea6c95ae9d3b", la: "Bristol City Council",
        rent: 2500
      },
      {
        id: "69ea9ed9681576e97cde24ad", name: "Bridge House",
        residents: [],
        pettyCashId: "69eb75ea00c3ebc0460cb6a7", la: "Birmingham City Council",
        rent: 3200
      },
      {
        id: "69ea9ed9084ba1deceaa9544", name: "Haven Care",
        residents: [],
        pettyCashId: "69eb75ebd22acead87361aea", la: "Liverpool City Council",
        rent: 2800
      },
      {
        id: "69ea9ed9d35049cd7bf57fb6", name: "Grafton House",
        residents: [],
        pettyCashId: "69eb75ec9c3860172646d626", la: "Manchester City Council",
        rent: 1200
      },
    ];

    // Resident → { feeId, monthlyAmount } from existing PlacementFee records
    const residentFees = {
      "69e8d1a19855396d7f77d974": { feeId: "69eb75f41ec27d457e22a320", monthly: 5000 }, // Maple House - Imani D.  (no fee seeded, use closest)
      "69e8d1a19855396d7f77d96d": { feeId: "69eb75f2b3337db774720f22", monthly: 4000 }, // Maple House - Tyler M.
      "69e8d1a19855396d7f77d970": { feeId: "69eb75f41ec27d457e22a320", monthly: 5000 }, // Maple House - Sofia R.
      "69ea25596a9aead39428a6cb": { feeId: "69eb75fbc8c6a65322632484", monthly: 3000 }, // Oak Lodge - Mo
      "69e8d1a19855396d7f77d975": { feeId: "69eb75fcbaebfe9e3df47a33", monthly: 4000 }, // Oak Lodge - Jake H.
      "69e8d1a19855396d7f77d96e": { feeId: "69eb75ff6076a06d2ea65f67", monthly: 5000 }, // Oak Lodge - Aisha K.
      "69e8d1a19855396d7f77d971": { feeId: "69eb76005d0f48c44413456b", monthly: 6000 }, // Oak Lodge - Marcus J.
      "69e8d1a19855396d7f77d976": { feeId: "69eb760465e2edd198c9df38", monthly: 3000 }, // Cedar View - Chloe N.
      "69e8d1a19855396d7f77d96f": { feeId: "69eb7607fe1ed1d853a65040", monthly: 4000 }, // Cedar View - Liam B.
      "69e8d1a19855396d7f77d972": { feeId: "69eb760ab260ea0371181d2c", monthly: 5000 }, // Cedar View - resident
    };

    // Months to seed invoices for (past 10 months)
    const months = [];
    for (let i = 9; i >= 0; i--) {
      const d = new Date(2026, 3 - i, 1); // starts from July 2025
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
        from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        to: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`,
      });
    }

    // Bill types per home - 10 realistic expense entries each
    const billTemplates = [
      { bill_type: "rent", supplier: "Landlord", amounts: [1800, 2000, 1900, 2500, 3200, 2800, 1200] },
      { bill_type: "utilities", supplier: "British Gas", amounts: [145, 160, 138, 190, 220, 175, 95] },
      { bill_type: "utilities", supplier: "Octopus Energy", amounts: [210, 195, 185, 240, 280, 230, 120] },
      { bill_type: "utilities", supplier: "Severn Trent Water", amounts: [58, 65, 60, 75, 90, 70, 45] },
      { bill_type: "council_tax", supplier: "Local Council", amounts: [189, 220, 205, 250, 310, 260, 165] },
      { bill_type: "insurance", supplier: "Aviva Care Insurance", amounts: [95, 110, 100, 135, 160, 140, 80] },
      { bill_type: "maintenance", supplier: "QuickFix Maintenance", amounts: [320, 450, 280, 600, 750, 520, 200] },
      { bill_type: "cleaning", supplier: "CleanPro Services", amounts: [180, 200, 165, 220, 260, 210, 130] },
      { bill_type: "food_supplies", supplier: "Tesco Business", amounts: [420, 510, 380, 650, 780, 590, 290] },
      { bill_type: "staff_training", supplier: "CareLearn UK", amounts: [250, 300, 220, 400, 480, 350, 175] },
    ];

    let invoiceCount = 0;
    let billCount = 0;
    let pettyCashTxCount = 0;

    // Seed invoices for each home's residents across 10 months
    for (const home of homes) {
      for (const residentId of home.residents) {
        const feeData = residentFees[residentId];
        if (!feeData) continue;
        const { feeId, monthly: monthlyAmount } = feeData;
        const dailyRate = monthlyAmount / 30;

        for (let mi = 0; mi < 10; mi++) {
          const m = months[mi];
          const totalAmount = parseFloat((dailyRate * m.days).toFixed(2));
          const isPast = mi < 9;
          const status = isPast ? (mi < 8 ? "paid" : "sent") : "draft";
          const invNum = `INV-${m.label}-${home.name.split(" ")[0].toUpperCase()}-${residentId.slice(-4)}`;

          await base44.asServiceRole.entities.PlacementInvoice.create({
            org_id: ORG_ID,
            home_id: home.id,
            resident_id: residentId,
            placement_fee_id: feeId,
            local_authority: home.la,
            invoice_number: invNum,
            invoice_date: m.from,
            period_from: m.from,
            period_to: m.to,
            days_in_period: m.days,
            daily_rate: parseFloat(dailyRate.toFixed(4)),
            total_amount: totalAmount,
            amount_due: status === "paid" ? 0 : totalAmount,
            status,
            sent_date: isPast ? m.from : null,
            paid_date: status === "paid" ? m.to : null,
            generated_by: CREATED_BY,
            additional_items: [],
          });
          invoiceCount++;
        }
      }

      // Seed 10 bills per home for April 2026
      for (let bi = 0; bi < billTemplates.length; bi++) {
        const tpl = billTemplates[bi];
        const homeIdx = homes.indexOf(home);
        const amount = tpl.amounts[homeIdx] || tpl.amounts[0];
        const dueDay = 5 + bi * 2;
        const dueDate = `2026-04-${String(Math.min(dueDay, 28)).padStart(2, "0")}`;
        const isPaid = bi < 7;

        await base44.asServiceRole.entities.Bill.create({
          org_id: ORG_ID,
          home_id: home.id,
          property_id: home.id,
          property_name: home.name,
          bill_type: tpl.bill_type,
          supplier: tpl.supplier,
          amount,
          due_date: dueDate,
          status: isPaid ? "paid" : "pending",
          paid_date: isPaid ? `2026-04-${String(Math.min(dueDay, 28)).padStart(2, "0")}` : null,
          is_recurring: true,
          is_direct_debit: bi < 5,
          notes: `${tpl.supplier} — April 2026`,
        });
        billCount++;
      }

      // Seed 10 petty cash transactions per home
      if (home.pettyCashId) {
        const txData = [
          { type: "cash_in", amount: 200, category: "other", desc: "Monthly float top-up", date: "2026-04-01" },
          { type: "cash_out", amount: 35, category: "groceries", desc: "Weekly groceries run", date: "2026-04-03" },
          { type: "cash_out", amount: 18, category: "transport", desc: "Bus fares for resident appointment", date: "2026-04-05" },
          { type: "cash_out", amount: 45, category: "activities", desc: "Cinema trip for residents", date: "2026-04-08" },
          { type: "cash_out", amount: 22, category: "toiletries", desc: "Toiletries top-up", date: "2026-04-10" },
          { type: "cash_in", amount: 100, category: "other", desc: "Emergency float refill", date: "2026-04-12" },
          { type: "cash_out", amount: 55, category: "groceries", desc: "Weekly groceries", date: "2026-04-15" },
          { type: "cash_out", amount: 30, category: "cleaning", desc: "Cleaning supplies", date: "2026-04-17" },
          { type: "cash_out", amount: 40, category: "resident_personal", desc: "Resident personal allowance", date: "2026-04-20" },
          { type: "cash_out", amount: 25, category: "activities", desc: "Park outing snacks & entry", date: "2026-04-22" },
        ];

        let runningBal = 200;
        for (const tx of txData) {
          runningBal = tx.type === "cash_in" ? runningBal + tx.amount : runningBal - tx.amount;
          await base44.asServiceRole.entities.PettyCashTransaction.create({
            org_id: ORG_ID,
            petty_cash_id: home.pettyCashId,
            home_id: home.id,
            transaction_type: tx.type,
            amount: tx.amount,
            category: tx.category,
            description: tx.desc,
            date: tx.date,
            recorded_by: CREATED_BY,
            balance_after: runningBal,
          });
          pettyCashTxCount++;
        }
      }
    }

    return Response.json({
      success: true,
      invoices: invoiceCount,
      bills: billCount,
      pettyCashTransactions: pettyCashTxCount,
    });

  } catch (err) {
    console.error("Seed error:", err?.message || err);
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
});