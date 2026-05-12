import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Send, Copy, Trash2, RefreshCw } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isSameDay } from "date-fns";
import { toast } from "sonner";
import QuickCreateShiftModal from "@/components/shifts/QuickCreateShiftModal";

const SHIFT_COLORS = {
  morning:   { bg: "bg-blue-100 text-blue-800 border-blue-200", label: "AM" },
  afternoon: { bg: "bg-amber-100 text-amber-800 border-amber-200", label: "PM" },
  night:     { bg: "bg-purple-100 text-purple-800 border-purple-200", label: "NG" },
  sleeping:  { bg: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "SI" },
  on_call:   { bg: "bg-teal-100 text-teal-800 border-teal-200", label: "OC" },
  open:      { bg: "bg-green-100 text-green-800 border-green-200 animate-pulse", label: "OPEN" },
};

const LEAVE_COLORS = {
  annual_leave:           "bg-gray-200 text-gray-600",
  sick_leave:             "bg-red-100 text-red-600",
  unpaid_leave:           "bg-orange-100 text-orange-600",
  compassionate:          "bg-pink-100 text-pink-600",
  maternity_paternity:    "bg-purple-100 text-purple-600",
  toil:                   "bg-teal-100 text-teal-600",
};

const LEAVE_ABBR = {
  annual_leave: "AL", sick_leave: "SL", unpaid_leave: "UL",
  compassionate: "CL", maternity_paternity: "ML", toil: "TL",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StaffRotaTab({ user, staff = [], homes = [] }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "admin_officer";
  const isTL = user?.role === "team_leader";
  const canManage = isAdmin || isTL;

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedHomeId, setSelectedHomeId] = useState(homes[0]?.id || "all");
  const [createModal, setCreateModal] = useState(null); // { staffId, date }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

  // Fetch shifts for this week
  const { data: shifts = [] } = useQuery({
    queryKey: ["rota-shifts", weekStartStr],
    queryFn: () => secureGateway.filter("Shift", { org_id: ORG_ID }),
    select: (data) => data.filter(s => s.date >= weekStartStr && s.date <= weekEndStr),
    staleTime: 0,
  });

  // Fetch rotas
  const { data: rotas = [] } = useQuery({
    queryKey: ["rotas", weekStartStr],
    queryFn: () => secureGateway.filter("Rota", { org_id: ORG_ID }),
    select: (data) => data.filter(r => r.week_start === weekStartStr),
    staleTime: 0,
  });

  // Fetch approved leave
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["leave-requests-rota"],
    queryFn: () => secureGateway.filter("LeaveRequest", { status: "approved" }),
    staleTime: 60000,
  });

  // Fetch shift claims
  const { data: shiftClaims = [] } = useQuery({
    queryKey: ["shift-claims"],
    queryFn: () => secureGateway.filter("ShiftClaim", { org_id: ORG_ID }),
    staleTime: 0,
  });

  const deleteShift = useMutation({
    mutationFn: (id) => secureGateway.delete("Shift", id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rota-shifts"] }); toast.success("Shift removed"); },
  });

  const publishRota = useMutation({
    mutationFn: async () => {
      const homeId = selectedHomeId === "all" ? null : selectedHomeId;
      const existing = rotas.find(r => r.home_id === homeId);
      if (existing) {
        await secureGateway.update("Rota", existing.id, { status: "published", published_at: new Date().toISOString() });
      } else {
        await secureGateway.create("Rota", {
          org_id: ORG_ID,
          home_id: homeId,
          week_start: weekStartStr,
          status: "published",
          published_at: new Date().toISOString(),
          created_by: user?.id,
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rotas"] }); toast.success("Rota published!"); },
  });

  // Filter staff by home
  const filteredStaff = useMemo(() => {
    if (selectedHomeId === "all") return staff.filter(s => s.status === "active");
    return staff.filter(s => s.status === "active" && (s.home_ids || []).includes(selectedHomeId));
  }, [staff, selectedHomeId]);

  // Get leave for a staff member on a date
  const getLeave = (staffId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return leaveRequests.find(lr =>
      lr.staff_id === staffId &&
      dateStr >= lr.date_from &&
      dateStr <= lr.date_to
    );
  };

  // Get shift for a staff member on a date
  const getShift = (staffId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.find(s => s.staff_id === staffId && s.date === dateStr);
  };

  // Get open shifts for a date
  const getOpenShifts = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter(s => s.is_open_shift && s.date === dateStr);
  };

  const currentRota = rotas.find(r => r.home_id === (selectedHomeId === "all" ? null : selectedHomeId));
  const isPublished = currentRota?.status === "published";

  const handleCellClick = (staffId, date) => {
    if (!canManage) return;
    const existing = getShift(staffId, date);
    if (!existing) {
      setCreateModal({ staffId, date: format(date, "yyyy-MM-dd") });
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setWeekStart(w => subWeeks(w, 1))} className="p-1.5 hover:bg-card rounded-md transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2">
            {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
          </span>
          <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="p-1.5 hover:bg-card rounded-md transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="text-xs text-primary hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Today
        </button>

        <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All Homes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Badge className={isPublished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
            {isPublished ? "Published" : "Draft"}
          </Badge>
          {canManage && (
            <Button size="sm" className="gap-1.5" onClick={() => publishRota.mutate()} disabled={publishRota.isPending}>
              <Send className="w-3.5 h-3.5" /> Publish Rota
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-36 sticky left-0 bg-muted/40 z-10">
                Staff Member
              </th>
              {weekDates.map((date, i) => (
                <th key={i} className="text-center px-2 py-2.5 font-medium min-w-[90px]">
                  <div className={isSameDay(date, new Date()) ? "text-primary font-bold" : "text-muted-foreground"}>
                    {DAYS[i]}
                  </div>
                  <div className={`text-base font-bold ${isSameDay(date, new Date()) ? "text-primary" : ""}`}>
                    {format(date, "d")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  No active staff found for this home.
                </td>
              </tr>
            ) : filteredStaff.map((member, idx) => (
              <tr key={member.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                <td className="px-3 py-2 sticky left-0 bg-card z-10 border-r border-border/30">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden shrink-0">
                      {member.photo_url
                        ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                        : member.full_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[90px]">{member.full_name}</div>
                      <div className="text-muted-foreground capitalize">{member.role?.replace(/_/g, " ")}</div>
                    </div>
                  </div>
                </td>
                {weekDates.map((date, di) => {
                  const shift = getShift(member.id, date);
                  const leave = getLeave(member.id, date);
                  const hasConflict = shift && leave;
                  const colorSet = shift ? (SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.morning) : null;

                  return (
                    <td
                      key={di}
                      className="px-1.5 py-1.5 text-center align-middle cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleCellClick(member.id, date)}
                    >
                      {leave && !shift && (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${LEAVE_COLORS[leave.leave_type] || "bg-gray-100 text-gray-600"}`}>
                          {LEAVE_ABBR[leave.leave_type] || "LV"}
                        </span>
                      )}
                      {shift && (
                        <div className={`relative inline-flex flex-col items-center gap-0.5 px-1.5 py-1 rounded border text-xs font-semibold ${hasConflict ? "ring-2 ring-red-400" : ""} ${colorSet.bg}`}>
                          {hasConflict && <span className="text-red-500 text-[10px]">⚠</span>}
                          <span>{shift.is_open_shift ? "OPEN" : colorSet.label}</span>
                          {shift.start_time && (
                            <span className="text-[10px] opacity-70">{shift.start_time.slice(0, 5)}</span>
                          )}
                          {canManage && (
                            <button
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center hover:bg-red-600"
                              style={{ fontSize: 8 }}
                              onClick={(e) => { e.stopPropagation(); deleteShift.mutate(shift.id); }}
                            >×</button>
                          )}
                        </div>
                      )}
                      {!shift && !leave && canManage && (
                        <span className="text-muted-foreground/30 hover:text-muted-foreground text-lg leading-none">+</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Open shifts row */}
            {weekDates.some(d => getOpenShifts(d).length > 0) && (
              <tr className="border-t-2 border-border bg-green-50/30">
                <td className="px-3 py-2 sticky left-0 bg-green-50/30 z-10 border-r border-border/30">
                  <div className="text-xs font-semibold text-green-700">Open Shifts</div>
                </td>
                {weekDates.map((date, di) => {
                  const open = getOpenShifts(date);
                  return (
                    <td key={di} className="px-1.5 py-1.5 text-center">
                      {open.map(s => (
                        <span key={s.id} className="inline-block px-2 py-0.5 rounded border text-xs font-semibold bg-green-100 text-green-800 border-green-200 animate-pulse">
                          OPEN
                        </span>
                      ))}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(SHIFT_COLORS).filter(([k]) => k !== "open").map(([key, val]) => (
          <span key={key} className={`px-2 py-0.5 rounded border font-semibold ${val.bg}`}>
            {val.label} — {key.replace(/_/g, " ")}
          </span>
        ))}
        <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 font-semibold">AL — Annual Leave</span>
        <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 font-semibold">SL — Sick Leave</span>
      </div>

      {/* Quick Create Modal */}
      {createModal && (
        <QuickCreateShiftModal
          date={createModal.date}
          shiftType="morning"
          home={homes.find(h => h.id === selectedHomeId) || homes[0]}
          allStaff={staff}
          myStaffProfile={staff.find(s => s.email === user?.email)}
          activeRota={currentRota}
          onClose={() => setCreateModal(null)}
          onSave={async (shiftData) => {
            await secureGateway.create("Shift", { ...shiftData, staff_id: createModal.staffId });
            setCreateModal(null);
            queryClient.invalidateQueries({ queryKey: ["rota-shifts"] });
            toast.success("Shift created");
          }}
          saving={false}
          user={user}
        />
      )}
    </div>
  );
}