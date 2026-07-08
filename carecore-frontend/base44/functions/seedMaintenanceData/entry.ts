import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const ORG_ID = "default_org";
    const existing = await base44.asServiceRole.entities.PropertyMaintenance.filter({ org_id: ORG_ID });
    if (existing.length > 0) {
      return Response.json({ message: 'Already seeded', count: existing.length });
    }

    const homes = await base44.asServiceRole.entities.Home.filter({ org_id: ORG_ID });
    const homeMap = {};
    homes.forEach(h => { homeMap[h.name] = h.id; });

    const getHomeId = (name) => homeMap[name] || (homes[0]?.id || 'home_1');

    const now = new Date();
    const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
    const daysAhead = (d) => new Date(now.getTime() + d * 86400000).toISOString();
    const todayIso = now.toISOString();

    const issues = [
      {
        org_id: ORG_ID, home_name: "Rose House", home_id: getHomeId("Rose House"),
        issue_reference: "M-2026-0145", issue_title: "Boiler not heating",
        description: "The main boiler has stopped producing heat. Radiators throughout the property are cold. Residents are being kept warm with electric heaters temporarily.",
        category: "heating_boiler", priority: "urgent", status: "in_progress",
        reported_by_name: "John Davies", assigned_to_name: "John Davies",
        estimated_cost: 450, reported_at: daysAgo(3), due_at: todayIso,
      },
      {
        org_id: ORG_ID, home_name: "Riverside Independent", home_id: getHomeId("Riverside Independent"),
        issue_reference: "M-2026-0144", issue_title: "Leaking kitchen tap",
        description: "Kitchen cold tap is dripping continuously. The drip has been getting worse over the past week and is now a constant flow.",
        category: "plumbing", priority: "high", status: "reported",
        reported_by_name: "Alex Morgan", assigned_to_name: "Alex Morgan",
        estimated_cost: 120, reported_at: daysAgo(4), due_at: daysAgo(1),
      },
      {
        org_id: ORG_ID, home_name: "Parkside Living", home_id: getHomeId("Parkside Living"),
        issue_reference: "M-2026-0143", issue_title: "Garden gate loose",
        description: "The rear garden gate hinges are loose and the gate is not closing securely. This is a security concern.",
        category: "garden_external", priority: "medium", status: "assigned",
        reported_by_name: "Sam Carter", assigned_to_name: "Sam Carter",
        estimated_cost: 85, reported_at: daysAgo(5), due_at: daysAhead(3),
      },
      {
        org_id: ORG_ID, home_name: "Valley Care Home", home_id: getHomeId("Valley Care Home"),
        issue_reference: "M-2026-0142", issue_title: "Broken door handle (Front Door)",
        description: "Front door handle has broken off. A temporary fix has been applied but a full replacement is needed.",
        category: "security", priority: "high", status: "completed",
        reported_by_name: "Rachel Green", assigned_to_name: "Internal Team",
        estimated_cost: 150, actual_cost: 145, reported_at: daysAgo(7), due_at: daysAgo(5),
        completed_at: daysAgo(3), completed_by_name: "Internal Team",
      },
      {
        org_id: ORG_ID, home_name: "Castle Heights", home_id: getHomeId("Castle Heights"),
        issue_reference: "M-2026-0141", issue_title: "Fire alarm test & service",
        description: "Annual fire alarm test and service due. All detectors and call points need testing per BS 5839 standard.",
        category: "fire_safety", priority: "medium", status: "in_progress",
        reported_by_name: "Tech Team", assigned_to_name: "Tech Team", contractor_name: "Tech Team",
        estimated_cost: 350, reported_at: daysAgo(8), due_at: daysAhead(2),
      },
      {
        org_id: ORG_ID, home_name: "Meadow View", home_id: getHomeId("Meadow View"),
        issue_reference: "M-2026-0140", issue_title: "Bathroom light not working",
        description: "Main bathroom ceiling light has failed. Replacement LED panel ordered and awaiting delivery.",
        category: "electrical", priority: "high", status: "awaiting_parts",
        reported_by_name: "Keyworker", assigned_to_name: "Keyworker",
        estimated_cost: 95, reported_at: daysAgo(9), due_at: daysAgo(2),
      },
      {
        org_id: ORG_ID, home_name: "NFS HC", home_id: getHomeId("NFS HC"),
        issue_reference: "M-2026-0139", issue_title: "Pest control - routine",
        description: "Routine quarterly pest control visit scheduled. ProClean Ltd to attend and treat all areas.",
        category: "pest_control", priority: "low", status: "planned",
        reported_by_name: "Admin", contractor_name: "ProClean Ltd", assigned_to_name: "ProClean Ltd",
        estimated_cost: 200, reported_at: daysAgo(11), due_at: daysAhead(17), is_planned: true,
      },
      {
        org_id: ORG_ID, home_name: "Oak Grove", home_id: getHomeId("Oak Grove"),
        issue_reference: "M-2026-0138", issue_title: "Fencing repair (rear garden)",
        description: "Three fence panels at the rear of the property have been damaged in recent storms. Full replacement needed.",
        category: "structural", priority: "high", status: "in_progress",
        reported_by_name: "Ben White", assigned_to_name: "Ben White",
        estimated_cost: 850, reported_at: daysAgo(12), due_at: daysAgo(5),
      },
      {
        org_id: ORG_ID, home_name: "Parkside Living", home_id: getHomeId("Parkside Living"),
        issue_reference: "M-2026-0137", issue_title: "Kitchen ceiling light not working",
        description: "The main kitchen light fitting has failed. Residents are using a portable lamp. Electrician needed.",
        category: "electrical", priority: "high", status: "in_progress",
        reported_by_name: "Daniel Taylor", assigned_to_name: "Daniel Taylor",
        estimated_cost: 110, reported_at: daysAgo(7), due_at: daysAgo(5),
      },
      {
        org_id: ORG_ID, home_name: "Valley Care Home", home_id: getHomeId("Valley Care Home"),
        issue_reference: "M-2026-0136", issue_title: "Leaking pipe in utility room",
        description: "Visible leak from a pipe joint in the utility room. Temporary patch applied. Parts on order.",
        category: "plumbing", priority: "high", status: "awaiting_parts",
        reported_by_name: "Rob Brown", assigned_to_name: "Rob Brown",
        estimated_cost: 200, reported_at: daysAgo(8), due_at: daysAgo(4),
      },
      {
        org_id: ORG_ID, home_name: "Castle Heights", home_id: getHomeId("Castle Heights"),
        issue_reference: "M-2026-0135", issue_title: "Front door lock sticking",
        description: "Front door deadlock is very stiff and difficult to operate. Contractor SecureTech Ltd booked to attend.",
        category: "security", priority: "medium", status: "awaiting_contractor",
        reported_by_name: "Lisa Ward", contractor_name: "SecureTech Ltd", assigned_to_name: "SecureTech Ltd",
        estimated_cost: 150, reported_at: daysAgo(9), due_at: daysAhead(1),
      },
      {
        org_id: ORG_ID, home_name: "Meadow View", home_id: getHomeId("Meadow View"),
        issue_reference: "M-2026-0134", issue_title: "Extractor fan noisy in bathroom",
        description: "Bathroom extractor fan making loud grinding noise. Bearings likely worn. Requires replacement.",
        category: "appliance", priority: "medium", status: "reported",
        reported_by_name: "Unassigned", assigned_to_name: "",
        estimated_cost: 120, reported_at: daysAgo(10), due_at: daysAhead(3),
      },
      {
        org_id: ORG_ID, home_name: "Oak Grove", home_id: getHomeId("Oak Grove"),
        issue_reference: "M-2026-0133", issue_title: "Garden fence panel damaged",
        description: "One fence panel on the left boundary has been damaged. Low priority cosmetic repair needed.",
        category: "garden_external", priority: "low", status: "in_progress",
        contractor_name: "GreenGuard Landscapes", assigned_to_name: "GreenGuard Landscapes",
        reported_by_name: "Admin", estimated_cost: 85, reported_at: daysAgo(11), due_at: daysAhead(4),
      },
      {
        org_id: ORG_ID, home_name: "North Star Outreach", home_id: getHomeId("North Star Outreach"),
        issue_reference: "M-2026-0132", issue_title: "Loose handrail on rear steps",
        description: "The handrail on the rear external steps is loose and poses a safety risk. Immediate repair needed.",
        category: "structural", priority: "high", status: "in_progress",
        reported_by_name: "Mark White", assigned_to_name: "Mark White",
        estimated_cost: 200, reported_at: daysAgo(13), due_at: daysAgo(11),
      },
      {
        org_id: ORG_ID, home_name: "Riverside Independent", home_id: getHomeId("Riverside Independent"),
        issue_reference: "M-2026-0131", issue_title: "Communal area floor scuffed",
        description: "The hallway laminate floor has significant scuff marks. Professional cleaning completed.",
        category: "cleaning_hygiene", priority: "low", status: "completed",
        reported_by_name: "Internal Team", assigned_to_name: "Internal Team",
        estimated_cost: 80, actual_cost: 80, reported_at: daysAgo(17), due_at: daysAgo(15),
        completed_at: daysAgo(15), completed_by_name: "Internal Team",
      },
      {
        org_id: ORG_ID, home_name: "City Outreach Centre", home_id: getHomeId("City Outreach Centre"),
        issue_reference: "M-2026-0130", issue_title: "Wi-Fi router intermittent connection",
        description: "The main Wi-Fi router in the communal area is dropping connection frequently. Router may need replacement.",
        category: "internet_utilities", priority: "medium", status: "reported",
        reported_by_name: "Internal Team", assigned_to_name: "Internal Team",
        estimated_cost: 150, reported_at: daysAgo(17), due_at: daysAgo(10),
      },
      {
        org_id: ORG_ID, home_name: "NFS HC", home_id: getHomeId("NFS HC"),
        issue_reference: "M-2026-0129", issue_title: "Washing machine fault",
        description: "Washing machine showing error code E4. ApplianceCare Ltd assigned for diagnosis and repair.",
        category: "appliance", priority: "medium", status: "assigned",
        contractor_name: "ApplianceCare Ltd", assigned_to_name: "ApplianceCare Ltd",
        reported_by_name: "Admin", estimated_cost: 200, reported_at: daysAgo(18), due_at: daysAgo(8),
      },
      {
        org_id: ORG_ID, home_name: "Rose House", home_id: getHomeId("Rose House"),
        issue_reference: "M-2026-0128", issue_title: "Emergency lighting flickering",
        description: "Emergency exit lighting in main corridor is flickering intermittently. Fire safety compliance issue.",
        category: "fire_safety", priority: "urgent", status: "in_progress",
        reported_by_name: "Tech Team", assigned_to_name: "Tech Team", contractor_name: "Tech Team",
        estimated_cost: 350, reported_at: daysAgo(19), due_at: daysAgo(18),
      },
    ];

    const created = [];
    for (const issue of issues) {
      const rec = await base44.asServiceRole.entities.PropertyMaintenance.create(issue);
      created.push(rec);
    }

    // Seed schedules
    const schedules = [
      {
        org_id: ORG_ID, home_name: "Rose House", home_id: getHomeId("Rose House"),
        schedule_title: "Boiler annual service", category: "heating_boiler",
        maintenance_type: "service", frequency: "yearly",
        next_due_at: daysAhead(9), contractor_name: "British Gas", estimated_cost: 120,
        reminder_days_before: 14, status: "active",
      },
      {
        org_id: ORG_ID, home_name: "Valley Care Home", home_id: getHomeId("Valley Care Home"),
        schedule_title: "Fire alarm monthly test", category: "fire_safety",
        maintenance_type: "test", frequency: "monthly",
        next_due_at: daysAhead(11), assigned_to_name: "Tech Team", estimated_cost: 0,
        reminder_days_before: 3, status: "active",
      },
      {
        org_id: ORG_ID, applies_to_all_homes: true,
        schedule_title: "Pest control visit", category: "pest_control",
        maintenance_type: "contractor_visit", frequency: "quarterly",
        next_due_at: daysAhead(14), contractor_name: "ProClean Ltd", estimated_cost: 200,
        reminder_days_before: 7, status: "active",
      },
      {
        org_id: ORG_ID, home_name: "Castle Heights", home_id: getHomeId("Castle Heights"),
        schedule_title: "Gas safety certificate check", category: "gas",
        maintenance_type: "compliance_check", frequency: "yearly",
        next_due_at: daysAhead(30), contractor_name: "GasSafe Engineers", estimated_cost: 95,
        reminder_days_before: 30, status: "active",
      },
    ];

    for (const s of schedules) {
      await base44.asServiceRole.entities.MaintenanceSchedule.create(s);
    }

    // Seed contracts
    const contracts = [
      {
        org_id: ORG_ID, contractor_name: "British Gas", service_type: "Boiler Servicing & Maintenance",
        contract_start_date: "2026-01-01", contract_end_date: "2026-12-31", renewal_date: "2026-11-01",
        cost_amount: 1200, cost_frequency: "annually", status: "active",
        contact_name: "Account Team", contact_phone: "0800 111 999",
      },
      {
        org_id: ORG_ID, contractor_name: "SecureTech Ltd", service_type: "Security Systems & Locks",
        contract_start_date: "2026-03-01", contract_end_date: "2027-02-28", renewal_date: "2027-01-01",
        cost_amount: 600, cost_frequency: "annually", status: "active",
        contact_name: "James Secure", contact_phone: "0121 456 789",
      },
      {
        org_id: ORG_ID, contractor_name: "ProClean Ltd", service_type: "Pest Control",
        contract_start_date: "2026-01-01", contract_end_date: "2026-12-31",
        cost_amount: 800, cost_frequency: "annually", status: "active",
        contact_name: "ProClean Admin", contact_phone: "0161 234 567",
      },
    ];
    for (const c of contracts) {
      await base44.asServiceRole.entities.MaintenanceContract.create(c);
    }

    return Response.json({ success: true, issues: created.length, schedules: schedules.length, contracts: contracts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});