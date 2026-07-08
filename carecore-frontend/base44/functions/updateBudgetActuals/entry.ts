import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * updateBudgetActuals — called when a Bill is paid or a HomeExpense is approved.
 * Finds the matching HomeBudgetLine and updates its actual_amount.
 *
 * Payload:
 *   { entity: "Bill"|"HomeExpense", record_id: string, delta: number }
 *   delta = positive amount to add, negative to subtract (for deletions/reversals)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity, record_id, delta } = await req.json();
    if (!entity || !record_id || delta === undefined) {
      return Response.json({ error: 'Missing entity, record_id, or delta' }, { status: 400 });
    }

    // Fetch the record
    const record = await base44.asServiceRole.entities[entity].get(record_id);
    if (!record?.budget_id) {
      return Response.json({ status: 'skipped', reason: 'No budget_id on record' });
    }

    // Map entity expense_type / bill_type to HomeBudgetLine.category
    const category = record.bill_type || record.expense_type || null;

    // Find matching HomeBudgetLine
    const lines = await base44.asServiceRole.entities.HomeBudgetLine.filter({
      budget_id: record.budget_id,
    });

    const matchingLine = lines.find(l =>
      l.category === category || (!category && lines.length === 1)
    );

    if (!matchingLine) {
      return Response.json({ status: 'skipped', reason: 'No matching HomeBudgetLine found', budget_id: record.budget_id, category });
    }

    const current = matchingLine.actual_amount || 0;
    const updated = Math.max(0, current + delta);

    await base44.asServiceRole.entities.HomeBudgetLine.update(matchingLine.id, {
      actual_amount: updated,
    });

    return Response.json({
      status: 'updated',
      budget_line_id: matchingLine.id,
      previous_actual: current,
      new_actual: updated,
      delta,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});