import { useState } from "react";
import { X, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import BodyMapSilhouette from "./BodyMapSilhouette";

export default function BodyMapDetail({ record, resident, onClose, onUpdate }) {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">{resident.display_name} — Body Map {new Date(record.recorded_datetime).toLocaleDateString("en-GB")}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Safety Alert */}
        {record.safeguarding_concern && (
          <div className="px-6 py-4 bg-red-100 border-b border-red-300 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-bold">Safeguarding Concern Flagged</p>
              <p>Referred to: {record.referred_to || "—"}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Recorded By */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Recorded By</p><p className="font-medium">{record.recorded_by_name}</p></div>
            <div><p className="text-muted-foreground">Date & Time</p><p className="font-medium">{new Date(record.recorded_datetime).toLocaleString("en-GB")}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground">Discovery Circumstance</p><p className="font-medium">{record.discovery_circumstance || "—"}</p></div>
          </div>

          {/* Body Silhouettes */}
          <div>
            <h3 className="font-semibold mb-4">Body Map</h3>
            <div className="grid grid-cols-2 gap-6">
              <BodyMapSilhouette side="front" marks={record.marks} readOnly={true} />
              <BodyMapSilhouette side="back" marks={record.marks} readOnly={true} />
            </div>
          </div>

          {/* Marks Detail */}
          <div>
            <h3 className="font-semibold mb-3">{record.marks?.length || 0} Mark(s)</h3>
            {record.marks && record.marks.length > 0 ? (
              <div className="space-y-2">
                {record.marks.map((mark, i) => (
                  <div key={mark.id} className="p-3 bg-muted/30 border border-border rounded-lg text-sm">
                    <p className="font-medium">{mark.body_location} ({mark.body_side})</p>
                    <p className="text-xs text-muted-foreground capitalize">{mark.mark_type} · {mark.colour} · {mark.size_cm}</p>
                    {mark.description && <p className="text-xs mt-1"><strong>Description:</strong> {mark.description}</p>}
                    {mark.child_explanation && <p className="text-xs mt-1"><strong>Child's explanation:</strong> {mark.child_explanation}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No marks recorded.</p>
            )}
          </div>

          {/* Assessment */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold mb-3">Assessment</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Consistent with Explanation</p><p className="font-medium">{record.consistent_with_explanation === true ? "Yes" : record.consistent_with_explanation === false ? "No / Unclear" : "—"}</p></div>
              <div><p className="text-muted-foreground">Manager Notified</p><p className="font-medium">{record.manager_notified ? "Yes" : "No"}</p></div>
              {record.notes && <div className="col-span-2"><p className="text-muted-foreground">Notes</p><p className="font-medium">{record.notes}</p></div>}
            </div>
          </div>

          {/* Status */}
          <div className="text-sm"><p className="text-muted-foreground">Status</p><p className="font-medium capitalize">{record.status}</p></div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-muted/30 flex justify-end">
          <button onClick={onClose} className="text-sm text-primary hover:underline">Close</button>
        </div>
      </div>
    </div>
  );
}