import { useMemo } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import CheckStatusBadge, { getDisplayStatus } from "./CheckStatusBadge";
import { useModuleActions } from "@/lib/PermissionContext";

export default function ChecksWeekTab({ instances, templateItems, completions, selectedDate, onStart, onViewDetails }) {
  const { canAdd } = useModuleActions("homes");
  const weekDays = useMemo(() => {
    const base = new Date(selectedDate);
    const start = startOfWeek(base, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      return format(d, "yyyy-MM-dd");
    });
  }, [selectedDate]);

  const now = new Date();

  const getItemCount = (instance) => templateItems.filter(ti => ti.template_id === instance.template_id).length;

  return (
    <div className="space-y-4">
      {weekDays.map(dateStr => {
        const dayInstances = instances.filter(i => i.scheduled_date === dateStr);
        const label = format(new Date(dateStr + "T12:00:00"), "EEEE, d MMMM");
        const isToday = dateStr === selectedDate;

        if (dayInstances.length === 0 && !isToday) return null;

        return (
          <div key={dateStr}>
            {/* Date header */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-bold ${isToday ? "text-teal-600" : "text-slate-700"}`}>{label}</span>
              {isToday && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Today</span>}
              <span className="text-xs text-slate-400">({dayInstances.length} checks)</span>
            </div>

            {dayInstances.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-400">No checks scheduled</div>
            ) : (
              <div className="space-y-2">
                {dayInstances.map(inst => {
                  const displayStatus = getDisplayStatus(inst, now);
                  const isComplete = ["completed", "submitted_for_review"].includes(displayStatus);
                  const itemCount = getItemCount(inst);
                  return (
                    <div key={inst.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isComplete ? "bg-green-100" : "bg-slate-100"}`}>
                        {isComplete ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{inst.template_title}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                          <span className="capitalize">{inst.template_frequency || "Daily"}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{inst.due_at || "—"}</span>
                          <span>·</span>
                          <span>{inst.template_area || "General"}</span>
                        </div>
                      </div>
                      <CheckStatusBadge status={displayStatus} />
                      <div className="text-center hidden sm:block shrink-0">
                        <p className="text-xs font-bold text-slate-600">— / {itemCount}</p>
                        <p className="text-[10px] text-slate-400">sub-checks</p>
                      </div>
                      <button
                        onClick={() => (isComplete || !canAdd) ? onViewDetails(inst) : onStart(inst)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl shrink-0 transition-colors ${(isComplete || !canAdd) ? "border border-slate-200 text-slate-600 hover:bg-slate-50" : "bg-teal-600 text-white hover:bg-teal-700"}`}
                      >
                        {(isComplete || !canAdd) ? "View" : "Start"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}