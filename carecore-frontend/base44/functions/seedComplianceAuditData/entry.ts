import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ORG_ID = 'default_org';

    const homes = await base44.asServiceRole.entities.Home.filter({ org_id: ORG_ID });
    if (!homes.length) return Response.json({ error: 'No homes found' }, { status: 400 });

    const homeMap = {};
    homes.forEach(h => { homeMap[h.name] = h.id; });

    const getHomeId = (name) => {
      const found = homes.find(h => h.name?.toLowerCase().includes(name.toLowerCase()));
      return found ? found.id : homes[0].id;
    };
    const getHomeName = (name) => {
      const found = homes.find(h => h.name?.toLowerCase().includes(name.toLowerCase()));
      return found ? found.name : homes[0].name;
    };

    const today = new Date();
    const daysFromToday = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };

    // Delete existing compliance items
    const existing = await base44.asServiceRole.entities.ComplianceItem.filter({ org_id: ORG_ID });
    for (const item of existing) {
      await base44.asServiceRole.entities.ComplianceItem.delete(item.id);
    }

    const items = [
      { item_name: 'Gas Safety Certificate', home: 'meadow', category: 'gas_safety', expiry: daysFromToday(-57), owner: 'Home Manager', priority: 'critical', status: 'expired', evidence_status: 'uploaded' },
      { item_name: 'Electrical Certificate (EICR)', home: 'castle', category: 'electrical_safety', expiry: daysFromToday(-114), owner: 'Maintenance Lead', priority: 'critical', status: 'expired', evidence_status: 'missing' },
      { item_name: 'Fire Risk Assessment', home: 'parkside', category: 'fire_safety', expiry: daysFromToday(-23), owner: 'Compliance Officer', priority: 'high', status: 'expired', evidence_status: 'uploaded' },
      { item_name: 'Gas Safety Certificate', home: 'riverside', category: 'gas_safety', expiry: daysFromToday(-6), owner: 'Home Manager', priority: 'high', status: 'expired', evidence_status: 'missing' },
      { item_name: 'Electrical Certificate (EICR)', home: 'north', category: 'electrical_safety', expiry: daysFromToday(15), owner: 'Maintenance Lead', priority: 'medium', status: 'due_in_30', evidence_status: 'missing' },
      { item_name: 'Fire Alarm Service', home: 'summit', category: 'fire_safety', expiry: daysFromToday(19), owner: 'Maintenance Lead', priority: 'medium', status: 'due_in_30', evidence_status: 'pending_review' },
      { item_name: 'Emergency Lighting Test', home: 'meadow', category: 'emergency_lighting', expiry: daysFromToday(10), owner: 'Maintenance Lead', priority: 'medium', status: 'due_in_30', evidence_status: 'missing' },
      { item_name: 'Emergency Lighting Test', home: 'castle', category: 'emergency_lighting', expiry: daysFromToday(81), owner: 'Maintenance Lead', priority: 'review', status: 'due_in_90', evidence_status: 'uploaded' },
      { item_name: 'Insurance Policy', home: 'riverside', category: 'insurance', expiry: daysFromToday(114), owner: 'Admin', priority: 'current', status: 'current', evidence_status: 'uploaded' },
      { item_name: 'Water Risk Assessment', home: 'north', category: 'water_safety', expiry: daysFromToday(151), owner: 'Compliance Officer', priority: 'current', status: 'current', evidence_status: 'uploaded' },
      { item_name: 'Legionella Risk Assessment', home: 'castle', category: 'water_safety', expiry: daysFromToday(163), owner: 'Compliance Officer', priority: 'current', status: 'current', evidence_status: 'uploaded' },
      { item_name: 'PAT Testing', home: 'summit', category: 'electrical_safety', expiry: daysFromToday(-40), owner: 'Maintenance Lead', priority: 'critical', status: 'expired', evidence_status: 'missing' },
      { item_name: 'Asbestos Survey', home: 'parkside', category: 'health_safety', expiry: daysFromToday(45), owner: 'Compliance Officer', priority: 'review', status: 'due_in_90', evidence_status: 'uploaded' },
      { item_name: 'Property Licence', home: 'meadow', category: 'property_licence', expiry: daysFromToday(200), owner: 'Admin', priority: 'current', status: 'current', evidence_status: 'uploaded' },
      { item_name: 'Fire Alarm Service', home: 'castle', category: 'fire_safety', expiry: daysFromToday(25), owner: 'Maintenance Lead', priority: 'medium', status: 'due_in_30', evidence_status: 'missing' },
      { item_name: 'Health & Safety Audit', home: 'riverside', category: 'health_safety', expiry: daysFromToday(60), owner: 'Compliance Officer', priority: 'review', status: 'due_in_90', evidence_status: 'pending_review' },
      { item_name: 'Safeguarding Policy Review', home: 'north', category: 'policy_review', expiry: daysFromToday(90), owner: 'Home Manager', priority: 'review', status: 'due_in_90', evidence_status: 'uploaded' },
      { item_name: 'Medication Policy Review', home: 'summit', category: 'policy_review', expiry: daysFromToday(120), owner: 'Home Manager', priority: 'current', status: 'current', evidence_status: 'uploaded' },
      { item_name: 'Fire Risk Assessment', home: 'meadow', category: 'fire_safety', expiry: daysFromToday(180), owner: 'Compliance Officer', priority: 'current', status: 'current', evidence_status: 'uploaded' },
      { item_name: 'Gas Safety Certificate', home: 'summit', category: 'gas_safety', expiry: daysFromToday(28), owner: 'Home Manager', priority: 'medium', status: 'due_in_30', evidence_status: 'missing' },
      { item_name: 'Insurance Policy', home: 'meadow', category: 'insurance', expiry: daysFromToday(25), owner: 'Admin', priority: 'medium', status: 'due_in_30', evidence_status: 'uploaded' },
      { item_name: 'Missing From Home Procedure', home: 'castle', category: 'policy_review', expiry: daysFromToday(150), owner: 'Home Manager', priority: 'current', status: 'current', evidence_status: 'uploaded' },
      { item_name: 'Local Authority Review', home: 'parkside', category: 'local_authority', expiry: daysFromToday(-10), owner: 'Admin', priority: 'high', status: 'expired', evidence_status: 'missing' },
      { item_name: 'Electrical Certificate (EICR)', home: 'parkside', category: 'electrical_safety', expiry: daysFromToday(32), owner: 'Maintenance Lead', priority: 'medium', status: 'due_in_30', evidence_status: 'missing' },
      { item_name: 'Emergency Lighting Test', home: 'parkside', category: 'emergency_lighting', expiry: daysFromToday(38), owner: 'Maintenance Lead', priority: 'review', status: 'due_in_90', evidence_status: 'uploaded' },
    ];

    const created = [];
    for (const item of items) {
      const record = await base44.asServiceRole.entities.ComplianceItem.create({
        org_id: ORG_ID,
        home_id: getHomeId(item.home),
        home_name: getHomeName(item.home),
        item_name: item.item_name,
        category: item.category,
        expiry_date: item.expiry,
        owner_name: item.owner,
        priority: item.priority,
        status: item.status,
        evidence_status: item.evidence_status,
        renewal_frequency: 'annually',
        reminder_days_before: 30,
        created_by_name: user.full_name || 'Admin',
      });
      created.push(record);
    }

    // Seed activity events
    const existingEvents = await base44.asServiceRole.entities.ComplianceActivityEvent.filter({ org_id: ORG_ID });
    for (const ev of existingEvents) {
      await base44.asServiceRole.entities.ComplianceActivityEvent.delete(ev.id);
    }

    const events = [
      { title: 'Gas Certificate uploaded', home: 'riverside', item: 'Gas Safety Certificate', type: 'evidence_uploaded', offsetMins: 0 },
      { title: 'Fire Risk Assessment expired', home: 'parkside', item: 'Fire Risk Assessment', type: 'item_updated', offsetMins: -2700 },
      { title: 'EICR renewal assigned', home: 'castle', item: 'Electrical Certificate (EICR)', type: 'task_assigned', offsetMins: -7200 },
      { title: 'Fire Alarm Service completed', home: 'summit', item: 'Fire Alarm Service', type: 'item_closed', offsetMins: -14400 },
      { title: 'Audit action closed', home: 'summit', item: 'Health & Safety Audit', type: 'audit_review_run', offsetMins: -21600 },
    ];

    for (const ev of events) {
      const dt = new Date(today.getTime() + ev.offsetMins * 60000);
      await base44.asServiceRole.entities.ComplianceActivityEvent.create({
        org_id: ORG_ID,
        home_name: getHomeName(ev.home),
        home_id: getHomeId(ev.home),
        compliance_item_name: ev.item,
        event_type: ev.type,
        event_title: ev.title,
        performed_by_name: user.full_name || 'Admin',
        event_datetime: dt.toISOString(),
      });
    }

    return Response.json({ success: true, created: created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});