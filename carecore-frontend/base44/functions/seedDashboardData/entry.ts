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
    
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id }, '-created_date', 500);
    const residents = await base44.asServiceRole.entities.Resident.filter({ org_id }, '-created_date', 500);
    const existingPlacements = await base44.asServiceRole.entities.PlacementFee.filter({ org_id }, '-created_date', 500);

    let invoicesCreated = 0, billsCreated = 0, accidentsCreated = 0, logsCreated = 0, checksCreated = 0;

    // Create PlacementFees for each home+resident combo (bulk)
    const placementsToCreate = [];
    for (const home of homes) {
      const homeResidents = residents.filter(r => r.home_id === home.id);
      for (const resident of homeResidents) {
        const exists = existingPlacements.some(p => p.resident_id === resident.id && p.home_id === home.id);
        if (!exists) {
          placementsToCreate.push({
            org_id,
            resident_id: resident.id,
            home_id: home.id,
            local_authority: 'Test LA',
            weekly_rate: 800 + Math.random() * 400,
            monthly_equivalent: 3500 + Math.random() * 1600,
            fee_start_date: '2024-01-01',
            status: 'active',
            created_by: user.email
          });
        }
      }
    }
    if (placementsToCreate.length > 0) {
      await base44.asServiceRole.entities.PlacementFee.bulkCreate(placementsToCreate);
    }
    const allPlacements = await base44.asServiceRole.entities.PlacementFee.filter({ org_id }, '-created_date', 500);

    // Create invoices (bulk)
    const existingInvoices = await base44.asServiceRole.entities.PlacementInvoice.filter({ org_id });
    const invoicesToCreate = [];
    
    for (const home of homes) {
      const homeResidents = residents.filter(r => r.home_id === home.id);
      if (homeResidents.length === 0) continue;
      const resident = homeResidents[0];
      const placement = allPlacements.find(p => p.resident_id === resident.id && p.home_id === home.id);
      if (!placement) continue;
      
      for (let m = -5; m <= 0; m++) {
        const dateFrom = new Date(today);
        dateFrom.setMonth(dateFrom.getMonth() + m);
        dateFrom.setDate(1);
        
        const dateTo = new Date(dateFrom);
        dateTo.setMonth(dateTo.getMonth() + 1);
        dateTo.setDate(0);
        
        const monthStr = dateFrom.toISOString().slice(0, 7);
        const exists = existingInvoices.some(inv => inv.home_id === home.id && (inv.period_from || '').startsWith(monthStr));
        
        if (!exists) {
          const dailyRate = (placement.monthly_equivalent || 3500) / 30;
          const daysInPeriod = Math.ceil((dateTo - dateFrom) / 86400000);
          const amountDue = dailyRate * daysInPeriod;
          
          invoicesToCreate.push({
            org_id,
            placement_fee_id: placement.id,
            resident_id: resident.id,
            home_id: home.id,
            local_authority: 'Test LA',
            invoice_number: `INV-${home.id.slice(-4)}-${monthStr.replace('-', '')}`,
            invoice_date: dateFrom.toISOString().split('T')[0],
            period_from: dateFrom.toISOString().split('T')[0],
            period_to: dateTo.toISOString().split('T')[0],
            days_in_period: daysInPeriod,
            daily_rate: dailyRate,
            amount_due: amountDue,
            total_amount: amountDue + (Math.random() * 500),
            status: Math.random() > 0.2 ? 'paid' : 'sent',
            generated_by: user.email
          });
        }
      }
    }
    if (invoicesToCreate.length > 0) {
      await base44.asServiceRole.entities.PlacementInvoice.bulkCreate(invoicesToCreate);
      invoicesCreated = invoicesToCreate.length;
    }

    // Create bills (bulk)
    const existingBills = await base44.asServiceRole.entities.Bill.filter({ org_id });
    const billsToCreate = [];
    const billTypes = ['utilities', 'council_tax', 'insurance', 'rent', 'maintenance'];
    
    for (const home of homes) {
      for (let m = -5; m <= 0; m++) {
        const date = new Date(today);
        date.setMonth(date.getMonth() + m);
        const monthStr = date.toISOString().slice(0, 7);
        
        for (const billType of billTypes) {
          const exists = existingBills.some(b => b.home_id === home.id && b.bill_type === billType && (b.due_date || '').startsWith(monthStr));
          if (!exists) {
            const billDate = new Date(date);
            billDate.setDate(Math.floor(Math.random() * 28) + 1);
            
            billsToCreate.push({
              org_id,
              home_id: home.id,
              bill_type: billType,
              supplier: `${billType} supplier`,
              amount: billType === 'rent' ? 3500 : (500 + Math.random() * 1500),
              due_date: billDate.toISOString().split('T')[0],
              status: Math.random() > 0.15 ? 'paid' : 'overdue',
              is_direct_debit: Math.random() > 0.3
            });
          }
        }
      }
    }
    if (billsToCreate.length > 0) {
      await base44.asServiceRole.entities.Bill.bulkCreate(billsToCreate);
      billsCreated = billsToCreate.length;
    }

    // Accidents skipped - complex schema

    // Create daily logs (minimal - 1 per resident)
    const logsToCreate = [];
    const existingLogs = await base44.asServiceRole.entities.DailyLog.filter({ org_id });
    
    for (const resident of residents) {
      if (!existingLogs.some(l => l.resident_id === resident.id)) {
        const home = homes.find(h => h.id === resident.home_id);
        const shift = ['morning', 'afternoon', 'night'][Math.floor(Math.random() * 3)];
        
        logsToCreate.push({
          org_id,
          resident_id: resident.id,
          resident_name: resident.display_name,
          worker_id: user.email,
          worker_name: user.full_name || 'Staff',
          home_id: resident.home_id,
          home_name: home?.name || 'Home',
          date: today.toISOString().split('T')[0],
          shift,
          log_type: 'general',
          content: { notes: 'Daily activity logged' },
          flags: [],
          flagged: Math.random() > 0.85
        });
      }
    }
    if (logsToCreate.length > 0) {
      await base44.asServiceRole.entities.DailyLog.bulkCreate(logsToCreate);
      logsCreated = logsToCreate.length;
    }

    // Checks skipped - complex schema

    return Response.json({
      success: true,
      invoicesCreated,
      billsCreated,
      accidentsCreated,
      logsCreated,
      checksCreated,
      message: 'Dashboard supporting data created'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});