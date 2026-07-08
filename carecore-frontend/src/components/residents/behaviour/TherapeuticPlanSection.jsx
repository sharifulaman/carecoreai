import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, FileText } from "lucide-react";
import TherapeuticPlanForm from "./TherapeuticPlanForm";

function StatusBadge({ status }) {
  const cfg = {
    completed:   { label: "Completed",   cls: "bg-green-100 text-green-700" },
    in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-700" },
    not_started: { label: "Not Started", cls: "bg-gray-100 text-gray-500" },
  };
  const c = cfg[status] || cfg.not_started;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.cls}`}>{c.label}</span>;
}

function calcStatus(r) {
  if (!r) return "not_started";
  const required = ["emotional_needs_summary", "staff_therapeutic_approach", "emotional_regulation_strategies", "therapeutic_goals"];
  if (required.every(k => r[k]?.trim())) return "completed";
  if (Object.values(r).some(v => typeof v === "string" && v.trim())) return "in_progress";
  return "not_started";
}

export default function TherapeuticPlanSection({ residentId, homeId, staffProfile, readOnly = false }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["therapeutic-plan", residentId],
    queryFn: () => secureGateway.filter("TherapeuticPlan", { resident_id: residentId }),
    enabled: !!residentId,
  });

  const openNew = () => { setEditingRecord(null); setModalOpen(true); };
  const openEdit = (rec) => { setEditingRecord(rec); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setEditingRecord(null); };

  return (
    <div>
      {/* Header row */}
      {!readOnly && (
        <div className="flex justify-end mb-3">
          <Button size="sm" className="gap-1.5 text-xs" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> Add Therapeutic Plan
          </Button>
        </div>
      )}

      {/* List view */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No therapeutic plans recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => {
            const status = calcStatus(plan);
            const savedDate = plan.completed_at
              ? new Date(plan.completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : null;
            return (
              <div
                key={plan.id}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/20 border border-border rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge status={status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {plan.therapeutic_goals
                        ? plan.therapeutic_goals.slice(0, 60) + (plan.therapeutic_goals.length > 60 ? "…" : "")
                        : "Therapeutic Plan"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {savedDate ? `Saved ${savedDate}` : "Draft"}
                      {plan.completed_by_name ? ` by ${plan.completed_by_name}` : ""}
                      {plan.review_date ? ` · Review: ${new Date(plan.review_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => openEdit(plan)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {readOnly ? "View" : "Edit"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">
                {editingRecord ? "Edit Therapeutic Plan" : "New Therapeutic Plan"}
              </h2>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>
            {/* Modal body */}
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <TherapeuticPlanForm
                residentId={residentId}
                homeId={homeId}
                staffProfile={staffProfile}
                readOnly={readOnly}
                existingRecord={editingRecord}
                onSaved={handleClose}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}