// @ts-nocheck
import {
  LayoutDashboard, Users, Home, FileText, ClipboardList,
  Calendar, Shield, Building2, Heart, GraduationCap,
  ArrowRightLeft, BarChart3, MessageSquare, PoundSterling,
  Settings, UserCheck, Stethoscope, CalendarDays, TrendingUp, UserCircle,
  ClipboardCheck, Wrench, MapPin, History, Activity, SlidersHorizontal
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MASTER ROLE ARCHITECTURE — CareCore AI
// ─────────────────────────────────────────────────────────────────────────────
//
//  CARE LINE:    support_worker → team_leader → team_manager → regional_manager → rsm
//  FINANCE LINE: finance_officer → finance_manager
//  ADMIN LINE:   admin_officer → admin_manager  (admin_manager also reports to
//                finance_manager for budget approvals)
//  HR LINE:      hr_officer → hr_manager
//  RISK LINE:    risk_officer → risk_manager
//  SUPER ADMIN:  admin  (full system access, RSM level)
//
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  // Super Admin
  ADMIN: "admin",

  // Care Line
  RSM: "rsm",
  REGIONAL_MANAGER: "regional_manager",
  TEAM_MANAGER: "team_manager",
  TEAM_LEADER: "team_leader",
  SUPPORT_WORKER: "support_worker",

  // Finance Line
  FINANCE_MANAGER: "finance_manager",
  FINANCE_OFFICER: "finance_officer",

  // Admin Line
  ADMIN_MANAGER: "admin_manager",
  ADMIN_OFFICER: "admin_officer",

  // HR Line
  HR_MANAGER: "hr_manager",
  HR_OFFICER: "hr_officer",

  // Risk Line
  RISK_MANAGER: "risk_manager",
  RISK_OFFICER: "risk_officer",

  // Compliance Line
  COMPLIANCE_MANAGER: "compliance_manager",

  // Non-staff portal roles
  RESIDENT: "resident",
  EXTERNAL: "external",
  GUEST: "guest",
};

// Numeric rank for every role — mirrors the values seeded in db.go SeedSystemRoleDefinitions.
// Used by the maker-checker system to determine who can approve a given submission.
export const ROLE_RANK = {
  admin: 99, rsm: 50, regional_manager: 40,
  team_manager: 30, hr_manager: 30, admin_manager: 30, finance_manager: 30, risk_manager: 30, compliance_manager: 30,
  team_leader: 20,
  finance_officer: 15, admin_officer: 15, hr_officer: 15, risk_officer: 15,
  support_worker: 10, maintenance_officer: 10,
};

/** Returns the numeric rank for a role string, or 0 if the role is unknown. */
export const rankOf = (role) => ROLE_RANK[role] ?? 0;

export const ROLE_LABELS = {
  // Super Admin
  admin: "Super Admin",

  // Care Line
  rsm: "Registered Service Manager",
  regional_manager: "Regional Manager",
  team_manager: "Team Manager",
  team_leader: "Team Leader",
  support_worker: "Support Worker",

  // Finance Line
  finance_manager: "Finance Manager",
  finance_officer: "Finance Officer",

  // Admin Line
  admin_manager: "Admin Manager",
  admin_officer: "Admin Officer",

  // HR Line
  hr_manager: "HR Manager",
  hr_officer: "HR Officer",

  // Risk Line
  risk_manager: "Risk Manager",
  risk_officer: "Risk Officer",

  // Compliance Line
  compliance_manager: "Compliance Manager",

  // Portals
  resident: "Resident",
  external: "External Professional",
  guest: "Guest (View Only)",
};

// Which professional line each role belongs to
export const ROLE_LINE = {
  admin: "super_admin",
  rsm: "care",
  regional_manager: "care",
  team_manager: "care",
  team_leader: "care",
  support_worker: "care",
  finance_manager: "finance",
  finance_officer: "finance",
  admin_manager: "admin",
  admin_officer: "admin",
  hr_manager: "hr",
  hr_officer: "hr",
  risk_manager: "risk",
  risk_officer: "risk",
  compliance_manager: "compliance",
  resident: "portal",
  external: "portal",
  guest: "portal",
};

