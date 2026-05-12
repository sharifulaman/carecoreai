import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BANK_HOLIDAYS = [
  // 2025 England & Wales
  { date: "2025-01-01", name: "New Year's Day", region: "england_wales", year: 2025 },
  { date: "2025-04-18", name: "Good Friday", region: "england_wales", year: 2025 },
  { date: "2025-04-21", name: "Easter Monday", region: "england_wales", year: 2025 },
  { date: "2025-05-05", name: "Early May Bank Holiday", region: "england_wales", year: 2025 },
  { date: "2025-05-26", name: "Spring Bank Holiday", region: "england_wales", year: 2025 },
  { date: "2025-08-25", name: "Summer Bank Holiday", region: "england_wales", year: 2025 },
  { date: "2025-12-25", name: "Christmas Day", region: "england_wales", year: 2025 },
  { date: "2025-12-26", name: "Boxing Day", region: "england_wales", year: 2025 },
  
  // 2026 England & Wales
  { date: "2026-01-01", name: "New Year's Day", region: "england_wales", year: 2026 },
  { date: "2026-04-03", name: "Good Friday", region: "england_wales", year: 2026 },
  { date: "2026-04-06", name: "Easter Monday", region: "england_wales", year: 2026 },
  { date: "2026-05-04", name: "Early May Bank Holiday", region: "england_wales", year: 2026 },
  { date: "2026-05-25", name: "Spring Bank Holiday", region: "england_wales", year: 2026 },
  { date: "2026-08-31", name: "Summer Bank Holiday", region: "england_wales", year: 2026 },
  { date: "2026-12-25", name: "Christmas Day", region: "england_wales", year: 2026 },
  { date: "2026-12-28", name: "Boxing Day (substitute)", region: "england_wales", year: 2026 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const orgs = await base44.asServiceRole.entities.Organisation.list();
    if (!orgs || orgs.length === 0) {
      return Response.json({ error: "Organisation not found" }, { status: 404 });
    }

    const orgId = orgs[0].id;
    let created = 0;

    for (const bh of BANK_HOLIDAYS) {
      const existing = await base44.asServiceRole.entities.BankHoliday.filter({
        org_id: orgId,
        date: bh.date,
        region: bh.region,
      });

      if (!existing || existing.length === 0) {
        await base44.asServiceRole.entities.BankHoliday.create({
          org_id: orgId,
          ...bh,
          is_working_day_for_org: false,
        });
        created++;
      }
    }

    return Response.json({ message: `Seeded ${created} bank holidays` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});