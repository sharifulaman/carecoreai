import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { STATUS_COLORS } from "@/lib/reg32Scoring";

const DOMAIN_LABELS = {
  safety: "Safety & Safeguarding",
  relationships: "Relationships & Voice",
  health: "Health & Wellbeing",
  education: "Education & Outcomes",
  staffing: "Staffing & Supervision",
  complaints: "Complaints & Learning",
};

function DomainCard({ keyName, data, onOpenModal }) {
  const sc = STATUS_COLORS[data.status] || STATUS_COLORS["Requires Action"];
  const label = DOMAIN_LABELS[keyName];

  return (
    <button
      onClick={() => onOpenModal?.(keyName)}
      className={`border ${sc.border} ${sc.bg} rounded-xl p-3 text-left transition-all hover:shadow-md hover:border-slate-400 cursor-pointer w-full`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-slate-600 truncate">{label}</p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sc.bg} ${sc.text}`}>{data.status}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-black ${sc.text}`}>{data.score}</span>
        <span className="text-[10px] text-slate-400">/100</span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
        <span>{data.evidenceCount} evidence</span>
        <span className={data.riskCount > 0 ? "text-red-600 font-medium" : ""}>{data.riskCount} risks</span>
      </div>
    </button>
  );
}

export default function Reg32Analytics({ scores, qualityOverTime, evidenceGaps, onOpenModal }) {
  const domainKeys = Object.keys(scores.domainScores || {});

  return (
    <div className="space-y-4">
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quality Score Over Time */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Quality Score Over Time</h3>
          {qualityOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={qualityOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">No historical data</div>
          )}
        </div>

        {/* Evidence Gaps by Home */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Evidence Gaps by Home</h3>
          {evidenceGaps.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={evidenceGaps} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="home" tick={{ fontSize: 9, fill: "#94a3b8" }} width={80} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                <Bar dataKey="requiresEvidence" stackId="a" fill="#f59e0b" name="Requires Evidence" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">No evidence gaps</div>
          )}
        </div>
      </div>

      {/* Domain Score Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Domain Score Cards</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {domainKeys.map(key => (
            <DomainCard key={key} keyName={key} onOpenModal={onOpenModal} data={{ ...scores.domainScores[key], status: scores.domainScores[key].score >= 80 ? "Good" : scores.domainScores[key].score >= 60 ? "Requires Action" : "Critical" }} />
          ))}
        </div>
      </div>
    </div>
  );
}