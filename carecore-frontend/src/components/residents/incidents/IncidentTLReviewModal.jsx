import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { createNotification } from "@/lib/createNotification";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  X, CheckCircle2, RotateCcw, Lock, Shield, AlertTriangle,
  FileText, Clock, User
} from "lucide-react";

const REVIEW_STATUS_LABELS = {
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700 border-amber-300" },
  reviewed: { label: "Reviewed", color: "bg-green-100 text-green-700 border-green-300" },
  returned_for_changes: { label: "Returned for Changes", color: "bg-red-100 text-red-700 border-red-300" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
};

function ReadOnlyField({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}

export default function IncidentTLReviewModal({ incident, staffProfile, onClose, onSaved }) {
  const qc = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState(incident?.manager_review_notes || "");
  const [returnReason, setReturnReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!incident) return null;

  const statusCfg = REVIEW_STATUS_LABELS[incident.manager_review_status] || REVIEW_STATUS_LABELS.submitted;
  const isAlreadyReviewed = incident.manager_review_status === "reviewed";

  const handleApprove = async () => {
    if (!reviewNotes.trim()) {
      toast.error("Please add review notes before approving.");
      return;
    }
    setSaving(true);
    try {
      await secureGateway.update("AccidentReport", incident.id, {
        manager_review_status: "reviewed",
        manager_review_notes: reviewNotes,
        manager_review_by_id: staffProfile?.id || null,
        manager_review_by_name: staffProfile?.full_name || "",
        manager_review_date: new Date().toISOString(),
      });

      // Notify the original submitter (find their user_id via staff lookup)
      if (incident.recorded_by_id) {
        await createNotification({
          recipient_staff_id: incident.recorded_by_id,
          recipient_user_id: incident.recorded_by_user_id || incident.recorded_by_id,
          title: "Incident Reviewed",
          body: `Your incident report (${incident.incident_type || incident.type || "incident"} — ${incident.resident_name || ""}) has been reviewed and approved by ${staffProfile?.full_name || "your manager"}.`,
          type: "incident_review",
          link: "/residents",
          priority: "normal",
        });
      }

      toast.success("Incident marked as reviewed. It will now count in Annex A.");
      qc.invalidateQueries({ queryKey: ["accidents"] });
      if (onSaved) onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      toast.error("Please provide a reason for returning this incident.");
      return;
    }
    setSaving(true);
    try {
      await secureGateway.update("AccidentReport", incident.id, {
        manager_review_status: "returned_for_changes",
        manager_review_notes: returnReason,
        manager_review_by_id: staffProfile?.id || null,
        manager_review_by_name: staffProfile?.full_name || "",
        manager_review_date: new Date().toISOString(),
      });

      if (incident.recorded_by_id) {
        await createNotification({
          recipient_staff_id: incident.recorded_by_id,
          recipient_user_id: incident.recorded_by_user_id || incident.recorded_by_id,
          title: "Incident Returned for Changes",
          body: `Your incident report (${incident.incident_type || incident.type || "incident"} — ${incident.resident_name || ""}) has been returned for changes by ${staffProfile?.full_name || "your manager"}. Reason: ${returnReason}`,
          type: "incident_review",
          link: "/residents",
          priority: "high",
        });
      }

      toast.success("Incident returned to support worker for changes.");
      qc.invalidateQueries({ queryKey: ["accidents"] });
      if (onSaved) onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">TL Incident Review</h2>
              <p className="text-xs text-slate-500">Review worker's narrative — do not alter it</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Annex A warning */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>
              This incident will only count in <strong>Annex A</strong> (restraints Q9 / police behaviour management) once you mark it as <strong>Reviewed</strong>.
            </span>
          </div>

          {/* Incident metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Incident type", incident.incident_type || incident.type || "—"],
              ["Date", incident.date || incident.incident_datetime ? format(new Date(incident.incident_datetime || incident.date), "dd MMM yyyy HH:mm") : "—"],
              ["Young person", incident.resident_name || "—"],
              ["Risk level", incident.risk_level || "—"],
              ["Reported by", incident.reported_by || incident.recorded_by_name || "—"],
              ["Location", incident.location || "—"],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-slate-400 mb-0.5">{label}</p>
                <p className="font-semibold text-slate-700 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Worker's original narrative — READ ONLY */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Worker's Original Narrative (read-only)</p>
            </div>
            <ReadOnlyField label="Brief description" value={incident.brief_description || incident.description} />
            <ReadOnlyField label="Detailed account" value={incident.detailed_account} />
            {incident.was_restraint_used && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 space-y-1 text-sm">
                <p className="font-semibold text-purple-800 text-xs uppercase tracking-wide">Restraint Used</p>
                <p className="text-purple-700 text-xs">Type: {incident.restraint_type || "—"}</p>
                <p className="text-purple-700 text-xs">Reason: {incident.reason_restraint_used || "—"}</p>
                {incident.restraint_injury && <p className="text-red-600 text-xs font-semibold">⚠ Injury occurred</p>}
              </div>
            )}
            {incident.police_called && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1 text-sm">
                <p className="font-semibold text-red-800 text-xs uppercase tracking-wide">Police Called</p>
                <p className="text-red-700 text-xs">Reason: {incident.police_callout_reason || "—"}</p>
                <p className="text-red-700 text-xs">Ref: {incident.police_reference_number || "—"}</p>
              </div>
            )}
            <ReadOnlyField label="Actions taken" value={Array.isArray(incident.actions_taken) ? incident.actions_taken.join(", ") : incident.actions_taken} />
            <ReadOnlyField label="Outcome" value={incident.outcome} />
            <ReadOnlyField label="Reg 40 notes" value={incident.reg40_notes} />
          </div>

          {/* TL review notes */}
          {!isAlreadyReviewed && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Your Review Notes</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Review notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Add your manager review notes. These are separate from the worker's narrative..."
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Reason to return (only if returning for changes)
                </label>
                <textarea
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="If returning for changes, describe what needs to be updated..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400/50 resize-none border-red-100"
                />
              </div>
            </div>
          )}

          {/* Already reviewed */}
          {isAlreadyReviewed && incident.manager_review_notes && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Manager Review Notes</p>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                {incident.manager_review_notes}
              </div>
              {incident.manager_review_date && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Reviewed {format(new Date(incident.manager_review_date), "dd MMM yyyy HH:mm")}
                  {incident.manager_review_by_name && ` by ${incident.manager_review_by_name}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isAlreadyReviewed && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleReturn}
                disabled={saving || !returnReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Return for Changes
              </button>
              <button
                onClick={handleApprove}
                disabled={saving || !reviewNotes.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark as Reviewed
              </button>
            </div>
          </div>
        )}
        {isAlreadyReviewed && (
          <div className="px-6 py-4 border-t border-slate-200 text-center">
            <button onClick={onClose} className="px-6 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}