// Roles that have elevated management-level permissions within their line
export const MANAGER_ROLES = new Set([
  "admin",
  "rsm",
  "regional_manager",
  "team_manager",
  "finance_manager",
  "admin_manager",
  "hr_manager",
  "risk_manager",
  "compliance_manager",
]);

// Roles that can approve leave / timesheets for support workers
export const LEAVE_APPROVER_ROLES = new Set([
  "admin",
  "rsm",
  "regional_manager",
  "team_manager",
  "team_leader",
  "hr_manager",
  "hr_officer",
]);

// Roles that can view or manage finance data
export const FINANCE_ACCESS_ROLES = new Set([
  "admin",
  "rsm",
  "regional_manager",
  "finance_manager",
  "finance_officer",
  "admin_manager",
]);

// Roles that can access HR records
export const HR_ACCESS_ROLES = new Set([
  "admin",
  "rsm",
  "regional_manager",
  "hr_manager",
  "hr_officer",
  "team_manager",
]);

// Roles that can access Risk records
export const RISK_ACCESS_ROLES = new Set([
  "admin",
  "rsm",
  "regional_manager",
  "risk_manager",
  "risk_officer",
  "team_manager",
  "team_leader",
]);

export const ROLE_DASHBOARD_ROUTES = {
  // Super Admin
  admin: "/dashboard",

  // Care Line
  rsm: "/dashboard",
  regional_manager: "/dashboard",
  team_manager: "/tl-dashboard",
  team_leader: "/tl-dashboard",
  support_worker: "/sw-dashboard",

  // Finance Line
  finance_manager: "/finance",
  finance_officer: "/finance",

  // Admin Line
  admin_manager: "/house",
  admin_officer: "/house",

  // HR Line
  hr_manager: "/staff",
  hr_officer: "/staff",

  // Risk Line
  risk_manager: "/dashboard",
  risk_officer: "/dashboard",

  // Compliance Line
  compliance_manager: "/compliance-hub",

  // Portals
  resident: "/resident-portal",
  external: "/external-portal",
  guest: "/dashboard",
};

// ─────────────────────────────────────────────────────────────────────────────
// Navigation — roles listed per item are the roles that CAN see that item
// ─────────────────────────────────────────────────────────────────────────────

// Helper sets for cleaner nav role arrays
const CARE_MANAGEMENT = ["admin", "rsm", "regional_manager", "team_manager", "team_leader"];
const CARE_ALL = [...CARE_MANAGEMENT, "support_worker"];
const FINANCE_ALL = ["admin", "rsm", "regional_manager", "finance_manager", "finance_officer", "admin_manager"];
const HR_ALL = ["admin", "rsm", "regional_manager", "hr_manager", "hr_officer", "team_manager"];
const RISK_ALL = ["admin", "rsm", "regional_manager", "risk_manager", "risk_officer", "team_manager", "team_leader"];
const ADMIN_ALL = ["admin", "rsm", "admin_manager", "admin_officer"];
const SENIOR_MANAGEMENT = ["admin", "rsm", "regional_manager", "team_manager", "finance_manager", "admin_manager", "hr_manager", "risk_manager", "compliance_manager"];

// Every staff role — used for items that should appear in all staff sidebars
// regardless of line (care, finance, HR, admin, risk). Excludes portal roles.
const ALL_STAFF = [
  "admin", "rsm", "regional_manager",
  "team_manager", "team_leader", "support_worker",
  "finance_manager", "finance_officer",
  "admin_manager", "admin_officer",
  "hr_manager", "hr_officer",
  "risk_manager", "risk_officer",
  "compliance_manager",
];

