import { Activity, AlertTriangle, CheckCircle2, Clock, Shield, ShieldAlert, AlertCircle, FileWarning } from "lucide-react";
import { formatResolution, getMeanResolutionHours, getOfstedStatus, getResolutionHours } from "@/lib/incidentAnalytics";

function KPICard({ icon: Icon, label, value, sub, color, bg, border, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border ${border} p-3 flex items-start gap-2.5 text-left transition-all hover:shadow-md hover:border-slate-300 cursor-pointer`}
    >
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className={`text-xl font-black ${color}`}>{value}</div>
        <div className="text-[10px] font-semibold text-slate-700 leading-tight">{label}</div>
        {sub && <div className="text-[9px] text-slate-400 truncate">{sub}</div>}
      </div>
    </button>
  );
}

export default function IncidentHubKPIs({ incidents, ofstedNotifications, onOpenModal }) {
  const total = incidents.length;
  const openIncidents = incidents.filter(i => i.status !== "closed");
  const closedIncidents = incidents.filter(i => i.status === "closed");
  const meanResHours = getMeanResolutionHours(incidents);
  const ofstedInformedIncidents = incidents.filter(i => {
    const n = ofstedNotifications.find(on => on.incident_id === i.id);
    return n && ["notified", "acknowledged", "closed"].includes(n.status);
  });
  const ofstedPendingIncidents = incidents.filter(i => {
    const n = ofstedNotifications.find(on => on.incident_id === i.id);
    return n && ["pending", "pending_tl", "pending_tm", "pending_rsm", "overdue"].includes(n.status);
  });
  const reg27Incidents = incidents.filter(i => i.reg27_trigger);
  const overdueIncidents = incidents.filter(i => {
    if (i.status === "closed" || i.manager_review_status === "reviewed") return false;
    if (!i.incident_datetime) return false;
    const hours = (new Date() - new Date(i.incident_datetime)) / (1000 * 60 * 60);
    return hours > 72;
  });

  const ofstedInformed = ofstedInformedIncidents.length;
  const ofstedPending = ofstedPendingIncidents.length;
  const reg27Triggered = reg27Incidents.length;
  const overdueReviews = overdueIncidents.length;
  const ofstedPct = total > 0 ? Math.round((ofstedInformed / total) * 100) : 0;

  const cards = [
    { key: "total", icon: Activity, label: "Total Incidents", value: total, sub: "In selected range", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", list: incidents },
    { key: "open", icon: AlertCircle, label: "Open Incidents", value: openIncidents.length, sub: "Awaiting closure", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", list: openIncidents },
    { key: "closed", icon: CheckCircle2, label: "Closed Incidents", value: closedIncidents.length, sub: "Resolved", color: "text-green-600", bg: "bg-green-50", border: "border-green-100", list: closedIncidents },
    { key: "mtr", icon: Clock, label: "Mean Time to Resolution", value: formatResolution(meanResHours), sub: "Closed incidents avg", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", list: closedIncidents },
    { key: "ofsted_informed", icon: Shield, label: "Ofsted Informed", value: `${ofstedInformed} (${ofstedPct}%)`, sub: "Notified", color: "text-green-600", bg: "bg-green-50", border: "border-green-100", list: ofstedInformedIncidents },
    { key: "ofsted_pending", icon: ShieldAlert, label: "Ofsted Pending", value: ofstedPending, sub: "Awaiting notification", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", list: ofstedPendingIncidents },
    { key: "reg27", icon: AlertTriangle, label: "Serious / Reg 27", value: reg27Triggered, sub: "Triggered", color: "text-red-600", bg: "bg-red-50", border: "border-red-100", list: reg27Incidents },
    { key: "overdue", icon: FileWarning, label: "Overdue Reviews", value: overdueReviews, sub: ">72h open", color: "text-red-600", bg: "bg-red-50", border: "border-red-100", list: overdueIncidents },
  ];

  const colorKey = (c) => c.replace("text-", "").replace("-600", "");

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {cards.map(card => (
        <KPICard
          key={card.key}
          icon={card.icon}
          label={card.label}
          value={card.value}
          sub={card.sub}
          color={card.color}
          bg={card.bg}
          border={card.border}
          onClick={() => onOpenModal?.({ title: card.label, icon: card.icon, color: colorKey(card.color), list: card.list })}
        />
      ))}
    </div>
  );
}