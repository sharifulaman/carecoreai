import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle, Upload, CheckCircle2, Clock, FileImage } from "lucide-react";
import { toast } from "sonner";
import { differenceInHours, formatDistanceToNow } from "date-fns";

const NOTIFICATION_TYPE_LABELS = {
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

export default function Reg27ActionModal({ notification, staffProfile, onClose, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    notification_method: "",
    notified_datetime: new Date().toISOString().slice(0, 16),
    ofsted_reference_number: "",
    rsm_notes: "",
    ofsted_screenshot_url: "",
  });
  const [uploading, setUploading] = useState(false);

  const eventDate = notification?.event_date ? new Date(notification.event_date) : null;
  const deadline = eventDate ? new Date(eventDate.getTime() + 24 * 3600 * 1000) : null;
  const hoursElapsed = eventDate ? differenceInHours(new Date(), eventDate) : 0;
  const hoursRemaining = deadline ? Math.max(0, differenceInHours(deadline, new Date())) : 0;
  const isUrgent = hoursRemaining <= 4;
  const isOverdue = hoursRemaining <= 0;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, ofsted_screenshot_url: file_url }));
      toast.success("Screenshot uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.notification_method || !form.notified_datetime) {
        throw new Error("Notification method and date/time are required");
      }
      return await base44.functions.invoke("reg27Workflow", {
        action: "rsm_notify",
        notification_id: notification.id,
        notification_method: form.notification_method,
        notified_datetime: new Date(form.notified_datetime).toISOString(),
        ofsted_reference_number: form.ofsted_reference_number,
        ofsted_screenshot_url: form.ofsted_screenshot_url,
        rsm_notes: form.rsm_notes,
        rsm_staff_profile: staffProfile,
      });
    },
    onSuccess: () => {
      toast.success("Ofsted notified — Reg 27 complete");
      qc.invalidateQueries({ queryKey: ["ofsted-notifications-approvals"] });
      qc.invalidateQueries({ queryKey: ["ofsted-notifications"] });
      onSaved?.();
      onClose();
    },
    onError: (err) => toast.error(err.message || "Error saving"),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 ${isOverdue ? 'bg-red-700' : isUrgent ? 'bg-red-600' : 'bg-amber-600'}`}>
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-bold text-lg">REG 27 — Mark as Notified to Ofsted</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Countdown */}
          <div className={`rounded-lg p-4 border-2 ${isOverdue ? 'bg-red-50 border-red-500' : isUrgent ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-400'}`}>
            <div className="flex items-center gap-3">
              <Clock className={`w-6 h-6 shrink-0 ${isOverdue ? 'text-red-600' : 'text-amber-700'}`} />
              <div>
                {isOverdue ? (
                  <p className="font-bold text-red-700">⚠️ OVERDUE — 24-hour window has passed</p>
                ) : (
                  <p className={`font-bold ${isUrgent ? 'text-red-700' : 'text-amber-800'}`}>
                    {hoursRemaining}h remaining to notify Ofsted
                  </p>
                )}
                {deadline && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Deadline: {deadline.toLocaleString("en-GB")} ({formatDistanceToNow(deadline, { addSuffix: true })})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Incident Summary (read-only prefilled) */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Incident Summary (pre-filled)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{NOTIFICATION_TYPE_LABELS[notification.notification_type] || notification.notification_type}</span></div>
              <div><span className="text-muted-foreground">YP:</span> <span className="font-medium">{notification.resident_initials || notification.resident_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Home:</span> <span className="font-medium">{notification.home_name}</span></div>
              <div><span className="text-muted-foreground">Event date:</span> <span className="font-medium">{eventDate?.toLocaleString("en-GB")}</span></div>
            </div>
            {notification.event_summary && (
              <p className="text-sm mt-2 text-foreground/80 border-t border-border pt-2">{notification.event_summary}</p>
            )}
            {notification.home_address && (
              <p className="text-xs text-muted-foreground">Address: {notification.home_address}</p>
            )}
          </div>

          {/* Notification details */}
          <div className="space-y-4">
            <p className="text-sm font-semibold">Notification Details <span className="text-red-500">*</span></p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Method <span className="text-red-500">*</span></label>
                <Select value={form.notification_method} onValueChange={v => setForm(p => ({ ...p, notification_method: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online_form">Online Form</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notified Date/Time <span className="text-red-500">*</span></label>
                <Input
                  type="datetime-local"
                  value={form.notified_datetime}
                  onChange={e => setForm(p => ({ ...p, notified_datetime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Ofsted Reference Number (if given)</label>
              <Input
                value={form.ofsted_reference_number}
                onChange={e => setForm(p => ({ ...p, ofsted_reference_number: e.target.value }))}
                placeholder="e.g. REG40-2026-001"
              />
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="text-sm font-medium flex items-center gap-1"><FileImage className="w-4 h-4" /> Screenshot / Evidence Upload</label>
              <div className="mt-1.5">
                {form.ofsted_screenshot_url ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800">Screenshot uploaded</p>
                      <a href={form.ofsted_screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline truncate block">View file</a>
                    </div>
                    <button onClick={() => setForm(p => ({ ...p, ofsted_screenshot_url: "" }))} className="text-muted-foreground hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/20 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload screenshot of Ofsted notification"}</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">RSM Notes</label>
              <Textarea
                value={form.rsm_notes}
                onChange={e => setForm(p => ({ ...p, rsm_notes: e.target.value }))}
                rows={3}
                placeholder="Any additional notes on the notification process..."
              />
            </div>
          </div>

          {/* Approval chain summary */}
          {(notification.submitted_by_name || notification.approved_by_tl_name || notification.approved_by_tm_name) && (
            <div className="bg-muted/20 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Approval Chain</p>
              {notification.submitted_by_name && <p className="text-xs">SW: <span className="font-medium">{notification.submitted_by_name}</span></p>}
              {notification.approved_by_tl_name && <p className="text-xs">TL: <span className="font-medium">{notification.approved_by_tl_name}</span> ✓</p>}
              {notification.approved_by_tm_name && <p className="text-xs">TM: <span className="font-medium">{notification.approved_by_tm_name}</span> ✓</p>}
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/20 sticky bottom-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.notification_method || !form.notified_datetime}
            className={isOverdue ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
          >
            {saveMutation.isPending ? "Saving..." : "Mark as Notified to Ofsted"}
          </Button>
        </div>
      </div>
    </div>
  );
}