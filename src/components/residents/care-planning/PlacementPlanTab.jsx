import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import PlacementPlanForm from "./PlacementPlanForm";
import PlacementPlanDetail from "./PlacementPlanDetail";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function PlacementPlanTab({ residents, homes, staff, user }) {
  const qc = useQueryClient();
  const [selectedResident, setSelectedResident] = useState(residents[0]?.id || null);
  const [showForm, setShowForm] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);

  const { data: plans = [] } = useQuery({
    queryKey: ["placement-plans"],
    queryFn: () => secureGateway.filter("PlacementPlan", { is_deleted: false }, "-created_at", 500),
  });

  const resident = residents.find(r => r.id === selectedResident);
  const residentPlans = plans.filter(p => p.resident_id === selectedResident).sort((a, b) => (b.version || 0) - (a.version || 0));
  const activePlan = residentPlans.find(p => p.status === "active") || residentPlans[0];
  const daysUntilReview = activePlan ? daysUntil(activePlan.review_date) : null;
  const isReviewOverdue = daysUntilReview !== null && daysUntilReview < 0;

  const handleCreateVersion = async () => {
    if (!activePlan) {
      toast.error("No active plan to version");
      return;
    }

    const newPlan = {
      ...activePlan,
      id: undefined,
      version: (activePlan.version || 1) + 1,
      status: "draft",
      created_by_id: user?.id,
      created_by_name: user?.full_name,
    };

    delete newPlan.created_at;
    delete newPlan.updated_at;
    delete newPlan.is_deleted;

    await secureGateway.create("PlacementPlan", newPlan);
    qc.invalidateQueries({ queryKey: ["placement-plans"] });
    toast.success("New version created");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Placement Plan</h3>
        {residents.length > 1 && (
          <select
            value={selectedResident}
            onChange={e => setSelectedResident(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
          >
            {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <Button onClick={() => setShowForm(true)} className="gap-1"><Plus className="w-4 h-4" /> Create Plan</Button>
      </div>

      {/* No Plan Alert */}
      {!activePlan && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-sm text-amber-700 font-medium">⚠️ No Placement Plan recorded for {resident?.display_name}. This is a statutory requirement from day one.</p>
        </div>
      )}

      {/* Active Plan View */}
      {activePlan && (
        <>
          {/* Review Alert */}
          {isReviewOverdue && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">⚠️ Review overdue by {Math.abs(daysUntilReview)} days</p>
            </div>
          )}
          {daysUntilReview !== null && daysUntilReview > 0 && daysUntilReview <= 14 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <p className="text-sm text-amber-700 font-medium">📋 Review due in {daysUntilReview} days ({activePlan.review_date})</p>
            </div>
          )}

          {/* Plan Summary Card */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Version {activePlan.version}</p>
                <p className="text-sm font-medium mt-1">Effective: {activePlan.effective_date}</p>
                <p className="text-sm text-muted-foreground">Review: {activePlan.review_date}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${activePlan.status === "active" ? "bg-green-100 text-green-700" : activePlan.status === "reviewed" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                {activePlan.status}
              </span>
            </div>

            {activePlan.reason_for_placement && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Reason for Placement</p>
                <p className="text-sm mt-1">{activePlan.reason_for_placement}</p>
              </div>
            )}

            {activePlan.goals && activePlan.goals.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Goals ({activePlan.goals.length})</p>
                <div className="space-y-2">
                  {activePlan.goals.map((g, i) => (
                    <div key={i} className="flex items-start justify-between p-2 bg-muted/30 rounded text-xs">
                      <div>
                        <p className="font-medium capitalize">{g.goal_area}</p>
                        <p className="text-muted-foreground">{g.description}</p>
                        {g.target_date && <p className="text-muted-foreground">Target: {g.target_date}</p>}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                        g.progress === "achieved" ? "bg-green-100 text-green-700" :
                        g.progress === "in_progress" ? "bg-blue-100 text-blue-700" :
                        g.progress === "not_achieved" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {g.progress?.replace(/_/g, " ") || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePlan.risk_of_breakdown && (
              <div className="bg-amber-50 border border-amber-300 rounded p-2">
                <p className="text-xs text-amber-700 font-medium">⚠️ Risk of breakdown flagged</p>
                {activePlan.breakdown_risk_notes && <p className="text-xs mt-1">{activePlan.breakdown_risk_notes}</p>}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setViewingPlan(activePlan)}>View Full Plan</Button>
              <Button size="sm" variant="outline" onClick={handleCreateVersion}>Create New Version</Button>
            </div>
          </div>

          {/* Previous Versions */}
          {residentPlans.length > 1 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-medium mb-3">Previous Versions</p>
              <div className="space-y-2">
                {residentPlans.slice(1).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setViewingPlan(p)}
                    className="w-full text-left flex items-center justify-between p-2 rounded hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-xs">
                      <span className="font-medium">v{p.version}</span> · {p.effective_date} ({p.status})
                    </span>
                    <FileText className="w-3 h-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showForm && <PlacementPlanForm resident={resident} residents={residents} staff={staff} user={user} onClose={() => setShowForm(false)} onSave={() => { qc.invalidateQueries({ queryKey: ["placement-plans"] }); setShowForm(false); }} />}
      {viewingPlan && <PlacementPlanDetail plan={viewingPlan} resident={resident} onClose={() => setViewingPlan(null)} />}
    </div>
  );
}