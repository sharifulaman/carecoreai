import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PathwayPlansTabMain({ residents, homes }) {
  const { data: pathwayPlans = [] } = useQuery({
    queryKey: ["pathway-plans"],
    queryFn: () => base44.entities.PathwayPlan.filter({}, "-review_date", 500),
  });

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  // Calculate compliance
  const withCurrentPlan = residents.filter(r => {
    const plan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
    return plan && new Date(plan.review_date) > new Date();
  }).length;

  const needsReview = residents.filter(r => {
    const plan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
    if (!plan) return true;
    const daysUntilReview = Math.ceil((new Date(plan.review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilReview <= 0;
  }).length;

  const dueWithin4Weeks = residents.filter(r => {
    const plan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
    if (!plan) return false;
    const daysUntilReview = Math.ceil((new Date(plan.review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilReview > 0 && daysUntilReview <= 28;
  }).length;

  // Rows
  const rows = residents
    .map(r => {
      const plan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
      const daysUntilReview = plan ? Math.ceil((new Date(plan.review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      const ilsPlans = []; // Would fetch from ILSPlan
      const avgILS = ilsPlans.length > 0 ? Math.round(ilsPlans.reduce((sum, p) => sum + (p.overall_score || 0), 0) / ilsPlans.length) : 0;

      return {
        resident: r,
        plan,
        daysUntilReview,
        avgILS,
      };
    })
    .sort((a, b) => {
      // Sort: no plan first, then overdue, then due soon
      if (!a.plan && b.plan) return -1;
      if (a.plan && !b.plan) return 1;
      if (!a.plan && !b.plan) return 0;
      const aOverdue = a.daysUntilReview <= 0;
      const bOverdue = b.daysUntilReview <= 0;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return a.daysUntilReview - b.daysUntilReview;
    });

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {needsReview > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> OVERDUE Reviews
          </h3>
          <p className="text-sm text-red-800">
            {needsReview} resident{needsReview !== 1 ? "s" : ""} have Pathway Plan reviews that are OVERDUE.
          </p>
        </div>
      )}

      {dueWithin4Weeks > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Due Soon
          </h3>
          <p className="text-sm text-amber-800">
            {dueWithin4Weeks} resident{dueWithin4Weeks !== 1 ? "s" : ""} have reviews due within 4 weeks.
          </p>
        </div>
      )}

      {/* Compliance Summary */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm">
          <span className="font-semibold">{withCurrentPlan} of {residents.length}</span> residents have a current Pathway Plan.
          {residents.filter(r => !pathwayPlans.find(p => p.resident_id === r.id && p.status === "active")).length > 0 && (
            <span className="ml-4 text-red-600 font-medium">
              {residents.filter(r => !pathwayPlans.find(p => p.resident_id === r.id && p.status === "active")).length} plans required.
            </span>
          )}
        </p>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">Resident</th>
              <th className="text-left px-4 py-3 font-semibold">Age</th>
              <th className="text-left px-4 py-3 font-semibold">Version</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Last Review</th>
              <th className="text-left px-4 py-3 font-semibold">Next Review</th>
              <th className="text-left px-4 py-3 font-semibold">Tenancy Ready</th>
              <th className="text-left px-4 py-3 font-semibold">ILS Score</th>
              <th className="text-right px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const calcAge = (dob) => {
                if (!dob) return "—";
                const d = new Date(dob);
                const today = new Date();
                let age = today.getFullYear() - d.getFullYear();
                if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
                return age;
              };

              const tenancyStatus = row.plan?.tenancy_ready ? "✓ Ready" : "⚠ Not assessed";
              const reviewStatus = !row.plan
                ? "No Plan"
                : row.daysUntilReview <= 0
                ? "OVERDUE"
                : row.daysUntilReview <= 28
                ? "Due Soon"
                : "On Track";

              return (
                <tr key={row.resident.id} className={`border-b border-border last:border-0 hover:bg-muted/50 ${!row.plan ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3 font-medium">{row.resident.display_name || row.resident.initials}</td>
                  <td className="px-4 py-3 text-xs">{calcAge(row.resident.dob)}</td>
                  <td className="px-4 py-3 text-xs">{row.plan?.version || "—"}</td>
                  <td className="px-4 py-3 text-xs">{row.plan?.status || "—"}</td>
                  <td className="px-4 py-3 text-xs">{row.plan?.effective_date ? new Date(row.plan.effective_date).toLocaleDateString() : "—"}</td>
                  <td className={`px-4 py-3 text-xs ${row.daysUntilReview && row.daysUntilReview <= 0 ? "text-red-600 font-medium" : ""}`}>
                    {row.plan?.review_date ? new Date(row.plan.review_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{tenancyStatus}</td>
                  <td className="px-4 py-3">{row.avgILS > 0 ? `${row.avgILS}%` : "—"}</td>
                  <td className="px-4 py-3 text-right flex gap-1 justify-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      reviewStatus === "OVERDUE" ? "bg-red-500/10 text-red-600" :
                      reviewStatus === "Due Soon" ? "bg-amber-500/10 text-amber-600" :
                      !row.plan ? "bg-red-500/10 text-red-600" :
                      "bg-green-500/10 text-green-600"
                    }`}>
                      {reviewStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Button */}
      <Button className="gap-2">
        <Plus className="w-4 h-4" /> Create New Plan
      </Button>
    </div>
  );
}