/**
 * Secure Data Gateway Client
 *
 * All entity reads/writes go through the `secureDataGateway` backend function.
 * 
 * PERFORMANCE OPTIMISATION:
 * We cache the StaffProfile hint (org_id, role, home_ids) in memory after the
 * first successful call. This hint is passed with every subsequent request so
 * the backend can skip its StaffProfile lookup API call entirely, preventing
 * the rate-limit cascade that occurs when many queries fire simultaneously on
 * page load.
 */

import { base44 } from '@/api/base44Client';

// In-memory hint cache — populated on first successful call that returns data
let _hint = null;

// Also try to load from sessionStorage across page refreshes
try {
  const stored = sessionStorage.getItem('_sgHint');
  if (stored) _hint = JSON.parse(stored);
} catch (_) {}

function saveHint(h) {
  _hint = h;
  try { sessionStorage.setItem('_sgHint', JSON.stringify(h)); } catch (_) {}
}

async function call(payload) {
  // Attach hint if available
  const fullPayload = _hint ? { ...payload, _hint } : payload;
  const response = await base44.functions.invoke('secureDataGateway', fullPayload);
  return response.data;
}

// After login/profile load, call this once to prime the cache
export async function primeSecureGateway(staffProfile) {
  if (staffProfile && staffProfile.org_id && staffProfile.role) {
    saveHint({
      org_id: staffProfile.org_id,
      role: staffProfile.role,
      home_ids: staffProfile.home_ids || [],
    });
  }
}

// Clear hint on logout
export function clearSecureGatewayHint() {
  _hint = null;
  try { sessionStorage.removeItem('_sgHint'); } catch (_) {}
}

export const secureGateway = {
  list: (entity, sort = '-created_date', limit = 500) =>
    call({ entity, operation: 'list', sort, limit }).then(r => r.data),

  filter: (entity, filters = {}, sort = '-created_date', limit = 500) =>
    call({ entity, operation: 'filter', filters, sort, limit }).then(r => r.data),

  get: (entity, id) =>
    call({ entity, operation: 'get', id }).then(r => r.data),

  create: (entity, data) =>
    call({ entity, operation: 'create', data }).then(r => r.data),

  update: (entity, id, data) =>
    call({ entity, operation: 'update', id, data }).then(r => r.data),

  delete: (entity, id) =>
    call({ entity, operation: 'delete', id }).then(r => r),

  bulkCreate: (entity, data) =>
    call({ entity, operation: 'bulkCreate', data }).then(r => r.data),
};