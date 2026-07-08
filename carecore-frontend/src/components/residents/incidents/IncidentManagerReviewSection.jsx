// This section is now informational only — TL reviews happen via IncidentTLReviewModal
// Shown on the SW log form just as a status indicator

const STATUS_CONFIG = {
  pending_review: { label: "Pending TL Review", color: "bg-amber-100 text-amber-700 border-amber-300" },
  reviewed: { label: "Reviewed by TL", color: "bg-green-100 text-green-700 border-green-300" },
  returned_for_changes: { label: "Returned — Update Required", color: "bg-red-100 text-red-700 border-red-300" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
};

export function IncidentManagerReviewSection({ form }) {
  const status = form?.manager_review_status;
  const cfg = STATUS_CONFIG[status] || null;

  if (!status) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">Manager review status:</p>
        {cfg && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
            {cfg.label}
          </span>
        )}
      </div>
      {status === "returned_for_changes" && form.manager_review_notes && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <p className="font-semibold text-xs mb-1">Return reason from manager:</p>
          <p>{form.manager_review_notes}</p>
        </div>
      )}
      {status === "reviewed" && form.manager_review_notes && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          <p className="font-semibold text-xs mb-1">Manager notes:</p>
          <p>{form.manager_review_notes}</p>
        </div>
      )}
      <p className="text-xs text-slate-400">
        {status === "pending_review" && "Your incident has been submitted. Your team leader will review it."}
        {status === "reviewed" && "This incident has been reviewed and will count in Annex A."}
        {status === "returned_for_changes" && "Please update your incident report based on the manager's feedback."}
      </p>
    </div>
  );
}