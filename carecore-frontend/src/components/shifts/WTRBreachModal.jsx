import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * WTRBreachModal — shown before saving a shift that would cause a WTR breach.
 */
export default function WTRBreachModal({ breaches, staffName, onSaveAnyway, onCancel }) {
  const topBreach = breaches[0];

  let description = "Adding this shift may breach the Working Time Regulations 1998.";
  if (topBreach?.check === "rest_between_shifts") {
    description = `Adding this shift would mean ${staffName} has only ${topBreach.gap_hours}h rest before their ${topBreach.next_shift_date ? `shift on ${topBreach.next_shift_date} at ${topBreach.next_shift_time}` : "next shift"}. UK law requires at least 11 hours rest between shifts.`;
  } else if (topBreach?.check === "24h_rest_per_7_days") {
    description = `${staffName} would have no 24-hour rest period in the 7-day window around this shift (${topBreach.week_start} – ${topBreach.week_end}).`;
  } else if (topBreach?.check === "48h_weekly_average") {
    description = `${staffName}'s average weekly hours (${topBreach.avg_hours}h) already exceeds the 48-hour legal maximum.`;
  } else if (topBreach?.check?.startsWith("young_worker")) {
    description = `${staffName} is under 18. ${topBreach.detail}`;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base">⚠️ Working Time Breach Detected</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {breaches.length > 1 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-red-700">All detected issues:</p>
            {breaches.map((b, i) => (
              <p key={i} className="text-xs text-red-600">• {b.detail}</p>
            ))}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            <strong>Important:</strong> Breaching the Working Time Regulations 1998 may be a criminal offence.
            If you proceed, this override will be logged with your name and timestamp.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" className="flex-1" onClick={onSaveAnyway}>
            Save Anyway
          </Button>
        </div>
      </div>
    </div>
  );
}