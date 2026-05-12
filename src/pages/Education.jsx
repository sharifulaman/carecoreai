import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";

export default function Education() {
  const { user } = useOutletContext();
  const [activeTab, setActiveTab] = useState("enrollment");

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-education"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, status: "active" }),
  });

  const enrolledCount = residents.filter(r => r.placement_type).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Education Management</h1>
        <Button className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> Add Education Record</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-3xl font-bold text-primary">{enrolledCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Enrolled in Education</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-3xl font-bold text-amber-600">0</p>
          <p className="text-sm text-muted-foreground mt-1">Attendance Issues</p>
        </div>
      </div>

      <div className="flex gap-0 border-b border-border">
        {["enrollment", "attendance", "progress", "goals"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-xs font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Education tracking, attendance, and progress monitoring — coming soon</p>
      </div>
    </div>
  );
}