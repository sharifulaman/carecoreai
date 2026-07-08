import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ORG_ID = "default_org";

const ROUTES = {
  afghanistan: {
    origin: "Afghanistan", home_town: "Kabul", nationality: "Afghan", language: "Dari",
    stages: [
      { from_country: "Afghanistan", from_city: "Kabul", to_country: "Iran", to_city: "Herat", departure_date: "Jan 2025", approximate_duration: "12 days", travel_methods: ["Walking", "Car"], travelled_with: "Smuggler, group of 4", risk_level: "medium" },
      { from_country: "Iran", from_city: "Herat", to_country: "Turkey", to_city: "Van", departure_date: "Feb 2025", approximate_duration: "3 weeks", travel_methods: ["Bus", "Car"], travelled_with: "Smuggler, group of 6", risk_level: "high" },
      { from_country: "Turkey", from_city: "Van", to_country: "Greece", to_city: "Evros", departure_date: "Mar 2025", approximate_duration: "2 days", travel_methods: ["Small boat"], travelled_with: "Smuggler, group of 10", risk_level: "high" },
      { from_country: "Greece", from_city: "Athens", to_country: "Italy", to_city: "Rome", departure_date: "Mar 2025", approximate_duration: "1 week", travel_methods: ["Lorry"], travelled_with: "Smuggler, group of 8", risk_level: "medium" },
      { from_country: "Italy", from_city: "Rome", to_country: "France", to_city: "Paris", departure_date: "Apr 2025", approximate_duration: "2 weeks", travel_methods: ["Train"], travelled_with: "Alone", risk_level: "medium" },
      { from_country: "France", from_city: "Calais", to_country: "United Kingdom", to_city: "Dover", departure_date: "Apr 2025", approximate_duration: "1 day", travel_methods: ["Small boat"], travelled_with: "Group of 12", risk_level: "high" },
    ],
    countries: ["Iran", "Turkey", "Greece", "Italy", "France"],
    reason: "war_conflict",
    arrival_method: "Small boat",
    arrival_place: "Dover, Kent",
  },
  eritrea: {
    origin: "Eritrea", home_town: "Asmara", nationality: "Eritrean", language: "Tigrinya",
    stages: [
      { from_country: "Eritrea", from_city: "Asmara", to_country: "Sudan", to_city: "Kassala", departure_date: "Nov 2024", approximate_duration: "5 days", travel_methods: ["Walking", "Car"], travelled_with: "Smuggler", risk_level: "high" },
      { from_country: "Sudan", from_city: "Kassala", to_country: "Libya", to_city: "Ajdabiya", departure_date: "Dec 2024", approximate_duration: "3 weeks", travel_methods: ["Lorry", "Car"], travelled_with: "Smuggler, group of 15", risk_level: "high" },
      { from_country: "Libya", from_city: "Tripoli", to_country: "Italy", to_city: "Lampedusa", departure_date: "Jan 2025", approximate_duration: "2 days", travel_methods: ["Boat"], travelled_with: "Smuggler, group of 60", risk_level: "high" },
      { from_country: "Italy", from_city: "Sicily", to_country: "France", to_city: "Paris", departure_date: "Feb 2025", approximate_duration: "1 week", travel_methods: ["Train", "Bus"], travelled_with: "Alone", risk_level: "low" },
      { from_country: "France", from_city: "Calais", to_country: "United Kingdom", to_city: "Dover", departure_date: "Mar 2025", approximate_duration: "1 day", travel_methods: ["Lorry"], travelled_with: "Hidden in lorry", risk_level: "high" },
    ],
    countries: ["Sudan", "Libya", "Italy", "France"],
    reason: "forced_recruitment",
    arrival_method: "Lorry",
    arrival_place: "Dover, Kent",
  },
  syria: {
    origin: "Syria", home_town: "Aleppo", nationality: "Syrian", language: "Arabic",
    stages: [
      { from_country: "Syria", from_city: "Aleppo", to_country: "Turkey", to_city: "Gaziantep", departure_date: "Sep 2024", approximate_duration: "1 day", travel_methods: ["Car", "Walking"], travelled_with: "Family member", risk_level: "medium" },
      { from_country: "Turkey", from_city: "Izmir", to_country: "Greece", to_city: "Lesvos", departure_date: "Oct 2024", approximate_duration: "3 hours", travel_methods: ["Small boat"], travelled_with: "Smuggler, group of 20", risk_level: "high" },
      { from_country: "Greece", from_city: "Athens", to_country: "Germany", to_city: "Munich", departure_date: "Oct 2024", approximate_duration: "4 days", travel_methods: ["Train", "Bus"], travelled_with: "Group of 5", risk_level: "low" },
      { from_country: "Germany", from_city: "Munich", to_country: "France", to_city: "Paris", departure_date: "Jan 2025", approximate_duration: "2 weeks", travel_methods: ["Train"], travelled_with: "Alone", risk_level: "low" },
      { from_country: "France", from_city: "Calais", to_country: "United Kingdom", to_city: "Folkestone", departure_date: "Feb 2025", approximate_duration: "1 day", travel_methods: ["Lorry"], travelled_with: "Group of 3", risk_level: "high" },
    ],
    countries: ["Turkey", "Greece", "Germany", "France"],
    reason: "war_conflict",
    arrival_method: "Lorry",
    arrival_place: "Folkestone, Kent",
  },
  albania: {
    origin: "Albania", home_town: "Tirana", nationality: "Albanian", language: "Albanian",
    stages: [
      { from_country: "Albania", from_city: "Vlora", to_country: "Italy", to_city: "Bari", departure_date: "Dec 2024", approximate_duration: "8 hours", travel_methods: ["Boat"], travelled_with: "Smuggler, group of 8", risk_level: "medium" },
      { from_country: "Italy", from_city: "Rome", to_country: "France", to_city: "Calais", departure_date: "Jan 2025", approximate_duration: "5 days", travel_methods: ["Train", "Bus"], travelled_with: "Alone", risk_level: "low" },
      { from_country: "France", from_city: "Calais", to_country: "United Kingdom", to_city: "Dover", departure_date: "Feb 2025", approximate_duration: "1 day", travel_methods: ["Small boat"], travelled_with: "Group of 8", risk_level: "high" },
    ],
    countries: ["Italy", "France"],
    reason: "honour_based_violence",
    arrival_method: "Small boat",
    arrival_place: "Dover, Kent",
  },
  vietnam: {
    origin: "Vietnam", home_town: "Hanoi", nationality: "Vietnamese", language: "Vietnamese",
    stages: [
      { from_country: "Vietnam", from_city: "Hanoi", to_country: "Russia", to_city: "Moscow", departure_date: "Aug 2024", approximate_duration: "1 day", travel_methods: ["Plane"], travelled_with: "Agent", risk_level: "medium" },
      { from_country: "Russia", from_city: "Moscow", to_country: "Poland", to_city: "Warsaw", departure_date: "Sep 2024", approximate_duration: "2 days", travel_methods: ["Car", "Bus"], travelled_with: "Agent, group of 4", risk_level: "medium" },
      { from_country: "Poland", from_city: "Warsaw", to_country: "France", to_city: "Paris", departure_date: "Oct 2024", approximate_duration: "1 week", travel_methods: ["Lorry"], travelled_with: "Hidden in lorry", risk_level: "high" },
      { from_country: "France", from_city: "Calais", to_country: "United Kingdom", to_city: "Dover", departure_date: "Nov 2024", approximate_duration: "1 day", travel_methods: ["Lorry"], travelled_with: "Hidden in lorry", risk_level: "high" },
    ],
    countries: ["Russia", "Poland", "France"],
    reason: "trafficking",
    arrival_method: "Lorry",
    arrival_place: "Dover, Kent",
  },
};

