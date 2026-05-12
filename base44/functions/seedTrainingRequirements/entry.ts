import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REQUIREMENTS = [
  { course_name: "Safeguarding Children",                        category: "Safeguarding",   expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 1 },
  { course_name: "Health & Safety Awareness",                    category: "Health & Safety", expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 2 },
  { course_name: "Mental Health Awareness",                      category: "Other",           expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 3 },
  { course_name: "Missing Child Procedures",                     category: "Safeguarding",   expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 4 },
  { course_name: "Behaviour Management",                         category: "Behaviour",       expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 5 },
  { course_name: "Equality, Diversity & Inclusion",              category: "Compliance",      expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 6 },
  { course_name: "Children's Rights & Entitlements",             category: "Legislation",     expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 7 },
  { course_name: "Induction Training",                           category: "Induction",       expiry_months: 0,  is_mandatory: true,  mandatory: "Mandatory for all", display_order: 8,  notes: "Policies, Statement of Purpose, Young Person's Guide" },
  { course_name: "Risk Assessment",                              category: "Compliance",      expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 9,  notes: "Individual Young Person Risks, Contextual Risks" },
  { course_name: "Prevent / Radicalisation Awareness",           category: "Safeguarding",   expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 10 },
  { course_name: "Information Governance / GDPR",                category: "Compliance",      expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 11 },
  { course_name: "Fire Safety Awareness",                        category: "Health & Safety", expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 12 },
  { course_name: "Trauma-Informed Care",                         category: "Other",           expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 13 },
  { course_name: "Independent Living Skills (ILS)",              category: "Other",           expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 14 },
  { course_name: "Incident Reporting / Safeguarding Reporting",  category: "Safeguarding",   expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 15 },
  { course_name: "Contingency / Emergency Planning",             category: "Compliance",      expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 16 },
  { course_name: "Child Criminal Exploitation (CCE)",            category: "Safeguarding",   expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 17 },
  { course_name: "Child Sexual Exploitation (CSE)",              category: "Safeguarding",   expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 18 },
  { course_name: "County Lines Safeguarding",                    category: "Safeguarding",   expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 19 },
  { course_name: "Lone Working",                                 category: "Health & Safety", expiry_months: 12, is_mandatory: true,  mandatory: "Mandatory for all", display_order: 20 },
  { course_name: "Medication Awareness",                         category: "Other",           expiry_months: 12, is_mandatory: false, mandatory: "Optional",          display_order: 21 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const org_id = body.org_id || 'default_org';

    // Check if already seeded
    const existing = await base44.asServiceRole.entities.TrainingRequirement.list();
    if (existing && existing.length > 0) {
      return Response.json({ seeded: false, message: 'Already seeded', count: existing.length });
    }

    const created = [];
    for (const req_item of REQUIREMENTS) {
      const record = await base44.asServiceRole.entities.TrainingRequirement.create({
        ...req_item,
        org_id,
        is_active: true,
        home_types: [],
        roles: ["admin", "admin_officer", "team_leader", "support_worker"],
        role: "all",
      });
      created.push(record);
    }

    return Response.json({ seeded: true, count: created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});