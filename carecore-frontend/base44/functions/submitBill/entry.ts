/**
 * submitBill — Bill Maker-Checker workflow
 *
 * On bill submission:
 *  1. Creates the Bill with approval_status = "pending_tl"
 *  2. Creates an ApprovalWorkflow record
 *  3. Notifies the TL assigned to the home
 *
 * On TL approval:
 *  - Bill → "pending_admin", notifies admin users
 *
 * On Admin approval:
 *  - Bill → "approved", bill is now payable
 *
 * On rejection (any step):
 *  - Bill → "rejected"
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, ...payload } = body;

    // Resolve submitter's StaffProfile
    const profiles = await base44.asServiceRole.entities.StaffProfile.filter({ email: user.email });
    const staffProfile = profiles?.[0] || null;
    if (!staffProfile) return Response.json({ error: 'No StaffProfile found for user' }, { status: 403 });

    const orgId = staffProfile.org_id;

    // ─── ACTION: submit ────────────────────────────────────────────────────────
    if (action === 'submit') {
      const billData = payload.bill;
      if (!billData) return Response.json({ error: 'bill data required' }, { status: 400 });

      const now = new Date().toISOString();

      // 1. Create Bill
      const bill = await base44.asServiceRole.entities.Bill.create({
        ...billData,
        org_id: orgId,
        approval_status: 'pending_tl',
        submitted_by_id: staffProfile.id,
        submitted_by_name: staffProfile.full_name || user.email,
        submitted_at: now,
      });

      // 2. Create ApprovalWorkflow
      const workflow = await base44.asServiceRole.entities.ApprovalWorkflow.create({
        org_id: orgId,
        entity_type: 'bill',
        entity_id: bill.id,
        entity_reference: `${billData.bill_type || 'Bill'} — ${billData.home_name || ''} — £${billData.amount}`,
        home_id: billData.home_id || '',
        home_name: billData.home_name || '',
        amount: billData.amount,
        status: 'pending_tl',
        current_step: 1,
        submitted_by: staffProfile.id,
        submitted_by_name: staffProfile.full_name || user.email,
        submitted_at: now,
      });

      // 3. Link workflow to bill
      await base44.asServiceRole.entities.Bill.update(bill.id, { workflow_id: workflow.id });

      // 4. Notify TL(s) assigned to this home
      if (billData.home_id) {
        const home = await base44.asServiceRole.entities.Home.get(billData.home_id);
        if (home?.team_leader_id) {
          await base44.asServiceRole.entities.Notification.create({
            org_id: orgId,
            recipient_id: home.team_leader_id,
            type: 'bill_approval_required',
            title: 'Bill Awaiting Your Approval',
            message: `A new bill has been submitted for ${home.name || 'your home'} — £${billData.amount} (${(billData.bill_type || '').replace(/_/g, ' ')}). Please review and approve.`,
            entity_type: 'Bill',
            entity_id: bill.id,
            priority: 'normal',
            read: false,
            created_at: now,
          });
        }
      }

      return Response.json({ data: { bill, workflow } });
    }

    // ─── ACTION: approve ───────────────────────────────────────────────────────
    if (action === 'approve') {
      const { bill_id, workflow_id } = payload;
      if (!bill_id || !workflow_id) return Response.json({ error: 'bill_id and workflow_id required' }, { status: 400 });

      const bill = await base44.asServiceRole.entities.Bill.get(bill_id);
      const workflow = await base44.asServiceRole.entities.ApprovalWorkflow.get(workflow_id);
      if (!bill || !workflow) return Response.json({ error: 'Record not found' }, { status: 404 });

      const now = new Date().toISOString();
      const approverName = staffProfile.full_name || user.email;
      const approverId = staffProfile.id;

      let newBillStatus, newWorkflowStatus, newStep, notifyMessage, notifyType;

      if (bill.approval_status === 'pending_tl') {
        newBillStatus = 'pending_admin';
        newWorkflowStatus = 'pending_admin';
        newStep = 2;
        notifyType = 'bill_approval_required';
        notifyMessage = `A bill for £${bill.amount} (${(bill.bill_type || '').replace(/_/g, ' ')}) has been approved by the Team Leader and needs Admin approval.`;

        await base44.asServiceRole.entities.Bill.update(bill_id, { approval_status: 'pending_admin' });
        await base44.asServiceRole.entities.ApprovalWorkflow.update(workflow_id, {
          status: 'pending_admin',
          current_step: 2,
          tl_approved_by: approverId,
          tl_approved_by_name: approverName,
          tl_approved_at: now,
        });

        // Notify admin users
        const admins = await base44.asServiceRole.entities.StaffProfile.filter({ org_id: orgId, role: 'admin' });
        for (const admin of (admins || [])) {
          await base44.asServiceRole.entities.Notification.create({
            org_id: orgId,
            recipient_id: admin.id,
            type: notifyType,
            title: 'Bill Awaiting Admin Approval',
            message: notifyMessage,
            entity_type: 'Bill',
            entity_id: bill_id,
            priority: 'normal',
            read: false,
            created_at: now,
          });
        }

      } else if (bill.approval_status === 'pending_admin') {
        newBillStatus = 'approved';
        newWorkflowStatus = 'approved';

        await base44.asServiceRole.entities.Bill.update(bill_id, { approval_status: 'approved' });
        await base44.asServiceRole.entities.ApprovalWorkflow.update(workflow_id, {
          status: 'approved',
          current_step: 3,
          admin_approved_by: approverId,
          admin_approved_by_name: approverName,
          admin_approved_at: now,
        });

        // Notify original submitter
        if (bill.submitted_by_id) {
          await base44.asServiceRole.entities.Notification.create({
            org_id: orgId,
            recipient_id: bill.submitted_by_id,
            type: 'bill_approved',
            title: 'Bill Approved',
            message: `Your bill for £${bill.amount} has been fully approved and is now payable.`,
            entity_type: 'Bill',
            entity_id: bill_id,
            priority: 'normal',
            read: false,
            created_at: now,
          });
        }

      } else {
        return Response.json({ error: `Bill is in status '${bill.approval_status}' — cannot approve` }, { status: 400 });
      }

      return Response.json({ success: true });
    }

    // ─── ACTION: reject ────────────────────────────────────────────────────────
    if (action === 'reject') {
      const { bill_id, workflow_id, rejection_reason } = payload;
      if (!bill_id || !workflow_id) return Response.json({ error: 'bill_id and workflow_id required' }, { status: 400 });

      const bill = await base44.asServiceRole.entities.Bill.get(bill_id);
      const now = new Date().toISOString();

      await base44.asServiceRole.entities.Bill.update(bill_id, { approval_status: 'rejected' });
      await base44.asServiceRole.entities.ApprovalWorkflow.update(workflow_id, {
        status: 'rejected',
        rejection_reason: rejection_reason || 'No reason given',
        rejected_by: staffProfile.id,
        rejected_by_name: staffProfile.full_name || user.email,
        rejected_at: now,
      });

      // Notify submitter
      if (bill?.submitted_by_id) {
        await base44.asServiceRole.entities.Notification.create({
          org_id: orgId,
          recipient_id: bill.submitted_by_id,
          type: 'bill_rejected',
          title: 'Bill Rejected',
          message: `Your bill for £${bill?.amount || '?'} was rejected. Reason: ${rejection_reason || 'No reason given'}`,
          entity_type: 'Bill',
          entity_id: bill_id,
          priority: 'high',
          read: false,
          created_at: now,
        });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});