import { useState, useMemo } from "react";
import { AlertTriangle, ShieldAlert, MapPin, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const MINI_TABS = [
  { key: "risks", label: "Risk Assessments" },
  { key: "incidents", label: "Incident Logs" },
  { key: "missing", label: "Missing Episodes" },
  { key: "safeguarding", label: "Safeguarding" },
  { key: "behaviour", label: "Behaviour" },
];

function StatCard({ label, value, color }) {
  const colors = { red: "bg-red-50 border-red-200 text-red-700", amber: "bg-amber-50 border-amber-200 text-amber-700", green: "bg-green-50 border-green-200 text-green-700", slate: "bg-slate-50 border-slate-200 text-slate-600" };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.slate}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return <div className="text-center py-12 text-slate-400 text-sm">{message}</div>;
}

function RecordModal({ record, onClose }) {
  if (!record) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4 capitalize">{record._type || "Record"}</h3>
        <div className="space-y-2 text-sm">
          {Object.entries(record).filter(([k, v]) => v && !["id", "org_id", "_type"].includes(k)).map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="text-slate-400 capitalize w-40 shrink-0">{k.replace(/_/g, " ")}</span>
              <span className="text-slate-700 font-medium break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">Close</button>
      </div>
    </div>
  );
}

export default function WorkspaceCareRiskTab({ resident, data, isAdminOrTL }) {
  const [activeTab, setActiveTab] = useState("risks");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const highRisks = useMemo(() => (data.riskAssessments || []).filter(r => r.overall_rating === "high"), [data.riskAssessments]);
  const medRisks = useMemo(() => (data.riskAssessments || []).filter(r => r.overall_rating === "medium"), [data.riskAssessments]);
  const openIncidents = useMemo(() => (data.accidents || []).filter(a => a.status === "open" || a.status === "Draft" || a.status === "Submitted"), [data.accidents]);
  const activeMFH = useMemo(() => (data.mfhRecords || []).filter(m => m.status === "active"), [data.mfhRecords]);
  const openSG = useMemo(() => (data.safeguardingRecords || []).filter(s => s.status !== "closed"), [data.safeguardingRecords]);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Open Incidents" value={openIncidents.length} color={openIncidents.length > 0 ? "red" : "green"} />
        <StatCard label="High Risks" value={highRisks.length} color={highRisks.length > 0 ? "red" : "green"} />
        <StatCard label="Medium Risks" value={medRisks.length} color={medRisks.length > 0 ? "amber" : "green"} />
        <StatCard label="Missing Episodes" value={(data.mfhRecords || []).length} color={activeMFH.length > 0 ? "red" : "slate"} />
        <StatCard label="Safeguarding Actions" value={openSG.length} color={openSG.length > 0 ? "amber" : "green"} />
      </div>

      {/* Mini tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
        {MINI_TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === t.key ? "border-teal-500 text-teal-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === "risks" && (
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Risk Level</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Last Reviewed</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
            </tr></thead>
            <tbody>
              {(data.riskAssessments || []).length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No active risks recorded" /></td></tr>
              ) : (data.riskAssessments || []).map(r => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-3 font-medium capitalize">{r.category?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${r.overall_rating === "high" ? "bg-red-100 text-red-700" : r.overall_rating === "medium" ? "bg-amber-100 text-amber-700" : r.overall_rating === "low" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{r.overall_rating || "Unknown"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.last_reviewed_at ? format(new Date(r.last_reviewed_at), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-500 capitalize">{r.status || "Active"}</span></td>
                  <td className="px-4 py-3"><button onClick={() => setSelectedRecord({ ...r, _type: "Risk Assessment" })} className="text-xs text-teal-600 hover:underline font-medium">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "incidents" && (
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Risk Level</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Logged By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
            </tr></thead>
            <tbody>
              {(data.accidents || []).length === 0 ? (
                <tr><td colSpan={6}><EmptyState message="No incident records found" /></td></tr>
              ) : (data.accidents || []).map(a => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-3 text-xs text-slate-500">{a.date || "—"}</td>
                  <td className="px-4 py-3 text-xs capitalize">{a.incident_type || a.type?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3">
                    {a.risk_level && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.risk_level === "High" || a.risk_level === "Immediate danger" ? "bg-red-100 text-red-700" : a.risk_level === "Monitor" || a.risk_level === "Elevated" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{a.risk_level}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">{a.reported_by || "—"}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${a.status === "Draft" || a.status === "open" ? "bg-slate-100 text-slate-600" : a.status === "Submitted" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{a.status || "—"}</span></td>
                  <td className="px-4 py-3"><button onClick={() => setSelectedRecord({ ...a, _type: "Incident" })} className="text-xs text-teal-600 hover:underline font-medium">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "missing" && (
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date Missing</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Returned</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Risk Level</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Police Notified</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
            </tr></thead>
            <tbody>
              {(data.mfhRecords || []).length === 0 ? (
                <tr><td colSpan={6}><EmptyState message="No missing episodes recorded" /></td></tr>
              ) : (data.mfhRecords || []).map(m => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-3 text-xs">{m.reported_missing_datetime ? format(new Date(m.reported_missing_datetime), "dd MMM yyyy HH:mm") : "—"}</td>
                  <td className="px-4 py-3 text-xs">{m.returned_datetime ? format(new Date(m.returned_datetime), "dd MMM HH:mm") : "Still missing"}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${m.risk_level_at_time === "critical" || m.risk_level_at_time === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{m.risk_level_at_time || "—"}</span></td>
                  <td className="px-4 py-3 text-xs">{m.reported_to_police ? `Yes (${m.police_reference_number || "no ref"})` : "No"}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${m.status === "active" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{m.status}</span></td>
                  <td className="px-4 py-3"><button onClick={() => setSelectedRecord({ ...m, _type: "Missing Episode" })} className="text-xs text-teal-600 hover:underline font-medium">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "safeguarding" && (
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Concern Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Immediate Risk</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
            </tr></thead>
            <tbody>
              {(data.safeguardingRecords || []).length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No safeguarding records found" /></td></tr>
              ) : (data.safeguardingRecords || []).map(s => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-3 text-xs">{s.date_of_concern || "—"}</td>
                  <td className="px-4 py-3 text-xs capitalize">{s.concern_type?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${s.immediate_risk === "critical" || s.immediate_risk === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{s.immediate_risk}</span></td>
                  <td className="px-4 py-3 text-xs capitalize">{s.status}</td>
                  <td className="px-4 py-3"><button onClick={() => setSelectedRecord({ ...s, _type: "Safeguarding" })} className="text-xs text-teal-600 hover:underline font-medium">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "behaviour" && (
          <div className="p-5">
            {(data.behaviourPlans || []).length === 0 ? (
              <EmptyState message="No behaviour support plans recorded" />
            ) : (data.behaviourPlans || []).map(b => (
              <div key={b.id} className="border border-slate-100 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-slate-800">{b.title || "Behaviour Support Plan"}</h4>
                  <button onClick={() => setSelectedRecord({ ...b, _type: "Behaviour Plan" })} className="text-xs text-teal-600 hover:underline">View</button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Created {b.created_date ? format(new Date(b.created_date), "dd MMM yyyy") : "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRecord && <RecordModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
    </div>
  );
}