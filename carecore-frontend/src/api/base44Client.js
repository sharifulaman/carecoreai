// @ts-nocheck
// Local vs server API is controlled by VITE_API_BASE_URL in .env.
// In dev, requests always go through the Vite proxy (same-origin, no CORS), which
// forwards to whichever backend VITE_API_BASE_URL points at (see vite.config.js).
const API_BASE = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'https://app.carecoreai.co.uk/api');

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

const isBrowser = typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
const storage = isBrowser ? window.sessionStorage : null;

const readJson = (key) => {
  if (!storage) return null;
  const value = storage.getItem(key);
  if (!value) return null;
  try { return JSON.parse(value); } catch (_) { return null; }
};

const writeSession = (session = {}) => {
  if (!storage) return;

  const accessToken =
    session.access_token ||
    session.token ||
    session.data?.access_token ||
    session.data?.token;

  if (accessToken) storage.setItem(ACCESS_TOKEN_KEY, accessToken);

  const refreshToken =
    session.refresh_token ||
    session.data?.refresh_token;

  if (refreshToken) storage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  if (session.user) {
    storage.setItem(USER_KEY, JSON.stringify(session.user));
  } else if (session.data?.user) {
    storage.setItem(USER_KEY, JSON.stringify(session.data.user));
  }
};

const clearSession = () => {
  // Written for test purposes
    inMemoryToken = null; 
  if (!storage) return;
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
};

// const getAccessToken = () => (storage ? storage.getItem(ACCESS_TOKEN_KEY) : null);
// inMemoryToken variable is used when the getAccessToken() function sets token from a test function
let inMemoryToken = null;

const getAccessToken = () => inMemoryToken ?? (storage ? storage.getItem(ACCESS_TOKEN_KEY) : null);

const buildUrl = (path, query = '') => {
  console.log('===== > buildUrl called with path:', path, 'and query:', query);
  return `${API_BASE}${path}${query}`;
};

const normalizeMediaType = (value = '') => String(value || '').split(';')[0].trim().toLowerCase();

const getFileExtension = (name = '') => {
  const baseName = String(name || '').toLowerCase();
  const index = baseName.lastIndexOf('.');
  return index >= 0 ? baseName.slice(index) : '';
};

const UPLOAD_MAX_FILE_SIZE_BYTES = Number(import.meta.env.VITE_UPLOAD_MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024);

const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/html',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-7z-compressed',
  'text/plain',
  'text/csv',
]);

const getUploadValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const validateUploadFile = (file) => {
  if (!file) throw getUploadValidationError('File is required');

  const fileSize = Number(file.size || 0);
  if (fileSize > UPLOAD_MAX_FILE_SIZE_BYTES) {
    throw getUploadValidationError(`Max file size is ${Math.round(UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB`);
  }

  const declaredType = normalizeMediaType(file.type);
  const ext = getFileExtension(file.name || '');

  if (ALLOWED_UPLOAD_TYPES.has(declaredType)) return;

  if (ext === '.docx' || ext === '.odt' || ext === '.ppt' || ext === '.pptx' || ext === '.xlsx') return;
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp' || ext === '.gif') return;
  if (ext === '.html' || ext === '.htm') return;
  if (ext === '.pdf' || ext === '.doc' || ext === '.xls' || ext === '.txt' || ext === '.csv' || ext === '.zip' || ext === '.7z') return;

  throw getUploadValidationError('Unsupported file type');
};

const getAuthToken = () => (storage ? storage.getItem(ACCESS_TOKEN_KEY) : null);

const uploadFile = ({ file, folder = 'temp', onProgress } = {}) => new Promise((resolve, reject) => {
  try {
    validateUploadFile(file);
  } catch (error) {
    reject(error);
    return;
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', buildUrl('/uploads'));
  xhr.responseType = 'json';

  const token = getAuthToken();
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  xhr.onload = () => {
    const response = xhr.response || null;
    if (xhr.status < 200 || xhr.status >= 300) {
      const message = response?.error?.message || response?.message || xhr.statusText || 'Upload failed';
      const error = new Error(message);
      error.status = xhr.status;
      error.data = response?.error || response;
      reject(error);
      return;
    }

    const payload = response?.data ?? response;
    resolve(payload);
  };

  xhr.onerror = () => {
    const error = new Error('Upload failed');
    error.status = 0;
    reject(error);
  };

  if (xhr.upload && typeof onProgress === 'function') {
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };
  }

  const formData = new FormData();
  formData.append('file', file, file.name || 'upload');
  if (folder) formData.append('folder', folder);
  xhr.send(formData);
});

