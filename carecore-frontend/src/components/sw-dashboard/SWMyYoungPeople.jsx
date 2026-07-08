import { ChevronRight, AlertCircle } from "lucide-react";
import { useMemo } from "react";

export default function SWMyYoungPeople({ residents, homes, appointments, incidents, complaints, mfh }) {
  const residentItems = useMemo(() => {
    return residents.map(r => {
      const home = homes.find(h => h.id === r.home_id);
      const resIncidents = incidents.filter(i => i.resident_id === r.id);
      const resComplaints = complaints.filter(c => c.resident_id === r.id);
      const resMFH = mfh.filter(m => m.resident_id === r.id);
      
      let statusBadge = "All good";
      let statusColor = "text-green-600 bg-green-50";
      
      const dueTasks = resIncidents.length + resComplaints.length + resMFH.filter(m => !m.return_interview_completed).length;
      if (dueTasks > 0) {
        statusBadge = `${dueTasks} due`;
        statusColor = "text-orange-600 bg-orange-50";
      }
      
      const overdue = resMFH.filter(m => !m.return_interview_completed && new Date(m.created_date) < new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
      if (overdue > 0) {
        statusBadge = `${overdue} overdue`;
        statusColor = "text-red-600 bg-red-50";
      }

      const age = r.dob ? Math.floor((new Date() - new Date(r.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : "—";

      return {
        id: r.id,
        name: r.display_name,
        age,
        home: home?.name || "—",
        statusBadge,
        statusColor,
      };
    });
  }, [residents, homes, incidents, complaints, mfh]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Today's Young People</h3>
        <a href="/residents" className="text-xs text-primary hover:underline">View all</a>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {residentItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No assigned residents</p>
        ) : (
          residentItems.map(r => (
            <div
              key={r.id}
              className="border border-border rounded p-2 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {r.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Age {r.age} · {r.home}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded ${r.statusColor}`}>
                  {r.statusBadge}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>

      <button className="w-full text-xs font-medium text-primary hover:underline py-2">
        View all assigned young people
      </button>
    </div>
  );
}