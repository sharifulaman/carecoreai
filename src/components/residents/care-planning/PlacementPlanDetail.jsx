import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlacementPlanDetail({ plan, resident, onClose }) {
  const handleExportPDF = () => {
    // Placeholder for PDF generation (would use jsPDF or similar)
    alert("PDF export: Placement Plan v" + plan.version + " for " + resident?.display_name);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-bold">Placement Plan (Version {plan.version})</h2>
            <p className="text-xs text-muted-foreground">{resident?.display_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1"><Download className="w-4 h-4" /> PDF</Button>
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Status & Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground font-medium">Status</p>
              <p className="text-sm font-medium mt-1 capitalize">{plan.status}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground font-medium">Effective Date</p>
              <p className="text-sm font-medium mt-1">{plan.effective_date}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground font-medium">Review Date</p>
              <p className="text-sm font-medium mt-1">{plan.review_date}</p>
            </div>
          </div>

          {/* Reason */}
          {plan.reason_for_placement && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Reason for Placement</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{plan.reason_for_placement}</p>
            </div>
          )}

          {/* Placement Details */}
          <div className="grid grid-cols-2 gap-3">
            {plan.placement_type && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Placement Type</p>
                <p className="text-sm mt-1">{plan.placement_type}</p>
              </div>
            )}
            {plan.planned_duration && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Planned Duration</p>
                <p className="text-sm mt-1">{plan.planned_duration}</p>
              </div>
            )}
            {plan.number_of_placements_12_months !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Placements (12 months)</p>
                <p className="text-sm mt-1">{plan.number_of_placements_12_months}</p>
              </div>
            )}
            {plan.emergency_placement && (
              <div className="text-xs text-amber-700 font-medium bg-amber-50 p-2 rounded">⚠️ Emergency Placement</div>
            )}
          </div>

          {/* Goals */}
          {plan.goals && plan.goals.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3">Goals ({plan.goals.length})</h3>
              <div className="space-y-2">
                {plan.goals.map((g, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-sm capitalize">{g.goal_area}</p>
                        <p className="text-sm text-foreground mt-1">{g.description}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium ${
                        g.progress === "achieved" ? "bg-green-100 text-green-700" :
                        g.progress === "in_progress" ? "bg-blue-100 text-blue-700" :
                        g.progress === "not_achieved" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {g.progress?.replace(/_/g, " ") || "—"}
                      </span>
                    </div>
                    {g.target_date && <p className="text-xs text-muted-foreground">Target: {g.target_date}</p>}
                    {g.responsible_person && <p className="text-xs text-muted-foreground">Responsible: {g.responsible_person}</p>}
                    {g.progress_notes && <p className="text-xs text-foreground mt-1 italic">"{g.progress_notes}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key People */}
          {(plan.social_worker_name || plan.iro_name) && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Key People</h3>
              <div className="space-y-2">
                {plan.social_worker_name && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Social Worker: <span className="font-medium text-foreground">{plan.social_worker_name}</span></p>
                    {plan.social_worker_contact && <p className="text-xs text-muted-foreground">{plan.social_worker_contact}</p>}
                  </div>
                )}
                {plan.iro_name && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">IRO: <span className="font-medium text-foreground">{plan.iro_name}</span></p>
                    {plan.iro_contact && <p className="text-xs text-muted-foreground">{plan.iro_contact}</p>}
                  </div>
                )}
                {plan.la_area && <p className="text-sm text-muted-foreground">Local Authority: {plan.la_area}</p>}
              </div>
            </div>
          )}

          {/* Risk */}
          {plan.risk_of_breakdown && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-700 mb-2">⚠️ Risk of Breakdown</p>
              {plan.breakdown_risk_notes && <p className="text-sm text-amber-700 mb-2">{plan.breakdown_risk_notes}</p>}
              {plan.contingency_plan && (
                <>
                  <p className="text-sm font-medium text-amber-700 mt-3 mb-1">Contingency Plan</p>
                  <p className="text-sm text-amber-700">{plan.contingency_plan}</p>
                </>
              )}
            </div>
          )}

          {/* Consultation */}
          {(plan.child_consulted || plan.parent_consulted) && (
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-sm mb-2">Consultation</h3>
              <div className="space-y-2 text-sm">
                {plan.child_consulted && (
                  <div>
                    <p className="text-muted-foreground">Child: {plan.child_agrees ? "✓ Agrees" : "Does not agree"}</p>
                    {plan.child_comments && <p className="text-foreground italic">"{plan.child_comments}"</p>}
                  </div>
                )}
                {plan.parent_consulted && (
                  <div>
                    <p className="text-muted-foreground">Parents/Carers: Consulted</p>
                    {plan.parent_comments && <p className="text-foreground italic">"{plan.parent_comments}"</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}