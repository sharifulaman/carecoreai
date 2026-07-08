import { Calendar, Plus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function SWAppointmentsCard({ appointments, residents }) {
  const navigate = useNavigate();
  const residentMap = useMemo(() => 
    Object.fromEntries(residents.map(r => [r.id, r])),
    [residents]
  );

  const todayAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointments
      .filter(a => {
        const apptDate = new Date(a.date);
        apptDate.setHours(0, 0, 0, 0);
        return apptDate >= today;
      })
      .slice(0, 5)
      .map(a => {
        const resident = residentMap[a.resident_id];
        const apptDate = new Date(a.date);
        const daysFromNow = Math.floor((apptDate - new Date()) / (1000 * 60 * 60 * 24));
        
        let dateLabel = "Today";
        if (daysFromNow === 1) dateLabel = "Tomorrow";
        else if (daysFromNow > 1) dateLabel = `${daysFromNow} days`;

        return {
          id: a.id,
          date: apptDate.getDate(),
          month: apptDate.toLocaleDateString("en-US", { month: "short" }),
          type: a.appointment_type || "Appointment",
          resident: resident?.display_name || "—",
          time: a.time || "TBD",
          location: a.location || "TBD",
          dateLabel,
        };
      });
  }, [appointments, residentMap]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Upcoming Appointments</h3>
          <p className="text-xs text-muted-foreground mt-1">{todayAppointments.length} upcoming</p>
        </div>
        <a href="/residents?tab=appointments" className="text-xs text-primary hover:underline">View calendar</a>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {todayAppointments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No upcoming appointments</p>
        ) : (
          todayAppointments.map((appt) => (
            <div key={appt.id} className="border border-border rounded p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="text-center min-w-fit">
                  <p className="text-lg font-bold text-primary">{appt.date}</p>
                  <p className="text-xs text-muted-foreground">{appt.month}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{appt.type}</p>
                  <p className="text-xs text-muted-foreground truncate">{appt.resident}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{appt.time}</span>
                    <span>•</span>
                    <span className="truncate">{appt.location}</span>
                  </div>
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1 inline-block">
                    {appt.dateLabel}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => navigate("/residents?tab=appointments")}
        className="w-full flex items-center justify-center gap-2 text-xs font-medium text-primary hover:underline py-2"
      >
        <Plus className="w-3 h-3" /> Add Appointment
      </button>
    </div>
  );
}