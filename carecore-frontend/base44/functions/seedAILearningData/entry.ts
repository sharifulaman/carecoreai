import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const sr = base44.asServiceRole;
    const orgId = user.data?.org_id || 'default_org';
    const now = new Date().toISOString();
    let created = { courses: 0, modules: 0, questions: 0, assignments: 0 };

    // Delete existing AI learning data to force a clean re-seed
    const existingCourses = await sr.entities.HRPolicyLearningCourse.filter({ org_id: orgId }, '-created_date', 50);
    for (const c of existingCourses) {
      const mods = await sr.entities.HRPolicyLearningModule.filter({ course_id: c.id }, 'display_order', 50);
      for (const m of mods) await sr.entities.HRPolicyLearningModule.delete(m.id);
      const qs = await sr.entities.HRPolicyQuizQuestion.filter({ course_id: c.id }, 'display_order', 50);
      for (const q of qs) await sr.entities.HRPolicyQuizQuestion.delete(q.id);
      await sr.entities.HRPolicyLearningCourse.delete(c.id);
    }
    const existingAssignments = await sr.entities.HRPolicyLearningAssignment.filter({ org_id: orgId }, '-created_date', 100);
    for (const a of existingAssignments) await sr.entities.HRPolicyLearningAssignment.delete(a.id);

    // Load existing policies or create demo ones
    let policies = await sr.entities.HRPolicy.filter({ org_id: orgId }, '-created_date', 10);

    const demoPolicies = [
      { policy_title: 'Missing from Home Policy', category: 'Safeguarding', current_version_number: '2.1' },
      { policy_title: 'Safeguarding Children Policy', category: 'Safeguarding', current_version_number: '3.0' },
      { policy_title: 'Medication Administration Policy', category: 'Health & Safety', current_version_number: '1.5' },
    ];

    if (policies.length === 0) {
      for (const p of demoPolicies) {
        const created_p = await sr.entities.HRPolicy.create({ org_id: orgId, ...p, status: 'Active', effective_date: '2024-01-01', review_date: '2025-01-01' });
        policies.push(created_p);
      }
    }

    const policy1 = policies[0];
    const policy2 = policies[1] || policies[0];

    // Course 1: Missing from Home — Published
    const course1 = await sr.entities.HRPolicyLearningCourse.create({
      org_id: orgId,
      policy_id: policy1.id,
      policy_title: policy1.policy_title,
      policy_category: policy1.category || 'Safeguarding',
      policy_version: policy1.current_version_number || '2.1',
      course_title: 'Missing from Home: Staff Responsibilities and Escalation',
      course_summary: 'This e-learning course covers the key responsibilities of staff when a young person goes missing from home. It includes how to recognise when a young person is missing, immediate actions required, escalation procedures, and how to record and follow up on missing episodes.',
      learning_objectives: [
        'Understand what constitutes a missing from home episode',
        'Know the immediate actions required when a young person is missing',
        'Correctly identify who to notify and when',
        'Complete required documentation accurately',
        'Participate in return interviews appropriately',
      ],
      target_audience: 'All residential care staff, support workers, and team leaders',
      estimated_duration_minutes: 50,
      pass_mark_percentage: 80,
      max_attempts: 3,
      allow_retake: true,
      requires_acknowledgement: true,
      ai_generated: true,
      ai_model_used: 'claude_sonnet_4_6',
      status: 'Published',
      created_by: user.full_name || 'Admin',
      published_by: user.full_name || 'Admin',
      published_at: now,
    });
    created.courses++;

    // Modules for Course 1
    const modules1 = [
      {
        module_number: 1, module_title: 'Purpose of the Missing from Home Policy',
        module_summary: 'Why this policy exists and what it covers.',
        learning_content: `The Missing from Home Policy sets out the responsibilities of all staff when a young person who is placed in our care goes missing or is absent without authorisation. Going missing is a serious safeguarding concern and must always be treated as such.\n\nThis policy applies to all young people placed with us, regardless of the reason for their absence. It covers both short-term absences and extended missing episodes. All staff have a duty to follow this policy every time a young person cannot be accounted for.\n\nThe policy exists to protect young people from harm while they are missing, to ensure that the appropriate people are notified promptly, and to ensure that every episode is recorded and reviewed.`,
        key_points: ['All staff must know this policy', 'Going missing is always a safeguarding concern', 'Applies to all young people in placement', 'Both short and extended absences are covered'],
        staff_responsibilities: ['Read and understand this policy fully', 'Report any concerns about a young person immediately', 'Never assume a young person is simply late without checking'],
        practical_example: 'A young person fails to return from school at their expected time of 4pm. By 4:30pm, staff have been unable to contact them. This is a missing episode and the policy must be followed immediately.',
        compliance_reminder: 'Failure to report a missing young person promptly can put them at serious risk of harm and may constitute a safeguarding failure.',
        estimated_duration_minutes: 8, display_order: 1, is_required: true,
      },
      {
        module_number: 2, module_title: 'Recognising Missing and Unauthorised Absence',
        module_summary: 'How to identify when a young person is missing versus unauthorised absence.',
        learning_content: `Understanding the difference between a planned absence, an unauthorised absence, and a missing episode is critical. A young person is considered missing when they are absent from the placement without authorisation and their whereabouts are unknown.\n\nUnauthorised absence means the young person has left without permission but their location may be known or suspected. Both must be taken seriously and reported, but the response may differ in urgency.\n\nRisk factors that increase concern include the young person's age, known vulnerabilities, history of exploitation, previous missing episodes, mental health concerns, and the circumstances of their disappearance.`,
        key_points: ['Know the difference between unauthorised absence and missing', 'All unaccounted absences must be reported', 'Risk factors must be assessed every time', 'Never dismiss an absence as "probably fine"'],
        staff_responsibilities: ['Assess risk factors immediately when a young person is unaccounted for', 'Do not wait before raising the alarm', 'Document the time you last saw the young person and any information they shared before leaving'],
        practical_example: 'A 16-year-old with a known history of county lines exploitation does not return by curfew. Despite previously saying they were "just going to a friend\'s", this must be treated as high risk and police notified immediately.',
        compliance_reminder: 'Risk assessments must be updated after every missing episode to reflect any new information.',
        estimated_duration_minutes: 10, display_order: 2, is_required: true,
      },
      {
        module_number: 3, module_title: 'Immediate Staff Actions',
        module_summary: 'What to do in the first hour when a young person is missing.',
        learning_content: `When you realise a young person is missing, you must act immediately and in a structured way. Do not delay, speculate, or wait to see if they return on their own.\n\nFirst, establish the facts: when were they last seen, who saw them, what were they wearing, what did they say, do they have their phone. Next, attempt to contact the young person directly by phone. Contact known friends or associates if appropriate and safe to do so.\n\nWithin 30 minutes of establishing they are missing, notify the on-call manager or team leader. The manager will then decide whether to contact police based on the risk level. Your role is to gather and record information, not to conduct a search alone.`,
        key_points: ['Act immediately — do not delay', 'Establish facts: last seen, clothing, phone', 'Attempt to contact young person within minutes', 'Notify manager within 30 minutes', 'Never conduct a solo search in an unsafe area'],
        staff_responsibilities: ['Take immediate action', 'Contact manager within 30 minutes', 'Record time of last contact and all attempts to locate', 'Preserve any information the young person left (messages, notes)'],
        practical_example: 'At 6pm, you notice a young person has not returned from their walk. You check their room — no note. You call their phone — no answer. You immediately inform your team leader and begin logging the timeline.',
        compliance_reminder: 'All actions taken must be recorded in real time with exact times. This record is a legal document.',
        estimated_duration_minutes: 12, display_order: 3, is_required: true,
      },
      {
        module_number: 4, module_title: 'Escalation and Notifications',
        module_summary: 'Who to notify, when, and how.',
        learning_content: `Escalation must follow a clear sequence. Once you have notified your manager, they will assess whether to contact the police. In most cases involving a looked-after child, police should be notified promptly, especially if the young person is under 16, has vulnerabilities, or the circumstances are concerning.\n\nThe placing social worker or duty social worker must also be notified. They have a statutory responsibility for the child and must be kept informed. Do not assume the manager has already made this call — confirm it.\n\nThe local authority designated officer (LADO) may also need to be informed in some circumstances, particularly where exploitation is suspected. Your manager will advise on this.`,
        key_points: ['Police must usually be notified for looked-after children', 'The placing social worker must be informed', 'Do not assume someone else has made the call — confirm it', 'Record every call made and every response received'],
        staff_responsibilities: ['Confirm that police have been notified and obtain a reference number', 'Confirm the social worker has been informed', 'Record every call and notification with times', 'Keep the young person\'s room and belongings secure'],
        practical_example: 'Your manager contacts police at 7pm and receives reference MFH-2024-0012. You log this in the missing from home record. At 7:30pm the social worker calls back — you update the log.',
        compliance_reminder: 'Every notification must be documented. Missing police reference numbers or social worker contact times can be flagged in Ofsted inspections.',
        estimated_duration_minutes: 10, display_order: 4, is_required: true,
      },
      {
        module_number: 5, module_title: 'Recording, Review, and Follow-Up',
        module_summary: 'How to document missing episodes and conduct return interviews.',
        learning_content: `Every missing episode must be fully recorded regardless of how short it was. The record must include: time the young person was last seen, time they were reported missing, who was notified and when, any information gathered during the episode, and time and circumstances of their return.\n\nWhen a young person returns, a return interview must be conducted by an independent person within 72 hours wherever possible. This is not a disciplinary interview — it is a welfare conversation to understand where they were, what they experienced, and whether they were harmed or exploited.\n\nAfter the return, a review should be held within 5 working days. The risk assessment must be updated. The episode must be included in the young person's placement review if applicable.`,
        key_points: ['Every episode must be recorded — even if the young person returns quickly', 'Return interviews must happen within 72 hours', 'Return interviews are welfare conversations, not disciplinary', 'Risk assessments must be updated after every episode'],
        staff_responsibilities: ['Complete the missing from home record before the end of your shift', 'Arrange or support the return interview', 'Update the young person\'s risk assessment', 'Flag patterns (repeated episodes) to management immediately'],
        practical_example: 'A young person returns at 11pm after being missing for 5 hours. You complete the record immediately. The next day, an independent staff member conducts the return interview. The risk assessment is updated to reflect that the young person disclosed they had been at a known drug address.',
        compliance_reminder: 'Incomplete missing from home records are a regulatory breach. Records must be completed before the end of your shift even if the young person has returned safely.',
        estimated_duration_minutes: 10, display_order: 5, is_required: true,
      },
    ];

    for (const mod of modules1) {
      await sr.entities.HRPolicyLearningModule.create({ org_id: orgId, course_id: course1.id, ...mod });
      created.modules++;
    }

    // Quiz questions for Course 1
    const questions1 = [
      { question_type: 'Scenario Based', scenario_text: 'A 17-year-old young person was last seen leaving the home at 3pm to go to the shops. It is now 6:30pm and they have not returned and are not answering their phone.', question_text: 'What is the FIRST thing you should do?', option_a: 'Wait until 8pm before raising the alarm', option_b: 'Notify your manager immediately and start documenting', option_c: 'Contact the young person\'s friends to ask if they have seen them', option_d: 'Search the local area alone', correct_answer: 'B', explanation: 'The young person is already 3.5 hours overdue. You must notify your manager immediately and begin documenting the timeline. Never wait or conduct a solo search.', difficulty: 'Medium', points: 1, display_order: 1, is_required: true },
      { question_type: 'Multiple Choice', question_text: 'Within how many minutes of establishing a young person is missing should you notify your manager?', option_a: '60 minutes', option_b: '30 minutes', option_c: '2 hours', option_d: 'When your shift ends', correct_answer: 'B', explanation: 'The policy requires manager notification within 30 minutes of establishing a young person is missing.', difficulty: 'Easy', points: 1, display_order: 2, is_required: true },
      { question_type: 'True or False', question_text: 'A return interview is a disciplinary meeting to find out why the young person went missing so they can be reprimanded.', option_a: 'True', option_b: 'False', option_c: '', option_d: '', correct_answer: 'B', explanation: 'False. A return interview is a welfare conversation, not a disciplinary process. Its purpose is to understand where the young person went and whether they were harmed or exploited.', difficulty: 'Easy', points: 1, display_order: 3, is_required: true },
      { question_type: 'Scenario Based', scenario_text: 'A 15-year-old with a known history of exploitation goes missing for the second time this month. They have previously disclosed links to adults who give them gifts.', question_text: 'Which of the following is the MOST important action?', option_a: 'Contact police and note exploitation risk factors in the missing record', option_b: 'Wait to see if they return before contacting anyone', option_c: 'Only notify the social worker and not police', option_d: 'Tell the young person off when they return', correct_answer: 'A', explanation: 'Known exploitation risk factors must be shared with police immediately. This young person is high risk and prompt police notification is critical.', difficulty: 'Hard', points: 1, display_order: 4, is_required: true },
      { question_type: 'Multiple Choice', question_text: 'How long after a young person returns should a return interview be completed?', option_a: 'Within 24 hours', option_b: 'Within 7 days', option_c: 'Within 72 hours wherever possible', option_d: 'At the next team meeting', correct_answer: 'C', explanation: 'Return interviews should be conducted within 72 hours wherever possible by an independent person.', difficulty: 'Medium', points: 1, display_order: 5, is_required: true },
      { question_type: 'Multiple Choice', question_text: 'Who MUST be notified when a looked-after child goes missing?', option_a: 'Police only', option_b: 'Manager and police', option_c: 'Manager, police, and the placing social worker', option_d: 'Only the team leader', correct_answer: 'C', explanation: 'The manager, police, and the placing social worker must all be notified. Do not assume the manager has already contacted the social worker — confirm it.', difficulty: 'Medium', points: 1, display_order: 6, is_required: true },
      { question_type: 'True or False', question_text: 'Missing from home records only need to be completed if the young person is missing for more than 24 hours.', option_a: 'True', option_b: 'False', option_c: '', option_d: '', correct_answer: 'B', explanation: 'False. Every missing episode must be recorded, regardless of duration. Even if a young person returns after 30 minutes, the episode must be documented.', difficulty: 'Easy', points: 1, display_order: 7, is_required: true },
      { question_type: 'Scenario Based', scenario_text: 'You are the only staff member on shift when you discover a young person is missing. Your manager is not responding to calls.', question_text: 'What should you do?', option_a: 'Wait for your manager to respond before taking any action', option_b: 'Contact the on-call manager, then police if required, and document everything', option_c: 'Leave the home to search for the young person', option_d: 'Contact the young person\'s parent instead', correct_answer: 'B', explanation: 'If your manager is unavailable, contact the on-call manager. Never leave the home unsupervised. Document every action and every attempt to contact your manager.', difficulty: 'Hard', points: 1, display_order: 8, is_required: true },
      { question_type: 'Multiple Choice', question_text: 'What should you do with a police reference number when you receive it?', option_a: 'Store it in your personal notebook', option_b: 'Tell the young person when they return', option_c: 'Record it immediately in the missing from home log', option_d: 'Email it to yourself for safekeeping', correct_answer: 'C', explanation: 'Police reference numbers must be recorded immediately in the official missing from home log. This is a legal document and must be accurate and complete.', difficulty: 'Easy', points: 1, display_order: 9, is_required: true },
      { question_type: 'Scenario Based', scenario_text: 'A young person has gone missing three times in the last two weeks. Each time they returned safely and said they were "just at a friend\'s".', question_text: 'What is the MOST appropriate response?', option_a: 'Accept their explanation and take no further action since they always return safely', option_b: 'Flag the pattern to management immediately and update the risk assessment', option_c: 'Reduce their curfew as a punishment', option_d: 'Only report the next episode if they are missing for over 24 hours', correct_answer: 'B', explanation: 'Repeated missing episodes are a significant risk pattern and must be flagged to management immediately. Risk assessments must be updated to reflect the pattern and escalating concern.', difficulty: 'Hard', points: 1, display_order: 10, is_required: true },
    ];

    for (const q of questions1) {
      await sr.entities.HRPolicyQuizQuestion.create({ org_id: orgId, course_id: course1.id, ...q });
      created.questions++;
    }

    // Course 2: Safeguarding — Draft
    const course2 = await sr.entities.HRPolicyLearningCourse.create({
      org_id: orgId,
      policy_id: policy2.id,
      policy_title: policy2.policy_title,
      policy_category: policy2.category || 'Safeguarding',
      policy_version: policy2.current_version_number || '3.0',
      course_title: 'Safeguarding Children: Recognising and Responding to Abuse',
      course_summary: 'A foundational e-learning course on safeguarding responsibilities for all care staff. Covers types of abuse, recognition, reporting obligations, and staff responsibilities under the safeguarding policy.',
      learning_objectives: ['Identify the four main types of abuse', 'Recognise signs and indicators of abuse', 'Understand mandatory reporting obligations', 'Know how to make a safeguarding referral'],
      target_audience: 'All staff working with children and young people',
      estimated_duration_minutes: 60,
      pass_mark_percentage: 80,
      max_attempts: 3,
      allow_retake: true,
      requires_acknowledgement: true,
      ai_generated: true,
      ai_model_used: 'claude_sonnet_4_6',
      status: 'Draft',
      created_by: user.full_name || 'Admin',
    });
    created.courses++;

    // Seed assignments with mixed statuses
    const allStaff = await sr.entities.StaffProfile.filter({ org_id: orgId }, '-created_date', 20);
    const sampleStaff = allStaff.slice(0, 8);
    const statuses = ['Assigned', 'In Progress', 'Quiz Pending', 'Failed', 'Passed', 'Acknowledgement Pending', 'Completed', 'Overdue'];

    for (let i = 0; i < sampleStaff.length; i++) {
      const s = sampleStaff[i];
      const status = statuses[i % statuses.length];
      const dueDate = status === 'Overdue' ? '2024-12-01' : '2025-08-01';
      await sr.entities.HRPolicyLearningAssignment.create({
        org_id: orgId,
        course_id: course1.id,
        policy_id: policy1.id,
        policy_version: '2.1',
        policy_title: policy1.policy_title,
        course_title: course1.course_title,
        assigned_to_staff_id: s.id,
        assigned_to_staff_name: s.full_name,
        assigned_to_role: s.role,
        assignment_type: 'Individual Staff',
        assigned_by: user.full_name || 'Admin',
        assigned_at: now,
        due_date: dueDate,
        mandatory: true,
        status,
      });
      created.assignments++;

      // Add quiz attempts for passed/completed/failed statuses
      if (['Passed', 'Completed', 'Failed', 'Acknowledgement Pending'].includes(status)) {
        const score = status === 'Failed' ? 65 : 85 + Math.floor(Math.random() * 15);
        const passed = status !== 'Failed';
        await sr.entities.HRPolicyQuizAttempt.create({
          org_id: orgId,
          assignment_id: 'demo',
          course_id: course1.id,
          policy_id: policy1.id,
          staff_id: s.id,
          staff_name: s.full_name,
          attempt_number: 1,
          started_at: now,
          submitted_at: now,
          score_percentage: score,
          total_questions: 10,
          correct_answers: Math.round(score / 10),
          incorrect_answers: 10 - Math.round(score / 10),
          passed,
        });
      }
    }

    // Audit events
    await sr.entities.HRPolicyAuditEvent.create({ org_id: orgId, event_type: 'AI Course Generated', policy_id: policy1.id, policy_title: policy1.policy_title, course_id: course1.id, course_title: course1.course_title, performed_by: user.full_name || 'Admin', event_description: `AI e-learning course generated for policy: ${policy1.policy_title}` });
    await sr.entities.HRPolicyAuditEvent.create({ org_id: orgId, event_type: 'Course Published', policy_id: policy1.id, policy_title: policy1.policy_title, course_id: course1.id, course_title: course1.course_title, performed_by: user.full_name || 'Admin', event_description: `Course published: ${course1.course_title}` });
    await sr.entities.HRPolicyAuditEvent.create({ org_id: orgId, event_type: 'Course Assigned', policy_id: policy1.id, policy_title: policy1.policy_title, course_id: course1.id, course_title: course1.course_title, performed_by: user.full_name || 'Admin', event_description: `Course assigned to ${sampleStaff.length} staff members` });

    return Response.json({ success: true, created, message: `AI learning demo data seeded successfully` });

  } catch (err) {
    console.error('[seedAILearningData]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});