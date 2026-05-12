import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, LogIn, LogOut, ChevronDown, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

function formatElapsed(clockInTime) {
  const diff = Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getGraceStatus(shiftStart, clockInTime, graceMinutes = 5) {
  if (!shiftStart) return "on_time";
  const [h, m] = shiftStart.split(":").map(Number);
  const shiftDate = new Date(clockInTime);
  shiftDate.setHours(h, m, 0, 0);
  const diffMinutes = (new Date(clockInTime) - shiftDate) / 60000;
  if (diffMinutes <= graceMinutes) return "on_time";
  return "late";
}

function ClockInModal({ staffProfile, visibleHomes, org, onConfirm, onClose, isPending }) {
  const [selectedHomeId, setSelectedHomeId] = useState(visibleHomes[0]?.id || "");
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">Clock In</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Staff member</p>
            <p className="text-sm font-medium">{staffProfile.full_name}</p>
          </div>
          {visibleHomes.length > 1 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Choose home…" /></SelectTrigger>
                <SelectContent>
                  {visibleHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notes <span className="text-muted-foreground/60">(optional)</span></p>
            <Textarea
              placeholder="Any notes for this shift…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm h-20 resize-none"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            ⏱ Up to 5 minutes late is considered on time.
          </p>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 gap-2" onClick={() => onConfirm({ homeId: selectedHomeId, notes })} disabled={isPending}>
            <LogIn className="w-4 h-4" /> {isPending ? "Clocking in…" : "Confirm Clock In"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClockOutModal({ activeLog, elapsed, onConfirm, onClose, isPending }) {
  const [notes, setNotes] = useState("");
  const clockedInAt = activeLog?.clock_in_time
    ? new Date(activeLog.clock_in_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">Clock Out</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Clocked in at</span>
            <span className="font-semibold">{clockedInAt}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Time elapsed</span>
            <span className="font-mono font-semibold text-primary">{elapsed}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">End of shift notes <span className="text-muted-foreground/60">(optional)</span></p>
            <Textarea
              placeholder="Any handover notes or shift comments…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm h-20 resize-none"
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button className="flex-1 px-4 py-2 rounded-md border border-border text-sm hover:bg-muted/30 transition-colors" onClick={onClose}>Cancel</button>
          <button
            className="flex-1 px-4 py-2 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={() => onConfirm(notes)}
            disabled={isPending}
          >
            <LogOut className="w-4 h-4" /> {isPending ? "Clocking out…" : "Confirm Clock Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClockInButton({ user }) {
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const isAdminType = user?.role === "admin" || user?.role === "admin_officer";

  const { data: staffProfile } = useQuery({
    queryKey: ["clock-staff-profile", user?.email],
    queryFn: () => user?.email
      ? base44.entities.StaffProfile.filter({ email: user.email }, "-created_date", 1).then(r => r[0] || null)
      : null,
    enabled: !!user?.email,
  });

  const { data: org } = useQuery({
    queryKey: ["clock-org"],
    queryFn: () => secureGateway.filter("Organisation").then(r => r[0] || null),
    staleTime: 10 * 60 * 1000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["clock-homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    enabled: !!staffProfile,
  });

  const { data: activeLog, refetch: refetchLog } = useQuery({
    queryKey: ["active-clock", staffProfile?.id],
    queryFn: async () => {
      if (!staffProfile?.id) return null;
      const logs = await secureGateway.filter("AttendanceLog", { staff_id: staffProfile.id });
      return logs.find(l => l.clock_in_time && !l.clock_out_time) || null;
    },
    enabled: !!staffProfile?.id,
    refetchInterval: 30000,
  });

  const { data: activeShifts = [] } = useQuery({
    queryKey: ["active-shifts-for-clock", staffProfile?.id],
    queryFn: () => {
      if (!staffProfile?.id) return [];
      const today = new Date().toISOString().split("T")[0];
      return secureGateway.filter("Shift", { staff_id: staffProfile.id, date: today });
    },
    enabled: !!staffProfile?.id,
  });

  // Auto clock-out check
  useEffect(() => {
    if (!activeLog?.clock_in_time || !org?.hr_policy?.auto_clock_out_hours) return;
    const autoHours = org.hr_policy.auto_clock_out_hours || 13;
    const clockedInFor = (Date.now() - new Date(activeLog.clock_in_time).getTime()) / 3600000;
    if (clockedInFor >= autoHours) {
      // Auto clock out and flag
      const now = new Date();
      const totalHours = parseFloat(((now - new Date(activeLog.clock_in_time)) / 3600000).toFixed(2));
      secureGateway.update("AttendanceLog", activeLog.id, {
        clock_out_time: now.toISOString(),
        total_hours: totalHours,
        notes: `Auto clocked out after ${autoHours}h — requires manager review`,
        manual_reason: "auto_clock_out",
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["active-clock"] });
      }).catch(() => {});
    }
  }, [activeLog, org]);

  useEffect(() => {
    if (!activeLog?.clock_in_time) { setElapsed(""); return; }
    const interval = setInterval(() => setElapsed(formatElapsed(activeLog.clock_in_time)), 1000);
    return () => clearInterval(interval);
  }, [activeLog?.clock_in_time]);

  const visibleHomes = staffProfile?.home_ids?.length
    ? homes.filter(h => staffProfile.home_ids.includes(h.id))
    : homes;

  const getGps = () => new Promise((resolve) => {
    if (!org?.gps_clock_in_enabled || !navigator.geolocation) { resolve(null); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setGpsLoading(false); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { setGpsLoading(false); resolve(null); },
      { timeout: 5000 }
    );
  });

  const clockIn = useMutation({
    mutationFn: async ({ homeId, notes }) => {
      if (!staffProfile?.id) throw new Error("No staff profile found");
      const resolvedHomeId = homeId || visibleHomes[0]?.id || "";
      const now = new Date().toISOString();
      const matchedShift = activeShifts.find(s => s.home_id === resolvedHomeId || !resolvedHomeId);
      const gps = await getGps();
      const graceMinutes = 5;
      const clockStatus = getGraceStatus(matchedShift?.time_start, now, graceMinutes);

      const lateNote = clockStatus === "late" ? `Late (>${graceMinutes}min after shift start)` : null;
      const gpsNote = gps ? `GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : null;
      const combinedNotes = [notes, lateNote, gpsNote].filter(Boolean).join(" | ") || null;

      await secureGateway.create("AttendanceLog", {
        org_id: ORG_ID,
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        home_id: resolvedHomeId,
        clock_in_time: now,
        shift_id: matchedShift?.id || null,
        clock_in_method: "app",
        notes: combinedNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-clock"] });
      setShowModal(false);
      toast.success("Clocked in successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const clockOut = useMutation({
    mutationFn: async ({ notes } = {}) => {
      if (!activeLog?.id) return;
      const now = new Date();
      const clockInDate = new Date(activeLog.clock_in_time);
      const totalHours = parseFloat(((now - clockInDate) / 3600000).toFixed(2));
      const existingNotes = activeLog.notes || "";
      const clockOutNote = notes ? `Clock-out note: ${notes}` : null;
      const combinedNotes = [existingNotes, clockOutNote].filter(Boolean).join(" | ") || null;
      await secureGateway.update("AttendanceLog", activeLog.id, {
        clock_out_time: now.toISOString(),
        total_hours: totalHours,
        notes: combinedNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-clock"] });
      setShowClockOutModal(false);
      toast.success("Clocked out successfully");
    },
  });

  if (!staffProfile) return null;

  const isClockedIn = !!activeLog;
  const gpsEnabled = org?.gps_clock_in_enabled;

  if (isClockedIn) {
    return (
      <>
        {showClockOutModal && (
          <ClockOutModal
            activeLog={activeLog}
            elapsed={elapsed}
            onConfirm={(notes) => clockOut.mutate({ notes })}
            onClose={() => setShowClockOutModal(false)}
            isPending={clockOut.isPending}
          />
        )}
        <button
          onClick={() => setShowClockOutModal(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors text-xs font-medium"
          title={`Clocked in at ${new Date(activeLog.clock_in_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {isAdminType
            ? <LogOut className="w-3.5 h-3.5" />
            : <><LogOut className="w-3.5 h-3.5" /> {elapsed || "Clocked In"}</>
          }
        </button>
      </>
    );
  }

  return (
    <>
      {showModal && (
        <ClockInModal
          staffProfile={staffProfile}
          visibleHomes={visibleHomes}
          org={org}
          onConfirm={({ homeId, notes }) => clockIn.mutate({ homeId, notes })}
          onClose={() => setShowModal(false)}
          isPending={clockIn.isPending || gpsLoading}
        />
      )}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-red-500/15 text-red-600 hover:bg-red-500/25 border border-red-300 transition-colors text-xs font-medium"
      >
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        {isAdminType ? <LogIn className="w-3.5 h-3.5" /> : <><LogIn className="w-3.5 h-3.5" /> Clock In</>}
      </button>
    </>
  );
}