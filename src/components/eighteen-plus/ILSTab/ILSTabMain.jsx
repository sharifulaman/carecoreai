import { useState } from "react";
import ILSOverview from "./ILSOverview";
import ILSDetail from "./ILSDetail";

export default function ILSTabMain({ residents, homes, staff, user }) {
  const [selectedResident, setSelectedResident] = useState(null);

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

  return <ILSOverview residents={residents} homes={homes} onSelectResident={setSelectedResident} />;
}