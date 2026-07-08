import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Wand2, AlertTriangle, CheckCircle2, Moon, Sun, Sunset, Coffee } from "lucide-react";
import ShiftDetailPanel from "./ShiftDetailPanel";
import RotaGridView from "./RotaGridView";
import RotaGenerateFlow from "./RotaGenerateFlow";
import QuickCreateShiftModal from "./QuickCreateShiftModal";
import { toast } from "sonner";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFT_TYPES = ["morning", "night"];
const SHIFT_ICONS = {
  morning: <Sun className="w-3 h-3" />,
  afternoon: <Sunset className="w-3 h-3" />,
  night: <Moon className="w-3 h-3" />,
  sleeping: <Coffee className="w-3 h-3" />,
};

const STATUS_STYLES = {
  draft: "bg-gray-100 border-dashed border-gray-300 text-gray-500",
  published: "bg-blue-50 border-blue-200 text-blue-700",
  confirmed: "bg-green-50 border-green-200 text-green-700",
  in_progress: "bg-amber-50 border-amber-200 text-amber-700 animate-pulse",
  completed: "bg-gray-200 border-gray-300 text-gray-500",
  cancelled: "bg-red-50 border-red-200 text-red-500 line-through",
};

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function ShiftCell({ shifts, date, shiftType, staffMap, onClick, onEmpty }) {
  const s = shifts.find(sh => sh.date === date && sh.shift_type === shiftType);
  if (!s) {
    return (
      <button onClick={() => onEmpty(date, shiftType)} className="w-full h-16 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors text-lg">
        +
      </button>
    );
  }

  const assigned = s.assigned_staff || [];
  const short = assigned.length < s.staff_required;

  return (
    <button onClick={() => onClick(s)} className={`w-full h-16 rounded-lg border p-1.5 text-left transition-all hover:opacity-80 ${STATUS_STYLES[s.status] || "bg-muted"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs capitalize font-medium">{s.status}</span>
        {s.is_sleeping_shift && <Moon className="w-3 h-3" />}
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        {assigned.slice(0, 2).map(sid => {
          const firstName = staffMap[sid]?.full_name?.split(' ')[0] || "?";
          return (
            <span key={sid} className={`text-xs font-bold px-1.5 py-0.5 rounded ${sid === s.lead_staff_id ? "bg-primary text-white" : "bg-gray-300 text-gray-700"}`}>
              {firstName}
            </span>
          );
        })}
        {assigned.length > 2 && <span className="text-xs ml-0.5 font-medium">+{assigned.length - 2}</span>}
        {short && <span className="ml-auto text-xs text-red-600 font-medium">-{s.staff_required - assigned.length}</span>}
      </div>
    </button>
  );
}

export default function RotaTab({ home, weekStart, viewMode, user, myStaffProfile }) {
  const queryClient = useQueryClient();
  const [selectedShift, setSelectedShift] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts", home?.id, weekStart],
    queryFn: () => base44.entities.Shift.filter({ org_id: ORG_ID, home_id: home?.id }),
    enabled: !!home?.id,
  });

  const { data: rotas = [] } = useQuery({
    queryKey: ["rotas", home?.id],
    queryFn: () => base44.entities.Rota.filter({ org_id: ORG_ID, home_id: home?.id }),
    enabled: !!home?.id,
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ["conflicts", home?.id],
    queryFn: () => base44.entities.ShiftConflict.filter({ org_id: ORG_ID }),
    enabled: !!home?.id,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ["staff-for-rota", home?.id],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID, status: "active" }),
    enabled: !!home?.id,
  });

  const staffMap = useMemo(() => Object.fromEntries(allStaff.map(s => [s.id, s])), [allStaff]);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const activeRota = rotas.find(r => r.status === "draft" || r.status === "published");
  const unresolvedCritical = conflicts.filter(c => !c.resolved && c.severity === "critical").length;
  const unresolvedWarnings = conflicts.filter(c => !c.resolved && c.severity === "warning").length;

  const publishMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Rota.update(activeRota.id, {
        status: "published",
        published_by: myStaffProfile?.id,
        published_at: new Date().toISOString(),
      });
      // Publish all draft shifts in this rota
      const draftShifts = shifts.filter(s => s.rota_id === activeRota.id && s.status === "draft");
      await Promise.all(draftShifts.map(s => base44.entities.Shift.update(s.id, { status: "published" })));

      // FIX 6: Notify all assigned staff
      const assignedStaffIds = [...new Set(draftShifts.flatMap(s => s.assigned_staff || []))];
      const staffToNotify = allStaff.filter(s => assignedStaffIds.includes(s.id) && s.user_id);
      await Promise.all(staffToNotify.map(s =>
        base44.functions.invoke("createNotification", {
          org_id: ORG_ID,
          user_id: s.user_id,
          type: "rota",
          message: `The rota for ${home?.name} has been published. Check your shifts.`,
          link_url: "/shifts/my-shifts",
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["rotas"] });
      toast.success(`Rota published for ${home?.name}`);
    },
  });

  const [createShift, setCreateShift] = useState(null); // { date, shiftType }

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setCreateShift(null);
      toast.success("Shift created");
    },
  });

  const handleEmptyCell = (date, shiftType) => {
    setCreateShift({ date, shiftType });
  };

  if (!home) {
    return <div className="py-12 text-center text-muted-foreground">Select a home to view the rota.</div>;
  }

  if (showGenerate) {
    return (
      <RotaGenerateFlow
        home={home}
        user={user}
        myStaffProfile={myStaffProfile}
        onBack={() => setShowGenerate(false)}
        onComplete={() => { setShowGenerate(false); queryClient.invalidateQueries({ queryKey: ["shifts"] }); queryClient.invalidateQueries({ queryKey: ["rotas"] }); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {createShift && (
        <QuickCreateShiftModal
          date={createShift.date}
          shiftType={createShift.shiftType}
          home={home}
          allStaff={allStaff}
          myStaffProfile={myStaffProfile}
          activeRota={activeRota}
          onSave={(data) => createShiftMutation.mutate(data)}
          onClose={() => setCreateShift(null)}
          saving={createShiftMutation.isPending}
          user={user}
        />
      )}
      {selectedShift && (
        <ShiftDetailPanel
          shift={selectedShift}
          home={home}
          staffMap={staffMap}
          allStaff={allStaff}
          conflicts={conflicts.filter(c => c.shift_id === selectedShift.id)}
          user={user}
          myStaffProfile={myStaffProfile}
          onClose={() => setSelectedShift(null)}
        />
      )}

      {/* Rota status bar */}
      <div className="flex flex-wrap items-center gap-3">
        {activeRota ? (
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${activeRota.status === "published" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
              {activeRota.status === "draft" ? "Draft Rota" : "Published Rota"}: {activeRota.name}
            </span>
            {unresolvedCritical > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> {unresolvedCritical} critical conflicts
              </span>
            )}
            {unresolvedWarnings > 0 && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {unresolvedWarnings} warnings
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No active rota for {home.name}</span>
        )}

        <div className="ml-auto flex gap-2">
          <Button onClick={() => setShowGenerate(true)} variant={activeRota ? "outline" : "default"} size="sm" className="gap-2 rounded-xl">
            <Wand2 className="w-4 h-4" /> {activeRota ? "New Rota" : "Generate Rota"}
          </Button>
          {activeRota?.status === "draft" && (
            <>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowGenerate(true)}>
                Adjust Generation
              </Button>
              <Button
                size="sm"
                className={`rounded-xl gap-2 ${unresolvedCritical > 0 ? "opacity-50 cursor-not-allowed" : unresolvedWarnings > 0 ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"}`}
                disabled={unresolvedCritical > 0}
                onClick={() => publishMutation.mutate()}
                title={unresolvedCritical > 0 ? `Resolve ${unresolvedCritical} critical conflicts first` : ""}
              >
                <CheckCircle2 className="w-4 h-4" />
                {unresolvedCritical > 0 ? `Resolve ${unresolvedCritical} conflicts` : unresolvedWarnings > 0 ? `Publish (${unresolvedWarnings} warnings)` : "Publish Rota"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="w-24 px-2 py-2 text-left text-xs font-medium text-muted-foreground">Shift</th>
                {weekDates.map((date, i) => {
                  const d = new Date(date + "T12:00:00");
                  const isToday = date === new Date().toISOString().split("T")[0];
                  return (
                    <th key={date} className="px-1 py-2 text-center">
                      <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{DAY_LABELS[i]}</p>
                      <p className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SHIFT_TYPES.map(type => (
                <tr key={type}>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground capitalize">
                      {SHIFT_ICONS[type]} {type}
                    </div>
                  </td>
                  {weekDates.map(date => (
                    <td key={date} className="px-1 py-1">
                      <ShiftCell shifts={shifts} date={date} shiftType={type} staffMap={staffMap} onClick={setSelectedShift} onEmpty={handleEmptyCell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && (
        <RotaGridView
          home={home}
          weekDates={weekDates}
          shifts={shifts}
          allStaff={allStaff}
          staffMap={staffMap}
          onShiftClick={setSelectedShift}
        />
      )}
    </div>
  );
}