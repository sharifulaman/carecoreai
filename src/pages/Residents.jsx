import { useState, useMemo, useEffect } from "react";
import { useOutletContext, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Pencil, X, Filter, LayoutList, LayoutGrid, Flag, Calendar, AlertTriangle } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import CurrentStatusModal from "../components/residents/CurrentStatusModal";
import NightStayModal from "../components/residents/NightStayModal";
import EducationAttendanceModal from "../components/residents/EducationAttendanceModal";
import MealIntakeModal from "../components/residents/MealIntakeModal";
import ResidentMobileCard from "../components/residents/ResidentMobileCard";
import YPCardView from "../components/residents/yp/YPCardView";
import SupportPlansTab from "../components/residents/yp/SupportPlansTab";
import ILSPlansTab from "../components/residents/yp/ILSPlansTab";
import VisitReportsTab from "../components/residents/VisitReportsTab";

import ILSPlanModal from "../components/residents/modals/ILSPlanModal";
import AppointmentsTab from "../components/residents/appointments/AppointmentsTab";
import YPDashboard from "../components/residents/yp/YPDashboard";
import YPOverviewDashboard from "../components/compliance/YPOverviewDashboard";
import EducationTab from "../components/residents/education/EducationTab";
import HealthTab from "../components/residents/health/HealthTab";
import LeisureTab from "../components/residents/leisure/LeisureTab";
import FinanceLegalTab from "../components/residents/finance/FinanceLegalTab";
import MissingTab from "../components/residents/missing/MissingTab";
import FamilyContactTab from "../components/residents/family/FamilyContactTab";
import ExploitationRiskTab from "../components/residents/risk/ExploitationRiskTab";
import RiskTab from "../components/residents/risk/RiskTab";
import BehaviourManagementForm from "../components/residents/behaviour/BehaviourManagementForm";
import TherapeuticPlanForm from "../components/residents/behaviour/TherapeuticPlanForm";

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
      {selR && <div className="bg-card border border-border rounded-xl p-6"><TherapeuticPlanForm residentId={selR.id} homeId={selR.home_id} staffProfile={myStaffProfile} readOnly={!isAdminOrTL} /></div>}
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
import DailyLogModal from "../components/daily-logs/DailyLogModal";
import DailyLogTimeline from "../components/daily-logs/DailyLogTimeline";
import JourneyLifeStoryTab from "../components/journey/JourneyLifeStoryTab";


// Two-level navigation: 2 top-level tabs + 5 groups, each with sub-tabs
const TOP_TABS = [
  { key: "overview", label: "Overview" },
  { key: "yp", label: "Resident Young People" },
];

const GROUPS = [
  {
    key: "care-planning",
    label: "Care & Planning",
    tabs: [
      { key: "support-plans", label: "Support Plans" },
      { key: "placement-plan", label: "Placement Plan" },
      { key: "pathway-plan", label: "Pathway Plan (16+)" },
      { key: "ils-plans", label: "ILS Plans" },
      { key: "referrals", label: "Referrals" },
    ],
  },
  {
    key: "safety",
    label: "Safety & Safeguarding",
    tabs: [
      { key: "risk-assessment", label: "Risk Assessment" },
      { key: "behaviour-management", label: "Behaviour Management" },
      { key: "incidents", label: "Incident Logs" },
      { key: "missing", label: "Missing" },
    ],
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
  },
  {
    key: "life-community",
    label: "Life & Community",
    tabs: [
      { key: "education", label: "Education" },
      { key: "finance-legal", label: "Finance & Legal" },
      { key: "housing", label: "Housing & Transitions" },
      { key: "family-contact", label: "Family Contact" },
      { key: "appointments", label: "Appointments" },
    ],
  },
  {
    key: "records",
    label: "Records & Compliance",
    tabs: [
      { key: "daily-logs-tab", label: "Daily Logs" },
      { key: "visit-reports", label: "Visit Reports / Logs" },
      { key: "welcome-pack", label: "Welcome Pack" },
      { key: "complaints", label: "Complaints & Representations" },
      { key: "journey-life-story", label: "Journey & Life Story" },
    ],
  },
];

// Map any tab key → its group key (for deep-link resolution)
const TAB_TO_GROUP = {};
GROUPS.forEach(g => g.tabs.forEach(t => { TAB_TO_GROUP[t.key] = g.key; }));

