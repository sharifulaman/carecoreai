import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Clock, Minus } from "lucide-react";

function getDayStatus(date, instances, completions) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayInstances = instances.filter(i => i.scheduled_date === dateStr);
  if (dayInstances.length === 0) return "none";

  const completed = dayInstances.filter(i => ["completed", "submitted_for_review"].includes(i.status));
  const overdue = dayInstances.filter(i => i.status === "overdue");

  if (completed.length === dayInstances.length) return "complete";
  if (overdue.length > 0) return "overdue";
  if (completed.length > 0) return "partial";
  return "pending";
}

const STATUS_STYLES = {
  complete: { bg: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-300", label: "All done" },
  partial:  { bg: "bg-amber-400",  text: "text-amber-600",   ring: "ring-amber-300",   label: "Partial"  },
  overdue:  { bg: "bg-red-500",    text: "text-red-600",     ring: "ring-red-300",     label: "Overdue"  },
  pending:  { bg: "bg-slate-300",  text: "text-slate-400",   ring: "ring-slate-200",   label: "Pending"  },
  none:     { bg: "bg-slate-100",  text: "text-slate-300",   ring: "ring-slate-100",   label: ""         },
};

// ── Week Strip ────────────────────────────────────────────────
function WeekStrip({ selectedDate, instances, completions, onSelectDate }) {
  const base = new Date(selectedDate + "T12:00:00");
  const mon = new Date(base);
  mon.setDate(base.getDate() - ((base.getDay() + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });

  return (
    <div className="flex gap-1.5">
      {days.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const status = getDayStatus(day, instances, completions);
        const st = STATUS_STYLES[status];
        const isSelected = dateStr === selectedDate;
        const today = isToday(day);

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDate(dateStr)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all ${
              isSelected
                ? "bg-white shadow-md ring-2 ring-primary/30"
                : "hover:bg-white/60"
            }`}
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${today ? "text-primary" : "text-slate-400"}`}>
              {format(day, "EEE")}
            </span>
            <span className={`text-sm font-bold ${today ? "text-primary" : "text-slate-700"}`}>
              {format(day, "d")}
            </span>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${status !== "none" ? st.bg : "bg-slate-100"}`}>
              {status === "complete" && <CheckCircle2 className="w-3 h-3 text-white" />}
              {status === "partial"  && <span className="text-[8px] font-black text-white">~</span>}
              {status === "overdue"  && <AlertCircle className="w-3 h-3 text-white" />}
              {status === "pending"  && <Clock className="w-2.5 h-2.5 text-white" />}
              {status === "none"     && <Minus className="w-2.5 h-2.5 text-slate-300" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Mini Monthly Calendar ─────────────────────────────────────
function MiniCalendar({ selectedDate, instances, completions, onSelectDate }) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate + "T12:00:00"));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(viewDate),   { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm min-w-[220px]">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setViewDate(d => subMonths(d, 1))} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-bold text-slate-700">{format(viewDate, "MMMM yyyy")}</span>
        <button onClick={() => setViewDate(d => addMonths(d, 1))} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-slate-400 py-0.5">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, viewDate);
          const status = inMonth ? getDayStatus(day, instances, completions) : "none";
          const st = STATUS_STYLES[status];
          const isSelected = dateStr === selectedDate;
          const today = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => { onSelectDate(dateStr); setViewDate(day); }}
              disabled={!inMonth}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all text-[10px] font-semibold
                ${!inMonth ? "opacity-20 cursor-default" : "cursor-pointer hover:bg-slate-50"}
                ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}
                ${today && !isSelected ? "bg-primary/5" : ""}
              `}
            >
              <span className={today ? "text-primary font-black" : "text-slate-600"}>{format(day, "d")}</span>
              {inMonth && status !== "none" && (
                <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${st.bg}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-slate-100 flex-wrap">
        {[["complete","All done"],["partial","Partial"],["overdue","Overdue"],["pending","Pending"]].map(([s, label]) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${STATUS_STYLES[s].bg}`} />
            <span className="text-[9px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function ChecksCalendarStrip({ selectedDate, instances, completions, onSelectDate }) {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3">
      {/* Week strip + calendar toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <WeekStrip
            selectedDate={selectedDate}
            instances={instances}
            completions={completions}
            onSelectDate={onSelectDate}
          />
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setShowCalendar(v => !v)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              showCalendar
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"
            }`}
          >
            {showCalendar ? "Hide" : "Month"}
          </button>

          {/* Floating popover calendar */}
          {showCalendar && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCalendar(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 shadow-xl">
                <MiniCalendar
                  selectedDate={selectedDate}
                  instances={instances}
                  completions={completions}
                  onSelectDate={(d) => { onSelectDate(d); setShowCalendar(false); }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}