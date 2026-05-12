import { useNavigate } from "react-router-dom";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUDIT_SCHEDULE = [
  { key: "d_water", label: "Water Check", freq: "daily" },
  { key: "d_appt", label: "Appointments Check", freq: "daily" },
  { key: "d_office", label: "Office Safety Check", freq: "daily" },
  { key: "d_money", label: "Petty Cash Recording", freq: "daily" },
  { key: "d_univ", label: "University Job Check", freq: "daily" },
  { key: "d_housing", label: "Housing Safety Checks", freq: "daily" },
  { key: "d_snacks", label: "Fridge Snacks", freq: "daily" },
  { key: "d_kitchen", label: "Kitchen Check", freq: "daily" },
  { key: "w_fire", label: "Fire Safety (Weekly)", freq: "weekly" },
  { key: "w_elec", label: "Electrical Safety (Weekly)", freq: "weekly" },
  { key: "w_gas", label: "Gas & CO Safety (Weekly)", freq: "weekly" },
  { key: "w_gen", label: "General Building Safety (Weekly)", freq: "weekly" },
  { key: "w_kitchen", label: "Kitchen & Rooms (Weekly)", freq: "weekly" },
  { key: "w_first", label: "Emergency Preparedness (Weekly)", freq: "weekly" },
  { key: "w_first2", label: "First Aid (Weekly)", freq: "weekly" },
  { key: "w_resi", label: "Bedroom Inspection (Weekly)", freq: "weekly" },
  { key: "m_fire", label: "Fire Safety (Monthly)", freq: "monthly" },
  { key: "m_elec", label: "Electrical Safety (Monthly)", freq: "monthly" },
  { key: "m_gas", label: "Gas & CO Safety (Monthly)", freq: "monthly" },
  { key: "m_gen", label: "Building Safety (Monthly)", freq: "monthly" },
  { key: "m_kitchen", label: "Kitchen & Rooms (Monthly)", freq: "monthly" },
  { key: "m_first", label: "First Aid (Monthly)", freq: "monthly" },
  { key: "m_first2", label: "Emergency Procedures (Monthly)", freq: "monthly" },
  { key: "y_fire", label: "Fire Safety (Yearly)", freq: "yearly" },
  { key: "y_elec", label: "Electrical EICR (Yearly)", freq: "yearly" },
  { key: "y_gas", label: "Gas Safe Certificate (Yearly)", freq: "yearly" },
  { key: "y_building", label: "Building Inspection (Yearly)", freq: "yearly" },
];

function isDue(freq, checks) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (checks.length === 0) return true;
  const last = new Date(checks[0].date); last.setHours(0, 0, 0, 0);
  if (freq === "daily") return last < today;
  if (freq === "weekly") return (today - last) / 86400000 >= 7;
  if (freq === "monthly") return today.getMonth() !== last.getMonth() || today.getFullYear() !== last.getFullYear();
  if (freq === "yearly") return today.getFullYear() !== last.getFullYear();
  return false;
}

export default function MissedAuditsModal({ homes, checks, onClose }) {
  const navigate = useNavigate();

  // FIX 5: Only count missed audits for homes that have at least one HomeCheck recorded.
  // New homes with zero checks should NOT appear as having 100% missed — they simply haven't started yet.
  const homesWithChecks = new Set(checks.map(c => c.home_id));

  const missedByHome = homes
    .filter(home => homesWithChecks.has(home.id)) // exclude homes with no audit history
    .map(home => {
      const homeChecks = checks.filter(c => c.home_id === home.id);
      const missed = AUDIT_SCHEDULE.filter(audit => {
        const forAudit = homeChecks.filter(c => c.type === audit.key).sort((a, b) => b.date.localeCompare(a.date));
        return isDue(audit.freq, forAudit);
      });
      return { home, missed };
    }).filter(h => h.missed.length > 0);

  const totalMissed = missedByHome.reduce((s, h) => s + h.missed.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-base">Missed Audits ({totalMissed})</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {missedByHome.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">All audits are up to date!</p>
            </div>
          ) : missedByHome.map(({ home, missed }) => (
            <div key={home.id} className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40">
                <p className="font-semibold text-sm">{home.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">{missed.length} missed</span>
                  <button onClick={() => { navigate(`/homes/${home.id}`); onClose(); }}
                    className="text-xs text-primary hover:underline">View →</button>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {missed.map(audit => (
                  <div key={audit.key} className="flex items-center gap-2 px-4 py-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      audit.freq === "daily" ? "bg-red-500" :
                      audit.freq === "weekly" ? "bg-amber-500" :
                      audit.freq === "monthly" ? "bg-orange-500" : "bg-purple-500"
                    }`} />
                    <span className="text-xs flex-1">{audit.label}</span>
                    <span className={`text-xs font-medium capitalize ${
                      audit.freq === "daily" ? "text-red-500" :
                      audit.freq === "weekly" ? "text-amber-500" :
                      audit.freq === "monthly" ? "text-orange-500" : "text-purple-500"
                    }`}>{audit.freq}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border">
          <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}