import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { createNotification } from "@/lib/createNotification";

const STATUSES = ["Stayed In", "Stayed Out", "N/A"];

export default function NightStayModal({ resident, user, existingLog, onClose }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const [status, setStatus] = useState(existingLog?.content?.night_stay_status || null);
  const [date, setDate] = useState(existingLog?.content?.night_stay_date || today);
  const [notes, setNotes] = useState(existingLog?.content?.notes || "");

  const create = useMutation({
    mutationFn: (data) => secureGateway.create("DailyLog", data),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ["all-daily-logs"] });
      toast.success("Night stay recorded");
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-daily-logs"] }); toast.success("Night stay updated"); onClose(); },
  });

  const handleSave = () => {
    if (!status) { toast.error("Please select a status"); return; }
    const payload = {
      org_id: ORG_ID,
      resident_id: resident.id,
      resident_name: resident.display_name,
      worker_id: user?.email,
      worker_name: user?.full_name,
      home_id: resident.home_id,
      date,
      shift: "night",
      flags: ["night_stay"],
      content: { night_stay_status: status, night_stay_date: date, notes },
    };
    if (existingLog) update.mutate({ id: existingLog.id, data: payload });
    else create.mutate(payload);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-base">Edit {resident.display_name}'s Night Stay Attendance</h2>
            <p className="text-xs text-muted-foreground mt-0.5">For {new Date(date + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status */}
        <div>
          <p className="text-sm font-medium mb-2">Status <span className="text-red-500">*</span></p>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${status === s ? "bg-teal-600 text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <p className="text-sm font-medium mb-2">Date for which attendance is being recorded <span className="text-red-500">*</span></p>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-medium mb-2">Notes</p>
          <Textarea
            rows={4}
            placeholder="Add notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={isPending}>Save</Button>
        </div>
      </div>
    </div>
  );
}