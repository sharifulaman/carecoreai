import { useMemo } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import CheckStatusBadge, { getDisplayStatus } from "./CheckStatusBadge";

export default function ChecksThisWeekTab({ instances, selectedDate }) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      return format(d, "yyyy-MM-dd");
    });
  }, [selectedDate]);

  const byDay = useMemo(() => {
    const map = {};
    weekDays.forEach(d => { map[d] = []; });
    instances.forEach(i => {
      if (map[i.scheduled_date] !== undefined) map[i.scheduled_date].push(i);
    });
    return map;
  }, [instances, weekDays]);

  const now = new Date();

  return (
    <div className="space-y-4">
      {weekDays.map(dateStr => {
        const dayInstances = byDay[dateStr] || [];
        const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
        return (
          <div key={dateStr}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-sm font-bold ${isToday ? "text-teal-600" : "text-slate-700"}`}>
                {format(new Date(dateStr), "EEEE, d MMM")}
              </span>
              {isToday && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Today</span>}
              <span className="text-xs text-slate-400">{dayInstances.length} checks</span>
            </div>
            {dayInstances.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-400">No checks scheduled</div>
            ) : (
              <div className="space-y-2">
                {dayInstances.map(inst => (
                  <div key={inst.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{inst.template_title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span className="capitalize">{inst.template_frequency}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{inst.due_at || "—"}</span>
                        <span>·</span>
                        <span>{inst.template_area}</span>
                      </div>
                    </div>
                    <CheckStatusBadge status={getDisplayStatus(inst, now)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}