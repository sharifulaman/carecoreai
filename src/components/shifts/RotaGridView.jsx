import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_CODE = { morning: "M", afternoon: "A", night: "N", sleeping: "S" };
const CELL_STYLES = {
  shift: "bg-blue-100 text-blue-700",
  off: "bg-green-50 text-green-600",
  holiday: "bg-blue-50 text-blue-500",
  sick: "bg-red-50 text-red-500",
  training: "bg-purple-50 text-purple-500",
  blank: "bg-white text-muted-foreground",
};

export default function RotaGridView({ home, weekDates, shifts, allStaff, staffMap, onShiftClick }) {
  const { data: overrides = [] } = useQuery({
    queryKey: ["overrides-grid", home?.id],
    queryFn: () => base44.entities.StaffAvailabilityOverride.filter({ org_id: ORG_ID }),
    enabled: !!home?.id,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-grid"],
    queryFn: () => base44.entities.StaffAvailabilityProfile.filter({ org_id: ORG_ID }),
  });

  const homeStaff = useMemo(() => {
    return allStaff.filter(s => s.home_ids?.includes(home?.id));
  }, [allStaff, home]);

  const getStaffHours = (staffId) => {
    const myShifts = shifts.filter(s => s.assigned_staff?.includes(staffId));
    return myShifts.reduce((acc, s) => {
      const [sh, sm] = (s.time_start || "00:00").split(":").map(Number);
      const [eh, em] = (s.time_end || "00:00").split(":").map(Number);
      let hrs = (eh * 60 + em - (sh * 60 + sm)) / 60;
      if (hrs < 0) hrs += 24;
      return acc + hrs;
    }, 0);
  };

  const getCellData = (staffId, date) => {
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(date + "T12:00:00").getDay()];
    const override = overrides.find(o => o.staff_id === staffId && o.date_from <= date && o.date_to >= date && o.approved);
    const profile = profiles.find(p => p.staff_id === staffId);
    const isFixed = profile?.fixed_days_off?.includes(dayName);
    const shiftAssigned = shifts.find(s => s.assigned_staff?.includes(staffId) && s.date === date);

    if (override) {
      const t = override.override_type;
      if (t === "holiday") return { label: "HOL", style: CELL_STYLES.holiday, shift: null };
      if (t === "sick") return { label: "SICK", style: CELL_STYLES.sick, shift: null };
      if (t === "training") return { label: "TRAIN", style: CELL_STYLES.training, shift: null };
      return { label: "OFF", style: CELL_STYLES.off, shift: null };
    }
    if (isFixed) return { label: "OFF", style: CELL_STYLES.off, shift: null };
    if (shiftAssigned) return { label: SHIFT_CODE[shiftAssigned.shift_type] || "?", style: CELL_STYLES.shift, shift: shiftAssigned };
    return { label: "", style: CELL_STYLES.blank, shift: null };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs min-w-[700px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground w-36">Staff</th>
            <th className="px-2 py-2 font-medium text-muted-foreground text-center w-40">Hours / Contract</th>
            {weekDates.map((date, i) => {
              const d = new Date(date + "T12:00:00");
              const isToday = date === new Date().toISOString().split("T")[0];
              return (
                <th key={date} className="px-1 py-2 text-center font-medium">
                  <div className={isToday ? "text-primary" : "text-muted-foreground"}>{DAY_LABELS[i]}</div>
                  <div className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {homeStaff.length === 0 ? (
            <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No staff assigned to this home.</td></tr>
          ) : homeStaff.map(s => {
            const profile = profiles.find(p => p.staff_id === s.id);
            const hours = getStaffHours(s.id);
            const contracted = profile?.contracted_hours_per_week || 0;
            const hoursColor = hours > contracted * 1.1 ? "text-amber-600 font-semibold" : "text-muted-foreground";
            return (
              <tr key={s.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <p className="font-medium truncate">{s.full_name?.split(' ')[0] || s.full_name}</p>
                  <p className="text-muted-foreground capitalize">{s.role?.replace("_", " ")}</p>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className={hoursColor}>{hours.toFixed(1)}h</span>
                  <span className="text-muted-foreground"> / {contracted}h</span>
                </td>
                {weekDates.map(date => {
                  const cell = getCellData(s.id, date);
                  return (
                    <td key={date} className="px-1 py-1">
                      <button
                        className={`w-full h-8 rounded text-xs font-medium transition-all hover:opacity-80 ${cell.style}`}
                        onClick={() => cell.shift ? onShiftClick(cell.shift) : null}
                      >
                        {cell.label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}