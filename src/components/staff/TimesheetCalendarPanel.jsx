import { X } from "lucide-react";
import { format, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, isSameMonth } from "date-fns";

function formatTime(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function TimesheetCalendarPanel({ timesheet, attendanceLogs, onClose }) {
  const days = eachDayOfInterval({
    start: parseISO(timesheet.period_start),
    end: parseISO(timesheet.period_end),
  });

  // Build a lookup: date string → attendance log(s)
  const logsByDate = {};
  for (const log of attendanceLogs) {
    if (log.staff_id !== timesheet.staff_id) continue;
    if (!log.clock_in_time) continue;
    // Use local date to avoid timezone shifting the date
    const dt = new Date(log.clock_in_time);
    const ds = format(dt, "yyyy-MM-dd");
    if (!logsByDate[ds]) logsByDate[ds] = [];
    logsByDate[ds].push(log);
  }

  const totalActual = days.reduce((sum, d) => {
    const ds = format(d, "yyyy-MM-dd");
    const logs = logsByDate[ds] || [];
    return sum + logs.reduce((s, l) => s + (l.total_hours || 0), 0);
  }, 0);

  const daysWorked = days.filter(d => {
    const ds = format(d, "yyyy-MM-dd");
    return (logsByDate[ds] || []).some(l => l.total_hours > 0);
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-card w-full max-w-2xl h-full overflow-y-auto shadow-2xl border-l border-border flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-bold">{timesheet.staff_name}</h2>
            <p className="text-xs text-muted-foreground">{timesheet.pay_period_label} · {timesheet.period_start} – {timesheet.period_end}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-border">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Days Worked</p>
            <p className="text-xl font-bold">{daysWorked}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="text-xl font-bold">{(totalActual > 0 ? totalActual : (timesheet.total_actual_hours || 0)).toFixed(2)}h</p>
            {totalActual === 0 && timesheet.total_actual_hours > 0 && (
              <p className="text-[9px] text-amber-600 mt-0.5">from timesheet record</p>
            )}
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Gross Pay</p>
            <p className="text-xl font-bold">£{(timesheet.gross_pay || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* No individual logs warning */}
        {totalActual === 0 && timesheet.total_actual_hours > 0 && (
          <div className="mx-6 mb-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
            <strong>Note:</strong> This timesheet records <strong>{timesheet.total_actual_hours}h</strong> total (stored on timesheet), but no individual clock-in/out logs are linked to this pay period. Hours may have been entered manually or imported.
          </div>
        )}

        {/* Calendar grid */}
        <div className="px-6 py-4 flex-1">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Daily Breakdown</p>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Build calendar weeks */}
          {(() => {
            const firstDay = parseISO(timesheet.period_start);
            const lastDay = parseISO(timesheet.period_end);
            const calStart = startOfWeek(firstDay, { weekStartsOn: 1 });
            const calEnd = endOfWeek(lastDay, { weekStartsOn: 1 });
            const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
            const weeks = [];
            for (let i = 0; i < allDays.length; i += 7) {
              weeks.push(allDays.slice(i, i + 7));
            }
            return weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                {week.map(day => {
                  const ds = format(day, "yyyy-MM-dd");
                  const inPeriod = ds >= timesheet.period_start && ds <= timesheet.period_end;
                  const logs = logsByDate[ds] || [];
                  const hasClockIn = logs.length > 0;
                  const hours = logs.reduce((s, l) => s + (l.total_hours || 0), 0);
                  const isToday = ds === new Date().toISOString().slice(0, 10);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <div
                      key={ds}
                      className={`rounded-lg p-1.5 min-h-[64px] text-center border transition-colors ${
                        !inPeriod
                          ? "opacity-20 border-transparent"
                          : hasClockIn && hours > 0
                          ? "bg-green-50 border-green-200"
                          : isWeekend
                          ? "bg-muted/10 border-border/30"
                          : "bg-muted/20 border-border/50"
                      } ${isToday ? "ring-2 ring-primary" : ""}`}
                    >
                      <p className={`text-[10px] font-semibold mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </p>
                      {inPeriod && hasClockIn && (
                        <>
                          <p className="text-[9px] text-green-700 font-medium leading-tight">{formatTime(logs[0]?.clock_in_time)}</p>
                          <p className="text-[9px] text-red-600 leading-tight">{formatTime(logs[0]?.clock_out_time)}</p>
                          {hours > 0 && <p className="text-[9px] font-bold text-foreground mt-0.5">{hours.toFixed(1)}h</p>}
                        </>
                      )}
                      {inPeriod && !hasClockIn && !isWeekend && (
                        <p className="text-[9px] text-muted-foreground/50 mt-2">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ));
          })()}

          {/* Detail list */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Log Details</p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="text-left px-3 py-2 font-medium">Clock In</th>
                    <th className="text-left px-3 py-2 font-medium">Clock Out</th>
                    <th className="text-right px-3 py-2 font-medium">Hours</th>
                    <th className="text-left px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map(d => {
                    const ds = format(d, "yyyy-MM-dd");
                    const logs = logsByDate[ds] || [];
                    if (!logs.length) return null;
                    return logs.map((log, li) => (
                      <tr key={`${ds}-${li}`} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                        <td className="px-3 py-2">{format(d, "EEE d MMM")}</td>
                        <td className="px-3 py-2 text-green-700 font-medium">{formatTime(log.clock_in_time)}</td>
                        <td className="px-3 py-2 text-red-600">{formatTime(log.clock_out_time)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{log.total_hours ? `${log.total_hours.toFixed(2)}h` : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{log.notes || "—"}</td>
                      </tr>
                    ));
                  })}
                  {days.every(d => !(logsByDate[format(d, "yyyy-MM-dd")] || []).length) && (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No clock-in records for this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}