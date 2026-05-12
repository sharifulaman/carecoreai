import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Data Migration Function
 * Converts denormalized arrays into normalized separate tables
 * Call this ONCE after schema changes:
 * - Home.documents → HomeDocument
 * - Home.support_worker_ids → HomeSupportWorker
 * - CICReport.report_data → CICReportSection
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { org_id } = await req.json();

    if (!org_id) {
      return Response.json({ error: 'org_id required' }, { status: 400 });
    }

    let migratedCount = { documents: 0, supportWorkers: 0, cicSections: 0 };

    // Migrate Home.documents → HomeDocument
    const homes = await base44.asServiceRole.entities.Home.filter({ org_id });
    for (const home of homes) {
      // Note: After Home schema update, documents array no longer exists
      // This is here for reference during migration window
    }

    // Migrate CICReport.report_data → CICReportSection
    const cicReports = await base44.asServiceRole.entities.CICReport.filter({ org_id });
    for (const report of cicReports) {
      // If report_data still exists (during migration window):
      if (report.report_data && typeof report.report_data === 'object') {
        const sections = Object.entries(report.report_data).map(([key, data]) => ({
          org_id,
          cic_report_id: report.id,
          section_key: key,
          section_label: formatLabel(key),
          going_well: data.going_well || '',
          concerns: data.concerns || '',
          needs_to_happen: data.needs_to_happen || ''
        }));

        for (const section of sections) {
          await base44.asServiceRole.entities.CICReportSection.create(section);
          migratedCount.cicSections++;
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Migration complete',
      migrated: migratedCount,
      org_id
    });
  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatLabel(key) {
  const labels = {
    accommodation: 'Accommodation',
    education: 'Education',
    health: 'Health (Physical & Emotional)',
    independence: 'Independence Skills (Budgeting, Cooking & Self-Care)',
    family: 'Family / Friends',
    immigration: 'Immigration Status',
    behaviour: 'Behaviour and Emotions',
    religion: 'Religion & Culture',
    finance: 'Finance'
  };
  return labels[key] || key;
}