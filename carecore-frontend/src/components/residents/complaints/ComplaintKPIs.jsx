import { useMemo } from "react";
import { AlertTriangle, Clock, ThumbsDown, BookOpen, Eye } from "lucide-react";

export default function ComplaintKPIs({ complaints = [] }) {
  const kpis = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const open = complaints.filter(c => ["received", "under_review", "response_issued"].includes(c.status));
    const overdue = open.filter(c => c.target_resolution_date && c.target_resolution_date < today);
    const upheldPartial = complaints.filter(c => ["upheld", "partially_upheld"].includes(c.outcome_complaint_outcome));
    const learningOpen = complaints.filter(c =>
      ["upheld", "partially_upheld"].includes(c.outcome_complaint_outcome) &&
      c.outcome_follow_up_required && !["closed", "resolved"].includes(c.status)
    );
    const awaitingReview = complaints.filter(c =>
      c.outcome_manager_review_status === "pending" && c.outcome_complaint_outcome
    );

    return [
      { label: "Open complaints", value: open.length, color: open.length > 0 ? "text-amber-600" : "text-foreground", border: open.length > 0 ? "border-amber-300" : "border-border", icon: AlertTriangle },
      { label: "Overdue complaints", value: overdue.length, color: overdue.length > 0 ? "text-red-600" : "text-foreground", border: overdue.length > 0 ? "border-red-400" : "border-border", icon: Clock },
      { label: "Upheld / partially upheld", value: upheldPartial.length, color: upheldPartial.length > 0 ? "text-red-600" : "text-foreground", border: upheldPartial.length > 0 ? "border-red-300" : "border-border", icon: ThumbsDown },
      { label: "Learning actions open", value: learningOpen.length, color: learningOpen.length > 0 ? "text-orange-600" : "text-foreground", border: learningOpen.length > 0 ? "border-orange-300" : "border-border", icon: BookOpen },
      { label: "Awaiting manager review", value: awaitingReview.length, color: awaitingReview.length > 0 ? "text-blue-600" : "text-foreground", border: awaitingReview.length > 0 ? "border-blue-300" : "border-border", icon: Eye },
    ];
  }, [complaints]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {kpis.map((k, i) => {
        const Icon = k.icon;
        return (
          <div key={i} className={`bg-card border ${k.border} rounded-xl p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${k.color}`} />
              <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        );
      })}
    </div>
  );
}