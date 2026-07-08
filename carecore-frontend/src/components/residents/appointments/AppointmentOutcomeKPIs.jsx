import { useMemo } from "react";
import { XCircle, AlertTriangle, Clock, CheckCircle2, FileText } from "lucide-react";

const THIS_MONTH_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

export default function AppointmentOutcomeKPIs({ appointments = [] }) {
  const kpis = useMemo(() => {
    const active = appointments.filter(a => !a.is_deleted);

    const missedThisMonth = active.filter(a =>
      a.attendance_status === "missed" &&
      new Date(a.start_datetime) >= THIS_MONTH_START
    ).length;

    const missedNeedingFollowUp = active.filter(a =>
      a.attendance_status === "missed" &&
      a.follow_up_required &&
      !a.follow_up_notes?.trim()
    ).length;

    const followUpPending = active.filter(a =>
      a.follow_up_required &&
      (!a.follow_up_notes?.trim() || !a.responsible_person_id)
    ).length;

    const healthCompleted = active.filter(a =>
      a.attendance_status === "attended" &&
      ["gp_appointment","hospital_appointment","dental","optician","mental_health","counselling"].includes(a.appointment_type) &&
      new Date(a.start_datetime) >= THIS_MONTH_START
    ).length;

    const docsPending = active.filter(a =>
      a.attendance_status === "attended" &&
      (!a.document_urls?.length) &&
      ["gp_appointment","hospital_appointment","dental","mental_health","court_hearing"].includes(a.appointment_type)
    ).length;

    return [
      {
        label: "Missed this month",
        value: missedThisMonth,
        icon: XCircle,
        color: missedThisMonth > 0 ? "text-red-600" : "text-slate-400",
        bg: missedThisMonth > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200",
      },
      {
        label: "Missed — need follow-up",
        value: missedNeedingFollowUp,
        icon: AlertTriangle,
        color: missedNeedingFollowUp > 0 ? "text-orange-600" : "text-slate-400",
        bg: missedNeedingFollowUp > 0 ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200",
      },
      {
        label: "Follow-ups pending",
        value: followUpPending,
        icon: Clock,
        color: followUpPending > 0 ? "text-amber-600" : "text-slate-400",
        bg: followUpPending > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200",
      },
      {
        label: "Health appts completed",
        value: healthCompleted,
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "bg-green-50 border-green-200",
      },
      {
        label: "Evidence/docs pending",
        value: docsPending,
        icon: FileText,
        color: docsPending > 0 ? "text-blue-600" : "text-slate-400",
        bg: docsPending > 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200",
      },
    ];
  }, [appointments]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className={`rounded-xl border p-3 flex flex-col gap-1 ${kpi.bg}`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 shrink-0 ${kpi.color}`} />
              <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
            </div>
            <p className="text-xs text-slate-500 leading-tight">{kpi.label}</p>
          </div>
        );
      })}
    </div>
  );
}