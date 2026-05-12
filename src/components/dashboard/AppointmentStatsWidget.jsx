import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, differenceInDays, startOfWeek, endOfWeek, addDays } from "date-fns";
import { Calendar, Bus, User, BarChart2, AlertTriangle, Clock, CheckCircle2, ClipboardList } from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];
function avatarColor(name = "") {
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function dayLabel(dt) {
  if (isToday(dt)) return "Today";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dt.getDay()];
}

function statusBadge(status) {
  const map = {
    scheduled: { label: "Today", cls: "bg-blue-100 text-blue-700" },
    confirmed:  { label: "Confirmed", cls: "bg-green-100 text-green-700" },
    pending:    { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    follow_up:  { label: "Follow-up", cls: "bg-purple-100 text-purple-700" },
    completed:  { label: "Complete", cls: "bg-green-100 text-green-700" },
    did_not_attend: { label: "DNA", cls: "bg-red-100 text-red-600" },
  };
  const cfg = map[status] || { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
      • {cfg.label}
    </span>
  );
}

function queueDueLabel(apt, now) {
  const dt = new Date(apt.start_datetime);
  const diff = differenceInDays(dt, now);
  if (diff < 0) return { label: `Overdue by ${Math.abs(diff)} days`, cls: "text-red-600" };
  if (diff === 0) return { label: "Due today", cls: "text-amber-600" };
  if (diff === 1) return { label: "Due tomorrow", cls: "text-amber-500" };
  return { label: `Due in ${diff} days`, cls: "text-blue-600" };
}

function queueActionBadge(apt, now) {
  const dt = new Date(apt.start_datetime);
  const diff = differenceInDays(dt, now);
  if (diff < 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Urgent</span>;
  if (diff === 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Due Today</span>;
  if (diff === 1) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600">Awaiting Outcome</span>;
  if (diff <= 3) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600">Due Soon</span>;
  if (apt.status === "completed") return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Complete</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">Pending</span>;
}

function queueIcon(apt, now) {
  const dt = new Date(apt.start_datetime);
  const diff = differenceInDays(dt, now);
  if (diff < -1) return <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />;
  if (apt.status === "completed") return <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />;
  return <Clock className="w-5 h-5 text-amber-500 shrink-0" />;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function AppointmentStatsWidget({ appointments = [] }) {
  const navigate = useNavigate();
  const now = new Date();
  const weekEnd = addDays(now, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const go = () => navigate("/residents?tab=appointments");

  // Upcoming: scheduled future appointments, next 7 days, sorted by date
  const upcoming = appointments
    .filter(a => new Date(a.start_datetime) >= now && new Date(a.start_datetime) <= weekEnd && a.status === "scheduled")
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 5);

  // Follow-up queue: overdue follow-ups + pending outcomes, sorted by urgency
  const queue = appointments
    .filter(a =>
      (a.follow_up_required && !a.follow_up_notes?.trim() && a.status === "completed") ||
      (a.status === "scheduled" && new Date(a.end_datetime) < now)
    )
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 5);

  // Bottom stats
  const thisWeekCount = upcoming.length;
  const requiresTransport = appointments.filter(a =>
    new Date(a.start_datetime) >= now && new Date(a.start_datetime) <= weekEnd && a.requires_transport
  ).length;
  const keyWorkerCount = appointments.filter(a =>
    new Date(a.start_datetime) >= now && new Date(a.start_datetime) <= weekEnd && a.appointment_type === "key_worker_session"
  ).length;
  const completedThisMonth = appointments.filter(a => a.status === "completed" && new Date(a.start_datetime) >= monthStart).length;
  const totalThisMonth = appointments.filter(a => new Date(a.start_datetime) >= monthStart).length;
  const outcomeRate = totalThisMonth > 0 ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Two-panel top area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

        {/* LEFT — Upcoming Appointments */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Upcoming Appointments
            </h3>
            <button onClick={go} className="text-xs text-primary hover:underline">View calendar →</button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[48px_52px_1fr_1fr_1fr_72px] gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">
            <span>Date</span>
            <span>Time</span>
            <span>Young Person</span>
            <span>Type</span>
            <span>Location</span>
            <span>Status</span>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No upcoming appointments this week.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {upcoming.map((apt, i) => {
                const dt = new Date(apt.start_datetime);
                const day = dayLabel(dt);
                const dateNum = format(dt, "d MMM");
                const time = format(dt, "h:mm");
                const ampm = format(dt, "a");
                const name = apt.resident_name || "—";
                const firstName = name.split(" ")[0];
                const lastName = name.split(" ")[1]?.[0] ? name.split(" ")[1][0] + "." : "";

                return (
                  <div key={apt.id || i} className="grid grid-cols-[48px_52px_1fr_1fr_1fr_72px] gap-1 items-center py-2">
                    {/* Date */}
                    <div>
                      <p className={`text-xs font-bold ${isToday(dt) ? "text-blue-600" : "text-slate-700"}`}>{day}</p>
                      <p className="text-[10px] text-muted-foreground">{dateNum}</p>
                    </div>
                    {/* Time */}
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{time}</p>
                      <p className="text-[10px] text-muted-foreground">{ampm}</p>
                    </div>
                    {/* Young Person */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(name)}`}>
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{firstName} {lastName}</p>
                      </div>
                    </div>
                    {/* Type */}
                    <p className="text-[10px] text-slate-600 truncate capitalize">{apt.appointment_type?.replace(/_/g, " ")}</p>
                    {/* Location */}
                    <p className="text-[10px] text-slate-500 truncate">{apt.location || "—"}</p>
                    {/* Status */}
                    <div>{statusBadge(apt.status)}</div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={go} className="mt-2 text-xs text-primary hover:underline">
            View all appointments →
          </button>
        </div>

        {/* RIGHT — Follow-up & Outcome Queue */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Follow-up &amp; Outcome Queue
            </h3>
            <button onClick={go} className="text-xs text-primary hover:underline">View all →</button>
          </div>

          {queue.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">All caught up — no pending follow-ups.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((apt, i) => {
                const name = apt.resident_name || "—";
                const due = queueDueLabel(apt, now);
                const subtitle = apt.appointment_type?.replace(/_/g, " ") || "Appointment";
                return (
                  <div key={apt.id || i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    {queueIcon(apt, now)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-medium ${due.cls}`}>{due.label}</span>
                      {queueActionBadge(apt, now)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={go} className="mt-2 text-xs text-primary hover:underline">
            View full queue →
          </button>
        </div>
      </div>

      {/* Bottom stat bar */}
      <div className="border-t border-border grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        {[
          { icon: Calendar, color: "text-blue-500", val: thisWeekCount, label: "This Week", sub: "Appointments" },
          { icon: Bus, color: "text-purple-500", val: requiresTransport, label: "Requires Transport", sub: "Appointments" },
          { icon: User, color: "text-green-500", val: keyWorkerCount, label: "Key Worker Attending", sub: "Appointments" },
          { icon: BarChart2, color: "text-amber-500", val: `${outcomeRate}%`, label: "Outcome completion rate", sub: "This month", big: true },
        ].map(({ icon: Icon, color, val, label, sub, big }) => (
          <button key={label} onClick={go} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
            <Icon className={`w-5 h-5 shrink-0 ${color}`} />
            <div>
              <p className={`font-bold ${big ? "text-xl text-amber-600" : "text-lg text-foreground"}`}>{val}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              <p className="text-[10px] text-muted-foreground/60">{sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}