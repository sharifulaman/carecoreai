import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { policyId, policyData } = await req.json();

    // Only process safeguarding policies that are being activated
    if (policyData.policy_type !== 'safeguarding' || policyData.status !== 'active') {
      return Response.json({ success: true });
    }

    const orgId = policyData.org_id;
    
    // Get staff to notify based on home scope
    let staffToNotify = [];
    if (policyData.applicable_to_all_homes) {
      staffToNotify = await base44.asServiceRole.entities.StaffProfile.filter({
        org_id: orgId,
        status: 'active'
      }, null, 500);
    } else {
      // Get staff whose home_ids overlap with applicable_home_ids
      const allStaff = await base44.asServiceRole.entities.StaffProfile.filter({
        org_id: orgId,
        status: 'active'
      }, null, 500);
      
      staffToNotify = allStaff.filter(s => 
        s.home_ids && s.home_ids.some(hid => policyData.applicable_home_ids.includes(hid))
      );
    }

    // Calculate acknowledgement deadline
    const effectiveDate = new Date(policyData.effective_date);
    const deadlineDate = new Date(effectiveDate);
    deadlineDate.setDate(deadlineDate.getDate() + (policyData.acknowledgement_deadline_days || 14));
    const deadlineDateStr = deadlineDate.toISOString().split('T')[0];

    // Create PolicyAcknowledgement records
    const acknowledgements = staffToNotify.map(staff => ({
      org_id: orgId,
      policy_id: policyId,
      policy_type: 'safeguarding',
      policy_version: policyData.version_number,
      policy_title: policyData.policy_title,
      staff_id: staff.id,
      staff_name: staff.full_name,
      staff_role: staff.role,
      home_ids: staff.home_ids || [],
      acknowledged: false,
      acknowledgement_deadline: deadlineDateStr,
      is_overdue: false
    }));

    await base44.asServiceRole.entities.PolicyAcknowledgement.bulkCreate(acknowledgements);

    // Send notifications to all staff
    for (const staff of staffToNotify) {
      if (staff.user_id) {
        await base44.asServiceRole.functions.invoke('createNotification', {
          user_id: staff.user_id,
          org_id: orgId,
          related_module: `Policy Update — ${policyData.policy_title}`,
          message: `A new safeguarding policy has been published. You must read and acknowledge this policy by ${deadlineDateStr}. Go to My HR to acknowledge.`,
          type: 'alert',
          priority: 'normal',
          link_url: '/my-hr?tab=policies',
          read: false,
          acknowledged: false
        });
      }
    }

    return Response.json({ 
      success: true, 
      acknowledgementsCreated: acknowledgements.length,
      notificationsSent: staffToNotify.filter(s => s.user_id).length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});