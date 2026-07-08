import { useMemo } from "react";
import { Shield, AlertTriangle, FileWarning, FileText, Zap } from "lucide-react";
import {
  getOfstedStatus, getReg27DeadlineStatus, getMissingReadinessItems,
  OFSTED_STATUS_COLORS,
} from "@/lib/incidentAnalytics";

function DonutChart({ informed, pending, notInformed, total }) {
  if (total === 0) {
    return <div className="flex items-center justify-center h-32 text-xs text-slate-400">No data</div>;
  }
  const radius = 50, circ = 2 * Math.PI * radius;
  const informedPct = total > 0 ? informed / total : 0;
  const pendingPct = total > 0 ? pending / total : 0;
  const informedDash = informedPct * circ;
  const pendingDash = pendingPct * circ;

  return (
    <div className="flex items-center gap-4">
      <svg width={120} height={120} viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {informed > 0 && (
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#16a34a" strokeWidth="14"
            strokeDasharray={`${informedDash} ${circ - informedDash}`} strokeLinecap="round" transform="rotate(-90 70 70)" />
        )}
        {pending > 0 && (
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#d97706" strokeWidth="14"
            strokeDasharray={`${pendingDash} ${circ - pendingDash}`} strokeDashoffset={-informedDash} strokeLinecap="round" transform="rotate(-90 70 70)" />
        )}
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1e293b">{total}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#64748b">Total</text>
      </svg>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Informed: <strong>{informed}</strong></div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending: <strong>{pending}</strong></div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Not Informed: <strong>{notInformed}</strong></div>
      </div>
    </div>
  );
}

export default function IncidentHubSidebar({ incidents, ofstedNotifications, homes, onGeneratePack, selectedIds, filters }) {
  const ofstedStats = useMemo(() => {
    let informed = 0, pending = 0, notInformed = 0;
    incidents.forEach(i => {
      const s = getOfstedStatus(i, ofstedNotifications);
      if (s === "Yes") informed++;
      else if (s === "Pending") pending++;
      else if (s === "No") notInformed++;
    });
    return { informed, pending, notInformed, total: incidents.length };
  }, [incidents, ofstedNotifications]);

  const requiringNotification = useMemo(() => {
    return incidents.filter(i => {
      const s = getOfstedStatus(i, ofstedNotifications);
      return s === "No" || s === "Pending";
    }).slice(0, 8);
  }, [incidents, ofstedNotifications]);

  const readinessGaps = useMemo(() => {
    const gaps = {};
    incidents.forEach(i => {
      getMissingReadinessItems(i, ofstedNotifications).forEach(item => {
        gaps[item] = (gaps[item] || 0) + 1;
      });
    });
    return Object.entries(gaps).sort((a, b) => b[1] - a[1]);
  }, [incidents, ofstedNotifications]);

  return (
    <div className="space-y-3">
      {/* Ofsted Notification Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">Ofsted Notification Status</h3>
        </div>
        <DonutChart {...ofstedStats} />
      </div>

      {/* Incidents Requiring Notification */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-semibold text-slate-900">Incidents Requiring Notification</h3>
        </div>
        {requiringNotification.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">All notifications complete.</p>
        ) : (
          <div className="space-y-2">
            {requiringNotification.map(inc => {
              const deadline = getReg27DeadlineStatus(inc, ofstedNotifications);
              const home = homes.find(h => h.id === inc.home_id);
              return (
                <div key={inc.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-slate-400">{inc.id?.slice(0, 8)}</p>
                    <p className="font-medium text-slate-700 truncate">{home?.name || inc.home_name || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${OFSTED_STATUS_COLORS[getOfstedStatus(inc, ofstedNotifications)]}`}>
                      {getOfstedStatus(inc, ofstedNotifications)}
                    </span>
                    {deadline === "overdue" && <p className="text-[9px] text-red-600 font-bold mt-0.5">OVERDUE</p>}
                    {deadline === "urgent" && <p className="text-[9px] text-amber-600 font-bold mt-0.5">URGENT</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reg 27 Readiness */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileWarning className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-slate-900">Reg 27 / Ofsted Readiness</h3>
        </div>
        {readinessGaps.length === 0 ? (
          <p className="text-xs text-green-600 text-center py-4">✓ All readiness items complete.</p>
        ) : (
          <div className="space-y-1.5">
            {readinessGaps.map(([item, count]) => (
              <div key={item} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {item}
                </span>
                <span className="font-bold text-amber-600">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Ofsted Pack */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Generate Ofsted Pack</h3>
        </div>
        <p className="text-[10px] text-blue-100 mb-3">
          {selectedIds.length > 0
            ? `${selectedIds.length} incident(s) selected for report.`
            : `Will include all ${incidents.length} filtered incidents.`}
        </p>
        <button onClick={onGeneratePack}
          className="w-full flex items-center justify-center gap-2 bg-white text-blue-700 rounded-lg py-2 text-xs font-bold hover:bg-blue-50 transition-colors">
          <Zap className="w-3.5 h-3.5" /> Generate Pack
        </button>
      </div>
    </div>
  );
}