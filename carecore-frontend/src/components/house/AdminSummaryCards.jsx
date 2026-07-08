import { PoundSterling, ReceiptText } from "lucide-react";

export default function AdminSummaryCards({ monthlyCount, monthlyOutstanding, yearlyCount, yearlyOverdueAmount, onMonthlyClick, onYearlyClick }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        onClick={onMonthlyClick}
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <PoundSterling className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Monthly Bills This Month</p>
              <p className="text-3xl font-bold text-slate-900">{monthlyCount}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-800">£{monthlyOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-400">Outstanding</p>
          </div>
        </div>
      </div>

      <div
        onClick={onYearlyClick}
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <ReceiptText className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Yearly Bills This Year</p>
              <p className="text-3xl font-bold text-slate-900">{yearlyCount}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-red-500">£{yearlyOverdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-400">Overdue</p>
          </div>
        </div>
      </div>
    </div>
  );
}