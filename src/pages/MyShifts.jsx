import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronDown, ChevronRight, Clock, Home, Moon, Sun, Sunset, Coffee } from "lucide-react";
import HandoverForm from "@/components/shifts/HandoverForm";

const SHIFT_COLORS = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  published: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-gray-200 text-gray-500 border-gray-300",
  cancelled: "bg-red-100 text-red-500 border-red-200",
};

const SHIFT_ICONS = {
  morning: <Sun className="w-4 h-4" />,
  afternoon: <Sunset className="w-4 h-4" />,
  night: <Moon className="w-4 h-4" />,
  sleeping: <Coffee className="w-4 h-4" />,
};

function ShiftCard({ shift, home, staffMap, myStaffProfileId, onStartHandover, onAcknowledge }) {
  const queryClient = useQueryClient();
  const isLead = shift.lead_staff_id === myStaffProfileId;
  const hasAcknowledged = shift.acknowledged_by_staff?.includes(myStaffProfileId);

  const acknowledgeMutation = useMutation({
    mutationFn: () => base44.entities.Shift.update(shift.id, {
      acknowledged_by_staff: [...(shift.acknowledged_by_staff || []), myStaffProfileId]
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-shifts"] }),
  });

  const shiftDate = new Date(shift.date + "T12:00:00");
  const dayLabel = shiftDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className={`bg-card border rounded-xl p-4 ${shift.status === "cancelled" ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-muted">
            {SHIFT_ICONS[shift.shift_type]}
          </div>
          <div>
            <p className="font-semibold capitalize">{shift.shift_type} Shift</p>
            <p className="text-xs text-muted-foreground">{dayLabel}</p>
          </div>
        </div>
        <Badge className={`text-xs capitalize border ${SHIFT_COLORS[shift.status]}`}>
          {shift.status?.replace("_", " ")}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Home className="w-3 h-3" />
          <span>{home?.name || "Unknown home"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{shift.time_start} – {shift.time_end}</span>
        </div>
        {isLead && <div className="col-span-2"><span className="text-primary font-medium">⭐ You are the lead for this shift</span></div>}
      </div>

      {shift.assigned_staff?.length > 0 && (
        <div className="mt-3 flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Staff:</span>
          <div className="flex gap-1">
            {shift.assigned_staff.slice(0, 4).map(sid => {
              const s = staffMap[sid];
              return (
                <div key={sid} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${sid === shift.lead_staff_id ? "bg-primary" : "bg-muted-foreground"}`}>
                  {s?.full_name?.charAt(0) || "?"}
                </div>
              );
            })}
            {shift.assigned_staff.length > 4 && <span className="text-xs text-muted-foreground ml-1">+{shift.assigned_staff.length - 4}</span>}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border flex gap-2">
        {shift.status === "published" && !hasAcknowledged && (
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => acknowledgeMutation.mutate()}>
            ✓ Acknowledge
          </Button>
        )}
        {shift.status === "in_progress" && isLead && (
          <Button size="sm" className="text-xs h-7" onClick={() => onStartHandover(shift)}>
            Start Handover
          </Button>
        )}
      </div>
    </div>
  );
}

function WeekGroup({ label, shifts, home, staffMap, myStaffProfileId, onStartHandover, onAcknowledge }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-medium text-sm">{label}</span>
          <span className="text-xs text-muted-foreground">— {shifts.length} shift{shifts.length !== 1 ? "s" : ""}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {shifts.map(s => (
            <ShiftCard key={s.id} shift={s} home={home} staffMap={staffMap} myStaffProfileId={myStaffProfileId} onStartHandover={onStartHandover} onAcknowledge={onAcknowledge} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyShifts() {
  const { user } = useOutletContext();
  const [handoverShift, setHandoverShift] = useState(null);

  const { data: myStaffProfiles = [] } = useQuery({
    queryKey: ["my-staff-profile-shifts", user?.email],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID, email: user?.email }),
    enabled: !!user?.email,
  });
  const myStaffProfile = myStaffProfiles[0] || null;

  const { data: allShifts = [] } = useQuery({
    queryKey: ["my-shifts", myStaffProfile?.id],
    queryFn: () => base44.entities.Shift.filter({ org_id: ORG_ID }),
    enabled: !!myStaffProfile?.id,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-24h-myshifts"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, property_type: "24_hours", status: "active" }),
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ["all-staff-myshifts"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID }),
  });

  const staffMap = useMemo(() => Object.fromEntries(allStaff.map(s => [s.id, s])), [allStaff]);
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  const myShifts = useMemo(() => {
    if (!myStaffProfile?.id) return [];
    return allShifts
      .filter(s => s.assigned_staff?.includes(myStaffProfile.id) && s.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allShifts, myStaffProfile]);

  const today = new Date().toISOString().split("T")[0];
  const endOfWeek = new Date(); endOfWeek.setDate(endOfWeek.getDate() + 6 - (endOfWeek.getDay() === 0 ? 6 : endOfWeek.getDay() - 1));
  const endOfWeekStr = endOfWeek.toISOString().split("T")[0];
  const fourWeeksStr = new Date(Date.now() + 28 * 86400000).toISOString().split("T")[0];

  const thisWeekShifts = myShifts.filter(s => s.date >= today && s.date <= endOfWeekStr);
  const upcomingShifts = myShifts.filter(s => s.date > endOfWeekStr && s.date <= fourWeeksStr);

  // Group upcoming by week
  const upcomingByWeek = useMemo(() => {
    const groups = {};
    upcomingShifts.forEach(s => {
      const d = new Date(s.date + "T12:00:00");
      const monday = new Date(d);
      monday.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
      const key = monday.toISOString().split("T")[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [upcomingShifts]);

  if (!myStaffProfile) {
    return <div className="p-8 text-center text-muted-foreground">Loading your shift profile…</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {handoverShift && (
        <HandoverForm
          shift={handoverShift}
          home={homeMap[handoverShift.home_id]}
          myStaffProfile={myStaffProfile}
          allShifts={allShifts}
          onClose={() => setHandoverShift(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold">My Shifts</h1>
        <p className="text-sm text-muted-foreground mt-1">Hello, {user?.full_name}</p>
      </div>

      {/* This week */}
      <section>
        <h2 className="text-base font-semibold mb-3">This Week</h2>
        {thisWeekShifts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No shifts scheduled this week.
          </div>
        ) : (
          <div className="space-y-3">
            {thisWeekShifts.map(s => (
              <ShiftCard key={s.id} shift={s} home={homeMap[s.home_id]} staffMap={staffMap} myStaffProfileId={myStaffProfile.id} onStartHandover={setHandoverShift} onAcknowledge={() => {}} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section>
        <h2 className="text-base font-semibold mb-3">Upcoming (Next 4 Weeks)</h2>
        {upcomingByWeek.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No upcoming shifts in the next 4 weeks.
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingByWeek.map(([weekKey, shifts]) => {
              const d = new Date(weekKey + "T12:00:00");
              const label = `Week of ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
              return (
                <WeekGroup key={weekKey} label={label} shifts={shifts} home={homeMap[shifts[0]?.home_id]} staffMap={staffMap} myStaffProfileId={myStaffProfile.id} onStartHandover={setHandoverShift} onAcknowledge={() => {}} />
              );
            })}
          </div>
        )}
      </section>

      {/* Request leave shortcut */}
      <section className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-1">Leave & Availability</h2>
        <p className="text-xs text-muted-foreground mb-3">Submit a leave request or manage your availability from the Staff & HR page.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/staff"}>Go to Availability</Button>
      </section>
    </div>
  );
}