import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import ILSOverview from "./ILSOverview";
import ILSDetail from "./ILSDetail";
import ILSOutcomeKPIs from "./ILSOutcomeKPIs";

export default function ILSTabMain({ residents, homes, staff, user }) {
  const [selectedResident, setSelectedResident] = useState(null);

  const { data: allSessions = [] } = useQuery({
    queryKey: ["ils-sessions-all"],
    queryFn: () => secureGateway.filter("ILSSessionLog", {}, "-session_date", 500),
    staleTime: 60 * 1000,
  });

  if (selectedResident) {
    return (
      <div>
        <button
          onClick={() => setSelectedResident(null)}
          className="text-sm text-primary hover:opacity-70 mb-4"
        >
          ← Back to Overview
        </button>
        <ILSDetail
          resident={selectedResident}
          home={homes.find(h => h.id === selectedResident.home_id)}
          staff={staff}
          user={user}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ILSOutcomeKPIs sessions={allSessions} residents={residents} />
      <ILSOverview residents={residents} homes={homes} onSelectResident={setSelectedResident} />
    </div>
  );
}