import { Pencil, Plus } from "lucide-react";

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function timeAgo(isoStr) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

export default function ResidentMobileCard({
  resident,
  homeName,
  keyWorkerNames,
  todayVisit,
  currentStatusLog,
  nightStayLog,
  eduAttendanceLog,
  mealIntakeLog,
  lastVisit,
  onStatusClick,
  onNightStayClick,
  onEduClick,
  onMealClick,
}) {
  const age = calcAge(resident.dob);
  const csStatus = currentStatusLog?.content?.status || null;
  const nsStatus = nightStayLog?.content?.night_stay_status || null;
  const eaStatus = eduAttendanceLog?.content?.edu_attendance_status || null;
  const miLog = mealIntakeLog;

  const faceTime = todayVisit
    ? new Date(todayVisit.created_date || todayVisit.date + "T" + (todayVisit.time_start || "00:00")).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center gap-3">
        {resident.photo_url ? (
          <img src={resident.photo_url} className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {resident.initials || resident.display_name?.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">
            {resident.display_name} {age && <span className="text-muted-foreground font-normal">({age}y)</span>}
          </p>
          <p className="text-xs text-muted-foreground truncate">{homeName}</p>
          {keyWorkerNames.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">KW: {keyWorkerNames.join(", ")}</p>
          )}
        </div>
        {resident.risk_level && resident.risk_level !== "low" && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
            resident.risk_level === "critical" ? "bg-red-700/10 text-red-700" :
            resident.risk_level === "high" ? "bg-red-500/10 text-red-500" :
            "bg-amber-500/10 text-amber-500"
          }`}>{resident.risk_level}</span>
        )}
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Face-to-face */}
        <div className="bg-muted/30 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">Face-to-face</p>
          {faceTime ? (
            <span className="text-xs text-green-700 font-medium">✓ {faceTime}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Not recorded</span>
          )}
        </div>

        {/* Current Status */}
        <div className="bg-muted/30 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">Status</p>
          <div className="flex items-center gap-1">
            <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
              csStatus === "In" ? "border-green-400 text-green-700 bg-green-50" :
              csStatus === "Out" ? "border-red-400 text-red-700 bg-red-50" :
              csStatus === "N/A" ? "border-amber-400 text-amber-700 bg-amber-50" :
              "border-border text-muted-foreground"
            }`}>{csStatus || "—"}</span>
            <button onClick={onStatusClick} className="text-muted-foreground hover:text-foreground">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Night Stay */}
        <div className="bg-muted/30 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">Night Stay</p>
          <div className="flex items-center gap-1">
            <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
              nsStatus === "Stayed In" ? "border-green-400 text-green-700 bg-green-50" :
              nsStatus === "Stayed Out" ? "border-red-400 text-red-700 bg-red-50" :
              "border-amber-300 text-amber-700 bg-amber-50"
            }`}>{nsStatus || "Not Marked"}</span>
            <button onClick={onNightStayClick} className="text-muted-foreground hover:text-foreground">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Education Attendance */}
        <div className="bg-muted/30 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">Education</p>
          <div className="flex items-center gap-1">
            <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
              eaStatus === "Attended" ? "border-green-400 text-green-700 bg-green-50" :
              eaStatus === "Not Attended" ? "border-red-400 text-red-700 bg-red-50" :
              "border-amber-300 text-amber-700 bg-amber-50"
            }`}>{eaStatus || "Not Marked"}</span>
            <button onClick={onEduClick} className="text-muted-foreground hover:text-foreground">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Meal Intake */}
      <div className="bg-muted/30 rounded-lg p-2">
        <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">Meal Intake</p>
        {miLog ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-teal-700 font-medium">{miLog.content?.meal || "Meal logged"}</span>
            {miLog.content?.consumed && <span className="text-xs text-muted-foreground">— {miLog.content.consumed}</span>}
            <button onClick={onMealClick} className="text-muted-foreground hover:text-foreground ml-auto">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button onClick={onMealClick} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Plus className="w-3 h-3" /> Add meal
          </button>
        )}
      </div>

      {/* Last visit */}
      {lastVisit && (
        <p className="text-xs text-muted-foreground">Last KW session: {timeAgo(lastVisit.created_date)}</p>
      )}
    </div>
  );
}