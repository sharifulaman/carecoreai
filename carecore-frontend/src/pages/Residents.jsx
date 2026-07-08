import { useState, useMemo, useEffect } from "react";
import { useOutletContext, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { useMobile } from "@/lib/MobileContext";
import { useModuleActions } from "@/lib/PermissionContext";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Pencil, X, Filter, LayoutList, LayoutGrid, Flag, Calendar, AlertTriangle, Download, Plus } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import ServiceSelector from "@/components/residents/ServiceSelector";
import ResidentsDashboardOverview from "@/components/residents/ResidentsDashboardOverview";
// Current Status, Night Stay, Meal Intake, and Education Attendance are now
// triggered from YPCardExpanded.jsx (Today's Status cells / Update Status badge)
// instead of from this page — these imports/modals here are unused.
// import CurrentStatusModal from "../components/residents/CurrentStatusModal";
// import NightStayModal from "../components/residents/NightStayModal";
// import EducationAttendanceModal from "../components/residents/EducationAttendanceModal";
// import MealIntakeModal from "../components/residents/MealIntakeModal";
import ResidentMobileCard from "../components/residents/ResidentMobileCard";
import YPCardView from "../components/residents/yp/YPCardView";
import SupportPlansTab from "../components/residents/yp/SupportPlansTab";
import ILSPlansTab from "../components/residents/yp/ILSPlansTab";
import VisitReportsTab from "../components/residents/VisitReportsTab";

import ILSPlanModal from "../components/residents/modals/ILSPlanModal";
import AppointmentsTab from "../components/residents/appointments/AppointmentsTab";
import YPDashboard from "../components/residents/yp/YPDashboard";
import MoveOnTabMain from "../components/eighteen-plus/MoveOnTab/MoveOnTabMain";
// PATabMain replaced — PA Details moved to Life & Community, PA Visits + LA
// Reviews merged into PAVisitsLAReviewsTab under Records & Compliance.
// import PATabMain from "../components/eighteen-plus/PATab/PATabMain";
import PADetailsSubTab from "../components/eighteen-plus/PATab/PADetailsSubTab";
import PAVisitsLAReviewsTab from "../components/eighteen-plus/PATab/PAVisitsLAReviewsTab";
import BenefitsTabMain from "../components/eighteen-plus/BenefitsTab/BenefitsTabMain";
// YPOverviewDashboard replaced by ResidentsDashboardOverview
import EducationTab from "../components/residents/education/EducationTab";
import HealthTab from "../components/residents/health/HealthTab";
import LeisureTab from "../components/residents/leisure/LeisureTab";
import FinanceLegalTab from "../components/residents/finance/FinanceLegalTab";
import CouncilTaxExemptionTab from "../components/residents/finance/CouncilTaxExemptionTab";
import MissingTab from "../components/residents/missing/MissingTab";
import FamilyContactTab from "../components/residents/family/FamilyContactTab";
import ExploitationRiskTab from "../components/residents/risk/ExploitationRiskTab";
import RiskTab from "../components/residents/risk/RiskTab";
import BehaviourManagementForm from "../components/residents/behaviour/BehaviourManagementForm";
import TherapeuticPlanForm from "../components/residents/behaviour/TherapeuticPlanForm";
import TherapeuticPlanSection from "../components/residents/behaviour/TherapeuticPlanSection";
//For triggering workflow
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";