const ROUTES_LIST = ["afghanistan", "eritrea", "syria", "albania", "vietnam"];

const DEMO_FAMILIES = {
  afghanistan: [
    { name: "Farzana K.", relationship: "mother", approximate_age: "38", current_location: "Afghanistan", contact_status: "unknown", safety_status: "unknown", notes: "No contact since departure" },
    { name: "Omar K.", relationship: "father", approximate_age: "42", current_location: "Unknown", contact_status: "unknown", safety_status: "unknown", notes: "Believed missing" },
    { name: "Layla K.", relationship: "sister", approximate_age: "14", current_location: "Afghanistan", contact_status: "not_in_contact", safety_status: "unknown", notes: "As stated by young person" },
  ],
  eritrea: [
    { name: "Miriam T.", relationship: "mother", approximate_age: "40", current_location: "Eritrea", contact_status: "not_in_contact", safety_status: "unsafe", notes: "Believed still in Eritrea" },
    { name: "Daniel T.", relationship: "brother", approximate_age: "19", current_location: "Unknown", contact_status: "unknown", safety_status: "unknown", notes: "Possibly conscripted" },
  ],
  syria: [
    { name: "Fatima A.", relationship: "mother", approximate_age: "35", current_location: "Turkey", contact_status: "in_contact", safety_status: "safe", notes: "Occasional contact by phone" },
    { name: "Yousef A.", relationship: "father", approximate_age: "40", current_location: "Syria", contact_status: "unknown", safety_status: "unsafe", notes: "Last heard from in 2023" },
  ],
  albania: [
    { name: "Arjeta B.", relationship: "mother", approximate_age: "38", current_location: "Albania", contact_status: "not_in_contact", safety_status: "unknown", notes: "Family dispute reported" },
  ],
  vietnam: [
    { name: "Nguyen V.", relationship: "mother", approximate_age: "42", current_location: "Vietnam", contact_status: "not_in_contact", safety_status: "unknown", notes: "YP fears family in debt to traffickers" },
    { name: "Thanh V.", relationship: "father", approximate_age: "45", current_location: "Vietnam", contact_status: "not_in_contact", safety_status: "unknown" },
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const residents = await base44.asServiceRole.entities.Resident.filter({ org_id: ORG_ID }, '-created_date', 5);
    if (residents.length === 0) return Response.json({ message: "No residents found" });

    let created = 0;
    for (let i = 0; i < residents.length; i++) {
      const resident = residents[i];
      const routeKey = ROUTES_LIST[i % ROUTES_LIST.length];
      const route = ROUTES[routeKey];

      // Skip if already has more than 1 stage (fully seeded)
      const existingStages = await base44.asServiceRole.entities.JourneyStage.filter({ resident_id: resident.id });
      if (existingStages.length > 1) continue;
      // Remove any partial record
      const existing = await base44.asServiceRole.entities.JourneyLifeStoryRecord.filter({ resident_id: resident.id });
      for (const ex of existing) await base44.asServiceRole.entities.JourneyLifeStoryRecord.delete(ex.id);

      // Create main record
      const record = await base44.asServiceRole.entities.JourneyLifeStoryRecord.create({
        org_id: ORG_ID,
        resident_id: resident.id,
        country_of_origin: route.origin,
        home_town: route.home_town,
        nationality: route.nationality,
        language_spoken: route.language,
        interpreter_required: route.language !== "English" ? "yes" : "no",
        preferred_interpreter_language: route.language,
        reason_for_leaving_categories: [route.reason],
        reason_for_leaving_summary: `As stated by the young person: they fled ${route.origin} due to ${route.reason.replace(/_/g, " ")}.`,
        what_happened_before_leaving: "As stated by the young person, the situation became very dangerous and they feared for their life.",
        had_passport: i % 3 === 0 ? "yes" : "no",
        smuggler_involved: "yes",
        money_paid_for_journey: "yes",
        approximate_total_amount: `${(3000 + i * 1500).toLocaleString()}`,
        currency: "USD",
        paid_by: "Parent",
        debt_outstanding: i % 2 === 0 ? "yes" : "no",
        uk_arrival_date: `2025-0${(i % 9) + 1}-15`,
        uk_arrival_date_approximate: true,
        uk_arrival_method: route.arrival_method,
        uk_arrival_place: route.arrival_place,
        first_authority_contacted: "Border Force",
        age_assessed: i % 3 === 0 ? "yes" : i % 3 === 1 ? "pending" : "no",
        asylum_claimed_in_uk: "yes",
        solicitor_assigned: i % 2 === 0,
        solicitor_name: i % 2 === 0 ? "J. Patel" : null,
        solicitor_firm: i % 2 === 0 ? "Asylum Legal Aid LLP" : null,
        what_yp_fears_if_returned: `As stated by the young person, they fear persecution, harm and possibly death if returned to ${route.origin}.`,
        fear_of_return_summary: `The young person expressed significant fear of return to ${route.origin} due to ongoing conflict and personal threats.`,
        statement_status: i === 0 ? "submitted" : "draft",
        workflow_status: i === 0 ? "submitted" : "draft",
        completion_percentage: 40 + (i * 7 % 40),
        updated_by_name: "Demo Staff",
        local_authority: "London Borough of Hackney",
      });

      // Create journey stages
      for (let j = 0; j < route.stages.length; j++) {
        await base44.asServiceRole.entities.JourneyStage.create({
          org_id: ORG_ID,
          resident_id: resident.id,
          life_story_id: record.id,
          stage_number: j + 1,
          ...route.stages[j],
          departure_date_approximate: true,
          travelled_alone: route.stages[j].travelled_with === "Alone",
        });
      }

      // Countries passed through
      for (const country of route.countries) {
        await base44.asServiceRole.entities.JourneyCountryPassedThrough.create({
          org_id: ORG_ID,
          resident_id: resident.id,
          life_story_id: record.id,
          country,
          approximate_dates: "As per journey stages",
          applied_for_asylum: country === "Greece" || country === "Germany" ? "no" : "unknown",
          fingerprinted: country === "Greece" ? "yes" : "unknown",
          detained: "unknown",
          given_documents: "unknown",
          stayed_in_camp_or_shelter: country === "Greece" ? "yes" : "unknown",
        });
      }

      // Family members
      const fam = DEMO_FAMILIES[routeKey] || [];
      for (const member of fam) {
        await base44.asServiceRole.entities.JourneyFamilyMember.create({
          org_id: ORG_ID, resident_id: resident.id, life_story_id: record.id, ...member,
        });
      }

      // Evidence documents
      const docs = [
        { document_type: "Asylum registration card", linked_section: "Arrival in UK", uploaded: true, reviewed: true },
        { document_type: "Age assessment", linked_section: "Arrival in UK", uploaded: i % 2 === 0, reviewed: false },
        ...(i % 3 === 0 ? [{ document_type: "Solicitor letter", linked_section: "Statement Builder", uploaded: true, reviewed: true }] : []),
      ];
      for (const doc of docs) {
        await base44.asServiceRole.entities.JourneyEvidenceDocument.create({
          org_id: ORG_ID, resident_id: resident.id, life_story_id: record.id,
          uploaded_by: "Demo Staff", uploaded_at: new Date().toISOString(), ...doc,
        });
      }

      // Review event
      await base44.asServiceRole.entities.JourneyReviewEvent.create({
        org_id: ORG_ID, resident_id: resident.id, life_story_id: record.id,
        event_type: "created", from_status: null, to_status: "draft",
        created_by: "demo@staff.com", created_by_name: "Demo Staff",
      });

      created++;
    }

    return Response.json({ success: true, message: `Journey data seeded for ${created} residents.` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});