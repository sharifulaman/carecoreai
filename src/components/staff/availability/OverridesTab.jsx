import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { Plus, X, Check, Clock, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

const TYPE_BADGE = {
  holiday: "bg-blue-100 text-blue-700",
  sick: "bg-red-100 text-red-700",
  training: "bg-green-100 text-green-700",
  lieu_day: "bg-purple-100 text-purple-700",
  unavailable: "bg-gray-100 text-gray-700",
  available: "bg-emerald-100 text-emerald-700",
  other: "bg-gray-100 text-gray-700",
};
const TYPE_LABELS = { holiday: "Holiday", sick: "Sick", training: "Training", lieu_day: "Lieu Day", unavailable: "Unavailable", available: "Available", other: "Other" };

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const d1 = new Date(from), d2 = new Date(to);
  return Math.max(1, Math.ceil((d2 - d1) / 86400000) + 1);
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function OverridesTab({ staffMember, user, myStaffProfile }) {
  const queryClient = useQueryClient();
  const isAdminOrTL = user?.role === "admin" || user?.role === "team_leader";
  const today = new Date().toISOString().split("T")[0];
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [form, setForm] = useState({ override_type: "holiday", date_from: today, date_to: today, all_day: true, time_from: "", time_to: "", reason: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: overrides = [] } = useQuery({
    queryKey: ["avail-overrides", staffMember.id],
    queryFn: () => base44.entities.StaffAvailabilityOverride.filter({ org_id: ORG_ID, staff_id: staffMember.id }, "date_from", 200),
  });

  const pending = overrides.filter(o => o.override_type === "holiday" && !o.approved);
  const upcoming = overrides.filter(o => o.date_from >= today).sort((a, b) => a.date_from.localeCompare(b.date_from));
  const past = overrides.filter(o => o.date_to < today).sort((a, b) => b.date_from.localeCompare(a.date_from));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const isHoliday = data.override_type === "holiday";
      const isSickOrTraining = ["sick", "training"].includes(data.override_type);
      const approved = isAdminOrTL ? true : isSickOrTraining ? true : !isHoliday;
      const record = {
        ...data, org_id: ORG_ID, staff_id: staffMember.id,
        submitted_by: myStaffProfile?.id || "",
        approved,
        approved_by: approved && myStaffProfile?.id ? myStaffProfile.id : undefined,
        approved_at: approved ? new Date().toISOString() : undefined,
      };
      await base44.entities.StaffAvailabilityOverride.create(record);

      // FIX 6: If unapproved holiday request submitted by a SW, notify team leader
      if (isHoliday && !approved && staffMember.team_leader_id) {
        // Get team leader's user_id
        const tlProfiles = await base44.entities.StaffProfile.filter({ org_id: ORG_ID, id: staffMember.team_leader_id });
        const tl = tlProfiles[0];
        if (tl?.user_id) {
          await base44.functions.invoke("createNotification", {
            org_id: ORG_ID,
            user_id: tl.user_id,
            type: "holiday",
            message: `${staffMember.full_name} has requested leave from ${data.date_from} to ${data.date_to}.`,
            link_url: "/staff",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avail-overrides", staffMember.id] });
      setShowAddForm(false);
      setForm({ override_type: "holiday", date_from: today, date_to: today, all_day: true, time_from: "", time_to: "", reason: "" });
      toast.success("Override saved");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, override }) => {
      await base44.entities.StaffAvailabilityOverride.update(id, {
        approved: true, approved_by: myStaffProfile?.id || "", approved_at: new Date().toISOString(),
      });
      // FIX 6: Notify the staff member their holiday was approved
      if (staffMember.user_id) {
        await base44.functions.invoke("createNotification", {
          org_id: ORG_ID,
          user_id: staffMember.user_id,
          type: "holiday",
          message: `Your leave from ${override?.date_from} to ${override?.date_to} has been approved.`,
          link_url: "/shifts/my-shifts",
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["avail-overrides", staffMember.id] }); toast.success("Holiday approved"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffAvailabilityOverride.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["avail-overrides", staffMember.id] }); toast.success("Override removed"); },
  });

  const availableTypes = isAdminOrTL
    ? ["unavailable", "available", "holiday", "sick", "training", "lieu_day", "other"]
    : ["holiday", "other"];

  return (
    <div className="space-y-4">
      {/* Pending holiday requests — admin/TL only */}
      {isAdminOrTL && pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-800 mb-2">Pending Holiday Requests ({pending.length})</p>
          {pending.map(o => (
            <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-amber-100 last:border-0">
              <div>
                <p className="text-xs font-medium">{formatDate(o.date_from)} – {formatDate(o.date_to)} ({daysBetween(o.date_from, o.date_to)} days)</p>
                {o.reason && <p className="text-xs text-muted-foreground">{o.reason}</p>}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700 gap-1" onClick={() => approveMutation.mutate({ id: o.id, override: o })}>
                  <Check className="w-3 h-3" />Approve
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs text-red-600 border-red-200 gap-1" onClick={() => deleteMutation.mutate(o.id)}>
                  <X className="w-3 h-3" />Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming overrides */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Upcoming ({upcoming.length})</p>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No upcoming overrides.</p>
        ) : (
          <div className="space-y-1.5">
            {upcoming.map(o => (
              <div key={o.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[o.override_type]}`}>{TYPE_LABELS[o.override_type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{formatDate(o.date_from)} – {formatDate(o.date_to)}</p>
                  {o.reason && <p className="text-xs text-muted-foreground truncate">{o.reason}</p>}
                </div>
                {o.approved
                  ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                {(isAdminOrTL || (!o.approved && o.submitted_by === myStaffProfile?.id)) && (
                  <button onClick={() => deleteMutation.mutate(o.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add override form */}
      <div>
        <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setShowAddForm(v => !v)}>
          <Plus className="w-3.5 h-3.5" />{isAdminOrTL ? "Add Override" : "Request Leave"}
        </Button>
        {showAddForm && (
          <div className="mt-3 p-3 bg-muted/30 rounded-xl border border-border space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.override_type} onValueChange={v => set("override_type", v)}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Date From</Label><Input type="date" value={form.date_from} onChange={e => set("date_from", e.target.value)} className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs">Date To</Label><Input type="date" value={form.date_to} min={form.date_from} onChange={e => set("date_to", e.target.value)} className="mt-1 h-8 text-xs" /></div>
            </div>
            {form.date_from && form.date_to && (
              <p className="text-xs text-muted-foreground">{daysBetween(form.date_from, form.date_to)} day(s)</p>
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => set("all_day", !form.all_day)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.all_day ? "bg-primary" : "bg-muted-foreground/40"}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.all_day ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <Label className="text-xs cursor-pointer" onClick={() => set("all_day", !form.all_day)}>All day</Label>
            </div>
            {!form.all_day && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Time From</Label><Input type="time" value={form.time_from} onChange={e => set("time_from", e.target.value)} className="mt-1 h-8 text-xs" /></div>
                <div><Label className="text-xs">Time To</Label><Input type="time" value={form.time_to} onChange={e => set("time_to", e.target.value)} className="mt-1 h-8 text-xs" /></div>
              </div>
            )}
            <div>
              <Label className="text-xs">Reason {form.override_type === "other" ? "(required)" : "(optional)"}</Label>
              <Input value={form.reason} onChange={e => set("reason", e.target.value)} className="mt-1 h-8 text-xs" />
            </div>
            {!isAdminOrTL && form.override_type === "holiday" && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" />This request will be sent to your team leader for approval.
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : isAdminOrTL ? "Save Override" : "Submit Request"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Past overrides */}
      {past.length > 0 && (
        <div>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowPast(v => !v)}>
            {showPast ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Past Overrides ({past.length})
          </button>
          {showPast && (
            <div className="mt-2 space-y-1">
              {past.map(o => (
                <div key={o.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className={`px-2 py-0.5 rounded text-xs ${TYPE_BADGE[o.override_type]}`}>{TYPE_LABELS[o.override_type]}</span>
                  <p className="text-xs text-muted-foreground">{formatDate(o.date_from)} – {formatDate(o.date_to)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}