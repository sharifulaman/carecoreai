// @ts-nocheck
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { DEPARTMENTS as DEPARTMENT_OPTIONS } from "@/lib/roleConfig";

const ROLES = [
  { value: "all", label: "All Roles" },
  { value: "support_worker", label: "Support Worker" },
  { value: "team_leader", label: "Team Leader" },
  { value: "team_manager", label: "Team Manager" },
  { value: "regional_manager", label: "Regional Manager" },
  { value: "admin_officer", label: "Admin Officer" },
  { value: "admin_manager", label: "Admin Manager" },
  { value: "hr_officer", label: "HR Officer" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "maintenance_officer", label: "Maintenance Officer" },
  { value: "maintenance_manager", label: "Maintenance Manager" },
];

const DEPARTMENTS = [
  { value: "all", label: "All Departments" },
  ...DEPARTMENT_OPTIONS,
];

const PERIODS = [
  { value: "current_month", label: "Current Month" },
  { value: "last_month", label: "Last Month" },
  { value: "current_quarter", label: "Current Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "year_to_date", label: "Year to Date" },
];

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "needs_review", label: "Needs Review" },
  { value: "at_risk", label: "At Risk" },
];

export default function EmployeeFilterBar({
  roleFilter,
  setRoleFilter,
  departmentFilter,
  setDepartmentFilter,
  homeFilter,
  setHomeFilter,
  homes,
  periodFilter,
  setPeriodFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
}) {
  const now = new Date();
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const lastOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const curQ = Math.floor(now.getMonth() / 3);
  const prevQ = curQ === 0 ? 3 : curQ - 1;
  const prevQYear = curQ === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const periodLabel = {
    current_month: `${fmt(firstOfMonth(now))} – ${fmt(now)}`,
    last_month: `${fmt(firstOfMonth(new Date(now.getFullYear(), now.getMonth() - 1)))} – ${fmt(lastOfMonth(new Date(now.getFullYear(), now.getMonth() - 1)))}`,
    current_quarter: `${fmt(new Date(now.getFullYear(), curQ * 3, 1))} – ${fmt(now)}`,
    last_quarter: `${fmt(new Date(prevQYear, prevQ * 3, 1))} – ${fmt(new Date(prevQYear, prevQ * 3 + 3, 0))}`,
    year_to_date: `${fmt(new Date(now.getFullYear(), 0, 1))} – ${fmt(now)}`,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2">
      {/* Role */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Role</label>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Department */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Department</label>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Home / Service */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Home / Service</label>
        <Select value={homeFilter} onValueChange={setHomeFilter}>
          <SelectTrigger className="h-8 text-xs bg-card border-border">
            <SelectValue placeholder="All Homes / Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes / Services</SelectItem>
            {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Period — with calendar icon */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Period</label>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="h-8 text-xs bg-card border-border">
            <span className="flex items-center gap-1.5">
              <span>📅</span>
              <span className="truncate">{periodLabel[periodFilter] || "Select period"}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Performance Status */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Performance Status</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Search employee */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Search employee</label>
        <div className="relative">
          <Input
            placeholder="Search by name or ID"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 text-xs pr-7 bg-card border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}