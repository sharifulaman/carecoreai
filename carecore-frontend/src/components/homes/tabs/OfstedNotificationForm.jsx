import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

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

export default function OfstedNotificationForm({ home, staff, user, editingId, onClose, onSave }) {
  const { data: residents = [] } = useQuery({
    queryKey: ["residents"],
    queryFn: () => secureGateway.filter("Resident", { home_id: home.id }, "-created_date", 50),
  });

  const { data: editingRecord } = useQuery({
    queryKey: ["ofsted-notification", editingId],
    queryFn: () => editingId ? secureGateway.filter("OfstedNotification", { id: editingId }) : null,
    enabled: !!editingId,
  });

  const [form, setForm] = useState({
    notification_type: "",
    event_date: "",
    resident_id: "",
    staff_id: "",
    event_summary: "",
    notification_method: "",
    notified_datetime: "",
    ofsted_reference_number: "",
    ofsted_contact_name: "",
    ofsted_response: "",
    status: "pending",
  });

  useEffect(() => {
    if (editingRecord?.[0]) {
      const r = editingRecord[0];
      setForm({
        notification_type: r.notification_type,
        event_date: r.event_date?.split("T")[0] || "",
        resident_id: r.resident_id || "",
        staff_id: r.staff_id || "",
        event_summary: r.event_summary,
        notification_method: r.notification_method || "",
        notified_datetime: r.notified_datetime ? r.notified_datetime.replace("Z", "").slice(0, 16) : "",
        ofsted_reference_number: r.ofsted_reference_number || "",
        ofsted_contact_name: r.ofsted_contact_name || "",
        ofsted_response: r.ofsted_response || "",
        status: r.status,
      });
    }
  }, [editingRecord]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const eventDate = new Date(`${form.event_date}T00:00:00Z`);
      const notifyDate = form.notified_datetime ? new Date(form.notified_datetime) : null;
      const hoursToNotify = notifyDate ? Math.floor((notifyDate - eventDate) / 3600000) : null;

      const data = {
        org_id: ORG_ID,
        home_id: home.id,
        home_name: home.name,
        notification_type: form.notification_type,
        event_date: eventDate.toISOString(),
        resident_id: form.resident_id || null,
        resident_name: form.resident_id ? residents.find(r => r.id === form.resident_id)?.display_name : null,
        staff_id: form.staff_id || null,
        staff_name: form.staff_id ? staff.find(s => s.id === form.staff_id)?.full_name : null,
        event_summary: form.event_summary,
        hours_to_notify: hoursToNotify,
        notification_method: form.notification_method || null,
        notified_datetime: notifyDate?.toISOString() || null,
        ofsted_reference_number: form.ofsted_reference_number || null,
        ofsted_contact_name: form.ofsted_contact_name || null,
        ofsted_response: form.ofsted_response || null,
        status: notifyDate ? "notified" : "pending",
      };

      if (editingId) {
        await secureGateway.update("OfstedNotification", editingId, data);
      } else {
        await secureGateway.create("OfstedNotification", data);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Notification updated" : "Notification logged");
      onSave();
    },
    onError: () => toast.error("Error saving notification"),
  });

  const handleSubmit = () => {
    if (!form.notification_type || !form.event_date || !form.event_summary) {
      toast.error("Type, date, and summary required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Log Ofsted Notification</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Notification Type *</label>
            <Select value={form.notification_type} onValueChange={v => setForm(p => ({ ...p, notification_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(NOTIFICATION_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Event Date *</label>
              <Input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Resident (if applicable)</label>
              <Select value={form.resident_id} onValueChange={v => setForm(p => ({ ...p, resident_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select resident..." /></SelectTrigger>
                <SelectContent>
                  {residents.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Staff Member (if applicable)</label>
            <Select value={form.staff_id} onValueChange={v => setForm(p => ({ ...p, staff_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
              <SelectContent>
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Event Summary *</label>
            <Textarea value={form.event_summary} onChange={e => setForm(p => ({ ...p, event_summary: e.target.value }))} rows={3} placeholder="Describe the event requiring notification..." />
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">Notification Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Method</label>
                <Select value={form.notification_method} onValueChange={v => setForm(p => ({ ...p, notification_method: v }))}>
                  <SelectTrigger><SelectValue placeholder="Not yet notified" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online_form">Online Form</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notified Date/Time</label>
                <Input type="datetime-local" value={form.notified_datetime} onChange={e => setForm(p => ({ ...p, notified_datetime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-sm font-medium">Ofsted Reference #</label>
                <Input value={form.ofsted_reference_number} onChange={e => setForm(p => ({ ...p, ofsted_reference_number: e.target.value }))} placeholder="e.g. REG40-2026-001" />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Person at Ofsted</label>
                <Input value={form.ofsted_contact_name} onChange={e => setForm(p => ({ ...p, ofsted_contact_name: e.target.value }))} />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium">Ofsted Response</label>
              <Textarea value={form.ofsted_response} onChange={e => setForm(p => ({ ...p, ofsted_response: e.target.value }))} rows={2} placeholder="Any response or follow-up from Ofsted..." />
            </div>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/30">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : editingId ? "Update" : "Log Notification"}
          </Button>
        </div>
      </div>
    </div>
  );
}