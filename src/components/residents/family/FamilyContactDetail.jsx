import { X } from "lucide-react";

export default function FamilyContactDetail({ contact, resident, staff, onClose, onUpdate }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-bold">{contact.contact_person_name}</h2>
            <p className="text-xs text-muted-foreground">{new Date(contact.contact_datetime).toLocaleString("en-GB")}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Relationship</p>
              <p className="text-sm font-medium capitalize mt-1">{contact.contact_person_relationship?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Method</p>
              <p className="text-sm font-medium capitalize mt-1">{contact.contact_method?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Duration</p>
              <p className="text-sm font-medium mt-1">{contact.duration_minutes} minutes</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Initiated By</p>
              <p className="text-sm font-medium capitalize mt-1">{contact.contact_initiated_by?.replace(/_/g, " ")}</p>
            </div>
            {contact.location && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground font-medium">Location</p>
                <p className="text-sm font-medium mt-1">{contact.location}</p>
              </div>
            )}
          </div>

          {/* Supervision */}
          {(contact.was_supervised || contact.is_court_ordered) && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">Supervision & Court Order</p>
              {contact.was_supervised && (
                <div className="text-xs mb-2">
                  <span className="text-muted-foreground">Supervised by: </span>
                  <span className="font-medium">{contact.supervised_by_name || "—"}</span>
                </div>
              )}
              {contact.is_court_ordered && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Court order: </span>
                  <span className="font-medium">{contact.court_order_reference || "—"}</span>
                </div>
              )}
            </div>
          )}

          {/* Mood & Engagement */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium mb-3">Resident Presentation</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Mood before: </span>
                <span className="font-medium capitalize">{contact.mood_before}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mood after: </span>
                <span className="font-medium capitalize">{contact.mood_after}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Engagement: </span>
                <span className="font-medium capitalize">{contact.resident_engagement}</span>
              </div>
            </div>
            {contact.resident_comments && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">What they said:</p>
                <p className="text-sm">{contact.resident_comments}</p>
              </div>
            )}
          </div>

          {/* Concerns */}
          {(contact.any_concerns || contact.safeguarding_concern) && (
            <div className="border-t border-border pt-4 border-l-4 border-l-red-500 pl-4">
              <p className="text-sm font-medium mb-2 text-red-600">⚠️ Concerns Raised</p>
              {contact.concern_details && (
                <div className="text-sm text-foreground bg-red-50 p-3 rounded-lg mb-2">{contact.concern_details}</div>
              )}
              {contact.safeguarding_concern && (
                <div className="text-xs text-red-700 font-medium">🔴 Safeguarding record created</div>
              )}
            </div>
          )}

          {/* Next Contact */}
          {contact.next_contact_planned && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground font-medium">Next Contact Planned</p>
              <p className="text-sm font-medium mt-1">{new Date(contact.next_contact_datetime).toLocaleString("en-GB")}</p>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground font-medium">Notes</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border pt-4 text-xs text-muted-foreground">
            <p>Logged by {contact.recorded_by_name} on {new Date(contact.created_date).toLocaleDateString("en-GB")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}