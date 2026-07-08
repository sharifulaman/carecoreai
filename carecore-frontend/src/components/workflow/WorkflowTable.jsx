import { CheckCircle2, Clock, FileText, Building2, AlertTriangle, MoreVertical, Eye } from "lucide-react";
import { format } from "date-fns";

const TAB_CONFIG = [
  { key: "my-queue", label: "My Queue", icon: Clock },
  { key: "submitted", label: "Submitted by Me", icon: FileText },
  { key: "team", label: "Team View", icon: Building2 },
  { key: "escalations", label: "Escalations", icon: AlertTriangle },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "audit", label: "Audit Trail", icon: FileText },
];

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  escalated: "bg-purple-100 text-purple-700",
  closed: "bg-slate-100 text-slate-700",
};

export default function WorkflowTable({ workflows, activeTab, setActiveTab, onSelectWorkflow, workflowCounts }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto px-5 bg-muted/30">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ml-1 ${
              activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {workflowCounts[tab.key.replace("-", "")] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="p-5">
        {workflows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No workflows found</p>
            <p className="text-xs mt-1">Try adjusting filters or create a new workflow</p>
          </div>
        ) : (
          <div className="space-y-2">
            {workflows.map(workflow => (
              <button
                key={workflow.id}
                onClick={() => onSelectWorkflow(workflow)}
                className="w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50 text-left hover:border-border"
              >
                <div className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4 rounded border-border" readOnly />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{workflow.reference || "Workflow"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{workflow.home_name || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Step {workflow.current_step || 1}</p>
                    <p className="text-xs text-muted-foreground mt-1">{workflow.assigned_to_name || "Unassigned"}</p>
                  </div>
                  {workflow.due_date && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{format(new Date(workflow.due_date), "MMM d")}</p>
                    </div>
                  )}
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[workflow.status] || "bg-slate-100 text-slate-700"}`}>
                    {workflow.status?.replace(/_/g, " ")}
                  </span>
                  <button className="p-1 hover:bg-muted rounded-lg">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}