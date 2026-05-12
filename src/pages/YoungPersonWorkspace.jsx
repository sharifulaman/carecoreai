import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, Search, Bell, MessageSquare, ChevronDown,
  AlertTriangle, ShieldAlert, Calendar, GraduationCap,
  MapPin, Zap, ChevronRight, FileText, User, AlertCircle,
  Heart, Users, Pill, Award
} from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";

function calcAgeDetailed(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  const years = differenceInYears(now, d);
  const months = differenceInMonths(now, d) % 12;
  return `${years} years ${months} months`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, color, onClick }) {
  const colors = {
    red:   { bg: "bg-red-50",   border: "border-red-100",   icon: "text-red-400",   val: "text-red-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-400", val: "text-amber-700" },
    teal:  { bg: "bg-teal-50",  border: "border-teal-100",  icon: "text-teal-400",  val: "text-teal-700" },
    blue:  { bg: "bg-blue-50",  border: "border-blue-100",  icon: "text-blue-400",  val: "text-blue-700" },
    green: { bg: "bg-green-50", border: "border-green-100", icon: "text-green-400", val: "text-green-700" },
    slate: { bg: "bg-white",    border: "border-slate-200", icon: "text-slate-300", val: "text-slate-700" },
  };
  const c = colors[color] || colors.slate;
  return (
    <button onClick={onClick} className={`${c.bg} ${c.border} border rounded-2xl p-4 text-left hover:shadow-md transition-all group w-full`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${c.icon}`} />
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
      <div className={`text-3xl font-bold ${c.val} leading-none`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-1.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      <div className="text-xs text-teal-600 font-medium mt-3">View all →</div>
    </button>
  );
}

// ── Badge pill ────────────────────────────────────────────────────────────────
function BadgePill({ icon: Icon, label, value, color }) {
  const colors = {
    red:   "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    teal:  "bg-teal-50 text-teal-700 border-teal-200",
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colors[color] || colors.slate}`}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</div>
        <div className="text-xs font-bold mt-0.5">{value || "—"}</div>
      </div>
    </div>
  );
}

