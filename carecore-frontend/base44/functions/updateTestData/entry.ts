import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const org_id = 'default_org';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Update Bills with varied statuses
    const bills = await base44.asServiceRole.entities.Bill.filter({ org_id }, '-created_date', 100);
    
    let billCount = 0;
    for (let idx = 0; idx < bills.length; idx++) {
      const bill = bills[idx];
      let status = 'pending';
      let paid_date = null;
      
      if (idx % 5 === 0) {
        status = 'paid';
        paid_date = bill.due_date;
      } else if (idx % 5 === 1) {
        status = 'overdue';
      } else if (idx % 5 === 2) {
        status = 'overdue';
      } else if (idx % 5 === 3) {
        status = 'pending';
      }
      
      await base44.asServiceRole.entities.Bill.update(bill.id, {
        status,
        paid_date: paid_date || null,
        is_direct_debit: idx % 3 === 0
      });
      billCount++;
    }

    // 2. Update Homes with varied lease end dates
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id }, '-created_date', 50);
    
    let homeCount = 0;
    for (let idx = 0; idx < homes.length; idx++) {
      const home = homes[idx];
      let lease_end = null;
      
      if (idx % 4 === 0) {
        // Expired leases (past)
        const expiredDate = new Date(today);
        expiredDate.setMonth(expiredDate.getMonth() - (idx % 3 + 1));
        lease_end = expiredDate.toISOString().split('T')[0];
      } else if (idx % 4 === 1) {
        // Expiring soon (within 90 days)
        const soonDate = new Date(today);
        soonDate.setDate(soonDate.getDate() + (30 + (idx % 2) * 15));
        lease_end = soonDate.toISOString().split('T')[0];
      } else if (idx % 4 === 2) {
        // Far future
        const futureDate = new Date(today);
        futureDate.setFullYear(futureDate.getFullYear() + 2);
        lease_end = futureDate.toISOString().split('T')[0];
      }
      
      await base44.asServiceRole.entities.Home.update(home.id, { lease_end });
      homeCount++;
    }

    return Response.json({
      success: true,
      billsUpdated: billCount,
      homesUpdated: homeCount,
      message: 'Test data updated with varied statuses and lease dates'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});