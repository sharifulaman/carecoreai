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
import { AlertTriangle, Edit2, Save } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SHIFT_TYPES = ["morning", "night"];
const SHIFT_LABELS = { morning: "Morning (Day)", night: "Night" };
const DAY_LABELS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

const defaultForm = {
  contracted_hours_per_week: "",
  employment_type: "full_time",
  max_hours_per_day: 12,
  max_consecutive_days: 6,
  min_rest_hours_between_shifts: 11,
  preferred_shift_types: [],
  unavailable_shift_types: [],
  sleep_in_qualified: false,
  waking_night_qualified: false,
  first_aid_certified: false,
  first_aid_expiry: "",
  medication_trained: false,
  medication_training_date: "",
  medication_training_expiry: "",
  driving_licence: false,
  vehicle_available: false,
  manual_handling_trained: false,
  manual_handling_expiry: "",
  safeguarding_trained: false,
  safeguarding_level: "",
  safeguarding_expiry: "",
  max_shifts_per_week: "",
  preferred_days_off: [],
  fixed_days_off: [],
  notes: "",
};

function MultiCheckbox({ label, options, value = [], onChange, error }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.value} type="button"
            onClick={() => toggle(o.value)}
            className={`px-3 py-1 rounded-full text-xs border transition-all ${value.includes(o.value) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function DayPicker({ label, value = [], onChange, conflict = [] }) {
  const toggle = (d) => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d]);
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map(d => (
          <button key={d} type="button"
            onClick={() => toggle(d)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${value.includes(d) ? "bg-primary text-primary-foreground border-primary" : conflict.includes(d) ? "border-red-300 bg-red-50 text-red-600" : "border-border hover:bg-muted"}`}>
            {DAY_LABELS[d]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AvailabilityProfileTab({ staffMember, user }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data: profiles = [] } = useQuery({
    queryKey: ["avail-profile", staffMember.id],
    queryFn: () => base44.entities.StaffAvailabilityProfile.filter({ org_id: ORG_ID, staff_id: staffMember.id }),
  });

  const profile = profiles[0] || null;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profile) {
        return base44.entities.StaffAvailabilityProfile.update(profile.id, data);
      } else {
        const created = await base44.entities.StaffAvailabilityProfile.create({ ...data, org_id: ORG_ID, staff_id: staffMember.id, created_by: user?.id || "" });
        // Auto-generate 7 weekly availability records
        const weeklyRecords = DAYS.map(day => ({
          org_id: ORG_ID, staff_id: staffMember.id, day_of_week: day,
          is_available: true, available_from: "07:00", available_until: "23:00", shift_type_pref: "any",
        }));
        await base44.entities.StaffWeeklyAvailability.bulkCreate(weeklyRecords);
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avail-profile", staffMember.id] });
      queryClient.invalidateQueries({ queryKey: ["avail-weekly", staffMember.id] });
      setEditing(false);
      setShowForm(false);
      toast.success(`Availability profile saved for ${staffMember.full_name}`);
    },
  });

  const startEdit = () => {
    setForm({
      contracted_hours_per_week: profile?.contracted_hours_per_week ?? "",
      employment_type: profile?.employment_type ?? "full_time",
      max_hours_per_day: profile?.max_hours_per_day ?? 12,
      max_consecutive_days: profile?.max_consecutive_days ?? 6,
      min_rest_hours_between_shifts: profile?.min_rest_hours_between_shifts ?? 11,
      preferred_shift_types: profile?.preferred_shift_types ?? [],
      unavailable_shift_types: profile?.unavailable_shift_types ?? [],
      preferred_days_off: profile?.preferred_days_off ?? [],
      fixed_days_off: profile?.fixed_days_off ?? [],
      max_shifts_per_week: profile?.max_shifts_per_week ?? "",
      notes: profile?.notes ?? "",
    });
    setEditing(true);
    setShowForm(true);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (form.min_rest_hours_between_shifts < 11) return "Minimum rest hours cannot be below 11 (legal requirement)";
    if (form.max_consecutive_days > 7) return "Maximum consecutive days cannot exceed 7";
    const prefUnavailConflict = form.preferred_shift_types?.filter(s => form.unavailable_shift_types?.includes(s));
    if (prefUnavailConflict?.length) return `Cannot be both preferred and unavailable: ${prefUnavailConflict.join(", ")}`;
    const dayConflict = form.preferred_days_off?.filter(d => form.fixed_days_off?.includes(d));
    if (dayConflict?.length) return `Cannot be in both preferred and fixed days off: ${dayConflict.join(", ")}`;
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    saveMutation.mutate(form);
  };

  const shiftOptions = SHIFT_TYPES.map(s => ({ value: s, label: SHIFT_LABELS[s] }));
  const prefUnavailConflict = form.preferred_shift_types?.filter(s => form.unavailable_shift_types?.includes(s));
  const dayConflict = form.preferred_days_off?.filter(d => form.fixed_days_off?.includes(d));

  if (!showForm && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Edit2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">{staffMember.full_name} has no availability profile set up yet.</p>
        <p className="text-xs text-muted-foreground mb-4">Set up a profile to enable rota planning and availability tracking.</p>
        <Button onClick={startEdit}>Set Up Availability Profile</Button>
      </div>
    );
  }

  if (!showForm && profile) {
    const EL = { full_time: "Full Time", part_time: "Part Time", bank: "Bank", agency: "Agency", zero_hours: "Zero Hours" };
    return (
      <div className="space-y-4 p-1">
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5"><Edit2 className="w-3.5 h-3.5" />Edit</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Employment Type</p><p className="font-medium">{EL[profile.employment_type] || profile.employment_type}</p></div>
          <div><p className="text-xs text-muted-foreground">Contracted Hours/Week</p><p className="font-medium">{profile.contracted_hours_per_week}h</p></div>
          <div><p className="text-xs text-muted-foreground">Max Hours/Day</p><p className="font-medium">{profile.max_hours_per_day}h</p></div>
          <div><p className="text-xs text-muted-foreground">Max Consecutive Days</p><p className="font-medium">{profile.max_consecutive_days}</p></div>
          <div><p className="text-xs text-muted-foreground">Min Rest Between Shifts</p><p className="font-medium">{profile.min_rest_hours_between_shifts}h</p></div>
          <div><p className="text-xs text-muted-foreground">Max Shifts/Week</p><p className="font-medium">{profile.max_shifts_per_week || "—"}</p></div>
        </div>
        {profile.preferred_shift_types?.length > 0 && (
          <div><p className="text-xs text-muted-foreground mb-1">Preferred Shifts</p>
            <div className="flex gap-1.5 flex-wrap">{profile.preferred_shift_types.map(s => <span key={s} className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{SHIFT_LABELS[s]}</span>)}</div>
          </div>
        )}
        {profile.unavailable_shift_types?.length > 0 && (
          <div><p className="text-xs text-muted-foreground mb-1">Cannot Work</p>
            <div className="flex gap-1.5 flex-wrap">{profile.unavailable_shift_types.map(s => <span key={s} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">{SHIFT_LABELS[s]}</span>)}</div>
          </div>
        )}
        {profile.fixed_days_off?.length > 0 && (
          <div><p className="text-xs text-muted-foreground mb-1">Fixed Days Off</p>
            <div className="flex gap-1.5 flex-wrap">{profile.fixed_days_off.map(d => <span key={d} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs capitalize">{d}</span>)}</div>
          </div>
        )}
        {profile.notes && <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{profile.notes}</p></div>}
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1">
      {/* Working Pattern */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground border-b pb-1.5">Working Pattern</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Contracted hours/week *</Label>
              <Input type="number" step="0.5" value={form.contracted_hours_per_week} onChange={e => set("contracted_hours_per_week", parseFloat(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Employment Type</Label>
              <Select value={form.employment_type} onValueChange={v => set("employment_type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="zero_hours">Zero Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Max hours in one day</Label>
              <Input type="number" step="0.5" value={form.max_hours_per_day} onChange={e => set("max_hours_per_day", parseFloat(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Max consecutive working days</Label>
              <Input type="number" value={form.max_consecutive_days} onChange={e => set("max_consecutive_days", parseInt(e.target.value))} className="mt-1" />
              {form.max_consecutive_days > 6 && <p className="text-xs text-amber-500 mt-0.5">⚠ Exceeds recommended maximum of 6</p>}
            </div>
          </div>
          <div>
            <Label className="text-xs">Minimum rest between shifts (hours)</Label>
            <Input type="number" value={form.min_rest_hours_between_shifts}
              onChange={e => { const v = parseInt(e.target.value); if (v >= 11) set("min_rest_hours_between_shifts", v); }}
              className="mt-1" min={11} />
            <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Legal minimum is 11 hours (Working Time Regulations 1998)</p>
          </div>
          <div>
            <Label className="text-xs">Maximum shifts per week</Label>
            <Input type="number" value={form.max_shifts_per_week} onChange={e => set("max_shifts_per_week", parseInt(e.target.value))} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Shift Preferences */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground border-b pb-1.5">Shift Preferences</h3>
        <div className="space-y-3">
          <MultiCheckbox label="Preferred shift types" options={shiftOptions} value={form.preferred_shift_types}
            onChange={v => set("preferred_shift_types", v)} />
          <MultiCheckbox label="Cannot work these shift types (hard restriction)" options={shiftOptions}
            value={form.unavailable_shift_types} onChange={v => set("unavailable_shift_types", v)}
            error={prefUnavailConflict?.length ? `Cannot be both preferred and unavailable: ${prefUnavailConflict.map(s => SHIFT_LABELS[s]).join(", ")}` : null} />
        </div>
      </div>

      {/* Days Off */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground border-b pb-1.5">Fixed Days Off</h3>
        <div className="space-y-3">
          <DayPicker label="Always unavailable these days (every week)" value={form.fixed_days_off}
            onChange={v => set("fixed_days_off", v)} conflict={dayConflict} />
          <DayPicker label="Preferred rest days (soft preference)" value={form.preferred_days_off}
            onChange={v => set("preferred_days_off", v)} conflict={dayConflict} />
          {dayConflict?.length > 0 && <p className="text-xs text-red-500">Same day in both preferred and fixed days off: {dayConflict.join(", ")}</p>}
        </div>
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground border-b pb-1.5">Notes</h3>
        <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." className="resize-none" rows={3} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</Button>
        <Button className="flex-1 gap-1.5" onClick={handleSubmit} disabled={saveMutation.isPending}>
          <Save className="w-3.5 h-3.5" />{saveMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}