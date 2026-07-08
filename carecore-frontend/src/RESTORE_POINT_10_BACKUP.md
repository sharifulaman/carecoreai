# RESTORE POINT 10
**Created:** 2026-04-29
**State:** After technical audit + HRDashboardTab stat cards made clickable (onNavigate wired)

---

## KEY CHANGES IN THIS STATE
- HRDashboardTab stat cards now navigate to correct tabs via `onNavigate` prop
- `pages/Staff.jsx` passes `onNavigate={setActiveTab}` to `HRDashboardTab`
- Full technical audit generated (no code changes from audit)

---

## FILE: pages/Staff.jsx (full content)

```jsx
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, UserCheck, UserX, RotateCcw, GitBranch, Calendar,
  LayoutDashboard, Clock, CreditCard, Plane, AlertCircle, ChevronRight
} from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

// Existing components
import StaffForm from "../components/staff/StaffForm";
import PhotoUpload from "../components/staff/PhotoUpload";
import HierarchyView from "../components/staff/HierarchyView";
import AvailabilityPanel from "../components/staff/availability/AvailabilityPanel";
import AvailabilityOverviewTab from "../components/staff/availability/AvailabilityOverviewTab";

// New HR tabs
import HRDashboardTab from "../components/staff/tabs/HRDashboardTab.jsx";
import StaffProfileModal from "../components/staff/tabs/StaffProfileModal.jsx";
import TimesheetsTab from "../components/staff/tabs/TimesheetsTab.jsx";
import LeaveManagementTab from "../components/staff/tabs/LeaveManagementTab.jsx";
import SupervisionTab from "../components/staff/tabs/SupervisionTab.jsx";
import DisciplinaryTab from "../components/staff/tabs/DisciplinaryTab.jsx";
import StaffRotaTab from "../components/staff/tabs/StaffRotaTab.jsx";

const roleColors = {
  admin: "bg-red-500/10 text-red-600",
  admin_officer: "bg-orange-500/10 text-orange-600",
  team_leader: "bg-purple-500/10 text-purple-500",
  support_worker: "bg-blue-500/10 text-blue-500",
};
const roleLabels = {
  admin: "Admin", admin_officer: "Admin Officer",
  team_leader: "Team Leader", support_worker: "Support Worker",
};

const ALL_TABS = [
  { key: "hr-dashboard", label: "HR Dashboard", icon: LayoutDashboard, roles: ["admin", "admin_officer", "team_leader"] },
  { key: "active", label: "Active Staff", icon: UserCheck, roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
  { key: "hierarchy", label: "Hierarchy", icon: GitBranch, roles: ["admin", "team_leader"] },
  { key: "inactive", label: "Inactive", icon: UserX, roles: ["admin", "admin_officer"] },
  { key: "rota", label: "Rota & Shifts", icon: Calendar, roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
  { key: "timesheets", label: "Timesheets", icon: CreditCard, roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
  { key: "leave", label: "Leave", icon: Plane, roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
  { key: "supervision", label: "Supervision", icon: Clock, roles: ["admin", "admin_officer", "team_leader"] },
  { key: "disciplinary", label: "Disciplinary", icon: AlertCircle, roles: ["admin", "admin_officer"] },
  { key: "availability", label: "Availability", icon: Calendar, roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
];

export default function Staff() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [availPanel, setAvailPanel] = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [activeTab, setActiveTab] = useState("hr-dashboard");

  const isAdmin = user?.role === "admin";
  const isAdminOfficer = user?.role === "admin_officer";
  const isTL = user?.role === "team_leader";
  const isSW = user?.role === "support_worker";

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => secureGateway.create("StaffProfile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowForm(false);
      toast.success("Staff member added");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => secureGateway.update("StaffProfile", id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff status updated");
    },
  });

  const activeStaff = staff.filter(s => s.status === "active");
  const inactiveStaff = staff.filter(s => s.status !== "active");

  const applyFilters = (list) => list.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || s.role === filterRole;
    return matchSearch && matchRole;
  });

  // Role-filtered tabs
  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(user?.role || "support_worker"));

  // Default tab for SW is their own profile / active
  const defaultTab = isSW ? "active" : "hr-dashboard";
  const currentTab = activeTab || defaultTab;

  const StaffCard = ({ member, inactive = false }) => {
    const dbsDays = member.dbs_expiry
      ? differenceInDays(parseISO(member.dbs_expiry), new Date())
      : null;
    const dbsAlert = dbsDays !== null && dbsDays <= 90;

    return (
      <div
        className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all cursor-pointer group"
        onClick={() => setProfileModal(member)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg overflow-hidden">
              {member.photo_url
                ? <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                : (member.full_name?.charAt(0) || "?")}
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">{member.full_name}</h3>
              <p className="text-xs text-muted-foreground">{member.email || "No email"}</p>
              {member.employee_id && <p className="text-[10px] font-mono text-primary/70 mt-0.5">{member.employee_id}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={cn("text-xs capitalize", roleColors[member.role] || "bg-muted text-muted-foreground")}>
              {roleLabels[member.role] || member.role}
            </Badge>
            {dbsAlert && <Badge className="bg-amber-100 text-amber-700 text-[10px]">DBS Expiring</Badge>}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 mb-3">
          {member.phone && <p><span className="font-medium text-foreground">Phone:</span> {member.phone}</p>}
          {member.start_date && <p><span className="font-medium text-foreground">Start Date:</span> {member.start_date}</p>}
          {member.dbs_expiry && (
            <p>
              <span className="font-medium text-foreground">DBS Expiry:</span>{" "}
              <span className={dbsAlert ? "text-amber-500 font-medium" : ""}>{member.dbs_expiry}</span>
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            <ChevronRight className="w-3 h-3" /> View Profile
          </span>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setAvailPanel({ member, defaultTab: "profile" })}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Calendar className="w-3 h-3" /> Availability
            </button>
            {isAdmin && !inactive && (
              <button
                onClick={() => statusMutation.mutate({ id: member.id, status: "inactive" })}
                className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors"
              >
                <UserX className="w-3 h-3" /> Deactivate
              </button>
            )}
            {isAdmin && inactive && (
              <button
                onClick={() => statusMutation.mutate({ id: member.id, status: "active" })}
                className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Reactivate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {availPanel && (
        <AvailabilityPanel
          staffMember={availPanel.member}
          user={user}
          defaultTab={availPanel.defaultTab}
          onClose={() => setAvailPanel(null)}
        />
      )}
      {showForm && (
        <StaffForm
          homes={homes}
          teamLeaders={staff.filter(s => s.role === "team_leader" && s.status === "active")}
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          saving={createMutation.isPending}
        />
      )}
      {profileModal && (
        <StaffProfileModal
          member={profileModal}
          user={user}
          homes={homes}
          allStaff={staff}
          onClose={() => setProfileModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff & HR</h1>
          <p className="text-muted-foreground text-sm mt-1">{activeStaff.length} active · {inactiveStaff.length} inactive</p>
        </div>
        {(isAdmin || isAdminOfficer) && (
          <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        )}
      </div>

      {/* Search/filter — only for staff list tabs */}
      {["active", "inactive"].includes(currentTab) && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="admin_officer">Admin Officer</SelectItem>
              <SelectItem value="team_leader">Team Leaders</SelectItem>
              <SelectItem value="support_worker">Support Workers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-border overflow-x-auto -mx-0">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {tab.label}
              {tab.key === "active" && <span className="text-muted-foreground">({applyFilters(activeStaff).length})</span>}
              {tab.key === "inactive" && <span className="text-muted-foreground">({applyFilters(inactiveStaff).length})</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-0">
        {currentTab === "hr-dashboard" && <HRDashboardTab user={user} onNavigate={setActiveTab} />}

        {currentTab === "active" && (
          isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : applyFilters(activeStaff).length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No active staff found.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {applyFilters(activeStaff).map(s => <StaffCard key={s.id} member={s} />)}
            </div>
          )
        )}

        {currentTab === "hierarchy" && <HierarchyView staff={staff} homes={homes} />}

        {currentTab === "inactive" && (
          applyFilters(inactiveStaff).length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <UserX className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No inactive staff.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {applyFilters(inactiveStaff).map(s => <StaffCard key={s.id} member={s} inactive />)}
            </div>
          )
        )}

        {currentTab === "rota" && <StaffRotaTab user={user} staff={staff} homes={homes} />}

        {currentTab === "timesheets" && <TimesheetsTab user={user} staff={staff} homes={homes} />}

        {currentTab === "leave" && <LeaveManagementTab user={user} staff={staff} homes={homes} />}

        {currentTab === "supervision" && <SupervisionTab user={user} staff={staff} homes={homes} />}

        {currentTab === "disciplinary" && <DisciplinaryTab user={user} staff={staff} homes={homes} />}

        {currentTab === "availability" && (
          <AvailabilityOverviewTab
            user={user}
            onOpenPanel={(member, tab) => setAvailPanel({ member, defaultTab: tab || "profile" })}
          />
        )}
      </div>
    </div>
  );
}
```

