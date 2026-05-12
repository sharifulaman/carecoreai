import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { createNotification } from "@/lib/createNotification";

const STATUS_OPTIONS = ["In", "Out", "N/A"];

export default function CurrentStatusModal({ resident, user, existingLog, onClose }) {
  const qc = useQueryClient();
  const now = new Date();
  const defaultDt = now.toISOString().slice(0, 16);

  const [status, setStatus] = useState(existingLog?.content?.status || "In");
  const [datetime, setDatetime] = useState(existingLog?.content?.datetime || defaultDt);
  const [notes, setNotes] = useState(existingLog?.content?.notes || "");
  const [linkedAppointmentId, setLinkedAppointmentId] = useState("");

  const todayStr = now.toISOString().split("T")[0];
  const { data: todaysApts = [] } = useQuery({
    queryKey: ["todays-apts", resident?.id],
    queryFn: async () => {
      if (!resident?.id) return [];
      const all = await secureGateway.filter("Appointment", { resident_id: resident.id, is_deleted: false }, "-start_datetime", 20);
      return all.filter(a => a.start_datetime?.startsWith(todayStr));
    },
    enabled: !!resident?.id,
    staleTime: 5 * 60 * 1000,
  });

  const create = useMutation({
    mutationFn: (data) => secureGateway.create("DailyLog", data),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ["daily-logs-recent"] });
      qc.invalidateQueries({ queryKey: ["all-daily-logs"] });
      toast.success("Status saved");
      // Trigger 3 — flagged log notification
      if (payload.flagged) {
        secureGateway.filter("Home", { id: payload.home_id }).then(homes => {
          const home = homes[0];
          secureGateway.filter("StaffProfile").then(allStaff => {
            const tl = home?.team_leader_id ? allStaff.find(s => s.id === home.team_leader_id) : null;
            const admin = allStaff.find(s => s.role === "admin");
            const msg = `A flagged daily log has been submitted for ${payload.resident_name} by ${payload.worker_name} on ${payload.date}. Please review.`;
            if (tl?.user_id) createNotification({ recipient_user_id: tl.user_id, recipient_staff_id: tl.id, title: "Flagged Log — Action Required", body: msg, type: "flagged_log", link: "/residents?tab=yp-cards", priority: "high" });
            if (admin?.user_id && admin.id !== tl?.id) createNotification({ recipient_user_id: admin.user_id, recipient_staff_id: admin.id, title: "Flagged Log — Action Required", body: msg, type: "flagged_log", link: "/residents?tab=yp-cards", priority: "high" });
          }).catch(() => {});
        }).catch(() => {});
      }
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => secureGateway.update("DailyLog", id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-logs-recent"] });
      qc.invalidateQueries({ queryKey: ["all-daily-logs"] });
      toast.success("Status updated");
      onClose();
    },
  });

  const handleSave = () => {
    const dateStr = datetime.split("T")[0];
    const payload = {
      org_id: ORG_ID,
      resident_id: resident.id,
      resident_name: resident.display_name,
      worker_id: user?.email,
      worker_name: user?.full_name,
      home_id: resident.home_id,
      date: dateStr,
      shift: "morning",
      flags: ["current_status"],
      content: { status, datetime, notes },
    };
    if (existingLog) {
      update.mutate({ id: existingLog.id, data: payload });
    } else {
      create.mutate(payload);
      if (linkedAppointmentId) {
        secureGateway.update("Appointment", linkedAppointmentId, {
          status: "completed",
          outcome_notes: `Logged via Daily Log on ${new Date().toLocaleDateString("en-GB")}`,
        }).catch(() => {});
      }
    }
  };

  const fmtDisplay = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">Edit {resident.display_name}'s Current Status</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Status picker */}
        <div>
          <p className="text-sm font-medium mb-2">Status <span className="text-red-500">*</span></p>
          <div className="flex rounded-lg border border-border overflow-hidden w-fit">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setStatus(opt)}
                className={`px-5 py-2 text-sm font-medium transition-colors border-r last:border-r-0 border-border ${
                  status === opt
                    ? opt === "In" ? "bg-teal-600 text-white"
                      : opt === "Out" ? "bg-red-500 text-white"
                      : "bg-amber-400 text-white"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Date/time */}
        <div>
          <p className="text-sm font-medium mb-2">Date for which the status is being recorded <span className="text-red-500">*</span></p>
          <div className="relative">
            <input
              type="datetime-local"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              className="w-full h-10 px-3 pr-10 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {datetime && (
            <p className="text-xs text-muted-foreground mt-1">{fmtDisplay(datetime)}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-medium mb-2">Notes</p>
          <Textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes..."
            className="text-sm resize-none"
          />
        </div>

        {/* Linked Appointment */}
        {todaysApts.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Link to Today's Appointment</p>
            <select
              value={linkedAppointmentId}
              onChange={e => setLinkedAppointmentId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Link to an appointment (optional)</option>
              {todaysApts.map(apt => (
                <option key={apt.id} value={apt.id}>
                  {new Date(apt.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — {apt.title}
                </option>
              ))}
            </select>
            {linkedAppointmentId && (
              <p className="text-xs text-muted-foreground mt-1">Selecting this will mark the appointment as completed on save.</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleSave}
            disabled={create.isPending || update.isPending}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}