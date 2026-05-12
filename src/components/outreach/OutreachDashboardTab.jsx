import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import VisitFrequencyMonitor from "./VisitFrequencyMonitor";
import VisitRiskAssessmentForm from "./VisitRiskAssessmentForm";
import LoneWorkingLogs from "./LoneWorkingLogs";

export default function OutreachDashboardTab({ home, staff, user }) {
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);

  const { data: residents = [] } = useQuery({
    queryKey: ["outreach-residents", home?.id],
    queryFn: () => secureGateway.filter("Resident", { home_id: home?.id, status: "active" }, "-display_name", 100),
  });

  const handleRiskAssessment = (resident) => {
    setSelectedResident(resident);
    setShowRiskForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Visit Frequency Monitoring */}
      <div>
        <h2 className="text-lg font-bold mb-3">Visit Frequency Monitoring</h2>
        <VisitFrequencyMonitor home={home} residents={residents} />
      </div>

      {/* Resident Risk Assessment Panel */}
      <div>
        <h2 className="text-lg font-bold mb-3">Visit Risk Assessments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {residents.filter(r => r.contracted_visits_per_week).map(resident => (
            <div key={resident.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{resident.display_name}</p>
                <p className="text-xs text-muted-foreground">{resident.contracted_visits_per_week}/week visits</p>
              </div>
              <button
                onClick={() => handleRiskAssessment(resident)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Assess
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Lone Working Logs */}
      <div>
        <h2 className="text-lg font-bold mb-3">Lone Working Records</h2>
        <LoneWorkingLogs home={home} />
      </div>

      {/* Risk Assessment Form */}
      {showRiskForm && selectedResident && (
        <VisitRiskAssessmentForm
          resident={selectedResident}
          home={home}
          staff={staff}
          user={user}
          onClose={() => { setShowRiskForm(false); setSelectedResident(null); }}
          onSave={() => { setShowRiskForm(false); setSelectedResident(null); }}
        />
      )}
    </div>
  );
}