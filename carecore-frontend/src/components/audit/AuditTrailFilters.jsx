import { Button } from "@/components/ui/button";

// Values match the backend's module_name keys from entityModuleMap.
const MODULE_OPTIONS = [
  { label: "All Modules",      value: "all" },
  { label: "Residents",        value: "residents" },
  { label: "Homes",            value: "homes" },
  { label: "HR",               value: "hr" },
  { label: "Finance",          value: "finance" },
  { label: "Maintenance",      value: "maintenance" },
  { label: "Staff",            value: "staff" },
  { label: "Compliance",       value: "compliance" },
  { label: "Approvals",        value: "approvals" },
  { label: "Admin Management", value: "admin_mgmt" },
];

// Values match what WriteEntityAudit and LogPermissionDenied write to the DB.
const ACTION_TYPE_OPTIONS = [
  { label: "All Actions",       value: "all" },
  { label: "Created",           value: "created" },
  { label: "Updated",           value: "updated" },
  { label: "Deleted",           value: "deleted" },
  { label: "Permission Denied", value: "permission_denied" },
];

// Values match the role_name column in the RoleDefinition table.
const ROLE_OPTIONS = [
  { label: "All Roles",        value: "all" },
  { label: "Admin",            value: "admin" },
  { label: "RSM",              value: "rsm" },
  { label: "Regional Manager", value: "regional_manager" },
  { label: "Team Manager",     value: "team_manager" },
  { label: "Team Leader",      value: "team_leader" },
  { label: "Support Worker",   value: "support_worker" },
];

const SEVERITY_OPTIONS = [
  { label: "All Severities", value: "all" },
  { label: "Low",            value: "low" },
  { label: "Medium",         value: "medium" },
  { label: "High",           value: "high" },
  { label: "Critical",       value: "critical" },
];

const DEFAULT_FILTERS = {
  module: "all",
  actionType: "all",
  userRole: "all",
  home: null,
  severity: "all",
  dateRange: { from: null, to: null },
  search: "",
};

const SELECT_CLASS =
  "h-9 px-3 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary w-full";

export default function AuditTrailFilters({ filters, setFilters }) {
  const activeCount = [
    filters.module !== "all",
    filters.actionType !== "all",
    filters.userRole !== "all",
    filters.severity !== "all",
  ].filter(Boolean).length;

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </h3>
        {activeCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs h-7 px-2"
          >
            Reset filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <select
          value={filters.module}
          onChange={(e) => setFilters({ ...filters, module: e.target.value })}
          className={SELECT_CLASS}
        >
          {MODULE_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={filters.actionType}
          onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
          className={SELECT_CLASS}
        >
          {ACTION_TYPE_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={filters.userRole}
          onChange={(e) => setFilters({ ...filters, userRole: e.target.value })}
          className={SELECT_CLASS}
        >
          {ROLE_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className={SELECT_CLASS}
        >
          {SEVERITY_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
