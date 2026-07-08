import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await req.json();
    
    const docData = {
      org_id: 'default_org',
      home_id: data.home_id,
      title: data.title,
      document_type: data.document_type || 'other',
      file_url: data.file_url || '',
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: data.expiry_date,
      status: data.expiry_date ? 'current' : 'current',
      uploaded_by: user.id,
      notes: `Reference: ${data.reference || ''}\nDetails: ${data.details || ''}`
    };

    const doc = await base44.asServiceRole.entities.HomeDocument.create(docData);
    
    return Response.json({ id: doc.id, ...doc });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});