import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const ORG_ID = "default_org";

    const homes = [
      { id: "69e8d17a9855396d7f77d924", name: "Maple House",        rent: 1800 },
      { id: "69e8d17a9855396d7f77d925", name: "Oak Lodge",           rent: 2000 },
      { id: "69e8d17a9855396d7f77d926", name: "Cedar View",          rent: 1900 },
      { id: "69ea9ed90daf529bb432cdea", name: "Summit House",        rent: 2500 },
      { id: "69ea9ed9681576e97cde24ad", name: "Bridge House",        rent: 3200 },
      { id: "69ea9ed9084ba1deceaa9544", name: "Haven Care",          rent: 2800 },
      { id: "69ea9ed9d35049cd7bf57fb6", name: "Grafton House",       rent: 1200 },
    ];

    // Bill templates per home (index maps to homes array)
    const billTypes = [
      { bill_type: "rent",         supplier: "Landlord",               amounts: [1800, 2000, 1900, 2500, 3200, 2800, 1200], is_direct_debit: true,  is_recurring: true,  day: 1  },
      { bill_type: "utilities",    supplier: "British Gas",            amounts: [145,  160,  138,  190,  220,  175,  95 ], is_direct_debit: true,  is_recurring: true,  day: 5  },
      { bill_type: "utilities",    supplier: "Octopus Energy",         amounts: [210,  195,  185,  240,  280,  230,  120], is_direct_debit: true,  is_recurring: true,  day: 7  },
      { bill_type: "utilities",    supplier: "Severn Trent Water",     amounts: [58,   65,   60,   75,   90,   70,  45 ], is_direct_debit: true,  is_recurring: true,  day: 9  },
      { bill_type: "council_tax",  supplier: "Local Council",          amounts: [189,  220,  205,  250,  310,  260,  165], is_direct_debit: true,  is_recurring: true,  day: 11 },
      { bill_type: "insurance",    supplier: "Aviva Care Insurance",   amounts: [95,   110,  100,  135,  160,  140,  80 ], is_direct_debit: false, is_recurring: true,  day: 13 },
      { bill_type: "maintenance",  supplier: "QuickFix Maintenance",   amounts: [320,  450,  280,  600,  750,  520,  200], is_direct_debit: false, is_recurring: false, day: 15 },
      { bill_type: "cleaning",     supplier: "CleanPro Services",      amounts: [180,  200,  165,  220,  260,  210,  130], is_direct_debit: false, is_recurring: true,  day: 17 },
    ];

    // Generate last 6 months (Nov 2025 – Apr 2026), skip April as it's already seeded
    const months = [];
    for (let i = 5; i >= 1; i--) {
      const d = new Date(2026, 3 - i, 1); // 3 = April index, going back i months
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      months.push({ year, month, label: `${year}-${month}` });
    }
    // months = Nov 2025, Dec 2025, Jan 2026, Feb 2026, Mar 2026

    const allBills = [];

    for (const home of homes) {
      const homeIdx = homes.indexOf(home);
      for (const m of months) {
        for (const tpl of billTypes) {
          const amount = tpl.amounts[homeIdx] ?? tpl.amounts[0];
          const dueDate = `${m.label}-${String(tpl.day).padStart(2, "0")}`;
          allBills.push({
            org_id: ORG_ID,
            home_id: home.id,
            home_name: home.name,
            bill_type: tpl.bill_type,
            supplier: tpl.supplier,
            amount,
            due_date: dueDate,
            paid_date: dueDate,
            status: "paid",
            is_direct_debit: tpl.is_direct_debit,
            is_recurring: tpl.is_recurring,
            notes: `${tpl.supplier} — ${m.label}`,
          });
        }
      }
    }

    // Bulk create in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < allBills.length; i += chunkSize) {
      const chunk = allBills.slice(i, i + chunkSize);
      await base44.asServiceRole.entities.Bill.bulkCreate(chunk);
    }

    return Response.json({ success: true, bills_created: allBills.length });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});