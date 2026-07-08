import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { useModuleActions } from "@/lib/PermissionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import VacancyForm from "../../hr/VacancyForm";

export default function VacanciesTab({ staff, homes, isAdminOrTL }) {
  const qc = useQueryClient();
  const { canAdd, canEdit, canDelete } = useModuleActions("staff", {
    canAdd: isAdminOrTL,
    canEdit: isAdminOrTL,
    canDelete: isAdminOrTL
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: vacancies = [] } = useQuery({
    queryKey: ["vacancies"],
    queryFn: () => secureGateway.filter("Vacancy", {}),
    staleTime: 5 * 60 * 1000,
  });

  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  const deleteMutation = useMutation({
    mutationFn: (id) => secureGateway.delete("Vacancy", id),
    onSuccess: () => {
      toast.success("Vacancy deleted");
      qc.invalidateQueries({ queryKey: ["vacancies"] });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const handleDeleteVacancy = (vacancy) => {
    confirmDeleteToast(`"${vacancy.vacancy_role}"`, () => {
      deleteMutation.mutate(vacancy.id);
    });
  };

  const openVacancies = vacancies.filter(v => v.status === "open").length;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Vacancies</h3>
          <p className="text-xs text-muted-foreground mt-1">{openVacancies} open positions</p>
        </div>
        {canAdd && (
          <Button onClick={() => { setEditingId(null); setShowForm(true); }} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create Vacancy
          </Button>
        )}
      </div>

      {vacancies.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          No vacancies recorded.
        </div>
      ) : (
        <div className="space-y-3">
          {vacancies.sort((a, b) => (b.vacancy_opened_date || b.created_date)?.localeCompare(a.vacancy_opened_date || a.created_date)).map(vacancy => (
            <div key={vacancy.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold">{vacancy.vacancy_role}</p>
                  <p className="text-xs text-muted-foreground">{homeMap[vacancy.home_id]?.name} • {vacancy.number_of_posts} post(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vacancy.status === "open" ? "bg-green-500/10 text-green-600" : vacancy.status === "filled" ? "bg-blue-500/10 text-blue-600" : vacancy.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}`}>
                    {vacancy.status?.charAt(0).toUpperCase() + vacancy.status?.slice(1)}
                  </span>
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1">
                      {canEdit && <Button variant="ghost" size="sm" onClick={() => { setEditingId(vacancy.id); setShowForm(true); }} className="text-xs h-7">Edit</Button>}
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVacancy(vacancy)} className="text-red-600 hover:text-red-700 h-7">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Opened:</span>
                  <p className="font-medium">{vacancy.vacancy_opened_date ? new Date(vacancy.vacancy_opened_date).toLocaleDateString("en-GB") : "—"}</p>
                </div>
                {vacancy.vacancy_closed_date && (
                  <div>
                    <span className="text-muted-foreground">Closed:</span>
                    <p className="font-medium">{new Date(vacancy.vacancy_closed_date).toLocaleDateString("en-GB")}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Reason:</span>
                  <p className="font-medium capitalize">{vacancy.reason_for_vacancy?.replace(/_/g, " ")}</p>
                </div>
                {vacancy.recruiting_manager_name && (
                  <div>
                    <span className="text-muted-foreground">Recruiting Manager:</span>
                    <p className="font-medium">{vacancy.recruiting_manager_name}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <VacancyForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          onSave={() => {
            qc.invalidateQueries({ queryKey: ["vacancies"] });
            setShowForm(false);
            setEditingId(null);
          }}
          vacancy={editingId ? vacancies.find(v => v.id === editingId) : null}
        />
      )}
    </div>
  );
}