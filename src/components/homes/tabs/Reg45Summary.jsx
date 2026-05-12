import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { toast } from "sonner";

const STANDARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const RATINGS = ["outstanding", "good", "requires_improvement", "inadequate"];

export default function Reg45Summary({ reports, home, onClose }) {
  const summary = useMemo(() => {
    const ratingCounts = {};
    const standardRatings = {};
    const recommendations = [];
    const actioned = { actioned: 0, in_progress: 0, not_actioned: 0 };

    // Count ratings
    reports.forEach(r => {
      if (r.overall_rating) {
        ratingCounts[r.overall_rating] = (ratingCounts[r.overall_rating] || 0) + 1;
      }

      // Standard ratings
      r.quality_standards?.forEach(s => {
        if (!standardRatings[s.standard_number]) standardRatings[s.standard_number] = [];
        standardRatings[s.standard_number].push(s.rating);
      });

      // Recommendations
      r.new_recommendations?.forEach(rec => recommendations.push(rec));

      // Previous recommendations status
      r.previous_recommendations_actioned?.forEach(prev => {
        if (prev.status === "actioned") actioned.actioned++;
        else if (prev.status === "in_progress") actioned.in_progress++;
        else actioned.not_actioned++;
      });
    });

    return { ratingCounts, standardRatings, recommendations, actioned, totalReports: reports.length };
  }, [reports]);

  const handleExport = () => {
    const doc = `
REGULATION 45 ANNUAL REVIEW SUMMARY
Home: ${home.name}
Period: 12 Months (${reports.length} Regulation 44 Reports)
Generated: ${new Date().toLocaleDateString("en-GB")}

OVERALL RATINGS ACROSS ALL VISITS
${RATINGS.map(r => `${r.toUpperCase()}: ${summary.ratingCounts[r] || 0}`).join("\n")}

QUALITY STANDARDS ASSESSMENT
${STANDARDS.map(num => {
  const ratings = summary.standardRatings[num] || [];
  return `Standard ${num}: ${ratings.length > 0 ? ratings.map(r => r[0].toUpperCase()).join(", ") : "No data"}`;
}).join("\n")}

RECOMMENDATIONS
Total: ${summary.recommendations.length}
${summary.recommendations.map(r => `- ${r.recommendation} (${r.priority} priority, due ${r.target_date})`).join("\n")}

PREVIOUS RECOMMENDATIONS STATUS
Actioned: ${summary.actioned.actioned}
In Progress: ${summary.actioned.in_progress}
Not Actioned: ${summary.actioned.not_actioned}

TREND ANALYSIS
- ${summary.totalReports} visits completed in 12-month period
- Consistency of ratings indicates ${summary.ratingCounts.good && summary.ratingCounts.good > summary.ratingCounts.requires_improvement ? "stable or improving" : "area for focus"}
- ${summary.recommendations.length} recommendations made across all areas
    `.trim();

    const blob = new Blob([doc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reg45-Summary-${home.name}-${new Date().getFullYear()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reg45 summary exported");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Regulation 45 Annual Review Summary</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-blue-900">{summary.totalReports} Regulation 44 reports from past 12 months</p>
            <p className="text-xs text-blue-800 mt-1">This summary forms the basis of your Regulation 45 annual review document.</p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Overall Ratings</h3>
            <div className="space-y-1 text-sm">
              {RATINGS.map(r => (
                <div key={r} className="flex items-center justify-between">
                  <span className="capitalize">{r}</span>
                  <span className="font-medium">{summary.ratingCounts[r] || 0} visits</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Quality Standards Ratings Trend</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {STANDARDS.map(num => (
                <div key={num} className="border border-border rounded p-2">
                  <p className="font-medium">Standard {num}</p>
                  <p className="text-muted-foreground">{(summary.standardRatings[num] || []).length} ratings</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Recommendations Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span>Total recommendations made</span>
                <span className="font-medium">{summary.recommendations.length}</span>
              </div>
              <div className="flex items-center justify-between text-green-700">
                <span>✓ Actioned</span>
                <span className="font-medium">{summary.actioned.actioned}</span>
              </div>
              <div className="flex items-center justify-between text-amber-700">
                <span>⏳ In Progress</span>
                <span className="font-medium">{summary.actioned.in_progress}</span>
              </div>
              <div className="flex items-center justify-between text-red-700">
                <span>✗ Not Actioned</span>
                <span className="font-medium">{summary.actioned.not_actioned}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Trend Analysis</h3>
            <p className="text-sm text-muted-foreground">
              {summary.ratingCounts.good && summary.ratingCounts.good > summary.ratingCounts.requires_improvement
                ? "✓ Stable or improving ratings across the year"
                : "⚠️ Focus areas identified in compliance ratings"}
            </p>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleExport} className="gap-1"><Download className="w-4 h-4" /> Export Summary</Button>
        </div>
      </div>
    </div>
  );
}