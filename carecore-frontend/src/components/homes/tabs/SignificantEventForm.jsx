import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = {
  safeguarding_concern: "Safeguarding Concern",
  missing_from_home: "Missing From Home",
  police_attendance: "Police Attendance",
  serious_injury: "Serious Injury",
  medical_emergency: "Medical Emergency",
  fire_or_evacuation: "Fire / Evacuation",
  physical_intervention: "Physical Intervention",
  serious_complaint: "Serious Complaint",
  placement_breakdown: "Placement Breakdown",
  ofsted_notification_required: "Ofsted Notification Required",
  other_significant_event: "Other Significant Event",
};

const SERIOUS_TYPES = [
  "serious_injury",
  "missing_from_home",
  "police_attendance",
  "physical_intervention",
  "placement_breakdown",
];

export default function SignificantEventForm({ home, residents, staff, user, onClose, onSave }) {
  const [form, setForm] = useState({
    event_datetime: new Date().toISOString(),
    event_type: "other_significant_event",
    resident_id: "",
    summary: "",
    full_detail: "",
    immediate_action_taken: "",
    manager_notified: false,
    manager_notified_datetime: "",
    la_notified: false,
    la_notified_datetime: "",
    ofsted_notified: false,
    ofsted_notification_required: false,
    ofsted_notified_datetime: "",
    police_involved: false,
    police_reference: "",
    follow_up_required: false,
    follow_up_actions: "",
  });

  const isSeriousType = SERIOUS_TYPES.includes(form.event_type);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!home?.id) throw new Error("Home ID is missing");
      
      const resident = form.resident_id ? residents.find(r => r.id === form.resident_id) : null;
      return await base44.entities.SignificantEvent.create({
        org_id: ORG_ID,
        home_id: home.id,
        home_name: home.name,
        recorded_by_id: user?.id || "anonymous",
        recorded_by_name: user?.full_name || "System",
        event_datetime: form.event_datetime,
        event_type: form.event_type,
        resident_id: form.resident_id || null,
        resident_name: resident?.display_name || null,
        summary: form.summary,
        full_detail: form.full_detail,
        immediate_action_taken: form.immediate_action_taken,
        manager_notified: form.manager_notified,
        manager_notified_datetime: form.manager_notified_datetime,
        la_notified: form.la_notified,
        la_notified_datetime: form.la_notified_datetime,
        ofsted_notified: form.ofsted_notified,
        ofsted_notification_required: isSeriousType,
        ofsted_notified_datetime: form.ofsted_notified_datetime,
        police_involved: form.police_involved,
        police_reference: form.police_reference,
        follow_up_required: form.follow_up_required,
        follow_up_actions: form.follow_up_actions,
      });
    },
    onSuccess: () => {
      toast.success("Event recorded successfully");
      onSave?.();
      setTimeout(() => onClose?.(), 500);
    },
    onError: (err) => {
      console.error("Event save error:", err);
      toast.error("Error saving event: " + (err?.message || "Unknown error"));
    },
  });

  const handleSubmit = async () => {
    if (!form.summary || !form.immediate_action_taken) {
      toast.error("Summary and immediate action required");
      return;
    }
    if (!home?.id) {
      toast.error("Home not loaded");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Log Significant Event</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {isSeriousType && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 font-medium">This event type may require Ofsted notification under Regulation 40 within 24 hours.</p>
          </div>
        )}

        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Date & Time *</label>
            <Input type="datetime-local" value={form.event_datetime.slice(0, 16)} onChange={e => setForm(p => ({ ...p, event_datetime: new Date(e.target.value).toISOString() }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Event Type *</label>
            <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Resident (if applicable)</label>
            <Select value={form.resident_id} onValueChange={v => setForm(p => ({ ...p, resident_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Summary (one paragraph) *</label>
            <Textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} rows={2} placeholder="Clear summary of what happened..." />
          </div>
          <div>
            <label className="text-sm font-medium">Full Detail</label>
            <Textarea value={form.full_detail} onChange={e => setForm(p => ({ ...p, full_detail: e.target.value }))} rows={3} placeholder="Additional context..." />
          </div>
          <div>
            <label className="text-sm font-medium">Immediate Action Taken *</label>
            <Textarea value={form.immediate_action_taken} onChange={e => setForm(p => ({ ...p, immediate_action_taken: e.target.value }))} rows={2} placeholder="What was done immediately..." />
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium mb-2">Notifications Made</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.manager_notified} onChange={e => setForm(p => ({ ...p, manager_notified: e.target.checked }))} />
                Registered Manager notified at
                {form.manager_notified && (
                  <Input type="time" value={form.manager_notified_datetime.slice(-5)} onChange={e => setForm(p => ({ ...p, manager_notified_datetime: e.target.value }))} className="w-24 h-8 text-xs" />
                )}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.la_notified} onChange={e => setForm(p => ({ ...p, la_notified: e.target.checked }))} />
                Local Authority notified at
                {form.la_notified && (
                  <Input type="time" value={form.la_notified_datetime.slice(-5)} onChange={e => setForm(p => ({ ...p, la_notified_datetime: e.target.value }))} className="w-24 h-8 text-xs" />
                )}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.ofsted_notified} onChange={e => setForm(p => ({ ...p, ofsted_notified: e.target.checked }))} />
                Ofsted (Reg 40) notified reference
                {form.ofsted_notified && (
                  <Input value={form.ofsted_notified_datetime} onChange={e => setForm(p => ({ ...p, ofsted_notified_datetime: e.target.value }))} placeholder="Ref #" className="w-32 h-8 text-xs" />
                )}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.police_involved} onChange={e => setForm(p => ({ ...p, police_involved: e.target.checked }))} />
                Police involved reference
                {form.police_involved && (
                  <Input value={form.police_reference} onChange={e => setForm(p => ({ ...p, police_reference: e.target.value }))} placeholder="Ref #" className="w-32 h-8 text-xs" />
                )}
              </label>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.follow_up_required} onChange={e => setForm(p => ({ ...p, follow_up_required: e.target.checked }))} />
              Follow-up required?
            </label>
            {form.follow_up_required && (
              <Textarea value={form.follow_up_actions} onChange={e => setForm(p => ({ ...p, follow_up_actions: e.target.value }))} rows={2} placeholder="Follow-up actions..." className="mt-2" />
            )}
          </div>

          <div className="border-t border-border px-6 py-4 flex gap-2 justify-end bg-muted/30 -mx-6 -mb-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Recording..." : "Record Event"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}