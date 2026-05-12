import { Clock, Home, CheckCircle, ArrowRight, FileText, AlertTriangle, ClipboardCheck, Users } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

function ShiftField({ icon: Icon, label, value, sub, color = "text-slate-700" }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SWCurrentShift({ shift, home, clockIn, onStartLog, onAddIncident, onRecordCheck, onOpenHandover }) {
  const now = new Date();
  const todayStr = format(now, "HH:mm");

  const shiftStart = shift?.time_start || "07:00";
  const shiftEnd = shift?.time_end || "15:00";
  const assignedHome = home?.name || "Not assigned";

  const checkedIn = !!clockIn;
  const clockInTime = clockIn?.clock_in_time ? format(new Date(clockIn.clock_in_time), "HH:mm") : "—";

  // Next handover estimate = shift end
  const [endH, endM] = shiftEnd.split(":").map(Number);
  const shiftEndDate = new Date();
  shiftEndDate.setHours(endH, endM, 0);
  const minsLeft = differenceInMinutes(shiftEndDate, now);
  const hoursLeft = Math.floor(minsLeft / 60);
  const minsRem = minsLeft % 60;
  const timeLeftStr = minsLeft > 0 ? `in ${hoursLeft}h ${minsRem}m` : "Shift ended";

  const actions = [
    { label: "Start Daily Log", icon: FileText, color: "text-teal-600 border-teal-200 hover:bg-teal-50", onClick: onStartLog },
    { label: "Add Incident", icon: AlertTriangle, color: "text-red-500 border-red-200 hover:bg-red-50", onClick: onAddIncident },
    { label: "Record Check", icon: ClipboardCheck, color: "text-blue-500 border-blue-200 hover:bg-blue-50", onClick: onRecordCheck },
    { label: "Open Handover", icon: Users, color: "text-purple-500 border-purple-200 hover:bg-purple-50", onClick: onOpenHandover },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-blue-500" />
        <h3 className="font-bold text-slate-800 text-sm">Current Shift</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 pb-5 border-b border-slate-100">
        <ShiftField
          icon={Clock}
          label="Shift Time"
          value={`${shiftStart} – ${shiftEnd}`}
          sub={shift ? `${Math.round(((endH * 60 + endM) - parseInt(shiftStart) * 60 - parseInt(shiftStart.split(":")[1])) / 60 * 10) / 10} hrs` : "No shift"}
        />
        <ShiftField icon={Home} label="Assigned Home" value={assignedHome} />
        <ShiftField
          icon={CheckCircle}
          label="Check-in Status"
          value={checkedIn ? "Checked in" : "Not checked in"}
          sub={checkedIn ? clockInTime : ""}
          color={checkedIn ? "text-green-600" : "text-slate-400"}
        />
        <ShiftField
          icon={ArrowRight}
          label="Next Handover"
          value={`Today, ${shiftEnd}`}
          sub={timeLeftStr}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`flex flex-col items-center gap-2 p-3 border rounded-xl text-xs font-semibold transition-colors ${a.color}`}
            >
              <Icon className="w-5 h-5" />
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}