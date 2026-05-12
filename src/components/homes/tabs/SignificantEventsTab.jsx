import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import SignificantEventForm from "./SignificantEventForm";
import SignificantEventDetail from "./SignificantEventDetail";

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

const SERIOUS_TYPES = [
  "serious_injury",
  "missing_from_home",
  "police_attendance",
  "physical_intervention",
  "placement_breakdown",
];

export default function SignificantEventsTab({ home, residents, staff, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const { data: events = [] } = useQuery({
    queryKey: ["significant-events", home?.id],
    queryFn: () => base44.entities.SignificantEvent.filter({ home_id: home?.id }, "-event_datetime", 500),
  });

  const filtered = useMemo(() => {
    let result = events.filter(e => !e.is_deleted && e.event_datetime.split("T")[0] >= dateRange.from && e.event_datetime.split("T")[0] <= dateRange.to);
    if (filterType !== "all") result = result.filter(e => e.event_type === filterType);
    return result.sort((a, b) => (b.event_datetime || "").localeCompare(a.event_datetime || ""));
  }, [events, filterType, dateRange]);

  const pendingOfstedNotifications = filtered.filter(e => e.ofsted_notification_required && !e.ofsted_notified);
  const pendingReviews = filtered.filter(e => e.follow_up_required && !e.review_completed);

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {pendingOfstedNotifications.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-semibold">🚨 {pendingOfstedNotifications.length} event(s) require Ofsted notification (Regulation 40)</p>
            <p className="text-xs mt-1">Must be notified within 24 hours of occurrence.</p>
          </div>
        </div>
      )}

      {pendingReviews.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-semibold">⚠️ {pendingReviews.length} event(s) pending review</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-border rounded-lg text-sm bg-card"
        >
          <option value="all">All Event Types</option>
          {Object.entries(EVENT_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateRange.from}
          onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
          className="px-2 py-1.5 border border-border rounded text-sm"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <input
          type="date"
          value={dateRange.to}
          onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
          className="px-2 py-1.5 border border-border rounded text-sm"
        />
        <div className="flex-1" />
        <Button onClick={() => setShowForm(true)} className="gap-1"><Plus className="w-4 h-4" /> Log Event</Button>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-muted/30 rounded-lg p-6 text-center text-muted-foreground text-sm">No events recorded in this period.</div>
        ) : (
          filtered.map(event => (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="border border-border rounded-lg p-3 hover:bg-muted/20 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-sm font-medium">{EVENT_TYPES[event.event_type] || event.event_type}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.event_datetime).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm text-foreground mb-2">{event.summary}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {event.resident_name && <span>👤 {event.resident_name}</span>}
                {event.manager_notified && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">✓ Manager</span>}
                {event.la_notified && <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">✓ LA</span>}
                {event.ofsted_notified && <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">✓ Ofsted</span>}
                {event.police_involved && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">🚔 Police</span>}
                {event.follow_up_required && !event.review_completed && <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⏳ Review pending</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <SignificantEventForm
          home={home}
          residents={residents}
          staff={staff}
          user={user}
          onClose={() => setShowForm(false)}
          onSave={() => qc.invalidateQueries({ queryKey: ["significant-events", home?.id] })}
        />
      )}
      {selectedEvent && (
        <SignificantEventDetail
          event={selectedEvent}
          home={home}
          residents={residents}
          onClose={() => setSelectedEvent(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ["significant-events", home?.id] })}
        />
      )}
    </div>
  );
}