import { Users, ChevronRight } from "lucide-react";

export default function TodaysYoungPeople({ residents, highlightedId }) {
  const avatarClasses = [
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
  ];

  const statusConfig = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    progress: "bg-blue-50 text-blue-700 border-blue-100",
    due: "bg-amber-50 text-amber-700 border-amber-100",
    overdue: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2 font-black text-slate-900">
          <Users size={18} className="text-blue-600" /> Today's Young People
        </div>
        <button className="text-sm font-bold text-blue-600">View all</button>
      </div>
      <div className="divide-y divide-slate-100">
        {residents.map((resident, index) => (
          <button
            key={resident.id}
            className={`flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50 ${
              highlightedId === resident.id ? "bg-blue-50/40" : ""
            }`}
          >
            <div
              className={`grid h-12 w-12 place-items-center rounded-full font-black ${
                avatarClasses[index % avatarClasses.length]
              }`}
            >
              {resident.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-slate-900">{resident.name}</div>
              <div className="text-sm text-slate-500">
                Age {resident.age} · {resident.home}
              </div>
            </div>
            <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${statusConfig[resident.statusType]}`}>
              {resident.status}
            </span>
            <ChevronRight size={17} className="text-slate-400" />
          </button>
        ))}
      </div>
      <div className="p-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
          + View all assigned young people
        </button>
      </div>
    </section>
  );
}