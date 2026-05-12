import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCORING_RULES = [
  { category: "Reg44/45 Governance", max: 15, rules: "Monthly visit, actions reviewed, no overdue, Reg45 done" },
  { category: "Missing/Safeguarding/Incidents", max: 20, rules: "No active MFH, return interviews done, incidents reviewed, no overdue safeguarding" },
  { category: "Training/DBS/Supervision", max: 15, rules: "95%+ training, 100% DBS/RTW, supervision current, induction complete" },
  { category: "Plans & Outcomes", max: 15, rules: "Placement, support, pathway (16+), ILS/move-on, outcomes evidence" },
  { category: "Home Environment", max: 10, rules: "Home checks, fire/H&S, maintenance, sleep checks" },
  { category: "Complaints/Voice", max: 10, rules: "None overdue, child views, family feedback, outcomes recorded" },
  { category: "Health/Education/Wellbeing", max: 10, rules: "Appointments, medication, education, leisure, follow-up" },
  { category: "Record Quality", max: 5, rules: "Daily logs, reports signed, no missing fields, audit trail" },
];

const BANDS = [
  { min: 90, max: 100, label: "Strong", color: "bg-green-500" },
  { min: 75, max: 89, label: "Prepared", color: "bg-blue-500" },
  { min: 60, max: 74, label: "Improvement needed", color: "bg-amber-500" },
  { min: 40, max: 59, label: "High risk", color: "bg-orange-500" },
  { min: 0, max: 39, label: "Critical", color: "bg-red-500" },
];

export default function ScoringRulesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full hover:bg-muted"
        onClick={() => setOpen(true)}
        title="View scoring rules"
      >
        <Info className="w-4 h-4 text-muted-foreground" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Ofsted Readiness Scoring</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {/* Scoring Categories */}
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-semibold text-foreground">Categories & Scoring Rules</h3>
              <div className="space-y-2">
                {SCORING_RULES.map((item, i) => (
                  <div key={i} className="text-xs border border-border rounded p-2 bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted-foreground">Max {item.max} pts</span>
                    </div>
                    <p className="text-muted-foreground">{item.rules}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total: 100 points</p>
            </div>

            {/* Bands */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Scoring Bands</h3>
              <div className="space-y-2">
                {BANDS.map((band, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded ${band.color}`} />
                    <span className="text-xs font-medium">{band.min}–{band.max}</span>
                    <span className="text-xs text-muted-foreground">{band.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}