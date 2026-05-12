import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import BodyMapForm from "./BodyMapForm";
import BodyMapDetail from "./BodyMapDetail";

export default function BodyMapSection({ resident, user, staff }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: bodyMaps = [] } = useQuery({
    queryKey: ["body-maps", resident.id],
    queryFn: () => secureGateway.filter("BodyMap", { resident_id: resident.id }, "-recorded_datetime", 50),
  });

  const concernRecords = bodyMaps.filter(bm => bm.safeguarding_concern);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Body Maps</h3>
          <p className="text-xs text-muted-foreground">{bodyMaps.length} record(s)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
          <Plus className="w-4 h-4" /> New Body Map
        </Button>
      </div>

      {/* Safety Alert */}
      {concernRecords.length > 0 && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex gap-2">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
          <p className="text-sm text-red-700"><strong>{concernRecords.length} body map(s) with safeguarding concern flagged</strong></p>
        </div>
      )}

      {/* Records List */}
      {bodyMaps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No body maps recorded yet.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Recorded By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Marks</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Concern</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {bodyMaps.map(bm => (
                <tr key={bm.id} onClick={() => setSelectedRecord(bm)} className="border-b border-border/50 last:border-0 hover:bg-muted/20 cursor-pointer">
                  <td className="px-4 py-3 text-xs">{new Date(bm.recorded_datetime).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3 text-xs">{bm.recorded_by_name}</td>
                  <td className="px-4 py-3 text-xs">{bm.marks?.length || 0}</td>
                  <td className="px-4 py-3">
                    {bm.safeguarding_concern ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">Yes</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{bm.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <BodyMapForm
          resident={resident}
          staff={staff}
          user={user}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["body-maps", resident.id] });
          }}
        />
      )}

      {/* Detail Panel */}
      {selectedRecord && (
        <BodyMapDetail
          record={selectedRecord}
          resident={resident}
          onClose={() => setSelectedRecord(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ["body-maps", resident.id] })}
        />
      )}
    </div>
  );
}