import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all active placement fees
    const placements = await base44.entities.PlacementFee.list('-created_date', 500);
    const activePlacements = placements.filter(p => p.status === 'active');

    if (activePlacements.length === 0) {
      return Response.json({ message: 'No active placements found', created: 0 });
    }

    // Generate invoices for last 6 months
    const invoices = [];
    const now = new Date();
    
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      
      // Period: 1st of month to last day of month
      const periodFrom = new Date(year, month, 1);
      const periodTo = new Date(year, month + 1, 0);
      
      // Days in period
      const days = Math.max(1, Math.floor((periodTo - periodFrom) / (1000 * 60 * 60 * 24)) + 1);
      
      // Create invoice for each active placement
      for (const placement of activePlacements) {
        const daily = placement.weekly_rate ? (placement.weekly_rate / 7) : 0;
        const total = daily * days;
        
        const invNum = `INV-${year}-${String(month + 1).padStart(2, '0')}-${placement.resident_id?.substring(0, 6).toUpperCase() || 'YP'}`;
        
        invoices.push({
          org_id: user.org_id || 'default',
          placement_fee_id: placement.id,
          resident_id: placement.resident_id,
          home_id: placement.home_id,
          local_authority: placement.local_authority || '',
          invoice_number: invNum,
          invoice_date: new Date(year, month, 15).toISOString().split('T')[0],
          period_from: periodFrom.toISOString().split('T')[0],
          period_to: periodTo.toISOString().split('T')[0],
          days_in_period: days,
          daily_rate: daily,
          amount_due: total,
          additional_items: [],
          total_amount: total,
          status: Math.random() > 0.3 ? 'paid' : 'sent',
          sent_date: monthOffset > 0 ? new Date(year, month + 1, 5).toISOString().split('T')[0] : null,
          paid_date: Math.random() > 0.3 && monthOffset > 0 ? new Date(year, month + 1, 10).toISOString().split('T')[0] : null,
          payment_reference: Math.random() > 0.3 && monthOffset > 0 ? `PAY-${Math.random().toString(36).substring(7).toUpperCase()}` : null,
          notes: '',
          generated_by: user.email,
        });
      }
    }

    // Bulk create invoices
    if (invoices.length > 0) {
      await base44.entities.PlacementInvoice.bulkCreate(invoices);
    }

    return Response.json({
      message: 'Invoices seeded successfully',
      created: invoices.length,
      placements: activePlacements.length,
      months: 6,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});