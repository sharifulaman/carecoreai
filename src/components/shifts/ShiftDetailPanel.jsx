import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { X, Star, AlertTriangle, UserPlus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-gray-200 text-gray-500",
  cancelled: "bg-red-100 text-red-500",
};

const CONFLICT_TYPE_LABELS = {
  double_booking: "Double Booking",
  rest_period_violation: "Rest Period Violation",
  consecutive_day_limit: "Consecutive Day Limit",
  insufficient_staff: "Insufficient Staff",
  sleep_in_not_qualified: "Sleep-In Not Qualified",
  contracted_hours_exceeded: "Contracted Hours Exceeded",
  unavailable_day: "Unavailable Day",
  override_conflict: "Override Conflict",
  medication_not_trained: "Medication Not Trained",
};

export default function ShiftDetailPanel({ shift, home, staffMap, allStaff, conflicts, user, myStaffProfile, onClose }) {
  const queryClient = useQueryClient();
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const isAdminOrTL = user?.role === "admin" || user?.role === "team_leader";

  const { data: avProfiles = [] } = useQuery({
    queryKey: ["av-profiles-panel"],
    queryFn: () => base44.entities.StaffAvailabilityProfile.filter({ org_id: ORG_ID }),
  });
  const { data: avOverrides = [] } = useQuery({
    queryKey: ["av-overrides-panel"],
    queryFn: () => base44.entities.StaffAvailabilityOverride.filter({ org_id: ORG_ID }),
  });
  const { data: weeklyAvail = [] } = useQuery({
    queryKey: ["weekly-avail-panel"],
    queryFn: () => base44.entities.StaffWeeklyAvailability.filter({ org_id: ORG_ID }),
  });

  const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(shift.date + "T12:00:00").getDay()];

  const candidateStaff = useMemo(() => {
    return allStaff
      .filter(s => s.home_ids?.includes(home?.id) && s.status === "active" && !shift.assigned_staff?.includes(s.id))
      .map(s => {
        const profile = avProfiles.find(p => p.staff_id === s.id);
        const override = avOverrides.find(o => o.staff_id === s.id && o.date_from <= shift.date && o.date_to >= shift.date);
        const weekly = weeklyAvail.find(w => w.staff_id === s.id && w.day_of_week === dayName);
        const isFixed = profile?.fixed_days_off?.includes(dayName);
        const isUnavailableType = profile?.unavailable_shift_types?.includes(shift.shift_type);
        const isSleepingBlock = shift.shift_type === "sleeping" && !profile?.sleep_in_qualified;
        const alreadyBooked = (shift.assigned_staff || []).includes(s.id);

        let reason = null;
        if (override && ["unavailable", "sick", "holiday"].includes(override.override_type)) reason = override.override_type;
        else if (isFixed) reason = "fixed day off";
        else if (weekly?.is_available === false) reason = "unavailable this day";
        else if (isUnavailableType) reason = `cannot do ${shift.shift_type} shifts`;
        else if (isSleepingBlock) reason = "not sleep-in qualified";

        return { ...s, available: !reason, reason };
      })
      .sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1));
  }, [allStaff, home, shift, avProfiles, avOverrides, weeklyAvail, dayName]);

  const updateShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.update(shift.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); toast.success("Shift updated"); },
  });

  const resolveConflictMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.ShiftConflict.update(id, {
      resolved: true,
      resolved_by: myStaffProfile?.id,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["conflicts"] }); toast.success("Conflict marked as resolved"); },
  });

  const addStaff = (staffId) => {
    const newAssigned = [...(shift.assigned_staff || []), staffId];
    updateShiftMutation.mutate({ assigned_staff: newAssigned });
    setShowAddStaff(false);
  };

  const removeStaff = (staffId) => {
    const newAssigned = (shift.assigned_staff || []).filter(id => id !== staffId);
    updateShiftMutation.mutate({ assigned_staff: newAssigned });
  };

  const setLead = (staffId) => {
    updateShiftMutation.mutate({ lead_staff_id: staffId });
  };

  const shiftDate = new Date(shift.date + "T12:00:00");
  const dateLabel = shiftDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-[440px] h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-xs text-muted-foreground">{home?.name}</p>
            <h2 className="font-semibold capitalize">{shift.shift_type} Shift</h2>
            <p className="text-sm text-muted-foreground">{dateLabel} · {shift.time_start}–{shift.time_end}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[shift.status]}`}>{shift.status?.replace("_", " ")}</span>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Assigned Staff */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Assigned Staff</h3>
              <span className={`text-xs ${(shift.assigned_staff?.length || 0) < shift.staff_required ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                {shift.assigned_staff?.length || 0} / {shift.staff_required} required
              </span>
            </div>

            <div className="space-y-2">
              {(shift.assigned_staff || []).map(sid => {
                const s = staffMap[sid];
                const profile = avProfiles.find(p => p.staff_id === sid);
                return (
                  <div key={sid} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${sid === shift.lead_staff_id ? "bg-primary" : "bg-gray-400"}`}>
                        {s?.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1">
                          {s?.full_name || "Unknown"}
                          {sid === shift.lead_staff_id && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        </p>
                        {shift.shift_type === "sleeping" && (
                          <p className={`text-xs ${profile?.sleep_in_qualified ? "text-green-600" : "text-red-500"}`}>
                            {profile?.sleep_in_qualified ? "Sleep-in qualified" : "⚠ Not sleep-in qualified"}
                          </p>
                        )}
                      </div>
                    </div>
                    {isAdminOrTL && (
                      <div className="flex gap-1">
                        {sid !== shift.lead_staff_id && (
                          <button onClick={() => setLead(sid)} className="text-xs text-muted-foreground hover:text-amber-500 p-1" title="Make lead">
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => removeStaff(sid)} className="text-xs text-muted-foreground hover:text-red-500 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isAdminOrTL && (
              <div className="mt-2">
                {showAddStaff ? (
                  <div className="space-y-2">
                    {candidateStaff.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No additional staff available for this home.</p>
                    ) : candidateStaff.map(s => (
                      <button
                        key={s.id}
                        onClick={() => s.available ? addStaff(s.id) : null}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${s.available ? "border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer" : "border-border bg-muted/30 opacity-60 cursor-not-allowed"}`}
                      >
                        <span>{s.full_name}</span>
                        {s.reason ? (
                          <span className="text-xs text-red-500">{s.reason}</span>
                        ) : (
                          <span className="text-xs text-green-600">Available</span>
                        )}
                      </button>
                    ))}
                    <button onClick={() => setShowAddStaff(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full mt-2 gap-2 text-xs" onClick={() => setShowAddStaff(true)}>
                    <UserPlus className="w-3.5 h-3.5" /> Add Staff
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          {isAdminOrTL && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Actions</h3>
              <div className="flex flex-wrap gap-2">
                {shift.status === "published" && (shift.assigned_staff?.length || 0) >= shift.staff_required && (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => updateShiftMutation.mutate({ status: "confirmed" })}>
                    Mark Confirmed
                  </Button>
                )}
                {shift.status === "confirmed" && shift.date === new Date().toISOString().split("T")[0] && (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => updateShiftMutation.mutate({ status: "in_progress" })}>
                    Mark In Progress
                  </Button>
                )}
                {["draft", "published", "confirmed"].includes(shift.status) && (
                  <Button size="sm" variant="outline" className="text-xs text-red-600 hover:text-red-700 border-red-200" onClick={() => { if (confirm("Cancel this shift?")) updateShiftMutation.mutate({ status: "cancelled" }); }}>
                    Cancel Shift
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Conflicts ({conflicts.filter(c => !c.resolved).length} unresolved)
              </h3>
              <div className="space-y-2">
                {conflicts.map(c => (
                  <div key={c.id} className={`rounded-lg border p-3 ${c.resolved ? "opacity-50" : c.severity === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{CONFLICT_TYPE_LABELS[c.conflict_type] || c.conflict_type}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${c.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {c.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                    {!c.resolved && isAdminOrTL && (
                      <div className="mt-2 space-y-1.5">
                        <input
                          className="w-full border border-border rounded px-2 py-1 text-xs"
                          placeholder="Resolution notes (required)…"
                          value={resolutionNotes[c.id] || ""}
                          onChange={e => setResolutionNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-6"
                          disabled={!resolutionNotes[c.id]}
                          onClick={() => resolveConflictMutation.mutate({ id: c.id, notes: resolutionNotes[c.id] })}
                        >
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                    {c.resolved && <p className="text-xs text-green-600 mt-1">✓ Resolved</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}