import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ORG_ID = 'default_org';
    const residents = await base44.asServiceRole.entities.Resident.filter({ org_id: ORG_ID, status: 'active' });
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id: ORG_ID, status: 'active' });

    if (residents.length === 0) {
      return Response.json({ error: 'No active residents found' }, { status: 400 });
    }

    // Generate dates for last 3 months
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    
    const dateRange = [];
    let current = new Date(threeMonthsAgo);
    while (current <= today) {
      dateRange.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const activityNotes = [
      'ACCOMMODATION: Bedroom clean and tidy. YP maintains good standards. Shared facilities in acceptable condition. No housing concerns raised.',
      'EDUCATION: Attended college, engaged in classes. Biology practical went well. Target: improve maths attendance (currently 85%). College fees paid on time.',
      'HEALTH: GP appointment attended. Annual health check completed - all normal findings. BMI healthy range. Discussed mental health support - YP open to counselling. Prescribed vitamins, stock medication managed appropriately.',
      'FINANCE: Weekly allowance of £25 managed independently. Budgeting skills improving. YP saved £45 towards new phone. Bank account balance tracked. Made sensible purchasing decisions - prioritises necessities.',
      'FAMILY: Had supervised contact with mother. Interaction positive and warm. Mother reported good progress in academics. Contact frequency agreed: fortnightly Sundays 2-4pm. No safeguarding concerns noted.',
      'BEHAVIOUR: Positive behaviour throughout shift. YP responded well to boundaries. Attended structured evening activity - participative. Peer relationships developing well. No incidents recorded.',
      'RELIGION & CULTURE: YP practises Islam. Attended Friday prayers at local mosque with staff support. Ramadan observance respected. Halal meals provided. Cultural identity explored positively in conversations.',
      'INDEPENDENCE: Demonstrated strong life skills - prepared healthy meal independently. Laundry completed to good standard. Time management improving. Using public transport confidently with minimal support needed.',
      'HEALTH: Mental health review scheduled. YP reports sleep patterns improving. Mood generally positive. Small amount of anxiety about college exams noted. Discussed relaxation techniques. No self-harm incidents.',
      'EDUCATION: Attended college 4 out of 5 days. Revision sessions ongoing for upcoming exams. Tutor feedback positive. College attendance target: 95%. Current track record shows good commitment.',
      'FINANCE: Savings jar balance checked - £120 accumulated. YP purchased birthday gift independently using saved funds. Financial literacy sessions continue weekly. Interest in apprenticeships discussed.',
      'ACCOMMODATION: Bedroom decoration project started with YP input. Making placement feel more personal. Furniture requests discussed - budget allocated. Placement stability excellent.',
      'FAMILY: Telephone contact with father. Discussed upcoming birthday. Father to send gift. YP excited about family weekend visit planned for Easter holidays.',
      'BEHAVIOUR: Peer conflict resolved calmly. YP reflected on actions and apologised. Staff praised mature response. Group activities participation improving. No sanctions required.',
      'HEALTH: Dental check-up attended. Teeth cleaning required. Booked appointment for next month. Oral hygiene routine established. Taking responsibility for health well.',
      'INDEPENDENCE: Learning to use public transport independently. Successfully navigated bus journey with carer for practice run. Building confidence. Goal: travel to college solo by end of term.',
      'RELIGION & CULTURE: Discussed religious beliefs in depth. YP exploring faith. Mosque staff feedback very positive about integration. Community prayer group engaged.',
      'EDUCATION: Mock exam results reviewed - progressing towards target grades. Physics and Chemistry particularly strong. Maths requires additional support - tutor identified and appointment arranged.',
      'FINANCE: YP wants to learn about National Insurance and tax. Explained employment rights and age restrictions. Planning part-time work in summer - retail opportunities discussed.',
      'HEALTH: GP letter received re: asthma review. Medication reviewed and adjusted. Inhaler technique checked - correct usage confirmed. YP reports fewer symptoms. Follow-up appointment in 3 months.',
    ];

    const presentations = ['Happy and healthy', 'Calm and settled', 'Talkative and engaged', 'Worried or anxious'];
    const placementConditions = ['Clean and tidy', 'Slightly untidy', 'Communal areas acceptable, room needs improvement'];
    const collegStatuses = ['Attended today', 'On the way to college', 'Not discussed'];

    // Create daily logs
    const dailyLogsToCreate = [];
    residents.forEach(resident => {
      const home = homes.find(h => h.id === resident.home_id);
      const shifts = ['morning', 'afternoon', 'night'];
      
      // Create 2-3 logs per week for 3 months
      dateRange.forEach((date, idx) => {
        if (Math.random() < 0.4) { // 40% chance of log on any given day
          const shift = shifts[Math.floor(Math.random() * shifts.length)];
          const content = activityNotes[Math.floor(Math.random() * activityNotes.length)];
          
          dailyLogsToCreate.push({
            org_id: ORG_ID,
            resident_id: resident.id,
            resident_name: resident.display_name,
            worker_id: user.email,
            worker_name: user.full_name,
            home_id: resident.home_id,
            home_name: home?.name || 'Unknown',
            date,
            shift,
            content: { notes: content },
            flags: [],
            flagged: false,
          });
        }
      });
    });

    // Create visit reports
    const visitReportsToCreate = [];
    residents.forEach(resident => {
      const home = homes.find(h => h.id === resident.home_id);
      
      // Create 1-2 visit reports per month
      for (let m = 0; m < 3; m++) {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() - m, 0).getDate();
        const reportDate = new Date(today.getFullYear(), today.getMonth() - m, Math.floor(Math.random() * daysInMonth) + 1);
        const dateStr = reportDate.toISOString().split('T')[0];
        
        if (Math.random() < 0.6) {
          const timeStart = `${Math.floor(Math.random() * 12) + 9}:00`;
          const timeEnd = `${Math.floor(Math.random() * 12) + 14}:00`;
          const [sh, sm] = timeStart.split(':').map(Number);
          const [eh, em] = timeEnd.split(':').map(Number);
          const duration = (eh * 60 + em) - (sh * 60 + sm);
          
          visitReportsToCreate.push({
            org_id: ORG_ID,
            resident_id: resident.id,
            resident_name: resident.display_name,
            worker_id: user.email,
            worker_name: user.full_name,
            home_id: resident.home_id,
            home_name: home?.name || 'Unknown',
            date: dateStr,
            time_start: timeStart,
            time_end: timeEnd,
            duration_minutes: duration,
            kpi_data: {
              visit_type: ['In-person at placement', 'In-person in community', 'Phone call only'][Math.floor(Math.random() * 3)],
              presentation: presentations[Math.floor(Math.random() * presentations.length)],
              placement_condition: placementConditions[Math.floor(Math.random() * placementConditions.length)],
              primary_purpose: 'General wellbeing check',
              college_status: collegStatuses[Math.floor(Math.random() * collegStatuses.length)],
              engagement_level: String(Math.floor(Math.random() * 5) + 1),
              risk_level: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
            },
            action_text: `Comprehensive wellbeing visit with ${resident.display_name}. Covered accommodation standards (very good), college attendance (85% this term), health appointments completed, financial budgeting progress (now saving £25/week), family contact feedback (positive), behaviour management (no incidents), religious practice support (mosque attendance maintained), independence skills (cooking and transport improving), and personal development goals for next term.`,
            outcome_text: `${resident.display_name} continues to thrive in current placement. Academic progress positive with target grades achievable. Health monitoring up to date including GP, dental, and mental health support. Financial literacy developing well. Family relationships stable and supportive. Peer relationships good with occasional conflict managed maturely. Cultural and religious needs well supported. Overall placement stability excellent with minimal safeguarding concerns.`,
            recommendations_text: `1. Continue weekly college attendance monitoring - target 95%. 2. Maintain GP and dental appointments as scheduled. 3. Support independent travel goal - practice additional bus routes. 4. Increase finance responsibility - discuss part-time work options. 5. Schedule family contact visit for Easter. 6. Consider vocational guidance for post-18 planning. 7. Continue mosque engagement and cultural support. 8. Monitor exam revision schedule - additional tutoring arranged for maths.`,
            status: Math.random() < 0.7 ? 'submitted' : 'draft',
          });
        }
      }
    });

    console.log(`Creating ${dailyLogsToCreate.length} daily logs and ${visitReportsToCreate.length} visit reports...`);

    // Batch create in chunks to avoid overwhelming the API
    const chunkSize = 50;
    
    for (let i = 0; i < dailyLogsToCreate.length; i += chunkSize) {
      const chunk = dailyLogsToCreate.slice(i, i + chunkSize);
      await base44.asServiceRole.entities.DailyLog.bulkCreate(chunk);
    }

    for (let i = 0; i < visitReportsToCreate.length; i += chunkSize) {
      const chunk = visitReportsToCreate.slice(i, i + chunkSize);
      await base44.asServiceRole.entities.VisitReport.bulkCreate(chunk);
    }

    return Response.json({
      success: true,
      summary: {
        residents: residents.length,
        daily_logs_created: dailyLogsToCreate.length,
        visit_reports_created: visitReportsToCreate.length,
        date_range: `${threeMonthsAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});