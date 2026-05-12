import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORG_ID } from "@/lib/roleConfig";
import { X, Search, UserCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import WTRBreachModal from "./WTRBreachModal";
import { format, subDays, addDays } from "date-fns";

const DEFAULTS = {
  morning: { time_start: "07:00", time_end: "19:00" },
  night:   { time_start: "19:00", time_end: "07:00" },
};

export default function QuickCreateShiftModal({ date, shiftType, home, allStaff, myStaffProfile, activeRota, onSave, onClose, saving, user }) {
  const def = DEFAULTS[shiftType] || { time_start: "07:00", time_end: "15:00" };
  const [timeStart, setTimeStart] = useState(def.time_start);
  const [timeEnd, setTimeEnd] = useState(def.time_end);
  const [staffRequired, setStaffRequired] = useState(1);
  const [assignedStaff, setAssignedStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [isOpenShift, setIsOpenShift] = useState(false);
  const [wtrBreaches, setWtrBreaches] = useState(null); // { breaches, pendingShiftData }
  const [checking, setChecking] = useState(false);

  const homeStaff = allStaff.filter(s => s.home_ids?.includes(home?.id));
  const staffPool = homeStaff.length > 0 ? homeStaff : allStaff;
  const filteredStaff = staffPool.filter(s =>
    s.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.role?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const toggleStaff = (id) => {
    setAssignedStaff(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const buildShiftData = () => ({
    org_id: ORG_ID,
    home_id: home?.id,
    shift_type: shiftType,
    date,
    time_start: timeStart,
    time_end: timeEnd,
    is_sleeping_shift: shiftType === "sleeping",
    is_open_shift: isOpenShift,
    staff_required: staffRequired,
    assigned_staff: isOpenShift ? [] : assignedStaff,
    lead_staff_id: isOpenShift ? null : (assignedStaff[0] || null),
    status: "draft",
    rota_id: activeRota?.id || null,
    created_by: myStaffProfile?.id || null,
  });

  const checkWTRAndSave = async () => {
    if (assignedStaff.length === 0) {
      onSave(buildShiftData());
      return;
    }
    setChecking(true);
    try {
      const from = format(subDays(new Date(date), 7), "yyyy-MM-dd");
      const to = format(addDays(new Date(date), 7), "yyyy-MM-dd");

      // Check each assigned staff member
      const allBreaches = [];
      for (const sid of assignedStaff) {
        const res = await base44.functions.invoke("checkWorkingTimeCompliance", {
          staff_id: sid,
          date_from: from,
          date_to: to,
        });
        const data = res.data;
        if (data?.breaches?.length) {
          allBreaches.push(...data.breaches.map(b => ({ ...b })));
        }
      }

      if (allBreaches.length > 0) {
        setWtrBreaches({ breaches: allBreaches, shiftData: buildShiftData() });
      } else {
        onSave(buildShiftData());
      }
    } catch {
      // If check fails, allow save without blocking
      onSave(buildShiftData());
    } finally {
      setChecking(false);
    }
  };

  const handleSaveAnyway = async () => {
    const shiftData = wtrBreaches.shiftData;
    setWtrBreaches(null);
    // Log override in AuditTrail
    secureGateway.create("AuditTrail", {
      org_id: ORG_ID,
      user_id: user?.id,
      username: user?.full_name || user?.email,
      role: user?.role,
      action: "wtr_override",
      module: "Shifts",
      record_type: "Shift",
      description: `WTR breach override: shift on ${date} (${shiftData.time_start}–${shiftData.time_end}) saved despite compliance breaches by ${user?.full_name || user?.email}.`,
      new_value: { breaches: wtrBreaches.breaches, shift: shiftData },
    }).catch(() => {});
    onSave(shiftData);
  };

  const firstBreachStaff = wtrBreaches ? allStaff.find(s => s.id === wtrBreaches.breaches[0]?.staff_id) : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base capitalize">New {shiftType} Shift — {date}</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Staff Required</Label>
                <Input type="number" min={1} max={10} value={staffRequired} onChange={e => setStaffRequired(parseInt(e.target.value) || 1)} className="h-8 text-sm" />
              </div>
            </div>

            {/* Open shift toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isOpenShift}
                onChange={e => setIsOpenShift(e.target.checked)}
                className="rounded w-3.5 h-3.5 accent-primary"
              />
              <span className="text-sm font-medium">Post as Open Shift</span>
              {isOpenShift && <span className="text-xs text-amber-600">(no staff assigned — staff can claim)</span>}
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Assign Staff</Label>
                {assignedStaff.length > 0 && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> {assignedStaff.length} selected
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff…"
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="h-8 text-sm pl-8"
                />
              </div>
              {staffPool.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No staff found for this home.</p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto border border-border rounded-lg p-1">
                  {filteredStaff.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No staff match your search.</p>
                  ) : filteredStaff.map(s => {
                    const selected = assignedStaff.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${selected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/40"}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleStaff(s.id)} className="rounded accent-primary" />
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {s.full_name?.charAt(0) || "?"}
                        </div>
                        <span className="font-medium flex-1">{s.full_name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{s.role?.replace(/_/g, " ")}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={onClose} disabled={saving || checking}>Cancel</Button>
            <Button onClick={checkWTRAndSave} disabled={saving || checking}>
              {checking ? "Checking…" : saving ? "Saving…" : "Create Shift"}
            </Button>
          </div>
        </div>
      </div>

      {wtrBreaches && (
        <WTRBreachModal
          breaches={wtrBreaches.breaches}
          staffName={firstBreachStaff?.full_name || "This staff member"}
          onSaveAnyway={handleSaveAnyway}
          onCancel={() => setWtrBreaches(null)}
        />
      )}
    </>
  );
}