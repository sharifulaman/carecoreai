import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const org_id = 'default_org';
    const today = new Date();
    
    // Fetch all residents
    const residents = await base44.asServiceRole.entities.Resident.filter({ org_id }, '-created_date', 50);
    
    const logNotes = [
      'Good engagement with staff today, participated in activities',
      'Had breakfast and medications on time, stable mood',
      'Worked on life skills, budgeting exercise completed',
      'Settled placement, good peer interaction',
      'Attended appointment, health stable',
      'Engaged in recreational activities',
      'No concerns noted today',
      'Good appetite, social engagement observed'
    ];

    const skillAreas = ['cooking', 'budgeting', 'hygiene', 'transport', 'health', 'relationships', 'employment', 'education'];
    
    let logsCreated = 0;
    let plansCreated = 0;

    // Create daily logs and plans for each resident
    for (let i = 0; i < residents.length; i++) {
      const resident = residents[i];
      
      // Create 2-3 daily logs per resident (last 30 days)
      for (let d = 0; d < (i % 3 + 2); d++) {
        const logDate = new Date(today);
        logDate.setDate(logDate.getDate() - (Math.random() * 30 | 0));
        const shift = ['morning', 'afternoon', 'night'][d % 3];
        
        await base44.asServiceRole.entities.DailyLog.create({
          org_id,
          resident_id: resident.id,
          resident_name: resident.display_name,
          worker_id: user.email,
          worker_name: user.full_name || 'Staff',
          home_id: resident.home_id,
          home_name: resident.home_id ? `Home-${resident.home_id.slice(-4)}` : 'Unknown',
          date: logDate.toISOString().split('T')[0],
          shift,
          log_type: ['general', 'health', 'behaviour', 'education'][Math.floor(Math.random() * 4)],
          content: { notes: logNotes[Math.floor(Math.random() * logNotes.length)] },
          flags: [],
          flagged: false
        });
        logsCreated++;
      }
      
      // Create 1 support plan per resident
      const planDate = new Date(today);
      planDate.setDate(planDate.getDate() - 60);
      const reviewDate = new Date(planDate);
      reviewDate.setMonth(reviewDate.getMonth() + 3);
      
      const supportPlanId = await base44.asServiceRole.entities.SupportPlan.create({
        org_id,
        resident_id: resident.id,
        home_id: resident.home_id,
        created_by: user.email,
        status: 'active',
        effective_date: planDate.toISOString().split('T')[0],
        review_due_date: reviewDate.toISOString().split('T')[0],
        resident_preferences: `${resident.display_name} prefers consistent routines and supportive guidance`,
        goals: 'Build independence and life skills',
        needs: 'Regular support and monitoring',
        strengths: 'Engaged and motivated',
        risks: 'Standard monitoring',
        interventions: 'Planned support sessions',
        actions: 'Weekly check-ins and skill building'
      }).then(p => p.id);
      plansCreated++;
      
      // Create ILS plan with sections
      const ilsPlanId = await base44.asServiceRole.entities.ILSPlan.create({
        org_id,
        resident_id: resident.id,
        home_id: resident.home_id,
        created_by: user.email,
        status: 'active',
        effective_date: planDate.toISOString().split('T')[0],
        review_due_date: reviewDate.toISOString().split('T')[0],
        overall_notes: `ILS plan for ${resident.display_name}`
      }).then(p => p.id);
      
      // Create 2-3 ILS plan sections
      for (let s = 0; s < (i % 3 + 2); s++) {
        const skillArea = skillAreas[s % skillAreas.length];
        await base44.asServiceRole.entities.ILSPlanSection.create({
          org_id,
          ils_plan_id: ilsPlanId,
          resident_id: resident.id,
          skill_area: skillArea,
          current_level: ['no_awareness', 'developing', 'needs_support', 'independent_with_prompts', 'fully_independent'][Math.floor(Math.random() * 5)],
          goal: `Improve ${skillArea} skills`,
          current_ability: 'Developing',
          support_needed: 'Regular guidance and practice',
          actions: 'Weekly practice sessions',
          target_date: reviewDate.toISOString().split('T')[0],
          progress_percentage: Math.floor(Math.random() * 100)
        });
      }
    }

    return Response.json({
      success: true,
      residentsProcessed: residents.length,
      logsCreated,
      plansCreated,
      message: 'Resident activity data seeded successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});