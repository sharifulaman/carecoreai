import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_FULL = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

function DayCard({ record, isFixed, onSave }) {
  const [form, setForm] = useState({
    is_available: record?.is_available ?? true,
    available_from: record?.available_from ?? "07:00",
    available_until: record?.available_until ?? "23:00",
    shift_type_pref: record?.shift_type_pref ?? "any",
    notes: record?.notes ?? "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(record, form);
    setSaving(false);
  };

  if (isFixed) {
    return (
      <div className="bg-muted/40 rounded-xl p-3 border border-border opacity-70">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-sm font-medium">{DAY_FULL[record?.day_of_week]}</p>
          <span className="text-xs text-muted-foreground ml-auto">Fixed day off — set in profile</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-3 border transition-all ${form.is_available ? "bg-card border-border" : "bg-muted/30 border-border/50"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">{DAY_FULL[record?.day_of_week]}</p>
        <button
          type="button"
          onClick={() => set("is_available", !form.is_available)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_available ? "bg-green-500" : "bg-muted-foreground/40"}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.is_available ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </div>
      {!form.is_available ? (
        <p className="text-xs text-muted-foreground">Not available this day</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="time" value={form.available_from} onChange={e => set("available_from", e.target.value)} className="mt-0.5 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Until</Label>
              <Input type="time" value={form.available_until} onChange={e => set("available_until", e.target.value)} className="mt-0.5 h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Preferred shift this day</Label>
            <Select value={form.shift_type_pref} onValueChange={v => set("shift_type_pref", v)}>
              <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="morning">Morning (Day)</SelectItem>
                <SelectItem value="night">Night</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Notes (optional)" value={form.notes} onChange={e => set("notes", e.target.value)} className="h-8 text-xs" />
        </div>
      )}
      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

export default function WeeklyPatternTab({ staffMember }) {
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["avail-profile", staffMember.id],
    queryFn: () => base44.entities.StaffAvailabilityProfile.filter({ org_id: ORG_ID, staff_id: staffMember.id }),
  });
  const profile = profiles[0] || null;

  const { data: weekly = [] } = useQuery({
    queryKey: ["avail-weekly", staffMember.id],
    queryFn: () => base44.entities.StaffWeeklyAvailability.filter({ org_id: ORG_ID, staff_id: staffMember.id }),
    enabled: !!profile,
  });

  const fixedDays = profile?.fixed_days_off || [];
  const availableDays = weekly.filter(d => d.is_available && !fixedDays.includes(d.day_of_week)).map(d => DAY_FULL[d.day_of_week]);

  const handleSave = async (record, formData) => {
    if (record?.id) {
      await base44.entities.StaffWeeklyAvailability.update(record.id, formData);
    } else {
      await base44.entities.StaffWeeklyAvailability.create({ org_id: ORG_ID, staff_id: staffMember.id, day_of_week: record.day_of_week, ...formData });
    }
    queryClient.invalidateQueries({ queryKey: ["avail-weekly", staffMember.id] });
    toast.success("Day saved");
  };

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Set up an availability profile first (Profile tab) before setting the weekly pattern.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
        <p>Available <span className="font-semibold text-foreground">{availableDays.length} days/week</span> — {availableDays.join(", ") || "none set"}</p>
        {fixedDays.length > 0 && <p className="mt-0.5">Fixed days off: <span className="capitalize">{fixedDays.join(", ")}</span></p>}
      </div>
      {DAYS.map(day => {
        const record = weekly.find(w => w.day_of_week === day) || { day_of_week: day };
        return <DayCard key={day} record={record} isFixed={fixedDays.includes(day)} onSave={handleSave} />;
      })}
    </div>
  );
}