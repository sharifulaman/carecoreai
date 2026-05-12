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
    const currentMonth = today.toISOString().slice(0, 7); // 2026-04
    const currentYear = today.getFullYear().toString();

    // 1. Update Bills to current month
    const bills = await base44.asServiceRole.entities.Bill.filter({ org_id }, '-created_date', 500);
    
    let billCount = 0;
    for (let idx = 0; idx < Math.min(bills.length, 50); idx++) {
      const bill = bills[idx];
      
      // Shift due_date to current month
      const newDueDate = `${currentMonth}-${String((idx % 25) + 1).padStart(2, '0')}`;
      
      await base44.asServiceRole.entities.Bill.update(bill.id, {
        due_date: newDueDate
      });
      billCount++;
    }

    // 2. Create HomeDocuments for homes
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id }, '-created_date', 50);
    const docTypes = ['gas_safety', 'electric_cert', 'eicr', 'fire_risk', 'insurance', 'lease'];
    const docTitles = {
      gas_safety: 'Gas Safety Certificate',
      electric_cert: 'Electrical Certificate',
      eicr: 'EICR Report',
      fire_risk: 'Fire Risk Assessment',
      insurance: 'Buildings Insurance',
      lease: 'Tenancy Agreement'
    };
    
    let docCount = 0;
    for (let idx = 0; idx < Math.min(homes.length, 10); idx++) {
      const home = homes[idx];
      
      // Create 1-2 documents per home
      for (let d = 0; d < (idx % 2 + 1); d++) {
        const docType = docTypes[d % docTypes.length];
        const issueDate = new Date(today);
        issueDate.setMonth(issueDate.getMonth() - 6);
        
        let expiryDate = new Date(issueDate);
        if (idx % 3 === 0) {
          // Expired
          expiryDate.setMonth(expiryDate.getMonth() + 11);
        } else if (idx % 3 === 1) {
          // Expiring soon (within 60 days)
          expiryDate.setMonth(expiryDate.getMonth() + 12);
          expiryDate.setDate(expiryDate.getDate() - 10); // 10 days before 1 year
        } else {
          // Far future
          expiryDate.setFullYear(expiryDate.getFullYear() + 2);
        }
        
        await base44.asServiceRole.entities.HomeDocument.create({
          org_id,
          home_id: home.id,
          title: docTitles[docType],
          document_type: docType,
          issue_date: issueDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          status: expiryDate < today ? 'expired' : 'current',
          reminder_days: 30
        });
        docCount++;
      }
    }

    return Response.json({
      success: true,
      billsUpdated: billCount,
      docsCreated: docCount,
      message: 'Monthly bills and documents fixed'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});