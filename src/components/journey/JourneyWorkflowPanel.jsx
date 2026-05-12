import { CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "reviewed", label: "Reviewed" },
  { key: "statement_ready", label: "Statement Ready" },
];

const STATUS_ORDER = { draft: 0, submitted: 1, under_review: 2, changes_requested: 2, reviewed: 3, statement_ready: 4 };

export default function JourneyWorkflowPanel({ record, reviewEvents = [] }) {
  const currentOrder = STATUS_ORDER[record?.workflow_status || "draft"] ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Workflow Status</h3>
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const order = i;
          const isComplete = currentOrder > order;
          const isCurrent = currentOrder === order;
          const event = reviewEvents.find(e => e.to_status === step.key);

          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isComplete ? "bg-purple-500" : isCurrent ? "bg-purple-100 border-2 border-purple-500" : "bg-slate-100 border-2 border-slate-200"}`}>
                  {isComplete
                    ? <CheckCircle2 className="w-4 h-4 text-white" />
                    : isCurrent
                      ? <div className="w-2 h-2 rounded-full bg-purple-500" />
                      : <Circle className="w-3 h-3 text-slate-300" />
                  }
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[16px] mt-1 ${isComplete ? "bg-purple-300" : "bg-slate-100"}`} />
                )}
              </div>
              <div className="flex-1 pb-3">
                <p className={`text-xs font-semibold ${isComplete || isCurrent ? "text-slate-800" : "text-slate-400"}`}>{step.label}</p>
                {isCurrent && event && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    by {event.created_by_name || "—"}
                    {event.created_date && ` · ${format(new Date(event.created_date), "dd MMM yyyy")}`}
                  </p>
                )}
                {isCurrent && !event && record?.created_by && step.key === "draft" && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    by {record.updated_by_name || record.created_by || "—"}
                    {record.updated_at && ` · ${format(new Date(record.updated_at), "dd MMM yyyy")}`}
                  </p>
                )}
                {!isCurrent && !isComplete && (
                  <p className="text-[10px] text-slate-400 mt-0.5">Pending</p>
                )}
                {event?.comments && (
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">"{event.comments}"</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {record?.workflow_status === "changes_requested" && record?.review_notes && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-xs font-semibold text-orange-700 mb-1">Changes Requested</p>
          <p className="text-xs text-orange-600">{record.review_notes}</p>
        </div>
      )}
    </div>
  );
}