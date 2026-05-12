import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

export default function ReturnToWorkModal({ leaveRequest, staffMember, conductedBy, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    return_date: leaveRequest?.date_to || new Date().toISOString().split("T")[0],
    interview_date: new Date().toISOString().split("T")[0],
    conducted_by: conductedBy || "",
    notes: "",
    adjustments_needed: false,
    adjustments_detail: "",
    fit_for_work: true,
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () => secureGateway.create("ReturnToWorkRecord", {
      org_id: ORG_ID,
      staff_id: leaveRequest?.staff_id || staffMember?.id,
      staff_name: leaveRequest?.staff_name || staffMember?.full_name || "",
      leave_request_id: leaveRequest?.id,
      ...form,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rtw-records"] });
      toast.success("Return to Work record saved");
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Return to Work Interview</h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground">
          Recording return to work for <strong>{leaveRequest?.staff_name || staffMember?.full_name}</strong> following sick leave {leaveRequest?.date_from} – {leaveRequest?.date_to}.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Return Date</label>
            <Input type="date" className="mt-1" value={form.return_date} onChange={e => f("return_date", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Interview Date</label>
            <Input type="date" className="mt-1" value={form.interview_date} onChange={e => f("interview_date", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Conducted By</label>
          <Input className="mt-1" placeholder="Manager's name" value={form.conducted_by} onChange={e => f("conducted_by", e.target.value)} />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Notes from Interview</label>
          <textarea className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 min-h-[80px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Summary of conversation…"
            value={form.notes} onChange={e => f("notes", e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" className="rounded w-3 h-3" checked={form.adjustments_needed}
            onChange={e => f("adjustments_needed", e.target.checked)} />
          Adjustments needed on return
        </label>

        {form.adjustments_needed && (
          <div>
            <label className="text-xs text-muted-foreground">Adjustment Details</label>
            <Input className="mt-1" placeholder="e.g. phased return, reduced hours…" value={form.adjustments_detail} onChange={e => f("adjustments_detail", e.target.value)} />
          </div>
        )}

        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" className="rounded w-3 h-3" checked={form.fit_for_work}
            onChange={e => f("fit_for_work", e.target.checked)} />
          Confirmed fit for work
        </label>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save Record"}
          </Button>
        </div>
      </div>
    </div>
  );
}