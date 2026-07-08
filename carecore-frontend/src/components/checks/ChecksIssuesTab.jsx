import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, ArrowUp, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useModuleActions } from "@/lib/PermissionContext";

const SEVERITY_CFG = {
  low: { cls: "bg-yellow-100 text-yellow-700", label: "Low" },
  medium: { cls: "bg-amber-100 text-amber-700", label: "Medium" },
  high: { cls: "bg-red-100 text-red-700", label: "High" },
  critical: { cls: "bg-red-200 text-red-900 font-black", label: "Critical" },
};

const STATUS_CFG = {
  open: { cls: "bg-red-100 text-red-700", label: "Open" },
  in_progress: { cls: "bg-blue-100 text-blue-700", label: "In Progress" },
  awaiting_manager_review: { cls: "bg-purple-100 text-purple-700", label: "Awaiting Review" },
  escalated: { cls: "bg-red-200 text-red-900", label: "Escalated" },
  resolved: { cls: "bg-green-100 text-green-700", label: "Resolved" },
  closed: { cls: "bg-slate-100 text-slate-500", label: "Closed" },
};

function IssueCard({ issue, onResolve, onEscalate, canEdit }) {
  const sevCfg = SEVERITY_CFG[issue.severity] || SEVERITY_CFG.medium;
  const stsCfg = STATUS_CFG[issue.status] || STATUS_CFG.open;
  const isDone = ["resolved", "closed"].includes(issue.status);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">{issue.issue_title}</p>
            {issue.issue_details && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{issue.issue_details}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sevCfg.cls}`}>{sevCfg.label}</span>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${stsCfg.cls}`}>{stsCfg.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4 border-t border-slate-50 pt-3">
        {[
          ["Reported by", issue.reported_by_name],
          ["Reported", issue.created_date ? format(new Date(issue.created_date), "dd MMM yyyy") : null],
          ["Assigned to", issue.assigned_to_name],
          ["Due date", issue.due_date ? format(new Date(issue.due_date), "dd MMM yyyy") : null],
        ].map(([label, val]) => (
          <div key={label}>
            <span className="text-slate-400 block">{label}</span>
            <span className="font-medium text-slate-700">{val || "—"}</span>
          </div>
        ))}
      </div>

      {issue.immediate_action_taken && (
        <div className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
          <span className="font-semibold text-amber-700">Immediate action: </span>
          <span className="text-amber-800">{issue.immediate_action_taken}</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {!isDone && canEdit && (
          <>
            <button
              onClick={() => onResolve(issue)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
            </button>
            <button
              onClick={() => onEscalate(issue)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" /> Escalate
            </button>
          </>
        )}
        <button className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          View Issue
        </button>
      </div>
    </div>
  );
}

export default function ChecksIssuesTab({ homeId, staffProfile }) {
  const qc = useQueryClient();
  const { canAdd } = useModuleActions("homes");

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["check-issues", homeId],
    queryFn: () => base44.entities.HomeCheckIssue.filter({ home_id: homeId }, "-created_date", 200),
    enabled: !!homeId,
  });

  const handleResolve = async (issue) => {
    await base44.entities.HomeCheckIssue.update(issue.id, {
      status: "resolved",
      resolved_by_staff_id: staffProfile?.id,
      resolved_at: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["check-issues", homeId] });
    toast.success("Issue marked as resolved");
  };

  const handleEscalate = async (issue) => {
    await base44.entities.HomeCheckIssue.update(issue.id, { status: "escalated" });
    qc.invalidateQueries({ queryKey: ["check-issues", homeId] });
    toast.success("Issue escalated");
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (issues.length === 0) return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
      <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-600">No unresolved issues</p>
      <p className="text-xs text-slate-400 mt-1">All check-related issues are currently resolved.</p>
    </div>
  );

  const open = issues.filter(i => !["resolved", "closed"].includes(i.status));
  const resolved = issues.filter(i => ["resolved", "closed"].includes(i.status));

  return (
    <div className="space-y-4">
      {open.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" /> Open Issues ({open.length})
          </h3>
          {open.map(issue => (
            <IssueCard key={issue.id} issue={issue} onResolve={handleResolve} onEscalate={handleEscalate} canEdit={canAdd} />
          ))}
        </>
      )}
      {resolved.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-slate-500 mt-4">Resolved ({resolved.length})</h3>
          {resolved.map(issue => (
            <IssueCard key={issue.id} issue={issue} onResolve={handleResolve} onEscalate={handleEscalate} canEdit={canAdd} />
          ))}
        </>
      )}
    </div>
  );
}