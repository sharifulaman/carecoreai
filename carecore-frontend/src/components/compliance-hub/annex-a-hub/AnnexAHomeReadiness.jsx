import { Building2, Table2, Grid3X3, BarChart3 } from "lucide-react";

const SERVICE_LABELS = {
  outreach: "Outreach",
  eighteen_plus: "18+",
  twenty_four_hours: "24h",
};

function scoreColor(score) {
  if (score >= 80) return { bg: "bg-green-500", text: "text-green-700", label: "Ready" };
  if (score >= 50) return { bg: "bg-amber-500", text: "text-amber-700", label: "Review" };
  if (score > 0) return { bg: "bg-red-500", text: "text-red-700", label: "Critical" };
  return { bg: "bg-slate-300", text: "text-slate-500", label: "No data" };
}

export default function AnnexAHomeReadiness({ reportingPeriod, currentResidents, homes, residents, metrics, allegations, complaints, mfhRecords, incidents, staffMovements, educationRecords, selectedHome, setSelectedHome }) {
  // Compute per-home readiness
  const homeScores = homes.map(h => {
    const hResidents = residents.filter(r => r.home_id === h.id);
    const hMfh = mfhRecords.filter(m => m.home_id === h.id);
    const hComplaints = complaints.filter(c => c.home_id === h.id);
    const hIncidents = incidents.filter(i => i.home_id === h.id);
    const hEdu = educationRecords.filter(e => hResidents.some(r => r.id === e.resident_id));

    let score = 100;
    if (hResidents.some(r => !r.accommodation_category)) score -= 15;
    if (hResidents.some(r => !r.placing_local_authority)) score -= 10;
    if (hMfh.some(m => typeof m.rhi_offered_by_la !== "boolean")) score -= 10;
    if (hIncidents.some(i => i.police_called && !i.police_callout_reason)) score -= 10;
    if (hIncidents.some(i => i.restraint_used && i.manager_review_status !== "reviewed")) score -= 10;
    if (hEdu.length === 0 && hResidents.length > 0) score -= 15;
    if (hResidents.length === 0) score = 0;
    score = Math.max(0, score);

    const flags = (hResidents.some(r => !r.accommodation_category) ? 1 : 0) +
      (hMfh.some(m => typeof m.rhi_offered_by_la !== "boolean") ? 1 : 0) +
      (hIncidents.some(i => i.restraint_used && i.manager_review_status !== "reviewed") ? 1 : 0);

    return {
      homeId: h.id,
      homeName: h.name,
      serviceType: SERVICE_LABELS[h.type] || h.type || "—",
      residentCount: hResidents.length,
      score,
      flags,
      evidence: hEdu.length + hComplaints.length + hMfh.length,
    };
  }).sort((a, b) => b.score - a.score);

  // Data capture summary
  const dataCapture = [
    { label: "Allegations logged", value: allegations.length },
    { label: "Complaints logged", value: complaints.length },
    { label: "Missing episodes", value: mfhRecords.length },
    { label: "Child complaints", value: complaints.filter(c => c.is_child_complainant).length },
    { label: "Restraint incidents", value: incidents.filter(i => i.restraint_used).length },
    { label: "Police incidents", value: incidents.filter(i => i.police_called).length },
    { label: "Staff starters", value: staffMovements.filter(sm => sm.movement_type === "new_starter" && new Date(sm.movement_date) >= reportingPeriod.startDate).length },
    { label: "Staff leavers", value: staffMovements.filter(sm => sm.movement_type === "leaver" && new Date(sm.movement_date) >= reportingPeriod.startDate).length },
    { label: "Children in education", value: educationRecords.filter(e => currentResidents.some(r => r.id === e.resident_id) && e.status !== "neet").length },
    { label: "Children NEET", value: educationRecords.filter(e => currentResidents.some(r => r.id === e.resident_id) && e.status === "neet").length },
  ];

  return (
    <div className="space-y-3">
      {/* Inspection Scope */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-700">Inspection Scope</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-400">Reporting Period</p>
            <p className="font-semibold text-slate-700">{reportingPeriod.startDate?.toLocaleDateString()} → {reportingPeriod.endDate?.toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Residents in Scope</p>
            <p className="font-semibold text-slate-700">{currentResidents.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Homes Registered</p>
            <p className="font-semibold text-slate-700">{homes.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Premises in Use</p>
            <p className="font-semibold text-slate-700">{homes.filter(h => h.premises_currently_in_use !== false).length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Service Categories</p>
            <p className="font-semibold text-slate-700">{[...new Set(homes.map(h => h.type))].filter(Boolean).length}</p>
          </div>
        </div>
      </div>

      {/* Home Readiness Ranking */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Table2 className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-700">Home Readiness Ranking</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1 px-1 font-medium">Home</th>
                <th className="text-left py-1 px-1 font-medium">Type</th>
                <th className="text-center py-1 px-1 font-medium">YP</th>
                <th className="text-center py-1 px-1 font-medium">Score</th>
                <th className="text-center py-1 px-1 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {homeScores.slice(0, 8).map(h => {
                const sc = scoreColor(h.score);
                return (
                  <tr
                    key={h.homeId}
                    onClick={() => setSelectedHome(selectedHome === h.homeId ? "" : h.homeId)}
                    className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${selectedHome === h.homeId ? "bg-blue-50" : ""}`}
                  >
                    <td className="py-1 px-1 font-medium text-slate-700 truncate max-w-[100px]">{h.homeName}</td>
                    <td className="py-1 px-1 text-slate-500">{h.serviceType}</td>
                    <td className="py-1 px-1 text-center text-slate-600">{h.residentCount}</td>
                    <td className="py-1 px-1 text-center">
                      <span className={`font-bold ${sc.text}`}>{h.score}</span>
                    </td>
                    <td className="py-1 px-1 text-center">
                      {h.flags > 0 ? <span className="text-red-600 font-medium">{h.flags}</span> : <span className="text-slate-300">0</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Home Readiness Heatmap */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Grid3X3 className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-700">Home Readiness Heatmap</h3>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {homeScores.map(h => {
            const sc = scoreColor(h.score);
            return (
              <div
                key={h.homeId}
                title={`${h.homeName}: ${h.score}/100 (${sc.label})`}
                onClick={() => setSelectedHome(selectedHome === h.homeId ? "" : h.homeId)}
                className={`aspect-square rounded ${sc.bg} ${selectedHome === h.homeId ? "ring-2 ring-blue-400" : ""} cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center`}
              >
                <span className="text-[8px] text-white font-bold">{h.score}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" /> Ready</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Review</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> Critical</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-300" /> No data</span>
        </div>
      </div>

      {/* Data Capture Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-700">Data Capture Summary</h3>
        </div>
        <div className="space-y-1">
          {dataCapture.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
              <span className="text-slate-500">{d.label}</span>
              <span className="font-bold text-slate-700">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}