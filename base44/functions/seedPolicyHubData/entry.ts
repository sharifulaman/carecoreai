import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ORG_ID = 'default_org';
    const now = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];

    // ── Helper: date offset ────────────────────────────────────────────────────
    const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const subDays = (d, n) => addDays(d, -n);

    // ── 1. Fetch existing staff ───────────────────────────────────────────────
    const allStaff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id: ORG_ID }, '-created_date', 50);
    const activeStaff = allStaff.filter(s => s.status === 'active').slice(0, 12);

    if (activeStaff.length === 0) {
      return Response.json({ error: 'No active staff found. Please seed staff first.' }, { status: 400 });
    }

    // ── 2. Fetch existing homes ────────────────────────────────────────────────
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id: ORG_ID }, '-created_date', 10);
    const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

    // ── 3. Clear existing policy hub data ────────────────────────────────────
    const [existingPolicies, existingAssignments, existingBatches, existingActivity, existingReminders, existingGroups, existingVersions] = await Promise.all([
      base44.asServiceRole.entities.HRPolicy.filter({ org_id: ORG_ID }, '-created_date', 100),
      base44.asServiceRole.entities.HRPolicyStaffAssignment.filter({ org_id: ORG_ID }, '-created_date', 500),
      base44.asServiceRole.entities.HRPolicyAssignmentBatch.filter({ org_id: ORG_ID }, '-created_date', 100),
      base44.asServiceRole.entities.HRPolicyActivityEvent.filter({ org_id: ORG_ID }, '-created_date', 100),
      base44.asServiceRole.entities.HRPolicyReminder.filter({ org_id: ORG_ID }, '-created_date', 100),
      base44.asServiceRole.entities.HRPolicyGroup.filter({ org_id: ORG_ID }, '-created_date', 20),
      base44.asServiceRole.entities.HRPolicyVersion.filter({ org_id: ORG_ID }, '-created_date', 100),
    ]);

    // Delete all existing records
    await Promise.all([
      ...existingPolicies.map(p => base44.asServiceRole.entities.HRPolicy.delete(p.id)),
      ...existingAssignments.map(a => base44.asServiceRole.entities.HRPolicyStaffAssignment.delete(a.id)),
      ...existingBatches.map(b => base44.asServiceRole.entities.HRPolicyAssignmentBatch.delete(b.id)),
      ...existingActivity.map(e => base44.asServiceRole.entities.HRPolicyActivityEvent.delete(e.id)),
      ...existingReminders.map(r => base44.asServiceRole.entities.HRPolicyReminder.delete(r.id)),
      ...existingGroups.map(g => base44.asServiceRole.entities.HRPolicyGroup.delete(g.id)),
      ...existingVersions.map(v => base44.asServiceRole.entities.HRPolicyVersion.delete(v.id)),
    ]);

    // ── 4. Seed Policies ──────────────────────────────────────────────────────
    const adminStaff = activeStaff.find(s => s.role === 'admin' || s.role === 'admin_officer') || activeStaff[0];

    const POLICIES_DATA = [
      {
        policy_title: 'Safeguarding Children & Young People Policy',
        policy_code: 'SG-001',
        category: 'Safeguarding',
        policy_type: 'Mandatory',
        description: 'This policy outlines our approach to safeguarding and promoting the welfare of children and young people in our care.',
        owner_department: 'Care Management',
        current_version_number: '3.2',
        status: 'Active',
        requires_acknowledgement: true,
        effective_date: fmt(subDays(now, 90)),
        review_date: fmt(addDays(now, 275)),
        notes: 'All staff must acknowledge within 14 days of joining.',
      },
      {
        policy_title: 'Health & Safety Policy',
        policy_code: 'HS-001',
        category: 'Health & Safety',
        policy_type: 'Mandatory',
        description: 'Outlines the organisation\'s commitment to maintaining a safe and healthy working environment for all staff, residents and visitors.',
        owner_department: 'Operations',
        current_version_number: '2.1',
        status: 'Active',
        requires_acknowledgement: true,
        effective_date: fmt(subDays(now, 180)),
        review_date: fmt(addDays(now, 185)),
        notes: 'Annual review required.',
      },
      {
        policy_title: 'Data Protection & GDPR Policy',
        policy_code: 'IT-001',
        category: 'IT & Data',
        policy_type: 'Mandatory',
        description: 'Sets out how we collect, use, store and protect personal data in compliance with GDPR and the Data Protection Act 2018.',
        owner_department: 'IT & Compliance',
        current_version_number: '1.4',
        status: 'Active',
        requires_acknowledgement: true,
        effective_date: fmt(subDays(now, 60)),
        review_date: fmt(addDays(now, 305)),
        notes: '',
      },
      {
        policy_title: 'Medication Administration Policy',
        policy_code: 'CL-001',
        category: 'Clinical',
        policy_type: 'Mandatory',
        description: 'Provides guidance on the safe administration and recording of medication for residents.',
        owner_department: 'Clinical',
        current_version_number: '2.0',
        status: 'Active',
        requires_acknowledgement: true,
        effective_date: fmt(subDays(now, 120)),
        review_date: fmt(addDays(now, 245)),
        notes: 'Support workers and team leaders only.',
      },
      {
        policy_title: 'Whistleblowing Policy',
        policy_code: 'HR-001',
        category: 'HR',
        policy_type: 'Advisory',
        description: 'Encourages staff to raise concerns about wrongdoing without fear of victimisation.',
        owner_department: 'HR',
        current_version_number: '1.1',
        status: 'Active',
        requires_acknowledgement: false,
        effective_date: fmt(subDays(now, 200)),
        review_date: fmt(addDays(now, 165)),
        notes: '',
      },
      {
        policy_title: 'Equality, Diversity & Inclusion Policy',
        policy_code: 'HR-002',
        category: 'HR',
        policy_type: 'Mandatory',
        description: 'Sets out our commitment to equality and diversity across all aspects of our work.',
        owner_department: 'HR',
        current_version_number: '1.3',
        status: 'Active',
        requires_acknowledgement: true,
        effective_date: fmt(subDays(now, 150)),
        review_date: fmt(addDays(now, 215)),
        notes: '',
      },
      {
        policy_title: 'Fire Safety & Evacuation Procedure',
        policy_code: 'HS-002',
        category: 'Health & Safety',
        policy_type: 'Mandatory',
        description: 'Outlines fire prevention measures, evacuation procedures and staff responsibilities.',
        owner_department: 'Operations',
        current_version_number: '1.0',
        status: 'Active',
        requires_acknowledgement: true,
        effective_date: fmt(subDays(now, 30)),
        review_date: fmt(addDays(now, 335)),
        notes: '',
      },
      {
        policy_title: 'Social Media & Communications Policy',
        policy_code: 'IT-002',
        category: 'IT & Data',
        policy_type: 'Advisory',
        description: 'Guidance on appropriate use of social media and communication tools in relation to the organisation and its service users.',
        owner_department: 'IT & Compliance',
        current_version_number: '2.2',
        status: 'Draft',
        requires_acknowledgement: false,
        effective_date: fmt(addDays(now, 14)),
        review_date: fmt(addDays(now, 379)),
        notes: 'Pending final review before publishing.',
      },
      {
        policy_title: 'Anti-Bribery & Fraud Policy',
        policy_code: 'FI-001',
        category: 'Finance',
        policy_type: 'Mandatory',
        description: 'Sets out the organisation\'s zero-tolerance approach to bribery, corruption and fraud.',
        owner_department: 'Finance',
        current_version_number: '1.0',
        status: 'Active',
        requires_acknowledgement: true,
        effective_date: fmt(subDays(now, 75)),
        review_date: fmt(addDays(now, 290)),
        notes: '',
      },
      {
        policy_title: 'Physical Intervention & Positive Handling Policy',
        policy_code: 'SG-002',
        category: 'Safeguarding',
        policy_type: 'Mandatory',
        description: 'Outlines permitted physical interventions, training requirements and de-escalation strategies.',
        owner_department: 'Care Management',
        current_version_number: '2.5',
        status: 'Archived',
        requires_acknowledgement: true,
        effective_date: fmt(subDays(now, 400)),
        review_date: fmt(subDays(now, 35)),
        archived_at: subDays(now, 10).toISOString(),
        notes: 'Superseded by updated version — pending upload.',
      },
    ];

    const createdPolicies = [];
    for (const p of POLICIES_DATA) {
      const created = await base44.asServiceRole.entities.HRPolicy.create({
        org_id: ORG_ID,
        ...p,
        current_file_name: `${p.policy_code}_${p.current_version_number.replace('.', '_')}.pdf`,
        created_by_staff_id: adminStaff.id,
        created_by_name: adminStaff.full_name,
      });
      createdPolicies.push(created);
    }

    // ── 5. Seed Policy Versions ──────────────────────────────────────────────
    for (const policy of createdPolicies.filter(p => p.status !== 'Draft')) {
      await base44.asServiceRole.entities.HRPolicyVersion.create({
        org_id: ORG_ID,
        policy_id: policy.id,
        policy_title: policy.policy_title,
        version_number: policy.current_version_number,
        file_name: policy.current_file_name,
        file_type: 'application/pdf',
        uploaded_by_staff_id: adminStaff.id,
        uploaded_by_name: adminStaff.full_name,
        effective_date: policy.effective_date,
        review_date: policy.review_date,
        status: policy.status === 'Archived' ? 'Archived' : 'Active',
      });
    }

    // ── 6. Seed Groups ────────────────────────────────────────────────────────
    const adminGroup = await base44.asServiceRole.entities.HRPolicyGroup.create({
      org_id: ORG_ID,
      group_name: 'All Support Workers',
      description: 'All active support workers across all homes',
      role_filters: ['support_worker'],
      member_staff_ids: activeStaff.filter(s => s.role === 'support_worker').map(s => s.id),
      member_staff_names: activeStaff.filter(s => s.role === 'support_worker').map(s => s.full_name),
      member_count: activeStaff.filter(s => s.role === 'support_worker').length,
      created_by_staff_id: adminStaff.id,
      created_by_name: adminStaff.full_name,
      status: 'Active',
    });

    const tlGroup = await base44.asServiceRole.entities.HRPolicyGroup.create({
      org_id: ORG_ID,
      group_name: 'Clinical Staff',
      description: 'Team leaders and support workers responsible for care delivery',
      role_filters: ['team_leader', 'support_worker'],
      member_staff_ids: activeStaff.filter(s => ['team_leader', 'support_worker'].includes(s.role)).map(s => s.id),
      member_staff_names: activeStaff.filter(s => ['team_leader', 'support_worker'].includes(s.role)).map(s => s.full_name),
      member_count: activeStaff.filter(s => ['team_leader', 'support_worker'].includes(s.role)).length,
      created_by_staff_id: adminStaff.id,
      created_by_name: adminStaff.full_name,
      status: 'Active',
    });

    // ── 7. Seed Assignment Batches & Staff Assignments ────────────────────────
    const DEPT_LABELS = {
      admin: 'Administration',
      admin_officer: 'Administration',
      team_leader: 'Care Management',
      support_worker: 'Care & Support',
    };

    // Policy 1: Safeguarding — assign to ALL staff
    const sgPolicy = createdPolicies.find(p => p.policy_code === 'SG-001');
    const sgBatch = await base44.asServiceRole.entities.HRPolicyAssignmentBatch.create({
      org_id: ORG_ID,
      policy_id: sgPolicy.id,
      policy_title: sgPolicy.policy_title,
      policy_version_number: sgPolicy.current_version_number,
      assignment_name: 'Safeguarding Policy — All Staff 2025',
      assignment_scope: 'All Staff',
      assigned_by_staff_id: adminStaff.id,
      assigned_by_name: adminStaff.full_name,
      assigned_at: subDays(now, 45).toISOString(),
      due_date: fmt(subDays(now, 10)),
      requires_acknowledgement: true,
      reminder_enabled: true,
      reminder_frequency: 'Weekly',
      status: 'Active',
      staff_count: activeStaff.length,
    });

    // Policy 2: Health & Safety — assign to all staff
    const hsPolicy = createdPolicies.find(p => p.policy_code === 'HS-001');
    const hsBatch = await base44.asServiceRole.entities.HRPolicyAssignmentBatch.create({
      org_id: ORG_ID,
      policy_id: hsPolicy.id,
      policy_title: hsPolicy.policy_title,
      policy_version_number: hsPolicy.current_version_number,
      assignment_name: 'Health & Safety Policy — Annual Review',
      assignment_scope: 'All Staff',
      assigned_by_staff_id: adminStaff.id,
      assigned_by_name: adminStaff.full_name,
      assigned_at: subDays(now, 20).toISOString(),
      due_date: fmt(addDays(now, 14)),
      requires_acknowledgement: true,
      reminder_enabled: true,
      reminder_frequency: 'Every 3 days',
      status: 'Active',
      staff_count: activeStaff.length,
    });

    // Policy 3: GDPR — assign to admin + TL roles
    const gdprPolicy = createdPolicies.find(p => p.policy_code === 'IT-001');
    const gdprStaff = activeStaff.filter(s => ['admin', 'admin_officer', 'team_leader'].includes(s.role));
    const gdprBatch = await base44.asServiceRole.entities.HRPolicyAssignmentBatch.create({
      org_id: ORG_ID,
      policy_id: gdprPolicy.id,
      policy_title: gdprPolicy.policy_title,
      policy_version_number: gdprPolicy.current_version_number,
      assignment_name: 'GDPR Policy — Managers & Admins',
      assignment_scope: 'Role',
      assigned_by_staff_id: adminStaff.id,
      assigned_by_name: adminStaff.full_name,
      assigned_at: subDays(now, 30).toISOString(),
      due_date: fmt(addDays(now, 7)),
      requires_acknowledgement: true,
      reminder_enabled: false,
      status: 'Active',
      staff_count: gdprStaff.length,
    });

    // Policy 4: Medication — support workers only
    const medPolicy = createdPolicies.find(p => p.policy_code === 'CL-001');
    const medStaff = activeStaff.filter(s => ['support_worker', 'team_leader'].includes(s.role));
    const medBatch = await base44.asServiceRole.entities.HRPolicyAssignmentBatch.create({
      org_id: ORG_ID,
      policy_id: medPolicy.id,
      policy_title: medPolicy.policy_title,
      policy_version_number: medPolicy.current_version_number,
      assignment_name: 'Medication Policy — Care Staff',
      assignment_scope: 'Role',
      assigned_by_staff_id: adminStaff.id,
      assigned_by_name: adminStaff.full_name,
      assigned_at: subDays(now, 60).toISOString(),
      due_date: fmt(subDays(now, 30)),
      requires_acknowledgement: true,
      reminder_enabled: true,
      reminder_frequency: 'Daily',
      status: 'Active',
      staff_count: medStaff.length,
    });

    // Policy 5: EDI — all staff
    const ediPolicy = createdPolicies.find(p => p.policy_code === 'HR-002');
    const ediBatch = await base44.asServiceRole.entities.HRPolicyAssignmentBatch.create({
      org_id: ORG_ID,
      policy_id: ediPolicy.id,
      policy_title: ediPolicy.policy_title,
      policy_version_number: ediPolicy.current_version_number,
      assignment_name: 'EDI Policy — All Staff',
      assignment_scope: 'All Staff',
      assigned_by_staff_id: adminStaff.id,
      assigned_by_name: adminStaff.full_name,
      assigned_at: subDays(now, 90).toISOString(),
      due_date: fmt(subDays(now, 60)),
      requires_acknowledgement: true,
      reminder_enabled: false,
      status: 'Active',
      staff_count: activeStaff.length,
    });

    // ── 8. Seed Individual Staff Assignments ──────────────────────────────────
    const assignmentRecords = [];

    // Helper to create one staff assignment record
    const makeAssignment = (batch, policy, staffMember, overrideStatus) => {
      const home = homes.find(h => (staffMember.home_ids || []).includes(h.id));
      const dept = DEPT_LABELS[staffMember.role] || 'General';
      const rand = Math.random();

      let status, viewed_at, acknowledged_at;
      if (overrideStatus === 'Acknowledged') {
        viewed_at = addDays(new Date(batch.assigned_at), Math.floor(Math.random() * 5 + 1)).toISOString();
        acknowledged_at = addDays(new Date(viewed_at), Math.floor(Math.random() * 3 + 1)).toISOString();
        status = 'Acknowledged';
      } else if (overrideStatus === 'Viewed') {
        viewed_at = addDays(new Date(batch.assigned_at), Math.floor(Math.random() * 7 + 1)).toISOString();
        acknowledged_at = null;
        status = 'Viewed';
      } else if (overrideStatus === 'Overdue') {
        viewed_at = null;
        acknowledged_at = null;
        status = 'Assigned';
      } else {
        // auto assign
        if (rand < 0.55) {
          viewed_at = addDays(new Date(batch.assigned_at), Math.floor(Math.random() * 8 + 1)).toISOString();
          acknowledged_at = addDays(new Date(viewed_at), Math.floor(Math.random() * 4 + 1)).toISOString();
          status = 'Acknowledged';
        } else if (rand < 0.72) {
          viewed_at = addDays(new Date(batch.assigned_at), Math.floor(Math.random() * 10 + 1)).toISOString();
          acknowledged_at = null;
          status = 'Viewed';
        } else {
          viewed_at = null;
          acknowledged_at = null;
          status = 'Assigned';
        }
      }

      return {
        org_id: ORG_ID,
        assignment_batch_id: batch.id,
        policy_id: policy.id,
        policy_title: policy.policy_title,
        policy_version_number: policy.current_version_number,
        staff_id: staffMember.id,
        staff_name: staffMember.full_name,
        staff_role: staffMember.role,
        staff_department: dept,
        staff_home_id: home?.id || '',
        staff_home_name: home?.name || '',
        assigned_by_staff_id: adminStaff.id,
        assigned_by_name: adminStaff.full_name,
        assigned_at: batch.assigned_at,
        due_date: batch.due_date,
        status,
        viewed_at: viewed_at || null,
        acknowledged_at: acknowledged_at || null,
        acknowledgement_required: batch.requires_acknowledgement,
        acknowledgement_text: acknowledged_at ? 'I confirm that I have read and understood this policy.' : null,
        reminder_count: Math.floor(Math.random() * 3),
        file_name: policy.current_file_name || '',
      };
    };

    // Safeguarding — all staff, mixed statuses
    for (const s of activeStaff) {
      const i = activeStaff.indexOf(s);
      const override = i < 5 ? 'Acknowledged' : i < 8 ? 'Viewed' : 'Overdue';
      assignmentRecords.push(makeAssignment(sgBatch, sgPolicy, s, override));
    }

    // Health & Safety — all staff, mostly acknowledged
    for (const s of activeStaff) {
      const i = activeStaff.indexOf(s);
      const override = i < 8 ? 'Acknowledged' : i < 10 ? 'Viewed' : null;
      assignmentRecords.push(makeAssignment(hsBatch, hsPolicy, s, override));
    }

    // GDPR — managers only, mostly done
    for (const s of gdprStaff) {
      const i = gdprStaff.indexOf(s);
      const override = i < Math.ceil(gdprStaff.length * 0.7) ? 'Acknowledged' : 'Viewed';
      assignmentRecords.push(makeAssignment(gdprBatch, gdprPolicy, s, override));
    }

    // Medication — care staff, some overdue
    for (const s of medStaff) {
      const i = medStaff.indexOf(s);
      const override = i < Math.ceil(medStaff.length * 0.4) ? 'Acknowledged' : i < Math.ceil(medStaff.length * 0.6) ? 'Viewed' : 'Overdue';
      assignmentRecords.push(makeAssignment(medBatch, medPolicy, s, override));
    }

    // EDI — all staff, mostly done (old assignment)
    for (const s of activeStaff) {
      const override = Math.random() < 0.75 ? 'Acknowledged' : 'Viewed';
      assignmentRecords.push(makeAssignment(ediBatch, ediPolicy, s, override));
    }

    // Insert all assignment records
    for (const record of assignmentRecords) {
      await base44.asServiceRole.entities.HRPolicyStaffAssignment.create(record);
    }

    // ── 9. Seed Reminders ─────────────────────────────────────────────────────
    const overdueAssignments = assignmentRecords.filter(a => a.status === 'Assigned' && a.due_date < fmt(now));
    for (const a of overdueAssignments.slice(0, 5)) {
      await base44.asServiceRole.entities.HRPolicyReminder.create({
        org_id: ORG_ID,
        policy_id: a.policy_id,
        policy_title: a.policy_title,
        staff_id: a.staff_id,
        staff_name: a.staff_name,
        sent_by_staff_id: adminStaff.id,
        sent_by_name: adminStaff.full_name,
        sent_at: subDays(now, 3).toISOString(),
        reminder_type: 'Manual',
        message: `Reminder: Please read and acknowledge the "${a.policy_title}" policy. Your acknowledgement is overdue.`,
        status: 'Sent',
      });
    }

    // ── 10. Seed Activity Events ──────────────────────────────────────────────
    const activityEvents = [
      ...createdPolicies.map((p, i) => ({
        org_id: ORG_ID,
        event_type: 'Policy Uploaded',
        event_title: `Policy uploaded: ${p.policy_title} v${p.current_version_number}`,
        event_description: `Uploaded by ${adminStaff.full_name}`,
        policy_id: p.id,
        policy_title: p.policy_title,
        performed_by_staff_id: adminStaff.id,
        performed_by_name: adminStaff.full_name,
        event_date: subDays(now, 90 - i * 5).toISOString(),
      })),
      {
        org_id: ORG_ID,
        event_type: 'Policy Assigned',
        event_title: `Safeguarding Policy assigned to ${activeStaff.length} staff`,
        policy_id: sgPolicy.id,
        policy_title: sgPolicy.policy_title,
        performed_by_staff_id: adminStaff.id,
        performed_by_name: adminStaff.full_name,
        event_date: subDays(now, 45).toISOString(),
      },
      {
        org_id: ORG_ID,
        event_type: 'Policy Assigned',
        event_title: `Health & Safety Policy assigned to ${activeStaff.length} staff`,
        policy_id: hsPolicy.id,
        policy_title: hsPolicy.policy_title,
        performed_by_staff_id: adminStaff.id,
        performed_by_name: adminStaff.full_name,
        event_date: subDays(now, 20).toISOString(),
      },
      ...assignmentRecords.filter(a => a.acknowledged_at).slice(0, 6).map(a => ({
        org_id: ORG_ID,
        event_type: 'Policy Acknowledged',
        event_title: `Policy acknowledged: ${a.policy_title}`,
        policy_id: a.policy_id,
        policy_title: a.policy_title,
        staff_id: a.staff_id,
        staff_name: a.staff_name,
        performed_by_staff_id: a.staff_id,
        performed_by_name: a.staff_name,
        event_date: a.acknowledged_at,
      })),
      ...overdueAssignments.slice(0, 3).map(a => ({
        org_id: ORG_ID,
        event_type: 'Reminder Sent',
        event_title: `Reminder sent to ${a.staff_name}`,
        policy_id: a.policy_id,
        policy_title: a.policy_title,
        staff_id: a.staff_id,
        staff_name: a.staff_name,
        performed_by_staff_id: adminStaff.id,
        performed_by_name: adminStaff.full_name,
        event_date: subDays(now, 3).toISOString(),
      })),
    ];

    for (const ev of activityEvents) {
      await base44.asServiceRole.entities.HRPolicyActivityEvent.create(ev);
    }

    return Response.json({
      success: true,
      summary: {
        policies: createdPolicies.length,
        versions: createdPolicies.filter(p => p.status !== 'Draft').length,
        groups: 2,
        assignment_batches: 5,
        staff_assignments: assignmentRecords.length,
        reminders: overdueAssignments.slice(0, 5).length,
        activity_events: activityEvents.length,
        staff_used: activeStaff.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});