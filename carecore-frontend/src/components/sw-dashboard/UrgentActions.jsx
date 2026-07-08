import { AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UrgentActions({ assignedResidents = [], missingEpisodes = [], exploitationRisks = [], allStatuses = {} }) {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assignedIds = assignedResidents.map((r) => r.id);

  // Build urgent items from live data
  const urgentActions = [
    // Active missing episodes
    ...missingEpisodes
      .filter((m) => assignedIds.includes(m.resident_id) && m.status === "active")
      .map((m) => ({
        id: `mfh-${m.id}`,
        resident: m.resident_name,
        title: "Active missing episode",
        due: `Missing since ${new Date(m.date_missing).toLocaleDateString()}`,
        severity: "critical",
        link: "/residents?tab=missing",
      })),

    // CSE overdue reviews
    ...exploitationRisks
      .filter(
        (e) =>
          assignedIds.includes(e.resident_id) &&
          new Date(e.review_date || 0) < today &&
          ["high", "critical"].includes((e.overall_risk_level || "").toLowerCase())
      )
      .map((e) => ({
        id: `cse-${e.id}`,
        resident: e.resident_name,
        title: "CSE/CCE risk review overdue",
        due: `Overdue since ${new Date(e.review_date).toLocaleDateString()}`,
        severity: "overdue",
        link: "/residents?tab=risk",
      })),

    // Annex A gaps
    ...assignedResidents
      .filter((r) => {
        const gaps = [
          !r.accommodation_category,
          !r.placing_local_authority,
          r.uasc === undefined || r.uasc === null,
        ].filter(Boolean).length;
        return gaps > 0;
      })
      .map((r) => ({
        id: `annexa-${r.id}`,
        resident: r.display_name,
        title: "Annex A readiness gap",
        due: "Review required",
        severity: "due",
        link: "/compliance-hub",
      })),
  ]
    .sort((a, b) => {
      const severityOrder = { critical: 0, overdue: 1, due: 2 };
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    })
    .slice(0, 5);
  if (urgentActions.length === 0) {
    return (
      <section className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-slate-900">
            <AlertTriangle size={18} className="text-green-500" /> Urgent Actions
          </div>
        </div>
        <div className="text-sm text-slate-500">All systems normal — no urgent actions.</div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-slate-900">
          <AlertTriangle size={18} className="text-red-500" /> Urgent Actions
        </div>
        <button className="text-sm font-bold text-blue-600">View all</button>
      </div>
      <div className="space-y-2">
        {urgentActions.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.link || "/residents")}
            className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 px-3 py-2.5 text-left hover:bg-red-50"
          >
            <AlertTriangle
              size={16}
              className={
                action.severity === "critical"
                  ? "text-red-700"
                  : action.severity === "overdue"
                  ? "text-red-500"
                  : "text-amber-500"
              }
            />
            <div className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
              {action.resident} — {action.title}
            </div>
            <span
              className={`shrink-0 text-xs font-black ${
                action.severity === "critical"
                  ? "text-red-700"
                  : action.severity === "overdue"
                  ? "text-red-600"
                  : "text-amber-600"
              }`}
            >
              {action.due}
            </span>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        ))}
      </div>
    </section>
  );
}