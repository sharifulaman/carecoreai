import { AlertCircle } from "lucide-react";
import { useMemo } from "react";

export default function SWComplianceCard({
  residents,
  risks,
  exploitation,
  health,
  education,
  mfh,
  complaints,
}) {
  const urgentActions = useMemo(() => {
    const actions = [];

    residents.forEach(r => {
      // Missing health data
      const healthProfile = health.find(h => h.resident_id === r.id);
      if (!healthProfile?.gp_registered) {
        actions.push({
          resident: r.display_name,
          action: "GP details not recorded",
          severity: "critical",
          date: "Today",
        });
      }
      if (!healthProfile?.dentist_registered) {
        actions.push({
          resident: r.display_name,
          action: "Dentist registration missing",
          severity: "warning",
          date: "Today",
        });
      }

      // Missing education status
      const edRecord = education.find(e => e.resident_id === r.id);
      if (!edRecord?.education_status) {
        actions.push({
          resident: r.display_name,
          action: "Education update due",
          severity: "warning",
          date: "Today",
        });
      }

      // Exploitation risks
      const expRisk = exploitation.find(e => e.resident_id === r.id);
      if (expRisk && (expRisk.concern_type === "cse_risk" || expRisk.concern_type === "cce_risk")) {
        actions.push({
          resident: r.display_name,
          action: "CSE / CCE Risk review overdue",
          severity: "critical",
          date: "Overdue",
        });
      }

      // Missing episodes
      const openMFH = mfh.find(m => m.resident_id === r.id && !m.return_interview_completed);
      if (openMFH) {
        actions.push({
          resident: r.display_name,
          action: "Missing episode follow-up due",
          severity: "critical",
          date: "Today",
        });
      }

      // Open complaints
      const openComplaint = complaints.find(c => c.resident_id === r.id && c.status !== "closed");
      if (openComplaint) {
        actions.push({
          resident: r.display_name,
          action: "Complaint / concern unresolved",
          severity: "warning",
          date: "Overdue",
        });
      }

      // Annex A gaps
      let gaps = 0;
      if (!r.accommodation_category) gaps++;
      if (!r.placing_local_authority) gaps++;
      if (gaps > 0) {
        actions.push({
          resident: r.display_name,
          action: `Annex A readiness gap (${gaps})`,
          severity: "info",
          date: "Today",
        });
      }
    });

    return actions.slice(0, 5); // Show top 5
  }, [residents, health, education, exploitation, mfh, complaints]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Urgent Actions</h3>
          <p className="text-xs text-muted-foreground mt-1">{urgentActions.length} action{urgentActions.length !== 1 ? "s" : ""}</p>
        </div>
        <a href="#" className="text-xs text-primary hover:underline">View all</a>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {urgentActions.length === 0 ? (
          <p className="text-xs text-muted-foreground">All caught up!</p>
        ) : (
          urgentActions.map((action, i) => {
            const severityColor = {
              critical: "border-l-4 border-red-500 bg-red-50",
              warning: "border-l-4 border-orange-500 bg-orange-50",
              info: "border-l-4 border-blue-500 bg-blue-50",
            }[action.severity];

            return (
              <div key={i} className={`${severityColor} p-3 rounded text-xs`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{action.resident}</p>
                    <p className="text-muted-foreground truncate">{action.action}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{action.date}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}