import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { createNotification } from "@/lib/createNotification";

const STATUSES = ["Attended", "Not Attended", "N/A"];

const todayStr = new Date().toISOString().split("T")[0];

export default function EducationAttendanceModal({ resident, user, existingLog, onClose }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(existingLog?.content?.edu_attendance_status || "");
  const [date, setDate] = useState(existingLog?.content?.date || todayStr);
  const [notes, setNotes] = useState(existingLog?.content?.notes || "");

  const create = useMutation({
    mutationFn: (data) => secureGateway.create("DailyLog", data),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ["all-daily-logs"] });
      toast.success("Attendance saved");
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-daily-logs"] }); toast.success("Attendance updated"); onClose(); },
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
      shift: "morning",
      flags: ["edu_attendance"],
      content: { edu_attendance_status: status, date, notes },
    };
    if (existingLog) {
      update.mutate({ id: existingLog.id, data: payload });
    } else {
      create.mutate(payload);
    }
  };

  const isPending = create.isPending || update.isPending;

  const formatDateDisplay = (d) => {
    if (!d) return "";
    return new Date(d + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <h2 className="font-bold text-base leading-snug">
            Edit {resident.display_name}'s Education Attendance
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Status */}
          <div>
            <p className="text-sm font-medium mb-2">Status <span className="text-red-500">*</span></p>
            <div className="flex border border-border rounded-lg overflow-hidden">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    status === s
                      ? s === "Attended" ? "bg-green-500/10 text-green-700 border-b-2 border-green-500"
                        : s === "Not Attended" ? "bg-red-500/10 text-red-700 border-b-2 border-red-500"
                        : "bg-amber-500/10 text-amber-700 border-b-2 border-amber-500"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <p className="text-sm font-medium mb-2">Date for which attendance is being recorded <span className="text-red-500">*</span></p>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-sm text-muted-foreground mt-1 ml-1">{formatDateDisplay(date)}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm font-medium mb-2">Notes</p>
            <Textarea
              rows={3}
              placeholder="Add notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={isPending}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}