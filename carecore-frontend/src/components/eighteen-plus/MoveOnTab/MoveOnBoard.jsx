import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import MoveOnCard from "./MoveOnCard";
import { ChevronRight } from "lucide-react";

const STAGES = [
  { key: "no_plan", label: "Planning", color: "bg-slate-50 border-slate-200" },
  { key: "planning", label: "Planning", color: "bg-slate-50 border-slate-200" },
  { key: "accommodation_found", label: "Accommodation Found", color: "bg-blue-50 border-blue-200" },
  { key: "benefits_ready", label: "Benefits Ready", color: "bg-amber-50 border-amber-200" },
  { key: "confirmed", label: "Confirmed", color: "bg-green-50 border-green-200" },
  { key: "moved_out", label: "Moved Out", color: "bg-purple-50 border-purple-200" }
];

export default function MoveOnBoard({ residents, homes, onSelectResident }) {
  const { data: plans = [] } = useQuery({
    queryKey: ["move-on-plans"],
    queryFn: () => secureGateway.filter("MoveOnPlan", {}, "-updated_date", 500),
  });

  const board = useMemo(() => {
    const columns = {};
    STAGES.forEach(stage => {
      columns[stage.key] = [];
    });

    residents.forEach(r => {
      const plan = plans.find(p => p.resident_id === r.id);
      const status = plan?.status || "no_plan";
      if (columns[status]) {
        columns[status].push({ resident: r, plan });
      }
    });

    return Object.entries(columns).map(([status, items]) => {
      const stage = STAGES.find(s => s.key === status);
      return { ...stage, status, items };
    });
  }, [residents, plans]);

  return (
    <div className="space-y-6">
      {/* Pipeline Stages */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STAGES.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-2 min-w-max">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${stage.color}`}>
              {stage.label}
            </div>
            {i < STAGES.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {board.map(column => (
          <div key={column.status} className={`rounded-lg border-2 p-3 min-h-96 ${column.color}`}>
            <h3 className="font-semibold text-sm mb-3">{column.label}</h3>
            <div className="space-y-2">
              {column.items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">None</p>
              ) : (
                column.items.map(({ resident, plan }) => (
                  <MoveOnCard
                    key={resident.id}
                    resident={resident}
                    home={homes.find(h => h.id === resident.home_id)}
                    plan={plan}
                    onClick={() => onSelectResident(resident)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}