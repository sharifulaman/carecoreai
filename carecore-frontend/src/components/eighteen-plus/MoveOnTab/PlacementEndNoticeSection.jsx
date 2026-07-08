import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import { AlertCircle, Pencil, X, CheckCircle } from "lucide-react";
import { useModuleActions } from "@/lib/PermissionContext";

export default function PlacementEndNoticeSection({ resident, home }) {
  const queryClient = useQueryClient();
  const { canEdit } = useModuleActions("residents");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    placement_end_date: "",
    date_child_left: "",
    reason_for_leaving: "",
    move_on_destination: "",
    in_scope_before_18: "",
    continued_after_18: "",
    date_turned_18: "",
    continued_after_18_reason: "",
    la_notified: "",
    notice_given_datetime: "",
    planned_end_datetime: "",
    reason_for_immediate_notice: "",
    manager_signoff_by_id: "",
    manager_signoff_datetime: "",
  });

  const { data: record } = useQuery({
    queryKey: ["placement-end-notice", resident.id],
    queryFn: () =>
      secureGateway.filter("MoveOnPlan", { resident_id: resident.id })
        .then(plans => plans[0] || null),
  });

  // Load existing data
  useMemo(() => {
    if (record) {
      setForm({
        placement_end_date: record.placement_end_date || "",
        date_child_left: record.date_child_left || "",
        reason_for_leaving: record.reason_for_leaving || "",
        move_on_destination: record.move_on_destination || "",
        in_scope_before_18: record.in_scope_before_18 ? "true" : "false",
        continued_after_18: record.continued_after_18 ? "true" : "false",
        date_turned_18: record.date_turned_18 || "",
        continued_after_18_reason: record.continued_after_18_reason || "",
        la_notified: record.la_notified ? "true" : "false",
        notice_given_datetime: record.notice_given_datetime || "",
        planned_end_datetime: record.planned_end_datetime || "",
        reason_for_immediate_notice: record.reason_for_immediate_notice || "",
        manager_signoff_by_id: record.manager_signoff_by_id || "",
        manager_signoff_datetime: record.manager_signoff_datetime || "",
      });
    }
  }, [record]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate notice period
  const noticeHours = useMemo(() => {
    if (!form.notice_given_datetime || !form.planned_end_datetime) return null;
    const given = new Date(form.notice_given_datetime).getTime();
    const planned = new Date(form.planned_end_datetime).getTime();
    return Math.round((planned - given) / (1000 * 60 * 60));
  }, [form.notice_given_datetime, form.planned_end_datetime]);

  const isImmediateNotice = noticeHours !== null && noticeHours <= 36;

  const updateMutation = useMutation({
    mutationFn: (data) => secureGateway.update("MoveOnPlan", record.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement-end-notice", resident.id] });
      setEditing(false);
    },
  });

  const handleSave = async () => {
    const updateData = {
      placement_end_date: form.placement_end_date,
      date_child_left: form.date_child_left,
      reason_for_leaving: form.reason_for_leaving,
      move_on_destination: form.move_on_destination,
      in_scope_before_18: form.in_scope_before_18 === "true",
      continued_after_18: form.continued_after_18 === "true",
      date_turned_18: form.date_turned_18,
      continued_after_18_reason: form.continued_after_18_reason,
      la_notified: form.la_notified === "true",
      notice_given_datetime: form.notice_given_datetime,
      planned_end_datetime: form.planned_end_datetime,
      reason_for_immediate_notice: form.reason_for_immediate_notice,
      manager_signoff_by_id: form.manager_signoff_by_id,
      manager_signoff_datetime: form.manager_signoff_datetime,
      is_immediate_notice: isImmediateNotice,
      notice_period_hours: noticeHours,
    };
    updateMutation.mutate(updateData);
  };

  if (!editing && !record) {
    return (
      <div className="bg-muted/10 border border-border rounded-xl p-6 text-center">
        <p className="text-sm text-muted-foreground">No placement end notice recorded yet</p>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        {(record?.is_immediate_notice || isImmediateNotice) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-red-900">Immediate Notice</p>
              <p className="text-xs text-red-800 mt-1">
                Notice period: {noticeHours || record?.notice_period_hours || "—"} hours {(noticeHours !== null && noticeHours <= 36) || record?.is_immediate_notice ? "(≤36 hours)" : ""}
              </p>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Placement End / Immediate Notice</h3>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Placement end date</p>
              <p className="font-medium">{record?.placement_end_date ? new Date(record.placement_end_date).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Date child left provision</p>
              <p className="font-medium">{record?.date_child_left ? new Date(record.date_child_left).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Reason for leaving</p>
              <p className="font-medium">{record?.reason_for_leaving || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Move-on destination</p>
              <p className="font-medium">{record?.move_on_destination || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">In scope before turning 18?</p>
              <p className="font-medium">{record?.in_scope_before_18 ? "Yes" : record?.in_scope_before_18 === false ? "No" : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Continued after 18th birthday?</p>
              <p className="font-medium">{record?.continued_after_18 ? "Yes" : record?.continued_after_18 === false ? "No" : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Date turned 18</p>
              <p className="font-medium">{record?.date_turned_18 ? new Date(record.date_turned_18).toLocaleDateString() : "—"}</p>
            </div>
            {record?.continued_after_18 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Reason for continuing after 18</p>
                <p className="font-medium">{record?.continued_after_18_reason || "—"}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Local authority notified?</p>
              <p className="font-medium">{record?.la_notified ? "Yes" : record?.la_notified === false ? "No" : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Notice given date/time</p>
              <p className="font-medium text-xs">{record?.notice_given_datetime ? new Date(record.notice_given_datetime).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Planned end date/time</p>
              <p className="font-medium text-xs">{record?.planned_end_datetime ? new Date(record.planned_end_datetime).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Notice period (hours)</p>
              <p className="font-medium">{record?.notice_period_hours || "—"}</p>
            </div>
            {record?.is_immediate_notice && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Immediate notice reason</p>
                <p className="font-medium">{record?.reason_for_immediate_notice || "—"}</p>
              </div>
            )}
            {record?.manager_signoff_datetime && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Manager sign-off</p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-xs">{new Date(record.manager_signoff_datetime).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Edit Placement End / Immediate Notice</h3>
        <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Placement end date</Label>
            <Input type="date" value={form.placement_end_date} onChange={e => update("placement_end_date", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Date child left provision</Label>
            <Input type="date" value={form.date_child_left} onChange={e => update("date_child_left", e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <div>
          <Label>Reason for leaving</Label>
          <NativeSelect value={form.reason_for_leaving} onValueChange={v => update("reason_for_leaving", v)} className="mt-1.5">
            <SelectItem value={null}>—</SelectItem>
            <SelectItem value="plan_agreed">Plan agreed with young person</SelectItem>
            <SelectItem value="breakdown">Placement breakdown</SelectItem>
            <SelectItem value="family_return">Return to family</SelectItem>
            <SelectItem value="move_on">Move-on planned</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </NativeSelect>
        </div>

        <div>
          <Label>Move-on destination</Label>
          <Input value={form.move_on_destination} onChange={e => update("move_on_destination", e.target.value)} className="mt-1.5" placeholder="e.g. Own flat, University halls" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>In scope before turning 18?</Label>
            <NativeSelect value={form.in_scope_before_18} onValueChange={v => update("in_scope_before_18", v)} className="mt-1.5">
              <SelectItem value={null}>—</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </NativeSelect>
          </div>
          <div>
            <Label>Continued after 18th birthday?</Label>
            <NativeSelect value={form.continued_after_18} onValueChange={v => update("continued_after_18", v)} className="mt-1.5">
              <SelectItem value={null}>—</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </NativeSelect>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date turned 18</Label>
            <Input type="date" value={form.date_turned_18} onChange={e => update("date_turned_18", e.target.value)} className="mt-1.5" />
          </div>
          {form.continued_after_18 === "true" && (
            <div>
              <Label>Reason for continuing after 18</Label>
              <Input value={form.continued_after_18_reason} onChange={e => update("continued_after_18_reason", e.target.value)} className="mt-1.5" placeholder="e.g. pathway plan support" />
            </div>
          )}
        </div>

        <div>
          <Label>Local authority notified?</Label>
          <NativeSelect value={form.la_notified} onValueChange={v => update("la_notified", v)} className="mt-1.5">
            <SelectItem value={null}>—</SelectItem>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </NativeSelect>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notice Details</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Notice given date/time</Label>
                <Input type="datetime-local" value={form.notice_given_datetime} onChange={e => update("notice_given_datetime", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Planned end date/time</Label>
                <Input type="datetime-local" value={form.planned_end_datetime} onChange={e => update("planned_end_datetime", e.target.value)} className="mt-1.5" />
              </div>
            </div>

            {noticeHours !== null && (
              <>
                <div className={`rounded-lg p-3 ${isImmediateNotice ? "bg-red-500/10 border border-red-500/30" : "bg-green-500/10 border border-green-500/30"}`}>
                  <p className={`text-sm font-medium ${isImmediateNotice ? "text-red-700" : "text-green-700"}`}>
                    Notice period: {noticeHours} hours {isImmediateNotice ? "— IMMEDIATE NOTICE" : ""}
                  </p>
                </div>

                {isImmediateNotice && (
                  <div>
                    <Label>Reason for immediate notice</Label>
                    <Input value={form.reason_for_immediate_notice} onChange={e => update("reason_for_immediate_notice", e.target.value)} className="mt-1.5" placeholder="e.g. Emergency situation" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sign-off</p>
          <div>
            <Label>Manager sign-off date/time</Label>
            <Input type="datetime-local" value={form.manager_signoff_datetime} onChange={e => update("manager_signoff_datetime", e.target.value)} className="mt-1.5" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)} disabled={updateMutation.isPending}>
          Cancel
        </Button>
        <Button type="button" className="flex-1" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}