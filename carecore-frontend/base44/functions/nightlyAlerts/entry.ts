/**
 * Nightly Alerts — runs once a day to push proactive notifications for:
 * 1. DBS expiring within 90 days
 * 2. Training expiring within 60 days
 * 3. Supervisions overdue (no session in last 8 weeks)
 * 4. Appraisals overdue (no session in last 12 months)
 * 5. Working Time — hours > 55 in last 7 days
 * 6. Right to Work: expired, expiring within 60 days, share code recheck due
 *
 * RATE LIMIT FIX:
 * - All entity reads are done ONCE upfront (not inside per-staff loops)
 * - Dedup uses an in-memory Set built from a single batch fetch
 * - A small delay is added between notification writes to avoid 429s
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || !['admin', 'rsm'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // ── 1. Batch-fetch ALL data upfront ────────────────────────────────────────
    const [
      allStaff,
      allTraining,
      supervisions,
      appraisals,
      recentLogs,
      recentNotifications,
      reg32Reports,
      draftNotices,
      activeContinPlans,
      allContinPlans,
    ] = await Promise.all([
      db.StaffProfile.filter({ status: "active" }),
      db.TrainingRecord.filter({}),
      db.SupervisionRecord.filter({}),
      db.AppraisalRecord.filter({}),
      db.AttendanceLog.filter({}),
      db.Notification.list("-created_date", 500),
      db.Reg32Report.filter({}),
      db.AdmissionDischargeNotice.filter({ status: "draft" }),
      db.ContingencyPlan.filter({ status: "active" }),
      db.ContingencyPlan.filter({}),
    ]);

    // ── 2. Role-based recipient filtering ─────────────────────────────────────
    const seniorRoles = ['admin', 'rsm', 'regional_manager', 'risk_manager'];
    const admins = allStaff.filter(s => seniorRoles.includes(s.role) && s.user_id);
    const hrRecipients = allStaff.filter(s => ['hr_manager', 'hr_officer', 'admin', 'rsm', 'regional_manager'].includes(s.role) && s.user_id);
    const financeRecipients = allStaff.filter(s => ['finance_manager', 'finance_officer', 'admin', 'rsm', 'regional_manager'].includes(s.role) && s.user_id);
    const riskRecipients = allStaff.filter(s => ['risk_manager', 'risk_officer', 'admin', 'rsm', 'regional_manager'].includes(s.role) && s.user_id);

    // ── 3. Build dedup set from recent notifications (last 24h) ───────────────
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dedupSet = new Set(
      recentNotifications
        .filter(n => n.created_date > cutoff24h)
        .map(n => `${n.user_id}__${n.related_module}__${n.message}`)
    );

    // ── 4. Queue notifications (collect first, then write with delay) ─────────
    const queue = []; // { user_id, org_id, related_module, message, type, priority, link_url }

    const enqueue = (recipientUserId, orgId, title, body, type, link, priority = "normal") => {
      const key = `${recipientUserId}__${title}__${body}`;
      if (dedupSet.has(key)) return;
      dedupSet.add(key); // prevent duplicates within this run too
      queue.push({
        org_id: orgId || "default_org",
        user_id: recipientUserId,
        related_module: title,
        message: body,
        type,
        priority,
        link_url: link,
        read: false,
        acknowledged: false,
      });
    };

    const getRecipient = (staffMember) => {
      const tl = staffMember?.team_leader_id
        ? allStaff.find(s => s.id === staffMember.team_leader_id && s.user_id)
        : null;
      return tl || admins[0] || null;
    };

    const enqueueToDept = (recipients, orgId, title, body, type, link, priority = "normal") => {
      for (const recipient of recipients) {
        enqueue(recipient.user_id, orgId, title, body, type, link, priority);
      }
    };

    // ── 5. DBS expiring within 90 days → HR Recipients ────────────────────────
    let dbsCount = 0;
    const cutoff90 = new Date(today); cutoff90.setDate(today.getDate() + 90);
    for (const s of allStaff) {
      if (!s.dbs_expiry) continue;
      const expiry = new Date(s.dbs_expiry);
      if (expiry < today || expiry > cutoff90) continue;
      const daysLeft = Math.ceil((expiry - today) / 86400000);
      enqueueToDept(
        hrRecipients, s.org_id,
        "DBS Expiring Soon",
        `${s.full_name}'s DBS certificate expires on ${s.dbs_expiry} (${daysLeft} days). Please arrange renewal.`,
        "certification", "/staff",
        daysLeft <= 30 ? "high" : "normal"
      );
      dbsCount++;
    }

    // ── 6. Training expiring within 60 days → HR Recipients ─────────────────────
    let trainingCount = 0;
    const cutoff60 = new Date(today); cutoff60.setDate(today.getDate() + 60);
    for (const r of allTraining) {
      if (!r.expiry_date) continue;
      const expiry = new Date(r.expiry_date);
      if (expiry < today || expiry > cutoff60) continue;
      const staffMember = allStaff.find(s => s.id === r.staff_id);
      if (!staffMember) continue;
      enqueueToDept(
        hrRecipients, staffMember.org_id,
        "Training Expiring Soon",
        `${r.staff_name || staffMember.full_name}'s ${r.course_name} expires on ${r.expiry_date}. Please arrange renewal.`,
        "certification", "/staff", "normal"
      );
      trainingCount++;
    }

    // ── 7. Supervision overdue (no session in 8 weeks) → HR Recipients ──────────
    let supervisionCount = 0;
    const eightWeeksAgo = new Date(today); eightWeeksAgo.setDate(today.getDate() - 56);
    const eightWeeksAgoStr = eightWeeksAgo.toISOString().split("T")[0];
    for (const s of allStaff.filter(s => s.role === "support_worker" || s.role === "team_leader")) {
      const lastSup = supervisions
        .filter(sv => sv.supervisee_id === s.id && sv.status === "completed")
        .sort((a, b) => (b.session_date || "").localeCompare(a.session_date || ""))[0];
      if (lastSup && lastSup.session_date >= eightWeeksAgoStr) continue;
      enqueueToDept(
        hrRecipients, s.org_id,
        "Supervision Overdue",
        `${s.full_name} has not had a supervision session in over 8 weeks. Last session: ${lastSup?.session_date || "never"}.`,
        "alert", "/staff", "normal"
      );
      supervisionCount++;
    }

    // ── 8. Appraisal overdue (no appraisal in 12 months) → HR Recipients ───────
    let appraisalCount = 0;
    const twelveMonthsAgo = new Date(today); twelveMonthsAgo.setFullYear(today.getFullYear() - 1);
    const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split("T")[0];
    for (const s of allStaff) {
      const lastAppraisal = appraisals
        .filter(a => a.appraisee_id === s.id)
        .sort((a, b) => (b.appraisal_date || "").localeCompare(a.appraisal_date || ""))[0];
      if (lastAppraisal && lastAppraisal.appraisal_date >= twelveMonthsAgoStr) continue;
      enqueueToDept(
        hrRecipients, s.org_id,
        "Appraisal Overdue",
        `${s.full_name} has not had an appraisal in over 12 months. Last appraisal: ${lastAppraisal?.appraisal_date || "never"}.`,
        "alert", "/staff", "normal"
      );
      appraisalCount++;
    }

    // ── 9. Working Time — hours > 55 in last 7 days → HR Recipients ───────────
    let wtrCount = 0;
    const sevenDaysAgoStr = new Date(today.getTime() - 7 * 86400000).toISOString().split("T")[0];
    const logsByStaff = {};
    for (const l of recentLogs) {
      if (!l.clock_in_time || l.clock_in_time.slice(0, 10) < sevenDaysAgoStr) continue;
      logsByStaff[l.staff_id] = (logsByStaff[l.staff_id] || 0) + (l.total_hours || 0);
    }
    for (const [sid, totalHours] of Object.entries(logsByStaff)) {
      if (totalHours <= 55) continue;
      const staffMember = allStaff.find(s => s.id === sid);
      if (!staffMember) continue;
      enqueueToDept(
        hrRecipients, staffMember.org_id,
        "Working Hours Alert",
        `${staffMember.full_name} has worked ${totalHours.toFixed(1)} hours in the last 7 days. This is approaching the legal maximum. Please review their upcoming shifts.`,
        "alert", "/staff?tab=hr-dashboard",
        totalHours > 60 ? "high" : "normal"
      );
      wtrCount++;
    }

    // ── 10. Right to Work alerts → HR Recipients ──────────────────────────────
    let rtwCount = 0;
    const cutoff60rtw = new Date(today); cutoff60rtw.setDate(today.getDate() + 60);
    const cutoff30rtw = new Date(today); cutoff30rtw.setDate(today.getDate() + 30);
    for (const s of allStaff) {
      if (s.rtw_checked && s.rtw_expiry_date) {
        const expiry = new Date(s.rtw_expiry_date);
        if (expiry < today) {
          enqueueToDept(hrRecipients, s.org_id,
            "RTW EXPIRED — Employment at Risk",
            `${s.full_name}'s Right to Work has EXPIRED (${s.rtw_expiry_date}). Employment must be suspended pending recheck immediately.`,
            "alert", "/staff", "critical");
          rtwCount++;
        } else if (expiry <= cutoff60rtw) {
          const daysLeft = Math.ceil((expiry - today) / 86400000);
          enqueueToDept(hrRecipients, s.org_id,
            "Right to Work Expiring Soon",
            `${s.full_name}'s Right to Work expires on ${s.rtw_expiry_date} (${daysLeft} days). Arrange recheck before expiry.`,
            "certification", "/staff",
            daysLeft <= 14 ? "high" : "normal");
          rtwCount++;
        }
      }

      if (!s.rtw_checked) {
        enqueueToDept(hrRecipients, s.org_id,
          "Right to Work Check Missing",
          `${s.full_name} has no Right to Work check recorded. This is required by UK law before employment. Please check immediately.`,
          "alert", "/staff", "high");
        rtwCount++;
      }

      if (s.rtw_checked && s.rtw_follow_up_date) {
        const followUp = new Date(s.rtw_follow_up_date);
        if (followUp > today && followUp <= cutoff30rtw) {
          const daysLeft = Math.ceil((followUp - today) / 86400000);
          enqueueToDept(hrRecipients, s.org_id,
            "RTW Share Code Recheck Due",
            `${s.full_name}'s share code recheck is due on ${s.rtw_follow_up_date} (${daysLeft} days). Visit gov.uk/view-right-to-work to verify.`,
            "certification", "/staff", "normal");
          rtwCount++;
        }
      }
    }

    // ── 11. Reg 32 overdue check (6-monthly) → Risk/Senior Recipients ──────────
    let reg32Count = 0;
    const latestReg32 = reg32Reports
      .filter(r => r.status === "submitted")
      .sort((a, b) => (b.completed_date || "").localeCompare(a.completed_date || ""))[0];
    
    const lastReg32Date = latestReg32?.completed_date ? new Date(latestReg32.completed_date) : null;
    const daysSinceReg32 = lastReg32Date ? Math.floor((today - lastReg32Date) / (1000 * 60 * 60 * 24)) : 999;
    
    if (daysSinceReg32 >= 170) {
      const daysUntilDue = 183 - daysSinceReg32;
      const isOverdue = daysSinceReg32 >= 183;
      const rsnRoles = ["admin", "rsm", "regional_manager", "risk_manager"];
      const rsnStaff = allStaff.filter(s => rsnRoles.includes(s.role) && s.user_id);
      
      for (const s of rsnStaff) {
        enqueue(
          s.user_id,
          s.org_id,
          "Regulation 32 Review",
          isOverdue
            ? `OVERDUE: Regulation 32 Quality of Support Review is ${daysSinceReg32 - 183} days overdue. Last completed: ${lastReg32Date?.toLocaleDateString() || "never"}.`
            : `Regulation 32 Quality of Support Review due in ${daysUntilDue} days. Last completed: ${lastReg32Date?.toLocaleDateString() || "never"}.`,
          "alert",
          "/compliance-hub",
          isOverdue ? "critical" : "high"
        );
      }
      reg32Count = rsnStaff.length > 0 ? 1 : 0;
    }

    // ── 12. Reg 28 — overdue draft notices (> 2 days since placement change) ──
    let reg28Count = 0;
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    for (const notice of draftNotices) {
      const placementDate = notice.admission_date || notice.discharge_date;
      if (!placementDate) continue;
      const daysSince = Math.floor((today - new Date(placementDate)) / (1000 * 60 * 60 * 24));
      if (daysSince <= 2) continue;

      // Mark as overdue
      await db.AdmissionDischargeNotice.update(notice.id, { status: "overdue", days_since_placement_change: daysSince });

      const residentName = notice.resident_name || "Unknown resident";
      const homeName = notice.home_name || "Unknown home";
      const noticeTypeLabel = notice.notice_type === "admission" ? "admission" : "discharge";
      const title = `Reg 28 Notice Overdue — ${residentName} ${noticeTypeLabel}`;
      const body = `A written ${noticeTypeLabel} notice for ${residentName} at ${homeName} has not been recorded as sent to the local authority. This is required by Regulation 28 of the Supported Accommodation (England) Regulations 2023.`;

      // Notify TL, admin_officer, and RSM for this home
      const notifRoles = ["team_leader", "admin_officer", "admin_manager", "rsm", "admin"];
      const homeStaff = allStaff.filter(s =>
        notifRoles.includes(s.role) &&
        s.user_id &&
        (
          (s.home_ids && s.home_ids.includes(notice.home_id)) ||
          s.primary_home_id === notice.home_id ||
          ["rsm", "admin"].includes(s.role)
        )
      );
      for (const s of homeStaff) {
        enqueue(s.user_id, notice.org_id, title, body, "alert", "/compliance-hub?report=reg28", "high");
      }
      reg28Count++;
    }

    // ── 13. Reg 23 — No active contingency plan (weekly dedup) ───────────────
    let reg23NoPlanCount = 0;
    const adminRsmStaff = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
    if (activeContinPlans.length === 0) {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const alreadySent = recentNotifications.some(n =>
        n.created_date > weekAgo && n.related_module === "No Contingency Plan Policy — Reg 23 Breach Risk"
      );
      if (!alreadySent) {
        for (const s of adminRsmStaff) {
          enqueue(
            s.user_id, s.org_id,
            "No Contingency Plan Policy — Reg 23 Breach Risk",
            "Your organisation has no active contingency plan policy. This is required by Regulation 23 of the Supported Accommodation (England) Regulations 2023 and is a condition of Ofsted registration.",
            "alert", "/compliance-hub?report=reg23", "critical"
          );
        }
        reg23NoPlanCount = adminRsmStaff.length > 0 ? 1 : 0;
      }
    }

    // ── 14. Reg 23 — Plan overdue for review (within 30 days or passed) ───────
    let reg23ReviewCount = 0;
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);
    for (const plan of activeContinPlans) {
      if (!plan.review_date) continue;
      const reviewDate = new Date(plan.review_date);
      if (reviewDate > thirtyDaysFromNow) continue;
      const isOverdue = reviewDate < today;
      for (const s of adminRsmStaff) {
        enqueue(
          s.user_id, s.org_id || plan.org_id,
          "Contingency Plan Policy Review Due",
          `Your contingency plan policy (version ${plan.version_number}) is due for review on ${plan.review_date}. Review and update it in the Compliance Hub.`,
          "alert", "/compliance-hub?report=reg23", isOverdue ? "high" : "normal"
        );
      }
      reg23ReviewCount++;
    }

    // ── 15. Reg 6 — Location Assessment overdue & due within 30 days ──────────
    let reg6OverdueCount = 0;
    let reg6DueSoonCount = 0;
    const allHomes = await db.Home.filter({ status: "active" });
    const allLocationAssessments = await db.LocationAssessment.filter({ is_deleted: false });
    const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString();
    const thirtyDaysFromNowStr = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    for (const home of allHomes) {
      const homeAssessments = allLocationAssessments.filter(a => a.home_id === home.id);
      const thisYearApproved = homeAssessments.find(a => a.assessment_year === today.getFullYear() && a.status === "approved");

      // Find home staff recipients (TL + RSM/admin)
      const tlStaff = home.team_leader_id ? allStaff.filter(s => s.id === home.team_leader_id && s.user_id) : [];
      const rsmStaff = allStaff.filter(s => ["rsm", "admin"].includes(s.role) && s.user_id);
      const homeRecipients = [...tlStaff, ...rsmStaff];

      // Check 1 — No approved assessment this calendar year
      if (!thisYearApproved) {
        // Mark Home as overdue
        await db.Home.update(home.id, { location_assessment_overdue: true });

        // Weekly dedup
        const alreadySentOverdue = recentNotifications.some(n =>
          n.created_date > weekAgoStr &&
          n.related_module === `Location Assessment Overdue — ${home.name}`
        );
        if (!alreadySentOverdue) {
          for (const s of homeRecipients) {
            enqueue(
              s.user_id, home.org_id,
              `Location Assessment Overdue — ${home.name}`,
              `No location assessment has been completed for ${home.name} this calendar year. Regulation 6(2)(a) requires an annual assessment of every premises. Complete it in the Compliance Hub.`,
              "alert", "/compliance-hub?report=reg6", "high"
            );
          }
          reg6OverdueCount++;
        }
      }

      // Check 2 — Next assessment due within 30 days
      const nextDue = home.next_location_assessment_due;
      if (nextDue && nextDue <= thirtyDaysFromNowStr && nextDue >= todayStr) {
        const alreadySentDue = recentNotifications.some(n =>
          n.created_date > weekAgoStr &&
          n.related_module === `Location Assessment Due Soon — ${home.name}`
        );
        if (!alreadySentDue) {
          for (const s of homeRecipients) {
            enqueue(
              s.user_id, home.org_id,
              `Location Assessment Due Soon — ${home.name}`,
              `The annual location assessment for ${home.name} is due on ${nextDue}. Complete it in the Compliance Hub before it becomes overdue.`,
              "alert", "/compliance-hub?report=reg6", "normal"
            );
          }
          reg6DueSoonCount++;
        }
      }
    }

    // ── 16. Reg 17 & 18 — Schedule 1 Checks ────────────────────────────────
    let schedule1ExceptionalCount = 0;
    let schedule1NoRecordCount = 0;
    let schedule1InductionCount = 0;
    let schedule1ProbationCount = 0;

    const schedule1Records = await db.Schedule1CheckRecord.filter({ org_id: ORG_ID, is_deleted: false });
    const activeStaff = await db.StaffProfile.filter({ status: "active" });
    const weekAgoStrForSchedule1 = new Date(Date.now() - 7 * 86400000).toISOString();

    // Check 1 — Exceptional circumstances review date approaching (within 7 days)
    for (const rec of schedule1Records) {
      if (!rec.exceptional_circumstances_applied || rec.all_checks_complete) continue;
      if (!rec.exceptional_circumstances_review_date) continue;
      const daysUntil = Math.ceil((new Date(rec.exceptional_circumstances_review_date) - today) / 86400000);
      if (daysUntil >= 0 && daysUntil <= 7) {
        const alreadySent = recentNotifications.some(n =>
          n.created_date > weekAgoStrForSchedule1 &&
          n.related_module === `Schedule1 Exception Expiring — ${rec.staff_name}`
        );
        if (!alreadySent) {
          const recipients = allStaff.filter(s => ["admin", "rsm", "hr_manager", "regional_manager"].includes(s.role) && s.user_id);
          for (const s of recipients) {
            enqueue(
              s.user_id, org_id,
              `Exceptional Circumstances Expiring — ${rec.staff_name}`,
              `The Schedule 1 exceptional circumstances exception for ${rec.staff_name} expires on ${rec.exceptional_circumstances_review_date}. Outstanding: ${(rec.outstanding_checks || []).join(', ')}.`,
              "alert", "/compliance-hub?report=reg17_18", "normal"
            );
          }
          schedule1ExceptionalCount++;
        }
      }
    }

    // Check 2 — Exceptional circumstances review date has passed
    for (const rec of schedule1Records) {
      if (!rec.exceptional_circumstances_applied || rec.all_checks_complete) continue;
      if (!rec.exceptional_circumstances_review_date || new Date(rec.exceptional_circumstances_review_date) >= today) continue;
      const alreadySent = recentNotifications.some(n =>
        n.created_date > weekAgoStrForSchedule1 &&
        n.related_module === `Schedule1 Exception Expired — ${rec.staff_name}`
      );
      if (!alreadySent) {
        const recipients = allStaff.filter(s => ["admin", "rsm", "hr_manager", "regional_manager"].includes(s.role) && s.user_id);
        for (const s of recipients) {
          enqueue(
            s.user_id, org_id,
            `URGENT — Schedule 1 Exception Expired: ${rec.staff_name}`,
            `The exceptional circumstances exception for ${rec.staff_name} has expired and Schedule 1 checks are still incomplete. Outstanding: ${(rec.outstanding_checks || []).join(', ')}.`,
            "alert", "/compliance-hub?report=reg17_18", "high"
          );
        }
      }
    }

    // Check 3 — Staff active with no Schedule1CheckRecord
    for (const staff of activeStaff) {
      const hasRecord = schedule1Records.some(r => r.staff_id === staff.id);
      if (!hasRecord) {
        const alreadySent = recentNotifications.some(n =>
          n.created_date > weekAgoStrForSchedule1 &&
          n.related_module === `Schedule1 No Record — ${staff.full_name}`
        );
        if (!alreadySent) {
          const hrStaff = allStaff.filter(s => ["admin", "hr_manager"].includes(s.role) && s.user_id);
          for (const s of hrStaff) {
            enqueue(
              s.user_id, org_id,
              `No Schedule 1 Record — ${staff.full_name}`,
              `${staff.full_name} is marked as active staff but has no Schedule 1 check record. A record must be created immediately.`,
              "alert", `/staff?tab=schedule1_checks&staff_id=${staff.id}`, "high"
            );
          }
          schedule1NoRecordCount++;
        }
      }
    }

    // Check 4 — Induction overdue (more than 14 days since start_date)
    for (const rec of schedule1Records) {
      if (rec.induction_completed || !rec.employment_start_date) continue;
      const daysSinceStart = Math.floor((today - new Date(rec.employment_start_date)) / 86400000);
      if (daysSinceStart <= 14) continue;
      const alreadySent = recentNotifications.some(n =>
        n.created_date > weekAgoStrForSchedule1 &&
        n.related_module === `Schedule1 Induction Overdue — ${rec.staff_name}`
      );
      if (!alreadySent) {
        const staffHome = rec.home_ids && rec.home_ids[0];
        const homeStaff = allStaff.filter(s => 
          (s.role === "team_leader" || s.role === "hr_manager") && 
          s.user_id && 
          (s.home_ids?.includes(staffHome) || s.primary_home_id === staffHome || s.role === "hr_manager")
        );
        for (const s of homeStaff) {
          enqueue(
            s.user_id, org_id,
            `Induction Overdue — ${rec.staff_name}`,
            `${rec.staff_name} started on ${rec.employment_start_date} and induction has not been recorded as complete.`,
            "alert", `/staff?tab=schedule1_checks&staff_id=${rec.staff_id}`, "normal"
          );
        }
        schedule1InductionCount++;
      }
    }

    // Check 5 — Probation review due (within 14 days)
    for (const rec of schedule1Records) {
      if (rec.probation_outcome !== "pending" || !rec.probation_review_date) continue;
      const daysUntil = Math.ceil((new Date(rec.probation_review_date) - today) / 86400000);
      if (daysUntil < 0 || daysUntil > 14) continue;
      const alreadySent = recentNotifications.some(n =>
        n.created_date > weekAgoStrForSchedule1 &&
        n.related_module === `Schedule1 Probation Review Due — ${rec.staff_name}`
      );
      if (!alreadySent) {
        const staffHome = rec.home_ids && rec.home_ids[0];
        const homeStaff = allStaff.filter(s => 
          (s.role === "team_leader" || s.role === "hr_manager") && 
          s.user_id && 
          (s.home_ids?.includes(staffHome) || s.primary_home_id === staffHome || s.role === "hr_manager")
        );
        for (const s of homeStaff) {
          enqueue(
            s.user_id, org_id,
            `Probation Review Due — ${rec.staff_name}`,
            `${rec.staff_name}'s probation review is due on ${rec.probation_review_date}. Complete the review and record the outcome.`,
            "alert", `/staff?tab=schedule1_checks&staff_id=${rec.staff_id}`, "normal"
          );
        }
        schedule1ProbationCount++;
      }
    }

    // ── 17. Reg 20 — Safeguarding Policy ────────────────────────────────────
    let reg20NoPolicyCount = 0;
    let reg20ReviewOverdueCount = 0;
    let reg20AcknowledgementsOverdueCount = 0;

    const safeguardingPolicies = await db.ChildProtectionPolicy.filter({ org_id: ORG_ID, policy_type: "safeguarding", is_deleted: false });
    const activeSafeguardingPolicy = safeguardingPolicies.find(p => p.status === "active");
    const adminsRsmStaff = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
    const hrStaff = allStaff.filter(s => ["hr_manager", "admin"].includes(s.role) && s.user_id);

    // Check 1 — No active safeguarding policy
    if (!activeSafeguardingPolicy) {
      const weekAgoSafeguarding = new Date(Date.now() - 7 * 86400000).toISOString();
      const alreadySentNoPolicySafeguarding = recentNotifications.some(n =>
        n.created_date > weekAgoSafeguarding &&
        n.related_module === "No Safeguarding Policy — Reg 20 Breach Risk"
      );
      if (!alreadySentNoPolicySafeguarding) {
        for (const s of adminsRsmStaff) {
          enqueue(s.user_id, s.org_id,
            "No Safeguarding Policy — Reg 20 Breach Risk",
            "Your organisation has no active safeguarding policy. This is required by Regulation 20. Create one in the Compliance Hub immediately.",
            "alert", "/compliance-hub?report=reg20", "critical");
        }
        reg20NoPolicyCount = adminsRsmStaff.length > 0 ? 1 : 0;
      }
    }

    // Check 2 — Policy review overdue
    if (activeSafeguardingPolicy && activeSafeguardingPolicy.review_date) {
      const reviewDate = new Date(activeSafeguardingPolicy.review_date);
      if (reviewDate < today) {
        const weekAgoReview = new Date(Date.now() - 7 * 86400000).toISOString();
        const alreadySentReviewOverdue = recentNotifications.some(n =>
          n.created_date > weekAgoReview &&
          n.related_module === `Safeguarding Policy Review Overdue — v${activeSafeguardingPolicy.version_number}`
        );
        if (!alreadySentReviewOverdue) {
          for (const s of adminsRsmStaff) {
            enqueue(s.user_id, s.org_id,
              "Safeguarding Policy Review Overdue",
              `Your safeguarding policy (version ${activeSafeguardingPolicy.version_number}) was due for review on ${activeSafeguardingPolicy.review_date}. Review and update it in the Compliance Hub.`,
              "alert", "/compliance-hub?report=reg20", "high");
          }
          reg20ReviewOverdueCount = adminsRsmStaff.length > 0 ? 1 : 0;
        }
      }
    }

    // Check 3 — Staff acknowledgements overdue
    if (activeSafeguardingPolicy) {
      const overdueAcknowledgements = await db.PolicyAcknowledgement.filter({
        org_id: ORG_ID,
        policy_type: "safeguarding",
        acknowledged: false,
        is_deleted: false
      });
      
      const overdueRecords = overdueAcknowledgements.filter(a => {
        const deadline = new Date(a.acknowledgement_deadline);
        return deadline < today;
      });

      if (overdueRecords.length > 0) {
        // Mark as overdue
        for (const rec of overdueRecords) {
          const daysSince = Math.floor((today - new Date(rec.acknowledgement_deadline)) / 86400000);
          await db.PolicyAcknowledgement.update(rec.id, { is_overdue: true, days_overdue: daysSince });
        }

        const weekAgoAck = new Date(Date.now() - 7 * 86400000).toISOString();
        const alreadySentAckOverdue = recentNotifications.some(n =>
          n.created_date > weekAgoAck &&
          n.related_module === `Safeguarding Policy — ${overdueRecords.length} Staff Not Acknowledged`
        );
        if (!alreadySentAckOverdue) {
          for (const s of hrStaff) {
            enqueue(s.user_id, s.org_id,
              `Safeguarding Policy — ${overdueRecords.length} Staff Not Acknowledged`,
              `${overdueRecords.length} staff members have not acknowledged the safeguarding policy and are overdue. View the acknowledgement log in the Compliance Hub.`,
              "alert", "/compliance-hub?report=reg20", "high");
          }
          reg20AcknowledgementsOverdueCount = hrStaff.length > 0 ? 1 : 0;
        }
      }
    }

    // ── 18. Reg 34 — Notice of Changes ──────────────────────────────────────
    let reg34SeventyTwoHourCount = 0;
    let reg34OverdueCount = 0;
    let reg34TenWorkingDayCount = 0;

    const reg34Records = await db.Reg34ChangeNotification.filter({ org_id: ORG_ID, is_deleted: false, notification_sent: false });
    const bankHolidayRecords = await db.BankHoliday.filter({});
    const bankHolidaySet = new Set(bankHolidayRecords.map(h => h.date.split('T')[0]));

    // Check 1 — 72-hour deadline approaching (fewer than 24 hours)
    for (const rec of reg34Records) {
      if (rec.deadline_type !== "seventy_two_hours") continue;
      if (!rec.notification_deadline) continue;
      
      const hoursRemaining = Math.ceil((new Date(rec.notification_deadline) - today) / 3600000);
      
      if (hoursRemaining >= 0 && hoursRemaining < 24) {
        const alreadySent = recentNotifications.some(n =>
          n.created_date > new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() &&
          n.related_module === `Reg34 72Hour Critical — ${rec.home_name || rec.change_type_description}`
        );
        
        if (!alreadySent) {
          const recipients = allStaff.filter(s => ["admin", "admin_officer", "rsm"].includes(s.role) && s.user_id);
          for (const staff of recipients) {
            enqueue(
              staff.user_id, org_id,
              `CRITICAL — Ofsted Notice Due in ${hoursRemaining} Hours`,
              `A 72-hour Reg 34 notification for ${rec.home_name || rec.change_type_description} is due by ${rec.notification_deadline}. Notify Ofsted immediately via the portal or in writing.`,
              "alert", "/compliance-hub?report=reg34", "critical"
            );
          }
          reg34SeventyTwoHourCount++;
        }
      }
    }

    // Check 2 — Any notification overdue
    for (const rec of reg34Records) {
      if (!rec.notification_deadline || new Date(rec.notification_deadline) >= today) continue;
      
      const alreadySent = recentNotifications.some(n =>
        n.created_date > weekAgoStr &&
        n.related_module === `Reg34 Overdue — ${rec.home_name || rec.change_type_description}`
      );
      
      if (!alreadySent) {
        // Update status to overdue
        await db.Reg34ChangeNotification.update(rec.id, { is_overdue: true, status: "overdue" });
        
        const recipients = allStaff.filter(s => ["admin", "rsm", "regional_manager"].includes(s.role) && s.user_id);
        for (const staff of recipients) {
          enqueue(
            staff.user_id, org_id,
            `Reg 34 Notice Overdue — ${rec.change_type_description}`,
            `A Regulation 34 change notification is overdue. The deadline was ${rec.notification_deadline}. Notify Ofsted immediately and record a late notification reason.`,
            "alert", "/compliance-hub?report=reg34", "high"
          );
        }
        reg34OverdueCount++;
      }
    }

    // Check 3 — 10-working-day deadline approaching (within 3 working days)
    for (const rec of reg34Records) {
      if (rec.deadline_type !== "ten_working_days") continue;
      if (!rec.notification_deadline) continue;
      
      // Count working days remaining
      let workingDaysRemaining = 0;
      let checkDate = new Date(today);
      while (checkDate <= new Date(rec.notification_deadline) && workingDaysRemaining < 3) {
        checkDate.setDate(checkDate.getDate() + 1);
        const dayOfWeek = checkDate.getDay();
        const checkDateStr = checkDate.toISOString().split('T')[0];
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !bankHolidaySet.has(checkDateStr)) {
          workingDaysRemaining++;
        }
      }
      
      if (workingDaysRemaining <= 3 && workingDaysRemaining > 0) {
        const alreadySent = recentNotifications.some(n =>
          n.created_date > weekAgoStr &&
          n.related_module === `Reg34 10WorkDay — ${rec.home_name}`
        );
        
        if (!alreadySent) {
          const recipients = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
          for (const staff of recipients) {
            enqueue(
              staff.user_id, org_id,
              `Reg 34 Notice Due in ${workingDaysRemaining} Working Days — Premises No Longer in Use`,
              `${rec.home_name} was marked as no longer in use on ${rec.change_event_date}. Ofsted must be notified by ${rec.notification_deadline}.`,
              "alert", "/compliance-hub?report=reg34", "normal"
            );
          }
          reg34TenWorkingDayCount++;
        }
      }
    }

    // ── 19. Reg 21 — Missing Child Policy ────────────────────────────────────
    let reg21NoPolicyCount = 0;
    let reg21NoConsultationCount = 0;
    let reg21ReviewOverdueCount = 0;
    let reg21NoReturnInterviewCount = 0;

    const reg21Policies = await db.ChildProtectionPolicy.filter({ org_id: ORG_ID, policy_type: "missing_child", is_deleted: false });
    const activeMissingPolicy = reg21Policies.find(p => p.status === "active");
    
    // Check 1 — No active missing child policy
    if (!activeMissingPolicy) {
      const alreadySent = recentNotifications.some(n =>
        n.created_date > weekAgoStr && n.related_module === "Reg21 No Policy"
      );
      if (!alreadySent) {
        const recipients = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
        for (const staff of recipients) {
          enqueue(
            staff.user_id, org_id,
            "No Missing Child Policy — Reg 21 Breach Risk",
            "Your organisation has no active missing child policy. This is required by Regulation 21 of the Supported Accommodation (England) Regulations 2023.",
            "alert", "/compliance-hub?report=missing_child_policy", "high"
          );
        }
        reg21NoPolicyCount++;
      }
    } else {
      // Check 2 — Active policy with no consultation record
      if (!activeMissingPolicy.pre_implementation_consultation_completed && !activeMissingPolicy.amendment_consultation_completed) {
        const alreadySent = recentNotifications.some(n =>
          n.created_date > weekAgoStr && n.related_module === "Reg21 No Consultation"
        );
        if (!alreadySent) {
          const recipients = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
          for (const staff of recipients) {
            enqueue(
              staff.user_id, org_id,
              "Missing Child Policy — Consultation Not Recorded",
              "Your missing child policy is active but no consultation record has been completed. Regulation 21(2)(a) requires consultation with relevant persons before implementation.",
              "alert", "/compliance-hub?report=missing_child_policy", "high"
            );
          }
          reg21NoConsultationCount++;
        }
      }

      // Check 3 — Policy review overdue
      if (activeMissingPolicy.review_date && new Date(activeMissingPolicy.review_date) < today) {
        const alreadySent = recentNotifications.some(n =>
          n.created_date > weekAgoStr && n.related_module === "Reg21 Review Overdue"
        );
        if (!alreadySent) {
          const recipients = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
          for (const staff of recipients) {
            enqueue(
              staff.user_id, org_id,
              `Missing Child Policy Review Overdue — v${activeMissingPolicy.version_number}`,
              `Your missing child policy (version ${activeMissingPolicy.version_number}) was due for review on ${activeMissingPolicy.review_date}. Note that any amendment requires consultation before it can be activated.`,
              "alert", "/compliance-hub?report=missing_child_policy", "normal"
            );
          }
          reg21ReviewOverdueCount++;
        }
      }
    }

    // Check 4 — Missing episodes with no return interview (overdue by 3 days)
    const mfhRecords = await db.MissingFromHome.filter({ org_id: ORG_ID });
    for (const mfh of mfhRecords) {
      if (!mfh.return_interview_conducted && mfh.missing_status === "returned" && mfh.return_date) {
        const daysSinceReturn = Math.floor((today - new Date(mfh.return_date)) / (1000 * 60 * 60 * 24));
        if (daysSinceReturn >= 3) {
          const resident = await db.Resident.filter({ id: mfh.resident_id });
          const home = await db.Home.filter({ id: mfh.home_id });
          const teamLeader = staffProfiles.find(s => s.id === home[0]?.team_leader_id);

          if (teamLeader && teamLeader.user_id) {
            const alreadySent = recentNotifications.some(n =>
              n.created_date > todayStr &&
              n.related_module === `Reg21 No ReturnInterview — ${mfh.id}`
            );
            if (!alreadySent) {
              enqueue(
                teamLeader.user_id, org_id,
                `Return Interview Overdue — ${resident[0]?.display_name || "Resident"}`,
                `${resident[0]?.display_name || "A resident"} returned from a missing episode on ${mfh.return_date} and no return interview has been recorded. The missing child policy requires a return interview after every missing episode.`,
                "alert", `/residents?tab=missing&resident_id=${mfh.resident_id}`, "normal"
              );
              reg21NoReturnInterviewCount++;
            }
          }
        }
      }
    }

    // ── 20. Reg 22 — Behaviour Management Policy ─────────────────────────────
    let reg22NoPolicyCount = 0;
    let reg22ReviewOverdueCount = 0;
    let reg22AcknowledgementsOverdueCount = 0;

    const reg22Policies = await db.ChildProtectionPolicy.filter({ org_id: ORG_ID, policy_type: "behaviour_management", is_deleted: false });
    const activeBehaviourPolicy = reg22Policies.find(p => p.status === "active");

    // Check 1 — No active behaviour management policy
    if (!activeBehaviourPolicy) {
      const weekAgoNoPol = new Date(Date.now() - 7 * 86400000).toISOString();
      const alreadySentNoPolicy = recentNotifications.some(n =>
        n.created_date > weekAgoNoPol && n.related_module === "Reg22 No Policy"
      );
      if (!alreadySentNoPolicy) {
        const recipients = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
        for (const staff of recipients) {
          enqueue(
            staff.user_id, org_id,
            "No Behaviour Management Policy — Reg 22 Breach Risk",
            "Your organisation has no active behaviour management policy. This is required by Regulation 22(1) of the Supported Accommodation (England) Regulations 2023.",
            "alert", "/compliance-hub?report=reg22", "high"
          );
        }
        reg22NoPolicyCount++;
      }
    } else {
      // Check 2 — Policy review overdue
      if (activeBehaviourPolicy.review_date && new Date(activeBehaviourPolicy.review_date) < today) {
        const weekAgoReview = new Date(Date.now() - 7 * 86400000).toISOString();
        const alreadySentReview = recentNotifications.some(n =>
          n.created_date > weekAgoReview && n.related_module === "Reg22 Review Overdue"
        );
        if (!alreadySentReview) {
          const recipients = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
          for (const staff of recipients) {
            enqueue(
              staff.user_id, org_id,
              `Behaviour Management Policy Review Overdue — v${activeBehaviourPolicy.version_number}`,
              `Your behaviour management policy (version ${activeBehaviourPolicy.version_number}) was due for review on ${activeBehaviourPolicy.review_date}. Update it in the Compliance Hub.`,
              "alert", "/compliance-hub?report=reg22", "normal"
            );
          }
          reg22ReviewOverdueCount++;
        }
      }
    }

    // Check 3 — Staff acknowledgements overdue
    if (activeBehaviourPolicy) {
      const overdueAcks = await db.PolicyAcknowledgement.filter({
        org_id: ORG_ID,
        policy_type: "behaviour_management",
        acknowledged: false,
        is_deleted: false
      });
      
      const overdueRecords = overdueAcks.filter(a => {
        const deadline = new Date(a.acknowledgement_deadline);
        return deadline < today;
      });

      if (overdueRecords.length > 0) {
        // Mark as overdue
        for (const rec of overdueRecords) {
          const daysSince = Math.floor((today - new Date(rec.acknowledgement_deadline)) / 86400000);
          await db.PolicyAcknowledgement.update(rec.id, { is_overdue: true, days_overdue: daysSince });
        }

        const weekAgoAck = new Date(Date.now() - 7 * 86400000).toISOString();
        const alreadySentAck = recentNotifications.some(n =>
          n.created_date > weekAgoAck &&
          n.related_module === `Reg22 Ack Overdue — ${overdueRecords.length}`
        );
        if (!alreadySentAck) {
          const hrStaff = allStaff.filter(s => ["hr_manager", "admin"].includes(s.role) && s.user_id);
          for (const staff of hrStaff) {
            enqueue(
              staff.user_id, org_id,
              `Behaviour Management Policy — ${overdueRecords.length} Staff Not Acknowledged`,
              `${overdueRecords.length} staff members have not acknowledged the behaviour management policy and are overdue. This policy covers restraint — all staff must be familiar with it.`,
              "alert", "/compliance-hub?report=reg22", "high"
            );
          }
          reg22AcknowledgementsOverdueCount++;
        }
      }
    }

    // ── 22. Reg 24 & 25 — Record Completeness Batch Check ────────────────────
    // This runs ONCE per night for all residents — critical for performance
    let completenessCheckCount = 0;
    let criticalRecordsCount = 0;
    let incompleteRecordsCount = 0;

    // Batch-fetch all data upfront (no loops with queries)
    const [
      allResidents,
      allHealthProfiles,
      allFamilyContacts,
      allEducationRecords,
      allEmploymentRecords,
      allEETRecords,
      allSupportPlans,
      allPathwayPlans,
      allPlacementPlans,
      allPlacementRecords,
      allMissingFromHome,
      allRestraintRecords,
      allAccidentReports,
      allMedicationRecords,
      allResidentDocuments,
      allResidentSavings,
      allAllowancePayments,
      allExistingChecks,
      allExistingRetention,
    ] = await Promise.all([
      db.Resident.filter({ is_deleted: false }),
      db.HealthProfile.filter({}),
      db.FamilyContact.filter({}),
      db.EducationRecord.filter({}),
      db.EmploymentRecord.filter({}),
      db.EETRecord.filter({}),
      db.SupportPlan.filter({}),
      db.PathwayPlan.filter({}),
      db.PlacementPlan.filter({}),
      db.PlacementRecord.filter({}),
      db.MissingFromHome.filter({}),
      db.RestraintRecord.filter({}),
      db.AccidentReport.filter({}),
      db.MedicationRecord.filter({}),
      db.ResidentDocument.filter({}),
      db.ResidentSavingsTransaction.filter({}),
      db.ResidentAllowancePayment.filter({}),
      db.RecordCompletenessCheck.filter({ org_id: ORG_ID }),
      db.RecordRetentionConfig.filter({ org_id: ORG_ID }),
    ]);

    // Completeness check per resident (no individual queries)
    for (const resident of allResidents) {
      const checks = {
        check_full_name: !!resident.full_name,
        check_dob_and_sex: !!resident.dob && !!resident.gender,
        check_religion: !!resident.religion,
        check_ethnicity_and_language: !!resident.ethnicity && !!resident.language,
        check_address_before_admission: !!resident.address,
        check_address_on_discharge: !resident.placement_end_date || allPlacementRecords.some(p => p.resident_id === resident.id && p.discharge_address),
        check_money_and_valuables: allResidentSavings.some(s => s.resident_id === resident.id) || allAllowancePayments.some(a => a.resident_id === resident.id),
        check_statutory_provision: !!resident.legal_placement_basis,
        check_accommodating_authority_contact: !!resident.placing_local_authority && !!resident.placing_la_contact,
        check_parents_details: allFamilyContacts.some(f => f.resident_id === resident.id && f.relationship?.includes("parent")),
        check_social_worker_details: !!resident.social_worker_name && !!resident.social_worker_phone,
        check_school_or_college: resident.age < 16 || allEducationRecords.some(e => e.resident_id === resident.id) || resident.education_status === "not_applicable",
        check_employer_details: resident.age < 16 || allEmploymentRecords.some(e => e.resident_id === resident.id) || allEETRecords.some(e => e.resident_id === resident.id && e.eet_status === "not_applicable"),
        check_missing_from_home_records: allMissingFromHome.filter(m => m.resident_id === resident.id).every(m => m.return_interview_conducted || m.missing_status !== "returned") || !allMissingFromHome.some(m => m.resident_id === resident.id),
        check_restraint_records: allRestraintRecords.filter(r => r.resident_id === resident.id).every(r => r.overall_status === "completed") || !allRestraintRecords.some(r => r.resident_id === resident.id),
        check_contact_arrangements: allFamilyContacts.some(f => f.resident_id === resident.id && f.contact_restrictions),
        check_sen_statement_or_ehcp: allEducationRecords.find(e => e.resident_id === resident.id)?.ehcp_in_place !== undefined || resident.education_status === "not_applicable",
        check_school_reports: allResidentDocuments.some(d => d.resident_id === resident.id && d.document_type === "school_report") || resident.education_status === "not_applicable",
        check_relevant_plans: allSupportPlans.some(p => p.resident_id === resident.id && p.status === "active") || allPathwayPlans.some(p => p.resident_id === resident.id && p.status === "active") || allPlacementPlans.some(p => p.resident_id === resident.id && p.status === "active"),
        check_plan_review_dates: [allSupportPlans, allPathwayPlans, allPlacementPlans].flatMap(plans => plans.filter(p => p.resident_id === resident.id && p.status === "active")).every(p => p.review_date),
        check_gp_details: allHealthProfiles.find(h => h.resident_id === resident.id)?.gp_name && allHealthProfiles.find(h => h.resident_id === resident.id)?.gp_practice,
        check_accident_illness_records: allAccidentReports.filter(a => a.resident_id === resident.id).every(a => a.reviewed_by_id) || !allAccidentReports.some(a => a.resident_id === resident.id),
        check_immunisation_allergy_medical: allHealthProfiles.find(h => h.resident_id === resident.id)?.allergies !== undefined,
        check_health_examination_details: !!allHealthProfiles.find(h => h.resident_id === resident.id) && new Date(allHealthProfiles.find(h => h.resident_id === resident.id).last_updated_at || "1970-01-01") > new Date(Date.now() - 365 * 86400000),
        check_medication_details: allMedicationRecords.filter(m => m.resident_id === resident.id).length > 0 || !allMedicationRecords.some(m => m.resident_id === resident.id),
        check_dietary_health_needs: allHealthProfiles.find(h => h.resident_id === resident.id)?.dietary_needs !== undefined || allHealthProfiles.find(h => h.resident_id === resident.id)?.health_needs,
      };

      const checksPassed = Object.values(checks).filter(v => v).length;
      const completenessScore = (checksPassed / 26) * 100;
      const completeness_band = completenessScore === 100 ? "complete" : completenessScore >= 90 ? "good" : completenessScore >= 75 ? "needs_attention" : completenessScore >= 50 ? "incomplete" : "critical";
      const missing_items = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k.replace("check_", "").replace(/_/g, " "));

      // Calc retention expiry
      const dob = new Date(resident.dob);
      const retentionYears = resident.placement_end_date && resident.death_before_18 ? 15 : 75;
      const retentionExpiry = resident.death_before_18 && resident.death_date
        ? new Date(new Date(resident.death_date).getTime() + 15 * 365.25 * 86400000)
        : new Date(dob.getFullYear() + 75, dob.getMonth(), dob.getDate());

      const yearsRemaining = (retentionExpiry.getTime() - today) / (365.25 * 86400000);

      // Upsert check
      const existingCheck = allExistingChecks.find(c => c.resident_id === resident.id);
      const checkPayload = {
        org_id: ORG_ID,
        resident_id: resident.id,
        resident_name: resident.display_name,
        resident_dob: resident.dob,
        home_id: resident.home_id,
        home_name: resident.home_name,
        service_type: resident.service_type,
        placement_status: resident.placement_end_date ? "discharged" : "active",
        retention_expiry_date: format(retentionExpiry, "yyyy-MM-dd"),
        death_before_18: resident.death_before_18,
        death_date: resident.death_date,
        years_remaining_on_record: Math.ceil(yearsRemaining),
        retention_period_expired: retentionExpiry < today,
        ...checks,
        total_checks: 26,
        checks_passed: checksPassed,
        completeness_score: completenessScore,
        completeness_band,
        missing_items,
        last_checked_at: today.toISOString(),
        last_checked_by: "nightly_check",
      };

      if (existingCheck) {
        await db.RecordCompletenessCheck.update(existingCheck.id, checkPayload);
      } else {
        await db.RecordCompletenessCheck.create(checkPayload);
      }
      completenessCheckCount++;

      // Send alerts for critical/incomplete
      if (completeness_band === "critical") {
        const tlRecipients = allStaff.filter(s => s.home_ids?.includes(resident.home_id) && ["team_leader", "team_manager"].includes(s.role) && s.user_id);
        for (const staff of tlRecipients) {
          enqueue(
            staff.user_id, org_id,
            `Critical Record Gap — ${resident.display_name}`,
            `Case record for ${resident.display_name} is only ${completenessScore.toFixed(1)}% complete. ${missing_items.length} Schedule 2 items missing. Missing: ${missing_items.slice(0, 3).join(", ")}${missing_items.length > 3 ? ", ..." : ""}. Review in Residents module.`,
            "alert", `/residents?resident_id=${resident.id}&tab=records`, "critical"
          );
        }
        criticalRecordsCount++;
      } else if (completeness_band === "incomplete") {
        const tlRecipients = allStaff.filter(s => s.home_ids?.includes(resident.home_id) && ["team_leader", "team_manager"].includes(s.role) && s.user_id);
        for (const staff of tlRecipients) {
          enqueue(
            staff.user_id, org_id,
            `Incomplete Case Record — ${resident.display_name}`,
            `${resident.display_name}'s case record is ${completenessScore.toFixed(1)}% complete. Missing: ${missing_items.join(", ")}.`,
            "alert", `/residents?resident_id=${resident.id}&tab=records`, "normal"
          );
        }
        incompleteRecordsCount++;
      }
    }

    // ── 23. Reg 24 & 25 — Retention Review Overdue ──────────────────────────
    let retentionReviewCount = 0;
    for (const config of allExistingRetention) {
      if (config.next_review_date && new Date(config.next_review_date) < today) {
        const weekAgoRet = new Date(Date.now() - 7 * 86400000).toISOString();
        const alreadySentRet = recentNotifications.some(n =>
          n.created_date > weekAgoRet && n.related_module === "Reg24_25 Retention Review"
        );
        if (!alreadySentRet) {
          const recipients = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
          for (const staff of recipients) {
            enqueue(
              staff.user_id, org_id,
              "Record Retention Policy Review Overdue",
              `Your record retention configuration has not been reviewed since ${config.last_reviewed_date || "setup"}. Annual review is recommended. Review it in the Compliance Hub.`,
              "alert", "/compliance-hub?report=reg24_25", "normal"
            );
          }
          retentionReviewCount++;
        }
      }
    }

    // ── 25. Reg 26 — Annual Storage Audit ────────────────────────────────────
    let reg26NoAuditCount = 0;
    let reg26AuditOverdueCount = 0;
    let reg26IssuesUnresolvedCount = 0;

    const storageAudits = await db.StorageAudit.filter({ org_id: ORG_ID, is_deleted: false });
    const latestAudit = storageAudits.sort((a, b) => (b.audit_date || "").localeCompare(a.audit_date || ""))[0];
    const adminRSMStaff = allStaff.filter(s => ["admin", "rsm"].includes(s.role) && s.user_id);
    const weekAgoReg26 = new Date(Date.now() - 7 * 86400000).toISOString();

    // Check 1 — No audit ever conducted
    if (!latestAudit) {
      const alreadySentNoAudit = recentNotifications.some(n =>
        n.created_date > weekAgoReg26 && n.related_module === "Reg26 No Audit"
      );
      if (!alreadySentNoAudit) {
        for (const s of adminRSMStaff) {
          enqueue(s.user_id, s.org_id,
            "No Storage Audit Conducted — Reg 26",
            "No Regulation 26 storage audit has been conducted. All records must be stored accessibly. Run an audit in the Compliance Hub.",
            "alert", "/compliance-hub?report=reg26", "high");
        }
        reg26NoAuditCount = adminRSMStaff.length > 0 ? 1 : 0;
      }
    } else {
      // Check 2 — Audit overdue
      if (latestAudit.next_audit_due && new Date(latestAudit.next_audit_due) < today) {
        const alreadySentOverdue = recentNotifications.some(n =>
          n.created_date > weekAgoReg26 && n.related_module === "Reg26 Audit Overdue"
        );
        if (!alreadySentOverdue) {
          for (const s of adminRSMStaff) {
            enqueue(s.user_id, s.org_id,
              "Annual Storage Audit Overdue — Reg 26",
              `Your last audit was on ${latestAudit.audit_date}. An annual audit is recommended. Run a new audit in the Compliance Hub.`,
              "alert", "/compliance-hub?report=reg26", "normal");
          }
          reg26AuditOverdueCount = adminRSMStaff.length > 0 ? 1 : 0;
        }
      }

      // Check 3 — Issues from last audit unresolved after 30 days
      if (latestAudit.items_with_issues > 0) {
        const auditDate = new Date(latestAudit.audit_date);
        const daysSinceAudit = Math.floor((today - auditDate) / (1000 * 60 * 60 * 24));
        if (daysSinceAudit > 30) {
          const alreadySentIssues = recentNotifications.some(n =>
            n.created_date > weekAgoReg26 && n.related_module === "Reg26 Issues Unresolved"
          );
          if (!alreadySentIssues) {
            for (const s of adminRSMStaff) {
              enqueue(s.user_id, s.org_id,
                "Reg 26 Audit Issues Unresolved",
                `Your audit on ${latestAudit.audit_date} identified ${latestAudit.items_with_issues} item(s) with issues. These have not been resolved. Re-run the audit after addressing the issues.`,
                "alert", "/compliance-hub?report=reg26", "normal");
            }
            reg26IssuesUnresolvedCount = adminRSMStaff.length > 0 ? 1 : 0;
          }
        }
      }
    }

    // ── 26. Write notifications with pacing to avoid rate limits ─────────────
    let written = 0;
    for (const notification of queue) {
      await db.Notification.create(notification);
      written++;
      // Pace writes: small delay every 10 notifications
      if (written % 10 === 0) await sleep(200);
    }

    return Response.json({
      success: true,
      summary: { dbsCount, trainingCount, supervisionCount, appraisalCount, wtrCount, rtwCount, reg32Count, reg28Count, reg23NoPlanCount, reg23ReviewCount, reg6OverdueCount, reg6DueSoonCount, schedule1ExceptionalCount, schedule1NoRecordCount, schedule1InductionCount, schedule1ProbationCount, reg20NoPolicyCount, reg20ReviewOverdueCount, reg20AcknowledgementsOverdueCount, reg21NoPolicyCount, reg21NoConsultationCount, reg21ReviewOverdueCount, reg21NoReturnInterviewCount, reg22NoPolicyCount, reg22ReviewOverdueCount, reg22AcknowledgementsOverdueCount, completenessCheckCount, criticalRecordsCount, incompleteRecordsCount, retentionReviewCount, reg26NoAuditCount, reg26AuditOverdueCount, reg26IssuesUnresolvedCount, reg34SeventyTwoHourCount, reg34OverdueCount, reg34TenWorkingDayCount },
      notificationsQueued: queue.length,
      notificationsWritten: written,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});