/**
 * performanceApi.js
 *
 * All Employee Performance API calls live here. The frontend passes the results
 * straight to components for rendering — no calculations happen on the client.
 */

const API_BASE = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");

function getToken() {
  return sessionStorage.getItem("access_token") || sessionStorage.getItem("token") || "";
}

async function apiFetch(path) {
  const r = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw Object.assign(new Error(body.error?.message || "Request failed"), {
      status: r.status,
    });
  }
  const json = await r.json();
  return json.data;
}

// Maps the frontend's period filter values to the backend's query params.
// Named periods go as ?period=X; custom ranges go as ?from=X&to=Y.
function periodToParams(periodFilter) {
  const now = new Date();
  const iso  = (d) => d.toISOString().split("T")[0];

  switch (periodFilter) {
    case "current_month":   return "period=this_month";
    case "last_month":      return "period=last_month";
    case "current_quarter": return "period=this_quarter";
    case "last_quarter": {
      const q  = Math.floor(now.getMonth() / 3);
      const pq = q === 0 ? 3 : q - 1;
      const yr = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const s  = new Date(yr, pq * 3, 1);
      const e  = new Date(yr, pq * 3 + 3, 0);
      return `from=${iso(s)}&to=${iso(e)}`;
    }
    case "year_to_date":
      return `from=${now.getFullYear()}-01-01&to=${iso(now)}`;
    default:
      return "period=this_month";
  }
}

// Builds the common filter params shared by all team endpoints.
function filterParams({ periodFilter, homeId, role, department, search }) {
  const parts = [periodToParams(periodFilter)];
  if (homeId     && homeId     !== "all") parts.push(`home_id=${encodeURIComponent(homeId)}`);
  if (role       && role       !== "all") parts.push(`role=${encodeURIComponent(role)}`);
  if (department && department !== "all") parts.push(`department=${encodeURIComponent(department)}`);
  if (search)                             parts.push(`search=${encodeURIComponent(search)}`);
  return parts.join("&");
}

export const performanceApi = {
  /**
   * GET /business/performance/team-kpis
   * Returns the 6 KPI card values + insights panel data (top performers,
   * needs review, role distribution, and alert preview).
   */
  teamKPIs: (filters) => {
    const base = filterParams(filters);
    const statusFilter = filters?.statusFilter;
    const status = statusFilter && statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : "";
    return apiFetch(`/business/performance/team-kpis?${base}${status}`);
  },

  /**
   * GET /business/performance/team-summary
   * Returns the paginated, pre-scored employee table rows.
   */
  teamSummary: ({ periodFilter, homeId, role, department, search, statusFilter, page = 1, pageSize = 20, sortBy = "score" }) => {
    const base = filterParams({ periodFilter, homeId, role, department, search });
    const status = statusFilter && statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : "";
    return apiFetch(
      `/business/performance/team-summary?${base}${status}&page=${page}&page_size=${pageSize}&sort_by=${sortBy}`,
    );
  },

  /**
   * GET /business/performance/alerts
   * Returns the full list of performance alerts with optional type/severity filter.
   */
  alerts: (filters, { alertType = "", severity = "" } = {}) => {
    const parts = [filterParams(filters)];
    if (alertType) parts.push(`alert_type=${alertType}`);
    if (severity)  parts.push(`severity=${severity}`);
    return apiFetch(`/business/performance/alerts?${parts.join("&")}`);
  },

  /**
   * GET /business/staff-performance/:staffId/activities
   * Manager view of a specific employee's activity log.
   */
  staffActivities: (staffId, { type = "", from = "", to = "", page = 1, pageSize = 20 } = {}) => {
    const parts = [`page=${page}`, `page_size=${pageSize}`];
    if (type) parts.push(`type=${type}`);
    if (from) parts.push(`from=${from}`);
    if (to)   parts.push(`to=${to}`);
    return apiFetch(`/business/staff-performance/${staffId}/activities?${parts.join("&")}`);
  },

  /**
   * POST /business/staff-performance/:staffId/goals
   * Manager sets a performance goal for an employee.
   */
  setGoalForEmployee: (staffId, body) =>
    fetch(`${API_BASE}/business/staff-performance/${staffId}/goals`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw Object.assign(new Error(json.error?.message || "Failed"), { status: r.status });
      return json.data;
    }),

  /**
   * GET /business/staff-performance/:staffId/goals
   * Returns all goals for the given staff member (manager view).
   * Optional status param filters by goal status (e.g. "in_progress").
   */
  getStaffGoals: (staffId, { status = "" } = {}) => {
    const parts = [];
    if (status) parts.push(`status=${encodeURIComponent(status)}`);
    const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
    return apiFetch(`/business/staff-performance/${staffId}/goals${qs}`);
  },

  /**
   * GET /business/staff-performance/:staffId/pips
   * Returns all PIPs for the given staff member (manager view).
   */
  getStaffPIPs: (staffId) =>
    apiFetch(`/business/staff-performance/${staffId}/pips`),

  /**
   * POST /business/staff-performance/:staffId/pips
   * Manager creates a new PIP for an employee.
   * Body: { start_date, review_date, reason, support_offered, targets[], milestones[] }
   */
  createPIP: (staffId, body) =>
    fetch(`${API_BASE}/business/staff-performance/${staffId}/pips`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw Object.assign(new Error(json.error?.message || "Failed"), { status: r.status });
      return json.data;
    }),

  /**
   * PUT /business/staff-performance/:staffId/pips/:pipId
   * Updates a PIP's status, outcome, review_date, or end_date.
   * Body: { status?, outcome?, review_date?, end_date?, hr_reviewed? }
   */
  updatePIP: (staffId, pipId, body) =>
    fetch(`${API_BASE}/business/staff-performance/${staffId}/pips/${pipId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw Object.assign(new Error(json.error?.message || "Failed"), { status: r.status });
      return json.data;
    }),
};
