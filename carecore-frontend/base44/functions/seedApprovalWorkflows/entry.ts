import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;
    const ORG_ID = "default_org";

    // ── Fetch real staff from database ──────────────────────────────────────
    const allStaff = await db.StaffProfile.filter({ org_id: ORG_ID });

    const supportWorkers = allStaff.filter(s => s.role === "support_worker");
    const teamLeaders = allStaff.filter(s => s.role === "team_leader");
    const admins = allStaff.filter(s => s.role === "admin" || s.role === "admin_officer" || s.role === "admin_manager");

    if (supportWorkers.length < 2) return Response.json({ error: "Need at least 2 support workers in DB" }, { status: 400 });
    if (teamLeaders.length < 1) return Response.json({ error: "Need at least 1 team leader in DB" }, { status: 400 });

    const sw = (i) => supportWorkers[i % supportWorkers.length];
    const tl = (i) => teamLeaders[i % teamLeaders.length];
    const admin = admins.length > 0 ? admins[0] : teamLeaders[0]; // fallback to TL if no admin

    // ── Fetch real homes ─────────────────────────────────────────────────────
    const allHomes = await db.Home.filter({ org_id: ORG_ID });
    const homes = allHomes.slice(0, 5);
    if (homes.length < 2) return Response.json({ error: "Need at least 2 homes in DB" }, { status: 400 });
    const home = (i) => homes[i % homes.length];

    const now = new Date();
    const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

    // ── Clear existing seed data ─────────────────────────────────────────────
    const existingWF = await db.ApprovalWorkflow.filter({ org_id: ORG_ID });
    const existingEV = await db.ApprovalWorkflowEvent.filter({ org_id: ORG_ID });
    for (const r of existingWF) await db.ApprovalWorkflow.delete(r.id);
    for (const r of existingEV) await db.ApprovalWorkflowEvent.delete(r.id);

    const workflows = [];
    const events = [];
    const wfKeys = [];

    const addWF = (key, wf) => { wfKeys.push(key); workflows.push(wf); };
    const addEV = (key, ev) => events.push({ ...ev, workflow_id: key });

    // ── GROUP 1: Pending TL approval ─────────────────────────────────────────

    addWF("wf1", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-001",
      entity_reference: "BILL-2026-001", home_id: home(0).id, home_name: home(0).name,
      amount: 342.50, status: "pending_tl", current_step: 1,
      submitted_by: sw(0).id, submitted_by_name: sw(0).full_name,
      submitted_at: daysAgo(2), notes: "Monthly electricity bill from British Gas",
    });
    addEV("wf1", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(0).id, actor_name: sw(0).full_name, step: 1, comment: "Submitting electricity bill for April", created_at: daysAgo(2) });

    addWF("wf2", {
      org_id: ORG_ID, entity_type: "visit_report", entity_id: "vr-seed-001",
      entity_reference: "VR-2026-015", home_id: home(1).id, home_name: home(1).name,
      status: "pending_tl", current_step: 1,
      submitted_by: sw(1).id, submitted_by_name: sw(1).full_name,
      submitted_at: daysAgo(1), notes: "Weekly visit report for w/e 27 April",
    });
    addEV("wf2", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(1).id, actor_name: sw(1).full_name, step: 1, comment: "Weekly visit report submitted", created_at: daysAgo(1) });

    addWF("wf3", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-002",
      entity_reference: "BILL-2026-002", home_id: home(2).id, home_name: home(2).name,
      amount: 875.00, status: "pending_tl", current_step: 1,
      submitted_by: sw(2).id, submitted_by_name: sw(2).full_name,
      submitted_at: daysAgo(3), notes: "Boiler repair invoice from PlumbRight Ltd",
    });
    addEV("wf3", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(2).id, actor_name: sw(2).full_name, step: 1, comment: "Emergency boiler repair, receipt attached", created_at: daysAgo(3) });

    addWF("wf4", {
      org_id: ORG_ID, entity_type: "expense_claim", entity_id: "exp-seed-001",
      entity_reference: "EXP-2026-009", home_id: home(3).id, home_name: home(3).name,
      amount: 54.20, status: "pending_tl", current_step: 1,
      submitted_by: sw(3).id, submitted_by_name: sw(3).full_name,
      submitted_at: daysAgo(1), notes: "Mileage claim for resident hospital appointments",
    });
    addEV("wf4", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(3).id, actor_name: sw(3).full_name, step: 1, comment: "Mileage for 3 hospital trips in April", created_at: daysAgo(1) });

    addWF("wf5", {
      org_id: ORG_ID, entity_type: "support_plan", entity_id: "sp-seed-001",
      entity_reference: "SP-2026-003", home_id: home(4).id, home_name: home(4).name,
      status: "pending_tl", current_step: 1,
      submitted_by: sw(0).id, submitted_by_name: sw(0).full_name,
      submitted_at: daysAgo(4), notes: "Quarterly support plan review for YP",
    });
    addEV("wf5", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(0).id, actor_name: sw(0).full_name, step: 1, comment: "Q2 support plan review completed", created_at: daysAgo(4) });

    // ── GROUP 2: TL approved — pending Admin ─────────────────────────────────

    addWF("wf6", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-003",
      entity_reference: "BILL-2026-003", home_id: home(0).id, home_name: home(0).name,
      amount: 180.00, status: "pending_admin", current_step: 2,
      submitted_by: sw(1).id, submitted_by_name: sw(1).full_name, submitted_at: daysAgo(6),
      tl_approved_by: tl(0).id, tl_approved_by_name: tl(0).full_name, tl_approved_at: daysAgo(4),
      notes: "Monthly council tax bill",
    });
    addEV("wf6", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(1).id, actor_name: sw(1).full_name, step: 1, comment: "Council tax bill for May", created_at: daysAgo(6) });
    addEV("wf6", { org_id: ORG_ID, event_type: "approved", actor_id: tl(0).id, actor_name: tl(0).full_name, step: 1, comment: "Verified against council tax schedule", created_at: daysAgo(4) });

    addWF("wf7", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-004",
      entity_reference: "BILL-2026-004", home_id: home(1).id, home_name: home(1).name,
      amount: 1240.00, status: "pending_admin", current_step: 2,
      submitted_by: sw(2).id, submitted_by_name: sw(2).full_name, submitted_at: daysAgo(8),
      tl_approved_by: tl(0).id, tl_approved_by_name: tl(0).full_name, tl_approved_at: daysAgo(5),
      notes: "Annual insurance renewal — Aviva",
    });
    addEV("wf7", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(2).id, actor_name: sw(2).full_name, step: 1, comment: "Annual insurance renewal invoice", created_at: daysAgo(8) });
    addEV("wf7", { org_id: ORG_ID, event_type: "approved", actor_id: tl(0).id, actor_name: tl(0).full_name, step: 1, comment: "Confirmed against insurance schedule", created_at: daysAgo(5) });

    addWF("wf8", {
      org_id: ORG_ID, entity_type: "expense_claim", entity_id: "exp-seed-002",
      entity_reference: "EXP-2026-010", home_id: home(2).id, home_name: home(2).name,
      amount: 128.75, status: "pending_admin", current_step: 2,
      submitted_by: sw(3).id, submitted_by_name: sw(3).full_name, submitted_at: daysAgo(7),
      tl_approved_by: tl(0).id, tl_approved_by_name: tl(0).full_name, tl_approved_at: daysAgo(5),
      notes: "Staff training travel and subsistence",
    });
    addEV("wf8", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(3).id, actor_name: sw(3).full_name, step: 1, comment: "Travel and subsistence for training day", created_at: daysAgo(7) });
    addEV("wf8", { org_id: ORG_ID, event_type: "approved", actor_id: tl(0).id, actor_name: tl(0).full_name, step: 1, comment: "Receipts checked and confirmed", created_at: daysAgo(5) });

    // ── GROUP 3: Admin approved — pending Finance ─────────────────────────────

    addWF("wf9", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-005",
      entity_reference: "BILL-2026-005", home_id: home(3).id, home_name: home(3).name,
      amount: 496.80, status: "pending_finance", current_step: 3,
      submitted_by: sw(0).id, submitted_by_name: sw(0).full_name, submitted_at: daysAgo(12),
      tl_approved_by: tl(0).id, tl_approved_by_name: tl(0).full_name, tl_approved_at: daysAgo(10),
      admin_approved_by: admin.id, admin_approved_by_name: admin.full_name, admin_approved_at: daysAgo(7),
      notes: "Gas and electricity combined bill",
    });
    addEV("wf9", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(0).id, actor_name: sw(0).full_name, step: 1, comment: "Combined energy bill Q1", created_at: daysAgo(12) });
    addEV("wf9", { org_id: ORG_ID, event_type: "approved", actor_id: tl(0).id, actor_name: tl(0).full_name, step: 1, comment: "Spot-checked against utility records", created_at: daysAgo(10) });
    addEV("wf9", { org_id: ORG_ID, event_type: "approved", actor_id: admin.id, actor_name: admin.full_name, step: 2, comment: "Verified against budget allocation", created_at: daysAgo(7) });

    addWF("wf10", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-006",
      entity_reference: "BILL-2026-006", home_id: home(4).id, home_name: home(4).name,
      amount: 968.00, status: "pending_finance", current_step: 3,
      submitted_by: sw(1).id, submitted_by_name: sw(1).full_name, submitted_at: daysAgo(14),
      tl_approved_by: tl(0).id, tl_approved_by_name: tl(0).full_name, tl_approved_at: daysAgo(11),
      admin_approved_by: admin.id, admin_approved_by_name: admin.full_name, admin_approved_at: daysAgo(8),
      notes: "Monthly rent invoice from landlord",
    });
    addEV("wf10", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(1).id, actor_name: sw(1).full_name, step: 1, comment: "May rent invoice received", created_at: daysAgo(14) });
    addEV("wf10", { org_id: ORG_ID, event_type: "approved", actor_id: tl(0).id, actor_name: tl(0).full_name, step: 1, comment: "Confirmed amount matches lease agreement", created_at: daysAgo(11) });
    addEV("wf10", { org_id: ORG_ID, event_type: "approved", actor_id: admin.id, actor_name: admin.full_name, step: 2, comment: "Approved — rent is budgeted", created_at: daysAgo(8) });

    addWF("wf11", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-007",
      entity_reference: "BILL-2026-007", home_id: home(0).id, home_name: home(0).name,
      amount: 220.00, status: "pending_finance", current_step: 3,
      submitted_by: sw(2).id, submitted_by_name: sw(2).full_name, submitted_at: daysAgo(10),
      tl_approved_by: tl(0).id, tl_approved_by_name: tl(0).full_name, tl_approved_at: daysAgo(8),
      admin_approved_by: admin.id, admin_approved_by_name: admin.full_name, admin_approved_at: daysAgo(5),
      notes: "Monthly commercial cleaning contract",
    });
    addEV("wf11", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(2).id, actor_name: sw(2).full_name, step: 1, comment: "Monthly cleaning invoice", created_at: daysAgo(10) });
    addEV("wf11", { org_id: ORG_ID, event_type: "approved", actor_id: tl(0).id, actor_name: tl(0).full_name, step: 1, comment: "Cleaning quality confirmed", created_at: daysAgo(8) });
    addEV("wf11", { org_id: ORG_ID, event_type: "approved", actor_id: admin.id, actor_name: admin.full_name, step: 2, comment: "Within monthly budget", created_at: daysAgo(5) });

    // ── GROUP 4: Fully approved ───────────────────────────────────────────────

    addWF("wf12", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-008",
      entity_reference: "BILL-2026-008", home_id: home(1).id, home_name: home(1).name,
      amount: 153.40, status: "approved", current_step: 4,
      submitted_by: sw(3).id, submitted_by_name: sw(3).full_name, submitted_at: daysAgo(20),
      tl_approved_by: tl(0).id, tl_approved_by_name: tl(0).full_name, tl_approved_at: daysAgo(18),
      admin_approved_by: admin.id, admin_approved_by_name: admin.full_name, admin_approved_at: daysAgo(15),
      finance_approved_by: admin.id, finance_approved_by_name: admin.full_name, finance_approved_at: daysAgo(12),
      posted_to_expenses: true, expense_reference: "EXP-REF-4421", notes: "Water rates Q1",
    });
    addEV("wf12", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(3).id, actor_name: sw(3).full_name, step: 1, comment: "Water rates Q1 invoice", created_at: daysAgo(20) });
    addEV("wf12", { org_id: ORG_ID, event_type: "approved", actor_id: tl(0).id, actor_name: tl(0).full_name, step: 1, comment: "Confirmed correct amount", created_at: daysAgo(18) });
    addEV("wf12", { org_id: ORG_ID, event_type: "approved", actor_id: admin.id, actor_name: admin.full_name, step: 2, comment: "Budget check passed", created_at: daysAgo(15) });
    addEV("wf12", { org_id: ORG_ID, event_type: "approved", actor_id: admin.id, actor_name: admin.full_name, step: 3, comment: "Payment processed", created_at: daysAgo(12) });
    addEV("wf12", { org_id: ORG_ID, event_type: "posted", actor_id: admin.id, actor_name: admin.full_name, step: 3, comment: "Posted to HomeExpense ref EXP-REF-4421", created_at: daysAgo(12) });

    // ── GROUP 5: Rejected ─────────────────────────────────────────────────────

    addWF("wf13", {
      org_id: ORG_ID, entity_type: "bill", entity_id: "bill-seed-009",
      entity_reference: "BILL-2026-009", home_id: home(2).id, home_name: home(2).name,
      amount: 2100.00, status: "rejected", current_step: 2,
      submitted_by: sw(0).id, submitted_by_name: sw(0).full_name, submitted_at: daysAgo(9),
      tl_approved_by: tl(0).id, tl_approved_by_name: tl(0).full_name, tl_approved_at: daysAgo(7),
      rejection_reason: "Amount does not match quoted price. Please resubmit with correct invoice.",
      rejected_by: admin.id, rejected_by_name: admin.full_name, rejected_at: daysAgo(4),
      notes: "Kitchen renovation — contractor invoice",
    });
    addEV("wf13", { org_id: ORG_ID, event_type: "submitted", actor_id: sw(0).id, actor_name: sw(0).full_name, step: 1, comment: "Kitchen renovation invoice", created_at: daysAgo(9) });
    addEV("wf13", { org_id: ORG_ID, event_type: "approved", actor_id: tl(0).id, actor_name: tl(0).full_name, step: 1, comment: "Work completed satisfactorily", created_at: daysAgo(7) });
    addEV("wf13", { org_id: ORG_ID, event_type: "rejected", actor_id: admin.id, actor_name: admin.full_name, step: 2, comment: "Amount does not match quoted price.", created_at: daysAgo(4) });

    // ── Insert all ────────────────────────────────────────────────────────────
    const idMap = {};
    for (let i = 0; i < workflows.length; i++) {
      const created = await db.ApprovalWorkflow.create(workflows[i]);
      idMap[wfKeys[i]] = created.id;
    }

    for (const ev of events) {
      const realId = idMap[ev.workflow_id];
      if (!realId) continue;
      await db.ApprovalWorkflowEvent.create({ ...ev, workflow_id: realId });
    }

    return Response.json({
      success: true,
      workflows_created: workflows.length,
      events_created: events.length,
      staff_used: {
        support_workers: supportWorkers.slice(0, 4).map(s => s.full_name),
        team_leaders: teamLeaders.map(s => s.full_name),
        admin: admin.full_name,
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});