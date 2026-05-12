import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Home, Sun, Sunset, Moon, Coffee, Play, Square, ChevronDown, ChevronRight } from "lucide-react";
import { format, addDays, differenceInMinutes, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SHIFT_ICONS = {
  morning: Sun, afternoon: Sunset, night: Moon, sleeping: Coffee,
};

const SHIFT_COLORS = {
  published: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-gray-200 text-gray-500 border-gray-300",
  cancelled: "bg-red-100 text-red-500 border-red-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
};

function ShiftCard({ shift, home, isToday, isClockedIn, onClockIn, onClockOut }) {
  const Icon = SHIFT_ICONS[shift.shift_type] || Clock;
  const shiftDate = new Date(shift.date + "T12:00:00");
  const dayLabel = isToday ? "Today" : format(shiftDate, "EEEE, d MMM");

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      isToday ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-card border-border",
      shift.status === "cancelled" ? "opacity-50" : ""
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", isToday ? "bg-primary/10" : "bg-muted")}>
            <Icon className={cn("w-4 h-4", isToday ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="font-semibold text-sm capitalize">{shift.shift_type} Shift</p>
            <p className={cn("text-xs", isToday ? "text-primary font-medium" : "text-muted-foreground")}>{dayLabel}</p>
          </div>
        </div>
        <Badge className={`text-xs border capitalize ${SHIFT_COLORS[shift.status] || SHIFT_COLORS.draft}`}>
          {shift.status?.replace("_", " ")}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{shift.time_start} – {shift.time_end}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Home className="w-3 h-3" />
          <span className="truncate">{home?.name || "—"}</span>
        </div>
      </div>

      {isToday && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <Button
            size="sm"
            className={cn("w-full gap-2 text-xs", isClockedIn ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600")}
            onClick={isClockedIn ? onClockOut : onClockIn}
          >
            {isClockedIn ? <><Square className="w-3.5 h-3.5" /> Clock Out</> : <><Play className="w-3.5 h-3.5" /> Clock In</>}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyShiftsSection({ myProfile, user }) {
  const queryClient = useQueryClient();
  const [showPast, setShowPast] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const in14Days = addDays(new Date(), 14).toISOString().split("T")[0];
  const ago30Days = addDays(new Date(), -30).toISOString().split("T")[0];

  const { data: allShifts = [] } = useQuery({
    queryKey: ["sw-shifts-section", myProfile?.id],
    queryFn: () => secureGateway.filter("Shift", { org_id: ORG_ID }),
    enabled: !!myProfile?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["sw-homes-section"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: activeLog } = useQuery({
    queryKey: ["sw-active-clock-section", myProfile?.id],
    queryFn: async () => {
      if (!myProfile?.id) return null;
      const logs = await secureGateway.filter("AttendanceLog", { staff_id: myProfile.id });
      return logs.find(l => l.clock_in_time && !l.clock_out_time) || null;
    },
    enabled: !!myProfile?.id,
    refetchInterval: 60000,
  });

  const clockInMutation = useMutation({
    mutationFn: () => secureGateway.create("AttendanceLog", {
      org_id: ORG_ID, staff_id: myProfile.id, staff_name: myProfile.full_name,
      home_id: myProfile.home_ids?.[0] || "", clock_in_time: new Date().toISOString(), clock_in_method: "app",
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sw-active-clock-section"] }); toast.success("Clocked in"); },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const totalHours = parseFloat(((now - new Date(activeLog.clock_in_time)) / 3600000).toFixed(2));
      return secureGateway.update("AttendanceLog", activeLog.id, { clock_out_time: now.toISOString(), total_hours: totalHours });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sw-active-clock-section"] }); toast.success("Clocked out"); },
  });

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  const myShifts = useMemo(() => {
    if (!myProfile?.id) return [];
    return allShifts.filter(s => (s.assigned_staff || []).includes(myProfile.id) && s.status !== "cancelled");
  }, [allShifts, myProfile]);

  const upcoming = myShifts.filter(s => s.date >= today && s.date <= in14Days).sort((a, b) => a.date.localeCompare(b.date));
  const past = myShifts.filter(s => s.date < today && s.date >= ago30Days).sort((a, b) => b.date.localeCompare(a.date));

  // Next shift countdown
  const nextFutureShift = upcoming.find(s => s.date > today);
  const nextShiftLabel = (() => {
    if (!nextFutureShift) return null;
    const d = new Date(nextFutureShift.date + "T12:00:00");
    const tomorrow = addDays(new Date(), 1).toISOString().split("T")[0];
    const dayLabel = nextFutureShift.date === tomorrow ? "Tomorrow" : format(d, "EEEE d MMM");
    return `Next shift: ${dayLabel}, ${nextFutureShift.shift_type}, ${nextFutureShift.time_start}–${nextFutureShift.time_end} at ${homeMap[nextFutureShift.home_id]?.name || "—"}`;
  })();

  return (
    <div className="space-y-5">
      {/* Next shift banner */}
      {nextShiftLabel && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-primary font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          {nextShiftLabel}
        </div>
      )}

      {/* Upcoming 14 days */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Next 14 Days ({upcoming.length} shift{upcoming.length !== 1 ? "s" : ""})</h3>
        {upcoming.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No shifts scheduled in the next 14 days.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(s => (
              <ShiftCard
                key={s.id}
                shift={s}
                home={homeMap[s.home_id]}
                isToday={s.date === today}
                isClockedIn={!!activeLog}
                onClockIn={() => clockInMutation.mutate()}
                onClockOut={() => clockOutMutation.mutate()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past 30 days — collapsed */}
      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(s => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPast ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Past Shifts (Last 30 Days — {past.length})
          </button>
          {showPast && (
            <div className="mt-3 space-y-3">
              {past.map(s => (
                <ShiftCard
                  key={s.id}
                  shift={s}
                  home={homeMap[s.home_id]}
                  isToday={false}
                  isClockedIn={false}
                  onClockIn={() => {}}
                  onClockOut={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}