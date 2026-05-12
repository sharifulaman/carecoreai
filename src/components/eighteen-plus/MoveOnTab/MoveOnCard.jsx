import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

export default function MoveOnCard({ resident, home, plan, onClick }) {
  const daysUntilBirthday = useMemo(() => {
    if (!resident.dob) return null;
    const today = new Date();
    const birthDate = new Date(resident.dob);
    const nextBirthday = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBirthday < today) {
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }
    return Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
  }, [resident.dob]);

  const urgency = useMemo(() => {
    if (!daysUntilBirthday) return null;
    if (daysUntilBirthday < 90) return "red";
    if (daysUntilBirthday < 180) return "amber";
    return "green";
  }, [daysUntilBirthday]);

  const checklistItems = plan ? [
    plan.la_agreed,
    plan.accommodation_identified,
    plan.universal_credit_submitted,
    plan.pa_signed_off
  ].filter(Boolean).length : 0;

  const checklistTotal = 4;
  const completePercent = Math.round((checklistItems / checklistTotal) * 100);

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg border-2 bg-white hover:shadow-md transition text-left ${
        urgency === "red" ? "border-red-400" :
        urgency === "amber" ? "border-amber-400" :
        "border-green-400"
      }`}
    >
      <p className="font-medium text-sm truncate">{resident.display_name}</p>
      
      {plan?.target_move_on_date && (
        <p className="text-xs text-muted-foreground mt-1">
          Target: {new Date(plan.target_move_on_date).toLocaleDateString()}
        </p>
      )}

      {daysUntilBirthday !== null && (
        <div className="flex items-center gap-1 mt-1">
          {daysUntilBirthday < 90 && <AlertTriangle className="w-3 h-3 text-red-500" />}
          <p className="text-xs font-medium">
            <span className={
              urgency === "red" ? "text-red-600" :
              urgency === "amber" ? "text-amber-600" :
              "text-green-600"
            }>
              {daysUntilBirthday} days to 21
            </span>
          </p>
        </div>
      )}

      <div className="mt-2">
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${completePercent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{completePercent}% ready</p>
      </div>
    </button>
  );
}