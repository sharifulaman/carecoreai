import { AlertCircle } from "lucide-react";

export default function WorkflowTeamLoad({ workflows }) {
  const teams = {
    "Finance": workflows.filter(w => ["bill", "expense_claim"].includes(w.workflow_type)).length,
    "Compliance": workflows.filter(w => ["incident_report", "missing_episode"].includes(w.workflow_type)).length,
    "Care": workflows.filter(w => ["support_plan", "visit_report"].includes(w.workflow_type)).length,
  };

  const maxLoad = Math.max(...Object.values(teams), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">Team Load & Bottlenecks</h3>
      
      <div className="space-y-4">
        {/* Team Bars */}
        {Object.entries(teams).map(([team, count]) => {
          const percent = Math.round((count / maxLoad) * 100);
          const isBottleneck = percent > 50;

          return (
            <div key={team}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium">{team}</p>
                <p className="text-xs font-bold text-primary">{count}</p>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isBottleneck ? "bg-red-500" : "bg-blue-500"}`}
                  style={{ width: `${Math.max(percent, 10)}%` }}
                />
              </div>
              {isBottleneck && (
                <p className="text-xs text-red-600 font-medium mt-1">High utilization</p>
              )}
            </div>
          );
        })}

        {/* Warning Card */}
        {Math.max(...Object.values(teams)) > maxLoad * 0.6 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-900">Backlog Alert</p>
                <p className="text-xs text-red-700 mt-0.5">One team has high pending count</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}