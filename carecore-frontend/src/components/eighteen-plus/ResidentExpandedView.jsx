import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

const QUICK_TABS = [
  { key: "ils", label: "ILS Summary" },
  { key: "moveon", label: "Move-On" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finance", label: "Finance" },
];

export default function ResidentExpandedView({ resident, home, staffMap, pathwayPlans, ilsPlans, allowances, savings }) {
  const [activeTab, setActiveTab] = useState("ils");

  const ilsPlan = ilsPlans.find(p => p.resident_id === resident.id);
  const pathwayPlan = pathwayPlans.find(p => p.resident_id === resident.id);
  const allowance = allowances.find(a => a.resident_id === resident.id);
  const saving = savings.find(s => s.resident_id === resident.id);

  const keyWorkerName = staffMap[resident.key_worker_id]?.full_name || "—";
  const ilsData = ilsPlan?.skills?.map(s => ({
    domain: s.domain.replace(/_/g, " "),
    score: ({ not_started: 0, developing: 33, achieved: 66, maintaining: 100 }[s.progress] || 0),
  })) || [];

  return (
    <div className="space-y-4">
      {/* LEFT SIDE */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Key Worker</p>
            <p className="text-sm font-medium">{keyWorkerName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Home</p>
            <p className="text-sm font-medium">{home?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Placement Start</p>
            <p className="text-sm font-medium">{resident.placement_start ? new Date(resident.placement_start).toLocaleDateString() : "—"}</p>
          </div>
        </div>

        {/* QUICK TABS */}
        <div>
          <div className="flex gap-1 mb-3 border-b border-border">
            {QUICK_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          {activeTab === "ils" && ilsData.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={ilsData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          )}

          {activeTab === "moveon" && pathwayPlan && (
            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">Status:</span> <span className="font-medium">{pathwayPlan.status}</span></p>
              <p><span className="text-muted-foreground">Review:</span> <span className="font-medium">{new Date(pathwayPlan.review_date).toLocaleDateString()}</span></p>
              <p className="text-xs text-muted-foreground">3 actions needed to progress</p>
            </div>
          )}

          {activeTab === "upcoming" && (
            <div className="text-sm space-y-2 text-muted-foreground text-xs">
              <p>• Next PA visit: 2 weeks</p>
              <p>• LA review: 4 weeks</p>
              <p>• Annual appointment: 8 weeks</p>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">Allowance:</span> <span className="font-medium">£{allowance?.amount || 0}/w</span></p>
              <p><span className="text-muted-foreground">Savings:</span> <span className="font-medium">£{saving?.balance || 0}</span></p>
              <p className="text-xs text-muted-foreground">Benefits: Universal Credit, Housing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}