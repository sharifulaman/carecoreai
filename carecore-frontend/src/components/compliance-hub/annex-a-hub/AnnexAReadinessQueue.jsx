import { CheckCircle2, XCircle, AlertTriangle, AlertOctagon, ListChecks, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AnnexAReadinessQueue({ readinessChecks, passedChecks, totalChecks, warnings, getReadinessBadge, staffProfile }) {
  const badge = getReadinessBadge();
  const failedChecks = readinessChecks.filter(c => !c.passed);

  // Critical gaps (failed checks with high severity)
  const criticalGaps = failedChecks.map(c => ({
    label: c.label,
    severity: "Critical",
    section: c.fixTab,
  }));

  // Advisory gaps (from warnings)
  const advisoryGaps = warnings.map(w => ({
    label: w,
    severity: "Advisory",
  }));

  // Action queue (derived from failed checks)
  const actionQueue = failedChecks.map(c => ({
    action: c.label,
    owner: staffProfile?.full_name || "Unassigned",
    status: "Fix now",
  }));

  return (
    <div className="space-y-3">
      {/* Readiness Pre-Check */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-700">Readiness Pre-Check</h3>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${passedChecks === totalChecks ? "bg-green-100 text-green-700" : passedChecks >= 7 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {passedChecks}/{totalChecks} passed
          </span>
        </div>
        <div className="space-y-1">
          {readinessChecks.map(check => (
            <div key={check.id} className="flex items-center gap-1.5 text-[10px]">
              {check.passed ? (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500 shrink-0" />
              )}
              <span className={check.passed ? "text-slate-500" : "text-slate-700 font-medium"}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Gaps */}
      {criticalGaps.length > 0 && (
        <div className="bg-white border border-red-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            <h3 className="text-xs font-bold text-red-700">Critical Gaps (Fix First)</h3>
          </div>
          <div className="space-y-1.5">
            {criticalGaps.map((g, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-red-50 last:border-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-slate-700">{g.label}</span>
                </div>
                <button
                  onClick={() => toast.info(`Navigating to fix: ${g.label}`)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                >
                  Fix Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advisory Gaps */}
      {advisoryGaps.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <h3 className="text-xs font-bold text-amber-700">Advisory Gaps (Review)</h3>
          </div>
          <div className="space-y-1">
            {advisoryGaps.map((g, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-slate-600">{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Queue */}
      {actionQueue.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <h3 className="text-xs font-bold text-slate-700 mb-2">Action Queue</h3>
          <div className="space-y-1">
            {actionQueue.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-50 last:border-0">
                <span className="text-slate-700 truncate flex-1">{a.action}</span>
                <span className="text-slate-400 ml-2 shrink-0">{a.owner}</span>
                <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded shrink-0 ${a.status === "Fix now" ? "bg-red-50 text-red-600" : a.status === "Needs review" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maker-Checker Review */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-blue-800">Maker-Checker Review</h3>
        </div>
        <div className="space-y-1 text-[10px] text-slate-600 mb-3">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium text-slate-700">{badge.label}</span>
          </div>
          <div className="flex justify-between">
            <span>Reported by:</span>
            <span className="font-medium text-slate-700">{staffProfile?.full_name || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Reviewer:</span>
            <span className="font-medium text-slate-700">Pending assignment</span>
          </div>
          <div className="flex justify-between">
            <span>Last updated:</span>
            <span className="font-medium text-slate-700">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={() => toast.success("Submitted for maker-checker review")}
        >
          <UserCheck className="w-3.5 h-3.5" /> Submit for Review
        </Button>
      </div>
    </div>
  );
}