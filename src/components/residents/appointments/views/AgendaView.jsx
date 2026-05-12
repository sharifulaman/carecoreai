const TYPE_LABELS = {
  gp_appointment: "GP Appointment",
  hospital_appointment: "Hospital Appointment",
  dental: "Dental",
  optician: "Optician",
  mental_health: "Mental Health",
  social_worker_visit: "Social Worker Visit",
  iro_review: "IRO Review",
  lac_review: "LAC Review",
  court_hearing: "Court Hearing",
  school_meeting: "School Meeting",
  college_meeting: "College Meeting",
  key_worker_session: "Key Worker Session",
  family_contact: "Family Contact",
  counselling: "Counselling",
  probation: "Probation",
  youth_offending: "Youth Offending",
  other: "Other",
};

const STATUS_COLOURS = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
  did_not_attend: "bg-red-100 text-red-700",
  rescheduled: "bg-amber-100 text-amber-700",
};

export default function AgendaView({ appointments, getAppointmentColour, onSelectAppointment, residents }) {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)
  );

  if (sorted.length === 0) return null;

  // Group by date
  const groups = {};
  sorted.forEach(apt => {
    const dateKey = new Date(apt.start_datetime).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(apt);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([dateLabel, apts]) => (
        <div key={dateLabel}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 border-b border-border pb-1">
            {dateLabel}
          </h3>
          <div className="space-y-2">
            {apts.map(apt => {
              const colour = getAppointmentColour(apt);
              const resident = residents?.find(r => r.id === apt.resident_id);
              return (
                <div
                  key={apt.id}
                  onClick={() => onSelectAppointment(apt)}
                  className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: colour }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm">{apt.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOURS[apt.status] || "bg-muted text-muted-foreground"}`}>
                        {apt.status?.replace(/_/g, " ") || "scheduled"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TYPE_LABELS[apt.appointment_type] || apt.appointment_type}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span>
                        {apt.all_day
                          ? "All day"
                          : `${new Date(apt.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${new Date(apt.end_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                      {apt.location && <span>📍 {apt.location}</span>}
                      {resident && <span>👤 {resident.display_name}</span>}
                      {apt.organiser_name && <span>🗓 {apt.organiser_name}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}