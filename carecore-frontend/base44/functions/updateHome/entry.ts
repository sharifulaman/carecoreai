import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['admin', 'admin_officer'].includes(user.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await req.json();
    const homeId = data.id;
    delete data.id;

    const home = await base44.asServiceRole.entities.Home.update(homeId, data);
    
    return Response.json(home);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});