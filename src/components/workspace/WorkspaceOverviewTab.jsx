import { useState, useMemo } from "react";
import {
  AlertTriangle, ShieldAlert, Calendar, GraduationCap,
  MapPin, Zap, ChevronRight, Clock, User, FileText,
  CheckCircle2, XCircle, AlertCircle, ExternalLink
} from "lucide-react";
import { format } from "date-fns";

function KPICard({ icon: Icon, label, value, sub, color, onClick }) {
  const colors = {
    red: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", val: "text-red-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", val: "text-amber-700" },
    teal: { bg: "bg-teal-50", border: "border-teal-200", icon: "text-teal-500", val: "text-teal-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500", val: "text-blue-700" },
    green: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-500", val: "text-green-700" },
    slate: { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-400", val: "text-slate-700" },
  };
  const c = colors[color] || colors.slate;
  return (
    <button
      onClick={onClick}
      className={`${c.bg} ${c.border} border rounded-2xl p-4 text-left hover:shadow-md transition-all w-full group`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${c.icon}`} />
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
      <div className={`text-2xl font-bold ${c.val}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      <div className="text-xs text-teal-600 font-medium mt-2 group-hover:underline">View all →</div>
    </button>
  );
}

function CareSummaryRow({ label, lastReviewed, status, onView }) {
  const statusConfig = {
    "Up to date": { bg: "bg-green-100 text-green-700", icon: CheckCircle2 },
    "Review due": { bg: "bg-amber-100 text-amber-700", icon: AlertCircle },
    "Overdue": { bg: "bg-red-100 text-red-700", icon: XCircle },
    "Not started": { bg: "bg-slate-100 text-slate-500", icon: null },
  };
  const cfg = statusConfig[status] || statusConfig["Not started"];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="text-sm font-medium text-slate-700 w-48 shrink-0">{label}</div>
      <div className="text-xs text-slate-400 flex-1 px-4">
        {lastReviewed ? `Last reviewed ${format(new Date(lastReviewed), "dd MMM yyyy")}` : "Not recorded"}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${cfg.bg}`}>
          {Icon && <Icon className="w-3 h-3" />} {status}
        </span>
        <button onClick={onView} className="text-xs text-teal-600 hover:underline font-medium">View</button>
      </div>
    </div>
  );
}

function ActivityRow({ type, datetime, by, severity, onClick }) {
  const typeIcons = {
    "Daily Log": { icon: FileText, color: "bg-blue-100 text-blue-600" },
    "Incident": { icon: AlertTriangle, color: "bg-red-100 text-red-600" },
    "Key Worker Session": { icon: User, color: "bg-teal-100 text-teal-600" },
    "Family Contact": { icon: User, color: "bg-purple-100 text-purple-600" },
    "Appointment": { icon: Calendar, color: "bg-green-100 text-green-600" },
    "Risk Assessment": { icon: ShieldAlert, color: "bg-amber-100 text-amber-600" },
    "Missing Episode": { icon: MapPin, color: "bg-red-100 text-red-600" },
    "Complaint": { icon: AlertCircle, color: "bg-orange-100 text-orange-600" },
  };
  const cfg = typeIcons[type] || { icon: FileText, color: "bg-slate-100 text-slate-500" };
  const Icon = cfg.icon;
  const dtFormatted = datetime ? format(new Date(datetime), "dd MMM yyyy 'at' HH:mm") : "—";
  return (
    <button onClick={onClick} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 w-full text-left px-1 rounded-lg transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{type}</div>
        <div className="text-xs text-slate-400">{dtFormatted}{by ? ` · ${by}` : ""}</div>
      </div>
      {severity && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${severity === "high" || severity === "High" ? "bg-red-100 text-red-600" : severity === "medium" || severity === "Medium" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
          {severity}
        </span>
      )}
    </button>
  );
}

function TimelineItem({ icon: Icon, color, title, time, by }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
    teal: "bg-teal-100 text-teal-600",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
    green: "bg-green-100 text-green-600",
  };
  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${colors[color] || colors.blue}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="w-px flex-1 bg-slate-100 mt-1" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs font-semibold text-slate-700">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{time}</p>
        {by && <p className="text-xs text-slate-400">by {by}</p>}
      </div>
    </div>
  );
}

export default function WorkspaceOverviewTab({ resident, home, keyWorker, staff, data, onTabChange, isAdminOrTL }) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activityModal, setActivityModal] = useState(null);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const staffMap = useMemo(() => Object.fromEntries((staff || []).map(s => [s.id, s])), [staff]);

  // KPI calculations
  const openIncidents = useMemo(() => (data.accidents || []).filter(a => a.status === "open" || a.status === "Draft").length, [data.accidents]);
  const activeRisks = useMemo(() => (data.riskAssessments || []).filter(r => r.overall_rating === "high" || r.overall_rating === "medium").length, [data.riskAssessments]);
  const upcomingAppts = useMemo(() => (data.appointments || []).filter(a => a.start_datetime >= today.toISOString()), [data.appointments, today]);
  const missingEpisodes = useMemo(() => (data.mfhRecords || []).length, [data.mfhRecords]);
  const openComplaints = useMemo(() => (data.complaints || []).filter(c => c.status !== "closed").length, [data.complaints]);

  // Care summary
  const getCarePlanStatus = (plan) => {
    if (!plan) return "Not started";
    if (!plan.review_date) return "Review due";
    const rd = new Date(plan.review_date);
    if (rd < today) return "Overdue";
    if ((rd - today) / 86400000 < 30) return "Review due";
    return "Up to date";
  };

  const latestSP = useMemo(() => (data.supportPlans || []).sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [data.supportPlans]);
  const latestRA = useMemo(() => (data.riskAssessments || []).sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [data.riskAssessments]);
  const latestBSP = useMemo(() => (data.behaviourPlans || []).sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [data.behaviourPlans]);
  const latestTP = useMemo(() => (data.therapeuticPlans || []).sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [data.therapeuticPlans]);
  const latestPP = useMemo(() => (data.pathwayPlans || []).sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0], [data.pathwayPlans]);

  // Recent activity merged timeline
  const recentActivity = useMemo(() => {
    const items = [];
    (data.dailyLogs || []).slice(0, 3).forEach(l => items.push({ type: "Daily Log", datetime: l.date ? `${l.date}T09:00:00` : l.created_date, by: staffMap[l.worker_id]?.full_name || l.worker_name || "", raw: l }));
    (data.accidents || []).slice(0, 3).forEach(a => items.push({ type: "Incident", datetime: a.date ? `${a.date}T12:00:00` : a.created_date, by: a.reported_by || "", severity: a.risk_level || a.severity, raw: a }));
    (data.appointments || []).slice(0, 2).forEach(a => items.push({ type: "Appointment", datetime: a.start_datetime || a.date, by: "", raw: a }));
    (data.mfhRecords || []).slice(0, 2).forEach(m => items.push({ type: "Missing Episode", datetime: m.reported_missing_datetime, by: m.reported_by_name || "", raw: m }));
    (data.complaints || []).slice(0, 2).forEach(c => items.push({ type: "Complaint", datetime: c.received_datetime, by: c.complainant_name || "", raw: c }));
    (data.familyContacts || []).slice(0, 2).forEach(f => items.push({ type: "Family Contact", datetime: f.contact_date || f.created_date, by: f.contact_name || "", raw: f }));
    return items.sort((a, b) => (b.datetime || "").localeCompare(a.datetime || "")).slice(0, 8);
  }, [data, staffMap]);

  // Timeline items (right panel)
  const timelineItems = useMemo(() => {
    const items = [];
    (data.dailyLogs || []).slice(0, 2).forEach(l => items.push({ icon: FileText, color: "blue", title: "Daily Log submitted", time: l.date ? format(new Date(l.date), "dd MMM") : "—", by: staffMap[l.worker_id]?.full_name || l.worker_name }));
    (data.accidents || []).slice(0, 2).forEach(a => items.push({ icon: AlertTriangle, color: "red", title: "Incident logged", time: a.date ? format(new Date(a.date), "dd MMM") : "—", by: a.reported_by }));
    (data.appointments || []).slice(0, 1).forEach(a => items.push({ icon: Calendar, color: "green", title: "Appointment", time: a.start_datetime ? format(new Date(a.start_datetime), "dd MMM HH:mm") : "—", by: "" }));
    (data.riskAssessments || []).slice(0, 1).forEach(r => items.push({ icon: ShieldAlert, color: "amber", title: "Risk Assessment updated", time: r.last_reviewed_at ? format(new Date(r.last_reviewed_at), "dd MMM") : "—", by: r.last_reviewed_by_name }));
    (data.familyContacts || []).slice(0, 1).forEach(f => items.push({ icon: User, color: "purple", title: "Family Contact", time: f.contact_date ? format(new Date(f.contact_date), "dd MMM") : "—", by: f.contact_name }));
    return items.slice(0, 6);
  }, [data, staffMap]);

  // Compliance alerts
  const complianceAlerts = useMemo(() => {
    const alerts = [];
    const unsignedDocs = (data.residentDocuments || []).filter(d => d.signoff_required && d.signoff_status !== "signed");
    if (unsignedDocs.length > 0) alerts.push({ color: "red", text: `${unsignedDocs.length} document(s) awaiting sign-off` });
    if (!latestSP) alerts.push({ color: "amber", text: "No care plan found — review required" });
    if (openComplaints > 0) alerts.push({ color: "amber", text: `${openComplaints} open complaint(s)` });
    const pendingVisits = (data.visitReports || []).filter(v => v.status === "draft").length;
    if (pendingVisits > 0) alerts.push({ color: "slate", text: `${pendingVisits} visit report(s) pending submission` });
    if (alerts.length === 0) alerts.push({ color: "green", text: "All compliance checks passed" });
    return alerts;
  }, [data, latestSP, openComplaints]);

  const socialWorker = resident.social_worker_name || null;
  const nextAppt = upcomingAppts[0];

  return (
    <div className="flex gap-5">
      {/* Left main content */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard icon={AlertTriangle} label="Open Incidents" value={openIncidents} color={openIncidents > 0 ? "red" : "slate"} onClick={() => onTabChange("care-risk")} />
          <KPICard icon={ShieldAlert} label="Active Risks" value={activeRisks} color={activeRisks > 0 ? "amber" : "slate"} onClick={() => onTabChange("care-risk")} />
          <KPICard icon={Calendar} label="Upcoming Appts" value={upcomingAppts.length} sub={nextAppt ? `Next: ${format(new Date(nextAppt.start_datetime || nextAppt.date || today), "dd MMM yyyy")}` : "None scheduled"} color="teal" onClick={() => onTabChange("health")} />
          <KPICard icon={GraduationCap} label="Education Status" value={resident.education_status ? resident.education_status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Unknown"} color="blue" onClick={() => onTabChange("daily-life")} />
          <KPICard icon={MapPin} label="Missing Episodes" value={missingEpisodes} color={missingEpisodes > 0 ? "red" : "slate"} onClick={() => onTabChange("care-risk")} />
          <KPICard icon={Zap} label="Outstanding Actions" value={openComplaints + openIncidents} color="amber" onClick={() => onTabChange("records")} />
        </div>

        {/* About + Care Summary + Activity — row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* About */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm">About {resident.display_name?.split(" ")[0]}</h3>
            <div className="space-y-2 text-xs">
              {[
                ["Gender", resident.gender],
                ["Ethnicity", resident.ethnicity],
                ["Language", resident.language ? resident.language.charAt(0).toUpperCase() + resident.language.slice(1) : null],
                ["Religion", resident.religion],
                ["Placement Type", resident.placement_type?.replace(/_/g, " ")],
                ["Legal Status", resident.legal_status],
                ["Social Worker", socialWorker],
                ["Date Placed", resident.placement_start ? format(new Date(resident.placement_start), "dd MMM yyyy") : null],
                ["Current Home", home?.name],
                ["Key Worker", keyWorker?.full_name],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">{k}:</span>
                  <span className="font-medium text-slate-700 text-right">{v || <span className="text-slate-300">Not recorded</span>}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="mt-4 text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1"
            >
              View full profile <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Care Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm">Current Care Summary</h3>
            <CareSummaryRow label="Care Plan" lastReviewed={latestSP?.review_date} status={getCarePlanStatus(latestSP)} onView={() => onTabChange("care-risk")} />
            <CareSummaryRow label="Risk Assessment" lastReviewed={latestRA?.last_reviewed_at} status={latestRA ? (new Date(latestRA.last_reviewed_at) < new Date() ? "Review due" : "Up to date") : "Not started"} onView={() => onTabChange("care-risk")} />
            <CareSummaryRow label="Behaviour Support Plan" lastReviewed={latestBSP?.created_date} status={latestBSP ? "Up to date" : "Not started"} onView={() => onTabChange("care-risk")} />
            <CareSummaryRow label="Therapeutic Plan" lastReviewed={latestTP?.created_date} status={latestTP ? "Up to date" : "Not started"} onView={() => onTabChange("health")} />
            {latestPP && <CareSummaryRow label="Pathway Plan" lastReviewed={latestPP?.created_date} status="Up to date" onView={() => onTabChange("daily-life")} />}
            <button className="mt-3 text-xs text-teal-600 font-semibold hover:underline">View all care plans →</button>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No recent activity yet</p>
            ) : recentActivity.map((item, i) => (
              <ActivityRow
                key={i}
                type={item.type}
                datetime={item.datetime}
                by={item.by}
                severity={item.severity}
                onClick={() => setActivityModal(item)}
              />
            ))}
            <button className="mt-2 text-xs text-teal-600 font-semibold hover:underline">View timeline →</button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-72 xl:w-80 shrink-0 space-y-4">
        {/* Activity Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Activity Timeline</h3>
            <button className="text-xs text-teal-600 hover:underline">View full timeline →</button>
          </div>
          {timelineItems.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No activity recorded yet</p>
          ) : timelineItems.map((item, i) => (
            <TimelineItem key={i} {...item} />
          ))}
          <button className="text-xs text-teal-600 font-semibold hover:underline mt-1">View full timeline →</button>
        </div>

        {/* Documents & Compliance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Documents & Compliance</h3>
          </div>
          <div className="space-y-2">
            {complianceAlerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
                a.color === "red" ? "bg-red-50 text-red-700" :
                a.color === "amber" ? "bg-amber-50 text-amber-700" :
                a.color === "green" ? "bg-green-50 text-green-700" :
                "bg-slate-50 text-slate-600"
              }`}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {a.text}
              </div>
            ))}
          </div>
          <button onClick={() => onTabChange("records")} className="mt-3 text-xs text-teal-600 font-semibold hover:underline">View all →</button>
        </div>

        {/* What's New */}
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <h3 className="font-semibold text-sm mb-3">What's New</h3>
          <div className="space-y-3 text-xs text-slate-300">
            {[
              { icon: "📋", title: "Fewer Tabs", desc: "All info in one workspace." },
              { icon: "👤", title: "Resident-Centric", desc: "Focused on this young person." },
              { icon: "⚡", title: "At-a-Glance", desc: "Key info, risks, and alerts visible immediately." },
              { icon: "🕐", title: "Timeline View", desc: "Cross-functional timeline avoids jumping between tabs." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-2">
                <span className="text-base shrink-0">{icon}</span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity modal */}
      {activityModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setActivityModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-3">{activityModal.type}</h3>
            <div className="text-sm text-slate-600 space-y-2">
              {Object.entries(activityModal.raw || {}).filter(([k, v]) => v && !["id", "org_id"].includes(k)).slice(0, 12).map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-slate-400 capitalize w-36 shrink-0">{k.replace(/_/g, " ")}</span>
                  <span className="text-slate-700 font-medium break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setActivityModal(null)} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}