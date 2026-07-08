import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { STATUS_COLORS } from "@/lib/reg32Scoring";

function CircularProgress({ percentage, size = 32 }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="text-[8px] font-bold fill-slate-700">{percentage}%</text>
    </svg>
  );
}

export default function EvidenceReadiness({ scores, scanMetadata, onOpenModal }) {
  const items = scores.evidenceReadiness?.items || [];
  const checks = scores.readinessChecks || [];
  const ofstedStatus = scores.ofstedReadyStatus || "Not Ready";
  const sc = STATUS_COLORS[ofstedStatus] || STATUS_COLORS.Critical;

  return (
    <div className="space-y-3">
      {/* Evidence coverage rows */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Reg 32 Evidence Readiness</h3>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors" onClick={() => onOpenModal?.(item)}>
              <CircularProgress percentage={item.percentage} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.completed} / {item.total} completed</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Readiness checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Report Readiness</h3>
        <div className="space-y-1.5">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {check.passed
                ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={check.passed ? "text-slate-700" : "text-red-600 font-medium"}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ofsted-ready Status */}
      <div className={`border ${sc.border} ${sc.bg} rounded-xl p-3`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${sc.text}`} />
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ofsted-ready Status</p>
            <p className={`text-sm font-bold ${sc.text}`}>{ofstedStatus}</p>
          </div>
        </div>
      </div>

      {/* Scan metadata */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Scan Metadata</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Scan ID</span>
            <span className="font-mono text-slate-700">{scanMetadata?.scanId || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Completed</span>
            <span className="text-slate-700">{scanMetadata?.completedAt || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Frequency</span>
            <span className="text-slate-700">{scanMetadata?.frequency || "Monthly"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Next scan</span>
            <span className="text-slate-700">{scanMetadata?.nextScan || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}