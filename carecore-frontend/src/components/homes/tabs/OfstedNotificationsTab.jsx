import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import OfstedNotificationForm from "./OfstedNotificationForm";

const NOTIFICATION_TYPES = {
  allegation_against_staff: "Allegation against staff member",
  serious_injury_to_child: "Serious injury to child",
  missing_over_24_hours: "Child missing from home for over 24 hours",
  death_of_child: "Death of child",
  police_involvement_serious: "Police involvement (serious matter)",
  outbreak_of_infectious_disease: "Outbreak of infectious disease",
  serious_accident: "Serious accident",
  serious_complaint: "Serious complaint",
  placement_ended_unplanned: "Placement ended unplanned",
  other_serious_event: "Other serious event",
};

const STATUS_COLORS = {
  pending: "bg-red-100 text-red-700 border-red-300",
  notified: "bg-amber-100 text-amber-700 border-amber-300",
  acknowledged: "bg-blue-100 text-blue-700 border-blue-300",
  closed: "bg-green-100 text-green-700 border-green-300",
};

function hoursToNotifyRemaining(eventDate) {
  const diff = Date.now() - new Date(eventDate).getTime();
  const hoursElapsed = Math.floor(diff / 3600000);
  return Math.max(0, 24 - hoursElapsed);
}

export default function OfstedNotificationsTab({ home, staff, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["ofsted-notifications", home.id],
    queryFn: () => secureGateway.filter("OfstedNotification", { home_id: home.id }, "-event_date", 200),
  });

  const pending = useMemo(() =>
    notifications.filter(n => n.status === "pending" && !n.is_deleted),
    [notifications]
  );

  const overdue = useMemo(() =>
    pending.filter(n => hoursToNotifyRemaining(n.event_date) <= 0),
    [pending]
  );

  const handleClose = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    qc.invalidateQueries({ queryKey: ["ofsted-notifications", home.id] });
    handleClose();
  };

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium">
          Regulation 40 requires notification to Ofsted within 24 hours of a notifiable event. Failure to notify is a regulatory breach.
        </p>
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-700">⚠️ OVERDUE NOTIFICATIONS — {overdue.length} event(s)</h3>
              <p className="text-sm text-red-700 mt-1">The following events have exceeded the 24-hour notification window.</p>
              <div className="mt-2 space-y-1">
                {overdue.map(n => (
                  <p key={n.id} className="text-xs text-red-700">
                    • {NOTIFICATION_TYPES[n.notification_type]} on {new Date(n.event_date).toLocaleDateString("en-GB")}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Notifications */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm text-amber-900 mb-3">Pending Notifications</h3>
          <div className="space-y-2">
            {pending.map(n => {
              const hoursLeft = hoursToNotifyRemaining(n.event_date);
              return (
                <div key={n.id} className="flex items-center justify-between p-2 bg-white rounded border border-amber-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{NOTIFICATION_TYPES[n.notification_type]}</p>
                    <p className="text-xs text-muted-foreground">Event: {new Date(n.event_date).toLocaleString("en-GB")}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${hoursLeft > 6 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      <Clock className="w-3 h-3" /> {hoursLeft}h to notify
                    </div>
                    <Button size="sm" onClick={() => { setEditingId(n.id); setShowForm(true); }}>Notify</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <Button onClick={() => { setEditingId(null); setShowForm(true); }} className="gap-1">
        <Plus className="w-4 h-4" /> Log Notification
      </Button>

      {/* Notifications Table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold">Event Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Resident/Staff</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Method</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Notified</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Ref #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground text-sm">No notifications recorded.</td></tr>
            ) : notifications.filter(n => !n.is_deleted).map((n, i) => (
              <tr key={n.id} className={`border-b border-border/50 last:border-0 hover:bg-muted/10 cursor-pointer ${i % 2 !== 0 ? "bg-muted/10" : ""}`}
                onClick={() => { setEditingId(n.id); setShowForm(true); }}>
                <td className="px-4 py-3 text-xs">{new Date(n.event_date).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 text-xs">{NOTIFICATION_TYPES[n.notification_type]}</td>
                <td className="px-4 py-3 text-xs">{n.resident_name || n.staff_name || "—"}</td>
                <td className="px-4 py-3 text-xs capitalize">{n.notification_method || "—"}</td>
                <td className="px-4 py-3 text-xs">{n.notified_datetime ? new Date(n.notified_datetime).toLocaleString("en-GB") : "—"}</td>
                <td className="px-4 py-3 text-xs font-mono">{n.ofsted_reference_number || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${STATUS_COLORS[n.status]}`}>
                    {n.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <OfstedNotificationForm
          home={home}
          staff={staff}
          user={user}
          editingId={editingId}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}
    </div>
  );
}