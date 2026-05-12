import {
  LayoutDashboard, Users, Home, FileText, ClipboardList,
  Calendar, Shield, Building2, Heart, GraduationCap,
  ArrowRightLeft, BarChart3, MessageSquare, PoundSterling,
  Settings, UserCheck, Stethoscope, CalendarDays, TrendingUp, UserCircle,
  ClipboardCheck
} from "lucide-react";

// Shield is also used for ComplianceHub nav item

export const ROLES = {
  ADMIN: "admin",
  ADMIN_OFFICER: "admin_officer",
  TEAM_LEADER: "team_leader",
  SUPPORT_WORKER: "support_worker",
  RESIDENT: "resident",
  EXTERNAL: "external",
  GUEST: "guest",
};

export const ROLE_LABELS = {
  admin: "Admin",
  admin_officer: "Admin Officer",
  team_leader: "Team Leader",
  support_worker: "Support Worker",
  resident: "Resident",
  external: "External",
  guest: "Guest (View Only)",
};

export const ROLE_DASHBOARD_ROUTES = {
  admin: "/dashboard",
  admin_officer: "/house",
  team_leader: "/tl-dashboard",
  support_worker: "/sw-dashboard",
  resident: "/resident-portal",
  external: "/external-portal",
  guest: "/dashboard",
};

const allNavItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["admin", "guest"] },
  { key: "tl-dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/tl-dashboard", roles: ["team_leader"] },
  { key: "sw-dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/sw-dashboard", roles: ["support_worker"] },
  { key: "staff", label: "Staff & HR", icon: UserCheck, path: "/staff", roles: ["admin", "team_leader", "guest"] },
  { key: "homes", label: "My Homes", icon: Home, path: "/homes-hub", roles: ["admin", "team_leader", "support_worker"] },
  { key: "outreach", label: "Outreach", icon: null, path: null, roles: ["admin", "team_leader", "support_worker"], isGroup: true, children: [
    { key: "young-people", label: "Young People", icon: Users, path: "/residents", roles: ["admin", "team_leader", "support_worker"] },
  ] },
  { key: "24-hours-hub", label: "24 Hours Housing", icon: Building2, path: "/24hours", roles: ["admin", "team_leader", "support_worker"], section: "24 HOURS HOUSING" },
  { key: "care-services-group", label: "Care Services", icon: null, path: null, roles: ["admin", "admin_officer", "team_leader", "support_worker", "guest"], isGroup: true, children: [
    { key: "care", label: "Care Module", icon: Stethoscope, path: "/care", roles: ["admin", "team_leader", "support_worker", "guest"] },
  ] },
  { key: "18-plus-group", label: "18+ Accommodation Services", icon: null, path: null, roles: ["admin", "admin_officer"], isGroup: true, children: [
    { key: "18-plus-dashboard", label: "18+ Accommodation", icon: Building2, path: "/18-plus", roles: ["admin", "admin_officer"] },
  ] },
  { key: "admin-management-group", label: "Admin Management", icon: null, path: null, roles: ["admin", "admin_officer", "guest"], isGroup: true, children: [
    { key: "admin-management", label: "Admin Management", icon: Building2, path: "/house", roles: ["admin", "admin_officer", "guest"] },
  ] },
  { key: "finance-group", label: "Finance", icon: null, path: null, roles: ["admin", "team_leader", "guest"], isGroup: true, children: [
    { key: "finance", label: "Finance", icon: PoundSterling, path: "/finance", roles: ["admin", "team_leader", "guest"] },
  ] },

  { key: "performance-group", label: "Performance", icon: null, path: null, roles: ["admin", "team_leader", "support_worker"], isGroup: true, children: [
    { key: "sw-performance", label: "SW Performance", icon: TrendingUp, path: "/sw-performance", roles: ["admin", "team_leader", "support_worker"] },
  ] },
  { key: "my-hr-group", label: "My HR", icon: null, path: null, roles: ["support_worker"], isGroup: true, children: [
    { key: "my-hr", label: "My HR", icon: UserCircle, path: "/my-hr", roles: ["support_worker"] },
  ] },
  { key: "approvals-group", label: "Approvals", icon: null, path: null, roles: ["admin", "admin_officer", "team_leader", "support_worker"], isGroup: true, children: [
    { key: "approvals", label: "Bill & Report Status", icon: ClipboardCheck, path: "/approvals", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
  ] },
  { key: "compliance-hub", label: "Compliance Hub", icon: Shield, path: "/compliance-hub", roles: ["admin", "admin_officer", "team_leader"] },
  { key: "misc", label: "Misc", icon: null, path: null, roles: ["admin", "admin_officer", "team_leader", "support_worker"], isGroup: true, children: [
    { key: "analytics", label: "Analytics & AI", icon: BarChart3, path: "/analytics", roles: ["admin", "team_leader"] },
    { key: "messages", label: "Messages", icon: MessageSquare, path: "/messages", roles: ["admin", "team_leader", "support_worker"] },
    { key: "settings", label: "Settings", icon: Settings, path: "/settings", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
  ] },
];

export function getNavItemsForRole(role) {
  return allNavItems.filter(item => item.roles.includes(role));
}

export const RISK_COLORS = {
  low: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500", dot: "bg-green-500" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500", dot: "bg-amber-500" },
  high: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500", dot: "bg-red-500" },
  critical: { bg: "bg-red-700/10", text: "text-red-700", border: "border-red-700", dot: "bg-red-700" },
};

export const ORG_ID = "default_org";