const deleteUpload = async ({ key, file_url } = {}) => {
  const payload = await request('/uploads', {
    method: 'DELETE',
    body: { key, file_url },
  });
  return unwrap(payload);
};

const getSignedUploadUrl = async ({ key, file_url, expires_in_seconds = 3600 } = {}) => {
  const payload = await request('/uploads/signed-url', {
    method: 'POST',
    body: { key, file_url, expires_in_seconds },
  });
  return unwrap(payload);
};

const buildError = async (response) => {
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }
  const message = payload?.error?.message || payload?.message || response.statusText || `Request failed with status code ${response.status}`;
  const error = new Error(message);
  error.status = response.status;
  error.data = payload?.error || payload;
  return error;
};

const request = async (path, { method = 'GET', body, auth = true, headers = {} } = {}) => {
  const requestHeaders = { 'Content-Type': 'application/json', ...headers };
  const token = getAccessToken();
  if (auth && token) requestHeaders.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;
  if (!response.ok) throw await buildError(response);
  try { return await response.json(); } catch (_) { return null; }
};

// ── FIX: unwrapList handles the backend envelope { status, data: [...], pagination }
// The backend always returns the array under payload.data for list/filter endpoints.
const unwrapList = (payload) => {
  if (!payload) return [];
  // { status: "success", data: [...] }  ← your Go backend shape
  if (Array.isArray(payload.data)) return payload.data;
  // flat array (defensive)
  if (Array.isArray(payload)) return payload;
  return [];
};

// unwrap is kept for single-record endpoints (GET /entities/:entity/:id, POST, PUT)
const unwrap = (payload) =>
  payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

const compareValues = (recordValue, filterValue) => {
  if (recordValue == null || filterValue == null) return recordValue == filterValue;
  return String(recordValue) === String(filterValue);
};

const matchesFilterValue = (recordValue, expected) => {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return Object.entries(expected).every(([operator, operatorValue]) => {
      switch (operator) {
        case '$in': { const values = Array.isArray(operatorValue) ? operatorValue : String(operatorValue).split(','); return values.some((value) => compareValues(recordValue, value)); }
        case '$nin': { const values = Array.isArray(operatorValue) ? operatorValue : String(operatorValue).split(','); return !values.some((value) => compareValues(recordValue, value)); }
        case '$gte': return Number(recordValue) >= Number(operatorValue) || String(recordValue) >= String(operatorValue);
        case '$gt':  return Number(recordValue) >  Number(operatorValue) || String(recordValue) >  String(operatorValue);
        case '$lte': return Number(recordValue) <= Number(operatorValue) || String(recordValue) <= String(operatorValue);
        case '$lt':  return Number(recordValue) <  Number(operatorValue) || String(recordValue) <  String(operatorValue);
        case '$ne':  return !compareValues(recordValue, operatorValue);
        case '$contains':   return String(recordValue ?? '').toLowerCase().includes(String(operatorValue ?? '').toLowerCase());
        case '$startsWith': return String(recordValue ?? '').toLowerCase().startsWith(String(operatorValue ?? '').toLowerCase());
        case '$exists': return operatorValue ? recordValue != null : recordValue == null;
        default: return compareValues(recordValue, operatorValue);
      }
    });
  }
  return compareValues(recordValue, expected);
};

const matchesFilters = (record, filters = {}) =>
  Object.entries(filters).every(([field, expected]) => matchesFilterValue(record[field], expected));

