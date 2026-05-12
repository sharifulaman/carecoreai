import { useMemo } from "react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthView({ currentDate, appointments, getAppointmentColour, onSelectAppointment, onDayClick }) {
  const { days, startOffset } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday-based offset
    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;

    const days = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return { days, startOffset: offset };
  }, [currentDate]);

  const getAppointmentsForDay = (date) => {
    return appointments.filter(apt => {
      try {
        const d = new Date(apt.start_datetime);
        return (
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth() &&
          d.getDate() === date.getDate()
        );
      } catch {
        return false;
      }
    });
  };

  const today = new Date();
  const isToday = (date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  // Build grid cells: blanks + days
  const cells = [
    ...Array(startOffset).fill(null),
    ...days,
  ];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-semibold py-2 text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`blank-${idx}`} className="border-b border-r border-border min-h-[100px] bg-muted/20" />;
          }
          const dayApts = getAppointmentsForDay(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`border-b border-r border-border min-h-[100px] p-1 cursor-pointer hover:bg-muted/30 transition-colors ${
                !isCurrentMonth ? "bg-muted/10 opacity-50" : ""
              }`}
            >
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayApts.slice(0, 3).map(apt => (
                  <div
                    key={apt.id}
                    onClick={e => { e.stopPropagation(); onSelectAppointment(apt); }}
                    className="truncate text-xs px-1 py-0.5 rounded cursor-pointer text-white flex items-center gap-0.5"
                    style={{ backgroundColor: getAppointmentColour(apt) }}
                    title={apt.title}
                  >
                    {(apt._isRecurringInstance || apt.is_recurring) && (
                      <span className="opacity-80 shrink-0">🔁</span>
                    )}
                    {!apt.all_day && (
                      <span className="opacity-80 mr-0.5 shrink-0">
                        {new Date(apt.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span className="truncate">{apt.title}</span>
                  </div>
                ))}
                {dayApts.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">
                    +{dayApts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}