function BehaviourManagementTabContent({ residents, myStaffProfile, isAdminOrTL }) {
  const [selId, setSelId] = useState(residents[0]?.id || null);
  const selR = residents.find(r => r.id === selId) || residents[0];
  if (!residents.length) return <div className="mt-4 bg-card rounded-xl border border-border p-12 text-center text-muted-foreground text-sm">No residents found.</div>;
  return (
    <div className="mt-4 space-y-3">
      {residents.length > 1 && (
        <Select value={selId || ""} onValueChange={setSelId}>
          <SelectTrigger className="w-56 h-9 text-sm"><SelectValue placeholder="Select resident" /></SelectTrigger>
          <SelectContent>{residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {selR && <div className="bg-card border border-border rounded-xl p-6"><BehaviourManagementForm residentId={selR.id} homeId={selR.home_id} staffProfile={myStaffProfile} readOnly={!isAdminOrTL} /></div>}
    </div>
  );
}

function TherapeuticPlanTabContent({ residents, myStaffProfile, isAdminOrTL }) {
  const [selId, setSelId] = useState(residents[0]?.id || null);
  const selR = residents.find(r => r.id === selId) || residents[0];
  if (!residents.length) return <div className="mt-4 bg-card rounded-xl border border-border p-12 text-center text-muted-foreground text-sm">No residents found.</div>;
  return (
    <div className="mt-4 space-y-3">
      {residents.length > 1 && (
        <Select value={selId || ""} onValueChange={setSelId}>
          <SelectTrigger className="w-56 h-9 text-sm"><SelectValue placeholder="Select resident" /></SelectTrigger>
          <SelectContent>{residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {selR && <div className="bg-card border border-border rounded-xl p-6"><TherapeuticPlanSection residentId={selR.id} homeId={selR.home_id} staffProfile={myStaffProfile} readOnly={!isAdminOrTL} /></div>}
    </div>
  );
}
import ComplaintsTab from "../components/residents/complaints/ComplaintsTab";
import AdvocacyTab from "../components/residents/advocacy/AdvocacyTab";
import AchievementsTab from "../components/residents/achievements/AchievementsTab";
import PlacementPlanTab from "../components/residents/care-planning/PlacementPlanTab";
import PathwayPlanTab from "../components/residents/care-planning/PathwayPlanTab";
import WelcomePackTab from "../components/residents/yp/WelcomePackTab/WelcomePackTab";
import LogIncidentTab from "../components/residents/incidents/LogIncidentTab";
import ReferralsTab from "../components/residents/safety/ReferralsTab";
import LegalRestrictionsTab from "../components/residents/legal/LegalRestrictionsTab";
import YPVoiceReadOnly from "../components/compliance-quality/yp-voice/YPVoiceReadOnly";
import EducationRecordTab from "../components/residents/education/EducationRecordTab";
import EmploymentRecordTab from "../components/residents/employment/EmploymentRecordTab";
import NEETRecordTab from "../components/residents/neet/NEETRecordTab";
import DailyLogModal from "../components/daily-logs/DailyLogModal";
import DailyLogTimeline from "../components/daily-logs/DailyLogTimeline";
import ResidentForm from "../components/residents/ResidentForm";
import { createNotification } from "@/lib/createNotification";
import Shifts from "./Shifts";
import MyShiftsSection from "@/components/sw/MyShiftsSection";
import VisitorLogTab from "../components/homes/tabs/VisitorLogTab";
import ExternalSupportTab from "../components/residents/care-planning/ExternalSupportTab";



// Two-level navigation: 2 top-level tabs + groups with conditional service-specific sub-tabs
const TOP_TABS = [
  { key: "overview", label: "Overview" },
  { key: "yp", label: "Resident Young People" },
];

// Common groups visible for all services
const COMMON_GROUPS = [
  {
    key: "care-planning",
    label: "Care & Planning",
    tabs: [
      { key: "support-plans", label: "Support Plans" },
      { key: "placement-plan", label: "Placement Plan" },
      { key: "pathway-plan", label: "Pathway Plans" },
      { key: "ils-plans", label: "Independent Living Skills" },
      { key: "referrals", label: "Referrals" },
      { key: "external-support", label: "External Support" },
      { key: "moveon", label: "Move-On Planning" },
    ],
    serviceFilter: null, // Visible for all services
  },
  {
    key: "safety",
    label: "Safety & Safeguarding",
    tabs: [
      { key: "risk-assessment", label: "Risk Assessment" },
      { key: "behaviour-management", label: "Behaviour Management" },
      { key: "incidents", label: "Incident Logs" },
      { key: "missing", label: "Missing" },
      { key: "referrals", label: "Referrals" },
    ],
    serviceFilter: null, // Visible for all services
  },
  {
    key: "wellbeing",
    label: "Wellbeing",
    tabs: [
      { key: "health", label: "Health" },
      { key: "therapeutic-plan", label: "Therapeutic Plan" },
      { key: "leisure", label: "Leisure & Recreation" },
      { key: "achievements", label: "Achievements" },
    ],
    serviceFilter: null, // Visible for all services
  },
  {
    key: "life-community",
    label: "Life & Community",
    tabs: [
      { key: "education-records", label: "Education" },
      { key: "employment-records", label: "Employment & Apprenticeship" },
      { key: "neet-records", label: "NEET / Not in Education" },
      { key: "finance", label: "Finance" },
      { key: "council-tax", label: "Council Tax Exemption" },
      { key: "housing", label: "Housing & Transitions" },
      { key: "family-contact", label: "Family Contact" },
      { key: "appointments", label: "Appointments" },
      { key: "pa-details", label: "PA Details" },
    ],
    serviceFilter: null, // Visible for all services
  },
  {
    key: "records",
    label: "Records & Compliance",
    tabs: [
      { key: "daily-logs-tab", label: "Daily Logs" },
      { key: "visit-reports", label: "Reports" },
      { key: "welcome-pack", label: "Welcome Pack" },
      { key: "complaints", label: "Complaints & Compliments" },
      { key: "legal-restrictions", label: "Letters" },
      { key: "yp-voice", label: "YP Voice / Meeting / Feedback" },
      { key: "pa-la-reviews", label: "PA Visits & LA Reviews" },
    ],
    serviceFilter: null, // Visible for all services
  },
];

// "18+ Essentials" group removed — its only tab (PA Management) has been split:
// PA Details moved to Life & Community, PA Visits + LA Reviews merged under
// Records & Compliance ("pa-la-reviews"). Kept commented rather than deleted.
// const EIGHTEEN_PLUS_GROUP = {
//   key: "essentials",
//   label: "18+ Essentials",
//   tabs: [
//     { key: "pa", label: "PA Management" },
//   ],
//   serviceFilter: ["eighteen_plus", "all"],
// };

// 24 Hours specific group (only shown when 24h or All is selected)
const TWENTYFOUR_HOURS_GROUP = {
  key: "residential",
  label: "24h Residential",
  tabs: [
    { key: "shifts", label: "My Shifts" },
    { key: "shifts-rota", label: "Shifts & Rota" },
    { key: "visitor-log", label: "Visitor Log" },
  ],
  serviceFilter: ["twenty_four_hours", "all"],
};

// Function to get visible groups based on service selection
function getVisibleGroups(selectedService) {
  const groups = [...COMMON_GROUPS];
  if (selectedService === "twenty_four_hours" || selectedService === "all") {
    groups.push(TWENTYFOUR_HOURS_GROUP);
  }
  return groups;
}

const GROUPS = COMMON_GROUPS; // Keep for backward compat, but use getVisibleGroups() at runtime

// Map any tab key → its group key (for deep-link resolution)
// Updated to use dynamic groups
function getTAB_TO_GROUP(visibleGroups) {
  const map = {};
  visibleGroups.forEach(g => g.tabs.forEach(t => { map[t.key] = g.key; }));
  return map;
}

// Derive the group that owns a given activeTab
function getGroupForTab(tabKey, visibleGroups) {
  return visibleGroups.find(g => g.tabs.some(t => t.key === tabKey)) || null;
}



function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function timeAgo(isoStr) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function fmtDateTime(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", year: "numeric", weekday: "short" });
}

const todayStr = new Date().toISOString().split("T")[0];
const todayLabel = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function Residents() {
  const { user, staffProfile } = useOutletContext();
  const { isMobile } = useMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Read service from URL query param on mount
  const getInitialService = () => {
    const params = new URLSearchParams(location.search);
    const svc = params.get("service");
    return ["outreach", "eighteen_plus", "twenty_four_hours"].includes(svc) ? svc : "all";
  };
  const [selectedService, setSelectedService] = useState(getInitialService);

  // Force refresh all compliance data on mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["all-residents"] });
    queryClient.invalidateQueries({ queryKey: ["mfh-records"] });
    queryClient.invalidateQueries({ queryKey: ["complaints"] });
  }, [queryClient]);

  // Sync URL query param when service changes
  const handleServiceChange = (svc) => {
    setSelectedService(svc);
  };

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "overview";
  });
  const [activeGroup, setActiveGroup] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const groupParam = params.get("group");
    if (groupParam) return groupParam;
    // No explicit ?group= — derive it from ?tab= so deep links that only set
    // tab (e.g. navigate(`/residents?tab=missing&yp=...`) from elsewhere in
    // the app) still land on the group whose tab bar actually contains that tab,
    // instead of silently defaulting to "care-planning".
    const tabParam = params.get("tab");
    if (tabParam) {
      const svc = params.get("service");
      const service = ["outreach", "eighteen_plus", "twenty_four_hours"].includes(svc) ? svc : "all";
      const found = getGroupForTab(tabParam, getVisibleGroups(service));
      if (found) return found.key;
    }
    return "care-planning";
  });
  const [search, setSearch] = useState("");
  const [filterHomeId, setFilterHomeId] = useState("all");
  const [filterAge, setFilterAge] = useState("all");
  const [cardFilterHome, setCardFilterHome] = useState("all");
  const [cardFilterFlagged, setCardFilterFlagged] = useState(false);
  // Unused — see the comment near the CurrentStatusModal/NightStayModal imports above.
  // const [statusModal, setStatusModal] = useState(null);
  // const [nightStayModal, setNightStayModal] = useState(null);
  // const [eduAttendanceModal, setEduAttendanceModal] = useState(null);
  // const [mealIntakeModal, setMealIntakeModal] = useState(null);
  const [preSelectedResident, setPreSelectedResident] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const ypId = params.get("yp");
    return ypId ? { id: ypId } : null;
  });
  const [supportPlanModalResident, setSupportPlanModalResident] = useState(null);
  const [supportPlanResidentId, setSupportPlanResidentId] = useState(null);
  const [ilsPlanModalResident, setILSPlanModalResident] = useState(null);
  const [dailyLogModalResident, setDailyLogModalResident] = useState(null);
  const [showAddResident, setShowAddResident] = useState(false);
  const [savingResident, setSavingResident] = useState(false);

  // Sync URL query params when tabs/filters change so they persist on refresh
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (selectedService !== "all") {
      if (params.get("service") !== selectedService) {
        params.set("service", selectedService);
        changed = true;
      }
    } else {
      if (params.has("service")) {
        params.delete("service");
        changed = true;
      }
    }

    if (activeTab && activeTab !== "overview") {
      if (params.get("tab") !== activeTab) {
        params.set("tab", activeTab);
        changed = true;
      }
    } else {
      if (params.has("tab")) {
        params.delete("tab");
        changed = true;
      }
    }

    if (activeGroup && activeGroup !== "care-planning") {
      if (params.get("group") !== activeGroup) {
        params.set("group", activeGroup);
        changed = true;
      }
    } else {
      if (params.has("group")) {
        params.delete("group");
        changed = true;
      }
    }

    if (preSelectedResident?.id) {
      if (params.get("yp") !== preSelectedResident.id) {
        params.set("yp", preSelectedResident.id);
        changed = true;
      }
    } else {
      if (params.has("yp")) {
        params.delete("yp");
        changed = true;
      }
    }

    if (changed) {
      const searchStr = params.toString();
      const url = `${window.location.pathname}${searchStr ? `?${searchStr}` : ""}`;
      window.history.replaceState(null, "", url);
    }
  }, [selectedService, activeTab, activeGroup, preSelectedResident]);

  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isAdmin = staffRole === "admin";
  const isAdminOrTL = isAdmin || staffRole === "team_leader";

  // Module-level action permissions configured by Super Admin in Tenant Admin.
  // Falls back to isAdminOrTL when no RolePermission record is configured for this role.
  const { canEdit, canAdd, canApprove, canDelete, isReadOnly, level: residentPermLevel } = useModuleActions("residents", {
    canEdit: isAdminOrTL,
    canAdd: isAdminOrTL,
    canApprove: isAdmin,
    canDelete: isAdmin,
  });

  const {
    data: residentsRaw = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["all-residents", staffProfile?.id, staffProfile?.org_id],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }, "-created_date", 500),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!staffProfile || user?.role === "admin",
  });

  // Ensure safe array — never undefined
  const residents = Array.isArray(residentsRaw) ? residentsRaw : [];

  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Overview tab queries (always enabled)
  const { data: visitReports = [] } = useQuery({
    queryKey: ["reports-recent"],
    queryFn: () => secureGateway.filter("VisitReport", {}, "-date", 200),
    staleTime: 10 * 60 * 1000,
  });

  const { data: mfhRecords = [] } = useQuery({
    queryKey: ["mfh-records"],
    queryFn: () => base44.entities.MissingFromHome.filter({}, "-reported_missing_datetime", 500),
    staleTime: 0,
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => secureGateway.filter("Appointment", {}, "-start_datetime", 500),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allComplaints = [] } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => secureGateway.filter("Complaint", {}, "-received_datetime", 500),
    staleTime: 0,
  });

  const { data: exploitationRisks = [] } = useQuery({
    queryKey: ["exploitation-risks-all"],
    queryFn: () => secureGateway.filter("ExploitationRisk", {}, "-created_date", 500),
    staleTime: 10 * 60 * 1000,
  });

  const { data: achievementsData = [] } = useQuery({
    queryKey: ["achievements-all"],
    queryFn: () => secureGateway.filter("Achievement", {}, "-created_date", 500),
    staleTime: 10 * 60 * 1000,
  });

  // Tab-specific lazy queries (enabled only when tab is active)
  const { data: dailyLogs = [] } = useQuery({
    queryKey: ["daily-logs-recent"],
    queryFn: () => base44.entities.DailyLog.filter({ org_id: ORG_ID }, "-date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "daily-logs-tab",
  });

  const { data: accidents = [] } = useQuery({
    queryKey: ["accidents", "all"],
    queryFn: () => secureGateway.filter("AccidentReport", {}, "-date", 200),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "incidents",
  });

  const { data: homeTasks = [] } = useQuery({
    queryKey: ["home-tasks-all"],
    queryFn: () => secureGateway.filter("HomeTask", {}, "-due_date", 100),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "tasks",
  });

  const { data: transitions = [] } = useQuery({
    queryKey: ["transitions-all"],
    queryFn: () => secureGateway.filter("Transition"),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "housing" || activeTab === "yp",
  });

  const { data: supportPlans = [] } = useQuery({
    queryKey: ["support-plans"],
    queryFn: () => secureGateway.filter("SupportPlan"),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "support-plans" || activeTab === "yp",
  });

  const { data: ilsPlans = [] } = useQuery({
    queryKey: ["ils-plans"],
    queryFn: () => secureGateway.filter("ILSPlan"),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "ils-plans" || activeTab === "yp",
  });

  const { data: bodyMaps = [] } = useQuery({
    queryKey: ["body-maps"],
    queryFn: () => secureGateway.filter("BodyMap", {}, "-recorded_datetime", 200),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab?.includes("risk"),
  });

  const { data: significantEvents = [] } = useQuery({
    queryKey: ["significant-events"],
    queryFn: () => secureGateway.filter("SignificantEvent", {}, "-event_datetime", 200),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "incidents",
  });

  const { data: reg44Reports = [] } = useQuery({
    queryKey: ["reg44-reports"],
    queryFn: () => secureGateway.filter("Reg44Report", {}, "-visit_date", 100),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: supervisionRecords = [] } = useQuery({
    queryKey: ["supervision-records"],
    queryFn: () => secureGateway.filter("SupervisionRecord", {}, "-supervision_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: medicationRecords = [] } = useQuery({
    queryKey: ["medication-records"],
    queryFn: () => secureGateway.filter("MedicationRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "health",
  });

  const { data: gpAppointments = [] } = useQuery({
    queryKey: ["gp-appointments"],
    queryFn: () => secureGateway.filter("GPAppointment", {}, "-date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "health",
  });

  const { data: eetRecords = [] } = useQuery({
    queryKey: ["eet-records"],
    queryFn: () => secureGateway.filter("EETRecord", {}, "-recorded_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: advocacyRecords = [] } = useQuery({
    queryKey: ["advocacy-records"],
    queryFn: () => secureGateway.filter("AdvocacyRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: ypViews = [] } = useQuery({
    queryKey: ["yp-views"],
    queryFn: () => secureGateway.filter("YPViewsRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: cicReports = [] } = useQuery({
    queryKey: ["cic-reports"],
    queryFn: () => secureGateway.filter("CICReport", {}, "-created_date", 200),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: therapeuticPlans = [] } = useQuery({
    queryKey: ["therapeutic-plans"],
    queryFn: () => secureGateway.filter("TherapeuticPlan", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "therapeutic-plan",
  });

  const { data: familyContacts = [] } = useQuery({
    queryKey: ["family-contacts-all"],
    queryFn: () => secureGateway.filter("FamilyContact", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "family-contact",
  });

  const { data: councilTaxExemptions = [] } = useQuery({
    queryKey: ["council-tax-exemptions-all"],
    queryFn: () => secureGateway.filter("CouncilTaxExemption", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "council-tax",
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["risk-assessments-all"],
    queryFn: () => secureGateway.filter("RiskAssessment", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "risk-assessment",
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ["training-records-all"],
    queryFn: () => secureGateway.filter("TrainingRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: pathwayPlansData = [] } = useQuery({
    queryKey: ["pathway-plans-all"],
    queryFn: () => secureGateway.filter("PathwayPlan", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "pathway-plan",
  });

  const { data: placementPlansData = [] } = useQuery({
    queryKey: ["placement-plans-all"],
    queryFn: () => secureGateway.filter("PlacementDetails", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "placement-plan",
  });

  const { data: supportPlanSignoffs = [] } = useQuery({
    queryKey: ["support-plan-signoffs"],
    queryFn: () => secureGateway.filter("SupportPlanSignoff", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "support-plans",
  });

  const { data: laReviews = [] } = useQuery({
    queryKey: ["la-reviews"],
    queryFn: () => secureGateway.filter("LAReview", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: reg45Reviews = [] } = useQuery({
    queryKey: ["reg45-reviews"],
    queryFn: () => secureGateway.filter("Reg45Review", {}, "-created_date", 100),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ["care-plans-all"],
    queryFn: () => secureGateway.filter("CarePlan", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab?.includes("support") || activeTab?.includes("ils"),
  });

  const { data: visitorLogs = [] } = useQuery({
    queryKey: ["visitor-logs"],
    queryFn: () => base44.entities.VisitorLog.filter({}, "-visit_date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "visitor-log",
  });

  const { data: allShifts = [] } = useQuery({
    queryKey: ["shifts-all"],
    queryFn: () => base44.entities.Shift.filter({}, "-start_datetime", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "shifts",
  });

  const [selectedHomeIdForVisitors, setSelectedHomeIdForVisitors] = useState("");

  // All daily logs — shared across status, night stay, edu attendance, meal intake
  const { data: allDailyLogsRaw = [] } = useQuery({
    queryKey: ["all-daily-logs"],
    queryFn: () => secureGateway.filter("DailyLog", {}, "-date", 500),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "yp" || activeTab === "daily-logs-tab",
  });

  const allDailyLogs = Array.isArray(allDailyLogsRaw) ? allDailyLogsRaw : [];

  // Alias all four to the same data — eliminates 3 duplicate gateway calls
  const statusLogs = allDailyLogs;
  const nightStayLogs = allDailyLogs;
  const eduAttendanceLogs = allDailyLogs;
  const mealIntakeLogs = allDailyLogs;

  // secureDataGateway is the single source of truth for resident access
  // Do NOT apply secondary filtering by StaffServiceAssignment
  const activeResidents = useMemo(() => {
    const base = residents.filter(r => r.status === "active");
    if (selectedService === "all") return base;
    return base.filter(r => r.service_type === selectedService);
  }, [residents, selectedService]);

  const filtered = useMemo(() => activeResidents.filter(r => {
    const matchSearch = !search || r.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchHome = filterHomeId === "all" || r.home_id === filterHomeId;
    const age = calcAge(r.dob);
    const matchAge = filterAge === "all" || (age !== null && String(age) === filterAge);
    return matchSearch && matchHome && matchAge;
  }), [activeResidents, search, filterHomeId, filterAge]);

  const selectedHome = homes.find(h => h.id === filterHomeId);

  // Per-resident helpers
  const getLastVisit = (residentId) => {
    const reports = visitReports.filter(r => r.resident_id === residentId).sort((a, b) => b.date?.localeCompare(a.date));
    return reports[0] || null;
  };

  const getTodayVisit = (residentId) => {
    return visitReports.find(r => r.resident_id === residentId && r.date === todayStr);
  };

  const getLastDailyLog = (residentId) => {
    const logs = dailyLogs.filter(l => l.resident_id === residentId).sort((a, b) => b.date?.localeCompare(a.date));
    return logs[0] || null;
  };

  const getTodayLog = (residentId) => {
    return dailyLogs.find(l => l.resident_id === residentId && l.date === todayStr);
  };

  // Resolve preSelectedResident from URL yp param once residents load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ypId = params.get("yp");
    if (ypId && residents.length > 0) {
      const found = residents.find(r => r.id === ypId);
      if (found) setPreSelectedResident(found);
    }
  }, [residents]);

  // Use staffProfile directly from context (already loaded by AppLayout)
  const myStaffProfile = staffProfile;
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile: myStaffProfile });

  const getKeyWorkerName = (residentId) => {
    const r = residents.find(x => x.id === residentId);
    if (!r?.key_worker_id) return null;
    return staff.find(s => s.id === r.key_worker_id)?.full_name || null;
  };

  const getKeyWorkerNames = (resident) => {
    const names = [];
    if (resident.key_worker_id) {
      const s = staff.find(x => x.id === resident.key_worker_id);
      if (s) names.push(s.full_name);
    }
    if (resident.team_leader_id) {
      const s = staff.find(x => x.id === resident.team_leader_id);
      if (s && !names.includes(s.full_name)) names.push(s.full_name);
    }
    return names;
  };

  const getHomeName = (homeId) => homes.find(h => h.id === homeId)?.name || "—";

  const getCurrentStatusLog = (residentId) => {
    return statusLogs
      .filter(l => l.resident_id === residentId && Array.isArray(l.flags) && l.flags.includes("current_status"))
      .sort((a, b) => (b.content?.datetime || b.date)?.localeCompare(a.content?.datetime || a.date))[0] || null;
  };

  const getNightStayLog = (residentId) => {
    return nightStayLogs
      .filter(l => l.resident_id === residentId && Array.isArray(l.flags) && l.flags.includes("night_stay") && l.date === todayStr)
      .sort((a, b) => b.date?.localeCompare(a.date))[0] || null;
  };

  const getEduAttendanceLog = (residentId) => {
    return eduAttendanceLogs
      .filter(l => l.resident_id === residentId && Array.isArray(l.flags) && l.flags.includes("edu_attendance") && l.date === todayStr)
      .sort((a, b) => b.date?.localeCompare(a.date))[0] || null;
  };

  const getMealIntakeLog = (residentId) => {
    return mealIntakeLogs
      .filter(l => l.resident_id === residentId && Array.isArray(l.flags) && l.flags.includes("meal_intake") && l.date === todayStr)
      .sort((a, b) => (b.content?.datetime || b.date)?.localeCompare(a.content?.datetime || a.date))[0] || null;
  };

  const ages = [...new Set(activeResidents.map(r => calcAge(r.dob)).filter(Boolean))].sort((a, b) => a - b);

  // Compute visible groups and tab map based on selected service
  const visibleGroups = getVisibleGroups(selectedService);
  const TAB_TO_GROUP = getTAB_TO_GROUP(visibleGroups);

  // Navigate to any tab key, resolving its group automatically (deep-link safe).
  // residentContext is tab-specific: for "support-plans" it is a resident ID;
  // for "yp" it is the resident's display_name (used to pre-set the search filter).
  const navigateToTab = (tabKey, residentContext = null) => {
    const group = getGroupForTab(tabKey, visibleGroups);
    if (group) {
      setActiveGroup(group.key);
    }
    setActiveTab(tabKey);
    if (residentContext) {
      if (tabKey === "support-plans") setSupportPlanResidentId(residentContext);
      if (tabKey === "yp") setSearch(residentContext);
    }
  };

  const handleAddDailyLog = (resident) => {
    setDailyLogModalResident(resident);
  };

  const handleViewSupportPlan = (resident) => {
    navigateToTab("support-plans", resident?.id);
  };

  const handleViewILSPlan = (resident) => {
    setILSPlanModalResident(resident);
  };

  const handleCloseSupportPlanModal = () => {
    setSupportPlanModalResident(null);
  };

  const handleCloseILSPlanModal = () => {
    setILSPlanModalResident(null);
  };

  const handleGoToSupportPlansTab = () => {
    navigateToTab("support-plans");
  };

  const handleGoToILSPlansTab = () => {
    navigateToTab("ils-plans");
  };



  // (IncidentsTab replaced by LogIncidentTab component)

  // Tasks tab
  const TasksTab = () => {
    const tasks = filterHomeId === "all"
      ? homeTasks
      : homeTasks.filter(t => t.home_id === filterHomeId);
    return (
      <div className="rounded-xl border border-border bg-card overflow-x-auto mt-4">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/10">
              <th className="text-left px-4 py-3 text-xs font-semibold">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Due Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Assigned To</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">No tasks found.</td></tr>
            ) : tasks.slice(0, 20).map((t, i) => (
              <tr key={t.id} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                <td className="px-4 py-3 text-sm font-medium">{t.title}</td>
                <td className="px-4 py-3 text-xs capitalize">{t.type}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.due_date}</td>
                <td className="px-4 py-3 text-xs">{t.assigned_to_name || "—"}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${t.status === "completed" ? "bg-green-500/10 text-green-600" : t.status === "in_progress" ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const PlaceholderTab = ({ label }) => (
    <div className="mt-4 bg-card rounded-xl border border-border p-12 text-center text-muted-foreground text-sm">{label} — coming soon.</div>
  );

  const serviceLabel = selectedService === "all" ? "All Residents" : selectedService === "outreach" ? "Outreach" : selectedService === "eighteen_plus" ? "18+ Accommodation" : "24 Hours Housing";

  // Debug log (temporary)
  if (import.meta.env.DEV) {
    console.log("[Residents debug]", {
      user,
      staffProfile,
      residentsCount: residents.length,
      selectedService,
      isError,
      error: error?.message,
    });
  }

  const content = (
    <div className="space-y-2">
      {/* Error alert */}
      {isError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <p className="font-semibold mb-1">Residents could not load</p>
          <p>{error?.message || "Unknown secure gateway error"}</p>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Residents Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Unified resident overview across all service types</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export Data
          </Button>
          {canAdd && (
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddResident(true)}>
              <Plus className="w-3.5 h-3.5" /> Add New Resident
            </Button>
          )}
        </div>
      </div>

      {/* Read-only access banner — shown when Super Admin has restricted this role to View */}
      {isReadOnly && residentPermLevel !== null && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-3">
          <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-[10px] shrink-0">i</span>
          You have <span className="font-semibold mx-1">view-only</span> access to this module. Contact your administrator to request edit access.
        </div>
      )}

      {/* Global service selector */}
      <div className="mb-3">
        <ServiceSelector selected={selectedService} onChange={handleServiceChange} />
      </div>

      {/* Error and loading states */}
      {isLoading && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground mb-4">
          Loading residents...
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-4">
          Residents could not load: {error?.message || "Unknown secure gateway error"}
        </div>
      )}

      {/* Current Status / Night Stay / Education Attendance / Meal Intake modals moved
          into YPCardExpanded.jsx (Today's Status cells). Kept commented here rather than
          deleted in case this page-level trigger point is needed again.
      {statusModal && (
        <CurrentStatusModal
          resident={statusModal.resident}
          user={user}
          existingLog={statusModal.existingLog}
          onClose={() => setStatusModal(null)}
        />
      )}

      {nightStayModal && (
        <NightStayModal
          resident={nightStayModal.resident}
          user={user}
          existingLog={nightStayModal.existingLog}
          onClose={() => setNightStayModal(null)}
        />
      )}

      {eduAttendanceModal && (
        <EducationAttendanceModal
          resident={eduAttendanceModal.resident}
          user={user}
          existingLog={eduAttendanceModal.existingLog}
          onClose={() => setEduAttendanceModal(null)}
        />
      )}

      {mealIntakeModal && (
        <MealIntakeModal
          resident={mealIntakeModal.resident}
          user={user}
          existingLog={mealIntakeModal.existingLog}
          onClose={() => setMealIntakeModal(null)}
        />
      )}
      */}

      {/* PRIMARY nav: Overview, Resident YP, then 5 groups */}
      <div className="border-b border-border overflow-x-auto pb-1 mt-2">
        <div className="flex gap-2 min-w-max px-1">
          {/* Top-level standalone tabs */}
          {TOP_TABS.map((tab) => [
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 md:px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </button>,
            <div key={`${tab.key}-div`} className="w-px bg-border mx-1 my-2" />
          ])}
          {/* Group tabs */}
          {visibleGroups.map((group, idx, arr) => {
            const isActiveGroup = activeGroup === group.key && !["overview", "yp"].includes(activeTab);
            return [
              <button
                key={group.key}
                onClick={() => {
                  setActiveGroup(group.key);
                  // navigate to first sub-tab in group only if not already in this group
                  const currentGroupKey = TAB_TO_GROUP[activeTab];
                  if (currentGroupKey !== group.key) {
                    setActiveTab(group.tabs[0].key);
                  }
                }}
                className={`px-3 md:px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${isActiveGroup ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {group.label}
              </button>,
              idx < arr.length - 1 && <div key={`${group.key}-div`} className="w-px bg-border mx-1 my-2" />
            ];
          })}
        </div>
      </div>

      {/* SECONDARY nav: sub-tabs within the active group */}
      {!["overview", "yp"].includes(activeTab) && visibleGroups.find(g => g.key === activeGroup) && (
        <div className="border-b border-border overflow-x-auto pb-1 bg-muted/20">
          <div className="flex gap-2 min-w-max px-1">
            {(visibleGroups.find(g => g.key === activeGroup)?.tabs || []).map((tab, idx, arr) => [
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 md:px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tab.label}
              </button>,
              idx < arr.length - 1 && <div key={`${tab.key}-div`} className="w-px bg-border mx-1 my-2" />
            ])}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mt-6 overflow-x-auto pb-2">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 h-10 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">From Home</span>
          <Select value={filterHomeId} onValueChange={setFilterHomeId}>
            <SelectTrigger className="border-0 shadow-none h-full text-sm font-medium p-0 focus:ring-0 bg-transparent min-w-[120px]">
              <SelectValue placeholder="All Homes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Homes</SelectItem>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {filterHomeId !== "all" && <button onClick={() => setFilterHomeId("all")} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
        </div>

        {(activeTab === "yp" || activeTab === "visit-reports") && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 h-10 shrink-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={search || "all"} onValueChange={v => setSearch(v === "all" ? "" : v)}>
              <SelectTrigger className="border-0 shadow-none h-full text-sm font-medium p-0 focus:ring-0 bg-transparent min-w-[160px]">
                <SelectValue placeholder="Select Young Person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Young People</SelectItem>
                {activeResidents.map(r => <SelectItem key={r.id} value={r.display_name}>{r.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
          </div>
        )}

        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 h-10 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Age</span>
          <Select value={filterAge} onValueChange={setFilterAge}>
            <SelectTrigger className="border-0 shadow-none h-full text-sm font-medium p-0 focus:ring-0 bg-transparent min-w-[60px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ages.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />
      </div>


      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of <span className="font-semibold text-foreground">{activeResidents.length}</span> {serviceLabel} residents
        </p>
      </div>


      {/* Home filter pills — only on YP view */}
      {activeTab === "yp" && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {[{ id: "all", name: "All homes" }, ...homes.filter(h => activeResidents.some(r => r.home_id === h.id))].map(h => (
            <button
              key={h.id}
              onClick={() => setCardFilterHome(h.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${cardFilterHome === h.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
            >
              {h.name}
            </button>
          ))}
          <button
            onClick={() => setCardFilterFlagged(v => !v)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${cardFilterFlagged ? "bg-red-600 text-white border-red-600" : "border-border text-muted-foreground hover:border-red-400 hover:text-red-600"}`}
          >
            <Flag className="w-3 h-3" /> Flagged only
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "overview" && (
        <ResidentsDashboardOverview
          residents={activeResidents}
          homes={homes}
          staff={staff}
          selectedService={selectedService}
          onNavigate={navigateToTab}
          data={{
            mfhRecords,
            exploitationRisks,
            visitReports,
            appointments: allAppointments,
            complaints: allComplaints,
            advocacyRecords,
            achievements: achievementsData,
            pathwayPlans: pathwayPlansData,
            placementPlans: placementPlansData,
            reg44Reports,
            supervisionRecords,
            medicationRecords,
            gpAppointments,
            trainingRecords,
            eetRecords,
            ypViews,
            cicReports,
            therapeuticPlans,
            familyContacts,
            riskAssessments,
            supportPlanSignoffs,
            laReviews,
            reg45Reviews,
            carePlans,
          }}
        />
      )}
      {activeTab === "incidents" && (
        <LogIncidentTab
          residents={filtered}
          homes={homes}
          staff={staff}
          user={user}
          staffProfile={myStaffProfile}
          isAdminOrTL={canEdit}
          accidents={accidents}
        />
      )}
      {activeTab === "tasks" && <TasksTab />}
      {activeTab === "activities" && <PlaceholderTab label="Activities" />}
      {activeTab === "risk-behaviour" && <ExploitationRiskTab residents={filtered} homes={homes} staff={staff} user={user} isAdminOrTL={canEdit} />}
      {activeTab === "risk-assessment" && (
        <RiskTab
          residents={filtered}
          homes={homes}
          staff={staff}
          user={user}
          staffProfile={myStaffProfile}
          isAdminOrTL={canEdit}
        />
      )}
      {activeTab === "family-contact" && <FamilyContactTab residents={filtered} homes={homes} staff={staff} user={user} isAdminOrTL={canEdit} />}
      {activeTab === "placement-plan" && <PlacementPlanTab residents={filtered} homes={homes} staff={staff} user={user} myStaffProfile={myStaffProfile} isAdminOrTL={canEdit} />}
      {activeTab === "pathway-plan" && <PathwayPlanTab residents={filtered} homes={homes} staff={staff} user={user} />}
      {activeTab === "complaints" && <ComplaintsTab residents={filtered} homes={homes} staff={staff} user={user} isAdminOrTL={canEdit} complaints={allComplaints} />}
      {activeTab === "achievements" && <AchievementsTab residents={filtered} homes={homes} staff={staff} user={user} />}
      {activeTab === "health" && <HealthTab residents={filtered} user={user} staff={staff} homes={homes} staffProfile={myStaffProfile} />}
      {activeTab === "missing" && <MissingTab residents={filtered} homes={homes} staff={staff} user={user} staffProfile={myStaffProfile} isAdminOrTL={canEdit} mfhRecords={mfhRecords} />}
      {activeTab === "education-records" && <EducationRecordTab residents={filtered} homes={homes} isAdminOrTL={canEdit} />}
      {activeTab === "employment-records" && <EmploymentRecordTab residents={filtered} homes={homes} isAdminOrTL={canEdit} />}
      {activeTab === "neet-records" && <NEETRecordTab residents={filtered} homes={homes} staff={staff} isAdminOrTL={canEdit} />}
      {activeTab === "leisure" && <LeisureTab residents={filtered} />}
      {activeTab === "finance" && <FinanceLegalTab residents={filtered} homes={homes} />}
      {activeTab === "council-tax" && (
        <CouncilTaxExemptionTab
          residents={filtered}
          homes={homes}
          staff={staff}
          user={user}
          isAdminOrTL={canEdit}
        />
      )}
      {activeTab === "housing" && <PlaceholderTab label="Housing & Transitions" />}
      {activeTab === "daily-logs-tab" && (
        <div className="mt-4 space-y-4">
          {/* Resident selector */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Viewing logs for:</span>
              <select
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                value={preSelectedResident?.id || filtered[0]?.id || ""}
                onChange={e => setPreSelectedResident(filtered.find(r => r.id === e.target.value))}
              >
                {filtered.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
              </select>
            </div>
          )}
          {filtered.length > 0 && (
            <DailyLogTimeline
              resident={preSelectedResident || filtered[0]}
              staffProfile={myStaffProfile}
              user={user}
            />
          )}
          {filtered.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground text-sm">No young people found for selected filters.</div>
          )}
        </div>
      )}

      {activeTab === "visit-reports" && (
        <VisitReportsTab staffProfile={myStaffProfile} staff={staff} residents={filtered} homes={homes} user={user} />
      )}

      {activeTab === "welcome-pack" && (
        <WelcomePackTab resident={filtered[0]} staffProfile={myStaffProfile} homes={homes} user={user} />
      )}

      {activeTab === "moveon" && (
        <MoveOnTabMain residents={filtered} homes={homes} staff={staff} user={user} />
      )}

      {activeTab === "pa-details" && (
        <PADetailsSubTab residents={filtered} homes={homes} staff={staff} />
      )}

      {activeTab === "pa-la-reviews" && (
        <PAVisitsLAReviewsTab residents={filtered} homes={homes} staff={staff} />
      )}

      {activeTab === "benefits" && isAdminOrTL && (
        <BenefitsTabMain residents={filtered} homes={homes} />
      )}

      {activeTab === "appointments" && (
        <AppointmentsTab
          residents={filtered}
          homes={homes}
          staff={staff}
          user={user}
          staffProfile={myStaffProfile}
          isAdmin={isAdmin}
          isAdminOrTL={canEdit}
        />
      )}
      {activeTab === "education-records" && (
        <EducationTab residents={filtered} />
      )}
      {activeTab === "referrals" && <ReferralsTab residents={filtered} homes={homes} staff={staff} user={user} staffProfile={myStaffProfile} isAdminOrTL={canEdit} />}
      {activeTab === "legal-restrictions" && <LegalRestrictionsTab residents={filtered} homes={homes} staff={staff} isAdminOrTL={canEdit} staffProfile={myStaffProfile} user={user} />}
      {activeTab === "yp-voice" && <YPVoiceReadOnly residents={filtered} />}
      {activeTab === "external-support" && filtered.length > 0 && <ExternalSupportTab residentId={filtered[0].id} residentName={filtered[0].display_name} isAdminOrTL={canEdit} />}

      {activeTab === "behaviour-management" && <BehaviourManagementTabContent residents={filtered} myStaffProfile={myStaffProfile} isAdminOrTL={canEdit} />}
      {activeTab === "therapeutic-plan" && <TherapeuticPlanTabContent residents={filtered} myStaffProfile={myStaffProfile} isAdminOrTL={canEdit} />}

      {/* 24h Residential Tabs */}
      {activeTab === "shifts" && (
        <div className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-4">My Shifts</h3>
            {allShifts.filter(s => s.staff_id === myStaffProfile?.id || s.worker_id === user?.email).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No shifts assigned to you.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="text-left px-4 py-2 text-xs font-semibold">Date</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold">Home</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold">Time</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold">Duration</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allShifts
                      .filter(s => s.staff_id === myStaffProfile?.id || s.worker_id === user?.email)
                      .slice(0, 20)
                      .map((shift, i) => {
                        const home = homes.find(h => h.id === shift.home_id);
                        const startTime = new Date(shift.start_datetime);
                        const endTime = new Date(shift.end_datetime);
                        const durationHours = (endTime - startTime) / (1000 * 60 * 60);
                        return (
                          <tr key={shift.id} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                            <td className="px-4 py-2 text-sm">{new Date(shift.start_datetime).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-sm">{home?.name || "—"}</td>
                            <td className="px-4 py-2 text-sm">{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-4 py-2 text-sm">{durationHours.toFixed(1)}h</td>
                            <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shift.status === "confirmed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>{shift.status || "pending"}</span></td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === "shifts-rota" && (
        <div className="mt-4">
          <Shifts />
        </div>
      )}
      {activeTab === "visitor-log" && (
        <div className="space-y-4 mt-4">
          {homes.length > 1 && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Select Home:</label>
              <select
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card outline-none focus:ring-1 focus:ring-ring"
                value={selectedHomeIdForVisitors || homes[0]?.id || ""}
                onChange={e => setSelectedHomeIdForVisitors(e.target.value)}
              >
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}
          {selectedHomeIdForVisitors || homes[0] ? (
            <VisitorLogTab
              home={homes.find(h => h.id === (selectedHomeIdForVisitors || homes[0]?.id))}
              visitorLogs={visitorLogs.filter(v => v.home_id === (selectedHomeIdForVisitors || homes[0]?.id))}
              residents={activeResidents}
              staff={staff}
              user={user}
            />
          ) : null}
        </div>
      )}

      {/* YP CARD VIEW */}
      {activeTab === "yp" && (
        <YPCardView
          residents={filtered}
          homes={homes}
          staff={staff}
          dailyLogs={[...statusLogs]}
          visitReports={visitReports}
          accidents={accidents}
          homeTasks={homeTasks}
          transitions={transitions}
          supportPlans={supportPlans}
          ilsPlans={ilsPlans}
          filterHomeId={cardFilterHome}
          filterFlagged={cardFilterFlagged}
          onNavigateSP={() => { }}
          onNavigateILS={() => { }}
          isAdminOrTL={canEdit}
          myStaffProfile={myStaffProfile}
          onAddDailyLog={handleAddDailyLog}
          onViewSupportPlan={handleViewSupportPlan}
          onViewILSPlan={handleViewILSPlan}
          appointments={allAppointments}
        />
      )}

      {/* SUPPORT PLANS TAB */}
      {activeTab === "support-plans" && (
        <SupportPlansTab
          residents={filtered}
          homes={homes}
          staff={staff}
          isAdminOrTL={canEdit}
          myStaffProfile={myStaffProfile}
          defaultResidentId={supportPlanResidentId}
          onNavigateToTab={navigateToTab}
        />
      )}

      {/* ILS PLANS TAB */}
      {activeTab === "ils-plans" && (
        <ILSPlansTab
          residents={filtered}
          homes={homes}
          staff={staff}
          isAdminOrTL={canEdit}
          myStaffProfile={myStaffProfile}
          defaultResidentId={null}
        />
      )}

      {/* MODALS */}
      {ilsPlanModalResident && (
        <ILSPlanModal
          resident={ilsPlanModalResident}
          home={homes.find(h => h.id === ilsPlanModalResident.home_id)}
          onClose={handleCloseILSPlanModal}
          onGoToTab={handleGoToILSPlansTab}
        />
      )}

      {/* Add New Resident Modal */}
      {showAddResident && (
        <ResidentForm
          homes={homes}
          staff={staff}
          saving={savingResident}
          defaultServiceType={selectedService !== "all" ? selectedService : ""}
          onClose={() => setShowAddResident(false)}
          onSubmit={async (formData) => {
            setSavingResident(true);
            const created = await secureGateway.create("Resident", formData);

            triggerWorkflow({
              workflowType: "resident_creation",
              entityId:     created?.id,
              entityRef:    created?.id ? `YP-${created.id.slice(0, 8)}` : "",
              title:        `New resident — ${formData.display_name}`,
              description:  `${formData.service_type?.replace(/_/g, " ") || "Resident"} profile created at ${homes.find(h => h.id === formData.home_id)?.name || "unspecified home"}.`,
              homeId:       formData.home_id,
              homeName:     homes.find(h => h.id === formData.home_id)?.name || "",
              priority:     "routine",
            });
            
            // Part B — auto-create Reg 28 admission draft if placement_start is set
            if (formData.placement_start && formData.home_id) {
              try {
                const homeRecord = homes.find(h => h.id === formData.home_id);
                await secureGateway.create("AdmissionDischargeNotice", {
                  org_id: ORG_ID,
                  home_id: formData.home_id,
                  home_name: homeRecord?.name || "",
                  home_address: homeRecord?.address || "",
                  resident_id: created?.id || "",
                  resident_name: formData.display_name || "",
                  notice_type: "admission",
                  child_name: formData.full_name || formData.display_name || "",
                  child_dob: formData.dob || "",
                  accommodating_authority_name: formData.placing_local_authority || "",
                  iro_or_pa_name: formData.iro_name || "",
                  iro_or_pa_contact: formData.iro_contact || "",
                  admission_date: formData.placement_start,
                  status: "draft",
                  created_by_id: staffProfile?.id,
                  created_by_name: staffProfile?.full_name,
                });
                // Notify TL and admin officer
                const homeStaff = staff.filter(s =>
                  ["team_leader", "admin_officer", "admin_manager"].includes(s.role) &&
                  s.user_id &&
                  ((s.home_ids && s.home_ids.includes(formData.home_id)) || s.primary_home_id === formData.home_id)
                );
                for (const s of homeStaff) {
                  await createNotification({
                    recipient_user_id: s.user_id,
                    org_id: ORG_ID,
                    title: `Reg 28 Notice Required — ${formData.display_name} admitted`,
                    body: `A written admission notice must be sent to the local authority for the area where ${homeRecord?.name || "the home"} is located. Open the Reg 28 log to complete and record this.`,
                    type: "general",
                    link: "/compliance-hub?report=reg28",
                    priority: "high",
                  });
                }
              } catch (reg28Err) {
                console.warn("[Residents] Reg 28 auto-draft failed (non-fatal):", reg28Err);
              }
            }
            setSavingResident(false);
            setShowAddResident(false);
            toast.success("Young person added successfully!");
            queryClient.invalidateQueries({ queryKey: ["all-residents"] });
          }}
        />
      )}

      {/* Daily Log Modal — triggered from YP card */}
      {dailyLogModalResident && (
        <DailyLogModal
          resident={dailyLogModalResident}
          staffProfile={myStaffProfile}
          onClose={() => setDailyLogModalResident(null)}
          onSaved={() => { setDailyLogModalResident(null); queryClient.invalidateQueries({ queryKey: ["all-daily-logs"] }); }}
        />
      )}
    </div>
  );

  // Wrap with PullToRefresh on mobile, render directly on desktop
  if (isMobile) {
    return (
      <PullToRefresh onRefresh={() => queryClient.refetchQueries()}>
        {content}
      </PullToRefresh>
    );
  }

  return content;
}