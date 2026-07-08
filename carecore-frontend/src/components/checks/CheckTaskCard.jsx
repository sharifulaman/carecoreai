import { CheckCircle2, Clock, Calendar } from "lucide-react";
import CheckStatusBadge, { getDisplayStatus } from "./CheckStatusBadge";
import { useModuleActions } from "@/lib/PermissionContext";

export default function CheckTaskCard({ instance, itemCount, completionCount, onStart, onViewDetails }) {
  const now = new Date();
  const displayStatus = getDisplayStatus(instance, now);
  const isComplete = displayStatus === "completed" || displayStatus === "submitted_for_review";
  const { canAdd } = useModuleActions("homes");

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? "bg-green-100" : "bg-slate-100"}`}>
        {isComplete
          ? <CheckCircle2 className="w-5 h-5 text-green-600" />
          : <Clock className="w-5 h-5 text-slate-400" />
        }
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{instance.template_title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
          <span className="capitalize">{instance.template_frequency || "Daily"}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Calendar className="w-3 h-3" />
            Due {instance.due_at || "10:00 AM"}
          </span>
          <span>·</span>
          <span>{instance.template_area || "General"}</span>
        </div>
        {displayStatus === "overdue" && instance.due_at && (
          <p className="text-[11px] text-red-500 font-medium mt-0.5">• Overdue since {instance.scheduled_date}, {instance.due_at}</p>
        )}
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        <CheckStatusBadge status={displayStatus} />
      </div>

      {/* Progress */}
      <div className="text-center shrink-0 hidden sm:block">
        <p className="text-sm font-bold text-slate-700">{completionCount} / {itemCount}</p>
        <p className="text-[10px] text-slate-400">sub-checks</p>
      </div>

      {/* Action button */}
      <div className="shrink-0">
        {isComplete ? (
          <button
            onClick={() => onViewDetails(instance)}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
          >
            View Details
          </button>
        ) : (
          canAdd && (
            <button
              onClick={() => onStart(instance)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              Start Check
            </button>
          )
        )}
      </div>
    </div>
  );
}