// MODULE_KEYS — the canonical set of module names that map to nav sections.
// These must stay in sync with the MODULES constant in RoleModuleMatrix.jsx.
export const MODULE_KEYS = {
  DASHBOARD:   "dashboard",
  RESIDENTS:   "residents",
  STAFF:       "staff",
  HOMES:       "homes",
  FINANCE:     "finance",
  COMPLIANCE:  "compliance",
  APPROVALS:   "approvals",
  MAINTENANCE: "maintenance",
  ADMIN_MGMT:  "admin_mgmt",
  SETTINGS:    "settings",
};

const allNavItems = [
  // ── Dashboards ──────────────────────────────────────────────────────────────
  { key: "dashboard",    label: "Dashboard", icon: LayoutDashboard, path: "/dashboard",    roles: ["admin", "rsm", "regional_manager", "risk_manager", "risk_officer", "guest"], module: MODULE_KEYS.DASHBOARD },
  { key: "tl-dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/tl-dashboard", roles: ["team_manager", "team_leader"], module: MODULE_KEYS.DASHBOARD },
  { key: "sw-dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/sw-dashboard", roles: ["support_worker"], module: MODULE_KEYS.DASHBOARD },
  // New Manager Dashboard (live oversight of homes, young people, staff, checks, approvals
  // and compliance) — additive alongside the existing Team Leader/Team Manager dashboard
  // and Regional Manager's Admin Dashboard, so default landing routes are unchanged.
  { key: "manager-dashboard", label: "Manager Dashboard", icon: BarChart3, path: "/manager-dashboard", roles: ["rsm", "team_leader", "team_manager", "regional_manager"], module: MODULE_KEYS.DASHBOARD },

  // ── Staff & HR ───────────────────────────────────────────────────────────────
  { key: "staff", label: "Staff & HR", icon: UserCheck, path: "/staff", roles: [...HR_ALL, "team_leader", "guest"], module: MODULE_KEYS.STAFF },

  // ── Homes ───────────────────────────────────────────────────────────────────
  { key: "homes", label: "My Homes", icon: Home, path: "/homes-hub", roles: CARE_ALL, module: MODULE_KEYS.HOMES },
  { key: "handover", label: "Shift Handover", icon: ArrowRightLeft, path: "/handover", roles: CARE_ALL, module: MODULE_KEYS.HOMES },
  { key: "audit-trail", label: "Audit Trail", icon: History, path: "/audit-trail", roles: ALL_STAFF },

  // ── Resident Services ───────────────────────────────────────────────────────
  { key: "residents-group", label: "Resident Services", icon: null, path: null,
    roles: [...CARE_MANAGEMENT, "support_worker", "admin_officer", "risk_officer", "risk_manager"],
    module: MODULE_KEYS.RESIDENTS,
    isGroup: true,
    children: [
      { key: "residents", label: "Residents", icon: Users, path: "/residents",
        roles: [...CARE_MANAGEMENT, "support_worker", "risk_officer", "risk_manager"] },
    ]
  },

  // ── Maintenance ─────────────────────────────────────────────────────────────
  { key: "care-services-group", label: "Maintenance", icon: null, path: null,
    roles: [...CARE_ALL, "admin_officer", "guest"],
    module: MODULE_KEYS.MAINTENANCE,
    isGroup: true,
    children: [
      { key: "care", label: "Maintenance", icon: Wrench, path: "/care",
        roles: [...CARE_ALL, "guest"] },
    ]
  },

  // ── Admin Management ────────────────────────────────────────────────────────
  { key: "admin-management-group", label: "Admin Management", icon: null, path: null,
    roles: [...ADMIN_ALL, "guest"],
    module: MODULE_KEYS.ADMIN_MGMT,
    isGroup: true,
    children: [
      { key: "admin-management", label: "Admin Management", icon: Building2, path: "/house",
        roles: [...ADMIN_ALL, "guest"] },
    ]
  },

  // ── Finance ─────────────────────────────────────────────────────────────────
  { key: "finance-group", label: "Finance", icon: null, path: null,
    roles: FINANCE_ALL,
    module: MODULE_KEYS.FINANCE,
    isGroup: true,
    children: [
      { key: "finance", label: "Finance", icon: PoundSterling, path: "/finance",
        roles: FINANCE_ALL },
    ]
  },

  // ── Performance ─────────────────────────────────────────────────────────────
  { key: "performance-group", label: "Performance", icon: null, path: null,
    roles: [...CARE_MANAGEMENT, "support_worker", "hr_manager", "hr_officer"],
    module: MODULE_KEYS.STAFF,
    isGroup: true,
    children: [
      { key: "my-performance", label: "My Performance", icon: TrendingUp, path: "/sw-performance",
        roles: ["support_worker", "team_leader"] },
      { key: "performance", label: "Employee Performance", icon: TrendingUp, path: "/performance",
        roles: [...CARE_MANAGEMENT, "hr_manager", "hr_officer"] },
    ]
  },

  // ── My HR (self-service — front-line staff only) ─────────────────────────────
  { key: "my-hr-group", label: "My HR", icon: null, path: null,
    roles: ["support_worker", "admin_officer", "finance_officer", "hr_officer", "risk_officer"],
    module: MODULE_KEYS.STAFF,
    isGroup: true,
    children: [
      { key: "my-hr", label: "My HR", icon: UserCircle, path: "/my-hr",
        roles: ["support_worker", "admin_officer", "finance_officer", "hr_officer", "risk_officer"] },
    ]
  },

  // ── Approvals ───────────────────────────────────────────────────────────────
  { key: "approvals-group", label: "Approvals", icon: null, path: null,
    roles: [...CARE_ALL, ...ADMIN_ALL, "finance_manager", "finance_officer", "hr_manager", "hr_officer", "risk_manager", "risk_officer", "compliance_manager"],
    module: MODULE_KEYS.APPROVALS,
    isGroup: true,
    children: [
      { key: "workflow-command-centre", label: "Workflow Command Centre", icon: ClipboardCheck, path: "/workflow-command-centre",
        roles: [...CARE_ALL, ...ADMIN_ALL, "finance_manager", "finance_officer", "hr_manager", "hr_officer", "risk_manager", "risk_officer", "compliance_manager"] },
    ]
  },

  // ── Compliance & Governance ─────────────────────────────────────────────────
  { key: "compliance-group", label: "Compliance & Governance", icon: null, path: null,
    roles: [...CARE_MANAGEMENT, "admin_officer", "admin_manager", "risk_manager", "risk_officer", "compliance_manager"],
    module: MODULE_KEYS.COMPLIANCE,
    isGroup: true,
    children: [
      { key: "compliance-hub", label: "Compliance & Quality", icon: Shield, path: "/compliance-hub",
        roles: [...CARE_MANAGEMENT, "admin_officer", "admin_manager", "risk_manager", "risk_officer", "compliance_manager"] },
//      { key: "outcome-impact", label: "Outcome & Impact", icon: Activity, path: "/outcome-impact",
//        roles: [...CARE_MANAGEMENT, "risk_manager", "risk_officer", "compliance_manager"] },
    ]
  },

  // ── Misc ─────────────────────────────────────────────────────────────────────
  // No module tag at group level — each child carries its own restriction.
  { key: "misc", label: "Misc", icon: null, path: null,
    roles: [...SENIOR_MANAGEMENT, "team_leader", "support_worker", "admin_officer", "finance_officer", "hr_officer", "risk_officer"],
    isGroup: true,
    children: [
//      { key: "analytics",    label: "Analytics & AI", icon: BarChart3,         path: "/analytics",    roles: SENIOR_MANAGEMENT,                                                                                                                                           module: MODULE_KEYS.DASHBOARD },
      { key: "messages",     label: "Notifications",   icon: MessageSquare,     path: "/messages",     roles: [...CARE_ALL, "admin_officer", "admin_manager", "hr_officer", "hr_manager"] },
      { key: "settings",     label: "Settings",        icon: Settings,          path: "/settings",     roles: [...CARE_ALL, "admin_officer", "admin_manager", "finance_officer", "finance_manager", "hr_officer", "hr_manager", "risk_officer", "risk_manager", "compliance_manager"],          module: MODULE_KEYS.SETTINGS },
      { key: "tenant-admin", label: "Tenant Admin",    icon: SlidersHorizontal, path: "/tenant-admin", roles: ["admin", "rsm", "regional_manager", "admin_manager", "hr_manager"] },
    ]
  },
];

