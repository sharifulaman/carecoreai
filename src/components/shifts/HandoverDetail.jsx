import { X } from "lucide-react";

export default function HandoverDetail({ handover, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-bold">Shift Handover</h2>
            <p className="text-xs text-muted-foreground">{handover.date} · {handover.shift} · {handover.home_name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Status */}
          <div className="p-3 bg-muted/30 rounded">
            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${handover.status === "acknowledged" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {handover.status}
            </span>
          </div>

          {/* Resident Welfare */}
          {handover.resident_statuses && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Resident Welfare</h3>
              <div className="space-y-2">
                {handover.resident_statuses.map((r, i) => (
                  <div key={i} className="border border-border rounded p-2 text-sm">
                    <p className="font-medium">{r.resident_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>📍 {r.location?.replace(/_/g, " ")}</span>
                      <span>😊 {r.mood}</span>
                    </div>
                    {r.any_concerns && <p className="text-xs text-amber-700 mt-1">⚠️ {r.concern_notes}</p>}
                    {r.medication_given_this_shift && <p className="text-xs mt-1">💊 {r.medication_notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incidents */}
          {handover.incidents && handover.incidents.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Incidents ({handover.incidents.length})</h3>
              <div className="space-y-2">
                {handover.incidents.map((inc, i) => (
                  <div key={i} className="border border-red-300 bg-red-50 rounded p-2 text-sm">
                    <p className="font-medium capitalize">{inc.incident_type}</p>
                    <p className="text-xs text-muted-foreground">{inc.resident_name}</p>
                    <p className="text-xs mt-1">{inc.description}</p>
                    {inc.action_taken && <p className="text-xs text-green-700 mt-1">✓ {inc.action_taken}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medication */}
          {(handover.controlled_drug_balance_checked || handover.medication_storage_secure) && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Medication Checks</h3>
              <div className="space-y-1 text-sm">
                {handover.controlled_drug_balance_checked && <p>✓ Controlled drug balance checked</p>}
                {handover.medication_storage_secure && <p>✓ Medication storage secure</p>}
                {handover.any_medication_issues && <p className="text-amber-700">⚠️ {handover.medication_notes}</p>}
              </div>
            </div>
          )}

          {/* Outstanding Tasks */}
          {handover.outstanding_tasks && handover.outstanding_tasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Outstanding Tasks ({handover.outstanding_tasks.length})</h3>
              <div className="space-y-1 text-sm">
                {handover.outstanding_tasks.map((t, i) => (
                  <p key={i}>
                    [{t.priority}] {t.task} — <span className="text-muted-foreground">for {t.assigned_to}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Home Condition */}
          {(handover.property_secure || handover.cleaning_completed) && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Home Condition</h3>
              <div className="space-y-1 text-sm">
                {handover.property_secure && <p>✓ Property secure</p>}
                {handover.cleaning_completed && <p>✓ Cleaning completed</p>}
                {handover.any_maintenance_issues && <p className="text-amber-700">⚠️ {handover.maintenance_notes}</p>}
              </div>
            </div>
          )}

          {/* Visitors */}
          {handover.visitors && handover.visitors.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Visitors ({handover.visitors.length})</h3>
              <div className="space-y-1 text-sm">
                {handover.visitors.map((v, i) => (
                  <p key={i}>{v.name} ({v.relationship}) visited {v.resident_visited} {v.time_in}–{v.time_out}</p>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {handover.summary && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Summary</h3>
              <p className="text-sm whitespace-pre-wrap">{handover.summary}</p>
            </div>
          )}

          {/* Staff Info */}
          <div className="border-t border-border pt-4 text-xs text-muted-foreground">
            <p>{handover.outgoing_staff_name} → {handover.incoming_staff_name}</p>
            {handover.incoming_acknowledged_at && (
              <p>✓ Acknowledged at {new Date(handover.incoming_acknowledged_at).toLocaleString("en-GB")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}