import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { org_id, home_id, reporter_name, period_months = 12 } = payload;

    if (!org_id) {
      return Response.json({ error: 'org_id is required' }, { status: 400 });
    }

    // Calculate period dates
    const now = new Date();
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - period_months);

    // Fetch all data using service role
    const [
      org,
      homes,
      residents,
      incidents,
      complaintsData,
      allegations,
      mfh,
      referrals,
      safeguarding,
      staffProfiles,
      staffMovements,
      agencyUsage,
      vacancies,
      educationRecords,
      employmentRecords,
      neetRecords,
      deprivationRecords,
    ] = await Promise.all([
      base44.asServiceRole.entities.OrganisationProfile.filter({ org_id }),
      base44.asServiceRole.entities.Home.filter({ org_id }),
      base44.asServiceRole.entities.Resident.filter({ org_id }),
      base44.asServiceRole.entities.Incident.filter({ org_id }),
      base44.asServiceRole.entities.Complaint.filter({ org_id }),
      base44.asServiceRole.entities.Allegation.filter({ org_id }),
      base44.asServiceRole.entities.MissingFromHome.filter({ org_id }),
      base44.asServiceRole.entities.Referral.filter({ org_id }),
      base44.asServiceRole.entities.SafeguardingRecord.filter({ org_id }),
      base44.asServiceRole.entities.StaffProfile.filter({ org_id }),
      base44.asServiceRole.entities.StaffMovement.filter({ org_id }),
      base44.asServiceRole.entities.AgencyBankStaffUsage.filter({ org_id }),
      base44.asServiceRole.entities.Vacancy.filter({ org_id }),
      base44.asServiceRole.entities.EducationRecord.filter({ org_id }),
      base44.asServiceRole.entities.EmploymentRecord.filter({ org_id }),
      base44.asServiceRole.entities.NEETRecord.filter({ org_id }),
      base44.asServiceRole.entities.DeprivationOfLiberty.filter({ org_id }),
    ]);

    // Filter by home if specified
    const relevantHomes = home_id ? homes.filter(h => h.id === home_id) : homes;
    const relevantHomeIds = new Set(relevantHomes.map(h => h.id));

    const relevantResidents = residents.filter(r => relevantHomeIds.has(r.home_id));
    const relevantIncidents = incidents.filter(i => relevantHomeIds.has(i.home_id) && new Date(i.incident_datetime) >= periodStart);
    const relevantComplaints = complaintsData.filter(c => relevantHomeIds.has(c.home_id) && new Date(c.received_datetime) >= periodStart);
    const relevantAllegations = allegations.filter(a => relevantHomeIds.has(a.home_id) && new Date(a.allegation_date) >= periodStart);
    const relevantMFH = mfh.filter(m => relevantHomeIds.has(m.home_id) && new Date(m.reported_missing_datetime) >= periodStart);
    const relevantReferrals = referrals.filter(r => relevantHomeIds.has(r.home_id) && new Date(r.referral_date) >= periodStart);
    const relevantSafeguarding = safeguarding.filter(s => relevantHomeIds.has(s.home_id) && new Date(s.date_of_concern) >= periodStart);

    const orgProfile = org[0] || {};
    const providerName = relevantHomes[0]?.name || orgProfile.name || 'Unknown Provider';
    const urn = orgProfile.urn || 'N/A';

    // Helper: categorize by accommodation type
    const countByAccommodation = (items, field = 'accommodation_category') => {
      const counts = { self_contained: 0, shared_ring_fenced: 0, shared_non_ring_fenced: 0 };
      items.forEach(item => {
        const cat = item[field] || 'unknown';
        if (cat === 'self_contained') counts.self_contained++;
        else if (cat === 'shared_ring_fenced') counts.shared_ring_fenced++;
        else if (cat === 'shared_non_ring_fenced') counts.shared_non_ring_fenced++;
      });
      return counts;
    };

    // Helper: format table row for accommodation categories
    const formatRow = (label, counts) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #999;">${label}</td>
        <td style="padding: 6px 8px; border: 1px solid #999; text-align: center;">${counts.self_contained}</td>
        <td style="padding: 6px 8px; border: 1px solid #999; text-align: center;">${counts.shared_ring_fenced}</td>
        <td style="padding: 6px 8px; border: 1px solid #999; text-align: center;">${counts.shared_non_ring_fenced}</td>
      </tr>
    `;

    // Section 1: Information about children (Q5–Q21)
    const totalChildren = countByAccommodation(relevantResidents);
    const newStarters = countByAccommodation(
      staffMovements.filter(sm => sm.movement_type === 'new_starter' && new Date(sm.movement_date) >= periodStart && sm.is_support_role)
    );
    const leavers = countByAccommodation(
      staffMovements.filter(sm => sm.movement_type === 'leaver' && new Date(sm.movement_date) >= periodStart && sm.is_support_role)
    );
    const restraintIncidents = countByAccommodation(relevantIncidents.filter(i => i.restraint_used));
    const childrenInRestraint = countByAccommodation(
      relevantIncidents.filter(i => i.restraint_used).map(i => ({ accommodation_category: residents.find(r => r.id === i.resident_id)?.accommodation_category }))
    );
    const missingEpisodes = countByAccommodation(relevantMFH);
    const childrenMissing = countByAccommodation(
      [...new Set(relevantMFH.map(m => m.resident_id))].map(rid => relevantResidents.find(r => r.id === rid)).filter(Boolean)
    );
    const cseRisk = countByAccommodation(
      relevantResidents.filter(r => safeguarding.filter(s => s.resident_id === r.id && s.concern_type === 'sexual').length > 0)
    );
    const cceRisk = countByAccommodation(
      relevantResidents.filter(r => safeguarding.filter(s => s.resident_id === r.id && s.concern_type === 'financial').length > 0)
    );
    const complaintsCount = countByAccommodation(relevantComplaints);
    const childComplainants = countByAccommodation(
      relevantComplaints.filter(c => c.is_child_complainant).map(c => ({ accommodation_category: relevantResidents.find(r => r.id === c.resident_id)?.accommodation_category }))
    );

    // Section 2: Safeguarding (Q22–Q30)
    const allegationsCount = countByAccommodation(relevantAllegations);
    const childrenAlleging = countByAccommodation(
      [...new Set(relevantAllegations.flatMap(a => a.resident_ids))].map(rid => relevantResidents.find(r => r.id === rid)).filter(Boolean)
    );
    const staffSubjectToAllegations = [...new Set(relevantAllegations.map(a => a.staff_subject_to_allegation_id))].length;
    const cpReferrals = countByAccommodation(relevantReferrals.filter(r => r.referral_type === 'child_protection'));
    const childrenInCP = countByAccommodation(
      [...new Set(relevantReferrals.filter(r => r.referral_type === 'child_protection').flatMap(r => r.resident_ids))].map(rid => relevantResidents.find(r => r.id === rid)).filter(Boolean)
    );
    const radicalisationReferrals = countByAccommodation(relevantReferrals.filter(r => r.radicalisation_concern));
    const childrenRadicalisation = countByAccommodation(
      [...new Set(relevantReferrals.filter(r => r.radicalisation_concern).flatMap(r => r.resident_ids))].map(rid => relevantResidents.find(r => r.id === rid)).filter(Boolean)
    );
    const deprivationNames = deprivationRecords.filter(d => relevantHomeIds.has(d.home_id)).map(d => relevantResidents.find(r => r.id === d.resident_id)?.initials || 'Unknown').join(', ');

    // Section 3: Missing episodes and RHI (Q31)
    const missingEpisodesDetail = relevantMFH.map(m => ({
      initials: relevantResidents.find(r => r.id === m.resident_id)?.initials || '—',
      la: relevantResidents.find(r => r.id === m.resident_id)?.placing_local_authority || '—',
      episodes: 1,
      rhi: m.rhi_offered_by_la ? 'Yes' : 'No',
      address: relevantHomes.find(h => h.id === m.home_id)?.address || '—',
    }));

    // Section 4: Police call-outs for behaviour (Q32)
    const policeCallouts = relevantIncidents
      .filter(i => i.police_called && i.police_callout_reason === 'behaviour_management' && i.manager_review_status === 'reviewed')
      .map(i => ({
        initials: relevantResidents.find(r => r.id === i.resident_id)?.initials || '—',
        date: new Date(i.police_callout_datetime).toLocaleDateString(),
        arrested: i.child_arrested === 'yes' ? 'Yes' : 'No',
        convicted: i.child_convicted === 'yes' ? 'Yes' : 'No',
        address: relevantHomes.find(h => h.id === i.home_id)?.address || '—',
      }));

    // Section 5: Staffing (Q33–Q40)
    const permanentStaff = staffProfiles.filter(s => s.employment_type === 'permanent' && relevantHomeIds.has(s.primary_home_id || s.home_ids?.[0]));
    const agencyStaff = staffProfiles.filter(s => s.employment_type === 'agency' && relevantHomeIds.has(s.primary_home_id || s.home_ids?.[0]));
    const openVacancies = vacancies.filter(v => relevantHomeIds.has(v.home_id) && v.status === 'open').length;
    const agencyBankUsageCount = agencyUsage.filter(au => new Date(au.usage_date) >= periodStart).length;

    // Section 6: Education and employment (Q41–Q44c)
    const inEducation = countByAccommodation(
      educationRecords.filter(e => e.status !== 'neet' && new Date(e.enrolment_date) <= now).map(e => ({ accommodation_category: relevantResidents.find(r => r.id === e.resident_id)?.accommodation_category }))
    );
    const inEmployment = countByAccommodation(
      employmentRecords.filter(e => e.status === 'employed' && new Date(e.start_date) <= now).map(e => ({ accommodation_category: relevantResidents.find(r => r.id === e.resident_id)?.accommodation_category }))
    );
    const neetCount = neetRecords.filter(n => new Date(n.date_neet_started) >= periodStart).length;
    const educationDetails = educationRecords
      .filter(e => relevantResidents.find(r => r.id === e.resident_id))
      .map(e => {
        const res = relevantResidents.find(r => r.id === e.resident_id);
        return {
          address: relevantHomes.find(h => h.id === res.home_id)?.address || '—',
          initials: res?.initials || '—',
          age: res?.dob ? Math.floor((now.getTime() - new Date(res.dob).getTime()) / (365 * 24 * 60 * 60 * 1000)) : '—',
          placementStart: res?.placement_start ? new Date(res.placement_start).toLocaleDateString() : '—',
          la: res?.placing_local_authority || '—',
          provider: e.provider || '—',
          hoursProvided: e.hours_per_week || '—',
          hoursAttended: e.attendance_percentage ? `${e.attendance_percentage}%` : '—',
        };
      });

    const employmentDetails = employmentRecords
      .filter(e => relevantResidents.find(r => r.id === e.resident_id))
      .map(e => {
        const res = relevantResidents.find(r => r.id === e.resident_id);
        return {
          address: relevantHomes.find(h => h.id === res.home_id)?.address || '—',
          initials: res?.initials || '—',
          age: res?.dob ? Math.floor((now.getTime() - new Date(res.dob).getTime()) / (365 * 24 * 60 * 60 * 1000)) : '—',
          placementStart: res?.placement_start ? new Date(res.placement_start).toLocaleDateString() : '—',
          la: res?.placing_local_authority || '—',
          employer: e.employer_name || '—',
          startDate: e.start_date ? new Date(e.start_date).toLocaleDateString() : '—',
          nature: e.nature_of_work || '—',
          apprenticeship: e.is_apprenticeship ? 'Yes' : 'No',
          hoursPerWeek: e.hours_per_week || '—',
        };
      });

    // Build HTML document
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Annex A Report</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; margin: 20px; }
    .page-break { page-break-after: always; }
    h1 { font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
    h2 { font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 10px; }
    h3 { font-size: 11pt; font-weight: bold; margin-top: 10px; margin-bottom: 8px; }
    p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background-color: #e8e8e8; padding: 8px; border: 1px solid #999; text-align: left; font-weight: bold; font-size: 10pt; }
    td { padding: 6px 8px; border: 1px solid #999; }
    .header-block { margin-bottom: 20px; }
    .section { margin: 20px 0; padding: 10px; border: 1px solid #ddd; }
  </style>
</head>
<body>

<div class="header-block">
  <h1>Annex A — Request for information at a full inspection of a supported accommodation provider</h1>
  <p><strong>Provider name:</strong> ${providerName}</p>
  <p><strong>URN:</strong> ${urn}</p>
  <p><strong>Person completing:</strong> ${reporter_name}</p>
  <p><strong>Date completed:</strong> ${new Date().toLocaleDateString()}</p>
  <p><strong>Reporting period:</strong> ${periodStart.toLocaleDateString()} to ${now.toLocaleDateString()}</p>
</div>

<div class="section">
  <h2>Section 1: Information about children (Q5–Q21)</h2>
  <table>
    <thead>
      <tr>
        <th>Question</th>
        <th>Self-contained</th>
        <th>Ring-fenced</th>
        <th>Non-ring-fenced</th>
      </tr>
    </thead>
    <tbody>
      ${formatRow('Q5: Total number of children', totalChildren)}
      ${formatRow('Q6: New starters', newStarters)}
      ${formatRow('Q7: Leavers', leavers)}
      ${formatRow('Q9: Restraint incidents', restraintIncidents)}
      ${formatRow('Q10: Children in restraint', childrenInRestraint)}
      ${formatRow('Q11: Missing episodes', missingEpisodes)}
      ${formatRow('Q12: Children missing', childrenMissing)}
      ${formatRow('Q13: CSE risk', cseRisk)}
      ${formatRow('Q15: CCE risk', cceRisk)}
      ${formatRow('Q17: Complaints', complaintsCount)}
      ${formatRow('Q18: Child complainants', childComplainants)}
    </tbody>
  </table>
</div>

<div class="section page-break">
  <h2>Section 2: Safeguarding (Q22–Q30)</h2>
  <table>
    <thead>
      <tr>
        <th>Question</th>
        <th>Self-contained</th>
        <th>Ring-fenced</th>
        <th>Non-ring-fenced</th>
      </tr>
    </thead>
    <tbody>
      ${formatRow('Q22: Allegations against staff', allegationsCount)}
      ${formatRow('Q23: Children alleging', childrenAlleging)}
      <tr>
        <td>Q24: Staff subject to allegations</td>
        <td colspan="3" style="text-align: center;">${staffSubjectToAllegations}</td>
      </tr>
      ${formatRow('Q26: CP referrals', cpReferrals)}
      ${formatRow('Q27: Children in CP', childrenInCP)}
      ${formatRow('Q28: Radicalisation referrals', radicalisationReferrals)}
      ${formatRow('Q29: Children radicalisation', childrenRadicalisation)}
      <tr>
        <td>Q30: Children subject to DoL order</td>
        <td colspan="3">${deprivationNames || 'None'}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section page-break">
  <h2>Section 3: Missing episodes and return-home interviews (Q31)</h2>
  <table>
    <thead>
      <tr>
        <th>Child Initials</th>
        <th>Placing LA</th>
        <th>No. of episodes</th>
        <th>RHI offered</th>
        <th>Address</th>
      </tr>
    </thead>
    <tbody>
      ${missingEpisodesDetail.length === 0 ? '<tr><td colspan="5">No missing episodes reported</td></tr>' : missingEpisodesDetail.map(m => `
        <tr>
          <td>${m.initials}</td>
          <td>${m.la}</td>
          <td>${m.episodes}</td>
          <td>${m.rhi}</td>
          <td>${m.address}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>