const sortRecords = (records, sort = '-created_date') => {
  if (!sort) return records;
  const fields = Array.isArray(sort) ? sort : String(sort).split(',').map(p => p.trim()).filter(Boolean);
  const sorted = [...records];
  sorted.sort((left, right) => {
    for (const field of fields) {
      const desc = field.startsWith('-');
      const key = desc ? field.slice(1) : field;
      const lv = left?.[key], rv = right?.[key];
      if (lv === rv) continue;
      if (lv == null) return desc ? 1 : -1;
      if (rv == null) return desc ? -1 : 1;
      if (lv < rv) return desc ? 1 : -1;
      if (lv > rv) return desc ? -1 : 1;
    }
    return 0;
  });
  return sorted;
};

const localStores = new Map();
const getLocalStore = (entityName) => { if (!localStores.has(entityName)) localStores.set(entityName, []); return localStores.get(entityName); };
const cloneRecord = (record) => (record == null ? record : JSON.parse(JSON.stringify(record)));
const currentUser = () => readJson(USER_KEY);

const localList = (entityName, filters = {}, sort = '-created_date', limit = 500) => {
  const records = getLocalStore(entityName).filter(record => matchesFilters(record, filters));
  return sortRecords(records, sort).slice(0, limit).map(cloneRecord);
};

const localCreate = (entityName, data = {}) => {
  const user = currentUser();
  const now = new Date().toISOString();
  const record = { id: crypto?.randomUUID ? crypto.randomUUID() : `local_${Date.now()}`, ...cloneRecord(data), created_date: data.created_date || now, updated_date: now, created_by: data.created_by || user?.email || null, org_id: data.org_id || user?.org_id || null };
  getLocalStore(entityName).push(record);
  return cloneRecord(record);
};

const localUpdate = (entityName, id, data = {}) => {
  const store = getLocalStore(entityName);
  const index = store.findIndex(record => record.id === id);
  if (index === -1) return null;
  const updated = { ...store[index], ...cloneRecord(data), id, updated_date: new Date().toISOString() };
  store[index] = updated;
  return cloneRecord(updated);
};

const localDelete = (entityName, id) => {
  const store = getLocalStore(entityName);
  const index = store.findIndex(record => record.id === id);
  if (index !== -1) store.splice(index, 1);
  return true;
};

const handleLocalFallback = (entityName, operation, args = {}) => {
  switch (operation) {
    case 'list':       return localList(entityName, {}, args.sort, args.limit);
    case 'filter':     return localList(entityName, args.filters, args.sort, args.limit);
    case 'get':        return getLocalStore(entityName).find(record => record.id === args.id) || null;
    case 'create':     return localCreate(entityName, args.data);
    case 'update':     return localUpdate(entityName, args.id, args.data);
    case 'delete':     return localDelete(entityName, args.id);
    case 'bulkCreate': return Array.isArray(args.data) ? args.data.map(item => localCreate(entityName, item)) : [];
    case 'bulkUpdate': return Array.isArray(args.data) ? args.data.map(item => localUpdate(entityName, item.id, item)) : [];
    default:           return null;
  }
};

const serializeFilters = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([field, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([operator, operatorValue]) => {
        const encodedValue = Array.isArray(operatorValue) ? operatorValue.join(',') : operatorValue;
        params.set(`${field}[${operator}]`, encodedValue);
      });
      return;
    }
    if (Array.isArray(value)) { params.set(`${field}[$in]`, value.join(',')); return; }
    params.set(field, value);
  });
  return params;
};

