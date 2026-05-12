/**
 * Seed function for Compliance Hub entities.
 * Fills: SafeguardingRecord, YPViewsRecord, Reg32Report, OfstedNotification, LAReview, SupervisionRecord
 * with 10 realistic records each, using real home/resident/staff IDs from the database.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ORG_ID = "default_org";

// Real IDs from the database
const HOMES = [
  { id: "69ec9f28dd568f02767457fc", name: "Riverside Independent" },
  { id: "69ec9f28bffd00a555ebb5d2", name: "Parkside Living" },
  { id: "69ec9f2893fb73eb89294c15", name: "North Star Outreach" },
  { id: "69ec9f26b58e45ecdd5aed15", name: "Valley Care Home" },
  { id: "69ec9f26f4e2b8699fbe82c3", name: "Castle Heights" },
];

const RESIDENTS = [
  { id: "69e8d1a19855396d7f77d96e", name: "Aisha K.", home_id: "69ec9f26f4e2b8699fbe82c3" },
  { id: "69e8d1a19855396d7f77d970", name: "Sofia R.", home_id: "69ec9f26b58e45ecdd5aed15" },
  { id: "69e8d1a19855396d7f77d972", name: "Zara P.", home_id: "69ec9f2893fb73eb89294c15" },
  { id: "69e8d1a19855396d7f77d96f", name: "Liam B.", home_id: "69ec9f26b58e45ecdd5aed15" },
  { id: "69eb7efa890310a752a5755f", name: "Patricia H.", home_id: "69ec9f2425255d8e490e9592" },
];

const STAFF = [
  { id: "69f12d42c06c6b2d6f150d50", name: "Morsalin Ahmed Chowdhury", role: "admin" },
  { id: "69ecb9ef5a0facbdda3e9c54", name: "Ava Martin", role: "support_worker" },
  { id: "69ecb9ef5a0facbdda3e9c41", name: "James Smith", role: "support_worker" },
  { id: "69ecb9ef5a0facbdda3e9c42", name: "Sarah Johnson", role: "support_worker" },
  { id: "69ecb9ef5a0facbdda3e9c43", name: "Michael Williams", role: "support_worker" },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function dtAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }
    const db = base44.asServiceRole.entities;
    const results = {};

    // ── 1. SafeguardingRecord (10 records) ──────────────────────────────────
    const sgConcernTypes = ["physical", "emotional", "sexual", "financial", "neglect", "self_neglect", "discriminatory", "institutional", "domestic_abuse", "modern_slavery"];
    const sgDescriptions = [
      "Physical marks observed during personal care — bruising to upper arm, unexplained.",
      "Resident disclosed feeling unsafe around a family visitor.",
      "Unexplained injury noted on wrist during morning routine.",
      "Resident expressed fear of a family member during keyworker session.",
      "Pattern of withdrawal and low mood observed over two weeks.",
      "Disclosure made during 1:1 session — resident described past abuse.",
      "Risk escalated following recent missing from home episode.",
      "Staff raised concern after observing unusual interactions.",
      "Resident reported financial exploitation by an acquaintance.",
      "Self-harm marks noted on forearm — resident engaged and supported.",
    ];
    const sgRecords = Array.from({ length: 10 }, (_, i) => {
      const r = RESIDENTS[i % RESIDENTS.length];
      const h = HOMES.find(h => h.id === r.home_id) || pick(HOMES);
      const staff = pick(STAFF);
      const dateOfConcern = daysAgo(Math.floor(Math.random() * 90) + 5);
      return {
        org_id: ORG_ID,
        resident_id: r.id,
        home_id: h.id,
        concern_type: sgConcernTypes[i],
        date_of_concern: dateOfConcern,
        date_reported_internally: dateOfConcern,
        reported_by: staff.name,
        description: sgDescriptions[i],
        immediate_risk: pick(["low", "medium", "high", "critical"]),
        immediate_action_taken: pick(["Safeguarding lead notified immediately", "Resident moved to safe space", "Police contacted", "LA duty officer informed", "Emergency strategy meeting arranged"]),
        manager_informed: true,
        manager_informed_at: dtAgo(Math.floor(Math.random() * 90) + 4),
        la_safeguarding_referred: i % 3 === 0,
        la_referral_date: i % 3 === 0 ? daysAgo(2) : null,
        police_notified: i % 4 === 0,
        police_reference: i % 4 === 0 ? `POL-${50000 + i * 17}` : null,
        status: pick(["open", "under_investigation", "closed"]),
        outcome: i < 4 ? pick(["substantiated", "unsubstantiated", "inconclusive", "closed_no_further_action"]) : null,
        outcome_notes: i < 4 ? "Outcome recorded following investigation and multi-agency review." : null,
        review_date: daysAgo(-14),
      };
    });
    const sgResults = await db.SafeguardingRecord.bulkCreate(sgRecords);
    results.SafeguardingRecord = sgResults.length;

    // ── 2. YPViewsRecord (10 records) ────────────────────────────────────────
    const ypPlacements = ["I feel safe and happy here.", "I would like more independence.", "Staff are supportive and kind.", "I want to learn to cook more meals.", "I feel listened to.", "I wish I could see my family more often.", "I'm working towards moving to my own flat.", "I enjoy the activities arranged for me.", "I sometimes feel anxious but get support.", "I am happy with my keyworker."];
    const ypGoals = ["Get a part-time job", "Complete my college course", "Move to independent living", "Improve my cooking skills", "Learn to manage my budget", "Stay in touch with family", "Reduce anxiety", "Develop social skills", "Pass my driving theory test", "Complete my pathway plan"];
    const ypViews = Array.from({ length: 10 }, (_, i) => {
      const r = RESIDENTS[i % RESIDENTS.length];
      const h = HOMES.find(h => h.id === r.home_id) || pick(HOMES);
      const staff = pick(STAFF);
      return {
        org_id: ORG_ID,
        resident_id: r.id,
        home_id: h.id,
        yp_views_on_placement: ypPlacements[i],
        yp_goals_and_wishes: ypGoals[i],
        yp_concerns: i % 3 === 0 ? "Young person expressed concern about upcoming review meeting." : i % 4 === 0 ? "Worried about finances after leaving care." : null,
        yp_signature_obtained: i % 2 === 0,
        date_views_recorded: daysAgo(Math.floor(Math.random() * 60) + 1),
        completed_by: staff.id,
        completed_by_name: staff.name,
        updated_at: dtAgo(Math.floor(Math.random() * 60) + 1),
      };
    });
    const ypResults = await db.YPViewsRecord.bulkCreate(ypViews);
    results.YPViewsRecord = ypResults.length;

    // ── 3. Reg32Report (2 draft reports — one per recent 6m window) ──────────
    const reg32Reports = [
      {
        org_id: ORG_ID,
        review_period_start: "2025-11-01",
        review_period_end: "2026-04-30",
        reviewer_name: "Dr. Helena Marsh",
        reviewer_organisation: "Marsh Quality Consultancy Ltd",
        completed_date: "2026-04-28",
        submitted_to_ofsted_date: null,
        ofsted_reference: null,
        submitted_to_la_date: null,
        yp_involvement_method: "Individual meetings and group consultation session",
        strengths_narrative: "The organisation demonstrated strong commitment to safeguarding during this review period. All homes maintained up-to-date risk assessments and the team leaders showed a clear understanding of their regulatory responsibilities. Young people reported feeling listened to and supported, with several commenting positively on their keyworker relationships.",
        areas_for_improvement_narrative: "Two homes showed gaps in Reg44 visit completion. Return interviews following missing episodes were inconsistently completed. Training compliance dipped below the 95% threshold in March 2026 and should be addressed.",
        action_plan_narrative: "1. Ensure Reg44 visits are completed monthly without exception — TL responsibility with admin oversight.\n2. Implement return interview protocol within 24 hours of a young person returning.\n3. Complete all outstanding mandatory training by 30 June 2026.\n4. Review supervision frequency across all support workers.",
        selected_yp_ids: RESIDENTS.map(r => r.id),
        selected_event_ids_strengths: [],
        selected_event_ids_improvements: [],
        selected_event_ids_actions: [],
        manager_notes: [],
        status: "complete",
        created_by: STAFF[0].id,
      },
      {
        org_id: ORG_ID,
        review_period_start: "2025-05-01",
        review_period_end: "2025-10-31",
        reviewer_name: "Mr. Jonathan Bale",
        reviewer_organisation: "Bale & Partners Independent Review",
        completed_date: "2025-10-25",
        submitted_to_ofsted_date: "2025-11-02",
        ofsted_reference: "OF-2025-XR-4412",
        submitted_to_la_date: "2025-11-03",
        yp_involvement_method: "One-to-one meetings with all young people and written feedback forms",
        strengths_narrative: "Positive evidence of progress in independent living skills across all homes. Young people demonstrated good engagement with pathway planning and education. Several residents secured part-time employment during this period which is commendable.",
        areas_for_improvement_narrative: "Medication records in Valley Care Home required improvement. One home showed repeated missing episodes without adequate review. Complaints resolution timescales were not consistently met.",
        action_plan_narrative: "1. Pharmacy review and MAR training for all staff at Valley Care Home by December 2025.\n2. Introduce missing from home debrief sessions within 48 hours.\n3. Complaints tracking system to be reviewed to ensure 28-day target is met.",
        selected_yp_ids: RESIDENTS.map(r => r.id),
        selected_event_ids_strengths: [],
        selected_event_ids_improvements: [],
        selected_event_ids_actions: [],
        manager_notes: [],
        status: "submitted",
        created_by: STAFF[0].id,
      }
    ];
    const r32Results = await db.Reg32Report.bulkCreate(reg32Reports);
    results.Reg32Report = r32Results.length;

    // ── 4. OfstedNotification (10 records) ───────────────────────────────────
    const notifTypes = ["allegation_against_staff", "serious_injury_to_child", "missing_over_24_hours", "police_involvement_serious", "outbreak_of_infectious_disease", "serious_accident", "serious_complaint", "placement_ended_unplanned", "other_serious_event", "missing_over_24_hours"];
    const notifMethods = ["online_form", "phone", "email"];
    const ofstedNotifs = Array.from({ length: 10 }, (_, i) => {
      const r = RESIDENTS[i % RESIDENTS.length];
      const h = HOMES.find(h => h.id === r.home_id) || pick(HOMES);
      const staff = pick(STAFF);
      const eventDt = dtAgo(Math.floor(Math.random() * 60) + 2);
      const notifiedDt = new Date(new Date(eventDt).getTime() + 6 * 3600000).toISOString();
      return {
        org_id: ORG_ID,
        home_id: h.id,
        home_name: h.name,
        notification_type: notifTypes[i],
        event_date: eventDt,
        resident_id: r.id,
        resident_name: r.name,
        staff_id: staff.id,
        staff_name: staff.name,
        event_summary: `Notification required: ${notifTypes[i].replace(/_/g, " ")} involving ${r.name} at ${h.name}. Staff responded appropriately and immediate safeguarding steps were taken.`,
        notification_method: pick(notifMethods),
        notified_datetime: i < 7 ? notifiedDt : null,
        hours_to_notify: i < 7 ? 6 : null,
        ofsted_reference_number: i < 5 ? `OF-2026-N-${1000 + i}` : null,
        ofsted_contact_name: i < 5 ? "Ofsted Duty Inspector" : null,
        ofsted_response: i < 4 ? "Acknowledged. No further action required at this stage." : null,
        status: pick(["pending", "notified", "acknowledged", "closed"]),
        is_deleted: false,
      };
    });
    const onResults = await db.OfstedNotification.bulkCreate(ofstedNotifs);
    results.OfstedNotification = onResults.length;

    // ── 5. LAReview (10 records) ──────────────────────────────────────────────
    const laReviewTypes = ["looked_after_review", "pathway_plan_review", "placement_review", "other"];
    const laKeyDecisions = [
      "Placement to continue. Care plan to be reviewed in 3 months.",
      "Pathway plan updated. YP to begin independence skills programme.",
      "Placement ending — transition plan initiated for move to independent flat.",
      "Care plan amended to reflect increased health needs.",
      "No change recommended. Placement meeting young person's needs.",
      "Educational support package to be increased. College liaison arranged.",
      "Risk level reduced following positive progress. Plan amended.",
      "Multi-agency referral to CAMHS recommended.",
      "Placement review due in 6 months. Current support appropriate.",
      "Life skills target achieved. New goals set for next review period.",
    ];
    const laReviews = Array.from({ length: 10 }, (_, i) => {
      const r = RESIDENTS[i % RESIDENTS.length];
      const h = HOMES.find(h => h.id === r.home_id) || pick(HOMES);
      const staff = pick(STAFF);
      const reviewDt = i < 7 ? dtAgo(Math.floor(Math.random() * 90) + 5) : new Date(Date.now() + (i - 6) * 30 * 86400000).toISOString();
      const nextReview = new Date(new Date(reviewDt).getTime() + 180 * 86400000).toISOString().split("T")[0];
      return {
        org_id: ORG_ID,
        resident_id: r.id,
        resident_name: r.name,
        home_id: h.id,
        review_date: reviewDt,
        review_type: laReviewTypes[i % laReviewTypes.length],
        chair_name: `Independent Reviewing Officer ${i + 1}`,
        chair_role: "IRO",
        attendees: [staff.name, "Social Worker", "Young Person", "Team Leader"],
        young_person_attended: i % 4 !== 0,
        young_person_views_shared: i % 3 !== 0,
        key_decisions: laKeyDecisions[i],
        pathway_plan_updated: i % 3 === 0,
        placement_continues: i !== 2,
        any_concerns_raised: i % 4 === 0,
        concern_details: i % 4 === 0 ? "Attendance at college has been inconsistent. Action plan discussed." : null,
        actions: [{ action: laKeyDecisions[i].split(".")[0], responsible: "Team Leader", target_date: nextReview, completed: i < 4 }],
        next_review_date: nextReview,
        notes: `Review ${i + 1} conducted. ${i % 2 === 0 ? "Documentation complete and filed." : "Minutes to be circulated within 5 working days."}`,
      };
    });
    const laResults = await db.LAReview.bulkCreate(laReviews);
    results.LAReview = laResults.length;

    // ── 6. SupervisionRecord (10 records) ─────────────────────────────────────
    const supNotes = [
      "Staff member was engaged and reflective. Caseload reviewed and workload concerns noted.",
      "Safeguarding refresher discussion completed. Staff demonstrated good understanding.",
      "Reflective practice session following challenging behaviour incident. Actions agreed.",
      "Career development discussed. Staff interested in team leader progression.",
      "Wellbeing check completed. Staff reported feeling supported and valued.",
      "Policy update on missing from home protocol delivered and understood.",
      "KPI review — all targets met. Performance commended.",
      "Lone working risk assessment reviewed. Lone working log up to date.",
      "Complaint learning discussion — staff reflected well on the situation.",
      "Return to work supervision following 5 days sickness absence. Phased return agreed.",
    ];
    const supActionPoints = [
      "Complete fire safety e-learning by next session.",
      "Update risk assessments for two residents by end of month.",
      "Document reflective account in personal development folder.",
      "Shadow team leader in next house meeting.",
      "Attend next team wellbeing check-in session.",
      "Review and sign the updated MFH policy.",
      "Maintain current performance and support junior staff.",
      "Complete lone working log daily for next 4 weeks.",
      "Write up complaint learning in supervision notes.",
      "Attend GP appointment and report back on health at next session.",
    ];
    const supStatuses = ["completed", "completed", "completed", "scheduled", "completed", "completed", "missed", "completed", "completed", "scheduled"];
    const supRecords = Array.from({ length: 10 }, (_, i) => {
      const supervisee = STAFF[(i + 1) % STAFF.length];
      const supervisor = STAFF[0];
      const h = pick(HOMES);
      const sessionDate = daysAgo(Math.floor(Math.random() * 80) + 5);
      const nextDate = new Date(new Date(sessionDate).getTime() + 56 * 86400000).toISOString().split("T")[0];
      return {
        org_id: ORG_ID,
        supervisee_id: supervisee.id,
        supervisee_name: supervisee.name,
        supervisor_id: supervisor.id,
        supervisor_name: supervisor.name,
        home_id: h.id,
        session_date: sessionDate,
        notes: supNotes[i],
        action_points: supActionPoints[i],
        next_supervision_date: nextDate,
        status: supStatuses[i],
      };
    });
    const supResults = await db.SupervisionRecord.bulkCreate(supRecords);
    results.SupervisionRecord = supResults.length;

    return Response.json({
      success: true,
      message: "Compliance Hub seed data created successfully",
      counts: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});