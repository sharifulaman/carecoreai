import { useState, useMemo } from "react";
import { CalendarDays, ChevronRight, Plus, Filter } from "lucide-react";
import AppointmentForm from "@/components/residents/appointments/AppointmentForm";
import { useQueryClient } from "@tanstack/react-query";

export default function UpcomingAppointments({ assignedResidents = [], todayAppointments = [], user, staffProfile, homes = [], staff = [] }) {
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const assignedIds = assignedResidents.map(r => r.id);
  const dbAppointments = todayAppointments.filter(a => assignedIds.includes(a.resident_id) && !a.is_deleted);

  const virtualAppointments = [];
  assignedResidents.forEach(r => {
    if (r.dentist_next_appointment) {
      virtualAppointments.push({
        id: `dentist-${r.id}`,
        resident_id: r.id,
        start_datetime: r.dentist_next_appointment,
        appointment_type: "Dentist Appointment",
        location: r.dentist_practice || "TBC",
        status: "Scheduled"
      });
    }
    if (r.optician_next_appointment) {
      virtualAppointments.push({
        id: `optician-${r.id}`,
        resident_id: r.id,
        start_datetime: r.optician_next_appointment,
        appointment_type: "Optician Appointment",
        location: r.optician_practice || "TBC",
        status: "Scheduled"
      });
    }
  });

  const appointments = [...dbAppointments, ...virtualAppointments];

  const filteredAppts = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return appointments.filter(appt => {
      const aptDate = new Date(appt.start_datetime);
      const aptDateStr = aptDate.toISOString().split("T")[0];
      
      if (filter === "All") return true;
      if (filter === "Today") return aptDateStr === todayStr;
      if (filter === "Past") return aptDateStr < todayStr;
      if (filter === "Upcoming") return aptDateStr > todayStr;
      return true;
    }).sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
  }, [appointments, filter]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2 font-black text-slate-900">
          <CalendarDays size={18} className="text-blue-600" /> Appointments
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border-slate-200 rounded-md py-1 px-2 font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All</option>
          <option value="Today">Today</option>
          <option value="Past">Past</option>
          <option value="Upcoming">Upcoming</option>
        </select>
      </div>
      <div className="divide-y divide-slate-100">
        {filteredAppts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No upcoming appointments for assigned young people.
          </div>
        ) : (
          filteredAppts.map((appt) => {
            const date = new Date(appt.start_datetime);
            const resident = assignedResidents.find((r) => r.id === appt.resident_id);
            return (
              <button
                key={appt.id}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="w-12 rounded-xl border border-slate-200 bg-slate-50 py-1 text-center">
                  <div className="text-lg font-black text-slate-900">{date.getDate()}</div>
                  <div className="text-[10px] font-black text-slate-500 uppercase">
                    {date.toLocaleString("default", { month: "short" })}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900">{appt.appointment_type || "Appointment"}</div>
                  <div className="text-sm text-slate-500">{resident?.display_name || "Unknown"}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900">
                    {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-sm text-slate-500 truncate max-w-[120px]">{appt.location || "TBC"}</div>
                </div>
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                  {appt.status || "Scheduled"}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            );
          })
        )}
      </div>
      <div className="p-4 border-t border-slate-100">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
          <Plus size={16} /> Add Appointment
        </button>
      </div>

      {showForm && (
        <AppointmentForm
          staffProfile={staffProfile}
          user={user}
          residents={assignedResidents}
          homes={homes}
          staff={staff}
          initialDate={new Date()}
          initialResidentId={null}
          initialData={null}
          onSave={() => {
            queryClient.invalidateQueries(["sw-appointments-today"]);
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </section>
  );
}