const entityRequest = async (entityName, operation, args = {}) => {
  try {
    switch (operation) {
      case 'list': {
        const params = new URLSearchParams();
        if (args.sort) params.set('sort', args.sort);
        if (args.limit != null) params.set('limit', String(args.limit));
        const payload = await request(`/entities/${entityName}${params.toString() ? `?${params.toString()}` : ''}`);
        // FIX: use unwrapList — backend returns { status, data: [...] }
        return unwrapList(payload);
      }
      case 'filter': {
        const params = serializeFilters(args.filters || {});
        if (args.sort) params.set('sort', args.sort);
        if (args.limit != null) params.set('limit', String(args.limit));
        const payload = await request(`/entities/${entityName}${params.toString() ? `?${params.toString()}` : ''}`);
        // FIX: use unwrapList — backend returns { status, data: [...] }
        return unwrapList(payload);
      }
      case 'get': {
        const payload = await request(`/entities/${entityName}/${args.id}`);
        return unwrap(payload);
      }
      case 'create': {
        const payload = await request(`/entities/${entityName}`, { method: 'POST', body: args.data });
        return unwrap(payload);
      }
      case 'update': {
        const payload = await request(`/entities/${entityName}/${args.id}`, { method: 'PUT', body: args.data });
        return unwrap(payload);
      }
      case 'delete': {
        await request(`/entities/${entityName}/${args.id}`, { method: 'DELETE' });
        return true;
      }
      case 'bulkCreate': {
        const payload = await request(`/entities/${entityName}/bulk`, { method: 'POST', body: args.data });
        return unwrap(payload);
      }
      case 'bulkUpdate': {
        const payload = await request(`/entities/${entityName}/bulk`, { method: 'PUT', body: args.data });
        return unwrap(payload);
      }
      default:
        return null;
    }
  } catch (error) {
    if (error?.status === 404) return handleLocalFallback(entityName, operation, args);
    throw error;
  }
};

const entityProxy = new Proxy({}, {
  get: (_, entityName) => ({
    list:       (sort = '-created_date', limit = 500) => entityRequest(entityName, 'list', { sort, limit }),
    filter:     (filters = {}, sort = '-created_date', limit = 500) => entityRequest(entityName, 'filter', { filters, sort, limit }),
    get:        (id) => entityRequest(entityName, 'get', { id }),
    create:     (data) => entityRequest(entityName, 'create', { data }),
    update:     (id, data) => entityRequest(entityName, 'update', { id, data }),
    delete:     (id) => entityRequest(entityName, 'delete', { id }),
    bulkCreate: (data) => entityRequest(entityName, 'bulkCreate', { data }),
    bulkUpdate: (data) => entityRequest(entityName, 'bulkUpdate', { data }),
  }),
});

const auth = {
  async me() {
    const token = getAccessToken();
    if (!token) { const error = new Error('Authentication required'); error.status = 401; throw error; }
    const payload = await request('/auth/me');
    const user = unwrap(payload);
    if (user && storage) storage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  async login(credentials) {
    const payload = await request('/auth/login', { method: 'POST', auth: false, body: credentials });

    const data = unwrap(payload) || {};
    console.log('nfs 11===== > auth.login called, data:', data);

    writeSession(data);
    return data;
  },

  async register(payload) {
    const response = await request('/auth/register', { method: 'POST', auth: false, body: payload });
    return unwrap(response);
  },

  async refresh() {
    if (!storage) { const error = new Error('Refresh token unavailable'); error.status = 401; throw error; }
    const refreshToken = storage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) { const error = new Error('Refresh token unavailable'); error.status = 401; throw error; }
    const payload = await request('/auth/refresh', { method: 'POST', auth: false, body: { refresh_token: refreshToken } });
    const data = unwrap(payload) || {};
    writeSession(data);
    return data;
  },

  async updateMe(payload) {
    const response = await request('/auth/me', { method: 'PUT', body: payload });
    return unwrap(response);
  },

  logout(redirectTo = '/') {
    clearSession();
    if (typeof window !== 'undefined' && redirectTo) window.location.href = redirectTo;
  },

  redirectToLogin(fromUrl = typeof window !== 'undefined' ? window.location.href : '/') {
    if (typeof window === 'undefined') return;
    window.location.href = `/?auth=login&from_url=${encodeURIComponent(fromUrl)}`;
  },
};

const users = {
  async inviteUser(email, role = 'support_worker') {
    const temporaryPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;
    const fullName = email.split('@')[0] || email;
    const response = await auth.register({ email, password: temporaryPassword, full_name: fullName, role });
    return { ...response, temporary_password: temporaryPassword };
  },
};

