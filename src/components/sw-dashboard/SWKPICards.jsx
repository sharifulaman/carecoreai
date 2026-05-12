import { Users, CheckSquare, Heart, ShieldAlert, GraduationCap, ChevronRight } from "lucide-react";

export default function SWKPICards({ residents, tasks, healthChecks, incidents, training, onOpen }) {
  const cards = [
    {
      key: "yp",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-50",
      value: residents.length,
      label: "Assigned Young People",
      link: "View all",
    },
    {
      key: "tasks",
      icon: CheckSquare,
      color: "text-green-500",
      bg: "bg-green-50",
      value: tasks.length,
      label: "Tasks Due Today",
      link: "View tasks",
    },
    {
      key: "health",
      icon: Heart,
      color: "text-cyan-500",
      bg: "bg-cyan-50",
      value: healthChecks.length,
      label: "Medication / Health Checks",
      link: "View all",
    },
    {
      key: "incidents",
      icon: ShieldAlert,
      color: "text-orange-500",
      bg: "bg-orange-50",
      value: incidents.length,
      label: "Incidents to Review",
      link: "Review now",
    },
    {
      key: "training",
      icon: GraduationCap,
      color: "text-purple-500",
      bg: "bg-purple-50",
      value: training.length,
      label: "Training Due",
      link: "View training",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.key} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-800 leading-none">{c.value}</p>
            <p className="text-xs text-slate-500 mt-1 leading-tight">{c.label}</p>
            <button
              onClick={() => onOpen(c.key)}
              className={`flex items-center gap-1 text-xs font-semibold mt-2 ${c.color} hover:underline`}
            >
              {c.link} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}