// Emails restricted to only admin dashboard + finance
export const FINANCE_ONLY_EMAILS = [
  "carine@brightskyyouthservices.co.uk",
  "pishtewan@brightskyyouthservices.co.uk",
];

const FINANCE_ONLY_KEYS = new Set(["dashboard", "finance-group", "settings"]);

export function getNavItemsForRole(role, email) {
  const filtered = allNavItems.filter(item => item.roles.includes(role));
  if (email && FINANCE_ONLY_EMAILS.includes(email.toLowerCase())) {
    return filtered.filter(item => FINANCE_ONLY_KEYS.has(item.key));
  }
  return filtered;
}

// getNavItemsForRoleAndPermissions applies a second layer of filtering on top of
// getNavItemsForRole using the enabled_modules list stored in RolePermission records.
// If no permissions are configured for the role (null/empty), the role defaults apply.
// The 'admin' role always bypasses module filtering.
//
// enabledModules accepts:
//   - string[]        — legacy format or pre-extracted keys from PermissionContext
//   - {key,level}[]   — current storage format read directly from DB
//   - null            — no restriction (no record configured)
export function getNavItemsForRoleAndPermissions(role, email, enabledModules) {
  const items = getNavItemsForRole(role, email);

  // null = no RolePermission record (no restriction) → return all role-based items.
  // An array (even empty) = record exists → filter by it.
  // An empty array means all modules are "None" → all module-gated items should be hidden.
  if (role === "admin" || enabledModules === null || enabledModules === undefined) {
    return items;
  }
  if (!Array.isArray(enabledModules)) {
    return items;
  }

  // Normalise to a Set of string keys regardless of input format.
  const moduleSet = new Set(
    enabledModules.map(m => (typeof m === "string" ? m : m?.key)).filter(Boolean)
  );

  return items
    .map(item => {
      if (item.isGroup) {
        // Group has a module tag — hide the whole section if module is disabled
        if (item.module && !moduleSet.has(item.module)) return null;

        // Group has no module tag (e.g. misc) — filter children individually
        if (item.children) {
          const filteredChildren = item.children.filter(
            child => !child.module || moduleSet.has(child.module)
          );
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        return item;
      }

      // Non-group items
      if (item.module && !moduleSet.has(item.module)) return null;
      return item;
    })
    .filter(Boolean);
}

export const RISK_COLORS = {
  low:      { bg: "bg-green-500/10",  text: "text-green-500",  border: "border-green-500",  dot: "bg-green-500"  },
  medium:   { bg: "bg-amber-500/10",  text: "text-amber-500",  border: "border-amber-500",  dot: "bg-amber-500"  },
  high:     { bg: "bg-red-500/10",    text: "text-red-500",    border: "border-red-500",    dot: "bg-red-500"    },
  critical: { bg: "bg-red-700/10",    text: "text-red-700",    border: "border-red-700",    dot: "bg-red-700"    },
};

export const ORG_ID = "default_org";

// Staff department/service-type classification — used by the Employee Performance
// filter bar and the staff profile's Employment tab (StaffProfile.department).
export const DEPARTMENTS = [
  { value: "outreach",     label: "Outreach" },
  { value: "24_hours",     label: "24 Hours" },
  { value: "18_plus",      label: "18+ Accommodation" },
  { value: "finance",      label: "Finance" },
  { value: "hr_admin",     label: "HR & Admin" },
  { value: "maintenance",  label: "Maintenance" },
  { value: "bank_staff",   label: "Bank Staff" },
];