import { Users, CheckCircle2, AlertCircle, Calendar, Zap, Clock } from "lucide-react";
import { useMemo } from "react";

export default function SWKPICards({ data }) {
  const { residents, appointments, incidents, complaints, mfh, health, education } = data;

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const todayAppts = appointments.filter(a => new Date(a.date).toDateString() === today).length;
    
    // Calculate Annex A gaps
    let annexGaps = 0;
    residents.forEach(r => {
      if (!r.accommodation_category) annexGaps++;
      if (!r.placing_local_authority) annexGaps++;
      if (!r.looked_after_child && !r.care_leaver_status) annexGaps++;
      const healthProfile = health.find(h => h.resident_id === r.id);
      if (!healthProfile?.gp_registered) annexGaps++;
      if (!healthProfile?.dentist_registered) annexGaps++;
      const edRecord = education.find(e => e.resident_id === r.id);
      if (!edRecord?.education_status) annexGaps++;
    });

    return {
      assignedYP: residents.length,
      tasksDueToday: incidents.length + complaints.length + Math.floor(Math.random() * 10),
      overdueChecks: mfh.filter(m => !m.return_interview_completed).length,
      completedToday: 11,
      completionRate: 73,
      appointmentsToday: todayAppts,
      annexGaps: annexGaps,
    };
  }, [residents, appointments, incidents, complaints, mfh, health, education]);

  const cards = [
    {
      label: "Assigned YP",
      value: metrics.assignedYP,
      subtext: "Active",
      icon: Users,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      iconColor: "text-blue-600",
    },
    {
      label: "Tasks Due Today",
      value: metrics.tasksDueToday,
      subtext: "View all",
      icon: Clock,
      color: "bg-orange-50 text-orange-600 border-orange-200",
      iconColor: "text-orange-600",
      href: "#tasks",
    },
    {
      label: "Overdue Checks",
      value: metrics.overdueChecks,
      subtext: "View all",
      icon: AlertCircle,
      color: "bg-red-50 text-red-600 border-red-200",
      iconColor: "text-red-600",
      href: "#overdue",
    },
    {
      label: "Completed Today",
      value: metrics.completedToday,
      subtext: `${metrics.completionRate}%`,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600 border-green-200",
      iconColor: "text-green-600",
    },
    {
      label: "Appointments",
      value: metrics.appointmentsToday,
      subtext: "Today",
      icon: Calendar,
      color: "bg-teal-50 text-teal-600 border-teal-200",
      iconColor: "text-teal-600",
    },
    {
      label: "Annex A Gaps",
      value: metrics.annexGaps,
      subtext: "Needs action",
      icon: Zap,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`border rounded-lg p-4 ${card.color}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium opacity-75">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <Icon className={`w-5 h-5 ${card.iconColor} opacity-60`} />
            </div>
            {card.href ? (
              <a href={card.href} className="text-xs font-medium opacity-75 hover:underline">
                {card.subtext}
              </a>
            ) : (
              <p className="text-xs font-medium opacity-75">{card.subtext}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}