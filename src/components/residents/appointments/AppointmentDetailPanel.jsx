import { useState } from "react";
import { X, MapPin, User, Clock, Calendar, RefreshCw, Pencil, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const TYPE_LABELS = {
  gp_appointment: "GP Appointment",
  hospital_appointment: "Hospital Appointment",
  dental: "Dental",
  optician: "Optician",
  mental_health: "Mental Health",
  social_worker_visit: "Social Worker Visit",
  iro_review: "IRO Review",
  lac_review: "LAC Review",
  court_hearing: "Court Hearing",
  school_meeting: "School Meeting",
  college_meeting: "College Meeting",
  key_worker_session: "Key Worker Session",
  family_contact: "Family Contact",
  counselling: "Counselling",
  probation: "Probation",
  youth_offending: "Youth Offending",
  other: "Other",
};

const RSVP_STATUS_COLOUR = {
  accepted: "text-green-600",
  tentative: "text-amber-600",
  declined: "text-red-600",
  pending: "text-gray-400",
};

function RecurringActionModal({ title, onThisOnly, onThisAndFuture, onAllInSeries, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-bold">{title}</h3>
        <p className="text-sm text-gray-500">This is a recurring appointment. How would you like to apply this change?</p>
        <div className="space-y-2">
          <button onClick={onThisOnly}
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm transition-colors">
            <span className="font-medium block">This appointment only</span>
            <span className="text-gray-400 text-xs">Only affects this date</span>
          </button>
          <button onClick={onThisAndFuture}
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm transition-colors">
            <span className="font-medium block">This and all future appointments</span>
            <span className="text-gray-400 text-xs">Splits the series from this point forward</span>
          </button>
          <button onClick={onAllInSeries}
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm transition-colors">
            <span className="font-medium block">All appointments in this series</span>
            <span className="text-gray-400 text-xs">Updates the entire recurring series</span>
          </button>
        </div>
        <button onClick={onClose} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 pt-1">Never mind</button>
      </div>
    </div>
  );
}

export default function AppointmentDetailPanel({ appointment: apt, residents, staff, staffProfile, isAdmin, onClose, onUpdate, onEdit }) {
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const resident = residents?.find(r => r.id === apt.resident_id);
  const isRecurringInstance = apt._isRecurringInstance;
  const baseId = apt._baseId || apt.id;
  const instanceDate = isRecurringInstance ? apt.start_datetime?.split("T")[0] : null;
  const canModify = isAdmin || apt.organiser_id === staffProfile?.id;

  // RSVP — is the current user an attendee?
  const myAttendeeRecord = apt.attendees?.find(a => a.staff_id === staffProfile?.id);

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // ── RSVP ───────────────────────────────────────────────────────────────────
  const rsvpMutation = useMutation({
    mutationFn: async (status) => {
      const updatedAttendees = (apt.attendees || []).map(a =>
        a.staff_id === staffProfile?.id
          ? { ...a, response_status: status, responded_at: new Date().toISOString() }
          : a
      );
      await secureGateway.update("Appointment", baseId, { attendees: updatedAttendees });

      if (status !== "pending" && apt.organiser_id) {
        await secureGateway.create("Notification", {
          org_id: apt.org_id,
          recipient_id: apt.organiser_id,
          title: `${staffProfile.full_name} has ${status} your appointment`,
          body: `${staffProfile.full_name} responded ${status} to: ${apt.title}`,
          type: "appointment_response",
          link: "/residents?tab=appointments",
          read: false,
        });
      }
    },
    onSuccess: (_, status) => {
      toast.success(status === "accepted" ? "You accepted" : status === "tentative" ? "Marked as tentative" : status === "declined" ? "You declined" : "Response updated");
      queryClient.invalidateQueries(["appointments"]);
      onUpdate();
    },
    onError: () => toast.error("Failed to update response"),
  });

  // ── Cancel mutations ────────────────────────────────────────────────────────
  const cancelThisOnly = useMutation({
    mutationFn: async () => {
      const base = await secureGateway.get("Appointment", baseId);
      const existing = Array.isArray(base.cancelled_dates) ? base.cancelled_dates : [];
      if (!existing.includes(instanceDate)) {
        await secureGateway.update("Appointment", baseId, { cancelled_dates: [...existing, instanceDate] });
      }
    },
    onSuccess: () => { toast.success("Instance cancelled"); queryClient.invalidateQueries(["appointments"]); onUpdate(); },
    onError: () => toast.error("Failed to cancel instance"),
  });

  const cancelThisAndFuture = useMutation({
    mutationFn: async () => {
      const dayBefore = new Date(instanceDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await secureGateway.update("Appointment", baseId, { recurrence_end_date: dayBefore.toISOString().split("T")[0] });
    },
    onSuccess: () => { toast.success("Series truncated from this date"); queryClient.invalidateQueries(["appointments"]); onUpdate(); },
    onError: () => toast.error("Failed to update series"),
  });

  const cancelAll = useMutation({
    mutationFn: () => secureGateway.update("Appointment", baseId, { status: "cancelled" }),
    onSuccess: () => { toast.success("Entire series cancelled"); queryClient.invalidateQueries(["appointments"]); onUpdate(); },
    onError: () => toast.error("Failed to cancel series"),
  });

  const cancelSingle = useMutation({
    mutationFn: () => secureGateway.update("Appointment", apt.id, { status: "cancelled" }),
    onSuccess: () => { toast.success("Appointment cancelled"); queryClient.invalidateQueries(["appointments"]); onUpdate(); },
    onError: () => toast.error("Failed to cancel appointment"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => secureGateway.update("Appointment", baseId, { is_deleted: true, deleted_at: new Date().toISOString() }),
    onSuccess: () => { toast.success("Appointment deleted"); queryClient.invalidateQueries(["appointments"]); onUpdate(); },
    onError: () => toast.error("Failed to delete appointment"),
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40" onClick={onClose}>
        <div className="bg-card w-full max-w-sm h-full overflow-y-auto shadow-2xl border-l border-border" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="px-6 py-5 text-white" style={{ backgroundColor: apt.colour || "#2563EB" }}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{TYPE_LABELS[apt.appointment_type] || apt.appointment_type}</span>
                {(isRecurringInstance || apt.is_recurring) && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Recurring
                  </span>
                )}
              </div>
              <button onClick={onClose} className="text-white/80 hover:text-white ml-2"><X className="w-5 h-5" /></button>
            </div>
            <h2 className="text-xl font-bold mt-3">{apt.title}</h2>
            <p className="text-white/80 text-sm mt-1 capitalize">{apt.status?.replace(/_/g, " ")}</p>
          </div>

          <div className="p-6 space-y-4">

            {/* RSVP panel — for invited attendees */}
            {myAttendeeRecord && (
              myAttendeeRecord.response_status === "pending" ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900 mb-2">You have been invited to this appointment. Will you attend?</p>
                  <div className="flex gap-2">
                    {[["accepted", "✓ Accept", "bg-green-600 text-white"], ["tentative", "? Tentative", "bg-amber-500 text-white"], ["declined", "✗ Decline", "bg-red-500 text-white"]].map(([status, label, cls]) => (
                      <button key={status} onClick={() => rsvpMutation.mutate(status)} disabled={rsvpMutation.isPending}
                        className={`px-3 py-1.5 text-sm rounded-lg font-medium ${cls} disabled:opacity-50`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  You responded:{" "}
                  <span className={`font-medium ${RSVP_STATUS_COLOUR[myAttendeeRecord.response_status] || ""}`}>
                    {myAttendeeRecord.response_status}
                  </span>
                  <button onClick={() => rsvpMutation.mutate("pending")} disabled={rsvpMutation.isPending}
                    className="ml-2 text-xs text-blue-600 underline">Change response</button>
                </div>
              )
            )}

            {/* Date/Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">{fmt(apt.start_datetime)}</p>
                {apt.all_day ? <p className="text-muted-foreground">All day</p> : (
                  <p className="text-muted-foreground">{fmtTime(apt.start_datetime)} – {fmtTime(apt.end_datetime)}</p>
                )}
              </div>
            </div>

            {/* Recurrence */}
            {apt.is_recurring && (
              <div className="flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium capitalize">{apt.recurrence_pattern} · until {apt.recurrence_end_date}</p>
                  {isRecurringInstance && <p className="text-xs text-muted-foreground">Instance #{apt._instanceIndex}</p>}
                </div>
              </div>
            )}

            {/* Location */}
            {apt.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm">{apt.location}</p>
              </div>
            )}

            {/* Resident */}
            {resident && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">Young Person</p>
                  <p className="font-medium">{resident.display_name}</p>
                </div>
              </div>
            )}

            {/* Organiser */}
            {apt.organiser_name && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">Organised by</p>
                  <p className="font-medium">{apt.organiser_name}</p>
                </div>
              </div>
            )}

            {/* Internal Attendees */}
            {apt.attendees?.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm flex-1">
                  <p className="text-muted-foreground text-xs mb-1">Staff Attendees</p>
                  <div className="space-y-1">
                    {apt.attendees.map(a => (
                      <div key={a.staff_id} className="flex items-center justify-between">
                        <span className="font-medium">{a.staff_name}</span>
                        <span className={`text-xs capitalize ${RSVP_STATUS_COLOUR[a.response_status] || "text-gray-400"}`}>
                          {a.response_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* External Attendees */}
            {apt.external_attendees?.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm flex-1">
                  <p className="text-muted-foreground text-xs mb-1">External Attendees</p>
                  <div className="space-y-1">
                    {apt.external_attendees.map((ea, i) => (
                      <div key={i}>
                        <span className="font-medium">{ea.name}</span>
                        {ea.role && <span className="text-gray-500 ml-1 text-xs">· {ea.role}</span>}
                        {ea.organisation && <span className="text-gray-400 text-xs block">{ea.organisation}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {apt.description && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{apt.description}</p>
              </div>
            )}

            {/* Actions */}
            {canModify && apt.status !== "cancelled" && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" className="w-full gap-2"
                  onClick={() => isRecurringInstance ? setShowEditModal(true) : onEdit(apt)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit Appointment
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1"
                    onClick={() => isRecurringInstance ? setShowCancelModal(true) : cancelSingle.mutate()}
                    disabled={cancelSingle.isPending || cancelThisOnly.isPending}>
                    Cancel
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="destructive" className="flex-1"
                      onClick={() => { if (confirm("Delete this appointment?")) deleteMutation.mutate(); }}
                      disabled={deleteMutation.isPending}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel recurring modal */}
      {showCancelModal && (
        <RecurringActionModal
          title="Cancel recurring appointment"
          onThisOnly={() => { setShowCancelModal(false); cancelThisOnly.mutate(); }}
          onThisAndFuture={() => { setShowCancelModal(false); cancelThisAndFuture.mutate(); }}
          onAllInSeries={() => { setShowCancelModal(false); cancelAll.mutate(); }}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {/* Edit recurring modal */}
      {showEditModal && (
        <RecurringActionModal
          title="Edit recurring appointment"
          onThisOnly={() => { setShowEditModal(false); onEdit({ ...apt, _editThisOnly: true }); }}
          onThisAndFuture={() => { setShowEditModal(false); onEdit({ ...apt, _editThisAndFuture: true }); }}
          onAllInSeries={() => { setShowEditModal(false); onEdit({ ...apt, id: baseId, _isRecurringInstance: false, _editAllInSeries: true }); }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}