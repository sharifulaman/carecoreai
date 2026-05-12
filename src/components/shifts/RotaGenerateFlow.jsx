import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wand2, AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function getFirstMonday() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function getDaysInRange(from, to) {
  const days = [];
  const d = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (d <= end) {
    days.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getDayName(dateStr) {
  return DAYS_ORDER[new Date(dateStr + "T12:00:00").getDay() === 0 ? 6 : new Date(dateStr + "T12:00:00").getDay() - 1];
}

export default function RotaGenerateFlow({ home, user, myStaffProfile, onBack, onComplete }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1=config, 2=preview, 3=generating
  const [rotaName, setRotaName] = useState(`${home?.name} Rota`);
  const [periodFrom, setPeriodFrom] = useState(getFirstMonday());
  const [periodTo, setPeriodTo] = useState(() => addMonths(getFirstMonday(), 3));
  const [preview, setPreview] = useState(null);
  const [excludedStaff, setExcludedStaff] = useState([]);
  const [excludedTemplates, setExcludedTemplates] = useState([]);
  
  // Constraints
  const [maxShiftsPerStaff, setMaxShiftsPerStaff] = useState(15);
  const [minShiftsPerStaff, setMinShiftsPerStaff] = useState(1);
  const [enforceMaxShifts, setEnforceMaxShifts] = useState(true);
  const [enforceMinShifts, setEnforceMinShifts] = useState(false);
  const [noBackToBackNights, setNoBackToBackNights] = useState(true);
  const [noBackToBackDayNightSameHouse, setNoBackToBackDayNightSameHouse] = useState(true);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", home?.id],
    queryFn: () => base44.entities.ShiftTemplate.filter({ org_id: ORG_ID, home_id: home?.id, active: true }),
    enabled: !!home?.id,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ["staff-generate"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID, status: "active" }),
  });

  const { data: avProfiles = [] } = useQuery({
    queryKey: ["av-profiles-generate"],
    queryFn: () => base44.entities.StaffAvailabilityProfile.filter({ org_id: ORG_ID }),
  });

  const { data: avOverrides = [] } = useQuery({
    queryKey: ["av-overrides-generate"],
    queryFn: () => base44.entities.StaffAvailabilityOverride.filter({ org_id: ORG_ID }),
  });

  const { data: weeklyAvail = [] } = useQuery({
    queryKey: ["weekly-avail-generate"],
    queryFn: () => base44.entities.StaffWeeklyAvailability.filter({ org_id: ORG_ID }),
  });

  const homeStaff = useMemo(() => allStaff.filter(s => s.home_ids?.includes(home?.id)), [allStaff, home]);
  const includedStaff = homeStaff.filter(s => !excludedStaff.includes(s.id));
  const includedTemplates = templates.filter(t => !excludedTemplates.includes(t.id));

  const isStaffAvailable = (staffId, date, shiftType) => {
    const profile = avProfiles.find(p => p.staff_id === staffId);
    if (!profile) return false;
    const dayName = getDayName(date);
    if (profile.fixed_days_off?.includes(dayName)) return false;
    if (profile.unavailable_shift_types?.includes(shiftType)) return false;
    if (shiftType === "sleeping" && !profile.sleep_in_qualified) return false;
    const override = avOverrides.find(o => o.staff_id === staffId && o.date_from <= date && o.date_to >= date && o.approved !== false);
    if (override && ["unavailable", "sick", "holiday"].includes(override.override_type)) return false;
    const weekly = weeklyAvail.find(w => w.staff_id === staffId && w.day_of_week === dayName);
    if (weekly?.is_available === false) return false;
    return true;
  };

  const buildPreview = () => {
    if (includedTemplates.length === 0) {
      toast.error("No shift templates selected.");
      return;
    }
    const days = getDaysInRange(periodFrom, periodTo);
    let totalShifts = days.length * includedTemplates.length;
    const staffShiftCounts = {};
    const staffHours = {};
    includedStaff.forEach(s => { staffShiftCounts[s.id] = 0; staffHours[s.id] = 0; });

    let insufficient = 0;
    const days7 = days.slice(0, 7); // preview first week
    days7.forEach(date => {
      includedTemplates.forEach(tmpl => {
        const candidates = includedStaff.filter(s => isStaffAvailable(s.id, date, tmpl.shift_type));
        if (candidates.length < (tmpl.staff_required || 1)) insufficient++;
      });
    });

    const previewStaff = includedStaff.map(s => {
      const profile = avProfiles.find(p => p.staff_id === s.id);
      const projectedShifts = Math.round((days.length / 7) * (profile ? (7 - (profile.fixed_days_off?.length || 0)) * (includedTemplates.length / 7) : 0));
      const projHours = projectedShifts * 8;
      return { ...s, profile, projectedShifts, projHours };
    });

    setPreview({ totalShifts, insufficient, previewStaff, days: days.length });
    setStep(2);
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      setStep(3);
      // Create Rota record
      const rota = await base44.entities.Rota.create({
        org_id: ORG_ID,
        home_id: home.id,
        name: rotaName,
        period_from: periodFrom,
        period_to: periodTo,
        status: "draft",
        generated_by: myStaffProfile?.id,
        conflicts_count: 0,
        generation_notes: `Generated ${new Date().toISOString()}`,
      });

      const days = getDaysInRange(periodFrom, periodTo);
      const conflicts = [];
      const staffAssignments = {}; // staffId -> array of {date, shiftType, hours}
      includedStaff.forEach(s => { staffAssignments[s.id] = []; });

      // Create shifts and assign staff
      for (const date of days) {
        for (const tmpl of includedTemplates) {
          const [sh, sm] = (tmpl.time_start || "07:00").split(":").map(Number);
          const [eh, em] = (tmpl.time_end || "15:00").split(":").map(Number);
          let shiftHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
          if (shiftHours < 0) shiftHours += 24;

          // Find available candidates
          const dayName = getDayName(date);
          const candidates = includedStaff.filter(s => {
            if (!isStaffAvailable(s.id, date, tmpl.shift_type)) return false;
            const profile = avProfiles.find(p => p.staff_id === s.id);
            // Check not double-booked
            if (staffAssignments[s.id].some(a => a.date === date)) return false;
            // Check rest period
            const lastShift = [...staffAssignments[s.id]].reverse().find(a => true);
            if (lastShift) {
              const lastDate = new Date(lastShift.date + "T" + lastShift.timeEnd);
              const thisDate = new Date(date + "T" + tmpl.time_start);
              const restHours = (thisDate - lastDate) / 3600000;
              if (restHours < (profile?.min_rest_hours_between_shifts || 11)) return false;
            }
            // Check consecutive days
            const recentDays = staffAssignments[s.id].filter(a => {
              const d = new Date(a.date + "T12:00:00");
              const today2 = new Date(date + "T12:00:00");
              return (today2 - d) < 7 * 86400000;
            });
            const maxConsec = profile?.max_consecutive_days || 6;
            if (recentDays.length >= maxConsec) return false;

            // Check max shifts constraint
            if (enforceMaxShifts && staffAssignments[s.id].length >= maxShiftsPerStaff) return false;

            // No back-to-back night shifts
            if (noBackToBackNights && tmpl.shift_type === 'night') {
              const lastAssignment = [...staffAssignments[s.id]].reverse().find(a => true);
              if (lastAssignment && lastAssignment.shiftType === 'night') {
                const lastDate = new Date(lastAssignment.date + "T12:00:00");
                const thisDate = new Date(date + "T12:00:00");
                if ((thisDate - lastDate) === 86400000) return false; // consecutive night
              }
            }

            // No back-to-back day+night same house
            if (noBackToBackDayNightSameHouse) {
              const lastAssignment = [...staffAssignments[s.id]].reverse().find(a => true);
              if (lastAssignment) {
                const isLastNight = lastAssignment.shiftType === 'night';
                const isThisDay = tmpl.shift_type === 'morning' || tmpl.shift_type === 'afternoon';
                if ((isLastNight && isThisDay) || (!isLastNight && tmpl.shift_type === 'night')) {
                  const lastDate = new Date(lastAssignment.date + "T12:00:00");
                  const thisDate = new Date(date + "T12:00:00");
                  if (Math.abs((thisDate - lastDate)) === 86400000) return false; // consecutive days
                }
              }
            }

            return true;
          });

          // Rank candidates
          candidates.sort((a, b) => {
            const pa = avProfiles.find(p => p.staff_id === a.id);
            const pb = avProfiles.find(p => p.staff_id === b.id);
            const wa = weeklyAvail.find(w => w.staff_id === a.id && w.day_of_week === dayName);
            const wb = weeklyAvail.find(w => w.staff_id === b.id && w.day_of_week === dayName);
            // Prefer shift type match
            const aPref = wa?.shift_type_pref === tmpl.shift_type ? -1 : (pa?.preferred_shift_types?.includes(tmpl.shift_type) ? -1 : 0);
            const bPref = wb?.shift_type_pref === tmpl.shift_type ? -1 : (pb?.preferred_shift_types?.includes(tmpl.shift_type) ? -1 : 0);
            if (aPref !== bPref) return aPref - bPref;
            // Prefer fewer hours this week
            const aHrs = staffAssignments[a.id].filter(x => Math.abs(new Date(x.date) - new Date(date)) < 7 * 86400000).length;
            const bHrs = staffAssignments[b.id].filter(x => Math.abs(new Date(x.date) - new Date(date)) < 7 * 86400000).length;
            return aHrs - bHrs;
          });

          const required = tmpl.staff_required || 1;
          const assigned = candidates.slice(0, required);

          const shift = await base44.entities.Shift.create({
            org_id: ORG_ID,
            home_id: home.id,
            template_id: tmpl.id,
            shift_type: tmpl.shift_type,
            date,
            time_start: tmpl.time_start,
            time_end: tmpl.time_end,
            is_sleeping_shift: tmpl.shift_type === "sleeping",
            staff_required: required,
            assigned_staff: assigned.map(s => s.id),
            lead_staff_id: assigned.find(s => s.role === "team_leader")?.id || assigned[0]?.id || null,
            status: "draft",
            rota_id: rota.id,
            overlap_minutes: 30,
            created_by: myStaffProfile?.id,
          });

          assigned.forEach(s => {
            staffAssignments[s.id].push({ date, shiftType: tmpl.shift_type, timeEnd: tmpl.time_end });
          });

          if (assigned.length < required) {
            conflicts.push({
              org_id: ORG_ID,
              rota_id: rota.id,
              shift_id: shift.id,
              conflict_type: "insufficient_staff",
              severity: "critical",
              description: `${date} ${tmpl.shift_type}: need ${required}, only ${assigned.length} available`,
              resolved: false,
            });
          }
        }
      }

      // Create all conflict records
      await Promise.all(conflicts.map(c => base44.entities.ShiftConflict.create(c)));
      // Update rota with conflict count
      await base44.entities.Rota.update(rota.id, { conflicts_count: conflicts.length });

      return { rotaId: rota.id, shiftsCount: days.length * includedTemplates.length, conflictsCount: conflicts.length };
    },
    onSuccess: (result) => {
      toast.success(`Draft rota generated — ${result.shiftsCount} shifts created, ${result.conflictsCount} conflicts`);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["rotas"] });
      queryClient.invalidateQueries({ queryKey: ["conflicts"] });
      onComplete();
    },
    onError: (err) => {
      toast.error(`Generation failed: ${err.message}`);
      setStep(2);
    },
  });

  if (step === 3) {
    return (
      <div className="bg-card rounded-xl border border-border p-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-semibold text-lg">Generating rota…</p>
        <p className="text-sm text-muted-foreground">Creating shifts and checking availability for {home?.name}. This may take a moment.</p>
      </div>
    );
  }

  if (step === 2 && preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
          <h2 className="font-semibold text-lg">Generation Preview</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-primary">{preview.totalShifts}</p>
            <p className="text-xs text-muted-foreground mt-1">Total shifts over {preview.days} days</p>
          </div>
          <div className={`border rounded-xl p-4 text-center ${preview.insufficient > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <p className={`text-3xl font-bold ${preview.insufficient > 0 ? "text-red-600" : "text-green-600"}`}>{preview.insufficient}</p>
            <p className="text-xs text-muted-foreground mt-1">Insufficient staff slots (sample week)</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">{includedStaff.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Staff included</p>
          </div>
        </div>

        {preview.insufficient > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700">{preview.insufficient} shift slots in the sample week cannot be fully staffed based on current availability. These will be created with insufficient staff conflicts that you must resolve before publishing.</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Projected Assignments</p>
          </div>
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr>
                {["Staff", "Role", "Employment", "Profile", "Est. Shifts", "Est. Hours"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.previewStaff.map(s => (
                <tr key={s.id} className="border-b border-border/40">
                  <td className="px-3 py-2 font-medium">{s.full_name}</td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">{s.role?.replace("_", " ")}</td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">{s.profile?.employment_type?.replace("_", " ") || "—"}</td>
                  <td className="px-3 py-2">
                    {s.profile ? <span className="text-green-600">✓ Set up</span> : <span className="text-red-500">⚠ Missing</span>}
                  </td>
                  <td className="px-3 py-2">{s.projectedShifts}</td>
                  <td className={`px-3 py-2 ${s.projHours > (s.profile?.contracted_hours_per_week || 0) ? "text-amber-600 font-medium" : ""}`}>
                    {s.projHours}h / {s.profile?.contracted_hours_per_week || "?"}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setStep(1)}>Back and Adjust</Button>
          <Button onClick={() => generateMutation.mutate()} className="gap-2">
            <Wand2 className="w-4 h-4" /> Generate Draft Rota
          </Button>
        </div>
      </div>
    );
  }

  // Step 1 — Config
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <h2 className="font-semibold text-lg">Generate Rota — {home?.name}</h2>
      </div>

      {/* Rota Period */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Rota Period</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Rota Name</Label>
            <Input value={rotaName} onChange={e => setRotaName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div />
          <div className="space-y-1">
            <Label className="text-xs">Period Start</Label>
            <Input type="date" value={periodFrom} onChange={e => { setPeriodFrom(e.target.value); setPeriodTo(addMonths(e.target.value, 3)); }} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Period End</Label>
            <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
      </div>

      {/* Shift Templates */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Shift Templates</h3>
        {templates.length === 0 ? (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            No shift templates defined for this home. Please set up shift templates in Home Settings before generating a rota.
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(t => (
              <label key={t.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${excludedTemplates.includes(t.id) ? "border-border bg-muted/20 opacity-60" : "border-primary/20 bg-primary/5"}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!excludedTemplates.includes(t.id)}
                    onChange={e => setExcludedTemplates(prev => e.target.checked ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.shift_type} · {t.time_start}–{t.time_end}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{t.staff_required} staff required</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Constraints */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-sm">Generation Constraints</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={enforceMaxShifts} onChange={e => setEnforceMaxShifts(e.target.checked)} className="rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium">Max shifts per staff</p>
              <p className="text-xs text-muted-foreground">Limit individual workload</p>
            </div>
            {enforceMaxShifts && (
              <input type="number" value={maxShiftsPerStaff} onChange={e => setMaxShiftsPerStaff(parseInt(e.target.value) || 1)} className="w-16 h-8 px-2 border border-border rounded text-sm" min="1" />
            )}
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={enforceMinShifts} onChange={e => setEnforceMinShifts(e.target.checked)} className="rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium">Min shifts per staff</p>
              <p className="text-xs text-muted-foreground">Ensure fair distribution</p>
            </div>
            {enforceMinShifts && (
              <input type="number" value={minShiftsPerStaff} onChange={e => setMinShiftsPerStaff(parseInt(e.target.value) || 1)} className="w-16 h-8 px-2 border border-border rounded text-sm" min="1" />
            )}
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={noBackToBackNights} onChange={e => setNoBackToBackNights(e.target.checked)} className="rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium">No consecutive night shifts</p>
              <p className="text-xs text-muted-foreground">Prevent burnout from back-to-back nights</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={noBackToBackDayNightSameHouse} onChange={e => setNoBackToBackDayNightSameHouse(e.target.checked)} className="rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium">No day + night shifts same house</p>
              <p className="text-xs text-muted-foreground">Prevent overnight turnarounds at same location</p>
            </div>
          </label>
        </div>
      </div>

      {/* Staff Pool */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Staff Pool ({includedStaff.length} included)</h3>
        <div className="space-y-2">
          {homeStaff.map(s => {
            const profile = avProfiles.find(p => p.staff_id === s.id);
            const included = !excludedStaff.includes(s.id);
            return (
              <label key={s.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${included ? "border-border bg-card" : "border-border bg-muted/20 opacity-60"}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={e => setExcludedStaff(prev => e.target.checked ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.role?.replace("_", " ")} · {profile?.employment_type?.replace("_", " ") || "No profile"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {!profile && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">No profile</span>}
                  {profile?.sleep_in_qualified && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Sleep-in</span>}
                </div>
              </label>
            );
          })}
          {homeStaff.length === 0 && <p className="text-sm text-muted-foreground">No active staff assigned to this home.</p>}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={buildPreview} disabled={includedTemplates.length === 0 || includedStaff.length === 0} className="gap-2">
          <CheckCircle2 className="w-4 h-4" /> Preview Generation
        </Button>
      </div>
    </div>
  );
}