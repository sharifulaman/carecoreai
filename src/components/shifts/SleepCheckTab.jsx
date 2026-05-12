import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

export default function SleepCheckTab({ home, residents, staff, user }) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showCheckForm, setShowCheckForm] = useState(false);
  const [checkTime, setCheckTime] = useState("23:00");
  const [checkStatuses, setCheckStatuses] = useState({});

  const { data: logs = [] } = useQuery({
    queryKey: ["sleep-check-logs", home?.id],
    queryFn: () => base44.entities.SleepCheckLog.filter({ home_id: home?.id }, "-date", 500),
  });

  const todayLog = logs.find(l => l.date === selectedDate);

  const handleStartCheck = () => {
    if (!todayLog) {
      toast.error("No sleep check log found");
      return;
    }
    setShowCheckForm(true);
    const initialStatuses = {};
    residents.forEach(r => {
      initialStatuses[r.id] = { status: "in_room_sleeping", notes: "" };
    });
    setCheckStatuses(initialStatuses);
  };

  const handleCompleteCheck = async () => {
    if (!todayLog) return;

    const residentChecks = residents.map(r => ({
      resident_id: r.id,
      resident_name: r.display_name,
      status: checkStatuses[r.id]?.status || "could_not_check",
      notes: checkStatuses[r.id]?.notes || "",
    }));

    const missingResident = residentChecks.find(c => c.status === "not_in_home");
    if (missingResident) {
      toast.error(`⚠️ ${missingResident.resident_name} is not in the home. Has a Missing From Home report been made?`);
      return;
    }

    const updatedChecks = [...(todayLog.checks || []), {
      check_time: checkTime,
      resident_checks: residentChecks,
      checked_by_id: user?.id,
      checked_by_name: user?.full_name,
    }];

    const allAccounted = residentChecks.every(c => c.status !== "not_in_home" && c.status !== "could_not_check");

    await base44.entities.SleepCheckLog.update(todayLog.id, {
      checks: updatedChecks,
      all_residents_accounted: allAccounted,
      status: "in_progress",
    });

    qc.invalidateQueries({ queryKey: ["sleep-check-logs", home?.id] });
    setShowCheckForm(false);
    toast.success("Check completed");
  };

  const currentChecks = todayLog?.checks || [];

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Date:</label>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-32" />
      </div>

      {!todayLog && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-sm text-amber-700 font-medium">No sleep check log for this date. Create one first.</p>
        </div>
      )}

      {todayLog && (
        <>
          {/* Setup Info */}
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Night Staff Setup</p>
            <p className="text-sm">{todayLog.staff_on_duty_name || "—"}</p>
            {todayLog.sleep_in_staff_name && <p className="text-sm text-muted-foreground">Sleep-in: {todayLog.sleep_in_staff_name}</p>}
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            {currentChecks.length === 0 ? (
              <div className="bg-muted/30 rounded-lg p-6 text-center text-muted-foreground text-sm">No checks completed yet.</div>
            ) : (
              currentChecks.map((check, i) => (
                <div key={i} className="border border-border rounded-lg p-3">
                  <p className="font-medium text-sm mb-2">{check.check_time}</p>
                  <div className="space-y-1 text-xs">
                    {check.resident_checks.map((rc, j) => (
                      <div key={j} className="flex items-center justify-between text-muted-foreground">
                        <span>{rc.resident_name}</span>
                        <span className="font-medium capitalize">{rc.status.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                  {check.resident_checks.some(rc => rc.notes) && (
                    <div className="mt-2 text-xs text-foreground">
                      {check.resident_checks.filter(rc => rc.notes).map((rc, j) => (
                        <p key={j} className="text-muted-foreground italic">"{rc.resident_name}: {rc.notes}"</p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Quick Entry Form */}
          {showCheckForm ? (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Check Time</label>
                <Input type="time" value={checkTime} onChange={e => setCheckTime(e.target.value)} className="w-24 h-8 text-xs" />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {residents.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200 text-sm">
                    <span className="font-medium">{r.display_name}</span>
                    <select
                      value={checkStatuses[r.id]?.status || "in_room_sleeping"}
                      onChange={e => setCheckStatuses(p => ({ ...p, [r.id]: { ...p[r.id], status: e.target.value } }))}
                      className="px-2 py-1 border border-border rounded text-xs bg-card"
                    >
                      <option value="in_room_sleeping">Sleeping</option>
                      <option value="in_room_awake">Awake</option>
                      <option value="out_of_room">Out of room</option>
                      <option value="not_in_home">Not in home</option>
                      <option value="could_not_check">Could not check</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleCompleteCheck} className="flex-1">Complete Check</Button>
                <Button size="sm" variant="outline" onClick={() => setShowCheckForm(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleStartCheck} className="gap-1"><Plus className="w-4 h-4" /> New Check</Button>
          )}
        </>
      )}
    </div>
  );
}