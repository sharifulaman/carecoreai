import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import PathwayPlanForm from "./PathwayPlanForm";
import PathwayPlanDetail from "./PathwayPlanDetail";

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

export default function PathwayPlanTab({ residents, homes, staff, user }) {
  const qc = useQueryClient();
  const [selectedResident, setSelectedResident] = useState(residents[0]?.id || null);
  const [showForm, setShowForm] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);

  const { data: plans = [] } = useQuery({
    queryKey: ["pathway-plans"],
    queryFn: () => secureGateway.filter("PathwayPlan", { is_deleted: false }, "-created_at", 500),
  });

  const resident = residents.find(r => r.id === selectedResident);
  const age = calcAge(resident?.dob);
  
  // Only show this tab for 16+ year olds
  if (!age || age < 16) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground text-sm">
        Pathway Plans are required from age 16. {resident?.display_name} is {age || "unknown"} years old.
      </div>
    );
  }

  const residentPlans = plans.filter(p => p.resident_id === selectedResident).sort((a, b) => (b.version || 0) - (a.version || 0));
  const activePlan = residentPlans.find(p => p.status === "active") || residentPlans[0];

  const completedAreas = activePlan ? [
    "health_and_development",
    "education_training_employment",
    "financial_capability",
    "accommodation",
    "family_and_social_relationships",
    "identity_and_self_care",
    "emotional_and_behavioural_development",
  ].filter(area => {
    const areaData = activePlan[area];
    return areaData && areaData.support_planned;
  }).length : 0;

  const totalAreas = 7;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Pathway Plan (16+ Years)</h3>
        {residents.length > 1 && (
          <select
            value={selectedResident}
            onChange={e => setSelectedResident(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
          >
            {residents.filter(r => calcAge(r.dob) >= 16).map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <Button onClick={() => setShowForm(true)} className="gap-1"><Plus className="w-4 h-4" /> Create Plan</Button>
      </div>

      {/* No Plan Alert */}
      {!activePlan && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium">⚠️ No Pathway Plan recorded. This is a statutory requirement under the Children (Leaving Care) Act 2000 for all looked-after young people from age 16.</p>
        </div>
      )}

      {/* Active Plan View */}
      {activePlan && (
        <>
          {/* Progress Bar */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{completedAreas} of {totalAreas} statutory areas have support plans</p>
              <span className="text-xs text-muted-foreground">{Math.round((completedAreas / totalAreas) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(completedAreas / totalAreas) * 100}%` }}
              />
            </div>
          </div>

          {/* Plan Summary */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Version {activePlan.version}</p>
                <p className="text-sm font-medium mt-1">Effective: {activePlan.effective_date}</p>
                <p className="text-sm text-muted-foreground">Review: {activePlan.review_date}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${activePlan.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                {activePlan.status}
              </span>
            </div>
            {activePlan.personal_adviser_name && (
              <p className="text-sm text-muted-foreground">Personal Adviser: <span className="font-medium text-foreground">{activePlan.personal_adviser_name}</span></p>
            )}
            <Button size="sm" variant="outline" onClick={() => setViewingPlan(activePlan)} className="mt-2">View Full Plan</Button>
          </div>

          {/* Statutory Areas Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "health_and_development", label: "Health & Development" },
              { key: "education_training_employment", label: "Education, Training & Employment" },
              { key: "financial_capability", label: "Financial Capability" },
              { key: "accommodation", label: "Accommodation" },
              { key: "family_and_social_relationships", label: "Family & Relationships" },
              { key: "identity_and_self_care", label: "Identity & Self-Care" },
            ].map(area => {
              const areaData = activePlan[area.key];
              const hasSupport = areaData && areaData.support_planned;
              return (
                <div key={area.key} className={`border rounded-lg p-3 ${hasSupport ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
                  <p className={`text-xs font-medium ${hasSupport ? "text-green-700" : "text-amber-700"}`}>
                    {hasSupport ? "✓" : "⚠️"} {area.label}
                  </p>
                  {areaData?.support_planned && (
                    <p className="text-xs text-foreground mt-1 line-clamp-2">{areaData.support_planned}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Young Person's Views */}
          {activePlan.young_person_consulted && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
              <p className="text-xs text-blue-700 font-medium mb-2">Young Person's Views</p>
              {activePlan.young_person_agrees && <p className="text-sm text-blue-700 mb-1">✓ Agrees with plan</p>}
              {activePlan.young_person_goals && (
                <>
                  <p className="text-sm font-medium text-blue-900 mt-2">Goals (in own words):</p>
                  <p className="text-sm text-foreground italic">"{activePlan.young_person_goals}"</p>
                </>
              )}
              {activePlan.young_person_concerns && (
                <>
                  <p className="text-sm font-medium text-blue-900 mt-2">Concerns:</p>
                  <p className="text-sm text-foreground italic">"{activePlan.young_person_concerns}"</p>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showForm && <PathwayPlanForm resident={resident} residents={residents.filter(r => calcAge(r.dob) >= 16)} staff={staff} user={user} onClose={() => setShowForm(false)} onSave={() => { qc.invalidateQueries({ queryKey: ["pathway-plans"] }); setShowForm(false); }} />}
      {viewingPlan && <PathwayPlanDetail plan={viewingPlan} resident={resident} onClose={() => setViewingPlan(null)} />}
    </div>
  );
}