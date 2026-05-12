import { AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NEETActionPanel({ residents, onUpdate }) {
  if (!residents || residents.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" /> NEET Action Plans
      </h3>

      <div className="space-y-4">
        {residents.map((resident) => {
          const daysUntilTarget = resident.currentRecord?.target_date
            ? Math.ceil((new Date(resident.currentRecord.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <div key={resident.id} className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{resident.display_name}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium">
                  NEET since {new Date(resident.currentRecord.recorded_date).toLocaleDateString()}
                </span>
              </div>

              {resident.currentRecord?.barriers?.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">Barriers:</span> {resident.currentRecord.barriers.join(", ")}
                </p>
              )}

              {resident.currentRecord?.target_status && (
                <div className="bg-muted/30 rounded p-2 mb-2">
                  <p className="text-xs"><span className="font-medium">Target:</span> {resident.currentRecord.target_status}</p>
                  {daysUntilTarget !== null && (
                    <p className="text-xs flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {daysUntilTarget > 0
                        ? `Target in ${daysUntilTarget} days`
                        : daysUntilTarget === 0
                        ? "Target due today"
                        : `Target overdue by ${Math.abs(daysUntilTarget)} days`}
                    </p>
                  )}
                </div>
              )}

              {resident.currentRecord?.action_plan && (
                <p className="text-xs text-muted-foreground mb-2 italic">"{resident.currentRecord.action_plan}"</p>
              )}

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Log Contact
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={onUpdate}>
                  Update Plan
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}