// Derive the group that owns a given activeTab
function getGroupForTab(tabKey) {
  return GROUPS.find(g => g.tabs.some(t => t.key === tabKey)) || null;
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Force refresh all compliance data on mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["mfh-records"] });
    queryClient.invalidateQueries({ queryKey: ["complaints"] });
  }, [queryClient]);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeGroup, setActiveGroup] = useState("care-planning");
  const [search, setSearch] = useState("");
  const [filterHomeId, setFilterHomeId] = useState("all");
  const [filterAge, setFilterAge] = useState("all");
  const [cardFilterHome, setCardFilterHome] = useState("all");
  const [cardFilterFlagged, setCardFilterFlagged] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [nightStayModal, setNightStayModal] = useState(null);
  const [eduAttendanceModal, setEduAttendanceModal] = useState(null);
  const [mealIntakeModal, setMealIntakeModal] = useState(null);
  const [preSelectedResident, setPreSelectedResident] = useState(null);
  const [supportPlanModalResident, setSupportPlanModalResident] = useState(null);
  const [ilsPlanModalResident, setILSPlanModalResident] = useState(null);
  const [dailyLogModalResident, setDailyLogModalResident] = useState(null);

  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isAdmin = staffRole === "admin";
  const isAdminOrTL = isAdmin || staffRole === "team_leader";

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["all-residents"],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: visitReports = [] } = useQuery({
    queryKey: ["reports-recent"],
    queryFn: () => secureGateway.filter("VisitReport", {}, "-date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ["daily-logs-recent"],
    queryFn: () => base44.entities.DailyLog.filter({ org_id: ORG_ID }, "-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: accidents = [] } = useQuery({
    queryKey: ["accidents", "all"],
    queryFn: () => secureGateway.filter("AccidentReport", {}, "-date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homeTasks = [] } = useQuery({
    queryKey: ["home-tasks-all"],
    queryFn: () => secureGateway.filter("HomeTask", {}, "-due_date", 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: transitions = [] } = useQuery({
    queryKey: ["transitions-all"],
    queryFn: () => secureGateway.filter("Transition"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: supportPlans = [] } = useQuery({
    queryKey: ["support-plans"],
    queryFn: () => secureGateway.filter("SupportPlan"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ilsPlans = [] } = useQuery({
    queryKey: ["ils-plans"],
    queryFn: () => secureGateway.filter("ILSPlan"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => secureGateway.filter("Appointment", {}, "-start_datetime", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: mfhRecords = [] } = useQuery({
    queryKey: ["mfh-records"],
    queryFn: () => base44.entities.MissingFromHome.filter({}, "-reported_missing_datetime", 500),
    staleTime: 0,
  });

  const { data: bodyMaps = [] } = useQuery({
    queryKey: ["body-maps"],
    queryFn: () => secureGateway.filter("BodyMap", {}, "-recorded_datetime", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allComplaints = [] } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => secureGateway.filter("Complaint", {}, "-received_datetime", 500),
    staleTime: 0,
  });

  const { data: significantEvents = [] } = useQuery({
    queryKey: ["significant-events"],
    queryFn: () => secureGateway.filter("SignificantEvent", {}, "-event_datetime", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: reg44Reports = [] } = useQuery({
    queryKey: ["reg44-reports"],
    queryFn: () => secureGateway.filter("Reg44Report", {}, "-visit_date", 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: supervisionRecords = [] } = useQuery({
    queryKey: ["supervision-records"],
    queryFn: () => secureGateway.filter("SupervisionRecord", {}, "-supervision_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: medicationRecords = [] } = useQuery({
    queryKey: ["medication-records"],
    queryFn: () => secureGateway.filter("MedicationRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: gpAppointments = [] } = useQuery({
    queryKey: ["gp-appointments"],
    queryFn: () => secureGateway.filter("GPAppointment", {}, "-appointment_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: eetRecords = [] } = useQuery({
    queryKey: ["eet-records"],
    queryFn: () => secureGateway.filter("EETRecord", {}, "-recorded_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: achievementsData = [] } = useQuery({
    queryKey: ["achievements-all"],
    queryFn: () => secureGateway.filter("Achievement", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: advocacyRecords = [] } = useQuery({
    queryKey: ["advocacy-records"],
    queryFn: () => secureGateway.filter("AdvocacyRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ypViews = [] } = useQuery({
    queryKey: ["yp-views"],
    queryFn: () => secureGateway.filter("YPViewsRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: cicReports = [] } = useQuery({
    queryKey: ["cic-reports"],
    queryFn: () => secureGateway.filter("CICReport", {}, "-created_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: therapeuticPlans = [] } = useQuery({
    queryKey: ["therapeutic-plans"],
    queryFn: () => secureGateway.filter("TherapeuticPlan", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: familyContacts = [] } = useQuery({
    queryKey: ["family-contacts-all"],
    queryFn: () => secureGateway.filter("FamilyContact", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["risk-assessments-all"],
    queryFn: () => secureGateway.filter("RiskAssessment", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: exploitationRisks = [] } = useQuery({
    queryKey: ["exploitation-risks-all"],
    queryFn: () => secureGateway.filter("ExploitationRisk", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ["training-records-all"],
    queryFn: () => secureGateway.filter("TrainingRecord", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: pathwayPlansData = [] } = useQuery({
    queryKey: ["pathway-plans-all"],
    queryFn: () => secureGateway.filter("PathwayPlan", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: placementPlansData = [] } = useQuery({
    queryKey: ["placement-plans-all"],
    queryFn: () => secureGateway.filter("PlacementDetails", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: supportPlanSignoffs = [] } = useQuery({
    queryKey: ["support-plan-signoffs"],
    queryFn: () => secureGateway.filter("SupportPlanSignoff", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: laReviews = [] } = useQuery({
    queryKey: ["la-reviews"],
    queryFn: () => secureGateway.filter("LAReview", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: reg45Reviews = [] } = useQuery({
    queryKey: ["reg45-reviews"],
    queryFn: () => secureGateway.filter("Reg45Review", {}, "-created_date", 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ["care-plans-all"],
    queryFn: () => secureGateway.filter("CarePlan", {}, "-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const myStaffProfile = useMemo(() => staff.find(s => s.user_id === user?.id), [staff, user]);

  // All daily logs — shared across status, night stay, edu attendance, meal intake
  const { data: allDailyLogs = [] } = useQuery({
    queryKey: ["all-daily-logs"],
    queryFn: () => secureGateway.filter("DailyLog", {}, "-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Alias all four to the same data — eliminates 3 duplicate gateway calls
  const statusLogs = allDailyLogs;
  const nightStayLogs = allDailyLogs;
  const eduAttendanceLogs = allDailyLogs;
  const mealIntakeLogs = allDailyLogs;

  const activeResidents = residents.filter(r => r.status === "active");

  const filtered = activeResidents.filter(r => {
    const matchSearch = !search || r.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchHome = filterHomeId === "all" || r.home_id === filterHomeId;
    const age = calcAge(r.dob);
    const matchAge = filterAge === "all" || (age !== null && String(age) === filterAge);
    return matchSearch && matchHome && matchAge;
  });

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

  // Navigate to any tab key, resolving its group automatically (deep-link safe)
  const navigateToTab = (tabKey) => {
    const group = getGroupForTab(tabKey);
    if (group) {
      setActiveGroup(group.key);
      // ensure the group's active sub-tab is set
    }
    setActiveTab(tabKey);
  };

  const handleAddDailyLog = (resident) => {
    setDailyLogModalResident(resident);
  };

  const handleViewSupportPlan = (resident) => {
    navigateToTab("support-plans");
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
    const tasks = filterHomeId === "all" ? homeTasks : homeTasks.filter(t => t.home_id === filterHomeId);
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

  return (
    <div className="space-y-0">
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

      {/* PRIMARY nav: Overview, Resident YP, then 5 groups */}
      <div className="border-b border-border overflow-x-auto scrollbar-none">
        <div className="flex gap-0 min-w-max">
          {/* Top-level standalone tabs */}
          {TOP_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 md:px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
          {/* Divider */}
          <div className="w-px bg-border mx-1 my-2" />
          {/* Group tabs */}
          {GROUPS.map(group => {
            const isActiveGroup = activeGroup === group.key && !["overview", "yp"].includes(activeTab);
            return (
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
              </button>
            );
          })}
        </div>
      </div>

      {/* SECONDARY nav: sub-tabs within the active group */}
      {!["overview", "yp"].includes(activeTab) && GROUPS.find(g => g.key === activeGroup) && (
        <div className="border-b border-border overflow-x-auto scrollbar-none bg-muted/20">
          <div className="flex gap-0 min-w-max">
            {(GROUPS.find(g => g.key === activeGroup)?.tabs || []).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 md:px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}



      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mt-3 overflow-x-auto">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 h-9 shrink-0">
          <span className="text-xs text-muted-foreground">From Home</span>
          <Select value={filterHomeId} onValueChange={setFilterHomeId}>
            <SelectTrigger className="border-0 shadow-none h-7 text-sm font-medium p-0 focus:ring-0 bg-transparent min-w-[120px]">
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
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 h-9">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={search || "all"} onValueChange={v => setSearch(v === "all" ? "" : v)}>
              <SelectTrigger className="border-0 shadow-none h-7 text-sm font-medium p-0 focus:ring-0 bg-transparent min-w-[160px]">
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Age</span>
          <Select value={filterAge} onValueChange={setFilterAge}>
            <SelectTrigger className="h-9 text-xs w-20"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ages.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />
      </div>

      {/* Count */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {activeResidents.length} YP</p>
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
        <YPOverviewDashboard
          residents={filtered}
          homes={homes}
          staff={staff}
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
          isAdminOrTL={isAdminOrTL}
          accidents={accidents}
        />
      )}
      {activeTab === "tasks" && <TasksTab />}
      {activeTab === "activities" && <PlaceholderTab label="Activities" />}
      {activeTab === "risk-behaviour" && <ExploitationRiskTab residents={filtered} homes={homes} staff={staff} user={user} isAdminOrTL={isAdminOrTL} />}
      {activeTab === "risk-assessment" && (
        <RiskTab
          residents={filtered}
          homes={homes}
          staff={staff}
          user={user}
          staffProfile={myStaffProfile}
          isAdminOrTL={isAdminOrTL}
        />
      )}
      {activeTab === "family-contact" && <FamilyContactTab residents={filtered} homes={homes} staff={staff} user={user} isAdminOrTL={isAdminOrTL} />}
      {activeTab === "placement-plan" && <PlacementPlanTab residents={filtered} homes={homes} staff={staff} user={user} />}
      {activeTab === "pathway-plan" && <PathwayPlanTab residents={filtered} homes={homes} staff={staff} user={user} />}
      {activeTab === "complaints" && <ComplaintsTab residents={filtered} homes={homes} staff={staff} user={user} isAdminOrTL={isAdminOrTL} complaints={allComplaints} />}
      {activeTab === "achievements" && <AchievementsTab residents={filtered} homes={homes} staff={staff} user={user} />}
      {activeTab === "health" && <HealthTab residents={filtered} user={user} staff={staff} />}
      {activeTab === "missing" && <MissingTab residents={filtered} homes={homes} staff={staff} user={user} isAdminOrTL={isAdminOrTL} mfhRecords={mfhRecords} />}
      {activeTab === "education" && (
        <EducationTab residents={filtered} />
      )}
      {activeTab === "leisure" && <LeisureTab residents={filtered} />}
      {activeTab === "finance-legal" && <FinanceLegalTab residents={filtered} />}
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
        <VisitReportsTab />
      )}

      {activeTab === "welcome-pack" && (
        <WelcomePackTab resident={filtered[0]} staffProfile={myStaffProfile} homes={homes} user={user} />
      )}

      {activeTab === "appointments" && (
        <AppointmentsTab
          residents={filtered}
          homes={homes}
          staff={staff}
          user={user}
          staffProfile={myStaffProfile}
          isAdmin={isAdmin}
          isAdminOrTL={isAdminOrTL}
        />
      )}
      {activeTab === "education-records" && (
        <EducationTab residents={filtered} />
      )}
      {activeTab === "referrals" && <PlaceholderTab label="Referrals" />}

      {activeTab === "journey-life-story" && (
        <div className="mt-4 space-y-4">
          {filtered.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Viewing journey for:</span>
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
            <JourneyLifeStoryTab
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


      {activeTab === "behaviour-management" && <BehaviourManagementTabContent residents={filtered} myStaffProfile={myStaffProfile} isAdminOrTL={isAdminOrTL} />}
      {activeTab === "therapeutic-plan" && <TherapeuticPlanTabContent residents={filtered} myStaffProfile={myStaffProfile} isAdminOrTL={isAdminOrTL} />}

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
          onNavigateSP={() => {}}
          onNavigateILS={() => {}}
          isAdminOrTL={isAdminOrTL}
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
          isAdminOrTL={isAdminOrTL}
          myStaffProfile={myStaffProfile}
          defaultResidentId={null}
          onNavigateToTab={navigateToTab}
        />
      )}

      {/* ILS PLANS TAB */}
      {activeTab === "ils-plans" && (
        <ILSPlansTab
          residents={filtered}
          homes={homes}
          staff={staff}
          isAdminOrTL={isAdminOrTL}
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
}