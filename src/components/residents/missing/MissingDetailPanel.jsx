import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function hoursAgo(dt) {
  if (!dt) return null;
  return Math.round((Date.now() - new Date(dt).getTime()) / 3600000);
}

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB");
}

export default function MissingDetailPanel({ record, resident, staff, onClose, onUpdate }) {
  const qc = useQueryClient();
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [returnForm, setReturnForm] = useState({ returned_datetime: "", returned_to: "", condition_on_return: "well", condition_notes: "", la_notified: false, ofsted_notified: false });
  const [interviewForm, setInterviewForm] = useState({ return_interview_datetime: "", return_interview_by_id: "", where_went: "", who_with: "", concerns: "", emotional_state: "", exploitation_indicators: [], notes: "" });

  const hoursElapsed = hoursAgo(record.last_seen_datetime);

  const returnMutation = useMutation({
    mutationFn: async () => {
      const totalHours = hoursElapsed;
      await secureGateway.update("MissingFromHome", record.id, {
        status: "returned",
        returned_datetime: returnForm.returned_datetime,
        returned_to: returnForm.returned_to,
        condition_on_return: returnForm.condition_on_return,
        condition_notes: returnForm.condition_notes,
        la_notified: returnForm.la_notified,
        ofsted_notified: hoursElapsed > 24 ? true : returnForm.ofsted_notified,
        total_hours_missing: totalHours,
      });
      // Create notification about return interview deadline
      await secureGateway.create("Notification", {
        org_id: ORG_ID,
        type: "return_interview_due",
        priority: "high",
        title: `Return interview due for ${resident?.display_name}`,
        message: `${resident?.display_name} has returned. Return interview must be completed within 72 hours.`,
        recipient_role: "team_leader",
      });
    },
    onSuccess: () => {
      toast.success("Marked as returned. Interview deadline: 72 hours");
      setShowReturnForm(false);
      qc.invalidateQueries({ queryKey: ["mfh-records"] });
      onUpdate();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const interviewMutation = useMutation({
    mutationFn: async () => {
      await secureGateway.update("MissingFromHome", record.id, {
        return_interview_completed: true,
        return_interview_datetime: interviewForm.return_interview_datetime,
        return_interview_by_id: interviewForm.return_interview_by_id,
        return_interview_notes: interviewForm.notes,
        status: "closed",
      });
    },
    onSuccess: () => {
      toast.success("Return interview logged and record closed");
      setShowInterviewForm(false);
      qc.invalidateQueries({ queryKey: ["mfh-records"] });
      onUpdate();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">{resident?.display_name} — Missing from {record.home_name}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Status Banner */}
        <div className={`px-6 py-3 border-b border-border ${record.status === "active" ? "bg-red-100 text-red-700" : record.status === "returned" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
          <p className="font-bold">Status: {record.status.toUpperCase()}</p>
          {record.status === "active" && <p className="text-sm">Missing for <strong>{hoursElapsed} hours</strong></p>}
          {record.status === "returned" && !record.return_interview_completed && (
            <p className="text-sm">Return interview due within <strong>72 hours</strong> of {formatDateTime(record.returned_datetime)}</p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Missing Details */}
          <div>
            <h3 className="font-semibold mb-3">Missing Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Last Seen Date & Time</p><p className="font-medium">{formatDateTime(record.last_seen_datetime)}</p></div>
              <div><p className="text-muted-foreground">Last Seen Location</p><p className="font-medium">{record.last_seen_location || "—"}</p></div>
              <div><p className="text-muted-foreground">Last Seen By</p><p className="font-medium">{record.last_seen_by || "—"}</p></div>
              <div><p className="text-muted-foreground">Reported Missing</p><p className="font-medium">{formatDateTime(record.reported_missing_datetime)}</p></div>
              <div><p className="text-muted-foreground">Risk Level</p><p className="font-medium capitalize">{record.risk_level_at_time}</p></div>
              <div><p className="text-muted-foreground">CSE Risk Considered</p><p className="font-medium">{record.cse_risk_considered ? "Yes" : "No"}</p></div>
            </div>
          </div>

          {/* Police Report */}
          <div>
            <h3 className="font-semibold mb-3">Police Report</h3>
            {record.reported_to_police ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Police Reference</p><p className="font-medium">{record.police_reference_number}</p></div>
                <div><p className="text-muted-foreground">Police Station</p><p className="font-medium">{record.police_station || "—"}</p></div>
                <div><p className="text-muted-foreground">Reported At</p><p className="font-medium">{formatDateTime(record.police_report_datetime)}</p></div>
              </div>
            ) : (
              <p className="text-sm text-red-700 font-medium">⚠️ Not reported to police</p>
            )}
          </div>

          {/* Return Details */}
          {record.status === "returned" && (
            <div>
              <h3 className="font-semibold mb-3">Return Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Returned At</p><p className="font-medium">{formatDateTime(record.returned_datetime)}</p></div>
                <div><p className="text-muted-foreground">Returned To</p><p className="font-medium">{record.returned_to || "—"}</p></div>
                <div><p className="text-muted-foreground">Condition</p><p className="font-medium capitalize">{record.condition_on_return}</p></div>
                <div><p className="text-muted-foreground">Total Hours Missing</p><p className="font-medium">{record.total_hours_missing}</p></div>
              </div>
              {record.condition_notes && <p className="text-sm mt-2"><strong>Notes:</strong> {record.condition_notes}</p>}
            </div>
          )}

          {/* Return Interview */}
          {record.status === "returned" && record.return_interview_completed && (
            <div>
              <h3 className="font-semibold mb-3">Return Interview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Interview Date</p><p className="font-medium">{formatDateTime(record.return_interview_datetime)}</p></div>
                <div><p className="text-muted-foreground">Conducted By</p><p className="font-medium">{record.return_interview_by_name}</p></div>
              </div>
              {record.return_interview_notes && <p className="text-sm mt-2"><strong>Notes:</strong> {record.return_interview_notes}</p>}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="border-t border-border px-6 py-4 bg-muted/30 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <div className="flex gap-2">
            {record.status === "active" && (
              <Button onClick={() => setShowReturnForm(true)} className="bg-green-600 hover:bg-green-700">Mark as Returned</Button>
            )}
            {record.status === "returned" && !record.return_interview_completed && (
              <Button onClick={() => setShowInterviewForm(true)} className="bg-blue-600 hover:bg-blue-700">Log Return Interview</Button>
            )}
          </div>
        </div>

        {/* Return Form Modal */}
        {showReturnForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full">
              <h3 className="font-bold mb-4">Mark as Returned</h3>
              <div className="space-y-4">
                <div><label className="text-sm font-medium">Date & Time Returned *</label>
                  <Input type="datetime-local" value={returnForm.returned_datetime} onChange={e => setReturnForm(p => ({ ...p, returned_datetime: e.target.value }))} />
                </div>
                <div><label className="text-sm font-medium">Returned To</label>
                  <Input value={returnForm.returned_to} onChange={e => setReturnForm(p => ({ ...p, returned_to: e.target.value }))} />
                </div>
                <div><label className="text-sm font-medium">Condition on Return</label>
                  <Select value={returnForm.condition_on_return} onValueChange={v => setReturnForm(p => ({ ...p, condition_on_return: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="well">Well</SelectItem>
                      <SelectItem value="distressed">Distressed</SelectItem>
                      <SelectItem value="intoxicated">Intoxicated</SelectItem>
                      <SelectItem value="injured">Injured</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">Condition Notes</label>
                  <Textarea value={returnForm.condition_notes} onChange={e => setReturnForm(p => ({ ...p, condition_notes: e.target.value }))} rows={3} />
                </div>
                <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={returnForm.la_notified} onChange={e => setReturnForm(p => ({ ...p, la_notified: e.target.checked }))} />
                  LA notified of return?
                </label></div>
                {hoursElapsed > 24 && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
                    <p className="text-sm text-red-700">Child was missing for over 24 hours. Ofsted must be notified under Regulation 40.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowReturnForm(false)}>Cancel</Button>
                <Button onClick={() => returnMutation.mutate()} disabled={!returnForm.returned_datetime || returnMutation.isPending}>
                  {returnMutation.isPending ? "Saving..." : "Mark Returned"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Interview Form Modal */}
        {showInterviewForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full">
              <h3 className="font-bold mb-4">Log Return Interview</h3>
              <div className="space-y-4">
                <div><label className="text-sm font-medium">Interview Date & Time *</label>
                  <Input type="datetime-local" value={interviewForm.return_interview_datetime} onChange={e => setInterviewForm(p => ({ ...p, return_interview_datetime: e.target.value }))} />
                </div>
                <div><label className="text-sm font-medium">Conducted By *</label>
                  <Select value={interviewForm.return_interview_by_id} onValueChange={v => setInterviewForm(p => ({ ...p, return_interview_by_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">Notes</label>
                  <Textarea value={interviewForm.notes} onChange={e => setInterviewForm(p => ({ ...p, notes: e.target.value }))} placeholder="Interview findings, child's account, any concerns..." rows={4} />
                </div>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowInterviewForm(false)}>Cancel</Button>
                <Button onClick={() => interviewMutation.mutate()} disabled={!interviewForm.return_interview_datetime || !interviewForm.return_interview_by_id || interviewMutation.isPending}>
                  {interviewMutation.isPending ? "Saving..." : "Log Interview"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}