import { TrendingUp, TrendingDown } from "lucide-react";

export default function WorkflowPipeline({ workflows }) {
  const stages = [
    { label: "Created", value: "created" },
    { label: "Submitted", value: "submitted" },
    { label: "Pending Review", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Completed", value: "closed" },
  ];

  const stageCounts = stages.map(s => workflows.filter(w => {
    if (s.value === "created") return w.status === "draft";
    if (s.value === "pending") return ["pending", "escalated"].includes(w.status);
    return w.status === s.value;
  }).length);

  const total = stageCounts.reduce((a, b) => a + b, 0);
  const completionRate = total > 0 ? Math.round((stageCounts[3] / total) * 100) : 0;
  const avgCycleTime = 3; // Default: 3 days

  const bottleneckIndex = stageCounts.indexOf(Math.max(...stageCounts));
  const bottleneck = bottleneckIndex >= 0 ? stages[bottleneckIndex]?.label : "None";

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">Workflow Pipeline (7 Days)</h3>
      
      <div className="space-y-4">
        {/* Stages */}
        <div className="flex items-end gap-2 h-32">
          {stages.map((stage, i) => {
            const count = stageCounts[i];
            const maxCount = Math.max(...stageCounts, 1);
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={stage.value} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:shadow-md"
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
                <p className="text-xs font-medium text-muted-foreground">{count}</p>
                <p className="text-xs text-muted-foreground text-center truncate">{stage.label}</p>
              </div>
            );
          })}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <div>
            <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{stageCounts[2]}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
        </div>

        {/* Bottleneck */}
        {bottleneck !== "None" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
            <p className="font-medium text-amber-900">⚠️ Bottleneck: {bottleneck}</p>
          </div>
        )}
      </div>
    </div>
  );
}