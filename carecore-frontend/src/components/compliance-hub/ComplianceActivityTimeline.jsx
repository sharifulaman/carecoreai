import { format } from "date-fns";
import { Upload, AlertTriangle, ClipboardList, CheckCircle2, ShieldCheck, FileText, ChevronRight } from "lucide-react";

const EVENT_CONFIG = {
  evidence_uploaded: { icon: Upload, color: "bg-teal-100 text-teal-600" },
  item_updated: { icon: AlertTriangle, color: "bg-red-100 text-red-600" },
  task_assigned: { icon: ClipboardList, color: "bg-blue-100 text-blue-600" },
  item_closed: { icon: CheckCircle2, color: "bg-green-100 text-green-600" },
  audit_review_run: { icon: ShieldCheck, color: "bg-purple-100 text-purple-600" },
  renewal_requested: { icon: FileText, color: "bg-amber-100 text-amber-600" },
  item_created: { icon: FileText, color: "bg-slate-100 text-slate-600" },
  default: { icon: FileText, color: "bg-slate-100 text-slate-500" },
};

export default function ComplianceActivityTimeline({ events }) {
  const sorted = [...events].sort((a, b) => (b.event_datetime || "").localeCompare(a.event_datetime || "")).slice(0, 8);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">Compliance Activity Timeline</h3>
        <button className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">View all activity <ChevronRight className="w-3 h-3" /></button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No recent activity</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {sorted.map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.event_type] || EVENT_CONFIG.default;
            const Icon = cfg.icon;
            const dt = ev.event_datetime ? new Date(ev.event_datetime) : null;
            return (
              <div key={ev.id || i} className="flex flex-col items-center min-w-[160px] max-w-[180px] shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.color} mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                {dt && (
                  <p className="text-[10px] text-slate-400 font-medium">{format(dt, "dd MMM yyyy")}</p>
                )}
                {dt && (
                  <p className="text-[10px] text-slate-400 mb-1">{format(dt, "hh:mm a")}</p>
                )}
                <p className="text-xs font-semibold text-slate-700 text-center leading-tight">{ev.event_title}</p>
                {ev.home_name && <p className="text-[10px] text-slate-400 text-center mt-0.5">{ev.home_name}</p>}
                {ev.performed_by_name && <p className="text-[10px] text-slate-400 text-center">{ev.performed_by_name}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}