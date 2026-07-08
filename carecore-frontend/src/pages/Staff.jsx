import { useState, useEffect } from "react";
import { useOutletContext, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// @ts-ignore
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { createNotification } from "@/lib/createNotification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, UserCheck, UserX, RotateCcw, GitBranch, Calendar,
  // @ts-ignore
  LayoutDashboard, Clock, CreditCard, Plane, AlertCircle, ChevronRight, BookOpen,
  // @ts-ignore
  Heart, LogOut, Users, Shield, Settings, MapPin
} from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import { logAudit } from "@/lib/logAudit";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";
import { useModuleActions } from "@/lib/PermissionContext";

// Existing components
import StaffForm from "../components/staff/StaffForm";
// @ts-ignore
import PhotoUpload from "../components/staff/PhotoUpload";
import HierarchyView from "../components/staff/HierarchyView";
import AvailabilityPanel from "../components/staff/availability/AvailabilityPanel";
import AvailabilityOverviewTab from "../components/staff/availability/AvailabilityOverviewTab";

// New HR tabs
// @ts-ignore
import HRDashboardTab from "../components/staff/tabs/HRDashboardTab.jsx";
import HRDashboardTabNew from "../components/staff/hr-dashboard/HRDashboardTabNew.jsx";
import StaffProfileModal from "../components/staff/tabs/StaffProfileModal.jsx";
import TimesheetsTab from "../components/staff/tabs/TimesheetsTab.jsx";
import LeaveManagementTab from "../components/staff/tabs/LeaveManagementTab.jsx";
import SupervisionTab from "../components/staff/tabs/SupervisionTab.jsx";
import DisciplinaryTab from "../components/staff/tabs/DisciplinaryTab.jsx";


import HRPolicyTab from "../components/staff/tabs/HRPolicyTab.jsx";
import OnboardingTab from "../components/staff/onboarding/OnboardingTab.jsx";
import HRReportingTab from "../components/staff/tabs/HRReportingTab.jsx";
import WellbeingTab from "../components/staff/wellbeing/WellbeingTab.jsx";
import TOILTab from "../components/staff/toil/TOILTab.jsx";
import HRAIAssistant from "../components/staff/ai/HRAIAssistant.jsx";
import OffboardingModal from "../components/staff/offboarding/OffboardingModal.jsx";
import ExpensesTab from "../components/staff/tabs/ExpensesTab.jsx";
// @ts-ignore
import PolicyHubMain from "../components/staff/policy/PolicyHubMain.jsx";
import StaffTrackerTab from "../components/staff/tracker/StaffTrackerTab.jsx";

// Phase 4 Forms
import StaffServiceAssignmentForm from "../components/staff/StaffServiceAssignmentForm";
import StaffMovementForm from "../components/staff/StaffMovementForm";
import AgencyBankUsageForm from "../components/staff/AgencyBankUsageForm";
import VacancyForm from "../components/hr/VacancyForm";

// Annex A Staffing Tabs
import StaffMovementsTab from "../components/staff/tabs/StaffMovementsTab";
import AgencyBankTab from "../components/staff/tabs/AgencyBankTab";
import VacanciesTab from "../components/staff/tabs/VacanciesTab";

import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger"; // For triggering workflows on staff updates

const roleColors = {
  admin: "bg-red-500/10 text-red-600",
  admin_officer: "bg-orange-500/10 text-orange-600",
  admin_manager: "bg-orange-600/10 text-orange-700",
  team_leader: "bg-purple-500/10 text-purple-500",
  team_manager: "bg-violet-500/10 text-violet-600",
  regional_manager: "bg-indigo-500/10 text-indigo-600",
  rsm: "bg-teal-500/10 text-teal-700",
  support_worker: "bg-blue-500/10 text-blue-500",
  finance_officer: "bg-emerald-500/10 text-emerald-600",
  finance_manager: "bg-emerald-700/10 text-emerald-800",
  hr_officer: "bg-pink-500/10 text-pink-600",
  hr_manager: "bg-pink-700/10 text-pink-800",
  risk_officer: "bg-red-400/10 text-red-500",
  risk_manager: "bg-red-700/10 text-red-700",
};
const roleLabels = {
  admin: "Admin",
  admin_officer: "Admin Officer",
  admin_manager: "Admin Manager",
  team_leader: "Team Leader",
  team_manager: "Team Manager",
  regional_manager: "Regional Manager",
  rsm: "RSM",
  support_worker: "Support Worker",
  finance_officer: "Finance Officer",
  finance_manager: "Finance Manager",
  hr_officer: "HR Officer",
  hr_manager: "HR Manager",
  risk_officer: "Risk Officer",
  risk_manager: "Risk Manager",
};

