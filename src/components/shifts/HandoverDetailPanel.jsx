import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Flag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const MOOD_LABELS = { good: "Good", settled: "Settled", anxious: "Anxious", low: "Low", agitated: "Agitated", distressed: "Distressed" };
const MOOD_COLORS = { good: "text-green-600", settled: "text-blue-600", anxious: "text-amber-600", low: "text-orange-600", agitated: "text-red-500", distressed: "text-red-700" };
const LOCATION_LABELS = { in_home: "In Home", out: "Out", hospital: "Hospital", school: "School", other: "Other" };
const FLAG_BADGE = { low: "bg-yellow-100 text-yellow-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };

export default function HandoverDetailPanel({ handover, staffMap, shiftMap, myStaffProfile, onClose }) {
  const queryClient = useQueryClient();

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-handover", handover.home_id],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, home_id: handover.home_id }),
    enabled: !!handover.home_id,
  });

  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));
  const writer = staffMap[handover.written_by];
  const incoming = staffMap[handover.incoming_staff_id];
  const acknowledger = staffMap[handover.acknowledged_by];
  const shift = shiftMap[handover.shift_id];

  const canAcknowledge = !handover.acknowledged_by && myStaffProfile?.id === handover.incoming_staff_id;

  const acknowledgeMutation = useMutation({
    mutationFn: () => base44.entities.ShiftHandover.update(handover.id, {
      acknowledged_by: myStaffProfile.id,
      acknowledged_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handovers"] });
      toast.success("Handover acknowledged");
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-[520px] h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold">Shift Handover</h2>
            <p className="text-sm text-muted-foreground">
              {shift?.date && new Date(shift.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              {shift?.shift_type && ` · ${shift.shift_type} shift`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Written by</p><p className="font-medium">{writer?.full_name || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Handed to</p><p className="font-medium">{incoming?.full_name || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Submitted</p><p>{handover.handover_datetime ? new Date(handover.handover_datetime).toLocaleString("en-GB") : "—"}</p></div>
            <div>
              <p className="text-xs text-muted-foreground">Acknowledged</p>
              {handover.acknowledged_by ? (
                <p className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {acknowledger?.full_name || "Yes"}</p>
              ) : (
                <p className="text-amber-600">Pending</p>
              )}
            </div>
          </div>

          {/* Flags */}
          {handover.flagged && (
            <div className={`flex items-start gap-2 rounded-lg border p-3 ${FLAG_BADGE[handover.flag_severity] || "bg-amber-50 border-amber-200"}`}>
              <Flag className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium capitalize">{handover.flag_severity} severity flag</p>
                <p className="text-sm">{handover.flag_reason}</p>
              </div>
            </div>
          )}

          {/* Alerts */}
          {(handover.open_incidents_count > 0 || handover.open_flags_count > 0) && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                {handover.open_incidents_count > 0 && <p>{handover.open_incidents_count} open incidents at time of handover</p>}
                {handover.open_flags_count > 0 && <p>{handover.open_flags_count} unacknowledged flagged logs</p>}
              </div>
            </div>
          )}

          {/* General Notes */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Shift Summary</h3>
            <p className="text-sm bg-muted/30 rounded-lg p-3">{handover.general_notes || "—"}</p>
          </section>

          {handover.medication_notes && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Medication Notes</h3>
              <p className="text-sm bg-muted/30 rounded-lg p-3">{handover.medication_notes}</p>
            </section>
          )}

          {handover.maintenance_notes && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Maintenance Notes</h3>
              <p className="text-sm bg-muted/30 rounded-lg p-3">{handover.maintenance_notes}</p>
            </section>
          )}

          {/* Residents */}
          {handover.residents_summary?.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3">Residents ({handover.residents_summary.length})</h3>
              <div className="space-y-3">
                {handover.residents_summary.map((entry, i) => {
                  const r = residentMap[entry.resident_id];
                  return (
                    <div key={i} className="bg-muted/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {r?.initials || "?"}
                          </div>
                          <span className="text-sm font-medium">{r?.display_name || "Unknown"}</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-muted-foreground">{LOCATION_LABELS[entry.location] || entry.location}</span>
                          {entry.mood && <span className={MOOD_COLORS[entry.mood] || ""}>{MOOD_LABELS[entry.mood]}</span>}
                        </div>
                      </div>
                      {entry.behaviour_noted && entry.behaviour_notes && (
                        <p className="text-xs text-muted-foreground"><span className="font-medium">Behaviour:</span> {entry.behaviour_notes}</p>
                      )}
                      {entry.any_concerns && entry.concern_notes && (
                        <p className="text-xs text-red-600"><span className="font-medium">Concern:</span> {entry.concern_notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {handover.late_handover && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> This handover was submitted late (more than 30 minutes after shift end).
            </div>
          )}
        </div>

        {canAcknowledge && (
          <div className="px-5 py-4 border-t border-border shrink-0">
            <Button onClick={() => acknowledgeMutation.mutate()} className="w-full gap-2">
              <CheckCircle2 className="w-4 h-4" /> Acknowledge Handover
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">Acknowledging confirms you have read and understood this handover.</p>
          </div>
        )}
      </div>
    </div>
  );
}