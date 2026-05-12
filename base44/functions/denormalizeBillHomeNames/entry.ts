import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all bills and homes
    const [bills, homes] = await Promise.all([
      base44.entities.Bill.list(),
      base44.entities.Home.list(),
    ]);

    const homeMap = Object.fromEntries(homes.map(h => [h.id, h.name]));
    const results = [];

    const toUpdate = bills.filter(b => b.home_id && homeMap[b.home_id] && b.home_name !== homeMap[b.home_id]);
    
    // Batch update in chunks
    const chunkSize = 10;
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(bill => base44.entities.Bill.update(bill.id, { home_name: homeMap[bill.home_id] }))
      );
    }
    
    results.push({ status: 'updated', count: toUpdate.length });

    return Response.json({ success: true, total: bills.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});