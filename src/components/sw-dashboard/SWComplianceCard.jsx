import { ChevronRight } from "lucide-react";

function ComplianceRow({ label, pct }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-700">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SWComplianceCard({ policyAssignments, trainingRecords, onViewCompliance }) {
  const total = policyAssignments.length;
  const viewed = policyAssignments.filter(a => a.viewed_at || a.status === "Viewed" || a.status === "Acknowledged").length;
  const acknowledged = policyAssignments.filter(a => a.acknowledged_at || a.status === "Acknowledged").length;

  const policiesReadPct = total > 0 ? Math.round((viewed / total) * 100) : 0;
  const ackPct = total > 0 ? Math.round((acknowledged / total) * 100) : 0;

  const totalTraining = trainingRecords.length;
  const completedTraining = trainingRecords.filter(t => t.status === "completed" || t.status === "passed").length;
  const trainingPct = totalTraining > 0 ? Math.round((completedTraining / totalTraining) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-sm">My Compliance</h3>
      </div>

      <ComplianceRow label="Policies Read" pct={policiesReadPct} />
      <ComplianceRow label="Training Completion" pct={trainingPct} />
      <ComplianceRow label="Acknowledgements" pct={ackPct} />

      <button onClick={onViewCompliance} className="flex items-center gap-1 text-xs text-blue-500 font-semibold hover:underline mt-2">
        View compliance <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}