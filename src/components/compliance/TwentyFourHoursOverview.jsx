import { useMemo } from "react";
import { Clock, Users, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function TwentyFourHoursOverview({ homes, data, staff }) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  const currentShift = now.getHours() >= 6 && now.getHours() < 14 ? "morning" :
                      now.getHours() >= 14 && now.getHours() < 22 ? "afternoon" :
                      "night";

  const homeCards = useMemo(() => {
    return homes.filter(h => h.type === "24_hours").map(home => {
      const shifts = (data?.shifts || []).filter(s => s.home_id === home.id && s.date === today && s.shift === currentShift);
      const staffNames = shifts.flatMap(s => s.staff_ids || [])
        .map(id => staff.find(st => st.id === id)?.full_name)
        .filter(Boolean);

      const handover = (data?.handovers || []).find(h => h.home_id === home.id && h.date === today && h.shift === currentShift);
      const mfhActive = (data?.mfhRecords || []).filter(m => m.home_id === home.id && m.status === "active").length;
      const sleepCheckStarted = currentShift === "night" ? 
        (data?.sleepChecks || []).some(s => s.home_id === home.id && s.date === today) : false;

      const residents = (data?.residents || []).filter(r => r.home_id === home.id && r.status === "active");
      const occupancy = residents.length;

      return {
        id: home.id,
        name: home.name,
        occupancy: `${occupancy}/${home.capacity || "?"}`,
        shift: currentShift,
        staff: staffNames,
        handoverSubmitted: !!handover && handover.status === "submitted",
        activeMFH: mfhActive,
        sleepCheckStarted,
      };
    });
  }, [homes, data, staff, today, currentShift]);

  const staffOnShift = useMemo(() => {
    return (data?.attendanceLogs || [])
      .filter(l => !l.clock_out_time && l.clock_in_time)
      .map(l => ({
        name: l.staff_name,
        home: homes.find(h => h.id === l.home_id)?.name || "—",
        since: new Date(l.clock_in_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      }));
  }, [data, homes]);

  return (
    <div className="space-y-6">
      {/* Today at a Glance */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Today at a Glance ({currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {homeCards.map(card => (
            <div key={card.id} className={`border rounded-lg p-4 ${card.activeMFH > 0 ? "border-red-500 bg-red-50" : "border-border"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{card.name}</h3>
                  <p className="text-xs text-muted-foreground">Occupancy: {card.occupancy}</p>
                </div>
                {card.activeMFH > 0 && <AlertTriangle className="w-5 h-5 text-red-600" />}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Staff on duty:</span>
                  <span className="font-medium">{card.staff.length > 0 ? card.staff.join(", ") : "—"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Handover:</span>
                  <span className={card.handoverSubmitted ? "text-green-600 font-medium" : "text-amber-600"}>
                    {card.handoverSubmitted ? "✓ Submitted" : "✗ Pending"}
                  </span>
                </div>

                {card.activeMFH > 0 && (
                  <div className="pt-2 border-t border-red-200">
                    <p className="text-red-700 font-semibold">🚨 {card.activeMFH} active MFH</p>
                  </div>
                )}

                {card.sleepCheckStarted && (
                  <div className="pt-2 text-green-700">
                    ✓ Sleep checks started
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Compliance Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Next Reg44</p>
            <p className="text-lg font-bold text-amber-600">—</p>
          </div>
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Home Checks Overdue</p>
            <p className="text-lg font-bold">0</p>
          </div>
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Visitor Log Today</p>
            <p className="text-lg font-bold">{(data?.visitorLogs || []).filter(v => v.visit_date === today).length}</p>
          </div>
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Significant Events</p>
            <p className="text-lg font-bold">{(data?.significantEvents || []).filter(e => e.home_id).length}</p>
          </div>
        </div>
      </div>

      {/* Staff on Shift */}
      {staffOnShift.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Staff On Shift Now ({staffOnShift.length})</h2>
          <div className="border border-border rounded-lg divide-y divide-border">
            {staffOnShift.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 text-xs">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-muted-foreground">{s.home}</p>
                </div>
                <span className="text-muted-foreground">Since {s.since}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}