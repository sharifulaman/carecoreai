import { ChevronRight } from "lucide-react";
import { differenceInYears, parseISO } from "date-fns";

const WELLBEING_COLORS = {
  Well: "bg-green-100 text-green-700",
  Tired: "bg-amber-100 text-amber-700",
  Unwell: "bg-red-100 text-red-700",
  Anxious: "bg-purple-100 text-purple-700",
};

const RISK_COLORS = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-800",
};

function getBadge(resident) {
  if (resident.risk_level === "high" || resident.risk_level === "critical") return { label: "Behaviour Risk", color: "bg-red-100 text-red-600" };
  const health = resident.medical_conditions?.[0]?.condition;
  if (health) return { label: health, color: "bg-orange-100 text-orange-600" };
  if (resident.allergies?.length) return { label: `Allergy (${resident.allergies[0]?.allergen})`, color: "bg-amber-100 text-amber-700" };
  return null;
}

export default function SWMyYoungPeople({ residents, homes, onViewAll, onViewResident }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-sm">My Young People</h3>
        <button onClick={onViewAll} className="text-xs text-blue-500 font-semibold hover:underline">View all</button>
      </div>

      {residents.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No young people assigned.</p>
      ) : (
        <div className="space-y-2">
          {residents.slice(0, 6).map((r) => {
            const age = r.dob ? differenceInYears(new Date(), parseISO(r.dob)) : null;
            const badge = getBadge(r);
            const home = homes.find(h => h.id === r.home_id);
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer group"
                onClick={() => onViewResident(r)}
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0 overflow-hidden">
                  {r.photo_url ? <img src={r.photo_url} alt={r.display_name} className="w-full h-full object-cover" /> : (r.initials || r.display_name?.charAt(0) || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{r.display_name}</p>
                  <p className="text-xs text-slate-400">{age ? `${age} · ` : ""}{home?.name || "—"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">Well</span>
                  {badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>{badge.label}</span>}
                </div>
                <div className="text-xs text-slate-400 text-right shrink-0 ml-1">
                  <p>Next: Med 12:00</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}