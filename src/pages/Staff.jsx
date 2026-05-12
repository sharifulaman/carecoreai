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
  LayoutDashboard, Clock, CreditCard, Plane, AlertCircle, ChevronRight, BookOpen,
  Heart, LogOut, Users, Shield, Settings
} from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import { logAudit } from "@/lib/logAudit";
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
import StaffRotaTab from "../components/staff/tabs/StaffRotaTab";
import TrainingCoursesTab from "../components/staff/training/TrainingCoursesTab.jsx";
import HRPolicyTab from "../components/staff/tabs/HRPolicyTab.jsx";
import OnboardingTab from "../components/staff/onboarding/OnboardingTab.jsx";
import HRReportingTab from "../components/staff/tabs/HRReportingTab.jsx";
import WellbeingTab from "../components/staff/wellbeing/WellbeingTab.jsx";
import TOILTab from "../components/staff/toil/TOILTab.jsx";
import HRAIAssistant from "../components/staff/ai/HRAIAssistant.jsx";
import OffboardingModal from "../components/staff/offboarding/OffboardingModal.jsx";
import ExpensesTab from "../components/staff/tabs/ExpensesTab.jsx";
import PolicyHubMain from "../components/staff/policy/PolicyHubMain.jsx";

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

const PARENT_TABS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "admin_officer", "team_leader", "guest"],
    defaultSub: "hr-dashboard",
    subTabs: [
      { key: "hr-dashboard", label: "HR Dashboard", roles: ["admin", "admin_officer", "team_leader", "guest"] },
      { key: "hr-reporting", label: "HR Reports", roles: ["admin", "admin_officer"] },
    ],
  },
  {
    key: "people",
    label: "People",
    icon: Users,
    roles: ["admin", "admin_officer", "team_leader", "support_worker"],
    defaultSub: "active",
    subTabs: [
      { key: "active", label: "Active Staff", roles: ["admin", "admin_officer", "team_leader", "support_worker"], isBadged: true },
      { key: "inactive", label: "Inactive", roles: ["admin", "admin_officer"], isBadged: true },
      { key: "hierarchy", label: "Hierarchy", roles: ["admin", "team_leader"] },
      { key: "onboarding", label: "Onboarding", roles: ["admin", "admin_officer", "team_leader"] },
    ],
  },
  {
    key: "time-attendance",
    label: "Time & Attendance",
    icon: Calendar,
    roles: ["admin", "admin_officer", "team_leader", "support_worker"],
    defaultSub: "rota",
    subTabs: [
      { key: "rota", label: "Rota & Shifts", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
      { key: "availability", label: "Availability", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
      { key: "leave", label: "Leave", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
      { key: "toil", label: "TOIL", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    icon: CreditCard,
    roles: ["admin", "admin_officer", "team_leader", "support_worker"],
    defaultSub: "timesheets",
    subTabs: [
      { key: "timesheets", label: "Salary Management", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
      { key: "expenses", label: "Expenses", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
    ],
  },
  {
    key: "compliance",
    label: "Compliance",
    icon: Shield,
    roles: ["admin", "admin_officer", "team_leader", "support_worker"],
    defaultSub: "training-courses",
    subTabs: [
      { key: "training-courses", label: "Training Courses", roles: ["admin", "admin_officer"] },
      { key: "supervision", label: "Supervision", roles: ["admin", "admin_officer", "team_leader"] },
      { key: "disciplinary", label: "Disciplinary", roles: ["admin", "admin_officer"] },
      { key: "wellbeing", label: "Wellbeing", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
    ],
  },
  {
    key: "policy-hub",
    label: "Policy Hub",
    icon: BookOpen,
    roles: ["admin", "admin_officer", "team_leader", "support_worker"],
    defaultSub: "policy-hub-main",
    subTabs: [
      { key: "policy-hub-main", label: "Policy Hub", roles: ["admin", "admin_officer", "team_leader", "support_worker"] },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin"],
    defaultSub: "hr-policy",
    subTabs: [
      { key: "hr-policy", label: "HR Policy", roles: ["admin"] },
    ],
  },
];

export default function Staff() {
  const { user, staffProfile } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [availPanel, setAvailPanel] = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [offboardingModal, setOffboardingModal] = useState(null);
  
  // Two-level tab state
  const [activeParent, setActiveParent] = useState("dashboard");
  const [activeSubTab, setActiveSubTab] = useState("hr-dashboard");

  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isAdmin = staffRole === "admin";
  const isAdminOfficer = staffRole === "admin_officer";
  const isTL = staffRole === "team_leader";
  const isSW = staffRole === "support_worker";

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
    mutationFn: async (data) => {
      const created = await secureGateway.create("StaffProfile", data);
      await logAudit({
        entity_name: "StaffProfile", entity_id: created?.id, action: "create",
        changed_by: staffProfile?.id, changed_by_name: staffProfile?.full_name || user?.full_name || "",
        old_values: null,
        new_values: { full_name: data.full_name, role: data.role, email: data.email, home_ids: data.home_ids },
        org_id: ORG_ID,
        description: `New staff member created: ${data.full_name} (${data.role})`,
      });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowForm(false);
      toast.success("Staff member added");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const member = staff.find(s => s.id === id);
      await secureGateway.update("StaffProfile", id, { status });
      await logAudit({
        entity_name: "StaffProfile", entity_id: id, action: "status_change",
        changed_by: staffProfile?.id, changed_by_name: staffProfile?.full_name || user?.full_name || "",
        old_values: { status: member?.status },
        new_values: { status, changed_by: staffProfile?.full_name },
        org_id: ORG_ID,
        description: `Staff status changed: ${member?.full_name} → ${status}`,
      });
    },
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

  // Role-filtered parent tabs
  const visibleParents = PARENT_TABS.filter(p => 
    p.subTabs.some(sub => sub.roles.includes(staffRole))
  );

  // Get visible sub-tabs for current parent
  const currentParent = PARENT_TABS.find(p => p.key === activeParent);
  const visibleSubTabs = currentParent 
    ? currentParent.subTabs.filter(sub => sub.roles.includes(staffRole))
    : [];

  // Fallback: if current parent not visible or no subs available, reset to first available
  if (!visibleParents.find(p => p.key === activeParent)) {
    const defaultParent = isSW ? "people" : "dashboard";
    if (activeParent !== defaultParent) {
      // This will be handled by the component render
    }
  }

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
              <>
                <button
                  onClick={() => statusMutation.mutate({ id: member.id, status: "inactive" })}
                  className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <UserX className="w-3 h-3" /> Deactivate
                </button>
                <button
                  onClick={() => setOffboardingModal(member)}
                  className="text-xs text-muted-foreground hover:text-orange-500 flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3 h-3" /> Offboard
                </button>
              </>
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
      {offboardingModal && (
        <OffboardingModal
          member={offboardingModal}
          org={null}
          onClose={() => setOffboardingModal(null)}
          onComplete={() => { setOffboardingModal(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Staff & HR</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{activeStaff.length} active · {inactiveStaff.length} inactive</p>
        </div>
        {(isAdmin || isAdminOfficer) && (
          <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl" size="sm">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Staff</span><span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>

      {/* Search/filter — only for staff list tabs */}
      {["active", "inactive"].includes(activeSubTab) && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="All Roles" /></SelectTrigger>
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

      {/* Parent Tab navigation */}
      <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-none">
        {visibleParents.map(parent => {
          const Icon = parent.icon;
          const isActive = activeParent === parent.key;
          return (
            <button
              key={parent.key}
              onClick={() => {
                setActiveParent(parent.key);
                setActiveSubTab(parent.defaultSub);
              }}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-navy bg-navy/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" /> {parent.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Tab navigation */}
      {currentParent && visibleSubTabs.length > 0 && (
        <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-none bg-muted/30">
          {visibleSubTabs.map(subTab => {
            const isActive = activeSubTab === subTab.key;
            return (
              <button
                key={subTab.key}
                onClick={() => setActiveSubTab(subTab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {subTab.label}
                {subTab.isBadged && subTab.key === "active" && (
                  <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {applyFilters(activeStaff).length}
                  </span>
                )}
                {subTab.isBadged && subTab.key === "inactive" && (
                  <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {applyFilters(inactiveStaff).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* HR AI Assistant — floating, available on all tabs */}
      {(isAdmin || isAdminOfficer || isTL) && (
        <HRAIAssistant staff={staff} />
      )}

      {/* Tab content */}
      <div className="mt-0">
        {activeSubTab === "hr-dashboard" && <HRDashboardTab user={user} staffProfile={staffProfile} onNavigate={(tab) => setActiveSubTab(tab)} />}

        {activeSubTab === "active" && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {applyFilters(activeStaff).map(s => <StaffCard key={s.id} member={s} />)}
            </div>
          )
        )}

        {activeSubTab === "hierarchy" && <HierarchyView staff={staff} homes={homes} />}

        {activeSubTab === "inactive" && (
          applyFilters(inactiveStaff).length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <UserX className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No inactive staff.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {applyFilters(inactiveStaff).map(s => <StaffCard key={s.id} member={s} inactive />)}
            </div>
          )
        )}

        {activeSubTab === "rota" && <StaffRotaTab user={user} staff={staff} homes={homes} />}

        {activeSubTab === "timesheets" && <TimesheetsTab user={user} staff={staff} homes={homes} staffProfile={staffProfile} />}

        {activeSubTab === "leave" && <LeaveManagementTab user={user} staff={staff} homes={homes} staffProfile={staffProfile} />}

        {activeSubTab === "supervision" && <SupervisionTab user={user} staff={staff} homes={homes} />}

        {activeSubTab === "disciplinary" && <DisciplinaryTab user={user} staff={staff} homes={homes} />}

        {activeSubTab === "availability" && (
          <AvailabilityOverviewTab
            user={user}
            onOpenPanel={(member, tab) => setAvailPanel({ member, defaultTab: tab || "profile" })}
          />
        )}

        {activeSubTab === "training-courses" && <TrainingCoursesTab staffProfile={staffProfile} />}

        {activeSubTab === "onboarding" && <OnboardingTab user={user} staff={staff} />}

        {activeSubTab === "toil" && <TOILTab user={user} staff={staff} staffProfile={staffProfile} />}

        {activeSubTab === "wellbeing" && <WellbeingTab user={user} staff={staff} homes={homes} staffProfile={staffProfile} />}

        {activeSubTab === "hr-reporting" && <HRReportingTab staff={staff} homes={homes} />}

        {activeSubTab === "expenses" && <ExpensesTab user={user} staff={staff} homes={homes} staffProfile={staffProfile} />}

        {activeSubTab === "hr-policy" && <HRPolicyTab />}

        {activeSubTab === "policy-hub-main" && (
          <PolicyHubMain staffProfile={staffProfile} user={user} staff={staff} homes={homes} />
        )}
      </div>
    </div>
  );
}