const PARENT_TABS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "admin_officer", "team_leader", "team_manager", "regional_manager", "rsm", "hr_officer", "hr_manager", "guest"],
    defaultSub: "hr-dashboard",
    subTabs: [
      { key: "hr-dashboard", label: "HR Dashboard", roles: ["admin", "admin_officer", "team_leader", "team_manager", "regional_manager", "rsm", "hr_officer", "hr_manager", "guest"] },
      { key: "hr-reporting", label: "HR Reports", roles: ["admin", "admin_officer", "hr_manager", "rsm", "regional_manager"] },
    ],
  },
  {
    key: "people",
    label: "People",
    icon: Users,
    roles: ["admin", "admin_officer", "team_leader", "team_manager", "regional_manager", "rsm", "hr_officer", "hr_manager", "support_worker"],
    defaultSub: "active",
    subTabs: [
      { key: "active", label: "Active Staff", roles: ["admin", "admin_officer", "team_leader", "team_manager", "regional_manager", "rsm", "hr_officer", "hr_manager", "support_worker"], isBadged: true },
      { key: "pending", label: "Pending", roles: ["admin", "admin_officer", "team_leader", "team_manager", "regional_manager", "rsm", "hr_officer", "hr_manager"], isBadged: true },
      { key: "inactive", label: "Inactive", roles: ["admin", "admin_officer", "hr_manager", "rsm", "regional_manager"], isBadged: true },
      { key: "rejected", label: "Rejected", roles: ["admin", "admin_officer", "hr_manager", "rsm", "regional_manager"], isBadged: true },
      { key: "hierarchy", label: "Hierarchy", roles: ["admin", "team_leader", "team_manager", "regional_manager", "rsm"] },
      { key: "onboarding", label: "Onboarding", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_officer", "hr_manager"] },
      { key: "movements", label: "Staff Movements", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_officer", "hr_manager"] },
      { key: "agency-bank", label: "Agency & Bank", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_officer", "hr_manager"] },
      { key: "vacancies", label: "Vacancies", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_officer", "hr_manager"] },
    ],
  },
  {
    key: "time-attendance",
    label: "Time & Attendance",
    icon: Calendar,
    roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_officer", "hr_manager", "support_worker"],
    defaultSub: "availability",
    subTabs: [
      { key: "availability", label: "Availability", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_officer", "hr_manager", "support_worker"] },
      { key: "leave", label: "Leave", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_officer", "hr_manager", "support_worker"] },
      { key: "toil", label: "TOIL", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_officer", "hr_manager", "support_worker"] },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    icon: CreditCard,
    roles: ["admin", "admin_officer", "team_leader", "finance_officer", "finance_manager", "hr_manager", "support_worker"],
    defaultSub: "timesheets",
    subTabs: [
      { key: "timesheets", label: "Salary Management", roles: ["admin", "admin_officer", "team_leader", "finance_officer", "finance_manager", "hr_manager", "support_worker"] },
      // { key: "expenses", label: "Expenses", roles: ["admin", "admin_officer", "team_leader", "finance_officer", "finance_manager", "hr_manager", "support_worker"] },
    ],
  },
  {
    key: "compliance",
    label: "Compliance",
    icon: Shield,
    roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_manager", "rsm", "risk_manager", "support_worker"],
    defaultSub: "supervision",
    subTabs: [
      { key: "supervision", label: "Supervision", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_manager"] },
      { key: "disciplinary", label: "Disciplinary", roles: ["admin", "admin_officer", "team_leader", "hr_manager", "rsm"] },
      { key: "wellbeing", label: "Wellbeing", roles: ["admin", "admin_officer", "team_leader", "team_manager", "hr_manager", "support_worker"] },
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
  {
    key: "staff-tracker",
    label: "Staff Tracker",
    icon: MapPin,
    roles: ["admin", "admin_officer", "admin_manager", "rsm", "regional_manager", "team_manager", "team_leader", "hr_officer", "hr_manager", "finance_officer", "finance_manager", "support_worker"],
    defaultSub: "staff-tracker-map",
    subTabs: [
      { key: "staff-tracker-map", label: "Live Tracker", roles: ["admin", "admin_officer", "admin_manager", "rsm", "regional_manager", "team_manager", "team_leader", "hr_officer", "hr_manager", "finance_officer", "finance_manager", "support_worker"] },
    ],
  },
];

export default function Staff() {
  // @ts-ignore
  const { user, staffProfile } = useOutletContext();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [availPanel, setAvailPanel] = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [offboardingModal, setOffboardingModal] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Two-level tab state
  const [activeParent, setActiveParent] = useState(() => searchParams.get("tab") || "dashboard");
  const [activeSubTab, setActiveSubTab] = useState(() => searchParams.get("sub") || "hr-dashboard");

  // Sync state to URL
  useEffect(() => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (params.get("tab") !== activeParent) params.set("tab", activeParent);
      if (params.get("sub") !== activeSubTab) params.set("sub", activeSubTab);
      return params;
    }, { replace: true });
  }, [activeParent, activeSubTab, setSearchParams]);

  // Sync URL to state
  useEffect(() => {
    const tab = searchParams.get("tab");
    const sub = searchParams.get("sub");
    if (tab && tab !== activeParent) setActiveParent(tab);
    if (sub && sub !== activeSubTab) setActiveSubTab(sub);
  }, [searchParams]);

  // Phase 4 Modals
  const [assignmentModal, setAssignmentModal] = useState(null);
  const [movementModal, setMovementModal] = useState(null);
  const [agencyModal, setAgencyModal] = useState(false);
  const [vacancyModal, setVacancyModal] = useState(false);

  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isAdmin = ['admin', 'rsm', 'regional_manager'].includes(staffRole);
  const isAdminOfficer = ['admin_officer', 'admin_manager'].includes(staffRole);

  // @ts-ignore
  const isRiskLine = ['risk_officer', 'risk_manager'].includes(staffRole);
  const isHRLine = ['hr_officer', 'hr_manager'].includes(staffRole);
  // @ts-ignore
  const isFinanceLine = ['finance_officer', 'finance_manager'].includes(staffRole);
  // @ts-ignore
  const isCareLine = ['support_worker', 'team_leader', 'team_manager', 'regional_manager', 'rsm'].includes(staffRole);
  // @ts-ignore
  const isSeniorManagement = ['admin', 'rsm', 'regional_manager'].includes(staffRole);

  const isTL = staffRole === "team_leader";
  const isSW = staffRole === "support_worker";
  const isTM = staffRole === "team_manager";
  const isRM = staffRole === "regional_manager";
  const isRSM = staffRole === "rsm";
  // @ts-ignore
  const isFO = staffRole === "finance_officer";
  // @ts-ignore
  const isFM = staffRole === "finance_manager";
  const isHO = staffRole === "hr_officer";
  const isHM = staffRole === "hr_manager";
  // @ts-ignore
  const isRO = staffRole === "risk_officer";
  // @ts-ignore
  const isRkM = staffRole === "risk_manager";
  const isAM = staffRole === "admin_manager";
  const isAdminOrAbove = isAdmin || isRSM || isRM;

  const canInitiateOnboarding = isAdminOrAbove || isAM || isAdminOfficer || isHM || isHO || isTM;
  const { canAdd: canAddStaff, canEdit: canEditStaff } = useModuleActions("staff", { canAdd: canInitiateOnboarding });
  // @ts-ignore
  const { canAdd: canAddHR, canEdit: canEditHR } = useModuleActions("hr", { canAdd: canInitiateOnboarding });
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile }); // For triggering workflows on staff updates

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
    staleTime: 5 * 60 * 1000,
  });

  // Auto-open staff profile when navigated from performance page with ?employee=<id>&ptab=<tab>
  const [autoOpenHandled, setAutoOpenHandled] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("personal");
  useEffect(() => {
    if (autoOpenHandled || staff.length === 0) return;
    const params = new URLSearchParams(location.search);
    const employeeId = params.get("employee");
    if (employeeId) {
      const found = staff.find(s => s.id === employeeId);
      if (found) {
        setActiveParent("people");
        setActiveSubTab("active");
        setProfileModal(found);
        setProfileModalTab(params.get("ptab") || "personal");
        setAutoOpenHandled(true);
      }
    }
  }, [staff, location.search, autoOpenHandled]);

  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // @ts-ignore
      const { password, ...staffData } = data;
      // Admin Officers and non-admin managers must go through maker-checker; Admins/RSM/RM can create directly as active
      const requiresApproval = !isAdminOrAbove && staffRole !== "admin";
      const profileData = { ...staffData, status: "pending" };

      const created = await secureGateway.create("StaffProfile", profileData);

      // Use staffData.email as the authoritative source — the `created` response
      // from the gateway may not always return the email field.
      const inviteEmail = staffData.email || created?.email;
      if (password && inviteEmail) {
        try {
          // @ts-ignore
          const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
          const token = window.sessionStorage.getItem('access_token');
          if (!token) throw new Error('You are not logged in — please refresh and try again.');
          const res = await fetch(`${API_BASE}/auth/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              email: inviteEmail,
              full_name: staffData.full_name || created?.full_name,
              role: staffData.role || created?.role,
              password: password
            })
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const msg = errBody?.error?.message || `Server error (${res.status})`;
            throw new Error(msg);
          }
          toast.success(`Login credentials saved for ${inviteEmail}`);
        } catch (err) {
          console.error("Failed to save login credentials:", err);
          toast.error("Staff profile saved, but password NOT saved: " + err.message);
        }
      }

      // @ts-ignore
      await logAudit({
        entity_name: "StaffProfile", entity_id: created?.id, action: "create",
        changed_by: staffProfile?.id, changed_by_name: staffProfile?.full_name || user?.full_name || "",
        old_values: null,
        new_values: { full_name: staffData.full_name, role: staffData.role, email: staffData.email, home_ids: staffData.home_ids, status: profileData.status },
        org_id: ORG_ID,
        description: `New staff member created: ${staffData.full_name} (${staffData.role})${requiresApproval ? " — pending admin approval" : ""}`,
      });

      // if (requiresApproval && created?.id) {
      //   await secureGateway.create("ApprovalWorkflow", {
      //     org_id: ORG_ID,
      //     entity_type: "new_staff_entry",
      //     entity_id: created.id,
      //     entity_reference: `New Staff — ${staffData.full_name} — ${staffData.role}`,
      //     home_id: staffData.home_ids?.[0] || "",
      //     home_name: homes.find(h => h.id === staffData.home_ids?.[0])?.name || "",
      //     submitted_by: staffProfile?.id,
      //     submitted_by_name: staffProfile?.full_name || user?.full_name || "",
      //     submitted_at: new Date().toISOString(),
      //     status: "pending_ho",
      //     current_step: 1,
      //     priority: "normal",
      //     notes: `Role: ${staffData.role}${staffData.email ? ` · ${staffData.email}` : ""}`,
      //   });
      //   queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
      // }

      return created;
    },
    // @ts-ignore
  onSuccess: (createdRecord, data) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowForm(false);

      triggerWorkflow({
        workflowType: "onboarding",
        entityId:     createdRecord?.id,
        entityRef:    createdRecord?.id ? `ONB-${createdRecord.id.slice(0, 8)}` : "",
        title:        `New Staff — ${data.full_name}`,
        description:  `Role: ${data.role}${data.email ? ` · ${data.email}` : ""}`,
        homeId:       data.home_ids?.[0] || "",
        homeName:     homes.find(h => h.id === data.home_ids?.[0])?.name || "",
        priority:     "routine",
      });

      toast.success("Staff entry submitted — awaiting HR approval before activation.");
    },
  });

  const statusMutation = useMutation({
    // @ts-ignore
    mutationFn: async ({ id, status }) => {
      const member = staff.find(s => s.id === id);
      await secureGateway.update("StaffProfile", id, { status });
      // @ts-ignore
      await logAudit({
        entity_name: "StaffProfile", entity_id: id, action: "status_change",
        changed_by: staffProfile?.id, changed_by_name: staffProfile?.full_name || user?.full_name || "",
        old_values: { status: member?.status },
        new_values: { status, changed_by: staffProfile?.full_name },
        org_id: ORG_ID,
        description: `Staff status changed: ${member?.full_name} → ${status}`,
      });

      // Notify creator when approving pending staff (pending → active)
      if (member?.status === "pending" && status === "active") {
        const workflow = (await secureGateway.filter("ApprovalWorkflow", { entity_id: id, entity_type: "new_staff_entry" })) || [];
        const creatorId = workflow[0]?.submitted_by;
        // @ts-ignore
        const creatorName = workflow[0]?.submitted_by_name;
        if (creatorId) {
          const creatorUser = staff.find(s => s.id === creatorId);
          if (creatorUser?.user_id) {
            await createNotification({
              recipient_user_id: creatorUser.user_id,
              // @ts-ignore
              recipient_staff_id: creatorUser.id,
              title: "Staff Member Approved",
              body: `${member?.full_name} has been approved and is now active in the system.`,
              type: "staff_approved",
              link: "/staff",
              priority: "normal",
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["approval-workflows"] });
      toast.success("Staff status updated");
    },
  });

  const activeStaff = staff.filter(s => s.status === "active");
  const pendingStaff = staff.filter(s => s.status === "pending");
  const rejectedStaff = staff.filter(s => s.status === "rejected");
  const inactiveStaff = staff.filter(s => s.status !== "active" && s.status !== "pending" && s.status !== "rejected");

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
      <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg overflow-hidden">
              {member.photo_url
                ? <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                : (member.full_name?.charAt(0) || "?")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="font-semibold hover:text-primary transition-colors cursor-pointer"
                  onClick={() => setProfileModal(member)}
                >
                  {member.full_name}
                </h3>
                <
// @ts-ignore
                Badge className={cn("text-[10px] capitalize px-1.5 py-0",
                  member.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                    member.status === "pending" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                      member.status === "rejected" ? "bg-red-100 text-red-700 hover:bg-red-100" :
                        "bg-gray-100 text-gray-700 hover:bg-gray-100"
                )}>
                  {member.status === "pending" ? "Pending" : member.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{member.email || "No email"}</p>
              {member.employee_id && <p className="text-[10px] font-mono text-primary/70 mt-0.5">{member.employee_id}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <
// @ts-ignore
            Badge className={cn("text-xs capitalize", roleColors[member.role] || "bg-muted text-muted-foreground")}>
              {roleLabels[member.role] || member.role}
            </Badge>
            {dbsAlert && <
// @ts-ignore
            Badge className="bg-amber-100 text-amber-700 text-[10px]">DBS Expiring</Badge>}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 mb-3">
          {member.phone && <p><span className="font-medium text-foreground">Phone:</span> {member.phone}</p>}
          {member.start_date && <p><span className="font-medium text-foreground">Start Date:</span> {member.start_date.split('T')[0]}</p>}
          {member.dbs_expiry && (
            <p>
              <span className="font-medium text-foreground">DBS Expiry:</span>{" "}
              <span className={dbsAlert ? "text-amber-500 font-medium" : ""}>{member.dbs_expiry.split('T')[0]}</span>
            </p>
          )}
          {member.status === "rejected" && member.rejection_reason && (
            <p className="mt-2 p-2 bg-red-50 text-red-700 rounded border border-red-100">
              <span className="font-semibold block mb-0.5">Rejection Note:</span>
              {member.rejection_reason}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <button
            onClick={() => setProfileModal(member)}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors font-medium"
          >
            <ChevronRight className="w-3 h-3" /> View Profile
          </button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setAvailPanel({ member, defaultTab: "profile" })}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Calendar className="w-3 h-3" /> Availability
            </button>
            {(isAdminOrAbove || isAM || isAdminOfficer || isTL || isTM || isHM) && !inactive && canEditStaff && (
              <>
                <button
                  onClick={() => setAssignmentModal(member)}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  title="Add service assignment"
                >
                  <Users className="w-3 h-3" /> Assign
                </button>
                <button
                  onClick={() => setMovementModal(member)}
                  className="text-xs text-muted-foreground hover:text-blue-500 flex items-center gap-1 transition-colors"
                  title="Record staff movement"
                >
                  <GitBranch className="w-3 h-3" /> Movement
                </button>
              </>
            )}
            {isAdmin && !inactive && (
              <>
                <button
                  // @ts-ignore
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
            {isAdmin && inactive && member.status !== "pending" && member.status !== "rejected" && (
              <button
                // @ts-ignore
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
          teamLeaders={staff.filter(s => s.role === "team_leader" && s.status === "active" && s.status !== "pending_approval")}
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
          defaultTab={profileModalTab}
          onClose={() => { setProfileModal(null); setProfileModalTab("personal"); }}
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

      {/* Phase 4 Forms */}
      {assignmentModal && (
        <StaffServiceAssignmentForm
          staffId={assignmentModal.id}
          staffName={assignmentModal.full_name}
          isOpen={!!assignmentModal}
          canEdit={canEditStaff}
          onClose={() => setAssignmentModal(null)}
          onSave={() => queryClient.invalidateQueries({ queryKey: ["staff"] })}
        />
      )}
      {movementModal && (
        <StaffMovementForm
          staffId={movementModal.id}
          staffName={movementModal.full_name}
          staffRole={movementModal.job_title}
          isSupportRole={movementModal.is_support_role}
          isOpen={!!movementModal}
          onClose={() => setMovementModal(null)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            queryClient.invalidateQueries({ queryKey: ["staff-movements"] });
          }}
        />
      )}
      {agencyModal && (
        // @ts-ignore
        <AgencyBankUsageForm
          isOpen={agencyModal}
          onClose={() => setAgencyModal(false)}
          onSave={() => queryClient.invalidateQueries({ queryKey: ["staff"] })}
        />
      )}
      {vacancyModal && (
        <VacancyForm
          isOpen={vacancyModal}
          onClose={() => setVacancyModal(false)}
          onSave={() => queryClient.invalidateQueries({ queryKey: ["staff"] })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Staff & HR</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {activeStaff.length} active · {inactiveStaff.length} inactive
            {pendingStaff.length > 0 && <span className="ml-2 text-amber-600 font-medium">· {pendingStaff.length} pending approval</span>}
          </p>
        </div>
        {canInitiateOnboarding && (canAddStaff || canAddHR) && (
          <div className="flex gap-2">
            {canAddStaff && (
              <
// @ts-ignore
              Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl" size="sm">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Staff</span><span className="sm:hidden">Add</span>
              </Button>
            )}
            {canAddStaff  && (
              <
// @ts-ignore
              Button onClick={() => setVacancyModal(true)} variant="outline" className="gap-2 rounded-xl" size="sm">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Vacancy</span><span className="sm:hidden">V</span>
              </Button>
            )}
            {canAddStaff && (
              <
// @ts-ignore
              Button onClick={() => setAgencyModal(true)} variant="outline" className="gap-2 rounded-xl" size="sm">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Agency/Bank</span><span className="sm:hidden">A/B</span>
              </Button>
            )}
          </div>
        )}
      </div>


      {/* Parent Tab navigation */}
      <div className="flex gap-0 border-b border-border overflow-x-auto pb-1">
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
              className={`flex items-center gap-1.5 px-3 md:px-4 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${isActive
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
        <div className="flex gap-0 border-b border-border overflow-x-auto pb-1 bg-muted/30">
          {visibleSubTabs.map(subTab => {
            const isActive = activeSubTab === subTab.key;
            return (
              <button
                key={subTab.key}
                onClick={() => setActiveSubTab(subTab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${isActive
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
                {subTab.isBadged && subTab.key === "pending" && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">
                    {applyFilters(pendingStaff).length}
                  </span>
                )}
                {subTab.isBadged && subTab.key === "inactive" && (
                  <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {applyFilters(inactiveStaff).length}
                  </span>
                )}
                {subTab.isBadged && subTab.key === "rejected" && (
                  <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full">
                    {applyFilters(rejectedStaff).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* HR AI Assistant — floating, available on all tabs */}
      {(isAdminOrAbove || isAM || isAdminOfficer || isTL || isTM || isHRLine) && (
        <HRAIAssistant staff={staff} />
      )}

      {/* Tab content */}
      <div className="mt-4">
        {/* Search/filter — only for staff list tabs */}
        {["active", "pending", "inactive", "rejected"].includes(activeSubTab) && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
// @ts-ignore
              placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <
// @ts-ignore
              SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <
// @ts-ignore
              SelectContent>
                <
// @ts-ignore
                SelectItem value="all">All Roles</SelectItem>
                <
// @ts-ignore
                SelectItem value="admin">Admin</SelectItem>
                <
// @ts-ignore
                SelectItem value="admin_officer">Admin Officer</SelectItem>
                <
// @ts-ignore
                SelectItem value="admin_manager">Admin Manager</SelectItem>
                <
// @ts-ignore
                SelectItem value="rsm">RSM</SelectItem>
                <
// @ts-ignore
                SelectItem value="regional_manager">Regional Manager</SelectItem>
                <
// @ts-ignore
                SelectItem value="team_manager">Team Manager</SelectItem>
                <
// @ts-ignore
                SelectItem value="team_leader">Team Leader</SelectItem>
                <
// @ts-ignore
                SelectItem value="support_worker">Support Worker</SelectItem>
                <
// @ts-ignore
                SelectItem value="finance_manager">Finance Manager</SelectItem>
                <
// @ts-ignore
                SelectItem value="finance_officer">Finance Officer</SelectItem>
                <
// @ts-ignore
                SelectItem value="hr_manager">HR Manager</SelectItem>
                <
// @ts-ignore
                SelectItem value="hr_officer">HR Officer</SelectItem>
                <
// @ts-ignore
                SelectItem value="risk_manager">Risk Manager</SelectItem>
                <
// @ts-ignore
                SelectItem value="risk_officer">Risk Officer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {activeSubTab === "hr-dashboard" && <HRDashboardTabNew user={user} staffProfile={staffProfile} onNavigate={(tab) => setActiveSubTab(tab)} />}

        {activeSubTab === "active" && (
          isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {applyFilters(activeStaff).length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No active staff found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {applyFilters(activeStaff).map(s => <StaffCard key={s.id} member={s} />)}
                </div>
              )}
            </div>
          )
        )}

        {activeSubTab === "hierarchy" && <HierarchyView staff={staff} homes={homes} />}

        {activeSubTab === "pending" && (
          applyFilters(pendingStaff).length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No pending staff found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {applyFilters(pendingStaff).map(s => <StaffCard key={s.id} member={s} inactive />)}
            </div>
          )
        )}

        {activeSubTab === "rejected" && (
          applyFilters(rejectedStaff).length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No rejected staff found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {applyFilters(rejectedStaff).map(s => <StaffCard key={s.id} member={s} inactive />)}
            </div>
          )
        )}

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

        {activeSubTab === "timesheets" && <TimesheetsTab user={user} staff={staff} homes={homes} staffProfile={staffProfile} />}

        {activeSubTab === "leave" && <LeaveManagementTab user={user} staff={staff} homes={homes} staffProfile={staffProfile} />}

        {activeSubTab === "supervision" && <SupervisionTab user={user} staff={staff} homes={homes} />}

        {activeSubTab === "disciplinary" && <DisciplinaryTab user={user} staff={staff} 
// @ts-ignore
        homes={homes} />}

        {activeSubTab === "availability" && (
          <AvailabilityOverviewTab
            user={user}
            onOpenPanel={(member, tab) => setAvailPanel({ member, defaultTab: tab || "profile" })}
          />
        )}


        {activeSubTab === "onboarding" && <OnboardingTab user={user} staff={staff} />}

        {activeSubTab === "movements" && <StaffMovementsTab staff={staff} homes={homes} canEditStaff={canEditStaff} />}

        {activeSubTab === "agency-bank" && <AgencyBankTab staff={staff} homes={homes} isAdminOrTL={isAdminOrAbove || isAM || isAdminOfficer || isTL || isTM || isHM} />}

        {activeSubTab === "vacancies" && <VacanciesTab staff={staff} homes={homes} isAdminOrTL={isAdminOrAbove || isAM || isAdminOfficer || isTL || isTM || isHM} />}

        {activeSubTab === "toil" && <TOILTab user={user} staff={staff} staffProfile={staffProfile} />}

        {activeSubTab === "wellbeing" && <WellbeingTab user={user} staff={staff} homes={homes} staffProfile={staffProfile} />}

        {activeSubTab === "hr-reporting" && <HRReportingTab staff={staff} homes={homes} />}

        {activeSubTab === "expenses" && <ExpensesTab user={user} staff={staff} homes={homes} staffProfile={staffProfile} />}

        {activeSubTab === "hr-policy" && <HRPolicyTab />}

        {activeSubTab === "staff-tracker-map" && (
          <StaffTrackerTab staffProfile={staffProfile} staff={staff} />
        )}
      </div>
    </div>
  );
}