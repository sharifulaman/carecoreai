import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { AlertTriangle, TrendingUp } from "lucide-react";

function complianceColor(actual, contracted) {
  if (!contracted || contracted === 0) return "bg-gray-100 text-gray-700";
  const percentage = (actual / contracted) * 100;
  if (percentage >= 100) return "bg-green-100 text-green-700";
  if (percentage >= 80) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function complianceBadge(actual, contracted) {
  if (!contracted || contracted === 0) return "—";
  const percentage = Math.round((actual / contracted) * 100);
  if (percentage >= 100) return `✓ ${percentage}%`;
  if (percentage >= 80) return `⚠️ ${percentage}%`;
  return `✗ ${percentage}%`;
}

export default function VisitFrequencyMonitor({ home, residents }) {
  const [selectedResident, setSelectedResident] = useState(null);

  const { data: visitReports = [] } = useQuery({
    queryKey: ["visit-reports", home?.id],
    queryFn: () => secureGateway.filter("VisitReport", { home_id: home?.id }, "-date", 500),
  });

  const complianceData = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const data = residents
      .filter(r => r.contracted_visits_per_week && r.contracted_visits_per_week > 0)
      .map(r => {
        const visitsFor = (startDate) => visitReports.filter(
          v => v.resident_id === r.id && new Date(v.date) >= startDate
        ).length;

        const visits7 = visitsFor(sevenDaysAgo);
        const visits30 = visitsFor(thirtyDaysAgo);

        return {
          id: r.id,
          name: r.display_name,
          contracted: r.contracted_visits_per_week,
          actual7d: visits7,
          actual30d: visits30,
          compliant7d: visits7 >= r.contracted_visits_per_week,
          compliant30d: visits30 >= (r.contracted_visits_per_week * 4.3),
        };
      });

    return data;
  }, [residents, visitReports]);

  const overallCompliance = useMemo(() => {
    const compliant = complianceData.filter(r => r.compliant30d).length;
    return { compliant, total: complianceData.length };
  }, [complianceData]);

  const missedVisits = useMemo(() => {
    const now = new Date();
    return complianceData.filter(r => {
      const daysSinceLastVisit = Math.floor(
        (now - new Date(visitReports.find(v => v.resident_id === r.id)?.date || now).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysAllowed = Math.ceil(7 / r.contracted);
      return daysSinceLastVisit > daysAllowed;
    });
  }, [complianceData, visitReports]);

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {missedVisits.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-red-800">Missed Visit Alerts</h3>
              <div className="mt-2 space-y-1">
                {missedVisits.map(r => (
                  <p key={r.id} className="text-xs text-red-700">
                    {r.name} — No visit in {Math.ceil(7 / r.contracted)} days (contracted: {r.contracted}/week)
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overall Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-semibold text-blue-900">
          {home.name}: {overallCompliance.compliant} of {overallCompliance.total} residents meeting contracted visit frequency
        </p>
      </div>

      {/* Resident Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {complianceData.map(resident => (
          <div
            key={resident.id}
            onClick={() => setSelectedResident(selectedResident === resident.id ? null : resident.id)}
            className="border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm">{resident.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${complianceColor(resident.actual30d, resident.contracted * 4.3)}`}>
                {complianceBadge(resident.actual30d, resident.contracted * 4.3)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white rounded p-2 border border-border/50">
                <p className="text-muted-foreground">Contracted</p>
                <p className="font-bold">{resident.contracted}/week</p>
              </div>
              <div className="bg-white rounded p-2 border border-border/50">
                <p className="text-muted-foreground">Last 7 days</p>
                <p className={`font-bold ${resident.compliant7d ? "text-green-700" : "text-red-700"}`}>{resident.actual7d} visits</p>
              </div>
            </div>

            {selectedResident === resident.id && (
              <div className="mt-3 pt-3 border-t border-border/50 text-xs space-y-1">
                <p><span className="text-muted-foreground">Last 30 days:</span> <span className="font-bold">{resident.actual30d} visits</span></p>
                <p><span className="text-muted-foreground">30-day target:</span> <span className="font-bold">~{Math.round(resident.contracted * 4.3)}</span></p>
              </div>
            )}
          </div>
        ))}
      </div>

      {complianceData.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No outreach residents with contracted visit frequency set.
        </p>
      )}
    </div>
  );
}