import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all bills
    const bills = await base44.entities.Bill.list();
    if (bills.length === 0) {
      return Response.json({ error: 'No bills found' }, { status: 400 });
    }

    // Select first 4-5 bills
    const billsToUpdate = bills.slice(0, 5);
    const results = [];

    for (let i = 0; i < billsToUpdate.length; i++) {
      const bill = billsToUpdate[i];
      
      // Skip if already has image
      if (bill.image_url) {
        results.push({ id: bill.id, status: 'skipped', reason: 'Already has image' });
        continue;
      }

      // Generate receipt image
      const imagePrompt = `Create a realistic utility bill receipt/invoice for "${bill.supplier || 'Supplier'}". 
      Amount: £${bill.amount || 0}. 
      Due: ${bill.due_date || 'TBD'}. 
      Type: ${bill.bill_type || 'utilities'}.
      Make it look like a professional bill/receipt document with company letterhead, itemized charges, and payment terms. Professional, clean design.`;

      const imageResult = await base44.integrations.Core.GenerateImage({
        prompt: imagePrompt,
      });

      if (imageResult?.url) {
        // Update bill with image
        await base44.entities.Bill.update(bill.id, {
          image_url: imageResult.url,
          image_uploaded_at: new Date().toISOString(),
        });
        results.push({ id: bill.id, status: 'success', image_url: imageResult.url });
      } else {
        results.push({ id: bill.id, status: 'failed', reason: 'Image generation failed' });
      }
    }

    return Response.json({ success: true, updated: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});