import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";

const LEVEL_LABELS = {
  no_awareness: "No awareness",
  developing: "Developing",
  needs_support: "Needs support",
  independent_with_prompts: "Independent with prompts",
  fully_independent: "Fully independent",
};

export function getILSStatus(plans) {
  if (!plans || plans.length === 0) return "not_started";
  const plan = plans[0];
  if (plan?.status === "active") return "completed";
  return "in_progress";
}

export default function S8ILSSummary({ residentId, onNavigateToTab }) {
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["ils-plans-sp", residentId],
    queryFn: () => base44.entities.ILSPlan.filter({ org_id: ORG_ID, resident_id: residentId }),
    enabled: !!residentId,
  });

  const activePlan = allPlans.find(p => p.status === "active") || allPlans[0] || null;

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["ils-sections-sp", activePlan?.id],
    queryFn: () => base44.entities.ILSPlanSection.filter({ ils_plan_id: activePlan.id }),
    enabled: !!activePlan?.id,
  });

  if (plansLoading || sectionsLoading) return <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>;

  if (!activePlan) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground italic">No ILS plan recorded for this resident.</p>
        <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("ils-plans")}>Go to ILS Plans tab →</Button>
      </div>
    );
  }

  const totalSections = sections.length;
  const avgProgress = totalSections > 0
    ? Math.round(sections.reduce((s, x) => s + (x.progress_percentage || 0), 0) / totalSections)
    : 0;
  const highProgress = sections.filter(s => (s.progress_percentage || 0) >= 70).length;
  const nextTarget = sections
    .filter(s => s.target_date)
    .sort((a, b) => a.target_date.localeCompare(b.target_date))[0]?.target_date;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xl font-bold text-primary">{totalSections}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Skill areas</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xl font-bold text-green-600">{avgProgress}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Avg progress</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xl font-bold text-blue-600">{highProgress}</p>
          <p className="text-xs text-muted-foreground mt-0.5">≥70% progress</p>
        </div>
      </div>

      {sections.length > 0 && (
        <div className="space-y-1.5">
          {sections.slice(0, 6).map(s => {
            const label = s.skill_area === "custom" ? (s.custom_skill_name || "Custom") : (s.skill_area?.charAt(0).toUpperCase() + s.skill_area?.slice(1) || "—");
            const pct = s.progress_percentage || 0;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs w-28 truncate">{label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {nextTarget && (
        <p className="text-xs text-muted-foreground">Next target date: {new Date(nextTarget).toLocaleDateString("en-GB")}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        <span className="capitalize">Status: <strong>{activePlan.status}</strong></span>
        {activePlan.review_due_date && <span>Review due: {new Date(activePlan.review_due_date).toLocaleDateString("en-GB")}</span>}
      </div>

      <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("ils-plans")}>
        Go to ILS Plans tab →
      </Button>
    </div>
  );
}