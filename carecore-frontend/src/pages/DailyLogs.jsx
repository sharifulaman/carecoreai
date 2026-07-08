import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import { secureQueryWithRBAC } from "@/lib/secureQueries";

export default function DailyLogs() {
  const { user } = useOutletContext();
  const [activeTab, setActiveTab] = useState("today");

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ["daily-logs"],
    queryFn: () => secureQueryWithRBAC("DailyLog", {}, "-date", 500),
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = dailyLogs.filter(l => l.date === todayStr);
  const allLogs = dailyLogs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Logs & Shift Handovers</h1>
        <Button className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> New Daily Log</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-3xl font-bold text-primary">{todayLogs.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Logs Today</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-3xl font-bold text-green-600">{allLogs.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Logs</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-muted-foreground mt-1">Flagged Items</p>
        </div>
      </div>

      <div className="flex gap-0 border-b border-border">
        {["today", "all", "handovers"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-xs font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Daily log management and shift handover summaries — coming soon</p>
      </div>
    </div>
  );
}