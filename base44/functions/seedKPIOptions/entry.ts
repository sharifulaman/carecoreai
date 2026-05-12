import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ORG_ID = "default_org";

const defaultOptions = {
  visit_type: [
    { label: "Routine Visit", value: "routine_visit" },
    { label: "Crisis Support", value: "crisis_support" },
    { label: "Celebration Visit", value: "celebration_visit" },
  ],
  presentation: [
    { label: "Happy and Healthy", value: "happy_healthy" },
    { label: "Anxious", value: "anxious" },
    { label: "Withdrawn", value: "withdrawn" },
  ],
  placement_condition: [
    { label: "Well-maintained", value: "well_maintained" },
    { label: "Needs Attention", value: "needs_attention" },
    { label: "Poor Condition", value: "poor_condition" },
  ],
  primary_purpose: [
    { label: "Support and Wellbeing", value: "support_wellbeing" },
    { label: "Education Focus", value: "education_focus" },
    { label: "Health Check", value: "health_check" },
  ],
  college_status: [
    { label: "Attending", value: "attending" },
    { label: "Not Attending", value: "not_attending" },
    { label: "On Break", value: "on_break" },
  ],
  life_skills: [
    { label: "Cooking", value: "cooking" },
    { label: "Budgeting", value: "budgeting" },
    { label: "Cleaning", value: "cleaning" },
  ],
  liaison: [
    { label: "Social Worker", value: "social_worker" },
    { label: "Family", value: "family" },
    { label: "College", value: "college" },
  ],
  engagement_level: [
    { label: "Highly Engaged", value: "highly_engaged" },
    { label: "Moderately Engaged", value: "moderately_engaged" },
    { label: "Low Engagement", value: "low_engagement" },
  ],
  risk_level: [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
  ],
  independence_progress: [
    { label: "Progressing Well", value: "progressing_well" },
    { label: "Stable", value: "stable" },
    { label: "Declining", value: "declining" },
  ],
  health_adherence: [
    { label: "Full Adherence", value: "full_adherence" },
    { label: "Partial Adherence", value: "partial_adherence" },
    { label: "Non-Adherence", value: "non_adherence" },
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    let createdCount = 0;

    for (const [category, options] of Object.entries(defaultOptions)) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        try {
          await base44.entities.KPIOption.create({
            org_id: ORG_ID,
            category,
            label: option.label,
            value: option.value,
            active: true,
            order: i,
          });
          createdCount++;
        } catch (err) {
          console.log(`Skipped ${category}/${option.label}:`, err.message);
        }
      }
    }

    return Response.json({ success: true, created: createdCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});