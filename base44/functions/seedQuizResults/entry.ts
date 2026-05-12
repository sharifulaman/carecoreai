import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const QUIZ_ID = "safeguarding_children_v1";
const QUIZ_TITLE = "Children's Supported Home — Safeguarding Quiz";
const TOTAL_Q = 20;
const PASS_THRESHOLD = 80;
const ORG_ID = "default_org";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all staff
    const staff = await base44.asServiceRole.entities.StaffProfile.filter({ org_id: ORG_ID });
    if (!staff || staff.length === 0) {
      return Response.json({ error: "No staff found" }, { status: 400 });
    }

    // Clear existing quiz results for this quiz
    const existing = await base44.asServiceRole.entities.PolicyQuizResult.filter({ quiz_id: QUIZ_ID, org_id: ORG_ID });
    for (const r of existing) {
      await base44.asServiceRole.entities.PolicyQuizResult.delete(r.id);
    }

    // Generate realistic seeded results
    const now = new Date();
    const records = [];

    for (let idx = 0; idx < staff.length; idx++) {
      const s = staff[idx];
      
      // Vary results: 60% pass, 25% fail, 15% assigned only
      const roll = idx % 20;
      let status, score, passed, completedAt;

      if (roll < 12) {
        // Passed
        score = 80 + Math.floor(Math.random() * 20); // 80-99
        passed = true;
        status = "completed";
        const daysAgo = Math.floor(Math.random() * 30);
        completedAt = new Date(now.getTime() - daysAgo * 86400000).toISOString();
      } else if (roll < 17) {
        // Failed
        score = 40 + Math.floor(Math.random() * 39); // 40-78
        passed = false;
        status = "completed";
        const daysAgo = Math.floor(Math.random() * 14);
        completedAt = new Date(now.getTime() - daysAgo * 86400000).toISOString();
      } else {
        // Assigned but not yet taken
        score = 0;
        passed = false;
        status = "assigned";
        completedAt = null;
      }

      const correct = Math.round((score / 100) * TOTAL_Q);
      
      // Build fake answers array
      const answers = [];
      for (let qi = 0; qi < TOTAL_Q; qi++) {
        const isCorrect = qi < correct;
        answers.push({ question_index: qi, selected: isCorrect ? 1 : 0, correct: isCorrect });
      }

      records.push({
        org_id: ORG_ID,
        quiz_id: QUIZ_ID,
        quiz_title: QUIZ_TITLE,
        staff_id: s.id,
        staff_name: s.full_name,
        staff_role: s.role,
        assigned_by_id: null,
        assigned_by_name: "Admin",
        score,
        correct_answers: correct,
        total_questions: TOTAL_Q,
        passed,
        pass_threshold: PASS_THRESHOLD,
        answers: status === "completed" ? answers : [],
        completed_at: completedAt,
        attempt_number: status === "completed" ? 1 : 0,
        status,
      });

      // If passed, also add SWPerformanceKPI record
      if (passed) {
        await base44.asServiceRole.entities.SWPerformanceKPI.create({
          org_id: ORG_ID,
          worker_id: s.id,
          worker_name: s.full_name,
          date: completedAt ? completedAt.split("T")[0] : now.toISOString().split("T")[0],
          month: completedAt ? completedAt.slice(0, 7) : now.toISOString().slice(0, 7),
          activity_type: "home_check_completed",
          source_entity: "PolicyQuizResult",
          notes: `QUIZ PASSED: ${QUIZ_TITLE} — Score: ${score}%`,
        });
      }
    }

    await base44.asServiceRole.entities.PolicyQuizResult.bulkCreate(records);

    return Response.json({
      success: true,
      message: `Seeded ${records.length} quiz results`,
      passed: records.filter(r => r.passed).length,
      failed: records.filter(r => !r.passed && r.status === "completed").length,
      assigned: records.filter(r => r.status === "assigned").length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});