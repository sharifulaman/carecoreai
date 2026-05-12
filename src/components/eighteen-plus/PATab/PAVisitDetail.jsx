import { AlertTriangle } from "lucide-react";

const TOPIC_LABELS = {
  pathway_plan_review: "Pathway Plan Review",
  accommodation_plans: "Accommodation Plans",
  education_employment: "Education & Employment",
  health_and_wellbeing: "Health & Wellbeing",
  finances_and_benefits: "Finances & Benefits",
  relationships_and_support: "Relationships & Support",
  identity_and_culture: "Identity & Culture",
  concerns_or_issues: "Concerns or Issues",
  achievements_and_positives: "Achievements & Positives",
  other: "Other",
};

export default function PAVisitDetail({ visit, paDetails, residents }) {
  const resident = residents.find(r => r.id === visit.resident_id);

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{resident?.display_name} — PA Visit</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(visit.visit_date).toLocaleDateString()} at {new Date(visit.visit_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
          {visit.visit_type.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 pb-6 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">PA Name</p>
          <p className="font-medium">{visit.pa_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Duration</p>
          <p className="font-medium">{visit.duration_minutes} minutes</p>
        </div>
        {visit.location && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Location</p>
            <p className="font-medium">{visit.location}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Young Person Present</p>
          <p className="font-medium">{visit.young_person_present ? "Yes" : "No"}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2">Topics Discussed</h4>
          <div className="flex flex-wrap gap-2">
            {visit.topics_discussed?.map(topic => (
              <span key={topic} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {TOPIC_LABELS[topic] || topic}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-6 border-b border-border">
        {visit.young_person_views && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Young Person's Views & Wishes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.young_person_views}</p>
          </div>
        )}

        {visit.key_concerns && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Key Concerns
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.key_concerns}</p>
          </div>
        )}

        {visit.actions_agreed && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Actions Agreed</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.actions_agreed}</p>
          </div>
        )}

        {visit.pa_recommendations && (
          <div>
            <h4 className="font-semibold text-sm mb-2">PA Recommendations</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.pa_recommendations}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Pathway Plan Reviewed</p>
          <p className="font-medium">{visit.pathway_plan_reviewed ? "Yes" : "No"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Update Needed</p>
          <p className="font-medium">{visit.pathway_plan_update_needed ? "Yes" : "No"}</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-medium mb-1">Next Visit Scheduled</p>
        <p className="font-medium">
          {new Date(visit.next_visit_date).toLocaleDateString()} • {visit.next_visit_type.replace(/_/g, " ")}
        </p>
      </div>

      {visit.notes && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium mb-1">Additional Notes</p>
          <p className="text-sm whitespace-pre-wrap">{visit.notes}</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>Recorded by {visit.recorded_by_name} on {new Date(visit.created_date).toLocaleDateString()}</p>
      </div>
    </div>
  );
}