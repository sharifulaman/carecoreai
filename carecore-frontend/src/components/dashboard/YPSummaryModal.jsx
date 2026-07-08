import { X } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const MODAL_CONFIGS = {
  safeguarding: {
    title: "Safeguarding Watch",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    emptyMsg: "No active safeguarding cases.",
  },
  missing: {
    title: "Missing Risk Due",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    emptyMsg: "No active missing episodes.",
  },
  risk: {
    title: "Risk Assessments Due",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    emptyMsg: "No active risk assessments.",
  },
  plans: {
    title: "Support Plans Due",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    emptyMsg: "No active support plans.",
  },
  appointments: {
    title: "Appointments Today",
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    emptyMsg: "No appointments today.",
  },
  education: {
    title: "Education Overdue",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    emptyMsg: "No overdue education records.",
  },
};

function Row({ label, value, sub, link }) {
  const inner = (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {value && <span className="text-xs text-slate-500 shrink-0 ml-4">{value}</span>}
    </div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}

export default function YPSummaryModal({ type, data, onClose }) {
  const cfg = MODAL_CONFIGS[type];
  if (!cfg) return null;

  const today = format(new Date(), "yyyy-MM-dd");

  const rows = (() => {
    if (type === "safeguarding") {
      return (data.safeguarding || [])
        .filter(s => s.status === "under_investigation")
        .map(s => ({
          label: s.resident_name || "Unknown YP",
          sub: `${s.concern_type?.replace(/_/g, " ")} · ${s.home_name || ""}`,
          value: s.immediate_risk ? `Risk: ${s.immediate_risk}` : null,
          link: "/residents",
        }));
    }
    if (type === "missing") {
      return (data.missingFromHome || [])
        .filter(m => m.status === "active")
        .map(m => ({
          label: m.resident_name || "Unknown YP",
          sub: `Missing since ${m.last_seen_datetime ? format(new Date(m.last_seen_datetime), "d MMM HH:mm") : "—"} · ${m.home_name || ""}`,
          value: `Risk: ${m.risk_level_at_time || "—"}`,
          link: "/residents",
        }));
    }
    if (type === "risk") {
      return (data.riskAssessments || [])
        .filter(r => r.status === "active")
        .map(r => ({
          label: r.resident_name || r.resident_id || "Unknown YP",
          sub: r.home_id || "",
          value: r.risk_level || null,
          link: "/residents",
        }));
    }
    if (type === "plans") {
      return (data.supportPlans || [])
        .filter(s => s.status === "active")
        .map(s => ({
          label: s.resident_name || s.resident_id || "Unknown YP",
          sub: s.plan_type?.replace(/_/g, " ") || "Support Plan",
          value: s.review_date ? `Review: ${format(new Date(s.review_date), "d MMM")}` : null,
          link: "/residents",
        }));
    }
    if (type === "appointments") {
      return (data.appointments || [])
        .filter(a => a.date === today || a.scheduled_date === today)
        .map(a => ({
          label: a.resident_name || "Unknown YP",
          sub: `${a.appointment_type || "Appointment"} · ${a.time || a.start_time || ""}`,
          value: a.location || null,
          link: "/residents",
        }));
    }
    if (type === "education") {
      return (data.residents || [])
        .filter(r => r.education_status === "neet" && r.status === "active")
        .map(r => ({
          label: r.display_name || r.full_name || "Unknown YP",
          sub: `NEET · ${r.home_id || ""}`,
          value: null,
          link: "/education",
        }));
    }
    return [];
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 ${cfg.bg}`}>
          <h2 className={`text-base font-bold ${cfg.color}`}>{cfg.title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/60 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Count badge */}
        <div className={`px-5 py-3 border-b border-slate-100 flex items-center gap-2`}>
          <span className={`text-2xl font-black ${cfg.color}`}>{rows.length}</span>
          <span className="text-sm text-slate-500">records found</span>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 py-2 divide-y divide-slate-50">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{cfg.emptyMsg}</p>
          ) : (
            rows.map((r, i) => <Row key={i} {...r} />)
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <Link to="/residents" onClick={onClose} className="text-xs font-semibold text-blue-600 hover:underline">
            View all in Residents →
          </Link>
        </div>
      </div>
    </div>
  );
}