import { ChevronRight } from "lucide-react";

function ProgressRow({ label, done, total, onClick }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="mb-3 cursor-pointer" onClick={onClick}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{done} / {total} complete</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SWChecksCard({ homeChecks, fireChecks, medChecks, onViewAll }) {
  const isDone = c => c.status === "completed" || c.status === "passed" || c.overall_result === "pass" || c.overall_result === "completed";
  const roomDone = homeChecks.filter(isDone).length;
  const fireDone = fireChecks.filter(isDone).length;
  const medDone = medChecks.filter(isDone).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-sm">House Checks & Medication</h3>
      </div>

      <ProgressRow
        label="Room Checks"
        done={roomDone}
        total={Math.max(homeChecks.length, 5)}
        onClick={onViewAll}
      />
      <ProgressRow
        label="Fire & Health Checks"
        done={fireDone}
        total={Math.max(fireChecks.length, 3)}
        onClick={onViewAll}
      />
      <ProgressRow
        label="Medication Prompts"
        done={medDone}
        total={Math.max(medChecks.length, 4)}
        onClick={onViewAll}
      />

      <button onClick={onViewAll} className="flex items-center gap-1 text-xs text-blue-500 font-semibold hover:underline mt-2">
        View all checks <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}