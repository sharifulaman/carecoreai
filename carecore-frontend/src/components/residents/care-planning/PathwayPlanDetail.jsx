import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUTORY_AREAS = [
  { key: "health_and_development", label: "Health & Development" },
  { key: "education_training_employment", label: "Education, Training & Employment" },
  { key: "financial_capability", label: "Financial Capability" },
  { key: "accommodation", label: "Accommodation" },
  { key: "family_and_social_relationships", label: "Family & Relationships" },
  { key: "identity_and_self_care", label: "Identity & Self-Care" },
  { key: "emotional_and_behavioural_development", label: "Emotional & Behavioural Development" },
];

export default function PathwayPlanDetail({ plan, resident, onClose }) {
  const handleExportPDF = () => {
    alert("PDF export: Pathway Plan v" + plan.version + " for " + resident?.display_name);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-bold">Pathway Plan (Version {plan.version})</h2>
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

          {/* Personal Adviser */}
          {plan.personal_adviser_name && (
            <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <p className="text-sm font-medium text-blue-900">{plan.personal_adviser_name}</p>
              {plan.personal_adviser_contact && <p className="text-xs text-blue-700 mt-1">{plan.personal_adviser_contact}</p>}
            </div>
          )}

          {/* Statutory Areas */}
          <div>
            <h3 className="font-semibold text-sm mb-3">7 Statutory Areas</h3>
            <div className="space-y-3">
              {STATUTORY_AREAS.map(area => {
                const areaData = plan[area.key];
                return (
                  <details key={area.key} className="border border-border rounded-lg group">
                    <summary className="cursor-pointer flex items-center justify-between p-4 hover:bg-muted/20">
                      <h4 className="font-medium text-sm">{area.label}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${areaData?.support_planned ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {areaData?.support_planned ? "✓ Planned" : "Not completed"}
                      </span>
                    </summary>
                    <div className="px-4 py-3 border-t border-border space-y-2 bg-muted/5">
                      {areaData?.current_situation && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Current Situation</p>
                          <p className="text-sm mt-1">{areaData.current_situation}</p>
                        </div>
                      )}
                      {areaData?.needs && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Needs</p>
                          <p className="text-sm mt-1">{areaData.needs}</p>
                        </div>
                      )}
                      {areaData?.support_planned && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Support Planned</p>
                          <p className="text-sm mt-1">{areaData.support_planned}</p>
                        </div>
                      )}
                      {(areaData?.who_responsible || areaData?.target_date) && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {areaData.who_responsible && <p className="text-muted-foreground">Responsible: <span className="font-medium">{areaData.who_responsible}</span></p>}
                          {areaData.target_date && <p className="text-muted-foreground">Target: <span className="font-medium">{areaData.target_date}</span></p>}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          {/* Contingency */}
          {plan.contingency_plan && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <p className="text-sm font-medium text-amber-900 mb-2">Contingency Plan</p>
              <p className="text-sm text-foreground">{plan.contingency_plan}</p>
            </div>
          )}

          {/* Young Person's Views */}
          {plan.young_person_consulted && (
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-sm mb-3">Young Person's Views</h3>
              <div className="space-y-2 text-sm">
                {plan.young_person_agrees && <p className="text-green-700 font-medium">✓ Young person agrees with plan</p>}
                {plan.young_person_goals && (
                  <div>
                    <p className="text-muted-foreground font-medium">Goals (in own words)</p>
                    <p className="text-foreground italic mt-1">"{plan.young_person_goals}"</p>
                  </div>
                )}
                {plan.young_person_concerns && (
                  <div>
                    <p className="text-muted-foreground font-medium">Concerns</p>
                    <p className="text-foreground italic mt-1">"{plan.young_person_concerns}"</p>
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