import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BenefitsOverviewTab from "./BenefitsOverviewTab.jsx";
import WeeklyBudgetTab from "./WeeklyBudgetTab.jsx";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "budget", label: "Weekly Budget" },
];

export default function BenefitsTabMain({ residents, homes }) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: benefits = [] } = useQuery({
    queryKey: ["care-leaver-benefits"],
    queryFn: () => base44.entities.CareLeaverBenefit.filter({}, "-last_reviewed_date", 500),
  });

  const { data: savings = [] } = useQuery({
    queryKey: ["resident-savings"],
    queryFn: () => base44.entities.ResidentSavings.filter({}, "-updated_date", 500),
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <BenefitsOverviewTab residents={residents} homes={homes} benefits={benefits} />
      )}

      {activeTab === "budget" && (
        <WeeklyBudgetTab residents={residents} homes={homes} benefits={benefits} savings={savings} />
      )}
    </div>
  );
}