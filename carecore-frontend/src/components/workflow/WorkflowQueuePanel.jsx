import { ChevronRight, AlertTriangle, FileText } from "lucide-react";
import { WORKFLOW_META, getPriorityBadge } from "./workflowConfig";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

// Derive a human label for the workflow type.
// Priority order:
//   1. workflow.title — set at creation time (e.g. "Accident / Illness Report")
//   2. WORKFLOW_META lookup by workflow_type or entity_type
//   3. workflow_type prettified (handles any type not in WORKFLOW_META)
function getWorkflowLabel(w) {
  // Use the title stored on the item if it's meaningful
  if (w.module_name && w.module_name !== w.workflow_type && w.module_name !== w.entity_type) {
    return w.module_name;
  }

  // Try WORKFLOW_META with both keys
  const wType = w.entity_type || w.workflow_type;
  const meta = WORKFLOW_META[wType];
  if (meta && meta.label && meta.label !== "Workflow") {
    return meta.label;
  }

  // Fall back: prettify the raw workflow_type slug
  // e.g. "accident" → "Accident", "support_plan" → "Support Plan"
  if (wType) {
    return wType
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  return "Workflow";
}

// Current reviewer label — uses live backend fields, not a hardcoded status map.
// The backend enriches every item with current_stage and assigned_to_name.
function getCurrentLabel(w) {
  // current_stage is set by roleLabel(item.ReviewerRole) in workflow_handler.go
  if (w.current_stage && w.current_stage !== "Under Review") return w.current_stage;
  if (w.assigned_to_name) return w.assigned_to_name;
  // Prettify reviewer_role as last resort
  if (w.reviewer_role) {
    return w.reviewer_role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  return "Under Review";
}

// Pick icon/colors: use WORKFLOW_META if available, else sensible defaults per category
function getWorkflowMeta(w) {
  // module_key is the canonical identifier from MakerCheckerMatrix — prefer it
  // since it's stable across every workflow_type that maps to the same module.
  if (w.module_key && WORKFLOW_META[w.module_key]) {
    return WORKFLOW_META[w.module_key];
  }

  const wType = w.entity_type || w.workflow_type;
  if (wType && WORKFLOW_META[wType]) {
    return WORKFLOW_META[wType];
  }

  // Generic fallback that at least uses a neutral icon from WORKFLOW_META._default
  return WORKFLOW_META._default;
}

export default function WorkflowQueuePanel({ workflows, selectedWorkflow, onSelect, isError }) {
  if (isError) {
    return (
      <div className="mt-4 bg-card border border-border rounded-xl p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-medium">Unable to load workflows</p>
        <p className="text-xs text-muted-foreground mt-1">Please refresh or try again.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Approval Queue</h2>
        <span className="text-xs text-muted-foreground">
          {workflows.length} item{workflows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">No workflows found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try changing filters or check another queue.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {workflows.map(w => {
            const meta         = getWorkflowMeta(w);
            const isSelected   = selectedWorkflow?.id === w.id;
            const label        = getWorkflowLabel(w);
            const currentLabel = getCurrentLabel(w);
            const ago          = timeAgo(w.submitted_at || w.created_date);

            return (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isSelected
                    ? "border-blue-400 bg-blue-50 shadow-sm"
                    : "border-border bg-card hover:border-blue-200 hover:bg-blue-50/30"
                }`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                  <meta.icon className={`w-4 h-4 ${meta.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground leading-tight truncate">
                      {label}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{ago}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submitted by: {w.maker_name || w.submitted_by_name || "Staff"}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(w.priority)}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      Current: <span className="font-medium text-foreground">{currentLabel}</span>
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}

          <button className="w-full text-center text-xs text-blue-600 hover:underline py-2 mt-1">
            View all workflows →
          </button>
        </div>
      )}
    </div>
  );
}
