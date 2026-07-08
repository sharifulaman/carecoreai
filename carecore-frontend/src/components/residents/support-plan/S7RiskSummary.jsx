import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { key: "suicide_self_harm", label: "Suicide / Self-harm" },
  { key: "harm_to_others", label: "Harm to Others" },
  { key: "vulnerability", label: "Vulnerability" },
  { key: "criminal_exploitation", label: "Criminal Exploitation" },
  { key: "sexual_exploitation", label: "Sexual Exploitation" },
  { key: "missing_from_care", label: "Missing from Care" },
  { key: "substance_misuse", label: "Substance Misuse" },
  { key: "communication_language", label: "Communication / Language" },
  { key: "online_safety", label: "Online Safety" },
];

const RATING_BADGE = {
  none: "bg-gray-100 text-gray-500",
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  unknown: "bg-blue-100 text-blue-600",
};

export function getRiskStatus(assessments) {
  if (!assessments || assessments.length === 0) return "not_started";
  if (assessments.length >= CATEGORIES.length) return "completed";
  return "in_progress";
}

export default function S7RiskSummary({ residentId, onNavigateToTab }) {
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["risk-assessments-sp", residentId],
    queryFn: () => secureGateway.filter("RiskAssessment", { resident_id: residentId }),
    enabled: !!residentId,
  });

  if (isLoading) return <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>;

  const byCategory = Object.fromEntries(assessments.map(a => [a.category, a]));
  const assessed = assessments.length;
  const nextReview = assessments
    .filter(a => a.review_date)
    .sort((a, b) => a.review_date.localeCompare(b.review_date))[0]?.review_date;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{assessed} / {CATEGORIES.length} categories assessed</span>
        {nextReview && (
          <span className="text-xs text-muted-foreground">Next review: {new Date(nextReview).toLocaleDateString("en-GB")}</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CATEGORIES.map(cat => {
          const rec = byCategory[cat.key];
          const rating = rec?.overall_rating || "unknown";
          return (
            <div key={cat.key} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/10">
              <span className="text-xs">{cat.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RATING_BADGE[rating]}`}>
                {rec ? rating : "Not assessed"}
              </span>
            </div>
          );
        })}
      </div>

      <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("risk-assessment")}>
        Go to Risk Assessment tab →
      </Button>
    </div>
  );
}