// ── Care summary row ──────────────────────────────────────────────────────────
function CareSummaryRow({ label, lastReviewed, status }) {
  const cfg = {
    "Up to date": "bg-green-100 text-green-700",
    "Review due": "bg-amber-100 text-amber-700",
    "Overdue":    "bg-red-100 text-red-700",
    "Not started":"bg-slate-100 text-slate-500",
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="text-sm font-medium text-slate-700 min-w-[150px]">{label}</div>
      <div className="text-xs text-slate-400 flex-1 px-3 truncate">
        {lastReviewed ? `Last reviewed ${format(new Date(lastReviewed), "dd MMM yyyy")}` : "Not recorded"}
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${cfg[status] || cfg["Not started"]}`}>{status}</span>
    </div>
  );
}

// ── Activity row ──────────────────────────────────────────────────────────────
function ActivityRow({ type, datetime, by, severity }) {
  const typeMap = {
    "Daily Log":       { icon: FileText,      color: "bg-blue-100 text-blue-600" },
    "Incident":        { icon: AlertTriangle, color: "bg-red-100 text-red-600" },
    "Key Worker Session": { icon: User,       color: "bg-teal-100 text-teal-600" },
    "Family Contact":  { icon: Users,         color: "bg-purple-100 text-purple-600" },
    "Appointment":     { icon: Calendar,      color: "bg-green-100 text-green-600" },
    "Missing Episode": { icon: MapPin,        color: "bg-red-100 text-red-600" },
    "Complaint":       { icon: AlertCircle,   color: "bg-orange-100 text-orange-600" },
  };
  const cfg = typeMap[type] || { icon: FileText, color: "bg-slate-100 text-slate-500" };
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{type}</div>
        <div className="text-xs text-slate-400">{datetime ? format(new Date(datetime), "dd MMM yyyy, HH:mm") : "—"}{by ? ` · ${by}` : ""}</div>
      </div>
      {severity && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${severity === "High" || severity === "high" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>{severity}</span>
      )}
    </div>
  );
}

// ── Timeline item ─────────────────────────────────────────────────────────────
function TimelineItem({ icon: Icon, color, title, time, by, last }) {
  const colors = { blue: "bg-blue-100 text-blue-600", red: "bg-red-100 text-red-600", teal: "bg-teal-100 text-teal-600", purple: "bg-purple-100 text-purple-600", amber: "bg-amber-100 text-amber-600", green: "bg-green-100 text-green-600" };
  return (
    <div className="flex gap-3 pb-3">
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${colors[color] || colors.blue}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!last && <div className="w-px flex-1 bg-slate-100 mt-1 min-h-[12px]" />}
      </div>
      <div className="flex-1 min-w-0 pt-0.5 pb-1">
        <p className="text-xs font-semibold text-slate-700">{title}</p>
        <p className="text-xs text-slate-400">{time}</p>
        {by && <p className="text-xs text-slate-400">by {by}</p>}
      </div>
    </div>
  );
}

// ── Daily Log import ──────────────────────────────────────────────────────────
import DailyLogModal from "@/components/daily-logs/DailyLogModal";
import DailyLogTimeline from "@/components/daily-logs/DailyLogTimeline";
import JourneyLifeStoryTab from "@/components/journey/JourneyLifeStoryTab";
import { Map } from "lucide-react";

// ── Mini-tab panel ────────────────────────────────────────────────────────────
function MiniTabPanel({ tabs, children }) {
  const [active, setActive] = useState(tabs[0]);
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-0 border-b border-slate-100 overflow-x-auto scrollbar-none mb-3">
        {tabs.map(t => (
          <button key={t} onClick={() => setActive(t)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${active === t ? "border-teal-500 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >{t}</button>
        ))}
      </div>
      <div className="flex-1">
        {children(active)}
      </div>
    </div>
  );
}

// ── Section preview card ──────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 pt-4 pb-0">
        <h3 className="text-sm font-bold text-slate-800 mb-3">{title}</h3>
      </div>
      <div className="flex-1 px-5 pb-4 overflow-hidden">{children}</div>
    </div>
  );
}

function ViewAll({ label = "View all", onClick }) {
  return (
    <button onClick={onClick} className="text-xs text-teal-600 font-semibold hover:underline mt-3 block">{label} →</button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function YoungPersonWorkspace() {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const { user, staffProfile } = useOutletContext();
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [showDailyLogTimeline, setShowDailyLogTimeline] = useState(false);
  const [activeSection, setActiveSection] = useState("overview"); // "overview" | "journey"

  const { data: resident } = useQuery({ queryKey: ["resident", residentId], queryFn: () => secureGateway.filter("Resident", { id: residentId }), select: d => d?.[0] || null, enabled: !!residentId });
  const { data: homes = [] } = useQuery({ queryKey: ["homes"], queryFn: () => secureGateway.filter("Home", { status: "active" }), staleTime: 5 * 60 * 1000 });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => secureGateway.filter("StaffProfile"), staleTime: 5 * 60 * 1000 });
  const { data: accidents = [] } = useQuery({ queryKey: ["accidents-ws", residentId], queryFn: () => secureGateway.filter("AccidentReport", {}, "-date", 100), staleTime: 2 * 60 * 1000, enabled: !!residentId, select: d => d.filter(a => a.resident_id === residentId) });
  const { data: riskAssessments = [] } = useQuery({ queryKey: ["risk-ws", residentId], queryFn: () => secureGateway.filter("RiskAssessment", {}, "-created_date", 200), staleTime: 2 * 60 * 1000, enabled: !!residentId, select: d => d.filter(r => r.resident_id === residentId) });
  const { data: mfhRecords = [] } = useQuery({ queryKey: ["mfh-ws", residentId], queryFn: () => base44.entities.MissingFromHome.filter({}, "-reported_missing_datetime", 100), staleTime: 2 * 60 * 1000, enabled: !!residentId, select: d => d.filter(m => m.resident_id === residentId) });
  const { data: appointments = [] } = useQuery({ queryKey: ["appts-ws", residentId], queryFn: () => secureGateway.filter("Appointment", {}, "-start_datetime", 200), staleTime: 2 * 60 * 1000, enabled: !!residentId, select: d => d.filter(a => a.resident_id === residentId) });
  const { data: dailyLogs = [] } = useQuery({ queryKey: ["dlogs-ws", residentId], queryFn: () => secureGateway.filter("DailyLog", {}, "-date", 200), staleTime: 2 * 60 * 1000, enabled: !!residentId, select: d => d.filter(l => l.resident_id === residentId) });
  const { data: visitReports = [] } = useQuery({ queryKey: ["vreports-ws", residentId], queryFn: () => secureGateway.filter("VisitReport", {}, "-date", 200), staleTime: 2 * 60 * 1000, enabled: !!residentId, select: d => d.filter(v => v.resident_id === residentId) });
  const { data: complaints = [] } = useQuery({ queryKey: ["complaints-ws", residentId], queryFn: () => secureGateway.filter("Complaint", {}, "-received_datetime", 100), staleTime: 2 * 60 * 1000, enabled: !!residentId, select: d => d.filter(c => c.resident_id === residentId) });
  const { data: safeguardingRecords = [] } = useQuery({ queryKey: ["sg-ws", residentId], queryFn: () => secureGateway.filter("SafeguardingRecord", {}, "-created_date", 100), staleTime: 2 * 60 * 1000, enabled: !!residentId, select: d => d.filter(s => s.resident_id === residentId) });
  const { data: supportPlans = [] } = useQuery({ queryKey: ["sp-ws", residentId], queryFn: () => secureGateway.filter("SupportPlan", {}, "-created_date", 50), staleTime: 5 * 60 * 1000, enabled: !!residentId, select: d => d.filter(c => c.resident_id === residentId) });
  const { data: behaviourPlans = [] } = useQuery({ queryKey: ["bsp-ws", residentId], queryFn: () => secureGateway.filter("BehaviourSupportPlan", {}, "-created_date", 50), staleTime: 5 * 60 * 1000, enabled: !!residentId, select: d => d.filter(c => c.resident_id === residentId) });
  const { data: therapeuticPlans = [] } = useQuery({ queryKey: ["tp-ws", residentId], queryFn: () => secureGateway.filter("TherapeuticPlan", {}, "-created_date", 50), staleTime: 5 * 60 * 1000, enabled: !!residentId, select: d => d.filter(c => c.resident_id === residentId) });
  const { data: pathwayPlans = [] } = useQuery({ queryKey: ["pp-ws", residentId], queryFn: () => secureGateway.filter("PathwayPlan", {}, "-created_date", 50), staleTime: 5 * 60 * 1000, enabled: !!residentId, select: d => d.filter(c => c.resident_id === residentId) });
  const { data: familyContacts = [] } = useQuery({ queryKey: ["fc-ws", residentId], queryFn: () => secureGateway.filter("FamilyContact", {}, "-created_date", 100), staleTime: 5 * 60 * 1000, enabled: !!residentId, select: d => d.filter(c => c.resident_id === residentId) });
  const { data: achievements = [] } = useQuery({ queryKey: ["ach-ws", residentId], queryFn: () => secureGateway.filter("Achievement", {}, "-created_date", 100), staleTime: 5 * 60 * 1000, enabled: !!residentId, select: d => d.filter(a => a.resident_id === residentId) });
  const { data: medicationRecords = [] } = useQuery({ queryKey: ["med-ws", residentId], queryFn: () => secureGateway.filter("MedicationRecord", {}, "-created_date", 100), staleTime: 5 * 60 * 1000, enabled: !!residentId, select: d => d.filter(m => m.resident_id === residentId) });
  const { data: residentDocuments = [] } = useQuery({ queryKey: ["rdocs-ws", residentId], queryFn: () => secureGateway.filter("ResidentDocument", {}, "-created_date", 100), staleTime: 5 * 60 * 1000, enabled: !!residentId, select: d => d.filter(d2 => d2.resident_id === residentId) });

  const home = useMemo(() => homes.find(h => h.id === resident?.home_id), [homes, resident]);
  const keyWorker = useMemo(() => staff.find(s => s.id === resident?.key_worker_id), [staff, resident]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const today = new Date();
  const openIncidents = useMemo(() => accidents.filter(a => a.status === "open" || a.status === "Draft").length, [accidents]);
  const activeRisks = useMemo(() => riskAssessments.filter(r => r.overall_rating === "high" || r.overall_rating === "medium").length, [riskAssessments]);
  const upcomingAppts = useMemo(() => appointments.filter(a => { const dt = a.start_datetime || a.date; return dt && new Date(dt) >= today; }), [appointments]);
  const missingEpisodes = mfhRecords.length;
  const openComplaints = useMemo(() => complaints.filter(c => c.status !== "closed").length, [complaints]);
  const latestSP = useMemo(() => [...supportPlans].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [supportPlans]);
  const latestRA = useMemo(() => [...riskAssessments].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [riskAssessments]);
  const latestBSP = useMemo(() => [...behaviourPlans].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [behaviourPlans]);
  const latestTP = useMemo(() => [...therapeuticPlans].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [therapeuticPlans]);

  const getStatus = (plan) => { if (!plan) return "Not started"; if (!plan.review_date) return "Review due"; return new Date(plan.review_date) < today ? "Overdue" : "Up to date"; };

  const recentActivity = useMemo(() => {
    const items = [];
    dailyLogs.slice(0, 2).forEach(l => items.push({ type: "Daily Log", datetime: l.date ? `${l.date}T09:00:00` : l.created_date, by: staffMap[l.worker_id]?.full_name || l.worker_name }));
    accidents.slice(0, 2).forEach(a => items.push({ type: "Incident", datetime: a.date ? `${a.date}T12:00:00` : a.created_date, by: a.reported_by, severity: a.risk_level }));
    appointments.slice(0, 1).forEach(a => items.push({ type: "Appointment", datetime: a.start_datetime || a.date }));
    familyContacts.slice(0, 1).forEach(f => items.push({ type: "Family Contact", datetime: f.contact_date || f.created_date, by: f.contact_name }));
    mfhRecords.slice(0, 1).forEach(m => items.push({ type: "Missing Episode", datetime: m.reported_missing_datetime, by: m.reported_by_name }));
    return items.sort((a, b) => (b.datetime || "").localeCompare(a.datetime || "")).slice(0, 6);
  }, [dailyLogs, accidents, appointments, familyContacts, mfhRecords, staffMap]);

  const timelineItems = useMemo(() => {
    const items = [];
    dailyLogs.slice(0, 2).forEach(l => items.push({ icon: FileText, color: "blue", title: "Daily Log submitted", time: l.date ? format(new Date(l.date), "dd MMM, HH:mm") : "—", by: staffMap[l.worker_id]?.full_name || l.worker_name }));
    accidents.slice(0, 1).forEach(a => items.push({ icon: AlertTriangle, color: "red", title: "Incident logged", time: a.date || "—", by: a.reported_by }));
    staff.filter(s => s.role === "support_worker").slice(0, 1).forEach(s => items.push({ icon: User, color: "teal", title: "Key Worker Session", time: "—", by: s.full_name }));
    familyContacts.slice(0, 1).forEach(f => items.push({ icon: Users, color: "purple", title: "Family Contact", time: f.contact_date ? format(new Date(f.contact_date), "dd MMM") : "—", by: f.contact_name }));
    riskAssessments.slice(0, 1).forEach(r => items.push({ icon: ShieldAlert, color: "amber", title: "Risk Assessment updated", time: r.last_reviewed_at ? format(new Date(r.last_reviewed_at), "dd MMM") : "—", by: r.last_reviewed_by_name }));
    return items.slice(0, 5);
  }, [dailyLogs, accidents, staff, familyContacts, riskAssessments, staffMap]);

  const complianceAlerts = useMemo(() => {
    const alerts = [];
    const unsigned = residentDocuments.filter(d => d.signoff_required && d.signoff_status !== "signed");
    if (unsigned.length > 0) alerts.push({ color: "red", text: `${unsigned.length} document(s) awaiting sign-off` });
    const pendingVisits = visitReports.filter(v => v.status === "draft").length;
    if (pendingVisits > 0) alerts.push({ color: "amber", text: `${pendingVisits} policy acknowledgement due` });
    if (alerts.length === 0) alerts.push({ color: "green", text: "All compliance checks passed" });
    return alerts;
  }, [residentDocuments, visitReports]);

  if (!resident) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const age = calcAgeDetailed(resident.dob);
  const dobFormatted = resident.dob ? format(new Date(resident.dob), "dd MMM yyyy") : "—";
  const allergyText = (resident.allergies || []).map(a => a.allergen).join(", ");
  const selfHarmRisk = riskAssessments.find(a => a.category === "suicide_self_harm")?.overall_rating;
  const activeMFH = mfhRecords.filter(m => m.status === "active").length;
  const nextAppt = upcomingAppts[0];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate("/residents")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <nav className="text-xs text-slate-400 flex items-center gap-1.5">
          <Link to="/residents" className="hover:text-teal-600 font-medium">Young People</Link>
          <span>/</span>
          <span className="text-slate-700 font-semibold">{resident.display_name}</span>
        </nav>
        <div className="flex-1" />
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input placeholder="Search young people, documents…" className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 w-56 focus:outline-none focus:ring-1 focus:ring-teal-400" />
        </div>
        <Bell className="w-4 h-4 text-slate-500 cursor-pointer" />
        <MessageSquare className="w-4 h-4 text-slate-500 cursor-pointer" />
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
            {staffProfile?.full_name?.charAt(0) || "U"}
          </div>
          <span className="hidden md:block">{staffProfile?.full_name || user?.email}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      {/* ── Profile header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-2xl font-bold shrink-0">
            {resident.photo_url
              ? <img src={resident.photo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
              : (resident.initials || resident.display_name?.charAt(0) || "?")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{resident.display_name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${resident.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                {resident.status || "Active"}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{age && `${age} (DOB: ${dobFormatted})`}</p>
            {home && <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{home.name}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {allergyText && <BadgePill icon={AlertTriangle} label="Allergies" value={allergyText} color="red" />}
              {activeMFH > 0 && <BadgePill icon={ShieldAlert} label="Missing Risk" value="Active" color="red" />}
              {selfHarmRisk && <BadgePill icon={Heart} label="Self-harm Risk" value={selfHarmRisk.charAt(0).toUpperCase() + selfHarmRisk.slice(1)} color={selfHarmRisk === "high" ? "red" : "amber"} />}
              {resident.education_status && <BadgePill icon={GraduationCap} label="Education" value={resident.education_status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} color="blue" />}
              {keyWorker && <BadgePill icon={User} label="Key Worker" value={keyWorker.full_name} color="teal" />}
            </div>
          </div>
          <div className="shrink-0 flex gap-2">
            <button
              onClick={() => setAddLogOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Add Daily Log
            </button>
            <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center gap-1.5">
              Quick Actions <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section nav tabs ── */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-0">
        <button
          onClick={() => setActiveSection("overview")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeSection === "overview" ? "border-teal-500 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <FileText className="w-4 h-4" /> Overview
        </button>
        <button
          onClick={() => setActiveSection("journey")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeSection === "journey" ? "border-purple-500 text-purple-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <Map className="w-4 h-4" /> Journey &amp; Life Story
        </button>
      </div>

      {/* ── Journey full-screen view ── */}
      {activeSection === "journey" && (
        <div className="px-6 py-5">
          <JourneyLifeStoryTab resident={resident} staffProfile={staffProfile} user={user} />
        </div>
      )}

      {/* ── Scrollable workspace body ── */}
      {activeSection === "overview" && <div className="px-6 py-5 space-y-5">

        {/* ── Row 1: KPIs + right panel ── */}
        <div className="flex gap-5">
          {/* Left: KPIs + 3-col cards */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard icon={AlertTriangle} label="Open Incidents" value={openIncidents} color={openIncidents > 0 ? "red" : "slate"} />
              <KPICard icon={ShieldAlert} label="Active Risks" value={activeRisks} color={activeRisks > 0 ? "amber" : "slate"} />
              <KPICard icon={Calendar} label="Upcoming Appointments" value={upcomingAppts.length} sub={nextAppt ? `Next: ${format(new Date(nextAppt.start_datetime || nextAppt.date || today), "dd MMM yyyy")}` : "None scheduled"} color="teal" />
              <KPICard icon={GraduationCap} label="Education Status" value={resident.education_status ? resident.education_status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Unknown"} color="blue" />
              <KPICard icon={MapPin} label="Missing Episodes" value={missingEpisodes} color={missingEpisodes > 0 ? "red" : "slate"} />
              <KPICard icon={Zap} label="Outstanding Actions" value={openComplaints + openIncidents} color={openComplaints + openIncidents > 0 ? "amber" : "slate"} />
            </div>

            {/* 3-col: About / Care Summary / Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* About */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-4 text-sm">About {resident.display_name?.split(" ")[0]}</h3>
                <div className="space-y-1.5 text-xs">
                  {[
                    ["Gender", resident.gender],
                    ["Ethnicity", resident.ethnicity],
                    ["Language", resident.language],
                    ["Religion", resident.religion],
                    ["Placement Type", resident.placement_type?.replace(/_/g, " ")],
                    ["Legal Status", resident.legal_status],
                    ["Social Worker", resident.social_worker_name],
                    ["Date Placed", resident.placement_start ? format(new Date(resident.placement_start), "dd MMM yyyy") : null],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-slate-400 shrink-0">{k}:</span>
                      <span className="font-medium text-slate-700 text-right">{v || <span className="text-slate-300 font-normal">—</span>}</span>
                    </div>
                  ))}
                </div>
                <ViewAll label="View full profile" />
              </div>

              {/* Current Care Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Current Care Summary</h3>
                <CareSummaryRow label="Care Plan" lastReviewed={latestSP?.review_date} status={getStatus(latestSP)} />
                <CareSummaryRow label="Risk Assessment" lastReviewed={latestRA?.last_reviewed_at} status={latestRA ? (new Date(latestRA.last_reviewed_at || 0) < today ? "Review due" : "Up to date") : "Not started"} />
                <CareSummaryRow label="Behaviour Support Plan" lastReviewed={latestBSP?.created_date} status={latestBSP ? "Up to date" : "Not started"} />
                <CareSummaryRow label="Therapeutic Plan" lastReviewed={latestTP?.created_date} status={latestTP ? "Up to date" : "Not started"} />
                <ViewAll label="View all care plans" />
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">Recent Activity</h3>
                {recentActivity.length === 0
                  ? <p className="text-sm text-slate-400 text-center py-4">No recent activity</p>
                  : recentActivity.map((item, i) => <ActivityRow key={i} {...item} />)
                }
                <ViewAll label="View timeline" />
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-64 xl:w-72 shrink-0 space-y-4">
            {/* Activity Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm">Activity Timeline</h3>
                <button className="text-xs text-teal-600 font-medium hover:underline">View full timeline →</button>
              </div>
              {timelineItems.length === 0
                ? <p className="text-xs text-slate-400 text-center py-4">No activity yet</p>
                : timelineItems.map((item, i) => <TimelineItem key={i} {...item} last={i === timelineItems.length - 1} />)
              }
              <ViewAll label="View full timeline" />
            </div>

            {/* Documents & Compliance */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3">Documents & Compliance</h3>
              <div className="space-y-2">
                {complianceAlerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${a.color === "red" ? "bg-red-50 text-red-700" : a.color === "amber" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{a.text}
                  </div>
                ))}
              </div>
              <ViewAll label="View all" />
            </div>
          </div>
        </div>

        {/* ── Row 2: 4 section panels (all visible, no tab switching) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Care & Risk */}
          <SectionCard title="Care & Risk">
            <MiniTabPanel tabs={["Care Plan", "Risks", "Behaviour", "Incidents", "Missing"]}>
              {(active) => (
                <div>
                  {active === "Risks" && (
                    <>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Risk Assessments</p>
                      {riskAssessments.length === 0 && <p className="text-xs text-slate-400">No risks recorded</p>}
                      {riskAssessments.slice(0, 4).map(r => (
                        <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
                          <span className="text-slate-600 capitalize">{r.category?.replace(/_/g, " ")?.slice(0, 18)}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${r.overall_rating === "high" ? "bg-red-100 text-red-700" : r.overall_rating === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{r.overall_rating}</span>
                            <span className="text-slate-400">{r.last_reviewed_at ? format(new Date(r.last_reviewed_at), "dd MMM yyyy") : ""}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {active === "Incidents" && (
                    <>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Recent Incidents</p>
                      {accidents.length === 0 && <p className="text-xs text-slate-400">No incidents</p>}
                      {accidents.slice(0, 4).map(a => (
                        <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
                          <span className="text-slate-600 truncate">{a.incident_type || a.type?.replace(/_/g, " ") || "Incident"}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-400">{a.date}</span>
                            {a.risk_level && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.risk_level === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.risk_level}</span>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {active === "Missing" && (
                    <>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Missing Episodes</p>
                      {mfhRecords.length === 0 && <p className="text-xs text-slate-400">No episodes recorded</p>}
                      {mfhRecords.slice(0, 3).map(m => (
                        <div key={m.id} className="text-xs py-1.5 border-b border-slate-50 last:border-0">
                          <div className="flex justify-between">
                            <span className="text-slate-600">{m.reported_missing_datetime ? format(new Date(m.reported_missing_datetime), "dd MMM yyyy") : "—"}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${m.status === "active" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{m.status}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {(active === "Care Plan") && (
                    <>
                      {latestSP ? (
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="font-medium text-slate-700">{getStatus(latestSP)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Review</span><span className="font-medium text-slate-700">{latestSP.review_date || "—"}</span></div>
                        </div>
                      ) : <p className="text-xs text-slate-400">No care plan recorded</p>}
                    </>
                  )}
                  {active === "Behaviour" && (
                    <>
                      {latestBSP ? (
                        <div className="text-xs space-y-1">
                          <p className="font-medium text-slate-700">{latestBSP.title || "Behaviour Support Plan"}</p>
                          <p className="text-slate-400">{latestBSP.created_date ? format(new Date(latestBSP.created_date), "dd MMM yyyy") : "—"}</p>
                        </div>
                      ) : <p className="text-xs text-slate-400">No behaviour plan</p>}
                    </>
                  )}
                  <ViewAll label="View all" />
                </div>
              )}
            </MiniTabPanel>
          </SectionCard>

          {/* Health & Development */}
          <SectionCard title="Health & Development">
            <MiniTabPanel tabs={["Health", "Therapeutic Plan", "Appointments", "Achievements"]}>
              {(active) => (
                <div>
                  {active === "Health" && (
                    <>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Health Summary</p>
                      {[["Allergies", (resident.allergies || []).map(a => a.allergen).join(", ") || "None"], ["Medication", medicationRecords.length > 0 ? `${medicationRecords.length} active` : "None"], ["GP", resident.gp_name || "Not recorded"], ["Dentist", resident.dentist_name || "Not recorded"], ["Last Health Check", resident.health_updated_at ? format(new Date(resident.health_updated_at), "dd MMM yyyy") : "—"]].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1 border-b border-slate-50 last:border-0 text-xs">
                          <span className="text-slate-400">{k}</span><span className="font-medium text-slate-700 truncate max-w-[100px]">{v}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {active === "Appointments" && (
                    <>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Upcoming Appointments</p>
                      {upcomingAppts.length === 0 && <p className="text-xs text-slate-400">None scheduled</p>}
                      {upcomingAppts.slice(0, 4).map(a => (
                        <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
                          <div>
                            <p className="text-slate-700 font-medium">{a.start_datetime ? format(new Date(a.start_datetime), "dd MMM yyyy, HH:mm") : a.date}</p>
                            <p className="text-slate-400">{a.title || a.appointment_type}</p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Scheduled</span>
                        </div>
                      ))}
                    </>
                  )}
                  {active === "Therapeutic Plan" && (
                    <>
                      {therapeuticPlans.length === 0 && <p className="text-xs text-slate-400">No therapeutic plan</p>}
                      {therapeuticPlans.slice(0, 2).map(t => (
                        <div key={t.id} className="text-xs py-1.5 border-b border-slate-50 last:border-0">
                          <p className="font-medium text-slate-700">{t.title || "Therapeutic Plan"}</p>
                          <p className="text-slate-400">{t.created_date ? format(new Date(t.created_date), "dd MMM yyyy") : "—"}</p>
                        </div>
                      ))}
                    </>
                  )}
                  {active === "Achievements" && (
                    <>
                      {achievements.length === 0 && <p className="text-xs text-slate-400">No achievements recorded</p>}
                      {achievements.slice(0, 4).map(a => (
                        <div key={a.id} className="text-xs py-1.5 border-b border-slate-50 last:border-0">
                          <p className="font-medium text-amber-700">{a.title}</p>
                          <p className="text-slate-400">{a.created_date ? format(new Date(a.created_date), "dd MMM yyyy") : "—"}</p>
                        </div>
                      ))}
                    </>
                  )}
                  <ViewAll label="View all" />
                </div>
              )}
            </MiniTabPanel>
          </SectionCard>

          {/* Daily Life */}
          <SectionCard title="Daily Life">
            <MiniTabPanel tabs={["Education", "Family Contact", "Activities", "Housing", "Finance"]}>
              {(active) => (
                <div>
                  {active === "Education" && (
                    <>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Education / Training</p>
                      {[["Provider", resident.education_provider], ["Course", resident.education_course], ["Enrolled", resident.education_enrolment_date ? format(new Date(resident.education_enrolment_date), "dd MMM yyyy") : null], ["Ends", resident.education_expected_end_date ? format(new Date(resident.education_expected_end_date), "dd MMM yyyy") : null], ["Days", (resident.education_days_attended || []).join(", ")], ["Status", resident.education_status?.replace(/_/g, " ")]].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1 border-b border-slate-50 last:border-0 text-xs">
                          <span className="text-slate-400">{k}</span><span className="font-medium text-slate-700 truncate max-w-[100px]">{v}</span>
                        </div>
                      ))}
                      {!resident.education_provider && !resident.education_status && <p className="text-xs text-slate-400">Not recorded</p>}
                    </>
                  )}
                  {active === "Family Contact" && (
                    <>
                      {[...(resident.family_contacts || []), ...familyContacts].length === 0 && <p className="text-xs text-slate-400">None recorded</p>}
                      {[...(resident.family_contacts || []), ...familyContacts].slice(0, 4).map((f, i) => (
                        <div key={i} className="py-1.5 border-b border-slate-50 last:border-0 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-700">{f.name || f.contact_name}</span>
                            <span className="text-slate-400 capitalize">{f.relationship}</span>
                          </div>
                          {f.contact_date && <p className="text-slate-400">Last contact: {format(new Date(f.contact_date), "dd MMM yyyy")} {f.frequency && `· ${f.frequency}`}</p>}
                        </div>
                      ))}
                    </>
                  )}
                  {active === "Activities" && (
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-400">Gym</span><span className="font-medium text-slate-700">{resident.leisure_gym_enrolled ? (resident.leisure_gym_name || "Enrolled") : "Not enrolled"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Football</span><span className="font-medium text-slate-700">{resident.leisure_football_enrolled ? (resident.leisure_football_club || "Enrolled") : "No"}</span></div>
                      {resident.leisure_interests && <p className="text-slate-500 mt-2">{resident.leisure_interests}</p>}
                    </div>
                  )}
                  {active === "Housing" && (
                    <div className="text-xs space-y-1.5">
                      {[["Placement", resident.placement_type?.replace(/_/g, " ")], ["Date Placed", resident.placement_start ? format(new Date(resident.placement_start), "dd MMM yyyy") : null], ["Visits/Wk", resident.contracted_visits_per_week]].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-700">{v}</span></div>
                      ))}
                      {pathwayPlans.length > 0 && <p className="text-slate-500 font-semibold mt-2">Pathway Plan: {format(new Date(pathwayPlans[0].created_date), "dd MMM yyyy")}</p>}
                    </div>
                  )}
                  {active === "Finance" && (
                    <div className="text-xs space-y-1.5">
                      {[["Bank", resident.bank_name], ["Account", resident.bank_account_name], ["Solicitor", resident.solicitor_name], ["Case Ref", resident.solicitor_case_ref]].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-700">{v}</span></div>
                      ))}
                      {!resident.bank_name && !resident.solicitor_name && <p className="text-slate-400">No details recorded</p>}
                    </div>
                  )}
                  <ViewAll label="View all" />
                </div>
              )}
            </MiniTabPanel>
          </SectionCard>

          {/* Records & Compliance */}
          <SectionCard title="Records & Compliance">
            <MiniTabPanel tabs={["Daily Logs", "Visit Reports", "Documents", "Complaints"]}>
              {(active) => (
                <div>
                  {active === "Daily Logs" && (
                    <>
                      {dailyLogs.length === 0 && <p className="text-xs text-slate-400">No daily logs yet</p>}
                      {dailyLogs.slice(0, 5).map(l => (
                        <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
                          <span className="text-slate-500">{l.date || "—"}</span>
                          <span className="text-slate-600 truncate max-w-[80px]">{l.title || l.log_type || "Log"}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.flagged ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{l.flagged ? "Flagged" : "OK"}</span>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowDailyLogTimeline(true)}
                        className="mt-3 w-full text-xs text-teal-600 font-semibold hover:underline text-left"
                      >
                        View full timeline →
                      </button>
                    </>
                  )}
                  {active === "Visit Reports" && (
                    <>
                      {visitReports.length === 0 && <p className="text-xs text-slate-400">No visit reports</p>}
                      {visitReports.slice(0, 5).map(v => (
                        <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
                          <span className="text-slate-500">{v.date || "—"}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${v.status === "approved" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{v.status || "Draft"}</span>
                          <span className="text-slate-400 truncate ml-1 max-w-[70px]">{v.worker_name || "—"}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {active === "Documents" && (
                    <>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Documents</p>
                      {residentDocuments.length === 0 && <p className="text-xs text-slate-400">No documents</p>}
                      {residentDocuments.slice(0, 4).map(d => (
                        <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
                          <span className="text-slate-700 font-medium truncate">{d.document_type || d.title || "Document"}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${d.signoff_status === "signed" ? "bg-green-100 text-green-700" : d.signoff_required ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                            {d.signoff_status === "signed" ? "Signed" : d.signoff_required ? "Pending" : "—"}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {active === "Complaints" && (
                    <>
                      {complaints.length === 0 && <p className="text-xs text-slate-400">No complaints recorded</p>}
                      {complaints.slice(0, 4).map(c => (
                        <div key={c.id} className="py-1.5 border-b border-slate-50 last:border-0 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-700 font-medium capitalize">{c.complaint_type?.replace(/_/g, " ") || "Complaint"}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${c.status === "closed" || c.status === "resolved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.status}</span>
                          </div>
                          <p className="text-slate-400">{c.received_datetime ? format(new Date(c.received_datetime), "dd MMM yyyy") : "—"}</p>
                        </div>
                      ))}
                    </>
                  )}
                  <ViewAll label="View all documents" />
                </div>
              )}
            </MiniTabPanel>
          </SectionCard>

        </div>
      </div>}

      {/* Add Daily Log Modal */}
      {addLogOpen && resident && (
        <DailyLogModal
          resident={resident}
          staffProfile={staffProfile}
          onClose={() => setAddLogOpen(false)}
          onSaved={() => setAddLogOpen(false)}
        />
      )}

      {/* Daily Log Full Timeline — full screen overlay */}
      {showDailyLogTimeline && resident && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3">
            <button onClick={() => setShowDailyLogTimeline(false)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <DailyLogTimeline resident={resident} staffProfile={staffProfile} user={user} />
          </div>
        </div>
      )}
    </div>
  );
}