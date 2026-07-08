import { useMemo } from "react";
import { BookOpen, TrendingUp, AlertCircle, Clock, Star } from "lucide-react";

const THIS_MONTH_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const SKILL_LEVEL_RANK = { not_started: 0, basic: 1, developing: 2, confident: 3, independent: 4 };

export default function ILSOutcomeKPIs({ sessions = [], residents = [] }) {
  const kpis = useMemo(() => {
    const active = sessions.filter(s => !s.is_deleted);

    const sessionsTM = active.filter(s => new Date(s.session_date) >= THIS_MONTH_START).length;

    const improvedYPs = new Set(
      active.filter(s =>
        s.skill_level_before && s.skill_level_after &&
        SKILL_LEVEL_RANK[s.skill_level_after] > SKILL_LEVEL_RANK[s.skill_level_before]
      ).map(s => s.resident_id)
    ).size;

    const activeResidentIds = new Set(residents.filter(r => r.status === "active").map(r => r.id));
    const ypWithSessionTM = new Set(
      active.filter(s => new Date(s.session_date) >= THIS_MONTH_START).map(s => s.resident_id)
    );
    const noProgressTM = [...activeResidentIds].filter(id => !ypWithSessionTM.has(id)).length;

    const today = new Date().toISOString().split("T")[0];
    const followUpsOverdue = active.filter(s =>
      s.follow_up_required &&
      s.review_date &&
      s.review_date < today &&
      s.manager_review_status !== "closed"
    ).length;

    const independentSkills = active.filter(s =>
      s.skill_level_after === "independent" || s.support_still_needed === "independent"
    ).length;

    return [
      { label: "Sessions this month", value: sessionsTM, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
      { label: "YP with improved skill", value: improvedYPs, icon: TrendingUp, color: improvedYPs > 0 ? "text-green-600" : "text-slate-400", bg: improvedYPs > 0 ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200" },
      { label: "No ILS recorded (this month)", value: noProgressTM, icon: AlertCircle, color: noProgressTM > 0 ? "text-amber-600" : "text-slate-400", bg: noProgressTM > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200" },
      { label: "Follow-ups overdue", value: followUpsOverdue, icon: Clock, color: followUpsOverdue > 0 ? "text-red-600" : "text-slate-400", bg: followUpsOverdue > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200" },
      { label: "Skills now independent", value: independentSkills, icon: Star, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
    ];
  }, [sessions, residents]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className={`rounded-xl border p-3 flex flex-col gap-1 ${kpi.bg}`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 shrink-0 ${kpi.color}`} />
              <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
          </div>
        );
      })}
    </div>
  );
}