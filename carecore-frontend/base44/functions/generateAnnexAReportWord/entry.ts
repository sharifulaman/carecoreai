import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      orgName,
      urn,
      reporterName,
      reportDate,
      reportPeriod,
      metrics,
      homeNames,
      orgProfile
    } = payload;

    // Build structured data for the report
    const reportData = {
      section1: {
        q1_provider_name: orgName || '',
        q2_urn: urn || '',
        q3_person_completing: reporterName || '',
        q4_date_completed: reportDate || new Date().toLocaleDateString(),
        q5_total_children: metrics.totalResidents,
        q6_new_starters: metrics.newStarters || 0,
        q7_leavers: metrics.leavers || 0,
        q8_immediate_notice: metrics.immediateNotice || 0,
        q9_restraint_incidents: metrics.restraints || 0,
        q10_children_in_restraint: metrics.childrenInRestraint || 0,
        q11_missing_episodes: metrics.missingEpisodes || 0,
        q12_children_missing: metrics.childrenMissing || 0,
        q13_cse_risk: metrics.cseRisk || 0,
        q14_cse_subject: metrics.cseSubject || 0,
        q15_cce_risk: metrics.cceRisk || 0,
        q16_cce_subject: metrics.cceSubject || 0,
        q17_complaints: metrics.complaints || 0,
        q18_child_complainants: metrics.childComplainants || 0,
        q19_other_complaints: metrics.otherComplaints || 0,
        q21_uasc_non_english: metrics.uascNonEnglish || 0,
      },
      section2: {
        q22_allegations: metrics.allegations || 0,
        q23_children_alleging: metrics.childrenAlleging || 0,
        q24_staff_subject_to_allegations: metrics.staffAlleged || 0,
        q26_cp_referrals: metrics.cpReferrals || 0,
        q27_children_in_cp: metrics.childrenInCP || 0,
        q28_radicalisation_referrals: metrics.radiationReferrals || 0,
        q29_children_radicalisation: metrics.childrenRadicalisation || 0,
        q30_deprivation_of_liberty: metrics.deprivationOfLiberty || 0,
      },
      section3: {
        q31_missing_episodes: metrics.missingEpisodes || 0,
        q32_interviews_offered: metrics.returnInterviewsOffered || 0,
        q33_interviews_completed: metrics.returnInterviewsCompleted || 0,
      }
    };

    // Create a formatted text report (Word format will be generated client-side)
    const reportText = `
ANNEX A — OFSTED INSPECTION REPORT
Supported Accommodation Provider

==================================================
SECTION 1: PROVIDER INFORMATION
==================================================

Provider Legal Name: ${reportData.section1.q1_provider_name}
Ofsted URN: ${reportData.section1.q2_urn}
Person Completing Form: ${reportData.section1.q3_person_completing}
Date Completed: ${reportData.section1.q4_date_completed}
Reporting Period: ${reportPeriod}

==================================================
SECTION 2: INFORMATION ABOUT CHILDREN
==================================================

QUESTION 5: Total number of children being provided with supported accommodation
  Self-contained accommodation: ${reportData.section1.q5_total_children?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section1.q5_total_children?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section1.q5_total_children?.shared_non_ring_fenced || 0}

QUESTION 6: Number of children who have come to live at the provision
  Self-contained accommodation: ${reportData.section1.q6_new_starters?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section1.q6_new_starters?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section1.q6_new_starters?.shared_non_ring_fenced || 0}

QUESTION 7: Number of children who have left the provision
  Self-contained accommodation: ${reportData.section1.q7_leavers?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section1.q7_leavers?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section1.q7_leavers?.shared_non_ring_fenced || 0}

QUESTION 9: Number of incidents of restraint
  Self-contained accommodation: ${reportData.section1.q9_restraint_incidents?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section1.q9_restraint_incidents?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section1.q9_restraint_incidents?.shared_non_ring_fenced || 0}

QUESTION 11: Number of times children went missing from the provision
  Self-contained accommodation: ${reportData.section1.q11_missing_episodes?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section1.q11_missing_episodes?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section1.q11_missing_episodes?.shared_non_ring_fenced || 0}

QUESTION 13: Number of children at risk of child sexual exploitation
  Self-contained accommodation: ${reportData.section1.q13_cse_risk?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section1.q13_cse_risk?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section1.q13_cse_risk?.shared_non_ring_fenced || 0}

QUESTION 15: Number of children at risk of child criminal exploitation
  Self-contained accommodation: ${reportData.section1.q15_cce_risk?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section1.q15_cce_risk?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section1.q15_cce_risk?.shared_non_ring_fenced || 0}

QUESTION 17: Number of complaints from children
  Self-contained accommodation: ${reportData.section1.q17_complaints?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section1.q17_complaints?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section1.q17_complaints?.shared_non_ring_fenced || 0}

==================================================
SECTION 3: SAFEGUARDING
==================================================

QUESTION 22: Number of allegations made against staff
  Self-contained accommodation: ${reportData.section2.q22_allegations?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section2.q22_allegations?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section2.q22_allegations?.shared_non_ring_fenced || 0}

QUESTION 26: Number of child protection referrals made to local authority children's services
  Self-contained accommodation: ${reportData.section2.q26_cp_referrals?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section2.q26_cp_referrals?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section2.q26_cp_referrals?.shared_non_ring_fenced || 0}

QUESTION 28: Number of child protection referrals relating to risk of radicalisation
  Self-contained accommodation: ${reportData.section2.q28_radicalisation_referrals?.self_contained || 0}
  Shared accommodation (ring-fenced): ${reportData.section2.q28_radicalisation_referrals?.shared_ring_fenced || 0}
  Shared accommodation (non-ring-fenced): ${reportData.section2.q28_radicalisation_referrals?.shared_non_ring_fenced || 0}

==================================================
SECTION 4: MISSING EPISODES AND RETURN-HOME INTERVIEWS
==================================================

QUESTION 31: Number of missing episodes
  Total: ${reportData.section3.q31_missing_episodes}

QUESTION 32: Number of return-home interviews offered
  Total: ${reportData.section3.q32_interviews_offered}

QUESTION 33: Number of return-home interviews completed
  Total: ${reportData.section3.q33_interviews_completed}

==================================================
Report Generated: ${new Date().toLocaleString()}
==================================================
    `.trim();

    return Response.json({
      success: true,
      reportText,
      reportData,
      generatedAt: new Date().toISOString(),
      message: 'Report generated successfully. Ready for Word export.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});