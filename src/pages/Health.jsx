import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";

export default function Health() {
  const { user } = useOutletContext();
  const [activeTab, setActiveTab] = useState("appointments");

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-health"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, status: "active" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Health & Wellbeing</h1>
        <Button className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> Log Health Event</Button>
      </div>

      <div className="flex gap-0 border-b border-border">
        {["appointments", "medications", "incidents", "reviews"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-xs font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Health tracking, medication management, and appointments — coming soon</p>
      </div>
    </div>
  );
}