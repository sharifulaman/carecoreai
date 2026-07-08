import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { home_id, org_id } = await req.json();
    if (!home_id || !org_id) {
      return Response.json({ error: 'home_id and org_id required' }, { status: 400 });
    }

    // Fetch all relevant data
    const [residents, incidents, missing, complaints, safeguarding, exploitation, home] = await Promise.all([
      base44.asServiceRole.entities.Resident.filter({ home_id, org_id }),
      base44.asServiceRole.entities.Incident.filter({ home_id, org_id }),
      base44.asServiceRole.entities.MissingFromHome.filter({ home_id, org_id }),
      base44.asServiceRole.entities.Complaint.filter({ home_id, org_id, annex_a_reportable: true }),
      base44.asServiceRole.entities.SafeguardingRecord.filter({ home_id, org_id }),
      base44.asServiceRole.entities.ExploitationRisk.filter({ home_id, org_id }),
      base44.asServiceRole.entities.Home.filter({ id: home_id })
    ]);

    const homeData = home[0];
    const now = new Date();
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Helper: Filter active residents (in scope for 16-17yo LAC/care leavers)
    const activeResidents = residents.filter(r => 
      !r.placement_end && r.looked_after_child && r.dob &&
      (new Date().getFullYear() - new Date(r.dob).getFullYear()) >= 16 &&
      (new Date().getFullYear() - new Date(r.dob).getFullYear()) <= 17
    );

    // Q5: Total by accommodation
    const q5 = {
      self_contained: activeResidents.filter(r => r.accommodation_category === 'self_contained').length,
      shared_ring_fenced: activeResidents.filter(r => r.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: activeResidents.filter(r => r.accommodation_category === 'shared_non_ring_fenced').length
    };

    // Q6: New arrivals (last 12 months)
    const q6 = {
      self_contained: residents.filter(r => r.accommodation_category === 'self_contained' && r.placement_start && new Date(r.placement_start) >= lastYear).length,
      shared_ring_fenced: residents.filter(r => r.accommodation_category === 'shared_ring_fenced' && r.placement_start && new Date(r.placement_start) >= lastYear).length,
      shared_non_ring_fenced: residents.filter(r => r.accommodation_category === 'shared_non_ring_fenced' && r.placement_start && new Date(r.placement_start) >= lastYear).length
    };

    // Q7: Leavers (last 12 months)
    const q7 = {
      self_contained: residents.filter(r => r.accommodation_category === 'self_contained' && r.placement_end && new Date(r.placement_end) >= lastYear).length,
      shared_ring_fenced: residents.filter(r => r.accommodation_category === 'shared_ring_fenced' && r.placement_end && new Date(r.placement_end) >= lastYear).length,
      shared_non_ring_fenced: residents.filter(r => r.accommodation_category === 'shared_non_ring_fenced' && r.placement_end && new Date(r.placement_end) >= lastYear).length,
      continued_after_18: activeResidents.filter(r => r.continued_after_18).length
    };

    // Q9: Restraint incidents — only count manager-reviewed incidents (maker-checker)
    const restraintIncidents = incidents.filter(i =>
      i.restraint_used &&
      i.incident_datetime &&
      new Date(i.incident_datetime) >= lastYear &&
      i.manager_review_status === "reviewed"
    );
    const q9 = {
      self_contained: restraintIncidents.filter(i => i.accommodation_category === 'self_contained').length,
      shared_ring_fenced: restraintIncidents.filter(i => i.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: restraintIncidents.filter(i => i.accommodation_category === 'shared_non_ring_fenced').length
    };

    // Police behaviour management callouts — only reviewed incidents count (maker-checker)
    const policeBehaviourIncidents = incidents.filter(i =>
      i.police_called &&
      i.police_callout_reason === 'behaviour_management' &&
      !i.exclude_from_annex_a_police_count &&
      i.incident_datetime &&
      new Date(i.incident_datetime) >= lastYear &&
      i.manager_review_status === 'reviewed'
    );

    // Q10: Children in restraints
    const childrenInRestraints = new Set(restraintIncidents.map(i => i.resident_id));
    const q10 = {
      self_contained: restraintIncidents.filter(i => i.accommodation_category === 'self_contained').map(i => i.resident_id),
      shared_ring_fenced: restraintIncidents.filter(i => i.accommodation_category === 'shared_ring_fenced').map(i => i.resident_id),
      shared_non_ring_fenced: restraintIncidents.filter(i => i.accommodation_category === 'shared_non_ring_fenced').map(i => i.resident_id)
    };

    // Q11: Missing episodes
    const missingLast12m = missing.filter(m => m.reported_missing_datetime && new Date(m.reported_missing_datetime) >= lastYear);
    const q11 = {
      self_contained: missingLast12m.filter(m => m.accommodation_category === 'self_contained').length,
      shared_ring_fenced: missingLast12m.filter(m => m.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: missingLast12m.filter(m => m.accommodation_category === 'shared_non_ring_fenced').length
    };

    // Q12: Children missing
    const q12 = {
      self_contained: [...new Set(missingLast12m.filter(m => m.accommodation_category === 'self_contained').map(m => m.resident_id))].length,
      shared_ring_fenced: [...new Set(missingLast12m.filter(m => m.accommodation_category === 'shared_ring_fenced').map(m => m.resident_id))].length,
      shared_non_ring_fenced: [...new Set(missingLast12m.filter(m => m.accommodation_category === 'shared_non_ring_fenced').map(m => m.resident_id))].length
    };

    // Q13-16: Exploitation risks
    const q13 = {
      self_contained: exploitation.filter(e => e.accommodation_category === 'self_contained' && ['medium', 'high', 'critical'].includes(e.cse_risk_level) && !e.cse_subject_currently).length,
      shared_ring_fenced: exploitation.filter(e => e.accommodation_category === 'shared_ring_fenced' && ['medium', 'high', 'critical'].includes(e.cse_risk_level) && !e.cse_subject_currently).length,
      shared_non_ring_fenced: exploitation.filter(e => e.accommodation_category === 'shared_non_ring_fenced' && ['medium', 'high', 'critical'].includes(e.cse_risk_level) && !e.cse_subject_currently).length
    };

    const q14 = {
      self_contained: exploitation.filter(e => e.accommodation_category === 'self_contained' && e.cse_subject_currently).length,
      shared_ring_fenced: exploitation.filter(e => e.accommodation_category === 'shared_ring_fenced' && e.cse_subject_currently).length,
      shared_non_ring_fenced: exploitation.filter(e => e.accommodation_category === 'shared_non_ring_fenced' && e.cse_subject_currently).length
    };

    const q15 = {
      self_contained: exploitation.filter(e => e.accommodation_category === 'self_contained' && ['medium', 'high', 'critical'].includes(e.cce_risk_level) && !e.cce_subject_currently).length,
      shared_ring_fenced: exploitation.filter(e => e.accommodation_category === 'shared_ring_fenced' && ['medium', 'high', 'critical'].includes(e.cce_risk_level) && !e.cce_subject_currently).length,
      shared_non_ring_fenced: exploitation.filter(e => e.accommodation_category === 'shared_non_ring_fenced' && ['medium', 'high', 'critical'].includes(e.cce_risk_level) && !e.cce_subject_currently).length
    };

    const q16 = {
      self_contained: exploitation.filter(e => e.accommodation_category === 'self_contained' && e.cce_subject_currently).length,
      shared_ring_fenced: exploitation.filter(e => e.accommodation_category === 'shared_ring_fenced' && e.cce_subject_currently).length,
      shared_non_ring_fenced: exploitation.filter(e => e.accommodation_category === 'shared_non_ring_fenced' && e.cce_subject_currently).length
    };

    // Q17-20: Complaints
    const complaintsByAccom = complaints.reduce((acc, c) => {
      if (!acc[c.accommodation_category]) acc[c.accommodation_category] = [];
      acc[c.accommodation_category].push(c);
      return acc;
    }, {});

    const q17 = {
      self_contained: complaintsByAccom['self_contained']?.length || 0,
      shared_ring_fenced: complaintsByAccom['shared_ring_fenced']?.length || 0,
      shared_non_ring_fenced: complaintsByAccom['shared_non_ring_fenced']?.length || 0
    };

    const q18 = {
      self_contained: [...new Set((complaintsByAccom['self_contained'] || []).filter(c => c.is_child_complainant).map(c => c.resident_id))].length,
      shared_ring_fenced: [...new Set((complaintsByAccom['shared_ring_fenced'] || []).filter(c => c.is_child_complainant).map(c => c.resident_id))].length,
      shared_non_ring_fenced: [...new Set((complaintsByAccom['shared_non_ring_fenced'] || []).filter(c => c.is_child_complainant).map(c => c.resident_id))].length
    };

    const q19 = {
      self_contained: (complaintsByAccom['self_contained'] || []).filter(c => !c.is_child_complainant).length,
      shared_ring_fenced: (complaintsByAccom['shared_ring_fenced'] || []).filter(c => !c.is_child_complainant).length,
      shared_non_ring_fenced: (complaintsByAccom['shared_non_ring_fenced'] || []).filter(c => !c.is_child_complainant).length
    };

    const q20 = {
      self_contained: [...new Set((complaintsByAccom['self_contained'] || []).filter(c => !c.is_child_complainant).map(c => c.resident_id))].length,
      shared_ring_fenced: [...new Set((complaintsByAccom['shared_ring_fenced'] || []).filter(c => !c.is_child_complainant).map(c => c.resident_id))].length,
      shared_non_ring_fenced: [...new Set((complaintsByAccom['shared_non_ring_fenced'] || []).filter(c => !c.is_child_complainant).map(c => c.resident_id))].length
    };

    // Q21: UASC/non-English
    const q21 = {
      self_contained: residents.filter(r => r.accommodation_category === 'self_contained' && (r.uasc || !r.english_first_language)).length,
      shared_ring_fenced: residents.filter(r => r.accommodation_category === 'shared_ring_fenced' && (r.uasc || !r.english_first_language)).length,
      shared_non_ring_fenced: residents.filter(r => r.accommodation_category === 'shared_non_ring_fenced' && (r.uasc || !r.english_first_language)).length
    };

    // Q22-24: Staff allegations
    const allegationsLast12m = safeguarding.filter(s => s.allegation_against_staff && s.date_of_concern && new Date(s.date_of_concern) >= lastYear);
    const q22 = {
      self_contained: allegationsLast12m.filter(s => s.accommodation_category === 'self_contained').length,
      shared_ring_fenced: allegationsLast12m.filter(s => s.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: allegationsLast12m.filter(s => s.accommodation_category === 'shared_non_ring_fenced').length
    };

    const q23 = {
      self_contained: [...new Set(allegationsLast12m.filter(s => s.accommodation_category === 'self_contained' && s.allegation_made_by === 'child').map(s => s.resident_id))].length,
      shared_ring_fenced: [...new Set(allegationsLast12m.filter(s => s.accommodation_category === 'shared_ring_fenced' && s.allegation_made_by === 'child').map(s => s.resident_id))].length,
      shared_non_ring_fenced: [...new Set(allegationsLast12m.filter(s => s.accommodation_category === 'shared_non_ring_fenced' && s.allegation_made_by === 'child').map(s => s.resident_id))].length,
      other: allegationsLast12m.filter(s => s.allegation_made_by !== 'child').length
    };

    const q24 = {
      self_contained: [...new Set(allegationsLast12m.filter(s => s.accommodation_category === 'self_contained').map(s => s.staff_subject_to_allegation_id))].length,
      shared_ring_fenced: [...new Set(allegationsLast12m.filter(s => s.accommodation_category === 'shared_ring_fenced').map(s => s.staff_subject_to_allegation_id))].length,
      shared_non_ring_fenced: [...new Set(allegationsLast12m.filter(s => s.accommodation_category === 'shared_non_ring_fenced').map(s => s.staff_subject_to_allegation_id))].length
    };

    // Q26-29: CP referrals
    const cpReferralsLast12m = safeguarding.filter(s => s.la_children_services_referral && s.date_of_concern && new Date(s.date_of_concern) >= lastYear);
    const q26 = {
      self_contained: cpReferralsLast12m.filter(s => s.accommodation_category === 'self_contained').length,
      shared_ring_fenced: cpReferralsLast12m.filter(s => s.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: cpReferralsLast12m.filter(s => s.accommodation_category === 'shared_non_ring_fenced').length
    };

    const q27 = {
      self_contained: [...new Set(cpReferralsLast12m.filter(s => s.accommodation_category === 'self_contained').map(s => s.resident_id))].length,
      shared_ring_fenced: [...new Set(cpReferralsLast12m.filter(s => s.accommodation_category === 'shared_ring_fenced').map(s => s.resident_id))].length,
      shared_non_ring_fenced: [...new Set(cpReferralsLast12m.filter(s => s.accommodation_category === 'shared_non_ring_fenced').map(s => s.resident_id))].length
    };

    const radReferralsLast12m = safeguarding.filter(s => s.concern_type === 'radicalisation_prevent' && s.date_of_concern && new Date(s.date_of_concern) >= lastYear);
    const q28 = {
      self_contained: radReferralsLast12m.filter(s => s.accommodation_category === 'self_contained').length,
      shared_ring_fenced: radReferralsLast12m.filter(s => s.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: radReferralsLast12m.filter(s => s.accommodation_category === 'shared_non_ring_fenced').length
    };

    const q29 = {
      self_contained: [...new Set(radReferralsLast12m.filter(s => s.accommodation_category === 'self_contained').map(s => s.resident_id))].length,
      shared_ring_fenced: [...new Set(radReferralsLast12m.filter(s => s.accommodation_category === 'shared_ring_fenced').map(s => s.resident_id))].length,
      shared_non_ring_fenced: [...new Set(radReferralsLast12m.filter(s => s.accommodation_category === 'shared_non_ring_fenced').map(s => s.resident_id))].length
    };

    // Q30: Deprivation of liberty
    const q30 = {
      self_contained: residents.filter(r => r.accommodation_category === 'self_contained' && r.subject_to_deprivation_order).length,
      shared_ring_fenced: residents.filter(r => r.accommodation_category === 'shared_ring_fenced' && r.subject_to_deprivation_order).length,
      shared_non_ring_fenced: residents.filter(r => r.accommodation_category === 'shared_non_ring_fenced' && r.subject_to_deprivation_order).length
    };

    // Q31-32: Return-home interviews
    const rhiOffered = missing.filter(m => m.rhi_offered_by_la);
    const q31 = {
      self_contained: rhiOffered.filter(m => m.accommodation_category === 'self_contained').length,
      shared_ring_fenced: rhiOffered.filter(m => m.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: rhiOffered.filter(m => m.accommodation_category === 'shared_non_ring_fenced').length
    };

    const rhiCompleted = missing.filter(m => m.return_interview_completed);
    const q32 = {
      self_contained: rhiCompleted.filter(m => m.accommodation_category === 'self_contained').length,
      shared_ring_fenced: rhiCompleted.filter(m => m.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: rhiCompleted.filter(m => m.accommodation_category === 'shared_non_ring_fenced').length
    };

    // Police behaviour management breakdown by accommodation category
    const q9b_police_behaviour = {
      self_contained: policeBehaviourIncidents.filter(i => i.accommodation_category === 'self_contained').length,
      shared_ring_fenced: policeBehaviourIncidents.filter(i => i.accommodation_category === 'shared_ring_fenced').length,
      shared_non_ring_fenced: policeBehaviourIncidents.filter(i => i.accommodation_category === 'shared_non_ring_fenced').length
    };

    return Response.json({
      home: homeData,
      generated_date: now.toISOString(),
      period_start: lastYear.toISOString(),
      period_end: now.toISOString(),
      data: {
        q5, q6, q7, q9, q9b_police_behaviour, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20, q21,
        q22, q23, q24, q26, q27, q28, q29, q30, q31, q32
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});