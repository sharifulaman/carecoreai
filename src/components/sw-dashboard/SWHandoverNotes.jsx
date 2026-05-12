import { ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function SWHandoverNotes({ handovers, onViewAll, onViewHandover }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-sm">Recent Handover Notes</h3>
      </div>

      {handovers.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No recent handover notes.</p>
      ) : (
        <div className="space-y-3">
          {handovers.slice(0, 3).map((h, i) => {
            const dateStr = h.created_date
              ? format(new Date(h.created_date), "d MMM, HH:mm")
              : "—";
            return (
              <div
                key={h.id || i}
                className="border-l-2 border-blue-200 pl-3 cursor-pointer hover:bg-slate-50 rounded-r-lg py-1"
                onClick={() => onViewHandover(h)}
              >
                <p className="text-xs text-slate-400 mb-0.5">
                  {dateStr} · <span className="font-medium text-slate-600">{h.outgoing_staff_name || h.submitted_by_name || "Staff"}</span>
                </p>
                <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                  {h.summary || h.current_shift_summary || h.notes || "Handover note"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={onViewAll}
        className="flex items-center gap-1 text-xs text-blue-500 font-semibold hover:underline mt-4"
      >
        View all handover notes <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}