<div class="section page-break">
  <h2>Section 4: Police call-outs to manage behaviour (Q32)</h2>
  <table>
    <thead>
      <tr>
        <th>Child Initials</th>
        <th>Date</th>
        <th>Arrested</th>
        <th>Convicted</th>
        <th>Address</th>
      </tr>
    </thead>
    <tbody>
      ${policeCallouts.length === 0 ? '<tr><td colspan="5">No behaviour-related police call-outs</td></tr>' : policeCallouts.map(p => `
        <tr>
          <td>${p.initials}</td>
          <td>${p.date}</td>
          <td>${p.arrested}</td>
          <td>${p.convicted}</td>
          <td>${p.address}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>

<div class="section page-break">
  <h2>Section 5: Staffing (Q33–Q40)</h2>
  <p><strong>Q33: Registered Manager qualification held:</strong> ${orgProfile.registered_manager_qualification_held ? 'Yes' : 'No'}</p>
  <p><strong>Q34: Qualification name:</strong> ${orgProfile.registered_manager_qualification_name || 'N/A'}</p>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Self-contained</th>
        <th>Ring-fenced</th>
        <th>Non-ring-fenced</th>
      </tr>
    </thead>
    <tbody>
      ${formatRow('Q35: New starters (permanent)', newStarters)}
      ${formatRow('Q36: Leavers (permanent)', leavers)}
      <tr>
        <td>Q37: Agency/bank usage (episodes in period)</td>
        <td colspan="3" style="text-align: center;">${agencyBankUsageCount}</td>
      </tr>
      ${formatRow('Q38: Current permanent headcount', countByAccommodation(permanentStaff, 'primary_home_id'))}
      ${formatRow('Q39: Current agency headcount', countByAccommodation(agencyStaff, 'primary_home_id'))}
      <tr>
        <td>Q40: Open vacancies</td>
        <td colspan="3" style="text-align: center;">${openVacancies}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section page-break">
  <h2>Section 6: Education and employment (Q41–Q44c)</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Self-contained</th>
        <th>Ring-fenced</th>
        <th>Non-ring-fenced</th>
      </tr>
    </thead>
    <tbody>
      ${formatRow('Q41: In education', inEducation)}
      ${formatRow('Q42: In employment', inEmployment)}
    </tbody>
  </table>

  <h3>Q43: Education details</h3>
  <table>
    <thead>
      <tr>
        <th>Address</th>
        <th>Initials</th>
        <th>Age</th>
        <th>Placement Start</th>
        <th>Placing LA</th>
        <th>Provider</th>
        <th>Hours Provided</th>
        <th>Hours Attended</th>
      </tr>
    </thead>
    <tbody>
      ${educationDetails.length === 0 ? '<tr><td colspan="8">No education records</td></tr>' : educationDetails.map(e => `
        <tr>
          <td>${e.address}</td>
          <td>${e.initials}</td>
          <td>${e.age}</td>
          <td>${e.placementStart}</td>
          <td>${e.la}</td>
          <td>${e.provider}</td>
          <td>${e.hoursProvided}</td>
          <td>${e.hoursAttended}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h3>Q44a: Employment details</h3>
  <table>
    <thead>
      <tr>
        <th>Address</th>
        <th>Initials</th>
        <th>Age</th>
        <th>Placement Start</th>
        <th>Placing LA</th>
        <th>Employer</th>
        <th>Start Date</th>
        <th>Nature</th>
        <th>Apprenticeship</th>
        <th>Hours/week</th>
      </tr>
    </thead>
    <tbody>
      ${employmentDetails.length === 0 ? '<tr><td colspan="10">No employment records</td></tr>' : employmentDetails.map(e => `
        <tr>
          <td>${e.address}</td>
          <td>${e.initials}</td>
          <td>${e.age}</td>
          <td>${e.placementStart}</td>
          <td>${e.la}</td>
          <td>${e.employer}</td>
          <td>${e.startDate}</td>
          <td>${e.nature}</td>
          <td>${e.apprenticeship}</td>
          <td>${e.hoursPerWeek}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h3>Q44b–c: NEET count</h3>
  <p><strong>Total in NEET status (period):</strong> ${neetCount}</p>
</div>

<div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #999; text-align: center; font-size: 10pt; color: #666;">
  Report generated on ${new Date().toLocaleString()} by ${reporter_name}
</div>

</body>
</html>`;

    return Response.json({
      success: true,
      html,
      generatedAt: new Date().toISOString(),
      reporterName: reporter_name,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});