const workflow = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/workflow${qs ? `?${qs}` : ''}`).then(p => (Array.isArray(p?.data) ? p.data : []));
  },
  types: () => request('/workflow/types').then(p => (Array.isArray(p?.data) ? p.data : [])),
  get:    (id)        => request(`/workflow/${id}`).then(unwrap),
  entity: (id)        => request(`/workflow/${id}/entity`).then(unwrap),
  events: (id)        => request(`/workflow/${id}/events`).then(p => (Array.isArray(p?.data) ? p.data : [])),
  create: (data)      => request('/workflow', { method: 'POST', body: data }).then(unwrap),
  action: (id, data)  => request(`/workflow/${id}/action`, { method: 'POST', body: data }).then(unwrap),
};

const roleDefinitions = {
  list: () => request('/role-definitions').then(p => (Array.isArray(p?.data) ? p.data : [])),
  create: (data) => request('/role-definitions', { method: 'POST', body: data }).then(unwrap),
  update: (id, data) => request(`/role-definitions/${id}`, { method: 'PUT', body: data }).then(unwrap),
  del: (id) => request(`/role-definitions/${id}`, { method: 'DELETE' }),
};

// auditTrail calls GET /audit-trail with server-side filtering and pagination.
// Returns { status, data: [...], meta: { page, page_size, total_count, total_pages } }.
const auditTrail = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null && v !== '' && v !== 'all')
      )
    ).toString();
    return request(`/audit-trail${qs ? `?${qs}` : ''}`);
  },
  // logExport records that the user exported a batch of audit trail data,
  // so the "Exports / Downloads" KPI reflects real activity.
  logExport: (format, recordCount) =>
    request('/audit-trail/export-log', {
      method: 'POST',
      body: { format, record_count: recordCount },
    }),
};

const permissions = {
  // fetchMine fetches the RolePermission record for the currently authenticated user's
  // role via the dedicated /my-permissions endpoint. This endpoint is exempt from
  // module-level access checks so users with all modules set to None can still load
  // their own permissions (avoids a chicken-and-egg restriction loop).
  async fetchMine() {
    try {
      const payload = await request('/my-permissions');
      return payload?.data ?? null;
    } catch (_) {
      // On any error (network, auth) return null so the frontend falls back to
      // role-based defaults rather than blocking the user entirely.
      return null;
    }
  },
};

const functions = {
  async invoke(name, payload = {}) {
    try {
      const response = await request(`/functions/${name}`, { method: 'POST', body: payload });
      return response;
    } catch (error) {
      // Only swallow 404 (function not yet implemented on local backend).
      // Re-throw everything else (403 permission denied, 500 server errors, etc.)
      // so callers and global mutation handlers can surface the real error message.
      if (error?.status === 404) {
        console.warn(`[local backend] function '${name}' not found; falling back to mock:`, error);
        return { data: null, name, payload };
      }
      throw error;
    }
  },
};

const integrations = {
  Core: {
    async InvokeLLM({ prompt = '', response_json_schema } = {}) {
      const payload = await request('/integrations/llm', {
        method: 'POST',
        body: { prompt, response_json_schema },
      });
      // Backend returns { status: 'success', data: { ...fields } }
      return payload?.data ?? payload ?? {};
    },
    async UploadFile(options = {})      { return uploadFile(options); },
    async DeleteFile(options = {})      { return deleteUpload(options); },
    async GetSignedFileURL(options = {}) { return getSignedUploadUrl(options); },
    async SendEmail()                  { console.warn('[local backend] email not implemented.');           return { success: true }; },
    async ExtractDataFromUploadedFile(){ console.warn('[local backend] file extraction not implemented.'); return { data: null }; },
    async GenerateImage()              { console.warn('[local backend] image gen not implemented.');       return { url: '' }; },
  },
};
// Used for test purposes
const setToken = (token) => {
  inMemoryToken = token;
  if (storage) storage.setItem(ACCESS_TOKEN_KEY, token);
};

export const base44 = {
  auth,
  entities: entityProxy,
  functions,
  integrations,
  users,
  permissions,
  roleDefinitions,
  workflow,
  auditTrail,
  asServiceRole: { entities: entityProxy },
  setToken
};
