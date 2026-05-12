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
    ] = await Promise.all([
      db.StaffProfile.filter({ status: "active" }),
      db.TrainingRecord.filter({}),
      db.SupervisionRecord.filter({}),
      db.AppraisalRecord.filter({}),
      db.AttendanceLog.filter({}),
      db.Notification.list("-created_date", 500), // last 500 notifications for dedup
    ]);

    const admins = allStaff.filter(s => (s.role === "admin" || s.role === "admin_officer") && s.user_id);

    // ── 2. Build dedup set from recent notifications (last 24h) ───────────────
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dedupSet = new Set(
      recentNotifications
        .filter(n => n.created_date > cutoff24h)
        .map(n => `${n.user_id}__${n.related_module}__${n.message}`)
    );

    // ── 3. Queue notifications (collect first, then write with delay) ─────────
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

    // ── 4. DBS expiring within 90 days ────────────────────────────────────────
    let dbsCount = 0;
    const cutoff90 = new Date(today); cutoff90.setDate(today.getDate() + 90);
    for (const s of allStaff) {
      if (!s.dbs_expiry) continue;
      const expiry = new Date(s.dbs_expiry);
      if (expiry < today || expiry > cutoff90) continue;
      const recipient = getRecipient(s);
      if (!recipient?.user_id) continue;
      const daysLeft = Math.ceil((expiry - today) / 86400000);
      enqueue(
        recipient.user_id, s.org_id || recipient.org_id,
        "DBS Expiring Soon",
        `${s.full_name}'s DBS certificate expires on ${s.dbs_expiry} (${daysLeft} days). Please arrange renewal.`,
        "certification", "/staff",
        daysLeft <= 30 ? "high" : "normal"
      );
      dbsCount++;
    }

    // ── 5. Training expiring within 60 days ───────────────────────────────────
    let trainingCount = 0;
    const cutoff60 = new Date(today); cutoff60.setDate(today.getDate() + 60);
    for (const r of allTraining) {
      if (!r.expiry_date) continue;
      const expiry = new Date(r.expiry_date);
      if (expiry < today || expiry > cutoff60) continue;
      const staffMember = allStaff.find(s => s.id === r.staff_id);
      if (!staffMember) continue;
      const recipient = getRecipient(staffMember);
      if (!recipient?.user_id) continue;
      enqueue(
        recipient.user_id, staffMember.org_id || recipient.org_id,
        "Training Expiring Soon",
        `${r.staff_name || staffMember.full_name}'s ${r.course_name} expires on ${r.expiry_date}. Please arrange renewal.`,
        "certification", "/staff", "normal"
      );
      trainingCount++;
    }

    // ── 6. Supervision overdue (no session in 8 weeks) ────────────────────────
    let supervisionCount = 0;
    const eightWeeksAgo = new Date(today); eightWeeksAgo.setDate(today.getDate() - 56);
    const eightWeeksAgoStr = eightWeeksAgo.toISOString().split("T")[0];
    for (const s of allStaff.filter(s => s.role === "support_worker" || s.role === "team_leader")) {
      const lastSup = supervisions
        .filter(sv => sv.supervisee_id === s.id && sv.status === "completed")
        .sort((a, b) => (b.session_date || "").localeCompare(a.session_date || ""))[0];
      if (lastSup && lastSup.session_date >= eightWeeksAgoStr) continue;
      const recipient = getRecipient(s);
      if (!recipient?.user_id) continue;
      enqueue(
        recipient.user_id, s.org_id || recipient.org_id,
        "Supervision Overdue",
        `${s.full_name} has not had a supervision session in over 8 weeks. Last session: ${lastSup?.session_date || "never"}.`,
        "alert", "/staff", "normal"
      );
      supervisionCount++;
    }

    // ── 7. Appraisal overdue (no appraisal in 12 months) ─────────────────────
    let appraisalCount = 0;
    const twelveMonthsAgo = new Date(today); twelveMonthsAgo.setFullYear(today.getFullYear() - 1);
    const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split("T")[0];
    for (const s of allStaff) {
      const lastAppraisal = appraisals
        .filter(a => a.appraisee_id === s.id)
        .sort((a, b) => (b.appraisal_date || "").localeCompare(a.appraisal_date || ""))[0];
      if (lastAppraisal && lastAppraisal.appraisal_date >= twelveMonthsAgoStr) continue;
      const recipient = getRecipient(s);
      if (!recipient?.user_id) continue;
      enqueue(
        recipient.user_id, s.org_id || recipient.org_id,
        "Appraisal Overdue",
        `${s.full_name} has not had an appraisal in over 12 months. Last appraisal: ${lastAppraisal?.appraisal_date || "never"}.`,
        "alert", "/staff", "normal"
      );
      appraisalCount++;
    }

    // ── 8. Working Time — hours > 55 in last 7 days ───────────────────────────
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
      const recipient = getRecipient(staffMember);
      if (!recipient?.user_id) continue;
      enqueue(
        recipient.user_id, staffMember.org_id || recipient.org_id,
        "Working Hours Alert",
        `${staffMember.full_name} has worked ${totalHours.toFixed(1)} hours in the last 7 days. This is approaching the legal maximum. Please review their upcoming shifts.`,
        "alert", "/staff?tab=hr-dashboard",
        totalHours > 60 ? "high" : "normal"
      );
      wtrCount++;
    }

    // ── 9. Right to Work alerts ───────────────────────────────────────────────
    let rtwCount = 0;
    const cutoff60rtw = new Date(today); cutoff60rtw.setDate(today.getDate() + 60);
    const cutoff30rtw = new Date(today); cutoff30rtw.setDate(today.getDate() + 30);
    for (const s of allStaff) {
      const recipient = getRecipient(s);
      if (!recipient?.user_id) continue;

      if (s.rtw_checked && s.rtw_expiry_date) {
        const expiry = new Date(s.rtw_expiry_date);
        if (expiry < today) {
          enqueue(recipient.user_id, s.org_id || recipient.org_id,
            "RTW EXPIRED — Employment at Risk",
            `${s.full_name}'s Right to Work has EXPIRED (${s.rtw_expiry_date}). Employment must be suspended pending recheck immediately.`,
            "alert", "/staff", "critical");
          rtwCount++;
        } else if (expiry <= cutoff60rtw) {
          const daysLeft = Math.ceil((expiry - today) / 86400000);
          enqueue(recipient.user_id, s.org_id || recipient.org_id,
            "Right to Work Expiring Soon",
            `${s.full_name}'s Right to Work expires on ${s.rtw_expiry_date} (${daysLeft} days). Arrange recheck before expiry.`,
            "certification", "/staff",
            daysLeft <= 14 ? "high" : "normal");
          rtwCount++;
        }
      }

      if (!s.rtw_checked) {
        enqueue(recipient.user_id, s.org_id || recipient.org_id,
          "Right to Work Check Missing",
          `${s.full_name} has no Right to Work check recorded. This is required by UK law before employment. Please check immediately.`,
          "alert", "/staff", "high");
        rtwCount++;
      }

      if (s.rtw_checked && s.rtw_follow_up_date) {
        const followUp = new Date(s.rtw_follow_up_date);
        if (followUp > today && followUp <= cutoff30rtw) {
          const daysLeft = Math.ceil((followUp - today) / 86400000);
          enqueue(recipient.user_id, s.org_id || recipient.org_id,
            "RTW Share Code Recheck Due",
            `${s.full_name}'s share code recheck is due on ${s.rtw_follow_up_date} (${daysLeft} days). Visit gov.uk/view-right-to-work to verify.`,
            "certification", "/staff", "normal");
          rtwCount++;
        }
      }
    }

    // ── 10. Write notifications with pacing to avoid rate limits ─────────────
    let written = 0;
    for (const notification of queue) {
      await db.Notification.create(notification);
      written++;
      // Pace writes: small delay every 10 notifications
      if (written % 10 === 0) await sleep(200);
    }

    return Response.json({
      success: true,
      summary: { dbsCount, trainingCount, supervisionCount, appraisalCount, wtrCount, rtwCount },
      notificationsQueued: queue.length,
      notificationsWritten: written,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});