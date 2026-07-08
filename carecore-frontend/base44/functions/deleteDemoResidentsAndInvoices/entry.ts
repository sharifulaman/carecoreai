/**
 * deleteDemoResidentsAndInvoices
 * 
 * SAFE cleanup function — only deletes records tagged with:
 *   notes containing "carecore_seed_residents_invoices_v1"
 * 
 * Does NOT delete any record without this tag.
 * Admin-only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SEED_KEY = "carecore_seed_residents_invoices_v1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const entities = base44.asServiceRole.entities;
    let invoicesDeleted = 0;
    let feesDeleted = 0;
    let residentsDeleted = 0;

    // 1. Delete demo PlacementInvoices
    const invoices = await entities.PlacementInvoice.filter({});
    for (const inv of invoices) {
      if (inv.notes && inv.notes.includes(SEED_KEY)) {
        await entities.PlacementInvoice.delete(inv.id);
        invoicesDeleted++;
      }
    }

    // 2. Delete demo PlacementFees
    const fees = await entities.PlacementFee.filter({});
    for (const fee of fees) {
      if (fee.notes && fee.notes.includes(SEED_KEY)) {
        await entities.PlacementFee.delete(fee.id);
        feesDeleted++;
      }
    }

    // 3. Delete demo Residents
    const residents = await entities.Resident.filter({});
    for (const r of residents) {
      if (r.notes && r.notes.includes(SEED_KEY)) {
        await entities.Resident.delete(r.id);
        residentsDeleted++;
      }
    }

    return Response.json({
      success: true,
      invoices_deleted: invoicesDeleted,
      fees_deleted: feesDeleted,
      residents_deleted: residentsDeleted,
    });

  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});