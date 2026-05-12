import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import HandoverFormNew from "./HandoverFormNew";
import HandoverDetail from "./HandoverDetail";

const SHIFTS = ["morning", "afternoon", "night"];

function getShiftColor(shift) {
  const colors = { morning: "bg-yellow-100 text-yellow-700", afternoon: "bg-orange-100 text-orange-700", night: "bg-purple-100 text-purple-700" };
  return colors[shift] || "bg-gray-100";
}

export default function HandoversTab({ home }) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [viewingHandover, setViewingHandover] = useState(null);
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-for-home", home?.id],
    queryFn: () => base44.entities.Resident.filter({ home_id: home?.id, status: "active" }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffProfile.filter(),
  });

  const { data: handovers = [] } = useQuery({
    queryKey: ["shift-handovers", home?.id],
    queryFn: () => base44.entities.ShiftHandover.filter({ home_id: home?.id }, "-date", 500),
  });

  const dateHandovers = handovers.filter(h => h.date === selectedDate);
  const submittedCount = dateHandovers.filter(h => h.status === "submitted" || h.status === "acknowledged").length;

  // Calendar data
  const calendarDays = useMemo(() => {
    const days = {};
    handovers.forEach(h => {
      if (h.date >= dateRange.from && h.date <= dateRange.to) {
        if (!days[h.date]) days[h.date] = { morning: false, afternoon: false, night: false };
        days[h.date][h.shift] = true;
      }
    });
    return days;
  }, [handovers, dateRange]);

  const getDateStatus = (date) => {
    const dayData = calendarDays[date];
    if (!dayData) return "red"; // no handovers
    const submitted = Object.values(dayData).filter(Boolean).length;
    if (submitted === 3) return "green"; // all 3 submitted
    return "amber"; // 1-2 submitted
  };

  const handleAcknowledge = async () => {
    const submitted = dateHandovers.find(h => h.status === "submitted");
    if (!submitted) {
      toast.error("No submitted handover to acknowledge");
      return;
    }
    await base44.entities.ShiftHandover.update(submitted.id, {
      incoming_acknowledged: true,
      incoming_acknowledged_at: new Date().toISOString(),
      status: "acknowledged",
    });
    qc.invalidateQueries({ queryKey: ["shift-handovers", home?.id] });
    toast.success("Handover acknowledged");
  };

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Date:</label>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-32" />
        <Button onClick={() => setShowForm(true)} className="gap-1 ml-auto"><Plus className="w-4 h-4" /> New Handover</Button>
      </div>

      {/* Handovers for Selected Date */}
      <div className="space-y-2">
        {SHIFTS.map(shift => {
          const handover = dateHandovers.find(h => h.shift === shift);
          return (
            <div key={shift} className={`border rounded-lg p-3 ${getShiftColor(shift)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold capitalize">{shift} Shift</p>
                  {handover ? (
                    <>
                      <p className="text-xs mt-1">{handover.outgoing_staff_name} → {handover.incoming_staff_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {handover.status === "acknowledged" && <CheckCircle className="w-4 h-4" />}
                        <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${handover.status === "acknowledged" ? "bg-green-200" : "bg-yellow-200"}`}>
                          {handover.status}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs mt-1 opacity-50">No handover submitted</p>
                  )}
                </div>
                {handover && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewingHandover(handover)}>View</Button>
                    {handover.status === "submitted" && (
                      <Button size="sm" variant="ghost" onClick={handleAcknowledge}>Acknowledge</Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {submittedCount < 3 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
          <p className="text-sm text-amber-700 font-medium">⚠️ {3 - submittedCount} shift handover(s) not submitted for {selectedDate}</p>
        </div>
      )}

      {/* Calendar */}
      <div className="mt-6">
        <h3 className="font-semibold text-sm mb-3">Handover Calendar ({dateRange.from} to {dateRange.to})</h3>
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-xs font-medium text-center py-1">{d}</div>
          ))}
          {Array.from({ length: 31 }).map((_, i) => {
            const day = String(i + 1).padStart(2, "0");
            const month = dateRange.from.split("-")[1];
            const year = dateRange.from.split("-")[0];
            const date = `${year}-${month}-${day}`;
            const status = getDateStatus(date);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`p-1 rounded text-xs font-medium ${status === "green" ? "bg-green-200 text-green-700" : status === "amber" ? "bg-amber-200 text-amber-700" : "bg-red-200 text-red-700"}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showForm && <HandoverFormNew home={home} residents={residents} staff={staff} user={null} onClose={() => setShowForm(false)} onSave={() => qc.invalidateQueries({ queryKey: ["shift-handovers", home?.id] })} />}
      {viewingHandover && <HandoverDetail handover={viewingHandover} onClose={() => setViewingHandover(null)} />}
    </div>
  );
}