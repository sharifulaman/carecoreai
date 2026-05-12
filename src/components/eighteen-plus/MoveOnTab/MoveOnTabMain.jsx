import { useState } from "react";
import MoveOnBoard from "./MoveOnBoard";
import MoveOnDetail from "./MoveOnDetail";

export default function MoveOnTabMain({ residents, homes, staff, user }) {
  const [selectedResident, setSelectedResident] = useState(null);

  if (selectedResident) {
    return (
      <div>
        <button
          onClick={() => setSelectedResident(null)}
          className="text-sm text-primary hover:opacity-70 mb-4"
        >
          ← Back to Board
        </button>
        <MoveOnDetail
          resident={selectedResident}
          home={homes.find(h => h.id === selectedResident.home_id)}
          ilsScore={0}
          onBack={() => setSelectedResident(null)}
        />
      </div>
    );
  }

  return <MoveOnBoard residents={residents} homes={homes} onSelectResident={setSelectedResident} />;
}