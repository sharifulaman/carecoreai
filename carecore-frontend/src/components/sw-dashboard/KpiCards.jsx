import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Users, CalendarDays, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStatusDots } from "./useStatusDots";

const StatusBadge = ({ status }) => {
  switch (status) {
    case "due":
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">Due</span>;
    case "progress":
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">In Progress</span>;
    case "overdue":
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200">Overdue</span>;
    case "completed":
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">Done</span>;
    default:
      return null;
  }
};

const StatusIcon = ({ status }) => {
  if (status === "completed") {
    return <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />;
  }
  let dotColor = "bg-slate-300";
  if (status === "due") dotColor = "bg-amber-500";
  if (status === "progress") dotColor = "bg-blue-500";
  if (status === "overdue") dotColor = "bg-red-500";
  return <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />;
};

function formatTaskName(key) {
  if (!key) return "";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export default function KpiCards({ assignedResidents = [], todayAppointments = [], allStatuses = {} }) {
  const [activeCard, setActiveCard] = useState(null);

  // Calculate task counts from statuses
  const tasksDueToday = Object.values(allStatuses).filter((s) => s === "due" || s === "progress").length;
  const overdueChecks = Object.values(allStatuses).filter((s) => s === "overdue").length;
  const completedToday = Object.values(allStatuses).filter((s) => s === "completed").length;

  // Calculate appointments for today
  const assignedIds = assignedResidents.map((r) => r.id);
  const todayAppts = todayAppointments.filter((a) => assignedIds.includes(a.resident_id)).length;

  // Calculate Annex A gaps across all assigned residents
  const annexAGaps = assignedResidents.reduce((total, resident) => {
    const gaps = [
      !resident.accommodation_category,
      !resident.placing_local_authority,
      resident.uasc === undefined || resident.uasc === null,
    ].filter(Boolean).length;
    return total + Math.max(gaps, 0);
  }, 0);

  const cards = [
    {
      icon: Users,
      label: "Assigned YP",
      popupTitle: "Assigned Young People",
      value: assignedResidents.length,
      subtext: "Active",
      tone: "teal",
    },
    {
      icon: CalendarDays,
      label: "Tasks Due Today",
      popupTitle: "Tasks Due Today",
      value: tasksDueToday,
      linkText: "View all",
      tone: "amber",
    },
    {
      icon: AlertTriangle,
      label: "Overdue Checks",
      popupTitle: "Overdue Checks",
      value: overdueChecks,
      linkText: "View all",
      tone: "red",
    },
    {
      icon: CheckCircle2,
      label: "Completed Today",
      popupTitle: "Completed Today",
      value: completedToday,
      subtext: Math.round((completedToday / (Object.keys(allStatuses).length || 1)) * 100) + "%",
      tone: "green",
    },
    {
      icon: CalendarDays,
      label: "Appointments",
      popupTitle: "Today's Appointments",
      value: todayAppts,
      subtext: "Today",
      tone: "blue",
    },
    {
      icon: ShieldCheck,
      label: "Annex A Gaps",
      popupTitle: "Annex A Gaps",
      value: annexAGaps,
      subtext: "Needs action",
      tone: "purple",
      link: "/compliance-hub",
    },
  ];

  const toneMap = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-violet-50 text-violet-700",
  };

  const tasksDueList = Object.entries(allStatuses)
    .filter(([key, status]) => status === "due" || status === "progress")
    .map(([key, status]) => ({ key, status }));

  const overdueList = Object.entries(allStatuses)
    .filter(([key, status]) => status === "overdue")
    .map(([key, status]) => ({ key, status }));

  const completedList = Object.entries(allStatuses)
    .filter(([key, status]) => status === "completed")
    .map(([key, status]) => ({ key, status }));

  const renderPopupContent = () => {
    if (!activeCard) return null;

    switch (activeCard.label) {
      case "Assigned YP":
        return (
          <div className="py-8 text-center text-slate-500">
            {assignedResidents.length > 0 ? (
              <ul className="text-left space-y-3 px-2">
                {assignedResidents.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                      {r.initials || r.display_name?.charAt(0) || "?"}
                    </span>
                    <span className="font-medium text-slate-700">{r.display_name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              "No young people currently assigned to you."
            )}
          </div>
        );
      case "Appointments":
        const todayApptsList = todayAppointments.filter((a) => assignedIds.includes(a.resident_id));
        return (
          <div className="py-8 text-center text-slate-500">
            {todayApptsList.length > 0 ? (
              <ul className="text-left space-y-3 px-2">
                {todayApptsList.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0">
                    <span className="font-medium text-slate-700">{a.title}</span>
                    <span className="text-sm text-slate-500">
                      {new Date(a.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              "No appointments scheduled for today."
            )}
          </div>
        );
      case "Tasks Due Today":
        return (
          <div className="py-2">
            {tasksDueList.length > 0 ? (
              <ul className="space-y-0 px-2">
                {tasksDueList.map(({ key, status }) => (
                  <li key={key} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={status} />
                      <span className="text-slate-700 capitalize">{formatTaskName(key)}</span>
                    </div>
                    <StatusBadge status={status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-slate-500">No tasks due today.</div>
            )}
          </div>
        );
      case "Overdue Checks":
        return (
          <div className="py-2">
            {overdueList.length > 0 ? (
              <ul className="space-y-0 px-2">
                {overdueList.map(({ key, status }) => (
                  <li key={key} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={status} />
                      <span className="text-slate-700 capitalize">{formatTaskName(key)}</span>
                    </div>
                    <StatusBadge status={status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-slate-500">No overdue checks.</div>
            )}
          </div>
        );
      case "Completed Today":
        return (
          <div className="py-2">
            {completedList.length > 0 ? (
              <ul className="space-y-0 px-2">
                {completedList.map(({ key, status }) => (
                  <li key={key} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={status} />
                      <span className="text-slate-700 capitalize">{formatTaskName(key)}</span>
                    </div>
                    <StatusBadge status={status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-slate-500">No tasks completed today.</div>
            )}
          </div>
        );
      case "Annex A Gaps":
        return (
          <div className="py-8 text-center text-slate-500">
            {annexAGaps > 0 ? (
              <div className="px-2 text-left">
                There are <strong>{annexAGaps}</strong> missing Annex A data points across your assigned young people. Please check the Compliance Hub for details.
              </div>
            ) : (
              "All Annex A data is complete."
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => setActiveCard(card)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className={`grid h-14 w-14 place-items-center rounded-full ${toneMap[card.tone]}`}>
                  <Icon size={27} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-600">{card.label}</div>
                  <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                    {card.value}
                  </div>
                  {card.linkText ? (
                    <div className="mt-1 text-sm font-bold text-blue-600">{card.linkText}</div>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500">{card.subtext}</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!activeCard} onOpenChange={(open) => !open && setActiveCard(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {activeCard && (
            <>
              <DialogHeader className="flex flex-row items-center gap-3 space-y-0 border-b border-slate-100 pb-4">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneMap[activeCard.tone]}`}>
                  <activeCard.icon size={20} />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900">{activeCard.popupTitle}</DialogTitle>
              </DialogHeader>
              {renderPopupContent()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}