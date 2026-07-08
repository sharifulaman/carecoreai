import { useMemo } from "react";
import { getIncidentSeverity } from "@/lib/incidentAnalytics";

export default function HomeRiskHeatmap({ incidents, homes, onHomeClick }) {
  const homeRisk = useMemo(() => {
    return homes.map(h => {
      const homeIncidents = incidents.filter(i => i.home_id === h.id);
      const open = homeIncidents.filter(i => i.status !== "closed").length;
      const critical = homeIncidents.filter(i => getIncidentSeverity(i) === "Critical" || getIncidentSeverity(i) === "High").length;
      const ofstedPending = homeIncidents.filter(i => i.reg27_trigger && !i.reg27_notification_id).length;

      let level = "green";
      if (critical >= 2 || ofstedPending > 0) level = "red";
      else if (open >= 2 || critical >= 1) level = "amber";

      return { home: h, count: homeIncidents.length, open, critical, ofstedPending, level };
    });
  }, [incidents, homes]);

  const colorMap = {
    green: "bg-green-400 hover:bg-green-500",
    amber: "bg-amber-400 hover:bg-amber-500",
    red: "bg-red-500 hover:bg-red-600",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Home Risk Heatmap</h3>
      <p className="text-[10px] text-slate-400 mb-3">{homes.length} homes · Click a tile to filter</p>
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1">
        {homeRisk.map(({ home, count, open, critical, ofstedPending, level }) => (
          <button key={home.id} onClick={() => onHomeClick?.(home.id)}
            title={`${home.name}\nIncidents: ${count}\nOpen: ${open}\nCritical/High: ${critical}\nOfsted Pending: ${ofstedPending}`}
            className={`w-full aspect-square rounded ${colorMap[level]} transition-all hover:scale-110 hover:z-10 relative`}
          />
        ))}
        {homeRisk.length === 0 && <p className="text-xs text-slate-400 col-span-full text-center py-4">No homes</p>}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400" /> Low risk</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> Medium</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> High/Critical</span>
      </div>
    </div>
  );
}