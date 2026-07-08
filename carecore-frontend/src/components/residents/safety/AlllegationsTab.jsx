import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import AllegationForm from "./AllegationForm";
import AllegationDetail from "./AllegationDetail";

export default function AlllegationsTab({ residents, homes, staff, user, isAdminOrTL }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedAllegation, setSelectedAllegation] = useState(null);

  const { data: allegations = [] } = useQuery({
    queryKey: ["allegations", ORG_ID],
    queryFn: () => secureGateway.list("Allegation", { org_id: ORG_ID }),
  });

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const staffMap = Object.fromEntries(staff.map(s => [s.id, s]));
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));

  const openCount = allegations.filter(a => a.status === "open").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Allegations</h3>
        <div className="flex-1" />
        {isAdminOrTL && (
          <Button onClick={() => setShowForm(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Log Allegation
          </Button>
        )}
      </div>

      {/* Alert */}
      {openCount > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700"><strong>{openCount}</strong> open allegation(s) require review</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {allegations.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
            No allegations recorded.
          </div>
        ) : allegations.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedAllegation(a)}
            className="block w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-mono font-semibold text-foreground">{a.allegation_id || "—"}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    a.status === "closed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Against: {a.staff_subject_to_allegation_name || "—"}
                </p>
                <p className="text-xs text-muted-foreground">{homeMap[a.home_id]?.name || "Unknown home"}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.allegation_made_by?.replace(/_/g, " ")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(a.allegation_date).toLocaleDateString("en-GB")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{a.investigation_status}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Modals */}
      {showForm && (
        <AllegationForm
          residents={residents}
          homes={homes}
          staff={staff}
          user={user}
          onClose={() => setShowForm(false)}
          onSave={() => {
            qc.invalidateQueries({ queryKey: ["allegations"] });
            setShowForm(false);
          }}
        />
      )}
      {selectedAllegation && (
        <AllegationDetail
          allegation={selectedAllegation}
          residents={residents}
          homes={homes}
          staff={staff}
          onClose={() => setSelectedAllegation(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ["allegations"] })}
        />
      )}
    </div>
  );
}