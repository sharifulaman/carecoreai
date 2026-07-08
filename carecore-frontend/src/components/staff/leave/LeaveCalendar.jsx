import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LEAVE_COLORS = {
  annual_leave:       { bar: "bg-green-500",  text: "text-green-700",  label: "Annual" },
  sick_leave:         { bar: "bg-red-500",    text: "text-red-700",    label: "Sick" },
  toil:               { bar: "bg-blue-500",   text: "text-blue-700",   label: "TOIL" },
  maternity_paternity:{ bar: "bg-purple-500", text: "text-purple-700", label: "Mat/Pat" },
  unpaid_leave:       { bar: "bg-gray-400",   text: "text-gray-600",   label: "Unpaid" },
  compassionate:      { bar: "bg-pink-500",   text: "text-pink-700",   label: "Compassionate" },
};

export default function LeaveCalendar({ leaveRequests, staff, homes, org, onClickDay, onClickLeave }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterHomeId, setFilterHomeId] = useState("all");

  const maxOff = org?.hr_policy?.max_staff_off_per_home ?? 2;
  const approvedLeave = leaveRequests.filter(r => r.status === "approved");

  // Filter staff by home
  const filteredStaffIds = filterHomeId === "all"
    ? null
    : new Set(staff.filter(s => (s.home_ids || []).includes(filterHomeId)).map(s => s.id));

  const visibleLeave = filteredStaffIds
    ? approvedLeave.filter(r => filteredStaffIds.has(r.staff_id))
    : approvedLeave;

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start: Mon=0, so if month starts on Wed (3), prepend 2 blanks
  const startDow = (getDay(monthStart) + 6) % 7; // 0=Mon
  const blanks = Array(startDow).fill(null);
  const allCells = [...blanks, ...days];
  // Pad end to fill 6 rows
  while (allCells.length % 7 !== 0) allCells.push(null);

  function getLeaveForDay(dateStr) {
    return visibleLeave.filter(r => r.date_from <= dateStr && r.date_to >= dateStr);
  }

  function getClashCount(dateStr) {
    const homeGroups = {};
    visibleLeave.filter(r => r.date_from <= dateStr && r.date_to >= dateStr).forEach(r => {
      const member = staff.find(s => s.id === r.staff_id);
      const homeId = member?.home_ids?.[0] || "unknown";
      homeGroups[homeId] = (homeGroups[homeId] || 0) + 1;
    });
    return Math.max(0, ...Object.values(homeGroups).map(c => c - maxOff));
  }

  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-sm w-36 text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Select value={filterHomeId} onValueChange={setFilterHomeId}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Homes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(LEAVE_COLORS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${v.bar}`} />{v.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-300" />Clash (understaffed)
        </span>
      </div>

      {/* Calendar grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DOW.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 border-r border-border last:border-0">{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {allCells.map((day, idx) => {
            if (!day) {
              return <div key={`blank-${idx}`} className="min-h-[90px] border-r border-b border-border/50 last:border-r-0 bg-muted/10" />;
            }
            const dateStr = format(day, "yyyy-MM-dd");
            const dayLeave = getLeaveForDay(dateStr);
            const clashOver = getClashCount(dateStr);
            const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const colIdx = idx % 7;
            const isLastCol = colIdx === 6;

            return (
              <div
                key={dateStr}
                onClick={() => onClickDay?.(dateStr)}
                className={`min-h-[90px] p-1 border-r border-b border-border/50 cursor-pointer transition-colors
                  ${isLastCol ? "border-r-0" : ""}
                  ${!isCurrentMonth ? "bg-muted/10 opacity-50" : ""}
                  ${clashOver > 0 ? "bg-amber-50 dark:bg-amber-900/10" : "hover:bg-muted/20"}
                `}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayLeave.slice(0, 3).map(req => {
                    const colors = LEAVE_COLORS[req.leave_type] || LEAVE_COLORS.unpaid_leave;
                    return (
                      <div
                        key={req.id}
                        onClick={e => { e.stopPropagation(); onClickLeave?.(req); }}
                        className={`${colors.bar} text-white text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80`}
                        title={`${req.staff_name} — ${req.leave_type?.replace(/_/g, " ")}`}
                      >
                        {req.staff_name?.split(" ")[0]}
                      </div>
                    );
                  })}
                  {dayLeave.length > 3 && (
                    <div className="text-[9px] text-muted-foreground px-1">+{dayLeave.length - 3} more</div>
                  )}
                  {clashOver > 0 && (
                    <div className="text-[9px] text-amber-700 font-medium px-1">⚠ Understaffed</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}