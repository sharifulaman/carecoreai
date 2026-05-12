import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const ORG_ID = "default_org";
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id: ORG_ID, status: "active" });
    if (!homes.length) return Response.json({ error: "No homes found" }, { status: 400 });

    const MONTHS = [
      { month: 1, label: "February 2026", monthStr: "02", from: "2026-02-01", isPaid: true },
      { month: 2, label: "March 2026",    monthStr: "03", from: "2026-03-01", isPaid: true },
      { month: 3, label: "April 2026",    monthStr: "04", from: "2026-04-01", isPaid: true },
      { month: 4, label: "May 2026",      monthStr: "05", from: "2026-05-01", isPaid: false },
    ];

    // High costs so total expenses >> LA income (each house loses money)
    const BILL_TEMPLATES = [
      { bill_type: "rent",           supplier: "Landlord",                  base: 3200 },
      { bill_type: "utilities",      supplier: "British Gas",               base: 420  },
      { bill_type: "utilities",      supplier: "Octopus Energy",            base: 380  },
      { bill_type: "utilities",      supplier: "Severn Trent Water",        base: 120  },
      { bill_type: "council_tax",    supplier: "Local Council",             base: 310  },
      { bill_type: "insurance",      supplier: "Aviva Care Insurance",      base: 280  },
      { bill_type: "maintenance",    supplier: "QuickFix Maintenance",      base: 950  },
      { bill_type: "cleaning",       supplier: "CleanPro Services",         base: 400  },
      { bill_type: "food_supplies",  supplier: "Tesco Business",            base: 780  },
      { bill_type: "staff_training", supplier: "CareLearn UK",              base: 650  },
      { bill_type: "admin",          supplier: "Office Supplies Ltd",       base: 220  },
      { bill_type: "other",          supplier: "Miscellaneous Expenses",    base: 490  },
    ];

    // Batch all bills into one bulkCreate per month
    const allBills = [];
    const allPettyCashTx = [];

    // Resolve petty cash IDs
    const existingPCList = await base44.asServiceRole.entities.PettyCash.filter({ org_id: ORG_ID });
    const pcByHome = {};
    for (const pc of existingPCList) {
      pcByHome[pc.home_id] = pc.id;
    }

    // Create missing PettyCash records
    const missingPCHomes = homes.filter(h => !pcByHome[h.id]);
    for (const home of missingPCHomes) {
      const pc = await base44.asServiceRole.entities.PettyCash.create({
        org_id: ORG_ID,
        home_id: home.id,
        opening_balance: 300,
        current_balance: 120,
        float_threshold: 50,
        status: "active",
        created_by: user.email,
      });
      pcByHome[home.id] = pc.id;
    }

    for (const home of homes) {
      const pettyCashId = pcByHome[home.id];

      for (const m of MONTHS) {
        // Bills
        for (let bi = 0; bi < BILL_TEMPLATES.length; bi++) {
          const tpl = BILL_TEMPLATES[bi];
          const variance = Math.round((Math.random() * 0.2 - 0.1) * tpl.base);
          const amount = Math.round((tpl.base + variance) * 100) / 100;
          const dueDay = String(Math.min(5 + bi * 2, 28)).padStart(2, "0");
          const dueDate = `2026-${m.monthStr}-${dueDay}`;

          allBills.push({
            org_id: ORG_ID,
            home_id: home.id,
            property_id: home.id,
            property_name: home.name,
            bill_type: tpl.bill_type,
            supplier: tpl.supplier,
            amount,
            due_date: dueDate,
            status: m.isPaid ? "paid" : "pending",
            paid_date: m.isPaid ? dueDate : null,
            is_recurring: ["rent","utilities","council_tax","insurance"].includes(tpl.bill_type),
            is_direct_debit: ["rent","utilities","council_tax"].includes(tpl.bill_type),
            notes: `${tpl.supplier} — ${m.label}`,
          });
        }

        // Petty cash transactions
        if (pettyCashId) {
          const pettyItems = [
            { type: "cash_in",  amount: 200, category: "other",            desc: "Monthly float top-up",            day: "01" },
            { type: "cash_out", amount: 65,  category: "groceries",        desc: "Weekly groceries run",             day: "03" },
            { type: "cash_out", amount: 40,  category: "transport",        desc: "Resident transport costs",         day: "06" },
            { type: "cash_out", amount: 75,  category: "activities",       desc: "Resident activities & outings",    day: "09" },
            { type: "cash_out", amount: 35,  category: "toiletries",       desc: "Toiletries & personal care",       day: "11" },
            { type: "cash_out", amount: 55,  category: "cleaning",         desc: "Cleaning supplies",                day: "14" },
            { type: "cash_out", amount: 90,  category: "resident_personal",desc: "Resident personal allowances",     day: "17" },
            { type: "cash_out", amount: 48,  category: "groceries",        desc: "Extra groceries",                  day: "20" },
            { type: "cash_out", amount: 60,  category: "activities",       desc: "Day trip costs",                   day: "23" },
            { type: "cash_out", amount: 30,  category: "other",            desc: "Sundry expenses",                  day: "26" },
          ];

          let bal = 200;
          for (const tx of pettyItems) {
            bal = tx.type === "cash_in" ? bal + tx.amount : bal - tx.amount;
            allPettyCashTx.push({
              org_id: ORG_ID,
              petty_cash_id: pettyCashId,
              home_id: home.id,
              transaction_type: tx.type,
              amount: tx.amount,
              category: tx.category,
              description: tx.desc,
              date: `2026-${m.monthStr}-${tx.day}`,
              recorded_by: user.email,
              balance_after: Math.max(bal, 0),
            });
          }
        }
      }
    }

    // Bulk insert in chunks of 50
    const CHUNK = 50;
    let billCount = 0;
    let txCount = 0;

    for (let i = 0; i < allBills.length; i += CHUNK) {
      const chunk = allBills.slice(i, i + CHUNK);
      await base44.asServiceRole.entities.Bill.bulkCreate(chunk);
      billCount += chunk.length;
    }

    for (let i = 0; i < allPettyCashTx.length; i += CHUNK) {
      const chunk = allPettyCashTx.slice(i, i + CHUNK);
      await base44.asServiceRole.entities.PettyCashTransaction.bulkCreate(chunk);
      txCount += chunk.length;
    }

    return Response.json({
      success: true,
      message: `Seeded Feb–May 2026 across ${homes.length} homes`,
      bills: billCount,
      pettyCashTransactions: txCount,
    });

  } catch (err) {
    console.error("Seed error:", err?.message || err);
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
});