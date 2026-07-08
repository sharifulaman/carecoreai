import { useState } from "react";
import { Save, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function HandoverSignoffBar({ handover, onSaveDraft, onComplete, saving, completing, readOnly }) {
  const [declaration, setDeclaration] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const status = handover?.status || "draft";
  const isLocked = readOnly || ["submitted", "acknowledged", "manager_signed_off", "closed"].includes(status);

  const handleComplete = () => {
    if (!declaration) { setShowValidation(true); return; }
    onComplete();
  };

  const statusBadge = {
    draft:                    { label: "Draft",                   color: "bg-slate-100 text-slate-600" },
    submitted:                { label: "Submitted",               color: "bg-blue-100 text-blue-700" },
    acknowledged:             { label: "Acknowledged",            color: "bg-emerald-100 text-emerald-700" },
    manager_review_required:  { label: "Manager Review Required", color: "bg-amber-100 text-amber-700" },
    manager_signed_off:       { label: "Manager Signed Off",      color: "bg-emerald-100 text-emerald-700" },
    changes_requested:        { label: "Changes Requested",       color: "bg-orange-100 text-orange-700" },
    escalated:                { label: "Escalated",               color: "bg-red-100 text-red-700" },
    closed:                   { label: "Closed",                  color: "bg-slate-100 text-slate-500" },
  }[status] || { label: status, color: "bg-slate-100 text-slate-600" };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-2xl">
      {showValidation && !declaration && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">Please confirm the declaration before completing the handover.</p>
          <button onClick={() => setShowValidation(false)} className="ml-auto text-xs text-amber-600 hover:underline">Dismiss</button>
        </div>
      )}

      <div className="flex items-center gap-4 px-6 py-4 max-w-screen-xl mx-auto">
        {/* Left: Save draft */}
        {!isLocked ? (
          <button
            onClick={onSaveDraft}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save as Draft
          </button>
        ) : (
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${statusBadge.color}`}>{statusBadge.label}</span>
        )}

        {/* Centre: declaration + status */}
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isLocked && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={declaration}
                onChange={e => { setDeclaration(e.target.checked); setShowValidation(false); }}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-600">I confirm this handover is accurate to the best of my knowledge.</span>
            </label>
          )}
          {isLocked && (
            <p className="text-sm text-slate-500 font-medium">
              {readOnly ? "View Only Mode" : "This handover has been submitted and locked."}
            </p>
          )}
        </div>

        {/* Right: Complete */}
        {!isLocked ? (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="flex items-center gap-2 px-6 py-2.5 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy-light disabled:opacity-50 shrink-0"
            style={{ backgroundColor: "#1e2d4d" }}
          >
            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Complete Handover
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}