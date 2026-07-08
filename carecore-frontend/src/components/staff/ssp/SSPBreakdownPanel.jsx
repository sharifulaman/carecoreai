import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export default function SSPBreakdownPanel({ result, staffName, dateFrom, dateTo, nextPayrollDate }) {
  if (!result) return null;

  if (!result.eligible) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border text-xs flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-muted-foreground">SSP Not Payable</p>
          <p className="text-muted-foreground mt-0.5">{result.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-blue-200 bg-blue-50/60 rounded-lg p-4 text-xs space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-blue-700 text-sm">SSP Calculation</span>
        {result.linkedAbsence && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Linked Absence — Waiting Days Waived</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Staff</span>
          <span className="font-medium">{staffName}</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Sick period</span>
          <span className="font-medium">{dateFrom} – {dateTo}</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Qualifying days/week</span>
          <span className="font-medium">{result.qualifyingDaysPerWeek}</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Total qualifying days</span>
          <span className="font-medium">{result.totalQualifyingDays}</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Waiting days (unpaid)</span>
          <span className="font-medium text-amber-600">{result.waitingDays} days</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">SSP days</span>
          <span className="font-medium">{result.sspDays} days</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Daily SSP rate</span>
          <span className="font-medium">£{result.dailyRate?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Weekly SSP rate</span>
          <span className="font-medium">£{result.sspWeeklyRate?.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-blue-200 mt-1">
        <span className="font-semibold text-blue-700 text-sm">Total SSP Due</span>
        <span className="font-bold text-blue-700 text-base">£{result.totalSSP?.toFixed(2)}</span>
      </div>

      {nextPayrollDate && (
        <p className="text-muted-foreground pt-1">To be paid: <span className="font-medium">{nextPayrollDate}</span></p>
      )}

      {result.cappedAt28Weeks && (
        <div className="flex items-start gap-2 mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>SSP capped at 28 weeks. Consider occupational sick pay or ESA referral.</span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground pt-1">SSP paid at £{result.sspWeeklyRate?.toFixed(2)}/week (2025/26 rate)</p>
    </div>
  );
}