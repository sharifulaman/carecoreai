import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { scopeToHomes } from "@/lib/managerHomeScope";
import { WORKFLOW_META } from "@/components/workflow/workflowConfig";
import { WidgetErrorRow, WidgetLoadingRow } from "./WidgetStatus";

function SLABadge({ deadline }) {
  if (!deadline) return <span className="text-slate-400 text-[10px]">—</span>;
  try {
    const d = parseISO(deadline);
    const now = new Date();
    return (
      <span className={`text-[10px] font-medium ${d < now ? "text-red-600" : "text-amber-600"}`}>
        {d < now ? "Overdue" : "Due today"}
      </span>
    );
  } catch { return null; }
}

function PriorityBadge({ priority }) {
  const map = {
    critical: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    important: "bg-amber-100 text-amber-700",
    normal: "bg-slate-100 text-slate-600",
  };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${map[priority] || "bg-slate-100 text-slate-600"}`}>{priority || "normal"}</span>;
}

function getStage(w) {
  const stageMap = {
    pending_tl: "TL Review", pending_tm: "TM Review", pending_rm: "RM Review",
    pending_rsm: "RSM Review", pending_admin: "Admin Review", pending_finance: "Finance Review",
    pending_fo: "Finance Officer", pending_fm: "Finance Manager",
    pending_ho: "HR Officer", pending_hm: "HR Manager",
  };
  return stageMap[w.status] || (w.status?.replace("pending_", "").toUpperCase() + " Review");
}

export default function ApprovalQueueWidget({ orgId = ORG_ID, homeIds = null }) {
  const [expanded, setExpanded] = useState(false);

  const { data: workflowsRaw = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["mgr-workflows-direct", orgId],
    queryFn: () => base44.entities.ApprovalWorkflow.filter({ org_id: orgId }, "-created_date", 100),
    staleTime: 60 * 1000,
  });

  const workflows = scopeToHomes(workflowsRaw, homeIds);
  const allPending = useMemo(() => workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)), [workflows]);
  const pending = expanded ? allPending : allPending.slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Approval Queue{" "}
          <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">{allPending.length}</span>
        </h3>
        <Link to="/workflow-command-centre" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 text-slate-500 font-medium">Item</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Priority</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Stage</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Requester</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">SLA</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <WidgetLoadingRow colSpan={7} />}
            {isError && <WidgetErrorRow colSpan={7} onRetry={refetch} />}
            {!isLoading && !isError && pending.map(w => {
              const meta = WORKFLOW_META[w.entity_type] || WORKFLOW_META._default;
              const Icon = meta.icon;
              return (
                <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded ${meta.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3 h-3 ${meta.iconColor}`} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 leading-tight">{meta.label}</p>
                        <p className="text-slate-400">{w.entity_reference || w.entity_id?.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5"><PriorityBadge priority={w.priority} /></td>
                  <td className="px-2 py-2.5 text-slate-600">{getStage(w)}</td>
                  <td className="px-2 py-2.5 text-slate-600">{w.submitted_by_name || "—"}</td>
                  <td className="px-2 py-2.5 text-slate-500 truncate max-w-[80px]">{w.home_name || "—"}</td>
                  <td className="px-2 py-2.5"><SLABadge deadline={w.deadline_datetime} /></td>
                  <td className="px-2 py-2.5">
                    <Link to="/workflow-command-centre" className="text-[10px] font-semibold text-blue-600 hover:underline">Review</Link>
                  </td>
                </tr>
              );
            })}
            {!isLoading && !isError && pending.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">No pending approvals</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {allPending.length > 6 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-2 text-xs text-blue-600 hover:bg-slate-50 border-t border-slate-100 font-medium transition-colors"
        >
          {expanded ? "▲ Show less" : `▼ Show ${allPending.length - 6} more`}
        </button>
      )}
    </div>
  );
}
