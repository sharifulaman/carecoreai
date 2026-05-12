import { useState } from "react";
import PAVisitsSubTab from "./PAVisitsSubTab";
import LAReviewsSubTab from "./LAReviewsSubTab";

const SUBTABS = [
  { key: "visits", label: "PA Visits" },
  { key: "reviews", label: "LA Reviews" },
];

export default function PATabMain({ residents, homes, staff }) {
  const [activeSubTab, setActiveSubTab] = useState("visits");

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {SUBTABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSubTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab content */}
      {activeSubTab === "visits" && <PAVisitsSubTab residents={residents} homes={homes} staff={staff} />}
      {activeSubTab === "reviews" && <LAReviewsSubTab residents={residents} homes={homes} />}
    </div>
  );
}