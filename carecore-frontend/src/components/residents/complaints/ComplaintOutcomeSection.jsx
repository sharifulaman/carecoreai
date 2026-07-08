import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { logOutcomeAudit, OUTCOME_ACTIONS } from "@/lib/logAudit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import OutcomeWorkflowPanel from "@/components/outcome/OutcomeWorkflowPanel";

const OUTCOME_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under Review" },
  { value: "response_issued", label: "Response Issued" },
  { value: "resolved", label: "Resolved" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

const OUTCOME_CATEGORY_OPTIONS = [
  { value: "upheld", label: "Upheld" },
  { value: "partially_upheld", label: "Partially Upheld" },
  { value: "not_upheld", label: "Not Upheld" },
  { value: "resolved_informally", label: "Resolved Informally" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "escalated_externally", label: "Escalated Externally" },
];

const MANAGER_REVIEW_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

function YNField({ label, value, onChange, options, required }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ComplaintOutcomeSection({ complaint, staff = [], user, staffProfile, onUpdate }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(!!complaint.outcome_status);

  // Derive effective staffProfile from user if not provided
  const effectiveStaff = staffProfile || user;
  const currentOutcomeStatus = complaint.outcome_manager_review_status || "pending";
  const isLocked = ["approved", "closed"].includes(currentOutcomeStatus);
  const [data, setData] = useState({
    outcome_status: complaint.outcome_status || "",
    outcome_category: complaint.outcome_category || "",
    response_given_to_yp: complaint.response_given_to_yp ?? null,
    yp_understood_outcome: complaint.yp_understood_outcome || "",
    impact_on_yp: complaint.impact_on_yp || "",
    service_learning_identified: complaint.service_learning_identified || "",
    practice_changed: complaint.practice_changed ?? null,
    what_changed: complaint.what_changed || "",
    apology_given: complaint.apology_given || "",
    outcome_follow_up_required: complaint.outcome_follow_up_required ?? false,
    outcome_follow_up_action: complaint.outcome_follow_up_action || "",
    outcome_responsible_person_id: complaint.outcome_responsible_person_id || "",
    outcome_responsible_person_name: complaint.outcome_responsible_person_name || "",
    outcome_target_date: complaint.outcome_target_date || "",
    outcome_manager_review_status: complaint.outcome_manager_review_status || "pending",
    outcome_manager_review_note: complaint.outcome_manager_review_note || "",
  });

  const set = (key, val) => setData(p => ({ ...p, [key]: val }));

  const needsLearning = data.outcome_category === "upheld" || data.outcome_category === "partially_upheld";
  const validationError = needsLearning && !data.service_learning_identified?.trim()
    ? "Service learning is required when complaint is upheld or partially upheld."
    : data.outcome_follow_up_required && !data.outcome_follow_up_action?.trim()
    ? "Follow-up action is required when follow-up is selected."
    : null;

  const auditBase = {
    entityType: "Complaint",
    entityId: complaint.id,
    recordReference: complaint.complaint_id || complaint.id,
    recordTitle: `Complaint – ${complaint.resident_name || ""} (${complaint.complaint_id || ""})`,
    actorId: effectiveStaff?.id || "",
    actorName: effectiveStaff?.full_name || "",
    actorRole: effectiveStaff?.role || "",
    homeId: complaint.home_id || "",
    residentId: complaint.resident_id || "",
    orgId: ORG_ID,
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["complaints"] });
    if (onUpdate) onUpdate();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const responsible = staff.find(s => s.id === data.outcome_responsible_person_id);
      const payload = {
        ...data,
        outcome_responsible_person_name: responsible?.full_name || data.outcome_responsible_person_name || "",
        outcome_recorded_by_id: effectiveStaff?.id || "",
        outcome_recorded_by_name: effectiveStaff?.full_name || "",
        outcome_recorded_at: new Date().toISOString(),
      };
      await secureGateway.update("Complaint", complaint.id, payload);

      // Create follow-up task if required (only once)
      if (data.outcome_follow_up_required && data.outcome_follow_up_action && !complaint.outcome_follow_up_required) {
        await secureGateway.create("HomeTask", {
          org_id: ORG_ID,
          home_id: complaint.home_id,
          title: `Complaint follow-up: ${complaint.complaint_id || complaint.id}`,
          description: data.outcome_follow_up_action,
          assigned_to_id: data.outcome_responsible_person_id || "",
          assigned_to_name: responsible?.full_name || "",
          due_date: data.outcome_target_date || "",
          priority: "high",
          status: "open",
          source_entity: "Complaint",
          source_id: complaint.id,
        }).catch(() => {});
        await logOutcomeAudit({ ...auditBase, action: OUTCOME_ACTIONS.FOLLOW_UP_CREATED, actionLabel: "Follow-up task created", newValues: { follow_up_action: data.outcome_follow_up_action }, severity: "medium" });
      }

      // Create YP communication task if YP didn't understand outcome
      if (data.yp_understood_outcome === "no" && complaint.yp_understood_outcome !== "no") {
        await secureGateway.create("HomeTask", {
          org_id: ORG_ID,
          home_id: complaint.home_id,
          title: `Follow-up communication needed: ${complaint.complaint_id || complaint.id}`,
          description: `Young person (${complaint.resident_name}) did not understand the complaint outcome. Follow-up communication required.`,
          assigned_to_id: data.outcome_responsible_person_id || "",
          assigned_to_name: responsible?.full_name || "",
          due_date: data.outcome_target_date || "",
          priority: "high",
          status: "open",
          source_entity: "Complaint",
          source_id: complaint.id,
        }).catch(() => {});
        await logOutcomeAudit({ ...auditBase, action: OUTCOME_ACTIONS.FOLLOW_UP_CREATED, actionLabel: "YP communication follow-up task created", newValues: { yp_understood_outcome: "no" }, severity: "medium" });
      }

      await logOutcomeAudit({
        ...auditBase,
        action: OUTCOME_ACTIONS.OUTCOME_ADDED,
        actionLabel: "Complaint outcome saved",
        oldValues: { outcome_status: complaint.outcome_status, outcome_category: complaint.outcome_category },
        newValues: { outcome_status: data.outcome_status, outcome_category: data.outcome_category },
        severity: "medium",
      });
    },
    onSuccess: () => { toast.success("Outcome saved"); invalidate(); },
    onError: (err) => toast.error("Save failed: " + err.message),
  });

  // Workflow mutations
  const submitMutation = useMutation({
    mutationFn: async (note) => {
      await secureGateway.update("Complaint", complaint.id, { outcome_manager_review_status: "pending", outcome_recorded_at: new Date().toISOString() });
      await logOutcomeAudit({ ...auditBase, action: OUTCOME_ACTIONS.SUBMITTED, actionLabel: "Complaint outcome submitted for review", oldValues: { outcome_manager_review_status: currentOutcomeStatus }, newValues: { outcome_manager_review_status: "pending" }, reasonComment: note || "", severity: "medium" });
    },
    onSuccess: () => { toast.success("Submitted for manager review"); invalidate(); },
    onError: () => toast.error("Submit failed"),
  });

  const approveMutation = useMutation({
    mutationFn: async (note) => {
      await secureGateway.update("Complaint", complaint.id, { outcome_manager_review_status: "approved", outcome_manager_review_note: note || data.outcome_manager_review_note });
      await logOutcomeAudit({ ...auditBase, action: OUTCOME_ACTIONS.APPROVED, actionLabel: "Manager approved complaint outcome", oldValues: { outcome_manager_review_status: currentOutcomeStatus }, newValues: { outcome_manager_review_status: "approved" }, reasonComment: note || "", severity: "medium" });
    },
    onSuccess: () => { toast.success("Outcome approved"); invalidate(); },
    onError: () => toast.error("Approve failed"),
  });

  const changesMutation = useMutation({
    mutationFn: async (reason) => {
      await secureGateway.update("Complaint", complaint.id, { outcome_manager_review_status: "changes_requested", outcome_manager_review_note: reason });
      await logOutcomeAudit({ ...auditBase, action: OUTCOME_ACTIONS.CHANGES_REQUESTED, actionLabel: "Manager requested changes to complaint outcome", oldValues: { outcome_manager_review_status: currentOutcomeStatus }, newValues: { outcome_manager_review_status: "changes_requested" }, reasonComment: reason, severity: "medium" });
    },
    onSuccess: () => { toast.success("Changes requested"); invalidate(); },
    onError: () => toast.error("Failed to request changes"),
  });

  const escalateMutation = useMutation({
    mutationFn: async ({ reason, recipientName }) => {
      await secureGateway.update("Complaint", complaint.id, { outcome_manager_review_status: "escalated", outcome_manager_review_note: `[Escalated to ${recipientName}]: ${reason}` });
      await logOutcomeAudit({ ...auditBase, action: OUTCOME_ACTIONS.ESCALATED, actionLabel: `Complaint outcome escalated to ${recipientName}`, oldValues: { outcome_manager_review_status: currentOutcomeStatus }, newValues: { outcome_manager_review_status: "escalated", escalated_to: recipientName }, reasonComment: reason, severity: "high" });
    },
    onSuccess: () => { toast.success("Escalated"); invalidate(); },
    onError: () => toast.error("Escalate failed"),
  });

  const closeMutation = useMutation({
    mutationFn: async (note) => {
      await secureGateway.update("Complaint", complaint.id, { outcome_manager_review_status: "closed", outcome_manager_review_note: note || data.outcome_manager_review_note });
      await logOutcomeAudit({ ...auditBase, action: OUTCOME_ACTIONS.CLOSED, actionLabel: "Complaint outcome closed", oldValues: { outcome_manager_review_status: currentOutcomeStatus }, newValues: { outcome_manager_review_status: "closed" }, reasonComment: note || "", severity: "low" });
    },
    onSuccess: () => { toast.success("Record closed"); invalidate(); },
    onError: () => toast.error("Close failed"),
  });

  const anySaving = saveMutation.isPending || submitMutation.isPending || approveMutation.isPending ||
    changesMutation.isPending || escalateMutation.isPending || closeMutation.isPending;

  const handleSave = () => {
    if (validationError) { toast.error(validationError); return; }
    saveMutation.mutate();
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-950/20 dark:to-slate-900/10 hover:from-blue-100 hover:to-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-bold text-foreground">Complaint Outcome / Learning</span>
          {complaint.outcome_status && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {OUTCOME_STATUS_OPTIONS.find(o => o.value === complaint.outcome_status)?.label || complaint.outcome_status}
            </span>
          )}
          {complaint.outcome_category && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              complaint.outcome_category === "upheld" ? "bg-red-100 text-red-700" :
              complaint.outcome_category === "partially_upheld" ? "bg-amber-100 text-amber-700" :
              "bg-green-100 text-green-700"
            }`}>
              {OUTCOME_CATEGORY_OPTIONS.find(o => o.value === complaint.outcome_category)?.label}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 py-5 space-y-5 bg-card">
          {/* Validation warning */}
          {needsLearning && !data.service_learning_identified?.trim() && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">Service learning is required when complaint outcome is Upheld or Partially Upheld.</p>
            </div>
          )}

          {/* Row 1: Status + Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Complaint Status</label>
              <Select value={data.outcome_status} onValueChange={v => set("outcome_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  {OUTCOME_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Complaint Outcome</label>
              <Select value={data.outcome_category} onValueChange={v => set("outcome_category", v)}>
                <SelectTrigger><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                <SelectContent>
                  {OUTCOME_CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: YP Response */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <YNField
              label="Response Given to Young Person"
              value={data.response_given_to_yp === true ? "yes" : data.response_given_to_yp === false ? "no" : ""}
              onChange={v => set("response_given_to_yp", v === "yes")}
              options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
            />
            <YNField
              label="Young Person Understood Outcome"
              value={data.yp_understood_outcome}
              onChange={v => set("yp_understood_outcome", v)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "partially", label: "Partially" },
                { value: "not_confirmed", label: "Not Confirmed" },
              ]}
            />
          </div>

          {/* YP didn't understand — show notice */}
          {data.yp_understood_outcome === "no" && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">A follow-up communication task will be created automatically on save.</p>
            </div>
          )}

          {/* Impact on YP */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Impact on Young Person</label>
            <Textarea
              value={data.impact_on_yp}
              onChange={e => set("impact_on_yp", e.target.value)}
              rows={2}
              placeholder="Describe the impact this complaint had on the young person..."
            />
          </div>

          {/* Service Learning */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Service Learning Identified
              {needsLearning && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <Textarea
              value={data.service_learning_identified}
              onChange={e => set("service_learning_identified", e.target.value)}
              rows={2}
              placeholder="What learning has been identified from this complaint?"
              className={needsLearning && !data.service_learning_identified?.trim() ? "border-amber-400" : ""}
            />
          </div>

          {/* Practice Changed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <YNField
              label="Practice Changed"
              value={data.practice_changed === true ? "yes" : data.practice_changed === false ? "no" : ""}
              onChange={v => set("practice_changed", v === "yes")}
              options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
            />
            <YNField
              label="Apology Given"
              value={data.apology_given}
              onChange={v => set("apology_given", v)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "not_applicable", label: "N/A" },
              ]}
            />
          </div>

          {data.practice_changed && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">What Changed?</label>
              <Textarea
                value={data.what_changed}
                onChange={e => set("what_changed", e.target.value)}
                rows={2}
                placeholder="Describe the practice change made..."
              />
            </div>
          )}

          {/* Follow-up */}
          <div className="border-t pt-4">
            <YNField
              label="Follow-Up Required"
              value={data.outcome_follow_up_required ? "yes" : data.outcome_follow_up_required === false ? "no" : ""}
              onChange={v => set("outcome_follow_up_required", v === "yes")}
              options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
            />
          </div>

          {data.outcome_follow_up_required && (
            <div className="space-y-3 bg-muted/20 rounded-lg p-4 border border-border">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Follow-Up Action <span className="text-red-500">*</span></label>
                <Textarea
                  value={data.outcome_follow_up_action}
                  onChange={e => set("outcome_follow_up_action", e.target.value)}
                  rows={2}
                  placeholder="Describe the follow-up action required..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Responsible Person</label>
                  <Select value={data.outcome_responsible_person_id} onValueChange={v => set("outcome_responsible_person_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Target Date</label>
                  <Input
                    type="date"
                    value={data.outcome_target_date}
                    onChange={e => set("outcome_target_date", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Manager Review */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manager Review</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Review Status</label>
                <Select value={data.outcome_manager_review_status} onValueChange={v => set("outcome_manager_review_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MANAGER_REVIEW_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Manager Review Note</label>
              <Textarea
                value={data.outcome_manager_review_note}
                onChange={e => set("outcome_manager_review_note", e.target.value)}
                rows={2}
                placeholder="Manager comments on outcome..."
              />
            </div>
          </div>

          {/* Recorded by / timestamp */}
          {complaint.outcome_recorded_at && (
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Last updated by {complaint.outcome_recorded_by_name} on {format(new Date(complaint.outcome_recorded_at), "dd MMM yyyy HH:mm")}
            </div>
          )}

          {/* Save Button */}
          {!isLocked && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={anySaving} className="gap-2">
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? "Saving..." : "Save Outcome"}
              </Button>
            </div>
          )}

          {/* Workflow Panel */}
          <OutcomeWorkflowPanel
            status={currentOutcomeStatus === "pending" ? "draft" : currentOutcomeStatus}
            isLocked={isLocked}
            createdById={complaint.received_by_id || ""}
            staffProfile={effectiveStaff}
            staff={staff}
            onSubmit={(note) => submitMutation.mutateAsync(note)}
            onApprove={(note) => approveMutation.mutateAsync(note)}
            onRequestChanges={(reason) => changesMutation.mutateAsync(reason)}
            onEscalate={(args) => escalateMutation.mutateAsync(args)}
            onClose={(note) => closeMutation.mutateAsync(note)}
            saving={anySaving}
          />
        </div>
      )}
    </div>
  );
}