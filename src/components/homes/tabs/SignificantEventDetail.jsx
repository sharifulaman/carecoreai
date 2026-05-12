import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = {
  safeguarding_concern: "🛡️ Safeguarding Concern",
  missing_from_home: "🚨 Missing From Home",
  police_attendance: "🚔 Police Attendance",
  serious_injury: "🩹 Serious Injury",
  medical_emergency: "🏥 Medical Emergency",
  fire_or_evacuation: "🔥 Fire / Evacuation",
  physical_intervention: "⚡ Physical Intervention",
  serious_complaint: "📋 Serious Complaint",
  placement_breakdown: "⛔ Placement Breakdown",
  ofsted_notification_required: "📝 Ofsted Notification Required",
  other_significant_event: "📌 Other Significant Event",
};

export default function SignificantEventDetail({ event, home, residents, onClose, onUpdate }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(event);

  const updateMutation = useMutation({
    mutationFn: async (data) => secureGateway.update("SignificantEvent", event.id, data),
    onSuccess: () => {
      toast.success("Event updated");
      onUpdate();
      setEditing(null);
    },
    onError: () => toast.error("Error updating event"),
  });

  const handleSaveReview = () => {
    updateMutation.mutate({
      review_completed: true,
      review_date: new Date().toISOString(),
      follow_up_actions: form.follow_up_actions,
    });
  };

  const handleNotifyOfsted = () => {
    const reference = prompt("Ofsted notification reference number:");
    if (reference) {
      updateMutation.mutate({
        ofsted_notified: true,
        ofsted_notified_datetime: new Date().toISOString(),
        ofsted_notification_required: false,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">{EVENT_TYPES[event.event_type] || event.event_type}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Notification Alerts */}
          {event.ofsted_notification_required && !event.ofsted_notified && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start justify-between">
              <div className="text-sm text-red-700">
                <p className="font-semibold">🚨 Ofsted Notification Required (Regulation 40)</p>
                <p className="text-xs mt-1">Must notify Ofsted within 24 hours of the event.</p>
              </div>
              <Button size="sm" onClick={handleNotifyOfsted} className="bg-red-600 hover:bg-red-700 shrink-0">Notify Ofsted</Button>
            </div>
          )}

          {event.follow_up_required && !event.review_completed && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-700">⏳ Review Pending</p>
              <p className="text-xs text-amber-700 mt-1">Follow-up actions: {event.follow_up_actions}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="font-medium text-sm">{new Date(event.event_datetime).toLocaleString("en-GB")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recorded By</p>
              <p className="font-medium text-sm">{event.recorded_by_name}</p>
            </div>
            {event.resident_name && (
              <div>
                <p className="text-xs text-muted-foreground">Resident</p>
                <p className="font-medium text-sm">{event.resident_name}</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Summary</p>
            <p className="text-sm">{event.summary}</p>
          </div>

          {/* Full Detail */}
          {event.full_detail && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Full Detail</p>
              <p className="text-sm whitespace-pre-wrap">{event.full_detail}</p>
            </div>
          )}

          {/* Immediate Action */}
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Immediate Action Taken</p>
            <p className="text-sm">{event.immediate_action_taken}</p>
          </div>

          {/* Notifications */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold mb-2">Notifications</p>
            <div className="space-y-1 text-sm">
              {event.manager_notified && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">✓ Manager</span>
                  <span className="text-xs text-muted-foreground">{event.manager_notified_datetime}</span>
                </div>
              )}
              {event.la_notified && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">✓ Local Authority</span>
                  <span className="text-xs text-muted-foreground">{event.la_notified_datetime}</span>
                </div>
              )}
              {event.ofsted_notified && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">✓ Ofsted (Reg 40)</span>
                  <span className="text-xs text-muted-foreground">{event.ofsted_notified_datetime}</span>
                </div>
              )}
              {event.police_involved && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">🚔 Police</span>
                  <span className="text-xs text-muted-foreground">{event.police_reference}</span>
                </div>
              )}
              {!event.manager_notified && !event.la_notified && !event.ofsted_notified && !event.police_involved && (
                <p className="text-xs text-muted-foreground">No external notifications recorded</p>
              )}
            </div>
          </div>

          {/* Follow-up */}
          {event.follow_up_required && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold mb-2">Follow-up</p>
              {editing === "review" ? (
                <div className="space-y-2">
                  <Textarea value={form.follow_up_actions} onChange={e => setForm(p => ({ ...p, follow_up_actions: e.target.value }))} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveReview} disabled={updateMutation.isPending}>Complete Review</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : event.review_completed ? (
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-xs text-green-700">✓ Reviewed on {new Date(event.review_date).toLocaleDateString("en-GB")} by {event.reviewed_by_name}</p>
                  <p className="text-xs mt-1">{event.follow_up_actions}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-700">{event.follow_up_actions}</p>
                  <Button size="sm" onClick={() => setEditing("review")}>Complete Review</Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}