---

## FILE: components/staff/tabs/HRDashboardTab.jsx (full content)

```jsx
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Users, AlertTriangle, Clock, Calendar, TrendingUp, PoundSterling, ClipboardCheck } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns";

const ROLE_COLORS = {
  admin: "#ef4444", admin_officer: "#f97316", team_leader: "#8b5cf6", support_worker: "#3b82f6",
};

function StatCard({ icon: Icon, label, value, sub, color = "text-primary", alert, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-xl border p-4 transition-all ${alert ? "border-red-300 bg-red-50/30" : "border-border"} ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/40" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${alert ? "bg-red-500/10" : "bg-primary/10"}`}>
          <Icon className={`w-4 h-4 ${alert ? "text-red-500" : "text-primary"}`} />
        </div>
      </div>
    </div>
  );
}

export default function HRDashboardTab({ user, onNavigate }) {
  const today = new Date();

  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => secureGateway.filter("StaffProfile"), staleTime: 5 * 60 * 1000 });
  const { data: leaveRequests = [] } = useQuery({ queryKey: ["leave-requests"], queryFn: () => secureGateway.filter("LeaveRequest"), staleTime: 5 * 60 * 1000 });
  const { data: supervisions = [] } = useQuery({ queryKey: ["supervision-records"], queryFn: () => secureGateway.filter("SupervisionRecord"), staleTime: 5 * 60 * 1000 });
  const { data: appraisals = [] } = useQuery({ queryKey: ["appraisal-records"], queryFn: () => secureGateway.filter("AppraisalRecord"), staleTime: 5 * 60 * 1000 });
  const { data: expenses = [] } = useQuery({ queryKey: ["home-expenses"], queryFn: () => secureGateway.filter("HomeExpense"), staleTime: 5 * 60 * 1000 });

  const activeStaff = staff.filter(s => s.status === "active");

  const dbsExpiring = activeStaff.filter(s => {
    if (!s.dbs_expiry) return false;
    const diff = differenceInDays(parseISO(s.dbs_expiry), today);
    return diff >= 0 && diff <= 90;
  });

  const overdueSupervisions = activeStaff.filter(s => {
    const last = supervisions.filter(r => r.supervisee_id === s.id).sort((a, b) => b.session_date?.localeCompare(a.session_date))[0];
    if (!last) return true;
    return differenceInDays(today, parseISO(last.session_date)) > 56;
  }).length;

  const overdueAppraisals = activeStaff.filter(s => {
    const last = appraisals.filter(r => r.appraisee_id === s.id).sort((a, b) => b.appraisal_date?.localeCompare(a.appraisal_date))[0];
    if (!last) return true;
    return differenceInDays(today, parseISO(last.appraisal_date)) > 365;
  }).length;

  const pendingLeave = leaveRequests.filter(r => r.status === "pending").length;

  const currentMonthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(today), "yyyy-MM-dd");
  const monthlyWageCost = expenses
    .filter(e => e.expense_type === "staff_expense" && e.date >= currentMonthStart && e.date <= currentMonthEnd && e.status === "approved")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const roleBreakdown = Object.entries(
    activeStaff.reduce((acc, s) => { acc[s.role] = (acc[s.role] || 0) + 1; return acc; }, {})
  ).map(([role, count]) => ({ role: role.replace("_", " "), count, color: ROLE_COLORS[role] || "#94a3b8" }));

  const headcountTrend = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(today, 5 - i);
    const monthEnd = endOfMonth(m);
    const label = format(m, "MMM");
    const count = staff.filter(s => {
      const start = s.start_date ? parseISO(s.start_date) : null;
      const end = s.end_date ? parseISO(s.end_date) : null;
      if (!start || start > monthEnd) return false;
      if (end && end < startOfMonth(m)) return false;
      return true;
    }).length;
    return { label, count };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Staff" value={activeStaff.length} sub={`${staff.length} total`} onClick={() => onNavigate?.("active")} />
        <StatCard icon={AlertTriangle} label="DBS Expiring (90d)" value={dbsExpiring.length} color={dbsExpiring.length > 0 ? "text-amber-500" : "text-foreground"} alert={dbsExpiring.length > 0} onClick={() => onNavigate?.("active")} />
        <StatCard icon={Clock} label="Overdue Supervisions" value={overdueSupervisions} color={overdueSupervisions > 0 ? "text-red-500" : "text-foreground"} alert={overdueSupervisions > 0} onClick={() => onNavigate?.("supervision")} />
        <StatCard icon={Calendar} label="Overdue Appraisals" value={overdueAppraisals} color={overdueAppraisals > 0 ? "text-red-500" : "text-foreground"} alert={overdueAppraisals > 0} onClick={() => onNavigate?.("supervision")} />
        <StatCard icon={ClipboardCheck} label="Pending Leave Requests" value={pendingLeave} color={pendingLeave > 0 ? "text-amber-500" : "text-foreground"} onClick={() => onNavigate?.("leave")} />
        <StatCard icon={PoundSterling} label="Monthly Wage Cost" value={`£${monthlyWageCost.toLocaleString()}`} sub="current month approved" onClick={() => onNavigate?.("timesheets")} />
        <StatCard icon={TrendingUp} label="Total Staff" value={staff.length} sub={`${staff.filter(s => s.status !== "active").length} inactive`} onClick={() => onNavigate?.("active")} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Staff by Role</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={roleBreakdown} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={65} label={({ role, count }) => `${role}: ${count}`} labelLine={false}>
                {roleBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 col-span-2">
          <h3 className="text-sm font-semibold mb-3">Headcount Trend (6 months)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={headcountTrend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {dbsExpiring.length > 0 && (
        <div className="bg-card rounded-xl border border-amber-200 p-4">
          <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> DBS Expiring in Next 90 Days
          </h3>
          <div className="space-y-2">
            {dbsExpiring.map(s => {
              const days = differenceInDays(parseISO(s.dbs_expiry), today);
              return (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.full_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{s.dbs_expiry}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${days <= 30 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                      {days} days
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## HOW TO RESTORE

To revert to this restore point, copy the code blocks above back into their respective files:
1. `pages/Staff.jsx` — full content above
2. `components/staff/tabs/HRDashboardTab.jsx` — full content above

No entity schema changes were made at this restore point.