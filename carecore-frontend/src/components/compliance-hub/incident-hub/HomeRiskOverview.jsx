import { useMemo } from "react";
import { X } from "lucide-react";
import { getIncidentSeverity } from "@/lib/incidentAnalytics";

export default function HomeRiskOverview({ incidents, homes, onHomeClick, selectedHomeIds }) {
  const homeRisks = useMemo(() => {
    return homes.map(h => {
      const homeIncidents = incidents.filter(i => i.home_id === h.id);
      const open = homeIncidents.filter(i => i.status !== "closed").length;
      const severities = homeIncidents.map(getIncidentSeverity);
      const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const highest = severities.reduce((max, s) => (severityOrder[s] > severityOrder[max] ? s : max), "Low");
      return {
        id: h.id,
        name: h.name?.split(" - ")[0] || h.name || "Unnamed",
        type: h.type,
        total: homeIncidents.length,
        open,
        highestSeverity: highest,
      };
    }).sort((a, b) => b.total - a.total || b.open - a.open);
  }, [incidents, homes]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-900">Home Risk Overview</h3>
        {selectedHomeIds?.length > 0 && (
          <button
            onClick={() => onHomeClick?.(null)}
            className="text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear filter
          </button>
        )}
      </div>
      <p className="text-[10px] text-slate-400 mb-3">{homes.length} homes · Click to filter incidents</p>
      <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
        {homeRisks.map(r => {
          const isSelected = selectedHomeIds?.includes(r.id);
          return (
            <button key={r.id} onClick={() => onHomeClick?.(isSelected ? null : r.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left ${
                isSelected ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
              }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-slate-700 truncate">{r.name}</span>
                <span className="text-[10px] text-slate-400 capitalize shrink-0">{r.type?.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-slate-700">{r.total}</span>
                <span className="text-[10px] text-amber-600 w-12 text-right">{r.open} open</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  r.highestSeverity === "Critical" ? "bg-red-100 text-red-700" :
                  r.highestSeverity === "High" ? "bg-orange-100 text-orange-700" :
                  r.highestSeverity === "Medium" ? "bg-amber-100 text-amber-700" :
                  "bg-green-100 text-green-700"
                }`}>{r.highestSeverity}</span>
              </div>
            </button>
          );
        })}
        {homeRisks.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No homes data</p>}
      </div>
    </div>
  );
}