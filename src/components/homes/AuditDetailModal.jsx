import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, X, Plus, Trash2, Bell, UserCheck, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

export default function AuditDetailModal({ audit, dateStr, existingCheck, homeId, homeName, user, staff = [], onClose }) {
  const qc = useQueryClient();
  const now = new Date();
  const defaultStart = `${dateStr}T08:00`;
  const defaultEnd = `${dateStr}T09:00`;

  const [startDT, setStartDT] = useState(existingCheck?.start_datetime || defaultStart);
  const [endDT, setEndDT] = useState(existingCheck?.end_datetime || defaultEnd);
  const [completionDT, setCompletionDT] = useState(existingCheck?.completion_datetime || "");
  const [items, setItems] = useState(
    existingCheck?.items?.length
      ? existingCheck.items
      : audit.items.map(i => ({ label: i.label, required: i.required ?? true, requires_note: i.requires_note ?? false, passed: false, notes: "" }))
  );
  const [issues, setIssues] = useState(existingCheck?.issues || []);
  const [additionalNotes, setAdditionalNotes] = useState(existingCheck?.additional_notes || "");
  const [alertUserIds, setAlertUserIds] = useState(existingCheck?.alert_sent_to || []);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sign-offs from existing record
  const signOffs = existingCheck?.sign_offs || [];
  const alreadySignedOff = signOffs.some(s => s.user_id === user?.email);

  const create = useMutation({
    mutationFn: (data) => base44.entities.HomeCheck.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-checks", homeId] }); toast.success("Check saved"); onClose(); },
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HomeCheck.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-checks", homeId] }); toast.success("Check updated"); onClose(); },
  });

  const toggleItem = (i) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, passed: !item.passed } : item));
  const setItemNote = (i, note) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, notes: note } : item));

  const addIssue = () => setIssues(prev => [...prev, { details: "", due_date: "", responsible_staff: "", resolved: false, resolution_date: "", resolution_details: "" }]);
  const updateIssue = (i, field, val) => setIssues(prev => prev.map((issue, idx) => idx === i ? { ...issue, [field]: val } : issue));
  const removeIssue = (i) => setIssues(prev => prev.filter((_, idx) => idx !== i));

  const toggleAlert = (userId) => setAlertUserIds(prev => prev.includes(userId) ? prev.filter(u => u !== userId) : [...prev, userId]);

  const handleSignOff = async () => {
    if (!existingCheck) { toast.error("Save the check first before signing off"); return; }
    const newSignOff = { user_id: user?.email, user_name: user?.full_name, signed_at: new Date().toISOString() };
    const updated = { sign_offs: [...signOffs, newSignOff] };
    await base44.entities.HomeCheck.update(existingCheck.id, updated);
    qc.invalidateQueries({ queryKey: ["home-checks", homeId] });
    toast.success("Signed off successfully");
    onClose();
  };

  const handleSave = () => {
    const passed = items.filter(i => i.passed).length;
    const total = items.length;
    const overall_status = passed === total ? "pass" : passed === 0 ? "fail" : "partial";
    const payload = {
      org_id: ORG_ID,
      home_id: homeId,
      home_name: homeName,
      checked_by_id: user?.email,
      checked_by_name: user?.full_name,
      date: dateStr,
      start_datetime: startDT,
      end_datetime: endDT,
      completion_datetime: completionDT || endDT,
      type: audit.key,
      items,
      issues,
      overall_status,
      description: audit.description || "",
      additional_notes: additionalNotes,
      sign_offs: existingCheck?.sign_offs || [],
      alert_sent_to: alertUserIds,
    };
    if (existingCheck) update.mutate({ id: existingCheck.id, data: payload });
    else create.mutate(payload);
  };

  const overallStatus = (() => {
    const passed = items.filter(i => i.passed).length;
    if (passed === items.length) return "pass";
    if (passed === 0) return "fail";
    return "partial";
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 p-0" onClick={onClose}>
      <div
        className="bg-card w-full max-w-2xl h-full overflow-y-auto shadow-2xl border-l border-border"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-start justify-between z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-bold text-base leading-snug">{audit.label}</h2>
              <span className="text-xs text-muted-foreground">{new Date(dateStr + "T08:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}, 8:00 AM</span>
              {overallStatus === "pass"
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : overallStatus === "fail"
                ? <XCircle className="w-5 h-5 text-red-500" />
                : <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center"><span className="text-white text-[10px] font-bold">!</span></div>}
            </div>
          </div>
          <button onClick={onClose} className="ml-4 text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Start / End DateTime */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date &amp; Time</label>
              <Input type="datetime-local" value={startDT} onChange={e => setStartDT(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date &amp; Time</label>
              <Input type="datetime-local" value={endDT} onChange={e => setEndDT(e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Assignees <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {(user?.full_name || "U").split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{user?.full_name || "You"}</span>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Checklist</label>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="w-10 py-2 px-3 text-left"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /></th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Item</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className={`border-b border-border/50 last:border-0 ${item.passed ? "bg-teal-50/40 dark:bg-teal-900/10" : ""}`}>
                      <td className="py-2 px-3">
                        <button onClick={() => toggleItem(i)}>
                          {item.passed
                            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                            : <XCircle className="w-5 h-5 text-red-400" />}
                        </button>
                      </td>
                      <td className="py-2 px-3">
                        <span className={item.passed ? "" : "line-through text-muted-foreground"}>{item.label}</span>
                        {item.required && <span className="text-amber-500 ml-1 text-xs">*</span>}
                        {item.requires_note && <span className="text-teal-500 ml-1 text-xs">*</span>}
                      </td>
                      <td className="py-2 px-3 min-w-[200px]">
                        <textarea
                          rows={1}
                          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/50 border border-transparent focus:border-border rounded-md px-2 py-1 transition-colors resize-none"
                          placeholder={item.requires_note ? "Note required..." : "Add note..."}
                          value={item.notes}
                          onChange={e => setItemNote(i, e.target.value)}
                          style={{ minHeight: "28px" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              <span className="text-amber-500">*</span> Required &nbsp;
              <span className="text-teal-500">*</span> Required with Note
            </p>
          </div>

          {/* Issues */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Issues</label>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addIssue}>
                <Plus className="w-3 h-3" /> Add Issue
              </Button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              {issues.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">No issues logged</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="py-2 px-3 text-left font-medium">Issue Details</th>
                      <th className="py-2 px-3 text-left font-medium">Due Date</th>
                      <th className="py-2 px-3 text-left font-medium">Responsible Staff</th>
                      <th className="py-2 px-3 text-left font-medium">Resolved?</th>
                      <th className="py-2 px-3 text-left font-medium">Resolution Date</th>
                      <th className="py-2 px-3 text-left font-medium">Resolution Details</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 px-3"><input className="w-full bg-transparent outline-none border-b border-border/50 text-xs" value={issue.details} onChange={e => updateIssue(i, "details", e.target.value)} placeholder="Describe issue..." /></td>
                        <td className="py-1.5 px-3"><input type="date" className="bg-transparent outline-none text-xs w-24" value={issue.due_date} onChange={e => updateIssue(i, "due_date", e.target.value)} /></td>
                        <td className="py-1.5 px-3">
                          <select className="bg-transparent outline-none text-xs w-full" value={issue.responsible_staff} onChange={e => updateIssue(i, "responsible_staff", e.target.value)}>
                            <option value="">Select...</option>
                            {staff.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <input type="checkbox" checked={issue.resolved} onChange={e => updateIssue(i, "resolved", e.target.checked)} className="w-4 h-4 rounded" />
                        </td>
                        <td className="py-1.5 px-3"><input type="date" className="bg-transparent outline-none text-xs w-24" value={issue.resolution_date} onChange={e => updateIssue(i, "resolution_date", e.target.value)} /></td>
                        <td className="py-1.5 px-3"><input className="w-full bg-transparent outline-none border-b border-border/50 text-xs" value={issue.resolution_details} onChange={e => updateIssue(i, "resolution_details", e.target.value)} placeholder="Details..." /></td>
                        <td className="py-1.5 px-3"><button onClick={() => removeIssue(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Completion DateTime */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Actual Date &amp; Time of Completion</label>
            <Input type="datetime-local" value={completionDT} onChange={e => setCompletionDT(e.target.value)} className="text-sm" />
          </div>

          {/* Description */}
          {audit.description && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 text-sm text-foreground leading-relaxed">
                {audit.description}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Attachments</label>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              No attachments
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Additional Notes</label>
            <Textarea
              value={additionalNotes}
              onChange={e => setAdditionalNotes(e.target.value)}
              placeholder="No completion notes"
              className="text-sm min-h-[80px] bg-amber-50/50 dark:bg-amber-900/10 border-amber-200"
            />
          </div>

          {/* Alert Users */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" /> Alert Users
              </label>
              <button onClick={() => setShowAlertPanel(!showAlertPanel)} className="text-xs text-primary hover:underline">
                {showAlertPanel ? "Hide" : "Select users to alert"}
              </button>
            </div>
            {showAlertPanel && (
              <div className="rounded-xl border border-border p-3 space-y-2">
                {staff.length === 0 && <p className="text-xs text-muted-foreground">No staff found</p>}
                {staff.map(s => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 px-2 py-1 rounded-lg">
                    <input type="checkbox" checked={alertUserIds.includes(s.email || s.id)} onChange={() => toggleAlert(s.email || s.id)} className="rounded w-4 h-4" />
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(s.full_name || "?").charAt(0)}
                    </div>
                    <span className="text-sm">{s.full_name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{s.role?.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            )}
            {alertUserIds.length > 0 && !showAlertPanel && (
              <p className="text-xs text-muted-foreground">{alertUserIds.length} user(s) will be alerted</p>
            )}
          </div>

          {/* Sign-offs */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" /> Sign-offs
            </label>
            <div className="rounded-xl border border-border overflow-hidden">
              {signOffs.length === 0 ? (
                <div className="px-4 py-4 text-xs text-muted-foreground">No sign-offs yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {signOffs.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(s.user_name || "?").split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm">Signed off by <strong>{s.user_name}</strong> <CheckCircle2 className="w-4 h-4 text-green-500 inline" /></p>
                        <p className="text-xs text-muted-foreground">On {new Date(s.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} at {new Date(s.signed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {existingCheck && !alreadySignedOff && (
              <Button variant="outline" size="sm" className="mt-2 gap-2 rounded-xl" onClick={handleSignOff}>
                <UserCheck className="w-4 h-4" /> Sign Off
              </Button>
            )}
          </div>

          {/* Completion stamp */}
          {existingCheck?.checked_by_name && (
            <p className="text-xs text-right text-muted-foreground">
              Completed at {existingCheck.completion_datetime ? new Date(existingCheck.completion_datetime).toLocaleString("en-GB") : existingCheck.date} by {existingCheck.checked_by_name}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3">
          <Button className="flex-1 rounded-xl" onClick={handleSave} disabled={create.isPending || update.isPending}>
            {existingCheck ? "Update Check" : "Save Check"}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}