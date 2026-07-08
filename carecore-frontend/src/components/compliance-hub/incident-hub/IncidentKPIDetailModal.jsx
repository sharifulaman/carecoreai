import { useMemo } from "react";
import { X, MapPin, User, Clock } from "lucide-react";
import { format } from "date-fns";
import {
  getIncidentSeverity, getOfstedStatus, getResolutionHours, formatResolution,
  SEVERITY_COLORS, OFSTED_STATUS_COLORS, STATUS_COLORS, INCIDENT_TYPE_LABELS,
} from "@/lib/incidentAnalytics";

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  green: { bg: "bg-green-50", text: "text-green-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-600" },
  red: { bg: "bg-red-50", text: "text-red-600" },
};

export default function IncidentKPIDetailModal({ title, icon: Icon, color, incidents, ofstedNotifications, homes, onClose }) {
  const cm = COLOR_MAP[color] || COLOR_MAP.blue;
  const sorted = useMemo(() => {
    return [...incidents].sort((a, b) =>
      new Date(b.incident_datetime || b.created_date) - new Date(a.incident_datetime || a.created_date)
    );
  }, [incidents]);

  const homeName = (id) => homes.find(h => h.id === id)?.name || "—";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${cm.bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${cm.text}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{sorted.length} incident{sorted.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No incidents in this category.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map(inc => {
                const sev = getIncidentSeverity(inc);
                const ofsted = getOfstedStatus(inc, ofstedNotifications);
                const hours = getResolutionHours(inc);
                return (
                  <div key={inc.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{inc.id?.slice(0, 8)}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${SEVERITY_COLORS[sev]}`}>{sev}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${STATUS_COLORS[inc.status] || "bg-slate-100 text-slate-600"}`}>{inc.status}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {INCIDENT_TYPE_LABELS[inc.incident_type] || inc.incident_type || "Incident"}
                        </p>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${OFSTED_STATUS_COLORS[ofsted]} shrink-0`}>
                        Ofsted: {ofsted}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{homeName(inc.home_id)}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{inc.resident_name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{inc.incident_datetime ? format(new Date(inc.incident_datetime), "dd MMM yyyy, HH:mm") : "—"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">Age: </span>
                        <span className="font-medium">{formatResolution(hours)}</span>
                      </div>
                    </div>
                    {inc.narrative && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">{inc.narrative}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}