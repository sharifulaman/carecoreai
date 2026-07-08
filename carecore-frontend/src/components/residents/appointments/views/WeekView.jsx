import { useMemo } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function WeekView({ currentDate, appointments, getAppointmentColour, onSelectAppointment, onDayClick }) {
  const weekDays = useMemo(() => {
    const monday = new Date(currentDate);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const getAppointmentsForDay = (date) =>
    appointments.filter(apt => {
      try {
        const d = new Date(apt.start_datetime);
        return (
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth() &&
          d.getDate() === date.getDate()
        );
      } catch { return false; }
    });

  const getBlockStyle = (apt) => {
    const start = new Date(apt.start_datetime);
    const end = new Date(apt.end_datetime);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = Math.max(30, endMinutes - startMinutes);
    return {
      position: "absolute",
      top: `${(startMinutes / 60) * 60}px`,
      height: `${Math.max(30, (duration / 60) * 60)}px`,
      left: "2px",
      right: "2px",
      backgroundColor: getAppointmentColour(apt),
      borderRadius: "4px",
      overflow: "hidden",
      cursor: "pointer",
      zIndex: 10,
      padding: "2px 4px",
      color: "white",
      fontSize: "11px",
    };
  };

  const today = new Date();
  const isToday = (date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b border-border" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
        <div className="border-r border-border" />
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={`text-center py-2 text-xs font-medium cursor-pointer hover:bg-muted/30 border-r border-border last:border-r-0 ${
              isToday(day) ? "text-primary font-bold" : "text-muted-foreground"
            }`}
          >
            <div>{day.toLocaleDateString("en-GB", { weekday: "short" })}</div>
            <div className={`text-sm mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
              isToday(day) ? "bg-primary text-primary-foreground" : ""
            }`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
        <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} className="border-b border-border text-right pr-2 text-[10px] text-muted-foreground" style={{ height: "60px", lineHeight: "60px" }}>
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(day => {
            const dayApts = getAppointmentsForDay(day);
            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className="border-l border-border relative cursor-pointer"
                style={{ height: `${24 * 60}px` }}
              >
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} className="border-b border-border/40 absolute w-full" style={{ top: `${h * 60}px`, height: "60px" }} />
                ))}
                {/* Appointments */}
                {dayApts.map(apt => (
                  <div
                    key={apt.id}
                    style={getBlockStyle(apt)}
                    onClick={e => { e.stopPropagation(); onSelectAppointment(apt); }}
                    title={apt.title}
                  >
                    <div className="font-semibold truncate flex items-center gap-0.5">
                      {(apt._isRecurringInstance || apt.is_recurring) && <span>🔁</span>}
                      {apt.title}
                    </div>
                    {!apt.all_day && (
                      <div className="opacity-80">
                        {new Date(apt.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}